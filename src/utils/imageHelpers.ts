/**
 * Conference thumbnails, posters, and participant avatars helper
 */

// Curated high quality conference images from Unsplash (academic, seminars, keynotes)
export const CONFERENCE_THUMBNAILS = [
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=80', // Keynote amphitheater
  'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&auto=format&fit=crop&q=80', // Lecture hall university
  'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80', // Collaborative workshop
  'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800&auto=format&fit=crop&q=80', // Stage speaker
  'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80', // Academic symposium
  'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800&auto=format&fit=crop&q=80', // Tech conference discussion
];

export interface PosterPreset {
  id: string;
  name: string;
  category: string;
  url: string;
}

export const POSTER_PRESETS: PosterPreset[] = [
  {
    id: 'keynote',
    name: 'Amphithéâtre & Plénière',
    category: 'Excellence',
    url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1000&auto=format&fit=crop&q=85',
  },
  {
    id: 'academic',
    name: 'Auditorium Universitaire',
    category: 'Académique',
    url: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=1000&auto=format&fit=crop&q=85',
  },
  {
    id: 'leadership',
    name: 'Leadership & Carrière',
    category: 'Management',
    url: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=1000&auto=format&fit=crop&q=85',
  },
  {
    id: 'tech',
    name: 'Innovation & Tech Talk',
    category: 'Technologie',
    url: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=1000&auto=format&fit=crop&q=85',
  },
  {
    id: 'science',
    name: 'Colloque & Recherche',
    category: 'Sciences',
    url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1000&auto=format&fit=crop&q=85',
  },
  {
    id: 'workshop',
    name: 'Atelier Collaboratif',
    category: 'Workshop',
    url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1000&auto=format&fit=crop&q=85',
  },
];

// Curated portrait avatars for diverse academic participants
export const PARTICIPANT_AVATARS: Record<string, string> = {
  'koffi.mensah@gmail.com': 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'amina.traore@yahoo.fr': 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150&auto=format&fit=crop&q=80',
  'emmanuel.adjovi@outlook.com': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'grace.bakary@gmail.com': 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
  'samuel.konan@gmail.com': 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'florence.kouadio@gmail.com': 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
  'christian.dos-santos@hotmail.com': 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
  'mariam.diallo@gmail.com': 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=150&auto=format&fit=crop&q=80',
};

/**
 * Deterministically pick an image for a conference based on its title / id,
 * or use the custom poster imageUrl if specified.
 */
export function getConferenceImage(eventId: string, title: string, customImage?: string): string {
  if (customImage && customImage.trim().length > 0) {
    return customImage.trim();
  }
  let hash = 0;
  const str = (eventId || '') + (title || '');
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % CONFERENCE_THUMBNAILS.length;
  return CONFERENCE_THUMBNAILS[index];
}

/**
 * Get an avatar URL for a participant email or return null for initials fallback
 */
export function getParticipantAvatar(email?: string): string | null {
  if (!email) return null;
  const cleanEmail = email.toLowerCase().trim();
  return PARTICIPANT_AVATARS[cleanEmail] || null;
}

/**
 * Resize and compress an uploaded image file on the client side into an optimized Data URL.
 * Keeps aspect ratio, bounds dimensions to maxWidth/maxHeight (e.g. 1000px),
 * and compresses as JPEG so it is ultra-lightweight (< 150KB) and perfectly compatible with Firestore.
 */
export function compressAndResizeImage(
  file: File,
  maxWidth = 1000,
  maxHeight = 1000,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Le fichier sélectionné n\'est pas une image valide.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Impossible de lire le fichier image.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Impossible de charger l\'image.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Erreur de contexte Canvas.'));
          return;
        }

        // Draw image onto canvas
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to lightweight JPEG data URL
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}
