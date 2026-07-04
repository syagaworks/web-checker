import type { SpotSet } from "./types";

const encoderVersion = "b1";

export function storageKey(set: SpotSet) {
  return `spot-tracker:${set.id}:v${set.version}`;
}

export function encodeSelection(set: SpotSet, visited: Set<string>) {
  const bytes = new Uint8Array(Math.ceil(set.spots.length / 8));

  set.spots.forEach((spot, index) => {
    if (visited.has(spot.id)) {
      bytes[Math.floor(index / 8)] |= 1 << (index % 8);
    }
  });

  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return `${encoderVersion}.${btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")}`;
}

export function decodeSelection(set: SpotSet, encoded: string | null) {
  const result = new Set<string>();
  if (!encoded) return result;

  const [version, payload] = encoded.split(".");
  if (version !== encoderVersion || !payload) return result;

  try {
    const padded = payload.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(payload.length / 4) * 4, "=");
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

    set.spots.forEach((spot, index) => {
      if (bytes[Math.floor(index / 8)] & (1 << (index % 8))) {
        result.add(spot.id);
      }
    });
  } catch {
    return new Set<string>();
  }

  return result;
}

export function loadSelection(set: SpotSet) {
  return decodeSelection(set, window.localStorage.getItem(storageKey(set)));
}

export function saveSelection(set: SpotSet, visited: Set<string>) {
  const encoded = encodeSelection(set, visited);
  window.localStorage.setItem(storageKey(set), encoded);
  return encoded;
}

export function resultPath(encoded?: string) {
  const params = encoded ? `?r=${encodeURIComponent(encoded)}` : "";
  return `#/result${params}`;
}

export function absoluteResultUrl(encoded: string) {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}${resultPath(encoded)}`;
}
