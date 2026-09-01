import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  increment,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError } from './config';
import {
  type ConferenceEvent,
  type Participant,
  type Registration,
  type FollowupStatus,
  type MentoringStatus,
  type ParticipantWithRegistration,
  type CSVColumnMapping,
  type UserProfile,
  type UserRole,
  type UserStatus,
  OperationType,
} from '../types';
import type { User } from 'firebase/auth';

/**
 * Real-time listener for all conferences (events)
 */
export function subscribeToEvents(
  onSuccess: (events: ConferenceEvent[]) => void,
  onError?: (error: unknown) => void
): Unsubscribe {
  const eventsCol = collection(db, 'events');

  return onSnapshot(
    eventsCol,
    (snapshot) => {
      const events: ConferenceEvent[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        events.push({
          id: docSnap.id,
          title: data.title || 'Sans titre',
          date: data.date || '',
          startTime: data.startTime || '',
          endTime: data.endTime || '',
          registrantsCount: Number(data.registrantsCount) || 0,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt,
          description: data.description || '',
          imageUrl: data.imageUrl || '',
        });
      });

      // Sort by date or createdAt descending
      events.sort((a, b) => {
        const dateComp = (b.date || '').localeCompare(a.date || '');
        if (dateComp !== 0) return dateComp;
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });

      onSuccess(events);
    },
    (error) => {
      console.error('Error listening to events:', error);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, 'events');
    }
  );
}

/**
 * Create a new conference
 */
export async function createConferenceEvent(data: {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  description?: string;
  imageUrl?: string;
}): Promise<string> {
  try {
    const payload: Record<string, any> = {
      title: data.title.trim(),
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      description: data.description?.trim() || '',
      registrantsCount: 0,
      createdAt: new Date().toISOString(),
    };
    if (data.imageUrl && data.imageUrl.trim().length > 0) {
      payload.imageUrl = data.imageUrl.trim();
    }
    const docRef = await addDoc(collection(db, 'events'), payload);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'events');
  }
}

/**
 * Update an existing conference (title, date, schedule, description, poster/image)
 */
export async function updateConferenceEvent(
  eventId: string,
  data: {
    title: string;
    date: string;
    startTime: string;
    endTime: string;
    description?: string;
    imageUrl?: string;
  }
): Promise<void> {
  try {
    const eventRef = doc(db, 'events', eventId);
    const updates: Record<string, any> = {
      title: data.title.trim(),
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      description: data.description?.trim() || '',
      updatedAt: new Date().toISOString(),
    };

    if (data.imageUrl !== undefined) {
      updates.imageUrl = data.imageUrl.trim();
    }

    await updateDoc(eventRef, updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `events/${eventId}`);
  }
}

/**
 * Delete a conference and its associated registrations
 */
export async function deleteConferenceEvent(eventId: string): Promise<void> {
  try {
    // Delete event doc
    await deleteDoc(doc(db, 'events', eventId));

    // Cleanup registrations
    const regQuery = query(collection(db, 'registrations'), where('eventId', '==', eventId));
    const regSnapshot = await getDocs(regQuery);
    const batch = writeBatch(db);
    regSnapshot.forEach((regDoc) => {
      batch.delete(regDoc.ref);
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `events/${eventId}`);
  }
}

// Maximum number of write operations per Firestore batch (hard limit is 500).
const BATCH_WRITE_LIMIT = 450;

/**
 * Delete a single participant registration atomically: removes the registration,
 * its associated participant profile and decrements the event registrantsCount.
 */
export async function deleteParticipantRegistration(
  eventId: string,
  registrationId: string,
  participantId: string
): Promise<void> {
  try {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'registrations', registrationId));
    batch.delete(doc(db, 'participants', participantId));
    batch.update(doc(db, 'events', eventId), { registrantsCount: increment(-1) });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `registrations/${registrationId}`);
  }
}

/**
 * Delete several participant registrations atomically (batches of <= BATCH_WRITE_LIMIT).
 * Each item deletes the registration + participant profile; the event registrantsCount
 * is decremented once per batch.
 */
export async function deleteMultipleParticipantRegistrations(
  eventId: string,
  items: { registrationId: string; participantId: string }[]
): Promise<number> {
  let deleted = 0;
  if (!items || items.length === 0) return deleted;

  const unique = Array.from(
    new Map(items.map((i) => [i.registrationId, i])).values()
  );

  try {
    for (let i = 0; i < unique.length; i += BATCH_WRITE_LIMIT) {
      const slice = unique.slice(i, i + BATCH_WRITE_LIMIT);
      const batch = writeBatch(db);
      slice.forEach(({ registrationId, participantId }) => {
        batch.delete(doc(db, 'registrations', registrationId));
        batch.delete(doc(db, 'participants', participantId));
      });
      batch.update(doc(db, 'events', eventId), { registrantsCount: increment(-slice.length) });
      await batch.commit();
      deleted += slice.length;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, 'registrations');
  }

  return deleted;
}

/**
 * Clear all participant data for a conference: deletes every registration and its
 * associated participant profile, then resets the event registrantsCount to 0.
 */
export async function clearConferenceData(
  eventId: string
): Promise<{ deletedRegistrations: number }> {
  let deletedRegistrations = 0;

  try {
    const regQuery = query(collection(db, 'registrations'), where('eventId', '==', eventId));
    const regSnapshot = await getDocs(regQuery);

    const regDocs = regSnapshot.docs;
    for (let i = 0; i < regDocs.length; i += BATCH_WRITE_LIMIT) {
      const slice = regDocs.slice(i, i + BATCH_WRITE_LIMIT);
      const batch = writeBatch(db);
      slice.forEach((regDoc) => {
        batch.delete(regDoc.ref);
        const participantId = regDoc.data().participantId;
        if (participantId) {
          batch.delete(doc(db, 'participants', participantId));
        }
      });
      await batch.commit();
      deletedRegistrations += slice.length;
    }

    await updateDoc(doc(db, 'events', eventId), { registrantsCount: 0 });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `events/${eventId}/registrations`);
  }

  return { deletedRegistrations };
}

/**
 * Real-time listener for registrations of a specific event
 */
export function subscribeToRegistrations(
  eventId: string,
  onSuccess: (registrations: Registration[]) => void,
  onError?: (error: unknown) => void
): Unsubscribe {
  const regQuery = query(collection(db, 'registrations'), where('eventId', '==', eventId));

  return onSnapshot(
    regQuery,
    (snapshot) => {
      const registrations: Registration[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        registrations.push({
          id: docSnap.id,
          participantId: data.participantId || '',
          eventId: data.eventId || '',
          followupStatus: (data.followupStatus as FollowupStatus) || 'NOT_STARTED',
          mentoringStatus: (data.mentoringStatus as MentoringStatus) || 'NOT_REQUESTED',
          assignedMentorName: data.assignedMentorName || '',
          assignedFollowupStaffName: data.assignedFollowupStaffName || '',
          answers: data.answers || {},
          notes: data.notes || '',
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt,
        });
      });

      // Sort by createdAt descending
      registrations.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

      onSuccess(registrations);
    },
    (error) => {
      console.error(`Error listening to registrations for event ${eventId}:`, error);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, 'registrations');
    }
  );
}

/**
 * Batch fetch participant profiles for a list of emails (participant IDs)
 */
export async function getParticipantsByIds(
  participantIds: string[]
): Promise<Map<string, Participant>> {
  const participantMap = new Map<string, Participant>();
  if (participantIds.length === 0) return participantMap;

  // Deduplicate IDs
  const uniqueIds = Array.from(new Set(participantIds.filter(Boolean)));

  // Batch in chunks of 30 if querying or fetch directly since ID = email
  const fetchPromises = uniqueIds.map(async (id) => {
    try {
      const docSnap = await getDoc(doc(db, 'participants', id));
      if (docSnap.exists()) {
        const data = docSnap.data();
        participantMap.set(id, {
          id: docSnap.id,
          email: data.email || id,
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          createdAt: data.createdAt || '',
          updatedAt: data.updatedAt,
        });
      } else {
        // Fallback placeholder if participant doc was not found
        participantMap.set(id, {
          id,
          email: '',
          first_name: 'Inconnu',
          last_name: '',
          createdAt: new Date().toISOString(),
        });
      }
    } catch (e) {
      console.warn(`Could not load participant doc for ${id}`, e);
    }
  });

  await Promise.all(fetchPromises);
  return participantMap;
}

/**
 * Real-time combined data loader for a conference
 */
export function subscribeToEventParticipants(
  eventId: string,
  onSuccess: (data: ParticipantWithRegistration[]) => void,
  onError?: (error: unknown) => void
): Unsubscribe {
  return subscribeToRegistrations(
    eventId,
    async (registrations) => {
      const participantIds = registrations.map((r) => r.participantId);
      const participantMap = await getParticipantsByIds(participantIds);

      const combined: ParticipantWithRegistration[] = registrations.map((reg) => {
        const participant = participantMap.get(reg.participantId) || {
          id: reg.participantId,
          email: '',
          first_name: 'Inconnu',
          last_name: '',
          createdAt: reg.createdAt,
        };
        return {
          participant,
          registration: reg,
        };
      });

      onSuccess(combined);
    },
    onError
  );
}

/**
 * Update follow-up status in real-time
 */
export async function updateFollowupStatus(
  registrationId: string,
  status: FollowupStatus
): Promise<void> {
  try {
    const regRef = doc(db, 'registrations', registrationId);
    await updateDoc(regRef, {
      followupStatus: status,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `registrations/${registrationId}`);
  }
}

/**
 * Update assigned spiritual followup coordinator in real-time
 */
export async function updateFollowupStaff(
  registrationId: string,
  assignedFollowupStaffName: string
): Promise<void> {
  try {
    const regRef = doc(db, 'registrations', registrationId);
    await updateDoc(regRef, {
      assignedFollowupStaffName: assignedFollowupStaffName.trim(),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `registrations/${registrationId}`);
  }
}

/**
 * Update mentoring status and optional mentor name in real-time
 */
export async function updateMentoringStatus(
  registrationId: string,
  status: MentoringStatus,
  assignedMentorName?: string
): Promise<void> {
  try {
    const regRef = doc(db, 'registrations', registrationId);
    const updates: Record<string, any> = {
      mentoringStatus: status,
      updatedAt: new Date().toISOString(),
    };
    if (assignedMentorName !== undefined) {
      updates.assignedMentorName = assignedMentorName.trim();
    }
    await updateDoc(regRef, updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `registrations/${registrationId}`);
  }
}

/**
 * Update internal staff notes for a participant registration
 */
export async function updateRegistrationNotes(
  registrationId: string,
  notes: string
): Promise<void> {
  try {
    const regRef = doc(db, 'registrations', registrationId);
    await updateDoc(regRef, {
      notes: notes.trim(),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `registrations/${registrationId}`);
  }
}

/**
 * Update both participant details (name) and registration details (answers, follow-up, mentoring, notes)
 */
export async function updateParticipantAndRegistration(params: {
  participantId: string;
  registrationId: string;
  firstName: string;
  lastName: string;
  email?: string;
  assignedFollowupStaffName?: string;
  assignedMentorName?: string;
  followupStatus?: FollowupStatus;
  mentoringStatus?: MentoringStatus;
  answers?: Record<string, any>;
  notes?: string;
}): Promise<void> {
  try {
    const batch = writeBatch(db);

    // 1. Update participant document
    const participantRef = doc(db, 'participants', params.participantId);
    const participantUpdates: Record<string, any> = {
      first_name: params.firstName.trim(),
      last_name: params.lastName.trim(),
      updatedAt: new Date().toISOString(),
    };
    if (params.email !== undefined) {
      participantUpdates.email = params.email.trim().toLowerCase();
    }
    batch.update(participantRef, participantUpdates);

    // 2. Update registration document
    const regRef = doc(db, 'registrations', params.registrationId);
    const regUpdates: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };
    if (params.assignedFollowupStaffName !== undefined) {
      regUpdates.assignedFollowupStaffName = params.assignedFollowupStaffName.trim();
    }
    if (params.assignedMentorName !== undefined) {
      regUpdates.assignedMentorName = params.assignedMentorName.trim();
    }
    if (params.followupStatus !== undefined) {
      regUpdates.followupStatus = params.followupStatus;
    }
    if (params.mentoringStatus !== undefined) {
      regUpdates.mentoringStatus = params.mentoringStatus;
    }
    if (params.answers !== undefined) {
      regUpdates.answers = params.answers;
    }
    if (params.notes !== undefined) {
      regUpdates.notes = params.notes.trim();
    }

    batch.update(regRef, regUpdates);

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `registrations/${params.registrationId}`);
  }
}

/**
 * Manual participant creation and registration for an event.
 * No deduplication: each call creates a fresh participant and registration.
 */
export async function registerParticipantDirectly(params: {
  eventId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  answers?: Record<string, any>;
  followupStatus?: FollowupStatus;
  mentoringStatus?: MentoringStatus;
  assignedMentorName?: string;
  assignedFollowupStaffName?: string;
}): Promise<void> {
  try {
    // 1. Create a fresh participant document (auto-generated ID)
    const participantRef = await addDoc(collection(db, 'participants'), {
      email: (params.email || '').trim().toLowerCase() || '',
      first_name: (params.firstName || '').trim(),
      last_name: (params.lastName || '').trim(),
      createdAt: new Date().toISOString(),
    });

    // 2. Create a fresh registration linking participantId and eventId
    await addDoc(collection(db, 'registrations'), {
      participantId: participantRef.id,
      eventId: params.eventId,
      followupStatus: params.followupStatus || 'NOT_STARTED',
      mentoringStatus: params.mentoringStatus || 'NOT_REQUESTED',
      assignedMentorName: params.assignedMentorName?.trim() || '',
      assignedFollowupStaffName: params.assignedFollowupStaffName?.trim() || '',
      answers: params.answers || {},
      createdAt: new Date().toISOString(),
    });

    // 3. Increment count on event
    await updateDoc(doc(db, 'events', params.eventId), {
      registrantsCount: increment(1),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'registrations');
  }
}

export interface ImportResult {
  totalRows: number;
  newParticipants: number;
  newRegistrations: number;
  skippedEmptyRows: number;
  errors: string[];
}

/**
 * Ingestion (additive, no deduplication):
 * 1. For each row, create a fresh participant document (auto-generated ID).
 * 2. Create a fresh registration linking participantId and eventId with dynamic answers.
 * 3. Increment registrantsCount in the corresponding events document.
 */
export async function batchImportCSVRows(
  eventId: string,
  rows: Record<string, any>[],
  mapping: CSVColumnMapping,
  onProgress?: (processed: number, total: number) => void
): Promise<ImportResult> {
  const result: ImportResult = {
    totalRows: rows.length,
    newParticipants: 0,
    newRegistrations: 0,
    skippedEmptyRows: 0,
    errors: [],
  };

  if (!rows || rows.length === 0) return result;

  // Track new registrations count to increment event registrantsCount accurately
  let totalNewRegistrations = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    const firstName = (row[mapping.firstNameField || '']?.toString() || '').trim();
    const lastName = (row[mapping.lastNameField || '']?.toString() || '').trim();

    // Extract dynamic answers for all columns except the mapped ones
    const dynamicAnswers: Record<string, any> = {};
    for (const [key, val] of Object.entries(row)) {
      if (
        key !== mapping.firstNameField &&
        key !== mapping.lastNameField &&
        val !== undefined &&
        val !== null &&
        val !== ''
      ) {
        dynamicAnswers[key] = typeof val === 'string' ? val.trim() : val;
      }
    }

    // Skip fully-empty rows (no identity and no dynamic answers)
    if (!firstName && !lastName && Object.keys(dynamicAnswers).length === 0) {
      result.skippedEmptyRows++;
      if (onProgress) onProgress(i + 1, rows.length);
      continue;
    }

    try {
      // 1. Create a fresh participant document
      const participantRef = await addDoc(collection(db, 'participants'), {
        first_name: firstName,
        last_name: lastName,
        createdAt: new Date().toISOString(),
      });
      result.newParticipants++;

      // 2. Create a fresh registration
      await addDoc(collection(db, 'registrations'), {
        participantId: participantRef.id,
        eventId,
        followupStatus: 'NOT_STARTED',
        mentoringStatus: 'NOT_REQUESTED',
        answers: dynamicAnswers,
        createdAt: new Date().toISOString(),
      });
      result.newRegistrations++;
      totalNewRegistrations++;
    } catch (err: any) {
      const label = (firstName || lastName) ? `${firstName} ${lastName}`.trim() : `Ligne ${i + 1}`;
      console.error(`Error importing row for ${label}:`, err);
      result.errors.push(`${label}: ${err?.message || 'Erreur inconnue'}`);
    }

    if (onProgress) {
      onProgress(i + 1, rows.length);
    }
  }

  // 3. Increment registrantsCount in the event document
  if (totalNewRegistrations > 0) {
    try {
      await updateDoc(doc(db, 'events', eventId), {
        registrantsCount: increment(totalNewRegistrations),
      });
    } catch (err) {
      console.error('Error updating event registrantsCount:', err);
    }
  }

  return result;
}

/**
 * Seed realistic demo data for conferences, participants, and dynamic Google Forms answers
 */
export async function seedDemoData(): Promise<void> {
  try {
    // 1. Create Conference 1
    const event1Ref = await addDoc(collection(db, 'events'), {
      title: 'Pour réussir, il te faut un but',
      date: '2026-09-19',
      startTime: '14:00',
      endTime: '16:30',
      description: 'Conférence annuelle sur la clarté des objectifs académiques et le passage à l’action.',
      registrantsCount: 5,
      createdAt: new Date().toISOString(),
    });

    // 2. Create Conference 2
    const event2Ref = await addDoc(collection(db, 'events'), {
      title: 'Excellence Académique & Leadership Professionnel 2026',
      date: '2026-10-10',
      startTime: '10:00',
      endTime: '13:00',
      description: 'Masterclass pour étudiants d’ingénierie, de médecine et de commerce préparant les carrières internationales.',
      registrantsCount: 4,
      createdAt: new Date().toISOString(),
    });

    // Seed sample participants for Event 1
    const sampleParticipants1 = [
      {
        email: 'koffi.mensah@gmail.com',
        first_name: 'Koffi',
        last_name: 'Mensah',
        followupStatus: 'COMPLETED' as FollowupStatus,
        assignedFollowupStaffName: 'Pasteur Samuel (Responsable Spirituel)',
        mentoringStatus: 'ASSIGNED' as MentoringStatus,
        assignedMentorName: 'Dr. Marc Dossou (Directeur R&D)',
        answers: {
          'Numéro WhatsApp': '+229 97 45 12 89',
          'Université / École': 'ENSP - École Nationale Supérieure Polytechnique',
          'Filière de formation': 'Génie Informatique & Systèmes',
          'Niveau d’études': 'Master 2',
          'Attentes clés': 'Trouver des conseils pour postuler en thèse CIFRE et préparer des entretiens techniques.',
          'Comment avez-vous connu la conférence ?': 'Groupe WhatsApp des Anciens',
        },
        notes: 'Très motivé. Mentorat démarré avec Dr. Dossou. Point d’étape planifié pour le 25 septembre.',
      },
      {
        email: 'amina.traore@yahoo.fr',
        first_name: 'Amina',
        last_name: 'Traoré',
        followupStatus: 'IN_PROGRESS' as FollowupStatus,
        mentoringStatus: 'SEEKING' as MentoringStatus,
        assignedMentorName: '',
        answers: {
          'Numéro WhatsApp': '+225 07 88 34 11 09',
          'Université / École': 'INP-HB Yamoussoukro',
          'Filière de formation': 'Génie Électrique & Énergétique',
          'Niveau d’études': 'Ingénieur 3ème année',
          'Attentes clés': 'Bénéficier d’un accompagnement pour intégrer une multinationale dans le secteur des énergies renouvelables.',
          'Comment avez-vous connu la conférence ?': 'LinkedIn',
        },
        notes: 'Profil excellent. À jumeler avec un ingénieur senior chez TotalEnergies ou Schneider.',
      },
      {
        email: 'emmanuel.adjovi@outlook.com',
        first_name: 'Emmanuel',
        last_name: 'Adjovi',
        followupStatus: 'NOT_STARTED' as FollowupStatus,
        mentoringStatus: 'NOT_REQUESTED' as MentoringStatus,
        assignedMentorName: '',
        answers: {
          'Numéro WhatsApp': '+229 66 12 90 43',
          'Université / École': 'UAC - Faculté des Sciences de la Santé',
          'Filière de formation': 'Médecine Générale',
          'Niveau d’études': 'Doctorat d’État en cours (Année 6)',
          'Attentes clés': 'Structurer mes priorités entre gardes hospitalières et préparation de la thèse.',
          'Comment avez-vous connu la conférence ?': 'Affiche sur le campus',
        },
      },
      {
        email: 'grace.bakary@gmail.com',
        first_name: 'Grace',
        last_name: 'Bakary',
        followupStatus: 'IN_PROGRESS' as FollowupStatus,
        assignedFollowupStaffName: 'Sœur Dorcas (Équipe Suivi Spirituel)',
        mentoringStatus: 'ASSIGNED' as MentoringStatus,
        assignedMentorName: 'Mme Sophie Touré (Consultante Senior EY)',
        answers: {
          'Numéro WhatsApp': '+228 90 22 45 67',
          'Université / École': 'Université de Lomé',
          'Filière de formation': 'Sciences Économiques et de Gestion',
          'Niveau d’études': 'Master 1 Finance',
          'Attentes clés': 'Développer des compétences en modélisation financière et gestion du temps.',
          'Comment avez-vous connu la conférence ?': 'Recommandation d’un professeur',
        },
        notes: 'Entretien initial réalisé. Premier devoir de stratégie envoyé au mentor.',
      },
      {
        email: 'samuel.konan@gmail.com',
        first_name: 'Samuel',
        last_name: 'Konan',
        followupStatus: 'NOT_STARTED' as FollowupStatus,
        mentoringStatus: 'SEEKING' as MentoringStatus,
        assignedMentorName: '',
        answers: {
          'Numéro WhatsApp': '+225 05 44 89 20 11',
          'Université / École': 'ESATIC Abidjan',
          'Filière de formation': 'Télécoms & Cybersécurité',
          'Niveau d’études': 'Licence 3',
          'Attentes clés': 'Recherche d’un stage de fin de cycle et orientation vers les certifications de cybersécurité.',
          'Comment avez-vous connu la conférence ?': 'Discord Étudiants Tech',
        },
      },
    ];

    for (const p of sampleParticipants1) {
      await registerParticipantDirectly({
        eventId: event1Ref.id,
        email: p.email,
        firstName: p.first_name,
        lastName: p.last_name,
        answers: p.answers,
        followupStatus: p.followupStatus,
        assignedFollowupStaffName: (p as any).assignedFollowupStaffName,
        mentoringStatus: p.mentoringStatus,
        assignedMentorName: p.assignedMentorName,
      });
      if (p.notes) {
        // Query registration and set notes
        const q = query(
          collection(db, 'registrations'),
          where('eventId', '==', event1Ref.id),
          where('participantId', '==', p.email)
        );
        const snaps = await getDocs(q);
        if (!snaps.empty) {
          await updateDoc(snaps.docs[0].ref, { notes: p.notes });
        }
      }
    }

    // Seed sample participants for Event 2
    const sampleParticipants2 = [
      {
        email: 'florence.kouadio@gmail.com',
        first_name: 'Florence',
        last_name: 'Kouadio',
        followupStatus: 'IN_PROGRESS' as FollowupStatus,
        assignedFollowupStaffName: 'Frère Thomas (Cellule Étudiants)',
        mentoringStatus: 'ASSIGNED' as MentoringStatus,
        assignedMentorName: 'Jean-Yves Lawson (Tech Lead FinTech)',
        answers: {
          'WhatsApp': '+33 6 54 89 21 00',
          'Établissement': 'CentraleSupélec (France)',
          'Filière': 'Data Science & Intelligence Artificielle',
          'Objectif 5 ans': 'Fonder une startup d’IA appliquée à l’agritech en Afrique de l’Ouest',
          'Souhaitez-vous un mentor ?': 'Oui, impérativement un entrepreneur',
          'Pays actuel': 'France / Côte d’Ivoire',
        },
      },
      {
        email: 'christian.dos-santos@hotmail.com',
        first_name: 'Christian',
        last_name: 'Dos-Santos',
        followupStatus: 'NOT_STARTED' as FollowupStatus,
        mentoringStatus: 'SEEKING' as MentoringStatus,
        assignedMentorName: '',
        answers: {
          'WhatsApp': '+229 95 11 00 23',
          'Établissement': 'Pigier Bénin',
          'Filière': 'Audit et Contrôle de Gestion',
          'Objectif 5 ans': 'Passer les examens du DSCG et rejoindre un Big Four',
          'Souhaitez-vous un mentor ?': 'Oui',
          'Pays actuel': 'Bénin',
        },
      },
      {
        email: 'mariam.diallo@gmail.com',
        first_name: 'Mariam',
        last_name: 'Diallo',
        followupStatus: 'COMPLETED' as FollowupStatus,
        mentoringStatus: 'NOT_REQUESTED' as MentoringStatus,
        assignedMentorName: '',
        answers: {
          'WhatsApp': '+221 77 432 10 98',
          'Établissement': 'ESP Dakar',
          'Filière': 'Génie Civil',
          'Objectif 5 ans': 'Chef de projet BTP sur de grands chantiers d’infrastructures',
          'Souhaitez-vous un mentor ?': 'Non, juste les ressources de la conférence',
          'Pays actuel': 'Sénégal',
        },
      },
      {
        email: 'koffi.mensah@gmail.com',
        first_name: 'Koffi',
        last_name: 'Mensah',
        followupStatus: 'NOT_STARTED' as FollowupStatus,
        mentoringStatus: 'ASSIGNED' as MentoringStatus,
        assignedMentorName: 'Dr. Marc Dossou',
        answers: {
          'WhatsApp': '+229 97 45 12 89',
          'Établissement': 'ENSP Cotonou',
          'Filière': 'Génie Informatique',
          'Objectif 5 ans': 'Architecte Cloud & Enseignant vacataire',
          'Souhaitez-vous un mentor ?': 'Déjà assigné lors de la session précédente',
          'Pays actuel': 'Bénin',
        },
      },
    ];

    for (const p of sampleParticipants2) {
      await registerParticipantDirectly({
        eventId: event2Ref.id,
        email: p.email,
        firstName: p.first_name,
        lastName: p.last_name,
        answers: p.answers,
        followupStatus: p.followupStatus,
        assignedFollowupStaffName: (p as any).assignedFollowupStaffName,
        mentoringStatus: p.mentoringStatus,
        assignedMentorName: p.assignedMentorName,
      });
    }

    console.log('Seed demo data loaded successfully!');
  } catch (error) {
    console.error('Error seeding demo data:', error);
    throw error;
  }
}

export const BOOTSTRAP_ADMIN_EMAIL = 'darrylavlessi@gmail.com';

/**
 * Synchronize and ensure UserProfile in Firestore
 */
export async function syncUserProfile(user: User): Promise<UserProfile> {
  try {
    const userDocRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userDocRef);

    const isBootstrapAdmin =
      user.email?.toLowerCase().trim() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();

    if (!userSnap.exists()) {
      const newProfile: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || user.email?.split('@')[0] || 'Utilisateur',
        photoURL: user.photoURL || undefined,
        role: isBootstrapAdmin ? 'ADMIN' : 'VIEWER',
        status: isBootstrapAdmin ? 'APPROVED' : 'PENDING',
        createdAt: new Date().toISOString(),
        ...(isBootstrapAdmin
          ? {
              approvedAt: new Date().toISOString(),
              approvedBy: 'SYSTEM_BOOTSTRAP',
            }
          : {}),
      };

      await setDoc(userDocRef, newProfile);
      return newProfile;
    } else {
      const data = userSnap.data() as UserProfile;
      // If bootstrap admin was registered with non-admin, promote automatically
      if (isBootstrapAdmin && (data.role !== 'ADMIN' || data.status !== 'APPROVED')) {
        const updated: UserProfile = {
          ...data,
          role: 'ADMIN',
          status: 'APPROVED',
          approvedAt: data.approvedAt || new Date().toISOString(),
          approvedBy: 'SYSTEM_BOOTSTRAP',
        };
        await setDoc(userDocRef, updated, { merge: true });
        return updated;
      }
      return data;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
  }
}

/**
 * Listen to current user's profile changes in real-time
 */
export function subscribeToUserProfile(
  uid: string,
  onSuccess: (profile: UserProfile | null) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const userDocRef = doc(db, 'users', uid);
  return onSnapshot(
    userDocRef,
    (snapshot) => {
      if (snapshot.exists()) {
        onSuccess(snapshot.data() as UserProfile);
      } else {
        onSuccess(null);
      }
    },
    (error) => {
      console.error('Error listening to user profile:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Admin: Listen to all user accounts in real-time
 */
export function subscribeToAllUsers(
  onSuccess: (users: UserProfile[]) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const usersCol = collection(db, 'users');
  return onSnapshot(
    usersCol,
    (snapshot) => {
      const list: UserProfile[] = [];
      snapshot.forEach((snap) => {
        list.push(snap.data() as UserProfile);
      });
      // Sort: PENDING first, then by createdAt desc
      list.sort((a, b) => {
        if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
        if (a.status !== 'PENDING' && b.status === 'PENDING') return 1;
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });
      onSuccess(list);
    },
    (error) => {
      console.error('Error listening to users list:', error);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, 'users');
    }
  );
}

/**
 * Admin: Update user status and role
 */
export async function updateUserStatusAndRole(
  targetUid: string,
  newStatus: UserStatus,
  newRole: UserRole,
  adminEmail: string
): Promise<void> {
  try {
    const userDocRef = doc(db, 'users', targetUid);
    const updates: Record<string, any> = {
      status: newStatus,
      role: newRole,
    };
    if (newStatus === 'APPROVED') {
      updates.approvedAt = new Date().toISOString();
      updates.approvedBy = adminEmail;
    }
    await updateDoc(userDocRef, updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${targetUid}`);
  }
}

/**
 * Admin: Delete a user account record from Firestore
 */
export async function deleteUserAccount(targetUid: string): Promise<void> {
  try {
    const userDocRef = doc(db, 'users', targetUid);
    await deleteDoc(userDocRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${targetUid}`);
  }
}

