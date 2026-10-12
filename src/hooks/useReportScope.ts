import { useUser } from "../contexts/UserContext";

export type Category = "Area" | "Province" | "Region" | "Entire CEB";
interface LockedValue { code: string; name: string; }

export function useReportScope() {
  const { user } = useUser();
  const level = user.Level ?? 0;

  let allowedCategories: Category[];
  const locked: Partial<Record<Category, LockedValue>> = {};

  if (level >= 80) {
    allowedCategories = ["Area", "Province", "Region", "Entire CEB"];
  } else if (level >= 70) {
    allowedCategories = ["Area", "Province", "Region"];
    locked["Region"] = { code: user.RegionCode || "", name: "" };
  } else if (level >= 60) {
    allowedCategories = ["Area", "Province"];
    locked["Province"] = { code: user.ProvinceCode || "", name: user.ProvinceName || "" };
  } else {
    allowedCategories = ["Area"];
    locked["Area"] = { code: user.AreaCode || "", name: user.AreaName || "" };
  }

  return { level, allowedCategories, locked };
}

export function isWithinUserScope(
  user: { Level?: number; RegionCode?: string; ProvinceCode?: string; AreaCode?: string },
  recordArea?: string,
  recordProvince?: string,
  recordRegion?: string
): boolean {
  const level = user.Level ?? 0;
  const normalize = (value?: string) => String(value ?? "").trim().toUpperCase();
  if (level >= 80) return true;
  if (level >= 70) return normalize(recordRegion) === normalize(user.RegionCode);
  if (level >= 60) return normalize(recordProvince) === normalize(user.ProvinceCode);
  return normalize(recordArea) === normalize(user.AreaCode);
}
