/** Server-only Adress-Suche (Nominatim) für das Autocomplete der Trajet-Felder. */
const cache = new Map<string, { value: Suggestion[]; expires: number }>();

export interface Suggestion {
  label: string;
  lat: number;
  lng: number;
}

export async function searchPlaces(query: string): Promise<Suggestion[]> {
  const key = query.toLowerCase().trim();
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;

  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&addressdetails=0&countrycodes=de&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Tankstellen-Finder",
      Accept: "application/json",
    },
  });
  if (!res.ok) return [];

  const json = (await res.json()) as Array<{
    lat: string;
    lon: string;
    display_name: string;
  }>;
  const value = json.map((item) => ({
    label: item.display_name.split(",").slice(0, 3).join(",").trim(),
    lat: Number(item.lat),
    lng: Number(item.lon),
  }));

  if (cache.size > 200) cache.clear();
  cache.set(key, { value, expires: Date.now() + 24 * 60 * 60 * 1000 });
  return value;
}
