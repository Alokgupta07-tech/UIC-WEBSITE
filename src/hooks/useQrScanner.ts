import { useCallback, useEffect, useRef, useState } from "react";

/** Lifecycle of the camera side of the scanner. */
export type QrCameraState =
  | "idle"
  | "requesting"
  | "scanning"
  | "stopped"
  | "denied"
  | "unavailable"
  | "error";

export interface UseQrScannerOptions {
  /** Called once with the raw decoded QR text. The scanner pauses itself first,
   *  so the same code is never reported twice. */
  onDecoded: (text: string) => void;
}

/** How often to run a decode pass. ~8/sec is responsive without pinning a CPU
 *  core on mid-range phones. */
const DECODE_INTERVAL_MS = 120;

/** Largest edge we downscale camera frames to before decoding. */
const MAX_DECODE_EDGE = 640;

/** Largest edge for an uploaded image, big enough for photos of certificates. */
const MAX_UPLOAD_EDGE = 1600;

type JsQrModule = typeof import("jsqr");
let jsQrPromise: Promise<JsQrModule> | null = null;

/** jsQR is only fetched when the scanner is actually opened. */
function loadJsQr(): Promise<JsQrModule> {
  if (!jsQrPromise) {
    jsQrPromise = import("jsqr");
  }
  return jsQrPromise;
}

// A single scratch canvas is reused across decode passes. The scan loop runs
// several times a second, so allocating a fresh canvas each time would create
// avoidable garbage on exactly the devices that can least afford it.
let scratchCanvas: HTMLCanvasElement | null = null;

function getScratchContext(width: number, height: number): CanvasRenderingContext2D | null {
  if (!scratchCanvas) scratchCanvas = document.createElement("canvas");
  if (scratchCanvas.width !== width) scratchCanvas.width = width;
  if (scratchCanvas.height !== height) scratchCanvas.height = height;
  return scratchCanvas.getContext("2d", { willReadFrequently: true });
}

function drawToCanvas(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  maxEdge: number
): ImageData | null {
  const scale = Math.min(1, maxEdge / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));

  const context = getScratchContext(width, height);
  if (!context) return null;

  context.drawImage(source, 0, 0, width, height);
  return context.getImageData(0, 0, width, height);
}

async function decodeImageData(imageData: ImageData): Promise<string | null> {
  const { default: jsQR } = await loadJsQr();
  const result = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: "attemptBoth",
  });
  return result?.data?.trim() || null;
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("unreadable-image"));
    };
    image.src = url;
  });
}

/**
 * Camera + image-upload QR scanning.
 *
 * The camera stream is fully torn down on stop and on unmount, so the device
 * indicator light never stays on. Every failure resolves into an explicit state
 * the UI can act on — the caller is never left on a spinner.
 */
export function useQrScanner({ onDecoded }: UseQrScannerOptions) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastDecodeRef = useRef(0);
  const activeRef = useRef(false);
  const onDecodedRef = useRef(onDecoded);

  const [cameraState, setCameraState] = useState<QrCameraState>("idle");
  const [isDecodingFile, setIsDecodingFile] = useState(false);

  useEffect(() => {
    onDecodedRef.current = onDecoded;
  }, [onDecoded]);

  /** True when the browser can even attempt camera access. Camera APIs need a
   *  secure context, so plain-HTTP hosting reports as unavailable up front. */
  const isCameraSupported =
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    (typeof window === "undefined" || window.isSecureContext);

  const teardown = useCallback(() => {
    activeRef.current = false;

    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    const video = videoRef.current;
    if (video) {
      video.srcObject = null;
    }
  }, []);

  const stop = useCallback(() => {
    teardown();
    setCameraState((current) =>
      current === "idle" || current === "denied" || current === "unavailable"
        ? current
        : "stopped"
    );
  }, [teardown]);

  const tick = useCallback(async () => {
    if (!activeRef.current) return;

    const video = videoRef.current;
    const now = performance.now();

    if (
      video &&
      video.readyState >= 2 &&
      video.videoWidth > 0 &&
      now - lastDecodeRef.current >= DECODE_INTERVAL_MS
    ) {
      lastDecodeRef.current = now;
      try {
        const imageData = drawToCanvas(
          video,
          video.videoWidth,
          video.videoHeight,
          MAX_DECODE_EDGE
        );
        if (imageData) {
          const text = await decodeImageData(imageData);
          if (text && activeRef.current) {
            // Pause before reporting so one QR code fires exactly once.
            teardown();
            setCameraState("stopped");
            onDecodedRef.current(text);
            return;
          }
        }
      } catch {
        // A single bad frame is not worth surfacing; keep scanning.
      }
    }

    if (activeRef.current) {
      frameRef.current = requestAnimationFrame(() => void tick());
    }
  }, [teardown]);

  const start = useCallback(async () => {
    if (!isCameraSupported) {
      setCameraState("unavailable");
      return;
    }

    teardown();
    setCameraState("requesting");

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
    } catch (error) {
      const name = (error as { name?: string } | null)?.name ?? "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        setCameraState("denied");
      } else if (
        name === "NotFoundError" ||
        name === "DevicesNotFoundError" ||
        name === "OverconstrainedError" ||
        name === "NotReadableError" ||
        name === "TrackStartError"
      ) {
        setCameraState("unavailable");
      } else {
        setCameraState("error");
      }
      return;
    }

    streamRef.current = stream;

    const video = videoRef.current;
    if (!video) {
      // The dialog closed while permission was pending.
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setCameraState("idle");
      return;
    }

    video.srcObject = stream;
    video.setAttribute("playsinline", "true");
    video.muted = true;

    try {
      await video.play();
    } catch {
      // Autoplay can reject even though the stream is fine; the decode loop
      // works off readyState so this is not fatal.
    }

    activeRef.current = true;
    lastDecodeRef.current = 0;
    setCameraState("scanning");
    frameRef.current = requestAnimationFrame(() => void tick());
  }, [isCameraSupported, teardown, tick]);

  /**
   * Decode a QR code from an image file. Resolves to the raw QR text, or null
   * when no QR code could be read from the picture.
   */
  const scanFile = useCallback(async (file: File): Promise<string | null> => {
    setIsDecodingFile(true);
    try {
      const image = await loadImageElement(file);
      const imageData = drawToCanvas(
        image,
        image.naturalWidth || image.width,
        image.naturalHeight || image.height,
        MAX_UPLOAD_EDGE
      );
      if (!imageData) return null;
      return await decodeImageData(imageData);
    } catch {
      return null;
    } finally {
      setIsDecodingFile(false);
    }
  }, []);

  // Always release the camera when the component using the hook goes away.
  useEffect(() => teardown, [teardown]);

  return {
    videoRef,
    cameraState,
    isCameraSupported,
    isDecodingFile,
    start,
    stop,
    scanFile,
  };
}
