import React, { useState, useEffect, useRef } from "react";
import { FaFileDownload, FaPrint, FaArrowLeft } from "react-icons/fa";

interface Province {
  ProvinceCode: string;
  ProvinceName: string;
}

interface Division {
  RegionCode: string;
}

interface CustomerOutstandingResult {
  accountNo?: string;
  accountNumber?: string;
  customerName?: string;
  name?: string;
  address?: string;
  province?: string;
  region?: string;
  division?: string;
  monthsInArrears?: number;
  arrearsMonths?: number;
  outstandingBalance?: number;
  balance?: number;
}

const CustomersHighestOutstanding: React.FC = () => {
  const [scope, setScope] = useState<"Province" | "Division">("Province");
  const [selectedCode, setSelectedCode] = useState<string>("");
  const [monthsInArrears, setMonthsInArrears] = useState<number>(5);
  const [outstandingBalance, setOutstandingBalance] = useState<number>(50000);

  const [provinces, setProvinces] = useState<Province[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);

  const [isLoadingProvinces, setIsLoadingProvinces] = useState(false);
  const [isLoadingDivisions, setIsLoadingDivisions] = useState(false);
  const [provinceError, setProvinceError] = useState<string | null>(null);
  const [divisionError, setDivisionError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<CustomerOutstandingResult[] | null>(null);

  const printRef = useRef<HTMLDivElement>(null);

  const maroon = "text-[#7A0000]";
  const maroonBg = "bg-[#7A0000]";
  const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";

  // Fetch Provinces
  useEffect(() => {
    const fetchProvinces = async () => {
      setIsLoadingProvinces(true);
      setProvinceError(null);
      try {
        const res = await fetch("/misapi/api/ordinary/province", {
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const provData = data.data || [];
        setProvinces(provData);
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        setProvinceError(errorMsg || "Failed to load provinces");
      } finally {
        setIsLoadingProvinces(false);
      }
    };
    fetchProvinces();
  }, []);

  // Fetch Divisions (Regions)
  useEffect(() => {
    const fetchDivisions = async () => {
      setIsLoadingDivisions(true);
      setDivisionError(null);
      try {
        const res = await fetch("/misapi/api/ordinary/region", {
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const divData = data.data || [];
        setDivisions(divData);
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        setDivisionError(errorMsg || "Failed to load divisions");
      } finally {
        setIsLoadingDivisions(false);
      }
    };
    fetchDivisions();
  }, []);

  // Sync selectedCode when scope changes or list loads
  useEffect(() => {
    if (scope === "Province" && provinces.length > 0) {
      if (!selectedCode || !provinces.some((p) => p.ProvinceCode === selectedCode)) {
        setSelectedCode(provinces[0].ProvinceCode);
      }
    } else if (scope === "Division" && divisions.length > 0) {
      if (!selectedCode || !divisions.some((d) => d.RegionCode === selectedCode)) {
        setSelectedCode(divisions[0].RegionCode);
      }
    } else {
      setSelectedCode("");
    }
  }, [scope, provinces, divisions, selectedCode]);

  const handleViewReport = async () => {
    if (!selectedCode) {
      setError(`Please select a ${scope}.`);
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const payload = {
        Scope: scope,
        ProvinceCode: scope === "Province" ? selectedCode : "",
        RegionCode: scope === "Division" ? selectedCode : "",
        MonthsInArrears: Number(monthsInArrears),
        OutstandingBalance: Number(outstandingBalance),
      };

      const response = await fetch("/misapi/api/collection/highest-outstanding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      const payloadResponse = await response.json();

      if (!response.ok || payloadResponse?.errorMessage) {
        throw new Error(payloadResponse?.errorMessage || "Failed to fetch report data");
      }

      const backendData = payloadResponse?.data;
      if (!backendData) {
        throw new Error("No data returned from server");
      }

      setResults(backendData);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg || "Failed to fetch report");
    } finally {
      setLoading(false);
    }
  };

  const getSelectedName = () => {
    if (scope === "Province") {
      const p = provinces.find((prov) => prov.ProvinceCode === selectedCode);
      return p ? `${p.ProvinceCode} - ${p.ProvinceName}` : selectedCode;
    } else {
      const d = divisions.find((div) => div.RegionCode === selectedCode);
      return d ? d.RegionCode : selectedCode;
    }
  };

  const handlePrint = () => {
    if (!printRef.current) return;
    const printWindow = window.open("", "_blank", "width=1200,height=800");
    if (!printWindow) return;

    const tableEl = printRef.current.querySelector("table");
    const tableHTML = tableEl ? tableEl.outerHTML : printRef.current.innerHTML;

    printWindow.document.write(`
      <html>
        <head>
          <title>Customers with Highest Outstanding Balance (Ordinary)</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { padding: 6px 8px; border: 1px solid #d1d5db; text-align: left; }
            th { background-color: #f0f0f0; font-weight: bold; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .header { font-weight: bold; margin-bottom: 5px; color: #7A0000; font-size: 16px; }
            .subheader { margin-bottom: 12px; font-size: 12px; }
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
          </style>
        </head>
        <body>
          <div class="header">Customers with Highest Outstanding Balance (Ordinary)</div>
          <div class="subheader">
            Scope: <b>${scope} (${getSelectedName()})</b> &nbsp;&nbsp;&nbsp;
            Min Months in Arrears: <b>${monthsInArrears}</b> &nbsp;&nbsp;&nbsp;
            Min Outstanding Balance: <b>LKR ${outstandingBalance.toLocaleString()}</b>
          </div>
          ${tableHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const downloadCSV = () => {
    if (!results || results.length === 0) return;

    const rows: string[] = [];
    rows.push("Customers with Highest Outstanding Balance (Ordinary)");
    rows.push(`Scope: ${scope} (${getSelectedName()})`);
    rows.push(`Min Months in Arrears: ${monthsInArrears}`);
    rows.push(`Min Outstanding Balance: ${outstandingBalance}`);
    rows.push("");
    rows.push("Rank,Account Number,Customer Name,Address,Province/Division,Months in Arrears,Outstanding Balance (LKR)");

    results.forEach((r, idx) => {
      const accountNo = r.accountNo || r.accountNumber || "";
      const name = r.customerName || r.name || "";
      const address = r.address || "";
      const loc = r.province || r.region || r.division || "";
      const months = r.monthsInArrears ?? r.arrearsMonths ?? 0;
      const balance = r.outstandingBalance ?? r.balance ?? 0;

      rows.push(
        `${idx + 1},"${accountNo}","${name.replace(/"/g, '""')}","${address.replace(/"/g, '""')}","${loc}",${months},${balance}`
      );
    });

    const csv = rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `HighestOutstanding_${scope}_${selectedCode}.csv`;
    a.click();
  };

  return (
    <div className="max-w-7xl mx-auto p-4 bg-white rounded-xl shadow border border-gray-200 text-sm font-sans max-h-[82vh] overflow-y-auto">
      {!results && (
        <>
          <h2 className={`text-xl font-bold mb-6 ${maroon}`}>
            Customers with Highest Outstanding Balance (Ordinary)
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-xs">{error}</p>
            </div>
          )}

          <div className="border border-gray-200 rounded-xl p-4 bg-white shadow mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <div className="flex flex-col gap-4">
                {/* Scope Radio Toggles */}
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 w-fit">
                    <input
                      type="radio"
                      name="scope"
                      value="Province"
                      checked={scope === "Province"}
                      onChange={() => setScope("Province")}
                      className="w-4 h-4 text-[#7A0000] focus:ring-[#7A0000] border-gray-300"
                    />
                    <span className="font-medium">Province</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 w-fit">
                    <input
                      type="radio"
                      name="scope"
                      value="Division"
                      checked={scope === "Division"}
                      onChange={() => setScope("Division")}
                      className="w-4 h-4 text-[#7A0000] focus:ring-[#7A0000] border-gray-300"
                    />
                    <span className="font-medium">Division</span>
                  </label>
                </div>

                {/* Dropdown for Province or Division */}
                <div className="flex flex-col">
                  <label className={`${maroon} text-xs font-medium mb-1`}>
                    {scope === "Province" ? "Province" : "Division"}
                  </label>
                  {scope === "Province" ? (
                    isLoadingProvinces ? (
                      <div className="py-1 text-xs text-gray-500">Loading provinces...</div>
                    ) : provinceError ? (
                      <div className="text-red-600 text-xs py-1">{provinceError}</div>
                    ) : (
                      <select
                        value={selectedCode}
                        onChange={(e) => setSelectedCode(e.target.value)}
                        className="w-full max-w-md px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent"
                      >
                        <option value="">— Select Province —</option>
                        {provinces.map((p) => (
                          <option key={p.ProvinceCode} value={p.ProvinceCode}>
                            {p.ProvinceCode} - {p.ProvinceName}
                          </option>
                        ))}
                      </select>
                    )
                  ) : isLoadingDivisions ? (
                    <div className="py-1 text-xs text-gray-500">Loading divisions...</div>
                  ) : divisionError ? (
                    <div className="text-red-600 text-xs py-1">{divisionError}</div>
                  ) : (
                    <select
                      value={selectedCode}
                      onChange={(e) => setSelectedCode(e.target.value)}
                      className="w-full max-w-md px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent"
                    >
                      <option value="">— Select Division —</option>
                      {divisions.map((d) => (
                        <option key={d.RegionCode} value={d.RegionCode}>
                          {d.RegionCode}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Months In Arrears */}
                <div className="flex flex-col">
                  <label className={`${maroon} text-xs font-medium mb-1`}>
                    No of Months in Arrears
                  </label>
                  <input
                    type="number"
                    value={monthsInArrears}
                    onChange={(e) => setMonthsInArrears(Number(e.target.value))}
                    min={0}
                    className="w-full max-w-md px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent"
                  />
                </div>

                {/* Outstanding Balance */}
                <div className="flex flex-col">
                  <label className={`${maroon} text-xs font-medium mb-1`}>
                    Outstanding Balance
                  </label>
                  <input
                    type="number"
                    value={outstandingBalance}
                    onChange={(e) => setOutstandingBalance(Number(e.target.value))}
                    min={0}
                    className="w-full max-w-md px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div className="w-full mt-6 flex justify-end">
              <button
                onClick={handleViewReport}
                disabled={loading}
                className={`px-6 py-2 rounded-md font-medium transition-opacity duration-300 shadow ${maroonGrad} text-white ${
                  loading ? "opacity-70 cursor-not-allowed" : "hover:opacity-90"
                }`}
              >
                {loading ? "Loading..." : "View Report"}
              </button>
            </div>
          </div>
        </>
      )}

      {results && (
        <div ref={printRef} className="mt-4 p-4 rounded-xl shadow border border-gray-200 w-full bg-white">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
            <div>
              <h2 className={`text-xl font-bold ${maroon} mb-1`}>
                Highest Outstanding Customers
              </h2>
              <div className="text-xs text-gray-700 font-medium">
                Scope: {scope} ({getSelectedName()}) | Months In Arrears: &ge;{monthsInArrears} | Balance: &ge;LKR {outstandingBalance.toLocaleString()}
              </div>
            </div>
            <div className="flex gap-2 print:hidden">
              <button
                onClick={downloadCSV}
                className="flex items-center gap-1 px-3 py-1.5 border border-blue-400 text-blue-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-blue-50 hover:text-blue-800 transition"
              >
                <FaFileDownload className="w-3.5 h-3.5" /> CSV
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-1 px-3 py-1.5 border border-green-400 text-green-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-green-50 hover:text-green-800 transition"
              >
                <FaPrint className="w-3.5 h-3.5" /> PDF
              </button>
              <button
                onClick={() => setResults(null)}
                className="flex items-center gap-1 px-4 py-1.5 bg-[#7A0000] hover:bg-[#A52A2A] text-xs rounded-md text-white transition"
              >
                <FaArrowLeft className="w-3 h-3 mr-1" /> Back
              </button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[500px] overflow-y-auto border border-gray-200 rounded-lg">
            <table className="w-full text-xs border-collapse">
              <thead className="sticky top-0 z-10 bg-[#7A0000] text-white">
                <tr className={`${maroonBg}`}>
                  <th className="p-2.5 text-center font-semibold border-b border-gray-200 w-12">Rank</th>
                  <th className="p-2.5 text-left font-semibold border-b border-gray-200">Account Number</th>
                  <th className="p-2.5 text-left font-semibold border-b border-gray-200">Customer Name</th>
                  <th className="p-2.5 text-left font-semibold border-b border-gray-200">Address</th>
                  <th className="p-2.5 text-left font-semibold border-b border-gray-200">{scope}</th>
                  <th className="p-2.5 text-right font-semibold border-b border-gray-200">Months in Arrears</th>
                  <th className="p-2.5 text-right font-semibold border-b border-gray-200">Outstanding Balance (LKR)</th>
                </tr>
              </thead>
              <tbody>
                {results.length > 0 ? (
                  results.map((r, idx) => {
                    const accountNo = r.accountNo || r.accountNumber || "—";
                    const name = r.customerName || r.name || "—";
                    const address = r.address || "—";
                    const loc = r.province || r.region || r.division || "—";
                    const months = r.monthsInArrears ?? r.arrearsMonths ?? 0;
                    const balance = r.outstandingBalance ?? r.balance ?? 0;

                    return (
                      <tr
                        key={`${accountNo}-${idx}`}
                        className={idx % 2 === 0 ? "bg-white hover:bg-gray-50" : "bg-gray-50 hover:bg-gray-100"}
                      >
                        <td className="p-2.5 text-center border-b border-gray-150 font-medium text-gray-700">
                          {idx + 1}
                        </td>
                        <td className="p-2.5 border-b border-gray-150 font-mono">{accountNo}</td>
                        <td className="p-2.5 border-b border-gray-150">{name}</td>
                        <td className="p-2.5 border-b border-gray-150">{address}</td>
                        <td className="p-2.5 border-b border-gray-150">{loc}</td>
                        <td className="p-2.5 text-right border-b border-gray-150">{months}</td>
                        <td className="p-2.5 text-right font-semibold border-b border-gray-150 text-red-700">
                          {balance.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-gray-500 font-medium">
                      No records found matching the criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-3 text-2xs text-gray-500 print:hidden">
            Generated on: {new Date().toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomersHighestOutstanding;
