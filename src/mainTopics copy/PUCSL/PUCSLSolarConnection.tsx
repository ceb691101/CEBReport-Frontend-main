import React, { useState, useEffect, useRef } from "react";
import { FaFileDownload, FaPrint } from "react-icons/fa";

import {
    BillCycleOption, Province, Division,
    FixedSolarDataModel, VariableSolarDataModel, TotalSolarCustomersResponse,
    RawDataForSolarResponse, NetMeteringResponse,
} from "../../components/mainTopics/PUCSLSolarConnection/pucslTypes.ts";
import {
    NET_METERING_SUPPORTED_REPORTS, NO_SOLAR_TYPE_REPORTS,
    getReportTitle, getSolarTypeValue, getReportCategoryValue,
    fetchWithErrorHandling, buildAndDownloadCSV, buildTotalSolarCSV,
    buildRawDataForSolarCSV, buildNetMeteringCSV, printReportPDF,
} from "../../components/mainTopics/PUCSLSolarConnection/pucslUtils.ts";
import FixedSolarTable from "../../components/mainTopics/PUCSLSolarConnection/FixedSolarTable.tsx";
import VariableSolarTable from "../../components/mainTopics/PUCSLSolarConnection/VariableSolarTable.tsx";
import TotalSolarCustomersTable from "../../components/mainTopics/PUCSLSolarConnection/TotalSolarCustomersTable.tsx";
import RawDataForSolarTable from "../../components/mainTopics/PUCSLSolarConnection/RawDataForSolarTable.tsx";
import NetMeteringTable from "../../components/mainTopics/PUCSLSolarConnection/NetMeteringTable.tsx";

// ── Constants ─────────────────────────────────────────────────────────────────

const MAROON = "text-[#7A0000]";
const MAROON_GRAD = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";

// ── Component ─────────────────────────────────────────────────────────────────

const PUCSLSolarConnection: React.FC = () => {

    // ── Form state ────────────────────────────────────────────────────────────
    const [reportCategory, setReportCategory] = useState<string>("Province");
    const [categoryValue, setCategoryValue] = useState<string>("");
    const [billCycle, setBillCycle] = useState<string>("");
    const [reportType, setReportType] = useState<string>("");
    const [solarType, setSolarType] = useState<string>("");
    const [loading, setLoading] = useState(false);

    // ── Dropdown data ─────────────────────────────────────────────────────────
    const [billCycleOptions, setBillCycleOptions] = useState<BillCycleOption[]>([]);
    const [provinces, setProvinces] = useState<Province[]>([]);
    const [divisions, setDivisions] = useState<Division[]>([]);
    const [isLoadingBillCycles, setIsLoadingBillCycles] = useState(false);
    const [isLoadingProvinces, setIsLoadingProvinces] = useState(false);
    const [isLoadingDivisions, setIsLoadingDivisions] = useState(false);
    const [billCycleError, setBillCycleError] = useState<string | null>(null);
    const [provinceError, setProvinceError] = useState<string | null>(null);
    const [divisionError, setDivisionError] = useState<string | null>(null);

    // ── Report state ──────────────────────────────────────────────────────────
    const [reportData, setReportData] = useState<FixedSolarDataModel[]>([]);
    const [variableReportData, setVariableReportData] = useState<VariableSolarDataModel[]>([]);
    const [totalSolarData, setTotalSolarData] = useState<TotalSolarCustomersResponse | null>(null);
    const [rawSolarData, setRawSolarData] = useState<RawDataForSolarResponse | null>(null);
    const [netMeteringData, setNetMeteringData] = useState<NetMeteringResponse | null>(null);
    const [reportVisible, setReportVisible] = useState(false);
    const [reportError, setReportError] = useState<string | null>(null);
    const [selectedCategoryName, setSelectedCategoryName] = useState<string>("");
    const [selectedBillCycleDisplay, setSelectedBillCycleDisplay] = useState<string>("");

    const printRef = useRef<HTMLDivElement>(null);

    // ── Derived ───────────────────────────────────────────────────────────────
    const showNetMetering = NET_METERING_SUPPORTED_REPORTS.includes(reportType);
    const hideSolarType = NO_SOLAR_TYPE_REPORTS.includes(reportType);

    // ── Cascade disable logic ─────────────────────────────────────────────────
    const isBillCycleDisabled = () =>
        !reportCategory || (reportCategory !== "Entire CEB" && !categoryValue);

    const isReportTypeDisabled = () => isBillCycleDisabled() || !billCycle;

    const isSolarTypeDisabled = () => isReportTypeDisabled() || !reportType;

    const canSubmit = () => {
        if (!reportCategory) return false;
        if (reportCategory !== "Entire CEB" && !categoryValue) return false;
        if (!billCycle || !reportType) return false;
        if (!hideSolarType && !solarType) return false;
        return true;
    };

    // ── Fetch bill cycles ─────────────────────────────────────────────────────
    useEffect(() => {
        const fetchBillCycles = async () => {
            setIsLoadingBillCycles(true);
            setBillCycleError(null);
            try {
                const response = await fetchWithErrorHandling("/misapi/api/areas/billcycle/max");
                const { BillCycles, MaxBillCycle } = response?.data ?? {};
                if (!Array.isArray(BillCycles) || !MaxBillCycle)
                    throw new Error("Invalid bill cycle data format");
                const max = parseInt(MaxBillCycle);
                setBillCycleOptions(
                    BillCycles.map((cycle: string, i: number) => ({
                        display: `${max - i} - ${cycle}`,
                        code: String(max - i),
                    }))
                );
            } catch (err: any) {
                setBillCycleError(err.message || "Failed to load bill cycles");
            } finally {
                setIsLoadingBillCycles(false);
            }
        };
        fetchBillCycles();
    }, []);

    // ── Fetch provinces ───────────────────────────────────────────────────────
    useEffect(() => {
        if (reportCategory !== "Province") return;
        const fetchProvinces = async () => {
            setIsLoadingProvinces(true);
            setProvinceError(null);
            try {
                const response = await fetchWithErrorHandling("/misapi/api/ordinary/province");
                if (!Array.isArray(response?.data)) throw new Error("Invalid provinces data format");
                setProvinces(response.data);
            } catch (err: any) {
                setProvinceError(err.message || "Failed to load provinces");
            } finally {
                setIsLoadingProvinces(false);
            }
        };
        fetchProvinces();
    }, [reportCategory]);

    // ── Fetch divisions ───────────────────────────────────────────────────────
    useEffect(() => {
        if (reportCategory !== "Division") return;
        const fetchDivisions = async () => {
            setIsLoadingDivisions(true);
            setDivisionError(null);
            try {
                const response = await fetchWithErrorHandling("/misapi/api/ordinary/region");
                if (!Array.isArray(response?.data)) throw new Error("Invalid divisions data format");
                setDivisions(response.data);
            } catch (err: any) {
                setDivisionError(err.message || "Failed to load divisions");
            } finally {
                setIsLoadingDivisions(false);
            }
        };
        fetchDivisions();
    }, [reportCategory]);

    // ── Form submit ───────────────────────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setReportError(null);
        setReportData([]);
        setVariableReportData([]);
        setTotalSolarData(null);
        setRawSolarData(null);
        setNetMeteringData(null);

        try {
            const requestBody = {
                reportCategory: getReportCategoryValue(reportCategory),
                typeCode: reportCategory !== "Entire CEB" ? categoryValue : "",
                billCycle,
                reportType,
                solarType: hideSolarType ? "" : getSolarTypeValue(solarType),
            };

            const response = await fetch("/misapi/api/pucsl/solarConnections", {
                method: "POST",
                headers: { "Content-Type": "application/json", Accept: "application/json" },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                let msg = `HTTP error! status: ${response.status}`;
                try { const d = await response.json(); if (d.errorMessage) msg = d.errorMessage; } catch { }
                throw new Error(msg);
            }

            const result = await response.json();
            if (result.errorMessage) throw new Error(result.errorMessage);

            // ── Route to the correct state based on report type ───────────────
            if (reportType === "TotalSolarCustomers") {
                const tsc = result.data as TotalSolarCustomersResponse;
                if (!tsc?.Ordinary && !tsc?.Bulk)
                    throw new Error("No data found for the selected criteria.");
                setTotalSolarData(tsc);
            } else if (reportType === "RawDataForSolar") {
                const rds = result.data as RawDataForSolarResponse;
                if (!rds?.Ordinary && !rds?.Bulk)
                    throw new Error("No data found for the selected criteria.");
                setRawSolarData(rds);
            } else if (reportType === "NetMetering") {
                const nm = result.data as NetMeteringResponse;
                if (!nm?.Data?.length)
                    throw new Error("No data found for the selected criteria.");
                setNetMeteringData(nm);
            } else if (reportType === "VariableSolarData") {
                if (!Array.isArray(result.data)) throw new Error("No data found for the selected criteria.");
                setVariableReportData(result.data as VariableSolarDataModel[]);
            } else {
                if (!Array.isArray(result.data)) throw new Error("No data found for the selected criteria.");
                setReportData(result.data as FixedSolarDataModel[]);
            }

            // ── Set display labels ────────────────────────────────────────────
            if (reportCategory === "Province") {
                const p = provinces.find((p) => p.ProvinceCode === categoryValue);
                setSelectedCategoryName(p ? `${p.ProvinceCode} - ${p.ProvinceName}` : categoryValue);
            } else if (reportCategory === "Division") {
                setSelectedCategoryName(categoryValue);
            } else {
                setSelectedCategoryName("Entire CEB");
            }

            const cycle = billCycleOptions.find((o) => o.code === billCycle);
            setSelectedBillCycleDisplay(cycle?.display || billCycle);
            setReportVisible(true);

        } catch (err: any) {
            setReportError(err.message || "Failed to generate report. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // ── CSV export ────────────────────────────────────────────────────────────
    const handleDownloadCSV = () => {
        const title = getReportTitle(reportType);
        const selectionInfo = reportCategory === "Entire CEB"
            ? "Entire CEB"
            : `${reportCategory}: ${selectedCategoryName}`;

        if (reportType === "TotalSolarCustomers" && totalSolarData) {
            buildTotalSolarCSV(title, selectionInfo, selectedBillCycleDisplay, billCycle, totalSolarData);

        } else if (reportType === "RawDataForSolar" && rawSolarData) {
            buildRawDataForSolarCSV(title, selectionInfo, selectedBillCycleDisplay, solarType, billCycle, rawSolarData);

        } else if (reportType === "NetMetering" && netMeteringData) {
            buildNetMeteringCSV(title, selectionInfo, selectedBillCycleDisplay, billCycle, netMeteringData);

        } else if (reportType === "VariableSolarData") {
            const groupLabels = [
                "0 < x <= 20 (Capacity x in kW)",
                "20 < x <= 100 (Capacity x in kW)",
                "100 < x <= 500 (Capacity x in kW)",
                "x > 500 (Capacity x in kW)",
                "Aggregator Scheme",
            ];
            buildAndDownloadCSV(title, selectionInfo, selectedBillCycleDisplay, solarType, billCycle,
                [
                    ["", "", "", ...groupLabels.flatMap((l) => [l, "", ""])],
                    ["Tariff Category", "Year", "Month", ...groupLabels.flatMap(() => ["No of Consumers", "kWh Units Purchased", "Paid Amount LKR"])],
                ],
                variableReportData.map((item) => [
                    item.Category, item.Year, item.Month,
                    item.NoOfCustomers0To20, item.KwhUnits0To20, item.PaidAmount0To20,
                    item.NoOfCustomers20To100, item.KwhUnits20To100, item.PaidAmount20To100,
                    item.NoOfCustomers100To500, item.KwhUnits100To500, item.PaidAmount100To500,
                    item.NoOfCustomersAbove500, item.KwhUnitsAbove500, item.PaidAmountAbove500,
                    item.NoOfCustomersAggregator, item.KwhUnitsAggregator, item.PaidAmountAggregator,
                ]),
                "VariableSolar"
            );
        } else {
            buildAndDownloadCSV(title, selectionInfo, selectedBillCycleDisplay, solarType, billCycle,
                [["Tariff Category", "Year", "Month", "No of Customers",
                    "kWh Purchased at 15.50", "kWh Purchased at 22.00", "kWh Purchased at 34.50",
                    "kWh Purchased at 37.00", "kWh Purchased at 23.18", "kWh Purchased at 27.06",
                    "kWh Others", "Paid Amount (Rs.)"]],
                reportData.map((item) => [
                    item.Category, item.Year, item.Month, item.NoOfCustomers,
                    item.KwhAt1550, item.KwhAt22, item.KwhAt3450, item.KwhAt37,
                    item.KwhAt2318, item.KwhAt2706, item.KwhOthers, item.PaidAmount,
                ]),
                "FixedSolar"
            );
        }
    };

    // ── PDF print ─────────────────────────────────────────────────────────────
    const handlePrint = () => {
        if (!printRef.current) return;
        const selectionInfo = reportCategory === "Entire CEB"
            ? "Entire CEB"
            : `${reportCategory}: ${selectedCategoryName}`;
        printReportPDF(
            printRef.current.innerHTML,
            getReportTitle(reportType),
            selectionInfo,
            selectedBillCycleDisplay,
            hideSolarType ? "" : solarType
        );
    };

    // ── Select styling helpers ────────────────────────────────────────────────
    const selectClass = (disabled: boolean) =>
        `w-full px-2 py-1.5 text-xs border rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent ${
            disabled ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed" : "border-gray-300"
        }`;

    const labelClass = (disabled: boolean) =>
        `text-xs font-medium mb-1 ${disabled ? "text-gray-400" : MAROON}`;

    // ── Render the correct table ──────────────────────────────────────────────
    const renderTable = () => {
        if (reportType === "TotalSolarCustomers" && totalSolarData) {
            return <TotalSolarCustomersTable data={totalSolarData} />;
        }
        if (reportType === "RawDataForSolar" && rawSolarData) {
            return <RawDataForSolarTable data={rawSolarData} />;
        }
        if (reportType === "NetMetering" && netMeteringData) {
            return <NetMeteringTable data={netMeteringData} />;
        }
        if (reportType === "VariableSolarData") {
            return <VariableSolarTable data={variableReportData} />;
        }
        return <FixedSolarTable data={reportData} />;
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="p-6 bg-white rounded-lg shadow-md">

            {/* ── Form ─────────────────────────────────────────────────────── */}
            {!reportVisible && (
                <>
                    <h2 className={`text-xl font-bold mb-6 ${MAROON}`}>
                        PUCSL Solar Connection Report
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-4">

                        {/* Row 1 — Report Category | Province/Division */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                            <div className="flex flex-col">
                                <label className={`text-xs font-medium mb-1 ${MAROON}`}>
                                    Select Report Category:
                                </label>
                                <select
                                    value={reportCategory}
                                    onChange={(e) => {
                                        setReportCategory(e.target.value);
                                        setCategoryValue(""); setBillCycle("");
                                        setReportType(""); setSolarType("");
                                    }}
                                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent"
                                    required
                                >
                                    <option value="Province">Province</option>
                                    <option value="Division">Division</option>
                                    <option value="Entire CEB">Entire CEB</option>
                                </select>
                            </div>

                            {reportCategory !== "Entire CEB" && (
                                <div className="flex flex-col">
                                    <label className={`text-xs font-medium mb-1 ${MAROON}`}>
                                        {reportCategory === "Province" ? "Select Province:" : "Select Division:"}
                                    </label>

                                    {reportCategory === "Province" && (
                                        <select
                                            value={categoryValue}
                                            onChange={(e) => {
                                                setCategoryValue(e.target.value);
                                                setBillCycle(""); setReportType(""); setSolarType("");
                                            }}
                                            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent"
                                            required
                                        >
                                            <option value="">Select Province</option>
                                            {isLoadingProvinces ? <option>Loading...</option>
                                                : provinceError ? <option>Error loading provinces</option>
                                                : provinces.map((p) => (
                                                    <option key={p.ProvinceCode} value={p.ProvinceCode}>
                                                        {p.ProvinceCode} - {p.ProvinceName}
                                                    </option>
                                                ))
                                            }
                                        </select>
                                    )}

                                    {reportCategory === "Division" && (
                                        <select
                                            value={categoryValue}
                                            onChange={(e) => {
                                                setCategoryValue(e.target.value);
                                                setBillCycle(""); setReportType(""); setSolarType("");
                                            }}
                                            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent"
                                            required
                                        >
                                            <option value="">Select Division</option>
                                            {isLoadingDivisions ? <option>Loading...</option>
                                                : divisionError ? <option>Error loading divisions</option>
                                                : divisions.map((d) => (
                                                    <option key={d.RegionCode} value={d.RegionCode}>
                                                        {d.RegionCode}
                                                    </option>
                                                ))
                                            }
                                        </select>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Row 2 — Bill Cycle | Report Type | Solar Type (conditional) */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                            <div className="flex flex-col">
                                <label className={labelClass(isBillCycleDisabled())}>Select Bill Cycle:</label>
                                <select
                                    value={billCycle}
                                    onChange={(e) => { setBillCycle(e.target.value); setReportType(""); setSolarType(""); }}
                                    className={selectClass(isBillCycleDisabled())}
                                    required disabled={isBillCycleDisabled()}
                                >
                                    <option value="">Select Bill Cycle</option>
                                    {isLoadingBillCycles ? <option>Loading...</option>
                                        : billCycleError ? <option>Error loading bill cycles</option>
                                        : billCycleOptions.map((o) => (
                                            <option key={o.code} value={o.code}>{o.display}</option>
                                        ))
                                    }
                                </select>
                            </div>

                            <div className="flex flex-col">
                                <label className={labelClass(isReportTypeDisabled())}>Select Report Type:</label>
                                <select
                                    value={reportType}
                                    onChange={(e) => { setReportType(e.target.value); setSolarType(""); }}
                                    className={selectClass(isReportTypeDisabled())}
                                    required disabled={isReportTypeDisabled()}
                                >
                                    <option value="">Select Report Type</option>
                                    <option value="FixedSolarData">Fixed Solar Data Submission Report</option>
                                    <option value="VariableSolarData">Variable Solar Data Submission Report</option>
                                    <option value="TotalSolarCustomers">Total No of Solar Customers</option>
                                    <option value="RawDataForSolar">Raw Data for Solar</option>
                                    <option value="NetMetering">Net Metering</option>
                                </select>
                            </div>

                            {/* Solar Type — hidden for reports that don't need it */}
                            {!hideSolarType && (
                                <div className="flex flex-col">
                                    <label className={labelClass(isSolarTypeDisabled())}>Select Solar Type:</label>
                                    <select
                                        value={solarType}
                                        onChange={(e) => setSolarType(e.target.value)}
                                        className={selectClass(isSolarTypeDisabled())}
                                        required disabled={isSolarTypeDisabled()}
                                    >
                                        <option value="">Select Solar Type</option>
                                        {showNetMetering && <option value="Net Metering">Net Metering</option>}
                                        <option value="Net Accounting">Net Accounting</option>
                                        <option value="Net Plus">Net Plus</option>
                                        <option value="Net Plus Plus">Net Plus Plus</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        {/* Submit */}
                        <div className="flex justify-end mt-6">
                            <button
                                type="submit"
                                disabled={loading || !canSubmit()}
                                className={`px-6 py-2 rounded-md font-medium transition-opacity duration-300 shadow ${MAROON_GRAD} text-white ${
                                    loading || !canSubmit() ? "opacity-70 cursor-not-allowed" : "hover:opacity-90"
                                }`}
                            >
                                {loading ? (
                                    <span className="flex items-center">
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Loading...
                                    </span>
                                ) : "Generate Report"}
                            </button>
                        </div>
                    </form>

                    {reportError && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                            {reportError}
                        </div>
                    )}
                </>
            )}

            {/* ── Report ───────────────────────────────────────────────────── */}
            {reportVisible && (
                <div className="mt-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
                        <div>
                            <h2 className={`text-xl font-bold ${MAROON}`}>{getReportTitle(reportType)}</h2>
                            <p className="text-sm text-gray-600 mt-1">
                                {reportCategory === "Entire CEB" ? "Entire CEB" : `${reportCategory}: ${selectedCategoryName}`}
                                {" "}| Bill Cycle: {selectedBillCycleDisplay}
                                {!hideSolarType && ` | Solar Type: ${solarType}`}
                            </p>
                        </div>
                        <div className="flex space-x-2 mt-2 md:mt-0">
                            <button onClick={handleDownloadCSV} className="flex items-center gap-1 px-3 py-1.5 border border-blue-400 text-blue-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-blue-50 transition">
                                <FaFileDownload className="w-3 h-3" /> CSV
                            </button>
                            <button onClick={handlePrint} className="flex items-center gap-1 px-3 py-1.5 border border-green-400 text-green-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-green-50 transition">
                                <FaPrint className="w-3 h-3" /> PDF
                            </button>
                            <button onClick={() => setReportVisible(false)} className="px-4 py-1.5 bg-[#7A0000] hover:bg-[#A52A2A] text-xs rounded-md text-white">
                                Back to Form
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto max-h-[calc(100vh-250px)] border border-gray-300 rounded-lg">
                        <div ref={printRef} className="min-w-full py-4 px-2">
                            {renderTable()}
                        </div>
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

export default PUCSLSolarConnection;