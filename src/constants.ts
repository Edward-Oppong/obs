import { AeiouCategory, GroupId, ObservationStatus, SeverityLevel, TagType, TeamMember } from './types';

export const FIXED_TAGS: TagType[] = [
  'workflow',
  'equipment',
  'documentation',
  'communication',
  'patient-experience',
  'staffing',
  'infection-control',
  'cost-resources',
  'safety',
];

export const TAG_LABELS: Record<TagType, { label: string; color: string; desc: string }> = {
  workflow: {
    label: 'Workflow',
    color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
    desc: 'Handoffs, intake bottlenecks, order execution, patient flow',
  },
  equipment: {
    label: 'Equipment',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    desc: 'CTG/fetal monitors, ultrasound probes, beds, delivery packs, speculums',
  },
  documentation: {
    label: 'Documentation',
    color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
    desc: 'Partograms, EHR entry delays, duplicate charting, consent paperwork',
  },
  communication: {
    label: 'Communication',
    color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    desc: 'SBAR handoffs, verbal orders, inter-professional paging, family updates',
  },
  'patient-experience': {
    label: 'Patient Experience',
    color: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
    desc: 'Dignity, birth plan honoring, privacy curtains, pain management, wait times',
  },
  staffing: {
    label: 'Staffing',
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
    desc: 'Midwife-to-patient ratio, cover shortages during emergency C-sections',
  },
  'infection-control': {
    label: 'Infection Control',
    color: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800',
    desc: 'Aseptic technique, PPE availability, sterile glove sizing, cleaning protocols',
  },
  'cost-resources': {
    label: 'Cost / Resources',
    color: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800',
    desc: 'Supply stock-outs, medication wastage, redundant lab testing',
  },
  safety: {
    label: 'Safety',
    color: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800',
    desc: 'Medication cross-checks, neonatal resuscitation cart readiness, fall risk',
  },
};

export interface AeiouDefinition {
  letter: string;
  name: AeiouCategory;
  shortDesc: string;
  clinicalExample: string;
  bgBadge: string;
  dotColor: string;
}

export const AEIOU_DEFINITIONS: Record<AeiouCategory, AeiouDefinition> = {
  Activities: {
    letter: 'A',
    name: 'Activities',
    shortDesc: 'A task, workflow, or process step (e.g. how a handoff or intake unfolds)',
    clinicalExample: 'e.g. Resident triage triage order entry, induction of labor prep steps, emergency C-section call-bell activation protocol',
    bgBadge: 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-900/40 dark:text-sky-300 dark:border-sky-700',
    dotColor: '#0284c7',
  },
  Environment: {
    letter: 'E',
    name: 'Environment',
    shortDesc: 'The physical space (layout, noise, crowding, lighting, equipment placement)',
    clinicalExample: 'e.g. Triage bay crowding, CTG monitor screen glare from window, neonatal resuscitation station obstructed by laundry bin',
    bgBadge: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700',
    dotColor: '#059669',
  },
  Interactions: {
    letter: 'I',
    name: 'Interactions',
    shortDesc: 'How people or systems interact with each other (staff–staff, staff–patient, staff–equipment/records)',
    clinicalExample: 'e.g. Midwife to senior registrar telephone handover during shift change; patient unable to hear instructions over alarms',
    bgBadge: 'bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-900/40 dark:text-violet-300 dark:border-violet-700',
    dotColor: '#7c3aed',
  },
  Objects: {
    letter: 'O',
    name: 'Objects',
    shortDesc: 'Tools, devices, forms, charts, equipment being used, missing, or improvised',
    clinicalExample: 'e.g. Amnihook package missing from delivery trolley; vacuum extractor tubing loose; paper partogram taped to wall',
    bgBadge: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700',
    dotColor: '#d97706',
  },
  Users: {
    letter: 'U',
    name: 'Users',
    shortDesc: 'The people involved, their roles, needs, and frustrations (roles only — never patient names)',
    clinicalExample: 'e.g. First-time laboring mother with language barrier; night-shift scrub nurse working back-to-back 12-hour shifts',
    bgBadge: 'bg-pink-100 text-pink-800 border-pink-300 dark:bg-pink-900/40 dark:text-pink-300 dark:border-pink-700',
    dotColor: '#db2777',
  },
};

export const CLINICAL_SETTINGS = [
  'Labor & Delivery Ward (L&D)',
  'Antenatal Clinic (OPD)',
  'Triage & Acute Assessment',
  'Obstetric Operating Room (C-Section)',
  'Postpartum / Mother & Baby Ward',
  'Obstetric Ultrasound & Fetal Medicine',
  'Gynecology Ward & Minor Ops',
  'High-Risk Pregnancy Unit (Maternal-Fetal)',
  'Infertility / Reproductive Endocrinology',
];

export const CLINICAL_ROLES_CHIPS = [
  'Midwife',
  'Ob/Gyn Attending',
  'Senior Resident (Registrar)',
  'Junior Resident (Intern)',
  'Scrub Nurse / OR Nurse',
  'Obstetric Anesthesiologist',
  'Patient',
  'Support Person / Partner',
  'NICU / Neonatal Pediatrician',
  'Unit Ward Clerk',
];

export const TEAM_GROUPS: Record<GroupId, { name: string; memberCount: number; defaultStudents: string[] }> = {
  A: {
    name: 'Group A (2 interns)',
    memberCount: 2,
    defaultStudents: ['Intern A1 (Lead)', 'Intern A2'],
  },
  B: {
    name: 'Group B (2 interns)',
    memberCount: 2,
    defaultStudents: ['Intern B1', 'Intern B2'],
  },
  C: {
    name: 'Group C (2 interns)',
    memberCount: 2,
    defaultStudents: ['Intern C1', 'Intern C2'],
  },
  D: {
    name: 'Group D (2 interns)',
    memberCount: 2,
    defaultStudents: ['Intern D1', 'Intern D2'],
  },
  E: {
    name: 'Group E (1 intern)',
    memberCount: 1,
    defaultStudents: ['Intern E1 (Solo)'],
  },
};

export const INITIAL_TEAM_ROSTER: TeamMember[] = [
  { email: 'christapostolicchurchbubiashie@gmail.com', name: 'Team Coordinator / Student Lead', group: 'A' },
  { email: 'intern.a2@hospital.edu', name: 'Student Intern A2', group: 'A' },
  { email: 'intern.b1@hospital.edu', name: 'Student Intern B1', group: 'B' },
  { email: 'intern.b2@hospital.edu', name: 'Student Intern B2', group: 'B' },
  { email: 'intern.c1@hospital.edu', name: 'Student Intern C1', group: 'C' },
  { email: 'intern.c2@hospital.edu', name: 'Student Intern C2', group: 'C' },
  { email: 'intern.d1@hospital.edu', name: 'Student Intern D1', group: 'D' },
  { email: 'intern.d2@hospital.edu', name: 'Student Intern D2', group: 'D' },
  { email: 'intern.e1@hospital.edu', name: 'Student Intern E1', group: 'E' },
];

export const STATUS_CONFIG: Record<ObservationStatus, { label: string; badge: string; desc: string }> = {
  New: {
    label: 'New',
    badge: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700',
    desc: 'Newly logged friction point; awaiting team rounds review',
  },
  Discussed: {
    label: 'Discussed',
    badge: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700',
    desc: 'Reviewed during internship debrief or faculty round',
  },
  Validated: {
    label: 'Validated',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700',
    desc: 'Confirmed as recurring clinical friction by staff/supervisor',
  },
  Prioritized: {
    label: 'Prioritized',
    badge: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-700',
    desc: 'Selected for quality improvement / capstone presentation',
  },
  Discarded: {
    label: 'Discarded',
    badge: 'bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700',
    desc: 'Out of scope, isolated anomaly, or not actionable',
  },
};

export const SEVERITY_CONFIG: Record<SeverityLevel, { label: string; badge: string; dot: string }> = {
  Low: {
    label: 'Low Severity',
    badge: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    dot: 'bg-slate-400',
  },
  Medium: {
    label: 'Medium Severity',
    badge: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700',
    dot: 'bg-amber-500',
  },
  High: {
    label: 'High Severity',
    badge: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-700',
    dot: 'bg-rose-600 animate-pulse',
  },
};

export const CLINICAL_PRIVACY_DISCLAIMER =
  'Strict Anonymity Protocol: Contains observational student research notes. Under NO circumstance record patient names, initials, dates of birth, MRNs, bed/room numbers, or identifiable medical details. Document clinical roles and workflow mechanics only.';
