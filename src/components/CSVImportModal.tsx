import { useState, useRef, type ChangeEvent, type DragEvent } from 'react';
import Papa from 'papaparse';
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Layers,
  Database,
  RefreshCw,
} from 'lucide-react';
import { autoDetectColumns, SAMPLE_GOOGLE_FORMS_CSV } from '../utils/csvHelpers';
import { batchImportCSVRows, type ImportResult } from '../firebase/service';

interface CSVImportModalProps {
  eventId: string;
  eventTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

type Step = 'upload' | 'mapping' | 'preview' | 'importing' | 'summary';

export function CSVImportModal({
  eventId,
  eventTitle,
  isOpen,
  onClose,
  onImportComplete,
}: CSVImportModalProps) {
  const [step, setStep] = useState<Step>('upload');
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<Record<string, any>[]>([]);
  const [fileName, setFileName] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // Column mapping
  const [emailField, setEmailField] = useState('');
  const [firstNameField, setFirstNameField] = useState('');
  const [lastNameField, setLastNameField] = useState('');

  // Execution state
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleReset = () => {
    setStep('upload');
    setRawHeaders([]);
    setParsedRows([]);
    setFileName('');
    setEmailField('');
    setFirstNameField('');
    setLastNameField('');
    setProgress({ current: 0, total: 0 });
    setImportResult(null);
    setIsImporting(false);
  };

  const processCSVText = (csvText: string, name: string) => {
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (results) => {
        if (results.data && results.data.length > 0) {
          const fields = results.meta.fields || [];
          setRawHeaders(fields);
          setParsedRows(results.data as Record<string, any>[]);
          setFileName(name);

          // Auto-detect columns
          const detected = autoDetectColumns(fields);
          setEmailField(detected.emailField);
          setFirstNameField(detected.firstNameField);
          setLastNameField(detected.lastNameField);

          setStep('mapping');
        } else {
          alert('Le fichier CSV ne contient aucune donnée valide.');
        }
      },
      error: (err) => {
        console.error('CSV parse error:', err);
        alert('Erreur lors de la lecture du fichier CSV: ' + err.message);
      },
    });
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      processCSVText(content, file.name);
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      processCSVText(content, file.name);
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleLoadSampleCSV = () => {
    processCSVText(SAMPLE_GOOGLE_FORMS_CSV, 'reponses_google_forms_demo.csv');
  };

  // Dynamic answers that will be captured
  const unmappedColumns = rawHeaders.filter(
    (h) => h !== emailField && h !== firstNameField && h !== lastNameField
  );

  const handleExecuteImport = async () => {
    if (!emailField || !firstNameField || !lastNameField) {
      alert('Veuillez sélectionner les colonnes pour Email, Prénom et Nom.');
      return;
    }

    setStep('importing');
    setIsImporting(true);
    setProgress({ current: 0, total: parsedRows.length });

    try {
      const res = await batchImportCSVRows(
        eventId,
        parsedRows,
        { emailField, firstNameField, lastNameField },
        (current, total) => {
          setProgress({ current, total });
        }
      );
      setImportResult(res);
      setStep('summary');
      onImportComplete();
    } catch (err: any) {
      console.error('Import execution error:', err);
      alert('Erreur lors de l’importation dans Firestore: ' + (err?.message || err));
      setStep('preview');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div
      id="csv-import-modal-backdrop"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div
        id="csv-import-modal-content"
        className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
              {/* Modal Header */}
        <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center shadow-xs">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Importation Google Forms / CSV
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Conférence cible : <span className="font-bold text-teal-800">{eventTitle}</span>
            </p>
          </div>

          <button
            onClick={() => {
              handleReset();
              onClose();
            }}
            type="button"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex-1 overflow-y-auto">
          {/* STEP 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-teal-500 bg-teal-50/50'
                    : 'border-slate-300 hover:border-teal-400 bg-slate-50/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv, .tsv, .txt"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <div className="w-12 h-12 mx-auto rounded-full bg-white border border-slate-200 flex items-center justify-center text-teal-700 mb-3 shadow-xs">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">
                  Déposez votre fichier CSV Google Forms ici
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  ou cliquez pour parcourir vos fichiers (.csv ou export Google Sheets)
                </p>
              </div>

              {/* Sample Google Forms template quick button */}
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2">
                <span className="text-xs text-slate-500">
                  Vous n'avez pas de fichier sous la main ?
                </span>
                <button
                  id="use-sample-csv-btn"
                  type="button"
                  onClick={handleLoadSampleCSV}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 hover:bg-teal-100 transition-colors shadow-xs cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                  <span>Tester avec un export Google Forms exemple</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Mapping */}
          {step === 'mapping' && (
            <div className="space-y-5">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900">{fileName}</span>
                  <span className="ml-2 text-slate-500">
                    ({parsedRows.length} lignes détectées, {rawHeaders.length} colonnes)
                  </span>
                </div>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-700 text-white shadow-xs">
                  Format valide
                </span>
              </div>

              {/* 3 Required Fields Mapping */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center space-x-1.5">
                  <Database className="w-3.5 h-3.5 text-teal-600" />
                  <span>1. Mapping des 3 champs d'identité obligatoires</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Le système utilise l'adresse e-mail en minuscules pour dédupliquer automatiquement
                  les profils de participants d'une conférence à l'autre.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  {/* Email */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Email (Identifiant unique) *
                    </label>
                    <select
                      id="map-email-select"
                      value={emailField}
                      onChange={(e) => setEmailField(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                    >
                      <option value="">Sélectionner la colonne</option>
                      {rawHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* First Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Prénom *
                    </label>
                    <select
                      id="map-firstname-select"
                      value={firstNameField}
                      onChange={(e) => setFirstNameField(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                    >
                      <option value="">Sélectionner la colonne</option>
                      {rawHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Last Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nom de famille *
                    </label>
                    <select
                      id="map-lastname-select"
                      value={lastNameField}
                      onChange={(e) => setLastNameField(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                    >
                      <option value="">Sélectionner la colonne</option>
                      {rawHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Dynamic Answers Preview */}
              <div className="space-y-2 pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center space-x-1.5">
                    <Layers className="w-3.5 h-3.5 text-teal-600" />
                    <span>2. Questions dynamiques stockées dans answers ({unmappedColumns.length})</span>
                  </h3>
                </div>
                <p className="text-xs text-slate-500">
                  Toutes les autres colonnes de ce formulaire seront automatiquement préservées et
                  visibles dans le volet de détail du participant (WhatsApp, école, attentes, etc.).
                </p>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {unmappedColumns.map((col) => (
                    <span
                      key={col}
                      className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200"
                    >
                      {col}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Preview */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Aperçu des 3 premières lignes de votre fichier :</span>
                <span className="font-bold text-slate-800">Total : {parsedRows.length} lignes</span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-64">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-700 sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="p-3 font-semibold">Email</th>
                      <th className="p-3 font-semibold">Prénom & Nom</th>
                      <th className="p-3 font-semibold">Champs dynamiques</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedRows.slice(0, 3).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60">
                        <td className="p-3 font-mono text-slate-900">
                          {row[emailField]?.toLowerCase() || <span className="text-red-400">Vide</span>}
                        </td>
                        <td className="p-3 font-medium text-slate-800">
                          {row[firstNameField]} {row[lastNameField]}
                        </td>
                        <td className="p-3 text-slate-500 text-xs">
                          {unmappedColumns.slice(0, 3).map((c) => (
                            <div key={c} className="truncate max-w-xs">
                              <span className="font-semibold text-slate-600">{c}:</span> {row[c]}
                            </div>
                          ))}
                          {unmappedColumns.length > 3 && (
                            <span className="text-teal-700 font-medium">
                              + {unmappedColumns.length - 3} autres questions
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-teal-50 rounded-xl p-3.5 border border-teal-200 text-xs text-teal-900 flex items-start space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Déduplication prête :</span> Les participants existants
                  dans Firestore conserveront leur historique de suivi. Les nouvelles inscriptions seront
                  liées à cette conférence avec leurs réponses spécifiques.
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Importing */}
          {step === 'importing' && (
            <div className="py-12 text-center space-y-4">
              <RefreshCw className="w-10 h-10 mx-auto text-teal-600 animate-spin" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Importation et déduplication en cours...
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Traitement de la ligne {progress.current} sur {progress.total}
                </p>
              </div>

              {/* Progress bar */}
              <div className="w-full max-w-md mx-auto bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-teal-600 h-2.5 rounded-full transition-all duration-150"
                  style={{
                    width: `${
                      progress.total > 0
                        ? Math.round((progress.current / progress.total) * 100)
                        : 0
                    }%`,
                  }}
                ></div>
              </div>
            </div>
          )}

          {/* STEP 5: Summary */}
          {step === 'summary' && importResult && (
            <div className="space-y-4">
              <div className="p-5 bg-teal-50 border border-teal-200 rounded-2xl text-center">
                <CheckCircle2 className="w-10 h-10 mx-auto text-teal-700 mb-2" />
                <h3 className="text-sm font-bold text-teal-950">
                  Importation terminée avec succès !
                </h3>
                <p className="text-xs text-teal-800 mt-0.5">
                  Les participants et leurs réponses dynamiques ont été enregistrés dans Firestore.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-white border border-slate-200 rounded-xl text-center shadow-xs">
                  <div className="text-xl font-bold text-slate-900">
                    {importResult.newRegistrations}
                  </div>
                  <div className="text-[11px] font-medium text-slate-500">Inscriptions ajoutées</div>
                </div>

                <div className="p-3.5 bg-white border border-slate-200 rounded-xl text-center shadow-xs">
                  <div className="text-xl font-bold text-teal-700">
                    {importResult.newParticipants}
                  </div>
                  <div className="text-[11px] font-medium text-slate-500">Nouveaux profils</div>
                </div>

                <div className="p-3.5 bg-white border border-slate-200 rounded-xl text-center shadow-xs">
                  <div className="text-xl font-bold text-slate-700">
                    {importResult.updatedParticipants}
                  </div>
                  <div className="text-[11px] font-medium text-slate-500">Profils dédupliqués</div>
                </div>

                <div className="p-3.5 bg-white border border-slate-200 rounded-xl text-center shadow-xs">
                  <div className="text-xl font-bold text-slate-400">
                    {importResult.skippedInvalidEmail}
                  </div>
                  <div className="text-[11px] font-medium text-slate-500">Ignorés (sans email)</div>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                  <span className="font-bold">{importResult.errors.length} avertissements :</span>
                  <ul className="list-disc list-inside mt-1 space-y-0.5">
                    {importResult.errors.slice(0, 3).map((e, idx) => (
                      <li key={idx}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          {step === 'upload' && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <div></div>
            </>
          )}

          {step === 'mapping' && (
            <>
              <button
                type="button"
                onClick={() => setStep('upload')}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Changer de fichier</span>
              </button>
              <button
                id="preview-import-btn"
                type="button"
                onClick={() => {
                  if (!emailField || !firstNameField || !lastNameField) {
                    alert('Veuillez mapper les 3 champs obligatoires (Email, Prénom, Nom).');
                    return;
                  }
                  setStep('preview');
                }}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-colors shadow-xs cursor-pointer"
              >
                <span>Aperçu des données</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {step === 'preview' && (
            <>
              <button
                type="button"
                onClick={() => setStep('mapping')}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Modifier le mapping</span>
              </button>
              <button
                id="execute-import-btn"
                type="button"
                onClick={handleExecuteImport}
                disabled={isImporting}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-colors shadow-xs cursor-pointer"
              >
                <Database className="w-3.5 h-3.5" />
                <span>Lancer l'importation ({parsedRows.length} lignes)</span>
              </button>
            </>
          )}

          {step === 'summary' && (
            <div className="w-full flex justify-end">
              <button
                id="finish-import-btn"
                type="button"
                onClick={() => {
                  handleReset();
                  onClose();
                }}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-colors shadow-xs cursor-pointer"
              >
                Fermer et afficher les participants
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
