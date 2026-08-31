import { useState, useEffect, type FormEvent } from 'react';
import {
  X,
  User,
  Mail,
  Plus,
  Trash2,
  Save,
  UserCheck,
  HeartHandshake,
  FileText,
  Sparkles,
} from 'lucide-react';
import {
  type ParticipantWithRegistration,
  type FollowupStatus,
  type MentoringStatus,
} from '../types';
import { updateParticipantAndRegistration } from '../firebase/service';
import { getParticipantDisplayName } from '../utils/participantLabel';

interface EditParticipantModalProps {
  participantWithReg: ParticipantWithRegistration | null;
  isOpen: boolean;
  onClose: () => void;
  onParticipantUpdated?: () => void;
}

export function EditParticipantModal({
  participantWithReg,
  isOpen,
  onClose,
  onParticipantUpdated,
}: EditParticipantModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [followupStatus, setFollowupStatus] = useState<FollowupStatus>('NOT_STARTED');
  const [assignedFollowupStaffName, setAssignedFollowupStaffName] = useState('');
  const [mentoringStatus, setMentoringStatus] = useState<MentoringStatus>('NOT_REQUESTED');
  const [assignedMentorName, setAssignedMentorName] = useState('');
  const [notes, setNotes] = useState('');
  const [answersList, setAnswersList] = useState<{ key: string; value: string }[]>([]);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [showAddAnswer, setShowAddAnswer] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (participantWithReg) {
      const { participant, registration } = participantWithReg;
      setFirstName(participant.first_name || '');
      setLastName(participant.last_name || '');
      setEmail(participant.email || '');
      setFollowupStatus(registration.followupStatus || 'NOT_STARTED');
      setAssignedFollowupStaffName(registration.assignedFollowupStaffName || '');
      setMentoringStatus(registration.mentoringStatus || 'NOT_REQUESTED');
      setAssignedMentorName(registration.assignedMentorName || '');
      setNotes(registration.notes || '');

      const answersObj = registration.answers || {};
      const list = Object.entries(answersObj).map(([key, val]) => ({
        key,
        value: typeof val === 'object' ? JSON.stringify(val) : String(val ?? ''),
      }));
      setAnswersList(list);
      setNewKey('');
      setNewValue('');
      setShowAddAnswer(false);
      setErrorMsg(null);
    }
  }, [participantWithReg, isOpen]);

  if (!isOpen || !participantWithReg) return null;

  const displayName = getParticipantDisplayName(participantWithReg);

  const handleAnswerChange = (index: number, val: string) => {
    setAnswersList((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], value: val };
      return copy;
    });
  };

  const handleRemoveAnswer = (index: number) => {
    setAnswersList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddAnswer = () => {
    if (!newKey.trim()) return;
    setAnswersList((prev) => [...prev, { key: newKey.trim(), value: newValue.trim() }]);
    setNewKey('');
    setNewValue('');
    setShowAddAnswer(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() && !lastName.trim() && !email.trim()) {
      setErrorMsg('Veuillez renseigner au moins un champ d’identification (prénom, nom ou e-mail).');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      // Reconstruct dynamic answers object
      const answersObj: Record<string, any> = {};
      answersList.forEach((item) => {
        if (item.key.trim()) {
          answersObj[item.key.trim()] = item.value;
        }
      });

      await updateParticipantAndRegistration({
        participantId: participantWithReg.participant.id,
        registrationId: participantWithReg.registration.id,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        assignedFollowupStaffName: assignedFollowupStaffName.trim(),
        assignedMentorName: mentoringStatus === 'ASSIGNED' ? assignedMentorName.trim() : '',
        followupStatus,
        mentoringStatus,
        answers: answersObj,
        notes: notes.trim(),
      });

      if (onParticipantUpdated) {
        onParticipantUpdated();
      }
      onClose();
    } catch (err: any) {
      console.error('Error updating participant:', err);
      setErrorMsg(err?.message || 'Une erreur est survenue lors de la mise à jour.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="edit-participant-modal-backdrop"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
    >
      <div
        id="edit-participant-modal-content"
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92dvh] flex flex-col animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs shrink-0 font-bold text-sm">
              <User className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate">
                  Modifier les données du participant
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                Fiche de : <span className="font-semibold text-slate-800">{displayName}</span>
              </p>
            </div>
          </div>

          <button
            id="close-edit-participant-modal-btn"
            onClick={onClose}
            type="button"
            className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl">
              {errorMsg}
            </div>
          )}

          {/* Section 1: Identité principale */}
          <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-800">
              <User className="w-3.5 h-3.5 text-slate-600" />
              <span>Identité du participant</span>
            </div>

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

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Adresse e-mail
              </label>
              <div className="relative">
                <input
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 font-mono"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Section 2: Suivi Spirituel & Chargé du suivi */}
          <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-800">
                <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                <span>Accompagnement & Suivi (Spirituel)</span>
              </div>
              <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 rounded-full">
                Chargé de suivi
              </span>
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
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Chargé du suivi (spirituel)</span>
                  <span className="text-[10px] text-indigo-600 font-normal">Attribution</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: Pasteur Samuel, Sœur Dorcas, Frère Thomas..."
                  value={assignedFollowupStaffName}
                  onChange={(e) => setAssignedFollowupStaffName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 italic">
              Attribuez un responsable pour assurer la relation, les prières et le suivi spirituel post-conférence de ce participant.
            </p>
          </div>

          {/* Section 3: Programme de Mentorat */}
          <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-800">
                <HeartHandshake className="w-3.5 h-3.5 text-amber-600" />
                <span>Mentorat académique & professionnel</span>
              </div>
              <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-full">
                Binôme mentor
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  <option value="SEEKING">En recherche d'un mentor</option>
                  <option value="ASSIGNED">Mentor attribué</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nom du mentor assigné
                </label>
                <input
                  type="text"
                  placeholder="Ex: Dr. Marc Dossou (Directeur R&D)"
                  value={assignedMentorName}
                  onChange={(e) => setAssignedMentorName(e.target.value)}
                  disabled={mentoringStatus !== 'ASSIGNED'}
                  className={`w-full px-3.5 py-2.5 text-xs rounded-xl border transition-all ${
                    mentoringStatus === 'ASSIGNED'
                      ? 'bg-white border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500'
                      : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Section 4: Réponses au formulaire Google Forms (dynamique) */}
          <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-800">
                <Sparkles className="w-3.5 h-3.5 text-slate-600" />
                <span>Réponses du formulaire d'inscription ({answersList.length})</span>
              </div>
              <button
                type="button"
                onClick={() => setShowAddAnswer(!showAddAnswer)}
                className="text-[11px] font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-200/60 px-2.5 py-1 rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Ajouter un champ</span>
              </button>
            </div>

            {showAddAnswer && (
              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2.5 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-800">Nouveau champ personnalisé</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Intitulé de la question (ex: Filière)"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                  <input
                    type="text"
                    placeholder="Réponse du participant"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowAddAnswer(false)}
                    className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-800"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={handleAddAnswer}
                    disabled={!newKey.trim()}
                    className="px-3 py-1 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg disabled:opacity-50"
                  >
                    Valider le champ
                  </button>
                </div>
              </div>
            )}

            {answersList.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">
                Aucune réponse dynamique. Cliquez sur « Ajouter un champ » pour en créer une.
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {answersList.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-colors space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-800 truncate" title={item.key}>
                        {item.key}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAnswer(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors shrink-0"
                        title="Supprimer ce champ"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={item.value}
                      onChange={(e) => handleAnswerChange(idx, e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50/60 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 5: Notes Internes */}
          <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-800">
              <FileText className="w-3.5 h-3.5 text-slate-600" />
              <span>Notes et compte-rendu interne de l'équipe</span>
            </div>
            <textarea
              rows={3}
              placeholder="Ajoutez des détails sur le suivi, les échanges téléphoniques, les sujets de prière..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 resize-none leading-relaxed"
            />
          </div>

          {/* Footer Action Buttons */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-all shadow-xs hover:shadow-md cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Enregistrement en cours...' : 'Enregistrer les modifications'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
