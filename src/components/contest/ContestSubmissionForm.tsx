/**
 * Contest Submission Form - Submit/Edit Website
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { validateContestUrl, getSafeExternalLinkProps } from "@/lib/urlValidation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ExternalLink, AlertCircle, Loader2 } from "lucide-react";

const submissionSchema = z.object({
  projectName: z
    .string()
    .min(2, "Project name must be at least 2 characters")
    .max(120, "Project name must be less than 120 characters")
    .transform((val) => val.trim()),
  projectDescription: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(1000, "Description must be less than 1000 characters")
    .transform((val) => val.trim()),
  liveUrl: z.string().min(1, "Live website URL is required"),
  repoUrl: z.string().optional(),
});

type SubmissionFormData = z.infer<typeof submissionSchema>;

interface ContestSubmissionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    projectName: string;
    projectDescription: string;
    liveUrl: string;
    repoUrl?: string;
  }) => Promise<void>;
  defaultValues?: Partial<SubmissionFormData>;
  isEditing?: boolean;
  isLoading?: boolean;
}

export function ContestSubmissionForm({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
  isEditing = false,
  isLoading = false,
}: ContestSubmissionFormProps) {
  const [urlWarning, setUrlWarning] = useState<string | null>(null);
  const [repoWarning, setRepoWarning] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    reset,
  } = useForm<SubmissionFormData>({
    resolver: zodResolver(submissionSchema),
    defaultValues: defaultValues || {
      projectName: "",
      projectDescription: "",
      liveUrl: "",
      repoUrl: "",
    },
  });

  const liveUrl = watch("liveUrl");
  const repoUrl = watch("repoUrl");
  const projectDescription = watch("projectDescription");

  // Validate URLs on change
  const handleLiveUrlBlur = () => {
    if (!liveUrl) return;
    const result = validateContestUrl(liveUrl, { type: "website" });
    if (!result.isValid) {
      setUrlWarning(result.error || null);
    } else if (result.error) {
      setUrlWarning(result.error); // Warning but valid (e.g., HTTP instead of HTTPS)
    } else {
      setUrlWarning(null);
    }
  };

  const handleRepoUrlBlur = () => {
    if (!repoUrl || !repoUrl.trim()) {
      setRepoWarning(null);
      return;
    }
    const result = validateContestUrl(repoUrl, { type: "repository", required: false });
    if (!result.isValid) {
      setRepoWarning(result.error || null);
    } else {
      setRepoWarning(null);
    }
  };

  const handleFormSubmit = async (data: SubmissionFormData) => {
    // Final validation
    const liveUrlResult = validateContestUrl(data.liveUrl, { type: "website" });
    if (!liveUrlResult.isValid) {
      setUrlWarning(liveUrlResult.error || "Invalid website URL");
      return;
    }

    if (data.repoUrl && data.repoUrl.trim()) {
      const repoUrlResult = validateContestUrl(data.repoUrl, {
        type: "repository",
        required: false,
      });
      if (!repoUrlResult.isValid) {
        setRepoWarning(repoUrlResult.error || "Invalid repository URL");
        return;
      }
    }

    try {
      await onSubmit({
        projectName: data.projectName,
        projectDescription: data.projectDescription,
        liveUrl: liveUrlResult.sanitizedUrl!,
        repoUrl: data.repoUrl?.trim() || undefined,
      });
      reset();
      onOpenChange(false);
    } catch (error) {
      console.error("Submission error:", error);
    }
  };

  const handleTestLiveUrl = () => {
    if (liveUrl) {
      window.open(liveUrl, "_blank", "noopener,noreferrer");
    }
  };

  const characterCount = projectDescription?.length || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Your Website Submission" : "Submit Your Website"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update your project details. Make sure your website is publicly accessible."
              : "Share your website project with the Vibe Coding Contest community. All submissions are reviewed by peers."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Project Name */}
          <div className="space-y-2">
            <Label htmlFor="projectName">
              Website / Project Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="projectName"
              placeholder="My Awesome Website"
              {...register("projectName")}
              disabled={isSubmitting || isLoading}
            />
            {errors.projectName && (
              <p className="text-sm text-destructive">{errors.projectName.message}</p>
            )}
          </div>

          {/* Live Website URL */}
          <div className="space-y-2">
            <Label htmlFor="liveUrl">
              Live Website URL <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="liveUrl"
                type="url"
                placeholder="https://mywebsite.com"
                {...register("liveUrl")}
                onBlur={handleLiveUrlBlur}
                disabled={isSubmitting || isLoading}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleTestLiveUrl}
                disabled={!liveUrl || isSubmitting || isLoading}
                title="Test link in new tab"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
            {errors.liveUrl && (
              <p className="text-sm text-destructive">{errors.liveUrl.message}</p>
            )}
            {urlWarning && (
              <Alert variant={urlWarning.includes("strongly recommended") ? "default" : "destructive"}>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{urlWarning}</AlertDescription>
              </Alert>
            )}
            <p className="text-xs text-muted-foreground">
              Please open your website in a new tab and verify it loads properly before submitting.
            </p>
          </div>

          {/* Project Description */}
          <div className="space-y-2">
            <Label htmlFor="projectDescription">
              Short Project Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="projectDescription"
              placeholder="Describe your project, its purpose, and key features..."
              rows={5}
              maxLength={1000}
              {...register("projectDescription")}
              disabled={isSubmitting || isLoading}
            />
            <div className="flex justify-between items-center">
              {errors.projectDescription && (
                <p className="text-sm text-destructive">{errors.projectDescription.message}</p>
              )}
              <p className={`text-xs ml-auto ${characterCount > 950 ? "text-destructive" : "text-muted-foreground"}`}>
                {characterCount} / 1000 characters
              </p>
            </div>
          </div>

          {/* Repository URL (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="repoUrl">Source Code / GitHub Repository URL (Optional)</Label>
            <Input
              id="repoUrl"
              type="url"
              placeholder="https://github.com/username/project"
              {...register("repoUrl")}
              onBlur={handleRepoUrlBlur}
              disabled={isSubmitting || isLoading}
            />
            {errors.repoUrl && (
              <p className="text-sm text-destructive">{errors.repoUrl.message}</p>
            )}
            {repoWarning && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{repoWarning}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
              disabled={isSubmitting || isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || isLoading}>
              {isSubmitting || isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditing ? "Updating..." : "Submitting..."}
                </>
              ) : isEditing ? (
                "Update Submission"
              ) : (
                "Submit Website"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
