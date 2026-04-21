import React, { useState, useRef, useCallback } from "react";
import { useUser } from "../../contexts/UserContext";
import { toast } from "react-toastify";
import DateRangePicker from "../../components/utils/DateRangePicker";
import ReusableCompanyList from "../../components/utils/ReusableCompanyList";
import ReportViewer from "../../components/utils/ReportViewer";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PIVPendingItem {
  Province:                string;  
  Area_nm:                 string;  
  Dept_nm:                 string;  
  No_of_pending_estimation: number; 
  Division_Name:           string;
  Comp_nm:                 string;  
  Category:                string;  
  [key: string]:           any;
}

// Grouped structure for rendering
interface GroupedByProvince {
  province:     string;
  areas:        GroupedByArea[];
  provinceTotal: number;
}

interface GroupedByArea {
  area:          string;
  costCentres:   PIVPendingItem[];
  areaTotal:     number;
}

interface Company {
  compId:   string;
  CompName: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const csvEscape = (val: string | number | null | undefined): string => {
  if (val == null) return '""';
  const str = String(val);
  if (/[,\n"']/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
};

const escapeHtml = (text: string | null | undefined): string => {
  if (text == null) return "";
  const div = document.createElement("div");
  div.textContent = String(text);
  return div.innerHTML;
};

const formatDateLong = (date: Date): string => {
  const months = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December",
  ];
  return `${date.getFullYear()}-${months[date.getMonth()]}-${String(date.getDate()).padStart(2,"0")}`;
};

// ── Group flat data by Province → Area ───────────────────────────────────────
const groupData = (data: PIVPendingItem[]): GroupedByProvince[] => {
  const provinceMap = new Map<string, Map<string, PIVPendingItem[]>>();

  data.forEach((item) => {
    const province = (item.Province || "UNKNOWN").trim();
    const area     = (item.Area_nm || "UNKNOWN").trim();

    if (!provinceMap.has(province)) provinceMap.set(province, new Map());
    const areaMap = provinceMap.get(province)!;
    if (!areaMap.has(area)) areaMap.set(area, []);
    areaMap.get(area)!.push(item);
  });

  const result: GroupedByProvince[] = [];
  provinceMap.forEach((areaMap, province) => {
    const areas: GroupedByArea[] = [];
    areaMap.forEach((items, area) => {
      const areaTotal = items.reduce((s, i) => s + (i.No_of_pending_estimation || 0), 0);
      areas.push({ area, costCentres: items, areaTotal });
    });
    const provinceTotal = areas.reduce((s, a) => s + a.areaTotal, 0);
    result.push({ province, areas, provinceTotal });
  });

  return result;
};

// ─── Component ───────────────────────────────────────────────────────────────

const DivisionWiseSRPApplicationPIVPendingReport: React.FC = () => {
  const { user } = useUser();
  const epfNo    = user?.Userno || "";
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [fromDate,        setFromDate]         = useState("");
  const [toDate,          setToDate]           = useState("");
  const [reportData,      setReportData]       = useState<PIVPendingItem[]>([]);
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
        `misapi/api/area-wise-srp-piv-pending/list` +
        `?compId=${company.compId.trim()}` +
        `&fromDate=${fromDate.replace(/-/g, "/")}` +
        `&toDate=${toDate.replace(/-/g, "/")}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const items: PIVPendingItem[] = Array.isArray(data) ? data : data.data || [];
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

    const grouped = groupData(reportData);
    const grandTotal = grouped.reduce((s, p) => s + p.provinceTotal, 0);
    const divisionName = reportData[0]?.Division_Name || reportData[0]?.Comp_nm || selectedCompany.CompName;
    const today = new Date().toLocaleDateString("en-GB");

    const csvRows: string[] = [
      `"Divisional SRP Application fee (PIV I) to be paid Summary - PIV I Generated date From ${fromDate} To ${toDate}"`,
      `"DIVISION : ${divisionName}"`,
      `"Date : ${today}"`,
      "",
      ["Item", "Area", "Cost Centre", "No of Applications"].map(csvEscape).join(","),
    ];

    let serial = 1;
    grouped.forEach((prov) => {
      csvRows.push(`"","Province : ${prov.province}","",""`);
      prov.areas.forEach((area) => {
        area.costCentres.forEach((item) => {
          csvRows.push([serial++, item.Area_nm, item.Dept_nm, item.No_of_pending_estimation].map(csvEscape).join(","));
        });
      });
      csvRows.push(`"","SRP Application PIV (PIV I) Pending Estimate ${prov.province}","","${prov.provinceTotal}"`);
    });

    csvRows.push(`"","Total SRP Application PIV (PIV I) Pending Estimate","","${grandTotal}"`);

    const blob = new Blob(["\uFEFF" + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href     = URL.createObjectURL(blob);
    link.download = `Division_SRP_PIV_Pending_${selectedCompany.compId}_${fromDate}_to_${toDate}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // ── Print PDF ─────────────────────────────────────────────────────────────────

  const printPDF = () => {
    if (!reportData.length || !iframeRef.current || !selectedCompany) return;

    const grouped     = groupData(reportData);
    const grandTotal  = grouped.reduce((s, p) => s + p.provinceTotal, 0);
    const divisionName = reportData[0]?.Division_Name || reportData[0]?.Comp_nm || selectedCompany.CompName;
    const today       = new Date();

    // ── Build table body HTML ────────────────────────────────────────────────
    let bodyHTML = "";
    let serial = 1;

    grouped.forEach((prov) => {
      // Province header row
      bodyHTML += `
        <tr class="province-row">
          <td colspan="4" style="font-weight:bold; padding-left:4mm;">
            Province : ${escapeHtml(prov.province)}
          </td>
        </tr>`;

      prov.areas.forEach((areaGroup) => {
        let firstInArea = true;
        areaGroup.costCentres.forEach((item) => {
          bodyHTML += `
            <tr>
              <td class="center">${serial++}</td>
              <td>${firstInArea ? escapeHtml(areaGroup.area) : ""}</td>
              <td>${escapeHtml(item.Dept_nm)}</td>
              <td class="center">${item.No_of_pending_estimation}</td>
            </tr>`;
          firstInArea = false;
        });
      });

      // Province subtotal row
      bodyHTML += `
        <tr class="subtotal-row">
          <td colspan="3" style="text-align:right; padding-right:4mm; font-style:italic;">
            SRP Application PIV (PIV I) Pending Estimate ${escapeHtml(prov.province)}
          </td>
          <td class="center"><strong>${prov.provinceTotal}</strong></td>
        </tr>`;
    });

    // Grand total row
    bodyHTML += `
      <tr class="total-row">
        <td colspan="3" style="text-align:right; padding-right:4mm;">
          Total SRP Application PIV (PIV I) Pending Estimate
        </td>
        <td class="center"><strong>${grandTotal}</strong></td>
      </tr>`;

    const fullHTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Division Wise SRP PIV Pending Summary</title>
<style>
  @page { size: A4 portrait; margin: 15mm; }
  @page {
    @bottom-left  { content: "Date : ${formatDateLong(today)}"; font-size: 8px; color: #333; }
    @bottom-right { content: "Page " counter(page) " of " counter(pages); font-size: 8px; color: #333; }
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 9pt; color: #000; }

  .report-title {
    font-size: 10pt;
    font-weight: bold;
    text-align: center;
    margin-bottom: 4mm;
    line-height: 1.4;
    color: #000;
  }
  .division-label {
    font-size: 9.5pt;
    font-weight: bold;
    margin-bottom: 4mm;
    color: #000;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 8.5pt;
  }
  thead { display: table-header-group; }
  th, td {
    border: 0.5pt solid #888;
    padding: 1.5mm 2mm;
    vertical-align: top;
  }
  th {
    background: #e8e8e8;
    font-weight: bold;
    text-align: center;
    vertical-align: middle;
    font-size: 8.5pt;
    color: #000;
  }
  td { color: #000; }
  .center { text-align: center; }

  .c-item { width: 10%; }
  .c-area { width: 28%; }
  .c-cc   { width: 48%; }
  .c-apps { width: 14%; }

  .province-row td {
    background: #f0f0f0;
    border-top: 1pt solid #555;
    font-size: 8.5pt;
    padding: 1.5mm 2mm;
  }
  .subtotal-row td {
    background: #e8e8e8;
    font-style: italic;
    border-top: 0.8pt solid #888;
    font-size: 8.5pt;
    padding: 1.5mm 2mm;
  }
  .total-row td {
    background: #d0d0d0;
    font-weight: bold;
    border-top: 1.5pt solid #333;
    font-size: 9pt;
    padding: 2mm;
  }

  .footer-line {
    margin-top: 6mm;
    font-size: 8pt;
    color: #333;
  }
</style>
</head>
<body>

  <div class="report-title">
    Divisional SRP Application fee (PIV I) to be paid Summary - PIV I Generated date
    From ${escapeHtml(fromDate)} To ${escapeHtml(toDate)}
  </div>

  <div class="division-label">DIVISION : ${escapeHtml(divisionName)}</div>

  <table>
    <thead>
      <tr>
        <th class="c-item">Item</th>
        <th class="c-area">Area</th>
        <th class="c-cc">Cost Centre</th>
        <th class="c-apps">No of applications</th>
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
    setTimeout(() => iframeRef.current?.contentWindow?.print(), 800);
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  const grouped    = groupData(reportData);
  const grandTotal = grouped.reduce((s, p) => s + p.provinceTotal, 0);

  return (
    <div className="max-w-7xl mx-auto p-6 bg-white rounded-xl shadow border border-gray-200 text-sm">
      <iframe ref={iframeRef} style={{ display: "none" }} title="print-frame" />

      <h2 className={`text-xl font-bold mb-4 ${maroon}`}>
        Division Wise SRP Application PIV (PIVI) Pending Summary
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

      {/* ── Division (Company) List ── */}
      <div className="mt-6">
        <ReusableCompanyList
          fetchItems={useCallback(async () => {
            if (!epfNo) { toast.error("No EPF number available."); return []; }
            try {
              const res = await fetch(`/misapi/api/incomeexpenditure/Usercompanies/${epfNo}/70`);
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              const txt    = await res.text();
              const parsed = JSON.parse(txt);
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

      {/* ── Report Viewer ── */}
      {showReport && (
        <ReportViewer
          title="Division Wise SRP Application PIV (PIVI) Pending Summary"
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
          {/* ── Screen Table — grouped by Province → Area ── */}
          <table className="w-full text-xs border-collapse">
            <thead className={`${maroonGrad} text-white`}>
              <tr>
                <th className="border border-gray-400 px-3 py-2 text-center w-12">Item</th>
                <th className="border border-gray-400 px-3 py-2 text-left w-40">Area</th>
                <th className="border border-gray-400 px-3 py-2 text-left">Cost Centre</th>
                <th className="border border-gray-400 px-3 py-2 text-center w-24">No of Applications</th>
              </tr>
            </thead>
            <tbody>
              {grouped.map((prov) => (
                <>
                  {/* Province header */}
                  <tr key={`prov-${prov.province}`} className="bg-gray-100">
                    <td
                      colSpan={4}
                      className="border border-gray-300 px-3 py-1.5 font-bold text-gray-800"
                    >
                      Province : {prov.province}
                    </td>
                  </tr>

                  {/* Cost centre rows */}
                  {prov.areas.map((areaGroup) =>
                    areaGroup.costCentres.map((item, i) => (
                      <tr
                        key={`${prov.province}-${areaGroup.area}-${i}`}
                        className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      >
                        <td className="border border-gray-300 px-3 py-1.5 text-center">
                          {/* serial calculated inline */}
                          {reportData.indexOf(item) + 1}
                        </td>
                        <td className="border border-gray-300 px-3 py-1.5">
                          {i === 0 ? areaGroup.area : ""}
                        </td>
                        <td className="border border-gray-300 px-3 py-1.5">
                          {item.Dept_nm}
                        </td>
                        <td className="border border-gray-300 px-3 py-1.5 text-center">
                          {item.No_of_pending_estimation}
                        </td>
                      </tr>
                    ))
                  )}

                  {/* Province subtotal */}
                  <tr key={`subtotal-${prov.province}`} className="bg-gray-200">
                    <td
                      colSpan={3}
                      className="border border-gray-300 px-3 py-1.5 text-right italic text-gray-700"
                    >
                      SRP Application PIV (PIV I) Pending Estimate {prov.province}
                    </td>
                    <td className="border border-gray-300 px-3 py-1.5 text-center font-bold">
                      {prov.provinceTotal}
                    </td>
                  </tr>
                </>
              ))}

              {/* Grand total */}
              {reportData.length > 0 && (
                <tr className="bg-gray-300 font-bold">
                  <td
                    colSpan={3}
                    className="border border-gray-300 px-3 py-2 text-right"
                  >
                    Total SRP Application PIV (PIV I) Pending Estimate
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-center">
                    {grandTotal}
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

export default DivisionWiseSRPApplicationPIVPendingReport;