import { useState, useEffect, useRef, type FormEvent, type DragEvent, type ChangeEvent } from 'react';
import {
  X,
  Calendar,
  Clock,
  UploadCloud,
  ImageIcon,
  Trash2,
  ExternalLink,
  Sparkles,
  Check,
  ZoomIn,
} from 'lucide-react';
import { type ConferenceEvent } from '../types';
import { updateConferenceEvent } from '../firebase/service';
import {
  compressAndResizeImage,
  POSTER_PRESETS,
  getConferenceImage,
} from '../utils/imageHelpers';

interface EditEventModalProps {
  event: ConferenceEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onEventUpdated?: (eventId: string) => void;
}

export function EditEventModal({
  event,
  isOpen,
  onClose,
  onEventUpdated,
}: EditEventModalProps) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [description, setDescription] = useState('');
  const [posterUrl, setPosterUrl] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [zoomPoster, setZoomPoster] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize fields when modal opens or event changes
  useEffect(() => {
    if (event) {
      setTitle(event.title || '');
      setDate(event.date || '');
      setStartTime(event.startTime || '14:00');
      setEndTime(event.endTime || '16:30');
      setDescription(event.description || '');
      setPosterUrl(event.imageUrl || '');
      setUrlInput(event.imageUrl && event.imageUrl.startsWith('http') ? event.imageUrl : '');
      setShowUrlInput(false);
      setShowPresets(false);
      setImageError(null);
      setZoomPoster(null);
    }
  }, [event, isOpen]);

  if (!isOpen || !event) return null;

  const handleFileProcess = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setImageError('Veuillez sélectionner un fichier image valide (JPG, PNG, WebP).');
      return;
    }

    setIsProcessingImage(true);
    setImageError(null);
    try {
      // Compress client-side so it stays ultra-lightweight (<150KB) and saves directly to Firestore
      const compressedDataUrl = await compressAndResizeImage(file, 1000, 1000, 0.82);
      setPosterUrl(compressedDataUrl);
      setUrlInput('');
    } catch (err: any) {
      console.error('Error compressing image:', err);
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
      await updateConferenceEvent(event.id, {
        title: title.trim(),
        date,
        startTime,
        endTime,
        description: description.trim(),
        imageUrl: posterUrl.trim(),
      });

      if (onEventUpdated) {
        onEventUpdated(event.id);
      }
      onClose();
    } catch (error: any) {
      console.error('Error updating conference event:', error);
      alert('Erreur lors de la modification de la conférence: ' + (error?.message || error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeDisplayImage = posterUrl || getConferenceImage(event.id, title);

  return (
    <>
      <div
        id="edit-event-modal-backdrop"
        className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
        onClick={onClose}
      >
        <div
          id="edit-event-modal-content"
          className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92dvh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-600 border border-slate-200 flex items-center justify-center shadow-xs">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Modifier la conférence
                </h2>
                <p className="text-xs text-slate-500">
                  Mettre à jour les informations, horaires et l'affiche officielle
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

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 flex-1">
            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Titre de la conférence *
              </label>
              <input
                id="edit-event-title-input"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Pour réussir, il te faut un but"
                className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
              />
            </div>

            {/* Date & Time slots */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Date de l'événement *
                </label>
                <input
                  id="edit-event-date-input"
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
                  id="edit-event-starttime-input"
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
                  id="edit-event-endtime-input"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Description ou objectifs de la session (optionnel)
              </label>
              <textarea
                id="edit-event-description-input"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Précisez le thème, les intervenants ou le public ciblé..."
                className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 resize-none"
              />
            </div>

            {/* SECTION: Affiche de la conférence (Conference Poster / Flyer) */}
            <div className="pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                  <ImageIcon className="w-4 h-4 text-slate-500" />
                  <span>Affiche de la conférence (Flyer officiel)</span>
                </label>
                <span className="text-[11px] text-slate-500">
                  Visible sur le tableau de bord et la liste des conférences
                </span>
              </div>

              {/* Poster Preview Card */}
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-4">
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  {/* Poster Thumbnail Image */}
                  <div className="relative group shrink-0 w-32 h-40 sm:w-36 sm:h-48 rounded-xl overflow-hidden border border-slate-300/80 bg-white shadow-sm flex items-center justify-center">
                    <img
                      src={activeDisplayImage}
                      alt="Affiche de la conférence"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />

                    {/* Badge */}
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-900/80 text-white backdrop-blur-xs">
                      {posterUrl ? 'Affiche personnalisée' : 'Affiche par défaut'}
                    </div>

                    {/* Hover Zoom Overlay */}
                    <button
                      type="button"
                      onClick={() => setZoomPoster(activeDisplayImage)}
                      className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer"
                      title="Agrandir l'affiche"
                    >
                      <ZoomIn className="w-6 h-6" />
                    </button>
                  </div>

                  {/* Poster Management Controls */}
                  <div className="flex-1 min-w-0 space-y-3">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">
                        {posterUrl ? 'Affiche attachée' : 'Aucune affiche spécifique téléversée'}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                        {posterUrl
                          ? 'Une affiche personnalisée est associée à cette conférence. Vous pouvez la remplacer à tout moment ou restaurer le visuel par défaut.'
                          : 'Vous pouvez joindre le visuel officiel en important un fichier image depuis votre appareil ou en choisissant un modèle ci-dessous.'}
                      </p>
                    </div>

                    {/* Quick action buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
                      >
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>Importer une image</span>
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

                      {posterUrl && (
                        <button
                          type="button"
                          onClick={handleRemovePoster}
                          className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer ml-auto"
                          title="Supprimer l'affiche personnalisée"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Supprimer</span>
                        </button>
                      )}
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
                            ? 'Optimisation de l\'affiche...'
                            : 'Glissez l\'affiche ici ou cliquez pour parcourir vos fichiers'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        PNG, JPG, JPEG ou WebP (optimisé automatiquement pour un affichage rapide)
                      </p>
                    </div>

                    {imageError && (
                      <p className="text-xs text-red-600 font-medium bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg">
                        {imageError}
                      </p>
                    )}
                  </div>
                </div>

                {/* Direct URL Input Bar */}
                {showUrlInput && (
                  <div className="pt-3 border-t border-slate-200/80 flex items-center space-x-2">
                    <input
                      type="url"
                      placeholder="https://example.com/affiche-conference.jpg"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      className="flex-1 px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                    />
                    <button
                      type="button"
                      onClick={handleApplyUrl}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Appliquer
                    </button>
                  </div>
                )}

                {/* Curated Poster Presets Gallery */}
                {showPresets && (
                  <div className="pt-3 border-t border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700">
                        Sélectionnez un modèle d'affiche de conférence :
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Cliquez sur un modèle pour l'appliquer
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {POSTER_PRESETS.map((preset) => {
                        const isChosen = posterUrl === preset.url;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => handleSelectPreset(preset.url)}
                            className={`relative rounded-xl overflow-hidden border text-left transition-all p-1.5 group cursor-pointer ${
                              isChosen
                                ? 'border-slate-400 bg-slate-50 ring-2 ring-slate-900/10'
                                : 'border-slate-200 bg-white hover:border-slate-300'
                            }`}
                          >
                            <div className="w-full h-20 rounded-lg overflow-hidden relative mb-1.5">
                              <img
                                src={preset.url}
                                alt={preset.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                referrerPolicy="no-referrer"
                              />
                              {isChosen && (
                                <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center text-white">
                                  <Check className="w-5 h-5" />
                                </div>
                              )}
                            </div>
                            <div className="px-0.5">
                              <p className="text-[11px] font-bold text-slate-800 truncate">
                                {preset.name}
                              </p>
                              <span className="text-[10px] text-slate-400">
                                {preset.category}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                id="submit-edit-event-btn"
                type="submit"
                disabled={isSubmitting || isProcessingImage}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
              >
                {isSubmitting ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Lightbox zoom modal */}
      {zoomPoster && (
        <div
          className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
          onClick={() => setZoomPoster(null)}
        >
          <div className="relative max-w-2xl max-h-[88dvh] overflow-hidden rounded-2xl border border-white/20 shadow-2xl bg-black">
            <button
              onClick={() => setZoomPoster(null)}
              type="button"
              className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={zoomPoster}
              alt="Aperçu grand format"
              className="max-h-[82dvh] w-auto object-contain mx-auto"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      )}
    </>
  );
}
