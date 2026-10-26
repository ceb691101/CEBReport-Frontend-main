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

    const csvCell = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const rowOf = (cells: (string | number)[]) => {
      const r = [...cells];
      while (r.length < 11) r.push("");
      return r.map(csvCell).join(",");
    };

    const rows: string[] = [];
    rows.push(
      rowOf([`ECSC/Stores : ${selectedWarehouse}`, "", "", "", "", "", "", "", "", "", "Form - AV/1/B"]),
      rowOf([`Area/Office Of the Director : ${selectedDept.DeptName} (${selectedDept.DeptId})`]),
      rowOf([`ANNUAL VERIFICATION OF STORES/STOCKS - ${selectedYear}`]),
      rowOf(["Explanation for stock shortage and excess"]),
      rowOf([])
    );

    rows.push(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"].map(csvCell).join(","));
    rows.push([
      "Serial No.", "Code No.", "Description", "Unit of Measurement", "Standard Price/Actual Price",
      "Quantity", "", "Value", "", "Explanation by the Storekeeper/Electrical Superintendent",
      "Recommended by the Engineer in charge",
    ].map(csvCell).join(","));
    rows.push(["", "", "", "", "", "Surplus", "Shortage", "Surplus", "Shortage", "", ""].map(csvCell).join(","));
    rows.push(["", "", "", "", "", "", "", "Rs. Cts.", "Rs. Cts.", "", ""].map(csvCell).join(","));

    reportData.forEach((item, idx) => {
      const row = [
        idx + 1,
        item.MaterialCode || "",
        item.GradeCode ? `${item.MaterialName} (Grade: ${item.GradeCode})` : item.MaterialName,
        item.UomCode || "",
        formatNumber(item.UnitPrice),
        formatNumber(item.SurplusQty),
        formatNumber(item.ShortageQty),
        formatNumber(item.SurplusAmount),
        formatNumber(item.ShortageAmount),
        item.Reason || "",
        "",
      ];
      rows.push(row.map(csvCell).join(","));
    });

    /* Signature section (once, at the end) */
    rows.push(
      rowOf([]),
      rowOf(["Store Keeper/Electrical Superintendent : ....................................", "", "", "", "", "", "Engineer-in-Charge : ...................................."]),
      rowOf(["Date : ........./.........../..........", "", "", "", "", "", "Date : ........./.........../.........."])
    );

    const blob = new Blob(["\uFEFF" + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `PHV_Shortage_Surplus_WHwise_${selectedDept.DeptId}_${selectedWarehouse}_${selectedYear}.csv`;
    link.click();
    URL.revokeObjectURL(url);
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

    const FULL_HEADER_H   = 29;   // first page only
    const TABLE_HEADER_H  = 22;   // column headings repeat on every page
    const SIGNATURE_H     = 16;   // last page only
    const ROW_HEIGHT      = 5.5;
    const ROW_BUFFER      = 2;

    const esc = (v: any) =>
      String(v ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    const dataRows = reportData.map((item, idx) => `
      <tr>
        <td class="sn">${idx + 1}</td>
        <td class="code">${esc(item.MaterialCode)}</td>
        <td class="desc">${esc(item.GradeCode ? `${item.MaterialName} (Grade: ${item.GradeCode})` : item.MaterialName)}</td>
        <td class="uom">${esc(item.UomCode)}</td>
        <td class="price">${formatNumber(item.UnitPrice)}</td>
        <td class="quantity">${formatNumber(item.SurplusQty)}</td>
        <td class="quantity">${formatNumber(item.ShortageQty)}</td>
        <td class="value">${formatNumber(item.SurplusAmount)}</td>
        <td class="value">${formatNumber(item.ShortageAmount)}</td>
        <td class="explanation">${esc(item.Reason)}</td>
        <td class="recommended"></td>
      </tr>`);

    // ── paginate: header on the first page only, signature on the last page only ──
    const rowsThatFit = (heightMm: number) =>
      Math.max(1, Math.floor(heightMm / ROW_HEIGHT) - ROW_BUFFER);

    const CAP_FIRST          = rowsThatFit(USABLE_H - FULL_HEADER_H - TABLE_HEADER_H);
    const CAP_MIDDLE         = rowsThatFit(USABLE_H - TABLE_HEADER_H);
    const CAP_FIRST_AND_LAST = rowsThatFit(USABLE_H - FULL_HEADER_H - TABLE_HEADER_H - SIGNATURE_H);
    const CAP_LAST           = rowsThatFit(USABLE_H - TABLE_HEADER_H - SIGNATURE_H);

    const pages: { rows: string[]; isFirst: boolean; isLast: boolean }[] = [];
    let idx = 0;

    while (idx < dataRows.length) {
      const isFirst = pages.length === 0;
      const remaining = dataRows.length - idx;
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

      pages.push({ rows: dataRows.slice(idx, idx + take), isFirst, isLast });
      idx += take;
    }

    const theadHTML = `
      <colgroup>
        <col class="sn"><col class="code"><col class="desc"><col class="uom"><col class="price">
        <col class="quantity"><col class="quantity"><col class="value"><col class="value">
        <col class="explanation"><col class="recommended">
      </colgroup>
      <thead>
        <tr class="number-row">${Array.from({ length: 11 }, (_, index) => `<th>${index + 1}</th>`).join("")}</tr>
        <tr class="label-row">
          <th class="sn" rowspan="3">Serial No.</th>
          <th class="code" rowspan="3">Code No.</th>
          <th class="desc" rowspan="3">Description</th>
          <th class="uom" rowspan="3">Unit of Measurement</th>
          <th class="price" rowspan="3">Standard Price/Actual Price</th>
          <th class="quantity" colspan="2">Quantity</th>
          <th class="value" colspan="2">Value</th>
          <th class="explanation" rowspan="3">Explanation by the Storekeeper/Electrical Superintendent</th>
          <th class="recommended" rowspan="3">Recommended by the Engineer in charge</th>
        </tr>
        <tr class="subheader-row">
          <th class="quantity" rowspan="2">Surplus</th>
          <th class="quantity" rowspan="2">Shortage</th>
          <th class="value">Surplus</th>
          <th class="value">Shortage</th>
        </tr>
        <tr class="currency-row">
          <th class="value">Rs. Cts.</th>
          <th class="value">Rs. Cts.</th>
        </tr>
      </thead>`;

    const styles = `
      @page {
        size: A4 landscape;
        margin: ${MARGIN_TOP}mm ${MARGIN_RIGHT}mm ${MARGIN_BOTTOM}mm ${MARGIN_LEFT}mm;
      }

      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-size: 7pt; }

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
        height: ${SIGNATURE_H}mm;
      }

      .header {
        text-align: left;
        display: flex;
        flex-direction: column;
        justify-content: center;
        overflow: hidden;
        padding-bottom: 1mm;
      }
      .address-top { display: flex; justify-content: space-between; font-size: 8pt; line-height: 1.3; margin-bottom: 1mm; }
      .form-label { font-weight: bold; }
      h2 { font-size: 16px; color: #7A0000; font-weight: bold; margin: 0 0 0.5mm; line-height: 1.2; text-align: center; }
      h3 { font-size: 13px; color: #000; font-weight: bold; margin: 0; line-height: 1.2; text-align: center; }

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
        background: #ffffff;
        font-weight: bold;
        text-align: center;
        font-size: 6.5pt;
        line-height: 1.1;
      }
      .number-row { height: 4mm; }
      .label-row { height: 8mm; }
      .subheader-row { height: 6mm; }
      .currency-row { height: 4mm; }
      /* data rows fixed height */
      tbody tr { height: ${ROW_HEIGHT}mm; }

      .sn { width: 5%; text-align: center; }
      .code { width: 9%; text-align: center; }
      .desc { width: 22%; text-align: left; font-size: 6pt; line-height: 1.15; }
      .uom { width: 8%; text-align: center; }
      .price { width: 9%; text-align: right; }
      .quantity { width: 6.5%; text-align: right; }
      .value { width: 7%; text-align: right; }
      .explanation { width: 11%; text-align: left; }
      .recommended { width: 9%; text-align: left; }
      .number-row th, .label-row th, .subheader-row th, .currency-row th { text-align: center; }

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
    `;

    // ── assemble pages ─────────────────────────────────────────────────────────
    let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${styles}</style></head><body>`;

    pages.forEach((pg) => {
      const tableWrapH = USABLE_H - (pg.isFirst ? FULL_HEADER_H : 0) - (pg.isLast ? SIGNATURE_H : 0);

      const headerHTML = pg.isFirst
        ? `<div class="header" style="height:${FULL_HEADER_H}mm;">
             <div class="address-top">
               <div>ECSC/Stores : ${esc(selectedWarehouse)}<br/>Area/Office Of the Director : ${esc(selectedDept.DeptName)} (${esc(selectedDept.DeptId)})</div>
               <div class="form-label">Form - AV/1/B</div>
             </div>
             <h2>ANNUAL VERIFICATION OF STORES/STOCKS - ${selectedYear}</h2>
             <h3>Explanation for stock shortage and excess</h3>
           </div>`
        : "";

      const signatureHTML = pg.isLast
        ? `<div class="page-bottom">
             <div class="sig-section">
               <div class="sig-row">
                 <div>
                   Store Keeper/Electrical Superintendent : ....................................<br/>
                   Date : ........./.........../..........
                 </div>
                 <div>
                   Engineer-in-Charge : ....................................<br/>
                   Date : ........./.........../..........
                 </div>
               </div>
             </div>
           </div>`
        : "";

      html += `
        <div class="page">

          <div class="page-top">
            ${headerHTML}

            <!-- Single table: thead + tbody together = no gap -->
            <div class="table-wrapper" style="height:${tableWrapH}mm;">
              <table>
                ${theadHTML}
                <tbody>
                  ${pg.rows.join("")}
                </tbody>
              </table>
            </div>
          </div>

          ${signatureHTML}

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
        5. Physical Verification Shortage/ Surplus WH Wise AV/1/B
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
          title={`5. Physical Verification Shortage/ Surplus WH Wise AV/1/B - ${selectedYear}`}
          subtitlebold2="Cost Center :"
          subtitlenormal2={`${selectedDept.DeptId} - ${selectedDept.DeptName} - Warehouse: ${selectedWarehouse}`}
          loading={reportLoading}
          hasData={reportData.length > 0}
          handleDownloadCSV={handleDownloadCSV}
          printPDF={printPDF}
          closeReport={closeReport}
          plain
        >
          <div className="mb-3 flex justify-between text-xs">
            <div>
              <div>ECSC/Stores : {selectedWarehouse}</div>
              <div>Area/Office Of the Director : {selectedDept.DeptName} ({selectedDept.DeptId})</div>
            </div>
            <strong>Form - AV/1/B</strong>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-xs border-collapse table-fixed">
              <colgroup>
                <col style={{ width: "5%" }} />
                <col style={{ width: "9%" }} />
                <col style={{ width: "22%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "9%" }} />
                <col style={{ width: "6.5%" }} />
                <col style={{ width: "6.5%" }} />
                <col style={{ width: "7%" }} />
                <col style={{ width: "7%" }} />
                <col style={{ width: "11%" }} />
                <col style={{ width: "9%" }} />
              </colgroup>
              <thead className={`${maroonGrad} text-white`}>
                <tr>
                  {Array.from({ length: 11 }, (_, index) => (
                    <th key={index} className="border border-gray-400 px-2 py-1 text-center">{index + 1}</th>
                  ))}
                </tr>
                <tr>
                  <th rowSpan={3} className="border border-gray-400 px-2 py-2 text-center">Serial No.</th>
                  <th rowSpan={3} className="border border-gray-400 px-2 py-2 text-center">Code No.</th>
                  <th rowSpan={3} className="border border-gray-400 px-2 py-2 text-center">Description</th>
                  <th rowSpan={3} className="border border-gray-400 px-2 py-2 text-center">Unit of Measurement</th>
                  <th rowSpan={3} className="border border-gray-400 px-2 py-2 text-center">Standard Price/Actual Price</th>
                  <th colSpan={2} className="border border-gray-400 px-2 py-1 text-center">Quantity</th>
                  <th colSpan={2} className="border border-gray-400 px-2 py-1 text-center">Value</th>
                  <th rowSpan={3} className="border border-gray-400 px-2 py-2 text-center">Explanation by the Storekeeper/Electrical Superintendent</th>
                  <th rowSpan={3} className="border border-gray-400 px-2 py-2 text-center">Recommended by the Engineer in charge</th>
                </tr>
                <tr>
                  <th rowSpan={2} className="border border-gray-400 px-2 py-2 text-center">Surplus</th>
                  <th rowSpan={2} className="border border-gray-400 px-2 py-2 text-center">Shortage</th>
                  <th className="border border-gray-400 px-2 py-1 text-center">Surplus</th>
                  <th className="border border-gray-400 px-2 py-1 text-center">Shortage</th>
                </tr>
                <tr>
                  <th className="border border-gray-400 px-2 py-1 text-center">Rs. Cts.</th>
                  <th className="border border-gray-400 px-2 py-1 text-center">Rs. Cts.</th>
                </tr>
              </thead>
              <tbody>
                {reportData.map((item, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="border border-gray-300 px-2 py-2 text-center">{idx + 1}</td>
                    <td className="border border-gray-300 px-2 py-2 text-center">{item.MaterialCode}</td>
                    <td className="border border-gray-300 px-2 py-2 text-left">
                      {item.GradeCode ? `${item.MaterialName} (Grade: ${item.GradeCode})` : item.MaterialName}
                    </td>
                    <td className="border border-gray-300 px-2 py-2 text-center">{item.UomCode}</td>
                    <td className="border border-gray-300 px-2 py-2 text-right">{formatNumber(item.UnitPrice)}</td>
                    <td className="border border-gray-300 px-2 py-2 text-right">{formatNumber(item.SurplusQty)}</td>
                    <td className="border border-gray-300 px-2 py-2 text-right">{formatNumber(item.ShortageQty)}</td>
                    <td className="border border-gray-300 px-2 py-2 text-right">{formatNumber(item.SurplusAmount)}</td>
                    <td className="border border-gray-300 px-2 py-2 text-right">{formatNumber(item.ShortageAmount)}</td>
                    <td className="border border-gray-300 px-2 py-2 text-left">{item.Reason}</td>
                    <td className="border border-gray-300 px-2 py-2"></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-6 flex justify-between gap-8 text-xs">
            <div className="flex-1">Store Keeper/Electrical Superintendent : ....................................<br />Date : ........./.........../..........</div>
            <div className="flex-1">Engineer-in-Charge : ....................................<br />Date : ........./.........../..........</div>
          </div>
        </ReportViewer>
      )}
    </div>
  );
};

export default PHVShortageSurplusWHwise;