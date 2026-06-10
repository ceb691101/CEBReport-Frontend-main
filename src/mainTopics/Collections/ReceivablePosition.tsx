import React, { useState, useEffect, useRef } from "react";
import { FaFileDownload, FaPrint } from "react-icons/fa";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface BillCycleOption {
  display: string;
  code: string;
}
interface BillTypeOption {
  BillType: string;
  DisplayName: string;
}
interface Province {
  ProvinceCode: string;
  ProvinceName: string;
}
interface Region {
  RegionCode: string;
  RegionName: string;
}
interface Area {
  AreaCode: string;
  AreaName: string;
  // Support multiple possible field names from the API
  ProvinceCode?: string;
  Province?: string;
  PROVINCE_CODE?: string;
  RegionCode?: string;
  Region?: string;
  REGION_CODE?: string;
  [key: string]: string | undefined; // allow arbitrary field access
}
interface ReceivableRecord {
  AreaCode: string;
  AreaName: string;
  OpeningBalance: string;
  MonthlyCharge: string;
  Debits: string;
  Credits: string;
  UnderCharge: string;
  OverCharge: string;
  Payments: string;
  ClosingBalance: string;
  ClosingBalanceWithoutFinAcc: string;
  AverageCharge: string;
  NoOfMonthsInArrears: string;
  NoOfMonthsInArrearsWithoutFinAcc: string;
  BillCycle: string;
  BillType: string;
  ErrorMessage: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const parseNum = (s: string): number => {
  if (!s) return 0;
  return parseFloat(s.replace(/,/g, "")) || 0;
};
const fmtNum = (n: number, decimals = 2): string =>
  n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

/** Legacy bill-cycle label, e.g. "452-2026 Apr" */
const formatLegacyBillCycle = (code: string, display: string): string => {
  const parts = display.split(" - ");
  if (parts.length === 2) {
    const monthParts = parts[1].trim().split(" ");
    if (monthParts.length >= 2) {
      const [mon, yr2] = monthParts;
      return `${code}-20${yr2} ${mon}`;
    }
  }
  return display.replace(" - ", "-");
};

const displayAreaName = (name: string, code: string): string =>
  (name || code).toUpperCase();

const buildAreaNameLookup = (areas: Area[]): Map<string, string> =>
  new Map(areas.map((a) => [a.AreaCode, a.AreaName]));

const enrichAndSortRows = (
  rows: ReceivableRecord[],
  areaLookup: Map<string, string>
): ReceivableRecord[] =>
  rows
    .map((r) => ({
      ...r,
      AreaName: displayAreaName(
        r.AreaName || areaLookup.get(r.AreaCode) || "",
        r.AreaCode
      ),
    }))
    .sort((a, b) => a.AreaName.localeCompare(b.AreaName));

const normalizeAreaList = (list: unknown): Area[] => {
  if (!Array.isArray(list)) return [];
  return list
    .map((a: Record<string, string>) => ({
      AreaCode: a.AreaCode ?? a.areaCode ?? "",
      AreaName: a.AreaName ?? a.areaName ?? "",
    }))
    .filter((a) => a.AreaCode);
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
const ReceivablePosition: React.FC = () => {
  const maroon = "text-[#7A0000]";
  const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";

  // ── Form state ─────────────────────────────────────────────────────────────
  const [billCycle, setBillCycle] = useState<string>("");
  const [billType, setBillType] = useState<string>("");
  const [category, setCategory] = useState<string>("Province");
  const [categoryValue, setCategoryValue] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<string>("");

  // ── Dropdown data ──────────────────────────────────────────────────────────
  const [billCycleOptions, setBillCycleOptions] = useState<BillCycleOption[]>([]);
  const [billTypeOptions, setBillTypeOptions] = useState<BillTypeOption[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [allAreas, setAllAreas] = useState<Area[]>([]);

  // ── Loading states ─────────────────────────────────────────────────────────
  const [isLoadingBillCycles, setIsLoadingBillCycles] = useState(false);
  const [isLoadingBillTypes, setIsLoadingBillTypes] = useState(false);
  const [isLoadingProvinces, setIsLoadingProvinces] = useState(false);
  const [isLoadingRegions, setIsLoadingRegions] = useState(false);
  const [isLoadingAreas, setIsLoadingAreas] = useState(false);

  // ── Error states ───────────────────────────────────────────────────────────
  const [billCycleError, setBillCycleError] = useState<string | null>(null);
  const [billTypeError, setBillTypeError] = useState<string | null>(null);
  const [provinceError, setProvinceError] = useState<string | null>(null);
  const [regionError, setRegionError] = useState<string | null>(null);
  const [areasError, setAreasError] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  // ── Report state ───────────────────────────────────────────────────────────
  const [reportData, setReportData] = useState<ReceivableRecord[]>([]);
  const [reportVisible, setReportVisible] = useState(false);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>("");
  const [selectedBillCycleDisplay, setSelectedBillCycleDisplay] = useState<string>("");
  const [selectedBillTypeName, setSelectedBillTypeName] = useState<string>("");

  const printRef = useRef<HTMLDivElement>(null);

  // ── Generic fetch helper ───────────────────────────────────────────────────
  const fetchJson = async (url: string) => {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try {
        const j = await res.json();
        if (j.errorMessage) msg = j.errorMessage;
      } catch {}
      throw new Error(msg);
    }
    return res.json();
  };

  const parseBillCyclePayload = (
    payload: unknown
  ): { cycles: string[]; maxCycle: string } | null => {
    const data = (payload as { data?: Record<string, unknown> })?.data;
    if (!data) return null;

    const cycles = (data.BillCycles ?? data.billCycles) as string[] | undefined;
    const maxCycle = (data.MaxBillCycle ?? data.maxBillCycle) as string | undefined;

    if (cycles && Array.isArray(cycles) && cycles.length > 0 && maxCycle) {
      return { cycles, maxCycle };
    }
    return null;
  };

  const loadBillCycleOptions = async (customerType: string) => {
    const urls = customerType
      ? [
          `/misapi/api/receivable-position/billcycle/max?billType=${encodeURIComponent(customerType)}`,
          ...(customerType === "B"
            ? ["/misapi/api/bulk/mon_tot/billcycle/max"]
            : []),
        ]
      : ["/misapi/api/receivable-position/billcycle/max"];

    for (const url of urls) {
      try {
        const res = await fetchJson(url);
        const parsed = parseBillCyclePayload(res);
        if (parsed) return parsed;
      } catch (err) {
        console.warn(`[ReceivablePosition] Bill cycle fetch failed for ${url}:`, err);
      }
    }

    return null;
  };

  // ── 1. Bill cycles (reload when customer type changes) ─────────────────────
  useEffect(() => {
    const load = async () => {
      setIsLoadingBillCycles(true);
      setBillCycleError(null);
      try {
        const parsed = await loadBillCycleOptions(billType);
        if (parsed) {
          const max = parseInt(parsed.maxCycle, 10);
          const opts: BillCycleOption[] = parsed.cycles.map((c: string, i: number) => ({
            display: `${max - i} - ${c}`,
            code: String(max - i),
          }));
          setBillCycleOptions(opts);
          setBillCycle((current) =>
            current && opts.some((o) => o.code === current) ? current : ""
          );
          if (opts.length === 0) setBillCycleError("No bill cycles available");
        } else {
          setBillCycleOptions([]);
          setBillCycle("");
          setBillCycleError(
            billType === "B"
              ? "No bill cycles available for Bulk customers."
              : "Invalid bill cycle data format"
          );
        }
      } catch (e: any) {
        setBillCycleError(e.message || "Failed to load bill cycles");
      } finally {
        setIsLoadingBillCycles(false);
      }
    };
    load();
  }, [billType]);

  // ── 2. Bill types ──────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setIsLoadingBillTypes(true);
      setBillTypeError(null);
      try {
        const res = await fetchJson(`/misapi/api/receivable-position/bill-types`);
        setBillTypeOptions(res.data || []);
      } catch (e: any) {
        setBillTypeError(e.message || "Failed to load bill types");
      } finally {
        setIsLoadingBillTypes(false);
      }
    };
    load();
  }, []);

  // ── 3. Provinces + Regions (when billType changes) ────────────────────────
  // Areas are NOT pre-loaded here. Instead they are fetched on demand
  // at submit time using province-specific or region-specific endpoints.
  useEffect(() => {
    if (!billType) {
      setProvinces([]);
      setRegions([]);
      setAllAreas([]);
      return;
    }

    const provinceUrl =
      billType === "O"
        ? `/misapi/api/ordinary/province`
        : `/misapi/api/bulk/province`;
    const regionUrl =
      billType === "O"
        ? `/misapi/api/ordinary/region`
        : `/misapi/api/bulk/region`;
    // All-areas endpoint — used ONLY for CEB Entire
    const areasUrl =
      billType === "O"
        ? `/misapi/api/ordinary/areas`
        : `/misapi/api/bulk/areas`;

    // Provinces
    setIsLoadingProvinces(true);
    setProvinceError(null);
    fetchJson(provinceUrl)
      .then((res) => {
        const list: Province[] = res.data || [];
        list.sort((a, b) =>
          (a.ProvinceName || "").localeCompare(b.ProvinceName || "")
        );
        setProvinces(list);
      })
      .catch((e: any) =>
        setProvinceError(e.message || "Failed to load provinces")
      )
      .finally(() => setIsLoadingProvinces(false));

    // Regions
    setIsLoadingRegions(true);
    setRegionError(null);
    fetchJson(regionUrl)
      .then((res) => setRegions(res.data || []))
      .catch((e: any) =>
        setRegionError(e.message || "Failed to load regions")
      )
      .finally(() => setIsLoadingRegions(false));

    // Pre-load all areas only for CEB Entire support
    setIsLoadingAreas(true);
    setAreasError(null);
    fetchJson(areasUrl)
      .then((res) => {
        const areas: Area[] = res.data || [];
        setAllAreas(areas);
        console.log(
          `[ReceivablePosition] Loaded ${areas.length} areas. Keys:`,
          areas.length > 0 ? Object.keys(areas[0]) : "none"
        );
      })
      .catch((e: any) => {
        setAreasError(e.message || "Failed to load areas");
        setAllAreas([]);
      })
      .finally(() => setIsLoadingAreas(false));
  }, [billType]);

  // ── Reset category value on category or billType change ────────────────────
  useEffect(() => {
    setCategoryValue("");
    setSelectedCategoryName("");
  }, [category, billType]);

  // ── Guards ─────────────────────────────────────────────────────────────────
  const isCategoryValueDisabled = () => {
    if (!billCycle || !billType) return true;
    if (category === "Province")
      return isLoadingProvinces || provinceError !== null;
    if (category === "Region")
      return isLoadingRegions || regionError !== null;
    return false;
  };

  const canSubmit = () => {
    if (!billCycle || !billType) return false;
    if (isLoadingAreas) return false; // wait for areas to finish loading
    if (category === "CEB Entire") return true;
    return !!categoryValue;
  };

  // ── Totals ─────────────────────────────────────────────────────────────────
  const sum = (field: keyof ReceivableRecord) =>
    reportData.reduce((acc, r) => acc + parseNum(r[field] as string), 0);

  // ── Resolve areas for a province (with fallbacks) ─────────────────────────
  const fetchAreasForProvince = async (
    provinceCode: string
  ): Promise<Area[]> => {
    const primaryUrl =
      `/misapi/api/receivable-position/areas-by-province` +
      `?provinceCode=${encodeURIComponent(provinceCode)}` +
      `&billType=${encodeURIComponent(billType)}` +
      `&billCycle=${encodeURIComponent(billCycle)}`;

    try {
      const res = await fetchJson(primaryUrl);
      const areas = normalizeAreaList(res.data);
      if (areas.length > 0) return areas;
    } catch (err) {
      console.warn("[ReceivablePosition] areas-by-province failed:", err);
    }

    if (billType !== "B") {
      try {
        const res = await fetchJson(
          `/misapi/api/customerdetails/pos-areas?provCode=${encodeURIComponent(provinceCode)}`
        );
        const list = res.data?.areas ?? res.data?.Areas ?? res.data;
        const areas = normalizeAreaList(list);
        if (areas.length > 0) return areas;
      } catch (err) {
        console.warn("[ReceivablePosition] pos-areas fallback failed:", err);
      }
    }

    if (allAreas.length > 0) {
      const padded = provinceCode.padStart(2, "0");
      const fromPreload = allAreas.filter((a) => {
        const prov =
          a.ProvinceCode ?? a.Province ?? a.PROVINCE_CODE ?? "";
        return (
          prov === provinceCode ||
          prov === padded ||
          prov.padStart(2, "0") === padded
        );
      });
      if (fromPreload.length > 0) return fromPreload;
    }

    return [];
  };

  // ── Resolve areas for a region (with fallbacks) ───────────────────────────
  const fetchAreasForRegion = async (regionCode: string): Promise<Area[]> => {
    const primaryUrl =
      `/misapi/api/receivable-position/areas-by-region` +
      `?regionCode=${encodeURIComponent(regionCode)}` +
      `&billType=${encodeURIComponent(billType)}` +
      `&billCycle=${encodeURIComponent(billCycle)}`;

    try {
      const res = await fetchJson(primaryUrl);
      const areas = normalizeAreaList(res.data);
      if (areas.length > 0) return areas;
    } catch (err) {
      console.warn("[ReceivablePosition] areas-by-region failed:", err);
    }

    return [];
  };

  // ── Core: fetch one area's data ────────────────────────────────────────────
  const fetchAreaData = async (
    areaCode: string
  ): Promise<ReceivableRecord[]> => {
    try {
      const url = `/misapi/api/receivable-position/report?billCycle=${billCycle}&areaCode=${areaCode}&billType=${billType}`;
      const data = await fetchJson(url);
      if (data.data && Array.isArray(data.data)) return data.data;
    } catch (e) {
      console.warn(
        `[ReceivablePosition] Failed to fetch data for area ${areaCode}:`,
        e
      );
    }
    return [];
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit()) return;

    setLoading(true);
    setReportError(null);
    setReportData([]);

    try {
      let combined: ReceivableRecord[] = [];

      let areaLookup = new Map<string, string>();

      if (category === "Province") {
        setLoadingStatus("Fetching areas for province...");
        const provinceAreas = await fetchAreasForProvince(categoryValue);
        const provinceName =
          provinces.find((p) => p.ProvinceCode === categoryValue)?.ProvinceName ??
          categoryValue;

        if (provinceAreas.length === 0) {
          setReportError(`No areas found for province "${provinceName}".`);
          setLoading(false);
          return;
        }

        areaLookup = buildAreaNameLookup(provinceAreas);

        for (let i = 0; i < provinceAreas.length; i++) {
          setLoadingStatus(`Fetching area ${i + 1} of ${provinceAreas.length}...`);
          const rows = await fetchAreaData(provinceAreas[i].AreaCode);
          combined = [...combined, ...rows];
        }

        const p = provinces.find((p) => p.ProvinceCode === categoryValue);
        setSelectedCategoryName(p?.ProvinceName ?? categoryValue);

      } else if (category === "Region") {
        setLoadingStatus("Fetching areas for region...");
        const regionAreas = await fetchAreasForRegion(categoryValue);
        const regionName =
          regions.find((r) => r.RegionCode === categoryValue)?.RegionName ??
          categoryValue;

        if (regionAreas.length === 0) {
          setReportError(`No areas found for region "${regionName}".`);
          setLoading(false);
          return;
        }

        areaLookup = buildAreaNameLookup(regionAreas);

        for (let i = 0; i < regionAreas.length; i++) {
          setLoadingStatus(`Fetching area ${i + 1} of ${regionAreas.length}...`);
          const rows = await fetchAreaData(regionAreas[i].AreaCode);
          combined = [...combined, ...rows];
        }

        const r = regions.find((r) => r.RegionCode === categoryValue);
        setSelectedCategoryName(r?.RegionName ?? categoryValue);

      } else {
        if (allAreas.length === 0) {
          setReportError(
            "Area list is empty or still loading. Please wait a moment and try again."
          );
          setLoading(false);
          return;
        }

        areaLookup = buildAreaNameLookup(allAreas);

        for (let i = 0; i < allAreas.length; i++) {
          setLoadingStatus(`Fetching area ${i + 1} of ${allAreas.length}...`);
          const rows = await fetchAreaData(allAreas[i].AreaCode);
          combined = [...combined, ...rows];
        }
        setSelectedCategoryName("CEB Entire");
      }

      setLoadingStatus("");

      if (combined.length > 0) {
        setReportData(enrichAndSortRows(combined, areaLookup));
        setReportVisible(true);
        const bt = billTypeOptions.find((b) => b.BillType === billType);
        setSelectedBillTypeName(bt?.DisplayName ?? billType);
        const opt = billCycleOptions.find((o) => o.code === billCycle);
        setSelectedBillCycleDisplay(
          opt
            ? formatLegacyBillCycle(opt.code, opt.display)
            : billCycle
        );
      } else {
        setReportError("No data available for the selected criteria.");
      }
    } catch (e: any) {
      setReportError(e.message || "Failed to generate report.");
    } finally {
      setLoading(false);
      setLoadingStatus("");
    }
  };

  // ── CSV Export ─────────────────────────────────────────────────────────────
  const downloadAsCSV = () => {
    if (!reportData.length) return;
    const headers = [
      "#",
      "Area",
      "Opening Balance",
      "Monthly Charge",
      "Debits",
      "Credits",
      "Under Charge",
      "Over Charge",
      "Payments",
      "Closing Balance",
      "Closing Balance (Without Fin.Acc.)",
      "Average Charge",
      "No Of Months in Arrears",
      "No of Months in Arrears (Without Fin.Acc.)",
    ];
    const rows = reportData.map((r, i) => [
      String(i + 1),
      r.AreaName || r.AreaCode,
      r.OpeningBalance,
      r.MonthlyCharge,
      r.Debits,
      r.Credits,
      r.UnderCharge,
      r.OverCharge,
      r.Payments,
      r.ClosingBalance,
      r.ClosingBalanceWithoutFinAcc,
      r.AverageCharge,
      r.NoOfMonthsInArrears,
      r.NoOfMonthsInArrearsWithoutFinAcc,
    ]);
    const totalsRow = [
      "",
      "TOTAL",
      fmtNum(sum("OpeningBalance")),
      fmtNum(sum("MonthlyCharge")),
      fmtNum(sum("Debits")),
      fmtNum(sum("Credits")),
      fmtNum(sum("UnderCharge")),
      fmtNum(sum("OverCharge")),
      fmtNum(sum("Payments")),
      fmtNum(sum("ClosingBalance")),
      fmtNum(sum("ClosingBalanceWithoutFinAcc")),
      fmtNum(sum("AverageCharge")),
      fmtNum(sum("NoOfMonthsInArrears"), 4),
      fmtNum(sum("NoOfMonthsInArrearsWithoutFinAcc"), 4),
    ];
    const csv = [
      [`Area wise receivable position for ${selectedCategoryName}`],
      [`Month : ${selectedBillCycleDisplay}`],
      [`Customer Category : ${selectedBillTypeName} Customers`],
      [],
      headers,
      ...rows,
      totalsRow,
    ]
      .map((row) => row.map((c) => `"${c}"`).join(","))
      .join("\n");

    const link = document.createElement("a");
    link.href = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" })
    );
    link.download = `ReceivablePosition_${billCycle}_${billType}_${category}.csv`;
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── Print PDF ──────────────────────────────────────────────────────────────
  const printPDF = () => {
    if (!printRef.current) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`
      <html><head>
        <title>Area wise receivable position</title>
        <style>
          body  { font-family: Arial, sans-serif; font-size: 9px; margin: 8mm; }
          h2    { color: #7A0000; font-size: 12px; margin-bottom: 4px; font-weight: bold; }
          .meta { font-size: 10px; margin-bottom: 10px; line-height: 1.6; }
          .meta span { font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-top: 6px; }
          th    { background: #b0e0e8; font-weight: bold; text-align: center;
                  padding: 4px 3px; border: 1px solid #aaa; font-size: 8px; }
          td    { padding: 3px 3px; border: 1px solid #ccc; font-size: 8px; }
          tr.row-even td { background: #d6e8ff; }
          tr.row-odd td { background: #e9dff5; }
          tr.tr-total td { background: #d3d3d3; font-weight: bold; }
          .r { text-align: right; }
          .note { font-size: 9px; margin-top: 10px; color: #800080; }
          @page { size: landscape; margin: 8mm;
            @bottom-left  { content: "Generated: ${new Date().toLocaleString()} | Reporting@2026"; font-size:8px; color:#666; }
            @bottom-right { content: "Page " counter(page) " of " counter(pages); font-size:8px; color:#666; }
          }
        </style>
      </head><body>
        <h2>Area wise receivable position for ${selectedCategoryName}</h2>
        <div class="meta">
          Month : &nbsp;<span>${selectedBillCycleDisplay}</span><br/>
          Customer Category : &nbsp;<span>${selectedBillTypeName} Customers</span>
        </div>
        ${printRef.current.innerHTML}
        <div class="note">
          Net bill = monthly charge + under charge - over charge<br/>
          Monthly charge = kwh charge + fixed charge + fac
        </div>
      </body></html>
    `);
    w.document.close();
    w.focus();
    setTimeout(() => {
      w.print();
      w.close();
    }, 500);
  };

  // ── Table ──────────────────────────────────────────────────────────────────
  const renderTable = () => {
    if (!reportData.length)
      return (
        <div className="text-center py-10 text-gray-500 text-sm">
          No records found.
        </div>
      );

    const cols: {
      label: string;
      key: keyof ReceivableRecord;
      dec?: number;
    }[] = [
      { label: "Opening Balance", key: "OpeningBalance" },
      { label: "Monthly Charge", key: "MonthlyCharge" },
      { label: "Debits", key: "Debits" },
      { label: "Credits", key: "Credits" },
      { label: "Under Charge", key: "UnderCharge" },
      { label: "Over Charge", key: "OverCharge" },
      { label: "Payments", key: "Payments" },
      { label: "Closing Balance", key: "ClosingBalance" },
      {
        label: "Closing Balance (Without Fin.Acc.)",
        key: "ClosingBalanceWithoutFinAcc",
      },
      { label: "Average Charge", key: "AverageCharge" },
      {
        label: "No Of Months in Arrears",
        key: "NoOfMonthsInArrears",
        dec: 4,
      },
      {
        label: "No of Months in Arrears (Without Fin.Acc.)",
        key: "NoOfMonthsInArrearsWithoutFinAcc",
        dec: 4,
      },
    ];

    const rowBgColor = (i: number) => (i % 2 === 0 ? "#d6e8ff" : "#e9dff5");

    return (
      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr className="bg-[#b0e0e8] text-gray-800">
            <th className="border border-gray-400 px-1 py-2 text-center font-bold w-8">
              #
            </th>
            <th className="border border-gray-400 px-2 py-2 text-center font-bold whitespace-nowrap min-w-[140px]">
              Area
            </th>
            {cols.map((c) => (
              <th
                key={c.key}
                className="border border-gray-400 px-2 py-2 text-center font-bold whitespace-nowrap"
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {reportData.map((r, i) => (
            <tr
              key={`${r.AreaCode}-${i}`}
              style={{ backgroundColor: rowBgColor(i) }}
            >
              <td className="border border-gray-400 px-1 py-1 text-center">
                {i + 1}
              </td>
              <td className="border border-gray-400 px-2 py-1 whitespace-nowrap font-medium">
                {r.AreaName || r.AreaCode}
              </td>
              {cols.map((c) => (
                <td
                  key={c.key}
                  className="border border-gray-400 px-2 py-1 text-right font-mono"
                >
                  {(r[c.key] as string) || "0.00"}
                </td>
              ))}
            </tr>
          ))}
          <tr className="bg-[#d3d3d3] font-bold">
            <td className="border border-gray-400 px-1 py-1" />
            <td className="border border-gray-400 px-2 py-1 text-center font-bold">
              TOTAL
            </td>
            {cols.map((c) => (
              <td
                key={c.key}
                className="border border-gray-400 px-2 py-1 text-right font-mono font-bold"
              >
                {fmtNum(sum(c.key), c.dec ?? 2)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // JSX
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      {/* ── FORM ──────────────────────────────────────────────────────────── */}
      {!reportVisible && (
        <>
          <div className="mb-6">
            <h2 className={`text-xl font-bold ${maroon}`}>
              Receivable Position
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Bill Cycle */}
              <div className="flex flex-col">
                <label className={`text-xs font-medium mb-1 ${maroon}`}>
                  Month <span className="text-red-600">*</span>
                </label>
                {isLoadingBillCycles ? (
                  <div className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-gray-50 text-gray-500">
                    Loading bill cycles...
                  </div>
                ) : billCycleError ? (
                  <div className="w-full px-2 py-1.5 text-xs border border-red-300 rounded-md bg-red-50 text-red-600">
                    {billCycleError}
                  </div>
                ) : (
                  <select
                    value={billCycle}
                    onChange={(e) => setBillCycle(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent"
                    required
                  >
                    <option value="">Select Month</option>
                    {billCycleOptions.map((o) => (
                      <option key={o.code} value={o.code}>
                        {o.display}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Customer Type */}
              <div className="flex flex-col">
                <label
                  className={`text-xs font-medium mb-1 ${
                    !billCycle ? "text-gray-400" : maroon
                  }`}
                >
                  Customer Type <span className="text-red-600">*</span>
                </label>
                {isLoadingBillTypes ? (
                  <div className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-gray-50 text-gray-500">
                    Loading customer types...
                  </div>
                ) : billTypeError ? (
                  <div className="w-full px-2 py-1.5 text-xs border border-red-300 rounded-md bg-red-50 text-red-600">
                    {billTypeError}
                  </div>
                ) : (
                  <select
                    value={billType}
                    onChange={(e) => setBillType(e.target.value)}
                    disabled={!billCycle}
                    className={`w-full px-2 py-1.5 text-xs border rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent ${
                      !billCycle
                        ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                        : "border-gray-300"
                    }`}
                    required
                  >
                    <option value="">Select Customer Type</option>
                    {billTypeOptions.map((b) => (
                      <option key={b.BillType} value={b.BillType}>
                        {b.DisplayName} Customers
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Province / Region / CEB Entire */}
              <div className="flex flex-col">
                <label
                  className={`text-xs font-medium mb-1 ${
                    !billType ? "text-gray-400" : maroon
                  }`}
                >
                  Province / Region / CEB{" "}
                  <span className="text-red-600">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={!billType}
                  className={`w-full px-2 py-1.5 text-xs border rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent ${
                    !billType
                      ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                      : "border-gray-300"
                  }`}
                >
                  <option value="Province">Province</option>
                  <option value="Region">Region</option>
                  <option value="CEB Entire">CEB Entire</option>
                </select>
              </div>
            </div>

            {/* Row 2 — Province / Region value */}
            {category !== "CEB Entire" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col">
                  <label
                    className={`text-xs font-medium mb-1 ${
                      isCategoryValueDisabled() ? "text-gray-400" : maroon
                    }`}
                  >
                    Select {category} <span className="text-red-600">*</span>
                  </label>

                  {category === "Province" &&
                    (isLoadingProvinces ? (
                      <div className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-gray-50 text-gray-500">
                        Loading provinces...
                      </div>
                    ) : provinceError ? (
                      <div className="w-full px-2 py-1.5 text-xs border border-red-300 rounded-md bg-red-50 text-red-600">
                        {provinceError}
                      </div>
                    ) : (
                      <select
                        value={categoryValue}
                        onChange={(e) => setCategoryValue(e.target.value)}
                        disabled={isCategoryValueDisabled()}
                        className={`w-full px-2 py-1.5 text-xs border rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent ${
                          isCategoryValueDisabled()
                            ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                            : "border-gray-300"
                        }`}
                        required
                      >
                        <option value="">Select Province</option>
                        {provinces.map((p) => (
                          <option key={p.ProvinceCode} value={p.ProvinceCode}>
                            {p.ProvinceName}
                          </option>
                        ))}
                      </select>
                    ))}

                  {category === "Region" &&
                    (isLoadingRegions ? (
                      <div className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-gray-50 text-gray-500">
                        Loading regions...
                      </div>
                    ) : regionError ? (
                      <div className="w-full px-2 py-1.5 text-xs border border-red-300 rounded-md bg-red-50 text-red-600">
                        {regionError}
                      </div>
                    ) : (
                      <select
                        value={categoryValue}
                        onChange={(e) => setCategoryValue(e.target.value)}
                        disabled={isCategoryValueDisabled()}
                        className={`w-full px-2 py-1.5 text-xs border rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent ${
                          isCategoryValueDisabled()
                            ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                            : "border-gray-300"
                        }`}
                        required
                      >
                        <option value="">Select Region</option>
                        {regions.map((r) => (
                          <option key={r.RegionCode} value={r.RegionCode}>
                            {r.RegionCode} - {r.RegionName}
                          </option>
                        ))}
                      </select>
                    ))}
                </div>
              </div>
            )}

            {/* Areas loading indicator */}
            {billType && isLoadingAreas && (
              <p className="text-xs text-gray-400 italic">
                Loading area list...
              </p>
            )}
            {billType && areasError && (
              <p className="text-xs text-red-500">
                ⚠ Area list failed to load: {areasError}. Province/Region/CEB
                Entire features may not work correctly.
              </p>
            )}

            {/* Submit */}
            <div className="w-full mt-6 flex justify-end">
              <button
                type="submit"
                disabled={loading || !canSubmit()}
                className={`px-6 py-2 rounded-md font-medium transition-opacity duration-300 shadow ${maroonGrad} text-white ${
                  loading || !canSubmit()
                    ? "opacity-70 cursor-not-allowed"
                    : "hover:opacity-90"
                }`}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="animate-spin h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    {loadingStatus || "Loading..."}
                  </span>
                ) : (
                  "Generate Report"
                )}
              </button>
            </div>
          </form>

          {reportError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {reportError}
            </div>
          )}
        </>
      )}

      {/* ── REPORT ────────────────────────────────────────────────────────── */}
      {reportVisible && (
        <div className="mt-2">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
            <div>
              <h2 className={`text-lg font-bold ${maroon}`}>
                Area wise receivable position for {selectedCategoryName}
              </h2>
              <p className="text-sm text-gray-700 mt-2">
                Month : <span className="font-semibold">{selectedBillCycleDisplay}</span>
              </p>
              <p className="text-sm text-gray-700">
                Customer Category :{" "}
                <span className="font-semibold">
                  {selectedBillTypeName} Customers
                </span>
              </p>
            </div>
            <div className="flex space-x-2 mt-2 md:mt-0">
              <button
                onClick={downloadAsCSV}
                className="flex items-center gap-1 px-3 py-1.5 border border-blue-400 text-blue-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
              >
                <FaFileDownload className="w-3 h-3" /> CSV
              </button>
              <button
                onClick={printPDF}
                className="flex items-center gap-1 px-3 py-1.5 border border-green-400 text-green-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-200 transition"
              >
                <FaPrint className="w-3 h-3" /> PDF
              </button>
              <button
                onClick={() => {
                  setReportVisible(false);
                  setReportError(null);
                  setReportData([]);
                }}
                className="px-4 py-1.5 bg-[#7A0000] hover:bg-[#A52A2A] text-xs rounded-md text-white"
              >
                Back to Form
              </button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[calc(100vh-250px)] border border-gray-400">
            <div ref={printRef} className="min-w-full">
              {renderTable()}
            </div>
          </div>

          <div className="mt-3 text-xs text-purple-700 space-y-0.5">
            <p>Net bill = monthly charge + under charge - over charge</p>
            <p>Monthly charge = kwh charge + fixed charge + fac</p>
          </div>

          {reportError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {reportError}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReceivablePosition;