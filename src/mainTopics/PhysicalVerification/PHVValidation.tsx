import React, { useState, useCallback } from "react";
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

const PHVValidation: React.FC = () => {
  const { user } = useUser();
  const epfNo = user?.Userno || "";

  const [selectedDept, setSelectedDept] = useState<CostCentre | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [reportData, setReportData] = useState<PHVValidationItem[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const maroon = "text-[#7A0000]";
  const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";



  const currentYear = new Date().getFullYear();

  const buildPdfUrl = (download = false) => {
    if (!selectedDept || !selectedYear || !selectedMonth) {
      return "";
    }

    const paddedMonth = String(selectedMonth).padStart(2, "0");
    const params = new URLSearchParams({
      deptId: selectedDept.DeptId,
      deptName: selectedDept.DeptName,
      repYear: String(selectedYear),
      repMonth: paddedMonth,
      download: String(download),
    });

    return `/misapi/api/physical-verification-validation/pdf?${params.toString()}`;
  };

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
      const paddedMonth = String(selectedMonth).padStart(2, "0");
      const res = await fetch(
        `/misapi/api/physical-verification-validation?deptId=${encodeURIComponent(
          dept.id
        )}&repYear=${encodeURIComponent(
          selectedYear
        )}&repMonth=${encodeURIComponent(paddedMonth)}`
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

  const fetchPdfBlob = async (download: boolean) => {
    if (!selectedDept || !selectedYear || !selectedMonth) {
      toast.error("Please select both Month and Year");
      return;
    }

    try {
      const res = await fetch(buildPdfUrl(download));
      const contentType = res.headers.get("content-type") || "";

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || `HTTP ${res.status}`);
      }

      if (!contentType.includes("application/pdf")) {
        const responseText = await res.text();
        throw new Error(responseText || "The server did not return a PDF document.");
      }

      const blob = await res.blob();
      const pdfUrl = URL.createObjectURL(blob);

      if (download) {
        const link = document.createElement("a");
        link.href = pdfUrl;
        link.download = `PHV_Validation_${selectedDept.DeptId}_${selectedYear}_${String(selectedMonth).padStart(2, "0")}.pdf`;
        link.click();
        URL.revokeObjectURL(pdfUrl);
        return;
      }

      window.open(pdfUrl, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(pdfUrl), 60_000);
    } catch (err: any) {
      toast.error("Failed to generate PDF: " + (err.message || "Unknown error"));
    }
  };

  const printPDF = () => {
    void fetchPdfBlob(false);
  };

  const handleDownloadPDF = () => {
    void fetchPdfBlob(true);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 bg-white rounded-xl shadow border border-gray-200 text-sm">
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
          handleDownloadPDF={handleDownloadPDF}
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