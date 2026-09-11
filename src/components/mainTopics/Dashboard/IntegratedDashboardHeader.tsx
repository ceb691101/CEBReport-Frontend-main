import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useUser } from "../../../contexts/UserContext";
import { Filter, RotateCcw, ChevronDown, Loader2 } from "lucide-react";

export interface ProvinceItem {
  code: string;
  name: string;
  region?: string;
}

export interface AreaItem {
  code: string;
  name: string;
  provCode?: string;
  region?: string;
}

export interface IntegratedDashboardHeaderProps {
  title?: string;
  subtitle?: string;
  lastUpdated?: string | null;
  selectedDivision?: string;
  selectedProvince?: string;
  selectedArea?: string;
  onDivisionChange?: (division: string) => void;
  onProvinceChange?: (province: string) => void;
  onAreaChange?: (area: string) => void;
  onResetFilters?: () => void;
  showResetButton?: boolean;
  onRefresh?: () => void;
  loading?: boolean;
  className?: string;
}

export const DIVISION_OPTIONS = [
  { id: "all", label: "All Divisions", shortLabel: "All Divisions", regionCode: "all" },
  { id: "d1", label: "Division 1 (D1)", shortLabel: "D1", regionCode: "R1" },
  { id: "d2", label: "Division 2 (D2)", shortLabel: "D2", regionCode: "R2" },
  { id: "d3", label: "Division 3 (D3)", shortLabel: "D3", regionCode: "R3" },
  { id: "d4", label: "Division 4 (D4)", shortLabel: "D4", regionCode: "R4" },
];

export const COMPANY_TO_PROVINCE: Record<string, string> = {
  // Southern Province (SP / B)
  "AMBALN": "B",
  "BADDEG": "B",
  "GALLE": "B",
  "HAM": "B",
  "KAM": "B",
  "MAT": "B",
  "MATARA": "B",
  "TAN": "B",
  "TANGAL": "B",
  "WELIGA": "B",

  // Western Province North (WPN / 1)
  "GAMPAH": "1",
  "JAELA": "1",
  "KELANI": "1",
  "NEGOMB": "1",
  "DIVULA": "1",
  "VEYANG": "1",
  "KIRIND": "1",

  // Western Province South 1 (WPS1 / 2)
  "DEHIWA": "2",
  "KALUTR": "2",
  "MTGMA": "2",
  "RLANA": "2",
  "RTMALN": "2",

  // Western Province South 2 (WPS2 / WPSII / C)
  "AVISSA": "C",
  "BGAMA": "C",
  "HOMAGA": "C",
  "HORNA": "C",
  "JAPURA": "C",

  // Central Province (CP / 5 / E)
  "KANDY": "5",
  "KATUGS": "5",
  "KUNDSL": "5",
  "MATALE": "5",
  "GALAGE": "5",
  "DAMBUL": "5",
  "GINIG": "5",
  "GINIGA": "5",
  "HANGU": "5",
  "HASA": "5",
  "NAWAL": "5",
  "NAWLPI": "5",
  "NELIYA": "5",
  "NUELIY": "5",
  "PERA": "5",
  "PERADA": "5",

  // North Western Province (NWP / 8 / D)
  "CHILAW": "8",
  "KULIYA": "8",
  "PUTTAL": "8",
  "WENNAP": "8",
  "KURU": "8",
  "KURUNE": "8",
  "NARAM": "8",
  "NARAMM": "8",
  "WARI": "8",
  "WARIYA": "8",
  "MAHO": "8",
  "IBBAGA": "8",

  // Sabaragamuwa Province (SABP / 9)
  "RATNAP": "9",
  "EMBILI": "9",
  "EHALI": "9",
  "KAHAWA": "9",
  "RUWANW": "9",
  "BALANG": "9",
  "KEGAL": "9",
  "KEGALL": "9",
  "MAWAN": "9",
  "MAWANE": "9",

  // Northern Province (NP / 4)
  "JAFFNA": "4",
  "JAFEA": "4",
  "JAFWA": "4",
  "KILINO": "4",
  "VAVUNI": "4",

  // Eastern Province (EP / 7)
  "AMPARA": "7",
  "BATICO": "7",
  "KALMUN": "7",
  "TRINCO": "7",
  "VALAIC": "7",

  // Uva Province (UVAP / 6)
  "BADULA": "6",
  "DIYATA": "6",
  "MAHI": "6",
  "MONARA": "6",
  "WELLAW": "6",

  // North Central Province (NCP / A)
  "ANPURA": "A",
  "KEKRWA": "A",
  "MINRIA": "A",
};

export const PROV_MATCH: Record<string, string[]> = {
  "1": ["1", "WPN"], "WPN": ["1", "WPN"],
  "2": ["2", "WPS1", "WPS 1"], "WPS1": ["2", "WPS1", "WPS 1"],
  "C": ["C", "WPS2", "WPS 2", "WPSII"], "WPS2": ["C", "WPS2", "WPS 2", "WPSII"],
  "B": ["B", "SP", "SOUTHERN"], "SP": ["B", "SP", "SOUTHERN"],
  "5": ["5", "CP", "CENTRAL"], "CP": ["5", "CP", "CENTRAL"],
  "8": ["8", "NWP", "NORTH WESTERN"], "NWP": ["8", "NWP", "NORTH WESTERN"],
  "9": ["9", "SABP", "SABARAGAMUWA"], "SABP": ["9", "SABP", "SABARAGAMUWA"],
  "4": ["4", "NP", "NORTHERN"], "NP": ["4", "NP", "NORTHERN"],
  "7": ["7", "EP", "EASTERN"], "EP": ["7", "EP", "EASTERN"],
  "6": ["6", "UVAP", "UVA"], "UVAP": ["6", "UVAP", "UVA"],
  "A": ["A", "NCP", "NORTH CENTRAL"], "NCP": ["A", "NCP", "NORTH CENTRAL"],
};

export const resolveAreaToCompanyId = (area: string, _province?: string): string => {
  if (!area || area === "all") return area;
  const clean = area.trim().toUpperCase();
  const map: Record<string, string> = {
    // Southern Province
    "45": "GALLE", "GALLE": "GALLE",
    "47": "MAT", "MATARA": "MAT", "MAT": "MAT",
    "25": "HAM", "HAMBANTOTA": "HAM", "HAM": "HAM",
    "62": "TAN", "TANGALLE": "TAN", "TAN": "TAN", "TANGAL": "TAN",
    "54": "MAT", "AKURESSA": "MAT", "AKURES": "MAT",
    "28": "AMBALN", "AMBALANGODA": "AMBALN", "AMBALA": "AMBALN", "AMBALN": "AMBALN",
    "86": "BADDEG", "BADDEGAMA": "BADDEG", "BADDEG": "BADDEG",
    "WELIGA": "WELIGA", "WELIGAMA": "WELIGA",
    "KAM": "KAM", "KAMBURUPITIYA": "KAM",

    // Western Province North
    "49": "GAMPAH", "GAMPAHA": "GAMPAH", "GAMPAH": "GAMPAH",
    "27": "JAELA", "JA-ELA": "JAELA", "JA ELA": "JAELA", "JAELA": "JAELA",
    "48": "KELANI", "KELANIYA": "KELANI", "KELANI": "KELANI",
    "37": "NEGOMB", "NEGOMBO": "NEGOMB", "NEGOMB": "NEGOMB",
    "66": "DIVULA", "DIVULAPITIYA": "DIVULA", "DIVULA": "DIVULA",
    "53": "VEYANG", "VEYANGODA": "VEYANG", "VEYANG": "VEYANG",
    "55": "KIRIND", "KIRINDIWELA": "KIRIND", "KIRIND": "KIRIND",

    // Western Province South 1
    "38": "DEHIWA", "DEHIWALA": "DEHIWA", "DEHIWA": "DEHIWA",
    "44": "KALUTR", "KALUTARA": "KALUTR", "KALUTR": "KALUTR",
    "87": "MTGMA", "MATUGAMA": "MTGMA", "MATHUGAMA": "MTGMA", "MTGMA": "MTGMA",
    "21": "RLANA", "RATMALANA": "RLANA", "RLANA": "RLANA", "RTMALN": "RLANA",

    // Western Province South 2
    "46": "AVISSA", "AVISSAWELLA": "AVISSA", "AVISSA": "AVISSA",
    "65": "BGAMA", "BANDARAGAMA": "BGAMA", "BANDAR": "BGAMA", "BGAMA": "BGAMA",
    "41": "HOMAGA", "HOMAGAMA": "HOMAGA", "HOMAGA": "HOMAGA",
    "31": "HORNA", "HORANA": "HORNA", "HORNA": "HORNA",
    "42": "JAPURA", "SRI JAYAWARDENAPURA": "JAPURA", "JAPURA": "JAPURA",

    // Central Province
    "77": "KANDY", "KANDY CITY": "KANDY", "KANDY": "KANDY",
    "71": "KATUGS", "KATUGASTOTA": "KATUGS", "KATUGS": "KATUGS",
    "40": "KUNDSL", "KUNDASALE": "KUNDSL", "KUNDSL": "KUNDSL",
    "30": "MATALE", "MATALE": "MATALE",
    "80": "GALAGE", "GALAGEDARA": "GALAGE", "GALAGE": "GALAGE",
    "85": "DAMBUL", "DAMBULLA": "DAMBUL", "DAMBUL": "DAMBUL",
    "GINIG": "GINIG", "GINIGA": "GINIG", "GINIGATHHENA": "GINIG",
    "NAWAL": "NAWAL", "NAWLPI": "NAWAL", "NAWALAPITIYA": "NAWAL",
    "NELIYA": "NELIYA", "NUELIY": "NELIYA", "NUWARA-ELIYA": "NELIYA",
    "PERA": "PERA", "PERADA": "PERA", "PERADENIYA": "PERA",

    // North Western Province
    "19": "CHILAW", "CHILAW": "CHILAW",
    "59": "KULIYA", "KULIYAPITIYA": "KULIYA", "KULIYA": "KULIYA",
    "83": "PUTTAL", "PUTTALAM": "PUTTAL", "PUTTAL": "PUTTAL",
    "50": "WENNAP", "WENNAPPUWA": "WENNAP", "WENNAP": "WENNAP",
    "43": "KURU", "KURUNEGALA": "KURU", "KURU": "KURU", "KURUNE": "KURU",
    "84": "NARAM", "NARAMMALA": "NARAM", "NARAM": "NARAM", "NARAMM": "NARAM",
    "76": "WARI", "WARIYAPOLA": "WARI", "WARI": "WARI", "WARIYA": "WARI",
    "89": "MAHO", "MAHAWA": "MAHO", "MAHO": "MAHO",

    // Sabaragamuwa
    "26": "RATNAP", "RATNAPURA": "RATNAP", "RATNAP": "RATNAP",
    "64": "EMBILI", "EMBILIPITIYA": "EMBILI", "EMBILI": "EMBILI",
    "63": "EHALI", "EHELIYAGODA": "EHALI", "EHALI": "EHALI",
    "52": "KAHAWA", "KAHAWATTA": "KAHAWA", "KAHAWA": "KAHAWA",
    "79": "RUWANW", "RUWANWELLA": "RUWANW", "RUWANW": "RUWANW",
    "BALANG": "BALANG", "BALANGODA": "BALANG",
    "KEGAL": "KEGAL", "KEGALL": "KEGAL", "KEGALLE": "KEGAL",
    "MAWAN": "MAWAN", "MAWANE": "MAWAN", "MAWANELLA": "MAWAN",

    // Northern Province
    "JAFFNA": "JAFFNA", "JAFEA": "JAFEA", "JAFWA": "JAFWA", "KILINO": "KILINO", "VAVUNI": "VAVUNI",

    // Eastern Province
    "AMPARA": "AMPARA", "BATICO": "BATICO", "KALMUN": "KALMUN", "TRINCO": "TRINCO", "VALAIC": "VALAIC",

    // Uva Province
    "BADULA": "BADULA", "DIYATA": "DIYATA", "MAHI": "MAHI", "MONARA": "MONARA", "WELLAW": "WELLAW",

    // North Central
    "ANPURA": "ANPURA", "KEKRWA": "KEKRWA", "MINRIA": "MINRIA",
  };
  return map[clean] || clean;
};

export const IntegratedDashboardHeader: React.FC<IntegratedDashboardHeaderProps> = ({
  title = "Divisional Dashboard",
  subtitle,
  lastUpdated,
  selectedDivision = "all",
  selectedProvince = "all",
  selectedArea = "all",
  onDivisionChange,
  onProvinceChange,
  onAreaChange,
  onResetFilters,
  showResetButton = true,
  onRefresh,
  loading = false,
  className = "",
}) => {
  const { user } = useUser();

  const [provinces, setProvinces] = useState<ProvinceItem[]>([]);
  const [areas, setAreas] = useState<AreaItem[]>([]);
  const [provinceToDivisionMap, setProvinceToDivisionMap] = useState<Map<string, string>>(new Map());
  const [areaToProvinceMap, setAreaToProvinceMap] = useState<Map<string, string>>(new Map());
  const [loadingMetadata, setLoadingMetadata] = useState<boolean>(true);
  const [areasLoading, setAreasLoading] = useState<boolean>(false);

  // ── Fetch metadata (provinces & all areas mapping) ──────────────────────────
  useEffect(() => {
    let active = true;

    const fetchMetadata = async () => {
      try {
        setLoadingMetadata(true);
        const epfNo = user?.Userno || "033480";
        const [provRes, areasRes, userCompRes] = await Promise.all([
          fetch("/misapi/api/ordinary/province", { headers: { Accept: "application/json" } }),
          fetch("/misapi/api/ordinary/areas", { headers: { Accept: "application/json" } }),
          fetch(`/misapi/api/incomeexpenditure/Usercompanies/${epfNo}/50`, { headers: { Accept: "application/json" } }).catch(() => null),
        ]);

        if (!active) return;

        let loadedProvinces: ProvinceItem[] = [];
        let loadedAreas: AreaItem[] = [];
        const provDivMap = new Map<string, string>();
        const areaProvMap = new Map<string, string>();

        if (areasRes.ok) {
          const areasJson = await areasRes.json();
          const areasData: any[] = areasJson?.data || [];
          
          loadedAreas = areasData.map((a: any) => {
            const code = String(a.AreaCode || a.areaCode || "").trim();
            const name = String(a.AreaName || a.areaName || a.AreaCode || "").trim();
            const provCode = String(a.ProvCode || a.provCode || "").trim();
            const region = String(a.Region || a.region || "").trim();

            if (provCode && region) {
              const match = /^R?(\d+)$/i.exec(region);
              if (match) {
                provDivMap.set(provCode.toUpperCase(), `d${match[1]}`.toLowerCase());
              }
            }

            if (code && provCode) {
              areaProvMap.set(code.toUpperCase(), provCode.toUpperCase());
            }

            return { code, name, provCode, region };
          });
        }

        if (provRes.ok) {
          const provJson = await provRes.json();
          const provData: any[] = provJson?.data || [];
          loadedProvinces = provData.map((p: any) => {
            const code = String(p.ProvinceCode || p.provinceCode || "").trim();
            const name = String(p.ProvinceName || p.provinceName || code).trim();
            const region = provDivMap.get(code.toUpperCase()) || "";
            return { code, name, region };
          });
        }

        // Merge Area Engineer companies (Level 50) directly from Oracle glcompm
        if (userCompRes && userCompRes.ok) {
          try {
            const uCompJson = await userCompRes.json();
            const uCompData: any[] = uCompJson?.data || (Array.isArray(uCompJson) ? uCompJson : []);
            uCompData.forEach((item: any) => {
              const rawId = String(item.CompId ?? item.compId ?? item.COMP_ID ?? "").trim();
              const rawName = String(item.CompNm ?? item.CompName ?? item.compNm ?? item.compName ?? item.COMP_NM ?? "").trim();
              if (!rawId) return;

              const cleanName = rawName
                .replace(/^AREA\s*(-|ELECTRICAL\s+ENGINEER\s*(-)?|OFFICE\s*(-)?)\s*/i, "")
                .replace(/\s+AREA\s+OFFICE/i, "")
                .trim() || rawId;

              const provCode = COMPANY_TO_PROVINCE[rawId.toUpperCase()] || "";
              const region = provCode ? provDivMap.get(provCode.toUpperCase()) || "" : "";

              loadedAreas.push({
                code: rawId,
                name: cleanName,
                provCode: provCode,
                region: region,
              });

              if (provCode) {
                areaProvMap.set(rawId.toUpperCase(), provCode.toUpperCase());
              }
            });
          } catch (e) {
            console.warn("Failed to parse Level 50 user companies:", e);
          }
        }

        setProvinces(loadedProvinces);
        setAreas(loadedAreas);
        setProvinceToDivisionMap(provDivMap);
        setAreaToProvinceMap(areaProvMap);
      } catch (err) {
        console.error("IntegratedDashboardHeader: Failed to fetch metadata:", err);
      } finally {
        if (active) setLoadingMetadata(false);
      }
    };

    fetchMetadata();
    return () => {
      active = false;
    };
  }, [user?.Userno]);

  // ── Fetch dynamic areas when a province is selected ─────────────────────────
  useEffect(() => {
    let active = true;

    const fetchFilteredAreas = async () => {
      if (!selectedProvince || selectedProvince === "all") {
        return;
      }
      try {
        setAreasLoading(true);
        const res = await fetch(
          `/misapi/api/ordinary/areas?provCode=${encodeURIComponent(selectedProvince)}`,
          { headers: { Accept: "application/json" } }
        );
        if (!active) return;
        if (res.ok) {
          const json = await res.json();
          const data: any[] = json?.data || [];
          if (data.length > 0) {
            const mappedAreas: AreaItem[] = data.map((a: any) => ({
              code: String(a.AreaCode || a.areaCode || "").trim(),
              name: String(a.AreaName || a.areaName || a.AreaCode || "").trim(),
              provCode: String(a.ProvCode || a.provCode || selectedProvince).trim(),
              region: String(a.Region || a.region || "").trim(),
            }));

            setAreas((prev) => {
              // Merge newly fetched areas with existing areas without duplicates
              const existingCodes = new Set(mappedAreas.map((m) => m.code));
              const nonOverlapping = prev.filter((p) => !existingCodes.has(p.code));
              return [...mappedAreas, ...nonOverlapping];
            });
          }
        }
      } catch (err) {
        console.error("IntegratedDashboardHeader: Failed to fetch province areas:", err);
      } finally {
        if (active) setAreasLoading(false);
      }
    };

    fetchFilteredAreas();
    return () => {
      active = false;
    };
  }, [selectedProvince]);

  // ── Helper: map province code to division ID (d1, d2, d3, d4) ───────────────
  const getProvinceDivision = useCallback(
    (provCode?: string): string | null => {
      if (!provCode || provCode === "all") return null;
      return provinceToDivisionMap.get(provCode.trim().toUpperCase()) || null;
    },
    [provinceToDivisionMap]
  );

  // ── User Permissions / Level checking ───────────────────────────────────────
  const userLevel = user?.Level ?? 0;
  const isHeadquarters = userLevel >= 80 || user?.Company?.toUpperCase().trim() === "DIST";
  const isRegionUser = userLevel >= 70 && userLevel < 80;
  const isProvinceUser = userLevel >= 60 && userLevel < 70;
  const isAreaUser = userLevel > 0 && userLevel < 60;

  // ── Compute user restricted division if any ─────────────────────────────────
  const userRestrictedDivision = useMemo(() => {
    if (isHeadquarters) return null;

    if (user?.Company) {
      const match = /^DISCO(\d+)$/i.exec(user.Company.trim());
      if (match) return `d${match[1]}`.toLowerCase();
    }
    if (user?.RegionCode) {
      const match = /^R?(\d+)$/i.exec(user.RegionCode.trim());
      if (match) return `d${match[1]}`.toLowerCase();
    }
    if (user?.ProvinceCode) {
      return getProvinceDivision(user.ProvinceCode);
    }
    // If area user, try resolve via area/company
    const areaKey = (user?.AreaCode || user?.Company || "").toUpperCase().trim();
    if (areaKey) {
      const resolved = resolveAreaToCompanyId(areaKey);
      const prov = COMPANY_TO_PROVINCE[resolved] || COMPANY_TO_PROVINCE[areaKey];
      if (prov) return getProvinceDivision(prov);
    }
    return null;
  }, [user, isHeadquarters, getProvinceDivision]);

  // ── Filtered Divisions List ─────────────────────────────────────────────────
  const filteredDivisions = useMemo(() => {
    if (isHeadquarters) return DIVISION_OPTIONS;
    if (userRestrictedDivision) {
      return DIVISION_OPTIONS.filter((div) => div.id === userRestrictedDivision);
    }
    return DIVISION_OPTIONS;
  }, [isHeadquarters, userRestrictedDivision]);

  // ── Filtered Provinces List ─────────────────────────────────────────────────
  const filteredProvinces = useMemo(() => {
    let list = provinces;

    // Filter by user permissions first
    if (isProvinceUser || isAreaUser) {
      const targetProv =
        user?.ProvinceCode ||
        (user?.AreaCode ? COMPANY_TO_PROVINCE[resolveAreaToCompanyId(user.AreaCode).toUpperCase()] : "") ||
        (user?.Company ? COMPANY_TO_PROVINCE[resolveAreaToCompanyId(user.Company).toUpperCase()] : "");

      if (targetProv) {
        const pUpper = targetProv.toUpperCase();
        const pAliases = PROV_MATCH[pUpper] || [pUpper];
        return list.filter((p) => pAliases.includes(p.code.toUpperCase()));
      }
    } else if (isRegionUser && user?.RegionCode) {
      const match = /^R?(\d+)$/i.exec(user.RegionCode.trim());
      if (match) {
        const targetDiv = `d${match[1]}`.toLowerCase();
        list = list.filter((p) => provinceToDivisionMap.get(p.code.toUpperCase()) === targetDiv);
      }
    }

    // Filter by selected division dropdown
    if (selectedDivision && selectedDivision !== "all") {
      list = list.filter(
        (p) => provinceToDivisionMap.get(p.code.toUpperCase()) === selectedDivision.toLowerCase()
      );
    }

    return list;
  }, [
    provinces,
    isProvinceUser,
    isAreaUser,
    isRegionUser,
    user,
    selectedDivision,
    provinceToDivisionMap,
  ]);

  // ── Filtered Areas List ─────────────────────────────────────────────────────
  const filteredAreas = useMemo(() => {
    let list = areas;

    // If area user, lock to area
    if (isAreaUser) {
      const targetCodes = [
        user?.AreaCode?.toUpperCase(),
        user?.Company?.toUpperCase(),
        user?.AreaCode ? resolveAreaToCompanyId(user.AreaCode).toUpperCase() : null,
        user?.Company ? resolveAreaToCompanyId(user.Company).toUpperCase() : null,
      ].filter(Boolean) as string[];

      if (targetCodes.length > 0) {
        const matched = list.filter((a) => {
          const c = a.code.toUpperCase();
          return targetCodes.includes(c) || targetCodes.includes(resolveAreaToCompanyId(c).toUpperCase());
        });
        if (matched.length > 0) {
          const uniqueMap = new Map<string, AreaItem>();
          matched.forEach((item) => {
            const normKey = item.name.toUpperCase().replace(/[^A-Z0-9]/g, "");
            if (!uniqueMap.has(normKey)) {
              uniqueMap.set(normKey, item);
            }
          });
          return Array.from(uniqueMap.values()).sort((a, b) => a.name.localeCompare(b.name));
        }

        const fallbackCode = user?.AreaCode || user?.Company || "";
        const fallbackName = user?.AreaName || user?.Company || fallbackCode;
        return [{
          code: fallbackCode,
          name: fallbackName,
          provCode: user?.ProvinceCode || "",
          region: user?.RegionCode || "",
        }];
      }
    }

    // Filter by selected province if selected
    if (selectedProvince && selectedProvince !== "all") {
      const pUpper = selectedProvince.toUpperCase();
      const pAliases = PROV_MATCH[pUpper] || [pUpper];
      list = list.filter(
        (a) => a.provCode && pAliases.includes(a.provCode.toUpperCase())
      );
    } else if (selectedDivision && selectedDivision !== "all") {
      // Filter areas whose parent province belongs to selected division
      list = list.filter((a) => {
        if (!a.provCode) return false;
        return (
          provinceToDivisionMap.get(a.provCode.toUpperCase()) === selectedDivision.toLowerCase()
        );
      });
    }

    // Deduplicate by clean area name
    const uniqueMap = new Map<string, AreaItem>();
    list.forEach((item) => {
      const normKey = item.name.toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (!uniqueMap.has(normKey)) {
        uniqueMap.set(normKey, item);
      }
    });

    return Array.from(uniqueMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [areas, isAreaUser, user, selectedProvince, selectedDivision, provinceToDivisionMap]);

  // ── Auto-sync locked filter values if they don't match user role ──────────
  useEffect(() => {
    if (isRegionUser && userRestrictedDivision && selectedDivision !== userRestrictedDivision) {
      onDivisionChange?.(userRestrictedDivision);
    }
    if (isProvinceUser || isAreaUser) {
      const targetProv =
        user?.ProvinceCode ||
        (user?.AreaCode ? COMPANY_TO_PROVINCE[resolveAreaToCompanyId(user.AreaCode).toUpperCase()] : "") ||
        (user?.Company ? COMPANY_TO_PROVINCE[resolveAreaToCompanyId(user.Company).toUpperCase()] : "");
      if (targetProv && selectedProvince !== targetProv) {
        onProvinceChange?.(targetProv);
      }
    }
    if (isAreaUser) {
      const targetArea = user?.AreaCode || user?.Company || "";
      if (targetArea && selectedArea !== targetArea) {
        onAreaChange?.(targetArea);
      }
    }
  }, [
    isRegionUser,
    isProvinceUser,
    isAreaUser,
    userRestrictedDivision,
    user,
    selectedDivision,
    selectedProvince,
    selectedArea,
    onDivisionChange,
    onProvinceChange,
    onAreaChange,
  ]);

  // ── Cascading Handlers ──────────────────────────────────────────────────────
  const handleDivisionChange = (newDiv: string) => {
    onDivisionChange?.(newDiv);

    // If a province was selected that does not belong to the new division, reset it
    if (selectedProvince && selectedProvince !== "all" && newDiv !== "all") {
      const provDiv = provinceToDivisionMap.get(selectedProvince.toUpperCase());
      if (provDiv !== newDiv) {
        onProvinceChange?.("all");
        onAreaChange?.("all");
      }
    } else if (newDiv === "all") {
      // Keep or allow all
    }
  };

  const handleProvinceChange = (newProv: string) => {
    onProvinceChange?.(newProv);

    // Reset area on province change
    onAreaChange?.("all");

    // Automatically align division if province has known division
    if (newProv && newProv !== "all") {
      const matchingDiv = provinceToDivisionMap.get(newProv.toUpperCase());
      if (matchingDiv && selectedDivision !== matchingDiv) {
        onDivisionChange?.(matchingDiv);
      }
    }
  };

  const handleAreaChange = (newArea: string) => {
    onAreaChange?.(newArea);

    // If an area is chosen and province is "all", auto-align province & division
    if (newArea && newArea !== "all") {
      const parentProv = areaToProvinceMap.get(newArea.toUpperCase());
      if (parentProv && (selectedProvince === "all" || !selectedProvince)) {
        onProvinceChange?.(parentProv);
        const parentDiv = provinceToDivisionMap.get(parentProv.toUpperCase());
        if (parentDiv && selectedDivision !== parentDiv) {
          onDivisionChange?.(parentDiv);
        }
      }
    }
  };

  const handleReset = () => {
    if (onResetFilters) {
      onResetFilters();
      return;
    }
    const defaultDiv = isRegionUser && userRestrictedDivision ? userRestrictedDivision : "all";
    const defaultProv = isProvinceUser && user?.ProvinceCode ? user.ProvinceCode : "all";
    const defaultArea = isAreaUser && user?.AreaCode ? user.AreaCode : "all";

    onDivisionChange?.(defaultDiv);
    onProvinceChange?.(defaultProv);
    onAreaChange?.(defaultArea);
  };

  const hasActiveFilters =
    (selectedDivision && selectedDivision !== "all") ||
    (selectedProvince && selectedProvince !== "all") ||
    (selectedArea && selectedArea !== "all");

  const isDivisionDisabled = isRegionUser || isProvinceUser || isAreaUser;
  const isProvinceDisabled = isProvinceUser || isAreaUser;
  const isAreaDisabled = isAreaUser;

  return (
    <div className={`bg-white border-b border-gray-200 sticky top-0 z-10 transition-all duration-1000 opacity-100 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col justify-center min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 whitespace-nowrap tracking-tight leading-tight">{title}</h1>
            {lastUpdated && (
              <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-gray-400 font-medium">
                <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                <span>Database data as of:</span>
                <span className="font-semibold text-gray-600 font-mono">{lastUpdated}</span>
              </div>
            )}
          </div>
          <div className="ml-auto flex items-center justify-end gap-2.5 flex-shrink-0">
            {/* 1. Province Dropdown */}
            <select
              value={selectedProvince === "all" ? "" : (selectedProvince || "")}
              onChange={(e) => handleProvinceChange(e.target.value || "all")}
              disabled={isProvinceDisabled || loadingMetadata}
              className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#7A0000] focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400 cursor-pointer disabled:cursor-not-allowed max-w-[190px] truncate"
            >
              {loadingMetadata ? (
                <option value="">Loading Provinces...</option>
              ) : (
                <>
                  {!isProvinceDisabled && <option value="">Select Province (All)</option>}
                  {filteredProvinces.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.name}
                    </option>
                  ))}
                </>
              )}
            </select>

            {/* 2. Area Dropdown */}
            <select
              value={selectedArea === "all" ? "" : (selectedArea || "")}
              onChange={(e) => handleAreaChange(e.target.value || "all")}
              disabled={isAreaDisabled || loadingMetadata || areasLoading}
              className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#7A0000] focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400 cursor-pointer disabled:cursor-not-allowed max-w-[190px] truncate"
            >
              {!isAreaDisabled && (
                <option value="">
                  {areasLoading ? "Loading Areas..." : "Select Area (All)"}
                </option>
              )}
              {filteredAreas.map((a) => (
                <option key={a.code} value={a.code}>
                  {a.name}
                </option>
              ))}
            </select>

            {/* 3. Division Pill Buttons */}
            <div className="flex items-center gap-1.5 bg-gray-100 rounded-lg p-1">
              {filteredDivisions.map((division) => {
                const isSelected = (selectedDivision || "all").toLowerCase() === division.id.toLowerCase();

                return (
                  <button
                    key={division.id}
                    type="button"
                    disabled={isDivisionDisabled}
                    onClick={() => handleDivisionChange(division.id)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                      isSelected
                        ? "bg-white shadow-sm text-gray-900"
                        : "text-gray-600 hover:bg-white/50"
                    } ${isDivisionDisabled ? "cursor-default" : "cursor-pointer"}`}
                  >
                    {division.shortLabel || division.label}
                  </button>
                );
              })}
            </div>

            {/* Refresh Live Data Button */}
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={loading}
                title={lastUpdated ? `Refresh data (Database data as of ${lastUpdated})` : "Refresh live data"}
                className="p-1.5 text-gray-400 hover:text-[#7A0000] hover:bg-gray-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            )}

            {/* Optional Reset Filter Button */}
            {showResetButton && hasActiveFilters && (
              <button
                type="button"
                onClick={handleReset}
                title="Reset all filters"
                className="px-2.5 py-1 text-xs font-semibold text-gray-600 hover:text-[#7A0000] bg-gray-100 hover:bg-[#7A0000]/10 rounded-md transition-colors border border-gray-200 cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntegratedDashboardHeader;
