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

interface AnnualVerificationWHwiseItem {
  MaterialCode: string;
  MaterialName: string;
  UomCode: string;
  GradeCode: string;
  UnitPrice: number;
  QtyOnHand: number;
  CountedQty: number;
  DocumentNo: string;
  PhvDate: string;
  SurplusQty: number | null;
  ShortageQty: number | null;
  StockBook: number;
  PhysicalBook: number;
  SurplusAmount: number | null;
  ShortageAmount: number | null;
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

const AnnualVerificationWHwiseSignature: React.FC = () => {
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
  const [reportData, setReportData] = useState<AnnualVerificationWHwiseItem[]>([]);
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
    setReportData([]);
    setShowReport(true);
    try {
      const res = await fetch(
        `/misapi/api/annual-verification-whwise-signature?deptId=${encodeURIComponent(selectedDept.DeptId)}&warehouseCode=${encodeURIComponent(selectedWarehouse)}&repYear=${encodeURIComponent(selectedYear)}&repMonth=${encodeURIComponent(selectedMonth)}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const items: AnnualVerificationWHwiseItem[] = Array.isArray(json) ? json : json.data || [];
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
    const COLS = 15;
    const rowOf = (cells: (string | number)[]) => {
      const r: (string | number)[] = [...cells];
      while (r.length < COLS) r.push("");
      return r.map(csvSafe).join(",");
    };
    // text on the left (col 1) and on the right (col 11), like the PDF's top block
    const twoCol = (left: string, right: string) => {
      const cells: string[] = new Array(COLS).fill("");
      cells[0] = left;
      cells[10] = right;
      return rowOf(cells);
    };

    // Header once at the top, signature/notes once at the end
    const docNosInReport = Array.from(
      new Set(reportData.map((i) => (i.DocumentNo || "").trim()).filter(Boolean))
    );
    const sheetNo =
      docNosInReport.length > 1
        ? `${docNosInReport[0]} - ${docNosInReport[docNosInReport.length - 1]}`
        : docNosInReport[0] || "";
    const phvDate = reportData[0]?.PhvDate || "..............";

    const csvRows: string[] = [];

    csvRows.push(
      rowOf([`ANNUAL VERIFICATION OF STORES - ${selectedYear ?? currentYear}`]),
      rowOf([`Cost Center : ${selectedDept.DeptId} - ${selectedDept.DeptName}`]),
      rowOf([])
    );

    csvRows.push(
      twoCol("TO BE FILLED IN TRIPLICATE", "From Ref : AV/1/A"),
      twoCol("1. ORIGINAL : Accountant", `Sheet No : ${sheetNo}`),
      twoCol("2. DUPLICATE : (Unit)", `Date of Verification : ${phvDate}`),
      twoCol("3. TRIPLICATE : Store-keeper/E.S.(C.S.C.)", ""),
      rowOf([])
    );

    /* Table headers (same rows as the PDF) */
    csvRows.push(
      rowOf(Array.from({ length: COLS }, (_, i) => i + 1)),
      rowOf([
        "Serial No.", "Code No.", "Description", "Grade", "UOM", "Standard Price",
        "Q U A N T I T Y", "", "", "",
        "V A L U E", "", "", "",
        "Remarks (*)",
      ]),
      rowOf([
        "", "", "", "", "", "",
        "Book Balance", "Physical Balance", "Surplus", "Shortage",
        "Book Value", "Physical Value", "Surplus", "Shortage",
        "",
      ]),
      rowOf([
        "", "", "", "", "",
        "Rs. Cts.",
        "", "", "", "",
        "Rs. Cts.", "Rs. Cts.", "Rs. Cts.", "Rs. Cts.",
        "",
      ])
    );

    /* Data rows */
    reportData.forEach((item, idx) => {
      csvRows.push(
        rowOf([
          idx + 1,
          "\t" + (item.MaterialCode || ""),
          item.MaterialName,
          item.GradeCode,
          item.UomCode,
          formatNumber(item.UnitPrice),
          formatNumber(item.QtyOnHand),
          formatNumber(item.CountedQty),
          formatNumber(item.SurplusQty),
          formatNumber(item.ShortageQty),
          formatNumber(item.StockBook),
          formatNumber(item.PhysicalBook),
          formatNumber(item.SurplusAmount),
          formatNumber(item.ShortageAmount),
          item.Reason,
        ])
      );
    });

    /* Signature section (once, at the end) */
    csvRows.push(
      rowOf([]),
      rowOf(["We do hereby certify that the stocks were physically verified as per above record."]),
      rowOf([]),
      twoCol("Board of Verification", "Agreed for the above physical verification."),
      rowOf(["", "Name", "", "Designation", "", "Signature", "", "Date"]),
      twoCol("1.", "Signature:"),
      twoCol("2.", "Designation : (Store-keeper/Electrical Superintendent/......)"),
      twoCol("3.", "(Place the rubber stamp)"),
      twoCol("", "Date :")
    );

    /* Notes */
    csvRows.push(
      rowOf([]),
      rowOf(["Note :"]),
      rowOf(["Columns 1 - 6 should be filled by the store-keeper/electrical superintendent if the format is not generated by the MITFIN Inventory system."]),
      rowOf(["Columns 7 - 15 should be filled by the Board of Verification."]),
      rowOf(["Please indicate in the Remark Column"]),
      rowOf(["(*)- Status of the stocks -Obsolete and idle,Damage,slow moving and non moving (O,D,SM and NM)"])
    );

    const csvContent = csvRows.join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Annual_Verification_Sheet_${selectedDept.DeptId}_${selectedYear ?? currentYear}_${selectedMonth != null ? String(selectedMonth).padStart(2, "0") : ""}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };
const printPDF = () => {
  if (reportData.length === 0 || !iframeRef.current || !selectedDept) return;

  /* ================= GROUP DATA BY DOCUMENT NO ================= */
  const groupedByDoc: Record<string, AnnualVerificationWHwiseItem[]> = {};

  reportData.forEach(item => {
    const key = (item.DocumentNo || "").trim();
    if (!groupedByDoc[key]) groupedByDoc[key] = [];
    groupedByDoc[key].push(item);
  });

  const documentNos = Object.keys(groupedByDoc);
  const totalPages = documentNos.length;

  /* ================= STYLES ================= */
  const tableStyle = `
    @page { size: A4 landscape; margin: 4mm 4mm 4mm 4mm; }
    body { margin: 0; padding: 0; }

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
    .cost-center { font-size: 13px; margin: 2px 0 6px 0; text-align: left; }

    .subtitles { margin-bottom: 6px; font-size: 11px; display: flex; justify-content: space-between; align-items: flex-start; line-height: 1.35; }
    .subtitles-left { text-align: left; }
    .subtitles-right { text-align: left; }

    .signature { margin-top: 14px; font-size: 11px; page-break-inside: avoid; }
    .sig-statement { margin: 0 0 10px 0; font-size: 11.5px; }
    .sig-columns { width: 100%; display: flex; justify-content: space-between; align-items: flex-start; }
    .sig-left { width: 56%; }
    .sig-right { width: 38%; }

    .board-header { font-weight: bold; margin-bottom: 8px; font-size: 11.5px; }
    .board-table { width: 100%; border-collapse: collapse; font-size: 11px; table-layout: fixed; }
    .board-table th { border: none !important; font-weight: normal; text-align: left; padding: 2px 4px 6px 0; background: transparent; }
    .board-table td { border: none !important; padding: 4px 4px 4px 0; vertical-align: bottom; }
    .dotted-cell { border-bottom: 1px dotted #555 !important; height: 16px; width: 100%; }

    .sig-right p { margin: 0 0 6px 0; line-height: 1.3; }
    .sig-signature-row { margin: 16px 0 6px 0; display: flex; align-items: flex-end; }
    .sig-signature-line { flex: 1; border-bottom: 1px dotted #555; height: 14px; margin-left: 6px; }
    .sig-date-line { display: inline-block; border-bottom: 1px dotted #555; width: 160px; margin-left: 6px; height: 14px; vertical-align: bottom; }

    .notes-section { margin-top: 14px; font-size: 10.5px; line-height: 1.45; }
    .notes-section p { margin: 1px 0; }
    .underline { text-decoration: underline; }

    .clear { clear: both; }
  `;

    // Header only on the first page, signature/notes only on the last page.
    // One continuous table: rows flow across pages, column headings repeat.
    const docNosInReport = documentNos.filter(Boolean);
    const sheetNo =
      docNosInReport.length > 1
        ? `${docNosInReport[0]} - ${docNosInReport[docNosInReport.length - 1]}`
        : docNosInReport[0] || "";
    const phvDate = reportData[0]?.PhvDate || "..............";

    let bodyHTML = "";
    reportData.forEach((item, idx) => {
      bodyHTML += `
    <tr>
      <td class="center">${idx + 1}</td>
      <td class="center">${escapeHtml(item.MaterialCode)}</td>
      <td>${escapeHtml(item.MaterialName)}</td>
      <td class="center">${escapeHtml(item.GradeCode)}</td>
      <td class="center">${escapeHtml(item.UomCode)}</td>
      <td class="right">${formatNumber(item.UnitPrice)}</td>
      <td class="right">${formatNumber(item.QtyOnHand)}</td>
      <td class="right">${formatNumber(item.CountedQty)}</td>
      <td class="right">${formatNumber(item.SurplusQty)}</td>
      <td class="right">${formatNumber(item.ShortageQty)}</td>
      <td class="right">${formatNumber(item.StockBook)}</td>
      <td class="right">${formatNumber(item.PhysicalBook)}</td>
      <td class="right">${formatNumber(item.SurplusAmount)}</td>
      <td class="right">${formatNumber(item.ShortageAmount)}</td>
      <td>${escapeHtml(item.Reason)}</td>
    </tr>`;
    });

    const pagesHTML = `
      <div class="page">
        <div class="subtitles">
          <div class="subtitles-left">
            <div style="font-weight: bold; margin-bottom: 2px;">TO BE FILLED IN TRIPLICATE</div>
            <div>1. ORIGINAL : Accountant</div>
            <div>2. DUPLICATE : (Unit)</div>
            <div>3. TRIPLICATE : Store-keeper/E.S.(C.S.C.)</div>
          </div>
          <div class="subtitles-right">
            <div>From Ref : AV/1/A</div>
            <div>Sheet No : ${escapeHtml(sheetNo)}</div>
            <div>Date of Verification : ${escapeHtml(phvDate)}</div>
          </div>
        </div>
        <div class="header">
          <h2>ANNUAL VERIFICATION OF STORES - ${selectedYear}</h2>
        </div>
        <div class="cost-center"><strong>Cost Center :</strong> ${escapeHtml(selectedDept.DeptId)} - ${escapeHtml(selectedDept.DeptName)}</div>


        <table>
          <thead>
            <tr>
              <th style="width:3%">1</th>
              <th style="width:4%">2</th>
              <th style="width:27%">3</th>
              <th style="width:4%">4</th>
              <th style="width:4%">5</th>
              <th style="width:5%">6</th>
              <th style="width:5%">7</th>
              <th style="width:5%">8</th>
              <th style="width:5%">9</th>
              <th style="width:5%">10</th>
              <th style="width:5%">11</th>
              <th style="width:6%">12</th>
              <th style="width:6%">13</th>
              <th style="width:6%">14</th>
              <th style="width:9%">15</th>
            </tr>
            <tr>
              <th rowspan="3">Serial No.</th>
              <th rowspan="3">Code No.</th>
              <th rowspan="3">Description</th>
              <th rowspan="3">Grade</th>
              <th rowspan="3">UOM</th>
              <th rowspan="2">Standard Price</th>
              <th colspan="4">Q U A N T I T Y</th>
              <th colspan="4">V A L U E</th>
              <th rowspan="3">Remarks (*)</th>
            </tr>
            <tr>
              <th rowspan="2">Book Balance</th>
              <th rowspan="2">Physical Balance</th>
              <th rowspan="2">Surplus</th>
              <th rowspan="2">Shortage</th>
              <th>Book Value</th>
              <th>Physical Value</th>
              <th>Surplus</th>
              <th>Shortage</th>
            </tr>
            <tr>
              <th>Rs. Cts.</th>
              <th>Rs. Cts.</th>
              <th>Rs. Cts.</th>
              <th>Rs. Cts.</th>
              <th>Rs. Cts.</th>
            </tr>
          </thead>
          <tbody>${bodyHTML}</tbody>
        </table>

        <!--   SIGNATURE SECTION (last page only) -->
        <div class="signature">
          <p class="sig-statement">We do hereby certify that the stocks were physically verified as per above record.</p>

          <div class="sig-columns">
            <div class="sig-left">
              <div class="board-header">Board of Verification</div>
              <table class="board-table">
                <thead>
                  <tr>
                    <th style="width: 5%;"></th>
                    <th style="width: 32%;">Name</th>
                    <th style="width: 32%;">Designation</th>
                    <th style="width: 21%;">Signature</th>
                    <th style="width: 10%;">Date</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="right" style="padding-right: 4px;">1.</td>
                    <td><div class="dotted-cell"></div></td>
                    <td><div class="dotted-cell"></div></td>
                    <td><div class="dotted-cell"></div></td>
                    <td><div class="dotted-cell"></div></td>
                  </tr>
                  <tr>
                    <td class="right" style="padding-right: 4px;">2.</td>
                    <td><div class="dotted-cell"></div></td>
                    <td><div class="dotted-cell"></div></td>
                    <td><div class="dotted-cell"></div></td>
                    <td><div class="dotted-cell"></div></td>
                  </tr>
                  <tr>
                    <td class="right" style="padding-right: 4px;">3.</td>
                    <td><div class="dotted-cell"></div></td>
                    <td><div class="dotted-cell"></div></td>
                    <td><div class="dotted-cell"></div></td>
                    <td><div class="dotted-cell"></div></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="sig-right">
              <p>Agreed for the above physical verification.</p>
              <div class="sig-signature-row">
                <span>Signature:</span>
                <span class="sig-signature-line"></span>
              </div>
              <p>Designation : (Store-keeper/Electrical Superintendent/......)</p>
              <p>(Place the rubber stamp)</p>
              <p style="margin-top: 10px;">Date :<span class="sig-date-line"></span></p>
            </div>
          </div>

          <!-- NOTES SECTION -->
          <div class="notes-section">
            <p><strong>Note :</strong></p>
            <p>Columns 1 - 6 should be filled by the store-keeper/electrical superintendent if the format is not generated by the MITFIN Inventory system.</p>
            <p>Columns 7 - 15 should be filled by the Board of Verification.</p>
            <p><span class="underline">Please indicate in the Remark Column</span></p>
            <p>(*)- Status of the stocks -Obsolete and idle,Damage,slow moving and non moving (O,D,SM and NM)</p>
          </div>
        </div>

      </div>`;

  /* ================= RENDER ================= */
  const fullHTML = `
    <html>
      <head><style>${tableStyle}</style></head>
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
        3.2. Annual Verification Sheet (WHwise Signature) AV/1A
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
          title={`3.2. Annual Verification Sheet (WHwise Signature) AV/1A - ${selectedYear} `}
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
            // Header once at the top, signature/notes once at the end
            const th = "border border-gray-400 px-2 py-1 text-center";
            const docNosInReport = Array.from(
              new Set(reportData.map((i) => (i.DocumentNo || "").trim()).filter(Boolean))
            );
            const sheetNo =
              docNosInReport.length > 1
                ? `${docNosInReport[0]} - ${docNosInReport[docNosInReport.length - 1]}`
                : docNosInReport[0] || "";
            const phvDate = reportData[0]?.PhvDate || "..............";

            return (
              <div className="text-xs">
                {/* Top details (same as PDF) */}
                <div className="flex justify-between items-start mb-3 leading-relaxed">
                  <div>
                    <div className="font-bold mb-0.5">TO BE FILLED IN TRIPLICATE</div>
                    <div>1. ORIGINAL : Accountant</div>
                    <div>2. DUPLICATE : (Unit)</div>
                    <div>3. TRIPLICATE : Store-keeper/E.S.(C.S.C.)</div>
                  </div>
                  <div>
                    <div>From Ref : AV/1/A</div>
                    <div>Sheet No : {sheetNo}</div>
                    <div>Date of Verification : {phvDate}</div>
                  </div>
                </div>

                <table className="w-full">
                  <thead className={`${maroonGrad} text-white`}>
                    <tr>
                      {Array.from({ length: 15 }, (_, index) => (
                        <th key={index} className={`${th} whitespace-nowrap`}>
                          {index + 1}
                        </th>
                      ))}
                    </tr>
                    <tr>
                      <th rowSpan={3} className={th}>Serial No.</th>
                      <th rowSpan={3} className={th}>Code No.</th>
                      <th rowSpan={3} className={th}>Description</th>
                      <th rowSpan={3} className={th}>Grade</th>
                      <th rowSpan={3} className={th}>UOM</th>
                      <th rowSpan={2} className={th}>Standard Price</th>
                      <th colSpan={4} className={th}>Q U A N T I T Y</th>
                      <th colSpan={4} className={th}>V A L U E</th>
                      <th rowSpan={3} className={th}>Remarks (*)</th>
                    </tr>
                    <tr>
                      <th rowSpan={2} className={th}>Book Balance</th>
                      <th rowSpan={2} className={th}>Physical Balance</th>
                      <th rowSpan={2} className={th}>Surplus</th>
                      <th rowSpan={2} className={th}>Shortage</th>
                      <th className={th}>Book Value</th>
                      <th className={th}>Physical Value</th>
                      <th className={th}>Surplus</th>
                      <th className={th}>Shortage</th>
                    </tr>
                    <tr>
                      <th className={th}>Rs. Cts.</th>
                      <th className={th}>Rs. Cts.</th>
                      <th className={th}>Rs. Cts.</th>
                      <th className={th}>Rs. Cts.</th>
                      <th className={th}>Rs. Cts.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map((item, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="border border-gray-300 px-3 py-2 text-center">{idx + 1}</td>
                        <td className="border border-gray-300 px-3 py-2 text-center">{item.MaterialCode || ""}</td>
                        <td className="border border-gray-300 px-3 py-2 text-left">{item.MaterialName || ""}</td>
                        <td className="border border-gray-300 px-3 py-2 text-center">{item.GradeCode || ""}</td>
                        <td className="border border-gray-300 px-3 py-2 text-center">{item.UomCode || ""}</td>
                        <td className="border border-gray-300 px-3 py-2 text-right">{formatNumber(item.UnitPrice)}</td>
                        <td className="border border-gray-300 px-3 py-2 text-right">{formatNumber(item.QtyOnHand)}</td>
                        <td className="border border-gray-300 px-3 py-2 text-right">{formatNumber(item.CountedQty)}</td>
                        <td className="border border-gray-300 px-3 py-2 text-right">{formatNumber(item.SurplusQty)}</td>
                        <td className="border border-gray-300 px-3 py-2 text-right">{formatNumber(item.ShortageQty)}</td>
                        <td className="border border-gray-300 px-3 py-2 text-right">{formatNumber(item.StockBook)}</td>
                        <td className="border border-gray-300 px-3 py-2 text-right">{formatNumber(item.PhysicalBook)}</td>
                        <td className="border border-gray-300 px-3 py-2 text-right">{formatNumber(item.SurplusAmount)}</td>
                        <td className="border border-gray-300 px-3 py-2 text-right">{formatNumber(item.ShortageAmount)}</td>
                        <td className="border border-gray-300 px-3 py-2 text-left">{item.Reason || ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Signature section (same as PDF, shown once at the end) */}
                <div className="mt-4">
                  <p className="mb-3">
                    We do hereby certify that the stocks were physically verified as per above record.
                  </p>

                  <div className="flex justify-between items-start gap-6">
                    <div className="w-[56%]">
                      <div className="font-bold mb-2">Board of Verification</div>
                      <table className="w-full table-fixed">
                        <thead>
                          <tr>
                            <th className="w-[5%]"></th>
                            <th className="w-[32%] font-normal text-left pb-2">Name</th>
                            <th className="w-[32%] font-normal text-left pb-2">Designation</th>
                            <th className="w-[21%] font-normal text-left pb-2">Signature</th>
                            <th className="w-[10%] font-normal text-left pb-2">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[1, 2, 3].map((n) => (
                            <tr key={n}>
                              <td className="text-right pr-1 align-bottom">{n}.</td>
                              {[0, 1, 2, 3].map((c) => (
                                <td key={c} className="px-1 py-1 align-bottom">
                                  <div className="border-b border-dotted border-gray-600 h-4 w-full"></div>
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="w-[38%]">
                      <p className="mb-2">Agreed for the above physical verification.</p>
                      <div className="flex items-end my-4">
                        <span>Signature:</span>
                        <span className="flex-1 border-b border-dotted border-gray-600 h-4 ml-2"></span>
                      </div>
                      <p className="mb-2">Designation : (Store-keeper/Electrical Superintendent/......)</p>
                      <p className="mb-2">(Place the rubber stamp)</p>
                      <p className="mt-3 flex items-end">
                        Date :
                        <span className="inline-block border-b border-dotted border-gray-600 w-40 ml-2 h-4"></span>
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 leading-relaxed">
                    <p className="font-bold">Note :</p>
                    <p>
                      Columns 1 - 6 should be filled by the store-keeper/electrical superintendent if the format is not generated by the MITFIN Inventory system.
                    </p>
                    <p>Columns 7 - 15 should be filled by the Board of Verification.</p>
                    <p className="underline">Please indicate in the Remark Column</p>
                    <p>
                      (*)- Status of the stocks -Obsolete and idle,Damage,slow moving and non moving (O,D,SM and NM)
                    </p>
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

export default AnnualVerificationWHwiseSignature;