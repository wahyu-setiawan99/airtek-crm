/**
 * Profile pictures. `profiles.avatar_url` holds either an uploaded photo URL or `preset:N`
 * (one of the built-in drawings). People who never chose one get a preset picked from
 * their id, so everyone has a stable default.
 */

export const AVATAR_PRESET_COUNT = 8;
/** Largest photo a person may pick before it is compressed in the browser. */
export const AVATAR_MAX_FILE_BYTES = 5 * 1024 * 1024;
/** Largest compressed upload the server accepts. */
export const AVATAR_MAX_UPLOAD_BYTES = 600 * 1024;
/** Stored photos are square, this many pixels per side. */
export const AVATAR_SIZE = 256;
export const AVATAR_BUCKET = "avatars";
export const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function presetAvatar(index: number) {
  return `preset:${index}`;
}

export function presetIndex(avatar: string): number | null {
  const match = /^preset:(\d+)$/.exec(avatar);
  if (!match) return null;
  const index = Number(match[1]);
  return index < AVATAR_PRESET_COUNT ? index : null;
}

/** What to draw for a person: their saved choice, or a preset derived from their id. */
export function avatarOf(userId: string, saved: string | null | undefined) {
  if (saved && (presetIndex(saved) !== null || saved.startsWith("https://") || saved.startsWith("http://") || saved.startsWith("data:image/"))) {
    return saved;
  }
  let hash = 0;
  for (const char of userId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return presetAvatar(hash % AVATAR_PRESET_COUNT);
}

export function isUploadedAvatar(saved: string | null | undefined) {
  return Boolean(saved) && presetIndex(saved ?? "") === null;
}
