export type Provider = {
  id: string;
  name: string;
  creds: string;
  specialty: string;
  city: string;
  next: string;
  bio: string;
};

export const PROVIDERS: Provider[] = [
  {
    id: "martinez",
    name: "Dr. Rachel Martinez",
    creds: "MD",
    specialty: "Community Health",
    city: "Atlanta",
    next: "Today 14:30",
    bio: "Community Health Director. Coordinates virtual primary care across Georgia DBHDD partnerships.",
  },
  {
    id: "okonkwo",
    name: "Dr. James Okonkwo",
    creds: "MD",
    specialty: "Internal Medicine",
    city: "Savannah",
    next: "Today 16:00",
    bio: "Adult medicine, chronic care, and telehealth follow-up for coastal Georgia.",
  },
  {
    id: "lewis",
    name: "Amara Lewis",
    creds: "FNP-C",
    specialty: "Family Practice",
    city: "Macon",
    next: "Tomorrow 09:15",
    bio: "Family nurse practitioner covering wellness, women's health, and same-day virtual visits.",
  },
  {
    id: "shah",
    name: "Dr. Priya Shah",
    creds: "MD",
    specialty: "Psychiatry",
    city: "Atlanta",
    next: "Tue 11:00",
    bio: "Adult psychiatry with a focus on anxiety, mood, and medication education.",
  },
  {
    id: "ortega",
    name: "Luis Ortega",
    creds: "LCSW",
    specialty: "Behavioral Health",
    city: "Augusta",
    next: "Wed 13:45",
    bio: "Licensed clinical social worker supporting housing-linked behavioral health.",
  },
  {
    id: "park",
    name: "Dr. Helen Park",
    creds: "MD",
    specialty: "Pediatrics",
    city: "Columbus",
    next: "Thu 10:00",
    bio: "Pediatric telehealth for families relocating into west Georgia.",
  },
];

export type Assistant = {
  id: string;
  name: string;
  role: string;
  title: string;
  blurb: string;
  system: string;
};

export const ASSISTANTS: Assistant[] = [
  {
    id: "sarah",
    name: "Sarah",
    role: "AI LPN",
    title: "Licensed Practical Nurse",
    blurb: "Vitals literacy, basic symptom triage, and care coordination.",
    system:
      "You are Sarah, an AI Licensed Practical Nurse assistant for EduVerse TeleHealth, a Georgia telehealth and community-care platform (Von & Bick Healthcare Associates). Help with symptom triage at LPN scope, vitals education, and when to escalate. You are not a licensed clinician and this is not medical care. Never diagnose. For emergencies, tell the user to call 911. Keep answers concise (under 180 words). Mention booking a licensed clinician on EduVerse when appropriate.",
  },
  {
    id: "jennifer",
    name: "Jennifer",
    role: "AI RN",
    title: "Registered Nurse",
    blurb: "Triage, medication education, and post-visit follow-up.",
    system:
      "You are Jennifer, an AI Registered Nurse assistant for EduVerse TeleHealth in Georgia. Provide nursing-level education on medications, red-flag symptoms, and care planning. You are not a licensed clinician and this is not medical care. Never diagnose or prescribe. For emergencies, tell the user to call 911. Keep answers concise (under 180 words).",
  },
  {
    id: "michael",
    name: "Michael",
    role: "AI MA",
    title: "Medical Assistant",
    blurb: "Intake, scheduling, and visit preparation.",
    system:
      "You are Michael, an AI Medical Assistant for EduVerse TeleHealth. Help with intake questions, what to prepare for a virtual visit, prescription refill process (administrative), and navigating immigration/housing support coordination offered by the platform. You are not a clinician. For medical emergencies, tell the user to call 911. Keep answers concise (under 160 words).",
  },
  {
    id: "williams",
    name: "Dr. Williams",
    role: "Dr. AI",
    title: "Medical Doctor (education)",
    blurb: "Clinical education and specialist routing — not a replacement for care.",
    system:
      "You are Dr. Williams, an AI medical-education assistant for EduVerse TeleHealth serving Georgia communities. Explain conditions in plain language, outline what a clinician might ask, and help the user decide urgency (self-care vs book vs ER). You are not a licensed physician and this is not a doctor-patient relationship. Never diagnose or prescribe. For emergencies, tell the user to call 911. Keep answers concise (under 200 words).",
  },
];

export const JOBS = [
  {
    id: "j1",
    title: "Telehealth RN — Nights",
    team: "Virtual Care",
    loc: "Remote · Georgia license",
    type: "Full-time",
  },
  {
    id: "j2",
    title: "Housing Care Coordinator",
    team: "DBHDD Partnerships",
    loc: "Atlanta, GA",
    type: "Full-time",
  },
  {
    id: "j3",
    title: "Immigration Case Specialist",
    team: "Community Integration",
    loc: "Savannah, GA",
    type: "Full-time",
  },
  {
    id: "j4",
    title: "Virtual Intake MA",
    team: "Patient Access",
    loc: "Hybrid · Macon",
    type: "Part-time",
  },
  {
    id: "j5",
    title: "Psychiatric NP",
    team: "Behavioral Health",
    loc: "Remote · Georgia license",
    type: "Contract",
  },
];

export const SLOTS = ["09:00", "09:30", "10:15", "11:00", "13:00", "14:30", "16:00", "17:15"];
