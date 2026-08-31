import { useState, useEffect } from 'react';
import {
  Calendar,
  Sparkles,
  Database,
  LogIn,
  LogOut,
  User as UserIcon,
  RefreshCw,
  FileSpreadsheet,
  Shield,
  UserCheck,
  Eye,
  ShieldAlert,
} from 'lucide-react';
import { auth, loginWithGoogle, logout, testConnection } from '../firebase/config';
import { seedDemoData } from '../firebase/service';
import type { User } from 'firebase/auth';
import type { UserProfile } from '../types';
import { SAMPLE_GOOGLE_FORMS_CSV } from '../utils/csvHelpers';

interface NavbarProps {
  currentUser: User | null;
  userProfile: UserProfile | null;
  pendingUsersCount?: number;
  onOpenUserManagement?: () => void;
  onRefreshNeeded?: () => void;
}

export function Navbar({
  currentUser,
  userProfile,
  pendingUsersCount = 0,
  onOpenUserManagement,
  onRefreshNeeded,
}: NavbarProps) {
  const [isSeeding, setIsSeeding] = useState(false);
  const [isDbOnline, setIsDbOnline] = useState<boolean | null>(null);

  useEffect(() => {
    // Test Firestore connection on boot
    testConnection().then((connected) => {
      setIsDbOnline(connected);
    });
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleSeedDemo = async () => {
    if (isSeeding) return;
    const confirm = window.confirm(
      'Voulez-vous charger des conférences et des participants de démonstration avec des réponses Google Forms variées ?'
    );
    if (!confirm) return;

    setIsSeeding(true);
    try {
      await seedDemoData();
      if (onRefreshNeeded) onRefreshNeeded();
      alert('Données de démonstration chargées avec succès dans Firestore !');
    } catch (err: any) {
      console.error('Seed error:', err);
      alert('Erreur lors du chargement des données de démo: ' + (err?.message || err));
    } finally {
      setIsSeeding(false);
    }
  };

  const handleDownloadSampleCSV = () => {
    const blob = new Blob(['\ufeff' + SAMPLE_GOOGLE_FORMS_CSV], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'exemple_reponses_google_forms_conference.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <header
      id="app-navbar"
      className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs"
    >
      <div className="max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
          {/* Brand identity */}
          <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-xs shrink-0">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-slate-900 tracking-tight text-sm sm:text-base lg:text-lg truncate">
                  ConfTrack CRM
                </span>
                <span className="badge-neutral hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0">
                  Excellence Académique
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden lg:block truncate">
                Gestion des conférences & Ingestion Google Forms
              </p>
            </div>
          </div>

          {/* Actions & User State */}
          <div className="flex items-center space-x-1.5 sm:space-x-2.5 shrink-0">
            {/* Download sample CSV button */}
            <button
              id="download-sample-csv-btn"
              onClick={handleDownloadSampleCSV}
              type="button"
              className="inline-flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-xs cursor-pointer"
              title="Télécharger un modèle CSV Google Forms prêt à tester"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Exemple CSV</span>
            </button>

            {/* Seed demo data button (Only for Admin or Manager) */}
            {userProfile && userProfile.role !== 'VIEWER' && (
              <button
                id="seed-demo-data-btn"
                onClick={handleSeedDemo}
                disabled={isSeeding}
                type="button"
                className="btn-secondary inline-flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-semibold cursor-pointer"
                title="Injecter des conférences et participants de test"
              >
                {isSeeding ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-600" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-slate-600" />
                )}
                <span>{isSeeding ? '...' : 'Démo'}</span>
              </button>
            )}

            {/* Admin: User Access Management Button */}
            {userProfile?.role === 'ADMIN' && onOpenUserManagement && (
              <button
                id="open-user-management-btn"
                type="button"
                onClick={onOpenUserManagement}
                className="inline-flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
                title="Gestion des autorisations et comptes utilisateurs"
              >
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Accès & Rôles</span>
                {pendingUsersCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white animate-pulse">
                    {pendingUsersCount}
                  </span>
                )}
              </button>
            )}

            {/* Authenticated user pill & logout */}
            {currentUser && (
              <div className="flex items-center space-x-1.5 sm:space-x-2 pl-1.5 sm:pl-2 border-l border-slate-200">
                {/* Role badge */}
                {userProfile && (
                  <div
                    className={`hidden md:inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                      userProfile.role === 'ADMIN'
                        ? 'bg-slate-900 text-amber-300 border border-amber-400/30'
                        : userProfile.role === 'MANAGER'
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                    title={`Rôle attribué : ${userProfile.role}`}
                  >
                    {userProfile.role === 'ADMIN' ? (
                      <Shield className="w-2.5 h-2.5 text-amber-400" />
                    ) : userProfile.role === 'MANAGER' ? (
                      <UserCheck className="w-2.5 h-2.5 text-indigo-600" />
                    ) : (
                      <Eye className="w-2.5 h-2.5 text-slate-500" />
                    )}
                    <span>
                      {userProfile.role === 'ADMIN'
                        ? 'Admin'
                        : userProfile.role === 'MANAGER'
                        ? 'Gestionnaire'
                        : 'Lecteur'}
                    </span>
                  </div>
                )}

                <div
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold overflow-hidden border border-slate-200 shadow-xs shrink-0"
                  title={currentUser.email || 'Utilisateur'}
                >
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    (currentUser.displayName || currentUser.email || 'U')
                      .charAt(0)
                      .toUpperCase()
                  )}
                </div>

                <span className="text-xs font-semibold text-slate-700 hidden xl:inline max-w-[120px] truncate">
                  {currentUser.displayName || currentUser.email?.split('@')[0]}
                </span>

                <button
                  id="logout-btn"
                  onClick={handleLogout}
                  type="button"
                  className="p-1 sm:p-1.5 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Déconnexion"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

