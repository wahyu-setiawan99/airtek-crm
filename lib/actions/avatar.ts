"use server";

import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";
import sharp from "sharp";
import { ActionError, runAction } from "@/lib/action";
import { AVATAR_BUCKET, AVATAR_MAX_UPLOAD_BYTES, AVATAR_PRESET_COUNT, AVATAR_SIZE, presetAvatar } from "@/lib/avatar";
import { createId } from "@/lib/demo/store";
import { supabaseEnabled } from "@/lib/env";
import { getUserId } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

let bucketReady = false;

/** The public avatars bucket (migration 0013); created on first use if the SQL was not run. */
async function ensureBucket(admin: Admin) {
  if (bucketReady) return;
  const { data } = await admin.storage.getBucket(AVATAR_BUCKET);
  if (!data) {
    const { error } = await admin.storage.createBucket(AVATAR_BUCKET, {
      public: true,
      fileSizeLimit: AVATAR_MAX_UPLOAD_BYTES,
      allowedMimeTypes: ["image/webp"],
    });
    if (error && !/already exists/i.test(error.message)) throw error;
  }
  bucketReady = true;
}

/** Storage path of a photo uploaded here, or null for presets and other URLs. */
function storedPath(url: string | null | undefined) {
  const marker = `/storage/v1/object/public/${AVATAR_BUCKET}/`;
  const at = url ? url.indexOf(marker) : -1;
  return at < 0 || !url ? null : url.slice(at + marker.length);
}

/** Saves the caller's avatar and removes the photo it replaces. */
async function saveAvatar(value: string | null) {
  const t = await getTranslations("common");
  if (!supabaseEnabled) {
    return runAction(({ session, store }) => {
      const profile = store.profiles.find((item) => item.id === session.userId);
      if (!profile) throw new ActionError(t("error"));
      profile.avatar_url = value;
      profile.updated_at = new Date().toISOString();
      return null;
    }, ["profiles"]);
  }
  const userId = await getUserId();
  if (!userId) return { ok: false as const, error: t("forbidden") };
  const admin = createAdminClient();
  const { data: before } = await admin.from("profiles").select("avatar_url").eq("id", userId).maybeSingle();
  const { error } = await admin.from("profiles").update({ avatar_url: value, updated_at: new Date().toISOString() }).eq("id", userId);
  if (error) {
    console.error("save avatar", error);
    return { ok: false as const, error: t("error") };
  }
  const old = storedPath(before?.avatar_url);
  if (old && old !== storedPath(value)) await admin.storage.from(AVATAR_BUCKET).remove([old]).catch(() => null);
  revalidatePath("/", "layout");
  return { ok: true as const, data: null };
}

export async function choosePresetAvatarAction(index: unknown) {
  if (typeof index !== "number" || !Number.isInteger(index) || index < 0 || index >= AVATAR_PRESET_COUNT) {
    return { ok: false as const, error: "Invalid" };
  }
  return saveAvatar(presetAvatar(index));
}

/** Back to the default drawing picked from the person's id. */
export async function removeAvatarAction() {
  return saveAvatar(null);
}

/**
 * Takes a photo the browser already cropped and shrank, and compresses it once more on the
 * server: a 256 px square WebP without metadata, usually 10–30 KB.
 */
export async function uploadAvatarAction(form: FormData) {
  const t = await getTranslations("settings");
  const file = form.get("file");
  if (!(file instanceof File) || !file.type.startsWith("image/")) return { ok: false as const, error: t("avatarInvalid") };
  if (file.size > AVATAR_MAX_UPLOAD_BYTES) return { ok: false as const, error: t("avatarTooLarge") };
  const userId = await getUserId();
  if (!userId) return { ok: false as const, error: t("avatarInvalid") };

  let photo: Buffer;
  try {
    photo = await sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 40_000_000 })
      .rotate()
      .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: "cover" })
      .webp({ quality: 78 })
      .toBuffer();
  } catch {
    return { ok: false as const, error: t("avatarInvalid") };
  }

  if (!supabaseEnabled) return saveAvatar(`data:image/webp;base64,${photo.toString("base64")}`);

  try {
    const admin = createAdminClient();
    await ensureBucket(admin);
    // A new name per upload, so browsers can cache each photo for good.
    const path = `${userId}/${createId()}.webp`;
    const { error } = await admin.storage.from(AVATAR_BUCKET).upload(path, photo, { contentType: "image/webp", cacheControl: "31536000", upsert: false });
    if (error) throw error;
    return saveAvatar(admin.storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl);
  } catch (error) {
    console.error("upload avatar", error);
    return { ok: false as const, error: t("avatarFailed") };
  }
}
