export type FollowupStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export type MentoringStatus = 'NOT_REQUESTED' | 'SEEKING' | 'ASSIGNED';

export interface Participant {
  id: string; // Document ID = Email address lowercased
  email: string;
  first_name: string;
  last_name: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ConferenceEvent {
  id: string; // Auto-generated Document ID
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  registrantsCount: number;
  createdAt: string;
  updatedAt?: string;
  description?: string;
  imageUrl?: string; // Conference poster or flyer URL or compressed base64 image data
}

export interface Registration {
  id: string; // Auto-generated Document ID
  participantId: string; // reference to participants doc ID (email)
  eventId: string; // reference to events doc ID
  followupStatus: FollowupStatus;
  mentoringStatus: MentoringStatus;
  assignedMentorName?: string;
  answers: Record<string, any>; // Stores form-specific dynamic key-value pairs
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ParticipantWithRegistration {
  participant: Participant;
  registration: Registration;
}

export interface CSVColumnMapping {
  emailField: string;
  firstNameField: string;
  lastNameField: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}
