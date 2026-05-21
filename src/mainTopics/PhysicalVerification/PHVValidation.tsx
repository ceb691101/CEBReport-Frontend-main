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

interface PHVValidationItem {
  MatCd: string;
  MatNm: string;
  UomCd: string;
  GradeCd: string;
  Qty: number;
  Rate: number;
  CntedQty: number;
  Reason?: string;
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

const PHVValidation: React.FC = () => {
  const { user } = useUser();
  const epfNo = user?.Userno || "";
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [selectedDept, setSelectedDept] = useState<CostCentre | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [reportData, setReportData] = useState<PHVValidationItem[]>([]);
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
        `/misapi/api/physical-verification-validation?deptId=${encodeURIComponent(
          dept.id
        )}&repYear=${encodeURIComponent(
          selectedYear
        )}&repMonth=${encodeURIComponent(selectedMonth)}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const items: PHVValidationItem[] = Array.isArray(json)
        ? json
        : json.data || [];
      setReportData(items);

      items.length === 0
        ? toast.warn("No records found")
        : toast.success("Report loaded successfully");
    } catch (err: any) {
      toast.error(
        "Failed to load report: " + (err.message || "Unknown error")
      );
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


    const headers = [
      "Serial No",
      "Code No",
      "Description",
      "Grade Code",
      "UOM",
      "Standard Price",
      "Stock Book Quantity",
      "Physical",
      "Reason",
    ];

    const csvRows: string[] = [
      `"ANNUAL VERIFICATION OF STORES ${selectedYear ?? currentYear} (Validation)"`,
      `Cost Centre: ${selectedDept.DeptId} - ${selectedDept.DeptName}`,
      "",
      headers.join(","),
    ];

    reportData.forEach((item, idx) => {
      const row = [
        idx + 1,
        item.MatCd || "",
        item.MatNm || "",
        item.GradeCd || "",
        item.UomCd || "",
        item.UnitPrice || 0,
        item.QtyOnHand || 0,
        item.CntedQty || 0,
        item.Reason || "",
      ];
      csvRows.push(row.map((v) => `"${v}"`).join(","));
    });



    const csvContent = csvRows.join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `PHV_Validation_${selectedDept.DeptId}_${selectedYear ?? currentYear}_${selectedMonth != null ? String(selectedMonth).padStart(2, "0") : ""}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const printPDF = () => {
    if (reportData.length === 0 || !iframeRef.current || !selectedDept)
      return;


    const tableStyle = `
      table { width: 100%; border-collapse: collapse; font-size: 10px; }
      th, td { border: 1px solid #999; padding: 6px; word-wrap: break-word; }
      th { background-color: #ffffff;; color:#000000;; font-weight: bold; text-align: center; }
      .right { text-align: right; }
      .center { text-align: center; }
      .total-row { background-color: #f0f0f0; font-weight: bold; }
    `;

    let bodyHTML = "";
    reportData.forEach((item, idx) => {
      bodyHTML += `<tr>
        <td class="center">${idx + 1}</td>
        <td>${escapeHtml(item.MatCd)}</td>
        <td>${escapeHtml(item.MatNm)}</td>
        <td class="center">${escapeHtml(item.GradeCd)}</td>
        <td class="center">${escapeHtml(item.UomCd)}</td>
        <td class="right">${formatNumber(item.UnitPrice)}</td>
        <td class="right">${formatNumber(item.QtyOnHand)}</td>
        <td class="right">${formatNumber(item.CntedQty)}</td>
        <td>${escapeHtml(item.Reason)}</td>

      </tr>`;
    });


    const fullHTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>PHV Validation Report</title>
<style>${tableStyle}
body { font-family: Arial, sans-serif; margin: 15mm; }
h2 { text-align: center; color: #7A0000; margin-bottom: 5px; }
.subtitles { margin-bottom: 10px; font-size: 11px; display: flex; justify-content: space-between; }
@page { margin: 15mm; size: A4 landscape;
  @bottom-left { content: "Printed on: ${new Date().toLocaleString()}"; font-size: 9px; }
  @bottom-right { content: "Page " counter(page) " of " counter(pages); font-size: 9px; }
}
</style>
</head>
<body>
<h2>PHV VALIDATION FORM - ${selectedYear}</h2>
<div class="subtitles">
  <div>Cost Centre: ${escapeHtml(selectedDept.DeptId)} - ${escapeHtml(
      selectedDept.DeptName
    )}</div>
</div>

<table>
  <thead>
  <tr>
    <th style="width:5%">S/No</th>
    <th style="width:6%">Code No</th>
    <th style="width:35%">Description</th>
    <th style="width:8%">Grade</th>
    <th style="width:6%">UOM</th>
    <th style="width:9%">Std Price</th>
    <th style="width:8%">Stock Book Qty</th>
    <th style="width:8%">Physical</th>
    <th style="width:12%">Reason</th>
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

  return (
    <div className="max-w-7xl mx-auto p-6 bg-white rounded-xl shadow border border-gray-200 text-sm">
      <iframe ref={iframeRef} style={{ display: "none" }} />

      <h2 className={`text-xl font-bold mb-6 ${maroon}`}>
        PHV Validation Form
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
          title={`ANNUAL VERIFICATION OF STORES ${selectedYear} (Validation)`}
          subtitlebold2="Cost Centre:"
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
                  S/No
                </th>
                <th className="border border-gray-400 px-3 py-2 text-center whitespace-nowrap">
                  Code No
                </th>
                <th className="border border-gray-400 px-3 py-2 text-left whitespace-nowrap">
                  Description
                </th>
                <th className="border border-gray-400 px-3 py-2 text-center whitespace-nowrap">
                  Grade Code
                </th>
                <th className="border border-gray-400 px-3 py-2 text-center whitespace-nowrap">
                  UOM
                </th>
                <th className="border border-gray-400 px-3 py-2 text-right whitespace-nowrap">
                  Standard Price
                </th>
                <th className="border border-gray-400 px-3 py-2 text-right whitespace-nowrap">
                  Stock Book Qty
                </th>
                <th className="border border-gray-400 px-3 py-2 text-right whitespace-nowrap">
                  Physical
                </th>
                <th className="border border-gray-400 px-3 py-2 text-center whitespace-nowrap">
                  Reason
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
                    {item.MatCd || ""}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-left">
                    {item.MatNm || ""}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-center">
                    {item.GradeCd || ""}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-center">
                    {item.UomCd || ""}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right">
                    {formatNumber(item.UnitPrice)}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right">
                    {formatNumber(item.QtyOnHand)}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right">
                    {formatNumber(item.CntedQty)}
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

export default PHVValidation;