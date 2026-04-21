// Central API base for the frontend.
// - In dev, prefer using relative URLs (Vite proxy handles forwarding).
// - In prod, set VITE_API_BASE (e.g., "http://server:44381") if the API is on a different origin.

function normalizeBaseUrl(raw: unknown): string {
  const v = typeof raw === "string" ? raw.trim() : "";
  if (!v) return "";
  return v.endsWith("/") ? v.slice(0, -1) : v;
}

export const API_BASE = normalizeBaseUrl(import.meta.env.VITE_API_BASE);

