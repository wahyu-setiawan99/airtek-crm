"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { addAttachmentAction, attachmentUrlAction, deleteAttachmentAction, signAttachmentUploadAction } from "@/lib/actions/phase9";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export type FileRow = { id: string; fileName: string; size: number; mime: string };

export function AttachmentsPanel({
  files,
  dealId = null,
  contactId = null,
  companyId = null,
  canEdit,
}: {
  files: FileRow[];
  dealId?: string | null;
  contactId?: string | null;
  companyId?: string | null;
  canEdit: boolean;
}) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onFile(file: File) {
    setBusy(true);
    const signed = await signAttachmentUploadAction({ fileName: file.name, dealId, contactId, companyId });
    if (!signed.ok) {
      setBusy(false);
      toast.error(signed.error);
      return;
    }
    if (signed.data.token) {
      const supabase = createClient();
      if (!supabase) {
        setBusy(false);
        toast.error(tc("error"));
        return;
      }
      const uploaded = await supabase.storage.from("attachments").uploadToSignedUrl(signed.data.path, signed.data.token, file);
      if (uploaded.error) {
        setBusy(false);
        toast.error(tc("error"));
        return;
      }
    }
    const saved = await addAttachmentAction({
      id: signed.data.id,
      path: signed.data.path,
      fileName: file.name,
      size: file.size,
      mime: file.type || "application/octet-stream",
      dealId,
      contactId,
      companyId,
    });
    setBusy(false);
    if (!saved.ok) return toast.error(saved.error);
    if (!signed.data.token) toast.message(t("demoFile"));
    router.refresh();
  }

  return (
    <div className="grid gap-3">
      {canEdit ? (
        <label className="grid cursor-pointer place-items-center rounded-lg border border-dashed bg-card px-4 py-8 text-sm text-muted-foreground">
          {busy ? tc("save") : t("upload")}
          <input
            className="sr-only"
            type="file"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void onFile(file);
            }}
          />
        </label>
      ) : null}
      {files.length === 0 ? <p className="text-sm text-muted-foreground">{tc("empty")}</p> : null}
      <ul className="grid gap-2">
        {files.map((file) => (
          <li key={file.id} className="flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2 text-sm">
            <span className="min-w-0 truncate">{file.fileName}</span>
            <span className="flex gap-2">
              <button
                type="button"
                className="text-primary"
                onClick={() => {
                  void attachmentUrlAction(file.id).then((result) => {
                    if (!result.ok) return toast.message(t("demoFile"));
                    window.open(result.data, "_blank", "noopener");
                  });
                }}
              >
                {t("download")}
              </button>
              {canEdit ? (
                <button type="button" className="text-destructive" onClick={() => void deleteAttachmentAction(file.id).then(() => router.refresh())}>
                  {tc("delete")}
                </button>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
