// Central API base for the frontend.
// - In dev, prefer using relative URLs (Vite proxy handles forwarding).
// - In prod, set a service-specific base when an endpoint lives on a different origin.
// - VITE_API_BASE remains a fallback for apps that share one backend origin.

function normalizeBaseUrl(raw: unknown): string {
  const v = typeof raw === "string" ? raw.trim() : "";
  if (!v) return "";
  return v.endsWith("/") ? v.slice(0, -1) : v;
}

const env = import.meta.env as Record<string, string | undefined>;

const readBase = (key: string) => normalizeBaseUrl(env[key]);

export const API_BASE = readBase("VITE_API_BASE") || readBase("VITE_API_BASE_URL");
export const CBRS_API_BASE = readBase("VITE_CBRS_API_BASE") || API_BASE;
export const SMART_API_BASE = readBase("VITE_SMART_API_BASE") || API_BASE;
export const MIS_API_BASE = readBase("VITE_MIS_API_BASE") || API_BASE;

export const buildApiUrl = (base: string, path: string) => {
  const normalizedBase = normalizeBaseUrl(base);
  return normalizedBase ? `${normalizedBase}${path}` : path;
};

