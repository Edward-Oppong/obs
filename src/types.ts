import { Timestamp } from 'firebase/firestore';

export type GroupId = 'A' | 'B' | 'C' | 'D' | 'E';

export type AeiouCategory = 'Activities' | 'Environment' | 'Interactions' | 'Objects' | 'Users';

export type SeverityLevel = 'Low' | 'Medium' | 'High';

export type FrequencyType = 'One-off' | 'Recurring' | 'Not sure';

export type ObservationStatus = 'New' | 'Discussed' | 'Validated' | 'Prioritized' | 'Discarded';

export type TagType =
  | 'workflow'
  | 'equipment'
  | 'documentation'
  | 'communication'
  | 'patient-experience'
  | 'staffing'
  | 'infection-control'
  | 'cost-resources'
  | 'safety';

export interface AeiouDetails {
  activities?: string;
  environment?: string;
  interactions?: string;
  objects?: string;
  users?: string;
}

export interface ObservationDoc {
  id?: string;
  sessionId: string;
  date: string; // YYYY-MM-DD
  group: GroupId;
  setting: string;
  roles: string;
  observation: string;
  description?: string;
  quote?: string;
  aeiou: AeiouCategory;
  aeiouDetails?: AeiouDetails;
  severity: SeverityLevel;
  frequency: FrequencyType;
  tags: TagType[];
  status: ObservationStatus;
  createdAt: Timestamp | { seconds: number; nanoseconds: number } | null;
  createdBy: string;
  creatorEmail?: string;
  creatorName?: string;
  updatedAt: Timestamp | { seconds: number; nanoseconds: number } | null;
  statusUpdatedAt?: Timestamp | { seconds: number; nanoseconds: number } | null;
  statusUpdatedBy?: string;
}

export interface ObservationComment {
  id?: string;
  by: string; // uid
  authorEmail: string;
  authorName?: string;
  text: string;
  createdAt: Timestamp | { seconds: number; nanoseconds: number } | null;
}

export interface ObservationDraftBlock {
  tempId: string;
  observation: string;
  description: string;
  quote: string;
  aeiou: AeiouCategory;
  aeiouDetails: AeiouDetails;
  severity: SeverityLevel;
  frequency: FrequencyType;
  tags: TagType[];
}

export interface TeamMember {
  email: string;
  name: string;
  group: GroupId;
  roleDescription?: string;
}
