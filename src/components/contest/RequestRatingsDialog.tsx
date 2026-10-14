/**
 * Request Ratings Dialog - Share invitation to get reviews
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Link2, Copy, Share2, Check } from "lucide-react";
import { toast } from "sonner";

interface RequestRatingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName: string;
  shareUrl: string;
}

export function RequestRatingsDialog({
  open,
  onOpenChange,
  projectName,
  shareUrl,
}: RequestRatingsDialogProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);

  const invitationMessage = `Hi! I've submitted my website "${projectName}" for the Vibe Coding Contest. Please check it out and give it an honest rating out of 5. You can explore my website and other participants' projects through the contest gallery. Your feedback would be appreciated!\n\n${shareUrl}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(invitationMessage);
      setCopiedMessage(true);
      toast.success("Message copied to clipboard!");
      setTimeout(() => setCopiedMessage(false), 2000);
    } catch (error) {
      toast.error("Failed to copy message");
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Rate my website: ${projectName}`,
          text: invitationMessage,
          url: shareUrl,
        });
        toast.success("Shared successfully!");
      } catch (error) {
        // User cancelled share
        if ((error as Error).name !== "AbortError") {
          toast.error("Failed to share");
        }
      }
    } else {
      handleCopyMessage();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Request Ratings</DialogTitle>
          <DialogDescription>
            Share your contest submission with others to request ratings and feedback
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Project Name Display */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Your Project</Label>
            <p className="font-semibold text-lg">{projectName}</p>
          </div>

          {/* Shareable Link */}
          <div className="space-y-2">
            <Label htmlFor="shareUrl">Shareable Link</Label>
            <div className="flex gap-2">
              <Input
                id="shareUrl"
                value={shareUrl}
                readOnly
                onClick={(e) => e.currentTarget.select()}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyLink}
                title="Copy link"
              >
                {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              This link will take others directly to the contest gallery
            </p>
          </div>

          {/* Invitation Message */}
          <div className="space-y-2">
            <Label htmlFor="invitationMessage">Invitation Message</Label>
            <Textarea
              id="invitationMessage"
              value={invitationMessage}
              readOnly
              rows={6}
              onClick={(e) => e.currentTarget.select()}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Pre-written message you can copy and share
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button onClick={handleCopyLink} variant="outline" className="flex-1">
              <Link2 className="h-4 w-4 mr-2" />
              Copy Link
            </Button>
            <Button onClick={handleCopyMessage} variant="outline" className="flex-1">
              {copiedMessage ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              Copy Message
            </Button>
            <Button onClick={handleShare} className="flex-1">
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>

          {/* Tips */}
          <div className="bg-muted rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium">Tips for getting more ratings:</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Share your link with fellow participants and friends</li>
              <li>Rate other projects to encourage reciprocal reviews</li>
              <li>Ensure your website is accessible and loads quickly</li>
              <li>A clear project description helps reviewers understand your work</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
