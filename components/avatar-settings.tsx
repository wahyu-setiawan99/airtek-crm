"use client";

import { Camera, Loader2, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { choosePresetAvatarAction, removeAvatarAction, uploadAvatarAction } from "@/lib/actions/avatar";
import { AVATAR_MAX_FILE_BYTES, AVATAR_MAX_UPLOAD_BYTES, AVATAR_PRESET_COUNT, AVATAR_SIZE, AVATAR_TYPES, presetAvatar } from "@/lib/avatar";
import { cn } from "@/lib/utils";

/** Crops the photo to the centre square and shrinks it before it leaves the device. */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas");
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
  bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("encode"))), "image/webp", 0.85));
}

export function AvatarSettings({ avatar, uploaded, name }: { avatar: string; uploaded: boolean; name: string }) {
  const t = useTranslations("settings");
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(true);
    const result = await action();
    setBusy(false);
    if (result.ok) toast.success(t("avatarSaved"));
    else toast.error(result.error ?? t("avatarFailed"));
  }

  async function onFile(file: File | undefined) {
    if (input.current) input.current.value = "";
    if (!file) return;
    if (!AVATAR_TYPES.includes(file.type)) return void toast.error(t("avatarInvalid"));
    if (file.size > AVATAR_MAX_FILE_BYTES) return void toast.error(t("avatarTooLarge"));
    await run(async () => {
      let blob: Blob;
      try {
        blob = await shrink(file);
      } catch {
        return { ok: false, error: t("avatarInvalid") };
      }
      if (blob.size > AVATAR_MAX_UPLOAD_BYTES) return { ok: false, error: t("avatarTooLarge") };
      const form = new FormData();
      form.set("file", blob, "avatar.webp");
      return uploadAvatarAction(form);
    });
  }

  return (
    <section className="grid max-w-lg gap-3 rounded-lg border bg-card p-4" aria-labelledby="avatar-heading">
      <div>
        <h2 id="avatar-heading" className="text-sm font-semibold">{t("avatar")}</h2>
        <p className="text-xs text-muted-foreground">{t("avatarHint")}</p>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <span className="relative">
          <UserAvatar avatar={avatar} label={name} className="h-20 w-20" />
          {busy ? (
            <span className="absolute inset-0 grid place-items-center rounded-full bg-background/70">
              <Loader2 className="h-5 w-5 animate-spin" aria-label={t("avatarUploading")} />
            </span>
          ) : null}
        </span>
        <div className="flex flex-wrap gap-2">
          <input ref={input} type="file" accept={AVATAR_TYPES.join(",")} className="sr-only" tabIndex={-1} aria-hidden onChange={(event) => void onFile(event.target.files?.[0])} />
          <Button type="button" variant="outline" disabled={busy} onClick={() => input.current?.click()}>
            <Camera className="h-4 w-4" /> {t("avatarUpload")}
          </Button>
          {uploaded ? (
            <Button type="button" variant="ghost" disabled={busy} onClick={() => void run(removeAvatarAction)}>
              <Trash2 className="h-4 w-4" /> {t("avatarRemove")}
            </Button>
          ) : null}
        </div>
      </div>
      <div>
        <p id="avatar-presets" className="mb-2 text-xs font-medium text-muted-foreground">{t("avatarChoose")}</p>
        <div role="radiogroup" aria-labelledby="avatar-presets" className="flex flex-wrap gap-2">
          {Array.from({ length: AVATAR_PRESET_COUNT }, (_, index) => {
            const value = presetAvatar(index);
            const active = avatar === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={t("avatarPreset", { number: index + 1 })}
                disabled={busy || active}
                onClick={() => void run(() => choosePresetAvatarAction(index))}
                className={cn("rounded-full p-0.5 ring-2 ring-transparent transition", active ? "ring-primary" : "hover:ring-border")}
              >
                <UserAvatar avatar={value} className="h-11 w-11" />
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
