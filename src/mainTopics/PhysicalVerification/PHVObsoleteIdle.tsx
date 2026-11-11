import React, { useState, useRef, useEffect } from "react";
import { useUser } from "../../contexts/UserContext";
import { toast } from "react-toastify";
import ReportViewer from "../../components/utils/ReportViewer";
import YearMonthDropdowns from "../../components/utils/YearMonthDropdowns";
import { Search, RotateCcw, Eye } from "lucide-react";

interface CostCentre {
  DeptId: string;
  DeptName: string;
}

interface Warehouse {
  WarehouseCode: string;
  CostCenterId?: string;
}

interface PHVObsoleteIdleItem {
  PhvDate: string;
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

const formatNumber = (num: number | null | undefined): string => {
  if (num == null) return "0.00";
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};


const PHVObsoleteIdleWHwise: React.FC = () => {
  const { user } = useUser();
  const epfNo = user?.Userno || "";
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [data, setData] = useState<CostCentre[]>([]);
  const [searchId, setSearchId] = useState("");
  const [searchName, setSearchName] = useState("");
  const [filtered, setFiltered] = useState<CostCentre[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [selectedDept, setSelectedDept] = useState<CostCentre | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [reportData, setReportData] = useState<PHVObsoleteIdleItem[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const maroon = "text-[#7A0000]";
  const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";

  const currentYear = new Date().getFullYear();

  const pageSize = 9;

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
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            credentials: "include",
          }
        );
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`HTTP error! status: ${res.status}, message: ${errorText}`);
        }
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const text = await res.text();
          throw new Error(`Expected JSON but got ${contentType}. Response: ${text.substring(0, 100)}`);
        }
        const parsed = await res.json();
        const rawData = parseApiResponse(parsed);
        const final: CostCentre[] = rawData.map((item: any) => ({
          DeptId: item.DeptId?.toString() || "",
          DeptName: item.DeptName?.toString().trim() || "",
        }));
        setData(final);
        setFiltered(final);
      } catch (e: any) {
        console.error("Cost Center Fetch Error:", e);
        const errorMessage = e.message.includes("JSON.parse")
          ? "Invalid data format received from server."
          : e.message.includes("Failed to fetch")
          ? "Failed to connect to the server. Please check if the server is running."
          : e.message;
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };
    fetchDepartments();
  }, [epfNo]);

  useEffect(() => {
    const f = data.filter(
      (d) =>
        (!searchId || d.DeptId.toLowerCase().includes(searchId.toLowerCase())) &&
        (!searchName || d.DeptName.toLowerCase().includes(searchName.toLowerCase()))
    );
    setFiltered(f);
    setPage(1);
  }, [searchId, searchName, data]);

  useEffect(() => {
    const fetchWarehouses = async () => {
      setWarehouses([]);
      setSelectedWarehouse("");
      if (!selectedDept || !epfNo) {
        return;
      }
      setLoading(true);
      try {
        const url = `/misapi/api/inventoryaverageconsumption/warehouses/${encodeURIComponent(epfNo)}?costCenterId=${encodeURIComponent(selectedDept.DeptId)}&t=${Date.now()}`;
        console.log("Fetching warehouses from:", url);
        console.log("Selected Cost Center ID:", selectedDept.DeptId);

        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          credentials: "include",
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const text = await response.text();
          throw new Error(`Expected JSON but got ${contentType}. Response: ${text.substring(0, 100)}`);
        }
        const result = await response.json();
        console.log("Raw Warehouse API Response:", result);
        const rawData = parseApiResponse(result);
        const warehousesData: Warehouse[] = rawData.map((item: any) => ({
          WarehouseCode: item.WarehouseCode?.toString().trim() || "",
          CostCenterId: item.CostCenterId?.toString().trim() || "",
        }));
        // Fallback client-side filter
        const filteredData = warehousesData.filter((item) => !item.CostCenterId || item.CostCenterId === selectedDept.DeptId);
        console.log("Filtered Warehouses:", filteredData);
        setWarehouses(filteredData);
        if (filteredData.length === 0) {
          toast.warn(`No warehouses found for cost center ${selectedDept.DeptId}.`);
        } else {
          if (filteredData.length === 1) {
            setSelectedWarehouse(filteredData[0].WarehouseCode);
          }
          toast.success(`Successfully fetched ${filteredData.length} warehouse(s) for cost center ${selectedDept.DeptId}.`);
        }
      } catch (error: any) {
        console.error("Warehouse Fetch Error Details:", error);
        const errorMessage = error.message.includes("Failed to fetch")
          ? "Failed to connect to the server. Please verify the warehouse endpoint exists."
          : error.message;
        toast.error(`Failed to fetch warehouses: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };
    fetchWarehouses();
  }, [selectedDept, epfNo]);

  const handleViewReport = async () => {
    if (!selectedDept) {
      toast.error("Please select a cost center.");
      return;
    }
    if (!selectedWarehouse) {
      toast.error("Please select a warehouse code.");
      return;
    }
    if (!selectedMonth || !selectedYear) {
      toast.error("Please select both Month and Year");
      return;
    }
    setReportLoading(true);
    setShowReport(true);
    setReportData([]);
    try {
     const res = await fetch(
  `/misapi/api/phv-obsolete-idle/list?deptId=${encodeURIComponent(
    selectedDept.DeptId
  )}&repYear=${selectedYear}&repMonth=${selectedMonth}&warehouseCode=${encodeURIComponent(
    selectedWarehouse
  )}`
);
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errorText}`);
      }
      const json = await res.json();
      const items: PHVObsoleteIdleItem[] = Array.isArray(json) ? json : json.data || [];
      setReportData(items);
      items.length === 0
        ? toast.warn("No records found")
        : toast.success("Report loaded successfully");
    } catch (err: any) {
      console.error("Report fetch error:", err);
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

  const handleDownloadCSV = () => {
  if (reportData.length === 0 || !selectedDept) return;

  const csvSafe = (value: any) => {
    if (value == null) return '""';
    const str = String(value).replace(/"/g, '""');
    return `"${str}"`;
  };

  const COLS = 8;
  const rowOf = (cells: (string | number)[]) => {
    const r = [...cells];
    while (r.length < COLS) r.push("");
    return r.map(csvSafe).join(",");
  };

  const phvDateCsv = reportData[0]?.PhvDate?.split("T")[0] || "..............";

  const csvRows: string[] = [
    rowOf(["TO BE FILLED IN TRIPLICATE", "", "", "", "", "", "", "Form - AV/7 (A)"]),
    rowOf(["1. Original : Director"]),
    rowOf(["2. Duplicate : Engineer-in-charge"]),
    rowOf(["3. Triplicate : Store-keeper/E.S.(C.S.C.)"]),
    rowOf([]),
    rowOf([`ANNUAL VERIFICATION OF STORES/STOCKS - ${selectedYear}`]),
    rowOf(["Statement of Obsolete and Idle Stocks"]),
    rowOf([`LOCATION: ${selectedDept.DeptName} - ${selectedWarehouse}`, "", "", "", "", "", "", `SHEET NO. : ${reportData[0]?.DocumentNo || ""}`]),
    rowOf(["", "", "", "", "", "", "", `DATE OF VERIFICATION : ${phvDateCsv}`]),
    rowOf([]),
  ];

  csvRows.push(["1", "2", "3", "4", "5", "6", "7", "8"].map(csvSafe).join(","));
  csvRows.push(["STOCK", "", "QUANTITY", "UNIT PRICE (Rs.)", "COST (Rs.)", "STATUS (O/I)*", "REASONS", "RECOMMENDED ACTION TO BE TAKEN"].map(csvSafe).join(","));
  csvRows.push(["ITEM", "DESCRIPTION", "", "", "", "", "", ""].map(csvSafe).join(","));

  reportData.forEach((item, idx) => {
    const row = [
      item.MaterialCode || "",
      item.GradeCode ? `${item.MaterialName || ""} (Grade: ${item.GradeCode})` : item.MaterialName || "",
      formatNumber(item.QtyOnHand),
      formatNumber(item.UnitPrice),
      formatNumber(item.StockBook),
      "",
      item.Reason || "",
      "",
    ];
    csvRows.push(row.map(csvSafe).join(","));
  });

  csvRows.push(["Total", "", "", "", "-", "", "", ""].map(csvSafe).join(","));
  /* Signature section (once, at the end) */
  csvRows.push(
    rowOf([]),
    rowOf(["We do hereby certify that the stocks were physically verified as per the given statement."]),
    rowOf(["*- Obsolete/idle"]),
    rowOf([]),
    rowOf(["Signature of the Board of Verification", "", "", "", "", "", "", "Agreed & Certified Correct by"]),
    rowOf(["1. ................................", "", "", "", "", "", "", "......................................"]),
    rowOf(["2. ................................", "", "", "", "", "", "", "Store-keeper/E.S.(C.S.C.)"]),
    rowOf(["3. ................................"])
  );

  const csvContent = csvRows.join("\n");
  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `PHV_Obsolete_Idle_WHwise_${selectedDept.DeptId}_${selectedWarehouse}_${selectedYear}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

const printPDF = () => {
  if (reportData.length === 0 || !iframeRef.current || !selectedDept || !selectedWarehouse) {
    toast.error("Please select Cost Center, Warehouse, Year/Month and click 'View' first");
    return;
  }

  // ── PAGE LAYOUT CONSTANTS (Landscape A4) ──────────────────────────────
  const PAGE_H        = 210;
  const MARGIN_TOP    = 8;
  const MARGIN_BOTTOM = 8;
  const MARGIN_LR     = 8;

  const USABLE_H = PAGE_H - MARGIN_TOP - MARGIN_BOTTOM; // 277mm

  const FULL_HEADER_H  = 39;   // first page only
  const TABLE_HEADER_H = 20;   // column headings repeat on every page
  const SIGNATURE_H    = 35;   // last page only
  const ROW_HEIGHT     = 6.5;
  const ROW_BUFFER     = 2;

  // ── HELPERS ────────────────────────────────────────────────────────────
  const esc = (v: any) =>
    String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const formatNum = (n: number | null | undefined) =>
    (n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const phvDate = reportData[0]?.PhvDate?.split("T")[0] || "..............";

  // ── TOTALS ─────────────────────────────────────────────────────────────
  // ── DATA ROWS ──────────────────────────────────────────────────────────
  const dataRows = reportData.map((item, idx) => `
    <tr>
      <td class="item">${esc(item.MaterialCode)}</td>
      <td class="description">${esc(item.GradeCode ? `${item.MaterialName} (Grade: ${item.GradeCode})` : item.MaterialName)}</td>
      <td class="right">${formatNum(item.QtyOnHand)}</td>
      <td class="right">${formatNum(item.UnitPrice)}</td>
      <td class="right">${formatNum(item.StockBook)}</td>
      <td></td>
      <td class="left">${esc(item.Reason || "")}</td>
      <td></td>
    </tr>`);

  const totalRow = `<tr class="total-row"><td>Total</td><td></td><td></td><td></td><td>-</td><td></td><td></td><td></td></tr>`;

  // ── PAGINATE: header on the first page only, signature on the last page only ──
  const entries = [...dataRows, totalRow];

  const rowsThatFit = (heightMm: number) =>
    Math.max(1, Math.floor(heightMm / ROW_HEIGHT) - ROW_BUFFER);

  const CAP_FIRST          = rowsThatFit(USABLE_H - FULL_HEADER_H - TABLE_HEADER_H);
  const CAP_MIDDLE         = rowsThatFit(USABLE_H - TABLE_HEADER_H);
  const CAP_FIRST_AND_LAST = rowsThatFit(USABLE_H - FULL_HEADER_H - TABLE_HEADER_H - SIGNATURE_H);
  const CAP_LAST           = rowsThatFit(USABLE_H - TABLE_HEADER_H - SIGNATURE_H);

  const pages: { rows: string[]; isFirst: boolean; isLast: boolean }[] = [];
  let idx = 0;

  while (idx < entries.length) {
    const isFirst = pages.length === 0;
    const remaining = entries.length - idx;
    const capFull = isFirst ? CAP_FIRST : CAP_MIDDLE;
    const capLast = isFirst ? CAP_FIRST_AND_LAST : CAP_LAST;

    let take: number;
    let isLast = false;

    if (remaining <= capLast) {
      take = remaining;                    // everything left fits together with the signature
      isLast = true;
    } else if (remaining <= capFull) {
      take = Math.max(1, remaining - 1);   // keep at least one row for the last page
    } else {
      take = capFull;
    }

    pages.push({ rows: entries.slice(idx, idx + take), isFirst, isLast });
    idx += take;
  }

  const theadHTML = `
    <colgroup>
      <col class="item-col"><col class="description-col"><col class="quantity-col"><col class="price-col">
      <col class="cost-col"><col class="status-col"><col class="reason-col"><col class="action-col">
    </colgroup>
    <thead>
      <tr class="number-row">${Array.from({ length: 8 }, (_, index) => `<th>${index + 1}</th>`).join("")}</tr>
      <tr class="label-row">
        <th colspan="2">S T O C K</th>
        <th rowspan="2" class="quantity-col">QUANTITY</th>
        <th rowspan="2" class="price-col">UNIT PRICE (Rs.)</th>
        <th rowspan="2" class="cost-col">COST (Rs.)</th>
        <th rowspan="2" class="status-col">STATUS (O/I)<br>*</th>
        <th rowspan="2" class="reason-col">REASONS</th>
        <th rowspan="2" class="action-col">RECOMMENDED ACTION TO BE TAKEN</th>
      </tr>
      <tr class="subheader-row"><th>ITEM</th><th>DESCRIPTION</th></tr>
    </thead>`;

  // ── FULL HEADER — first page only ─────────────────────────────────────
  const fullHeaderHTML = `
    <div class="header" style="height:${FULL_HEADER_H}mm;">
      <div class="copies">
        <div><strong>TO BE FILLED IN TRIPLICATE</strong><br>1. Original : Director<br>2. Duplicate : Engineer-in-charge<br>3. Triplicate : Store-keeper/E.S.(C.S.C.)</div>
        <strong>Form - AV/7 (A)</strong>
      </div>
      <h1>ANNUAL VERIFICATION OF STORES/STOCKS - ${selectedYear}</h1>
      <h3>Statement of Obsolete and Idle Stocks</h3>
      <div class="subtitles-row">
        <span>LOCATION: ${esc(selectedDept.DeptName)} - ${esc(selectedWarehouse)}</span>
        <span>SHEET NO. : ${esc(reportData[0]?.DocumentNo || "")}</span>
      </div>
      <div class="verification-date">DATE OF VERIFICATION : ${esc(phvDate)}</div>
    </div>`;

  // ── SIGNATURE — matches PDF layout exactly ─────────────────────────────
  // Left: "We do hereby certify..." + numbered table
const signatureHTML = `
  <div class="sig-section">
    <div class="sig-top">
      <div class="sig-cert">We do hereby certify that the stocks were physically verified as per the given statement.</div>
      <div class="sig-agreed">Agreed &amp; Certified Correct by</div>
    </div>
    <div class="obsolete-note">*- Obsolete/idle</div>
    <div class="sig-bottom">
      <div class="sig-board-label"><strong>Signature of the<br>Board of Verification</strong></div>
      <div class="sig-board-lines">
        <div>1. ................................</div>
        <div>2. ................................</div>
        <div>3. ................................</div>
      </div>
      <div class="sig-store">
        <div class="sig-dots">......................................</div>
        <strong>Store-keeper/E.S.(C.S.C.)</strong>
      </div>
    </div>
  </div>`;

  // ── STYLES ─────────────────────────────────────────────────────────────
  const styles = `
    @page {
      size: A4 landscape;
      margin: ${MARGIN_TOP}mm ${MARGIN_LR}mm ${MARGIN_BOTTOM}mm ${MARGIN_LR}mm;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-size: 8pt; }

    .page {
      position: relative;
      width: 100%;
      height: ${USABLE_H}mm;
      overflow: hidden;
      page-break-after: always;
    }
    .page:last-child { page-break-after: auto; }

    .page-top {
      position: absolute;
      top: 0; left: 0; right: 0;
    }

    /* Always pinned to bottom regardless of row count */
    .page-bottom {
      position: absolute;
      bottom: 0; left: 0; right: 0;
      height: ${SIGNATURE_H}mm;
    }

    /* ── HEADER ── */
    .header { overflow: hidden; padding-bottom: 1mm; }
    .copies { display: flex; justify-content: space-between; font-size: 8pt; line-height: 1.25; margin-bottom: 1.5mm; }
    h1 { font-size: 16px; color: #7A0000; font-weight: bold; text-align: center; margin: 0 0 1mm; line-height: 1.2; }
    h3 { font-size: 13px; color: #000; font-weight: bold; text-align: center; margin: 0 0 1.5mm; line-height: 1.2; }

    .subtitles-row {
      display: flex;
      justify-content: space-between;
      font-size: 7.5pt;
      margin-bottom: 0.7mm;
      line-height: 1.3;
    }
    .verification-date { text-align: right; font-size: 7.5pt; line-height: 1.2; }

    /* ── MAIN TABLE ── */
    .table-wrapper { overflow: hidden; }

    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 7pt;
    }
    th, td {
      border: 0.5pt solid #333;
      padding: 0.7mm 1mm;
      overflow: hidden;
      word-wrap: break-word;
      vertical-align: middle;
    }
    th {
      background: #ffffff;
      font-weight: bold;
      text-align: center;
      font-size: 7pt;
      line-height: 1.15;
    }
    .number-row { height: 4mm; }
    .label-row { height: 9mm; }
    .subheader-row { height: 7mm; }
    tbody tr { height: ${ROW_HEIGHT}mm; }

    /* Column widths */
    .item-col { width: 12%; }
    .description-col { width: 16%; }
    .quantity-col { width: 9%; }
    .price-col { width: 10%; }
    .cost-col { width: 9%; }
    .status-col { width: 8%; }
    .reason-col { width: 10%; }
    .action-col { width: 26%; }
    td.item { text-align: center; }
    td.description { text-align: left; font-size: 6.5pt; line-height: 1.2; }
    td.quantity-col, td.price-col, td.cost-col { text-align: right; }
    td.reason-col, td.status-col { text-align: center; }
    td.action-col { text-align: left; }

    .center { text-align: center; }
    .right  { text-align: right; }
    .left   { text-align: left; }
    .total-row { background: #ffffff; font-size: 7.5pt; font-weight: normal; }
    .total-row td:first-child { text-align: left; }
    .total-row td:nth-child(5) { text-align: center; }

    /* ── SIGNATURE SECTION ── */
    .sig-section {
      height: ${SIGNATURE_H}mm;
      overflow: hidden;
      padding: 1.5mm 0 0;
      font-size: 7.5pt;
    }
    .sig-top { display: flex; justify-content: space-between; align-items: flex-start; }
    .sig-cert { line-height: 1.3; }
    .sig-agreed { margin-top: 3.5mm; margin-right: 9%; white-space: nowrap; }
    .obsolete-note { margin: 2mm 0 1mm; }
    .sig-bottom { display: flex; align-items: flex-start; }
    .sig-board-label { width: 24%; line-height: 1.35; }
    .sig-board-lines { width: 30%; }
    .sig-board-lines div { height: 6mm; line-height: 6mm; white-space: nowrap; }
    .sig-store { margin-left: auto; margin-right: 9%; text-align: center; }
    .sig-dots { margin-bottom: 1.5mm; white-space: nowrap; }
  `;

  // ── ASSEMBLE PAGES ─────────────────────────────────────────────────────
  let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${styles}</style></head><body>`;

  pages.forEach((pg) => {
    const tableWrapH = USABLE_H - (pg.isFirst ? FULL_HEADER_H : 0) - (pg.isLast ? SIGNATURE_H : 0);

    html += `
      <div class="page">

        <div class="page-top">
          ${pg.isFirst ? fullHeaderHTML : ""}
          <div class="table-wrapper" style="height:${tableWrapH}mm;">
            <table>
              ${theadHTML}
              <tbody>
                ${pg.rows.join("")}
              </tbody>
            </table>
          </div>
        </div>

        ${pg.isLast ? `<div class="page-bottom">${signatureHTML}</div>` : ""}

      </div>`;
  });

  html += `</body></html>`;

  const doc = iframeRef.current.contentDocument!;
  doc.open();
  doc.write(html);
  doc.close();
  setTimeout(() => iframeRef.current?.contentWindow?.print(), 800);
};
  return (
    <div className="max-w-[95%] mx-auto p-2 md:p-4 bg-white rounded-xl shadow border border-gray-200 text-sm md:text-base font-sans">
      <iframe
        ref={iframeRef}
        style={{ display: "none" }}
        title="print-frame"
      />

      <h2 className={`text-lg md:text-xl font-bold mb-4 ${maroon}`}>
        6.1. Physical Verification Obsolete / Idle (GRADE Code) AV/7A
      </h2>

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

        <div className="flex flex-col md:flex-row gap-2 md:gap-2 items-end">
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
            disabled={!selectedDept || !selectedWarehouse || loading}
            className={`px-2 md:px-3 py-1 md:py-1 ${maroonGrad} text-white rounded-md text-xs md:text-sm font-medium hover:brightness-110 transition shadow ${
              !selectedDept || !selectedWarehouse || loading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <Eye className="inline-block mr-1 w-3 md:w-3 h-3 md:h-3" />
            View
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row flex-wrap gap-2 md:gap-3 mb-2 md:mb-4">
        <div className="relative w-full md:w-auto">
          <Search className="absolute left-2 md:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 md:w-3 h-3 md:h-3" />
          <input
            type="text"
            value={searchId}
            placeholder="Search by Cost Center ID"
            onChange={(e) => setSearchId(e.target.value)}
            className="pl-8 md:pl-8 pr-2 md:pr-3 py-1 md:py-1.5 w-full md:w-40 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A0000] transition text-xs md:text-sm"
            autoComplete="off"
          />
        </div>
        <div className="relative w-full md:w-auto">
          <Search className="absolute left-2 md:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 md:w-3 h-3 md:h-3" />
          <input
            type="text"
            value={searchName}
            placeholder="Search by Name"
            onChange={(e) => setSearchName(e.target.value)}
            className="pl-8 md:pl-10 pr-2 md:pr-3 py-1 md:py-1.5 w-full md:w-40 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A0000] transition text-xs md:text-sm"
            autoComplete="off"
          />
        </div>
        {(searchId || searchName) && (
          <button
            onClick={() => { setSearchId(""); setSearchName(""); }}
            className="flex items-center gap-1 px-2 md:px-3 py-1 md:py-1.5 border border-gray-300 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs md:text-sm"
          >
            <RotateCcw className="w-3 md:w-3 h-3 md:h-3" /> Clear
          </button>
        )}
      </div>

      {loading && !warehouses.length && (
        <div className="text-center py-4 md:py-8">
          <div className="animate-spin rounded-full h-6 md:h-8 w-6 md:w-8 border-b-2 border-[#7A0000] mx-auto"></div>
          <p className="mt-1 md:mt-2 text-gray-600 text-xs md:text-sm">
            Loading cost centers...
          </p>
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

      {!loading && !error && filtered.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <div className="max-h-[50vh] overflow-y-auto">
              <table className="w-full table-fixed text-left text-gray-700 text-xs md:text-sm">
                <thead className={`${maroonGrad} text-white sticky top-0`}>
                  <tr>
                    <th className="px-2 md:px-4 py-1 md:py-2 w-1/2 md:w-auto">
                      Cost Center Code
                    </th>
                    <th className="px-2 md:px-4 py-1 md:py-2 w-1/2 md:w-auto">
                      Cost Center Name
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice((page - 1) * pageSize, page * pageSize).map((department, i) => (
                    <tr
                      key={`${department.DeptId}-${i}`}
                      onClick={() => setSelectedDept(department)}
                      className={`cursor-pointer ${
                        selectedDept?.DeptId === department.DeptId
                          ? "bg-[#7A0000] text-white"
                          : i % 2 ? "bg-white hover:bg-gray-100" : "bg-gray-50 hover:bg-gray-100"
                      }`}
                    >
                      <td className="px-2 md:px-4 py-1 md:py-2 truncate min-w-0">
                        {department.DeptId}
                      </td>
                      <td className="px-2 md:px-4 py-1 md:py-2 truncate min-w-0">
                        {department.DeptName}
                      </td>
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
              className="px-2 md:px-3 py-1 md:py-1 border rounded bg-white text-gray-600 text-xs md:text-sm hover:bg-gray-100 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-xs md:text-sm text-gray-600">
              Page {page} of {Math.ceil(filtered.length / pageSize)}
            </span>
            <button
              onClick={() =>
                setPage((p) => Math.min(Math.ceil(filtered.length / pageSize), p + 1))
              }
              disabled={page >= Math.ceil(filtered.length / pageSize)}
              className="px-2 md:px-3 py-1 md:py-1 border rounded bg-white text-gray-600 text-xs md:text-sm hover:bg-gray-100 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </>
      )}

      {showReport && selectedDept && (
        <ReportViewer
          title={`6.1. Physical Verification Obsolete / Idle (GRADE Code) AV/7A - ${selectedYear}`}
          subtitlebold2="COST CENTRE :"
          subtitlenormal2={`${selectedDept.DeptId} - ${selectedDept.DeptName} - WARE HOUSE - ${selectedWarehouse}`}
          loading={reportLoading}
          hasData={reportData.length > 0}
          handleDownloadCSV={handleDownloadCSV}
          printPDF={printPDF}
          closeReport={closeReport}
          plain
        >
          {(() => {
            const th = "border border-gray-400 px-2 py-1 text-center";
            const verificationDate = reportData[0]?.PhvDate?.split("T")[0] || "..............";

            return (
              <div className="text-xs">
                <div className="flex justify-between items-start mb-3 leading-relaxed">
                  <div>
                    <div className="font-bold mb-0.5">TO BE FILLED IN TRIPLICATE</div>
                    <div>1. ORIGINAL : Director</div>
                    <div>2. DUPLICATE : Engineer-in-charge</div>
                    <div>3. TRIPLICATE : Store-keeper/E.S.(C.S.C.)</div>
                  </div>
                  <div>
                    <div>Form - AV/7A</div>
                    <div>Sheet No : {reportData[0]?.DocumentNo || ""}</div>
                    <div>Date of Verification : {verificationDate}</div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1000px] table-fixed border-collapse">
              <colgroup>
                <col style={{ width: "12%" }} />
                <col style={{ width: "16%" }} />
                <col style={{ width: "9%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "9%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "26%" }} />
              </colgroup>
              <thead className={`${maroonGrad} text-white`}>
                <tr>
                  {Array.from({ length: 8 }, (_, index) => (
                    <th key={index} className={th}>{index + 1}</th>
                  ))}
                </tr>
                <tr>
                  <th colSpan={2} className={th}>S T O C K</th>
                  <th rowSpan={2} className={th}>QUANTITY</th>
                  <th rowSpan={2} className={th}>UNIT PRICE (Rs.)</th>
                  <th rowSpan={2} className={th}>COST (Rs.)</th>
                  <th rowSpan={2} className={th}>STATUS (O/I)<br />*</th>
                  <th rowSpan={2} className={th}>REASONS</th>
                  <th rowSpan={2} className={th}>RECOMMENDED ACTION TO BE TAKEN</th>
                </tr>
                <tr>
                  <th className={th}>ITEM</th>
                  <th className={th}>DESCRIPTION</th>
                </tr>
              </thead>
              <tbody>
                {reportData.map((item, idx) => (
                  <tr key={idx}>
                    <td className="border border-gray-300 px-3 py-2 text-center">{item.MaterialCode || ""}</td>
                    <td className="border border-gray-300 px-3 py-2 text-left">
                      {item.GradeCode ? `${item.MaterialName} (Grade: ${item.GradeCode})` : item.MaterialName}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-right">{formatNumber(item.QtyOnHand)}</td>
                    <td className="border border-gray-300 px-3 py-2 text-right">{formatNumber(item.UnitPrice)}</td>
                    <td className="border border-gray-300 px-3 py-2 text-right">{formatNumber(item.StockBook)}</td>
                    <td className="border border-gray-300 px-3 py-2 text-center"></td>
                    <td className="border border-gray-300 px-3 py-2 text-left">{item.Reason || ""}</td>
                    <td className="border border-gray-300 px-3 py-2"></td>
                  </tr>
                ))}
                <tr>
                  <td className="border border-gray-300 px-3 py-2 text-left font-bold">Total Stocks</td>
                  <td className="border border-gray-300"></td>
                  <td className="border border-gray-300"></td>
                  <td className="border border-gray-300"></td>
                  <td className="border border-gray-300 px-3 py-2 text-right font-bold">{formatNumber(reportData.reduce((sum, item) => sum + (item.StockBook || 0), 0))}</td>
                  <td colSpan={3} className="border border-gray-300"></td>
                </tr>
              </tbody>
            </table>
                  </div>

                <div className="mt-4">
                  <div className="flex justify-between items-start gap-6">
                    <div className="w-[56%]">
                      <p className="mb-3">We do hereby certify that the stocks were physically verified as per the given statement.</p>
                      <div className="font-bold mb-2">Signature of the Board of Verification</div>
                      <div className="space-y-1">
                        {[1, 2, 3].map((number) => (
                          <div key={number} className="flex items-end gap-2">
                            <span>{number}.</span>
                            <span className="flex-1 border-b border-dotted border-gray-600 h-4"></span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="w-[38%]">
                      <p className="mb-2">Agreed &amp; Certified Correct by</p>
                      <div className="flex items-end my-4">
                        <span>Signature:</span>
                        <span className="flex-1 border-b border-dotted border-gray-600 h-4 ml-2"></span>
                      </div>
                      <p className="mb-2">Store-keeper/E.S.(C.S.C.)</p>
                    </div>
                  </div>
                  <p className="mt-4">*- Obsolete/idle</p>
                </div>
              </div>
            );
          })()}
        </ReportViewer>
      )}
    </div>
  );
};

export default PHVObsoleteIdleWHwise;