import type { CertificateCategory } from "@/types";

export const CERTIFICATE_CATEGORIES: ReadonlyArray<{ value: CertificateCategory; label: string }> = [
  { value: "participant", label: "Participant" },
  { value: "winner", label: "Winner" },
  { value: "organizer", label: "Organizer" },
  { value: "volunteer", label: "Volunteer" },
  { value: "team_member", label: "Team member" },
  { value: "faculty_coordinator", label: "Faculty coordinator" },
  { value: "mentor", label: "Mentor" },
  { value: "speaker", label: "Speaker" },
  { value: "judge", label: "Judge" },
  { value: "other", label: "Other" },
];

/** Stable, reviewed category mapping. Free-text role names are never inspected. */
export function getCertificateFamily(category: CertificateCategory | null | undefined): "participant" | "organizer" | "recognition" | null {
  if (category === "participant" || category === "winner") return "participant";
  if (category === "organizer" || category === "volunteer" || category === "team_member") return "organizer";
  if (category) return "recognition";
  return null;
}

export function getCertificateCategoryLabel(category: CertificateCategory | null | undefined): string {
  return CERTIFICATE_CATEGORIES.find((item) => item.value === category)?.label ?? "Needs review";
}
