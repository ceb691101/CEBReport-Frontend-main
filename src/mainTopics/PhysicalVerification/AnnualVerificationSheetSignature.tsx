import React, { useState, useRef, useCallback } from "react";
import { useUser } from "../../contexts/UserContext";
import { toast } from "react-toastify";
import ReusableCompanyList from "../../components/utils/ReusableCompanyList";
import ReportViewer from "../../components/utils/ReportViewer";
import YearMonthDropdowns from "../../components/utils/YearMonthDropdowns";

interface CostCentre {
  DeptId: string;
  DeptName: string;
}

interface AnnualVerificationItem {
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

const AnnualVerificationSheetSignature: React.FC = () => {
  const { user } = useUser();
  const epfNo = user?.Userno || "";
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [selectedDept, setSelectedDept] = useState<CostCentre | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [reportData, setReportData] = useState<AnnualVerificationItem[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const maroon = "text-[#7A0000]";
  const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";

  const currentYear = new Date().getFullYear();

  const handleViewReport = async (dept: { id: string; name: string }) => {
    if (!selectedMonth || !selectedYear) {
      toast.error("Please select both Month and Year");
      return;
    }

    const typedDept: CostCentre = {
      DeptId: dept.id,
      DeptName: dept.name,
    };

    setSelectedDept(typedDept);
    setReportLoading(true);
    setReportData([]);
    setShowReport(true);

    try {
      const res = await fetch(
        `/misapi/api/annual-verification-sheet?deptId=${encodeURIComponent(dept.id)}&repYear=${encodeURIComponent(selectedYear)}&repMonth=${encodeURIComponent(selectedMonth)}`
      );

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const items: AnnualVerificationItem[] = Array.isArray(json) ? json : json.data || [];
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
  };


  const handleDownloadCSV = () => {
    if (reportData.length === 0 || !selectedDept) return;

    const csvSafe = (value: any) => {
      if (value == null) return '""';
      const str = String(value).replace(/"/g, '""');
      return `"${str}"`;
    };

    const headers = [
      "Serial No.",
      "Code No.",
      "Description",
      "Grade",
      "UOM",
      "Standard Price (Rs. Cts.)",
      "Book Balance",
      "Physical Balance",
      "Surplus",
      "Shortage",
      "Book Value (Rs. Cts.)",
      "Physical Value (Rs. Cts.)",
      "Surplus (Rs. Cts.)",
      "Shortage (Rs. Cts.)",
      "Remarks (*)",
    ];

    const csvRows: string[] = [
      csvSafe(`ANNUAL VERIFICATION OF STORES - ${selectedYear ?? currentYear} (Verification Sheet)`),
      csvSafe(`Cost Center : ${selectedDept.DeptId} - ${selectedDept.DeptName}`),
      "",
    ];

    const docNo = reportData[0]?.DocumentNo || "";

    csvRows.push(
      csvSafe("ORIGINAL : Accountant"),
      csvSafe(`DUPLICATE : (Province/Complex)`),
      csvSafe(`TRIPLCATE : Store-keeper/E.S.(C.S.C)`),
      csvSafe(`Fourth copy : Branch Copy     | ${docNo}`),
      csvSafe(`From Ref : AV/1/A`),


      ""
    );

    csvRows.push(headers.map(csvSafe).join(","));

    reportData.forEach((item, idx) => {
      const row = [
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
      ];

      csvRows.push(row.map(csvSafe).join(","));
    });

    /* Total section*/
    const totalStockBookValue = reportData.reduce(
      (sum, item) => sum + (item.StockBook || 0),
      0
    );
    const totalPhysicalValue = reportData.reduce(
      (sum, item) => sum + (item.PhysicalBook || 0),
      0
    );
    const totalSurplusValue = reportData.reduce(
      (sum, item) => sum + (item.SurplusAmount || 0),
      0
    );
    const totalShortageValue = reportData.reduce(
      (sum, item) => sum + (item.ShortageAmount || 0),
      0
    );

    csvRows.push("");

    const totalsRow = [
      "",
      "",
      "TOTAL",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      formatNumber(totalStockBookValue),
      formatNumber(totalPhysicalValue),
      formatNumber(totalSurplusValue),
      formatNumber(totalShortageValue),
      "",
    ];

    csvRows.push(totalsRow.map(csvSafe).join(","));

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

    const groupedByDoc: Record<string, AnnualVerificationItem[]> = {};

    reportData.forEach(item => {
      const docKey = (item.DocumentNo || "").trim();
      if (!groupedByDoc[docKey]) {
        groupedByDoc[docKey] = [];
      }
      groupedByDoc[docKey].push(item);
    });

    const documentNos = Object.keys(groupedByDoc);
    const totalPages = documentNos.length; // ✅ SHOULD BE 47

    const tableStyle = `
    @page { size: A4 landscape; margin: 4mm 4mm 4mm 4mm; }
    body { margin: 0; padding: 0; }

    .page { page-break-after: always; position: relative; min-height: 200mm; display: flex; flex-direction: column; }
    table { width: 100%; border-collapse: collapse; font-size: 9px; table-layout: fixed; }
    th, td { border: 1px solid #000; padding: 1px 2px; word-wrap: break-word; }
    th { background-color: #ffffff; font-weight: bold; text-align: center; }

    .center { text-align: center; }
    .right { text-align: right; }

    .header h2 { text-align: center; color: #7A0000; font-size: 16px; margin: 0; }
    .header h3 { text-align: center; margin: 1px 0; font-size: 13px; }

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

    let serialNo = 1;


let pagesHTML = "";


    documentNos.forEach((docNo, p) => {
      const rows = groupedByDoc[docNo];
      const phvDate = rows[0]?.PhvDate || "..............";

      let bodyHTML = "";
      rows.forEach((item) => {
        bodyHTML += `
    <tr>
      <td class="center">${serialNo++}</td>  <!-- 🔹 continuous serial number -->
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

      pagesHTML += `
      <div class="page">
        <div class="header">
          <h2>ANNUAL VERIFICATION OF STORES - ${selectedYear} / Cost Center : ${selectedDept.DeptId}</h2>
        </div>

        <div class="subtitles">
          <div class="subtitles-left">
            <div style="font-weight: bold; margin-bottom: 2px;">TO BE FILLED IN TRIPLICATE</div>
            <div>1. ORIGINAL : Accountant</div>
            <div>2. DUPLICATE : (Unit)</div>
            <div>3. TRIPLICATE : Store-keeper/E.S.(C.S.C.)</div>
          </div>
          <div class="subtitles-right">
            <div>From Ref : AV/1/A</div>
            <div>Sheet No : ${docNo}</div>
            <div>Date of Verification : ${phvDate}</div>
          </div>
        </div>

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

        <!--   SIGNATURE SECTION -->
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

        <div class="clear"></div>
      </div>`;
    });

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
    <div className="max-w-7xl mx-auto p-6 bg-white rounded-xl shadow border border-gray-200 text-sm">
      <iframe ref={iframeRef} style={{ display: "none" }} />

      <h2 className={`text-xl font-bold mb-6 ${maroon}`}>
        Annual Verification Sheet Signature
      </h2>

      <div className="flex justify-end mb-4">
        <YearMonthDropdowns
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          className="gap-8"
        />
      </div>

      <div className="mt-8">
        <ReusableCompanyList
          fetchItems={useCallback(async () => {
            if (!epfNo) {
              toast.error("No EPF number available.");
              return [];
            }
            try {
              const res = await fetch(
                `/misapi/api/incomeexpenditure/departments/${epfNo}`
              );
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              const json = await res.json();
              const raw = Array.isArray(json) ? json : json.data || [];
              return raw.map((c: any) => ({
                id: c.DeptId,
                name: `${c.DeptName}`,
              }));
            } catch (e: any) {
              toast.error(e.message || "Failed to load cost centres");
              return [];
            }
          }, [epfNo])}
          onViewItem={(dept) => handleViewReport(dept)}
          idColumnTitle="Cost Centre Code"
          nameColumnTitle="Cost Centre Name"
          loadingMessage="Loading cost centres..."
          emptyMessage="No cost centres available."
        />
      </div>

      {showReport && selectedDept && (
        <ReportViewer
          title={`ANNUAL VERIFICATION SHEET SIGNATURE - ${selectedYear} `}
          subtitlebold2="Cost Center :"
          subtitlenormal2={`${selectedDept.DeptId} - ${selectedDept.DeptName}`}
          loading={reportLoading}
          hasData={reportData.length > 0}
          handleDownloadCSV={handleDownloadCSV}
          printPDF={printPDF}
          closeReport={closeReport}
        >
          <table className="w-full text-xs">
            <thead className={`${maroonGrad} text-white`}>
              <tr>
                {Array.from({ length: 15 }, (_, index) => (
                  <th key={index} className="border border-gray-400 px-2 py-1 text-center whitespace-nowrap">
                    {index + 1}
                  </th>
                ))}
              </tr>
              <tr>
                <th rowSpan={3} className="border border-gray-400 px-2 py-2 text-center">Serial No.</th>
                <th rowSpan={3} className="border border-gray-400 px-2 py-2 text-center">Code No.</th>
                <th rowSpan={3} className="border border-gray-400 px-2 py-2 text-center">Description</th>
                <th rowSpan={3} className="border border-gray-400 px-2 py-2 text-center">Grade</th>
                <th rowSpan={3} className="border border-gray-400 px-2 py-2 text-center">UOM</th>
                <th rowSpan={2} className="border border-gray-400 px-2 py-2 text-center">Standard Price</th>
                <th colSpan={4} className="border border-gray-400 px-2 py-1 text-center">Q U A N T I T Y</th>
                <th colSpan={4} className="border border-gray-400 px-2 py-1 text-center">V A L U E</th>
                <th rowSpan={3} className="border border-gray-400 px-2 py-2 text-center">Remarks (*)</th>
              </tr>
              <tr>
                <th rowSpan={2} className="border border-gray-400 px-2 py-2 text-center">Book Balance</th>
                <th rowSpan={2} className="border border-gray-400 px-2 py-2 text-center">Physical Balance</th>
                <th rowSpan={2} className="border border-gray-400 px-2 py-2 text-center">Surplus</th>
                <th rowSpan={2} className="border border-gray-400 px-2 py-2 text-center">Shortage</th>
                <th className="border border-gray-400 px-2 py-2 text-center">Book Value</th>
                <th className="border border-gray-400 px-2 py-2 text-center">Physical Value</th>
                <th className="border border-gray-400 px-2 py-2 text-center">Surplus</th>
                <th className="border border-gray-400 px-2 py-2 text-center">Shortage</th>
              </tr>
              <tr>
                <th className="border border-gray-400 px-2 py-1 text-center">Rs. Cts.</th>
                <th className="border border-gray-400 px-2 py-1 text-center">Rs. Cts.</th>
                <th className="border border-gray-400 px-2 py-1 text-center">Rs. Cts.</th>
                <th className="border border-gray-400 px-2 py-1 text-center">Rs. Cts.</th>
                <th className="border border-gray-400 px-2 py-1 text-center">Rs. Cts.</th>
              </tr>
            </thead>
            <tbody>
              {reportData.map((item, idx) => (
                <tr
                  key={idx}
                  className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                >
                  <td className="border border-gray-300 px-3 py-2 text-center">
                    {idx + 1}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-left">
                    {item.MaterialCode || ""}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-left">
                    {item.MaterialName || ""}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-center">
                    {item.GradeCode || ""}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-center">
                    {item.UomCode || ""}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right">
                    {formatNumber(item.UnitPrice)}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right">
                    {formatNumber(item.QtyOnHand)}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right">
                    {formatNumber(item.CountedQty)}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right">
                    {formatNumber(item.SurplusQty)}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right">
                    {formatNumber(item.ShortageQty)}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right">
                    {formatNumber(item.StockBook)}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right">
                    {formatNumber(item.PhysicalBook)}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right">
                    {formatNumber(item.SurplusAmount)}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right">
                    {formatNumber(item.ShortageAmount)}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-center">
                    {item.Reason || ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ReportViewer>
      )}
    </div>
  );
};

export default AnnualVerificationSheetSignature;