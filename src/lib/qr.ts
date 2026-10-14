// QR code rendering for printable certificates.
//
// Uses `qrcode-generator`, a zero-dependency encoder, loaded on demand so it
// never lands in the initial bundle. Only the admin certificate tools pull it in.

/** Error correction level. "M" survives a printed certificate being scuffed. */
const ERROR_CORRECTION = "M" as const;

/** The callable factory `qrcode-generator` exports. */
type QrFactory = typeof import("qrcode-generator");

/** `qrcode-generator` declares `export =`, so the ESM build surfaces the factory
 *  on `.default`. Older bundles hand back the factory directly. */
type QrNamespace = { default?: QrFactory };

let qrPromise: Promise<QrFactory> | null = null;

function loadQrCode(): Promise<QrFactory> {
  if (!qrPromise) {
    qrPromise = import("qrcode-generator").then((imported) => {
      const namespace = imported as unknown as QrNamespace;
      return namespace.default ?? (imported as unknown as QrFactory);
    });
  }
  return qrPromise;
}

/**
 * Render `text` as a standalone SVG QR code string.
 *
 * `cellSize` is the pixel size of one module and `margin` the quiet-zone width
 * in modules (4 is the spec minimum for reliable scanning).
 */
export async function createQrSvg(text: string, cellSize = 6, margin = 4): Promise<string> {
  const qrcode = await loadQrCode();

  // Type number 0 lets the library pick the smallest version that fits.
  const qr = qrcode(0, ERROR_CORRECTION);
  qr.addData(text);
  qr.make();

  return qr.createSvgTag({ cellSize, margin, scalable: true });
}

/** Trigger a browser download of a QR code as an `.svg` file. */
export async function downloadQrSvg(text: string, fileName: string): Promise<void> {
  const svg = await createQrSvg(text);
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName.endsWith(".svg") ? fileName : `${fileName}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    URL.revokeObjectURL(url);
  }
}
