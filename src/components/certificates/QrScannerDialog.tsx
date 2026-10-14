import { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  CameraOff,
  ImageUp,
  Loader2,
  QrCode,
  RotateCw,
  ScanLine,
  ShieldAlert,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQrScanner } from "@/hooks/useQrScanner";
import { extractVerificationToken, verifyCertificate } from "@/services/certificates";
import { CertificateRecord } from "@/components/certificates/CertificateRecord";
import { CertificateActions } from "@/components/certificates/CertificateActions";
import { VerificationVerdict } from "@/components/certificates/VerificationVerdict";
import type { CertificateVerification } from "@/types";

/** Steps of the verification flow, independent of the camera's own state. */
type ScanPhase =
  | "scanning"
  | "detected"
  | "verifying"
  | "result"
  | "invalid-qr"
  | "verify-failed";

const ACCEPTED_IMAGE_TYPES = "image/png,image/jpeg,image/webp,image/gif,image/bmp";

interface QrScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Fired after a successful verification so the dashboard can refresh. */
  onVerified?: () => void;
}

/**
 * Certificate QR scanner.
 *
 * Camera scanning with an image-upload fallback, because camera access can be
 * blocked by browser permissions, insecure origins or a device with no camera.
 * Every path ends in an explicit state with a way to retry, upload an image
 * instead, or close — there is no terminal spinner.
 */
export function QrScannerDialog({ open, onOpenChange, onVerified }: QrScannerDialogProps) {
  const [phase, setPhase] = useState<ScanPhase>("scanning");
  const [result, setResult] = useState<CertificateVerification | null>(null);
  const [resultToken, setResultToken] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const onVerifiedRef = useRef(onVerified);

  useEffect(() => {
    onVerifiedRef.current = onVerified;
  }, [onVerified]);

  const runVerification = useCallback(async (rawQrText: string) => {
    setPhase("detected");

    const token = extractVerificationToken(rawQrText);
    if (!token) {
      setPhase("invalid-qr");
      return;
    }

    setPhase("verifying");
    try {
      const verification = await verifyCertificate(token);
      setResult(verification);
      setResultToken(token);
      setPhase("result");
      if (verification.verdict === "verified") {
        onVerifiedRef.current?.();
      }
    } catch {
      // Transport/server problem — distinct from "this is not a real certificate".
      setPhase("verify-failed");
    }
  }, []);

  const { videoRef, cameraState, isCameraSupported, isDecodingFile, start, stop, scanFile } =
    useQrScanner({ onDecoded: (text) => void runVerification(text) });

  // Start the camera when the dialog opens; release it whenever it closes.
  useEffect(() => {
    if (!open) {
      stop();
      return;
    }
    setPhase("scanning");
    setResult(null);
    setResultToken(null);
    if (isCameraSupported) void start();
  }, [open, isCameraSupported, start, stop]);

  const resetToScanning = useCallback(() => {
    setResult(null);
    setResultToken(null);
    setPhase("scanning");
    if (isCameraSupported) void start();
  }, [isCameraSupported, start]);

  const handleFileChosen = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Allow re-picking the same file after a failed attempt.
    event.target.value = "";
    if (!file) return;

    stop();
    setPhase("detected");
    const text = await scanFile(file);
    if (!text) {
      setPhase("invalid-qr");
      return;
    }
    await runVerification(text);
  };

  const openFilePicker = () => fileInputRef.current?.click();

  const showResult = phase === "result" && result !== null;
  const showCameraStage =
    !showResult && phase !== "invalid-qr" && phase !== "verify-failed";

  /** The single line of guidance shown under the camera frame. */
  const statusLine = (() => {
    if (phase === "detected") return isDecodingFile ? "Reading image…" : "QR code detected";
    if (phase === "verifying") return "Verifying certificate…";
    if (cameraState === "requesting") return "Requesting camera access…";
    if (cameraState === "scanning") return "Point your camera at the certificate QR code";
    if (cameraState === "denied")
      return "Camera permission was denied. Please allow camera access or upload an image.";
    if (cameraState === "unavailable")
      return "Camera access is unavailable. Upload a QR image instead.";
    if (cameraState === "error")
      return "The camera could not be started. Upload a QR image instead.";
    return "Scan your UIC certificate QR code";
  })();

  const cameraBlocked =
    cameraState === "denied" || cameraState === "unavailable" || cameraState === "error";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-[calc(100vw-1.5rem)] gap-0 overflow-hidden rounded-lg p-0 sm:max-w-2xl">
        <DialogHeader className="border-b p-4 pr-12 text-left sm:p-6 sm:pr-14">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <QrCode className="h-5 w-5 shrink-0 text-primary" aria-hidden />
            {showResult ? "Certificate verification" : "Scan Certificate"}
          </DialogTitle>
          <DialogDescription>
            {showResult
              ? "Verified against the official UIC certificate records."
              : "Scan the QR code printed on your UIC certificate, or upload a photo of it."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(92vh-11rem)]">
          <div className="p-4 sm:p-6">
            {/* ---------------------------------------------------------- */}
            {/* Camera / scanning stage                                     */}
            {/* ---------------------------------------------------------- */}
            {showCameraStage && (
              <div className="space-y-4">
                <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-2xl border bg-muted">
                  <video
                    ref={videoRef}
                    className="h-full w-full object-cover"
                    playsInline
                    muted
                    aria-label="Certificate QR code camera preview"
                  />

                  {cameraState === "scanning" && phase === "scanning" && (
                    <>
                      {/* Framing guides */}
                      <div className="pointer-events-none absolute inset-0">
                        <span className="absolute left-6 top-6 h-10 w-10 rounded-tl-lg border-l-2 border-t-2 border-primary" />
                        <span className="absolute right-6 top-6 h-10 w-10 rounded-tr-lg border-r-2 border-t-2 border-primary" />
                        <span className="absolute bottom-6 left-6 h-10 w-10 rounded-bl-lg border-b-2 border-l-2 border-primary" />
                        <span className="absolute bottom-6 right-6 h-10 w-10 rounded-br-lg border-b-2 border-r-2 border-primary" />
                      </div>
                      {/* Subtle sweep — a single 3px gradient line, transform only. */}
                      <div className="pointer-events-none absolute inset-x-6 top-6 bottom-6 overflow-hidden">
                        <div className="h-[3px] w-full bg-gradient-to-r from-transparent via-primary to-transparent motion-safe:animate-scan-line" />
                      </div>
                    </>
                  )}

                  {(cameraState === "requesting" ||
                    phase === "detected" ||
                    phase === "verifying") && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/85 backdrop-blur-sm">
                      <Loader2 className="h-7 w-7 animate-spin text-primary" aria-hidden />
                      <p className="px-6 text-center text-sm font-medium">{statusLine}</p>
                    </div>
                  )}

                  {cameraBlocked && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-muted p-6 text-center">
                      <CameraOff className="h-8 w-8 text-muted-foreground" aria-hidden />
                      <p className="text-sm text-muted-foreground">{statusLine}</p>
                    </div>
                  )}
                </div>

                <p
                  role="status"
                  aria-live="polite"
                  className="text-center text-sm text-muted-foreground"
                >
                  {cameraState === "scanning" && phase === "scanning"
                    ? "Align the QR code inside the frame"
                    : statusLine}
                </p>
              </div>
            )}

            {/* ---------------------------------------------------------- */}
            {/* Not a UIC QR code                                           */}
            {/* ---------------------------------------------------------- */}
            {phase === "invalid-qr" && (
              <div
                role="alert"
                className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-center"
              >
                <ShieldAlert className="mx-auto mb-3 h-9 w-9 text-destructive" aria-hidden />
                <h3 className="mb-1 font-semibold">No UIC certificate QR code found</h3>
                <p className="mx-auto max-w-md text-sm text-muted-foreground">
                  This QR code is not a valid UIC certificate QR code. Make sure the whole
                  code is visible and in focus, then try again.
                </p>
              </div>
            )}

            {/* ---------------------------------------------------------- */}
            {/* Verification could not complete                             */}
            {/* ---------------------------------------------------------- */}
            {phase === "verify-failed" && (
              <div
                role="alert"
                className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-center"
              >
                <ShieldAlert className="mx-auto mb-3 h-9 w-9 text-destructive" aria-hidden />
                <h3 className="mb-1 font-semibold">Unable to verify this certificate</h3>
                <p className="mx-auto max-w-md text-sm text-muted-foreground">
                  We could not reach the verification service. Check your connection and try
                  again.
                </p>
              </div>
            )}

            {/* ---------------------------------------------------------- */}
            {/* Verification result                                         */}
            {/* ---------------------------------------------------------- */}
            {showResult && (
              <div className="space-y-4 motion-safe:animate-fade-in">
                <VerificationVerdict verdict={result.verdict} />
                {result.verdict !== "not_found" && result.verdict !== "invalid" && (
                  <>
                    <CertificateRecord data={result} />
                    <CertificateActions data={result} token={resultToken} />
                  </>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="flex-col gap-2 border-t p-4 sm:flex-row sm:justify-between sm:p-6">
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_IMAGE_TYPES}
              className="sr-only"
              onChange={handleFileChosen}
              aria-label="Upload an image of the certificate QR code"
            />
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={openFilePicker}
              disabled={isDecodingFile || phase === "verifying"}
            >
              <ImageUp className="h-4 w-4" aria-hidden />
              Upload QR Image
            </Button>

            {(showResult || phase === "invalid-qr" || phase === "verify-failed") && (
              <Button variant="outline" size="sm" className="gap-2" onClick={resetToScanning}>
                <RotateCw className="h-4 w-4" aria-hidden />
                Scan another
              </Button>
            )}

            {!showResult &&
              phase === "scanning" &&
              cameraBlocked &&
              isCameraSupported && (
                <Button variant="outline" size="sm" className="gap-2" onClick={() => void start()}>
                  <Camera className="h-4 w-4" aria-hidden />
                  Retry camera
                </Button>
              )}

            {!showResult && phase === "scanning" && cameraState === "stopped" && (
              <Button variant="outline" size="sm" className="gap-2" onClick={() => void start()}>
                <ScanLine className="h-4 w-4" aria-hidden />
                Resume camera
              </Button>
            )}
          </div>

          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default QrScannerDialog;
