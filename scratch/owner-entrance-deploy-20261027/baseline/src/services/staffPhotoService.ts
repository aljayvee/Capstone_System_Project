import { apiClient } from "./apiClient";

// Shared by the Dispatcher Portal sidebar (read-only) and the Profile &
// Account Settings panel (full CRUD). Same endpoint/table the Rider mobile
// app already uses for its own avatar (RiderProfilePhoto in schema.prisma) —
// its schema comment documents this table as shared storage for OWNER,
// DISPATCHER, and RIDER avatars alike, despite the "/riders" URL namespace.

export interface StaffPhotoUploadInput {
  photoData: string;
  mimeType: string;
  fileSize: number;
  fileName?: string;
}

// In-memory deduplication cache for user avatars during a session.
// Prevents redundant requests when avatars render in multiple views (card, table, sidebar)
// or re-render during state updates.
const photoCache = new Map<number | string, Promise<string | null>>();

/** The avatar bytes as a base64 data URI, or null when none is set. */
export async function fetchStaffPhoto(userId: number | string): Promise<string | null> {
  const cached = photoCache.get(userId);
  if (cached) return cached;

  const promise = (async () => {
    try {
      const res = await apiClient.get(`/riders/${userId}/photo`);
      return res.data?.photoData ?? null;
    } catch (err: any) {
      // 404 is the ordinary "no photo set" answer, not a failure worth logging.
      if (err?.response?.status !== 404) {
        console.warn("Failed to fetch profile photo:", err);
        // On unexpected network errors, delete from cache so subsequent attempts can retry
        photoCache.delete(userId);
      }
      return null;
    }
  })();

  photoCache.set(userId, promise);
  return promise;
}

export async function uploadStaffPhoto(userId: number | string, photo: StaffPhotoUploadInput) {
  photoCache.delete(userId);
  const res = await apiClient.put(`/riders/${userId}/photo`, photo);
  return res.data;
}

export async function deleteStaffPhoto(userId: number | string) {
  photoCache.delete(userId);
  const res = await apiClient.delete(`/riders/${userId}/photo`);
  return res.data;
}
