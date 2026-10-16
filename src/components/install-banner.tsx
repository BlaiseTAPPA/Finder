/**
 * Hinweis "Tankfinder installieren" (Feature 0006): sofort sichtbar, nie in der installierten
 * App, 30 Tage Pause nach "Später". Android/Chromium öffnet den Browser-Dialog,
 * iOS-Safari bekommt eine kurze Anleitung.
 */
import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  dismissInstall,
  isStandalone,
  promptInstall,
  readInstallState,
  shouldOfferInstall,
  useInstallMethod,
  type InstallState,
} from "@/lib/install-prompt";

export function InstallBanner({ className }: { className?: string | undefined }) {
  const method = useInstallMethod();
  const [state, setState] = useState<InstallState | null>(null);
  const [hidden, setHidden] = useState(false);

  // Erst im Browser lesen (localStorage), damit der erste Render stabil bleibt.
  useEffect(() => {
    setState(readInstallState());
  }, []);

  if (hidden || !state || !shouldOfferInstall(state, method, isStandalone(), Date.now())) {
    return null;
  }

  function later() {
    dismissInstall(Date.now());
    setHidden(true);
  }

  return (
    <aside
      aria-labelledby="install-title"
      className={`flex items-start gap-3 rounded-md border bg-surface p-3 pl-4 ${className ?? ""}`}
    >
      <Download aria-hidden className="mt-0.5 size-5 shrink-0 text-ink-3" />
      <div className="min-w-0 flex-1">
        <p id="install-title" className="text-caption font-semibold text-foreground">
          Tankfinder installieren
        </p>
        {method === "ios" ? (
          <p className="text-fine mt-0.5 text-ink-2">
            Tippe unten auf <Share aria-label="Teilen" className="inline size-3.5 align-[-2px]" />{" "}
            „Teilen“ und dann auf „Zum Home-Bildschirm“ – dann öffnet die App direkt mit den Preisen
            in deiner Nähe.
          </p>
        ) : (
          <>
            <p className="text-fine mt-0.5 text-ink-2">
              Öffnet direkt mit den Preisen in deiner Nähe – ein Tipp vom Home-Bildschirm.
            </p>
            <Button
              size="sm"
              className="mt-2"
              onClick={() => {
                void promptInstall().then((installed) => installed && setHidden(true));
              }}
            >
              Installieren
            </Button>
          </>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Später"
        title="Später"
        className="-mt-1 -mr-1 shrink-0 rounded-full text-ink-3"
        onClick={later}
      >
        <X />
      </Button>
    </aside>
  );
}
