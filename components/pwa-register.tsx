"use client";

import { Download, Share, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const DISMISSED_KEY = "airtek_install_dismissed";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

function readDismissed() {
  try {
    return window.localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

function saveDismissed() {
  try {
    window.localStorage.setItem(DISMISSED_KEY, "1");
  } catch {
    // Private mode: the banner simply shows again next visit.
  }
}

/**
 * Service worker registration (production only), the "new version" toast, and a one-time
 * install hint on phones: the native prompt on Android/Chrome, Share → Add to Home Screen on iOS.
 */
export function PwaSupport() {
  const t = useTranslations("pwa");
  const [install, setInstall] = useState<InstallEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    let reloading = false;
    const onControllerChange = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };
    const offerUpdate = (worker: ServiceWorker) => {
      toast(t("updateTitle"), {
        duration: Infinity,
        action: { label: t("reload"), onClick: () => worker.postMessage("SKIP_WAITING") },
      });
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        if (registration.waiting && navigator.serviceWorker.controller) offerUpdate(registration.waiting);
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          worker?.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) offerUpdate(worker);
          });
        });
      })
      .catch(() => {});
    return () => navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
  }, [t]);

  useEffect(() => {
    const phone = window.matchMedia("(max-width: 767px)").matches;
    const standalone = window.matchMedia("(display-mode: standalone)").matches || ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    if (!phone || standalone || readDismissed()) return;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
    if (ios) setIosHint(true);
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstall(event as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!install && !iosHint) return null;

  const dismiss = () => {
    saveDismissed();
    setInstall(null);
    setIosHint(false);
  };

  return (
    <div role="dialog" aria-label={t("installTitle")} className="fixed inset-x-3 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-40 flex items-start gap-3 rounded-xl border bg-popover p-3 text-sm text-popover-foreground shadow-xl md:hidden">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
        {install ? <Download className="h-4 w-4" /> : <Share className="h-4 w-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium">{t("installTitle")}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{install ? t("installBody") : t("iosBody")}</p>
        {install ? (
          <button
            type="button"
            className="mt-2 h-9 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground"
            onClick={() => {
              void install.prompt();
              void install.userChoice.finally(dismiss);
            }}
          >
            {t("install")}
          </button>
        ) : null}
      </div>
      <button type="button" aria-label={t("dismiss")} className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-accent" onClick={dismiss}>
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
