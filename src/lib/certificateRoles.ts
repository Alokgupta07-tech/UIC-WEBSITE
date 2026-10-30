/**
 * Certificate Roles, Categories, and Dynamic Wording Dictionary
 *
 * Provides curated roles, teams, default appreciation blurbs,
 * suggested skills, and template recommendations for UIC SRM AP certificates.
 */

import type { CertificateCategory } from "@/types";

export interface RolePreset {
  id: string;
  name: string;
  team: string;
  defaultTitle: string;
  defaultCertificateType: string;
  recommendedTheme: "cyber-emerald" | "royal-sapphire" | "imperial-ruby" | "amethyst-prestige" | "grand-monarch";
  contributionTemplate: string;
  suggestedSkills: string[];
}

export interface TeamGroup {
  id: string;
  name: string;
  roles: RolePreset[];
}

export const CERTIFICATE_TEAMS: TeamGroup[] = [
  {
    id: "organizing",
    name: "Organizing & Leadership",
    roles: [
      {
        id: "lead-organizer",
        name: "Lead Organizer / Convenor",
        team: "Organizing & Leadership",
        defaultTitle: "CERTIFICATE OF APPRECIATION",
        defaultCertificateType: "Leadership & Organization",
        recommendedTheme: "amethyst-prestige",
        contributionTemplate:
          "In grateful recognition of exemplary leadership, vision, and tireless dedication as the Lead Organizer for {event}. Their strategic oversight, proactive coordination, and operational excellence were instrumental in delivering a flawless, high-impact experience.",
        suggestedSkills: ["Strategic Leadership", "Event Operations", "Team Management", "Stakeholder Communication", "Crisis Resolution"],
      },
      {
        id: "event-coordinator",
        name: "Event Coordinator",
        team: "Organizing & Leadership",
        defaultTitle: "CERTIFICATE OF APPRECIATION",
        defaultCertificateType: "Event Coordination",
        recommendedTheme: "royal-sapphire",
        contributionTemplate:
          "In recognition of outstanding organizational skill and active dedication as Event Coordinator for {event}. Successfully orchestrated end-to-end logistics, schedule management, and participant workflows to ensure smooth event execution.",
        suggestedSkills: ["Operations Management", "Schedule Coordination", "Cross-Functional Collaboration", "Problem Solving"],
      },
      {
        id: "volunteer",
        name: "Student Volunteer",
        team: "Organizing & Leadership",
        defaultTitle: "CERTIFICATE OF APPRECIATION",
        defaultCertificateType: "Volunteer Service",
        recommendedTheme: "royal-sapphire",
        contributionTemplate:
          "In heartfelt appreciation of enthusiastic commitment, tireless support, and invaluable volunteer service during {event}. Demonstrated exceptional team spirit, reliability, and on-ground operational support throughout the event.",
        suggestedSkills: ["On-ground Operations", "Participant Support", "Teamwork", "Agility"],
      },
    ],
  },
  {
    id: "technical",
    name: "Technical & Development Team",
    roles: [
      {
        id: "tech-lead",
        name: "Technical Lead",
        team: "Technical Team",
        defaultTitle: "CERTIFICATE OF APPRECIATION",
        defaultCertificateType: "Technical Leadership",
        recommendedTheme: "cyber-emerald",
        contributionTemplate:
          "Awarded in appreciation of outstanding technical stewardship and system architecture for {event}. Spearheaded platform reliability, testing frameworks, and high-performance developer tooling to power a seamless digital contest environment.",
        suggestedSkills: ["System Architecture", "Full-Stack Engineering", "Platform Reliability", "Cloud Infrastructure"],
      },
      {
        id: "platform-engineer",
        name: "Platform / Web Engineer",
        team: "Technical Team",
        defaultTitle: "CERTIFICATE OF APPRECIATION",
        defaultCertificateType: "Technical Contribution",
        recommendedTheme: "cyber-emerald",
        contributionTemplate:
          "In recognition of exceptional software development and rapid execution for {event}. Engineered critical web portals, automated evaluation workflows, and real-time leaderboard infrastructure.",
        suggestedSkills: ["Web Development", "TypeScript / React", "API Integration", "Database Optimization"],
      },
      {
        id: "tech-support",
        name: "Technical Support Specialist",
        team: "Technical Team",
        defaultTitle: "CERTIFICATE OF APPRECIATION",
        defaultCertificateType: "Technical Support",
        recommendedTheme: "cyber-emerald",
        contributionTemplate:
          "In sincere appreciation of dependable technical troubleshooting, rapid incident response, and continuous participant support during {event}.",
        suggestedSkills: ["Debugging", "User Support", "System Monitoring", "Live Incident Response"],
      },
    ],
  },
  {
    id: "marketing-pr",
    name: "Marketing & Public Relations",
    roles: [
      {
        id: "pr-lead",
        name: "Public Relations Lead",
        team: "Public Relations",
        defaultTitle: "CERTIFICATE OF APPRECIATION",
        defaultCertificateType: "PR & Communications",
        recommendedTheme: "amethyst-prestige",
        contributionTemplate:
          "In grateful recognition of stellar outreach, media relations, and brand representation for {event}. Established fruitful institutional partnerships, audience engagement campaigns, and premier public visibility.",
        suggestedSkills: ["Media Outreach", "Brand Strategy", "External Relations", "Keynote Management"],
      },
      {
        id: "marketing-specialist",
        name: "Marketing & Campaign Specialist",
        team: "Marketing Team",
        defaultTitle: "CERTIFICATE OF APPRECIATION",
        defaultCertificateType: "Marketing & Outreach",
        recommendedTheme: "royal-sapphire",
        contributionTemplate:
          "Awarded for creative marketing strategy and high-engagement promotional campaigns for {event}, driving record registrations, campus buzz, and multi-channel audience growth.",
        suggestedSkills: ["Growth Marketing", "Social Media Strategy", "Copywriting", "Campaign Analytics"],
      },
      {
        id: "graphic-designer",
        name: "Visual & Graphic Designer",
        team: "Creative & Design",
        defaultTitle: "CERTIFICATE OF APPRECIATION",
        defaultCertificateType: "Creative Design",
        recommendedTheme: "imperial-ruby",
        contributionTemplate:
          "In sincere appreciation of creative visual design, brand assets, banners, and digital collateral crafted for {event}, creating an inspiring aesthetic identity across all touchpoints.",
        suggestedSkills: ["UI/UX Design", "Brand Identity", "Motion Graphics", "Poster & Collateral Design"],
      },
    ],
  },
  {
    id: "operations-admin",
    name: "Administrative & Logistics",
    roles: [
      {
        id: "admin-lead",
        name: "Administrative Lead",
        team: "Administrative Team",
        defaultTitle: "CERTIFICATE OF APPRECIATION",
        defaultCertificateType: "Administrative Excellence",
        recommendedTheme: "amethyst-prestige",
        contributionTemplate:
          "In recognition of rigorous governance, budget auditing, venue permissions, and official documentation management executed with immaculate precision for {event}.",
        suggestedSkills: ["Operations Governance", "Resource Allocation", "University Compliance", "Record Management"],
      },
      {
        id: "admin-team",
        name: "Administrative Team",
        team: "Administrative Team",
        defaultTitle: "CERTIFICATE OF APPRECIATION",
        defaultCertificateType: "Administrative Support",
        recommendedTheme: "cyber-emerald",
        contributionTemplate:
          "In recognition of diligent administrative support, operational coordination, documentation, and dedicated assistance towards the smooth execution of {event}.",
        suggestedSkills: ["Administrative Support", "Operations Coordination", "Documentation", "Teamwork"],
      },
      {
        id: "logistics-manager",
        name: "Logistics & Hospitality Manager",
        team: "Logistics Team",
        defaultTitle: "CERTIFICATE OF APPRECIATION",
        defaultCertificateType: "Logistical Excellence",
        recommendedTheme: "royal-sapphire",
        contributionTemplate:
          "In grateful recognition of meticulous coordination of hospitality, food & refreshments, equipment procurement, and infrastructure setups for {event}.",
        suggestedSkills: ["Vendor Negotiation", "Supply Logistics", "Hospitality Management", "Venue Setup"],
      },
    ],
  },
  {
    id: "mentors-judges",
    name: "Mentors, Judges & Speakers",
    roles: [
      {
        id: "keynote-speaker",
        name: "Keynote / Guest Speaker",
        team: "Distinguished Guests",
        defaultTitle: "CERTIFICATE OF HONOR",
        defaultCertificateType: "Distinguished Speaker",
        recommendedTheme: "grand-monarch",
        contributionTemplate:
          "Presented with high honors for delivering an inspiring, thought-provoking keynote address at {event}. Your visionary insights and industry knowledge profoundly illuminated and inspired the academic community.",
        suggestedSkills: ["Keynote Address", "Industry Thought Leadership", "Technology Trends", "Mentorship"],
      },
      {
        id: "judge-evaluator",
        name: "Judge & Project Evaluator",
        team: "Evaluation Panel",
        defaultTitle: "CERTIFICATE OF APPRECIATION",
        defaultCertificateType: "Jury & Evaluation",
        recommendedTheme: "grand-monarch",
        contributionTemplate:
          "In deep gratitude for sharing profound technical discernment, fair rigorous evaluation, and constructive feedback as an esteemed member of the Jury for {event}.",
        suggestedSkills: ["Technical Assessment", "Project Evaluation", "Code Review", "Constructive Critiquing"],
      },
      {
        id: "workshop-instructor",
        name: "Workshop Instructor",
        team: "Academic & Training",
        defaultTitle: "CERTIFICATE OF APPRECIATION",
        defaultCertificateType: "Workshop Instruction",
        recommendedTheme: "imperial-ruby",
        contributionTemplate:
          "In grateful acknowledgment of designing and instructing a world-class, hands-on workshop during {event}. Empowered participants with pragmatic engineering methodologies and advanced technical skill.",
        suggestedSkills: ["Pedagogy", "Hands-on Workshop", "Live Coding", "Curriculum Design"],
      },
      {
        id: "mentor",
        name: "Technical / Hackathon Mentor",
        team: "Mentorship Panel",
        defaultTitle: "CERTIFICATE OF APPRECIATION",
        defaultCertificateType: "Mentorship",
        recommendedTheme: "amethyst-prestige",
        contributionTemplate:
          "In sincere appreciation of patient, round-the-clock mentorship, technical guidance, and architecture reviews provided to competing teams throughout {event}.",
        suggestedSkills: ["1-on-1 Mentorship", "Architecture Review", "Rapid Prototyping", "Team Enablement"],
      },
    ],
  },
  {
    id: "contest-awards",
    name: "Participants & Contest Winners",
    roles: [
      {
        id: "winner-1st",
        name: "1st Place / Champion",
        team: "Winners",
        defaultTitle: "CERTIFICATE OF EXCELLENCE",
        defaultCertificateType: "Winner - 1st Place",
        recommendedTheme: "grand-monarch",
        contributionTemplate:
          "For securing First Place with supreme technical ingenuity, flawless project execution, and groundbreaking innovation during {event}.",
        suggestedSkills: ["Algorithmic Excellence", "Rapid Prototyping", "Pitch Presentation", "Full-Stack Mastery"],
      },
      {
        id: "winner-2nd",
        name: "2nd Place / First Runner Up",
        team: "Winners",
        defaultTitle: "CERTIFICATE OF MERIT",
        defaultCertificateType: "1st Runner Up",
        recommendedTheme: "grand-monarch",
        contributionTemplate:
          "For securing Second Place and demonstrating extraordinary competence, technical precision, and exemplary achievement in {event}.",
        suggestedSkills: ["Innovation", "Technical Precision", "Collaborative Engineering"],
      },
      {
        id: "winner-3rd",
        name: "3rd Place / Second Runner Up",
        team: "Winners",
        defaultTitle: "CERTIFICATE OF MERIT",
        defaultCertificateType: "2nd Runner Up",
        recommendedTheme: "royal-sapphire",
        contributionTemplate:
          "For securing Third Place and demonstrating commendable problem-solving capability, creativity, and technical execution in {event}.",
        suggestedSkills: ["Problem Solving", "System Design", "Execution"],
      },
      {
        id: "special-award",
        name: "Special Recognition / Innovation Award",
        team: "Special Awards",
        defaultTitle: "CERTIFICATE OF MERIT",
        defaultCertificateType: "Special Recognition",
        recommendedTheme: "cyber-emerald",
        contributionTemplate:
          "Awarded in recognition of remarkable creativity, disruptive thinking, and exceptional innovation demonstrated in {event}.",
        suggestedSkills: ["Novel Concept", "Design Thinking", "Technical Prototype"],
      },
      {
        id: "participant",
        name: "Active Participant",
        team: "Participants",
        defaultTitle: "CERTIFICATE OF PARTICIPATION",
        defaultCertificateType: "Certificate of Participation",
        recommendedTheme: "royal-sapphire",
        contributionTemplate:
          "For actively participating and demonstrating commendable enthusiasm, technical curiosity, and collaborative spirit in {event}.",
        suggestedSkills: ["Participation", "Continuous Learning", "Teamwork"],
      },
    ],
  },
];

/** Flat list of all roles for search and dropdown lookup */
export const ALL_ROLES: RolePreset[] = CERTIFICATE_TEAMS.flatMap((group) => group.roles);

export function findRolePreset(roleIdOrName: string): RolePreset | undefined {
  const query = roleIdOrName.trim().toLowerCase();
  return ALL_ROLES.find(
    (role) => role.id.toLowerCase() === query || role.name.toLowerCase() === query
  );
}

/**
 * Return a reviewed category from the stable role preset ID. Free-text role or
 * team values are deliberately never used to infer a certificate category.
 */
export function getDefaultRecipientCategory(roleId: string): CertificateCategory | null {
  for (const group of CERTIFICATE_TEAMS) {
    if (!group.roles.some((role) => role.id === roleId)) continue;
    if (group.id === "organizing") return roleId === "volunteer" ? "volunteer" : "organizer";
    if (["technical", "marketing-pr", "operations-admin"].includes(group.id)) return "team_member";
    if (group.id === "contest-awards") {
      return roleId === "participant" ? "participant" : "winner";
    }
    const curatedCategories: Record<string, CertificateCategory> = {
      "keynote-speaker": "speaker",
      "judge-evaluator": "judge",
      "workshop-instructor": "speaker",
      mentor: "mentor",
    };
    return curatedCategories[roleId] ?? null;
  }
  return null;
}

/** Render a contribution template with dynamic event variables */
export function renderContributionBlurb(
  template: string,
  variables: { eventTitle?: string; recipientName?: string; team?: string; role?: string }
): string {
  let result = template;
  const event = variables.eventTitle || "the Unstop Igniters Club Event";
  const name = variables.recipientName || "the recipient";
  const team = variables.team || "our team";
  const role = variables.role || "team member";

  result = result.replace(/\{event\}/g, event);
  result = result.replace(/\{name\}/g, name);
  result = result.replace(/\{team\}/g, team);
  result = result.replace(/\{role\}/g, role);
  return result;
}
