<<<<<<< HEAD
import { Instagram, Linkedin } from "lucide-react";
=======
import { Instagram, Linkedin, Youtube, MessageCircle } from "lucide-react";
>>>>>>> 6d2dd8d5f58e58677c7bbdffdd45d1bd4d830670
import { useSettings } from "@/contexts/SettingsContext";

type LinkItem = {
  key: string;
  href: string | null;
  icon: typeof Instagram;
  label: string;
};

const LINK_DEFS: LinkItem[] = [
  { key: "instagram", icon: Instagram, label: "Instagram" },
  { key: "linkedin", icon: Linkedin, label: "LinkedIn" },
<<<<<<< HEAD
=======
  { key: "youtube", icon: Youtube, label: "YouTube" },
  { key: "whatsapp", icon: MessageCircle, label: "WhatsApp Community" },
>>>>>>> 6d2dd8d5f58e58677c7bbdffdd45d1bd4d830670
];

function getHref(key: string, social: ReturnType<typeof useSettings>["settings"]["social"]): string | null {
  switch (key) {
    case "instagram":
      return social.instagram;
    case "linkedin":
      return social.linkedin;
<<<<<<< HEAD
=======
    case "youtube":
      return social.youtube;
    case "whatsapp":
      return social.whatsappCommunity;
>>>>>>> 6d2dd8d5f58e58677c7bbdffdd45d1bd4d830670
    default:
      return null;
  }
}

interface SocialLinksProps {
  /** Rendered as compact icon buttons (no text). Default true. */
  iconOnly?: boolean;
  /** Extra CSS classes on the container. */
  className?: string;
  /** Extra CSS classes on each link. */
  linkClassName?: string;
}

/**
 * Social links rendered from the SettingsContext (admin-configurable).
 * Hides any link whose URL is null.
 */
export function SocialLinks({ iconOnly = true, className, linkClassName }: SocialLinksProps) {
  const { settings } = useSettings();
  const social = settings.social;

  const links = LINK_DEFS.filter((def) => !!getHref(def.key, social));

  if (links.length === 0) return null;

  return (
    <div className={`flex gap-3 ${className ?? ""}`}>
      {links.map((def) => {
        const Icon = def.icon;
        const href = getHref(def.key, social)!;
        return (
          <a
            key={def.key}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={def.label}
            className={linkClassName}
          >
            {iconOnly ? (
              <Icon className="h-4 w-4" />
            ) : (
              <span className="flex items-center gap-1.5">
                <Icon className="h-4 w-4" />
                <span>{def.label}</span>
              </span>
            )}
          </a>
        );
      })}
    </div>
  );
}
