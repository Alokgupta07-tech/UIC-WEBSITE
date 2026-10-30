import { CheckCircle2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CertificateCategory } from "@/types";

export interface CertificateDesignSelectorProps {
  selectedTemplate: string;
  onSelectTemplate: (templateKey: string) => void;
  onPreviewTemplate?: (templateKey: string) => void;
  recipientCategory?: CertificateCategory | null;
  className?: string;
}

export function CertificateDesignSelector({
  selectedTemplate,
  onSelectTemplate,
  onPreviewTemplate,
  recipientCategory,
  className,
}: CertificateDesignSelectorProps) {
  const isParticipantSelected =
    selectedTemplate === "participant-classic" ||
    selectedTemplate === "participant-emerald" ||
    (!selectedTemplate && (recipientCategory === "participant" || recipientCategory === "winner"));

  const isOrganizerSelected = !isParticipantSelected;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold tracking-tight text-foreground">
            Certificate Design Selection
          </h4>
          <p className="text-xs text-muted-foreground">
            Choose an official UIC template. Templates automatically adapt to verified recipient categories.
          </p>
        </div>
        {recipientCategory && (
          <Badge variant="outline" className="text-[11px] capitalize">
            Detected: {recipientCategory.replace("_", " ")}
          </Badge>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Template Card 1: Participant Certificate */}
        <div
          onClick={() => onSelectTemplate("participant-emerald")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelectTemplate("participant-emerald");
            }
          }}
          className={cn(
            "group relative flex flex-col justify-between overflow-hidden rounded-xl border p-4 text-left transition-all cursor-pointer",
            isParticipantSelected
              ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-md"
              : "border-border bg-card hover:border-primary/40 hover:bg-muted/40"
          )}
        >
          {/* Miniature Vector Preview Thumbnail of Design 1 */}
          <div className="relative mb-3 aspect-[1.414/1] w-full overflow-hidden rounded-lg border border-slate-200 bg-[#fcfdfb] shadow-inner">
            <svg
              viewBox="0 0 297 210"
              className="h-full w-full select-none"
              aria-label="Design 1 Participant Certificate Thumbnail"
            >
              {/* Top/bottom gold lines */}
              <line x1="28" y1="10" x2="269" y2="10" stroke="#cda243" strokeWidth="0.8" />
              <line x1="30" y1="200" x2="267" y2="200" stroke="#cda243" strokeWidth="0.8" />

              {/* Left curved emerald border */}
              <path
                d="M 0,0 L 24,0 Q 12,65 15,145 Q 16,180 25,210 L 0,210 Z"
                fill="#064e3b"
              />
              <path
                d="M 24,0 Q 12,65 15,145 Q 16,180 25,210 L 27,210 Q 18,180 14,145 Q 13,65 26,0 Z"
                fill="#cda243"
              />

              {/* Right curved emerald border */}
              <path
                d="M 297,0 L 273,0 Q 285,65 282,145 Q 281,180 272,210 L 297,210 Z"
                fill="#064e3b"
              />
              <path
                d="M 273,0 Q 285,65 282,145 Q 281,180 272,210 L 270,210 Q 279,180 283,145 Q 284,65 271,0 Z"
                fill="#cda243"
              />

              {/* Top left UIC emblem */}
              <rect x="34" y="16" width="16" height="12" rx="2" fill="#064e3b" opacity="0.8" />
              <text x="54" y="22" fontSize="5" fontWeight="bold" fill="#064e3b">UIC SRM-AP</text>

              {/* Certificate Heading */}
              <text x="148.5" y="42" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#0f2043" fontFamily="serif">
                CERTIFICATE
              </text>
              <text x="148.5" y="50" textAnchor="middle" fontSize="5" fontWeight="bold" fill="#334155" letterSpacing="1.5">
                OF PARTICIPATION
              </text>

              {/* Participant Pill */}
              <rect x="126" y="55" width="45" height="6" rx="3" fill="#f0fdf4" stroke="#064e3b" strokeWidth="0.5" />
              <text x="148.5" y="59.5" textAnchor="middle" fontSize="3.5" fontWeight="bold" fill="#064e3b">
                PARTICIPANT
              </text>

              {/* Recipient name placeholder */}
              <text x="148.5" y="78" textAnchor="middle" fontSize="10" fontStyle="italic" fontWeight="bold" fill="#b88626" fontFamily="serif">
                Recipient Name
              </text>
              <line x1="110" y1="83" x2="187" y2="83" stroke="#cda243" strokeWidth="0.5" />
              <circle cx="148.5" cy="83" r="1.2" fill="#cda243" />

              {/* Center Medal */}
              <circle cx="148.5" cy="150" r="9" fill="#cda243" />
              <circle cx="148.5" cy="150" r="7.5" fill="#064e3b" />
              <polygon points="144,157 141,170 144,167 147,170 147,157" fill="#cda243" />
              <polygon points="150,157 147,170 150,167 153,170 153,157" fill="#cda243" />

              {/* Signatures */}
              <line x1="50" y1="165" x2="90" y2="165" stroke="#94a3b8" strokeWidth="0.6" />
              <text x="70" y="171" textAnchor="middle" fontSize="4" fontWeight="bold" fill="#0f2043">Faculty Coordinator</text>

              <line x1="207" y1="165" x2="247" y2="165" stroke="#94a3b8" strokeWidth="0.6" />
              <text x="227" y="171" textAnchor="middle" fontSize="4" fontWeight="bold" fill="#0f2043">President</text>

              {/* QR Code */}
              <rect x="34" y="178" width="12" height="12" fill="#cbd5e1" stroke="#064e3b" strokeWidth="0.4" />
            </svg>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <h5 className="font-semibold text-sm leading-snug">Participant Certificate</h5>
              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-800 border-emerald-200">
                Participation
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">
              Elegant emerald-green and gold participation certificate.
            </p>
          </div>

          <div className="mt-4 flex items-center justify-between gap-2 pt-2 border-t">
            <Button
              type="button"
              size="sm"
              variant={isParticipantSelected ? "default" : "outline"}
              className="w-full text-xs"
              onClick={(e) => {
                e.stopPropagation();
                onSelectTemplate("participant-emerald");
              }}
            >
              {isParticipantSelected ? (
                <>
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                  Selected
                </>
              ) : (
                "Select Template"
              )}
            </Button>
            {onPreviewTemplate && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="shrink-0 text-xs px-2.5"
                title="Preview Participant Certificate"
                onClick={(e) => {
                  e.stopPropagation();
                  onPreviewTemplate("participant-emerald");
                }}
              >
                <Eye className="h-3.5 w-3.5" />
                <span className="sr-only">Preview</span>
              </Button>
            )}
          </div>
        </div>

        {/* Template Card 2: Organizer Certificate */}
        <div
          onClick={() => onSelectTemplate("organizer-forest")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelectTemplate("organizer-forest");
            }
          }}
          className={cn(
            "group relative flex flex-col justify-between overflow-hidden rounded-xl border p-4 text-left transition-all cursor-pointer",
            isOrganizerSelected
              ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-md"
              : "border-border bg-card hover:border-primary/40 hover:bg-muted/40"
          )}
        >
          {/* Miniature Vector Preview Thumbnail of Design 2 */}
          <div className="relative mb-3 aspect-[1.414/1] w-full overflow-hidden rounded-lg border border-slate-200 bg-[#05382a] shadow-inner">
            <svg
              viewBox="0 0 297 210"
              className="h-full w-full select-none"
              aria-label="Design 2 Organizer Certificate Thumbnail"
            >
              {/* Outer Deep Emerald Canvas */}
              <rect width="297" height="210" fill="#05382a" />

              {/* Inner Ivory Card with Notched Corners */}
              <path
                d="M 18,12 L 279,12 L 285,18 L 285,192 L 279,198 L 18,198 L 12,192 L 12,18 Z"
                fill="#fcfdfa"
                stroke="#cda243"
                strokeWidth="1"
              />

              {/* Top-Right Diagonal Layered Ribbons */}
              <polygon points="216,0 297,81 297,65 232,0" fill="#084836" />
              <polygon points="232,0 297,65 297,50 247,0" fill="#cda243" />
              <polygon points="247,0 297,50 297,43 254,0" fill="#0e6b50" />

              {/* Bottom-Left Diagonal Layered Ribbons */}
              <polygon points="0,143 81,210 65,210 0,159" fill="#084836" />
              <polygon points="0,159 65,210 50,210 0,174" fill="#cda243" />
              <polygon points="0,174 50,210 43,210 0,181" fill="#0e6b50" />

              {/* Upper Right Award Badge */}
              <circle cx="216" cy="52" r="10" fill="#cda243" />
              <circle cx="216" cy="52" r="8" fill="#064e3b" />
              <polygon points="212,56 209,68 212,65 215,68 215,56" fill="#064e3b" />
              <polygon points="217,56 214,68 217,65 220,68 220,56" fill="#064e3b" />

              {/* Script Title "Certificate" */}
              <text x="75" y="42" fontSize="16" fontStyle="italic" fill="#0f172a" fontFamily="cursive, serif">
                Certificate
              </text>
              <line x1="30" y1="48" x2="65" y2="48" stroke="#cda243" strokeWidth="0.6" />
              <text x="95" y="49.5" textAnchor="middle" fontSize="4.5" fontWeight="bold" fill="#1e293b" letterSpacing="1">
                OF APPRECIATION
              </text>
              <line x1="125" y1="48" x2="160" y2="48" stroke="#cda243" strokeWidth="0.6" />

              {/* Recipient name */}
              <text x="30" y="74" fontSize="11" fontStyle="italic" fontWeight="bold" fill="#0f172a" fontFamily="serif">
                Name Surname
              </text>

              {/* Organizer Pill Badge */}
              <rect x="30" y="80" width="35" height="6" rx="1.5" fill="#064e3b" />
              <text x="47.5" y="84.5" textAnchor="middle" fontSize="3.5" fontWeight="bold" fill="#ffffff">
                ORGANIZER
              </text>
              <text x="70" y="84.5" fontSize="3.8" fontWeight="bold" fill="#064e3b">
                Lead • Operations Team
              </text>

              {/* Signatures */}
              <line x1="40" y1="165" x2="80" y2="165" stroke="#cda243" strokeWidth="0.6" />
              <text x="60" y="170" textAnchor="middle" fontSize="3.5" fontWeight="bold" fill="#0f172a">Faculty Coordinator</text>

              <line x1="120" y1="165" x2="160" y2="165" stroke="#cda243" strokeWidth="0.6" />
              <text x="140" y="170" textAnchor="middle" fontSize="3.5" fontWeight="bold" fill="#0f172a">President</text>

              {/* QR Code */}
              <rect x="235" y="160" width="12" height="12" fill="#cbd5e1" stroke="#cda243" strokeWidth="0.4" />
            </svg>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <h5 className="font-semibold text-sm leading-snug">Organizer Certificate</h5>
              <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-800 border-amber-200">
                Appreciation
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">
              Premium geometric emerald-green and gold appreciation certificate.
            </p>
          </div>

          <div className="mt-4 flex items-center justify-between gap-2 pt-2 border-t">
            <Button
              type="button"
              size="sm"
              variant={isOrganizerSelected ? "default" : "outline"}
              className="w-full text-xs"
              onClick={(e) => {
                e.stopPropagation();
                onSelectTemplate("organizer-forest");
              }}
            >
              {isOrganizerSelected ? (
                <>
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                  Selected
                </>
              ) : (
                "Select Template"
              )}
            </Button>
            {onPreviewTemplate && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="shrink-0 text-xs px-2.5"
                title="Preview Organizer Certificate"
                onClick={(e) => {
                  e.stopPropagation();
                  onPreviewTemplate("organizer-forest");
                }}
              >
                <Eye className="h-3.5 w-3.5" />
                <span className="sr-only">Preview</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

