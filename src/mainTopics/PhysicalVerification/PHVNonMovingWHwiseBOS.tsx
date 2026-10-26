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

const itemLabel = (item: NonMovingBOSItem): string =>
  item.GradeCode ? `${item.MaterialName} (Grade: ${item.GradeCode})` : item.MaterialName || "";

const PHVNonMovingWHwiseBOS: React.FC = () => {
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
  const [reportData, setReportData] = useState<NonMovingBOSItem[]>([]);
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
        // Fallback client-side filter
        const filteredData = warehousesData.filter(
          (item) => !item.CostCenterId || item.CostCenterId === selectedDept.DeptId
        );
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
    setReportData([]);
    setShowReport(true);
    try {
      const res = await fetch(
        `/misapi/api/phv-nonmovingwhwisebos-report/list?deptId=${encodeURIComponent(selectedDept.DeptId)}&repYear=${encodeURIComponent(selectedYear)}&repMonth=${encodeURIComponent(selectedMonth)}&warehouseCode=${encodeURIComponent(selectedWarehouse)}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
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

  const handleDownloadCSV = () => {
    if (reportData.length === 0 || !selectedDept) return;
    const csvSafe = (value: any) => {
      if (value == null) return '""';
      const str = String(value).replace(/"/g, '""');
      return `"${str}"`;
    };
    const COLS = 8;
    const rowOf = (cells: (string | number)[]) => {
      const r: (string | number)[] = [...cells];
      while (r.length < COLS) r.push("");
      return r.map(csvSafe).join(",");
    };
    // text on the left (col 1) and on the right (col 7)
    const twoCol = (left: string, right: string) => {
      const cells: string[] = new Array(COLS).fill("");
      cells[0] = left;
      cells[6] = right;
      return rowOf(cells);
    };

    const csvRows: string[] = [];

    csvRows.push(
      rowOf(["Electricity Distribution Lanka (Private) Limited"]),
      rowOf(["Board of Survey Recommendation for Non-Moving Stocks"]),
      rowOf([`Annual Verification of the year ${selectedYear ?? currentYear}`]),
      twoCol(`Branch : ${selectedDept.DeptName}`, "Form - AV/6/BOS"),
      rowOf([`Unit : ${selectedWarehouse}`]),
      rowOf([])
    );

    csvRows.push(
      rowOf([
        "Se. No.",
        "Item",
        "Price List (PL) Code",
        "PL Price",
        "Unit of Measurement",
        "Quantity",
        "Recommendation (S - To be Sold; R - To be Repaired and Used; D - To be Destroyed)",
        "Minimum Selling Price of the Total Quantity (Rs.)",
      ])
    );

    reportData.forEach((item, idx) => {
      csvRows.push(
        rowOf([
          idx + 1,
          itemLabel(item),
          "\t" + (item.MaterialCode || ""),
          formatNumber(item.UnitPrice),
          item.UomCode,
          formatNumber(item.QtyOnHand),
          "",
          "",
        ])
      );
    });

    csvRows.push(rowOf(["Total", "", "", "", "", "", "", "-"]));

    /* Signature section (once, at the end) */
    csvRows.push(
      rowOf([]),
      twoCol("Date : ..........................", ".........................."),
      twoCol("", "Storekeeper/E.S."),
      rowOf(["", "Certified Correct"]),
      twoCol("Engineer (Material Management) - For main stores only", "Unit Head"),
      rowOf([]),
      rowOf(["Recommendation of Board of Survey"]),
      rowOf([
        "We, the members of the Board of Survey, having made a thorough inspection of the items mentioned in this document, recommend the items against which the letter \"S\" has been marked as being beyond economic repairs and should therefore be sold, the items against which the letter \"D\" has been marked should be destroyed, and the items against which the letter \"R\" has been marked should be repaired and used as it is advantageous economically to do so.",
      ]),
      rowOf([]),
      rowOf(["Signed by :"]),
      twoCol("(1) Chairman - BOS (Name)", "Signature"),
      twoCol("(2) Member - BOS (Name)", "Signature"),
      twoCol("(3) Member - BOS (Name)", "Signature"),
      twoCol("(4) Observer - BOS (Name)", "Signature"),
      rowOf([]),
      rowOf(["Date : .........................."]),
      twoCol("Date : ..........................", "Director"),
      twoCol("Date : ..........................", "Chief Operating Officer")
    );

    const csvContent = csvRows.join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `PHV_NonMoving_BOS_${selectedDept.DeptId}_${selectedWarehouse}_${selectedYear ?? currentYear}_${selectedMonth != null ? String(selectedMonth).padStart(2, "0") : ""}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const printPDF = () => {
    if (reportData.length === 0 || !iframeRef.current || !selectedDept) return;

    /* ================= STYLES ================= */
    const tableStyle = `
      @page { size: A4 portrait; margin: 8mm 8mm 8mm 8mm; }
      body { margin: 0; padding: 0; font-family: Arial, sans-serif; color: #000; }

      .page { position: relative; }
      thead { display: table-header-group; }
      tr { page-break-inside: avoid; }
      table { width: 100%; border-collapse: collapse; font-size: 9px; table-layout: fixed; }
      th, td { border: 1px solid #000; padding: 1px 2px; word-wrap: break-word; }
      th { background-color: #ffffff; font-weight: bold; text-align: center; }

      .center { text-align: center; }
      .right { text-align: right; }

      .header h2 { text-align: center; color: #7A0000; font-size: 16px; margin: 0; }
      .header h3 { text-align: center; margin: 1px 0; font-size: 13px; }
      .header .sub { text-align: center; margin: 2px 0 6px 0; font-size: 12px; }

      .subtitles { margin-bottom: 6px; font-size: 11px; display: flex; justify-content: space-between; align-items: flex-start; line-height: 1.35; }
      .subtitles-left { text-align: left; }
      .subtitles-right { text-align: left; }

      .total-row td { font-weight: bold; }

      .signature { margin-top: 14px; font-size: 11px; page-break-inside: avoid; }
      .sig-columns { width: 100%; display: flex; justify-content: space-between; align-items: flex-end; }
      .sig-col-right { text-align: right; }
      .sig-line { display: block; margin-top: 14px; }
      .sig-center { text-align: center; font-weight: bold; margin: 8px 0; }
      .divider { border-top: 1px solid #000; margin: 10px 0 6px 0; }

      .bos-title { text-align: center; color: #7A0000; font-weight: bold; font-size: 12px; margin: 4px 0 6px 0; }
      .bos-body { text-align: justify; font-size: 11px; line-height: 1.45; margin: 0 0 8px 0; }
      .signed-label { font-weight: bold; margin-bottom: 6px; }

      .bos-table { width: 100%; border-collapse: collapse; font-size: 11px; table-layout: fixed; }
      .bos-table td { border: none !important; padding: 4px 4px 4px 0; vertical-align: bottom; }
      .dotted-cell { border-bottom: 1px dotted #555; height: 16px; width: 100%; }
      .label-cell { font-size: 10px; padding-top: 1px; }

      .approval { margin-top: 12px; }
      .approval-line { border-top: 1px solid #000; margin-top: 8px; }
      .approval-row { display: flex; justify-content: space-between; align-items: flex-end; margin: 14px 0; font-size: 11px; }
      .dotted-inline { display: inline-block; border-bottom: 1px dotted #555; width: 160px; margin-left: 6px; height: 12px; vertical-align: bottom; }
    `;

    let bodyHTML = "";
    reportData.forEach((item, idx) => {
      bodyHTML += `
    <tr>
      <td class="center">${idx + 1}</td>
      <td>${escapeHtml(itemLabel(item))}</td>
      <td class="center">${escapeHtml(item.MaterialCode)}</td>
      <td class="right">${formatNumber(item.UnitPrice)}</td>
      <td class="center">${escapeHtml(item.UomCode)}</td>
      <td class="right">${formatNumber(item.QtyOnHand)}</td>
      <td></td>
      <td></td>
    </tr>`;
    });

    const bosRows = [
      "(1) Chairman - BOS (Name)",
      "(2) Member - BOS (Name)",
      "(3) Member - BOS (Name)",
      "(4) Observer - BOS (Name)",
    ]
      .map(
        (label) => `
          <tr>
            <td style="width:45%;"><div class="dotted-cell"></div><div class="label-cell">${label}</div></td>
            <td style="width:10%;"></td>
            <td style="width:45%;"><div class="dotted-cell"></div><div class="label-cell">Signature</div></td>
          </tr>`
      )
      .join("");

    const pagesHTML = `
      <div class="page">
        <div class="header">
          <h2>Electricity Distribution Lanka (Private) Limited</h2>
          <h3>Board of Survey Recommendation for Non-Moving Stocks</h3>
          <div class="sub">Annual Verification of the year ${selectedYear ?? currentYear}</div>
        </div>

        <div class="subtitles">
          <div class="subtitles-left">
            <div><strong>Branch :</strong> ${escapeHtml(selectedDept.DeptName)}</div>
            <div><strong>Unit :</strong> ${escapeHtml(selectedWarehouse)}</div>
          </div>
          <div class="subtitles-right">
            <div>Form - AV/6/BOS</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width:5%">Se. No.</th>
              <th style="width:27%">Item</th>
              <th style="width:12%">Price List (PL) Code</th>
              <th style="width:9%">PL Price</th>
              <th style="width:9%">Unit of Measurement</th>
              <th style="width:8%">Quantity</th>
              <th style="width:17%">Recommendation<br/>S - To be Sold<br/>R - To be Repaired and Used<br/>D - To be Destroyed</th>
              <th style="width:13%">Minimum Selling Price of the Total Quantity (Rs.)</th>
            </tr>
          </thead>
          <tbody>
            ${bodyHTML}
            <tr class="total-row">
              <td class="center">Total</td>
              <td></td><td></td><td></td><td></td><td></td><td></td>
              <td class="center">-</td>
            </tr>
          </tbody>
        </table>

        <!--   SIGNATURE SECTION (last page only) -->
        <div class="signature">
          <div class="sig-columns">
            <div>
              <span class="sig-line">.......................................</span>
              <span>Date</span>
            </div>
            <div class="sig-col-right">
              <span class="sig-line">.......................................</span>
              <span>Storekeeper/E.S.</span>
            </div>
          </div>

          <div class="sig-center">Certified Correct</div>

          <div class="sig-columns">
            <div>
              <span class="sig-line">.......................................</span>
              <span>Engineer (Material Management)</span><br/>
              <span style="font-size:9px;">(For main stores only)</span>
            </div>
            <div class="sig-col-right">
              <span class="sig-line">.......................................</span>
              <span>Unit Head</span>
            </div>
          </div>

          <div class="divider"></div>
          <div class="bos-title">Recommendation of Board of Survey</div>
          <p class="bos-body">
            We, the members of the Board of Survey, having made a thorough inspection of the items mentioned in this document, recommend items against which the letter "S" has been marked as being beyond economic repairs and should therefore be sold, the items against which the letter "D" has been marked should be destroyed, and the items against which the letter "R" has been marked should be repaired and used as it is advantageous economically to do so.
          </p>

          <div class="signed-label">Signed by :</div>
          <table class="bos-table"><tbody>${bosRows}</tbody></table>

          <p style="margin-top:10px;">Date :<span class="dotted-inline"></span></p>

          <div class="approval">
            <div class="approval-line"></div>
            <div class="approval-row">
              <span>Date :<span class="dotted-inline"></span></span>
              <span>Director :<span class="dotted-inline"></span></span>
            </div>
            <div class="approval-line"></div>
            <div class="approval-row">
              <span>Date :<span class="dotted-inline"></span></span>
              <span>Chief Operating Officer :<span class="dotted-inline"></span></span>
            </div>
          </div>
        </div>
      </div>`;

    /* ================= RENDER ================= */
    const fullHTML = `
      <html>
        <head><meta charset="UTF-8"><style>${tableStyle}</style></head>
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
        7. Physical Verification Non Moving WH Wise BOS AV/6/BOS
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
          title={`7. Physical Verification Non Moving WH Wise BOS AV/6/BOS - ${selectedYear} `}
          subtitlebold2="Cost Center :"
          subtitlenormal2={`${selectedDept.DeptId} - ${selectedDept.DeptName}`}
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

            return (
              <div className="text-xs">
                {/* Top details (same as PDF) */}
                <div className="flex justify-between items-start mb-3 leading-relaxed">
                  <div>
                    <div>Form - AV/6/BOS</div>
                  </div>
                </div>

                <table className="w-full table-fixed">
                  <colgroup>
                    <col style={{ width: "5%" }} />
                    <col style={{ width: "27%" }} />
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "9%" }} />
                    <col style={{ width: "9%" }} />
                    <col style={{ width: "8%" }} />
                    <col style={{ width: "17%" }} />
                    <col style={{ width: "13%" }} />
                  </colgroup>
                  <thead className={`${maroonGrad} text-white`}>
                    <tr>
                      <th className={th}>Se. No.</th>
                      <th className={th}>Item</th>
                      <th className={th}>Price List (PL) Code</th>
                      <th className={th}>PL Price</th>
                      <th className={th}>Unit of Measurement</th>
                      <th className={th}>Quantity</th>
                      <th className={th}>
                        Recommendation<br />S - To be Sold<br />R - To be Repaired and Used<br />D - To be Destroyed
                      </th>
                      <th className={th}>Minimum Selling Price of the Total Quantity (Rs.)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map((item, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className={`${td} text-center`}>{idx + 1}</td>
                        <td className={`${td} text-left`}>{itemLabel(item)}</td>
                        <td className={`${td} text-center`}>{item.MaterialCode || ""}</td>
                        <td className={`${td} text-right`}>{formatNumber(item.UnitPrice)}</td>
                        <td className={`${td} text-center`}>{item.UomCode || ""}</td>
                        <td className={`${td} text-right`}>{formatNumber(item.QtyOnHand)}</td>
                        <td className={td}></td>
                        <td className={td}></td>
                      </tr>
                    ))}
                    <tr className="font-bold bg-gray-100">
                      <td className={`${td} text-center`}>Total</td>
                      <td className={td}></td>
                      <td className={td}></td>
                      <td className={td}></td>
                      <td className={td}></td>
                      <td className={td}></td>
                      <td className={td}></td>
                      <td className={`${td} text-center`}>-</td>
                    </tr>
                  </tbody>
                </table>

                {/* Signature section (same as PDF, shown once at the end) */}
                <div className="mt-4">
                  <div className="flex justify-between items-end">
                    <div>
                      <div className="mt-4">.......................................</div>
                      <div>Date</div>
                    </div>
                    <div className="text-right">
                      <div className="mt-4">.......................................</div>
                      <div>Storekeeper/E.S.</div>
                    </div>
                  </div>

                  <div className="text-center font-bold my-3">Certified Correct</div>

                  <div className="flex justify-between items-end">
                    <div>
                      <div className="mt-4">.......................................</div>
                      <div>Engineer (Material Management)</div>
                      <div className="text-[10px]">(For main stores only)</div>
                    </div>
                    <div className="text-right">
                      <div className="mt-4">.......................................</div>
                      <div>Unit Head</div>
                    </div>
                  </div>

                  <div className="border-t border-gray-800 mt-4 pt-3">
                    <h3 className="text-center font-bold text-sm text-[#7A0000] mb-2">
                      Recommendation of Board of Survey
                    </h3>
                    <p className="text-justify leading-relaxed mb-3">
                      We, the members of the Board of Survey, which made a thorough inspection of the items mentioned in this document, recommend items against which the letter “S” has been marked as being beyound economic repairs and should therefore be sold, the items against which the letter “D” has been marked should be destroyed, and the items against which the letter “R” has been marked should be repaired and used as it is advantageous economically to do so.
                    </p>

                    <div className="font-bold mb-2">Signed by :</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                      {[
                        "Chairman - BOS (Name)",
                        "Member - BOS (Name)",
                        "Member - BOS (Name)",
                        "Observer - BOS (Name)",
                      ].map((label, idx) => (
                        <div key={`${label}-${idx}`} className="flex gap-4 items-end">
                          <div className="flex-1">
                            <div className="border-b border-dotted border-gray-600 h-4 w-full"></div>
                            <div className="text-[10px] mt-0.5">({idx + 1}) {label}</div>
                          </div>
                          <div className="w-1/3">
                            <div className="border-b border-dotted border-gray-600 h-4 w-full"></div>
                            <div className="text-[10px] mt-0.5">Signature</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <p className="mt-4 flex items-end">
                      Date :
                      <span className="inline-block border-b border-dotted border-gray-600 w-40 ml-2 h-4"></span>
                    </p>

                    <div className="mt-4 border-t border-gray-800">
                      <div className="flex justify-between items-end pt-4 pb-4 border-b border-gray-800">
                        <p className="flex items-end">
                          Date :
                          <span className="inline-block border-b border-dotted border-gray-600 w-40 ml-2 h-4"></span>
                        </p>
                        <p className="flex items-end">
                          Director :
                          <span className="inline-block border-b border-dotted border-gray-600 w-40 ml-2 h-4"></span>
                        </p>
                      </div>
                      <div className="flex justify-between items-end pt-4">
                        <p className="flex items-end">
                          Date :
                          <span className="inline-block border-b border-dotted border-gray-600 w-40 ml-2 h-4"></span>
                        </p>
                        <p className="flex items-end">
                          Chief Operating Officer :
                          <span className="inline-block border-b border-dotted border-gray-600 w-40 ml-2 h-4"></span>
                        </p>
                      </div>
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

export default PHVNonMovingWHwiseBOS;