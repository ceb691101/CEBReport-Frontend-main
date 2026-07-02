import React, { useState, useEffect } from "react";
import { Home, Download, RefreshCw, CheckCircle, AlertCircle, FileSpreadsheet } from "lucide-react";
import {
    BillCycleOption, Province, Division, RawDataForSolarResponse
} from "../../components/mainTopics/PUCSLSolarConnection/pucslTypes.ts";
import {
    fetchWithErrorHandling, getSolarTypeValue, getReportCategoryValue, buildRawDataForSolarCSV
} from "../../components/mainTopics/PUCSLSolarConnection/pucslUtils.ts";

const SolarDataForUNT: React.FC = () => {
    // ── Form State ────────────────────────────────────────────────────────────
    const [billCycle, setBillCycle] = useState<string>("");
    const [netType, setNetType] = useState<string>("Net Metering");
    const [reportCategory, setReportCategory] = useState<string>("Province");
    const [categoryValue, setCategoryValue] = useState<string>("");

    // ── Dropdown Data State ───────────────────────────────────────────────────
    const [billCycleOptions, setBillCycleOptions] = useState<BillCycleOption[]>([]);
    const [provinces, setProvinces] = useState<Province[]>([]);
    const [divisions, setDivisions] = useState<Division[]>([]);

    // ── Loading & Error States ────────────────────────────────────────────────
    const [isLoadingBillCycles, setIsLoadingBillCycles] = useState(false);
    const [isLoadingProvinces, setIsLoadingProvinces] = useState(false);
    const [isLoadingDivisions, setIsLoadingDivisions] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const [billCycleError, setBillCycleError] = useState<string | null>(null);
    const [provinceError, setProvinceError] = useState<string | null>(null);
    const [divisionError, setDivisionError] = useState<string | null>(null);
    const [exportError, setExportError] = useState<string | null>(null);

    // ── Export Results (Preview) State ────────────────────────────────────────
    const [exportResult, setExportResult] = useState<RawDataForSolarResponse | null>(null);
    const [exportedInfo, setExportedInfo] = useState<{
        category: string;
        categoryName: string;
        billCycleDisplay: string;
        netType: string;
    } | null>(null);

    // ── Fetch Bill Cycles on Mount ────────────────────────────────────────────
    useEffect(() => {
        const fetchBillCycles = async () => {
            setIsLoadingBillCycles(true);
            setBillCycleError(null);
            try {
                const response = await fetchWithErrorHandling("/misapi/api/ordinary/areas/billcycle/min");
                const { BillCycles, MaxBillCycle } = response?.data ?? {};
                if (!Array.isArray(BillCycles) || !MaxBillCycle) {
                    throw new Error("Invalid bill cycle data format");
                }
                const max = parseInt(MaxBillCycle);
                const options = BillCycles.map((cycle: string, i: number) => ({
                    display: `${max - i} - ${cycle}`,
                    code: String(max - i),
                }));
                setBillCycleOptions(options);
                if (options.length > 0) {
                    setBillCycle(options[0].code);
                }
            } catch (err: any) {
                setBillCycleError(err.message || "Failed to load bill cycles");
            } finally {
                setIsLoadingBillCycles(false);
            }
        };
        fetchBillCycles();
    }, []);

    // ── Fetch Provinces ───────────────────────────────────────────────────────
    useEffect(() => {
        if (reportCategory !== "Province") return;
        const fetchProvinces = async () => {
            setIsLoadingProvinces(true);
            setProvinceError(null);
            try {
                const response = await fetchWithErrorHandling("/misapi/api/ordinary/province");
                if (!Array.isArray(response?.data)) {
                    throw new Error("Invalid provinces data format");
                }
                setProvinces(response.data);
                if (response.data.length > 0) {
                    setCategoryValue(response.data[0].ProvinceCode);
                }
            } catch (err: any) {
                setProvinceError(err.message || "Failed to load provinces");
            } finally {
                setIsLoadingProvinces(false);
            }
        };
        fetchProvinces();
    }, [reportCategory]);

    // ── Fetch Divisions ───────────────────────────────────────────────────────
    useEffect(() => {
        if (reportCategory !== "Division") return;
        const fetchDivisions = async () => {
            setIsLoadingDivisions(true);
            setDivisionError(null);
            try {
                const response = await fetchWithErrorHandling("/misapi/api/ordinary/region");
                if (!Array.isArray(response?.data)) {
                    throw new Error("Invalid divisions data format");
                }
                setDivisions(response.data);
                if (response.data.length > 0) {
                    setCategoryValue(response.data[0].RegionCode);
                }
            } catch (err: any) {
                setDivisionError(err.message || "Failed to load divisions");
            } finally {
                setIsLoadingDivisions(false);
            }
        };
        fetchDivisions();
    }, [reportCategory]);

    // ── Reset Form Handler ────────────────────────────────────────────────────
    const handleReset = () => {
        setNetType("Net Metering");
        setReportCategory("Province");
        setExportResult(null);
        setExportedInfo(null);
        setExportError(null);
        if (billCycleOptions.length > 0) {
            setBillCycle(billCycleOptions[0].code);
        }
        if (provinces.length > 0) {
            setCategoryValue(provinces[0].ProvinceCode);
        }
    };

    // ── Form Submission (Export to Excel) ─────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsExporting(true);
        setExportError(null);
        setExportResult(null);

        try {
            const requestBody = {
                reportCategory: getReportCategoryValue(reportCategory),
                typeCode: reportCategory !== "Entire CEB" ? categoryValue : "",
                billCycle,
                reportType: "RawDataForSolar",
                solarType: getSolarTypeValue(netType),
            };

            const response = await fetch("/misapi/api/pucsl/solarConnections", {
                method: "POST",
                headers: { "Content-Type": "application/json", Accept: "application/json" },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                let msg = `HTTP error! status: ${response.status}`;
                try {
                    const d = await response.json();
                    if (d.errorMessage) msg = d.errorMessage;
                } catch { }
                throw new Error(msg);
            }

            const result = await response.json();
            if (result.errorMessage) {
                throw new Error(result.errorMessage);
            }

            const data = result.data as RawDataForSolarResponse;
            if (!data?.Ordinary?.length && !data?.Bulk?.length) {
                throw new Error("No data found for the selected criteria.");
            }

            setExportResult(data);

            // Determine category display name
            let categoryName = "Entire CEB";
            if (reportCategory === "Province") {
                const p = provinces.find((p) => p.ProvinceCode === categoryValue);
                categoryName = p ? `${p.ProvinceCode} - ${p.ProvinceName}` : categoryValue;
            } else if (reportCategory === "Division") {
                categoryName = categoryValue;
            }

            const cycleOption = billCycleOptions.find((o) => o.code === billCycle);
            const billCycleDisplay = cycleOption ? cycleOption.display : billCycle;

            setExportedInfo({
                category: reportCategory,
                categoryName,
                billCycleDisplay,
                netType,
            });

            // Trigger CSV Download
            const title = `Solar Data for UNT Calculation - ${netType}`;
            const selectionInfo = reportCategory === "Entire CEB"
                ? "Entire CEB"
                : `${reportCategory}: ${categoryName}`;

            buildRawDataForSolarCSV(
                title,
                selectionInfo,
                billCycleDisplay,
                netType,
                billCycle,
                data
            );

        } catch (err: any) {
            setExportError(err.message || "Failed to export data. Please try again.");
        } finally {
            setIsExporting(false);
        }
    };

    const isSubmitDisabled = () => {
        if (isExporting || isLoadingBillCycles || isLoadingProvinces || isLoadingDivisions) return true;
        if (!billCycle) return true;
        if (reportCategory !== "Entire CEB" && !categoryValue) return true;
        return false;
    };

    return (
        <div className="w-full max-w-5xl mx-auto my-4">
            {/* ── Main Slate Frame ───────────────────────────────────────────────── */}
            <div className="bg-[#1a2536] text-gray-200 border-[3px] border-[#384c66] rounded-xl shadow-2xl overflow-hidden relative font-sans">
                
                {/* Header Section */}
                <div className="flex justify-between items-center px-6 py-4 bg-gradient-to-r from-[#202f44] to-[#1a2536] border-b border-[#2d3f56]">
                    <div className="flex items-center gap-3">
                        <FileSpreadsheet className="w-6 h-6 text-sky-400" />
                        <h2 className="text-xl font-bold tracking-wide text-white drop-shadow-md">
                            Solar Data for UNT Calculation
                        </h2>
                    </div>
                    {/* Home/Reset Button */}
                    <button
                        type="button"
                        onClick={handleReset}
                        title="Reset Form"
                        className="bg-gradient-to-b from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-white rounded-lg p-2 shadow-lg border border-sky-600 active:scale-95 transition-all duration-150 cursor-pointer"
                    >
                        <Home className="w-5 h-5" />
                    </button>
                </div>

                {/* Form and Preview Split Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 min-h-[360px] divide-y md:divide-y-0 md:divide-x divide-[#2d3f56]">
                    
                    {/* Left Pane - Form Controls */}
                    <div className="p-6 flex flex-col justify-between bg-[#1f2d3e]">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            
                            {/* Year & Month Selection */}
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-semibold tracking-wider text-sky-300 uppercase">
                                    Year & Month
                                </label>
                                <select
                                    value={billCycle}
                                    onChange={(e) => setBillCycle(e.target.value)}
                                    className="w-full bg-[#16202c] border border-[#3c5472] rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-500 transition duration-150"
                                    required
                                >
                                    {isLoadingBillCycles ? (
                                        <option>Loading cycles...</option>
                                    ) : billCycleError ? (
                                        <option>Error loading cycles</option>
                                    ) : (
                                        billCycleOptions.map((o) => (
                                            <option key={o.code} value={o.code}>
                                                {o.display}
                                            </option>
                                        ))
                                    )}
                                </select>
                            </div>

                            {/* Net Type Selection */}
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-semibold tracking-wider text-sky-300 uppercase">
                                    Net Type
                                </label>
                                <select
                                    value={netType}
                                    onChange={(e) => setNetType(e.target.value)}
                                    className="w-full bg-[#16202c] border border-[#3c5472] rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-500 transition duration-150"
                                    required
                                >
                                    <option value="Net Metering">Net Metering</option>
                                    <option value="Net Accounting">Net Accounting</option>
                                    <option value="Net Plus">Net Plus</option>
                                    <option value="Net Plus Plus">Net Plus Plus</option>
                                </select>
                            </div>

                            {/* Scope Radio Selection */}
                            <div className="flex flex-col gap-3 py-2">
                                <label className="text-xs font-semibold tracking-wider text-sky-300 uppercase">
                                    Geographic Scope
                                </label>
                                <div className="flex flex-col gap-2.5">
                                    {["Province", "Division", "Entire CEB"].map((scope) => (
                                        <label
                                            key={scope}
                                            className="flex items-center gap-3 text-sm text-gray-300 cursor-pointer select-none"
                                        >
                                            <input
                                                type="radio"
                                                name="geoScope"
                                                value={scope}
                                                checked={reportCategory === scope}
                                                onChange={() => {
                                                    setReportCategory(scope);
                                                    setCategoryValue("");
                                                }}
                                                className="w-4 h-4 text-sky-500 bg-[#16202c] border-[#3c5472] focus:ring-sky-500 cursor-pointer"
                                            />
                                            <span>{scope}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Scope Details Dropdown */}
                            {reportCategory !== "Entire CEB" && (
                                <div className="flex flex-col gap-2 animate-fadeIn">
                                    <label className="text-xs font-semibold tracking-wider text-sky-300 uppercase">
                                        Select {reportCategory}
                                    </label>
                                    {reportCategory === "Province" ? (
                                        <select
                                            value={categoryValue}
                                            onChange={(e) => setCategoryValue(e.target.value)}
                                            className="w-full bg-[#16202c] border border-[#3c5472] rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-500 transition duration-150"
                                            required
                                        >
                                            {isLoadingProvinces ? (
                                                <option>Loading provinces...</option>
                                            ) : provinceError ? (
                                                <option>Error loading provinces</option>
                                            ) : (
                                                provinces.map((p) => (
                                                    <option key={p.ProvinceCode} value={p.ProvinceCode}>
                                                        {p.ProvinceCode} - {p.ProvinceName}
                                                    </option>
                                                ))
                                            )}
                                        </select>
                                    ) : (
                                        <select
                                            value={categoryValue}
                                            onChange={(e) => setCategoryValue(e.target.value)}
                                            className="w-full bg-[#16202c] border border-[#3c5472] rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-500 transition duration-150"
                                            required
                                        >
                                            {isLoadingDivisions ? (
                                                <option>Loading divisions...</option>
                                            ) : divisionError ? (
                                                <option>Error loading divisions</option>
                                            ) : (
                                                divisions.map((d) => (
                                                    <option key={d.RegionCode} value={d.RegionCode}>
                                                        {d.RegionCode}
                                                    </option>
                                                ))
                                            )}
                                        </select>
                                    )}
                                </div>
                            )}

                            {/* Action Button */}
                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={isSubmitDisabled()}
                                    className={`w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold py-2.5 px-4 rounded-lg shadow-lg border border-emerald-700 hover:border-emerald-600 active:scale-[0.98] transition-all duration-150 cursor-pointer ${
                                        isSubmitDisabled() ? "opacity-60 cursor-not-allowed active:scale-100" : ""
                                    }`}
                                >
                                    {isExporting ? (
                                        <>
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                            <span>Exporting Data...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Download className="w-4 h-4" />
                                            <span>Export to Excel</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Right Pane - Preview Panel */}
                    <div className="p-6 flex flex-col justify-center items-center bg-[#15202e] relative min-h-[300px]">
                        {isExporting && (
                            <div className="flex flex-col items-center gap-4 animate-pulse">
                                <div className="p-4 bg-[#1f2d3e] rounded-full border border-sky-500 shadow-md shadow-sky-500/25">
                                    <RefreshCw className="w-8 h-8 text-sky-400 animate-spin" />
                                </div>
                                <div className="text-center">
                                    <p className="font-semibold text-white">Fetching Solar Data</p>
                                    <p className="text-xs text-sky-400 mt-1">Aggregating Ordinary & Bulk connections...</p>
                                </div>
                            </div>
                        )}

                        {!isExporting && exportError && (
                            <div className="flex flex-col items-center gap-4 text-center max-w-sm animate-fadeIn">
                                <div className="p-3 bg-red-950/50 rounded-full border border-red-500/30">
                                    <AlertCircle className="w-8 h-8 text-red-400" />
                                </div>
                                <div>
                                    <p className="font-semibold text-white">Export Failed</p>
                                    <p className="text-xs text-red-300 mt-2 bg-red-950/30 p-3 rounded-lg border border-red-500/10">
                                        {exportError}
                                    </p>
                                </div>
                            </div>
                        )}

                        {!isExporting && !exportError && !exportResult && (
                            <div className="flex flex-col items-center gap-3 text-center max-w-sm">
                                <div className="p-4 bg-[#1b2536] rounded-full border border-[#2d3f56] text-gray-500">
                                    <FileSpreadsheet className="w-8 h-8 text-gray-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-300">Ready to Export</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        Select the required Month, Net Type, and Geographic Scope, then click "Export to Excel" to download the report.
                                    </p>
                                </div>
                            </div>
                        )}

                        {!isExporting && !exportError && exportResult && exportedInfo && (
                            <div className="w-full flex flex-col gap-4 animate-fadeIn">
                                <div className="flex items-center gap-2 text-emerald-400 border-b border-[#2d3f56] pb-3 mb-2">
                                    <CheckCircle className="w-5 h-5" />
                                    <span className="font-bold text-sm tracking-wide uppercase text-white">
                                        Export Successful
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
                                    <div className="text-gray-400 font-semibold uppercase tracking-wider">Net Type:</div>
                                    <div className="text-white font-medium">{exportedInfo.netType}</div>

                                    <div className="text-gray-400 font-semibold uppercase tracking-wider">Scope:</div>
                                    <div className="text-white font-medium">{exportedInfo.category}: {exportedInfo.categoryName}</div>

                                    <div className="text-gray-400 font-semibold uppercase tracking-wider">Period:</div>
                                    <div className="text-white font-medium">{exportedInfo.billCycleDisplay}</div>

                                    <div className="text-gray-400 font-semibold uppercase tracking-wider col-span-2 mt-2 pt-2 border-t border-[#2d3f56]">
                                        Data Preview Summary:
                                    </div>

                                    <div className="text-sky-300 font-medium">Ordinary Connections:</div>
                                    <div className="text-white font-semibold text-right">
                                        {exportResult.Ordinary.length} rows
                                    </div>

                                    <div className="text-sky-300 font-medium">Bulk Connections:</div>
                                    <div className="text-white font-semibold text-right">
                                        {exportResult.Bulk.length} rows
                                    </div>

                                    <div className="text-sky-300 font-medium">Total Import Energy:</div>
                                    <div className="text-white font-semibold text-right text-emerald-400">
                                        {((exportResult.OrdinaryTotal?.ImportDay || 0) + (exportResult.BulkTotal?.ImportDay || 0) + (exportResult.BulkTotal?.ImportPeak || 0) + (exportResult.BulkTotal?.ImportOffPeak || 0)).toLocaleString("en-US", { maximumFractionDigits: 0 })} kWh
                                    </div>

                                    <div className="text-sky-300 font-medium">Total Export Energy:</div>
                                    <div className="text-white font-semibold text-right text-sky-400">
                                        {((exportResult.OrdinaryTotal?.ExportDay || 0) + (exportResult.BulkTotal?.ExportDay || 0) + (exportResult.BulkTotal?.ExportPeak || 0) + (exportResult.BulkTotal?.ExportOffPeak || 0)).toLocaleString("en-US", { maximumFractionDigits: 0 })} kWh
                                    </div>
                                </div>

                                <div className="text-center mt-3 text-[10px] text-gray-500 italic bg-[#1b2536] p-2.5 rounded-lg border border-[#2d3f56]">
                                    The Excel file has been compiled and downloaded.
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SolarDataForUNT;
