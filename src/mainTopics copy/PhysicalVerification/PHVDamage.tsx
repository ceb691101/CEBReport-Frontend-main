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

interface PHVDamageItem {
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

const PHVDamage: React.FC = () => {
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
  const [reportData, setReportData] = useState<PHVDamageItem[]>([]);
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
        const rawData = parseApiResponse(result);
        const warehousesData: Warehouse[] = rawData.map((item: any) => ({
          WarehouseCode: item.WarehouseCode?.toString().trim() || "",
          CostCenterId: item.CostCenterId?.toString().trim() || "",
        }));
        const filteredData = warehousesData.filter((item) => !item.CostCenterId || item.CostCenterId === selectedDept.DeptId);
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
        `/misapi/api/phv-damage/list?deptId=${encodeURIComponent(
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
      const items: PHVDamageItem[] = Array.isArray(json) ? json : json.data || [];
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
      csvSafe(`STATEMENT OF DAMAGED MATERIALS IN STOCKS - ${selectedYear}`),
      csvSafe(`COST CENTRE : ${selectedDept.DeptId} WARE HOUSE - ${selectedWarehouse}`),
      "",
      csvSafe("1.ORIGINAL : Deputy General Manager"),
      csvSafe("2.DUPLICATE : Engineer-in-charge"),
      csvSafe("3.TRIPLCATE : Store-kepper/E.S.(C.S.C)"),
      csvSafe(`Date of Verification : ${reportData[0]?.PhvDate?.split("T")[0]|| ".............."}`),

      csvSafe("Form - AV/7B"),
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
      '"Total of Damaged Stocks"',
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
    link.download = `PHV_Damage_WHwise_${selectedDept.DeptId}_${selectedWarehouse}_${selectedYear}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

// ── REPLACE your entire printPDF function with this ──────────────────────────
// Key improvements:
//   • ROWS_PER_PAGE calculated to fill all available vertical space (≥15 rows)
//   • Signature section pinned ABOVE footer via position:absolute
//   • Table data rows fill the entire space between header and signature
//   • No empty gaps — every page uses maximum rows
//   • Footer (date + page X of Y) pinned to very bottom of each page
//   • Board of Verifications: empty in data rows, 1/2/3 next to Name dotted lines

const printPDF = () => {
  if (reportData.length === 0 || !iframeRef.current || !selectedDept || !selectedWarehouse) {
    toast.error("Please select Cost Center, Warehouse, Year/Month and click 'View' first");
    return;
  }

  // ── PAGE LAYOUT CONSTANTS ───────────────────────────────────────────────
  const PAGE_HEIGHT = 210;           // A4 landscape height
  const MARGIN_TB = 8;               // Top/bottom margin
  const MARGIN_LR = 10;              // Left/right margin
  const HEADER_HEIGHT = 22;          // Header section height
  const TABLE_HEADER_HEIGHT = 7;     // Table header row height
  const SIGNATURE_HEIGHT = 22;       // Signature section height
  const FOOTER_HEIGHT = 4;           // Footer height
  const GAP_BEFORE_SIGNATURE = 2;    // Gap between table and signature

  const USABLE_HEIGHT = PAGE_HEIGHT - (2 * MARGIN_TB);
  const AVAILABLE_FOR_ROWS = USABLE_HEIGHT - HEADER_HEIGHT - TABLE_HEADER_HEIGHT - SIGNATURE_HEIGHT - FOOTER_HEIGHT - GAP_BEFORE_SIGNATURE;

  // Dynamic row height based on description length
  const CHARS_PER_LINE = 80;         // Approx chars per line in Description column
  const LINE_HEIGHT_MM = 3.5;        // Height per line
  const ROW_PADDING_MM = 1.5;        // Padding per row

  const getRowHeight = (desc: string): number => {
    const lines = Math.max(1, Math.ceil(desc.length / CHARS_PER_LINE));
    return ROW_PADDING_MM + lines * LINE_HEIGHT_MM;
  };

  // ── DYNAMIC CHUNKING LOGIC ──────────────────────────────────────────────
  const chunks: PHVDamageItem[][] = [];
  let currentChunk: PHVDamageItem[] = [];
  let currentHeight = 0;

  for (const item of reportData) {
    const rowHeight = getRowHeight(item.MaterialName || '');

    if (currentHeight + rowHeight > AVAILABLE_FOR_ROWS && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = [];
      currentHeight = 0;
    }

    currentChunk.push(item);
    currentHeight += rowHeight;
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  // Handle total row on last page with dynamic height
  const totalRowHeight = getRowHeight('Total of Damaged Stocks');

  if (chunks.length > 0) {
    const lastChunk = chunks.pop()!;
    let heightOfLastChunk = 0;
    lastChunk.forEach(item => heightOfLastChunk += getRowHeight(item.MaterialName || ''));

    if (heightOfLastChunk + totalRowHeight > AVAILABLE_FOR_ROWS) {
      let heightFromEnd = totalRowHeight;
      let splitIndex = lastChunk.length;
      for (let j = lastChunk.length - 1; j >= 0; j--) {
        heightFromEnd += getRowHeight(lastChunk[j].MaterialName || '');
        if (heightFromEnd > AVAILABLE_FOR_ROWS) {
          splitIndex = j;
          break;
        }
      }

      if (splitIndex < lastChunk.length) {
        if (splitIndex > 0) {
          chunks.push(lastChunk.slice(0, splitIndex));
        }
        chunks.push(lastChunk.slice(splitIndex));
      } else {
        chunks.push(lastChunk);
      }
    } else {
      chunks.push(lastChunk);
    }
  }

  // ── STYLES ──────────────────────────────────────────────────────────────
  const tableStyle = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    table { 
      width: 100%; 
      border-collapse: collapse; 
      font-size: 9.5px; 
      margin-top: 2mm;
    }
    
    th, td { 
      border: 0.8px solid #000; 
      padding: 3px 4px; 
      word-wrap: break-word; 
      line-height: 1.2;
    }
    
    th { 
      background-color: #ffffff; 
      color: #000000; 
      font-weight: bold; 
      text-align: center; 
      line-height: 1.1;
      padding: 2px 3px;
    }
    
    .right { text-align: right; }
    .center { text-align: center; }
    .left { text-align: left; }

    body { 
      font-family: Arial, sans-serif; 
      margin: 0;
      padding: ${MARGIN_TB}mm ${MARGIN_LR}mm;
      font-size: 9.5px;
      position: relative;
      height: ${PAGE_HEIGHT}mm;
    }
.page-wrapper {
  min-height: ${PAGE_HEIGHT - (2 * MARGIN_TB)}mm;
  display: flex;
  flex-direction: column;
  position: relative;
}

    .header-section {
      margin-top: ${MARGIN_TB}mm;
      margin-bottom: 2mm;
    }

    h2 { 
      text-align: center; 
      color: #7A0000; 
      margin: 0 0 1mm 0; 
      font-size: 12.5px;
      line-height: 1.1;
    }

    h3 { 
      text-align: center; 
      margin: 0.5mm 0 1.5mm 0; 
      font-size: 10px;
      line-height: 1.1;
    }

    .subtitles { 
      margin-bottom: 1.5mm; 
      font-size: 8.5px; 
      display: flex; 
      justify-content: space-between;
      line-height: 1.2;
    }

    .table-section {
      flex: 1;
    }

    @page { 
      margin: 0;
      size: A4 landscape;
    }

.footer {
  position: absolute;               /* ← Changed to absolute for per-page uniqueness */
  bottom: 0mm;                      /* Distance from page-wrapper bottom */
  left: 0mm;
  right: 0mm;
  height: ${FOOTER_HEIGHT}mm;
  font-size: 7.5pt;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5mm 0 0 0;             /* Minimal top padding */
  background: white;
  z-index: 10;                      /* Ensure it's above content if needed */
  page-break-inside: avoid;
}

    .total-row { 
      background: #e8e8e8; 
      font-weight: bold; 
    }

    .signature-section { 
      margin-top: ${GAP_BEFORE_SIGNATURE}mm;
      margin-bottom: ${FOOTER_HEIGHT + 2}mm;
      font-size: 8px; 
      page-break-inside: avoid;
      display: flex;
      justify-content: space-between;
    }

    .signature-left { 
      width: 58%; 
      float: left;
    }

    .signature-right { 
      width: 38%; 
      float: right; 
      text-align: right;
    }

    .signature-section p { 
      margin: 1mm 0; 
      line-height: 1.2;
    }

    .signature-section table { 
      border: none; 
      width: 100%; 
      font-size: 7.5px; 
      margin-top: 1.5mm; 
      margin-bottom: 1.5mm; 

    }

    .signature-section td { 
      border: none; 
      padding: 1mm; 
    }

    .clear { clear: both; }
  `;

  const escapeHtml = (text: string | null | undefined): string => {
    if (!text) return "";
    const cleaned = text.replace(/[-\u001F\u007F]/g, "");
    const div = document.createElement("div");
    div.textContent = cleaned;
    return div.innerHTML;
  };

  const formatNum = (n: number | null | undefined) =>
    (n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const totalPages = chunks.length || 1;
  let html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>PHV Damage Report</title>
<style>${tableStyle}</style>
</head>
<body>`;

  let serial = 1;

  chunks.forEach((chunk, idx) => {
    const pageNum = idx + 1;
    const isLastPage = idx === chunks.length - 1;

    html += `
<div class="page-wrapper">
<div class="header-section">
<h2>STATEMENT OF DAMAGED MATERIALS IN STOCKS - ${selectedYear}</h2>
<h3>COST CENTRE : ${selectedDept.DeptId} WARE HOUSE - ${selectedWarehouse}</h3>

<div class="subtitles">
  <div>1.ORIGINAL  :  Deputy General Manager</div>
  <div>Form - AV/7B</div>
</div>
<div class="subtitles">
  <div>2.DUPLICATE :  Engineer-in-charge</div>
  <div>Date of Verification : ${reportData[0]?.PhvDate?.split("T")[0] || ".............."}</div>
</div>
<div class="subtitles">
  <div>3.TRIPLICATE :  Store-keeper/E.S.(C.S.C)</div>
  <div></div>
</div>
</div>

<div class="table-section">
<table>
  <thead>
    <tr>
      <th style="width:4%">Serial<br>No</th>
      <th style="width:9%">Code No</th>
      <th style="width:30%">Description</th>
      <th style="width:7%">Grade<br>Code</th>
      <th style="width:5%">UOM</th>
      <th style="width:9%">Quantity<br>(Stock Book)</th>
      <th style="width:10%">Unit Price</th>
      <th style="width:10%">Cost (Rs.)<br>(Stock Book)</th>
      <th style="width:8%">Reasons</th>
      <th style="width:8%">Recommended<br>action</th>
    </tr>
  </thead>
  <tbody>`;

    chunk.forEach((item, i) => {
      html += `
    <tr>
      <td class="center">${serial + i}</td>
      <td class="center">${escapeHtml(item.MaterialCode || "")}</td>
      <td class="left">${escapeHtml(item.MaterialName || "")}</td>
      <td class="center">${escapeHtml(item.GradeCode || "")}</td>
      <td class="center">${escapeHtml(item.UomCode || "")}</td>
      <td class="right">${formatNum(item.QtyOnHand)}</td>
      <td class="right">${formatNum(item.UnitPrice)}</td>
      <td class="right">${formatNum(item.StockBook)}</td>
      <td class="center">${escapeHtml(item.Reason || "DAM")}</td>
      <td class="center"></td>
    </tr>`;
    });

    if (isLastPage) {
      const totalStockBook = reportData.reduce((sum, item) => sum + (item.StockBook || 0), 0);
      html += `
    <tr class="total-row">
      <td colspan="7" class="right">Total of Damaged Stocks</td>
      <td class="right">${formatNum(totalStockBook)}</td>
      <td colspan="2"></td>
    </tr>`;
    }

    html += `
  </tbody>
</table>
</div>

<div class="signature-section">
  <div class="signature-left">
    <p>We do hereby certify that Stocks were physically verified as per that given statement.</p>
    <table>
      <tr>
        <td style="width:25%">Board of<br>Verifications</td>
        <td style="width:25%">Name</td>
        <td style="width:25%">Designation</td>
        <td style="width:25%">Signature</td>
      </tr>
      <tr>
        <td class="right">1.</td>
        <td>...........................</td>
        <td>...........................</td>
        <td>...........................</td>
      </tr>
      <tr>
        <td class="right">2.</td>
        <td>...........................</td>
        <td>...........................</td>
        <td>...........................</td>
      </tr>
      <tr>
        <td class="right">3.</td>
        <td>...........................</td>
        <td>...........................</td>
        <td>...........................</td>
      </tr>
    </table>
  </div>
  <div class="signature-right">
    <p>Agreed and certified correct.</p>
    <p style="margin-top: 6mm;">......................................</p>
    <p style="margin-top: 1.5mm;">Store-keeper/Elect. Superintendent (C.S.C.)</p>
  </div>
  <div class="clear"></div>
</div>

<div class="footer">
  <div>Date & time of the Report Generated : ${new Date().toLocaleString()}</div>
  <div>Page ${pageNum} of ${totalPages}</div>
</div>
</div>

${idx < chunks.length - 1 ? '<div style="page-break-after: always;"></div>' : ''}
`;

    serial += chunk.length;
  });

  html += `
</body>
</html>`;

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
        6.2. Physical Verification Damage (GRADE Code) AV/7B
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
            className={`px-2 md:px-3 py-1 md:py-1 ${maroonGrad} text-white rounded-md text-xs md:text-sm font-medium hover:brightness-110 transition shadow ${!selectedDept || !selectedWarehouse || loading ? "opacity-50 cursor-not-allowed" : ""
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
                      className={`cursor-pointer ${selectedDept?.DeptId === department.DeptId
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
          title={`STATEMENT OF DAMAGED MATERIALS IN STOCKS - ${selectedYear}`}
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
                  <td className="border border-gray-300 px-2 py-2 text-center">{item.Reason || "DAM"}</td>
                  <td className="border border-gray-300 px-2 py-2 text-center"></td>
                </tr>
              ))}
              <tr className="bg-yellow-50 font-bold">
                <td colSpan={7} className="border border-gray-300 px-2 py-2 text-right">
                  Total of Damaged Stocks
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

export default PHVDamage;