import { ImageUp, QrCode, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AnimatedBackground } from "@/components/shared/AnimatedBackground";

interface ScanCertificateCardProps {
  onScan: () => void;
}

/**
 * The dashboard's primary call to action: verify the QR code printed on a
 * physical UIC certificate. Both entry points open the same scanner, which
 * starts on the camera and offers image upload as a fallback.
 */
export function ScanCertificateCard({ onScan }: ScanCertificateCardProps) {
  return (
    <Card className="card-hover relative overflow-hidden border-primary/20">
      <AnimatedBackground interactive />

      <CardContent className="relative flex flex-col gap-5 p-5 sm:p-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary">
            <QrCode className="h-6 w-6 text-primary-foreground" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold tracking-tight sm:text-xl">Scan Certificate</h2>
            <p className="mt-1 max-w-lg text-sm text-muted-foreground">
              Got a certificate from a UIC event? Scan the QR code on it to confirm it is
              authentic and see the full verification record.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row md:flex-col lg:flex-row">
          <Button
            className="gap-2 bg-gradient-to-r from-primary to-secondary hover:opacity-90"
            onClick={onScan}
          >
            <ScanLine className="h-4 w-4" aria-hidden />
            Scan QR Code
          </Button>
          <Button variant="outline" className="gap-2" onClick={onScan}>
            <ImageUp className="h-4 w-4" aria-hidden />
            Upload QR Image
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
