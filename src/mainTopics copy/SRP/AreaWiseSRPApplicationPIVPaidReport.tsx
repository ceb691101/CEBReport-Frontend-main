import React, { useState, useRef, useCallback } from "react";
import { useUser } from "../../contexts/UserContext";
import { toast } from "react-toastify";
import DateRangePicker from "../../components/utils/DateRangePicker";
import ReusableCompanyList from "../../components/utils/ReusableCompanyList";
import ReportViewer from "../../components/utils/ReportViewer";



interface AreaWiseSRPPIVPaidItem {
  DeptId:          string;   
  IdNo:            string;   
  ApplicationNo:   string; 
  Name:            string;   
  Address:         string;   
  SubmitDate:      string | null;  
  PivNo:           string;   
  PaidDate:        string | null;  
  PivAmount:       number;   
  TariffCode:      string;   
  Phase:           string;   
  ExistingAccNo:   string;   
  Area:            string;   
  Province:        string;   
  CCT_NAME:        string;  
  Division:        string;   
  Description:     string;   
  [key: string]:   any;
}

interface Company {
  compId:   string;
  CompName: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
// Identical to reference frontend

const formatDate = (date: Date | string | null | undefined): string => {
  if (!date) return "";
  try {
    const d = new Date(date as string);
    const day   = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year  = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return String(date);
  }
};

const formatAmount = (amount: number | null | undefined): string => {
  if (amount == null) return "";
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const csvEscape = (val: string | number | null | undefined): string => {
  if (val == null) return '""';
  const str = String(val);
  if (/[,\n"']/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
};

const escapeHtml = (text: string | null | undefined): string => {
  if (text == null) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
};

// ─── Component ───────────────────────────────────────────────────────────────

const AreaWiseSRPApplicationPIVPaidReport: React.FC = () => {
  const { user } = useUser();
  const epfNo     = user?.Userno || "";
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [fromDate,        setFromDate]         = useState("");
  const [toDate,          setToDate]           = useState("");
  const [reportData,      setReportData]       = useState<AreaWiseSRPPIVPaidItem[]>([]);
  const [reportLoading,   setReportLoading]    = useState(false);
  const [showReport,      setShowReport]       = useState(false);

  const maroon     = "text-[#7A0000]";
  const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";

  // ── View Report ─────────────────────────────────────────────────────────────
  // Follows IDENTICAL pattern to reference: format dates as YYYYMMDD for API

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
        `/misapi/api/area-wise-srp-piv-paid/list` +
        `?compId=${company.compId.trim()}` +
        `&fromDate=${fromDate.replace(/-/g, "")}` +
        `&toDate=${toDate.replace(/-/g, "")}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // Same array extraction as reference frontend
      const items: AreaWiseSRPPIVPaidItem[] = Array.isArray(data)
        ? data
        : data.data || [];

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

  // ── CSV ──────────────────────────────────────────────────────────────────────
  // Field mapping follows reference exactly — same PascalCase_underscore names

  const handleDownloadCSV = () => {
    if (reportData.length === 0 || !selectedCompany) return;

    const headers = [
      "Item", "Division", "Province", "Area", "Dept ID",
      "Application No", "Applicant Name", "Applicant Address", "NIC No",
      "Submit Date", "Cost Center Name", "Tariff", "Phase",
      "PIV No", "PIV Paid Date", "Ex. Account No", "PIV Amount",
    ];

    const totalAmount = reportData.reduce((s, r) => s + (r.PivAmount || 0), 0);

    const csvRows: string[] = [
`"SRP Application fee (PIV I) paid Details PIV I paid date As at ${new Date().toLocaleDateString("en-GB")}"`,
      `"AREA : ${selectedCompany.compId} / ${selectedCompany.CompName}"`,
      `"Period: ${fromDate} to ${toDate}"`,
      "",
      headers.map(csvEscape).join(","),
    ];

    reportData.forEach((item, index) => {
      const row = [
        index + 1,
        item.Division            || "",   // e.g. "DISCO4"
        item.Province            || "",   // e.g. "SP"
        item.Area                || "",   // e.g. "AMBALN"
        `="${item.DeptId        ?? ""}"`,
        `="${item.ApplicationNo ?? ""}"`,
        item.Name                || "",
        item.Address             || "",
        `="${item.IdNo          ?? ""}"`,
        formatDate(item.SubmitDate),
        item.CCT_NAME            || "",
        item.TariffCode         || "",
        item.Phase               || "",
        `="${item.PivNo         ?? ""}"`,
        formatDate(item.PaidDate),
        `="${item.ExistingAccNo ?? ""}"`,
        item.PivAmount          ?? "",
      ];
      csvRows.push(row.map(csvEscape).join(","));
    });

    // Total row
    csvRows.push(
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "Total", formatAmount(totalAmount)]
        .map(csvEscape)
        .join(",")
    );

    const csvContent = csvRows.join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href     = url;
    link.download = `SRP_PIV_Paid_${selectedCompany.compId}_${fromDate}_to_${toDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // ── Print PDF ────────────────────────────────────────────────────────────────
  // Layout matches PDF: A3 landscape, 17 columns
  // Field names IDENTICAL to CSV section above

  const printPDF = () => {
    if (reportData.length === 0 || !iframeRef.current || !selectedCompany) return;

    const totalAmount = reportData.reduce((s, r) => s + (r.PivAmount || 0), 0);

    const tableStyle = `
      table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 7.5px; }
      thead { display: table-header-group; }
      th, td { border: 0.5px solid #aaa; padding: 3px 4px; word-wrap: break-word; vertical-align: top; text-align: left; }
      th { background-color: #e8e8e8; color: #000; font-weight: bold; text-align: center; vertical-align: middle; }
      .numeric { text-align: right; }
      .center  { text-align: center; }
      .nowrap  { white-space: nowrap; }
      tr:nth-child(even) td { background-color: #fafafa; }
      .total-row td { background-color: #ddd !important; font-weight: bold; border-top: 1px solid #555; }
    `;

    // Column widths matching PDF proportions
    const colWidths = [
      "28px",  // Item
      "52px",  // Division
      "32px",  // Province
      "52px",  // Area
      "48px",  // Dept Id
      "105px", // Application No
      "125px", // Applicant Name
      "125px", // Applicant Address
      "82px",  // NIC No
      "60px",  // Submit Date
      "115px", // Cost Center Name
      "38px",  // Tariff
      "35px",  // Phase
      "105px", // PIV No
      "60px",  // PIV Paid Date
      "80px",  // Ex. Account No
      "65px",  // PIV Amount
    ];

    const colGroupHTML = colWidths.map((w) => `<col style="width: ${w};" />`).join("");

    let bodyHTML = "";
    reportData.forEach((item, idx) => {
      bodyHTML += `<tr>
        <td class="center">${idx + 1}</td>
        <td class="center">${escapeHtml(item.Division)}</td>
        <td class="center">${escapeHtml(item.Province)}</td>
        <td class="center">${escapeHtml(item.Area)}</td>
        <td class="center">${escapeHtml(item.DeptId)}</td>
        <td>${escapeHtml(item.ApplicationNo)}</td>
        <td>${escapeHtml(item.Name)}</td>
        <td>${escapeHtml(item.Address)}</td>
        <td>${escapeHtml(item.IdNo)}</td>
        <td class="center">${formatDate(item.SubmitDate)}</td>
        <td>${escapeHtml(item.CCT_NAME)}</td>
        <td class="center">${escapeHtml(item.TariffCode)}</td>
        <td class="center">${escapeHtml(item.Phase)}</td>
        <td class="nowrap">${escapeHtml(item.PivNo)}</td>
        <td class="center">${formatDate(item.PaidDate)}</td>
        <td>${escapeHtml(item.ExistingAccNo)}</td>
        <td class="numeric">${formatAmount(item.PivAmount)}</td>
      </tr>`;
    });

    bodyHTML += `<tr class="total-row">
      <td colspan="16" class="numeric" style="padding-right:6px;">Total</td>
      <td class="numeric">${formatAmount(totalAmount)}</td>
    </tr>`;

    const fullHTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>SRP Application PIV Paid Report</title>
<style>${tableStyle}
body { font-family: Arial, sans-serif; margin: 10mm; print-color-adjust: exact; }
h2 { text-align: center; color: #7A0000; font-size: 13px; font-weight: bold; margin: 0 0 3px 0; }
.meta { display: flex; justify-content: space-between; align-items: center; font-size: 9px; margin-bottom: 4px; }
.meta-left { text-align: left; }
@page { size: A3 landscape; margin: 12mm; }
@page {
  @bottom-left  { content: "Printed on: ${new Date().toLocaleString()}"; font-size: 8px; color: #666; }
  @bottom-right { content: "Page " counter(page) " of " counter(pages); font-size: 8px; color: #666; }
}
</style>
</head>
<body>
<h2>SRP Application fee (PIV I) paid &nbsp;&nbsp; Details PIV I paid date &nbsp; As at ${new Date().toLocaleDateString("en-GB")}</h2>
<div class="meta">
  <div class="meta-left">
    <strong>AREA :</strong> ${escapeHtml(selectedCompany.compId)} / ${escapeHtml(selectedCompany.CompName)}
    &nbsp;&nbsp;&nbsp;
    <strong>Period:</strong> ${escapeHtml(fromDate)} &nbsp;to&nbsp; ${escapeHtml(toDate)}
  </div>
</div>
<table>
  <colgroup>${colGroupHTML}</colgroup>
  <thead>
    <tr>
      <th>Item</th>
      <th>Division</th>
      <th>Province</th>
      <th>Area</th>
      <th>Dept Id</th>
      <th>Application No</th>
      <th>Applicant Name</th>
      <th>Applicant Address</th>
      <th>NIC No</th>
      <th>Submit Date</th>
      <th>Cost Center Name</th>
      <th>Tariff</th>
      <th>Phase</th>
      <th>PIV No</th>
      <th>PIV Paid Date</th>
      <th>Ex. Account No</th>
      <th>PIV Amount</th>
    </tr>
  </thead>
  <tbody>${bodyHTML}</tbody>
</table>
</body>
</html>`;

    const doc = iframeRef.current!.contentDocument!;
    doc.open();
    doc.write(fullHTML);
    doc.close();
    setTimeout(() => iframeRef.current?.contentWindow?.print(), 1000);
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto p-6 bg-white rounded-xl shadow border border-gray-200 text-sm">
      <iframe ref={iframeRef} style={{ display: "none" }} />

      <h2 className={`text-xl font-bold mb-4 ${maroon}`}>
        Area Wise SRP Application PIV (PIVI) Paid Report
      </h2>

      {/* ── Date Range ── */}
      <div className="flex justify-end mb-4">
        <DateRangePicker
          fromDate={fromDate}
          toDate={toDate}
          onFromChange={setFromDate}
          onToChange={setToDate}
        />
      </div>

      {/* ── Company List ── */}
      <div className="mt-6">
        <ReusableCompanyList
          fetchItems={useCallback(async () => {
            if (!epfNo) {
              toast.error("No EPF number available.");
              return [];
            }
            try {
              const res = await fetch(
                `/misapi/api/incomeexpenditure/Usercompanies/${epfNo}/50`
              );
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              const txt    = await res.text();
              const parsed = JSON.parse(txt);
              const raw    = Array.isArray(parsed) ? parsed : parsed.data || [];
              return raw.map((c: any) => ({
                id:   c.CompId,
                name: c.CompName,
              }));
            } catch (e: any) {
              toast.error(e.message || "Failed to load companies");
              return [];
            }
          }, [epfNo])}
          onViewItem={(company: { id: string; name: string }) => {
            const typedCompany: Company = {
              compId:   company.id,
              CompName: company.name,
            };
            handleViewReport(typedCompany);
          }}
          idColumnTitle="Company Code"
          nameColumnTitle="Company Name"
          loadingMessage="Loading companies..."
          emptyMessage="No companies available for selection."
        />
      </div>

      {/* ── Report Viewer ── */}
      {showReport && (
        <ReportViewer
          title="Area Wise SRP Application PIV (PIVI) Paid Report"
          currency=""
          subtitlebold2="Company:"
          subtitlenormal2={`${selectedCompany?.compId} / ${selectedCompany?.CompName}`}
          subtitlebold3="Period:"
          subtitlenormal3={`${fromDate} to ${toDate}`}
          loading={reportLoading}
          hasData={reportData.length > 0}
          handleDownloadCSV={handleDownloadCSV}
          printPDF={printPDF}
          closeReport={closeReport}
        >
          <table className="w-full text-xs">
            <thead className={`${maroonGrad} text-white`}>
              <tr>
                <th className="border border-gray-400 px-2 py-2 text-center whitespace-nowrap">Item</th>
                <th className="border border-gray-400 px-2 py-2 whitespace-nowrap">Division</th>
                <th className="border border-gray-400 px-2 py-2 whitespace-nowrap">Province</th>
                <th className="border border-gray-400 px-2 py-2 whitespace-nowrap">Area</th>
                <th className="border border-gray-400 px-2 py-2 whitespace-nowrap">Dept ID</th>
                <th className="border border-gray-400 px-2 py-2 whitespace-nowrap">Application No</th>
                <th className="border border-gray-400 px-2 py-2 whitespace-nowrap">Applicant Name</th>
                <th className="border border-gray-400 px-2 py-2 whitespace-nowrap">Applicant Address</th>
                <th className="border border-gray-400 px-2 py-2 whitespace-nowrap">NIC No</th>
                <th className="border border-gray-400 px-2 py-2 whitespace-nowrap">Submit Date</th>
                <th className="border border-gray-400 px-2 py-2 whitespace-nowrap">Cost Center Name</th>
                <th className="border border-gray-400 px-2 py-2 whitespace-nowrap">Tariff</th>
                <th className="border border-gray-400 px-2 py-2 whitespace-nowrap">Phase</th>
                <th className="border border-gray-400 px-2 py-2 whitespace-nowrap">PIV No</th>
                <th className="border border-gray-400 px-2 py-2 whitespace-nowrap">PIV Paid Date</th>
                <th className="border border-gray-400 px-2 py-2 whitespace-nowrap">Ex. Account No</th>
                <th className="border border-gray-400 px-2 py-2 text-right whitespace-nowrap">PIV Amount</th>
              </tr>
            </thead>
            <tbody>
              {reportData.map((item, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="border border-gray-300 px-2 py-2 text-center whitespace-nowrap">{idx + 1}</td>
                  <td className="border border-gray-300 px-2 py-2 whitespace-nowrap">{item.Division}</td>
                  <td className="border border-gray-300 px-2 py-2 whitespace-nowrap">{item.Province}</td>
                  <td className="border border-gray-300 px-2 py-2 whitespace-nowrap">{item.Area}</td>
                  <td className="border border-gray-300 px-2 py-2 whitespace-nowrap">{item.DeptId}</td>
                  <td className="border border-gray-300 px-2 py-2 whitespace-nowrap">{item.ApplicationNo}</td>
                  <td className="border border-gray-300 px-2 py-2 whitespace-normal">{item.Name}</td>
                  <td className="border border-gray-300 px-2 py-2 whitespace-normal">{item.Address}</td>
                  <td className="border border-gray-300 px-2 py-2 whitespace-nowrap">{item.IdNo}</td>
                  <td className="border border-gray-300 px-2 py-2 whitespace-nowrap">{formatDate(item.SubmitDate)}</td>
                  <td className="border border-gray-300 px-2 py-2 whitespace-normal">{item.CCT_NAME}</td>
                  <td className="border border-gray-300 px-2 py-2 whitespace-nowrap">{item.TariffCode}</td>
                  <td className="border border-gray-300 px-2 py-2 whitespace-nowrap">{item.Phase}</td>
                  <td className="border border-gray-300 px-2 py-2 whitespace-nowrap">{item.PivNo}</td>
                  <td className="border border-gray-300 px-2 py-2 whitespace-nowrap">{formatDate(item.PaidDate)}</td>
                  <td className="border border-gray-300 px-2 py-2 whitespace-nowrap">{item.ExistingAccNo}</td>
                  <td className="border border-gray-300 px-2 py-2 text-right whitespace-nowrap">{formatAmount(item.PivAmount)}</td>
                </tr>
              ))}
              {/* Total row */}
              {reportData.length > 0 && (
                <tr className="bg-gray-200 font-bold">
                  <td colSpan={16} className="border border-gray-300 px-2 py-2 text-right">
                    Total
                  </td>
                  <td className="border border-gray-300 px-2 py-2 text-right whitespace-nowrap">
                    {formatAmount(reportData.reduce((s, r) => s + (r.PivAmount || 0), 0))}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </ReportViewer>
      )}
    </div>
  );
};

export default AreaWiseSRPApplicationPIVPaidReport;