import React, { useState, useEffect, useCallback } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface BillCycleOption {
  display: string; // "438 - Jan 2026"
  code: string;    // "438"
}

interface ProvinceOption {
  ProvCode: string;
  ProvName: string;
}

interface RegionOption {
  RegionCode: string;
  RegionName: string;
}

interface ReceivePositionRow {
  areaCode: string;
  areaName: string;
  billCycle: string;
  billType: string;
  openingBalance: number;
  monthlyCharge: number;
  debits: number;
  credits: number;
  underCharge: number;
  overCharge: number;
  payments: number;
  closingBalance: number;
  closingBalanceWithoutFinAcc: number;
  averageCharge: number;
  noOfMonthsInArrears: number;
  noOfMonthsInArrearsWithoutFinAcc: number;
  errorMessage?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const fmt = (num: number, decimals = 2) =>
  num.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

async function apiFetch<T>(url: string): Promise<{ data: T | null; errorMessage: string | null }> {
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) {
      if (res.status === 404) throw new Error("API endpoint not found (404).");
      if (res.status === 500) throw new Error("Database error (500).");
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    const ct = res.headers.get("content-type");
    if (!ct || !ct.includes("application/json"))
      throw new Error(`Expected JSON but got ${ct}`);
    return await res.json();
  } catch (err: any) {
    if (err.name === "AbortError")
      return { data: null, errorMessage: "Request timeout." };
    if (err.message?.includes("Failed to fetch"))
      return { data: null, errorMessage: "Cannot connect to server." };
    return { data: null, errorMessage: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
const ReceivePosition: React.FC = () => {
  const maroon = "text-[#7A0000]";
  const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";
  const selectCls =
    "w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent";
  const disabledSelectCls =
    "w-full px-2 py-1.5 text-xs border border-gray-200 rounded-md bg-gray-100 text-gray-400 cursor-not-allowed";

  // ── Form state ─────────────────────────────────────────────────────────────
  const [billCycle, setBillCycle] = useState("");
  const [billType, setBillType] = useState("");          // "O" | "B"
  const [locationCategory, setLocationCategory] = useState(""); // "Province" | "Region" | "CEB"
  const [selectedProvince, setSelectedProvince] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("");

  // ── Dropdown data ──────────────────────────────────────────────────────────
  const [billCycleOptions, setBillCycleOptions] = useState<BillCycleOption[]>([]);
  const [provinces, setProvinces] = useState<ProvinceOption[]>([]);
  const [regions, setRegions] = useState<RegionOption[]>([]);

  // ── Loading states ─────────────────────────────────────────────────────────
  const [loadingBillCycles, setLoadingBillCycles] = useState(false);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingRegions, setLoadingRegions] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);

  // ── Error states ───────────────────────────────────────────────────────────
  const [billCycleError, setBillCycleError] = useState<string | null>(null);
  const [provinceError, setProvinceError] = useState<string | null>(null);
  const [regionError, setRegionError] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  // ── Report state ───────────────────────────────────────────────────────────
  const [reportData, setReportData] = useState<ReceivePositionRow[]>([]);
  const [reportVisible, setReportVisible] = useState(false);
  const [reportMeta, setReportMeta] = useState({ billCycleDisplay: "", areaName: "", billType: "" });

  // ── Derived: effective area code sent to the API ───────────────────────────
  // Province → provCode  (DAO expands to all areas in that province via sub-query)
  // Region   → regionCode
  // CEB      → "CEB"
  const effectiveAreaCode =
    locationCategory === "Province" ? selectedProvince
    : locationCategory === "Region"   ? selectedRegion
    : locationCategory === "CEB"      ? "CEB"
    : "";

  // Human-readable label for report header
  const effectiveAreaLabel =
    locationCategory === "Province"
      ? provinces.find(p => p.ProvCode === selectedProvince)?.ProvName ?? selectedProvince
      : locationCategory === "Region"
      ? regions.find(r => r.RegionCode === selectedRegion)?.RegionName ?? selectedRegion
      : locationCategory === "CEB"
      ? "CEB Entire"
      : "";

  const canSubmit = !!billCycle && !!billType && !!effectiveAreaCode;

  // ── 1. Fetch bill cycles on mount ──────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoadingBillCycles(true);
      setBillCycleError(null);
      try {
        const res = await apiFetch<any>(`/misapi/api/contract-demand/bill-cycles`);
        if (res.errorMessage) { setBillCycleError(res.errorMessage); return; }
        const cyclesArr = res.data?.BillCycles ?? res.data?.billCycles;
        const maxCycle  = res.data?.MaxBillCycle ?? res.data?.maxBillCycle;
        if (cyclesArr && Array.isArray(cyclesArr) && maxCycle) {
          const maxNum = parseInt(maxCycle, 10);
          const opts: BillCycleOption[] = cyclesArr.map((label: string, i: number) => ({
            display: `${maxNum - i} - ${label}`,
            code: String(maxNum - i),
          }));
          setBillCycleOptions(opts);
        } else {
          setBillCycleError("Invalid bill cycle data format.");
        }
      } catch (e: any) {
        setBillCycleError(e.message);
      } finally {
        setLoadingBillCycles(false);
      }
    };
    load();
  }, []);

  // ── 2. Fetch provinces from prov_servers via dropdowns endpoint ────────────
  //    Triggered when billType is set (provinces are not bill-type-specific,
  //    but we wait until step 2 so the cascade feels natural).
  useEffect(() => {
    if (!billType) {
      setProvinces([]);
      setRegions([]);
      setLocationCategory("");
      setSelectedProvince("");
      setSelectedRegion("");
      return;
    }

    const load = async () => {
      setLoadingProvinces(true);
      setProvinceError(null);
      setProvinces([]);
      try {
        // The dropdowns endpoint returns { data: { Provinces: [...], Areas: [...], ... } }
        const res = await apiFetch<any>(`/misapi/apicollection/receive-position-dropdowns`);
        if (res.errorMessage) { setProvinceError(res.errorMessage); return; }

        const raw: any[] = res.data?.Provinces ?? res.data?.provinces ?? [];
        setProvinces(
          raw.map((p: any) => ({
            ProvCode: p.ProvCode ?? p.provCode ?? "",
            ProvName: p.ProvName ?? p.provName ?? "",
          }))
        );
      } catch (e: any) {
        setProvinceError(e.message);
      } finally {
        setLoadingProvinces(false);
      }
    };
    load();
  }, [billType]);

  // ── 3. Fetch regions when Region category is chosen ────────────────────────
  useEffect(() => {
    if (!billType || locationCategory !== "Region") {
      setRegions([]);
      setSelectedRegion("");
      return;
    }

    const typePrefix = billType === "O" ? "ordinary" : "bulk";
    const load = async () => {
      setLoadingRegions(true);
      setRegionError(null);
      setRegions([]);
      setSelectedRegion("");
      try {
        const res = await apiFetch<any>(`/misapi/api/${typePrefix}/region`);
        if (res.errorMessage) { setRegionError(res.errorMessage); return; }
        const raw = res.data ?? [];
        setRegions(
          raw.map((r: any) => ({
            RegionCode: r.RegionCode ?? r.regionCode ?? "",
            RegionName: r.RegionName ?? r.regionName ?? "",
          }))
        );
      } catch (e: any) {
        setRegionError(e.message);
      } finally {
        setLoadingRegions(false);
      }
    };
    load();
  }, [billType, locationCategory]);

  // ── Reset sub-selections when locationCategory changes ────────────────────
  useEffect(() => {
    setSelectedProvince("");
    setSelectedRegion("");
  }, [locationCategory]);

  // ── 4. Generate report ─────────────────────────────────────────────────────
  const handleGenerateReport = useCallback(async () => {
    if (!canSubmit) return;
    setLoadingReport(true);
    setReportError(null);

    try {
      const url = `/apicollection/receive-position?billCycle=${encodeURIComponent(billCycle)}&billType=${encodeURIComponent(billType)}&areaCode=${encodeURIComponent(effectiveAreaCode)}`;
      console.log("[ReceivePosition] Fetching:", url);
      const res = await apiFetch<any[]>(url);
      console.log("[ReceivePosition] Response:", res);

      if (res.errorMessage) { setReportError(`API error: ${res.errorMessage}`); return; }

      const raw: any[] = Array.isArray(res.data) ? res.data : [];
      console.log("[ReceivePosition] Raw rows:", raw.length, raw[0]);
      const n = (v: any) => (v === null || v === undefined ? 0 : Number(v));
      const s = (a: any, b: any, fallback = "") =>
        a !== null && a !== undefined ? String(a) : b !== null && b !== undefined ? String(b) : fallback;

      const mapped: ReceivePositionRow[] = raw.map((r: any) => ({
        areaCode:  s(r.AreaCode,  r.areaCode,  effectiveAreaCode),
        areaName:  s(r.AreaName,  r.areaName,  effectiveAreaCode),
        billCycle: s(r.BillCycle, r.billCycle, billCycle),
        billType:  s(r.BillType,  r.billType,  billType),
        openingBalance:                   n(r.OpeningBalance                   ?? r.openingBalance),
        monthlyCharge:                    n(r.MonthlyCharge                    ?? r.monthlyCharge),
        debits:                           n(r.Debits                           ?? r.debits),
        credits:                          n(r.Credits                          ?? r.credits),
        underCharge:                      n(r.UnderCharge                      ?? r.underCharge),
        overCharge:                       n(r.OverCharge                       ?? r.overCharge),
        payments:                         n(r.Payments                         ?? r.payments),
        closingBalance:                   n(r.ClosingBalance                   ?? r.closingBalance),
        closingBalanceWithoutFinAcc:      n(r.ClosingBalanceWithoutFinAcc      ?? r.closingBalanceWithoutFinAcc),
        averageCharge:                    n(r.AverageCharge                    ?? r.averageCharge),
        noOfMonthsInArrears:              n(r.NoOfMonthsInArrears              ?? r.noOfMonthsInArrears),
        noOfMonthsInArrearsWithoutFinAcc: n(r.NoOfMonthsInArrearsWithoutFinAcc ?? r.noOfMonthsInArrearsWithoutFinAcc),
        errorMessage: s(r.ErrorMessage, r.errorMessage, ""),
      }));

      const bcDisplay = billCycleOptions.find((o) => o.code === billCycle)?.display ?? billCycle;

      setReportData(mapped);
      setReportMeta({
        billCycleDisplay: bcDisplay,
        areaName: effectiveAreaLabel,        // use the human-readable label, not first row
        billType: billType === "O" ? "Ordinary" : "Bulk",
      });
      setReportVisible(true);
    } catch (e: any) {
      setReportError(e.message);
    } finally {
      setLoadingReport(false);
    }
  }, [billCycle, billType, effectiveAreaCode, effectiveAreaLabel, billCycleOptions, canSubmit]);

  // ── Numeric totals ─────────────────────────────────────────────────────────
  const totals = reportData.reduce(
    (acc, r) => ({
      openingBalance: acc.openingBalance + r.openingBalance,
      monthlyCharge: acc.monthlyCharge + r.monthlyCharge,
      debits: acc.debits + r.debits,
      credits: acc.credits + r.credits,
      underCharge: acc.underCharge + r.underCharge,
      overCharge: acc.overCharge + r.overCharge,
      payments: acc.payments + r.payments,
      closingBalance: acc.closingBalance + r.closingBalance,
      closingBalanceWithoutFinAcc: acc.closingBalanceWithoutFinAcc + r.closingBalanceWithoutFinAcc,
      averageCharge: acc.averageCharge + r.averageCharge,
      noOfMonthsInArrears: acc.noOfMonthsInArrears + r.noOfMonthsInArrears,
      noOfMonthsInArrearsWithoutFinAcc: acc.noOfMonthsInArrearsWithoutFinAcc + r.noOfMonthsInArrearsWithoutFinAcc,
    }),
    {
      openingBalance: 0, monthlyCharge: 0, debits: 0, credits: 0,
      underCharge: 0, overCharge: 0, payments: 0, closingBalance: 0,
      closingBalanceWithoutFinAcc: 0, averageCharge: 0,
      noOfMonthsInArrears: 0, noOfMonthsInArrearsWithoutFinAcc: 0,
    }
  );

  // ── Export CSV ─────────────────────────────────────────────────────────────
  const handleExportCsv = () => {
    if (!reportData.length) return;
    const headers = [
      "Area Code","Area Name","Opening Balance","Monthly Charge","Debits","Credits",
      "Under Charge","Over Charge","Payments","Closing Balance",
      "Closing Balance (Without Fin.Acc.)","Average Charge",
      "No. of Months in Arrears","No. of Months in Arrears (Without Fin.Acc.)"
    ];
    const esc = (v: any) => {
      const str = String(v ?? "");
      return str.includes(",") || str.includes('"') || str.includes("\n")
        ? `"${str.replace(/"/g, '""')}"` : str;
    };
    const dataRows = reportData.map((r) => [
      r.areaCode, r.areaName,
      r.openingBalance, r.monthlyCharge, r.debits, r.credits,
      r.underCharge, r.overCharge, r.payments, r.closingBalance,
      r.closingBalanceWithoutFinAcc, r.averageCharge,
      r.noOfMonthsInArrears, r.noOfMonthsInArrearsWithoutFinAcc,
    ].map(esc));
    const csv = [headers.map(esc), ...dataRows].map((row) => row.join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.setAttribute("download", `receive_position_${reportMeta.billCycleDisplay}_${effectiveAreaCode}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 200);
  };

  // ── Print PDF ──────────────────────────────────────────────────────────────
  const handlePrint = () => {
    if (!reportData.length) return;
    const colHeaders = [
      "Area","Opening Balance","Monthly Charge","Debits","Credits",
      "Under Charge","Over Charge","Payments","Closing Balance",
      "Closing Balance (Without Fin.Acc.)","Average Charge",
      "No. of Months in Arrears","No. of Months in Arrears (Without Fin.Acc.)"
    ];
    const theadHtml = colHeaders.map((h) => `<th>${h}</th>`).join("");
    const tbodyHtml = reportData.map((r, i) => `
      <tr style="background:${i % 2 === 0 ? "#fff" : "#f5f5f5"}">
        <td style="text-align:left">${r.areaCode}${r.areaName && r.areaName !== r.areaCode ? " \u2013 " + r.areaName : ""}</td>
        <td>${fmt(r.openingBalance)}</td><td>${fmt(r.monthlyCharge)}</td>
        <td>${fmt(r.debits)}</td><td>${fmt(r.credits)}</td>
        <td>${fmt(r.underCharge)}</td><td>${fmt(r.overCharge)}</td>
        <td>${fmt(r.payments)}</td><td>${fmt(r.closingBalance)}</td>
        <td>${fmt(r.closingBalanceWithoutFinAcc)}</td><td>${fmt(r.averageCharge)}</td>
        <td>${fmt(r.noOfMonthsInArrears)}</td><td>${fmt(r.noOfMonthsInArrearsWithoutFinAcc)}</td>
      </tr>`).join("");
    const tfootHtml = `
      <tr style="background:#7A0000;color:#fff;font-weight:bold">
        <td style="text-align:left">Total</td>
        <td>${fmt(totals.openingBalance)}</td><td>${fmt(totals.monthlyCharge)}</td>
        <td>${fmt(totals.debits)}</td><td>${fmt(totals.credits)}</td>
        <td>${fmt(totals.underCharge)}</td><td>${fmt(totals.overCharge)}</td>
        <td>${fmt(totals.payments)}</td><td>${fmt(totals.closingBalance)}</td>
        <td>${fmt(totals.closingBalanceWithoutFinAcc)}</td><td>${fmt(totals.averageCharge)}</td>
        <td>${fmt(totals.noOfMonthsInArrears)}</td><td>${fmt(totals.noOfMonthsInArrearsWithoutFinAcc)}</td>
      </tr>`;
    const html = `<!DOCTYPE html><html><head><title>Receive Position Report</title>
      <style>
        body{font-family:Arial,sans-serif;font-size:10px;margin:16px}
        h2{font-size:13px;color:#7A0000;margin-bottom:4px}
        p{font-size:10px;color:#555;margin-bottom:10px}
        table{border-collapse:collapse;width:100%}
        th,td{border:1px solid #bbb;padding:3px 6px;text-align:right}
        th{background:#b0d4e0;text-align:center;font-weight:bold}
        @media print{body{margin:8px}}
      </style></head><body>
      <h2>Receive Position Report</h2>
      <p>Area: <b>${reportMeta.areaName}</b> &nbsp;|&nbsp; Bill Cycle: <b>${reportMeta.billCycleDisplay}</b> &nbsp;|&nbsp; Type: <b>${reportMeta.billType}</b></p>
      <table><thead><tr>${theadHtml}</tr></thead>
      <tbody>${tbodyHtml}</tbody>
      <tfoot>${tfootHtml}</tfoot></table>
      <p style="margin-top:8px">Total records: ${reportData.length}</p>
      <script>window.onload=function(){window.print()}<\/script>
      </body></html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
    const blobUrl = URL.createObjectURL(blob);
    const w = window.open(blobUrl, "_blank");
    if (!w) {
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      document.body.appendChild(iframe);
      iframe.contentDocument!.open();
      iframe.contentDocument!.write(html);
      iframe.contentDocument!.close();
      setTimeout(() => { iframe.contentWindow!.print(); document.body.removeChild(iframe); }, 500);
    }
    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
  };

  // ── Small sub-components ───────────────────────────────────────────────────
  const spinnerIcon = (
    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );

  const loadingPill = (msg: string) => (
    <div className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-gray-50 text-gray-500 animate-pulse">
      {msg}
    </div>
  );

  const errorPill = (msg: string) => (
    <div className="w-full px-2 py-1.5 text-xs border border-red-300 rounded-md bg-red-50 text-red-600">
      {msg}
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 max-w-full">

      {/* ── FORM ──────────────────────────────────────────────────────────── */}
      {!reportVisible && (
        <>
          <div className="mb-5">
            <h2 className={`text-xl font-bold ${maroon}`}>Receive Position Report</h2>
          </div>

          {/* ── Row 1: Bill Cycle | Customer Type | Location Category ─────── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">

            {/* 1. Bill Cycle */}
            <div className="flex flex-col">
              <label className={`text-xs font-medium mb-1 ${maroon}`}>
                Bill Cycle <span className="text-red-600">*</span>
              </label>
              {loadingBillCycles ? loadingPill("Loading bill cycles...")
                : billCycleError ? errorPill(billCycleError)
                : (
                  <select
                    value={billCycle}
                    onChange={(e) => {
                      setBillCycle(e.target.value);
                      setBillType("");
                      setLocationCategory("");
                      setSelectedProvince("");
                      setSelectedRegion("");
                      setReportError(null);
                    }}
                    className={selectCls}
                  >
                    <option value="">Select Bill Cycle</option>
                    {billCycleOptions.map((o) => (
                      <option key={o.code} value={o.code}>{o.display}</option>
                    ))}
                  </select>
                )}
            </div>

            {/* 2. Customer Type */}
            <div className="flex flex-col">
              <label className={`text-xs font-medium mb-1 ${billCycle ? maroon : "text-gray-400"}`}>
                Customer Type <span className="text-red-600">*</span>
              </label>
              <select
                value={billType}
                onChange={(e) => {
                  setBillType(e.target.value);
                  setLocationCategory("");
                  setSelectedProvince("");
                  setSelectedRegion("");
                  setReportError(null);
                }}
                disabled={!billCycle}
                className={!billCycle ? disabledSelectCls : selectCls}
              >
                <option value="">Select Type</option>
                <option value="O">Ordinary</option>
                <option value="B">Bulk</option>
              </select>
            </div>

            {/* 3. Location Category */}
            <div className="flex flex-col">
              <label className={`text-xs font-medium mb-1 ${billType ? maroon : "text-gray-400"}`}>
                Location Category <span className="text-red-600">*</span>
              </label>
              <select
                value={locationCategory}
                onChange={(e) => { setLocationCategory(e.target.value); setReportError(null); }}
                disabled={!billType}
                className={!billType ? disabledSelectCls : selectCls}
              >
                <option value="">Select Location Category</option>
                <option value="Province">Province</option>
                <option value="Region">Region</option>
                <option value="CEB">CEB Entire</option>
              </select>
            </div>
          </div>

          {/* ── Row 2 (conditional): Province selector OR Region selector ─── */}
          {billType && (locationCategory === "Province" || locationCategory === "Region") && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">

              {/* Province dropdown – only when category = Province */}
              {locationCategory === "Province" && (
                <div className="flex flex-col">
                  <label className={`text-xs font-medium mb-1 ${maroon}`}>
                    Province <span className="text-red-600">*</span>
                  </label>
                  {loadingProvinces ? loadingPill("Loading provinces...")
                    : provinceError ? errorPill(provinceError)
                    : (
                      <select
                        value={selectedProvince}
                        onChange={(e) => { setSelectedProvince(e.target.value); setReportError(null); }}
                        className={selectCls}
                      >
                        <option value="">Select Province</option>
                        {provinces.map((p) => (
                          <option key={p.ProvCode} value={p.ProvCode}>
                            {p.ProvCode} – {p.ProvName}
                          </option>
                        ))}
                      </select>
                    )}
                </div>
              )}

              {/* Region dropdown – only when category = Region */}
              {locationCategory === "Region" && (
                <div className="flex flex-col">
                  <label className={`text-xs font-medium mb-1 ${maroon}`}>
                    Region <span className="text-red-600">*</span>
                  </label>
                  {loadingRegions ? loadingPill("Loading regions...")
                    : regionError ? errorPill(regionError)
                    : (
                      <select
                        value={selectedRegion}
                        onChange={(e) => { setSelectedRegion(e.target.value); setReportError(null); }}
                        className={selectCls}
                      >
                        <option value="">Select Region</option>
                        {regions.map((r) => (
                          <option key={r.RegionCode} value={r.RegionCode}>
                            {r.RegionCode} – {r.RegionName}
                          </option>
                        ))}
                      </select>
                    )}
                </div>
              )}
            </div>
          )}

          {/* CEB Entire notice */}
          {locationCategory === "CEB" && (
            <div className="mb-4 px-3 py-2 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-700 flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Report will include all provinces and regions (CEB Entire).
            </div>
          )}

          {/* Submit */}
          <div className="mt-2 flex justify-end">
            <button
              onClick={handleGenerateReport}
              disabled={loadingReport || !canSubmit}
              className={`px-6 py-2 rounded-md font-medium text-xs shadow transition-opacity
                ${maroonGrad} text-white
                ${loadingReport || !canSubmit ? "opacity-50 cursor-not-allowed" : "hover:opacity-90"}`}
            >
              {loadingReport ? (
                <span className="flex items-center gap-2">{spinnerIcon} Loading...</span>
              ) : "Generate Report"}
            </button>
          </div>

          {reportError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {reportError}
            </div>
          )}
        </>
      )}

      {/* ── REPORT ────────────────────────────────────────────────────────── */}
      {reportVisible && (
        <div>
          {/* Report header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
            <div>
              <h2 className={`text-xl font-bold ${maroon}`}>Receive Position Report</h2>
            </div>
            <div className="flex flex-wrap gap-2 mt-2 md:mt-0">
              <button
                onClick={handleExportCsv}
                disabled={!reportData.length}
                className={`flex items-center gap-1 px-3 py-1.5 border border-blue-400 rounded-md text-xs font-medium shadow-sm
                  ${!reportData.length ? "text-blue-300 bg-gray-50 cursor-not-allowed" : "text-blue-700 bg-white hover:bg-blue-50"}`}
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5l2 2h5a2 2 0 012 2v12a2 2 0 01-2 2z" />
                </svg>
                CSV
              </button>
              <button
                onClick={handlePrint}
                disabled={!reportData.length}
                className={`flex items-center gap-1 px-3 py-1.5 border border-green-400 rounded-md text-xs font-medium shadow-sm
                  ${!reportData.length ? "text-green-300 bg-gray-50 cursor-not-allowed" : "text-green-700 bg-white hover:bg-green-50"}`}
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                PDF
              </button>
              <button
                onClick={() => { setReportVisible(false); setReportError(null); }}
                className="px-4 py-1.5 bg-[#7A0000] hover:bg-[#A52A2A] text-xs rounded-md text-white"
              >
                Back to Form
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto max-h-[calc(100vh-280px)] border border-gray-300 rounded-lg">
            <div>
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-[#b0d4e0] text-gray-800 sticky top-0 z-10">
                    <th className="border border-gray-300 px-3 py-2 text-center font-bold whitespace-nowrap w-8">#</th>
                    <th className="border border-gray-300 px-3 py-2 text-left font-bold whitespace-nowrap">Area</th>
                    <th className="border border-gray-300 px-3 py-2 text-right font-bold whitespace-nowrap">Opening Balance</th>
                    <th className="border border-gray-300 px-3 py-2 text-right font-bold whitespace-nowrap">Monthly Charge</th>
                    <th className="border border-gray-300 px-3 py-2 text-right font-bold whitespace-nowrap">Debits</th>
                    <th className="border border-gray-300 px-3 py-2 text-right font-bold whitespace-nowrap">Credits</th>
                    <th className="border border-gray-300 px-3 py-2 text-right font-bold whitespace-nowrap">Under Charge</th>
                    <th className="border border-gray-300 px-3 py-2 text-right font-bold whitespace-nowrap">Over Charge</th>
                    <th className="border border-gray-300 px-3 py-2 text-right font-bold whitespace-nowrap">Payments</th>
                    <th className="border border-gray-300 px-3 py-2 text-right font-bold whitespace-nowrap">Closing Balance</th>
                    <th className="border border-gray-300 px-3 py-2 text-right font-bold whitespace-nowrap">Closing Balance (Without Fin.Acc.)</th>
                    <th className="border border-gray-300 px-3 py-2 text-right font-bold whitespace-nowrap">Average Charge</th>
                    <th className="border border-gray-300 px-3 py-2 text-right font-bold whitespace-nowrap">No. of Months in Arrears</th>
                    <th className="border border-gray-300 px-3 py-2 text-right font-bold whitespace-nowrap">No. of Months in Arrears (Without Fin.Acc.)</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.length === 0 ? (
                    <tr>
                      <td colSpan={14} className="border border-gray-300 px-3 py-6 text-center text-gray-500">
                        <div>No data found for the selected criteria.</div>
                        <div className="text-xs text-gray-400 mt-1">
                          Check browser console (F12) for API response details.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    reportData.map((r, i) => (
                      <tr key={`${r.areaCode}-${i}`} className={i % 2 === 0 ? "bg-white" : "bg-[#f5e6f0]"}>
                        <td className="border border-gray-300 px-3 py-1 text-center font-mono text-gray-500">{i + 1}</td>
                        <td className="border border-gray-300 px-3 py-1 font-mono whitespace-nowrap">
                          {r.areaName && r.areaName !== r.areaCode ? r.areaName : r.areaCode}
                        </td>
                        <td className="border border-gray-300 px-3 py-1 text-right font-mono">{fmt(r.openingBalance)}</td>
                        <td className="border border-gray-300 px-3 py-1 text-right font-mono">{fmt(r.monthlyCharge)}</td>
                        <td className="border border-gray-300 px-3 py-1 text-right font-mono">{fmt(r.debits)}</td>
                        <td className="border border-gray-300 px-3 py-1 text-right font-mono">{fmt(r.credits)}</td>
                        <td className="border border-gray-300 px-3 py-1 text-right font-mono">{fmt(r.underCharge)}</td>
                        <td className="border border-gray-300 px-3 py-1 text-right font-mono">{fmt(r.overCharge)}</td>
                        <td className="border border-gray-300 px-3 py-1 text-right font-mono">{fmt(r.payments)}</td>
                        <td className="border border-gray-300 px-3 py-1 text-right font-mono">{fmt(r.closingBalance)}</td>
                        <td className="border border-gray-300 px-3 py-1 text-right font-mono">{fmt(r.closingBalanceWithoutFinAcc)}</td>
                        <td className="border border-gray-300 px-3 py-1 text-right font-mono">{fmt(r.averageCharge)}</td>
                        <td className="border border-gray-300 px-3 py-1 text-right font-mono">{fmt(r.noOfMonthsInArrears, 2)}</td>
                        <td className="border border-gray-300 px-3 py-1 text-right font-mono">{fmt(r.noOfMonthsInArrearsWithoutFinAcc, 2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>

                {/* Totals row */}
                {reportData.length > 0 && (
                  <tfoot>
                    <tr className="bg-[#7A0000] text-white font-bold sticky bottom-0">
                      <td className="border border-[#5a0000] px-3 py-2"></td>
                      <td className="border border-[#5a0000] px-3 py-2">Total</td>
                      <td className="border border-[#5a0000] px-3 py-2 text-right font-mono">{fmt(totals.openingBalance)}</td>
                      <td className="border border-[#5a0000] px-3 py-2 text-right font-mono">{fmt(totals.monthlyCharge)}</td>
                      <td className="border border-[#5a0000] px-3 py-2 text-right font-mono">{fmt(totals.debits)}</td>
                      <td className="border border-[#5a0000] px-3 py-2 text-right font-mono">{fmt(totals.credits)}</td>
                      <td className="border border-[#5a0000] px-3 py-2 text-right font-mono">{fmt(totals.underCharge)}</td>
                      <td className="border border-[#5a0000] px-3 py-2 text-right font-mono">{fmt(totals.overCharge)}</td>
                      <td className="border border-[#5a0000] px-3 py-2 text-right font-mono">{fmt(totals.payments)}</td>
                      <td className="border border-[#5a0000] px-3 py-2 text-right font-mono">{fmt(totals.closingBalance)}</td>
                      <td className="border border-[#5a0000] px-3 py-2 text-right font-mono">{fmt(totals.closingBalanceWithoutFinAcc)}</td>
                      <td className="border border-[#5a0000] px-3 py-2 text-right font-mono">{fmt(totals.averageCharge)}</td>
                      <td className="border border-[#5a0000] px-3 py-2 text-right font-mono">{fmt(totals.noOfMonthsInArrears, 2)}</td>
                      <td className="border border-[#5a0000] px-3 py-2 text-right font-mono">{fmt(totals.noOfMonthsInArrearsWithoutFinAcc, 2)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {reportData.length > 0 && (
            <p className="text-xs text-gray-500 mt-2 text-right">
              Total records: {reportData.length.toLocaleString()}
            </p>
          )}

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

export default ReceivePosition;