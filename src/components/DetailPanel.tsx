import { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Users,
  Search,
  UploadCloud,
  UserPlus,
  Download,
  School,
  ChevronDown,
  Phone,
  UserCheck,
  Eye,
  RotateCcw,
  MoreVertical,
  MessageSquare,
  CheckCircle2,
  Pencil,
  ZoomIn,
  X,
} from 'lucide-react';
import {
  type ConferenceEvent,
  type ParticipantWithRegistration,
  type FollowupStatus,
  type MentoringStatus,
} from '../types';
import { exportParticipantsToCSV } from '../utils/csvHelpers';
import { getParticipantAvatar, getConferenceImage } from '../utils/imageHelpers';

interface DetailPanelProps {
  event: ConferenceEvent | null;
  participantsWithReg: ParticipantWithRegistration[];
  isLoading: boolean;
  onOpenCSVImport: () => void;
  onOpenNewParticipant: () => void;
  onOpenParticipantDrawer: (item: ParticipantWithRegistration) => void;
  onOpenEditEvent: () => void;
  onUpdateFollowup: (registrationId: string, status: FollowupStatus) => Promise<void>;
  onUpdateMentoring: (
    registrationId: string,
    status: MentoringStatus,
    mentorName?: string
  ) => Promise<void>;
}

export function DetailPanel({
  event,
  participantsWithReg,
  isLoading,
  onOpenCSVImport,
  onOpenNewParticipant,
  onOpenParticipantDrawer,
  onOpenEditEvent,
  onUpdateFollowup,
  onUpdateMentoring,
}: DetailPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFollowup, setFilterFollowup] = useState<string>('ALL');
  const [filterMentoring, setFilterMentoring] = useState<string>('ALL');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [zoomPoster, setZoomPoster] = useState<string | null>(null);

  // Statistics calculation for the current conference
  const stats = useMemo(() => {
    const total = participantsWithReg.length;
    let followupNotStarted = 0;
    let followupInProgress = 0;
    let followupCompleted = 0;

    let mentoringNotRequested = 0;
    let mentoringSeeking = 0;
    let mentoringAssigned = 0;

    participantsWithReg.forEach(({ registration }) => {
      if (registration.followupStatus === 'COMPLETED') followupCompleted++;
      else if (registration.followupStatus === 'IN_PROGRESS') followupInProgress++;
      else followupNotStarted++;

      if (registration.mentoringStatus === 'ASSIGNED') mentoringAssigned++;
      else if (registration.mentoringStatus === 'SEEKING') mentoringSeeking++;
      else mentoringNotRequested++;
    });

    return {
      total,
      followupNotStarted,
      followupInProgress,
      followupCompleted,
      mentoringNotRequested,
      mentoringSeeking,
      mentoringAssigned,
    };
  }, [participantsWithReg]);

  // Search & Filter
  const filteredParticipants = useMemo(() => {
    return participantsWithReg.filter((item) => {
      const { participant, registration } = item;

      // Filter by Followup
      if (filterFollowup !== 'ALL' && registration.followupStatus !== filterFollowup) {
        return false;
      }

      // Filter by Mentoring
      if (filterMentoring !== 'ALL' && registration.mentoringStatus !== filterMentoring) {
        return false;
      }

      // Search query across name, email, mentor, and dynamic answers
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();

      const inName =
        participant.first_name.toLowerCase().includes(q) ||
        participant.last_name.toLowerCase().includes(q);
      const inEmail = participant.email.toLowerCase().includes(q);
      const inMentor = (registration.assignedMentorName || '').toLowerCase().includes(q);

      // Search inside dynamic answers
      const inAnswers = Object.values(registration.answers || {}).some((val) =>
        String(val).toLowerCase().includes(q)
      );

      return inName || inEmail || inMentor || inAnswers;
    });
  }, [participantsWithReg, searchQuery, filterFollowup, filterMentoring]);

  const handleFollowupStatusChange = async (
    registrationId: string,
    newStatus: FollowupStatus
  ) => {
    setUpdatingId(registrationId);
    try {
      await onUpdateFollowup(registrationId, newStatus);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleMentoringStatusChange = async (
    registrationId: string,
    newStatus: MentoringStatus
  ) => {
    setUpdatingId(registrationId);
    try {
      await onUpdateMentoring(registrationId, newStatus);
    } finally {
      setUpdatingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Date non spécifiée';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return new Intl.DateTimeFormat('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  // Helper to extract WhatsApp / phone number for quick display in table
  const getWhatsApp = (answers: Record<string, any>): string | null => {
    for (const [k, v] of Object.entries(answers || {})) {
      const lk = k.toLowerCase();
      if (lk.includes('whatsapp') || lk.includes('tel') || lk.includes('phone')) {
        return String(v);
      }
    }
    return null;
  };

  // Helper to extract school/university for quick display in table
  const getSchool = (answers: Record<string, any>): string | null => {
    for (const [k, v] of Object.entries(answers || {})) {
      const lk = k.toLowerCase();
      if (
        lk.includes('ecole') ||
        lk.includes('école') ||
        lk.includes('univ') ||
        lk.includes('etablissement') ||
        lk.includes('établissement')
      ) {
        return String(v);
      }
    }
    return null;
  };

  if (!event) {
    return (
      <main
        id="detail-panel-empty"
        className="flex-1 bg-slate-50 flex items-center justify-center p-8 text-center h-[calc(100vh-5.5rem)]"
      >
        <div className="max-w-md bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600 mb-4 border border-teal-100">
            <Calendar className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            Sélectionnez une conférence
          </h2>
          <p className="text-xs text-slate-500 mt-2 mb-5">
            Choisissez une conférence dans le volet gauche pour voir les participants inscrits,
            gérer les suivis et importer de nouveaux formulaires Google Forms.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main
      id="conference-detail-panel"
      className="flex-1 h-[calc(100vh-5.5rem)] overflow-y-auto space-y-6 pr-1"
      onClick={() => setActiveMenuId(null)}
    >
      {/* SECTION 1: Date de l'événement Card */}
      <section
        id="event-overview-card"
        className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6"
      >
        <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-5">
          <div className="flex flex-col sm:flex-row items-start gap-4 flex-1">
            {/* Conference Poster Preview */}
            <div
              className="relative group shrink-0 w-24 h-32 sm:w-28 sm:h-36 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-2xs cursor-pointer"
              onClick={() => setZoomPoster(getConferenceImage(event.id, event.title, event.imageUrl))}
              title="Cliquer pour agrandir l'affiche de la conférence"
            >
              <img
                src={getConferenceImage(event.id, event.title, event.imageUrl)}
                alt={event.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white p-1 text-center">
                <ZoomIn className="w-5 h-5 mb-1" />
                <span className="text-[10px] font-semibold">Agrandir</span>
              </div>
              <div className="absolute bottom-1 left-1 right-1">
                <span className="block text-[9px] font-bold text-center bg-slate-900/80 text-white py-0.5 rounded backdrop-blur-xs">
                  {event.imageUrl ? 'Affiche officielle' : 'Affiche par défaut'}
                </span>
              </div>
            </div>

            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-700 bg-teal-50 border border-teal-200/80 px-2.5 py-0.5 rounded-full">
                  Conférence sélectionnée
                </span>
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-700 text-white">
                  <Users className="w-3 h-3" />
                  <span>{participantsWithReg.length} participants</span>
                </span>
                {event.imageUrl && (
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Affiche jointe
                  </span>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {event.title}
              </h1>

              {/* Prominent Section Header: Date de l'événement */}
              <div className="pt-1 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:text-sm">
                <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                  <Calendar className="w-4 h-4 text-teal-600" />
                  <span className="font-bold text-slate-900">Date de l'événement :</span>
                  <span className="font-semibold text-slate-700 capitalize">
                    {formatDate(event.date)}
                  </span>
                </div>

                <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                  <Clock className="w-4 h-4 text-teal-600" />
                  <span className="font-bold text-slate-900">Horaire :</span>
                  <span className="text-slate-700 font-medium">
                    {event.startTime || '14:00'} - {event.endTime || '16:30'}
                  </span>
                </div>
              </div>

              {event.description && (
                <p className="text-xs text-slate-600 pt-1 leading-relaxed max-w-3xl">
                  {event.description}
                </p>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              id="edit-current-conference-btn"
              onClick={onOpenEditEvent}
              type="button"
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-teal-800 bg-teal-50 border border-teal-200 hover:bg-teal-100 transition-colors shadow-xs cursor-pointer"
              title="Modifier les informations et joindre une affiche"
            >
              <Pencil className="w-4 h-4 text-teal-700" />
              <span>Modifier la conférence</span>
            </button>

            <button
              id="open-csv-import-btn"
              onClick={onOpenCSVImport}
              type="button"
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-colors shadow-xs cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Importer Google Forms (CSV)</span>
            </button>

            <button
              id="open-new-participant-btn"
              onClick={onOpenNewParticipant}
              type="button"
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-slate-500" />
              <span>Ajouter un participant</span>
            </button>

            <button
              id="export-participants-csv-btn"
              onClick={() => exportParticipantsToCSV(event.title, participantsWithReg)}
              type="button"
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
              title="Exporter la liste avec toutes les réponses dynamiques"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Exporter CSV</span>
            </button>
          </div>
        </div>

        {/* KPI Summary Statistics Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-100">
          {/* Total */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200">
            <div className="text-xs font-semibold text-slate-500">Inscrits à la conférence</div>
            <div className="text-xl font-bold text-slate-900 mt-1">{stats.total}</div>
          </div>

          {/* Follow-up completed */}
          <div className="bg-teal-50/60 rounded-xl p-3.5 border border-teal-200/70">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-teal-800">Suivi terminé</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-teal-700 text-white">
                {stats.total > 0
                  ? Math.round((stats.followupCompleted / stats.total) * 100)
                  : 0}
                %
              </span>
            </div>
            <div className="text-xl font-bold text-teal-900 mt-1">
              {stats.followupCompleted}{' '}
              <span className="text-xs font-medium text-teal-700">/ {stats.total}</span>
            </div>
          </div>

          {/* Follow-up in progress & not started */}
          <div className="bg-amber-50/60 rounded-xl p-3.5 border border-amber-200/70">
            <div className="text-xs font-semibold text-amber-800">Suivis en cours / À faire</div>
            <div className="text-xl font-bold text-amber-900 mt-1">
              {stats.followupInProgress}{' '}
              <span className="text-xs font-medium text-amber-700">
                en cours ({stats.followupNotStarted} en attente)
              </span>
            </div>
          </div>

          {/* Mentoring status */}
          <div className="bg-sky-50/60 rounded-xl p-3.5 border border-sky-200/70">
            <div className="text-xs font-semibold text-sky-800">Mentorat professionnel</div>
            <div className="text-xl font-bold text-sky-900 mt-1">
              {stats.mentoringAssigned}{' '}
              <span className="text-xs font-medium text-sky-700">
                assignés ({stats.mentoringSeeking} en recherche)
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: Liste des Participants Card */}
      <section
        id="participants-list-section"
        className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
      >
        {/* Section Header: Liste des Participants & Filters */}
        <div className="p-5 border-b border-slate-200 bg-white">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <h2 className="text-lg font-bold text-slate-900">Liste des Participants</h2>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-700 text-white">
                {filteredParticipants.length}
              </span>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative w-full sm:w-64 md:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="search-participants-input"
                  type="text"
                  placeholder="Rechercher par nom, email, école..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 focus:bg-white transition-all"
                />
              </div>

              {/* Followup filter */}
              <div className="flex items-center space-x-1.5 text-xs text-slate-600">
                <span className="text-slate-500 font-semibold">Suivi :</span>
                <select
                  id="filter-followup-select"
                  value={filterFollowup}
                  onChange={(e) => setFilterFollowup(e.target.value)}
                  className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 focus:bg-white"
                >
                  <option value="ALL">Tous les statuts</option>
                  <option value="NOT_STARTED">Non démarré ({stats.followupNotStarted})</option>
                  <option value="IN_PROGRESS">En cours ({stats.followupInProgress})</option>
                  <option value="COMPLETED">Terminé ({stats.followupCompleted})</option>
                </select>
              </div>

              {/* Mentoring filter */}
              <div className="flex items-center space-x-1.5 text-xs text-slate-600">
                <span className="text-slate-500 font-semibold">Mentorat :</span>
                <select
                  id="filter-mentoring-select"
                  value={filterMentoring}
                  onChange={(e) => setFilterMentoring(e.target.value)}
                  className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 focus:bg-white"
                >
                  <option value="ALL">Tous ({stats.total})</option>
                  <option value="SEEKING">En recherche ({stats.mentoringSeeking})</option>
                  <option value="ASSIGNED">Mentor attribué ({stats.mentoringAssigned})</option>
                  <option value="NOT_REQUESTED">Non demandé ({stats.mentoringNotRequested})</option>
                </select>
              </div>

              {(filterFollowup !== 'ALL' || filterMentoring !== 'ALL' || searchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setFilterFollowup('ALL');
                    setFilterMentoring('ALL');
                  }}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors text-xs flex items-center space-x-1"
                  title="Réinitialiser les filtres"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-semibold">Effacer</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Clean Table with Ample Vertical Padding (py-3), Circular Avatars, Pill Badges, MoreVertical menu */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/90 text-slate-700 border-b border-slate-200 font-bold">
                <th className="py-3.5 px-5 font-bold text-slate-900">Participant</th>
                <th className="py-3.5 px-4 font-bold text-slate-900">Contact & Établissement</th>
                <th className="py-3.5 px-4 font-bold text-slate-900">Statut Suivi</th>
                <th className="py-3.5 px-4 font-bold text-slate-900">Statut Mentorat</th>
                <th className="py-3.5 px-5 font-bold text-slate-900 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-slate-400">
                    <div className="w-8 h-8 mx-auto mb-2 border-2 border-slate-300 border-t-teal-600 rounded-full animate-spin"></div>
                    <p className="text-xs font-semibold">Chargement des participants...</p>
                  </td>
                </tr>
              ) : filteredParticipants.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 px-4 text-center">
                    <Users className="w-12 h-12 mx-auto text-slate-300 mb-3 stroke-[1.5]" />
                    <h4 className="text-sm font-bold text-slate-800">
                      {participantsWithReg.length === 0
                        ? 'Aucun participant inscrit pour le moment'
                        : 'Aucun résultat correspondant aux filtres'}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 mb-4 max-w-sm mx-auto">
                      {participantsWithReg.length === 0
                        ? 'Importez les réponses de votre formulaire Google Forms (CSV) ou ajoutez un participant manuellement.'
                        : 'Modifiez ou effacez vos critères de recherche pour afficher plus de participants.'}
                    </p>
                    {participantsWithReg.length === 0 && (
                      <button
                        onClick={onOpenCSVImport}
                        type="button"
                        className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-colors shadow-xs"
                      >
                        <UploadCloud className="w-4 h-4" />
                        <span>Importer les réponses Google Forms</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredParticipants.map((item) => {
                  const { participant, registration } = item;
                  const isUpdating = updatingId === registration.id;
                  const whatsApp = getWhatsApp(registration.answers);
                  const school = getSchool(registration.answers);
                  const avatarUrl = getParticipantAvatar(participant.email);

                  return (
                    <tr
                      key={registration.id}
                      id={`participant-row-${registration.id}`}
                      onClick={() => onOpenParticipantDrawer(item)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      {/* Column 1: Participant Identity with Circular Avatar */}
                      <td className="py-3 px-5">
                        <div className="flex items-center space-x-3">
                          {/* Circular Avatar */}
                          <div className="w-10 h-10 rounded-full border border-slate-200 overflow-hidden flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs bg-teal-50 text-teal-800 relative">
                            {avatarUrl ? (
                              <img
                                src={avatarUrl}
                                alt={`${participant.first_name} ${participant.last_name}`}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                                loading="lazy"
                              />
                            ) : (
                              <span>
                                {(participant.first_name || 'P').charAt(0).toUpperCase()}
                                {(participant.last_name || '').charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 truncate">
                              {participant.first_name} {participant.last_name}
                            </div>
                            <div className="text-[11px] font-mono text-slate-500 truncate max-w-[220px]">
                              {participant.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Contact & School */}
                      <td className="py-3 px-4">
                        <div className="space-y-1 max-w-xs">
                          {whatsApp && (
                            <div className="flex items-center space-x-1.5 text-xs text-slate-700">
                              <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span className="font-semibold">{whatsApp}</span>
                            </div>
                          )}
                          {school ? (
                            <div className="flex items-center space-x-1.5 text-xs text-slate-500 truncate">
                              <School className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{school}</span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">
                              {Object.keys(registration.answers || {}).length} champs renseignés
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Column 3: Follow-up Status Pill Badge / Interactive Selector */}
                      <td
                        className="py-3 px-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="relative inline-block">
                          <select
                            id={`followup-select-${registration.id}`}
                            value={registration.followupStatus}
                            onChange={(e) =>
                              handleFollowupStatusChange(
                                registration.id,
                                e.target.value as FollowupStatus
                              )
                            }
                            className={`appearance-none text-xs font-semibold py-1.5 pl-3 pr-7 rounded-full transition-all cursor-pointer shadow-2xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 ${
                              registration.followupStatus === 'COMPLETED'
                                ? 'bg-teal-700 text-white hover:bg-teal-800'
                                : registration.followupStatus === 'IN_PROGRESS'
                                ? 'bg-amber-500 text-white hover:bg-amber-600'
                                : 'bg-slate-500 text-white hover:bg-slate-600'
                            }`}
                          >
                            <option value="NOT_STARTED" className="bg-white text-slate-900">
                              Non démarré
                            </option>
                            <option value="IN_PROGRESS" className="bg-white text-slate-900">
                              En cours
                            </option>
                            <option value="COMPLETED" className="bg-white text-slate-900">
                              Terminé
                            </option>
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 text-white/90 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                        {isUpdating && (
                          <span className="text-[10px] text-teal-600 font-semibold ml-1.5 animate-pulse">
                            Sync...
                          </span>
                        )}
                      </td>

                      {/* Column 4: Mentoring Status Pill Badge / Interactive Selector */}
                      <td
                        className="py-3 px-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="space-y-1">
                          <div className="relative inline-block">
                            <select
                              id={`mentoring-select-${registration.id}`}
                              value={registration.mentoringStatus}
                              onChange={(e) =>
                                handleMentoringStatusChange(
                                  registration.id,
                                  e.target.value as MentoringStatus
                                )
                              }
                              className={`appearance-none text-xs font-semibold py-1.5 pl-3 pr-7 rounded-full transition-all cursor-pointer shadow-2xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 ${
                                registration.mentoringStatus === 'ASSIGNED'
                                  ? 'bg-teal-700 text-white hover:bg-teal-800'
                                  : registration.mentoringStatus === 'SEEKING'
                                  ? 'bg-sky-500 text-white hover:bg-sky-600'
                                  : 'bg-slate-500 text-white hover:bg-slate-600'
                              }`}
                            >
                              <option value="NOT_REQUESTED" className="bg-white text-slate-900">
                                Non demandé
                              </option>
                              <option value="SEEKING" className="bg-white text-slate-900">
                                En recherche
                              </option>
                              <option value="ASSIGNED" className="bg-white text-slate-900">
                                Mentor attribué
                              </option>
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 text-white/90 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>

                          {/* Assigned mentor name display */}
                          {registration.mentoringStatus === 'ASSIGNED' && (
                            <div className="text-[11px] text-teal-800 font-semibold flex items-center space-x-1">
                              <UserCheck className="w-3 h-3 text-teal-600 shrink-0" />
                              <span className="truncate max-w-[150px]">
                                {registration.assignedMentorName || 'À attribuer'}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Column 5: Action Column with Three-Dots Menu Icon (MoreVertical) */}
                      <td
                        className="py-3 px-5 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="relative inline-flex items-center justify-end space-x-2">
                          <button
                            id={`view-details-btn-${registration.id}`}
                            type="button"
                            onClick={() => onOpenParticipantDrawer(item)}
                            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            <span className="hidden sm:inline">Détails</span>
                          </button>

                          {/* Three-dots menu icon (MoreVertical) */}
                          <div className="relative">
                            <button
                              id={`more-menu-btn-${registration.id}`}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(
                                  activeMenuId === registration.id ? null : registration.id
                                );
                              }}
                              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Plus d'actions"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {/* Dropdown Popup */}
                            {activeMenuId === registration.id && (
                              <div
                                className="absolute right-0 mt-1 w-52 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-30 text-left"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    onOpenParticipantDrawer(item);
                                  }}
                                  className="w-full px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-teal-50 hover:text-teal-900 flex items-center space-x-2 text-left"
                                >
                                  <Eye className="w-4 h-4 text-teal-600" />
                                  <span>Voir réponses Forms</span>
                                </button>

                                {whatsApp && (
                                  <a
                                    href={`https://wa.me/${whatsApp.replace(/[^0-9]/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => setActiveMenuId(null)}
                                    className="w-full px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-teal-50 hover:text-teal-900 flex items-center space-x-2 text-left"
                                  >
                                    <Phone className="w-4 h-4 text-emerald-600" />
                                    <span>Contacter sur WhatsApp</span>
                                  </a>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    const nextStatus: FollowupStatus =
                                      registration.followupStatus === 'NOT_STARTED'
                                        ? 'IN_PROGRESS'
                                        : registration.followupStatus === 'IN_PROGRESS'
                                        ? 'COMPLETED'
                                        : 'NOT_STARTED';
                                    handleFollowupStatusChange(registration.id, nextStatus);
                                  }}
                                  className="w-full px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-teal-50 hover:text-teal-900 flex items-center space-x-2 text-left border-t border-slate-100"
                                >
                                  <CheckCircle2 className="w-4 h-4 text-teal-600" />
                                  <span>Changer statut de suivi</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between text-xs text-slate-500">
          <span>
            Affichage de <span className="font-bold text-slate-700">{filteredParticipants.length}</span> sur <span className="font-bold text-slate-700">{participantsWithReg.length}</span> participants
          </span>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Cliquer sur une ligne pour ouvrir le volet latéral avec toutes les réponses
          </span>
        </div>
      </section>

      {/* Lightbox modal for Conference Poster */}
      {zoomPoster && (
        <div
          className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setZoomPoster(null)}
        >
          <div
            className="relative max-w-2xl max-h-[90vh] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-white/20 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 bg-slate-900/90 border-b border-white/10 flex items-center justify-between text-white">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold truncate max-w-sm">
                  {event.title} — Affiche officielle
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setZoomPoster(null);
                    onOpenEditEvent();
                  }}
                  className="px-3 py-1 bg-teal-600 hover:bg-teal-500 rounded-lg text-xs font-semibold text-white transition-colors cursor-pointer flex items-center space-x-1"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Modifier l'affiche</span>
                </button>
                <button
                  type="button"
                  onClick={() => setZoomPoster(null)}
                  className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-2 flex-1 flex items-center justify-center overflow-auto max-h-[75vh]">
              <img
                src={zoomPoster}
                alt={event.title}
                className="max-h-[72vh] w-auto max-w-full object-contain rounded-lg"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
