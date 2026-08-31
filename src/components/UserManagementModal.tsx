import { useState, useMemo } from 'react';
import {
  X,
  Shield,
  UserCheck,
  UserX,
  Search,
  CheckCircle2,
  Clock,
  Trash2,
  ShieldAlert,
  AlertCircle,
  Users,
} from 'lucide-react';
import type { UserProfile, UserRole, UserStatus } from '../types';
import { updateUserStatusAndRole, deleteUserAccount } from '../firebase/service';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: UserProfile[];
  currentAdminEmail: string;
  currentAdminUid: string;
}

export function UserManagementModal({
  isOpen,
  onClose,
  users,
  currentAdminEmail,
  currentAdminUid,
}: UserManagementModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Tab filter
      if (filterTab === 'PENDING' && u.status !== 'PENDING') return false;
      if (filterTab === 'APPROVED' && u.status !== 'APPROVED') return false;
      if (filterTab === 'REJECTED' && u.status !== 'REJECTED') return false;

      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        u.email?.toLowerCase().includes(q) ||
        u.displayName?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q)
      );
    });
  }, [users, filterTab, searchQuery]);

  if (!isOpen) return null;

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedbackMessage({ type, text });
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  const pendingCount = users.filter((u) => u.status === 'PENDING').length;
  const approvedCount = users.filter((u) => u.status === 'APPROVED').length;
  const rejectedCount = users.filter((u) => u.status === 'REJECTED').length;

  const handleApprove = async (targetUid: string, role: UserRole) => {
    setIsUpdating(targetUid);
    try {
      await updateUserStatusAndRole(targetUid, 'APPROVED', role, currentAdminEmail);
      showFeedback('success', `Compte validé avec succès avec le rôle ${role}.`);
    } catch (err: any) {
      console.error('Error approving user:', err);
      showFeedback('error', `Erreur lors de la validation: ${err?.message || err}`);
    } finally {
      setIsUpdating(null);
    }
  };

  const handleReject = async (targetUid: string) => {
    if (targetUid === currentAdminUid) {
      showFeedback('error', 'Vous ne pouvez pas révoquer votre propre compte administrateur.');
      return;
    }
    const confirm = window.confirm("Confirmez-vous le refus ou la suspension de l'accès de cet utilisateur ?");
    if (!confirm) return;

    setIsUpdating(targetUid);
    try {
      await updateUserStatusAndRole(targetUid, 'REJECTED', 'VIEWER', currentAdminEmail);
      showFeedback('success', 'Accès suspendu.');
    } catch (err: any) {
      console.error('Error rejecting user:', err);
      showFeedback('error', `Erreur: ${err?.message || err}`);
    } finally {
      setIsUpdating(null);
    }
  };

  const handleRoleChange = async (targetUid: string, newRole: UserRole) => {
    if (targetUid === currentAdminUid && newRole !== 'ADMIN') {
      showFeedback('error', 'Vous ne pouvez pas retirer votre propre rôle administrateur.');
      return;
    }

    setIsUpdating(targetUid);
    try {
      await updateUserStatusAndRole(targetUid, 'APPROVED', newRole, currentAdminEmail);
      showFeedback('success', `Rôle mis à jour en ${newRole}.`);
    } catch (err: any) {
      console.error('Error updating role:', err);
      showFeedback('error', `Erreur: ${err?.message || err}`);
    } finally {
      setIsUpdating(null);
    }
  };

  const handleDelete = async (targetUid: string, email: string) => {
    if (targetUid === currentAdminUid) {
      showFeedback('error', 'Action interdite sur votre propre compte.');
      return;
    }
    const confirm = window.confirm(`Voulez-vous supprimer définitivement la fiche utilisateur de ${email} ?`);
    if (!confirm) return;

    setIsUpdating(targetUid);
    try {
      await deleteUserAccount(targetUid);
      showFeedback('success', 'Utilisateur supprimé de la base.');
    } catch (err: any) {
      console.error('Error deleting user:', err);
      showFeedback('error', `Erreur de suppression: ${err?.message || err}`);
    } finally {
      setIsUpdating(null);
    }
  };

  return (
    <div
      id="user-management-modal"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-slate-900">
                  Gestion des Accès & Rôles
                </h2>
                {pendingCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white animate-pulse">
                    {pendingCount} en attente
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Validez les demandes d'accès et attribuez les permissions (Admin, Gestionnaire, Lecteur)
              </p>
            </div>
          </div>

          <button
            id="close-user-management-modal-btn"
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback alert */}
        {feedbackMessage && (
          <div
            className={`px-6 py-2.5 text-xs font-medium border-b flex items-center space-x-2 ${
              feedbackMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
        )}

        {/* Controls: Search & Tabs */}
        <div className="px-6 py-4 border-b border-slate-100 bg-white flex flex-col sm:flex-row gap-3 items-center justify-between">
          {/* Tabs */}
          <div className="flex items-center space-x-1 p-1 bg-slate-100 rounded-xl w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setFilterTab('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterTab === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tous ({users.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('PENDING')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                filterTab === 'PENDING'
                  ? 'bg-white text-amber-800 shadow-xs'
                  : 'text-slate-600 hover:text-amber-700'
              }`}
            >
              <span>En attente</span>
              {pendingCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('APPROVED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterTab === 'APPROVED'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              Validés ({approvedCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('REJECTED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterTab === 'REJECTED'
                  ? 'bg-white text-rose-800 shadow-xs'
                  : 'text-slate-600 hover:text-rose-700'
              }`}
            >
              Refusés ({rejectedCount})
            </button>
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher nom, email..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>
        </div>

        {/* Roles Legend Banner */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-100 text-[11px] text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="font-semibold text-slate-800">Permissions :</span>
          <span>
            <strong className="text-slate-900">Admin :</strong> Accès total + gestion des accès
          </span>
          <span>
            <strong className="text-indigo-900">Gestionnaire :</strong> Conférences, participants, suivi & mentorat
          </span>
          <span>
            <strong className="text-slate-700">Lecteur :</strong> Consultation et export CSV uniquement
          </span>
        </div>

        {/* User list content */}
        <div className="flex-1 overflow-y-auto p-6 divide-y divide-slate-100">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium">Aucun compte trouvé avec ces critères.</p>
            </div>
          ) : (
            filteredUsers.map((u) => {
              const isCurrentUser = u.uid === currentAdminUid;
              const isItemUpdating = isUpdating === u.uid;

              return (
                <div
                  key={u.uid}
                  className="py-4 first:pt-0 last:pb-0 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4"
                >
                  {/* User info */}
                  <div className="flex items-center space-x-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden shadow-2xs">
                      {u.photoURL ? (
                        <img
                          src={u.photoURL}
                          alt="Avatar"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        (u.displayName || u.email || 'U').charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-slate-900 truncate">
                          {u.displayName || 'Utilisateur'}
                        </span>
                        {isCurrentUser && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-800">
                            Vous
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 font-mono truncate">{u.email}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Inscrit le {new Date(u.createdAt).toLocaleDateString('fr-FR')}
                        {u.approvedBy && (
                          <span> &bull; Validé par {u.approvedBy}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status & Role & Action Controls */}
                  <div className="flex flex-wrap items-center gap-2 self-stretch lg:self-auto justify-end">
                    {/* Status Badge */}
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center space-x-1 ${
                        u.status === 'APPROVED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : u.status === 'PENDING'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {u.status === 'APPROVED' ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Validé</span>
                        </>
                      ) : u.status === 'PENDING' ? (
                        <>
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>En attente</span>
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="w-3 h-3 text-rose-600" />
                          <span>Refusé</span>
                        </>
                      )}
                    </span>

                    {/* If PENDING: Approval button group */}
                    {u.status === 'PENDING' ? (
                      <div className="flex items-center space-x-1.5">
                        <button
                          type="button"
                          disabled={isItemUpdating}
                          onClick={() => handleApprove(u.uid, 'VIEWER')}
                          className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                          title="Autoriser l'accès en lecture seule"
                        >
                          Approuver (Lecteur)
                        </button>
                        <button
                          type="button"
                          disabled={isItemUpdating}
                          onClick={() => handleApprove(u.uid, 'MANAGER')}
                          className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-colors"
                          title="Autoriser avec droits de gestionnaire"
                        >
                          Approuver (Gestionnaire)
                        </button>
                        <button
                          type="button"
                          disabled={isItemUpdating}
                          onClick={() => handleReject(u.uid)}
                          className="px-2 py-1.5 rounded-xl text-xs font-semibold text-rose-700 hover:bg-rose-50 transition-colors"
                          title="Refuser la demande d'accès"
                        >
                          Refuser
                        </button>
                      </div>
                    ) : (
                      /* If APPROVED or REJECTED: Role selector and status toggle */
                      <div className="flex items-center space-x-2">
                        {/* Role selector dropdown */}
                        <div className="relative">
                          <select
                            disabled={isCurrentUser || isItemUpdating}
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.uid, e.target.value as UserRole)}
                            className={`text-xs font-semibold py-1.5 pl-2.5 pr-6 rounded-xl border focus:outline-none focus:ring-2 focus:ring-slate-900/10 cursor-pointer ${
                              u.role === 'ADMIN'
                                ? 'bg-slate-900 text-white border-slate-900'
                                : u.role === 'MANAGER'
                                ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                : 'bg-slate-100 text-slate-800 border-slate-200'
                            }`}
                          >
                            <option value="VIEWER" className="bg-white text-slate-900">
                              Lecteur (Lecture seule)
                            </option>
                            <option value="MANAGER" className="bg-white text-slate-900">
                              Gestionnaire (Suivi & Édition)
                            </option>
                            <option value="ADMIN" className="bg-white text-slate-900">
                              Administrateur (Complet)
                            </option>
                          </select>
                        </div>

                        {/* Re-activate or Suspend button */}
                        {u.status === 'APPROVED' ? (
                          !isCurrentUser && (
                            <button
                              type="button"
                              disabled={isItemUpdating}
                              onClick={() => handleReject(u.uid)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Suspendre cet utilisateur"
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          )
                        ) : (
                          <button
                            type="button"
                            disabled={isItemUpdating}
                            onClick={() => handleApprove(u.uid, u.role || 'VIEWER')}
                            className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                            title="Réactiver ce compte"
                          >
                            Réactiver
                          </button>
                        )}

                        {/* Delete button */}
                        {!isCurrentUser && (
                          <button
                            type="button"
                            disabled={isItemUpdating}
                            onClick={() => handleDelete(u.uid, u.email)}
                            className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Supprimer la fiche utilisateur"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>
            Total : <strong className="text-slate-800">{users.length}</strong> compte(s) enregistré(s)
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition-colors shadow-2xs"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
