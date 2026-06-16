import React, { useState, useEffect } from "react";
import { Search, RotateCcw, Eye } from "lucide-react";
import { useUser } from "../../contexts/UserContext";
import { toast } from "react-toastify";
import ReportViewer from "../../components/utils/ReportViewer";
import YearMonthDropdowns from "../../components/utils/YearMonthDropdowns";

interface CostCentre {
  DeptId: string;
  DeptName: string;
}

interface Warehouse {
  WarehouseCode: string;
  CostCenterId?: string;
}

interface FIFOItem {
  DocumentNo: string;
  MaterialCode: string;
  MaterialName: string;
  GradeCode: string;
  PhvDate?: string;
  QtyOnHand: number;
  StockBook: number;
  Reason?: string;
  CostCentreName?: string;
}

const parseApiResponse = (response: any): any[] => {
  if (Array.isArray(response)) return response;
  if (response.data && Array.isArray(response.data)) return response.data;
  if (response.result && Array.isArray(response.result)) return response.result;
  if (response.departments && Array.isArray(response.departments)) return response.departments;
  if (response.Data && Array.isArray(response.Data)) return response.Data;
  if (response.warehouses && Array.isArray(response.warehouses)) return response.warehouses;
  console.warn("Unexpected API response format:", response);
  return [];
};

const PHVDamageFIFO: React.FC = () => {
  const { user } = useUser();
  const epfNo = user?.Userno || "";

  const [data, setData] = useState<CostCentre[]>([]);
  const [searchId, setSearchId] = useState("");
  const [searchName, setSearchName] = useState("");
  const [filtered, setFiltered] = useState<CostCentre[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [selectedDept, setSelectedDept] = useState<CostCentre | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [reportData, setReportData] = useState<FIFOItem[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportPdfUrl, setReportPdfUrl] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [warehouseLoading, setWarehouseLoading] = useState(false);
  const pageSize = 9;

  const maroon = "text-[#7A0000]";
  const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    const fetchDepartments = async () => {
      if (!epfNo) {
        setError("No EPF number available. Please login again.");
        toast.error("No EPF number available. Please login again.");
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(
          `/misapi/api/incomeexpenditure/departments/${encodeURIComponent(epfNo)}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            credentials: "include",
          }
        );

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`HTTP error! status: ${res.status}, message: ${errorText}`);
        }

        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const text = await res.text();
          throw new Error(`Expected JSON but got ${contentType}. Response: ${text.substring(0, 100)}`);
        }

        const parsed = await res.json();
        const rawData = parseApiResponse(parsed);

        const final: CostCentre[] = rawData.map((item: any) => ({
          DeptId: item.DeptId?.toString() || "",
          DeptName: item.DeptName?.toString().trim() || "",
        }));

        setData(final);
        setFiltered(final);
      } catch (e: any) {
        console.error("Cost Center Fetch Error:", e);
        const errorMessage = e.message.includes("JSON.parse")
          ? "Invalid data format received from server."
          : e.message.includes("Failed to fetch")
          ? "Failed to connect to the server. Please check if the server is running."
          : e.message;
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchDepartments();
  }, [epfNo]);

  useEffect(() => {
    const f = data.filter(
      (d) =>
        (!searchId || d.DeptId.toLowerCase().includes(searchId.toLowerCase())) &&
        (!searchName || d.DeptName.toLowerCase().includes(searchName.toLowerCase()))
    );
    setFiltered(f);
    setPage(1);
  }, [searchId, searchName, data]);

  useEffect(() => {
    const fetchWarehouses = async () => {
      setWarehouses([]);
      setSelectedWarehouse("");

      if (!selectedDept || !epfNo) {
        return;
      }

      setWarehouseLoading(true);
      try {
        const url = `/misapi/api/inventoryaverageconsumption/warehouses/${encodeURIComponent(epfNo)}?costCenterId=${encodeURIComponent(selectedDept.DeptId)}&t=${Date.now()}`;

        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          credentials: "include",
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const text = await response.text();
          throw new Error(`Expected JSON but got ${contentType}. Response: ${text.substring(0, 100)}`);
        }

        const result = await response.json();
        const rawData = parseApiResponse(result);
        const warehousesData: Warehouse[] = rawData.map((item: any) => ({
          WarehouseCode: item.WarehouseCode?.toString().trim() || "",
          CostCenterId: item.CostCenterId?.toString().trim() || "",
        }));

        const filteredData = warehousesData.filter(
          (item) => !item.CostCenterId || item.CostCenterId === selectedDept.DeptId
        );

        setWarehouses(filteredData);
        if (filteredData.length === 0) {
          toast.warn(`No warehouses found for cost center ${selectedDept.DeptId}.`);
        } else if (filteredData.length === 1) {
          setSelectedWarehouse(filteredData[0].WarehouseCode);
        }
      } catch (error: any) {
        console.error("Warehouse Fetch Error Details:", error);
        const errorMessage = error.message.includes("Failed to fetch")
          ? "Failed to connect to the server. Please verify the warehouse endpoint exists."
          : error.message;
        toast.error(`Failed to fetch warehouses: ${errorMessage}`);
      } finally {
        setWarehouseLoading(false);
      }
    };

    fetchWarehouses();
  }, [selectedDept, epfNo]);

  const handleViewReport = async () => {
    if (!selectedDept) {
      toast.error("Please select a cost center.");
      return;
    }
    if (!selectedWarehouse) {
      toast.error("Please select a warehouse code.");
      return;
    }
    if (!selectedMonth || !selectedYear) {
      toast.error("Please select both Month and Year");
      return;
    }

    setReportLoading(true);
    setReportData([]);
    setReportPdfUrl(null);
    setShowReport(true);

    try {
      const res = await fetch(
        `/misapi/api/phv-damage-fifo/list?deptId=${encodeURIComponent(selectedDept.DeptId)}&warehouseCode=${encodeURIComponent(selectedWarehouse)}&repYear=${encodeURIComponent(selectedYear.toString())}`
      );

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errorText}`);
      }

      const json = await res.json();
      const items: FIFOItem[] = Array.isArray(json) ? json : json.data || [];
      setReportData(items);

      const previewUrl = buildJasperPdfUrl(false);
      if (!previewUrl) {
        throw new Error("Unable to build Jasper report URL.");
      }

      setReportPdfUrl(previewUrl);
      items.length === 0
        ? toast.warn("No records found")
        : toast.success("Report loaded successfully");
    } catch (err: any) {
      toast.error("Failed to load report: " + (err.message || "Unknown error"));
    } finally {
      setReportLoading(false);
    }
  };

  const buildJasperPdfUrl = (download: boolean) => {
    if (!selectedDept || !selectedWarehouse || !selectedMonth || !selectedYear) {
      return null;
    }

    const params = new URLSearchParams({
      deptId: selectedDept.DeptId,
      deptName: selectedDept.DeptName,
      warehouseCode: selectedWarehouse,
      repYear: selectedYear.toString(),
      repMonth: selectedMonth.toString(),
      download: download ? "true" : "false",
    });

    return `/misapi/api/phv-damage-fifo/pdf?${params.toString()}`;
  };

  const requestJasperPdf = async (download: boolean) => {
    const url = buildJasperPdfUrl(download);
    if (!url) {
      toast.error("Please select cost center, warehouse, month, and year.");
      return;
    }

    const selectedDeptId = selectedDept!.DeptId;
    const selectedMonthValue = selectedMonth!;
    const selectedYearValue = selectedYear!;

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

      if (!contentType.includes("application/pdf")) {
        const errorText = await response.text();
        throw new Error(errorText || "The server did not return a PDF file.");
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;

      if (download) {
        link.download = `PHV_Damage_FIFO_${selectedDeptId}_${selectedWarehouse}_${selectedYearValue}_${selectedMonthValue.toString().padStart(2, "0")}.pdf`;
      } else {
        link.target = "_blank";
        link.rel = "noopener noreferrer";
      }

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } catch (error: any) {
      toast.error(error.message || "Failed to load Jasper PDF.");
    }
  };

  const closeReport = () => {
    setShowReport(false);
    setReportData([]);
    setReportPdfUrl(null);
    setSelectedDept(null);
    setSelectedMonth(null);
    setSelectedYear(currentYear);
    setSelectedWarehouse("");
  };

  const handleDownloadCSV = async () => {
    if (reportData.length === 0 || !selectedDept || !selectedWarehouse || !selectedMonth || !selectedYear) {
      toast.error("No report data available to download as CSV.");
      return;
    }

    const params = new URLSearchParams({
      deptId: selectedDept.DeptId,
      deptName: selectedDept.DeptName,
      warehouseCode: selectedWarehouse,
      repYear: selectedYear.toString(),
      repMonth: selectedMonth.toString(),
    });

    const url = `/misapi/api/phv-damage-fifo/csv?${params.toString()}`;
    const selectedDeptId = selectedDept.DeptId;
    const selectedMonthValue = selectedMonth;
    const selectedYearValue = selectedYear;

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
      link.download = `PHV_Damage_FIFO_${selectedDeptId}_${selectedWarehouse}_${selectedYearValue}_${selectedMonthValue.toString().padStart(2, "0")}.csv`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } catch (error: any) {
      toast.error(error.message || "Failed to download CSV.");
    }
  };

  const handleDownloadPDF = () => requestJasperPdf(true);

  return (
    <div className="max-w-[95%] mx-auto p-2 md:p-4 bg-white rounded-xl shadow border border-gray-200 text-sm md:text-base font-sans">
      <h2 className={`text-lg md:text-xl font-bold mb-4 ${maroon}`}>
        PHV Damage FIFO Report
      </h2>

      <div className="flex flex-col md:flex-row flex-wrap gap-2 md:gap-3 mb-4 justify-end items-end">
        <div className="flex items-center gap-2">
          <YearMonthDropdowns
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
            className="gap-4"
          />
        </div>

        <div className="flex flex-col md:flex-row gap-2 md:gap-2 items-end">
          <div className="flex flex-col">
            <label className={`text-xs md:text-sm font-bold ${maroon} mb-1`}>
              Warehouse Code
            </label>
            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="pl-2 md:pl-3 pr-2 md:pr-3 py-1 md:py-1.5 w-full md:w-40 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A0000] transition text-xs md:text-sm"
              disabled={!selectedDept || warehouseLoading}
            >
              <option value="">Select Warehouse</option>
              {warehouses.map((wh) => (
                <option key={wh.WarehouseCode} value={wh.WarehouseCode}>
                  {wh.WarehouseCode}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleViewReport}
            disabled={!selectedDept || !selectedWarehouse || warehouseLoading}
            className={`px-2 md:px-3 py-1 md:py-1 ${maroonGrad} text-white rounded-md text-xs md:text-sm font-medium hover:brightness-110 transition shadow ${
              !selectedDept || !selectedWarehouse || warehouseLoading
                ? "opacity-50 cursor-not-allowed"
                : ""
            }`}
          >
            <Eye className="inline-block mr-1 w-3 md:w-3 h-3 md:h-3" />
            View
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row flex-wrap gap-2 md:gap-3 mb-2 md:mb-4">
        <div className="relative w-full md:w-auto">
          <Search className="absolute left-2 md:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 md:w-3 h-3 md:h-3" />
          <input
            type="text"
            value={searchId}
            placeholder="Search by Cost Center ID"
            onChange={(e) => setSearchId(e.target.value)}
            className="pl-8 md:pl-8 pr-2 md:pr-3 py-1 md:py-1.5 w-full md:w-40 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A0000] transition text-xs md:text-sm"
            autoComplete="off"
          />
        </div>
        <div className="relative w-full md:w-auto">
          <Search className="absolute left-2 md:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 md:w-3 h-3 md:h-3" />
          <input
            type="text"
            value={searchName}
            placeholder="Search by Name"
            onChange={(e) => setSearchName(e.target.value)}
            className="pl-8 md:pl-10 pr-2 md:pr-3 py-1 md:py-1.5 w-full md:w-40 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A0000] transition text-xs md:text-sm"
            autoComplete="off"
          />
        </div>
        {(searchId || searchName) && (
          <button
            onClick={() => {
              setSearchId("");
              setSearchName("");
            }}
            className="flex items-center gap-1 px-2 md:px-3 py-1 md:py-1.5 border border-gray-300 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs md:text-sm"
          >
            <RotateCcw className="w-3 md:w-3 h-3 md:h-3" /> Clear
          </button>
        )}
      </div>

      {loading && !warehouses.length && (
        <div className="text-center py-4 md:py-8">
          <div className="animate-spin rounded-full h-6 md:h-8 w-6 md:w-8 border-b-2 border-[#7A0000] mx-auto"></div>
          <p className="mt-1 md:mt-2 text-gray-600 text-xs md:text-sm">
            Loading cost centers...
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-2 md:px-4 py-2 md:py-3 rounded mb-2 md:mb-4 text-xs md:text-sm">
          Error: {error}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="text-gray-600 bg-gray-100 p-2 md:p-4 rounded text-xs md:text-sm">
          No cost centers found.
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <div className="max-h-[50vh] overflow-y-auto">
              <table className="w-full table-fixed text-left text-gray-700 text-xs md:text-sm">
                <thead className={`${maroonGrad} text-white sticky top-0`}>
                  <tr>
                    <th className="px-2 md:px-4 py-1 md:py-2 w-1/2 md:w-auto">
                      Cost Center Code
                    </th>
                    <th className="px-2 md:px-4 py-1 md:py-2 w-1/2 md:w-auto">
                      Cost Center Name
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice((page - 1) * pageSize, page * pageSize).map((department, i) => (
                    <tr
                      key={`${department.DeptId}-${i}`}
                      onClick={() => setSelectedDept(department)}
                      className={`cursor-pointer ${
                        selectedDept?.DeptId === department.DeptId
                          ? "bg-[#7A0000] text-white"
                          : i % 2
                          ? "bg-white hover:bg-gray-100"
                          : "bg-gray-50 hover:bg-gray-100"
                      }`}
                    >
                      <td className="px-2 md:px-4 py-1 md:py-2 truncate min-w-0">
                        {department.DeptId}
                      </td>
                      <td className="px-2 md:px-4 py-1 md:py-2 truncate min-w-0">
                        {department.DeptName}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-end items-center gap-2 md:gap-3 mt-2 md:mt-3">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-2 md:px-3 py-1 md:py-1 border rounded bg-white text-gray-600 text-xs md:text-sm hover:bg-gray-100 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-xs md:text-sm text-gray-600">
              Page {page} of {Math.ceil(filtered.length / pageSize)}
            </span>
            <button
              onClick={() =>
                setPage((p) => Math.min(Math.ceil(filtered.length / pageSize), p + 1))
              }
              disabled={page >= Math.ceil(filtered.length / pageSize)}
              className="px-2 md:px-3 py-1 md:py-1 border rounded bg-white text-gray-600 text-xs md:text-sm hover:bg-gray-100 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </>
      )}

      {showReport && selectedDept && (
        <ReportViewer
          title={`STATEMENT OF DAMAGED MATERIALS IN STOCKS - ${selectedYear}`}
          subtitlebold2="Cost Centre:"
          subtitlenormal2={`${selectedDept.DeptId} - ${selectedDept.DeptName}`}
          subtitlebold3="Warehouse:"
          subtitlenormal3={selectedWarehouse}
          loading={reportLoading}
          hasData={reportData.length > 0}
          handleDownloadCSV={handleDownloadCSV}
          printPDF={() => window.open(buildJasperPdfUrl(false) || "", "_blank", "noopener,noreferrer")}
          handleDownloadPDF={handleDownloadPDF}
          closeReport={closeReport}
          renderMode="pdf"
          pdfUrl={reportPdfUrl ?? undefined}
        >
        </ReportViewer>
      )}
    </div>
  );
};

export default PHVDamageFIFO;
