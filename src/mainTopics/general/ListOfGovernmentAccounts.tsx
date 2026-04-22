import React, { useState, useEffect, useCallback } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface Area {
  areaCode: string;
  areaName: string;
}

interface Department {
  departmentCode: string;
  departmentName: string;
}

interface MaxBillCycleModel {
  MaxBillCycle: string;
  ErrorMessage?: string | null;
}

interface GovernmentAccount {
  accountNumber: string;
  customerName: string;
  address: string;
  currentBalance: string;
  kwhCharge: string;
  averageConsumption: string;
  areaName: string;
  departmentName: string;
  billCycle: string;
}

type ReportMode = "area" | "department" | null;

// ─────────────────────────────────────────────────────────────────────────────
// API Base
// ─────────────────────────────────────────────────────────────────────────────
const API_BASE = "http://localhost:44381";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
async function apiFetch<T>(url: string): Promise<{ data: T | null; errorMessage: string | null }> {
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(30000)
    });

    if (!res.ok) {
      if (res.status === 404) {
        throw new Error(`API endpoint not found (404). Please check if the backend is running.`);
      }
      if (res.status === 500) {
        throw new Error(`Database error (500). Please check your database connection.`);
      }
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error(`Expected JSON response but got ${contentType}`);
    }

    return await res.json();
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return { data: null, errorMessage: "Request timeout. Please check your connection." };
    }
    if (err.message.includes('Failed to fetch')) {
      return { data: null, errorMessage: "Cannot connect to server. Please ensure the backend is running on port 44381." };
    }
    return { data: null, errorMessage: err.message };
  }
}

// Helper function to safely parse number from various formats
const parseNumber = (value: any): number => {
  if (value === undefined || value === null || value === "") {
    return 0;
  }
  if (typeof value === 'number') {
    return value;
  }
  const strValue = String(value).replace(/,/g, "");
  const num = parseFloat(strValue);
  return isNaN(num) ? 0 : num;
};

// Helper function to format currency exactly as in old system (2 decimal places with commas)
const formatCurrency = (value: any): string => {
  const num = parseNumber(value);
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

// Helper function to format kWh exactly as in old system
const formatKwh = (value: any): string => {
  const num = parseNumber(value);
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

// Helper function to format consumption as whole number (old system shows whole numbers)
const formatConsumption = (value: any): string => {
  const num = parseNumber(value);
  return Math.floor(num).toLocaleString('en-US');
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
const ListOfGovernmentAccounts: React.FC = () => {
  const maroon = "text-[#7A0000]";
  const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";

  // ── Dropdown data ──────────────────────────────────────────────────────────
  const [areas, setAreas] = useState<Area[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  // ── Form state ─────────────────────────────────────────────────────────────
  const [selectedArea, setSelectedArea] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");

  // ── Loading states ─────────────────────────────────────────────────────────
  const [loadingAreas, setLoadingAreas] = useState(false);
  const [loadingDepts, setLoadingDepts] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);

  // ── Error states ───────────────────────────────────────────────────────────
  const [areaError, setAreaError] = useState("");
  const [deptError, setDeptError] = useState("");
  const [reportError, setReportError] = useState("");

  // ── Report state ───────────────────────────────────────────────────────────
  const [reportData, setReportData] = useState<GovernmentAccount[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [activeReportMode, setActiveReportMode] = useState<ReportMode>(null);
  const [selectedAreaName, setSelectedAreaName] = useState("");
  const [selectedDeptName, setSelectedDeptName] = useState("");

  // ── Which button is currently loading ─────────────────────────────────────
  const [loadingMode, setLoadingMode] = useState<ReportMode>(null);

  // ── Fetch areas on mount ───────────────────────────────────────────────────
  useEffect(() => {
    const fetchAreas = async () => {
      setLoadingAreas(true);
      setAreaError("");
      try {
        const response = await apiFetch<any[]>(`${API_BASE}/api/shared/areas`);
        if (response.errorMessage) {
          setAreaError(response.errorMessage);
        } else if (response.data && Array.isArray(response.data)) {
          setAreas(
            response.data.map((item: any) => ({
              areaCode: item.AreaCode || item.areaCode || "",
              areaName: item.AreaName || item.areaName || "",
            }))
          );
        } else {
          setAreaError("No areas data received from server.");
        }
      } catch (err: any) {
        setAreaError(err.message || "Failed to load areas.");
      } finally {
        setLoadingAreas(false);
      }
    };

    fetchAreas();
  }, []);

  // ── Fetch departments when area changes (matches old website behavior) ─────
  useEffect(() => {
    if (!selectedArea) {
      setDepartments([]);
      setSelectedDepartment("");
      setDeptError("");
      return;
    }

    const fetchDeptsByArea = async () => {
      setLoadingDepts(true);
      setDeptError("");
      try {
        // Try to fetch departments for the selected area
        // This matches the old website pattern where departments are filtered by area
        const response = await apiFetch<any[]>(
          `${API_BASE}/api/government-accounts/departments?areaCode=${encodeURIComponent(selectedArea)}`
        );
        
        console.log("Departments API Response:", response);
        
        if (response.errorMessage) {
          setDeptError(response.errorMessage);
          setDepartments([]);
        } else if (response.data && Array.isArray(response.data)) {
          if (response.data.length === 0) {
            setDeptError("No departments found for the selected area.");
            setDepartments([]);
          } else {
            // Map the response - try different possible field names
            const mappedDepts = response.data.map((item: any) => {
              // Log each item to see structure
              console.log("Department item:", item);
              
              return {
                // Try multiple possible field names for department code
                departmentCode: item.DepartmentCode 
                  || item.departmentCode 
                  || item.Code 
                  || item.code 
                  || item.DeptCode 
                  || item.deptCode 
                  || item.Id 
                  || item.id 
                  || String(item),
                // Try multiple possible field names for department name
                departmentName: item.DepartmentName 
                  || item.departmentName 
                  || item.Name 
                  || item.name 
                  || item.DeptName 
                  || item.deptName 
                  || String(item),
              };
            });
            
            console.log("Mapped departments:", mappedDepts);
            setDepartments(mappedDepts);
          }
        } else {
          setDeptError("No departments data received from server.");
          setDepartments([]);
        }
      } catch (err: any) {
        console.error("Department fetch error:", err);
        setDeptError(err.message || "Failed to load departments.");
        setDepartments([]);
      } finally {
        setLoadingDepts(false);
      }
    };

    fetchDeptsByArea();
  }, [selectedArea]);

  // ── Core fetch ────────────────────────────────────────────────────────────
  const fetchReport = useCallback(
    async (mode: ReportMode) => {
      if (!selectedArea || !mode) return;
      if (mode === "department" && !selectedDepartment) return;

      const areaCodeSnapshot = selectedArea;
      const deptCodeSnapshot = selectedDepartment;

      setLoadingReport(true);
      setLoadingMode(mode);
      setReportError("");

      const areaObj = areas.find((a) => a.areaCode === areaCodeSnapshot);
      const areaNameSnapshot = areaObj?.areaName ?? areaCodeSnapshot;

      let deptNameSnapshot = "";
      if (mode === "department") {
        const deptObj = departments.find((d) => d.departmentCode === deptCodeSnapshot);
        deptNameSnapshot = deptObj?.departmentName ?? deptCodeSnapshot;
      }

      try {
        // Step 1: Get max bill cycle
        const maxBillCycleResponse = await apiFetch<MaxBillCycleModel>(
          `${API_BASE}/api/government-accounts/max-bill-cycle?areaCode=${encodeURIComponent(areaCodeSnapshot)}`
        );

        if (maxBillCycleResponse.errorMessage) {
          setReportError(`Failed to get bill cycle: ${maxBillCycleResponse.errorMessage}`);
          return;
        }

        const maxBillCycle = maxBillCycleResponse.data?.MaxBillCycle;
        if (!maxBillCycle) {
          setReportError("Could not determine the current bill cycle for this area. Please check if the area has any data.");
          return;
        }

        // Step 2: Fetch report data
        let url: string;
        if (mode === "area") {
          url = `${API_BASE}/api/government-accounts/area?areaCode=${encodeURIComponent(areaCodeSnapshot)}&billCycle=${encodeURIComponent(maxBillCycle)}`;
        } else {
          url = `${API_BASE}/api/government-accounts/department?areaCode=${encodeURIComponent(areaCodeSnapshot)}&departmentCode=${encodeURIComponent(deptCodeSnapshot)}&billCycle=${encodeURIComponent(maxBillCycle)}`;
        }

        console.log("Fetching URL:", url);

        const response = await fetch(url, { headers: { Accept: "application/json" } });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const jsonData = await response.json();
        console.log("Raw API Response:", jsonData);

        if (jsonData.errorMessage) {
          setReportError(jsonData.errorMessage);
          return;
        }

        if (!Array.isArray(jsonData.data) || jsonData.data.length === 0) {
          setReportError("No data available for the selected criteria. Please try different selection.");
          return;
        }

        // Map the data with proper number formatting matching old system
        const mappedData = jsonData.data.map((item: any) => {
          // Extract values from various possible field name patterns
          const accountNumber = item.AccountNumber ?? item.accountNumber ?? item.AccountNo ?? "";
          const customerName = item.CustomerName ?? item.customerName ?? item.Customer ?? "";
          const address = item.Address ?? item.address ?? "";

          // Handle balance - could be CurrentBalance, CurrentCharge, or Current kWh Charge Balance
          let rawBalance = item.CurrentBalance ?? item.currentBalance ?? item.CurrentCharge ?? item.currentCharge;
          if (rawBalance === undefined) {
            rawBalance = item["Current kWh Charge Balance"] ?? item.currentKWHChargeBalance;
          }

          // Handle kWh charge - could be KwhCharge, kWhCharge, or Average Consumption from old system mapping
          let rawKwh = item.KwhCharge ?? item.kwhCharge ?? item.KWHCharge ?? item.kwhChargeAmount;
          if (rawKwh === undefined) {
            rawKwh = item["kWh Charge"] ?? item.kwhChargeOld;
          }

          // Handle average consumption
          let rawConsumption = item.AverageConsumption ?? item.averageConsumption ?? item.AvgConsumption;
          if (rawConsumption === undefined) {
            rawConsumption = item["Average Consumption"];
          }

          return {
            accountNumber: String(accountNumber),
            customerName: String(customerName || ""),
            address: String(address || ""),
            currentBalance: formatCurrency(rawBalance),
            kwhCharge: formatKwh(rawKwh),
            averageConsumption: formatConsumption(rawConsumption),
            areaName: item.AreaName ?? item.areaName ?? areaNameSnapshot,
            departmentName: item.DepartmentName ?? item.departmentName ?? deptNameSnapshot,
            billCycle: item.BillCycle ?? item.billCycle ?? maxBillCycle,
          };
        });

        console.log("Mapped data sample:", mappedData.slice(0, 3));

        setReportData(mappedData);
        setSelectedAreaName(areaNameSnapshot);
        setSelectedDeptName(deptNameSnapshot);
        setActiveReportMode(mode);
        setHasSearched(true);

      } catch (err: any) {
        console.error("Fetch error:", err);
        setReportError(err.message || "Failed to fetch report data. Please try again.");
      } finally {
        setLoadingReport(false);
        setLoadingMode(null);
      }
    },
    [selectedArea, selectedDepartment, areas, departments]
  );

  // ── Derived totals ────────────────────────────────────────────────────────
  const totalBalance = reportData.reduce((sum, r) => {
    return sum + parseNumber(r.currentBalance);
  }, 0);

  const totalKwh = reportData.reduce((sum, r) => {
    return sum + parseNumber(r.kwhCharge);
  }, 0);

  // ── Shared UI helpers ─────────────────────────────────────────────────────
  const selectCls =
    "w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent";

  const loadingPlaceholder = (msg: string) => (
    <div className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-gray-50 text-gray-500">
      {msg}
    </div>
  );

  const errorPlaceholder = (msg: string) => (
    <div className="w-full px-2 py-1.5 text-xs border border-red-300 rounded-md bg-red-50 text-red-600">
      {msg}
    </div>
  );

  const spinnerIcon = (
    <svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );

  const handleBackToForm = () => {
    setHasSearched(false);
    setReportData([]);
    setReportError("");
    setActiveReportMode(null);
  };

  const downloadTextFile = (filename: string, content: string, mime = "text/plain;charset=utf-8") => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const escapeCsv = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const handleExportCsv = () => {
    if (!reportData || reportData.length === 0) {
      setReportError("No data to export.");
      return;
    }

    const header = [
      "Account No",
      "Customer Name",
      "Address",
      "Current Balance",
      "kWh Charge",
      "Avg Consumption",
      "Area",
      "Department",
      "Bill Cycle",
    ];

    const rows = reportData.map((r) => [
      r.accountNumber,
      r.customerName,
      r.address,
      r.currentBalance,
      r.kwhCharge,
      r.averageConsumption,
      r.areaName,
      r.departmentName,
      r.billCycle,
    ]);

    const csv = [header, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\r\n");
    const filename = `government-accounts_${selectedArea || "area"}_${activeReportMode || "report"}_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    downloadTextFile(filename, csv, "text/csv;charset=utf-8");
  };

  const handleExportPdf = () => {
    if (!reportData || reportData.length === 0) {
      setReportError("No data to export.");
      return;
    }

    const title = `List of Government Accounts — ${activeReportMode === "area" ? "Area Report" : "Department Report"}`;
    const subtitle = `Area: ${selectedAreaName}${activeReportMode === "department" && selectedDeptName ? ` | Department: ${selectedDeptName}` : ""}`;

    const rowsHtml = reportData
      .map(
        (r) => `<tr>
           <td style="border:1px solid #999;padding:6px 8px;">${escapeCsv(r.accountNumber)}</td>
           <td style="border:1px solid #999;padding:6px 8px;">${escapeCsv(r.customerName)}</td>
           <td style="border:1px solid #999;padding:6px 8px;">${escapeCsv(r.address)}</td>
           <td style="border:1px solid #999;padding:6px 8px;text-align:right">${r.currentBalance}</td>
           <td style="border:1px solid #999;padding:6px 8px;text-align:right">${r.kwhCharge}</td>
           <td style="border:1px solid #999;padding:6px 8px;text-align:right">${r.averageConsumption}</td>
        </tr>`
      )
      .join("");

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; color: #111; }
    h1 { font-size: 16px; margin: 0 0 6px; }
    .sub { font-size: 12px; margin: 0 0 14px; color: #444; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th, td { border: 1px solid #999; padding: 6px 8px; vertical-align: top; }
    th { background: #eef6f8; }
    .totals { margin-top: 12px; font-size: 12px; }
    @page { size: A4 landscape; margin: 12mm; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p class="sub">${subtitle}</p>
  <table>
    <thead>
      <tr>
        <th>Account No</th>
        <th>Customer Name</th>
        <th>Address</th>
        <th>Current Balance</th>
        <th>kWh Charge</th>
        <th>Avg Consumption</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>
  <div class="totals">
    <div><strong>Total Current Balance:</strong> ${formatCurrency(totalBalance)}</div>
    <div><strong>Total kWh Charge:</strong> ${formatKwh(totalKwh)}</div>
  </div>
</body>
</html>`;

    const w = window.open("", "_blank");
    if (!w) {
      setReportError("Popup blocked. Please allow popups to export PDF.");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => {
      w.print();
      setTimeout(() => w.close(), 500);
    }, 250);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      {/* Connection Status Indicator */}
      {(areaError || deptError) && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-yellow-800">
              ⚠️ Database Connection Issues Detected
            </span>
          </div>
          <p className="text-xs text-yellow-700 mt-1">
            Please ensure your backend API is running on port 44381 and the database is properly configured.
          </p>
        </div>
      )}

      {/* ── FORM ──────────────────────────────────────────────────────────── */}
      {!hasSearched && (
        <>
          <div className="mb-6">
            <h2 className={`text-xl font-bold ${maroon}`}>List of Government Accounts</h2>
            <p className="text-sm text-gray-500 mt-1">
              View and export government customer accounts with current balances and consumption details
            </p>
          </div>

          <div className="space-y-5">
            {/* ── Area row ─────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div className="flex flex-col">
                <label className={`text-xs font-medium mb-1 ${maroon}`}>
                  Area: <span className="text-red-600">*</span>
                </label>
                {loadingAreas
                  ? loadingPlaceholder("Loading areas...")
                  : areaError
                    ? errorPlaceholder(areaError)
                    : (
                      <select
                        value={selectedArea}
                        onChange={(e) => {
                          setSelectedArea(e.target.value);
                          setSelectedDepartment(""); // Reset department when area changes
                        }}
                        className={selectCls}
                      >
                        <option value="">Select Area</option>
                        {areas.map((area) => (
                          <option key={area.areaCode} value={area.areaCode}>
                            {area.areaCode} - {area.areaName}
                          </option>
                        ))}
                      </select>
                    )}
              </div>

              <div>
                <button
                  onClick={() => fetchReport("area")}
                  disabled={loadingReport || !selectedArea}
                  className={`px-4 py-1.5 rounded-md font-medium text-xs shadow transition-opacity
                    ${maroonGrad} text-white
                    ${loadingReport || !selectedArea ? "opacity-50 cursor-not-allowed" : "hover:opacity-90"}`}
                >
                  {loadingMode === "area" ? (
                    <span className="flex items-center gap-2">{spinnerIcon} Loading...</span>
                  ) : "View All Govt. Customers in Above Area"}
                </button>
              </div>
            </div>

            {/* ── Department row ────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div className="flex flex-col">
                <label className={`text-xs font-medium mb-1 ${maroon}`}>
                  Department: <span className="text-red-600">*</span>
                </label>
                {!selectedArea ? (
                  <div className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-gray-50 text-gray-400">
                    Please select an area first
                  </div>
                ) : loadingDepts ? (
                  loadingPlaceholder("Loading departments...")
                ) : deptError ? (
                  errorPlaceholder(deptError)
                ) : departments.length === 0 ? (
                  <div className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-gray-50 text-gray-500">
                    No departments available for selected area
                  </div>
                ) : (
                  <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className={selectCls}
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept.departmentCode} value={dept.departmentCode}>
                        {dept.departmentCode} - {dept.departmentName}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <button
                  onClick={() => fetchReport("department")}
                  disabled={loadingReport || !selectedArea || !selectedDepartment}
                  className={`px-4 py-1.5 rounded-md font-medium text-xs shadow transition-opacity
                    ${maroonGrad} text-white
                    ${loadingReport || !selectedArea || !selectedDepartment ? "opacity-50 cursor-not-allowed" : "hover:opacity-90"}`}
                >
                  {loadingMode === "department" ? (
                    <span className="flex items-center gap-2">{spinnerIcon} Loading...</span>
                  ) : "View Customers in Above Area/Dept"}
                </button>
              </div>
            </div>
          </div>

          {reportError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {reportError}
            </div>
          )}
        </>
      )}

      {/* ── REPORT ────────────────────────────────────────────────────────── */}
      {hasSearched && (
        <div>
          {/* Report Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
            <div>
              <h2 className={`text-xl font-bold ${maroon}`}>
                List of Government Accounts —{" "}
                {activeReportMode === "area" ? "Area Report" : "Department Report"}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Area: <strong>{selectedAreaName}</strong>
                {activeReportMode === "department" && selectedDeptName && (
                  <> | Department: <strong>{selectedDeptName}</strong></>
                )}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 mt-2 md:mt-0">
              <button
                onClick={handleExportCsv}
                disabled={!reportData || reportData.length === 0}
                className={`flex items-center gap-1 px-3 py-1.5 border border-blue-400 rounded-md text-xs font-medium shadow-sm
                  ${!reportData || reportData.length === 0 ? "text-blue-300 bg-gray-50 cursor-not-allowed" : "text-blue-700 bg-white hover:bg-blue-50"}`}
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5l2 2h5a2 2 0 012 2v12a2 2 0 01-2 2z" />
                </svg>
                CSV
              </button>
              <button
                onClick={handleExportPdf}
                disabled={!reportData || reportData.length === 0}
                className={`flex items-center gap-1 px-3 py-1.5 border border-green-400 rounded-md text-xs font-medium shadow-sm
                  ${!reportData || reportData.length === 0 ? "text-green-300 bg-gray-50 cursor-not-allowed" : "text-green-700 bg-white hover:bg-green-50"}`}
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                PDF
              </button>
              <button
                onClick={handleBackToForm}
                className="px-4 py-1.5 bg-[#7A0000] hover:bg-[#A52A2A] text-xs rounded-md text-white"
              >
                 Back to Form
              </button>
            </div>
          </div>

          

          {/* Table */}
          <div className="overflow-x-auto max-h-[calc(100vh-350px)] border border-gray-300 rounded-lg">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-[#b0e0e8] text-gray-800 sticky top-0">
                  <th className="border border-gray-300 px-2 py-2 text-center font-bold">Account No</th>
                  <th className="border border-gray-300 px-2 py-2 text-center font-bold">Customer</th>
                  <th className="border border-gray-300 px-2 py-2 text-center font-bold">Address</th>
                  <th className="border border-gray-300 px-2 py-2 text-center font-bold">Current Balance</th>
                  <th className="border border-gray-300 px-2 py-2 text-center font-bold">kWh Charge</th>
                  <th className="border border-gray-300 px-2 py-2 text-center font-bold">Average Consumption</th>
                </tr>
              </thead>

              <tbody>
                {reportData.map((r, i) => (
                  <tr key={`${r.accountNumber}-${i}`} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="border border-gray-300 px-2 py-1 font-mono text-center">
                      {r.accountNumber}
                    </td>
                    <td className="border border-gray-300 px-2 py-1 max-w-[180px] truncate" title={r.customerName}>
                      {r.customerName}
                    </td>
                    <td className="border border-gray-300 px-2 py-1 max-w-[200px] truncate" title={r.address}>
                      {r.address}
                    </td>
                    <td className="border border-gray-300 px-2 py-1 text-right font-mono">
                      {r.currentBalance}
                    </td>
                    <td className="border border-gray-300 px-2 py-1 text-right font-mono">
                      {r.kwhCharge}
                    </td>
                    <td className="border border-gray-300 px-2 py-1 text-right font-mono">
                      {r.averageConsumption}
                    </td>
                  </tr>
                ))}
              </tbody>
              
            </table>
          </div>

          {reportError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {reportError}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ListOfGovernmentAccounts;