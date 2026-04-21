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

interface ShortageSurplusItem {
  DocumentNo: string;
  MaterialCode: string;
  MaterialName: string;
  GradeCode: string;
  UomCode: string;
  UnitPrice: number;
  QtyOnHand: number;
  CountedQty: number;
  SurplusQty: number | null;
  ShortageQty: number | null;
  StockBook: number;
  PhysicalBook: number;
  SurplusAmount: number | null;
  ShortageAmount: number | null;
  [key: string]: any;
}

const formatNumber = (num: number | null | undefined): string => {
  if (num == null) return "0.00";
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};



const PHVShortageSurplusWHwise: React.FC = () => {
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
  const [reportData, setReportData] = useState<ShortageSurplusItem[]>([]);
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
    if (!selectedDept || !selectedWarehouse || !selectedMonth || !selectedYear) {
      toast.error("Please select all required fields");
      return;
    }
    setReportLoading(true);
    setShowReport(true);
    setReportData([]);
    try {
      const res = await fetch(
        `/misapi/api/phv-shortage-surplus-whwise/list?deptId=${encodeURIComponent(
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
      const items: ShortageSurplusItem[] = Array.isArray(json) ? json : json.data || [];
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
    if (!reportData.length || !selectedDept) return;

    const rows: string[] = [];
    rows.push(`"ANNUAL VERIFICATION SHORTAGE/SURPLUS OF STORES - ${selectedWarehouse} YEAR :-${selectedYear}"`);
    rows.push(`"Cost Center","${selectedDept?.DeptId} - ${selectedDept?.DeptName}"`);
    rows.push(`"Warehouse","${selectedWarehouse}"`);
    rows.push("");

    const headers = [
      "Serial No",
      "Document No",
      "Code No",
      "Description",
      "Grade Code",
      "UOM",
      "S/ Price",
      "Stock Book Qty",
      "Physical Qty",
      "Surplus Qty",
      "Shortage Qty",
      "Stock Book Value (Rs.)",
      "Physical Val. (Rs.)",
      "Surplus Val. (Rs.)",
      "Shortage Val. (Rs.)",
    ];

    rows.push(headers.map(h => `"${h}"`).join(","));

    reportData.forEach((item, idx) => {
      const row = [
        idx + 1,
        item.DocumentNo || "",
`\t${item.MaterialCode || ""}`,  
        item.GradeCode || "",
        item.UomCode || "",
        formatNumber(item.UnitPrice),
        formatNumber(item.QtyOnHand),
        formatNumber(item.CountedQty),
        formatNumber(item.SurplusQty),
        formatNumber(item.ShortageQty),
        formatNumber(item.StockBook),
        formatNumber(item.PhysicalBook),
        formatNumber(item.SurplusAmount),
        formatNumber(item.ShortageAmount),
      ];
      rows.push(row.map(v => `"${v}"`).join(","));
    });

    // Totals
    const totalStockBook = reportData.reduce((sum, item) => sum + (item.StockBook || 0), 0);
    const totalPhysical = reportData.reduce((sum, item) => sum + (item.PhysicalBook || 0), 0);
    const totalSurplus = reportData.reduce((sum, item) => sum + (item.SurplusAmount || 0), 0);
    const totalShortage = reportData.reduce((sum, item) => sum + (item.ShortageAmount || 0), 0);

    rows.push("");
    rows.push([
      '""', '""', '""', '"Total"', '""', '""', '""', '""', '""', '""', '""',
      `"${formatNumber(totalStockBook)}"`,
      `"${formatNumber(totalPhysical)}"`,
      `"${formatNumber(totalSurplus)}"`,
      `"${formatNumber(totalShortage)}"`,
    ].join(","));

    const blob = new Blob(["\uFEFF" + rows.join("\n")], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `PHV_Shortage_Surplus_WHwise_${selectedDept.DeptId}_${selectedWarehouse}_${selectedYear}.csv`;
    link.click();
  };

const printPDF = () => {
    if (!iframeRef.current || !selectedDept || !selectedWarehouse || reportData.length === 0) {
      toast.error("Please load the report before printing");
      return;
    }

    const PAGE_H        = 210;
    const MARGIN_TOP    = 8;
    const MARGIN_BOTTOM = 8;
    const MARGIN_LEFT   = 6;
    const MARGIN_RIGHT  = 6;

    const USABLE_H = PAGE_H - MARGIN_TOP - MARGIN_BOTTOM; // 194mm

    const FULL_HEADER_H   = 22;
    const REPEAT_HEADER_H = 16;
    const TABLE_HEADER_H  = 9;
    const SIGNATURE_H     = 16;
    const FOOTER_H        = 6;
    const ROW_HEIGHT      = 5.5;
    const ROW_BUFFER      = 2;

    const FIRST_DATA_H      = USABLE_H - FULL_HEADER_H - TABLE_HEADER_H - SIGNATURE_H - FOOTER_H;
    const SUBSEQUENT_DATA_H = USABLE_H - REPEAT_HEADER_H - TABLE_HEADER_H - SIGNATURE_H - FOOTER_H;

    const ROWS_FIRST      = Math.floor(FIRST_DATA_H / ROW_HEIGHT) - ROW_BUFFER;
    const ROWS_SUBSEQUENT = Math.floor(SUBSEQUENT_DATA_H / ROW_HEIGHT) - ROW_BUFFER;

    const esc = (v: any) =>
      String(v ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    const now = new Date().toLocaleString("en-GB", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      hour12: false,
    });

    const totalStockBook = reportData.reduce((s, x) => s + (x.StockBook || 0), 0);
    const totalPhysical  = reportData.reduce((s, x) => s + (x.PhysicalBook || 0), 0);
    const totalSurplus   = reportData.reduce((s, x) => s + (x.SurplusAmount || 0), 0);
    const totalShortage  = reportData.reduce((s, x) => s + (x.ShortageAmount || 0), 0);

    const dataRows = reportData.map((item, idx) => `
      <tr>
        <td class="sn">${idx + 1}</td>
        <td class="doc-no">${esc(item.DocumentNo)}</td>
        <td class="code">${esc(item.MaterialCode)}</td>
        <td class="desc">${esc(item.MaterialName)}</td>
        <td class="grade">${esc(item.GradeCode)}</td>
        <td class="uom">${esc(item.UomCode)}</td>
        <td class="price">${formatNumber(item.UnitPrice)}</td>
        <td class="stock-qty">${formatNumber(item.QtyOnHand)}</td>
        <td class="phys-qty">${formatNumber(item.CountedQty)}</td>
        <td class="surplus-qty">${formatNumber(item.SurplusQty)}</td>
        <td class="short-qty">${formatNumber(item.ShortageQty)}</td>
        <td class="stock-val">${formatNumber(item.StockBook)}</td>
        <td class="phys-val">${formatNumber(item.PhysicalBook)}</td>
        <td class="surplus-val">${formatNumber(item.SurplusAmount)}</td>
        <td class="short-val">${formatNumber(item.ShortageAmount)}</td>
      </tr>`);

    const totalRow = `
      <tr class="total-row">
        <td colspan="11" style="text-align:center;font-weight:bold;">TOTAL</td>
        <td class="stock-val">${formatNumber(totalStockBook)}</td>
        <td class="phys-val">${formatNumber(totalPhysical)}</td>
        <td class="surplus-val">${formatNumber(totalSurplus)}</td>
        <td class="short-val">${formatNumber(totalShortage)}</td>
      </tr>`;

    // ── paginate ───────────────────────────────────────────────────────────────
    const pages: string[][] = [];
    let remaining = [...dataRows];

    if (remaining.length > 0) pages.push(remaining.splice(0, ROWS_FIRST));
    while (remaining.length > 0) pages.push(remaining.splice(0, ROWS_SUBSEQUENT));

    if (pages.length === 0) {
      pages.push([totalRow]);
    } else {
      const lastPage = pages[pages.length - 1];
      const cap = pages.length === 1 ? ROWS_FIRST : ROWS_SUBSEQUENT;
      lastPage.length < cap ? lastPage.push(totalRow) : pages.push([totalRow]);
    }

    const totalPages = pages.length;

    // Single unified thead — used inside every page's single table
    const theadHTML = `
      <thead>
        <tr>
          <th class="sn">Serial No</th>
          <th class="doc-no">Document No</th>
          <th class="code">Code No</th>
          <th class="desc">Description</th>
          <th class="grade">Grade Code</th>
          <th class="uom">UOM</th>
          <th class="price">S/Price</th>
          <th class="stock-qty">Stock Book Qty</th>
          <th class="phys-qty">Physical Qty</th>
          <th class="surplus-qty">Surplus Qty</th>
          <th class="short-qty">Shortage Qty</th>
          <th class="stock-val">Stock Book Val (Rs.)</th>
          <th class="phys-val">Physical Val (Rs.)</th>
          <th class="surplus-val">Surplus Val (Rs.)</th>
          <th class="short-val">Shortage Val (Rs.)</th>
        </tr>
      </thead>`;

    const styles = `
      @page {
        size: A4 landscape;
        margin: ${MARGIN_TOP}mm ${MARGIN_RIGHT}mm ${MARGIN_BOTTOM}mm ${MARGIN_LEFT}mm;
      }

      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Arial, sans-serif; font-size: 7pt; }

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

      /* Always pinned to page bottom regardless of row count */
      .page-bottom {
        position: absolute;
        bottom: 0; left: 0; right: 0;
        height: ${SIGNATURE_H + FOOTER_H}mm;
      }

      .header {
        text-align: center;
        display: flex;
        flex-direction: column;
        justify-content: center;
        overflow: hidden;
        padding-bottom: 1mm;
      }
      h2 { font-size: 11pt; color: #7A0000; font-weight: bold; margin: 0 0 0.5mm;   line-height: 1.2; }
      h3 { font-size:  9pt; color: #333;    font-weight: 600;  margin: 0;           line-height: 1.2; }

      /* ONE table per page — thead and tbody together, no gap */
      .table-wrapper {
        overflow: hidden;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        font-size: 6.5pt;
      }
      th, td {
        border: 0.25pt solid #333;
        padding: 0.5mm 1mm;
        overflow: hidden;
        word-wrap: break-word;
        vertical-align: middle;
      }
      th {
        background: #e8e8e8;
        font-weight: bold;
        text-align: center;
        font-size: 6.5pt;
        line-height: 1.1;
      }
      /* thead row fixed height */
      thead tr { height: ${TABLE_HEADER_H}mm; }
      /* data rows fixed height */
      tbody tr { height: ${ROW_HEIGHT}mm; }

      .sn          { width: 3%;    text-align: center; font-size: 6.5pt; }
      .doc-no      { width: 8%;    text-align: center; font-size: 5.5pt; }
      .code        { width: 6%;    text-align: center; font-size: 6pt; }
      .desc        { width: 20%;   text-align: left;   font-size: 6pt; line-height: 1.15; }
      .grade       { width: 4%;    text-align: center; font-size: 6pt; }
      .uom         { width: 3.5%;  text-align: center; font-size: 6pt; }
      .price       { width: 5.5%;  text-align: right;  font-size: 6pt; }
      .stock-qty   { width: 5.5%;  text-align: right;  font-size: 6pt; }
      .phys-qty    { width: 5.5%;  text-align: right;  font-size: 6pt; }
      .surplus-qty { width: 5%;    text-align: right;  font-size: 6pt; }
      .short-qty   { width: 5%;    text-align: right;  font-size: 6pt; }
      .stock-val   { width: 6.5%;  text-align: right;  font-size: 6pt; }
      .phys-val    { width: 6.5%;  text-align: right;  font-size: 6pt; }
      .surplus-val { width: 6%;    text-align: right;  font-size: 6pt; }
      .short-val   { width: 6%;    text-align: right;  font-size: 6pt; }

      .total-row { font-weight: bold; background: #f5f5f5; font-size: 7pt; }

      .sig-section {
        height: ${SIGNATURE_H}mm;
        display: flex;
        align-items: flex-start;
        padding: 1.5mm 3mm 0;
        overflow: hidden;
      }
      .sig-row {
        display: flex;
        justify-content: space-between;
        width: 100%;
        font-size: 6.5pt;
        line-height: 1.8;
      }
      .sig-row > div { width: 48%; }

      .footer-section {
        height: ${FOOTER_H}mm;
        display: flex;
        align-items: center;
        padding: 0 1mm;
        overflow: hidden;
      }
      .footer {
        display: flex;
        justify-content: space-between;
        width: 100%;
        font-size: 6pt;
      }
    `;

    // ── assemble pages ─────────────────────────────────────────────────────────
    let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${styles}</style></head><body>`;

    pages.forEach((pageRows, idx) => {
      const isFirst    = idx === 0;
      const pageNum    = idx + 1;
      const headerH    = isFirst ? FULL_HEADER_H : REPEAT_HEADER_H;
      // Total table height = thead height + all data rows height
      const tableWrapH = USABLE_H - headerH - SIGNATURE_H - FOOTER_H;

      const headerHTML = isFirst
        ? `<div class="header" style="height:${FULL_HEADER_H}mm;">
             <h2>ANNUAL VERIFICATION SHORTAGE/SURPLUS OF STORES - ${selectedYear}</h2>
             <h3>COST CENTRE: ${esc(selectedDept.DeptId)} - ${esc(selectedDept.DeptName)} | WAREHOUSE: ${esc(selectedWarehouse)}</h3>
           </div>`
        : `<div class="header" style="height:${REPEAT_HEADER_H}mm;">
             <h2>ANNUAL VERIFICATION SHORTAGE/SURPLUS OF STORES - ${selectedYear}</h2>
             <h3>COST CENTRE: ${esc(selectedDept.DeptId)} - ${esc(selectedDept.DeptName)} | WAREHOUSE: ${esc(selectedWarehouse)}</h3>
           </div>`;

      html += `
        <div class="page">

          <div class="page-top">
            ${headerHTML}

            <!-- Single table: thead + tbody together = no gap -->
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
            <div class="sig-section">
              <div class="sig-row">
                <div>
                  Store Keeper / Electrical Superintendent : .........................<br/>
                  Date : .............................
                </div>
                <div>
                  Engineer-in-charge : .........................<br/>
                  Date : .............................
                </div>
              </div>
            </div>
            <div class="footer-section">
              <div class="footer">
                <span>Date &amp; time of the Report Generated: ${now}</span>
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
    setTimeout(() => { iframeRef.current?.contentWindow?.print(); }, 900);
  };
  return (
    <div className="max-w-[95%] mx-auto p-2 md:p-4 bg-white rounded-xl shadow border border-gray-200 text-sm md:text-base font-sans">
      <iframe
        ref={iframeRef}
        style={{ display: "none" }}
        title="print-frame"
      />
      <h2 className={`text-lg md:text-xl font-bold mb-4 ${maroon}`}>
        PHV Shortage/Surplus WHwise
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
                          : i % 2
                            ? "bg-white hover:bg-gray-100"
                            : "bg-gray-50 hover:bg-gray-100"
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
          title={`PHV SHORTAGE/SURPLUS WH WISE - ${selectedYear}`}
          subtitlebold2="Cost Center :"
          subtitlenormal2={`${selectedDept.DeptId} - ${selectedDept.DeptName} - Warehouse: ${selectedWarehouse}`}
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
                <th className="border border-gray-400 px-2 py-2 text-center">Document No</th>
                <th className="border border-gray-400 px-2 py-2 text-center">Code No</th>
                <th className="border border-gray-400 px-2 py-2 text-left">Description</th>
                <th className="border border-gray-400 px-2 py-2 text-center">Grade Code</th>
                <th className="border border-gray-400 px-2 py-2 text-center">UOM</th>
                <th className="border border-gray-400 px-2 py-2 text-right">S/ Price</th>
                <th className="border border-gray-400 px-2 py-2 text-right">Stock Book Qty</th>
                <th className="border border-gray-400 px-2 py-2 text-right">Physical Qty</th>
                <th className="border border-gray-400 px-2 py-2 text-right">Surplus Qty</th>
                <th className="border border-gray-400 px-2 py-2 text-right">Shortage Qty</th>
                <th className="border border-gray-400 px-2 py-2 text-right">Stock Book Value (Rs.)</th>
                <th className="border border-gray-400 px-2 py-2 text-right">Physical Val. (Rs.)</th>
                <th className="border border-gray-400 px-2 py-2 text-right">Surplus Val. (Rs.)</th>
                <th className="border border-gray-400 px-2 py-2 text-right">Shortage Val. (Rs.)</th>
              </tr>
            </thead>
            <tbody>
              {reportData.map((item, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="border border-gray-300 px-2 py-2 text-center">{idx + 1}</td>
                  <td className="border border-gray-300 px-2 py-2 text-center">{item.DocumentNo}</td>
                  <td className="border border-gray-300 px-2 py-2 text-center">{item.MaterialCode}</td>
                  <td className="border border-gray-300 px-2 py-2 text-left">{item.MaterialName}</td>
                  <td className="border border-gray-300 px-2 py-2 text-center">{item.GradeCode}</td>
                  <td className="border border-gray-300 px-2 py-2 text-center">{item.UomCode}</td>
                  <td className="border border-gray-300 px-2 py-2 text-right">{formatNumber(item.UnitPrice)}</td>
                  <td className="border border-gray-300 px-2 py-2 text-right">{formatNumber(item.QtyOnHand)}</td>
                  <td className="border border-gray-300 px-2 py-2 text-right">{formatNumber(item.CountedQty)}</td>
                  <td className="border border-gray-300 px-2 py-2 text-right">{formatNumber(item.SurplusQty)}</td>
                  <td className="border border-gray-300 px-2 py-2 text-right">{formatNumber(item.ShortageQty)}</td>
                  <td className="border border-gray-300 px-2 py-2 text-right">{formatNumber(item.StockBook)}</td>
                  <td className="border border-gray-300 px-2 py-2 text-right">{formatNumber(item.PhysicalBook)}</td>
                  <td className="border border-gray-300 px-2 py-2 text-right">{formatNumber(item.SurplusAmount)}</td>
                  <td className="border border-gray-300 px-2 py-2 text-right">{formatNumber(item.ShortageAmount)}</td>
                </tr>
              ))}
              <tr className="bg-yellow-50 font-bold">
                <td colSpan={11} className="border border-gray-300 px-2 py-2 text-center">
                  Total
                </td>
                <td className="border border-gray-300 px-2 py-2 text-right">
                  {formatNumber(reportData.reduce((sum, item) => sum + (item.StockBook || 0), 0))}
                </td>
                <td className="border border-gray-300 px-2 py-2 text-right">
                  {formatNumber(reportData.reduce((sum, item) => sum + (item.PhysicalBook || 0), 0))}
                </td>
                <td className="border border-gray-300 px-2 py-2 text-right">
                  {formatNumber(reportData.reduce((sum, item) => sum + (item.SurplusAmount || 0), 0))}
                </td>
                <td className="border border-gray-300 px-2 py-2 text-right">
                  {formatNumber(reportData.reduce((sum, item) => sum + (item.ShortageAmount || 0), 0))}
                </td>
              </tr>
            </tbody>
          </table>
        </ReportViewer>
      )}
    </div>
  );
};

export default PHVShortageSurplusWHwise;