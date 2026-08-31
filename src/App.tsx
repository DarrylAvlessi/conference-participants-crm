/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import {
  type ConferenceEvent,
  type ParticipantWithRegistration,
  type FollowupStatus,
  type MentoringStatus,
  type UserProfile,
} from './types';
import {
  subscribeToEvents,
  subscribeToEventParticipants,
  updateFollowupStatus,
  updateFollowupStaff,
  updateMentoringStatus,
  updateRegistrationNotes,
  deleteConferenceEvent,
  deleteParticipantRegistration,
  deleteMultipleParticipantRegistrations,
  clearConferenceData,
  syncUserProfile,
  subscribeToUserProfile,
  subscribeToAllUsers,
} from './firebase/service';
import { auth, onAuthStateChanged, type User } from './firebase/config';
import { Navbar } from './components/Navbar';
import { MasterPanel } from './components/MasterPanel';
import { DetailPanel } from './components/DetailPanel';
import { ParticipantDrawer } from './components/ParticipantDrawer';
import { CSVImportModal } from './components/CSVImportModal';
import { NewEventModal } from './components/NewEventModal';
import { NewParticipantModal } from './components/NewParticipantModal';
import { EditEventModal } from './components/EditEventModal';
import { EditParticipantModal } from './components/EditParticipantModal';
import { LoginScreen } from './components/LoginScreen';
import { PendingApprovalScreen } from './components/PendingApprovalScreen';
import { UserManagementModal } from './components/UserManagementModal';
import { ArrowLeft, Sparkles, Calendar } from 'lucide-react';

export default function App() {
  // Authentication & RBAC states
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [pendingUsersCount, setPendingUsersCount] = useState(0);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);

  // CRM Data states
  const [events, setEvents] = useState<ConferenceEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [participantsWithReg, setParticipantsWithReg] = useState<
    ParticipantWithRegistration[]
  >([]);
  const [isEventsLoading, setIsEventsLoading] = useState(true);
  const [isParticipantsLoading, setIsParticipantsLoading] = useState(false);

  // Modals & Drawer states
  const [selectedParticipantItem, setSelectedParticipantItem] =
    useState<ParticipantWithRegistration | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCSVModalOpen, setIsCSVModalOpen] = useState(false);
  const [isNewEventModalOpen, setIsNewEventModalOpen] = useState(false);
  const [isNewParticipantModalOpen, setIsNewParticipantModalOpen] = useState(false);
  const [isEditEventModalOpen, setIsEditEventModalOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<ConferenceEvent | null>(null);
  const [participantToEdit, setParticipantToEdit] =
    useState<ParticipantWithRegistration | null>(null);
  const [isEditParticipantModalOpen, setIsEditParticipantModalOpen] = useState(false);

  // Mobile layout state: show list or detail
  const [mobileView, setMobileView] = useState<'master' | 'detail'>('master');

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setCurrentUser(firebaseUser);
      if (!firebaseUser) {
        setUserProfile(null);
        setIsAuthLoading(false);
        return;
      }

      try {
        const profile = await syncUserProfile(firebaseUser);
        if (profile) setUserProfile(profile);
      } catch (err) {
        console.error('Error syncing user profile on auth change:', err);
      } finally {
        setIsAuthLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Listen to current user profile updates in real-time
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribeProfile = subscribeToUserProfile(
      currentUser.uid,
      (profile) => {
        if (profile) {
          setUserProfile(profile);
        }
      },
      (err) => {
        console.error('Error listening to user profile:', err);
      }
    );

    return () => unsubscribeProfile();
  }, [currentUser]);

  // Admin only: Listen to all user accounts for approval badge & management
  useEffect(() => {
    if (
      !currentUser ||
      userProfile?.role !== 'ADMIN' ||
      userProfile?.status !== 'APPROVED'
    ) {
      setAllUsers([]);
      setPendingUsersCount(0);
      return;
    }

    const unsubscribeAllUsers = subscribeToAllUsers(
      (users) => {
        setAllUsers(users);
        const pending = users.filter((u) => u.status === 'PENDING').length;
        setPendingUsersCount(pending);
      },
      (err) => {
        console.error('Error listening to all users:', err);
      }
    );

    return () => unsubscribeAllUsers();
  }, [currentUser, userProfile?.role, userProfile?.status]);

  // Subscribe to conferences in real-time (Only when authenticated & approved)
  useEffect(() => {
    if (!currentUser || userProfile?.status !== 'APPROVED') {
      setEvents([]);
      setIsEventsLoading(false);
      return;
    }

    setIsEventsLoading(true);
    const unsubscribe = subscribeToEvents(
      (loadedEvents) => {
        setEvents(loadedEvents);
        setIsEventsLoading(false);

        // Auto-select first event if none selected
        setSelectedEventId((prev) => {
          if (!prev && loadedEvents.length > 0) {
            return loadedEvents[0].id;
          }
          // If previous event was deleted, select first available
          if (prev && !loadedEvents.some((e) => e.id === prev)) {
            return loadedEvents.length > 0 ? loadedEvents[0].id : null;
          }
          return prev;
        });
      },
      (error) => {
        console.error('Error fetching events:', error);
        setIsEventsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser, userProfile?.status]);

  // Subscribe to participants & registrations when selectedEventId changes
  useEffect(() => {
    if (!currentUser || userProfile?.status !== 'APPROVED' || !selectedEventId) {
      setParticipantsWithReg([]);
      setIsParticipantsLoading(false);
      return;
    }

    setIsParticipantsLoading(true);
    const unsubscribe = subscribeToEventParticipants(
      selectedEventId,
      (data) => {
        setParticipantsWithReg(data);
        setIsParticipantsLoading(false);

        // Keep active drawer participant data synchronized in real-time
        setSelectedParticipantItem((prev) => {
          if (!prev) return null;
          const updated = data.find((d) => d.registration.id === prev.registration.id);
          return updated || prev;
        });
      },
      (error) => {
        console.error('Error fetching event participants:', error);
        setIsParticipantsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser, userProfile?.status, selectedEventId]);

  const selectedEvent = events.find((e) => e.id === selectedEventId) || null;

  const handleSelectEvent = (eventId: string) => {
    setSelectedEventId(eventId);
    setMobileView('detail');
  };

  const handleOpenParticipantDrawer = (item: ParticipantWithRegistration) => {
    setSelectedParticipantItem(item);
    setIsDrawerOpen(true);
  };

  const handleUpdateFollowup = async (
    registrationId: string,
    status: FollowupStatus
  ) => {
    await updateFollowupStatus(registrationId, status);
  };

  const handleUpdateMentoring = async (
    registrationId: string,
    status: MentoringStatus,
    mentorName?: string
  ) => {
    await updateMentoringStatus(registrationId, status, mentorName);
  };

  const handleUpdateNotes = async (registrationId: string, notes: string) => {
    await updateRegistrationNotes(registrationId, notes);
  };

  const handleOpenEditParticipant = (item: ParticipantWithRegistration) => {
    setParticipantToEdit(item);
    setIsEditParticipantModalOpen(true);
  };

  const handleUpdateFollowupStaff = async (registrationId: string, staffName: string) => {
    await updateFollowupStaff(registrationId, staffName);
  };

  const handleDeleteEvent = async (eventId: string) => {
    await deleteConferenceEvent(eventId);
  };

  const handleClearConference = async (eventId: string) => {
    await clearConferenceData(eventId);
  };

  const handleDeleteParticipants = async (
    eventId: string,
    items: { registrationId: string; participantId: string }[]
  ) => {
    if (items.length === 1) {
      await deleteParticipantRegistration(eventId, items[0].registrationId, items[0].participantId);
    } else {
      await deleteMultipleParticipantRegistrations(eventId, items);
    }
  };

  // 1. Initial Authentication Check State
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex flex-col items-center justify-center p-4">
        <div className="w-9 h-9 border-3 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
        <p className="mt-3 text-xs font-semibold text-slate-500">
          Chargement de l'espace sécurisé...
        </p>
      </div>
    );
  }

  // 2. Unauthenticated User -> Google Sign-in Screen
  if (!currentUser) {
    return <LoginScreen />;
  }

  // 3. User authenticated but waiting for Administrator Approval
  if (!userProfile || userProfile.status !== 'APPROVED') {
    return (
      <PendingApprovalScreen
        user={currentUser}
        profile={userProfile}
        onRefresh={async () => {
          if (currentUser) {
            try {
              const p = await syncUserProfile(currentUser);
              if (p) setUserProfile(p);
            } catch (e) {
              console.error('Refresh profile error:', e);
            }
          }
        }}
      />
    );
  }

  // 4. Authenticated & Approved User -> Main Application View
  return (
    <div className="min-h-screen bg-[#F9FAFB] text-slate-900 flex flex-col font-sans">
      {/* Top Application Navbar */}
      <Navbar
        currentUser={currentUser}
        userProfile={userProfile}
        pendingUsersCount={pendingUsersCount}
        onOpenUserManagement={() => setIsUserManagementOpen(true)}
      />

      {/* Main Master-Detail Screen */}
      <div className="flex-1 max-w-[1600px] w-full mx-auto p-3 sm:p-4 lg:p-6 flex flex-col lg:flex-row gap-3 sm:gap-4 lg:gap-6 min-h-0 relative">
        {/* Mobile View Segmented Switcher */}
        <div className="lg:hidden bg-white border border-slate-200 rounded-xl p-1 flex items-center gap-1 shadow-xs shrink-0">
          <button
            type="button"
            onClick={() => setMobileView('master')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
              mobileView === 'master'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <span>Conférences</span>
            <span
              className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold ${
                mobileView === 'master'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {events.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (selectedEvent) setMobileView('detail');
            }}
            disabled={!selectedEvent}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 truncate cursor-pointer ${
              mobileView === 'detail'
                ? 'bg-slate-900 text-white shadow-2xs'
                : selectedEvent
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                : 'text-slate-300 cursor-not-allowed opacity-50'
            }`}
          >
            <span className="truncate">
              {selectedEvent ? selectedEvent.title : 'Détails'}
            </span>
            {selectedEvent && (
              <span
                className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold shrink-0 ${
                  mobileView === 'detail'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {participantsWithReg.length}
              </span>
            )}
          </button>
        </div>

        {/* Master Panel (Left) */}
        <div
          className={`${
            mobileView === 'master' ? 'block' : 'hidden lg:block'
          } w-full lg:w-96 shrink-0`}
        >
          <MasterPanel
            events={events}
            selectedEventId={selectedEventId}
            onSelectEvent={handleSelectEvent}
            onOpenNewEventModal={() => setIsNewEventModalOpen(true)}
            onDeleteEvent={handleDeleteEvent}
            onEditEvent={(ev) => {
              setEventToEdit(ev);
              setIsEditEventModalOpen(true);
            }}
            isLoading={isEventsLoading}
            userRole={userProfile.role}
          />
        </div>

        {/* Detail Panel (Right) */}
        <div
          className={`${
            mobileView === 'detail' ? 'block' : 'hidden lg:block'
          } flex-1 w-full min-w-0 overflow-hidden`}
        >
          <DetailPanel
            event={selectedEvent}
            participantsWithReg={participantsWithReg}
            isLoading={isParticipantsLoading}
            userRole={userProfile.role}
            onOpenCSVImport={() => setIsCSVModalOpen(true)}
            onOpenNewParticipant={() => setIsNewParticipantModalOpen(true)}
            onOpenParticipantDrawer={handleOpenParticipantDrawer}
            onOpenEditParticipant={handleOpenEditParticipant}
            onOpenEditEvent={() => {
              if (selectedEvent) {
                setEventToEdit(selectedEvent);
                setIsEditEventModalOpen(true);
              }
            }}
            onUpdateFollowup={handleUpdateFollowup}
            onUpdateMentoring={handleUpdateMentoring}
            onClearConference={handleClearConference}
            onDeleteParticipants={handleDeleteParticipants}
          />
        </div>
      </div>

      {/* Slide-over Side Drawer for dynamic Google Forms answers & contact */}
      <ParticipantDrawer
        participantWithReg={selectedParticipantItem}
        isOpen={isDrawerOpen}
        userRole={userProfile.role}
        onClose={() => setIsDrawerOpen(false)}
        onUpdateFollowup={handleUpdateFollowup}
        onUpdateFollowupStaff={handleUpdateFollowupStaff}
        onUpdateMentoring={handleUpdateMentoring}
        onUpdateNotes={handleUpdateNotes}
        onOpenEditParticipant={handleOpenEditParticipant}
      />

      {/* Edit Participant Data Modal */}
      <EditParticipantModal
        participantWithReg={participantToEdit}
        isOpen={isEditParticipantModalOpen}
        onClose={() => {
          setIsEditParticipantModalOpen(false);
          setParticipantToEdit(null);
        }}
        onParticipantUpdated={() => {
          // Participant updates sync automatically via Firestore onSnapshot
        }}
      />

      {/* Edit Conference Modal */}
      <EditEventModal
        event={eventToEdit}
        isOpen={isEditEventModalOpen}
        onClose={() => {
          setIsEditEventModalOpen(false);
          setEventToEdit(null);
        }}
        onEventUpdated={(eventId) => {
          // Event state updates automatically via Firestore snapshot
          setSelectedEventId(eventId);
        }}
      />

      {/* CSV / Google Forms Import Modal */}
      {selectedEvent && (
        <CSVImportModal
          eventId={selectedEvent.id}
          eventTitle={selectedEvent.title}
          isOpen={isCSVModalOpen}
          onClose={() => setIsCSVModalOpen(false)}
          onImportComplete={() => {
            // Participant list auto-updates via Firestore onSnapshot
          }}
        />
      )}

      {/* New Conference Creation Modal */}
      <NewEventModal
        isOpen={isNewEventModalOpen}
        onClose={() => setIsNewEventModalOpen(false)}
        onEventCreated={(newEventId) => {
          setSelectedEventId(newEventId);
          setMobileView('detail');
        }}
      />

      {/* Manual Participant Add Modal */}
      {selectedEvent && (
        <NewParticipantModal
          eventId={selectedEvent.id}
          eventTitle={selectedEvent.title}
          isOpen={isNewParticipantModalOpen}
          onClose={() => setIsNewParticipantModalOpen(false)}
          onParticipantAdded={() => {
            // Participant list auto-updates via Firestore onSnapshot
          }}
        />
      )}

      {/* User Management & Approvals Modal (Admin only) */}
      {userProfile.role === 'ADMIN' && isUserManagementOpen && (
        <UserManagementModal
          isOpen={isUserManagementOpen}
          onClose={() => setIsUserManagementOpen(false)}
          users={allUsers}
          currentAdminEmail={userProfile.email}
          currentAdminUid={userProfile.uid}
        />
      )}
    </div>
  );
}
