import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Linkedin, Github, ExternalLink, BadgeCheck, MapPin, Mail, Calendar } from "lucide-react";
import type { TeamMember } from "@/types";

interface TeamMemberDialogProps {
  member: TeamMember | null;
  isOpen: boolean;
  onClose: () => void;
}

export function TeamMemberDialog({ member, isOpen, onClose }: TeamMemberDialogProps) {
  if (!member) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl gap-0 p-0 overflow-hidden sm:rounded-3xl">
        <div className="relative">
          {/* Header Background */}
          <div className="h-32 bg-gradient-to-br from-primary/20 via-primary/5 to-secondary/20" />
          
          <div className="px-6 pb-6 pt-0">
            {/* Avatar - Negative margin to overlap header */}
            <div className="relative -mt-16 mb-4 flex justify-between items-end">
              <Avatar className="h-32 w-32 ring-4 ring-background shadow-xl">
                <AvatarImage src={member.avatarUrl || undefined} alt={member.name} className="object-cover" />
                <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-4xl text-primary-foreground">
                  {member.name.split(" ").map((n) => n[0]).join("")}
                </AvatarFallback>
              </Avatar>
              
              {/* Action Buttons */}
              <div className="flex gap-2 mb-2">
                {member.linkedinUrl && (
                  <a
                    href={member.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-[#0A66C2] hover:text-white"
                  >
                    <Linkedin className="h-5 w-5" />
                  </a>
                )}
                {member.githubUrl && (
                  <a
                    href={member.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"
                  >
                    <Github className="h-5 w-5" />
                  </a>
                )}
                {member.unstopProfileUrl && (
                  <a
                    href={member.unstopProfileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
                  >
                    <ExternalLink className="h-5 w-5" />
                  </a>
                )}
              </div>
            </div>

            {/* Profile Info */}
            <DialogHeader className="text-left">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-3xl font-bold">{member.name}</DialogTitle>
                {member.isVerified && (
                  <BadgeCheck className="h-6 w-6 text-primary" aria-label="Verified Member" />
                )}
              </div>
              <DialogDescription className="text-lg font-medium text-primary mt-1">
                {member.role} {member.department && <span className="text-muted-foreground">• {member.department}</span>}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-8 grid gap-8 md:grid-cols-3">
              {/* Left Column - Details */}
              <div className="space-y-6 md:col-span-2">
                <div>
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">About</h4>
                  <p className="text-sm leading-relaxed text-foreground/90">
                    {member.bio || "This member hasn't added a bio yet."}
                  </p>
                </div>

                {member.skills && member.skills.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Skills & Expertise</h4>
                    <div className="flex flex-wrap gap-2">
                      {member.skills.map((skill) => (
                        <Badge key={skill} variant="secondary" className="px-3 py-1 bg-primary/10 hover:bg-primary/20 text-primary border-0">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Quick Stats/Contact */}
              <div className="space-y-4 rounded-2xl bg-muted/50 p-4 border">
                <div className="flex items-center gap-3 text-sm">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-background shadow-sm text-primary">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium">Active Member</p>
                    <p className="text-muted-foreground text-xs">Since 2024</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 text-sm">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-background shadow-sm text-primary">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium">Location</p>
                    <p className="text-muted-foreground text-xs">SRM University AP</p>
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
