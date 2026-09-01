import { useState, type FormEvent } from 'react';
import { X, UserPlus, Phone, School } from 'lucide-react';
import { registerParticipantDirectly } from '../firebase/service';
import { type FollowupStatus, type MentoringStatus } from '../types';

interface NewParticipantModalProps {
  eventId: string;
  eventTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onParticipantAdded: () => void;
}

export function NewParticipantModal({
  eventId,
  eventTitle,
  isOpen,
  onClose,
  onParticipantAdded,
}: NewParticipantModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [whatsApp, setWhatsApp] = useState('');
  const [school, setSchool] = useState('');
  const [expectations, setExpectations] = useState('');
  const [followupStatus, setFollowupStatus] = useState<FollowupStatus>('NOT_STARTED');
  const [assignedFollowupStaffName, setAssignedFollowupStaffName] = useState('');
  const [mentoringStatus, setMentoringStatus] = useState<MentoringStatus>('NOT_REQUESTED');
  const [assignedMentorName, setAssignedMentorName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() && !lastName.trim() && !whatsApp.trim() && !school.trim()) {
      alert('Veuillez renseigner au moins une information (nom, prénom, WhatsApp ou école).');
      return;
    }

    setIsSubmitting(true);
    try {
      const answers: Record<string, any> = {};
      if (whatsApp.trim()) answers['Numéro WhatsApp'] = whatsApp.trim();
      if (school.trim()) answers['Université / École'] = school.trim();
      if (expectations.trim()) answers['Attentes principales'] = expectations.trim();

      await registerParticipantDirectly({
        eventId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        answers,
        followupStatus,
        assignedFollowupStaffName: assignedFollowupStaffName.trim(),
        mentoringStatus,
        assignedMentorName: mentoringStatus === 'ASSIGNED' ? assignedMentorName.trim() : '',
      });

      onParticipantAdded();
      onClose();
    } catch (err: any) {
      console.error('Error adding participant:', err);
      alert('Erreur lors de l’ajout du participant: ' + (err?.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="new-participant-modal-backdrop"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
    >
      <div
        id="new-participant-modal-content"
        className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden my-auto max-h-[92dvh] flex flex-col"
      >
        <div className="p-4 sm:p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-50 text-slate-600 border border-slate-200 flex items-center justify-center shadow-xs shrink-0">
              <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">
                Inscrire un participant
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                Conférence : <span className="font-bold text-slate-700">{eventTitle}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3.5 sm:space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Prénom
              </label>
              <input
                type="text"
                placeholder="Ex: Koffi"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nom
              </label>
              <input
                type="text"
                placeholder="Ex: Mensah"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Numéro WhatsApp
              </label>
              <input
                type="tel"
                placeholder="+229 97 00 00 00"
                value={whatsApp}
                onChange={(e) => setWhatsApp(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Université / École
              </label>
              <input
                type="text"
                placeholder="Ex: ENSP, UAC, INP-HB"
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Statut du suivi
              </label>
              <select
                value={followupStatus}
                onChange={(e) => setFollowupStatus(e.target.value as FollowupStatus)}
                className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
              >
                <option value="NOT_STARTED">Non démarré</option>
                <option value="IN_PROGRESS">En cours</option>
                <option value="COMPLETED">Terminé</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Chargé du suivi (spirituel)
              </label>
              <input
                type="text"
                placeholder="Ex: Pasteur Samuel, Frère Thomas..."
                value={assignedFollowupStaffName}
                onChange={(e) => setAssignedFollowupStaffName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Statut du mentorat
            </label>
            <select
              value={mentoringStatus}
              onChange={(e) => setMentoringStatus(e.target.value as MentoringStatus)}
              className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
            >
              <option value="NOT_REQUESTED">Non demandé</option>
              <option value="SEEKING">En recherche</option>
              <option value="ASSIGNED">Mentor attribué</option>
            </select>
          </div>

          {mentoringStatus === 'ASSIGNED' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nom du mentor attribué
              </label>
              <input
                type="text"
                placeholder="Ex: Dr. Marc Dossou"
                value={assignedMentorName}
                onChange={(e) => setAssignedMentorName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Attentes ou besoins particuliers
            </label>
            <textarea
              rows={2}
              placeholder="Questions ou attentes formulées..."
              value={expectations}
              onChange={(e) => setExpectations(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 resize-none"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
            >
              {isSubmitting ? 'Enregistrement...' : 'Inscrire le participant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
