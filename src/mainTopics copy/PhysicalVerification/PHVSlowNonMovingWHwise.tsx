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

interface SlowNonMovingItem {
  MovementType: "NON" | "SLOW";
  DocumentNo: string;
  MaterialCode: string;
  MaterialName: string;
  GradeCode: string;
  UomCode: string;
  UnitPrice: number;
  QtyOnHand: number;
  StockBook: number;
  Reason: string;
  PhvDate: String;
}

const formatNumber = (num: number | null | undefined): string => {
  if (num == null) return "0.00";
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};


const PHVSlowNonMovingWHwise: React.FC = () => {
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
  const [reportData, setReportData] = useState<SlowNonMovingItem[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const nonMovingItems = reportData.filter(
    item => item.MovementType === "NON"
  );
  const slowMovingItems = reportData.filter(
    item => item.MovementType === "SLOW"
  );

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
        `/misapi/api/phv-slow-nonmoving-whwise/list?deptId=${encodeURIComponent(
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
      const mappedData = (Array.isArray(json) ? json : []).map((item: any) => ({
  ...item,
  MovementType:
    item.Status === "1. Non-moving"
      ? "NON"
      : item.Status === "2. Slow-moving"
      ? "SLOW"
      : "",
  PhvDate: item.PhvDate ?? ""   
}));

      setReportData(mappedData);
      mappedData.length === 0
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
  if (!reportData.length) return;

  const rows: string[] = [];

  rows.push(`"STATEMENT OF NON-MOVING & SLOW-MOVING MATERIALS"`);
  rows.push(`"Cost Center","${selectedDept?.DeptId} - ${selectedDept?.DeptName}"`);
  rows.push(`"Warehouse","${selectedWarehouse}"`);
  rows.push(""); 

  const formatValue = (v: any) => `"${v ?? ""}"`;
  const formatNumberCSV = (n: number | null | undefined) =>
    `"${(n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}"`;

  const pushSection = (title: string, items: SlowNonMovingItem[]) => {
    if (!items.length) return;

    rows.push(`"${title}"`);
    rows.push(`"Serial No","Code No","Description","Grade Code","UOM","Unit Price","Qty","Stock Value","Remarks"`);

    items.forEach((item, idx) => {
      rows.push([
        formatValue(idx + 1),
        formatValue(item.MaterialCode),
        formatValue(item.MaterialName),
        formatValue(item.GradeCode),
        formatValue(item.UomCode),
        formatNumberCSV(item.UnitPrice),
        formatNumberCSV(item.QtyOnHand),
        formatNumberCSV(item.StockBook),
        formatValue(item.Reason),
      ].join(","));
    });

    const subtotal = items.reduce((s, x) => s + (x.StockBook || 0), 0);
    rows.push(`"","","","","","","TOTAL",${formatNumberCSV(subtotal)},""`);
    rows.push(""); 
  };

  pushSection("NON-MOVING ITEMS", nonMovingItems);

  pushSection("SLOW-MOVING ITEMS", slowMovingItems);

  const grandTotal = reportData.reduce((s, x) => s + (x.StockBook || 0), 0);
  rows.push(`"","", "", "", "", "", GRAND TOTAL,${formatNumberCSV(grandTotal)},""`);

  const blob = new Blob(["\uFEFF" + rows.join("\n")], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "Slow_Non_Moving_WHwise.csv";
  link.click();
};



const printPDF = () => {
  if (!iframeRef.current || !selectedDept || !selectedWarehouse || reportData.length === 0) {
    toast.error("Please select Cost Center, Warehouse, Year/Month and click 'View' first");
    return;
  }

  const nonMovingItems = reportData.filter(i => i.MovementType === "NON");
  const slowMovingItems = reportData.filter(i => i.MovementType === "SLOW");

  const verificationDate =
    reportData.length > 0 && reportData[0]?.PhvDate
      ? new Date(String(reportData[0].PhvDate)).toLocaleDateString("en-GB")
      : "";

  const PAGE_HEIGHT = 277;
  const HEADER_HEIGHT = 42;
  const TABLE_HEADER_HEIGHT = 12;
  const ROW_HEIGHT = 12; 
  const NOTE_HEIGHT = 20; 
  const GRAND_TOTAL_HEIGHT = 8; 
  const SIGNATURE_HEIGHT = 52;
  const FOOTER_HEIGHT = 14;

  const AVAILABLE_FOR_ROWS_REGULAR =
    PAGE_HEIGHT - HEADER_HEIGHT - TABLE_HEADER_HEIGHT - SIGNATURE_HEIGHT - FOOTER_HEIGHT;

  const AVAILABLE_FOR_ROWS_LAST =
    PAGE_HEIGHT - HEADER_HEIGHT - TABLE_HEADER_HEIGHT - NOTE_HEIGHT - GRAND_TOTAL_HEIGHT - SIGNATURE_HEIGHT - FOOTER_HEIGHT;

  const MAX_ROWS_PER_PAGE_REGULAR = Math.floor(AVAILABLE_FOR_ROWS_REGULAR / ROW_HEIGHT);
  const MAX_ROWS_PER_PAGE_LAST = Math.floor(AVAILABLE_FOR_ROWS_LAST / ROW_HEIGHT) - 1; 

  const tableStyle = `
    @page { size: A4 portrait; margin: 10mm; }
    body { margin: 0; padding: 0; font-family: Arial, sans-serif; font-size: 9.5pt; line-height: 1.15; }
    .page { page-break-after: always; height: 277mm; position: relative; display: flex; flex-direction: column; }
    .header { text-align: center; margin-bottom: 6px; }
    .header h2 { margin: 0; font-size: 11pt; font-weight: bold; color: #7A0000; }
    .header h3 { margin: 2px 0; font-size: 9.5pt; }
    .subtitles { font-size: 9pt; display: flex; justify-content: space-between; margin: 2px 0; }
    .subtitles div { flex-basis: 50%; }
    .subtitles .right { text-align: right; }
    table { width: 100%; border-collapse: collapse; font-size: 7.5pt; margin-top: 4px; table-layout: fixed; }
    th, td { border: 1px solid black; padding: 2px 3px; }
    th { background: #f0f0f0; font-weight: bold; text-align: center; font-size: 8pt; }
    .left { text-align: left; word-wrap: break-word; }
    .center { text-align: center; }
    .right { text-align: right; }
    .subtotal { background: #f8f8f8; font-weight: bold; text-align: center; }
    .grandtotal { background: #e8e8e8; font-weight: bold; font-size: 9.5pt; text-align: center; }
    .note { font-size: 8.5pt; margin: 8px 0; padding: 6px; border: 1px solid black; }
    .signature { margin-top: auto; margin-bottom: 16px; font-size: 9pt; page-break-inside: avoid; }
    .signature .left { float: left; width: 48%; }
    .signature .right { float: right; width: 48%; text-align: right; }
    .signature p { margin: 1px 0; line-height: 1.1; }
    .signature table { border: none; width: 100%; font-size: 9pt; }
    .signature td { border: none; padding: 1px; }
    .footer { position: absolute; bottom: 0; left: 0; right: 0; font-size: 8px; font-weight: normal; color: #000000; display: flex; justify-content: space-between; align-items: center; padding: 4px 10mm; background: white; }
    
    /* Allow descriptions to wrap to multiple lines */
    tbody tr { height: 12mm; }
    tbody td { vertical-align: middle; line-height: 1.3; }
    tbody td.left { white-space: normal; word-break: break-word; max-height: 12mm; overflow: hidden; }
  `;

  const escape = (str: any) => 
    String(str ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const formatNum = (n: number | null | undefined) => 
    (n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const renderHeader = () => `
    <div class="header">
      <h2>STATEMENT OF NON-MOVING, SLOW MOVING MATERIALS IN STOCKS - ${selectedYear}</h2>
      <h3>COST CENTRE : ${selectedDept.DeptId} WHARE HOUSE - ${selectedWarehouse}</h3>
    </div>
    <div class="subtitles">
      <div>1.ORIGINAL  :  Deputy General Manager</div>
      <div class="right">Form - AV/6</div>
    </div>
    <div class="subtitles">
      <div>2.DUPLICATE :  Engineer-in-charge</div>
      <div class="right">Date of Verification : ${verificationDate}</div>
    </div>
    <div class="subtitles">
      <div>3.TRIPLCATE :   Store-kepper/E.S.(C.S.C)</div>
      <div class="right"></div>
    </div>
  `;

  const renderTableHeader = () => `
    <thead>
      <tr>
        <th style="width:5%">Serial No</th>
        <th style="width:9%">Code No</th>
        <th style="width:28%">Description</th>
        <th style="width:7%">Grade Code</th>
        <th style="width:5%">UOM</th>
        <th style="width:9%">Quantity<br>(Stock Book)</th>
        <th style="width:9%">Unit Price</th>
        <th style="width:10%">Cost (Rs.)<br>(Stock Book)</th>
        <th style="width:7%">Reasons</th>
        <th style="width:11%">Recommended action<br>to be taken</th>
      </tr>
    </thead>
  `;

  const renderRows = (items: SlowNonMovingItem[], start: number) => 
    items.map((it, i) => `
      <tr>
        <td class="center">${start + i}</td>
        <td class="center">${escape(it.MaterialCode)}</td>
        <td class="left">${escape(it.MaterialName)}</td>
        <td class="center">${escape(it.GradeCode)}</td>
        <td class="center">${escape(it.UomCode)}</td>
        <td class="right">${formatNum(it.QtyOnHand)}</td>
        <td class="right">${formatNum(it.UnitPrice)}</td>
        <td class="right">${formatNum(it.StockBook)}</td>
        <td class="center">${escape(it.Reason || 'N')}</td>
        <td class="center"></td>
      </tr>
    `).join("");

  const renderSignature = (includeNoteAndGrandTotal: boolean = false) => {
    const grandTotal = reportData.reduce((s, x) => s + (x.StockBook || 0), 0);
    
    return `
      ${includeNoteAndGrandTotal ? `
        <div class="note">
          Note: The Sub Total Value of the report is shown as total stock value of the materials which exists S/N as first letter in remarks column. It is not equal to actual total value of Slow Moving or Non moving Stock. This report is helpd to prepare STATEMENT OF NON-MOVING and SLOW MOVING STOCKS.<br>
          Note added: 2020/02/17
        </div>
        <table style="margin-top: 8px;">
          <tbody>
            <tr class="grandtotal">
              <td colspan="7" class="right">Grand Total</td>
              <td class="right">${formatNum(grandTotal)}</td>
              <td colspan="2"></td>
            </tr>
          </tbody>
        </table>
      ` : ''}
      <div class="signature">
        <div class="left">
          <p>We do hereby certify that Stocks were physically verified as per that given statement.</p>
          <table>
            <tr><td>Board of Verifications</td><td>Name</td><td>Designation</td><td>Signature</td></tr>
            <tr><td class="right">1.</td><td>...................</td><td>...................</td><td>...................</td></tr>
            <tr><td class="right">2.</td><td>...................</td><td>...................</td><td>...................</td></tr>
            <tr><td class="right">3.</td><td>...................</td><td>...................</td><td>...................</td></tr>
          </table>
        </div>
        <div class="right">
          <p>Agreed and certified correct.</p><br>
          <p>......................................</p><br>
          <p>Store-keeper/Elect. Superintendent (C.S.C.)</p>
        </div>
        <div style="clear: both;"></div>
      </div>
    `;
  };

  const renderFooter = (page: number, totalPages: number) => {
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-GB");
    const timeStr = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }).replace(":", ".");
    const timestamp = `${dateStr} ${timeStr}`;
    return `
      <div class="footer">
        <div>Date & time of the Report Generated : ${timestamp}</div>
        <div>Page ${page} of ${totalPages}</div>
      </div>
    `;
  };

  const paginateItems = (items: SlowNonMovingItem[], isLastSection: boolean) => {
    if (items.length === 0) return [];
    
    const pages: SlowNonMovingItem[][] = [];
    let remaining = [...items];

    while (remaining.length > 0) {
      const isLastPage = remaining.length <= (isLastSection && pages.length === 0 ? MAX_ROWS_PER_PAGE_LAST : MAX_ROWS_PER_PAGE_REGULAR);
      const maxRows = isLastPage && isLastSection ? MAX_ROWS_PER_PAGE_LAST : MAX_ROWS_PER_PAGE_REGULAR;
      
      pages.push(remaining.slice(0, maxRows));
      remaining = remaining.slice(maxRows);
    }

    return pages;
  };

  const hasNonMoving = nonMovingItems.length > 0;
  const hasSlowMoving = slowMovingItems.length > 0;
  
  let allPages: Array<{
    title: string;
    items: SlowNonMovingItem[];
    subtotal: number;
    isLastPage: boolean;
    serialStart: number;
  }> = [];

  let serialCounter = 1;

  if (hasNonMoving) {
    const nonMovingPages = paginateItems(nonMovingItems, !hasSlowMoving);
    const nonMovingSubtotal = nonMovingItems.reduce((s, x) => s + (x.StockBook || 0), 0);
    
    nonMovingPages.forEach((pageItems, idx) => {
      allPages.push({
        title: "1. Non Moving",
        items: pageItems,
        subtotal: idx === nonMovingPages.length - 1 ? nonMovingSubtotal : 0,
        isLastPage: !hasSlowMoving && idx === nonMovingPages.length - 1,
        serialStart: serialCounter
      });
      serialCounter += pageItems.length;
    });
  }

  if (hasSlowMoving) {
    serialCounter = 1; 
    const slowMovingPages = paginateItems(slowMovingItems, true);
    const slowMovingSubtotal = slowMovingItems.reduce((s, x) => s + (x.StockBook || 0), 0);
    
    slowMovingPages.forEach((pageItems, idx) => {
      allPages.push({
        title: "2. Slow Moving",
        items: pageItems,
        subtotal: idx === slowMovingPages.length - 1 ? slowMovingSubtotal : 0,
        isLastPage: idx === slowMovingPages.length - 1,
        serialStart: serialCounter
      });
      serialCounter += pageItems.length;
    });
  }

  const totalPages = allPages.length;

  let html = `<html><head><style>${tableStyle}</style></head><body>`;

  allPages.forEach((pageData, pageIdx) => {
    const pageNum = pageIdx + 1;
    const showSubtotal = pageData.subtotal > 0;
    
    html += `
      <div class="page">
        ${renderHeader()}
        <div style="font-weight:bold; margin:6px 0 2px;">${pageData.title}</div>
        <table>
          ${renderTableHeader()}
          <tbody>
            ${renderRows(pageData.items, pageData.serialStart)}
            ${showSubtotal ? `
              <tr class="subtotal">
                <td colspan="7" class="right">Sub Total of ${pageData.title.replace('1. ', '').replace('2. ', '')}</td>
                <td class="right">${formatNum(pageData.subtotal)}</td>
                <td colspan="2"></td>
              </tr>
            ` : ''}
          </tbody>
        </table>
        ${renderSignature(pageData.isLastPage)}
        ${renderFooter(pageNum, totalPages)}
      </div>
    `;
  });

  html += `</body></html>`;

  const doc = iframeRef.current.contentDocument!;
  doc.open();
  doc.write(html);
  doc.close();

  setTimeout(() => iframeRef.current?.contentWindow?.print(), 600);
};

  return (
    <div className="max-w-[95%] mx-auto p-2 md:p-4 bg-white rounded-xl shadow border border-gray-200 text-sm md:text-base font-sans">
      <iframe
        ref={iframeRef}
        style={{ display: "none" }}
        title="print-frame"
      />
      <h2 className={`text-lg md:text-xl font-bold mb-4 ${maroon}`}>
        Annual Verification WHwise Signature
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
          title={`STATEMENT OF NON-MOVING & SLOW-MOVING MATERIALS - ${selectedYear}`}
          subtitlebold2="Cost Center :"
          subtitlenormal2={`${selectedDept.DeptId} - ${selectedDept.DeptName} - Warehouse: ${selectedWarehouse}`}
          loading={reportLoading}
          hasData={reportData.length > 0}
          handleDownloadCSV={handleDownloadCSV}
          printPDF={printPDF}
          closeReport={closeReport}
        >
          {/* NON-MOVING SECTION */}
          {nonMovingItems.length > 0 && (
            <div className="mb-8">
              <h3 className="font-bold text-lg mb-3 text-center bg-gray-100 py-2">
                1. NON-MOVING ITEMS
              </h3>
              <table className="w-full text-xs border-collapse">
                <thead className={`${maroonGrad} text-white`}>
                  <tr>
                    <th className="border border-gray-400 px-2 py-2 text-center">Serial No</th>
                    <th className="border border-gray-400 px-2 py-2 text-center">Code No</th>
                    <th className="border border-gray-400 px-2 py-2 text-left">Description</th>
                    <th className="border border-gray-400 px-2 py-2 text-center">Grade Code</th>
                    <th className="border border-gray-400 px-2 py-2 text-center">UOM</th>
                    <th className="border border-gray-400 px-2 py-2 text-right">Unit Price</th>
                    <th className="border border-gray-400 px-2 py-2 text-right">Quantity</th>
                    <th className="border border-gray-400 px-2 py-2 text-right">Stock Value (Rs.)</th>
                    <th className="border border-gray-400 px-2 py-2 text-center">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {nonMovingItems.map((item, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="border border-gray-300 px-2 py-2 text-center">{idx + 1}</td>
                      <td className="border border-gray-300 px-2 py-2 text-center">{item.MaterialCode}</td>
                      <td className="border border-gray-300 px-2 py-2 text-left">{item.MaterialName}</td>
                      <td className="border border-gray-300 px-2 py-2 text-center">{item.GradeCode}</td>
                      <td className="border border-gray-300 px-2 py-2 text-center">{item.UomCode}</td>
                      <td className="border border-gray-300 px-2 py-2 text-right">{formatNumber(item.UnitPrice)}</td>
                      <td className="border border-gray-300 px-2 py-2 text-right">{formatNumber(item.QtyOnHand)}</td>
                      <td className="border border-gray-300 px-2 py-2 text-right">{formatNumber(item.StockBook)}</td>
                      <td className="border border-gray-300 px-2 py-2 text-center">{item.Reason}</td>
                    </tr>
                  ))}
                  <tr className="bg-yellow-50 font-bold">
                    <td colSpan={7} className="border border-gray-300 px-2 py-2 text-center">
                      Sub Total of Non-Moving Items
                    </td>
                    <td className="border border-gray-300 px-2 py-2 text-right">
                      {formatNumber(nonMovingItems.reduce((sum, item) => sum + (item.StockBook || 0), 0))}
                    </td>
                    <td className="border border-gray-300"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
          {/* SLOW-MOVING SECTION */}
          {slowMovingItems.length > 0 && (
            <div className="mb-8">
              <h3 className="font-bold text-lg mb-3 text-center bg-gray-100 py-2">
                2. SLOW-MOVING ITEMS
              </h3>
              <table className="w-full text-xs border-collapse">
                <thead className={`${maroonGrad} text-white`}>
                  <tr>
                    <th className="border border-gray-400 px-2 py-2 text-center">Serial No</th>
                    <th className="border border-gray-400 px-2 py-2 text-center">Code No</th>
                    <th className="border border-gray-400 px-2 py-2 text-left">Description</th>
                    <th className="border border-gray-400 px-2 py-2 text-center">Grade Code</th>
                    <th className="border border-gray-400 px-2 py-2 text-center">UOM</th>
                    <th className="border border-gray-400 px-2 py-2 text-right">Unit Price</th>
                    <th className="border border-gray-400 px-2 py-2 text-right">Quantity</th>
                    <th className="border border-gray-400 px-2 py-2 text-right">Stock Value (Rs.)</th>
                    <th className="border border-gray-400 px-2 py-2 text-center">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {slowMovingItems.map((item, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="border border-gray-300 px-2 py-2 text-center">{idx + 1}</td>
                      <td className="border border-gray-300 px-2 py-2 text-center">{item.MaterialCode}</td>
                      <td className="border border-gray-300 px-2 py-2 text-left">{item.MaterialName}</td>
                      <td className="border border-gray-300 px-2 py-2 text-center">{item.GradeCode}</td>
                      <td className="border border-gray-300 px-2 py-2 text-center">{item.UomCode}</td>
                      <td className="border border-gray-300 px-2 py-2 text-right">{formatNumber(item.UnitPrice)}</td>
                      <td className="border border-gray-300 px-2 py-2 text-right">{formatNumber(item.QtyOnHand)}</td>
                      <td className="border border-gray-300 px-2 py-2 text-right">{formatNumber(item.StockBook)}</td>
                      <td className="border border-gray-300 px-2 py-2 text-center">{item.Reason}</td>
                    </tr>
                  ))}
                  <tr className="bg-yellow-50 font-bold">
                    <td colSpan={7} className="border border-gray-300 px-2 py-2 text-center">
                      Sub Total of Slow-Moving Items
                    </td>
                    <td className="border border-gray-300 px-2 py-2 text-right">
                      {formatNumber(slowMovingItems.reduce((sum, item) => sum + (item.StockBook || 0), 0))}
                    </td>
                    <td className="border border-gray-300"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
          {/* GRAND TOTAL */}
          {reportData.length > 0 && (
            <div className="mt-6">
              <table className="w-full text-xs border-collapse">
                <tbody>
                  <tr className="bg-green-100 font-bold text-base">
                    <td colSpan={7} className="border border-gray-300 px-2 py-3 text-center">
                      Grand Total
                    </td>
                    <td className="border border-gray-300 px-2 py-3 text-right">
                      {formatNumber(reportData.reduce((sum, item) => sum + (item.StockBook || 0), 0))}
                    </td>
                    <td className="border border-gray-300"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </ReportViewer>
      )}
    </div>
  );
};

export default PHVSlowNonMovingWHwise;