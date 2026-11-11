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

const formatDescription = (item: Pick<SlowNonMovingItem, "MaterialName" | "GradeCode" | "UomCode">): string => {
  const details = [
    item.GradeCode ? `Grade: ${item.GradeCode}` : "",
    item.UomCode ? `UOM: ${item.UomCode}` : "",
  ].filter(Boolean);
  return details.length ? `${item.MaterialName} (${details.join(", ")})` : item.MaterialName;
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
  if (!reportData.length || !selectedDept) return;

  const COLS = 8;
  const q = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rowOf = (cells: (string | number)[]) => {
    const r = [...cells];
    while (r.length < COLS) r.push("");
    return r.map(q).join(",");
  };

  const verificationDate = reportData[0]?.PhvDate
    ? new Date(String(reportData[0].PhvDate)).toLocaleDateString("en-GB")
    : "";

  const rows: string[] = [];

  /* Header (once, same as the PDF's first page) */
  rows.push(
    rowOf(["TO BE FILLED IN TRIPLICATE", "", "", "", "", "", "", "Form - AV/6"]),
    rowOf(["1. Original : Director"]),
    rowOf(["2. Duplicate : Engineer-in-charge"]),
    rowOf(["3. Triplicate : Store-keeper/E.S.(C.S.C.)"]),
    rowOf([]),
    rowOf([`ANNUAL VERIFICATION OF STORES/STOCKS - ${selectedYear}`]),
    rowOf(["Statement of Non-Moving and Slow Moving Stocks"]),
    rowOf([
      `LOCATION: ${selectedDept.DeptName} (${selectedDept.DeptId}) - ${selectedWarehouse}`,
      "", "", "", "", "", "",
      `SHEET NO. ${reportData[0]?.DocumentNo || ""}`,
    ]),
    rowOf(["", "", "", "", "", "", "", `DATE OF VERIFICATION : ${verificationDate}`]),
    rowOf([])
  );

  /* Table headings */
  rows.push(
    rowOf(["STOCK", "", "", "QUANTITY", "UNIT PRICE (Rs.)", "COST (Rs.)", "REASONS", "RECOMMENDED ACTION TO BE TAKEN"]),
    rowOf(["", "CODE", "DESCRIPTION"])
  );

  const pushSection = (title: string, items: SlowNonMovingItem[]) => {
    if (!items.length) return;

    rows.push(rowOf([title]));

    items.forEach((item) => {
      rows.push(
        rowOf([
          "",
          item.MaterialCode,
          formatDescription(item),
          formatNumber(item.QtyOnHand),
          formatNumber(item.UnitPrice),
          formatNumber(item.StockBook),
          item.Reason || "N",
          "",
        ])
      );
    });

    const subtotal = items.reduce((sum, x) => sum + (x.StockBook || 0), 0);
    rows.push(rowOf(["", "", "", "", "Sub total", formatNumber(subtotal), "", ""]));
  };

  pushSection("1. Non Moving", nonMovingItems);
  pushSection("2. Slow Moving", slowMovingItems);

  const grandTotal = reportData.reduce((sum, x) => sum + (x.StockBook || 0), 0);
  rows.push(rowOf(["", "", "", "", "Grand total", formatNumber(grandTotal), "", ""]));

  /* Signature section (once, at the end) */
  rows.push(
    rowOf([]),
    rowOf(["We do hereby certify that the stocks were physically verified as per the given statement."]),
    rowOf([]),
    rowOf(["Board of Verification", "", "", "", "", "", "", "Agreed & Certified Correct by"]),
    rowOf(["Name", "Signature"]),
    rowOf(["1. ........................", "...................", "", "", "", "", "", "......................................"]),
    rowOf(["2. ........................", "...................", "", "", "", "", "", "Store-keeper/E.S.(C.S.C.)"]),
    rowOf(["3. ........................", "..................."])
  );

  const blob = new Blob(["﻿" + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "Slow_Non_Moving_WHwise.csv";
  link.click();
  URL.revokeObjectURL(url);
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

  // Heights in mm (used to decide how many table rows fit on a page)
  const PAGE_HEIGHT = 190;
  const HEADER_HEIGHT = 45;        // shown on the first page only
  const TABLE_HEADER_HEIGHT = 16;  // column headings repeat on every page
  const ROW_HEIGHT = 8;
  const SIGNATURE_HEIGHT = 42;     // shown on the last page only


  const tableStyle = `
    @page { size: A4 landscape; margin: 8mm; }
    body { margin: 0; padding: 0; font-size: 9.5pt; line-height: 1.15; }
    .page { page-break-after: always; height: 190mm; position: relative; display: flex; flex-direction: column; }
    .document-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
    .triplicate { width: 48%; font-size: 8pt; line-height: 1.35; }
    .form { text-align: right; font-weight: bold; margin-bottom: 4px; }
    .header { text-align: center; margin: 7px 0 5px; }
    .header h2 { margin: 0 0 4px; font-size: 16px; font-weight: bold; color: #7A0000; text-align: center; }
    .header h3 { margin: 0; font-size: 13px; font-weight: bold; text-align: center; }
    .details { display: flex; justify-content: space-between; margin: 5px 0 2px; font-size: 8.5pt; font-weight: bold; }
    .verification-date { text-align: right; margin-bottom: 3px; font-size: 8.5pt; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; font-size: 7.5pt; margin-top: 4px; table-layout: fixed; }
    th, td { border: 1px solid black; padding: 2px 3px; }
    th { background: #ffffff; font-weight: bold; text-align: center; font-size: 8pt; }
    .left { text-align: left; word-wrap: break-word; }
    .center { text-align: center; }
    .right { text-align: right; }
    .section-title { font-weight: bold; }
    .subtotal { background: #ffffff; font-weight: bold; text-align: center; }
    .grandtotal { background: #ffffff; font-weight: bold; font-size: 9.5pt; text-align: center; }
    .signature { margin-top: auto; margin-bottom: 16px; font-size: 9pt; page-break-inside: avoid; }
    .signature .left { float: left; width: 55%; }
    .signature .right { float: right; width: 42%; text-align: right; }
    .signature p { margin: 1px 0; line-height: 1.1; }
    .signature table { border: none; width: 78%; font-size: 9pt; }
    .signature td { border: none; padding: 1px; }
    
    /* Allow descriptions to wrap to multiple lines */
    tbody tr { height: 8mm; }
    tbody td { vertical-align: middle; line-height: 1.3; }
    tbody td.left { white-space: normal; word-break: break-word; max-height: 8mm; overflow: hidden; }
  `;

  const escape = (str: any) => 
    String(str ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const formatNum = (n: number | null | undefined) => 
    (n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const renderHeader = () => `
    <div class="document-top">
      <div class="triplicate">
        <strong>TO BE FILLED IN TRIPLICATE</strong><br>
        1. Original : Director<br>
        2. Duplicate : Engineer-in-charge<br>
        3. Triplicate : Store-keeper/E.S.(C.S.C.)
      </div>
      <div class="form">Form - AV/6</div>
    </div>
    <div class="header">
      <h2>ANNUAL VERIFICATION OF STORES/STOCKS - ${selectedYear}</h2>
      <h3>Statement of Non-Moving and Slow Moving Stocks</h3>
    </div>
    <div class="details">
      <span>LOCATION: ${escape(`${selectedDept.DeptName} (${selectedDept.DeptId}) - ${selectedWarehouse}`)}</span>
      <span>SHEET NO. ${escape(reportData[0]?.DocumentNo || "")}</span>
    </div>
    <div class="verification-date">DATE OF VERIFICATION : ${escape(verificationDate)}</div>
  `;

  const renderTableHeader = () => `
    <colgroup>
      <col style="width:9%">
      <col style="width:11%">
      <col style="width:30%">
      <col style="width:8%">
      <col style="width:9%">
      <col style="width:9%">
      <col style="width:10%">
      <col style="width:14%">
    </colgroup>
    <thead>
      <tr>
        <th colspan="3">STOCK</th>
        <th rowspan="2">QUANTITY</th>
        <th rowspan="2">UNIT PRICE (Rs.)</th>
        <th rowspan="2">COST (Rs.)</th>
        <th rowspan="2">REASONS</th>
        <th rowspan="2">RECOMMENDED ACTION TO BE TAKEN</th>
      </tr>
      <tr>
        <th></th>
        <th>CODE</th>
        <th>DESCRIPTION</th>
      </tr>
    </thead>
  `;

  const renderItemRow = (it: SlowNonMovingItem) => `
      <tr>
        <td></td>
        <td class="center">${escape(it.MaterialCode)}</td>
        <td class="left">${escape(formatDescription(it))}</td>
        <td class="right">${formatNum(it.QtyOnHand)}</td>
        <td class="right">${formatNum(it.UnitPrice)}</td>
        <td class="right">${formatNum(it.StockBook)}</td>
        <td class="center">${escape(it.Reason || 'N')}</td>
        <td class="center"></td>
      </tr>
    `;

  const renderSectionRow = (title: string) =>
    `<tr class="section-title"><td>${escape(title)}</td><td colspan="7"></td></tr>`;

  const renderSubtotalRow = (amount: number) => `
      <tr class="subtotal">
        <td colspan="5" class="right">Sub total</td>
        <td class="right">${formatNum(amount)}</td>
        <td colspan="2"></td>
      </tr>
    `;

  const renderGrandTotalRow = (amount: number) => `
      <tr class="grandtotal">
        <td colspan="5" class="right">Grand total</td>
        <td class="right">${formatNum(amount)}</td>
        <td colspan="2"></td>
      </tr>
    `;

  const renderSignature = () => {
    return `
      <div class="signature">
        <div class="left">
          <p>We do hereby certify that the stocks were physically verified as per the given statement.</p>
          <table>
            <tr><td colspan="2"><strong>Board of Verification</strong></td></tr>
            <tr><td>Name</td><td>Signature</td></tr>
            <tr><td>1. ........................</td><td>...................</td></tr>
            <tr><td>2. ........................</td><td>...................</td></tr>
            <tr><td>3. ........................</td><td>...................</td></tr>
          </table>
        </div>
        <div class="right">
          <p>Agreed &amp; Certified Correct by</p><br>
          <p>......................................</p><br>
          <p>Store-keeper/E.S.(C.S.C.)</p>
        </div>
        <div style="clear: both;"></div>
      </div>
    `;
  };

  /* ---- One flat list of table rows: section titles, items, sub totals, grand total ---- */
  const entries: string[] = [];

  const addSection = (title: string, items: SlowNonMovingItem[]) => {
    if (items.length === 0) return;
    entries.push(renderSectionRow(title));
    items.forEach((it) => entries.push(renderItemRow(it)));
    entries.push(renderSubtotalRow(items.reduce((sum, x) => sum + (x.StockBook || 0), 0)));
  };

  addSection("1. Non Moving", nonMovingItems);
  addSection("2. Slow Moving", slowMovingItems);
  entries.push(renderGrandTotalRow(reportData.reduce((sum, x) => sum + (x.StockBook || 0), 0)));

  /* ---- Pagination: header only on the first page, signature only on the last page ---- */
  const rowsThatFit = (heightMm: number) => Math.max(1, Math.floor(heightMm / ROW_HEIGHT));

  const CAP_FIRST = rowsThatFit(PAGE_HEIGHT - HEADER_HEIGHT - TABLE_HEADER_HEIGHT);
  const CAP_MIDDLE = rowsThatFit(PAGE_HEIGHT - TABLE_HEADER_HEIGHT);
  const CAP_FIRST_AND_LAST = rowsThatFit(PAGE_HEIGHT - HEADER_HEIGHT - TABLE_HEADER_HEIGHT - SIGNATURE_HEIGHT);
  const CAP_LAST = rowsThatFit(PAGE_HEIGHT - TABLE_HEADER_HEIGHT - SIGNATURE_HEIGHT);

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
      take = remaining;            // everything left fits together with the signature
      isLast = true;
    } else if (remaining <= capFull) {
      take = Math.max(1, remaining - 1); // keep at least one row for the last page (with the signature)
    } else {
      take = capFull;
    }

    pages.push({ rows: entries.slice(idx, idx + take), isFirst, isLast });
    idx += take;
  }

  let html = `<html><head><style>${tableStyle}</style></head><body>`;

  pages.forEach((pg) => {
    html += `
      <div class="page">
        ${pg.isFirst ? renderHeader() : ""}
        <table>
          ${renderTableHeader()}
          <tbody>
            ${pg.rows.join("")}
          </tbody>
        </table>
        ${pg.isLast ? renderSignature() : ""}
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
        4. Physical Verification Non Moving/Slow Moving WH Wise AV/6
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
          title={`4. Physical Verification Non Moving/Slow Moving WH Wise AV/6 - ${selectedYear}`}
          subtitlebold2="Cost Center :"
          subtitlenormal2={`${selectedDept.DeptId} - ${selectedDept.DeptName} - Warehouse: ${selectedWarehouse}`}
          loading={reportLoading}
          hasData={reportData.length > 0}
          handleDownloadCSV={handleDownloadCSV}
          printPDF={printPDF}
          closeReport={closeReport}
          plain
        >
          {(() => {
            const th = "border border-gray-400 px-2 py-1 text-center";
            const verificationDate = reportData[0]?.PhvDate
              ? new Date(String(reportData[0].PhvDate)).toLocaleDateString("en-GB")
              : "";
            const sections = [
              { title: "1. Non Moving", items: nonMovingItems },
              { title: "2. Slow Moving", items: slowMovingItems },
            ].filter((section) => section.items.length > 0);

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
                    <div>Form - AV/6</div>
                    <div>Sheet No : {reportData[0]?.DocumentNo || ""}</div>
                    <div>Date of Verification : {verificationDate}</div>
                  </div>
                </div>
                <table className="w-full">
                  <colgroup>
                    <col className="w-[9%]" />
                    <col className="w-[11%]" />
                    <col className="w-[30%]" />
                    <col className="w-[8%]" />
                    <col className="w-[9%]" />
                    <col className="w-[9%]" />
                    <col className="w-[10%]" />
                    <col className="w-[14%]" />
                  </colgroup>
                  <thead className={`${maroonGrad} text-white`}>
                    <tr>
                      <th colSpan={3} className={th}>STOCK</th>
                      <th rowSpan={2} className={th}>QUANTITY</th>
                      <th rowSpan={2} className={th}>UNIT PRICE (Rs.)</th>
                      <th rowSpan={2} className={th}>COST (Rs.)</th>
                      <th rowSpan={2} className={th}>REASONS</th>
                      <th rowSpan={2} className={th}>RECOMMENDED ACTION TO BE TAKEN</th>
                    </tr>
                    <tr>
                      <th className={th}></th>
                      <th className={th}>CODE</th>
                      <th className={th}>DESCRIPTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sections.map((section) => (
                      <React.Fragment key={section.title}>
                        <tr>
                          <td className="border border-gray-300 px-2 py-1 font-bold">{section.title}</td>
                          <td colSpan={7} className="border border-gray-300"></td>
                        </tr>
                        {section.items.map((item, idx) => (
                          <tr key={`${section.title}-${idx}`}>
                            <td className="border border-gray-300 px-3 py-2 text-center"></td>
                            <td className="border border-gray-300 px-3 py-2 text-center">{item.MaterialCode}</td>
                            <td className="border border-gray-300 px-3 py-2 text-left">{formatDescription(item)}</td>
                            <td className="border border-gray-300 px-3 py-2 text-right">{formatNumber(item.QtyOnHand)}</td>
                            <td className="border border-gray-300 px-3 py-2 text-right">{formatNumber(item.UnitPrice)}</td>
                            <td className="border border-gray-300 px-3 py-2 text-right">{formatNumber(item.StockBook)}</td>
                            <td className="border border-gray-300 px-3 py-2 text-center">{item.Reason || "N"}</td>
                            <td className="border border-gray-300 px-3 py-2"></td>
                          </tr>
                        ))}
                        <tr>
                          <td colSpan={5} className="border border-gray-300 px-3 py-2 text-right font-bold">Sub total</td>
                          <td className="border border-gray-300 px-3 py-2 text-right font-bold">
                            {formatNumber(section.items.reduce((sum, item) => sum + (item.StockBook || 0), 0))}
                          </td>
                          <td colSpan={2} className="border border-gray-300"></td>
                        </tr>
                      </React.Fragment>
                    ))}
                    <tr>
                      <td colSpan={5} className="border border-gray-300 px-3 py-2 text-right font-bold">Grand total</td>
                      <td className="border border-gray-300 px-3 py-2 text-right font-bold">
                        {formatNumber(reportData.reduce((sum, item) => sum + (item.StockBook || 0), 0))}
                      </td>
                      <td colSpan={2} className="border border-gray-300"></td>
                    </tr>
                  </tbody>
                </table>

                <div className="mt-4">
                  <p className="mb-3">We do hereby certify that the stocks were physically verified as per the given statement.</p>
                  <div className="flex justify-between items-start gap-6">
                    <div className="w-[56%]">
                      <div className="font-bold mb-2">Board of Verification</div>
                      <table className="w-full table-fixed">
                        <thead>
                          <tr>
                            <th className="w-[5%]"></th>
                            <th className="w-[32%] font-normal text-left pb-2">Name</th>
                            <th className="w-[21%] font-normal text-left pb-2">Signature</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[1, 2, 3].map((number) => (
                            <tr key={number}>
                              <td className="text-right pr-1 align-bottom">{number}.</td>
                              <td className="px-1 py-1 align-bottom"><div className="border-b border-dotted border-gray-600 h-4 w-full"></div></td>
                              <td className="px-1 py-1 align-bottom"><div className="border-b border-dotted border-gray-600 h-4 w-full"></div></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
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
                </div>
              </div>
            );
          })()}
        </ReportViewer>
      )}
    </div>
  );
};

export default PHVSlowNonMovingWHwise;