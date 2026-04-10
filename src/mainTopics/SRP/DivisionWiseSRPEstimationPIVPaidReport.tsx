import React, { useState, useRef, useCallback } from "react";
import { useUser } from "../../contexts/UserContext";
import { toast } from "react-toastify";
import DateRangePicker from "../../components/utils/DateRangePicker";
import ReusableCompanyList from "../../components/utils/ReusableCompanyList";
import ReportViewer from "../../components/utils/ReportViewer";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PIVPaidItem {
  Division:       string;
  Province:       string;
  Area:           string;
  CctName:        string;   // Cost Center Name
  CompName:       string;   // Division full name
  DeptId:         string;
  IdNo:           string;   // NIC No
  ApplicationNo:  string;   // Estimation No
  Name:           string;   // Applicant Name
  Address:        string;   // Applicant Address
  SubmitDate:     string;
  Description:    string;
  PivNo:          string;
  PaidDate:       string;   // PIV Paid Date
  PivAmount:      number;
  TariffCode:     string;
  Phase:          string | number;
  ExistingAccNo:  string;
  [key: string]:  any;
}

interface Company {
  compId:   string;
  CompName: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const csvEscape = (val: string | number | null | undefined): string => {
  if (val == null) return '""';
  const str = String(val);
  if (/[,\n"']/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
};

const escapeHtml = (text: string | number | null | undefined): string => {
  if (text == null) return "";
  const div = document.createElement("div");
  div.textContent = String(text).trim();
  return div.innerHTML;
};

const fmtAmount = (n: number) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const fmtDate = (raw: string) => {
  if (!raw) return "";
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    return d.toLocaleDateString("en-GB"); // DD/MM/YYYY
  } catch {
    return raw;
  }
};

const formatDateLong = (date: Date): string => {
  const months = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December",
  ];
  return `${date.getFullYear()}-${months[date.getMonth()]}-${String(date.getDate()).padStart(2,"0")}`;
};

// ─── Component ────────────────────────────────────────────────────────────────

const DivisionWiseSRPEstimationPIVPaid: React.FC = () => {
  const { user } = useUser();
  const epfNo     = user?.Userno || "";
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [fromDate,        setFromDate]         = useState("");
  const [toDate,          setToDate]           = useState("");
  const [reportData,      setReportData]       = useState<PIVPaidItem[]>([]);
  const [reportLoading,   setReportLoading]    = useState(false);
  const [showReport,      setShowReport]       = useState(false);

  const maroon     = "text-[#7A0000]";
  const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";

  // ── Fetch Report ──────────────────────────────────────────────────────────

  const handleViewReport = async (company: Company) => {
    if (!fromDate || !toDate) {
      toast.error("Please select both From and To dates");
      return;
    }
    if (new Date(toDate) < new Date(fromDate)) {
      toast.error("To Date cannot be earlier than From Date");
      return;
    }

    setSelectedCompany(company);
    setReportLoading(true);
    setReportData([]);
    setShowReport(true);

    try {
      const url =
        `http://localhost:44381/api/divisionwise-srp-estimation/get` +
        `?compId=${encodeURIComponent(company.compId.trim())}` +
        `&fromDate=${fromDate.replace(/-/g, "/")}` +
        `&toDate=${toDate.replace(/-/g, "/")}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const items: PIVPaidItem[] = Array.isArray(json)
        ? json
        : json.data || [];
      setReportData(items);
      items.length === 0
        ? toast.warn("No records found")
        : toast.success("Report loaded");
    } catch (err: any) {
      toast.error("Failed: " + err.message);
    } finally {
      setReportLoading(false);
    }
  };

  const closeReport = () => {
    setShowReport(false);
    setReportData([]);
    setSelectedCompany(null);
  };

  // ── Derived values ────────────────────────────────────────────────────────

  const grandTotal   = reportData.reduce((s, r) => s + (r.PivAmount || 0), 0);
  const divisionName = reportData[0]?.CompName?.trim() || selectedCompany?.CompName || "";
  const today        = new Date();


  // ── CSV ───────────────────────────────────────────────────────────────────

  const handleDownloadCSV = () => {
    if (!reportData.length || !selectedCompany) return;

    const headers = [
      "Item","Division","Province","Area","Dept Id",
      "Estimation No","Applicant Name","Applicant Address","NIC No",
      "Submit Date","Cost Center Name","Tariff","Phase",
      "PIV No","PIV Paid Date","Ex. Account No","PIV Amount",
    ];

    // Force a value to display as text in Excel (prevents numeric interpretation)
    // ="value" syntax makes Excel treat it as a string — preserves 422.20, 547.00 etc.
    const forceText = (val: string | number | null | undefined): string => {
      if (val == null) return '=""';
      const str = String(val).trim();
      return `="${str.replace(/"/g, '""')}"`;
    };

    const csvRows: string[] = [
      `"SRP Estimation fee (PIV II)/(PIV III) paid Details - PIV II paid date From ${fromDate} To ${toDate}"`,
      `"Division : ${selectedCompany.compId} / ${divisionName}"`,
      `"Date : ${today.toLocaleDateString("en-GB")}"`,
      "",
      headers.map(csvEscape).join(","),
    ];

    reportData.forEach((item, i) => {
      csvRows.push([
        i + 1,                            // Item — numeric, fine as-is
        csvEscape(item.Division),
        csvEscape(item.Province?.trim()),
        csvEscape(item.Area),
        forceText(item.DeptId),           // e.g. 422.20 — force text to keep trailing zero
        forceText(item.ApplicationNo),    // e.g. 422.20/ECR/24/0841 — contains dots, force text
        csvEscape(item.Name),
        csvEscape(item.Address),
        forceText(item.IdNo),             // NIC — may look numeric, force text
        csvEscape(fmtDate(item.SubmitDate)),
        csvEscape(item.CctName?.trim()),
        forceText(item.TariffCode),       // e.g. "51" — force text
        csvEscape(item.Phase),
        forceText(item.PivNo),            // e.g. 422.20/P60/24/0841 — force text
        csvEscape(fmtDate(item.PaidDate)),
        forceText(item.ExistingAccNo),    // account numbers — force text
        csvEscape((item.PivAmount || 0).toFixed(2)),
      ].join(","));
    });

    csvRows.push(
      `"","","","","","","","","","","","","","","","Total",${csvEscape(grandTotal.toFixed(2))}`
    );

    const blob = new Blob(["\uFEFF" + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href     = URL.createObjectURL(blob);
    link.download = `Division_SRP_Estimation_PIV_Paid_${selectedCompany.compId}_${fromDate}_to_${toDate}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // ── Print PDF ─────────────────────────────────────────────────────────────

  const printPDF = () => {
    if (!reportData.length || !iframeRef.current || !selectedCompany) return;

    const totalCols = 17;

    let bodyHTML = "";
    reportData.forEach((item, i) => {
      const rowBg = i % 2 === 0 ? "#ffffff" : "#f7f7f7";
      bodyHTML += `<tr style="background:${rowBg};">
        <td class="ctr">${i + 1}</td>
        <td>${escapeHtml(item.Division)}</td>
        <td>${escapeHtml(item.Province)}</td>
        <td>${escapeHtml(item.Area)}</td>
        <td class="ctr">${escapeHtml(item.DeptId)}</td>
        <td>${escapeHtml(item.ApplicationNo)}</td>
        <td>${escapeHtml(item.Name)}</td>
        <td>${escapeHtml(item.Address)}</td>
        <td class="ctr">${escapeHtml(item.IdNo)}</td>
        <td class="ctr">${escapeHtml(fmtDate(item.SubmitDate))}</td>
        <td>${escapeHtml(item.CctName)}</td>
        <td class="ctr">${escapeHtml(item.TariffCode)}</td>
        <td class="ctr">${escapeHtml(item.Phase)}</td>
        <td>${escapeHtml(item.PivNo)}</td>
        <td class="ctr">${escapeHtml(fmtDate(item.PaidDate))}</td>
        <td class="ctr">${escapeHtml(item.ExistingAccNo)}</td>
        <td class="right">${fmtAmount(item.PivAmount || 0)}</td>
      </tr>`;
    });

    bodyHTML += `<tr style="background:#e0e0e0;font-weight:bold;">
      <td colspan="${totalCols - 1}" style="text-align:right;padding:3px 6px;border:1px solid #888;">
        Total PIV Amount
      </td>
      <td class="right" style="border:1px solid #888;padding:3px 5px;">${fmtAmount(grandTotal)}</td>
    </tr>`;

    // A3 landscape ~410mm usable; this table is very wide → calculate zoom
    const estimatedMm = 680;
    const usableMm    = 410;
    const zoom        = Math.min(1, usableMm / estimatedMm);
    const fontSize    = Math.max(6, Math.round(9 * zoom));
    const titleSize   = Math.max(8, Math.round(12 * zoom));

    const fullHTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Division Wise SRP Estimation PIV Paid</title>
<style>
  @page { size: A3 landscape; margin: 5mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { zoom: ${zoom.toFixed(6)}; }
  body { font-family: Arial, sans-serif; font-size: ${fontSize}px; color: #000; width: 100%; }
  .report-title { font-size: ${titleSize}px; font-weight: bold; text-align: center; margin-bottom: 3px; line-height: 1.4; }
  .sub-label { font-size: ${Math.max(7, fontSize + 1)}px; font-weight: bold; margin-bottom: 2px; }
  .date-label { font-size: ${fontSize}px; color: #444; margin-bottom: 5px; }
  table { width: 100%; border-collapse: collapse; table-layout: auto; }
  th, td { border: 0.5pt solid #888; padding: 2px 4px; font-size: ${fontSize}px; vertical-align: top; }
  th { background: #8B0000; color: #fff; font-weight: bold; text-align: center; vertical-align: middle; white-space: nowrap; }
  .ctr { text-align: center; }
  .right { text-align: right; font-family: monospace; white-space: nowrap; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  .footer { margin-top: 5px; font-size: ${Math.max(5, fontSize - 1)}px; text-align: center; color: #666; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
  <div class="report-title">
    SRP Estimation fee (PIV II)/ (PIV III) paid Details &mdash; PIV II paid date As at ${formatDateLong(today)}
  </div>
  <div class="sub-label">Division : ${escapeHtml(selectedCompany.compId)} / ${escapeHtml(divisionName)}</div>
  <div class="date-label">Period : ${escapeHtml(fromDate)} &nbsp;to&nbsp; ${escapeHtml(toDate)}</div>
  <table>
    <thead>
      <tr>
        <th>Item</th><th>Division</th><th>Province</th><th>Area</th><th>Dept Id</th>
        <th>Estimation No</th><th>Applicant Name</th><th>Applicant Address</th>
        <th>NIC No</th><th>Submit Date</th><th>Cost Center Name</th>
        <th>Tariff</th><th>Phase</th><th>PIV No</th><th>PIV Paid Date</th>
        <th>Ex. Account No</th><th>PIV Amount</th>
      </tr>
    </thead>
    <tbody>${bodyHTML}</tbody>
  </table>
  <div class="footer">Generated: ${new Date().toLocaleString()} &nbsp;|&nbsp; CEB MIS System</div>
</body>
</html>`;

    const doc = iframeRef.current!.contentDocument!;
    doc.open();
    doc.write(fullHTML);
    doc.close();
    setTimeout(() => iframeRef.current?.contentWindow?.print(), 800);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto p-6 bg-white rounded-xl shadow border border-gray-200 text-sm">
      <iframe ref={iframeRef} style={{ display: "none" }} title="print-frame" />

      <h2 className={`text-xl font-bold mb-4 ${maroon}`}>
        Division Wise SRP Estimation Fee (PIV) Paid Details
      </h2>

      {/* Date Range */}
      <div className="flex justify-end mb-4">
        <DateRangePicker
          fromDate={fromDate}
          toDate={toDate}
          onFromChange={setFromDate}
          onToChange={setToDate}
        />
      </div>

      {/* Division List */}
      <div className="mt-6">
        <ReusableCompanyList
          fetchItems={useCallback(async () => {
            if (!epfNo) { toast.error("No EPF number available."); return []; }
            try {
              const res = await fetch(`/misapi/api/incomeexpenditure/Usercompanies/${epfNo}/70`);
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              const parsed = await res.json();
              const rawData = Array.isArray(parsed) ? parsed : parsed.data || [];
              return rawData.map((item: any) => ({
                id:   item.CompId,
                name: item.CompName,
              }));
            } catch (e: any) {
              toast.error(e.message || "Failed to load divisions");
              return [];
            }
          }, [epfNo])}
          onViewItem={(company: { id: string; name: string }) => {
            handleViewReport({ compId: company.id, CompName: company.name });
          }}
          idColumnTitle="Division Code"
          nameColumnTitle="Division Name"
          loadingMessage="Loading divisions..."
          emptyMessage="No divisions available."
        />
      </div>

      {/* Report Viewer */}
      {showReport && (
        <ReportViewer
          title="Division Wise SRP Estimation Fee (PIV) Paid Details"
          currency=""
          subtitlebold2="Division:"
          subtitlenormal2={`${selectedCompany?.compId} / ${selectedCompany?.CompName}`}
          subtitlebold3="Period:"
          subtitlenormal3={`${fromDate} to ${toDate}`}
          loading={reportLoading}
          hasData={reportData.length > 0}
          handleDownloadCSV={handleDownloadCSV}
          printPDF={printPDF}
          closeReport={closeReport}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse" style={{ minWidth: "max-content" }}>
              <thead className={`${maroonGrad} text-white sticky top-0`}>
                <tr>
                  {[
                    "Item","Division","Province","Area","Dept Id",
                    "Estimation No","Applicant Name","Applicant Address","NIC No",
                    "Submit Date","Cost Center Name","Tariff","Phase",
                    "PIV No","PIV Paid Date","Ex. Account No","PIV Amount",
                  ].map((h) => (
                    <th key={h} className="border border-gray-400 px-2 py-2 text-center whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reportData.map((item, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="border border-gray-300 px-2 py-1.5 text-center">{i + 1}</td>
                    <td className="border border-gray-300 px-2 py-1.5 whitespace-nowrap">{item.Division}</td>
                    <td className="border border-gray-300 px-2 py-1.5 whitespace-nowrap">{item.Province?.trim()}</td>
                    <td className="border border-gray-300 px-2 py-1.5 whitespace-nowrap">{item.Area}</td>
                    <td className="border border-gray-300 px-2 py-1.5 text-center">{item.DeptId}</td>
                    <td className="border border-gray-300 px-2 py-1.5 whitespace-nowrap">{item.ApplicationNo}</td>
                    <td className="border border-gray-300 px-2 py-1.5">{item.Name}</td>
                    <td className="border border-gray-300 px-2 py-1.5" style={{ maxWidth: 180 }}>{item.Address}</td>
                    <td className="border border-gray-300 px-2 py-1.5 text-center whitespace-nowrap">{item.IdNo}</td>
                    <td className="border border-gray-300 px-2 py-1.5 text-center whitespace-nowrap">{fmtDate(item.SubmitDate)}</td>
                    <td className="border border-gray-300 px-2 py-1.5 whitespace-nowrap">{item.CctName?.trim()}</td>
                    <td className="border border-gray-300 px-2 py-1.5 text-center">{item.TariffCode}</td>
                    <td className="border border-gray-300 px-2 py-1.5 text-center">{item.Phase}</td>
                    <td className="border border-gray-300 px-2 py-1.5 whitespace-nowrap">{item.PivNo}</td>
                    <td className="border border-gray-300 px-2 py-1.5 text-center whitespace-nowrap">{fmtDate(item.PaidDate)}</td>
                    <td className="border border-gray-300 px-2 py-1.5 text-center whitespace-nowrap">{item.ExistingAccNo}</td>
                    <td className="border border-gray-300 px-2 py-1.5 text-right font-mono whitespace-nowrap">
                      {fmtAmount(item.PivAmount || 0)}
                    </td>
                  </tr>
                ))}

                {reportData.length > 0 && (
                  <tr className="bg-gray-300 font-bold">
                    <td colSpan={16} className="border border-gray-300 px-3 py-2 text-right">
                      Total PIV Amount
                    </td>
                    <td className="border border-gray-300 px-2 py-2 text-right font-mono whitespace-nowrap">
                      {fmtAmount(grandTotal)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </ReportViewer>
      )}
    </div>
  );
};

export default DivisionWiseSRPEstimationPIVPaid;