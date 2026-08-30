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
} from 'lucide-react';
import { auth, loginWithGoogle, logout, testConnection } from '../firebase/config';
import { seedDemoData } from '../firebase/service';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { SAMPLE_GOOGLE_FORMS_CSV } from '../utils/csvHelpers';

interface NavbarProps {
  onRefreshNeeded?: () => void;
}

export function Navbar({ onRefreshNeeded }: NavbarProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isDbOnline, setIsDbOnline] = useState<boolean | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    // Auth state observer
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });

    // Test Firestore connection on boot
    testConnection().then((connected) => {
      setIsDbOnline(connected);
    });

    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error('Login error:', err);
      // Popup may be closed by user or blocked in preview
      if (err?.code !== 'auth/popup-closed-by-user') {
        alert("Connexion Google : assurez-vous d'autoriser les fenêtres pop-up.");
      }
    }
  };

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
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand identity */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-xs">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-slate-900 tracking-tight text-base sm:text-lg">
                  ConfTrack CRM
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                  Excellence Académique
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Gestion des conférences & Ingestion Google Forms
              </p>
            </div>
          </div>

          {/* Actions & User State */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Database status indicator */}
            <div
              id="firestore-status-badge"
              className="hidden md:flex items-center space-x-1.5 px-3 py-1 rounded-xl text-xs font-medium bg-slate-50 text-slate-700 border border-slate-200"
              title="Statut de la base Firestore"
            >
              <Database className="w-3.5 h-3.5 text-teal-600" />
              <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
              <span>Firestore connecté</span>
            </div>

            {/* Download sample CSV button */}
            <button
              id="download-sample-csv-btn"
              onClick={handleDownloadSampleCSV}
              type="button"
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-xs"
              title="Télécharger un modèle CSV Google Forms prêt à tester"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Exemple CSV</span>
            </button>

            {/* Seed demo data button */}
            <button
              id="seed-demo-data-btn"
              onClick={handleSeedDemo}
              disabled={isSeeding}
              type="button"
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 hover:bg-teal-100 hover:border-teal-300 transition-colors shadow-xs"
              title="Injecter des conférences et participants de test"
            >
              {isSeeding ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-600" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              )}
              <span>{isSeeding ? 'Chargement...' : 'Démo'}</span>
            </button>

            {/* Auth control */}
            {!authLoading && (
              <>
                {currentUser ? (
                  <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
                    <div
                      className="w-8 h-8 rounded-full bg-teal-700 text-white flex items-center justify-center text-xs font-bold overflow-hidden border border-slate-200 shadow-xs"
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
                    <span className="text-xs font-semibold text-slate-700 hidden lg:inline max-w-[120px] truncate">
                      {currentUser.displayName || currentUser.email?.split('@')[0]}
                    </span>
                    <button
                      id="logout-btn"
                      onClick={handleLogout}
                      type="button"
                      className="p-1.5 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      title="Déconnexion"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    id="login-google-btn"
                    onClick={handleGoogleLogin}
                    type="button"
                    className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-colors shadow-xs"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Connexion</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
