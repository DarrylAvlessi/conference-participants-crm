import { useState, useRef, type FormEvent, type DragEvent, type ChangeEvent } from 'react';
import {
  X,
  Calendar,
  Clock,
  Sparkles,
  UploadCloud,
  ImageIcon,
  Trash2,
  ExternalLink,
  Check,
} from 'lucide-react';
import { createConferenceEvent } from '../firebase/service';
import { compressAndResizeImage, POSTER_PRESETS } from '../utils/imageHelpers';

interface NewEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEventCreated: (newEventId: string) => void;
}

export function NewEventModal({
  isOpen,
  onClose,
  onEventCreated,
}: NewEventModalProps) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('14:00');
  const [endTime, setEndTime] = useState('16:30');
  const [description, setDescription] = useState('');
  const [posterUrl, setPosterUrl] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileProcess = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setImageError('Veuillez sélectionner un fichier image valide (JPG, PNG, WebP).');
      return;
    }

    setIsProcessingImage(true);
    setImageError(null);
    try {
      const compressedDataUrl = await compressAndResizeImage(file, 1000, 1000, 0.82);
      setPosterUrl(compressedDataUrl);
      setUrlInput('');
    } catch (err: any) {
      console.error('Error processing image:', err);
      setImageError(err?.message || 'Erreur lors du traitement de l\'affiche.');
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFileProcess(files[0]);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileProcess(files[0]);
    }
  };

  const handleApplyUrl = () => {
    if (!urlInput.trim()) return;
    setPosterUrl(urlInput.trim());
    setImageError(null);
  };

  const handleSelectPreset = (presetUrl: string) => {
    setPosterUrl(presetUrl);
    setUrlInput(presetUrl);
    setImageError(null);
  };

  const handleRemovePoster = () => {
    setPosterUrl('');
    setUrlInput('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) {
      alert('Veuillez renseigner au minimum le titre et la date de la conférence.');
      return;
    }

    setIsSubmitting(true);
    try {
      const newId = await createConferenceEvent({
        title: title.trim(),
        date,
        startTime,
        endTime,
        description: description.trim(),
        imageUrl: posterUrl.trim() || undefined,
      });
      setTitle('');
      setDate('');
      setDescription('');
      setPosterUrl('');
      setUrlInput('');
      onEventCreated(newId);
      onClose();
    } catch (error: any) {
      console.error('Error creating event:', error);
      alert('Erreur lors de la création de la conférence: ' + (error?.message || error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePreFillSample = () => {
    setTitle('Excellence et Stratégie de Carrière 2026');
    setDate('2026-10-24');
    setStartTime('15:00');
    setEndTime('17:30');
    setDescription('Conférence interactive pour étudiants et jeunes diplômés.');
    setPosterUrl(POSTER_PRESETS[0].url);
  };

  return (
    <div
      id="new-event-modal-backdrop"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        id="new-event-modal-content"
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-600 border border-slate-200 flex items-center justify-center shadow-xs">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Nouvelle Conférence
              </h2>
              <p className="text-xs text-slate-500">
                Ajouter un événement et joindre l'affiche officielle
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Titre de la conférence *
              </label>
              <button
                type="button"
                onClick={handlePreFillSample}
                className="text-xs text-slate-600 hover:text-slate-700 font-semibold flex items-center space-x-1 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Remplir exemple</span>
              </button>
            </div>
            <input
              id="new-event-title-input"
              type="text"
              required
              placeholder="Ex: Pour réussir, il te faut un but"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Date *
              </label>
              <input
                id="new-event-date-input"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Heure de début
              </label>
              <input
                id="new-event-starttime-input"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Heure de fin
              </label>
              <input
                id="new-event-endtime-input"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Description ou objectifs (optionnel)
            </label>
            <textarea
              id="new-event-description-input"
              rows={2}
              placeholder="Objectif de la session, intervenants ou public visé..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 resize-none"
            />
          </div>

          {/* Section Affiche de la conférence */}
          <div className="pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                <ImageIcon className="w-4 h-4 text-slate-500" />
                <span>Affiche de la conférence (optionnel)</span>
              </label>
              <span className="text-[11px] text-slate-500">
                Vous pourrez également la modifier plus tard
              </span>
            </div>

            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="flex flex-col sm:flex-row items-start gap-4">
                {posterUrl ? (
                  <div className="relative group shrink-0 w-28 h-36 rounded-xl overflow-hidden border border-slate-300 bg-white shadow-xs">
                    <img
                      src={posterUrl}
                      alt="Aperçu affiche"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <button
                      type="button"
                      onClick={handleRemovePoster}
                      className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-lg opacity-90 hover:opacity-100 transition-opacity cursor-pointer"
                      title="Supprimer l'affiche"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="shrink-0 w-28 h-36 rounded-xl border border-dashed border-slate-300 bg-white flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                    <ImageIcon className="w-6 h-6 mb-1 text-slate-300" />
                    <span className="text-[10px] text-slate-500">Affiche générée par défaut</span>
                  </div>
                )}

                <div className="flex-1 min-w-0 space-y-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Importer un fichier</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowUrlInput(!showUrlInput)}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                      <span>Lien URL</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowPresets(!showPresets)}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Modèles d'affiches</span>
                    </button>
                  </div>

                  {/* Drag and Drop Zone */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-3 text-center transition-colors cursor-pointer ${
                      isDragging
                        ? 'border-slate-400 bg-slate-50/50'
                        : 'border-slate-300 hover:border-slate-400 bg-white'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <div className="flex items-center justify-center space-x-2 text-xs text-slate-600">
                      <UploadCloud className="w-4 h-4 text-slate-500" />
                      <span>
                        {isProcessingImage
                          ? 'Optimisation...'
                          : 'Glissez l\'affiche ici ou cliquez pour parcourir'}
                      </span>
                    </div>
                  </div>

                  {imageError && (
                    <p className="text-xs text-red-600 font-medium">{imageError}</p>
                  )}
                </div>
              </div>

              {/* URL Input Bar */}
              {showUrlInput && (
                <div className="pt-2 flex items-center space-x-2">
                  <input
                    type="url"
                    placeholder="https://example.com/affiche.jpg"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                  />
                  <button
                    type="button"
                    onClick={handleApplyUrl}
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Appliquer
                  </button>
                </div>
              )}

              {/* Presets Gallery */}
              {showPresets && (
                <div className="pt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {POSTER_PRESETS.map((preset) => {
                    const isChosen = posterUrl === preset.url;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectPreset(preset.url)}
                        className={`rounded-lg overflow-hidden border text-left p-1 cursor-pointer transition-all ${
                          isChosen
                            ? 'border-slate-400 bg-slate-50 ring-1 ring-slate-900/10'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="w-full h-14 rounded overflow-hidden relative mb-1">
                          <img
                            src={preset.url}
                            alt={preset.name}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          {isChosen && (
                            <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center text-white">
                              <Check className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                        <p className="text-[10px] font-bold text-slate-800 truncate px-1">
                          {preset.name}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              id="submit-create-event-btn"
              type="submit"
              disabled={isSubmitting || isProcessingImage}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
            >
              {isSubmitting ? 'Création...' : 'Créer la conférence'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
