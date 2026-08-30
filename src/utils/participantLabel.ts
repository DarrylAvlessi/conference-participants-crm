import { type ParticipantWithRegistration } from '../types';

/**
 * Best-effort display label for a participant in the list and drawer.
 * Uses the explicit identity (first/last name) when available; otherwise
 * falls back to a recognizable value extracted from the dynamic answers.
 */
export function getParticipantDisplayName(item: ParticipantWithRegistration): string {
  const { participant, registration } = item;

  if (participant.first_name) {
    return `${participant.first_name}${participant.last_name ? ' ' + participant.last_name : ''}`.trim();
  }

  const answers = registration.answers || {};
  const entries = Object.entries(answers).filter(([, v]) => {
    const s = String(v ?? '').trim();
    return s !== '' && s !== 'null' && s !== 'undefined';
  });

  if (entries.length === 0) return 'Inconnu';

  const lower = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Helper: first entry whose key matches a predicate
  const find = (pred: (k: string) => boolean): string | null => {
    for (const [k, v] of entries) {
      if (pred(lower(k))) return String(v).trim();
    }
    return null;
  };

  // Full name columns
  const fullName = find((k) => /nom complet|full name|nom et prenom|nom & prenom/.test(k));
  if (fullName) return fullName;

  // First name (but not "nom de famille"/"nom")
  const firstName = find((k) => /prenom/.test(k) && !/nom/.test(k));
  if (firstName) return firstName;

  // Last name / name
  const name = find((k) => /nom de famille|last name|^nom$/.test(k) || /(^|[^a-z])name([^a-z]|$)/.test(k));
  if (name) return name;

  // WhatsApp / phone
  const phone = find((k) => /whatsapp|telephone|tel|phone|mobile/.test(k));
  if (phone) return phone;

  // Email-ish
  const email = find((k) => /email|e-mail|courriel|mail/.test(k));
  if (email) return email;

  // First non-empty answer
  return String(entries[0][1]).trim();
}

/**
 * Initial used for the avatar circle when the participant has no email avatar.
 */
export function getParticipantInitial(item: ParticipantWithRegistration): string {
  const name = getParticipantDisplayName(item);
  const char = name.trim().charAt(0);
  return /[a-zA-Z0-9]/.test(char) ? char.toUpperCase() : 'P';
}
