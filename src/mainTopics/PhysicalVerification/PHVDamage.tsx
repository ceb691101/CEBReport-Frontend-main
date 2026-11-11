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

const escapeHtml = (text: string | null | undefined): string => {
  if (text == null) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
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
        `/misapi/api/phv-damage/list?deptId=${encodeURIComponent(selectedDept.DeptId)}&repYear=${encodeURIComponent(selectedYear)}&repMonth=${encodeURIComponent(selectedMonth)}&warehouseCode=${encodeURIComponent(selectedWarehouse)}`
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
    const COLS = 7;
    const rowOf = (cells: (string | number)[]) => {
      const r: (string | number)[] = [...cells];
      while (r.length < COLS) r.push("");
      return r.map(csvSafe).join(",");
    };

    const phvDate = reportData[0]?.PhvDate?.split("T")[0] || "..............";
    const totalStockBook = reportData.reduce((sum, item) => sum + (item.StockBook || 0), 0);

    const descriptionOf = (item: PHVDamageItem) => {
      const details = [
        item.GradeCode ? `Grade: ${item.GradeCode}` : "",
        item.UomCode ? `UOM: ${item.UomCode}` : "",
      ].filter(Boolean);
      return details.length ? `${item.MaterialName || ""} (${details.join(", ")})` : item.MaterialName || "";
    };

    const csvRows: string[] = [];

    /* Header (once, same as the PDF) */
    csvRows.push(
      rowOf(["TO BE FILLED IN TRIPLICATE", "", "", "", "", "", "Form - AV/7 (B)"]),
      rowOf(["1. Original : Director"]),
      rowOf(["2. Duplicate : Engineer-in-charge"]),
      rowOf(["3. Triplicate : Store-keeper/E.S.(C.S.C.)"]),
      rowOf([]),
      rowOf([`ANNUAL VERIFICATION OF STORES/STOCKS - ${selectedYear ?? currentYear}`]),
      rowOf(["Statement of Damaged Stocks"]),
      rowOf([
        `LOCATION: ${selectedDept.DeptName} (${selectedDept.DeptId}) - ${selectedWarehouse}`,
        "", "", "", "", "",
        `SHEET NO. : ${reportData[0]?.DocumentNo || ""}`,
      ]),
      rowOf(["", "", "", "", "", "", `DATE OF VERIFICATION : ${phvDate}`]),
      rowOf([])
    );

    /* Table headings (same as the PDF) */
    csvRows.push(
      rowOf(["S T O C K", "", "QUANTITY", "UNIT PRICE (Rs.)", "COST (Rs.)", "REASONS", "RECOMMENDED ACTION TO BE TAKEN"]),
      rowOf(["ITEM", "DESCRIPTION"])
    );

    /* Data rows */
    reportData.forEach((item) => {
      csvRows.push(
        rowOf([
          "\t" + (item.MaterialCode || ""),
          descriptionOf(item),
          formatNumber(item.QtyOnHand),
          formatNumber(item.UnitPrice),
          formatNumber(item.StockBook),
          item.Reason || "DAM",
          "",
        ])
      );
    });

    csvRows.push(rowOf(["Total", "", "", "", formatNumber(totalStockBook), "", ""]));

    /* Signature section (once, at the end) */
    csvRows.push(
      rowOf([]),
      rowOf(["We do hereby certify that the stocks were physically verified as per the given statement."]),
      rowOf([]),
      rowOf(["Signature of the Board of Verification", "", "", "", "", "", "Agreed & Certified Correct by"]),
      rowOf(["1. ................................", "", "", "", "", "", "......................................"]),
      rowOf(["2. ................................", "", "", "", "", "", "Store-keeper/E.S.(C.S.C.)"]),
      rowOf(["3. ................................"])
    );

    const csvContent = csvRows.join("\n");
    const blob = new Blob(["﻿" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `PHV_Damage_WHwise_${selectedDept.DeptId}_${selectedWarehouse}_${selectedYear ?? currentYear}_${selectedMonth != null ? String(selectedMonth).padStart(2, "0") : ""}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const printPDF = () => {
    if (reportData.length === 0 || !iframeRef.current || !selectedDept || !selectedWarehouse) {
      toast.error("Please select Cost Center, Warehouse, Year/Month and click 'View' first");
      return;
    }

    /* ================= STYLES ================= */
    const tableStyle = `
      @page { size: A4 landscape; margin: 6mm 6mm 6mm 6mm; }
      body { margin: 0; padding: 0; color: #000; }

      .page { position: relative; }
      thead { display: table-header-group; }
      tr { page-break-inside: avoid; }

      .copies { display: flex; justify-content: space-between; align-items: flex-start; font-size: 11px; line-height: 1.4; }
      .form-label { font-weight: bold; font-size: 12px; }

      .header { margin: 8px 0 6px 0; }
      .header h2 { text-align: center; color: #7A0000; font-size: 16px; margin: 0 0 2px 0; }
      .header h3 { text-align: center; font-size: 13px; font-weight: bold; margin: 0; }

      .details { display: flex; justify-content: space-between; align-items: flex-end; font-size: 11px; font-weight: bold; line-height: 1.5; margin-bottom: 4px; }
      .details-right { text-align: right; }

      table.main { width: 100%; border-collapse: collapse; font-size: 9px; table-layout: fixed; }
      table.main th, table.main td { border: 1px solid #000; padding: 1px 2px; word-wrap: break-word; }
      table.main th { background-color: #ffffff; font-weight: bold; text-align: center; }
      table.main tbody tr { height: 7mm; }
      table.main tbody td { vertical-align: middle; }

      .center { text-align: center; }
      .right { text-align: right; }
      .left { text-align: left; }

      .total-row td { font-weight: bold; }

      .signature { margin-top: 14px; font-size: 11px; page-break-inside: avoid; }
      .sig-top { display: flex; justify-content: space-between; align-items: flex-start; }
      .sig-cert { line-height: 1.3; }
      .sig-bottom { display: flex; align-items: flex-start; margin-top: 4px; }
      .sig-board-label { width: 22%; line-height: 1.4; padding-top: 1.5mm; }
      .sig-board-lines { width: 34%; }
      .sig-board-lines div { height: 8mm; line-height: 8mm; white-space: nowrap; }

      /* "Agreed..." and the Store-keeper block share the same width and right margin,
         so their centres line up exactly */
      .sig-agreed, .sig-store { width: 30%; margin-right: 3%; text-align: center; }
      .sig-agreed { margin-top: 4mm; }
      .sig-store { margin-left: auto; padding-top: 2mm; }
      .sig-dots { margin-bottom: 1.5mm; white-space: nowrap; }
    `;

    const phvDate = reportData[0]?.PhvDate?.split("T")[0] || "..............";
    const totalStockBook = reportData.reduce((sum, item) => sum + (item.StockBook || 0), 0);

    const descriptionOf = (item) => {
      const details = [
        item.GradeCode ? `Grade: ${item.GradeCode}` : "",
        item.UomCode ? `UOM: ${item.UomCode}` : "",
      ].filter(Boolean);
      return details.length ? `${item.MaterialName || ""} (${details.join(", ")})` : item.MaterialName || "";
    };

    let bodyHTML = "";
    reportData.forEach((item) => {
      bodyHTML += `
    <tr>
      <td class="center">${escapeHtml(item.MaterialCode)}</td>
      <td class="left">${escapeHtml(descriptionOf(item))}</td>
      <td class="right">${formatNumber(item.QtyOnHand)}</td>
      <td class="right">${formatNumber(item.UnitPrice)}</td>
      <td class="right">${formatNumber(item.StockBook)}</td>
      <td class="center">${escapeHtml(item.Reason || "DAM")}</td>
      <td class="center"></td>
    </tr>`;
    });

    // Layout follows the AV/7 (B) form: header once at the top, signature once at the end
    const pagesHTML = `
      <div class="page">
        <div class="copies">
          <div>
            <strong>TO BE FILLED IN TRIPLICATE</strong><br/>
            1. Original : Director<br/>
            2. Duplicate : Engineer-in-charge<br/>
            3. Triplicate : Store-keeper/E.S.(C.S.C.)
          </div>
          <div class="form-label">Form - AV/7 (B)</div>
        </div>

        <div class="header">
          <h2>ANNUAL VERIFICATION OF STORES/STOCKS - ${selectedYear ?? currentYear}</h2>
          <h3>Statement of Damaged Stocks</h3>
        </div>

        <div class="details">
          <div>LOCATION: ${escapeHtml(selectedDept.DeptName)} (${escapeHtml(selectedDept.DeptId)}) - ${escapeHtml(selectedWarehouse)}</div>
          <div class="details-right">
            <div>SHEET NO. : ${escapeHtml(reportData[0]?.DocumentNo || "")}</div>
            <div>DATE OF VERIFICATION : ${escapeHtml(phvDate)}</div>
          </div>
        </div>

        <table class="main">
          <colgroup>
            <col style="width:11%"><col style="width:27%"><col style="width:9%"><col style="width:10%">
            <col style="width:10%"><col style="width:9%"><col style="width:24%">
          </colgroup>
          <thead>
            <tr>
              <th colspan="2">S T O C K</th>
              <th rowspan="2">QUANTITY</th>
              <th rowspan="2">UNIT PRICE (Rs.)</th>
              <th rowspan="2">COST (Rs.)</th>
              <th rowspan="2">REASONS</th>
              <th rowspan="2">RECOMMENDED ACTION TO BE TAKEN</th>
            </tr>
            <tr>
              <th>ITEM</th>
              <th>DESCRIPTION</th>
            </tr>
          </thead>
          <tbody>
            ${bodyHTML}
            <tr class="total-row">
              <td class="left">Total</td>
              <td></td>
              <td></td>
              <td></td>
              <td class="right">${formatNumber(totalStockBook)}</td>
              <td></td>
              <td></td>
            </tr>
          </tbody>
        </table>

        <!--   SIGNATURE SECTION (last page only) -->
        <div class="signature">
          <div class="sig-top">
            <div class="sig-cert">We do hereby certify that the stocks were physically verified as per the given statement.</div>
            <div class="sig-agreed">Agreed &amp; Certified Correct by</div>
          </div>
          <div class="sig-bottom">
            <div class="sig-board-label"><strong>Signature of the<br/>Board of Verification</strong></div>
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
        </div>
      </div>`;

    /* ================= RENDER ================= */
    const fullHTML = `
      <html>
        <head><meta charset="UTF-8"><title>PHV Damage Report</title><style>${tableStyle}</style></head>
        <body>${pagesHTML}</body>
      </html>
    `;

    const doc = iframeRef.current.contentDocument!;
    doc.open();
    doc.write(fullHTML);
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
        6.2. Physical Verification Damage (GRADE Code) AV/7(B)
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
          title={`6.2. Physical Verification Damage (GRADE Code) AV/7(B) - ${selectedYear}`}
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
            const td = "border border-gray-300 px-3 py-2";
            const phvDate = reportData[0]?.PhvDate?.split("T")[0] || "..............";
            const totalStockBook = reportData.reduce((sum, item) => sum + (item.StockBook || 0), 0);

            const descriptionOf = (item: PHVDamageItem) => {
              const details = [
                item.GradeCode ? `Grade: ${item.GradeCode}` : "",
                item.UomCode ? `UOM: ${item.UomCode}` : "",
              ].filter(Boolean);
              return details.length ? `${item.MaterialName || ""} (${details.join(", ")})` : item.MaterialName || "";
            };

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
                    <div>Form - AV/7(B)</div>
                    <div>Sheet No : {reportData[0]?.DocumentNo || ""}</div>
                    <div>Date of Verification : {phvDate}</div>
                  </div>
                </div>
                <table className="w-full table-fixed">
                  <colgroup>
                    <col style={{ width: "11%" }} />
                    <col style={{ width: "27%" }} />
                    <col style={{ width: "9%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "9%" }} />
                    <col style={{ width: "24%" }} />
                  </colgroup>
                  <thead className={`${maroonGrad} text-white`}>
                    <tr>
                      <th colSpan={2} className={th}>S T O C K</th>
                      <th rowSpan={2} className={th}>QUANTITY</th>
                      <th rowSpan={2} className={th}>UNIT PRICE (Rs.)</th>
                      <th rowSpan={2} className={th}>COST (Rs.)</th>
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
                      <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className={`${td} text-center`}>{item.MaterialCode || ""}</td>
                        <td className={`${td} text-left`}>{descriptionOf(item)}</td>
                        <td className={`${td} text-right`}>{formatNumber(item.QtyOnHand)}</td>
                        <td className={`${td} text-right`}>{formatNumber(item.UnitPrice)}</td>
                        <td className={`${td} text-right`}>{formatNumber(item.StockBook)}</td>
                        <td className={`${td} text-center`}>{item.Reason || "DAM"}</td>
                        <td className={`${td} text-center`}></td>
                      </tr>
                    ))}
                    <tr className="font-bold bg-white">
                      <td className={`${td} text-left`}>Total</td>
                      <td className={td}></td>
                      <td className={td}></td>
                      <td className={td}></td>
                      <td className={`${td} text-right`}>{formatNumber(totalStockBook)}</td>
                      <td className={td}></td>
                      <td className={td}></td>
                    </tr>
                  </tbody>
                </table>

                <div className="mt-4">
                  <p className="mb-3">We do hereby certify that the stocks were physically verified as per the given statement.</p>
                  <div className="flex justify-between items-start gap-6">
                    <div className="w-[56%]">
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
                </div>
              </div>
            );
          })()}
        </ReportViewer>
      )}
    </div>
  );
};

export default PHVDamage;