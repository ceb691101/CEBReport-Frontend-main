import React, { useState, useRef, useCallback } from "react";
import { useUser } from "../../contexts/UserContext";
import { toast } from "react-toastify";
import ReusableCompanyList from "../../components/utils/ReusableCompanyList";
import ReportViewer from "../../components/utils/ReportViewer";

interface CostCentre {
  DeptId: string;
  DeptName: string;
}

interface PHVItem {
  MatCd: string;
  MatNm: string;
  UomCd: string;
  GradeCd: string;
  Qty: number;
  Rate: number;
  Amount: number;
  CntedQty?: number;
  Remarks?: string;
  [key: string]: any;
}

const PHVEntryForm: React.FC = () => {
  const { user } = useUser();
  const epfNo = user?.Userno || "";
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [selectedDept, setSelectedDept] = useState<CostCentre | null>(null);
  const [docNo, setDocNo] = useState("");
  const [reportData, setReportData] = useState<PHVItem[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const maroon = "text-[#7A0000]";
  const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";

  const handleViewReport = async (dept: { id: string; name: string }, documentNo: string) => {
    if (!documentNo.trim()) {
      toast.error("Please enter Document No");
      return;
    }

    const typedDept: CostCentre = {
      DeptId: dept.id,
      DeptName: dept.name,
    };

    setSelectedDept(typedDept);
    setDocNo(documentNo.trim());
    setReportLoading(true);
    setReportData([]);
    setShowReport(true);

    try {
      const res = await fetch(
        `/misapi/api/physical-verification?deptId=${encodeURIComponent(dept.id)}&docNo=${encodeURIComponent(documentNo.trim())}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const items: PHVItem[] = Array.isArray(json) ? json : json.data || [];
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
    setDocNo("");
  };

  const printPDF = () => {
    if (reportData.length === 0 || !iframeRef.current || !selectedDept) return;

    const repYear = "20" + docNo.split("/")[2];
    const totalCounted = reportData.reduce((sum, item) => sum + (item.CntedQty || 0), 0);

    const now = new Date();
    const formattedDate = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;
    const formattedTime = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });

    const tableStyle = `
@page {
  margin: 10mm 8mm 10mm 8mm;
  size: A4 portrait;

  @bottom-left {
    content: "Date & time of the Report Generated : ${formattedDate} ${formattedTime}";
    font-size: 8pt;
  }

  @bottom-right {
    content: "Page " counter(page) " of " counter(pages);
    font-size: 8pt;
  }
}    body { font-family: Arial, sans-serif; margin: 0; padding: 0; font-size: 8pt; line-height: 1.3; }
    table { width: 100%; border-collapse: collapse; font-size: 8pt; margin-top: 6px; }
    th, td { border: 1px solid #000; padding: 4px; word-wrap: break-word; vertical-align: middle; }
    th { background-color: #ffffff; color: #000000; font-weight: bold; text-align: center; }
    .right { text-align: right; }
    .center { text-align: center; }
    .left { text-align: left; }
 
    h1 { font-size: 14pt; margin: 8px 0 4px 0; text-align: center; color: #7A0000; }
    h2 { font-size: 12pt; margin: 4px 0; text-align: center; color: #000000; }
    .header { font-size: 9pt; display: flex; justify-content: space-between; margin: 6px 0; }
    .dotted { border-bottom: 1px dotted #000; display: inline-block; width: 120px; min-height: 16px; vertical-align: middle; }
    .sig-table { width: 100%; border: none; }
    .sig-table td { border: none; padding: 3px 0; vertical-align: bottom; }
    .no-col { width: 40px; text-align: left; }
    .name-col { width: 170px; }
    .des-col { width: 140px; }
    .sig-col { width: 140px; }
  `;

    let bodyHTML = "";
    reportData.forEach((item, idx) => {
      bodyHTML += `<tr>
      <td class="center">${idx + 1}</td>
      <td class="center">${item.MatCd || ""}</td>
      <td class="left">${item.MatNm || ""}</td>
      <td class="center">${item.GradeCd || ""}</td>
      <td class="center">${item.UomCd || ""}</td>
      <td class="right">${(item.UnitPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td class="right">${(item.CntedQty || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td style="width: 90px"></td>
    </tr>`;
    });

    const fullHTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>PHV Report</title>
<style>${tableStyle}</style>
</head>
<body>

<h1>ANNUAL VERIFICATION OF STORES ${repYear}</h1>

<div class="header">
  <div>Cost center :  ${selectedDept.DeptName}</div>
  <div>Verification Sheet No : ${docNo}</div>
</div>

<table>
  <thead>
    <tr>
      <th>Serial No</th>
      <th>Code No</th>
      <th>Description</th>
      <th>Grade Code</th>
      <th>UOM</th>
      <th>Unit Price</th>
      <th>Counted Qty</th>
      <th style="width: 90px">Remarks</th>
    </tr>
  </thead>
  <tbody>${bodyHTML}</tbody>
</table>

<p style="margin: 10px 0 6px 0;"><strong>Total Counted Quantity : ${totalCounted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></p>

<div style="margin-top: 12px; font-size: 9pt;">
      <p style="margin: 0 0 10px 0; text-align: justify;">
        We do hereby certify that Stocks were physically counted as per that given statement.
      </p>

      <div style="display: flex; justify-content: space-between; gap: 30px;">

        <!-- Left Side: Wider space for Verifiers & CEB Team -->
        <div style="flex: 2;">

          <!-- Verifiers -->
          <p style="margin: 0 0 6px 0;"><strong>Verifiers:</strong></p>
          <table class="sig-table">
            <tr>
              <td class="no-col"><strong>No</strong></td>
              <td class="name-col"><strong>Name</strong></td>
              <td class="des-col"><strong>Designation</strong></td>
              <td class="sig-col"><strong>Signature</strong></td>
            </tr>
            <tr>
              <td class="no-col">1.</td>
              <td><span class="dotted"></span></td>
              <td><span class="dotted"></span></td>
              <td><span class="dotted"></span></td>
            </tr>
            <tr>
              <td class="no-col">2.</td>
              <td><span class="dotted"></span></td>
              <td><span class="dotted"></span></td>
              <td><span class="dotted"></span></td>
            </tr>
            <tr>
              <td class="no-col">3.</td>
              <td><span class="dotted"></span></td>
              <td><span class="dotted"></span></td>
              <td><span class="dotted"></span></td>
            </tr>
          </table>

          <!-- CEB Observation Team -->
          <p style="margin: 12px 0 6px 0;"><strong>CEB Observation Team:</strong></p>
          <table class="sig-table">
            <tr>
              <td class="no-col"><strong>No</strong></td>
              <td class="name-col"><strong>Name</strong></td>
              <td class="des-col"><strong>Designation</strong></td>
              <td class="sig-col"><strong>Signature</strong></td>
            </tr>
            <tr>
              <td class="no-col">1.</td>
              <td><span class="dotted"></span></td>
              <td><span class="dotted"></span></td>
              <td><span class="dotted"></span></td>
            </tr>
            <tr>
              <td class="no-col">2.</td>
              <td><span class="dotted"></span></td>
              <td><span class="dotted"></span></td>
              <td><span class="dotted"></span></td>
            </tr>
          </table>
        </div>

        <!-- Right Side: Narrower, same content and placement -->
        <div style="flex: 1; font-size: 9pt;">
          <p style="margin: 0 0 10px 0;"><strong>Agreed for above physical count Store keeper / Elect. Superintendent</strong></p>
          <p style="margin: 5px 0;">Signature : <span class="dotted" style="width: 200px;"></span></p>
          <p style="margin: 5px 0;">Name / P.F. No / Designation : <span class="dotted" style="width: 200px;"></span></p>
          <p style="margin: 5px 0;">Approved date : <span class="dotted" style="width: 200px;"></span></p>

          <p style="margin-top: 18px; font-size: 8pt;">
            Note to Remarks : S : Slow Moving &nbsp;&nbsp; N : Non Moving &nbsp;&nbsp; D : Damage;O - Obsolete  and Idle;
          </p>
          <p style="font-size: 8pt; text-align: right; margin-top: 4px;">Re-printed (Web Reporting)</p>
        </div>

    </div>
</div>




</body>
</html>`;

    const doc = iframeRef.current!.contentDocument!;
    doc.open();
    doc.write(fullHTML);
    doc.close();
    setTimeout(() => iframeRef.current?.contentWindow?.print(), 800);
  };
  const handleDownloadCSV = () => {
    if (reportData.length === 0 || !selectedDept) return;

    const headers = [
      "Serial No",
      "Code No",
      "Description",
      "Grade Code",
      "UOM",
      "Unit Price",
      "Counted Qty",
      "Remarks",
    ];

    const totalCountedQty = reportData.reduce(
      (sum, item) => sum + (item.CntedQty ?? 0),
      0
    );
    const rows = reportData.map((item, index) => [
      index + 1,

      // 👇 FORCE Code No AS STRING (keeps all 5 digits)
      `="${item.MatCd ?? ""}"`,

      item.MatNm ?? "",
      item.GradeCd ?? "",
      item.UomCd ?? "",
      (item.UnitPrice ?? 0).toFixed(2),
      (item.CntedQty ?? 0).toFixed(2),
      "",
    ]);

    rows.push([
      "",
      "",
      "Total Counted Quantity",
      "",
      "",
      "",
      totalCountedQty.toFixed(2),
      "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.join(",")),
    ].join("\n");

    const blob = new Blob(
      ["\uFEFF" + csvContent],
      { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `PHV_Report_${selectedDept.DeptId}_${docNo.replace(/\//g, "_")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 bg-white rounded-xl shadow border border-gray-200 text-sm">
      <iframe ref={iframeRef} style={{ display: "none" }} />

      <h2 className={`text-xl font-bold mb-6 ${maroon}`}>
        Physical Verification Entry Form
      </h2>

      <div className="mb-6">
        <label className="block font-bold mb-2">Document No:</label>
        <input
          type="text"
          value={docNo}
          onChange={(e) => setDocNo(e.target.value)}
          placeholder="e.g. 520.11/PHV/25/0001"
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7A0000]"
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
              const res = await fetch(`/misapi/api/incomeexpenditure/departments/${epfNo}`);
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              const json = await res.json();
              const raw = Array.isArray(json) ? json : json.data || [];
              return raw.map((c: any) => ({
                id: c.DeptId,
                name: `${c.DeptId} - ${c.DeptName}`,
              }));
            } catch (e: any) {
              toast.error(e.message || "Failed to load cost centres");
              return [];
            }
          }, [epfNo])}
          onViewItem={(dept) => handleViewReport(dept, docNo)}
          idColumnTitle="Cost Centre"
          nameColumnTitle="Description"
          loadingMessage="Loading cost centres..."
          emptyMessage="No cost centres available."
        />
      </div>

      {showReport && selectedDept && (
        <ReportViewer
          title={`ANNUAL VERIFICATION OF STORES ${"20" + docNo.split("/")[2]}`}
          subtitlebold2="Cost center :"
          subtitlenormal2={selectedDept.DeptName}
          subtitlebold3="Verification Sheet No :"
          subtitlenormal3={docNo}
          loading={reportLoading}
          hasData={reportData.length > 0}
          handleDownloadCSV={handleDownloadCSV}
          printPDF={printPDF}
          closeReport={closeReport}
        >
          <table className="w-full text-xs">
            <thead className={`${maroonGrad} text-white`}>
              <tr>
                <th className="border border-gray-400 px-3 py-2 text-center">Serial No</th>
                <th className="border border-gray-400 px-3 py-2 text-center">Code No</th>
                <th className="border border-gray-400 px-3 py-2 text-center">Description</th>
                <th className="border border-gray-400 px-3 py-2 text-center">Grade Code</th>
                <th className="border border-gray-400 px-3 py-2 text-center">UOM</th>
                <th className="border border-gray-400 px-3 py-2 text-center">Unit Price</th>
                <th className="border border-gray-400 px-3 py-2 text-center">Counted Qty</th>
              </tr>
            </thead>
            <tbody>
              {reportData.map((item, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="border border-gray-300 px-3 py-2 text-center">{idx + 1}</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">{item.MatCd || ""}</td>
                  <td className="border border-gray-300 px-3 py-2 text-left">{item.MatNm || ""}</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">{item.GradeCd || ""}</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">{item.UomCd || ""}</td>
                  <td className="border border-gray-300 px-3 py-2 text-right">{(item.UnitPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="border border-gray-300 px-3 py-2 text-right">{(item.CntedQty || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ReportViewer>
      )}
    </div>
  );
};

export default PHVEntryForm;