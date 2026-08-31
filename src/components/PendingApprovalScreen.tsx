import { useState } from 'react';
import { Clock, ShieldAlert, LogOut, RefreshCw, UserCheck, Mail, ShieldCheck } from 'lucide-react';
import type { User } from 'firebase/auth';
import type { UserProfile } from '../types';
import { logout } from '../firebase/config';
import { BOOTSTRAP_ADMIN_EMAIL } from '../firebase/service';

interface PendingApprovalScreenProps {
  user: User;
  profile: UserProfile | null;
  onRefresh?: () => void;
}

export function PendingApprovalScreen({ user, profile, onRefresh }: PendingApprovalScreenProps) {
  const [isChecking, setIsChecking] = useState(false);

  const isRejected = profile?.status === 'REJECTED';

  const handleManualCheck = async () => {
    setIsChecking(true);
    if (onRefresh) {
      onRefresh();
    }
    setTimeout(() => setIsChecking(false), 800);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 sm:p-8 text-center">
          {/* Status Icon */}
          <div
            className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-5 shadow-xs ${
              isRejected ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
            }`}
          >
            {isRejected ? (
              <ShieldAlert className="w-8 h-8" />
            ) : (
              <Clock className="w-8 h-8 animate-pulse" />
            )}
          </div>

          {/* Title & Status */}
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            {isRejected ? 'Accès suspendu ou refusé' : 'Compte en attente de validation'}
          </h1>

          <div className="mt-2 inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/80">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
            <span>{isRejected ? 'Statut : Refusé' : 'Statut : En attente d’approbation'}</span>
          </div>

          {/* User ID card summary */}
          <div className="mt-6 bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-left">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  (user.displayName || user.email || 'U').charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-slate-900 text-sm truncate">
                  {user.displayName || 'Utilisateur'}
                </div>
                <div className="text-xs text-slate-500 flex items-center space-x-1 truncate">
                  <Mail className="w-3 h-3 shrink-0" />
                  <span className="truncate">{user.email}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Descriptive text */}
          <div className="mt-5 text-xs sm:text-sm text-slate-600 leading-relaxed text-left space-y-3">
            {isRejected ? (
              <p>
                Votre demande d'accès à la plateforme ConfTrack CRM n'a pas été autorisée par
                l'administrateur, ou vos permissions ont été temporairement suspendues.
              </p>
            ) : (
              <>
                <p>
                  Votre compte a bien été créé. Toutefois, conformément aux règles de sécurité et
                  de protection des données des participants, <strong className="text-slate-900">l'accès aux données nécessite la validation préalable d'un administrateur</strong>.
                </p>
                <div className="p-3 bg-indigo-50/70 border border-indigo-200/60 rounded-xl text-indigo-900 text-xs flex items-start space-x-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Synchronisation instantanée :</strong> Dès que l'administrateur valide votre
                    profil, vos accès se déverrouilleront automatiquement sans que vous ayez besoin de
                    vous reconnecter.
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Admin contact box */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-xs text-slate-500 text-left flex items-center justify-between">
            <div>
              <span className="font-semibold text-slate-700">Administrateur référent :</span>
              <div className="text-slate-600 font-mono text-[11px] mt-0.5">
                {BOOTSTRAP_ADMIN_EMAIL}
              </div>
            </div>

            {/* Check status button */}
            <button
              id="refresh-approval-status-btn"
              type="button"
              onClick={handleManualCheck}
              disabled={isChecking}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
              <span>Vérifier</span>
            </button>
          </div>

          {/* Action buttons */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              id="logout-pending-btn"
              type="button"
              onClick={handleLogout}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Se déconnecter</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-500 mt-6">
          ConfTrack CRM &bull; Validation requise &bull; Données confidentielles
        </p>
      </div>
    </div>
  );
}
