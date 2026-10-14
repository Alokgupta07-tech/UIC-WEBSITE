import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { createQrSvg } from "@/lib/qr";
import { cn } from "@/lib/utils";

/**
 * Renders the QR code that gets printed on a certificate.
 *
 * The SVG comes from the encoder rather than a remote image service, so no
 * certificate link is ever sent to a third party.
 */
export function CertificateQrPreview({
  value,
  className,
  cellSize = 5,
}: {
  value: string;
  className?: string;
  cellSize?: number;
}) {
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setSvg(null);
    setFailed(false);

    createQrSvg(value, cellSize)
      .then((markup) => {
        if (active) setSvg(markup);
      })
      .catch(() => {
        if (active) setFailed(true);
      });

    return () => {
      active = false;
    };
  }, [value, cellSize]);

  if (failed) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-lg border bg-muted p-4 text-center text-xs text-muted-foreground",
          className
        )}
      >
        QR preview unavailable
      </div>
    );
  }

  if (!svg) {
    return (
      <div
        className={cn("flex items-center justify-center rounded-lg border bg-muted", className)}
        role="status"
        aria-label="Generating QR code"
      >
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-lg border bg-white p-2 [&_svg]:h-full [&_svg]:w-full",
        className
      )}
      role="img"
      aria-label="Certificate verification QR code"
      // The markup is produced locally by the QR encoder from a URL we built,
      // so there is no external or user-authored HTML in here.
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
