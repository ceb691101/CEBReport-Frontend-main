import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const CYCLES = ["454", "455", "456"];

interface SalesPoint {
    cycle: string;
    kwhSales: number | null;
}

interface Props {
    reportUrl: string;
    billCycleOptions: { code: string; display: string }[];
    salesField?: "NetUnits" | "UnitSale" | "UnitSaleKwh";
    scopeDescription?: string;
    cycleType?: "bill" | "calculation";
}

const formatSales = (value: number) => value.toLocaleString("en-US", { maximumFractionDigits: 2 });

export default function SolarBulkSalesGraph({ reportUrl, billCycleOptions, salesField = "NetUnits", scopeDescription = "For the selected location and net type.", cycleType = "bill" }: Props) {
    const [data, setData] = useState<SalesPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [attempt, setAttempt] = useState(0);
    const cycleName = cycleType === "calculation" ? "Calculation" : "Bill";

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setError(null);
        setData([]);

        const loadSales = async () => {
            try {
                const points = await Promise.all(CYCLES.map(async (cycle) => {
                    const url = new URL(reportUrl, window.location.origin);
                    const calculation = cycleType === "calculation";
                    url.searchParams.delete(calculation ? "billCycle" : "calcCycle");
                    if (url.searchParams.has("cycleType") || calculation) {
                        url.searchParams.set("cycleType", calculation ? "C" : "A");
                    }
                    if (url.searchParams.has("addedBillCycle")) url.searchParams.set("addedBillCycle", cycle);
                    url.searchParams.set(calculation ? "calcCycle" : "billCycle", cycle);
                    const response = await fetch(url, {
                        headers: { Accept: "application/json" }, signal: controller.signal,
                    });
                    const result = await response.json().catch(() => null);
                    if (!response.ok || result?.errorMessage || !Array.isArray(result?.data)) {
                        throw new Error(`${cycleName} cycle ${cycle}: ${result?.errorMessage || "Unable to load kWh sales. Please try again."}`);
                    }

                    const kwhSales = result.data.length === 0 ? null : result.data.reduce(
                        (sum: number, row: Partial<Record<"NetUnits" | "UnitSale" | "UnitSaleKwh", number | string | null>>) => {
                            // Each report exposes sales units using its own response field name.
                            const value = row[salesField];
                            if (value == null || String(value).trim() === "" || !Number.isFinite(Number(value))) {
                                throw new Error(`${cycleName} cycle ${cycle}: Invalid kWh sales data.`);
                            }
                            return sum + Number(value);
                        }, 0,
                    );
                    return { cycle, kwhSales };
                }));
                if (!controller.signal.aborted) setData(points);
            } catch (cause) {
                if (!controller.signal.aborted) {
                    setError(cause instanceof Error ? cause.message : "Unable to load kWh sales. Please try again.");
                }
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        };

        void loadSales();
        return () => controller.abort();
    }, [reportUrl, salesField, cycleType, cycleName, attempt]);

    return (
        <section id="bulk-solar-sales-graph" aria-label={`kWh sales by ${cycleName.toLowerCase()} cycle`} className="border border-gray-200 rounded-lg p-4 bg-white">
            <h3 className="text-lg font-semibold text-[#7A0000]">kWh Sales by {cycleName} Cycle</h3>
            <p className="mt-1 text-sm text-gray-600">{cycleName} cycles 454, 455 and 456. {scopeDescription}</p>

            {loading && <p role="status" className="py-12 text-center text-gray-600">Loading kWh sales...</p>}
            {error && (
                <div role="alert" className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
                    <p>{error}</p>
                    <button type="button" onClick={() => setAttempt(value => value + 1)} className="mt-2 font-medium underline">Retry graph</button>
                </div>
            )}
            {!loading && !error && (
                <div className="mt-6 grid grid-cols-1 items-center gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                    <div className="min-w-0 overflow-x-auto">
                        <table className="w-full text-sm">
                            <caption className="sr-only">kWh sales totals by {cycleName.toLowerCase()} cycle</caption>
                            <thead className="border-b border-gray-200 text-gray-600">
                                <tr><th scope="col" className="py-2 pr-4 text-left">{cycleName} cycle</th><th scope="col" className="py-2 text-right">kWh sales</th></tr>
                            </thead>
                            <tbody>
                                {data.map(point => (
                                    <tr key={point.cycle} className="border-b border-gray-100">
                                        <th scope="row" className="py-2 pr-4 text-left font-medium">
                                            {billCycleOptions.find(option => option.code === point.cycle)?.display || point.cycle}
                                        </th>
                                        <td className="py-2 text-right">{point.kwhSales === null ? "No data" : formatSales(point.kwhSales)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {data.some(point => point.kwhSales !== null) ? (
                        <div role="img" aria-label={`Bar graph of kWh sales for ${cycleName.toLowerCase()} cycles 454, 455 and 456`} className="h-80 w-full min-w-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data} margin={{ top: 12, right: 16, bottom: 24, left: 16 }} accessibilityLayer>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="cycle" label={{ value: `${cycleName} cycle`, position: "bottom", offset: 4 }} />
                                    <YAxis
                                        width={72}
                                        domain={[(min: number) => Math.min(0, min), (max: number) => Math.max(1, max)]}
                                        tickFormatter={value => Number(value).toLocaleString("en-US", { notation: "compact" })}
                                        label={{ value: "kWh sales", angle: -90, position: "insideLeft" }}
                                    />
                                    <Tooltip
                                        labelFormatter={value => `${cycleName} cycle ${value}`}
                                        formatter={(value: number) => [`${formatSales(value)} kWh`, "kWh sales"]}
                                        cursor={{ fill: "#fef2f2" }}
                                    />
                                    <Bar dataKey="kwhSales" name="kWh sales" fill="#7A0000" maxBarSize={100} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : <p className="py-8 text-center text-gray-600">No kWh sales data is available for these {cycleName.toLowerCase()} cycles.</p>}
                </div>
            )}
        </section>
    );
}
