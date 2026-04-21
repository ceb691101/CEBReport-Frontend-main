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

  const headers = [
    "Serial No",
    "Code No",
    "Description",
    "Grade Code",
    "UOM",
    "Quantity (Stock Book)",
    "Unit Price",
    "Cost (Rs.) (Stock Book)",
    "Reasons",
    "Recommended action to be taken",
  ];

  const csvRows: string[] = [
    csvSafe(`STATEMENT OF OBSOLETE AND IDLE MATERIALS IN STOCKS - ${selectedYear}`),
    csvSafe(`COST CENTRE : ${selectedDept.DeptId} WARE HOUSE - ${selectedWarehouse}`),
    "",
    csvSafe("1.ORIGINAL : Deputy General Manager"),
    csvSafe("2.DUPLICATE : Engineer-in-charge"),
    csvSafe("3.TRIPLCATE : Store-kepper/E.S.(C.S.C)"),
    csvSafe(`Date of Verification : ${reportData[0]?.PhvDate || ".............."}`),
    csvSafe("Form - AV/7A"),
    "",
  ];

  csvRows.push(headers.map(csvSafe).join(","));

  reportData.forEach((item, idx) => {
    const row = [
      idx + 1,
      "\t" + (item.MaterialCode || ""),
      item.MaterialName || "",
      item.GradeCode || "",
      item.UomCode || "",
      formatNumber(item.QtyOnHand),
      formatNumber(item.UnitPrice),
      formatNumber(item.StockBook),
      item.Reason || "",
      "",
    ];
    csvRows.push(row.map(csvSafe).join(","));
  });

const totalStockBook = reportData.reduce((sum, item) => sum + (item.StockBook || 0), 0);

csvRows.push([
  '""',                          
  '""',                          
  '"Total Stocks"',              
  '""',                          
  '""',                          
  '""',                          
  '""',                          
  `"${formatNumber(totalStockBook)}"`,  
  '""',                          
  '""'                           
].join(","));

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

  // ── PAGE LAYOUT CONSTANTS (Portrait A4) ────────────────────────────────
  const PAGE_H        = 297;
  const MARGIN_TOP    = 10;
  const MARGIN_BOTTOM = 10;
  const MARGIN_LR     = 10;

  const USABLE_H = PAGE_H - MARGIN_TOP - MARGIN_BOTTOM; // 277mm

  const FULL_HEADER_H  = 40;  // full header repeated on every page
  const TABLE_HEADER_H = 12;  // thead row height
  const SIGNATURE_H    = 40;  // cert text + sig table + agreed line
  const FOOTER_H       = 7;
  const ROW_HEIGHT     = 6.5;
  const ROW_BUFFER     = 2;

  const DATA_H     = USABLE_H - FULL_HEADER_H - TABLE_HEADER_H - SIGNATURE_H - FOOTER_H;
  const ROWS_PER_PAGE = Math.floor(DATA_H / ROW_HEIGHT) - ROW_BUFFER;

  // ── HELPERS ────────────────────────────────────────────────────────────
  const esc = (v: any) =>
    String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const formatNum = (n: number | null | undefined) =>
    (n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const now = new Date().toLocaleString("en-GB", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  });

  const phvDate = reportData[0]?.PhvDate?.split("T")[0] || "..............";

  // ── TOTALS ─────────────────────────────────────────────────────────────
  const totalStockBook = reportData.reduce((s, x) => s + (x.StockBook || 0), 0);

  // ── DATA ROWS ──────────────────────────────────────────────────────────
  const dataRows = reportData.map((item, idx) => `
    <tr>
      <td class="center">${idx + 1}</td>
      <td class="center">${esc(item.MaterialCode)}</td>
      <td class="left">${esc(item.MaterialName)}</td>
      <td class="center">${esc(item.GradeCode)}</td>
      <td class="center">${esc(item.UomCode)}</td>
      <td class="right">${formatNum(item.QtyOnHand)}</td>
      <td class="right">${formatNum(item.UnitPrice)}</td>
      <td class="right">${formatNum(item.StockBook)}</td>
      <td class="center">${esc(item.Reason || "")}</td>
      <td class="center"></td>
    </tr>`);

  const totalRow = `
    <tr class="total-row">
      <td colspan="7" class="right" style="font-weight:bold;">Total Stocks</td>
      <td class="right" style="font-weight:bold;">${formatNum(totalStockBook)}</td>
      <td colspan="2"></td>
    </tr>`;

  // ── PAGINATE ───────────────────────────────────────────────────────────
  const pages: string[][] = [];
  let remaining = [...dataRows];

  while (remaining.length > 0) pages.push(remaining.splice(0, ROWS_PER_PAGE));

  if (pages.length === 0) {
    pages.push([totalRow]);
  } else {
    const lastPage = pages[pages.length - 1];
    lastPage.length < ROWS_PER_PAGE
      ? lastPage.push(totalRow)
      : pages.push([totalRow]);
  }

  const totalPages = pages.length;

  // ── THEAD ──────────────────────────────────────────────────────────────
  const theadHTML = `
    <thead>
      <tr>
        <th class="sn">Serial No</th>
        <th class="code">Code No</th>
        <th class="desc">Description</th>
        <th class="grade">Grade Code</th>
        <th class="uom">UOM</th>
        <th class="qty">Quantity (Stock Book)</th>
        <th class="price">Unit Price</th>
        <th class="cost">Cost (Rs.) (Stock Book)</th>
        <th class="reason">Reasons</th>
        <th class="action">Recommended action to be taken</th>
      </tr>
    </thead>`;

  // ── FULL HEADER — repeated on every page to match PDF ─────────────────
  const fullHeaderHTML = `
    <div class="header" style="height:${FULL_HEADER_H}mm;">
      <h1>STATEMENT OF OBSOLETE AND IDLE MATERIALS IN STOCKS - ${selectedYear}</h1>
      <h3>COST CENTRE : ${esc(selectedDept.DeptId)} &nbsp; WARE HOUSE - ${esc(selectedWarehouse)}</h3>
      <div class="subtitles-row">
        <span>1.ORIGINAL &nbsp;&nbsp;:&nbsp; Deputy General Manager</span>
        <span>Form - AV/7A</span>
      </div>
      <div class="subtitles-row">
        <span>2.DUPLICATE :&nbsp; Engineer-in-charge</span>
        <span>Date of Verification : ${esc(phvDate)}</span>
      </div>
      <div class="subtitles-row">
        <span>3.TRIPLCATE :&nbsp; Store-kepper/E.S.(C.S.C)</span>
        <span></span>
      </div>
    </div>`;

  // ── SIGNATURE — matches PDF layout exactly ─────────────────────────────
  // Left: "We do hereby certify..." + numbered table
const signatureHTML = `
  <div class="sig-section">
    <div class="sig-left">
      <p class="sig-cert">We do hereby certify that Stocks were physically verified as per that given statement.</p>
      <table class="sig-table">
        <thead>
          <tr>
            <th style="width:25%">Board of Verifications</th>
            <th style="width:25%">Name</th>
            <th style="width:25%">Designation</th>
            <th style="width:25%">Signature</th>
          </tr>
        </thead>
       <tbody>
  <tr>
    <td></td>
    <td>1. .....................</td>
    <td>.....................</td>
    <td>.....................</td>
  </tr>
  <tr>
    <td></td>
    <td>2. .....................</td>
    <td>.....................</td>
    <td>.....................</td>
  </tr>
  <tr>
    <td></td>
    <td>3. .....................</td>
    <td>.....................</td>
    <td>.....................</td>
  </tr>
</tbody>
      </table>
    </div>
    <div class="sig-right">
      <p>Agreed and certified correct.</p>
      <div class="sig-line">......................................</div>
      <p>Store-keeper/Elect. Superintendent (C.S.C.)</p>
    </div>
  </div>`;

  // ── STYLES ─────────────────────────────────────────────────────────────
  const styles = `
    @page {
      size: A4 portrait;
      margin: ${MARGIN_TOP}mm ${MARGIN_LR}mm ${MARGIN_BOTTOM}mm ${MARGIN_LR}mm;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 8pt; }

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
      height: ${SIGNATURE_H + FOOTER_H}mm;
    }

    /* ── HEADER ── */
    .header { overflow: hidden; padding-bottom: 1mm; }
    h1 { font-size: 12pt; color: #7A0000; font-weight: bold; text-align: center; margin: 0 0 0.5mm; line-height: 1.2; }
    h3 { font-size:  9pt; color: #333;    font-weight: 600;  text-align: center; margin: 0 0 1.5mm; line-height: 1.2; }

    .subtitles-row {
      display: flex;
      justify-content: space-between;
      font-size: 7.5pt;
      margin-bottom: 0.7mm;
      line-height: 1.3;
    }

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
      background: #e8e8e8;
      font-weight: bold;
      text-align: center;
      font-size: 7pt;
      line-height: 1.15;
    }
    thead tr { height: ${TABLE_HEADER_H}mm; }
    tbody tr { height: ${ROW_HEIGHT}mm; }

    /* Column widths */
    .sn     { width: 5%;  text-align: center; }
    .code   { width: 9%;  text-align: center; font-size: 6.5pt; }
    .desc   { width: 28%; text-align: left;   font-size: 6.5pt; line-height: 1.2; }
    .grade  { width: 6%;  text-align: center; }
    .uom    { width: 5%;  text-align: center; }
    .qty    { width: 9%;  text-align: right; }
    .price  { width: 10%; text-align: right; }
    .cost   { width: 11%; text-align: right; }
    .reason { width: 9%;  text-align: center; font-size: 6.5pt; }
    .action { width: 8%;  text-align: center; font-size: 6.5pt; }

    .center { text-align: center; }
    .right  { text-align: right; }
    .left   { text-align: left; }
    .total-row { background: #f0f0f0; font-size: 7.5pt; }

    /* ── SIGNATURE SECTION ── */
    .sig-section {
      height: ${SIGNATURE_H}mm;
      display: flex;
      flex-direction: row;
      gap: 4mm;
      overflow: hidden;
      padding: 1.5mm 0 0;
    }

    /* Left column: ~65% — cert text + numbered verification table */
    .sig-left {
      flex: 0 0 64%;
      overflow: hidden;
    }
    .sig-cert {
      font-size: 7.5pt;
      margin-bottom: 1.5mm;
      line-height: 1.3;
    }

   /* ── SIGNATURE SECTION ── */
.sig-section {
  height: ${SIGNATURE_H}mm;
  display: flex;
  flex-direction: row;
  gap: 4mm;
  overflow: hidden;
  padding: 1.5mm 0 0;
}

.sig-left {
  flex: 0 0 64%;
  overflow: hidden;
}
.sig-cert {
  font-size: 7.5pt;
  margin-bottom: 2mm;
  line-height: 1.4;
}

/* Signature table */
.sig-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 7pt;
}
  
.sig-table th,
.sig-table td {
  border: none;
  padding: 0.5mm 1mm;
  font-size: 7pt;
  height: 5.5mm;
  vertical-align: middle;
  background: none;
  text-align: left;
}

.sig-table thead th {
  font-weight: bold;
  text-align: left;
}
  
/* The "Board of Verifications" row-label cell */
.sig-label-cell {
  width: 18%;
}
.sig-row-label {
  width: 18%;
  font-weight: normal;
  vertical-align: middle;
  font-size: 7pt;
  line-height: 1.4;
}
.sig-table thead th:not(.sig-label-cell),
.sig-table tbody td:not(.sig-row-label) {
  width: 27%;
}

/* Right column */
.sig-right {
  flex: 0 0 34%;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  font-size: 7.5pt;
  line-height: 1.6;
  overflow: hidden;
}
.sig-agreed {
  text-align: right;
  font-size: 7.5pt;
  margin-bottom: 6mm;
}
.sig-line {
  text-align: right;
  margin-bottom: 1mm;
  font-size: 7.5pt;
}
.sig-right p:last-child {
  text-align: right;
}




    /* ── FOOTER ── */
    .footer-section {
      height: ${FOOTER_H}mm;
      display: flex;
      align-items: center;
      padding: 0 0.5mm;
      overflow: hidden;
    }
    .footer {
      display: flex;
      justify-content: space-between;
      width: 100%;
      font-size: 6.5pt;
    }
  `;

  // ── ASSEMBLE PAGES ─────────────────────────────────────────────────────
  let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${styles}</style></head><body>`;

  pages.forEach((pageRows, idx) => {
    const pageNum    = idx + 1;
    const tableWrapH = USABLE_H - FULL_HEADER_H - SIGNATURE_H - FOOTER_H;

    html += `
      <div class="page">

        <div class="page-top">
          ${fullHeaderHTML}
          <div class="table-wrapper" style="height:${tableWrapH}mm;">
            <table>
              ${theadHTML}
              <tbody>
                ${pageRows.join("")}
              </tbody>
            </table>
          </div>
        </div>

        <div class="page-bottom">
          ${signatureHTML}
          <div class="footer-section">
            <div class="footer">
              <span>Date &amp; time of the Report Generated : ${now}</span>
              <span>Page ${pageNum} of ${totalPages}</span>
            </div>
          </div>
        </div>

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
          title={`STATEMENT OF OBSOLETE AND IDLE MATERIALS IN STOCKS - ${selectedYear}`}
          subtitlebold2="COST CENTRE :"
          subtitlenormal2={`${selectedDept.DeptId} - ${selectedDept.DeptName} - WARE HOUSE - ${selectedWarehouse}`}
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
                <th className="border border-gray-400 px-2 py-2 text-right">Quantity (Stock Book)</th>
                <th className="border border-gray-400 px-2 py-2 text-right">Unit Price</th>
                <th className="border border-gray-400 px-2 py-2 text-right">Cost (Rs.) (Stock Book)</th>
                <th className="border border-gray-400 px-2 py-2 text-center">Reasons</th>
                <th className="border border-gray-400 px-2 py-2 text-center">Recommended action to be taken</th>
              </tr>
            </thead>
            <tbody>
              {reportData.map((item, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="border border-gray-300 px-2 py-2 text-center">{idx + 1}</td>
                  <td className="border border-gray-300 px-2 py-2 text-center">{item.MaterialCode || ""}</td>
                  <td className="border border-gray-300 px-2 py-2 text-left">{item.MaterialName || ""}</td>
                  <td className="border border-gray-300 px-2 py-2 text-center">{item.GradeCode || ""}</td>
                  <td className="border border-gray-300 px-2 py-2 text-center">{item.UomCode || ""}</td>
                  <td className="border border-gray-300 px-2 py-2 text-right">{formatNumber(item.QtyOnHand)}</td>
                  <td className="border border-gray-300 px-2 py-2 text-right">{formatNumber(item.UnitPrice)}</td>
                  <td className="border border-gray-300 px-2 py-2 text-right">{formatNumber(item.StockBook)}</td>
                  <td className="border border-gray-300 px-2 py-2 text-center">{item.Reason || ""}</td>
                  <td className="border border-gray-300 px-2 py-2 text-center"></td>
                </tr>
              ))}
              <tr className="bg-yellow-50 font-bold">
                <td colSpan={7} className="border border-gray-300 px-2 py-2 text-right">
                  Total Stocks
                </td>
                <td className="border border-gray-300 px-2 py-2 text-right">
                  {formatNumber(reportData.reduce((sum, item) => sum + (item.StockBook || 0), 0))}
                </td>
                <td colSpan={2} className="border border-gray-300"></td>
              </tr>
            </tbody>
          </table>
        </ReportViewer>
      )}
    </div>
  );
};

export default PHVObsoleteIdleWHwise;