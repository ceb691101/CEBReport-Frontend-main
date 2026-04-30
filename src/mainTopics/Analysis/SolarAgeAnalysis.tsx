import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { FaFileDownload, FaPrint } from "react-icons/fa";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LabelList,
} from "recharts";

// Interfaces
interface Area {
  AreaCode: string;
  AreaName: string;
  ErrorMessage?: string | null;
}

interface BillCycleOption {
  display: string;
  code: string;
}

interface BillCycleRecord {
  BillCycle: string;
  BillMnth: string;
}

interface AgeGroupSummary {
  ageGroup: string;
  count: number;
  percentage?: number;
}

interface SolarCustomer {
  AccountNumber: string;
  Name: string;
  Address: string;
  NetType: string;
  InitialAgreementDate: string;
  AgeInYears?: number;
  AgeGroup?: string;
  ErrorMessage?: string | null;
}

interface SolarAgeAnalysisApiResult {
  AreaCode?: string;
  BillCycle?: string;
  AgeBand?: string;
  Records?: SolarCustomer[];
  AgeBandCounts?: Record<string, number>;
  ErrorMessage?: string | null;
}

const SolarAgeAnalysis: React.FC = () => {
  // Colors and styling
  const maroon = "text-[#7A0000]";
  const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";

  // Hooks
  const printRef = useRef<HTMLDivElement>(null);
  const reportContainerRef = useRef<HTMLDivElement>(null);

  // State
  const [areas, setAreas] = useState<Area[]>([]);
  const [billCycleOptions, setBillCycleOptions] = useState<BillCycleOption[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<SolarCustomer[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);

  // Chart state
  const [showChart, setShowChart] = useState(false);
  const [chartType, setChartType] = useState<"bar" | "pie">("bar");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(100);
  const [totalRecords, setTotalRecords] = useState(0);

  // Age groups for Solar Customers (in years)
  const ageGroups = [
    { value: "0-1", label: "Age < 1 year" },
    { value: "1-2", label: "1 < Age <= 2" },
    { value: "2-3", label: "2 < Age <= 3" },
    { value: "3-4", label: "3 < Age <= 4" },
    { value: "4-5", label: "4 < Age <= 5" },
    { value: "5-6", label: "5 < Age <= 6" },
    { value: "6-7", label: "6 < Age <= 7" },
    { value: "7-8", label: "7 < Age <= 8" },
    { value: "8+", label: "Age > 8" },
    { value: "null", label: "Agreement date Null" },
  ];

  const [formData, setFormData] = useState({
    billCycle: "",
    areaCode: "",
    ageGroup: "all",
  });

  // Summary data
  const [ageGroupSummary, setAgeGroupSummary] = useState<AgeGroupSummary[]>([]);

  // Helper functions
  const generateBillCycleOptions = (
    billCycles: BillCycleRecord[]
  ): BillCycleOption[] => {
    return billCycles.map((cycle) => ({
      display: cycle.BillMnth,
      code: cycle.BillCycle,
    }));
  };

  const getFormattedBillCycle = (): string => {
    const cycleOption = billCycleOptions.find(c => c.code === formData.billCycle);
    return cycleOption ? `${formData.billCycle} - ${cycleOption.display}` : formData.billCycle;
  };

  const fetchWithErrorHandling = async (url: string, timeout = 60000) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMsg = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.errorMessage) {
            errorMsg = errorData.errorMessage;
          }
        } catch (e) {
          errorMsg = response.statusText;
        }
        throw new Error(errorMsg);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(`Expected JSON response but got ${contentType}`);
      }

      return await response.json();
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(
          "Request timed out - the server may be processing a large dataset"
        );
      }
      console.error(`Error fetching ${url}:`, error);
      throw error instanceof Error ? error : new Error(String(error));
    }
  };

  // Effects
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch areas
        const areaData = await fetchWithErrorHandling(
          "/api/analysis/solar-age/areas"
        );
        setAreas(areaData.data || []);
        if (areaData.data?.length > 0) {
          setFormData((prev) => ({
            ...prev,
            areaCode: areaData.data[0].AreaCode,
          }));
        }

        // Fetch bill cycles for solar
        const maxCycleData = await fetchWithErrorHandling(
          `/api/analysis/solar-age/bill-cycles?areaCode=${areaData.data?.[0]?.AreaCode ?? ""}&take=20`
        );
        if (maxCycleData.data && maxCycleData.data.BillCycles?.length > 0) {
          const options = generateBillCycleOptions(maxCycleData.data.BillCycles);
          setBillCycleOptions(options);
          setFormData((prev) => ({ ...prev, billCycle: options[0].code }));
        } else {
          setBillCycleOptions([]);
          setFormData((prev) => ({ ...prev, billCycle: "" }));
        }
      } catch (err: any) {
        setError("Error loading data: " + (err.message || err.toString()));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calculate age group summary
  const calculateAgeGroupSummary = useCallback(
    (customersList: SolarCustomer[]): AgeGroupSummary[] => {
      const summary: { [key: string]: number } = {};

      ageGroups.forEach((group) => {
        summary[group.value] = 0;
      });

      customersList.forEach((customer) => {
        const ageGroup = customer.AgeGroup || "null";
        if (summary.hasOwnProperty(ageGroup)) {
          summary[ageGroup]++;
        }
      });

      const total = customersList.length;

      return ageGroups.map((group) => ({
        ageGroup: group.label,
        count: summary[group.value],
        percentage:
          total > 0
            ? Math.round((summary[group.value] / total) * 100 * 100) / 100
            : 0,
      }));
    },
    []
  );

  // Paginated data
  const paginatedCustomers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return customers.slice(startIndex, endIndex);
  }, [customers, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(customers.length / itemsPerPage);

  // Chart data
  const chartData = useMemo(() => {
    return ageGroupSummary.map((item, index) => ({
      name: item.ageGroup,
      value: item.count,
      color: [
        "#1E3A8A",
        "#10B981",
        "#F59E0B",
        "#6366F1",
        "#3B82F6",
        "#6B7280",
        "#9CA3AF",
        "#EC4899",
        "#8B5CF6",
        "#EF4444",
      ][index % 10],
    }));
  }, [ageGroupSummary]);

  // Event handlers
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
    },
    []
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.areaCode || !formData.billCycle) return;

    setReportLoading(true);
    setReportError(null);
    setCustomers([]);
    setCurrentPage(1);

    try {
      const url = `/api/analysis/solar-age/view?areaCode=${formData.areaCode}&billCycle=${formData.billCycle}&ageBand=all`;

      const data = await fetchWithErrorHandling(url, 120000);

      if (data.errorMessage) {
        throw new Error(data.errorMessage);
      }

      const resultData = (data.data || {}) as SolarAgeAnalysisApiResult;

      if (resultData.ErrorMessage) {
        throw new Error(resultData.ErrorMessage);
      }

      const records = resultData.Records || [];

      setCustomers(records);
      setTotalRecords(records.length);

      if (resultData.AgeBandCounts && Object.keys(resultData.AgeBandCounts).length > 0) {
        const summary = ageGroups.map((group) => ({
          ageGroup: group.label,
          count: resultData.AgeBandCounts?.[group.value === "0-1" ? "<=1" : group.value === "8+" ? ">8" : group.value] ?? 0,
          percentage:
            records.length > 0
              ? Math.round(((resultData.AgeBandCounts?.[group.value === "0-1" ? "<=1" : group.value === "8+" ? ">8" : group.value] ?? 0) / records.length) * 10000) / 100
              : 0,
        }));
        setAgeGroupSummary(summary);
      } else {
        const summary = calculateAgeGroupSummary(records);
        setAgeGroupSummary(summary);
      }

      setShowReport(true);

      // Scroll to report after a small delay
      setTimeout(() => {
        if (reportContainerRef.current) {
          reportContainerRef.current.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    } catch (err: any) {
      let errorMessage = "Error fetching report: ";

      if (err.message.includes("timed out")) {
        errorMessage +=
          "The request timed out. Please try again or select a smaller area.";
      } else {
        errorMessage += err.message || err.toString();
      }

      setReportError(errorMessage);
    } finally {
      setReportLoading(false);
    }
  };

  const downloadAsCSV = useCallback(() => {
    if (!customers.length) return;

    const headers = [
      "Account Number",
      "Name",
      "Address",
      "Net Type",
      "Initial Agreement Date",
      "Age (Years)",
    ];

    const rows = customers.map((customer) => [
      customer.AccountNumber,
      customer.Name,
      customer.Address,
      customer.NetType,
      customer.InitialAgreementDate,
      customer.AgeInYears?.toString() || "N/A",
    ]);

    // Add summary section at the end
    const summaryRows = [
      [],
      ["Age Group Summary"],
      ...ageGroupSummary.map((item) => [
        item.ageGroup,
        item.count.toString(),
        `${item.percentage}%`,
      ]),
    ];

    const csvContent = [
      `"Solar Age Analysis Report"`,
      `"Bill Cycle: ${getFormattedBillCycle()}"`,
      `"Area: ${
        areas.find((a) => a.AreaCode === formData.areaCode)?.AreaName
      } (${formData.areaCode})"`,
      `"Total Customers: ${customers.length}"`,
      "",
      headers.map((h) => `"${h}"`).join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
      ...summaryRows.map((row) =>
        row.map((cell) => `"${cell}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `SolarAgeAnalysis_Cycle${
      formData.billCycle
    }_Area${formData.areaCode}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [customers, formData, billCycleOptions, areas, ageGroupSummary]);

  const printPDF = () => {
    if (!customers.length) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const generateTableHTML = () => {
      let tableHTML = `
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #f0f0f0;">
              <th style="border: 1px solid #ddd; padding: 2px 4px; text-align: left; font-size: 10px; vertical-align: top; font-weight: bold;">Account Number</th>
              <th style="border: 1px solid #ddd; padding: 2px 4px; text-align: left; font-size: 10px; vertical-align: top; font-weight: bold;">Name</th>
              <th style="border: 1px solid #ddd; padding: 2px 4px; text-align: left; font-size: 10px; vertical-align: top; font-weight: bold;">Address</th>
              <th style="border: 1px solid #ddd; padding: 2px 4px; text-align: left; font-size: 10px; vertical-align: top; font-weight: bold;">Net Type</th>
              <th style="border: 1px solid #ddd; padding: 2px 4px; text-align: left; font-size: 10px; vertical-align: top; font-weight: bold;">Initial Agreement Date</th>
              <th style="border: 1px solid #ddd; padding: 2px 4px; text-align: left; font-size: 10px; vertical-align: top; font-weight: bold;">Age (Years)</th>
            </tr>
          </thead>
          <tbody>`;

      customers.forEach((customer, index) => {
        const bgColor = index % 2 === 0 ? "#ffffff" : "#f9f9f9";
        tableHTML += `
          <tr style="background-color: ${bgColor};">
            <td style="border: 1px solid #ddd; padding: 2px 4px; font-size: 10px; vertical-align: top;">${
              customer.AccountNumber
            }</td>
            <td style="border: 1px solid #ddd; padding: 2px 4px; font-size: 10px; vertical-align: top;">${
              customer.Name
            }</td>
            <td style="border: 1px solid #ddd; padding: 2px 4px; font-size: 10px; vertical-align: top;">${
              customer.Address
            }</td>
            <td style="border: 1px solid #ddd; padding: 2px 4px; font-size: 10px; vertical-align: top;">${
              customer.NetType
            }</td>
            <td style="border: 1px solid #ddd; padding: 2px 4px; font-size: 10px; vertical-align: top;">${
              customer.InitialAgreementDate
            }</td>
            <td style="border: 1px solid #ddd; padding: 2px 4px; text-align: center; font-size: 10px; vertical-align: top;">${
              customer.AgeInYears?.toString() || "N/A"
            }</td>
          </tr>`;
      });

      tableHTML += `</tbody></table>`;
      return tableHTML;
    };

    printWindow.document.write(`
      <html>
        <head>
          <title>Solar Age Analysis Report</title>
          <style>
            body { font-family: Arial; font-size: 10px; margin: 10mm; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 2px 4px; border: 1px solid #ddd; font-size: 10px; vertical-align: top; }
            .text-left { text-align: left; }
            .text-right { text-align: right; }
            .header {
              font-weight: bold;
              margin-bottom: 5px;
              color: #0f4c81;
              font-size: 12px;
            }
            .subheader {
              margin-bottom: 12px;
              font-size: 11px;
            }
            .footer {
              margin-top: 10px;
              font-size: 9px;
              color: #666;
            }
            @page {
              margin-bottom: 18mm;
            }
            .total-row {
              font-weight: bold;
              background-color: #f5f5f5;
            }
            th {
              background-color: #f0f0f0;
              font-weight: bold;
              text-align: left;
            }
            tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            .bold {
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="header">SOLAR AGE ANALYSIS REPORT</div>
          <div class="subheader">
            Area: <span class="bold">${
              areas.find((a) => a.AreaCode === formData.areaCode)?.AreaName
            } (${formData.areaCode})</span><br>
            Bill Cycle: <span class="bold">${getFormattedBillCycle()}</span><br>
            Total Customers: <span class="bold">${customers.length}</span><br>
          </div>
          ${generateTableHTML()}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  // UI helpers
  const formatCurrency = (value: number): string => {
    return value.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const handleBack = () => {
    setShowReport(false);
    setCustomers([]);
    setReportError(null);
    setCurrentPage(1);
    setTotalRecords(0);
    setShowChart(false);
    setAgeGroupSummary([]);
  };

  const renderChart = () => {
    if (!showChart || !chartData.length) {
      return null;
    }

    return (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-medium text-gray-800">
            Age Distribution Visualization
          </h4>
          <div className="flex gap-2">
            <button
              onClick={() => setChartType("bar")}
              className={`px-3 py-1 rounded text-sm ${
                chartType === "bar"
                  ? "bg-[#7A0000] text-white"
                  : "bg-gray-200 hover:bg-gray-300"
              }`}
            >
              Bar Chart
            </button>
            <button
              onClick={() => setChartType("pie")}
              className={`px-3 py-1 rounded text-sm ${
                chartType === "pie"
                  ? "bg-[#7A0000] text-white"
                  : "bg-gray-200 hover:bg-gray-300"
              }`}
            >
              Pie Chart
            </button>
          </div>
        </div>

        <div style={{ width: "100%", height: "400px" }}>
          {chartType === "bar" ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value) => {
                    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                    return value.toString();
                  }}
                />
                <Tooltip
                  cursor={{ fill: "rgba(0,0,0,0.05)" }}
                  formatter={(value) => [formatCurrency(Number(value)), "Count"]}
                  labelStyle={{ fontSize: "12px" }}
                />
                <Legend
                  payload={chartData.map((item) => ({
                    id: item.name,
                    type: "square",
                    value: item.name,
                    color: item.color,
                  }))}
                />

                <Bar
                  dataKey="value"
                  name="Customer Count"
                  radius={[6, 6, 0, 0]}
                  isAnimationActive={true}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`bar-cell-${index}`} fill={entry.color} />
                  ))}
                  <LabelList
                    dataKey="value"
                    position="top"
                    formatter={(val: number) => formatCurrency(val)}
                    style={{ fontSize: "10px", fill: "#333" }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={150}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(1)}%`
                  }
                  labelLine={false}
                  fontSize={11}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [
                    formatCurrency(Number(value)),
                    "Count",
                  ]}
                  labelStyle={{ fontSize: "12px" }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    );
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pageNumbers = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className="flex justify-center items-center gap-2 my-4">
        <button
          onClick={() => setCurrentPage(1)}
          disabled={currentPage === 1}
          className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-50"
        >
          First
        </button>
        <button
          onClick={() => setCurrentPage(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-50"
        >
          Previous
        </button>

        {pageNumbers.map((pageNum) => (
          <button
            key={pageNum}
            onClick={() => setCurrentPage(pageNum)}
            className={`px-2 py-1 text-xs rounded ${
              currentPage === pageNum
                ? "bg-[#7A0000] text-white"
                : "bg-gray-200 hover:bg-gray-300"
            }`}
          >
            {pageNum}
          </button>
        ))}

        <button
          onClick={() => setCurrentPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-50"
        >
          Next
        </button>
        <button
          onClick={() => setCurrentPage(totalPages)}
          disabled={currentPage === totalPages}
          className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-50"
        >
          Last
        </button>

        <span className="text-xs text-gray-600 ml-4">
          Showing {(currentPage - 1) * itemsPerPage + 1}-
          {Math.min(currentPage * itemsPerPage, totalRecords)} of {totalRecords}{" "}
          records
        </span>
      </div>
    );
  };

  const renderForm = () => (
    <>
      <h2 className={`text-xl font-bold mb-6 ${maroon}`}>
        Age Analysis of Solar Power Consumers
      </h2>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Area Dropdown */}
          <div className="flex flex-col">
            <label className={`${maroon} text-xs font-medium mb-1`}>
              Select Area:
            </label>
            <select
              name="areaCode"
              value={formData.areaCode}
              onChange={handleInputChange}
              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent"
              required
            >
              {areas.map((area) => (
                <option
                  key={area.AreaCode}
                  value={area.AreaCode}
                  className="text-xs py-1"
                >
                  {area.AreaName} ({area.AreaCode})
                </option>
              ))}
            </select>
          </div>

          {/* Bill Cycle Dropdown */}
          <div className="flex flex-col">
            <label className={`${maroon} text-xs font-medium mb-1`}>
              Select Bill Cycle:
            </label>
            <select
              name="billCycle"
              value={formData.billCycle}
              onChange={handleInputChange}
              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent"
              required
            >
              {billCycleOptions.map((option) => (
                <option
                  key={option.code}
                  value={option.code}
                  className="text-xs py-1"
                >
                  {option.code} - {option.display}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Buttons */}
        <div className="w-full mt-6 flex justify-end gap-3">
          <button
            type="submit"
            disabled={reportLoading || !formData.areaCode || !formData.billCycle}
            className={`
              px-6 py-2 rounded-md font-medium transition-opacity duration-300 shadow
              ${maroonGrad} text-white
              ${
                reportLoading
                  ? "opacity-70 cursor-not-allowed"
                  : "hover:opacity-90"
              }
            `}
          >
            {reportLoading ? (
              <span className="flex items-center">
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Loading...
              </span>
            ) : (
              "View Details"
            )}
          </button>
          <button
            type="button"
            onClick={() => {}}
            title="Coming soon"
            className={`
              px-6 py-2 rounded-md font-medium transition-opacity duration-300 shadow
              ${maroonGrad} text-white
              opacity-70 cursor-not-allowed
            `}
          >
            Full Report
          </button>
        </div>
      </form>
    </>
  );

  const renderSummary = () => {
    if (!ageGroupSummary.length) return null;

    return (
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
        <h4 className={`${maroon} font-medium mb-3`}>
          Age Distribution Summary
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {ageGroupSummary.map((item, index) => (
            <div
              key={index}
              className="bg-white border border-blue-200 rounded p-3"
            >
              <p className="text-xs font-medium text-gray-600 mb-1">
                {item.ageGroup}
              </p>
              <p className={`${maroon} text-lg font-bold`}>
                {item.count}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {item.percentage}%
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderReportTable = () => {
    if (!customers.length && !reportLoading && !reportError) return null;

    return (
      <div className="mt-8" ref={printRef}>
        <div className="flex justify-between items-center mb-2">
          <h3 className={`text-lg font-semibold ${maroon}`}>
            Solar Customers Age Analysis
          </h3>
          <div className="flex gap-2 mt-2">
            <button
              onClick={downloadAsCSV}
              className="flex items-center gap-1 px-3 py-1.5 border border-blue-400 text-blue-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-blue-50 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
              disabled={!customers.length}
            >
              <FaFileDownload className="w-3 h-3" /> CSV
            </button>
            <button
              onClick={printPDF}
              className="flex items-center gap-1 px-3 py-1.5 border border-green-400 text-green-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-green-50 hover:text-green-800 focus:outline-none focus:ring-2 focus:ring-green-200 transition"
              disabled={!customers.length}
            >
              <FaPrint className="w-3 h-3" /> PDF
            </button>

            <button
              onClick={() => setShowChart(!showChart)}
              className="px-4 py-1.5 bg-[#7A0000] hover:bg-[#A52A2A] text-xs rounded-md text-white flex items-center"
              disabled={!customers.length}
            >
              {showChart ? "Hide Chart" : "Show Chart"}
            </button>
            <button
              onClick={handleBack}
              className="px-4 py-1.5 bg-[#7A0000] hover:bg-[#A52A2A] text-xs rounded-md text-white flex items-center"
            >
              Back to Form
            </button>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-2">
          Bill Cycle: {getFormattedBillCycle()}
        </p>
        <p className="text-sm text-gray-600 mb-4">
          Area: {areas.find((a) => a.AreaCode === formData.areaCode)?.AreaName}{" "}
          ({formData.areaCode})
        </p>

        {reportLoading && (
          <div
            className={`text-center py-8 ${maroon} text-sm animate-pulse font-sans`}
          >
            <div className="flex items-center justify-center">
              <svg
                className={`animate-spin -ml-1 mr-3 h-5 w-5 ${maroon}`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Loading report data...
            </div>
          </div>
        )}

        {reportError && (
          <div className="mt-6 text-red-600 bg-red-100 border border-red-300 p-4 rounded text-sm">
            <strong>Error:</strong> {reportError}
          </div>
        )}

        {!reportLoading && !reportError && customers.length > 0 && (
          <>
            {/* Summary Section */}
            {renderSummary()}

            {/* Chart Section */}
            {renderChart()}

            {renderPagination()}

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-2 py-1 text-left sticky top-0 bg-gray-100">
                      Account Number
                    </th>
                    <th className="border border-gray-300 px-2 py-1 text-left sticky top-0 bg-gray-100">
                      Name
                    </th>
                    <th className="border border-gray-300 px-2 py-1 text-left sticky top-0 bg-gray-100">
                      Address
                    </th>
                    <th className="border border-gray-300 px-2 py-1 text-left sticky top-0 bg-gray-100">
                      Net Type
                    </th>
                    <th className="border border-gray-300 px-2 py-1 text-left sticky top-0 bg-gray-100">
                      Initial Agreement Date
                    </th>
                    <th className="border border-gray-300 px-2 py-1 text-center sticky top-0 bg-gray-100">
                      Age (Years)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedCustomers.map((customer, index) => (
                    <tr
                      key={`${customer.AccountNumber}-${index}`}
                      className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                    >
                      <td className="border border-gray-300 px-2 py-1">
                        {customer.AccountNumber}
                      </td>
                      <td className="border border-gray-300 px-2 py-1">
                        {customer.Name}
                      </td>
                      <td className="border border-gray-300 px-2 py-1">
                        {customer.Address}
                      </td>
                      <td className="border border-gray-300 px-2 py-1">
                        {customer.NetType}
                      </td>
                      <td className="border border-gray-300 px-2 py-1">
                        {customer.InitialAgreementDate}
                      </td>
                      <td className="border border-gray-300 px-2 py-1 text-center">
                        {customer.AgeInYears?.toString() || "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className={`max-w-7xl mx-auto p-6 text-center ${maroon}`}>
        <svg
          className={`animate-spin mx-auto h-6 w-6 ${maroon}`}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        Loading initial data...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-600 bg-red-100 border border-red-300 p-4 rounded text-sm">
        <strong>Error:</strong> {error}
        <button
          onClick={() => setError(null)}
          className="float-right text-red-800 font-bold"
        >
          ×
        </button>
      </div>
    );
  }

  return (
    <div
      className={`max-w-7xl mx-auto p-6 bg-white rounded-xl shadow border border-gray-200 text-sm font-sans`}
    >
      {/* Form section */}
      <div className={showReport ? "hidden" : ""}>{renderForm()}</div>

      {/* Show any report errors even when form is visible */}
      {!showReport && reportError && (
        <div className="mt-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded text-xs">
          {reportError}
        </div>
      )}

      {/* Report container */}
      {showReport && (
        <div
          ref={reportContainerRef}
          className="mt-4 border border-gray-300 rounded-lg overflow-hidden"
          style={{ maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}
        >
          {renderReportTable()}
        </div>
      )}
    </div>
  );
};

export default SolarAgeAnalysis;
