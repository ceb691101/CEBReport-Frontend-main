import React, { useEffect, useState } from "react";
import { Search, RotateCcw, Eye, Download, Printer } from "lucide-react";
import { useUser } from "../../contexts/UserContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Province {
  ProvinceId: string;   // mapped from CompId
  ProvinceName: string; // mapped from CompName
}

interface ProvinceQtyOnHandData {
  MAT_CD: string;
  MAT_NM: string;
  Committed_Cost: number;
  C8: string;
  Area: string;
  UOM_CD: string;
  Region: string;
}

// ─── Cross-tab helpers ────────────────────────────────────────────────────────

interface DeptCol {
  fullLabel: string;
  area: string;
}

interface AreaGroup {
  area: string;
  depts: DeptCol[];
}

interface CrossRow {
  matCd: string;
  matNm: string;
  uomCd: string;
  byDept: Record<string, number>;
  total: number;
}

const buildCrossTab = (rows: ProvinceQtyOnHandData[]) => {
  const deptMap = new Map<string, DeptCol>();
  const areaOrder: string[] = [];

  rows.forEach((r) => {
    if (!deptMap.has(r.C8)) {
      deptMap.set(r.C8, { fullLabel: r.C8, area: r.Area });
      if (!areaOrder.includes(r.Area)) areaOrder.push(r.Area);
    }
  });

  const areaGroups: AreaGroup[] = areaOrder.map((area) => ({
    area,
    depts: [...deptMap.values()].filter((d) => d.area === area),
  }));

  const matMap = new Map<string, CrossRow>();
  rows.forEach((r) => {
    const key = `${r.MAT_CD}|||${r.MAT_NM}|||${r.UOM_CD}`;
    if (!matMap.has(key)) {
      matMap.set(key, { matCd: r.MAT_CD, matNm: r.MAT_NM, uomCd: r.UOM_CD, byDept: {}, total: 0 });
    }
    const row = matMap.get(key)!;
    row.byDept[r.C8] = (row.byDept[r.C8] ?? 0) + r.Committed_Cost;
    row.total += r.Committed_Cost;
  });

  const colTotals: Record<string, number> = {};
  [...deptMap.keys()].forEach((k) => (colTotals[k] = 0));
  let grandTotal = 0;
  matMap.forEach((row) => {
    Object.entries(row.byDept).forEach(([k, v]) => { colTotals[k] = (colTotals[k] ?? 0) + v; });
    grandTotal += row.total;
  });

  return { areaGroups, allDepts: [...deptMap.values()], crossRows: [...matMap.values()], colTotals, grandTotal };
};

const fmt = (n: number) =>
  n === 0 ? "0.00" : new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const fmtCell = (n: number) => (n === 0 ? "-" : fmt(n));

// ─── Component ────────────────────────────────────────────────────────────────

const ProvincialQtyHand: React.FC = () => {
  const { user } = useUser();
  const epfNo = user?.Userno || "";

  // Company list state
  const [data, setData] = useState<Province[]>([]);
  const [searchId, setSearchId] = useState("");
  const [searchName, setSearchName] = useState("");
  const [filtered, setFiltered] = useState<Province[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 9;

  // Selection state
  const [selectedProvince, setSelectedProvince] = useState<Province | null>(null);

  // Material selection modal state
  const [materialSelectionType, setMaterialSelectionType] = useState<"all" | "specific">("all");
  const [materialCode, setMaterialCode] = useState("");
  const [showMaterialSelection, setShowMaterialSelection] = useState(false);

  // Report modal state
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportData, setReportData] = useState<ProvinceQtyOnHandData[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  // Theme
  const maroon = "text-[#7A0000]";
  const maroonBg = "bg-[#7A0000]";
  const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";

  const paginatedProvinces = filtered.slice((page - 1) * pageSize, page * pageSize);

  // ── Fetch company list (same API as ProvinceWisePIVStampDuty) ──
  useEffect(() => {
    const fetchCompanies = async () => {
      if (!epfNo) {
        setError("No EPF number available. Please login again.");
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/misapi/api/incomeexpenditure/Usercompanies/${epfNo}/60`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const text = await res.text();
          throw new Error(`Expected JSON but got: ${text.substring(0, 100)}`);
        }
        const parsed = await res.json();
        let rawData: any[] = [];
        if (Array.isArray(parsed)) rawData = parsed;
        else if (parsed.data && Array.isArray(parsed.data)) rawData = parsed.data;
        else if (parsed.result && Array.isArray(parsed.result)) rawData = parsed.result;

        const companies: Province[] = rawData
          .map((c: any) => ({
            ProvinceId: (c.CompId ?? c.compId ?? "").toString().trim(),
            ProvinceName: (c.CompName ?? c.compName ?? "").toString().trim(),
          }))
          .filter((c) => c.ProvinceId !== "");

        setData(companies);
        setFiltered(companies);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchCompanies();
  }, [epfNo]);

  // ── Filter companies ──
  useEffect(() => {
    const f = data.filter(
      (d) =>
        (!searchId || d.ProvinceId.toLowerCase().includes(searchId.toLowerCase())) &&
        (!searchName || d.ProvinceName.toLowerCase().includes(searchName.toLowerCase()))
    );
    setFiltered(f);
    setPage(1);
  }, [searchId, searchName, data]);

  // ── Fetch report data ──
  const fetchReportData = async () => {
    if (!selectedProvince) return;
    setReportLoading(true);
    setReportError(null);
    try {
      const matParam = materialSelectionType === "specific" && materialCode.trim() ? materialCode.trim() : "";
      const url = `http://localhost:44381/api/province-qty-onhand-crosstab/list?compId=${encodeURIComponent(selectedProvince.ProvinceId)}&matcode=${encodeURIComponent(matParam)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const parsed = await res.json();

      if (parsed.message) {
        setReportData([]);
        setReportError(parsed.message);
        setReportModalOpen(true);
        return;
      }
      let rawData: ProvinceQtyOnHandData[] = [];
      if (Array.isArray(parsed)) rawData = parsed;
      else if (parsed.data && Array.isArray(parsed.data)) rawData = parsed.data;

      setReportData(rawData);
      setReportModalOpen(true);
    } catch (e: any) {
      setReportError(e.message);
    } finally {
      setReportLoading(false);
    }
  };

  const handleProvinceSelect = (province: Province) => {
    setSelectedProvince(province);
    setShowMaterialSelection(true);
  };

  const handleViewReport = () => {
    if (materialSelectionType === "specific" && !materialCode.trim()) {
      setReportError("Please enter a material code for specific material selection.");
      return;
    }
    fetchReportData();
  };

  const closeReportModal = () => {
    setReportModalOpen(false);
    setReportData([]);
    setSelectedProvince(null);
    setShowMaterialSelection(false);
    setMaterialCode("");
    setMaterialSelectionType("all");
  };

  const clearFilters = () => {
    setSearchId("");
    setSearchName("");
  };

  // ── Cross-tab derived data ──
  const { areaGroups, allDepts, crossRows, colTotals, grandTotal } = React.useMemo(
    () =>
      reportData.length
        ? buildCrossTab(reportData)
        : { areaGroups: [], allDepts: [], crossRows: [], colTotals: {}, grandTotal: 0 },
    [reportData]
  );

  const regionName = reportData[0]?.Region ?? selectedProvince?.ProvinceName ?? "";
  const today = new Date().toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" });

  // ── CSV Download ──
  const downloadCSV = () => {
    if (!crossRows.length) return;
    const headerRow1 = [`Stock Report - ${regionName} As at ${today}`];
    const headerRow2 = ["Mat_cd", "Material Name", "Unit of Measure", ...allDepts.map((d) => d.fullLabel), "Total"];
    const dataRows = crossRows.map((r) => [
      r.matCd,
      `"${r.matNm.replace(/"/g, '""')}"`,
      r.uomCd,
      ...allDepts.map((d) => (r.byDept[d.fullLabel] ?? 0).toFixed(2)),
      r.total.toFixed(2),
    ]);
    const totalRow = ["", "TOTAL", "", ...allDepts.map((d) => (colTotals[d.fullLabel] ?? 0).toFixed(2)), grandTotal.toFixed(2)];
    const csv = [headerRow1, headerRow2, ...dataRows, [], totalRow].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `StockReport_${selectedProvince?.ProvinceId}_${materialCode || "ALL"}_${new Date()
      .toLocaleDateString("en-GB")
      .replace(/\//g, "-")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

 // ── Print PDF ──
  const printPDF = () => {
    if (!crossRows.length) return;
    const win = window.open("", "_blank");
    if (!win) return;

    let areaHeaderHTML = "";
    areaGroups.forEach((ag) => {
      areaHeaderHTML += `<th colspan="${ag.depts.length}" style="background:#c0c0c0;border:1px solid #888;text-align:center;font-weight:bold;padding:3px 4px;">${ag.area}</th>`;
    });

    let deptHeaderHTML = "";
    areaGroups.forEach((ag) => {
      ag.depts.forEach((d) => {
        deptHeaderHTML += `<th style="background:#e4e4e4;border:1px solid #888;text-align:center;padding:3px 4px;white-space:normal;word-wrap:break-word;">${d.fullLabel}</th>`;
      });
    });

    let bodyHTML = "";
    crossRows.forEach((row, idx) => {
      const rowBg = idx % 2 === 0 ? "#ffffff" : "#f5f5f5";
      bodyHTML += `<tr style="background:${rowBg};">
        <td style="border:1px solid #ccc;padding:3px 4px;font-family:monospace;white-space:nowrap;">${row.matCd}</td>
        <td style="border:1px solid #ccc;padding:3px 4px;white-space:nowrap;">${row.matNm}</td>
        <td style="border:1px solid #ccc;padding:3px 4px;text-align:center;white-space:nowrap;">${row.uomCd}</td>`;
      allDepts.forEach((d) => {
        const v = row.byDept[d.fullLabel] ?? 0;
        bodyHTML += `<td style="border:1px solid #ccc;padding:3px 5px;text-align:right;font-family:monospace;white-space:nowrap;">${v === 0 ? "-" : fmt(v)}</td>`;
      });
      bodyHTML += `<td style="border:1px solid #ccc;padding:3px 5px;text-align:right;font-family:monospace;font-weight:bold;white-space:nowrap;background:#ececec;">${fmt(row.total)}</td></tr>`;
    });

    let totalRowHTML = `<tr style="background:#d8d8d8;font-weight:bold;">
      <td colspan="3" style="border:1px solid #888;padding:3px 4px;text-align:right;letter-spacing:1px;">TOTAL</td>`;
    allDepts.forEach((d) => {
      totalRowHTML += `<td style="border:1px solid #888;padding:3px 5px;text-align:right;font-family:monospace;white-space:nowrap;">${fmt(colTotals[d.fullLabel] ?? 0)}</td>`;
    });
    totalRowHTML += `<td style="border:1px solid #888;padding:3px 5px;text-align:right;font-family:monospace;font-weight:bold;white-space:nowrap;">${fmt(grandTotal)}</td></tr>`;

    // A3 landscape printable width ≈ 410mm (420mm - 2×5mm margins)
    // Each col gets natural content width via table-layout:auto + width:100%
    // zoom scales the whole page down ONLY if needed so nothing is ever clipped
    const A3_WIDTH_MM = 410;
    // Rough estimate: fixed cols ~130mm + each dept col ~22mm + total col ~22mm
    const estimatedMm = 130 + allDepts.length * 22 + 22;
    const zoom = estimatedMm > A3_WIDTH_MM
      ? (A3_WIDTH_MM / estimatedMm)
      : 1;

    // Derive font size from zoom so text stays as large as possible
    const fontSize = Math.max(7, Math.round(11 * zoom));
    const titleSize = Math.max(9, Math.round(15 * zoom));
    const subSize   = Math.max(8, Math.round(12 * zoom));

    const html = `<!DOCTYPE html><html><head>
      <meta charset="utf-8">
      <title>Stock Report - ${regionName}</title>
      <style>
        @page {
          size: A3 landscape;
          margin: 5mm;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: Arial, sans-serif;
          font-size: ${fontSize}px;
          color: #000;
          width: 100%;
        }
        .title {
          text-align: center;
          font-size: ${titleSize}px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 2px;
        }
        .sub {
          text-align: center;
          font-size: ${subSize}px;
          color: #333;
          margin-bottom: 2px;
        }
        .meta {
          text-align: center;
          font-size: ${Math.max(7, fontSize - 1)}px;
          color: #555;
          margin-bottom: 5px;
        }
        /*
         * KEY: width:100% + table-layout:auto lets browser size every column
         * to its content naturally. zoom on <html> then shrinks the whole
         * render viewport so the table never overflows the page edge.
         * white-space:nowrap on every cell ensures no letter is ever wrapped
         * or hidden — the table simply gets wider and zoom handles it.
         */
        html {
          zoom: ${zoom.toFixed(6)};
        }
        table {
          border-collapse: collapse;
          width: 100%;
          table-layout: auto;
        }
        th, td {
          font-size: ${fontSize}px;
        }
        thead { display: table-header-group; }
        tr { page-break-inside: avoid; }
        .footer {
          margin-top: 5px;
          font-size: ${Math.max(6, fontSize - 2)}px;
          text-align: center;
          color: #777;
        }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
    </head><body>
      <div class="sub">Provincial Quantity On Hand &mdash; Stock Report &mdash; ${regionName}</div>
      <div class="meta">
        As at ${today}
        ${materialSelectionType === "specific" && materialCode
          ? `&nbsp;&bull;&nbsp; Material Code: <strong>${materialCode}</strong>`
          : ""}
        &nbsp;&bull;&nbsp; ${crossRows.length} materials &nbsp;&bull;&nbsp; ${allDepts.length} departments
      </div>

      <table>
        <thead>
          <tr>
            <th rowspan="2" style="background:#8B0000;color:#fff;border:1px solid #6B0000;text-align:left;padding:4px 6px;white-space:nowrap;">Mat_cd</th>
            <th rowspan="2" style="background:#8B0000;color:#fff;border:1px solid #6B0000;text-align:left;padding:4px 6px;white-space:nowrap;">Material Name</th>
            <th rowspan="2" style="background:#8B0000;color:#fff;border:1px solid #6B0000;text-align:center;padding:4px 6px;white-space:nowrap;">UOM</th>
            ${areaHeaderHTML}
            <th rowspan="2" style="background:#8B0000;color:#fff;border:1px solid #6B0000;text-align:center;padding:4px 6px;white-space:nowrap;">${regionName} Total</th>
          </tr>
          <tr>${deptHeaderHTML}</tr>
        </thead>
        <tbody>${bodyHTML}${totalRowHTML}</tbody>
      </table>

      <div class="footer">
        Generated: ${new Date().toLocaleString()} &nbsp;|&nbsp;
      </div>
    </body></html>`;

    win.document.write(html);
    win.document.close();
    win.onload = () => {
      win.print();
      win.close();
    };
  };
  // ─────────────────────────────────────────────────────────────────────────────
  // Material Selection Modal
  // ─────────────────────────────────────────────────────────────────────────────
  const MaterialSelectionModal = () => {
    if (!showMaterialSelection || !selectedProvince) return null;
    return (
      <div className="fixed inset-0 bg-white bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 pt-24 pb-8 pl-64 animate-fadeIn">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-xl mx-4 transform transition-all animate-slideUp">

          {/* Header */}
          <div className={`${maroonGrad} rounded-t-2xl p-4 text-white`}>
            <h3 className="text-lg font-bold">Material Selection</h3>
            <p className="text-xs text-white text-opacity-90 mt-1">
              Configure your inventory report parameters
            </p>
          </div>

          {/* Body */}
          <div className="p-5">
            {/* Selected Company Info Card */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-3 mb-4 border border-gray-200">
              <p className="text-xs text-gray-500 mb-0.5 font-medium">Selected Company</p>
              <p className="text-sm font-bold text-gray-800">{selectedProvince.ProvinceId}</p>
              <p className="text-xs text-gray-700 mt-0.5">{selectedProvince.ProvinceName}</p>
            </div>

            <div className="space-y-4">
              {/* Selection Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Select Report Scope
                </label>
                <div className="space-y-2">
                  <label
                    className={`flex items-center cursor-pointer p-2 rounded-lg border-2 transition-all ${
                      materialSelectionType === "all"
                        ? "border-[#7A0000] bg-red-50 shadow-sm"
                        : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                    }`}
                  >
                    <input
                      type="radio"
                      name="matType"
                      value="all"
                      checked={materialSelectionType === "all"}
                      onChange={() => setMaterialSelectionType("all")}
                      className="mr-2.5 w-4 h-4 text-[#7A0000] focus:ring-[#7A0000]"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-semibold text-gray-800 block">All Materials</span>
                      <span className="text-xs text-gray-500">Generate report for all materials</span>
                    </div>
                  </label>

                  <label
                    className={`flex items-center cursor-pointer p-2 rounded-lg border-2 transition-all ${
                      materialSelectionType === "specific"
                        ? "border-[#7A0000] bg-red-50 shadow-sm"
                        : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                    }`}
                  >
                    <input
                      type="radio"
                      name="matType"
                      value="specific"
                      checked={materialSelectionType === "specific"}
                      onChange={() => setMaterialSelectionType("specific")}
                      className="mr-2.5 w-4 h-4 text-[#7A0000] focus:ring-[#7A0000]"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-semibold text-gray-800 block">Specific Material</span>
                      <span className="text-xs text-gray-500">Generate report for single material</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Material code input */}
              {materialSelectionType === "specific" && (
                <div className="animate-slideDown">
                  <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                    Material Code
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={materialCode}
                      onChange={(e) => setMaterialCode(e.target.value.toUpperCase())}
                      placeholder="Enter material code prefix"
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7A0000] focus:border-transparent text-sm font-mono tracking-wide transition-all"
                      autoFocus
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                      <Search className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 ml-1">
                    💡 Enter material code prefix (e.g. A, B0, A02)
                  </p>
                </div>
              )}

              {/* Error */}
              {reportError && !reportModalOpen && (
                <div className="bg-red-50 border-l-4 border-red-500 p-2 rounded-lg">
                  <p className="text-xs font-medium text-red-800">{reportError}</p>
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowMaterialSelection(false);
                  setSelectedProvince(null);
                  setMaterialCode("");
                  setMaterialSelectionType("all");
                  setReportError(null);
                }}
                className="px-6 py-2.5 border-2 border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 hover:border-gray-400 text-sm font-semibold transition-all shadow-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleViewReport}
                disabled={reportLoading}
                className={`px-6 py-2.5 ${maroonGrad} text-white rounded-xl hover:brightness-110 text-sm font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2`}
              >
                {reportLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" />
                    View Report
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Report Modal (Cross-Tab)
  // ─────────────────────────────────────────────────────────────────────────────
  const ReportModal = () => {
    if (!reportModalOpen || !selectedProvince) return null;

    return (
      <div className="fixed inset-0 bg-white flex items-start justify-end z-50 pt-24 pb-8 pl-64">
        <div className="bg-white w-full max-w-full rounded-lg shadow-lg border border-gray-300 max-h-[85vh] flex flex-col mr-4">

          {/* Report header */}
          <div className="p-5 border-b">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
               
                <h2 className="text-sm font-semibold text-gray-700">
                  COMPANY: {selectedProvince.ProvinceId} / {selectedProvince.ProvinceName}
                  {materialSelectionType === "specific" && materialCode && (
                    <span className="ml-2 text-blue-600">/ MATERIAL CODE - {materialCode}</span>
                  )}
                </h2>
                <h4 className={`text-sm ${maroon} font-medium`}>
                  PROVINCIAL QUANTITY ON HAND — STOCK REPORT — {today}
                </h4>
                {crossRows.length > 0 && (
                  <p className="text-xs text-gray-500">
                    {crossRows.length} materials &nbsp;·&nbsp; {allDepts.length} departments
                  </p>
                )}
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={downloadCSV}
                  disabled={!crossRows.length}
                  className="flex items-center gap-1 px-3 py-1.5 border border-blue-400 text-blue-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-blue-50 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-200 transition disabled:opacity-40"
                >
                  <Download className="w-3 h-3" /> CSV
                </button>
                <button
                  onClick={printPDF}
                  disabled={!crossRows.length}
                  className="flex items-center gap-1 px-3 py-1.5 border border-green-400 text-green-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-green-50 hover:text-green-800 focus:outline-none focus:ring-2 focus:ring-green-200 transition disabled:opacity-40"
                >
                  <Printer className="w-3 h-3" /> PDF
                </button>
              </div>
            </div>
            {reportError && (
              <div className="text-red-600 text-xs mt-2">{reportError}</div>
            )}
          </div>

          {/* Table area */}
          <div className="px-4 py-4 overflow-auto flex-grow">
            {reportLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7A0000] mr-3" />
                <span className={`${maroon} text-sm`}>Loading stock data...</span>
              </div>
            ) : crossRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
                <h3 className="text-lg font-medium text-gray-600 mb-1">No Data Available</h3>
                <p className="text-sm text-gray-400 text-center max-w-md">
                  No stock records found for <strong>{selectedProvince.ProvinceName}</strong>.
                </p>
              </div>
            ) : (
              <div className="overflow-auto text-xs">
                <table className="border-collapse" style={{ minWidth: "max-content", width: "100%" }}>
                  <thead>
                    {/* Row 1: Area groups */}
                    <tr>
                      <th
                        rowSpan={2}
                        className="border border-gray-300 px-3 py-2 text-left font-bold text-white text-xs sticky left-0 z-20"
                        style={{ background: "#7A0000", minWidth: 90 }}
                      >
                        Mat_cd
                      </th>
                      <th
                        rowSpan={2}
                        className="border border-gray-300 px-3 py-2 text-left font-bold text-white text-xs"
                        style={{ background: "#7A0000", minWidth: 200 }}
                      >
                        Material Name
                      </th>
                      <th
                        rowSpan={2}
                        className="border border-gray-300 px-3 py-2 text-center font-bold text-white text-xs"
                        style={{ background: "#7A0000", minWidth: 60 }}
                      >
                        Unit of<br />Measure
                      </th>
                      {areaGroups.map((ag) => (
                        <th
                          key={ag.area}
                          colSpan={ag.depts.length}
                          className="border border-gray-300 px-2 py-1.5 text-center font-bold text-xs"
                          style={{ background: "#D3D3D3", color: "#333" }}
                        >
                          {ag.area}
                        </th>
                      ))}
                      <th
                        rowSpan={2}
                        className="border border-gray-300 px-3 py-2 text-center font-bold text-white text-xs"
                        style={{ background: "#7A0000", minWidth: 90 }}
                      >
                        {regionName || selectedProvince.ProvinceName}
                        <br />Total
                      </th>
                    </tr>
                    {/* Row 2: Dept names */}
                    <tr>
                      {areaGroups.map((ag) =>
                        ag.depts.map((d) => (
                          <th
                            key={d.fullLabel}
                            className="border border-gray-300 px-2 py-1 text-center text-xs font-semibold"
                            style={{
                              background: "#e8e8e8",
                              color: "#444",
                              minWidth: 90,
                              maxWidth: 130,
                              whiteSpace: "normal",
                              wordBreak: "break-word",
                            }}
                          >
                            {d.fullLabel}
                          </th>
                        ))
                      )}
                    </tr>
                  </thead>

                  <tbody>
                    {crossRows.map((row, idx) => (
                      <tr key={`${row.matCd}-${idx}`} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td
                          className="border border-gray-200 px-3 py-1.5 font-mono font-semibold sticky left-0 z-10"
                          style={{ background: idx % 2 === 0 ? "white" : "#f9fafb" }}
                        >
                          {row.matCd}
                        </td>
                        <td className="border border-gray-200 px-3 py-1.5">{row.matNm}</td>
                        <td className="border border-gray-200 px-3 py-1.5 text-center">{row.uomCd}</td>
                        {allDepts.map((d) => (
                          <td key={d.fullLabel} className="border border-gray-200 px-3 py-1.5 text-right font-mono">
                            {fmtCell(row.byDept[d.fullLabel] ?? 0)}
                          </td>
                        ))}
                        <td
                          className="border border-gray-200 px-3 py-1.5 text-right font-mono font-bold"
                          style={{ color: "#7A0000" }}
                        >
                          {fmt(row.total)}
                        </td>
                      </tr>
                    ))}

                    {/* Totals row */}
                    <tr style={{ background: "#D3D3D3" }} className="border-t-2 border-gray-400">
                      <td
                        className="border border-gray-300 px-3 py-2 font-bold sticky left-0"
                        style={{ background: "#D3D3D3" }}
                      />
                      <td className="border border-gray-300 px-3 py-2 font-bold">TOTAL</td>
                      <td className="border border-gray-300 px-3 py-2" />
                      {allDepts.map((d) => (
                        <td key={d.fullLabel + "-tot"} className="border border-gray-300 px-3 py-2 text-right font-mono font-bold text-xs">
                          {fmt(colTotals[d.fullLabel] ?? 0)}
                        </td>
                      ))}
                      <td
                        className="border border-gray-300 px-3 py-2 text-right font-mono font-bold"
                        style={{ color: "#7A0000" }}
                      >
                        {fmt(grandTotal)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t flex justify-center">
            <button
              onClick={closeReportModal}
              className={`px-5 py-1.5 text-sm ${maroonBg} text-white rounded hover:brightness-110`}
            >
              Back To Home
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Main Render
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto p-6 bg-white rounded-xl shadow border border-gray-200 text-sm font-sans">

      {/* Page Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className={`text-xl font-bold ${maroon}`}>Province Quantity On Hand</h2>
      </div>

      {/* Search Controls */}
      <div className="flex flex-wrap gap-3 justify-end mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
          <input
            type="text"
            value={searchId}
            placeholder="Search by Company Code"
            onChange={(e) => setSearchId(e.target.value)}
            className="pl-8 pr-3 py-1.5 w-44 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A0000] transition text-sm"
            autoComplete="off"
          />
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
          <input
            type="text"
            value={searchName}
            placeholder="Search by Company Name"
            onChange={(e) => setSearchName(e.target.value)}
            className="pl-8 pr-3 py-1.5 w-44 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A0000] transition text-sm"
            autoComplete="off"
          />
        </div>
        {(searchId || searchName) && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm"
          >
            <RotateCcw className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7A0000] mx-auto" />
          <p className="mt-2 text-gray-600">Loading companies...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          Error: {error}
        </div>
      )}

      {/* No results */}
      {!loading && !error && filtered.length === 0 && (
        <div className="text-gray-600 bg-gray-100 p-4 rounded">No companies found.</div>
      )}

      {/* Company Table */}
      {!loading && !error && filtered.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <div className="max-h-[50vh] overflow-y-auto">
              <table className="w-full table-fixed text-left text-gray-700 text-sm">
                <thead className={`${maroonGrad} text-white sticky top-0`}>
                  <tr>
                    <th className="px-4 py-2 w-1/4">Company Code</th>
                    <th className="px-4 py-2 w-1/2">Company Name</th>
                    <th className="px-4 py-2 w-1/4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedProvinces.map((province, i) => (
                    <tr
                      key={`${province.ProvinceId}-${i}`}
                      className={`${i % 2 ? "bg-white" : "bg-gray-50"} ${
                        selectedProvince?.ProvinceId === province.ProvinceId ? "ring-2 ring-[#7A0000] ring-inset" : ""
                      }`}
                    >
                      <td className="px-4 py-2 truncate font-mono">{province.ProvinceId}</td>
                      <td className="px-4 py-2 truncate">{province.ProvinceName}</td>
                      <td className="px-4 py-2 text-center">
                        <button
                          onClick={() => handleProvinceSelect(province)}
                          className={`px-3 py-1 ${
                            selectedProvince?.ProvinceId === province.ProvinceId
                              ? "bg-green-600 text-white"
                              : maroonGrad + " text-white"
                          } rounded-md text-xs font-medium hover:brightness-110 transition shadow`}
                        >
                          <Eye className="inline-block mr-1 w-3 h-3" />
                          {selectedProvince?.ProvinceId === province.ProvinceId ? "Viewing" : "View"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex justify-end items-center gap-3 mt-3">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 border rounded bg-white text-gray-600 text-xs hover:bg-gray-100 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-xs text-gray-500">
              Page {page} of {Math.ceil(filtered.length / pageSize)}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(Math.ceil(filtered.length / pageSize), p + 1))}
              disabled={page >= Math.ceil(filtered.length / pageSize)}
              className="px-3 py-1 border rounded bg-white text-gray-600 text-xs hover:bg-gray-100 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </>
      )}

      {/* Modals */}
      <MaterialSelectionModal />
      <ReportModal />
    </div>
  );
};

export default ProvincialQtyHand;