import React, { useState, useRef, useEffect } from "react";
import { useUser } from "../../contexts/UserContext";
import { toast } from "react-toastify";
import ReportViewer from "../../components/utils/ReportViewer";
import YearMonthDropdowns from "../../components/utils/YearMonthDropdowns";
import { Search, RotateCcw, Eye } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CostCentre {
  DeptId: string;
  DeptName: string;
}

interface Warehouse {
  WarehouseCode: string;
  CostCenterId?: string;
}

interface NonMovingBOSItem {
  Status: string;
  PhvDate: string | null;
  MaterialCode: string;
  MaterialName: string;
  UomCode: string;
  GradeCode: string;
  UnitPrice: number;
  QtyOnHand: number;
  DocumentNo: string;
  StockBook: number;
  Reason: string;
  [key: string]: any;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatNumber = (num: number | null | undefined): string => {
  if (num == null) return "0.00";
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const esc = (v: any) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const parseApiResponse = (response: any): any[] => {
  if (Array.isArray(response)) return response;
  if (response.data && Array.isArray(response.data)) return response.data;
  if (response.result && Array.isArray(response.result)) return response.result;
  if (response.departments && Array.isArray(response.departments)) return response.departments;
  if (response.Data && Array.isArray(response.Data)) return response.Data;
  if (response.warehouses && Array.isArray(response.warehouses)) return response.warehouses;
  console.warn("Unexpected API response format:", response);
  return [];
};

// ─── Component ────────────────────────────────────────────────────────────────

const PHVNonMovingWHwiseBOS: React.FC = () => {
  const { user } = useUser();
  const epfNo = user?.Userno || "";
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Cost Centre state
  const [data, setData] = useState<CostCentre[]>([]);
  const [searchId, setSearchId] = useState("");
  const [searchName, setSearchName] = useState("");
  const [filtered, setFiltered] = useState<CostCentre[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // Selections
  const [selectedDept, setSelectedDept] = useState<CostCentre | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  // Report state
  const [reportData, setReportData] = useState<NonMovingBOSItem[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const maroon = "text-[#7A0000]";
  const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";
  const currentYear = new Date().getFullYear();
  const pageSize = 9;

  // ── Fetch Cost Centres ───────────────────────────────────────────────────────

  useEffect(() => {
    const fetchDepartments = async () => {
      if (!epfNo) {
        setError("No EPF number available. Please login again.");
        toast.error("No EPF number available. Please login again.");
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(
          `/misapi/api/incomeexpenditure/departments/${encodeURIComponent(epfNo)}`,
          { method: "GET", headers: { "Content-Type": "application/json", Accept: "application/json" }, credentials: "include" }
        );
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const contentType = res.headers.get("content-type");
        if (!contentType?.includes("application/json")) throw new Error("Expected JSON response");
        const parsed = await res.json();
        const rawData = parseApiResponse(parsed);
        const final: CostCentre[] = rawData.map((item: any) => ({
          DeptId: item.DeptId?.toString() || "",
          DeptName: item.DeptName?.toString().trim() || "",
        }));
        setData(final);
        setFiltered(final);
      } catch (e: any) {
        setError(e.message);
        toast.error(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDepartments();
  }, [epfNo]);

  // ── Filter Cost Centres ──────────────────────────────────────────────────────

  useEffect(() => {
    const f = data.filter(
      (d) =>
        (!searchId || d.DeptId.toLowerCase().includes(searchId.toLowerCase())) &&
        (!searchName || d.DeptName.toLowerCase().includes(searchName.toLowerCase()))
    );
    setFiltered(f);
    setPage(1);
  }, [searchId, searchName, data]);

  // ── Fetch Warehouses ─────────────────────────────────────────────────────────

  useEffect(() => {
    const fetchWarehouses = async () => {
      setWarehouses([]);
      setSelectedWarehouse("");
      if (!selectedDept || !epfNo) return;
      setLoading(true);
      try {
        const url = `/misapi/api/inventoryaverageconsumption/warehouses/${encodeURIComponent(epfNo)}?costCenterId=${encodeURIComponent(selectedDept.DeptId)}&t=${Date.now()}`;
        const response = await fetch(url, {
          method: "GET",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          credentials: "include",
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result = await response.json();
        const rawData = parseApiResponse(result);
        const warehousesData: Warehouse[] = rawData.map((item: any) => ({
          WarehouseCode: item.WarehouseCode?.toString().trim() || "",
          CostCenterId: item.CostCenterId?.toString().trim() || "",
        }));
        const filteredData = warehousesData.filter(
          (item) => !item.CostCenterId || item.CostCenterId === selectedDept.DeptId
        );
        setWarehouses(filteredData);
        if (filteredData.length === 0) {
          toast.warn(`No warehouses found for cost center ${selectedDept.DeptId}.`);
        } else {
          if (filteredData.length === 1) setSelectedWarehouse(filteredData[0].WarehouseCode);
          toast.success(`Successfully fetched ${filteredData.length} warehouse(s).`);
        }
      } catch (error: any) {
        toast.error(`Failed to fetch warehouses: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchWarehouses();
  }, [selectedDept, epfNo]);

  // ── View Report ──────────────────────────────────────────────────────────────

  const handleViewReport = async () => {
    if (!selectedDept || !selectedWarehouse || !selectedMonth || !selectedYear) {
      toast.error("Please select all required fields");
      return;
    }
    setReportLoading(true);
    setShowReport(true);
    setReportData([]);
    try {
      const res = await fetch(
        `/misapi/api/phv-nonmovingwhwisebos-report/list?deptId=${encodeURIComponent(
          selectedDept.DeptId
        )}&repYear=${selectedYear}&repMonth=${selectedMonth}&warehouseCode=${encodeURIComponent(
          selectedWarehouse
        )}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const json = await res.json();
      const items: NonMovingBOSItem[] = Array.isArray(json) ? json : json.data || [];
      setReportData(items);
      items.length === 0
        ? toast.warn("No records found")
        : toast.success("Report loaded successfully");
    } catch (err: any) {
      toast.error("Failed to load report: " + (err.message || "Unknown error"));
    } finally {
      setReportLoading(false);
    }
  };

  const closeReport = () => {
    setShowReport(false);
    setReportData([]);
    setSelectedDept(null);
    setSelectedMonth(null);
    setSelectedYear(currentYear);
    setSelectedWarehouse("");
  };

  // ── CSV Download ─────────────────────────────────────────────────────────────

  const handleDownloadCSV = () => {
    if (!reportData.length || !selectedDept) return;

    const rows: string[] = [];
    rows.push(`"Form - AV/6 /BOS"`);
    rows.push(`"Board of Survey Recommendation for Non Moving Stocks - Annual Verification of the Year-${selectedYear}"`);
    rows.push(`"Cost Center: ${selectedDept.DeptId} - ${selectedDept.DeptName} | Warehouse: ${selectedWarehouse}"`);
    rows.push("");

    const headers = [
      "Serial No", "Code No", "Description", "Grade Code", "UOM",
      "Quantity", "Unit Price", "Total Stock Value",
      "Minimum Selling Price", "Recommendation (S/D)", "Reason",
    ];
    rows.push(headers.map((h) => `"${h}"`).join(","));

    reportData.forEach((item, idx) => {
      const row = [
        idx + 1,
        `\t${item.MaterialCode || ""}`,
        item.MaterialName || "",
        item.GradeCode || "",
        item.UomCode || "",
        formatNumber(item.QtyOnHand),
        formatNumber(item.UnitPrice),
        formatNumber(item.StockBook),
        "", "", item.Reason || "",
      ];
      rows.push(row.map((v) => `"${v}"`).join(","));
    });

    const blob = new Blob(["\uFEFF" + rows.join("\n")], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `PHV_NonMoving_BOS_${selectedDept.DeptId}_${selectedWarehouse}_${selectedYear}.csv`;
    link.click();
  };

  // ── Print PDF ─────────────────────────────────────────────────────────────────
  const printPDF = () => {
    if (!iframeRef.current || !selectedDept || !selectedWarehouse || reportData.length === 0) {
      toast.error("Please load the report before printing");
      return;
    }

    // ── PAGE LAYOUT (A4 Landscape) ──────────────────────────────────────────
    const PAGE_W = 297;
    const PAGE_H = 210;
    const M_TB = 10;
    const M_LR = 12;

    const HEADER_H = 22;
    const THEAD_H = 10;
    const SIG_H = 26;
    const FTR_H = 3;

    const DATA_AREA_H = PAGE_H - 2 * M_TB - HEADER_H - THEAD_H - SIG_H - FTR_H - 4;

    const CHARS_PER_LINE = 60;
    const LINE_H_MM = 3.4;
    const ROW_PAD_MM = 1.8;

    const getRowHeight = (desc: string): number => {
      const lines = Math.max(1, Math.ceil((desc || "").length / CHARS_PER_LINE));
      return ROW_PAD_MM + lines * LINE_H_MM;
    };

    // ── PAGINATION ────────────────────────────────────────────────────────────
    const chunks: NonMovingBOSItem[][] = [];
    let current: NonMovingBOSItem[] = [];
    let usedH = 0;

    for (const item of reportData) {
      const rh = getRowHeight(item.MaterialName);
      if (usedH + rh > DATA_AREA_H && current.length > 0) {
        chunks.push(current);
        current = [];
        usedH = 0;
      }
      current.push(item);
      usedH += rh;
    }
    if (current.length) chunks.push(current);

    const totalRowH = ROW_PAD_MM + LINE_H_MM;
    const lastUsed = (chunks[chunks.length - 1] ?? []).reduce(
      (s, it) => s + getRowHeight(it.MaterialName), 0
    );
    if (lastUsed + totalRowH > DATA_AREA_H) chunks.push([]);

    chunks.push([]); // BOS page

    const totalPages = chunks.length;
    const totalStockBook = reportData.reduce((s, x) => s + (x.StockBook || 0), 0);

    // ── CSS ────────────────────────────────────────────────────────────────────
    const css = `
      @page { size: A4 landscape; margin: 0; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Arial, sans-serif; font-size: 8.5pt; color: #000; }

      .page {
        position: relative;
        width:  ${PAGE_W}mm;
        height: ${PAGE_H}mm;
        page-break-after: always;
      }
      .page:last-child { page-break-after: auto; }

      .inner {
        position: absolute;
        top: ${M_TB}mm; bottom: ${M_TB}mm;
        left: ${M_LR}mm; right: ${M_LR}mm;
      }

      /* ── HEADER ── */
      .header { height: ${HEADER_H}mm; }
      .header-top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
      }
    
      .header-form {
        font-size: 8.5pt;
        font-weight: bold;
        text-align: right;
        white-space: nowrap;
        border: 0.6pt solid #7A0000;
        padding: 1mm 2mm;
        color: #7A0000;
      }
      .header-cc {
        font-size: 8.5pt;
        font-weight: bold;
        text-align: center;
        margin-top: 0.8mm;
        color: #333;
      }
      .header-title {
        font-size: 9pt;
        font-weight: bold;
        text-align: center;
        margin-top: 0.5mm;
        color: #7A0000;
      }

      /* ── TABLE ── */
      .table-area {
        position: absolute;
        top: ${HEADER_H}mm;
        left: 0; right: 0;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        font-size: 7.8pt;
      }
      th, td {
        border: 0.6pt solid #555;
        padding: 0.8mm 1.2mm;
        vertical-align: middle;
        word-wrap: break-word;
      }
      th {
        background: #e8e8e8;
        font-weight: bold;
        text-align: center;
        height: ${THEAD_H}mm;
        font-size: 7.5pt;
        color: #000;
      }
      td { color: #000; }

      .c-sn    { width: 4%;  text-align: center; }
      .c-code  { width: 8%;  text-align: center; }
      .c-desc  { width: 27%; text-align: left; line-height: 1.25; }
      .c-grade { width: 6%;  text-align: center; }
      .c-uom   { width: 5%;  text-align: center; }
      .c-qty   { width: 8%;  text-align: right; }
      .c-price { width: 10%; text-align: right; }
      .c-rec   { width: 18%; text-align: center; }
      .c-min   { width: 14%; text-align: center; }

      .total-row td { background: #ddd; font-weight: bold; color: #000; }

      /* ── SIGNATURE BLOCK (non-last pages) ── */
      .sig-block {
        position: absolute;
        bottom: ${FTR_H + 1}mm;
        left: 0; right: 0;
        height: ${SIG_H}mm;
        font-size: 8pt;
        padding-top: 1.5mm;
        color: #000;
      }
      .sig-row-top {
        display: flex;
        justify-content: space-between;
        margin-bottom: 1mm;
      }
      .sig-center {
        text-align: center;
        margin: 1mm 0;
        font-weight: bold;
        border-top: 0.8pt solid #000;
        padding-top: 1mm;
        color: #000;
      }
      .sig-row-bot { display: flex; justify-content: space-between; }
      .sig-col { display: flex; flex-direction: column; gap: 0.3mm; }

      /* ── FOOTER ── */
      .footer {
        position: absolute;
        bottom: 0;
        left: 0; right: 0;
        height: ${FTR_H}mm;
        font-size: 7.5pt;
        display: flex;
        justify-content: flex-end;
        align-items: flex-end;
        padding-bottom: 0.5mm;
        color: #000;
      }

      /* ── BOS SECTION (last page only) ── */
      .bos-section {
        position: absolute;
        top:    ${HEADER_H + THEAD_H + 3}mm;
        left:   0; right: 0;
        bottom: ${FTR_H}mm;
        font-size: 8pt;
        line-height: 1.5;
        overflow: hidden;
        color: #000;
      }

      /* inline sig inside bos-section */
      .bos-sig-block {
        height: ${SIG_H}mm;
        font-size: 8pt;
        padding-top: 1.5mm;
        margin-bottom: 8mm;
        color: #000;
      }

      .bos-title {
        font-weight: bold;
        font-size: 9.5pt;
        text-align: center;
        border-top: 0.8pt solid #000;
        padding-top: 2mm;
        margin-bottom: 2mm;
        color: #7A0000;
      }
      .bos-body {
        text-align: justify;
        margin-bottom: 3mm;
        line-height: 1.4;
        color: #000;
      }
      .bos-signed-label {
        font-weight: bold;
        margin-bottom: 1.5mm;
        color: #000;
      }
      .bos-sig-row {
        display: flex;
        align-items: flex-start;
        margin-bottom: 2mm;
        color: #000;
      }
      .bos-sig-name  { width: 42%; }
      .bos-sig-right { width: 58%; display: flex; flex-direction: column; gap: 0.2mm; }
      .bos-date-line { margin-top: 3mm; margin-bottom: 5mm; color: #000; }
      .bos-approval  { margin-top: 1mm; }
      .bos-approval-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 5mm 0;
        border-top: 0.6pt solid #000;
        color: #000;
      }
      .bos-approval-row:last-child { border-bottom: none; }
    `;

    // ── HEADER HTML ───────────────────────────────────────────────────────────
    const headerHTML = `
      <div class="header">
        <div class="header-top">
          <div style="flex:1"></div>
          <div style="flex:1; display:flex; justify-content:flex-end; align-items:flex-start;">
            <div class="header-form">Form - AV/6 /BOS</div>
          </div>
        </div>
        <div class="header-cc">
          Cost Center : ${esc(selectedDept!.DeptId)} - ${esc(selectedDept!.DeptName)}&nbsp;&nbsp;
          WARE HOUSE - ${esc(selectedWarehouse)}
        </div>
        <div class="header-title">
          Board of Survey Recommendation for Non Moving Stocks - Annual Verification of the Year-${selectedYear}
        </div>
      </div>`;

    // ── TABLE HEADER ──────────────────────────────────────────────────────────
    const theadHTML = `
      <thead>
        <tr>
          <th class="c-sn">Serial No</th>
          <th class="c-code">Code No</th>
          <th class="c-desc">Description</th>
          <th class="c-grade">Grade<br>Code</th>
          <th class="c-uom">UOM</th>
          <th class="c-qty">Quantity</th>
          <th class="c-price">Unit Price</th>
          <th class="c-rec">Recommendation of<br>S- To be Sold<br>D - To be Destroyed</th>
          <th class="c-min">Minimum selling price of<br>Total</th>
        </tr>
      </thead>`;

    // ── SIGNATURE BLOCK (non-last pages) ─────────────────────────────────────
    const sigBlockHTML = `
      <div class="sig-block">
        <div class="sig-row-top">
          <div class="sig-col">
            <span>.......................................</span>
            <span>Date</span>
          </div>
          <div class="sig-col" style="text-align:right; align-items:flex-end;">
            <span>.......................................</span>
            <span>Store keeper/E.S.</span>
          </div>
        </div>
        <div class="sig-center">Certified Correct</div>
        <div class="sig-row-bot">
          <div class="sig-col">
            <span>.......................................</span>
            <span>Enginer (Material Management)</span>
            <span style="font-size:7pt;">(For main stores only)</span>
          </div>
          <div class="sig-col" style="text-align:right; align-items:flex-end;">
            <span>.......................................</span>
            <span>Unit Head</span>
          </div>
        </div>
      </div>`;

    // ── INLINE SIGNATURE for last page ───────────────────────────────────────
    const inlineSigHTML = `
      <div class="bos-sig-block">
        <div class="sig-row-top">
          <div class="sig-col">
            <span>.......................................</span>
            <span>Date</span>
          </div>
          <div class="sig-col" style="text-align:right; align-items:flex-end;">
            <span>.......................................</span>
            <span>Store keeper/E.S.</span>
          </div>
        </div>
        <div class="sig-center">Certified Correct</div>
        <div class="sig-row-bot">
          <div class="sig-col">
            <span>.......................................</span>
            <span>Enginer (Material Management)</span>
            <span style="font-size:7pt;">(For main stores only)</span>
          </div>
          <div class="sig-col" style="text-align:right; align-items:flex-end;">
            <span>.......................................</span>
            <span>Unit Head</span>
          </div>
        </div>
      </div>`;

    // ── BOS SECTION (last page only) ─────────────────────────────────────────
    const bosSectionHTML = `
      <div class="bos-section">

        ${inlineSigHTML}

        <div class="bos-title">Recommendation of Board Survey</div>
        <div class="bos-body">
          We the member of the Board Survey which made a thorough inspection of the items mentioned
          in this document recommended the items aganist which the letter " S" has been marked as
          being beyound economic repairs and should therefore to be sold&nbsp; the items aganist which
          the letter " D" has been marked&nbsp; should&nbsp; be destroyed&nbsp; the items aganist
          which the letter " R" has been marked&nbsp; should&nbsp; to be repaired and used as it is
          advantageous economailly to do so
        </div>

        <div class="bos-signed-label">Singed by</div>

        <div class="bos-sig-row">
          <div class="bos-sig-name">
            <div>(1)..................................</div>
            <div>Chairman - BOS(Name)</div>
          </div>
          <div class="bos-sig-right">
            <div>..................................</div>
            <div>Signature</div>
          </div>
        </div>

        <div class="bos-sig-row">
          <div class="bos-sig-name">
            <div>(2)..................................</div>
            <div>Member - BOS(Name)</div>
          </div>
          <div class="bos-sig-right">
            <div>..................................</div>
            <div>Signature</div>
          </div>
        </div>

        <div class="bos-sig-row">
          <div class="bos-sig-name">
            <div>(3)..................................</div>
            <div>Member - BOS(Name)</div>
          </div>
          <div class="bos-sig-right">
            <div>..................................</div>
            <div>Signature</div>
          </div>
        </div>

        <div class="bos-sig-row">
          <div class="bos-sig-name">
            <div>(4)..................................</div>
            <div>Observer - BOS(Name)</div>
          </div>
          <div class="bos-sig-right">
            <div>..................................</div>
            <div>Signature</div>
          </div>
        </div>

        <div class="bos-date-line">
          Date &nbsp;: ..................................
        </div>

        <div class="bos-approval">
          <div class="bos-approval-row">
            <div>Date &nbsp;: ..................................</div>
            <div>DGM &nbsp;&nbsp;&nbsp;.....................................</div>
          </div>
          <div class="bos-approval-row">
            <div>Date &nbsp;: ..................................</div>
            <div>Additional General Manager &nbsp;&nbsp;.....................................</div>
          </div>
        </div>

      </div>`;

    // ── BUILD FULL HTML ───────────────────────────────────────────────────────
    let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${css}</style></head><body>`;
    let serial = 1;

    chunks.forEach((chunk, idx) => {
      const isLast = idx === totalPages - 1;
      const pageNum = idx + 1;

      const rowsHTML = chunk.map((item, i) => `
        <tr style="height:${getRowHeight(item.MaterialName)}mm;">
          <td class="c-sn">${serial + i}</td>
          <td class="c-code">${esc(item.MaterialCode)}</td>
          <td class="c-desc">${esc(item.MaterialName)}</td>
          <td class="c-grade">${esc(item.GradeCode)}</td>
          <td class="c-uom">${esc(item.UomCode)}</td>
          <td class="c-qty">${formatNumber(item.QtyOnHand)}</td>
          <td class="c-price">${formatNumber(item.UnitPrice)}</td>
          <td class="c-rec"></td>
          <td class="c-min"></td>
        </tr>`).join("");

      const totalHTML = isLast && chunk.length > 0 ? `
        <tr class="total-row">
          <td colspan="6" style="text-align:right;padding-right:2mm;">TOTAL</td>
          <td class="c-price"></td>
          <td class="c-rec"></td>
          <td class="c-min">${formatNumber(totalStockBook)}</td>
        </tr>` : "";

      html += `
        <div class="page">
          <div class="inner">

            ${headerHTML}

            <div class="table-area">
              <table>
                ${theadHTML}
                ${!isLast ? `<tbody>${rowsHTML}${totalHTML}</tbody>` : ""}
              </table>
            </div>

            ${!isLast ? sigBlockHTML : ""}

            ${isLast ? bosSectionHTML : ""}

            <div class="footer">
              <span>Page ${pageNum} of ${totalPages}</span>
            </div>

          </div>
        </div>`;

      serial += chunk.length;
    });

    html += `</body></html>`;

    const doc = iframeRef.current.contentDocument!;
    doc.open();
    doc.write(html);
    doc.close();

    setTimeout(() => iframeRef.current?.contentWindow?.print(), 800);
  };
  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-[95%] mx-auto p-2 md:p-4 bg-white rounded-xl shadow border border-gray-200 text-sm md:text-base font-sans">
      <iframe ref={iframeRef} style={{ display: "none" }} title="print-frame" />

      <h2 className={`text-lg md:text-xl font-bold mb-4 ${maroon}`}>
        PHV Non-Moving WH-wise BOS
      </h2>

      {/* ── Filters / Selectors ── */}
      <div className="flex flex-col md:flex-row flex-wrap gap-2 md:gap-3 mb-4 justify-end items-end">
        <div className="flex items-center gap-2">
          <YearMonthDropdowns
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
            className="gap-4"
          />
        </div>
        <div className="flex flex-col md:flex-row gap-2 items-end">
          <div className="flex flex-col">
            <label className={`text-xs md:text-sm font-bold ${maroon} mb-1`}>
              Warehouse Code
            </label>
            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="pl-2 md:pl-3 pr-2 md:pr-3 py-1 md:py-1.5 w-full md:w-40 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A0000] transition text-xs md:text-sm"
              disabled={!selectedDept || loading}
            >
              <option value="">Select Warehouse</option>
              {warehouses.map((wh) => (
                <option key={wh.WarehouseCode} value={wh.WarehouseCode}>
                  {wh.WarehouseCode}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleViewReport}
            disabled={!selectedDept || !selectedWarehouse || !selectedYear || !selectedMonth || loading}
            className={`px-2 md:px-3 py-1 md:py-1 ${maroonGrad} text-white rounded-md text-xs md:text-sm font-medium hover:brightness-110 transition shadow ${!selectedDept || !selectedWarehouse || !selectedYear || !selectedMonth || loading
                ? "opacity-50 cursor-not-allowed"
                : ""
              }`}
          >
            <Eye className="inline-block mr-1 w-3 h-3" />
            View
          </button>
        </div>
      </div>

      {/* ── Cost Centre Search ── */}
      <div className="flex flex-col md:flex-row flex-wrap gap-2 md:gap-3 mb-2 md:mb-4">
        <div className="relative w-full md:w-auto">
          <Search className="absolute left-2 md:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
          <input
            type="text"
            value={searchId}
            placeholder="Search by Cost Center ID"
            onChange={(e) => setSearchId(e.target.value)}
            className="pl-8 pr-2 py-1 md:py-1.5 w-full md:w-40 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A0000] transition text-xs md:text-sm"
            autoComplete="off"
          />
        </div>
        <div className="relative w-full md:w-auto">
          <Search className="absolute left-2 md:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
          <input
            type="text"
            value={searchName}
            placeholder="Search by Name"
            onChange={(e) => setSearchName(e.target.value)}
            className="pl-8 pr-2 py-1 md:py-1.5 w-full md:w-40 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A0000] transition text-xs md:text-sm"
            autoComplete="off"
          />
        </div>
        {(searchId || searchName) && (
          <button
            onClick={() => { setSearchId(""); setSearchName(""); }}
            className="flex items-center gap-1 px-2 md:px-3 py-1 md:py-1.5 border border-gray-300 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs md:text-sm"
          >
            <RotateCcw className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {/* ── Loading / Error / Empty ── */}
      {loading && !warehouses.length && (
        <div className="text-center py-4 md:py-8">
          <div className="animate-spin rounded-full h-6 md:h-8 w-6 md:w-8 border-b-2 border-[#7A0000] mx-auto" />
          <p className="mt-1 md:mt-2 text-gray-600 text-xs md:text-sm">Loading cost centers...</p>
        </div>
      )}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-2 md:px-4 py-2 md:py-3 rounded mb-2 md:mb-4 text-xs md:text-sm">
          Error: {error}
        </div>
      )}
      {!loading && !error && filtered.length === 0 && (
        <div className="text-gray-600 bg-gray-100 p-2 md:p-4 rounded text-xs md:text-sm">
          No cost centers found.
        </div>
      )}

      {/* ── Cost Centre Table ── */}
      {!loading && !error && filtered.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <div className="max-h-[50vh] overflow-y-auto">
              <table className="w-full table-fixed text-left text-gray-700 text-xs md:text-sm">
                <thead className={`${maroonGrad} text-white sticky top-0`}>
                  <tr>
                    <th className="px-2 md:px-4 py-1 md:py-2 w-1/2 md:w-auto">Cost Center Code</th>
                    <th className="px-2 md:px-4 py-1 md:py-2 w-1/2 md:w-auto">Cost Center Name</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice((page - 1) * pageSize, page * pageSize).map((department, i) => (
                    <tr
                      key={`${department.DeptId}-${i}`}
                      onClick={() => setSelectedDept(department)}
                      className={`cursor-pointer ${selectedDept?.DeptId === department.DeptId
                          ? "bg-[#7A0000] text-white"
                          : i % 2
                            ? "bg-white hover:bg-gray-100"
                            : "bg-gray-50 hover:bg-gray-100"
                        }`}
                    >
                      <td className="px-2 md:px-4 py-1 md:py-2 truncate">{department.DeptId}</td>
                      <td className="px-2 md:px-4 py-1 md:py-2 truncate">{department.DeptName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-end items-center gap-2 md:gap-3 mt-2 md:mt-3">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-2 md:px-3 py-1 border rounded bg-white text-gray-600 text-xs md:text-sm hover:bg-gray-100 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-xs md:text-sm text-gray-600">
              Page {page} of {Math.ceil(filtered.length / pageSize)}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(Math.ceil(filtered.length / pageSize), p + 1))}
              disabled={page >= Math.ceil(filtered.length / pageSize)}
              className="px-2 md:px-3 py-1 border rounded bg-white text-gray-600 text-xs md:text-sm hover:bg-gray-100 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </>
      )}

      {/* ── Report Viewer ── */}
      {showReport && selectedDept && (
        <ReportViewer
          title={`PHV NON-MOVING BOS - ${selectedYear}`}
          subtitlebold2="Cost Center :"
          subtitlenormal2={`${selectedDept.DeptId} - ${selectedDept.DeptName} | Warehouse: ${selectedWarehouse}`}
          loading={reportLoading}
          hasData={reportData.length > 0}
          handleDownloadCSV={handleDownloadCSV}
          printPDF={printPDF}
          closeReport={closeReport}
        >
          <table className="w-full text-xs border-collapse">
            <thead className={`${maroonGrad} text-white`}>
              <tr>
                <th className="border border-gray-400 px-2 py-2 text-center">Serial No</th>
                <th className="border border-gray-400 px-2 py-2 text-center">Code No</th>
                <th className="border border-gray-400 px-2 py-2 text-left">Description</th>
                <th className="border border-gray-400 px-2 py-2 text-center">Grade Code</th>
                <th className="border border-gray-400 px-2 py-2 text-center">UOM</th>
                <th className="border border-gray-400 px-2 py-2 text-right">Quantity</th>
                <th className="border border-gray-400 px-2 py-2 text-right">Unit Price</th>
                <th className="border border-gray-400 px-2 py-2 text-right">Total Stock Value</th>
                <th className="border border-gray-400 px-2 py-2 text-left">Reason</th>
              </tr>
            </thead>
            <tbody>
              {reportData.map((item, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="border border-gray-300 px-2 py-2 text-center">{idx + 1}</td>
                  <td className="border border-gray-300 px-2 py-2 text-center">{item.MaterialCode}</td>
                  <td className="border border-gray-300 px-2 py-2 text-left">{item.MaterialName}</td>
                  <td className="border border-gray-300 px-2 py-2 text-center">{item.GradeCode}</td>
                  <td className="border border-gray-300 px-2 py-2 text-center">{item.UomCode}</td>
                  <td className="border border-gray-300 px-2 py-2 text-right">{formatNumber(item.QtyOnHand)}</td>
                  <td className="border border-gray-300 px-2 py-2 text-right">{formatNumber(item.UnitPrice)}</td>
                  <td className="border border-gray-300 px-2 py-2 text-right">{formatNumber(item.StockBook)}</td>
                  <td className="border border-gray-300 px-2 py-2 text-left">{item.Reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ReportViewer>
      )}
    </div>
  );
};

export default PHVNonMovingWHwiseBOS;