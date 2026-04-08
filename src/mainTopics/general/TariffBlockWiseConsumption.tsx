import React, { useState, useEffect, useRef } from "react";
import { FaFileDownload, FaPrint } from "react-icons/fa";

// Interfaces
interface BillCycleOption {
  display: string;
  code: string;
  isSynthetic?: boolean; // Flag to identify frontend-generated cycles
}

interface OrdinaryTOUModel {
  tariff: string;
  kwhpUnits: string;
  kwhdUnits: string;
  kwhoUnits: string;
  kwhpCharge: number;
  kwhdCharge: number;
  kwhoCharge: number;
  Charge: number;
}

const TariffBlockWiseConsumption: React.FC = () => {
  // Colors and styling
  const maroon = "text-[#7A0000]";
  const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";

  // Hooks
  const printRef = useRef<HTMLDivElement>(null);
  const reportContainerRef = useRef<HTMLDivElement>(null);

  // State
  const [billCycleOptions, setBillCycleOptions] = useState<BillCycleOption[]>(
    []
  );
  const [allBillCycleOptions, setAllBillCycleOptions] = useState<
    BillCycleOption[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any[]>([]);
  const [touData, setTouData] = useState<OrdinaryTOUModel[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);

  // Report type options
  const reportTypeOptions = [
    {
      value: "ordinary",
      label: "Ordinary",
      api: "/CEBINFO_API_2025/api/tariffBlockwiseOrdinaryData",
    },
    {
      value: "bulk",
      label: "Bulk",
      api: "/CEBINFO_API_2025/api/tariffBlockwiseBulkData",
    },
    {
      value: "ordinary-block",
      label: "Ordinary Tariff Block Wise Analysis",
      api: "/CEBINFO_API_2025/api/tariffBlockWiseData",
    },
  ];

  const [formData, setFormData] = useState({
    reportType: "ordinary",
    billCycle: "",
  });

  // Generate 60 months of bill cycles (24 from API + 36 synthetic)
  const generateBillCycleOptions = (
    billCycles: string[],
    maxCycle: string
  ): BillCycleOption[] => {
    const maxCycleNum = parseInt(maxCycle);
    const apiCycles = billCycles.map((cycle, index) => ({
      display: cycle,
      code: (maxCycleNum - index).toString(),
      isSynthetic: false,
    }));

    // Generate additional synthetic cycles if needed
    const totalCyclesNeeded = 60;
    const cyclesToGenerate = Math.max(0, totalCyclesNeeded - apiCycles.length);
    const syntheticCycles: BillCycleOption[] = [];

    if (cyclesToGenerate > 0) {
      const lastApiCycleNum =
        apiCycles.length > 0
          ? parseInt(apiCycles[apiCycles.length - 1].code)
          : maxCycleNum;

      for (let i = 1; i <= cyclesToGenerate; i++) {
        const cycleNum = lastApiCycleNum - i;
        const date = new Date();
        date.setMonth(date.getMonth() - (apiCycles.length + i - 1));

        const monthName = date.toLocaleString("default", { month: "short" });
        const year = date.getFullYear().toString().slice(-2);
        const display = `${monthName}-${year}`;

        syntheticCycles.push({
          display,
          code: cycleNum.toString(),
          isSynthetic: true,
        });
      }
    }

    return [...apiCycles, ...syntheticCycles];
  };

  // Filter bill cycles based on report type
  const filterBillCyclesForReportType = (
    allOptions: BillCycleOption[],
    reportType: string
  ): BillCycleOption[] => {
    if (reportType === "bulk") {
      // For bulk reports, only show cycles 400 and below
      return allOptions.filter((option) => parseInt(option.code) <= 400);
    }
    // For other report types, show all cycles
    return allOptions;
  };

  const fetchWithErrorHandling = async (
    url: string,
    options: RequestInit = {}
  ) => {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...options.headers,
        },
        ...options,
      });

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
    } catch (error) {
      console.error(`Error fetching ${url}:`, error);
      throw error;
    }
  };

  // Effects
  useEffect(() => {
    const fetchBillCycles = async () => {
      setLoading(true);
      setError(null);
      try {
        const maxCycleData = await fetchWithErrorHandling(
          "/misapi/api/billcycle/max"
        );

        // Handle cases where API might return empty or incomplete data
        const apiCycles = maxCycleData.data?.BillCycles || [];
        const apiMaxCycle = maxCycleData.data?.MaxBillCycle || "0";

        // Generate 60 months of cycles (API + synthetic)
        const options = generateBillCycleOptions(apiCycles, apiMaxCycle);

        setAllBillCycleOptions(options);

        // Filter options for current report type
        const filteredOptions = filterBillCyclesForReportType(
          options,
          formData.reportType
        );
        setBillCycleOptions(filteredOptions);

        // Set initial bill cycle to the first option (API or synthetic)
        setFormData((prev) => ({
          ...prev,
          billCycle: filteredOptions[0]?.code || "",
        }));
      } catch (err: any) {
        setError(
          "Error loading bill cycles: " + (err.message || err.toString())
        );

        // Fallback: Generate 60 synthetic cycles if API fails completely
        const date = new Date();
        const syntheticOptions = Array.from({ length: 60 }, (_, i) => {
          const cycleDate = new Date(date);
          cycleDate.setMonth(cycleDate.getMonth() - i);
          const monthName = cycleDate.toLocaleString("default", {
            month: "short",
          });
          const year = cycleDate.getFullYear().toString().slice(-2);
          return {
            display: `${monthName}-${year}`,
            code: (60 - i).toString(),
            isSynthetic: true,
          };
        });

        setAllBillCycleOptions(syntheticOptions);

        // Filter for current report type
        const filteredOptions = filterBillCyclesForReportType(
          syntheticOptions,
          formData.reportType
        );
        setBillCycleOptions(filteredOptions);

        setFormData((prev) => ({
          ...prev,
          billCycle: filteredOptions[0]?.code || "",
        }));
      } finally {
        setLoading(false);
      }
    };

    fetchBillCycles();
  }, []);

  // Effect to update bill cycle options when report type changes
  useEffect(() => {
    if (allBillCycleOptions.length > 0) {
      const filteredOptions = filterBillCyclesForReportType(
        allBillCycleOptions,
        formData.reportType
      );
      setBillCycleOptions(filteredOptions);

      // Check if current bill cycle is still valid for the new report type
      const currentCycleValid = filteredOptions.some(
        (option) => option.code === formData.billCycle
      );

      if (!currentCycleValid && filteredOptions.length > 0) {
        // Reset to first available cycle if current is not valid
        setFormData((prev) => ({
          ...prev,
          billCycle: filteredOptions[0].code,
        }));
      }
    }
  }, [formData.reportType, allBillCycleOptions]);

  // Event handlers
  const handleInputChange = (
    e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearch = async () => {
    if (!formData.billCycle || !formData.reportType) return;

    setReportLoading(true);
    setReportError(null);
    setReportData([]);
    setTouData([]);

    try {
      const selectedReport = reportTypeOptions.find(
        (r) => r.value === formData.reportType
      );
      if (!selectedReport) throw new Error("Invalid report type selected");

      let data;

      try {
        // First try POST request with body
        const postBody = {
          billCycle: formData.billCycle,
        };

        console.log(
          "Making API call to:",
          selectedReport.api,
          "with body:",
          postBody
        );

        data = await fetchWithErrorHandling(selectedReport.api, {
          method: "POST",
          body: JSON.stringify(postBody),
        });

        console.log("API Response:", data);
      } catch (postError: any) {
        console.log("POST request failed, trying GET:", postError.message);

        // If POST fails, try GET with query parameters
        try {
          const url = `${selectedReport.api}?billCycle=${formData.billCycle}`;
          data = await fetchWithErrorHandling(url, { method: "GET" });
        } catch (getError: any) {
          console.log(
            "GET request failed, trying different parameter format:",
            getError.message
          );

          // Try alternative parameter formats
          try {
            const altUrl = `${selectedReport.api}/${formData.billCycle}`;
            data = await fetchWithErrorHandling(altUrl, { method: "GET" });
          } catch (altError: any) {
            // Try POST without body
            try {
              const postUrl = `${selectedReport.api}?billCycle=${formData.billCycle}`;
              data = await fetchWithErrorHandling(postUrl, { method: "POST" });
            } catch (finalError: any) {
              throw new Error(
                `All request methods failed. Last error: ${finalError.message}`
              );
            }
          }
        }
      }

      if (data.errorMessage) {
        throw new Error(data.errorMessage);
      }

      console.log(
        "Full API Response for debugging:",
        JSON.stringify(data, null, 2)
      );

      let resultData = [];
      if (formData.reportType === "ordinary") {
        resultData = data.data?.OrdList || data.OrdList || [];
        // Fetch TOU data for ordinary reports
        try {
          console.log("Fetching TOU data for ordinary report");
          const touResponse = await fetchWithErrorHandling(
            "/CEBINFO_API_2025/api/tariffBlockwiseOrdinaryDataTOU",
            {
              method: "POST",
              body: JSON.stringify({ billCycle: formData.billCycle }),
            }
          );

          console.log("TOU API Response:", touResponse);

          const touResultData =
            touResponse.data?.OrdTOUList || touResponse.OrdTOUList || [];
          setTouData(touResultData);
          console.log("TOU Data set:", touResultData);
        } catch (touError: any) {
          console.warn("Failed to fetch TOU data:", touError.message);
          setTouData([]);
        }
      } else if (formData.reportType === "bulk") {
        resultData = data.data?.BulkList || data.BulkList || [];
      } else if (formData.reportType === "ordinary-block") {
        // FIXED: Added the specific key that your API is returning
        resultData =
          data.data?.OrdBlockwiseList ||
          data.OrdBlockwiseList ||
          data.data?.BlockList ||
          data.BlockList ||
          data.data?.OrdBlockList ||
          data.OrdBlockList ||
          data.data?.TariffBlockList ||
          data.TariffBlockList ||
          data.data?.tariffBlockList ||
          data.tariffBlockList ||
          data.data?.blockList ||
          data.blockList ||
          data.data?.list ||
          data.list ||
          data.data?.Data ||
          data.Data ||
          data.data?.results ||
          data.results ||
          [];

        // If still empty, check if data itself is an array
        if (!resultData || resultData.length === 0) {
          if (Array.isArray(data.data)) {
            resultData = data.data;
          } else if (Array.isArray(data)) {
            resultData = data;
          }
        }

        console.log("All possible data paths checked");
        console.log("data.data:", data.data);
        console.log("data:", data);
        console.log("Final extracted result data:", resultData);
        console.log("Result data length:", resultData?.length);
      }

      // Debug: Log the complete structure to understand the response
      if (formData.reportType === "ordinary-block") {
        console.log("=== DEBUGGING ORDINARY-BLOCK API RESPONSE ===");
        console.log("Complete response keys:", Object.keys(data));
        if (data.data) {
          console.log("data.data keys:", Object.keys(data.data));
          console.log("data.data type:", typeof data.data);
          console.log("data.data is array?:", Array.isArray(data.data));
        }
        console.log("Response structure:");
        console.log(JSON.stringify(data, null, 2));
      }

      // If resultData is not an array, wrap it in an array
      if (!Array.isArray(resultData)) {
        if (resultData && typeof resultData === "object") {
          resultData = [resultData];
        } else {
          resultData = [];
        }
      }

      console.log("Final resultData before setState:", resultData);
      console.log("Final resultData length:", resultData.length);

      setReportData(resultData);
      setShowReport(true);

      // Scroll to report after a small delay
      setTimeout(() => {
        if (reportContainerRef.current) {
          reportContainerRef.current.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    } catch (err: any) {
      setReportError(
        "Error fetching report: " + (err.message || err.toString())
      );
      console.error("Full error details:", err);
    } finally {
      setReportLoading(false);
    }
  };

  const formatCurrency = (value: number): string => {
    if (value === null || value === undefined) return "0.00";
    const absValue = Math.abs(value);
    const formatted = absValue.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return value < 0 ? `(${formatted})` : formatted;
  };

  const downloadAsCSV = () => {
    if (!reportData.length && !touData.length) return;

    const selectedReportLabel =
      reportTypeOptions.find((r) => r.value === formData.reportType)?.label ||
      "Report";
    const billCycleDisplay =
      billCycleOptions.find((b) => b.code === formData.billCycle)?.display ||
      formData.billCycle;

    let csvContent = [
      `${selectedReportLabel} Report`,
      `Bill Cycle: ${formData.billCycle} - ${billCycleDisplay}`,
      `Generated: ${new Date().toLocaleDateString()}`,
      "",
    ];

    // Main data section
    if (reportData.length > 0) {
      let headers: string[] = [];
      let rows: string[] = [];

      if (formData.reportType === "ordinary") {
        // Check if the ordinary data has range field (meaning it's block-wise structure)
        if (reportData[0]?.range !== undefined) {
          headers = [
            "Tariff",
            "Range",
            "No of Accounts",
            "KWH Units",
            "KWH Charge",
            "Fixed Charge",
            "Tax",
            "FAC",
            "Payments",
          ];
          rows = reportData.map((row) =>
            [
              row.tariff,
              row.range || "",
              row.noAccts,
              row.kwhUnits,
              formatCurrency(row.kwhCharge),
              formatCurrency(row.fixedCharge),
              formatCurrency(row.tax || row.taxCharge || 0),
              formatCurrency(row.fac || row.facCharge || 0),
              formatCurrency(row.Charge),
            ]
              .map((cell) => `"${cell}"`)
              .join(",")
          );
        } else {
          // Traditional ordinary structure
          headers = [
            "Tariff",
            "No of Accounts",
            "KWH Units",
            "KWH Charge",
            "Fixed Charge",
            "Tax",
            "Fac",
            "Payments",
          ];
          rows = reportData.map((row) =>
            [
              row.tariff?.trim(),
              row.noAccts,
              row.kwhUnits,
              formatCurrency(row.kwhCharge),
              formatCurrency(row.fixedCharge),
              formatCurrency(row.tax || row.taxCharge || 0),
              formatCurrency(row.fac || row.facCharge || 0),
              formatCurrency(row.Charge),
            ]
              .map((cell) => `"${cell}"`)
              .join(",")
          );
        }
      } else if (formData.reportType === "bulk") {
        headers = [
          "Tariff",
          "No of Accounts",
          "KWO Units",
          "KWD Units",
          "KWP Units",
          "KWH Units",
          "KVA Units",
          "KWO Charge",
          "KWD Charge",
          "KWP Charge",
          "KWH Charge",
          "KVA Charge",
          "Fixed Charge",
          "Tax Charge",
          "FAC Charge",
          "Payments",
        ];
        rows = reportData.map((row) =>
          [
            row.tariff,
            row.noAccts,
            row.kwoUnits,
            row.kwdUnits,
            row.kwpUnits,
            row.kwhUnits,
            row.kvaUnits,
            formatCurrency(row.kwoCharge),
            formatCurrency(row.kwdCharge),
            formatCurrency(row.kwpCharge),
            formatCurrency(row.kwhCharge),
            formatCurrency(row.kvaCharge),
            formatCurrency(row.fixedCharge),
            formatCurrency(row.taxCharge),
            formatCurrency(row.facCharge),
            formatCurrency(row.payments),
          ]
            .map((cell) => `"${cell}"`)
            .join(",")
        );
      } else if (formData.reportType === "ordinary-block") {
        headers = [
          "Tariff",
          "Range",
          "No of Accounts",
          "KWH Units",
          "KWH Charge",
          "Fixed Charge",
          "Tax",
          "FAC",
          "Payments",
        ];
        rows = reportData.map((row) =>
          [
            row.tariff,
            row.range || "",
            row.noAccts,
            row.kwhUnits,
            formatCurrency(row.kwhCharge),
            formatCurrency(row.fixedCharge),
            formatCurrency(row.tax || row.taxCharge || 0),
            formatCurrency(row.fac || row.facCharge || 0),
            formatCurrency(row.payments),
          ]
            .map((cell) => `"${cell}"`)
            .join(",")
        );
      }

      csvContent.push(headers.map((h) => `"${h}"`).join(","));
      csvContent.push(...rows);
    }

    // Add TOU data if available
    if (touData.length > 0) {
      csvContent.push("");
      csvContent.push('"TOU"');
      csvContent.push(
        '"Tariff","KWHP Units","KWHD Units","KWHO Units","KWHP Charge","KWHD Charge","KWHO Charge"'
      );
      csvContent.push(
        ...touData.map((row) =>
          [
            row.tariff,
            row.kwhpUnits,
            row.kwhdUnits,
            row.kwhoUnits,
            formatCurrency(row.kwhpCharge),
            formatCurrency(row.kwhdCharge),
            formatCurrency(row.kwhoCharge),
          ]
            .map((cell) => `"${cell}"`)
            .join(",")
        )
      );
    }

    try {
      const blob = new Blob([csvContent.join("\n")], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      const fileDescriptor = `${selectedReportLabel.replace(/\s+/g, "")}_Cycle${
        formData.billCycle
      }`;

      link.setAttribute("href", url);
      link.setAttribute("download", `${fileDescriptor}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (error) {
      console.error("Error generating CSV:", error);
      alert("Failed to export CSV");
    }
  };

  const printPDF = () => {
    if (!printRef.current) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const selectedReportLabel =
      reportTypeOptions.find((r) => r.value === formData.reportType)?.label ||
      "Report";
    const billCycleDisplay =
      billCycleOptions.find((b) => b.code === formData.billCycle)?.display ||
      formData.billCycle;

    const headerContent = `Bill Cycle: <span class="bold">${formData.billCycle} - ${billCycleDisplay}</span>`;

    printWindow.document.write(`
      <html>
        <head>
          <title>${selectedReportLabel} Report</title>
          <style>
            body { font-family: Arial; font-size: 10px; margin: 10mm; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 2px 4px; border: 1px solid #ddd; font-size: 10px;}
            .text-left { text-align: left; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .header { 
              font-weight: bold; 
              margin-bottom: 5px; 
              color: #7A0000;
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
              @bottom-left {
                content: "Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()} | Reporting@2026";
                font-size: 9px;
                color: #666;
                font-family: Arial;
              }
              @bottom-right {
                content: "Page " counter(page) " of " counter(pages);
                font-size: 9px;
                color: #666;
                font-family: Arial;
              }
            }
            .total-row { 
              font-weight: bold; 
              background-color: #f5f5f5; 
            }
            th { 
              background-color: #f0f0f0; 
              font-weight: bold; 
              text-align: center;

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
          <div class="header">${selectedReportLabel.toUpperCase()} REPORT</div>
          <div class="subheader">
            ${headerContent}
          </div>
          ${printRef.current.innerHTML}
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

  const handleClose = () => {
    setShowReport(false);
    setReportData([]);
    setTouData([]);
    setReportError(null);
  };

  const renderForm = () => (
    <>
      <h2 className={`text-xl font-bold mb-6 ${maroon}`}>
        Tariff Block Wise Consumption
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tariff Type Radio Buttons */}
        <div className="flex flex-col">
          <label className={`${maroon} text-xs font-medium mb-2`}>
            Tariff Type
          </label>
          <div className="space-y-2">
            {reportTypeOptions.map((type) => (
              <label key={type.value} className="flex items-center text-xs">
                <input
                  type="radio"
                  name="reportType"
                  value={type.value}
                  checked={formData.reportType === type.value}
                  onChange={handleInputChange}
                  className="mr-2 text-[#7A0000] focus:ring-[#7A0000]"
                />
                {type.label}
              </label>
            ))}
          </div>
        </div>

        {/* Bill Cycle Dropdown */}
        <div className="flex flex-col">
          <label className={`${maroon} text-xs font-medium mb-1`}>
            Bill Cycle
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
          <p className="text-xs text-gray-500 mt-1">
            {formData.reportType === "bulk"
              ? "Bill cycles filtered to 400 and below for Bulk reports"
              : "Select a bill cycle to view report data"}
          </p>
        </div>
      </div>

      {/* Search Button */}
      <div className="w-full mt-6 flex justify-end">
        <button
          onClick={handleSearch}
          disabled={
            reportLoading || !formData.billCycle || !formData.reportType
          }
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
            "Generate Report"
          )}
        </button>
      </div>
    </>
  );

  const renderReportTable = () => {
    if (!reportData.length && !reportLoading && !reportError) return null;

    return (
      <div className="mt-8">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold text-[#7A0000]">
            {
              reportTypeOptions.find((r) => r.value === formData.reportType)
                ?.label
            }{" "}
            Report
          </h3>
          <div className="flex gap-2 mt-2">
            {/* <button 
              onClick={downloadAsCSV}
              className="flex items-center gap-1 px-3 py-1.5 border border-blue-400 text-blue-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-blue-50 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
              disabled={!reportData.length}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              CSV
            </button>
            <button 
              onClick={printPDF}
              className="flex items-center gap-1 px-3 py-1.5 border border-green-400 text-green-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-green-50 hover:text-green-800 focus:outline-none focus:ring-2 focus:ring-green-200 transition"
              disabled={!reportData.length}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2z" />
              </svg>
              PDF
            </button> */}
            <button
              onClick={downloadAsCSV}
              className="flex items-center gap-1 px-3 py-1.5 border border-blue-400 text-blue-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-blue-50 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
              disabled={!reportData.length}
            >
              <FaFileDownload className="w-3 h-3" /> CSV
            </button>
            <button
              onClick={printPDF}
              className="flex items-center gap-1 px-3 py-1.5 border border-green-400 text-green-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-green-50 hover:text-green-800 focus:outline-none focus:ring-2 focus:ring-green-200 transition"
              disabled={!reportData.length}
            >
              <FaPrint className="w-3 h-3" /> PDF
            </button>
            <button
              onClick={handleClose}
              className="px-4 py-1.5 bg-[#7A0000] hover:bg-[#A52A2A] text-xs rounded-md text-white flex items-center"
            >
              Back to Form
            </button>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Bill Cycle: {formData.billCycle} -{" "}
          {billCycleOptions.find((b) => b.code === formData.billCycle)?.display}
        </p>

        {reportLoading && (
          <div className="text-center py-8 text-[#7A0000] text-sm animate-pulse">
            Loading report data...
          </div>
        )}

        {reportError && (
          <div className="mt-6 text-red-600 bg-red-100 border border-red-300 p-4 rounded text-sm">
            <strong>Error:</strong> {reportError}
          </div>
        )}

        {!reportLoading && !reportError && reportData.length > 0 && (
          <div
            className="overflow-x-auto border border-gray-300 rounded-lg"
            ref={printRef}
          >
            {/* Ordinary Report Table */}
            {formData.reportType === "ordinary" && (
              <>
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-2 py-1 text-center">
                        Tariff
                      </th>
                      <th className="border border-gray-300 px-2 py-1 text-center">
                        No Accts
                      </th>
                      <th className="border border-gray-300 px-2 py-1 text-center">
                        KWH Units
                      </th>
                      <th className="border border-gray-300 px-2 py-1 text-center">
                        KWH Charge Rs.
                      </th>
                      <th className="border border-gray-300 px-2 py-1 text-center">
                        Fixed Charge
                      </th>
                      <th className="border border-gray-300 px-2 py-1 text-center">
                        Tax
                      </th>
                      <th className="border border-gray-300 px-2 py-1 text-center">
                        Fac
                      </th>
                      <th className="border border-gray-300 px-2 py-1 text-center">
                        Payments
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map((row, index) => (
                      <tr
                        key={index}
                        className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      >
                        <td className="border border-gray-300 px-2 py-1">
                          {row.tariff}
                        </td>
                        <td className="border border-gray-300 px-2 py-1 text-right">
                          {parseInt(row.noAccts || 0).toLocaleString()}
                        </td>
                        <td className="border border-gray-300 px-2 py-1 text-right">
                          {parseFloat(row.kwhUnits || 0).toLocaleString()}
                        </td>
                        <td className="border border-gray-300 px-2 py-1 text-right">
                          {formatCurrency(row.kwhCharge)}
                        </td>
                        <td className="border border-gray-300 px-2 py-1 text-right">
                          {formatCurrency(row.fixedCharge)}
                        </td>
                        <td className="border border-gray-300 px-2 py-1 text-right">
                          {formatCurrency(row.tax || row.taxCharge || 0)}
                        </td>
                        <td className="border border-gray-300 px-2 py-1 text-right">
                          {formatCurrency(row.fac || row.facCharge || 0)}
                        </td>
                        <td className="border border-gray-300 px-2 py-1 text-right">
                          {formatCurrency(row.Charge)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* TOU Table for Ordinary Reports */}
                {touData.length > 0 && (
                  <div className="mt-8">
                    <h4 className="text-md font-semibold text-[#7A0000] mb-4">
                      TOU
                    </h4>
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-gray-300 px-2 py-1 text-center">
                            Tariff
                          </th>
                          <th className="border border-gray-300 px-2 py-1 text-center">
                            KWHP Units
                          </th>
                          <th className="border border-gray-300 px-2 py-1 text-center">
                            KWHD Units
                          </th>
                          <th className="border border-gray-300 px-2 py-1 text-center">
                            KWHO Units
                          </th>
                          <th className="border border-gray-300 px-2 py-1 text-center">
                            KWHP Charge
                          </th>
                          <th className="border border-gray-300 px-2 py-1 text-center">
                            KWHD Charge
                          </th>
                          <th className="border border-gray-300 px-2 py-1 text-center">
                            KWHO Charge
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {touData.map((row, index) => (
                          <tr
                            key={index}
                            className={
                              index % 2 === 0 ? "bg-white" : "bg-gray-50"
                            }
                          >
                            <td className="border border-gray-300 px-2 py-1">
                              {row.tariff}
                            </td>
                            <td className="border border-gray-300 px-2 py-1 text-right">
                              {parseFloat(
                                row.kwhpUnits || "0"
                              ).toLocaleString()}
                            </td>
                            <td className="border border-gray-300 px-2 py-1 text-right">
                              {parseFloat(
                                row.kwhdUnits || "0"
                              ).toLocaleString()}
                            </td>
                            <td className="border border-gray-300 px-2 py-1 text-right">
                              {parseFloat(
                                row.kwhoUnits || "0"
                              ).toLocaleString()}
                            </td>
                            <td className="border border-gray-300 px-2 py-1 text-right">
                              {formatCurrency(row.kwhpCharge)}
                            </td>
                            <td className="border border-gray-300 px-2 py-1 text-right">
                              {formatCurrency(row.kwhdCharge)}
                            </td>
                            <td className="border border-gray-300 px-2 py-1 text-right">
                              {formatCurrency(row.kwhoCharge)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* Bulk Report Table */}
            {formData.reportType === "bulk" && (
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-2 py-1 text-center">
                      Tariff
                    </th>
                    <th className="border border-gray-300 px-2 py-1 text-center">
                      No Accts
                    </th>
                    <th className="border border-gray-300 px-2 py-1 text-center">
                      KWO Units
                    </th>
                    <th className="border border-gray-300 px-2 py-1 text-center">
                      KWD Units
                    </th>
                    <th className="border border-gray-300 px-2 py-1 text-center">
                      KWP Units
                    </th>
                    <th className="border border-gray-300 px-2 py-1 text-center">
                      KWH Units
                    </th>
                    <th className="border border-gray-300 px-2 py-1 text-center">
                      KVA Units
                    </th>
                    <th className="border border-gray-300 px-2 py-1 text-center">
                      KWO Charge
                    </th>
                    <th className="border border-gray-300 px-2 py-1 text-center">
                      KWD Charge
                    </th>
                    <th className="border border-gray-300 px-2 py-1 text-center">
                      KWP Charge
                    </th>
                    <th className="border border-gray-300 px-2 py-1 text-center">
                      KWH Charge
                    </th>
                    <th className="border border-gray-300 px-2 py-1 text-center">
                      KVA Charge
                    </th>
                    <th className="border border-gray-300 px-2 py-1 text-center">
                      Fixed Charge
                    </th>
                    <th className="border border-gray-300 px-2 py-1 text-center">
                      Tax Charge
                    </th>
                    <th className="border border-gray-300 px-2 py-1 text-center">
                      FAC Charge
                    </th>
                    <th className="border border-gray-300 px-2 py-1 text-center">
                      Payments
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((row, index) => (
                    <tr
                      key={index}
                      className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                    >
                      <td className="border border-gray-300 px-2 py-1">
                        {row.tariff}
                      </td>
                      <td className="border border-gray-300 px-2 py-1 text-right">
                        {parseInt(row.noAccts || 0).toLocaleString()}
                      </td>
                      <td className="border border-gray-300 px-2 py-1 text-right">
                        {parseFloat(row.kwoUnits || 0).toLocaleString()}
                      </td>
                      <td className="border border-gray-300 px-2 py-1 text-right">
                        {parseFloat(row.kwdUnits || 0).toLocaleString()}
                      </td>
                      <td className="border border-gray-300 px-2 py-1 text-right">
                        {parseFloat(row.kwpUnits || 0).toLocaleString()}
                      </td>
                      <td className="border border-gray-300 px-2 py-1 text-right">
                        {parseFloat(row.kwhUnits || 0).toLocaleString()}
                      </td>
                      <td className="border border-gray-300 px-2 py-1 text-right">
                        {parseFloat(row.kvaUnits || 0).toLocaleString()}
                      </td>
                      <td className="border border-gray-300 px-2 py-1 text-right">
                        {formatCurrency(row.kwoCharge)}
                      </td>
                      <td className="border border-gray-300 px-2 py-1 text-right">
                        {formatCurrency(row.kwdCharge)}
                      </td>
                      <td className="border border-gray-300 px-2 py-1 text-right">
                        {formatCurrency(row.kwpCharge)}
                      </td>
                      <td className="border border-gray-300 px-2 py-1 text-right">
                        {formatCurrency(row.kwhCharge)}
                      </td>
                      <td className="border border-gray-300 px-2 py-1 text-right">
                        {formatCurrency(row.kvaCharge)}
                      </td>
                      <td className="border border-gray-300 px-2 py-1 text-right">
                        {formatCurrency(row.fixedCharge)}
                      </td>
                      <td className="border border-gray-300 px-2 py-1 text-right">
                        {formatCurrency(row.taxCharge)}
                      </td>
                      <td className="border border-gray-300 px-2 py-1 text-right">
                        {formatCurrency(row.facCharge)}
                      </td>
                      <td className="border border-gray-300 px-2 py-1 text-right">
                        {formatCurrency(row.payments)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Ordinary Block Report Table - Fixed to always show block structure */}
            {formData.reportType === "ordinary-block" && (
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-2 py-1 text-center">
                      Tariff
                    </th>
                    <th className="border border-gray-300 px-2 py-1 text-center">
                      Range
                    </th>
                    <th className="border border-gray-300 px-2 py-1 text-center">
                      No Accts
                    </th>
                    <th className="border border-gray-300 px-2 py-1 text-center">
                      KWH Units
                    </th>
                    <th className="border border-gray-300 px-2 py-1 text-center">
                      KWH Charge Rs.
                    </th>
                    <th className="border border-gray-300 px-2 py-1 text-center">
                      Fixed Charge
                    </th>
                    <th className="border border-gray-300 px-2 py-1 text-center">
                      Tax
                    </th>
                    <th className="border border-gray-300 px-2 py-1 text-center">
                      FAC
                    </th>
                    <th className="border border-gray-300 px-2 py-1 text-center">
                      Payments
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((row, index) => (
                    <tr
                      key={index}
                      className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                    >
                      <td className="border border-gray-300 px-2 py-1">
                        {row.tariff}
                      </td>
                      <td className="border border-gray-300 px-2 py-1">
                        {row.range || ""}
                      </td>
                      <td className="border border-gray-300 px-2 py-1 text-right">
                        {parseInt(row.noAccts || 0).toLocaleString()}
                      </td>
                      <td className="border border-gray-300 px-2 py-1 text-right">
                        {parseFloat(row.kwhUnits || 0).toLocaleString()}
                      </td>
                      <td className="border border-gray-300 px-2 py-1 text-right">
                        {formatCurrency(row.kwhCharge)}
                      </td>
                      <td className="border border-gray-300 px-2 py-1 text-right">
                        {formatCurrency(row.fixedCharge)}
                      </td>
                      <td className="border border-gray-300 px-2 py-1 text-right">
                        {formatCurrency(row.tax || row.taxCharge || 0)}
                      </td>
                      <td className="border border-gray-300 px-2 py-1 text-right">
                        {formatCurrency(row.fac || row.facCharge || 0)}
                      </td>
                      <td className="border border-gray-300 px-2 py-1 text-right">
                        {formatCurrency(row.payments)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Show No Data Message */}
        {!reportLoading &&
          !reportError &&
          reportData.length === 0 &&
          showReport && (
            <div className="text-center py-8 text-gray-500 text-sm">
              No data available for the selected bill cycle and report type.
            </div>
          )}
      </div>
    );
  };

  // Main render
  if (loading) {
    return (
      <div
        className={`text-center py-8 ${maroon} text-sm animate-pulse font-sans`}
      >
        Loading bill cycle data...
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
      className={`max-w-7xl mx-auto p-4 bg-white rounded-xl shadow border border-gray-200 text-sm font-sans`}
    >
      {/* Form Section */}
      {!showReport && <>{renderForm()}</>}

      {/* Show any report errors even when form is visible */}
      {!showReport && reportError && (
        <div className="mt-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded text-xs">
          {reportError}
        </div>
      )}

      {/* Report container with scrollable content */}
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

export default TariffBlockWiseConsumption;
