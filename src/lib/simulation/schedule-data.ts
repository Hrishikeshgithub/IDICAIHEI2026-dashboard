import type { Category, MeetingStatus } from "@/lib/types";

/**
 * Demo programme modelled on the AI Conference presentation schedule (three tracks, parallel sessions,
 * two days). Names, rooms and paper IDs are reference/dummy data. Paper IDs are kept as strings because
 * the source lists some with leading zeros.
 */

export interface ScheduleBlock {
  label: string;
  start: string; // programme time, HH:mm
  end: string;
  papers: string[]; // empty = tea break or no papers scheduled
  kind: "session" | "break";
}

export interface SessionDef {
  code: string;
  track: Category;
  day: 1 | 2;
  mode: "offline" | "online";
  venue: string;
  floor: string;
  subtrack: string;
  chairs: string;
  rapporteur: string;
  blocks: ScheduleBlock[];
  /** Demo state at seed time (Day 1 is "in progress", Day 2 is upcoming). */
  status: MeetingStatus;
}

const ids = (s: string) => (s.trim() === "" ? [] : s.split(",").map((x) => x.trim()));

const DAY1 = (s1: string, s2: string): ScheduleBlock[] => [
  { label: "Session 1", start: "14:00", end: "15:30", papers: ids(s1), kind: "session" },
  { label: "Tea break", start: "15:30", end: "15:40", papers: [], kind: "break" },
  { label: "Session 2", start: "15:45", end: "17:35", papers: ids(s2), kind: "session" },
];
const DAY2 = (s1: string, s2: string): ScheduleBlock[] => [
  { label: "Session 1", start: "09:00", end: "10:30", papers: ids(s1), kind: "session" },
  { label: "Tea break", start: "10:30", end: "10:45", papers: [], kind: "break" },
  { label: "Session 2", start: "10:45", end: "12:45", papers: ids(s2), kind: "session" },
];
const AFTERNOON = (s: string): ScheduleBlock[] => [
  { label: "Session", start: "13:45", end: "16:15", papers: ids(s), kind: "session" },
];

const H = "medical_healthcare" as const;
const E = "education" as const;
const I = "industry" as const;

export const SESSIONS: SessionDef[] = [
  // ---------- Day 1 · Track 1: AI in Healthcare ----------
  { code: "AIH1", track: H, day: 1, mode: "offline", venue: "Visvesvaraya Seminar Hall", floor: "Ground Floor", subtrack: "Medical Image Processing / Implementation of AI in Healthcare", chairs: "Dr. Abhay Gaidhane; Mr. Naresh Chihwane", rapporteur: "Dr. Praveen Kumar", blocks: DAY1("172, 330, 352, 449, 368, 389, 658", "661, 775, 779, 793, 1012, 1023"), status: "live" },
  { code: "AIH2", track: H, day: 1, mode: "offline", venue: "Computer Center", floor: "Ground Floor", subtrack: "AI in Healthcare and Pharma / AI for Healthcare", chairs: "Dr. Gaurav Mishra; Dr. Ujjwal Gajbe", rapporteur: "Dr. Ashutosh Bagade", blocks: DAY1("307, 308, 344, 358, 442, 485, 551", "568, 573, 649, 662, 685, 694, 790, 839"), status: "live" },
  { code: "AIH3", track: H, day: 1, mode: "online", venue: "Intel Unnati", floor: "Ground Floor", subtrack: "Medical Image Processing / Implementation of AI in Healthcare", chairs: "Dr. Shivaji Ghungrud; Dr. Manoj Chandak", rapporteur: "Dr. Subodh Daronde", blocks: DAY1("44, 104, 108, 144, 190, 205, 280", "394, 462, 712, 754, 765, 816, 180, 224"), status: "live" },
  { code: "AIH4", track: H, day: 1, mode: "online", venue: "Prog. Lab-I", floor: "Ground Floor", subtrack: "AI in Healthcare and Pharma / AI for Healthcare", chairs: "Dr. Babaji Ghewade; Dr. Vaishali Kuchewar", rapporteur: "Mr. Samir Mendhe", blocks: DAY1("54, 215, 316, 387, 486, 556, 582", "666, 678, 722, 708, 1042"), status: "technical_issue" },
  // ---------- Day 1 · Track 2: AI in Education ----------
  { code: "AIE1", track: E, day: 1, mode: "offline", venue: "Nursing Seminar Hall", floor: "Nursing College", subtrack: "AI for Biotechnology / AI in Bioinformatics / AI for Evolutionary Computation", chairs: "Dr. Manali Kahiragar", rapporteur: "Dr. Laxmi Madireddy", blocks: DAY1("600, 782, 1038, 1005", ""), status: "live" },
  { code: "AIE2", track: E, day: 1, mode: "offline", venue: "ML Lab", floor: "Second Floor", subtrack: "AI for Cyber Security / AI for Evolutionary Computation", chairs: "Dr. Ajay Thakare", rapporteur: "Dr. Pavan Kumar", blocks: DAY1("575, 594, 607, 733, 830", ""), status: "live" },
  { code: "AIE3", track: E, day: 1, mode: "online", venue: "IBM Lab", floor: "Second Floor", subtrack: "AI for Biotechnology / AI in Bioinformatics / AI for Evolutionary Computation", chairs: "Dr. Smita Lonkar", rapporteur: "Ms. Sasipriya", blocks: DAY1("821, 122, 124, 746, 772, 773, 749", "243"), status: "waiting" },
  { code: "AIE4", track: E, day: 1, mode: "online", venue: "Prog. Lab-II", floor: "Second Floor", subtrack: "AI for Cyber Security / AI for Evolutionary Computation", chairs: "Dr. J. W. Bakal", rapporteur: "Dr. PKP Gaitry Chopra", blocks: DAY1("27, 28, 55, 159, 197, 234, 253", "5, 87, 59, 96, 02, 611"), status: "live" },
  // ---------- Day 1 · Track 3: AI in Industry ----------
  { code: "AII1", track: I, day: 1, mode: "offline", venue: "SAS Seminar Hall", floor: "Second Floor", subtrack: "AI for Planning and Scheduling Tasks / AI for Smart Offices", chairs: "Dr. B. Satyanarayana", rapporteur: "Dr. Shivnath Chaudhary", blocks: DAY1("240, 338, 580, 584, 461, 463, 814", "853, 989"), status: "live" },
  { code: "AII2", track: I, day: 1, mode: "offline", venue: "TCR-5", floor: "First Floor", subtrack: "AI for Distributed Intelligent Information System", chairs: "Dr. Sudhir Sambrey", rapporteur: "Dr. Naresh Nathi", blocks: DAY1("114, 193, 422, 567, 687, 846, 806", "1004, 1045"), status: "live" },
  { code: "AII3", track: I, day: 1, mode: "online", venue: "Big Data Lab", floor: "Second Floor", subtrack: "AI for Planning and Scheduling Tasks / AI for Smart Offices", chairs: "Ms. Josephine S", rapporteur: "Ms. Sneha Patle", blocks: DAY1("37, 56, 173, 174, 192, 217, 235", "320, 413, 427, 480, 831"), status: "live" },
  { code: "AII4", track: I, day: 1, mode: "online", venue: "PBL Lab", floor: "Second Floor", subtrack: "AI for Distributed Intelligent Information System", chairs: "Mr. S. Chiranjeevulu; Mr. Vinay Kakkar", rapporteur: "Ms. Yoginee Surkar", blocks: DAY1("88, 168, 317, 425, 431, 629, 732", "738, 798, 681, 705, 655"), status: "starting" },

  // ---------- Day 2 · Track 1 ----------
  { code: "AIH5", track: H, day: 2, mode: "offline", venue: "Visvesvaraya Seminar Hall", floor: "Ground Floor", subtrack: "AI for Augmented Reality (AR) – Virtual Reality (VR) / Big Data in Healthcare", chairs: "Dr. Zahir Qureshi; Dr. Puneet Futzela", rapporteur: "Dr. Praveen Kumar", blocks: DAY2("52, 241, 351, 361, 377, 399, 407", "411, 441, 450, 523, 532, 539, 635"), status: "scheduled" },
  { code: "AIH6", track: H, day: 2, mode: "offline", venue: "Computer Center", floor: "Ground Floor", subtrack: "Removing Data Bias from AI and Machine Learning Tools in Healthcare / Robotics and Control", chairs: "Dr. Tripti Waghmare; Dr. Vaibhav Anjankar", rapporteur: "Dr. Ashutosh Bagade", blocks: DAY2("259, 467, 577, 663, 800, 877, 1020", "1025"), status: "scheduled" },
  { code: "AIH7", track: H, day: 2, mode: "online", venue: "Intel Unnati", floor: "Ground Floor", subtrack: "AI for Augmented Reality (AR) – Virtual Reality (VR) / Big Data in Healthcare", chairs: "Dr. Sandeep Shrivastava; Dr. Anil Pothe", rapporteur: "Dr. Subodh Daronde", blocks: DAY2("149, 196, 201, 283, 290, 291, 318", "428, 534, 640, 698, 787, 794, 774, 789"), status: "scheduled" },
  // ---------- Day 2 · Track 2 ----------
  { code: "AIE5", track: E, day: 2, mode: "offline", venue: "Nursing Seminar Hall", floor: "Nursing College", subtrack: "AI for Mobile App Development / AI for Natural Language Processing", chairs: "Dr. Arvind R. Bhogat Patil", rapporteur: "Dr. Laxmi Madireddy", blocks: DAY2("14, 225, 760, 986", ""), status: "scheduled" },
  { code: "AIE6", track: E, day: 2, mode: "online", venue: "IBM Lab", floor: "Second Floor", subtrack: "AI for Mobile App Development / AI for Natural Language Processing", chairs: "Dr. Ajay Thakare; Dr. J. W. Bakal", rapporteur: "Ms. Sasipriya", blocks: DAY2("45, 99, 166, 471, 483, 610, 672", "692, 737, 742"), status: "scheduled" },
  { code: "AIE7", track: E, day: 2, mode: "online", venue: "Prog. Lab-II", floor: "Second Floor", subtrack: "AI for Search Heuristics", chairs: "Dr. Subhash K. Shinde", rapporteur: "Dr. PKP Gaitry Chopra", blocks: DAY2("91, 219, 295, 297, 319, 323, 679", "718"), status: "scheduled" },
  // ---------- Day 2 · Track 3 ----------
  { code: "AII5", track: I, day: 2, mode: "offline", venue: "SAS Seminar Hall", floor: "Second Floor", subtrack: "Block Chain", chairs: "Dr. K. P. Kannanakaren", rapporteur: "Dr. Shivnath Chaudhary", blocks: DAY2("1, 581, 615, 641, 647, 795, 918", "1016, 1017"), status: "scheduled" },
  { code: "AII6", track: I, day: 2, mode: "offline", venue: "TCR-5", floor: "First Floor", subtrack: "Robotics and Automation", chairs: "Dr. M. H. Kori", rapporteur: "Dr. Naresh Nathi", blocks: DAY2("9, 33, 335, 447, 478, 544, 609", "876"), status: "scheduled" },
  { code: "AII7", track: I, day: 2, mode: "online", venue: "Big Data Lab", floor: "Second Floor", subtrack: "Block Chain", chairs: "Mr. Aniruddha Kalbande", rapporteur: "Ms. Sneha Patle", blocks: DAY2("120, 202, 324, 426, 585, 642, 656", "664, 715, 745, 748, 1026"), status: "scheduled" },
  { code: "AII8", track: I, day: 2, mode: "online", venue: "PBL Lab", floor: "Second Floor", subtrack: "Robotics & Automation / AI for Evolutionary Computation / High Speed Internet Connectivity", chairs: "Dr. P. P. Roy", rapporteur: "Ms. Yoginee Surkar", blocks: DAY2("248, 258, 457, 356, 433, 559, 314", "443, 507, 10, 499, 608"), status: "scheduled" },
  { code: "AII9", track: I, day: 2, mode: "offline", venue: "SAS Seminar Hall", floor: "Second Floor", subtrack: "Process Integration / Additive Manufacturing / High Speed Internet Connectivity", chairs: "Dr. Ajay Thakare", rapporteur: "Dr. Shivnath Chaudhary", blocks: AFTERNOON("4, 84, 657, 1013, 797, 908, 776"), status: "scheduled" },
  { code: "AII10", track: I, day: 2, mode: "online", venue: "Big Data Lab", floor: "Second Floor", subtrack: "Process Integration / Additive Manufacturing", chairs: "Ms. S. Josephine", rapporteur: "Ms. Sneha Patle", blocks: AFTERNOON("57, 119, 218, 303, 521, 1040, 415"), status: "scheduled" },
];

export const TRACK_NAMES: Record<Category, string> = {
  medical_healthcare: "AI in Healthcare",
  education: "AI in Education",
  industry: "AI in Industry",
};
