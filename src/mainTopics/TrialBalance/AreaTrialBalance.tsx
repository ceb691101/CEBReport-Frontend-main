import React, { useState, useCallback } from "react";
import { useUser } from "../../contexts/UserContext";
import { toast } from "react-toastify";
import ReportViewer from "../../components/utils/ReportViewer";
import YearMonthDropdowns from "../../components/utils/YearMonthDropdowns";
import ReusableCompanyList from "../../components/utils/ReusableCompanyList";

const AreaTrialBalance: React.FC = () => {
  const { user } = useUser();
  const epfNo = user?.Userno || "";

  // Date Selection State
  const [selectedYear, setSelectedYear] = useState<number | null>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(new Date().getMonth() + 1);

  // Report State
  const [selectedCompany, setSelectedCompany] = useState<{ id: string; name: string } | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportPdfUrl, setReportPdfUrl] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any[]>([]);

  // Style classes
  const maroon = "text-[#7A0000]";

  const handleViewReport = async (company: { compId: string; CompName: string }) => {
    if (!selectedYear || !selectedMonth) {
      toast.error("Please select both Year and Month first.");
      return;
    }

    setSelectedCompany({ id: company.compId, name: company.CompName });
    setReportLoading(true);
    setReportData([]);
    setReportPdfUrl(null);
    setShowReport(true);

    try {
      // 1. Fetch JSON data from list endpoint to check if data exists
      const listUrl = `/misapi/api/areatrialbalance/list?companyId=${encodeURIComponent(company.compId)}&year=${selectedYear}&month=${selectedMonth}`;
      const res = await fetch(listUrl, {
        method: "GET",
        credentials: "include",
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errorText}`);
      }

      const json = await res.json();
      const items = Array.isArray(json) ? json : json.data || [];
      setReportData(items);

      if (items.length === 0) {
        toast.warn("No trial balance records found for the selected period.");
        setReportLoading(false);
        return;
      }

      // 2. Set PDF preview URL for iframe rendering in ReportViewer
      const pdfUrl = `/misapi/api/areatrialbalance/pdf?companyId=${encodeURIComponent(company.compId)}&year=${selectedYear}&month=${selectedMonth}&download=false`;
      setReportPdfUrl(pdfUrl);
      toast.success("Report loaded successfully");
    } catch (err: any) {
      toast.error("Failed to load report: " + (err.message || "Unknown error"));
    } finally {
      setReportLoading(false);
    }
  };

  const handleDownloadCSV = async () => {
    if (!selectedCompany || !selectedYear || !selectedMonth) return;
    const url = `/misapi/api/areatrialbalance/csv?companyId=${encodeURIComponent(selectedCompany.id)}&year=${selectedYear}&month=${selectedMonth}`;

    try {
      const response = await fetch(url, {
        method: "GET",
        credentials: "include",
      });

      const contentType = response.headers.get("content-type") || "";

      if (!response.ok) {
        if (contentType.includes("application/json")) {
          const errorJson = await response.json();
          throw new Error(errorJson?.message || errorJson?.Message || `HTTP ${response.status}`);
        }
        const errorText = await response.text();
        throw new Error(errorText || `HTTP ${response.status}`);
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `Area_Trial_Balance_${selectedCompany.id}_${selectedYear}_${selectedMonth.toString().padStart(2, "0")}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } catch (error: any) {
      toast.error(error.message || "Failed to download CSV.");
    }
  };

  const handleDownloadPDF = async () => {
    if (!selectedCompany || !selectedYear || !selectedMonth) return;
    const url = `/misapi/api/areatrialbalance/pdf?companyId=${encodeURIComponent(selectedCompany.id)}&year=${selectedYear}&month=${selectedMonth}&download=true`;

    try {
      const response = await fetch(url, {
        method: "GET",
        credentials: "include",
      });

      const contentType = response.headers.get("content-type") || "";

      if (!response.ok) {
        if (contentType.includes("application/json")) {
          const errorJson = await response.json();
          throw new Error(errorJson?.message || errorJson?.Message || `HTTP ${response.status}`);
        }
        const errorText = await response.text();
        throw new Error(errorText || `HTTP ${response.status}`);
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `Area_Trial_Balance_${selectedCompany.id}_${selectedYear}_${selectedMonth.toString().padStart(2, "0")}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } catch (error: any) {
      toast.error(error.message || "Failed to download PDF.");
    }
  };

  const printPDF = () => {
    if (!selectedCompany || !selectedYear || !selectedMonth) return;
    const url = `/misapi/api/areatrialbalance/pdf?companyId=${encodeURIComponent(selectedCompany.id)}&year=${selectedYear}&month=${selectedMonth}&download=false`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const closeReport = () => {
    setShowReport(false);
    setReportData([]);
    setReportPdfUrl(null);
    setSelectedCompany(null);
  };

  const getMonthName = (monthNum: number | null): string => {
    if (monthNum === null) return "";
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    return monthNames[monthNum - 1] || "";
  };

  return (
    <div className="max-w-[95%] mx-auto p-4 bg-white rounded-xl shadow border border-gray-200 font-sans">
      <h2 className={`text-lg md:text-xl font-bold mb-6 ${maroon}`}>
        Area Trial Balance Summary
      </h2>

      {/* Parameter Selection Controls */}
      <div className="flex flex-col md:flex-row gap-6 items-end mb-6">
        <YearMonthDropdowns
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          className="gap-4"
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
              const txt = await res.text();
              const parsed = JSON.parse(txt);
              const raw = Array.isArray(parsed) ? parsed : parsed.data || [];
              return raw.map((c: any) => ({
                id: c.CompId,
                name: c.CompName,
              }));
            } catch (e: any) {
              toast.error(e.message || "Failed to load companies");
              return [];
            }
          }, [epfNo])}
          onViewItem={(company: { id: string; name: string }) => {
            handleViewReport({
              compId: company.id,
              CompName: company.name,
            });
          }}
          idColumnTitle="Company Code"
          nameColumnTitle="Company Name"
          loadingMessage="Loading companies..."
          emptyMessage="No companies available for selection."
        />
      </div>


      {/* Report Viewer Modal */}
      {showReport && selectedCompany && (
        <ReportViewer
          title="Area Trial Balance Summary Report"
          subtitlebold="Area:"
          subtitlenormal={`${selectedCompany.id} - ${selectedCompany.name}`}
          subtitlebold2="Period:"
          subtitlenormal2={`${getMonthName(selectedMonth)} ${selectedYear}`}
          loading={reportLoading}
          hasData={reportData.length > 0}
          handleDownloadCSV={handleDownloadCSV}
          printPDF={printPDF}
          handleDownloadPDF={handleDownloadPDF}
          closeReport={closeReport}
          renderMode="pdf"
          pdfUrl={reportPdfUrl ?? undefined}
        />
      )}
    </div>
  );
};

export default AreaTrialBalance;
