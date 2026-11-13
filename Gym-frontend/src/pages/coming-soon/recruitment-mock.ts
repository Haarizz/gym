/** Sample data for the Recruitment preview (coming soon), adapted from the GymBios Web App Design mock-ups. */
import { daysFromNow } from "../../components/coming-soon/preview-kit";

export type JobStatus = "Open" | "Paused" | "Closed";
export interface Job {
  id: string; title: string; department: string; branch: string; type: "Full-time" | "Part-time" | "Freelance";
  status: JobStatus; salary: string; posted: string; priority: "High" | "Medium" | "Low"; openings: number;
  description: string; requirements: string[];
}

export type Stage = "applied" | "shortlisted" | "interview" | "offer" | "hired" | "rejected";
export interface Candidate {
  id: string; name: string; email: string; phone: string; jobId: string; stage: Stage; applied: string; score: number;
  tags: string[]; experience: string; location: string; source: string; notes: string;
}

export interface Interview {
  id: string; candidateId: string; date: string; time: string; interviewer: string; mode: "In person" | "Video call"; round: string;
}

export const JOBS: Job[] = [
  { id: "J-101", title: "Personal Trainer", department: "Fitness", branch: "Dubai Marina", type: "Full-time", status: "Open", salary: "5,000 – 8,000 / month",
    posted: daysFromNow(-21), priority: "High", openings: 2, description: "Experienced trainer for one-to-one and small-group sessions, with a PT sales target.",
    requirements: ["REPs-certified (level 3)", "2+ years on a gym floor", "CPR / first aid"] },
  { id: "J-102", title: "Membership Sales Executive", department: "Sales", branch: "Downtown Dubai", type: "Full-time", status: "Open", salary: "4,000 – 6,000 + commission",
    posted: daysFromNow(-16), priority: "High", openings: 1, description: "Drive new memberships and renewals from walk-ins, leads and referrals.",
    requirements: ["Sales experience", "Fluent English (Arabic a plus)", "CRM experience"] },
  { id: "J-103", title: "Front Desk Receptionist", department: "Operations", branch: "Abu Dhabi", type: "Full-time", status: "Open", salary: "3,500 – 4,500 / month",
    posted: daysFromNow(-9), priority: "Medium", openings: 1, description: "Member check-in, payments at the desk and first point of contact.",
    requirements: ["Customer service", "Comfortable with POS and computers", "Rotating shifts"] },
  { id: "J-104", title: "Yoga Instructor", department: "Fitness", branch: "Dubai Marina", type: "Part-time", status: "Open", salary: "150 per class",
    posted: daysFromNow(-12), priority: "Medium", openings: 1, description: "Vinyasa and Hatha group classes, mornings and evenings.",
    requirements: ["200-hour Yoga Alliance", "Group class experience"] },
  { id: "J-105", title: "Nutrition Consultant", department: "Wellness", branch: "Downtown Dubai", type: "Full-time", status: "Paused", salary: "6,000 – 9,000 / month",
    posted: daysFromNow(-40), priority: "Low", openings: 1, description: "Diet plans and body-composition consultations for members.",
    requirements: ["Nutrition degree", "DHA licence", "3+ years experience"] },
  { id: "J-106", title: "Maintenance Technician", department: "Facilities", branch: "All branches", type: "Full-time", status: "Closed", salary: "4,500 – 5,500 / month",
    posted: daysFromNow(-60), priority: "Low", openings: 1, description: "Preventive maintenance of gym equipment and facilities.",
    requirements: ["Technical diploma", "Equipment repair experience"] },
];

export const CANDIDATES: Candidate[] = [
  { id: "C-01", name: "Ahmed Hassan", email: "ahmed.h@example.com", phone: "+971 50 123 4567", jobId: "J-101", stage: "applied", applied: daysFromNow(-2), score: 85,
    tags: ["REPs level 3", "5+ years"], experience: "5 years", location: "Dubai", source: "Website", notes: "Strong strength-coaching background." },
  { id: "C-02", name: "Sara Mohammed", email: "sara.m@example.com", phone: "+971 55 234 5678", jobId: "J-101", stage: "shortlisted", applied: daysFromNow(-8), score: 92,
    tags: ["Nutrition specialist", "Bilingual"], experience: "7 years", location: "Dubai", source: "Referral", notes: "Referred by Maria Garcia. Very good member reviews at her last gym." },
  { id: "C-03", name: "John Smith", email: "john.s@example.com", phone: "+971 52 345 6789", jobId: "J-102", stage: "interview", applied: daysFromNow(-10), score: 88,
    tags: ["B2B sales", "Fitness industry"], experience: "4 years", location: "Dubai", source: "LinkedIn", notes: "Closed corporate memberships at a competitor." },
  { id: "C-04", name: "Fatima Ali", email: "fatima.a@example.com", phone: "+971 56 456 7890", jobId: "J-103", stage: "offer", applied: daysFromNow(-7), score: 95,
    tags: ["Bilingual", "Customer service"], experience: "3 years", location: "Abu Dhabi", source: "Walk-in", notes: "Offer sent — awaiting reply." },
  { id: "C-05", name: "Maria Garcia", email: "maria.g@example.com", phone: "+971 50 567 8901", jobId: "J-104", stage: "hired", applied: daysFromNow(-25), score: 90,
    tags: ["Yoga Alliance 500", "Group classes"], experience: "6 years", location: "Dubai", source: "Instagram", notes: "Starts on the 1st." },
  { id: "C-06", name: "Omar Abdullah", email: "omar.a@example.com", phone: "+971 55 678 9012", jobId: "J-102", stage: "applied", applied: daysFromNow(-1), score: 78,
    tags: ["Fresh graduate", "Energetic"], experience: "1 year", location: "Sharjah", source: "Website", notes: "" },
  { id: "C-07", name: "Lisa Chen", email: "lisa.c@example.com", phone: "+971 52 789 0123", jobId: "J-102", stage: "shortlisted", applied: daysFromNow(-6), score: 86,
    tags: ["Multilingual", "Sales awards"], experience: "3 years", location: "Dubai", source: "LinkedIn", notes: "Speaks English, Mandarin and Arabic." },
  { id: "C-08", name: "Khalid Al Mansouri", email: "khalid.m@example.com", phone: "+971 56 890 1234", jobId: "J-101", stage: "rejected", applied: daysFromNow(-14), score: 62,
    tags: ["No certification"], experience: "2 years", location: "Dubai", source: "Website", notes: "No recognised PT certification yet." },
  { id: "C-09", name: "Priya Nair", email: "priya.n@example.com", phone: "+971 50 901 2345", jobId: "J-104", stage: "interview", applied: daysFromNow(-5), score: 89,
    tags: ["Yoga Alliance 200", "Pilates"], experience: "4 years", location: "Dubai", source: "Referral", notes: "Can also cover mat Pilates." },
  { id: "C-10", name: "Daniel Okafor", email: "daniel.o@example.com", phone: "+971 55 012 3456", jobId: "J-101", stage: "interview", applied: daysFromNow(-9), score: 87,
    tags: ["Strength & conditioning", "Boxing"], experience: "6 years", location: "Dubai", source: "LinkedIn", notes: "Ex-amateur boxer; could run boxing classes." },
  { id: "C-11", name: "Noura Saeed", email: "noura.s@example.com", phone: "+971 52 123 9876", jobId: "J-103", stage: "shortlisted", applied: daysFromNow(-4), score: 84,
    tags: ["Arabic & English", "Hospitality"], experience: "2 years", location: "Abu Dhabi", source: "Walk-in", notes: "" },
  { id: "C-12", name: "Rahul Verma", email: "rahul.v@example.com", phone: "+971 56 234 8765", jobId: "J-102", stage: "offer", applied: daysFromNow(-15), score: 91,
    tags: ["Top performer", "Corporate sales"], experience: "5 years", location: "Dubai", source: "Referral", notes: "Negotiating commission split." },
  { id: "C-13", name: "Elena Petrova", email: "elena.p@example.com", phone: "+971 50 345 7654", jobId: "J-101", stage: "applied", applied: daysFromNow(0), score: 80,
    tags: ["Women-only classes", "HIIT"], experience: "3 years", location: "Dubai", source: "Instagram", notes: "" },
  { id: "C-14", name: "Yusuf Rahman", email: "yusuf.r@example.com", phone: "+971 55 456 6543", jobId: "J-103", stage: "applied", applied: daysFromNow(-3), score: 73,
    tags: ["Cashier experience"], experience: "1 year", location: "Abu Dhabi", source: "Website", notes: "" },
  { id: "C-15", name: "Hannah Lee", email: "hannah.l@example.com", phone: "+971 52 567 5432", jobId: "J-101", stage: "hired", applied: daysFromNow(-30), score: 93,
    tags: ["Physiotherapy", "Rehab"], experience: "8 years", location: "Dubai", source: "Referral", notes: "Joined last week." },
];

export const INTERVIEWS: Interview[] = [
  { id: "I-01", candidateId: "C-03", date: daysFromNow(0), time: "11:00", interviewer: "Sarah Ahmed", mode: "In person", round: "Final round" },
  { id: "I-02", candidateId: "C-09", date: daysFromNow(0), time: "16:30", interviewer: "Maria Garcia", mode: "In person", round: "Demo class" },
  { id: "I-03", candidateId: "C-10", date: daysFromNow(1), time: "10:00", interviewer: "Omar Khalil", mode: "In person", round: "Practical session" },
  { id: "I-04", candidateId: "C-02", date: daysFromNow(1), time: "14:00", interviewer: "Sarah Ahmed", mode: "Video call", round: "First interview" },
  { id: "I-05", candidateId: "C-07", date: daysFromNow(2), time: "12:00", interviewer: "Lisa Chen", mode: "Video call", round: "First interview" },
  { id: "I-06", candidateId: "C-11", date: daysFromNow(4), time: "09:30", interviewer: "Fatima Ali", mode: "In person", round: "First interview" },
];

export const STAGES: { id: Stage; label: string; tone: string }[] = [
  { id: "applied", label: "Applied", tone: "#64748b" },
  { id: "shortlisted", label: "Shortlisted", tone: "#2a78d6" },
  { id: "interview", label: "Interview", tone: "#6250d6" },
  { id: "offer", label: "Offer", tone: "#b45309" },
  { id: "hired", label: "Hired", tone: "#15803d" },
];
