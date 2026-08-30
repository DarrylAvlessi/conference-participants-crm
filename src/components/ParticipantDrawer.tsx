import { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Phone,
  MessageSquare,
  Calendar,
  UserCheck,
  CheckCircle2,
  Copy,
  Check,
  Save,
  FileText,
  ExternalLink,
} from 'lucide-react';
import {
  type ParticipantWithRegistration,
  type FollowupStatus,
  type MentoringStatus,
} from '../types';
import { getParticipantAvatar } from '../utils/imageHelpers';
import { getParticipantDisplayName, getParticipantInitial } from '../utils/participantLabel';

interface ParticipantDrawerProps {
  participantWithReg: ParticipantWithRegistration | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateFollowup: (registrationId: string, status: FollowupStatus) => Promise<void>;
  onUpdateMentoring: (
    registrationId: string,
    status: MentoringStatus,
    mentorName?: string
  ) => Promise<void>;
  onUpdateNotes: (registrationId: string, notes: string) => Promise<void>;
}

export function ParticipantDrawer({
  participantWithReg,
  isOpen,
  onClose,
  onUpdateFollowup,
  onUpdateMentoring,
  onUpdateNotes,
}: ParticipantDrawerProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [mentorInput, setMentorInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isSavingMentor, setIsSavingMentor] = useState(false);
  const [notesSavedAlert, setNotesSavedAlert] = useState(false);

  useEffect(() => {
    if (participantWithReg) {
      setMentorInput(participantWithReg.registration.assignedMentorName || '');
      setNotesInput(participantWithReg.registration.notes || '');
      setNotesSavedAlert(false);
    }
  }, [participantWithReg]);

  if (!isOpen || !participantWithReg) return null;

  const { participant, registration } = participantWithReg;
  const answers = registration.answers || {};
  const avatarUrl = getParticipantAvatar(participant.email);
  const displayName = getParticipantDisplayName(participantWithReg);

  // Find WhatsApp or phone number in answers
  const findWhatsAppNumber = (): string | null => {
    for (const [key, val] of Object.entries(answers)) {
      const k = key.toLowerCase();
      if (k.includes('whatsapp') || k.includes('phone') || k.includes('telephone') || k.includes('tel')) {
        const str = String(val).replace(/[^0-9+]/g, '');
        if (str.length >= 8) return str;
      }
    }
    return null;
  };

  const whatsAppNumber = findWhatsAppNumber();
  const cleanWhatsAppUrl = whatsAppNumber
    ? `https://wa.me/${whatsAppNumber.replace('+', '')}`
    : null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleFollowupChange = async (newStatus: FollowupStatus) => {
    await onUpdateFollowup(registration.id, newStatus);
  };

  const handleMentoringChange = async (newStatus: MentoringStatus) => {
    await onUpdateMentoring(registration.id, newStatus, mentorInput);
  };

  const handleSaveMentor = async () => {
    setIsSavingMentor(true);
    try {
      await onUpdateMentoring(registration.id, registration.mentoringStatus, mentorInput);
    } finally {
      setIsSavingMentor(false);
    }
  };

  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    try {
      await onUpdateNotes(registration.id, notesInput);
      setNotesSavedAlert(true);
      setTimeout(() => setNotesSavedAlert(false), 2500);
    } finally {
      setIsSavingNotes(false);
    }
  };

  return (
    <div
      id="participant-drawer-backdrop"
      className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end"
      onClick={onClose}
    >
      <div
        id="participant-drawer-content"
        className="w-full max-w-xl bg-slate-50 h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-200 bg-white flex items-start justify-between">
          <div className="flex items-center space-x-4">
            {/* Circular Avatar */}
            <div className="w-14 h-14 rounded-full border border-slate-200 overflow-hidden flex items-center justify-center font-bold text-base shadow-sm bg-slate-100 text-slate-700 shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span>{getParticipantInitial(participantWithReg)}</span>
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  {displayName}
                </h2>
                <span className="badge-neutral inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold">
                  Participant
                </span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-slate-500 mt-1">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                {participant.email ? (
                  <>
                    <span className="font-mono text-slate-700">{participant.email}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(participant.email, 'email')}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
                      title="Copier l'email"
                    >
                      {copiedKey === 'email' ? (
                               <Check className="w-3.5 h-3.5 text-slate-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </>
                ) : (
                  <span className="italic text-slate-400">Email non renseigné</span>
                )}
              </div>
            </div>
          </div>

          <button
            id="close-drawer-btn"
            onClick={onClose}
            type="button"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Communication Actions Bar */}
        <div className="px-6 py-3 bg-white border-b border-slate-200 flex flex-wrap items-center gap-2.5">
          {cleanWhatsAppUrl && (
            <a
              id="whatsapp-contact-link"
              href={cleanWhatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-xs"
            >
              <MessageSquare className="w-4 h-4" />
              <span>WhatsApp direct</span>
              <ExternalLink className="w-3 h-3 opacity-80" />
            </a>
          )}

          {participant.email && (
            <a
              id="email-contact-link"
              href={`mailto:${participant.email}`}
              className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors shadow-xs"
            >
              <Mail className="w-4 h-4 text-slate-500" />
              <span>Envoyer un e-mail</span>
            </a>
          )}

          {registration.createdAt && (
            <div className="ml-auto text-xs text-slate-400 flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>
                Inscrit le {new Date(registration.createdAt).toLocaleDateString('fr-FR')}
              </span>
            </div>
          )}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status Controls Card */}
          <section className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Gestion des statuts en direct
              </h3>
               <span className="badge-neutral text-[11px] font-semibold px-2 py-0.5 rounded-full">
                 Synchronisation auto
               </span>
            </div>

            {/* Follow-up Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Statut du suivi des participants (Follow-up)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'NOT_STARTED', label: 'Non démarré', activeClass: 'bg-slate-900 text-white' },
                  { id: 'IN_PROGRESS', label: 'En cours', activeClass: 'bg-slate-900 text-white' },
                  { id: 'COMPLETED', label: 'Terminé', activeClass: 'bg-slate-900 text-white' },
                ].map((item) => {
                  const active = registration.followupStatus === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleFollowupChange(item.id as FollowupStatus)}
                      className={`px-3 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer text-center ${
                        active
                          ? `${item.activeClass} shadow-xs ring-2 ring-slate-900/10`
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mentoring Status */}
            <div className="pt-3 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Statut du mentorat
              </label>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[
                  { id: 'NOT_REQUESTED', label: 'Non demandé', activeClass: 'bg-slate-900 text-white' },
                  { id: 'SEEKING', label: 'En recherche', activeClass: 'bg-slate-900 text-white' },
                  { id: 'ASSIGNED', label: 'Mentor attribué', activeClass: 'bg-slate-900 text-white' },
                ].map((item) => {
                  const active = registration.mentoringStatus === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleMentoringChange(item.id as MentoringStatus)}
                      className={`px-2.5 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer text-center truncate ${
                        active
                          ? `${item.activeClass} shadow-xs ring-2 ring-slate-900/10`
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>

              {/* Mentor Name Input (when mentor is needed or assigned) */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Nom du mentor assigné :
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="Ex: Dr. Marc Dossou (Directeur R&D)"
                    value={mentorInput}
                    onChange={(e) => setMentorInput(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                  />
                  <button
                    type="button"
                    onClick={handleSaveMentor}
                    disabled={isSavingMentor}
                    className="btn-primary px-3.5 py-2 rounded-xl text-xs font-semibold"
                  >
                    {isSavingMentor ? '...' : 'Enregistrer'}
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Dynamic Google Forms Answers Section */}
          <section className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Réponses au formulaire Google Forms
              </h3>
              <span className="badge-neutral text-xs font-semibold px-2.5 py-0.5 rounded-full">
                {Object.keys(answers).length} champs
              </span>
            </div>

            {Object.keys(answers).length === 0 ? (
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                Aucune réponse dynamique additionnelle enregistrée pour ce participant.
              </div>
            ) : (
              <div className="space-y-2.5">
                {Object.entries(answers).map(([key, value], idx) => {
                  const valStr =
                    typeof value === 'object' ? JSON.stringify(value) : String(value ?? '');
                  const isLong = valStr.length > 55;

                  return (
                    <div
                      key={key}
                      className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="text-xs font-bold text-slate-800">
                          {key}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(valStr, `ans-${idx}`)}
                          className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/60 transition-colors shrink-0"
                          title="Copier la valeur"
                        >
                          {copiedKey === `ans-${idx}` ? (
                    <Check className="w-3.5 h-3.5 text-slate-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      <div
                        className={`text-xs text-slate-900 ${
                          isLong
                            ? 'bg-white p-3 rounded-xl border border-slate-200/80 whitespace-pre-wrap leading-relaxed'
                            : 'font-medium'
                        }`}
                      >
                        {valStr || <span className="text-slate-400 italic">Non renseigné</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Internal Staff Notes */}
          <section className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-900">
                <FileText className="w-4 h-4 text-slate-500" />
                <span>Notes internes de l'équipe</span>
              </div>
              {notesSavedAlert && (
                <span className="text-xs font-semibold text-emerald-700 flex items-center space-x-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Notes enregistrées !</span>
                </span>
              )}
            </div>

            <div className="space-y-3">
              <textarea
                id="internal-staff-notes"
                rows={3}
                placeholder="Observations, comptes-rendus d'appels, ou besoins spécifiques pour ce participant..."
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                className="w-full p-3.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 focus:bg-white transition-colors resize-none leading-relaxed"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  disabled={isSavingNotes}
                  className="btn-primary inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingNotes ? 'Sauvegarde...' : 'Sauvegarder les notes'}</span>
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
