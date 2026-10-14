/**
 * Rating Dialog - Submit 1-5 star rating with confirmation
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ExternalLink, Star, Loader2 } from "lucide-react";
import { getSafeExternalLinkProps } from "@/lib/urlValidation";

interface RatingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName: string;
  participantName: string;
  liveUrl: string;
  onSubmit: (score: number) => Promise<void>;
  isLoading?: boolean;
}

const RATING_LABELS = {
  1: "Needs Work",
  2: "Below Average",
  3: "Average",
  4: "Good",
  5: "Outstanding",
};

export function RatingDialog({
  open,
  onOpenChange,
  projectName,
  participantName,
  liveUrl,
  onSubmit,
  isLoading = false,
}: RatingDialogProps) {
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [hoveredScore, setHoveredScore] = useState<number | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleReset = () => {
    setSelectedScore(null);
    setShowConfirmation(false);
    setHoveredScore(null);
  };

  const handleClose = () => {
    handleReset();
    onOpenChange(false);
  };

  const handleScoreSelect = (score: number) => {
    setSelectedScore(score);
    setShowConfirmation(true);
  };

  const handleConfirm = async () => {
    if (selectedScore === null) return;
    
    try {
      await onSubmit(selectedScore);
      handleClose();
    } catch (error) {
      console.error("Rating submission error:", error);
    }
  };

  const handleBack = () => {
    setShowConfirmation(false);
  };

  const displayScore = hoveredScore || selectedScore;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {showConfirmation ? "Confirm Your Rating" : "Rate Website"}
          </DialogTitle>
          <DialogDescription>
            {showConfirmation
              ? "Ratings are final once submitted. Please confirm your score."
              : "Rate this website on a scale of 1 to 5 stars."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Project Info */}
          <div className="space-y-2">
            <div>
              <Label className="text-xs text-muted-foreground">Project</Label>
              <p className="font-semibold">{projectName}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">By</Label>
              <p className="text-sm">{participantName}</p>
            </div>
          </div>

          {!showConfirmation && (
            <>
              {/* Open Website Link */}
              <Button
                variant="outline"
                className="w-full"
                asChild
              >
                <a href={liveUrl} {...getSafeExternalLinkProps()}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Website to Review
                </a>
              </Button>

              {/* Star Rating Selector */}
              <div className="space-y-3">
                <Label>Your Rating</Label>
                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((score) => (
                    <button
                      key={score}
                      type="button"
                      onClick={() => handleScoreSelect(score)}
                      onMouseEnter={() => setHoveredScore(score)}
                      onMouseLeave={() => setHoveredScore(null)}
                      className="transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary rounded"
                      aria-label={`Rate ${score} out of 5`}
                    >
                      <Star
                        className={`h-10 w-10 transition-colors ${
                          score <= (hoveredScore || selectedScore || 0)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {displayScore && (
                  <p className="text-center text-sm font-medium">
                    {displayScore} / 5 — {RATING_LABELS[displayScore as keyof typeof RATING_LABELS]}
                  </p>
                )}
              </div>
            </>
          )}

          {showConfirmation && selectedScore && (
            <div className="space-y-4">
              {/* Confirmation Display */}
              <div className="bg-muted rounded-lg p-6 space-y-3">
                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((score) => (
                    <Star
                      key={score}
                      className={`h-8 w-8 ${
                        score <= selectedScore
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-center text-lg font-semibold">
                  {selectedScore} / 5 — {RATING_LABELS[selectedScore as keyof typeof RATING_LABELS]}
                </p>
              </div>

              <p className="text-sm text-muted-foreground text-center">
                You are about to rate <strong>{projectName}</strong> with{" "}
                <strong>{selectedScore} stars</strong>. This action cannot be undone.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          {showConfirmation ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={isLoading}
              >
                Back
              </Button>
              <Button
                type="button"
                onClick={handleConfirm}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Confirm Rating"
                )}
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
