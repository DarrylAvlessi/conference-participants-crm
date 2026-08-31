import { useState } from 'react';
import { Shield, LogIn, Lock, CheckCircle2, Users, FileSpreadsheet, ArrowRight } from 'lucide-react';
import { loginWithGoogle } from '../firebase/config';

interface LoginScreenProps {
  onLoginSuccess?: () => void;
}

export function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await loginWithGoogle();
      if (onLoginSuccess) onLoginSuccess();
    } catch (err: any) {
      console.error('Login error:', err);
      if (err?.code !== 'auth/popup-closed-by-user') {
        setErrorMessage(
          "Impossible d'ouvrir la fenêtre de connexion Google. Veuillez autoriser les popups dans votre navigateur."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 sm:p-8">
          {/* Header & Logo */}
          <div className="text-center space-y-3 mb-6">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-md">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                ConfTrack CRM
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                Portail de Gestion Sécurisé des Conférences
              </p>
            </div>
          </div>

          {/* Access Policy Notice */}
          <div className="bg-amber-50/80 border border-amber-200/70 rounded-xl p-3.5 mb-6 text-left">
            <div className="flex items-start space-x-2.5">
              <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 leading-relaxed">
                <span className="font-bold">Accès strictement restreint :</span> L'accès aux
                données des conférences et aux listes de participants est protégé. Seuls les
                comptes <span className="font-semibold underline">validés par l'administrateur</span>{' '}
                peuvent consulter la plateforme.
              </div>
            </div>
          </div>

          {/* Error display */}
          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
              {errorMessage}
            </div>
          )}

          {/* Google Sign-in button */}
          <button
            id="google-signin-btn"
            type="button"
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full btn-primary py-3 px-4 rounded-xl text-sm font-semibold flex items-center justify-center space-x-2.5 shadow-sm transition-transform active:scale-[0.99] cursor-pointer"
          >
            {isLoading ? (
              <span className="inline-flex items-center space-x-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <span>Connexion en cours...</span>
              </span>
            ) : (
              <>
                {/* Google standard vector icon */}
                <svg className="w-4 h-4 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>Se connecter avec Google</span>
              </>
            )}
          </button>

          {/* Workflow Steps Explanations */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 text-center">
              Fonctionnement des accès
            </h2>
            <div className="space-y-2.5 text-xs text-slate-600">
              <div className="flex items-start space-x-2.5">
                <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <span className="font-semibold text-slate-800">Authentification Google :</span> Connectez-vous avec votre compte professionnel ou personnel.
                </div>
              </div>

              <div className="flex items-start space-x-2.5">
                <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <span className="font-semibold text-slate-800">Validation Administrateur :</span> Votre profil est automatiquement soumis pour approbation.
                </div>
              </div>

              <div className="flex items-start space-x-2.5">
                <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <span className="font-semibold text-slate-800">Activation du rôle :</span> Une fois approuvé (Lecteur, Gestionnaire ou Admin), vos accès sont déverrouillés en direct.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-slate-500 mt-6">
          ConfTrack CRM &bull; Protection des données &bull; Administration centralisée
        </p>
      </div>
    </div>
  );
}
