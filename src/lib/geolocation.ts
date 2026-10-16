/** Hook für die Nutzerposition (nur Browser-APIs, immer in Effekten/Handlern). */
import { useCallback, useEffect, useState } from "react";
import type { Coords } from "@/types/station";

export type GeoStatus = "idle" | "loading" | "granted" | "denied" | "unavailable";

export interface GeolocationState {
  status: GeoStatus;
  coords: Coords | null;
  error: string | null;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    status: "idle",
    coords: null,
    error: null,
  });

  /** Fragt die Position an. Nur aus Event-Handlern/Effekten aufrufen. */
  const request = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState({
        status: "unavailable",
        coords: null,
        error: "Standortdienste werden von diesem Browser nicht unterstützt.",
      });
      return;
    }

    setState((s) => ({ ...s, status: "loading", error: null }));

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({
          status: "granted",
          coords: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          error: null,
        });
      },
      (err) => {
        const denied = err.code === err.PERMISSION_DENIED;
        setState({
          status: denied ? "denied" : "unavailable",
          coords: null,
          error: denied
            ? "Standortfreigabe abgelehnt. Bitte Ort oder PLZ eingeben."
            : "Position konnte nicht ermittelt werden. Bitte Ort oder PLZ eingeben.",
        });
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60 * 1000 },
    );
  }, []);

  /** Manuell gesetzte Position (z. B. nach Geocoding). */
  const setManual = useCallback((coords: Coords) => {
    setState({ status: "granted", coords, error: null });
  }, []);

  return { ...state, request, setManual };
}

/** Stand der Standortfreigabe; "unknown", wo die Permissions API fehlt (Feature 0006). */
export type GeoPermission = "granted" | "prompt" | "denied" | "unknown";

/** Liest die Freigabe, ohne nachzufragen, und folgt späteren Änderungen. */
export function useGeoPermission(): GeoPermission {
  const [permission, setPermission] = useState<GeoPermission>("unknown");
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.permissions?.query) return;
    let status: PermissionStatus | null = null;
    let active = true;
    const update = () => {
      if (active && status) setPermission(status.state);
    };
    navigator.permissions
      .query({ name: "geolocation" })
      .then((result) => {
        status = result;
        update();
        result.addEventListener("change", update);
      })
      .catch(() => {
        /* Browser ohne Abfrage für geolocation – bleibt "unknown" */
      });
    return () => {
      active = false;
      status?.removeEventListener("change", update);
    };
  }, []);
  return permission;
}
