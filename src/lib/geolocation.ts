/** Hook für die Nutzerposition (nur Browser-APIs, immer in Effekten/Handlern). */
import { useCallback, useState } from "react";
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
