import React, { useState, useRef, useCallback } from "react";
import { useUser } from "../../contexts/UserContext";
import { toast } from "react-toastify";
import DateRangePicker from "../../components/utils/DateRangePicker";
import ReusableCompanyList from "../../components/utils/ReusableCompanyList";
import ReportViewer from "../../components/utils/ReportViewer";


interface EstimationPIVPaidItem {
  Division:        string;
  Province:        string;
  Area:            string;
  Dept_Id:         string;
  Estimation_No:   string;   // "Estimation No" column (instead of Application No)
  Name:            string;
  Address:         string;
  Id_No:           string;
  Submit_Date:     string | null;
  Cct_Name:        string;
  Tariff_Code:     string;
  Phase:           string;
  Piv_No:          string;
  Paid_Date:       string | null;
  Existing_Acc_No: string;
  Piv_Amount:      number;
  [key: string]:   any;
}

interface Company {
  compId:   string;
  CompName: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
  return `"${str}"`;
};

const escapeHtml = (text: string | null | undefined): string => {
  if (text == null) return "";
  const div = document.createElement("div");
  div.textContent = String(text);
  return div.innerHTML;
};

// ─── Component ───────────────────────────────────────────────────────────────

const AreaWiseSRPEstimationPIVPaidReport: React.FC = () => {
  const { user } = useUser();
  const epfNo    = user?.Userno || "";
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [fromDate,        setFromDate]         = useState("");
  const [toDate,          setToDate]           = useState("");
  const [reportData,      setReportData]       = useState<EstimationPIVPaidItem[]>([]);
  const [reportLoading,   setReportLoading]    = useState(false);
  const [showReport,      setShowReport]       = useState(false);

  const maroon     = "text-[#7A0000]";
  const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";

  // ── Fetch Report ─────────────────────────────────────────────────────────────

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
        `/misapi/api/area-wise-srp-estimation-piv-paid/list` +
        `?compId=${company.compId.trim()}` +
        `&fromDate=${fromDate.replace(/-/g, "")}` +
        `&toDate=${toDate.replace(/-/g, "")}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const items: EstimationPIVPaidItem[] = Array.isArray(data)
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

  // ── CSV ───────────────────────────────────────────────────────────────────────

  const handleDownloadCSV = () => {
    if (!reportData.length || !selectedCompany) return;

    const totalAmount = reportData.reduce((s, r) => s + (r.Piv_Amount || 0), 0);
    const today = new Date().toLocaleDateString("en-GB");

    const headers = [
      "Item", "Division", "Province", "Area", "Dept ID",
      "Estimation No", "Applicant Name", "Applicant Address", "NIC No",
      "Submit Date", "Cost Center Name", "Tariff", "Phase",
      "PIV No", "PIV Paid Date", "Ex. Account No", "PIV Amount",
    ];

    const csvRows: string[] = [
      `"SRP Estimation fee (PIV II) / (PIV III) paid Details PIV II paid date As at ${today}"`,
      `"AREA : ${selectedCompany.compId} / ${selectedCompany.CompName}"`,
      `"Period: ${fromDate} to ${toDate}"`,
      "",
      headers.map(csvEscape).join(","),
    ];

    reportData.forEach((item, index) => {
      const row = [
        index + 1,
        item.Division            || "",
        item.Province            || "",
        item.Area                || "",
        `="${item.Dept_Id        ?? ""}"`,
        `="${item.Estimation_No  ?? ""}"`,
        item.Name                || "",
        item.Address             || "",
        `="${item.Id_No          ?? ""}"`,
        formatDate(item.Submit_Date),
        item.Cct_Name            || "",
        item.Tariff_Code         || "",
        item.Phase               || "",
        `="${item.Piv_No         ?? ""}"`,
        formatDate(item.Paid_Date),
        `="${item.Existing_Acc_No ?? ""}"`,
        item.Piv_Amount          ?? "",
      ];
      csvRows.push(row.map(csvEscape).join(","));
    });

    csvRows.push(
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "Total", formatAmount(totalAmount)]
        .map(csvEscape).join(",")
    );

    const blob = new Blob(["\uFEFF" + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href     = URL.createObjectURL(blob);
    link.download = `SRP_Estimation_PIV_Paid_${selectedCompany.compId}_${fromDate}_to_${toDate}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // ── Print PDF ─────────────────────────────────────────────────────────────────

  const printPDF = () => {
    if (!reportData.length || !iframeRef.current || !selectedCompany) return;

    const totalAmount = reportData.reduce((s, r) => s + (r.Piv_Amount || 0), 0);
    const today       = new Date().toLocaleDateString("en-GB", {
      year: "numeric", month: "long", day: "numeric",
    }); // e.g. "6 March 2026"

    // Column widths — A3 landscape, matching PDF layout
    const colWidths = [
      "28px",  // Item
      "52px",  // Division
      "32px",  // Province
      "52px",  // Area
      "48px",  // Dept Id
      "105px", // Estimation No
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

    const colGroupHTML = colWidths.map((w) => `<col style="width:${w};" />`).join("");

    const tableStyle = `
      table { width:100%; border-collapse:collapse; table-layout:fixed; font-size:7.5px; }
      thead { display:table-header-group; }
      th, td { border:0.5px solid #aaa; padding:3px 4px; word-wrap:break-word; vertical-align:top; text-align:left; }
      th { background:#e8e8e8; color:#000; font-weight:bold; text-align:center; vertical-align:middle; }
      .numeric { text-align:right; }
      .center  { text-align:center; }
      .nowrap  { white-space:nowrap; }
      tr:nth-child(even) td { background:#fafafa; }
      .total-row td { background:#ddd !important; font-weight:bold; border-top:1px solid #555; }
    `;

    let bodyHTML = "";
    reportData.forEach((item, idx) => {
      bodyHTML += `<tr>
        <td class="center">${idx + 1}</td>
        <td class="center">${escapeHtml(item.Division)}</td>
        <td class="center">${escapeHtml(item.Province)}</td>
        <td class="center">${escapeHtml(item.Area)}</td>
        <td class="center">${escapeHtml(item.Dept_Id)}</td>
        <td>${escapeHtml(item.Estimation_No)}</td>
        <td>${escapeHtml(item.Name)}</td>
        <td>${escapeHtml(item.Address)}</td>
        <td>${escapeHtml(item.Id_No)}</td>
        <td class="center">${formatDate(item.Submit_Date)}</td>
        <td>${escapeHtml(item.Cct_Name)}</td>
        <td class="center">${escapeHtml(item.Tariff_Code)}</td>
        <td class="center">${escapeHtml(item.Phase)}</td>
        <td class="nowrap">${escapeHtml(item.Piv_No)}</td>
        <td class="center">${formatDate(item.Paid_Date)}</td>
        <td>${escapeHtml(item.Existing_Acc_No)}</td>
        <td class="numeric">${formatAmount(item.Piv_Amount)}</td>
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
<title>SRP Estimation PIV Paid Report</title>
<style>${tableStyle}
body { font-family:Arial, sans-serif; margin:10mm; print-color-adjust:exact; }
h2 { text-align:center; color:#7A0000; font-size:13px; font-weight:bold; margin:0 0 3px 0; }
.meta { font-size:9px; margin-bottom:4px; }
.meta strong { font-weight:bold; }
@page { size:A3 landscape; margin:12mm; }
@page {
  @bottom-left  { content:"Printed on: ${new Date().toLocaleString()}"; font-size:8px; color:#666; }
  @bottom-right { content:"Page " counter(page) " of " counter(pages); font-size:8px; color:#666; }
}
</style>
</head>
<body>
<h2>SRP Estimation fee (PIV II) / (PIV III) paid &nbsp; Details PIV II paid date &nbsp; As at ${escapeHtml(today)}</h2>
<div class="meta">
  <strong>AREA :</strong> ${escapeHtml(selectedCompany.compId)} / ${escapeHtml(selectedCompany.CompName)}
  &nbsp;&nbsp;&nbsp;
  <strong>Period:</strong> ${escapeHtml(fromDate)} &nbsp;to&nbsp; ${escapeHtml(toDate)}
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
      <th>Estimation No</th>
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
      <iframe ref={iframeRef} style={{ display: "none" }} title="print-frame" />

      <h2 className={`text-xl font-bold mb-4 ${maroon}`}>
        Area Wise SRP Estimation PIV (PIV II / PIV III) Paid Report
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
            if (!epfNo) { toast.error("No EPF number available."); return []; }
            try {
              const res    = await fetch(`/misapi/api/incomeexpenditure/Usercompanies/${epfNo}/50`);
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              const txt    = await res.text();
              const parsed = JSON.parse(txt);
              const raw    = Array.isArray(parsed) ? parsed : parsed.data || [];
              return raw.map((c: any) => ({ id: c.CompId, name: c.CompName }));
            } catch (e: any) {
              toast.error(e.message || "Failed to load companies");
              return [];
            }
          }, [epfNo])}
          onViewItem={(company: { id: string; name: string }) => {
            handleViewReport({ compId: company.id, CompName: company.name });
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
          title="Area Wise SRP Estimation PIV (PIV II / PIV III) Paid Report"
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
          {/* Screen table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse min-w-max">
              <thead className={`${maroonGrad} text-white`}>
                <tr>
                  {[
                    "Item", "Division", "Province", "Area", "Dept ID",
                    "Estimation No", "Applicant Name", "Applicant Address",
                    "NIC No", "Submit Date", "Cost Center Name",
                    "Tariff", "Phase", "PIV No", "PIV Paid Date",
                    "Ex. Account No", "PIV Amount",
                  ].map((h) => (
                    <th key={h} className="border border-gray-400 px-2 py-2 whitespace-nowrap text-center">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reportData.map((item, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="border border-gray-300 px-2 py-1 text-center">{idx + 1}</td>
                    <td className="border border-gray-300 px-2 py-1 whitespace-nowrap">{item.Division}</td>
                    <td className="border border-gray-300 px-2 py-1 whitespace-nowrap">{item.Province}</td>
                    <td className="border border-gray-300 px-2 py-1 whitespace-nowrap">{item.Area}</td>
                    <td className="border border-gray-300 px-2 py-1 whitespace-nowrap">{item.Dept_Id}</td>
                    <td className="border border-gray-300 px-2 py-1 whitespace-nowrap">{item.Estimation_No}</td>
                    <td className="border border-gray-300 px-2 py-1 whitespace-normal">{item.Name}</td>
                    <td className="border border-gray-300 px-2 py-1 whitespace-normal">{item.Address}</td>
                    <td className="border border-gray-300 px-2 py-1 whitespace-nowrap">{item.Id_No}</td>
                    <td className="border border-gray-300 px-2 py-1 whitespace-nowrap text-center">{formatDate(item.Submit_Date)}</td>
                    <td className="border border-gray-300 px-2 py-1 whitespace-normal">{item.Cct_Name}</td>
                    <td className="border border-gray-300 px-2 py-1 text-center whitespace-nowrap">{item.Tariff_Code}</td>
                    <td className="border border-gray-300 px-2 py-1 text-center whitespace-nowrap">{item.Phase}</td>
                    <td className="border border-gray-300 px-2 py-1 whitespace-nowrap">{item.Piv_No}</td>
                    <td className="border border-gray-300 px-2 py-1 whitespace-nowrap text-center">{formatDate(item.Paid_Date)}</td>
                    <td className="border border-gray-300 px-2 py-1 whitespace-nowrap">{item.Existing_Acc_No}</td>
                    <td className="border border-gray-300 px-2 py-1 text-right whitespace-nowrap">{formatAmount(item.Piv_Amount)}</td>
                  </tr>
                ))}
                {/* Total row */}
                {reportData.length > 0 && (
                  <tr className="bg-gray-200 font-bold">
                    <td colSpan={16} className="border border-gray-300 px-2 py-2 text-right">
                      Total
                    </td>
                    <td className="border border-gray-300 px-2 py-2 text-right whitespace-nowrap">
                      {formatAmount(reportData.reduce((s, r) => s + (r.Piv_Amount || 0), 0))}
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

export default AreaWiseSRPEstimationPIVPaidReport;