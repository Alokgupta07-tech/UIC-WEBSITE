export interface CertifiedStudent {
  id: string;
  name: string;
  department: string;
  year: string;
  achievement: string;
  event: string;
  position: string;
  imageUrl?: string;
  linkedInUrl?: string;
}

export const certifiedStudents: CertifiedStudent[] = [
  {
    id: "1",
    name: "Aarav Sharma",
    department: "Computer Science",
    year: "3rd Year",
    achievement: "Winner",
    event: "Build Unstop 2k24",
    position: "1st Place",
  },
  {
    id: "2",
    name: "Priya Patel",
    department: "Information Technology",
    year: "4th Year",
    achievement: "Finalist",
    event: "Solve the Case Unstop",
    position: "Top 10",
  },
  {
    id: "3",
    name: "Rohan Gupta",
    department: "Electronics",
    year: "2nd Year",
    achievement: "Best Innovation",
    event: "Hackathon Skills Workshop",
    position: "Special Mention",
  }
];
