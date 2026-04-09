import React, { useState, useEffect, useRef } from "react";
import {
  AlertCircle,
  BarChart3,
  TrendingUp,
  Battery,
  FileText,
  Wallet,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
} from "recharts";

// ─── useInView Hook ───────────────────────────────────────────────────────────
function useInView(
  ref: React.RefObject<Element>,
  options?: IntersectionObserverInit
): { inView: boolean; triggerCount: number } {
  const [inView, setInView] = useState(false);
  const [triggerCount, setTriggerCount] = useState(0);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          setTriggerCount((c) => c + 1);
        } else {
          setInView(false);
        }
      },
      { threshold: 0.2, ...options }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref]);

  return { inView, triggerCount };
}

// ─── Reveal Component ─────────────────────────────────────────────────────────
interface RevealProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

const Reveal: React.FC<RevealProps> = ({ children, delay = 0, className = "" }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { inView } = useInView(ref as React.RefObject<Element>, { threshold: 0.12 });
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(28px)",
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
};

// ─── PIV Dashboard Component ──────────────────────────────────────────────────
interface PIVDashboardProps {
  isLoaded: boolean;
}

export default function PIVDashboard({ isLoaded }: PIVDashboardProps) {
  // State
  const [pivTotal, setPivTotal] = useState<{ date: string; amount: number }[]>([]);
  const [pivDivision, setPivDivision] = useState<{ date: string; company: string; amount: number }[]>([]);
  const [stockTotal, setStockTotal] = useState<number>(0);
  const [stockDivision, setStockDivision] = useState<{ company: string; amount: number }[]>([]);
  const [pivLoading, setPivLoading] = useState(false);
  const [pivError, setPivError] = useState<string | null>(null);
  const [pivLastUpdated, setPivLastUpdated] = useState<string | null>(null);
  const [pivTotalTime, setPivTotalTime] = useState<string | null>(null);
  const [stockTotalTime, setStockTotalTime] = useState<string | null>(null);
  const [pivFetchCount, setPivFetchCount] = useState(0);

  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const formattedYesterday = yesterdayDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const todayDate = new Date();
  const formattedToday = todayDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  // Fetch logic
  useEffect(() => {
    const fetchPivData = async () => {
      setPivLoading(true); setPivError(null);
      try {
        const query = pivFetchCount > 0 ? "?refresh=true" : "";
        const [r1, r2, r3, r4] = await Promise.all([
          fetch(`/pivapi/api/piv/piv-total${query}`, { headers: { Accept: "application/json" } }),
          fetch(`/pivapi/api/piv/piv-division${query}`, { headers: { Accept: "application/json" } }),
          fetch(`/pivapi/api/piv/stock-total${query}`, { headers: { Accept: "application/json" } }),
          fetch(`/pivapi/api/piv/stock-division${query}`, { headers: { Accept: "application/json" } }),
        ]);
        if (!r1.ok || !r2.ok || !r3.ok || !r4.ok) throw new Error("Failed to fetch PIV data");
        const [pivTotalData, pivDivData, stockTotalData, stockDivData] = await Promise.all([
          r1.json(), r2.json(), r3.json(), r4.json(),
        ]);

        const getVal = (obj: any) => obj?.Value ?? obj?.value;
        const getAt = (obj: any) => obj?.FetchedAt ?? obj?.fetchedAt;

        const pTotalList = Array.isArray(getVal(pivTotalData)) ? getVal(pivTotalData) : Array.isArray(pivTotalData) ? pivTotalData : [];
        const pDivList = Array.isArray(getVal(pivDivData)) ? getVal(pivDivData) : Array.isArray(pivDivData) ? pivDivData : [];

        setPivTotal(pTotalList);
        setPivDivision(pDivList);
        setStockTotal(typeof getVal(stockTotalData) === "number" ? getVal(stockTotalData) : 0);
        setStockDivision(Array.isArray(getVal(stockDivData)) ? getVal(stockDivData) : []);

        const fmtDate = (d: string) => d ? new Date(d).toLocaleTimeString() : null;
        setPivTotalTime(fmtDate(getAt(pivTotalData)));
        setStockTotalTime(fmtDate(getAt(stockTotalData)));

        setPivLastUpdated(new Date().toLocaleTimeString());
      } catch (err: any) {
        setPivError(err.message || "Failed to load PIV data");
      } finally {
        setPivLoading(false);
      }
    };
    fetchPivData();
  }, [pivFetchCount]);

  const normalizeCompany = (value?: string) => {
    const v = (value || "Other").trim();
    return v === "A" ? "hq" : v;
  };

  // Transform division data for Stacked Bar Chart
  const divisionChartData = React.useMemo(() => {
    const dateMap: { [key: string]: any } = {};
    pivDivision.forEach((item) => {
      const dateKey = new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      if (!dateMap[dateKey]) {
        dateMap[dateKey] = { name: dateKey };
      }
      const comp = normalizeCompany(item.company);
      dateMap[dateKey][comp] = (dateMap[dateKey][comp] || 0) + item.amount;
    });
    return Object.values(dateMap).sort((a, b) => new Date(b.name).getTime() - new Date(a.name).getTime());
  }, [pivDivision]);

  // Extract unique companies for Chart Legend & Bars
  const companyKeys = React.useMemo(() => {
    const keys = new Set<string>();
    pivDivision.forEach(item => keys.add(normalizeCompany(item.company)));
    return Array.from(keys);
  }, [pivDivision]);
  
  // Calculate total across 7 days
  const total7DayCollection = React.useMemo(() => {
    return pivTotal.reduce((sum, item) => sum + (item.amount || 0), 0);
  }, [pivTotal]);

  const latestPivDate = React.useMemo(() => {
    if (pivTotal.length === 0) return null;
    return pivTotal.reduce((max, item) => (new Date(item.date) > new Date(max) ? item.date : max), pivTotal[0].date);
  }, [pivTotal]);

  const latestPivLabel = React.useMemo(() => {
    return latestPivDate
      ? new Date(latestPivDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : formattedYesterday;
  }, [latestPivDate, formattedYesterday]);

  const pivDivisionLatest = React.useMemo(() => {
    if (!latestPivDate) return [] as { date: string; company: string; amount: number }[];
    return pivDivision.filter((item) => item.date === latestPivDate);
  }, [pivDivision, latestPivDate]);

  const pivDivisionLatestTotal = React.useMemo(() => {
    return pivDivisionLatest.reduce((sum, item) => sum + (item.amount || 0), 0);
  }, [pivDivisionLatest]);

  const pivDailySeries = React.useMemo(() => {
    return [...pivTotal]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map((item) => ({
        ...item,
        label: new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      }));
  }, [pivTotal]);

  const colors = ["#813405", "#d45113", "#f9a03f", "#f8dda4", "#a1a1aa"];

  return (
    <>
      <div className={`bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-10 transition-all duration-1000 ${isLoaded ? "opacity-100" : "opacity-0"}`}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Financial Dashboard</h1>
              <p className="text-sm text-gray-500 mt-1">
                Last 7 Days Collections &amp; Current Stock — All Divisions
              </p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {pivLastUpdated && (
                <span className="text-xs text-gray-500 bg-gray-100 rounded-lg px-3 py-1.5 font-medium">
                  Updated: {pivLastUpdated}
                </span>
              )}
              <button
                onClick={() => setPivFetchCount((c) => c + 1)}
                className="flex items-center justify-center gap-2 text-sm font-medium text-white bg-[color:var(--ceb-maroon)] hover:bg-[color:var(--ceb-maroon-2)] rounded-lg px-4 py-2 transition-colors shadow-sm w-full sm:w-auto"
              >
                <svg className={`w-4 h-4 ${pivLoading ? "animate-spin" : ""}`} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 8A6 6 0 1 1 8 2" strokeLinecap="round" />
                  <polyline points="14 2 14 8 8 8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 bg-gray-50 min-h-[calc(100vh-80px)]">
        {pivError && (
          <div className="mb-6 flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span><strong>Error:</strong> {pivError} — check that the backend is running and the database connection is active.</span>
          </div>
        )}

        <Reveal delay={0}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="relative bg-gradient-to-br from-white to-orange-50/30 rounded-2xl p-6 shadow-sm border border-gray-100 transition-all duration-300 hover:border-[color:var(--ceb-maroon)]/40 hover:shadow-lg transform hover:-translate-y-1">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-[color:var(--ceb-maroon)]/10 rounded-lg">
                  <Wallet className="w-5 h-5 text-[color:var(--ceb-maroon)]" />
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-500">PIV Collection (Last 7 Days)</h3>
              {pivLoading ? (
                <div className="h-8 w-48 bg-gray-100 rounded-lg animate-pulse mt-1" />
              ) : null}
              <p className="text-xs text-gray-500 mt-2">
                Last 7 Days — All Divisions
                {pivTotalTime && <span className="block text-[10px] opacity-70 mt-0.5 whitespace-nowrap">Data from DB: {pivTotalTime}</span>}
              </p>
              {!pivLoading && pivDailySeries.length > 0 && (
                <div className="mt-4 space-y-2">
                  {pivDailySeries.map((item) => (
                    <div key={item.date} className="flex items-center justify-between gap-3 text-xs">
                      <span className="min-w-[56px] font-medium text-gray-500">{item.label}</span>
                      <div className="flex-1 h-2 rounded-full bg-orange-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[color:var(--ceb-maroon)]"
                          style={{ width: `${total7DayCollection > 0 ? Math.max((item.amount / total7DayCollection) * 100, 8) : 0}%` }}
                        />
                      </div>
                      <span className="min-w-[110px] text-right font-semibold text-gray-800">
                        LKR {item.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="relative bg-gradient-to-br from-white to-blue-50/30 rounded-2xl p-6 shadow-sm border border-gray-100 transition-all duration-300 hover:border-[color:var(--ceb-navy)]/40 hover:shadow-lg transform hover:-translate-y-1">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-[color:var(--ceb-navy)]/10 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-[color:var(--ceb-navy)]" />
                </div>
                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">Now</span>
              </div>
              <h3 className="text-sm font-medium text-gray-500">Total Stock Value</h3>
              {pivLoading ? (
                <div className="h-8 w-48 bg-gray-100 rounded-lg animate-pulse mt-1" />
              ) : (
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {(stockTotal / 1_000_000).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}M LKR
                </p>
              )}
              <p className="text-xs text-gray-500 mt-2">
                {formattedToday} — NEW grade items
                {stockTotalTime && <span className="block text-[10px] opacity-70 mt-0.5 whitespace-nowrap">Data from DB: {stockTotalTime}</span>}
              </p>
            </div>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
          <Reveal delay={100} className="h-full">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-base font-bold text-gray-800">PIV Collection by Division</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Last 7 Days collection — company-wise breakdown</p>
                </div>
                <div className="p-2 bg-[color:var(--ceb-maroon)]/10 rounded-xl">
                  <TrendingUp className="w-4 h-4 text-[color:var(--ceb-maroon)]" />
                </div>
              </div>
              {pivLoading ? (
                <div className="space-y-3 flex-1">
                  {[1, 2, 3, 4].map(i => <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />)}
                </div>
              ) : companyKeys.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-52 text-gray-400 flex-1">
                  <BarChart3 className="w-10 h-10 mb-2 opacity-30" />
                  <p className="text-sm">No division data available</p>
                </div>
              ) : (
                <div className="flex-1 min-h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={divisionChartData}
                      margin={{ top: 10, right: 10, left: 0, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3ece8" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#9ca3af" }}
                        tickFormatter={(v) => `${(Number(v) / 1_000_000).toFixed(1)}M`}
                        axisLine={false} tickLine={false} width={52}
                      />
                      <Tooltip
                        formatter={(val: any, name: string) => [`LKR ${Number(val).toLocaleString("en-US", { minimumFractionDigits: 2 })}`, name]}
                        labelStyle={{ color: "#374151", fontWeight: 600 }}
                        contentStyle={{ borderRadius: "12px", border: "1px solid rgba(255,255,255,0.4)", boxShadow: "0 8px 32px rgba(0,0,0,0.12)", fontSize: 13, backgroundColor: "rgba(255, 255, 255, 0.8)", backdropFilter: "blur(12px)" }}
                        cursor={{ fill: "rgba(0,0,0,0.03)" }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                      {companyKeys.map((company, i) => (
                        <Bar
                          key={company}
                          dataKey={company}
                          fill={colors[i % colors.length]}
                          maxBarSize={20}
                          radius={[4, 4, 0, 0]}
                          isAnimationActive
                          animationDuration={900}
                          animationEasing="ease-out"
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </Reveal>


          <Reveal delay={200} className="h-full">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-base font-bold text-gray-800">Stock Value by Division</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Current NEW-grade stock — company-wise breakdown</p>
                </div>
                <div className="p-2 bg-[color:var(--ceb-navy)]/10 rounded-xl">
                  <Battery className="w-4 h-4 text-[color:var(--ceb-navy)]" />
                </div>
              </div>
              {pivLoading ? (
                <div className="space-y-3 flex-1">
                  {[1, 2, 3, 4].map(i => <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />)}
                </div>
              ) : stockDivision.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-52 text-gray-400 flex-1">
                  <BarChart3 className="w-10 h-10 mb-2 opacity-30" />
                  <p className="text-sm">No division data available</p>
                </div>
              ) : (
                <div className="flex-1 min-h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stockDivision.map(d => ({ name: d.company || "Other", value: d.amount }))}
                      margin={{ top: 10, right: 10, left: 0, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#edf1f8" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#9ca3af" }}
                        tickFormatter={(v) => `${(Number(v) / 1_000_000).toFixed(1)}M`}
                        axisLine={false} tickLine={false} width={52}
                      />
                      <Tooltip
                        formatter={(val: any) => [`LKR ${Number(val).toLocaleString("en-US", { minimumFractionDigits: 2 })}`, "Stock Value"]}
                        contentStyle={{ borderRadius: "12px", border: "1px solid rgba(255,255,255,0.4)", boxShadow: "0 8px 32px rgba(0,0,0,0.12)", fontSize: 13, backgroundColor: "rgba(255, 255, 255, 0.8)", backdropFilter: "blur(12px)" }}
                        cursor={{ fill: "rgba(0,0,0,0.03)" }}
                      />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={56}
                        isAnimationActive animationDuration={900} animationEasing="ease-out">
                        {stockDivision.map((_, i) => (
                          <Cell key={i} fill={["#23498c", "#3568b8", "#5c84c8", "#8ea8d8"][i % 4]} />
                        ))}
                        <LabelList
                          dataKey="value"
                          position="top"
                          formatter={(v: any) => `${(Number(v) / 1_000_000).toFixed(2)}M`}
                          style={{ fontSize: 10, fill: "#6b7280" }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </Reveal>
        </div>

        <Reveal delay={300}>
          {!pivLoading && (pivDivision.length > 0 || stockDivision.length > 0) && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                <FileText className="w-4 h-4 text-gray-400" />
                <h2 className="text-sm font-bold text-gray-700">Division Summary Table</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50">
                      <th className="px-6 py-3 text-left">Company / Division</th>
                      <th className="px-6 py-3 text-right">
                        PIV Collection ({latestPivLabel}{pivTotalTime ? ` ${pivTotalTime}` : ""})
                      </th>
                      <th className="px-6 py-3 text-right">
                        Stock Value ({formattedToday}{stockTotalTime ? ` ${stockTotalTime}` : ""})
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(
                      new Set([
                        ...pivDivisionLatest.map(d => normalizeCompany(d.company)),
                        ...stockDivision.map(d => d.company || "Other"),
                      ])
                    ).map((company, i) => {
                      const piv = pivDivisionLatest.find(d => normalizeCompany(d.company) === company);
                      const stk = stockDivision.find(d => (d.company || "Other") === company);
                      return (
                        <tr key={company}
                          className={`border-t border-gray-50 hover:bg-gray-100/60 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-gray-50/40"}`}
                        >
                          <td className="px-6 py-4 font-semibold text-gray-800">
                            <div className="flex items-center gap-2">
                              {company}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right font-mono text-[color:var(--ceb-maroon)]">
                            {piv ? `LKR ${piv.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "—"}
                          </td>
                          <td className="px-6 py-4 text-right font-mono text-[color:var(--ceb-navy)]">
                            {stk ? `LKR ${stk.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "—"}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold">
                      <td className="px-6 py-4 text-gray-700">Total</td>
                      <td className="px-6 py-4 text-right font-mono text-[color:var(--ceb-maroon)]">
                        LKR {pivDivisionLatestTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-[color:var(--ceb-navy)]">
                        LKR {stockTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Reveal>
      </div>
    </>
  );
}
