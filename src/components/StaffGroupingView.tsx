import { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronRight,
  UserCheck,
  GraduationCap,
  AlertCircle,
  Eye,
  Phone,
  CheckCircle2,
  Clock,
  CircleDot,
  Pencil,
  Sparkles,
} from 'lucide-react';
import {
  type ParticipantWithRegistration,
  type FollowupStatus,
  type MentoringStatus,
  type UserRole,
} from '../types';
import { getParticipantAvatar } from '../utils/imageHelpers';
import {
  getParticipantDisplayName,
  getParticipantInitial,
  getParticipantSubtitle,
} from '../utils/participantLabel';

interface StaffGroupingViewProps {
  participantsWithReg: ParticipantWithRegistration[];
  groupBy: 'FOLLOWUP_STAFF' | 'MENTOR';
  userRole?: UserRole;
  searchQuery?: string;
  onOpenParticipantDrawer: (item: ParticipantWithRegistration) => void;
  onOpenEditParticipant?: (item: ParticipantWithRegistration) => void;
  onUpdateFollowup: (registrationId: string, status: FollowupStatus) => Promise<void>;
  onUpdateMentoring: (
    registrationId: string,
    status: MentoringStatus,
    mentorName?: string
  ) => Promise<void>;
}

interface GroupSummary {
  name: string;
  isUnassigned: boolean;
  items: ParticipantWithRegistration[];
  completedCount: number;
  inProgressCount: number;
  notStartedCount: number;
  total: number;
}

export function StaffGroupingView({
  participantsWithReg,
  groupBy,
  userRole = 'VIEWER',
  searchQuery = '',
  onOpenParticipantDrawer,
  onOpenEditParticipant,
  onUpdateFollowup,
  onUpdateMentoring,
}: StaffGroupingViewProps) {
  // Collapsed / Expanded state per group name
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [updatingRegId, setUpdatingRegId] = useState<string | null>(null);

  // Group participants
  const groups: GroupSummary[] = useMemo(() => {
    const map = new Map<string, ParticipantWithRegistration[]>();
    const unassigned: ParticipantWithRegistration[] = [];

    participantsWithReg.forEach((item) => {
      const { registration, participant } = item;

      // Filter with search query if present
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inName =
          (participant.first_name || '').toLowerCase().includes(q) ||
          (participant.last_name || '').toLowerCase().includes(q);
        const inMentor = (registration.assignedMentorName || '').toLowerCase().includes(q);
        const inFollowup = (registration.assignedFollowupStaffName || '').toLowerCase().includes(q);
        const inAnswers = Object.values(registration.answers || {}).some((v) =>
          String(v).toLowerCase().includes(q)
        );

        if (!inName && !inMentor && !inFollowup && !inAnswers) {
          return;
        }
      }

      if (groupBy === 'FOLLOWUP_STAFF') {
        const staffName = (registration.assignedFollowupStaffName || '').trim();
        if (!staffName) {
          unassigned.push(item);
        } else {
          const list = map.get(staffName) || [];
          list.push(item);
          map.set(staffName, list);
        }
      } else {
        // MENTOR
        const mentorName = (registration.assignedMentorName || '').trim();
        if (registration.mentoringStatus === 'ASSIGNED' && mentorName) {
          const list = map.get(mentorName) || [];
          list.push(item);
          map.set(mentorName, list);
        } else {
          unassigned.push(item);
        }
      }
    });

    const result: GroupSummary[] = [];

    // Sort active staff / mentors alphabetically
    const sortedNames = Array.from(map.keys()).sort((a, b) => a.localeCompare(b, 'fr-FR'));

    sortedNames.forEach((name) => {
      const items = map.get(name) || [];
      const completedCount = items.filter(
        (i) => i.registration.followupStatus === 'COMPLETED'
      ).length;
      const inProgressCount = items.filter(
        (i) => i.registration.followupStatus === 'IN_PROGRESS'
      ).length;
      const notStartedCount = items.filter(
        (i) => !i.registration.followupStatus || i.registration.followupStatus === 'NOT_STARTED'
      ).length;

      result.push({
        name,
        isUnassigned: false,
        items,
        completedCount,
        inProgressCount,
        notStartedCount,
        total: items.length,
      });
    });

    // Add unassigned at the end or top if needed
    if (unassigned.length > 0) {
      const completedCount = unassigned.filter(
        (i) => i.registration.followupStatus === 'COMPLETED'
      ).length;
      const inProgressCount = unassigned.filter(
        (i) => i.registration.followupStatus === 'IN_PROGRESS'
      ).length;
      const notStartedCount = unassigned.filter(
        (i) => !i.registration.followupStatus || i.registration.followupStatus === 'NOT_STARTED'
      ).length;

      result.push({
        name:
          groupBy === 'FOLLOWUP_STAFF'
            ? 'Sans chargé de suivi assigné'
            : 'Sans mentor assigné / En recherche',
        isUnassigned: true,
        items: unassigned,
        completedCount,
        inProgressCount,
        notStartedCount,
        total: unassigned.length,
      });
    }

    return result;
  }, [participantsWithReg, groupBy, searchQuery]);

  const toggleGroup = (name: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  const expandAll = () => setCollapsedGroups({});
  const collapseAll = () => {
    const all: Record<string, boolean> = {};
    groups.forEach((g) => {
      all[g.name] = true;
    });
    setCollapsedGroups(all);
  };

  const handleStatusChange = async (registrationId: string, newStatus: FollowupStatus) => {
    if (userRole === 'VIEWER') return;
    setUpdatingRegId(registrationId);
    try {
      await onUpdateFollowup(registrationId, newStatus);
    } finally {
      setUpdatingRegId(null);
    }
  };

  if (groups.length === 0) {
    return (
      <div className="py-16 px-4 text-center">
        <UserCheck className="w-12 h-12 mx-auto text-slate-300 mb-3 stroke-[1.5]" />
        <h4 className="text-sm font-bold text-slate-800">Aucun participant trouvé</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Aucun accompagnateur ou participant ne correspond aux filtres de recherche.
        </p>
      </div>
    );
  }

  // Summary counts
  const totalAssignedStaff = groups.filter((g) => !g.isUnassigned).length;
  const unassignedGroup = groups.find((g) => g.isUnassigned);
  const totalAssignedParticipants = groups
    .filter((g) => !g.isUnassigned)
    .reduce((acc, g) => acc + g.total, 0);

  return (
    <div className="p-4 sm:p-5 space-y-4">
      {/* Header Overview Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs">
          <div className="flex items-center space-x-2">
            {groupBy === 'FOLLOWUP_STAFF' ? (
              <UserCheck className="w-4 h-4 text-slate-700" />
            ) : (
              <GraduationCap className="w-4 h-4 text-slate-700" />
            )}
            <span className="font-bold text-slate-900">
              {totalAssignedStaff} {groupBy === 'FOLLOWUP_STAFF' ? 'chargé(s) de suivi actif(s)' : 'mentor(s) actif(s)'}
            </span>
          </div>

          <span className="text-slate-300 hidden sm:inline">•</span>

          <span className="text-slate-600">
            <strong className="text-slate-900">{totalAssignedParticipants}</strong> participants assignés
          </span>

          {unassignedGroup && (
            <>
              <span className="text-slate-300 hidden sm:inline">•</span>
              <span className="inline-flex items-center space-x-1 font-semibold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full text-[11px]">
                <AlertCircle className="w-3 h-3" />
                <span>{unassignedGroup.total} non assigné(s)</span>
              </span>
            </>
          )}
        </div>

        {/* Expand / Collapse Controls */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={expandAll}
            className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
          >
            Tout déplier
          </button>
          <span className="text-slate-300">|</span>
          <button
            type="button"
            onClick={collapseAll}
            className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
          >
            Tout replier
          </button>
        </div>
      </div>

      {/* Group Cards Grid / Accordions */}
      <div className="space-y-3.5">
        {groups.map((group) => {
          const isCollapsed = !!collapsedGroups[group.name];
          const completionPct = group.total > 0 ? Math.round((group.completedCount / group.total) * 100) : 0;
          const inProgressPct = group.total > 0 ? Math.round((group.inProgressCount / group.total) * 100) : 0;

          return (
            <div
              key={group.name}
              className={`rounded-2xl border transition-all overflow-hidden ${
                group.isUnassigned
                  ? 'bg-amber-50/30 border-amber-200/80'
                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
              }`}
            >
              {/* Group Accordion Header */}
              <div
                onClick={() => toggleGroup(group.name)}
                className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none bg-slate-50/50 hover:bg-slate-100/60 transition-colors"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="text-slate-400">
                    {isCollapsed ? (
                      <ChevronRight className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>

                  {/* Avatar / Icon */}
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                      group.isUnassigned
                        ? 'bg-amber-100 text-amber-800'
                        : groupBy === 'FOLLOWUP_STAFF'
                        ? 'bg-slate-900 text-white'
                        : 'bg-sky-700 text-white'
                    }`}
                  >
                    {group.isUnassigned ? (
                      <AlertCircle className="w-4 h-4" />
                    ) : (
                      group.name.charAt(0).toUpperCase()
                    )}
                  </div>

                  {/* Name and count */}
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm font-bold text-slate-900 truncate">
                        {group.name}
                      </h3>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold shrink-0 ${
                          group.isUnassigned
                            ? 'bg-amber-200 text-amber-900'
                            : 'bg-slate-200/90 text-slate-800'
                        }`}
                      >
                        {group.total}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-1.5">
                      <span className="text-emerald-700 font-medium">
                        {group.completedCount} terminé{group.completedCount > 1 ? 's' : ''}
                      </span>
                      <span>•</span>
                      <span className="text-amber-700 font-medium">
                        {group.inProgressCount} en cours
                      </span>
                      <span>•</span>
                      <span className="text-slate-500 font-medium">
                        {group.notStartedCount} non démarré{group.notStartedCount > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress Bar & Badges */}
                <div className="flex items-center space-x-3 sm:space-x-4 shrink-0 pl-7 sm:pl-0">
                  <div className="w-28 sm:w-36 flex flex-col items-end">
                    <div className="text-[11px] font-bold text-slate-700 mb-1">
                      {completionPct}% complété
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden flex">
                      <div
                        className="bg-emerald-500 h-full transition-all"
                        style={{ width: `${completionPct}%` }}
                        title={`${group.completedCount} terminé(s)`}
                      />
                      <div
                        className="bg-amber-400 h-full transition-all"
                        style={{ width: `${inProgressPct}%` }}
                        title={`${group.inProgressCount} en cours`}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Group Body: List of Participants */}
              {!isCollapsed && (
                <div className="border-t border-slate-200/80 divide-y divide-slate-100 bg-white">
                  {group.items.map((item) => {
                    const { participant, registration } = item;
                    const isUpdating = updatingRegId === registration.id;
                    const avatarUrl = getParticipantAvatar(
                      participant.id || participant.first_name
                    );
                    const displayName = getParticipantDisplayName(item);
                    const subtitle = getParticipantSubtitle(item);

                    return (
                      <div
                        key={registration.id}
                        className="p-3 sm:px-4 sm:py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-slate-50/80 transition-colors"
                      >
                        {/* Participant Details */}
                        <div
                          onClick={() => onOpenParticipantDrawer(item)}
                          className="flex items-center space-x-3 cursor-pointer min-w-0 flex-1"
                        >
                          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center font-bold text-xs text-slate-700 shrink-0">
                            {avatarUrl ? (
                              <img
                                src={avatarUrl}
                                alt={displayName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              getParticipantInitial(item)
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-xs text-slate-900 truncate hover:text-indigo-600 transition-colors">
                              {displayName}
                            </div>
                            {subtitle && (
                              <div className="text-[11px] text-slate-500 font-mono truncate flex items-center space-x-1 mt-0.5">
                                <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{subtitle}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Status Controls */}
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0 pl-11 sm:pl-0">
                          {/* Follow-up Status */}
                          <div className="relative">
                            <select
                              disabled={userRole === 'VIEWER' || isUpdating}
                              value={registration.followupStatus || 'NOT_STARTED'}
                              onChange={(e) =>
                                handleStatusChange(
                                  registration.id,
                                  e.target.value as FollowupStatus
                                )
                              }
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer appearance-none pr-6 ${
                                registration.followupStatus === 'COMPLETED'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                  : registration.followupStatus === 'IN_PROGRESS'
                                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                                  : 'bg-slate-100 text-slate-700 border-slate-300'
                              } ${
                                userRole === 'VIEWER'
                                  ? 'cursor-not-allowed opacity-90'
                                  : 'hover:brightness-95'
                              }`}
                            >
                              <option value="NOT_STARTED">Non démarré</option>
                              <option value="IN_PROGRESS">En cours</option>
                              <option value="COMPLETED">Terminé</option>
                            </select>
                            <ChevronDown className="w-3 h-3 text-slate-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>

                          {/* Mentoring Status Badge */}
                          {groupBy === 'FOLLOWUP_STAFF' && (
                            <span
                              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold shrink-0 ${
                                registration.mentoringStatus === 'ASSIGNED'
                                  ? 'bg-sky-50 text-sky-800 border border-sky-200'
                                  : registration.mentoringStatus === 'SEEKING'
                                  ? 'bg-purple-50 text-purple-800 border border-purple-200'
                                  : 'bg-slate-50 text-slate-500 border border-slate-200'
                              }`}
                            >
                              {registration.mentoringStatus === 'ASSIGNED'
                                ? `Mentor : ${registration.assignedMentorName || 'Attribué'}`
                                : registration.mentoringStatus === 'SEEKING'
                                ? 'Recherche mentor'
                                : 'Sans mentor'}
                            </span>
                          )}

                          {groupBy === 'MENTOR' && (
                            <span className="text-[11px] text-slate-500 font-medium">
                              Suivi par : {registration.assignedFollowupStaffName || 'Non assigné'}
                            </span>
                          )}

                          {/* Action buttons */}
                          <div className="flex items-center space-x-1">
                            <button
                              type="button"
                              onClick={() => onOpenParticipantDrawer(item)}
                              className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Voir la fiche complète"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {userRole !== 'VIEWER' && onOpenEditParticipant && (
                              <button
                                type="button"
                                onClick={() => onOpenEditParticipant(item)}
                                className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="Modifier les assignations et détails"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
