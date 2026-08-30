import { useState } from 'react';
import {
  Calendar,
  Clock,
  Users,
  Plus,
  Search,
  ChevronRight,
  Trash2,
  Pencil,
} from 'lucide-react';
import { type ConferenceEvent } from '../types';
import { getConferenceImage } from '../utils/imageHelpers';

interface MasterPanelProps {
  events: ConferenceEvent[];
  selectedEventId: string | null;
  onSelectEvent: (eventId: string) => void;
  onOpenNewEventModal: () => void;
  onDeleteEvent?: (eventId: string) => void;
  onEditEvent?: (event: ConferenceEvent) => void;
  isLoading: boolean;
}

export function MasterPanel({
  events,
  selectedEventId,
  onSelectEvent,
  onOpenNewEventModal,
  onDeleteEvent,
  onEditEvent,
  isLoading,
}: MasterPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEvents = events.filter((ev) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      ev.title.toLowerCase().includes(q) ||
      (ev.date && ev.date.includes(q)) ||
      (ev.description && ev.description.toLowerCase().includes(q))
    );
  });

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Date à définir';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return new Intl.DateTimeFormat('fr-FR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  return (
    <aside
      id="conferences-master-panel"
      aria-label="Liste des conférences"
      className="w-full lg:w-96 flex-shrink-0 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col h-[calc(100vh-5.5rem)] overflow-hidden"
    >
      {/* Panel Header */}
      <div className="p-4 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-bold text-slate-900">Conférences</h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-900 text-white">
              {events.length}
            </span>
          </div>
          <button
            id="create-new-conference-btn"
            onClick={onOpenNewEventModal}
            type="button"
            className="btn-primary inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Créer</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="search-conferences-input"
            type="text"
            placeholder="Rechercher une conférence..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Conference List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-slate-50/50">
        {isLoading && events.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <div className="w-8 h-8 mx-auto mb-2 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
            <p className="text-xs font-medium">Chargement des conférences...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="py-12 px-4 text-center bg-white rounded-xl border border-slate-200 my-4">
            <Calendar className="w-10 h-10 mx-auto text-slate-300 mb-2 stroke-[1.5]" />
            <h3 className="text-sm font-semibold text-slate-700">Aucune conférence</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              {searchQuery
                ? 'Aucune conférence ne correspond à votre recherche.'
                : 'Créez votre première conférence ou chargez les données de démo.'}
            </p>
              <button
                onClick={onOpenNewEventModal}
                type="button"
                className="btn-secondary inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
              >
              <Plus className="w-3.5 h-3.5" />
              <span>Créer une conférence</span>
            </button>
          </div>
        ) : (
          filteredEvents.map((event) => {
            const isSelected = event.id === selectedEventId;

            return (
              <div
                key={event.id}
                id={`conference-card-${event.id}`}
                onClick={() => onSelectEvent(event.id)}
                className={`relative group transition-colors cursor-pointer text-left px-3.5 py-3 ${
                  isSelected
                    ? 'border-l-4 border-slate-900 bg-slate-50/80'
                    : 'border-l-4 border-transparent hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start space-x-3">
                  {/* Square thumbnail image */}
                  <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-slate-200/80 bg-slate-100 relative shadow-2xs">
                    <img
                      src={getConferenceImage(event.id, event.title, event.imageUrl)}
                      alt={event.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 flex items-center justify-center -z-10 bg-slate-100 text-slate-500">
                      <Calendar className="w-5 h-5 text-slate-400" />
                    </div>
                    {event.imageUrl && (
                      <div className="absolute bottom-0 inset-x-0 bg-slate-900/80 text-[8px] font-bold text-white text-center py-0.2">
                        Affiche
                      </div>
                    )}
                  </div>

                  {/* Conference title & count */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1.5 mb-1">
                      <h3 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">
                        {event.title}
                      </h3>

                      {/* Registrants Count Badge */}
                      <div
                        className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ${
                          isSelected
                            ? 'bg-slate-900 text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                        title="Nombre total de participants inscrits"
                      >
                        <Users className="w-3 h-3" />
                        <span>{event.registrantsCount}</span>
                      </div>
                    </div>

                    {/* Metadata: Date & Time Slot — small mono date badge */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <span className="inline-flex items-center space-x-1 bg-slate-100 border border-slate-200/60 rounded-md px-1.5 py-0.5 text-xs font-mono text-slate-600">
                        <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="capitalize">{formatDate(event.date)}</span>
                      </span>

                      {(event.startTime || event.endTime) && (
                        <span className="inline-flex items-center space-x-1 text-xs font-mono text-slate-500">
                          <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>
                            {event.startTime || '14:00'} - {event.endTime || '16:00'}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom row: active state status or prompt + quick edit & delete */}
                <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                  <span
                    className={`text-[11px] font-medium flex items-center space-x-1.5 ${
                      isSelected
                        ? 'text-slate-900 font-semibold'
                        : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-900 animate-pulse"></span>
                        <span>Conférence active</span>
                      </>
                    ) : (
                      'Cliquer pour ouvrir le suivi'
                    )}
                  </span>

                  <div className="flex items-center space-x-1">
                    {onEditEvent && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditEvent(event);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                        title="Modifier la conférence"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {onDeleteEvent && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (
                            window.confirm(
                              `Supprimer la conférence "${event.title}" et toutes ses inscriptions associées ?`
                            )
                          ) {
                            onDeleteEvent(event.id);
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                        title="Supprimer la conférence"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <ChevronRight
                      className={`w-3.5 h-3.5 transition-transform ${
                        isSelected ? 'text-slate-900 translate-x-0.5' : 'text-slate-400'
                      }`}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
