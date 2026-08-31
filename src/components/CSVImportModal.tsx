import { useState, useRef, type ChangeEvent, type DragEvent } from 'react';
import Papa from 'papaparse';
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  ArrowLeft,
  Sparkles,
  Database,
  RefreshCw,
} from 'lucide-react';
import { SAMPLE_GOOGLE_FORMS_CSV, xlsxToRows } from '../utils/csvHelpers';
import { batchImportCSVRows, type ImportResult } from '../firebase/service';

interface CSVImportModalProps {
  eventId: string;
  eventTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

type Step = 'upload' | 'preview' | 'importing' | 'summary';

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

  const isExcelFile = (name: string) =>
    /\.(xlsx|xls)$/i.test(name);

  const switchToPreview = (headers: string[], rows: Record<string, any>[], name: string) => {
    setRawHeaders(headers);
    setParsedRows(rows);
    setFileName(name);
    setEmailField('');
    setFirstNameField('');
    setLastNameField('');

    setStep('preview');
  };

  const processFile = async (file: File) => {
    try {
      if (isExcelFile(file.name)) {
        const { headers, rows } = await xlsxToRows(file);
        if (!rows || rows.length === 0) {
          alert('Le fichier Excel ne contient aucune donnée valide.');
          return;
        }
        switchToPreview(headers, rows, file.name);
      } else {
        const csvText = await file.text();
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (h) => h.trim(),
          complete: (results) => {
            if (results.data && results.data.length > 0) {
              const fields = results.meta.fields || [];
              switchToPreview(fields, results.data as Record<string, any>[], file.name);
            } else {
              alert('Le fichier CSV ne contient aucune donnée valide.');
            }
          },
          error: (err) => {
            console.error('CSV parse error:', err);
            alert('Erreur lors de la lecture du fichier CSV: ' + err.message);
          },
        });
      }
    } catch (err: any) {
      console.error('File read error:', err);
      alert('Erreur lors de la lecture du fichier: ' + (err?.message || err));
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const handleLoadSampleCSV = async () => {
    const name = 'reponses_google_forms_demo.csv';
    try {
      Papa.parse(SAMPLE_GOOGLE_FORMS_CSV, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim(),
        complete: (results) => {
          const fields = results.meta.fields || [];
          switchToPreview(fields, results.data as Record<string, any>[], name);
        },
      });
    } catch (err: any) {
      console.error('Sample CSV parse error:', err);
      alert('Erreur lors de la lecture du fichier CSV: ' + (err?.message || err));
    }
  };

  // Dynamic answers that will be captured
  const unmappedColumns = rawHeaders.filter(
    (h) => h !== emailField && h !== firstNameField && h !== lastNameField
  );

  const handleExecuteImport = async () => {
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
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
    >
      <div
        id="csv-import-modal-content"
        className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[92dvh] my-auto"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 flex items-center justify-center shadow-xs shrink-0">
                <FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">
                Importation Google Forms / Excel
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1 truncate">
              Conférence : <span className="font-bold text-slate-700">{eventTitle}</span>
            </p>
          </div>

          <button
            onClick={() => {
              handleReset();
              onClose();
            }}
            type="button"
            className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
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
                    ? 'border-slate-400 bg-slate-50/50'
                    : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv, .tsv, .txt, .xlsx, .xls"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <div className="w-12 h-12 mx-auto rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 mb-3 shadow-xs">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">
                  Déposez votre fichier CSV ou Excel (.xlsx) ici
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  ou cliquez pour parcourir vos fichiers (.csv, .xlsx ou export Google Sheets)
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
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors shadow-xs cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-slate-500" />
                  <span>Tester avec un export Google Forms exemple</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Preview */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900">{fileName}</span>
                  <span className="ml-2 text-slate-500">
                    ({parsedRows.length} lignes, {rawHeaders.length} colonnes)
                  </span>
                </div>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-900 text-white shadow-xs">
                  Prêt à importer
                </span>
              </div>

              {/* Auto-detected identity */}
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="font-semibold text-slate-800">Colonnes importées :</span>
                <span className="italic text-slate-400">
                  toutes les colonnes sont conservées comme questions dynamiques
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                  <span>Aperçu des 3 premières lignes de votre fichier :</span>
                  <span className="font-bold text-slate-800">Total : {parsedRows.length} lignes</span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-64">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-700 sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="p-3 font-semibold">Champs dynamiques</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedRows.slice(0, 3).map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60">
                          <td className="p-3 text-slate-500 text-xs">
                            {unmappedColumns.slice(0, 3).map((c) => (
                              <div key={c} className="truncate max-w-xs">
                                <span className="font-semibold text-slate-600">{c}:</span> {row[c]}
                              </div>
                            ))}
                            {unmappedColumns.length > 3 && (
                              <span className="text-slate-600 font-medium">
                                + {unmappedColumns.length - 3} autres questions
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {unmappedColumns.map((col) => (
                  <span
                    key={col}
                    className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200"
                  >
                    {col}
                  </span>
                ))}
              </div>

              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs text-slate-700 flex items-start space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Importation additive :</span> Chaque ligne sera liée à une
                  nouvelle inscription pour cette conférence avec ses réponses spécifiques. Aucune
                  déduplication n'est effectuée.
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Importing */}
          {step === 'importing' && (
            <div className="py-12 text-center space-y-4">
              <RefreshCw className="w-10 h-10 mx-auto text-slate-500 animate-spin" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Importation en cours...
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Traitement de la ligne {progress.current} sur {progress.total}
                </p>
              </div>

              {/* Progress bar */}
              <div className="w-full max-w-md mx-auto bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-slate-900 h-2.5 rounded-full transition-all duration-150"
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
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl text-center">
                <CheckCircle2 className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                <h3 className="text-sm font-bold text-slate-900">
                  Importation terminée avec succès !
                </h3>
                <p className="text-xs text-slate-700 mt-0.5">
                  Les participants et leurs réponses dynamiques ont été enregistrés dans Firestore.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-white border border-slate-200 rounded-xl text-center shadow-xs">
                  <div className="text-xl font-bold text-slate-900">
                    {importResult.newRegistrations}
                  </div>
                  <div className="text-[11px] font-medium text-slate-500">Inscriptions ajoutées</div>
                </div>

                <div className="p-3.5 bg-white border border-slate-200 rounded-xl text-center shadow-xs">
                  <div className="text-xl font-bold text-slate-600">
                    {importResult.newParticipants}
                  </div>
                  <div className="text-[11px] font-medium text-slate-500">Nouveaux profils</div>
                </div>

                <div className="p-3.5 bg-white border border-slate-200 rounded-xl text-center shadow-xs">
                  <div className="text-xl font-bold text-slate-400">
                    {importResult.skippedEmptyRows}
                  </div>
                  <div className="text-[11px] font-medium text-slate-500">Lignes vides ignorées</div>
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

          {step === 'preview' && (
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
                id="execute-import-btn"
                type="button"
                onClick={handleExecuteImport}
                disabled={isImporting}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
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
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
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
