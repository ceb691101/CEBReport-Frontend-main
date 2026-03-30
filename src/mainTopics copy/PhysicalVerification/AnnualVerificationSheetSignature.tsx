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
      "Serial No",
      "Code No",
      "Description",
      "Grade",
      "UOM",
      "S/ Price",
      "Stock Book Qty",
      "Physical Qty",
      "Surplus",
      "Shortage",
      "Stock Book Value (Rs.)",
      "Physical Val. (Rs.)",
      "Surplus Val. (Rs.)",
      "Shortage Val. (Rs.)",
      "Remarks",
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

    .subtitles { margin-bottom: 1px; font-size: 11.5px; display: flex; justify-content: space-between; }
    .subtitles div { flex-basis: 25%; }

    .signature { margin-top: 5px; font-size: 12px; page-break-inside: avoid; }
    .signature .left { float: left; width: 48%; }
    .signature .right { float: right; width: 48%; text-align: right; }

    .signature p { margin: 1px 0; line-height: 1.1; }
    .signature table { border: none; width: 100%; font-size: 12px; }
    .signature td { border: none; padding: 1px; }

    .footer { position: absolute; bottom: 0; left: 0; right: 0; font-size: 10px; display: flex; justify-content: space-between; }

    .clear { clear: both; }
    .totals-row td { font-weight: bold; font-size: 15px; background-color: #f0f0f0; }
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

      const now = new Date();
      const timestamp =
        now.toLocaleDateString("en-GB") +
        " " +
        now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }).replace(":", ".");

      pagesHTML += `
      <div class="page">
        <div class="header">
          <h2>ANNUAL VERIFICATION OF STORES - ${selectedYear} / Cost Center : ${selectedDept.DeptId}</h2>
        </div>

        <div class="subtitles"><div>ORIGINAL : Accountant</div><div>From Ref : AV/1/A</div></div>
        <div class="subtitles"><div>DUPLICATE : (Province/Complex)</div><div>Sheet No : ${docNo}</div></div>
        <div class="subtitles"><div>TRIPLCATE : Store-kepper/E.S.(C.S.C)</div><div>Date of Verification : ${phvDate}</div></div>
        <div class="subtitles"><div>Fourth copy : Branch Copy</div><div>${docNo}</div></div>

        <table>
          <thead>
            <tr>
              <th style="width:3%">1.<br>Serial</th>
              <th style="width:4%">2.<br>Code No</th>
              <th style="width:27%">3.<br>Description</th>
              <th style="width:4%">4.<br>Grad</th>
              <th style="width:4%">5.<br>UOM</th>
              <th style="width:5%">6.<br>S/ Price</th>
              <th style="width:5%">7.<br>Stock Book Qty</th>
              <th style="width:5%">8.<br>Physical</th>
              <th style="width:5%">9.<br>Surplus</th>
              <th style="width:5%">10.<br>Shortag</th>
              <th style="width:6%">11.<br>Stock Book Value (Rs.)</th>
              <th style="width:6%">12.<br>Physical Val. (Rs.)</th>
              <th style="width:6%">13.<br>Surplus Val. (Rs.)</th>
              <th style="width:6%">14.<br>Shortage Val. (Rs.)</th>
              <th style="width:9%">15.<br>Remarks</th>
            </tr>
          </thead>
          <tbody>${bodyHTML}</tbody>
        </table>

        <!--   SIGNATURE SECTION -->
        <div class="signature">
          <div class="left">
            <p>We do hereby certify that Stocks were physically verfied as per that given statment.</p>
            <table>
              <tr>
                <td style="width: 10%;">Verifiers:</td>
                <td>Name</td>
                <td>Desigation</td>
                <td>Signature</td>
              </tr>
              <tr><td class="right">1.</td><td>.........................................</td><td>.........................................</td><td>.........................................</td></tr>
              <tr><td class="right">2.</td><td>.........................................</td><td>.........................................</td><td>.........................................</td></tr>
              <tr><td class="right">3.</td><td>.........................................</td><td>.........................................</td><td>.........................................</td></tr>
            </table>
            <p>Note 01 : 1 to 4 should be filled by the Store Keeper 5 to 14 should be filled by the Verification Team</p>
          </div>

          <div class="right">
            <p>Agreed for the above physical verification</p>
            <p>................................... Valued by : Signature : ...........................</p>
            <p>Designation : ...........................</p>
            <p>Value checked by : Store-keeper/Elect. Superintendent</p>
            <p>Signature : ...........................</p>
            <p>Designation : ...........................</p>
          </div>
        </div>

        <div class="footer">
          <div>Date & time of the Report Generated : ${timestamp}</div>
          <div>Page ${p + 1} of ${totalPages}</div>
        </div>

        <div class="clear"></div>
      </div>`;
    });

    /*   Total Section  */
    if (reportData.length > 0) {
      const totalStockBookValue = reportData.reduce((sum, item) => sum + (item.StockBook || 0), 0);
      const totalPhysicalValue = reportData.reduce((sum, item) => sum + (item.PhysicalBook || 0), 0);
      const totalSurplusValue = reportData.reduce((sum, item) => sum + (item.SurplusAmount || 0), 0);
      const totalShortageValue = reportData.reduce((sum, item) => sum + (item.ShortageAmount || 0), 0);

      const now = new Date();
      const formattedDate = now.toLocaleDateString("en-GB");
      const formattedTime = now
        .toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })
        .replace(":", ".");
      const timestamp = `${formattedDate} ${formattedTime}`;

      pagesHTML += `<div class="page">
    <div class="header">
      <h2>CEYLON ELECTRICITY BOARD</h2>
      <h3>ANNUAL VERIFICATION OF STORES - ${selectedYear} / Cost Center : ${selectedDept.DeptId}</h3>             
    </div>

  
    <table>
      <thead>
        <tr>
          <th>Total Stock Book Value (Rs.)</th>
          <th>Total Physical Value (Rs.)</th>
          <th>Total Surplus Value (Rs.)</th>
          <th>Total Shortage Value (Rs.)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="right">${totalStockBookValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td class="right">${totalPhysicalValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td class="right">${totalSurplusValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td class="right">${totalShortageValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
      </tbody>
    </table>

    <div class="footer">
      <div>Date & time of the Report Generated : ${timestamp}</div>
      <div>Page ${documentNos.length + 1} of ${documentNos.length + 1}</div>
    </div>

    <div class="clear"></div>
  </div>`;
    }

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
                <th className="border border-gray-400 px-3 py-2 text-center whitespace-nowrap w-[5%]">
                  Serial No
                </th>
                <th className="border border-gray-400 px-3 py-2 text-center whitespace-nowrap">
                  Code No
                </th>
                <th className="border border-gray-400 px-3 py-2 text-left whitespace-nowrap">
                  Description
                </th>
                <th className="border border-gray-400 px-3 py-2 text-center whitespace-nowrap">
                  Grade
                </th>
                <th className="border border-gray-400 px-3 py-2 text-center whitespace-nowrap">
                  UOM
                </th>
                <th className="border border-gray-400 px-3 py-2 text-right whitespace-nowrap">
                  S/ Price
                </th>
                <th className="border border-gray-400 px-3 py-2 text-right whitespace-nowrap">
                  Stock Book Qty
                </th>
                <th className="border border-gray-400 px-3 py-2 text-right whitespace-nowrap">
                  Physical Qty
                </th>
                <th className="border border-gray-400 px-3 py-2 text-right whitespace-nowrap">
                  Surplus
                </th>
                <th className="border border-gray-400 px-3 py-2 text-right whitespace-nowrap">
                  Shortage
                </th>
                <th className="border border-gray-400 px-3 py-2 text-right whitespace-nowrap">
                  Stock Book Value (Rs.)
                </th>
                <th className="border border-gray-400 px-3 py-2 text-right whitespace-nowrap">
                  Physical Val. (Rs.)
                </th>
                <th className="border border-gray-400 px-3 py-2 text-right whitespace-nowrap">
                  Surplus Val. (Rs.)
                </th>
                <th className="border border-gray-400 px-3 py-2 text-right whitespace-nowrap">
                  Shortage Val. (Rs.)
                </th>
                <th className="border border-gray-400 px-3 py-2 text-center whitespace-nowrap">
                  Remarks
                </th>
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