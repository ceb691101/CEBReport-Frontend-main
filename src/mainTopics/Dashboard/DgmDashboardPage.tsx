import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  RefreshCw,
  Package,
  BarChart3,
  Table,
  Search,
  ArrowUpDown,
  Info,
  TrendingUp,
} from "lucide-react";
import DashboardHeader from "../../components/mainTopics/Dashboard/DashboardHeader";
import DashboardSelector from "../../components/mainTopics/Dashboard/DashboardSelector";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

// Scroll reveal transition hook
function useInView(
  ref: React.RefObject<Element>,
  options?: IntersectionObserverInit
): { inView: boolean } {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
      },
      { threshold: 0.05, ...options }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref]);

  return { inView };
}

// Reveal animation container component
const Reveal: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({
  children,
  delay = 0,
  className = "",
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const { inView } = useInView(ref as React.RefObject<Element>);
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
};

const DgmDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const activeDashboard = "dgm";

  const [pivTotal, setPivTotal] = useState<{ date: string; amount: number }[]>([]);
  const [stockValue, setStockValue] = useState<number | null>(null);
  const [appCounts, setAppCounts] = useState<{ deptId: string; description: string; appType: string; noOfApplications: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [fetchCount, setFetchCount] = useState(0);

  // UX Interactive States
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "count-desc" | "count-asc">("name");
  const [viewMode, setViewMode] = useState<"chart" | "table">("chart");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const query = fetchCount > 0 ? "?refresh=true" : "";
        const [r1, r2, r3] = await Promise.all([
          fetch(`/misapi/api/dgm/piv-total${query}`, {
            headers: { Accept: "application/json" },
          }),
          fetch(`/misapi/api/dgm/stock-value${query}`, {
            headers: { Accept: "application/json" },
          }),
          fetch(`/misapi/api/dgm/application-count${query}`, {
            headers: { Accept: "application/json" },
          }),
        ]);
        if (!r1.ok || !r2.ok || !r3.ok) {
          throw new Error("Failed to fetch DGM dashboard data");
        }
        const [pivData, stockData, appData] = await Promise.all([
          r1.json(),
          r2.json(),
          r3.json(),
        ]);

        const getVal = (obj: any) => obj?.Value ?? obj?.value;
        const getAt = (obj: any) => obj?.FetchedAt ?? obj?.fetchedAt;

        // 1. PIV Data
        const list = Array.isArray(getVal(pivData)) ? getVal(pivData) : Array.isArray(pivData) ? pivData : [];
        const sortedList = [...list].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setPivTotal(sortedList);

        // 2. Stock Value Data
        const stockObj = getVal(stockData);
        setStockValue(typeof stockObj?.stockValue === "number" ? stockObj.stockValue : 0);

        // 3. Application Counts Data
        const appList = Array.isArray(getVal(appData)) ? getVal(appData) : Array.isArray(appData) ? appData : [];
        setAppCounts(appList);

        // Track latest FetchedAt
        const latestTime = new Date(Math.max(
          new Date(getAt(pivData) || 0).getTime(),
          new Date(getAt(stockData) || 0).getTime(),
          new Date(getAt(appData) || 0).getTime()
        ));
        setLastUpdated(latestTime.getTime() > 0 ? latestTime.toLocaleTimeString() : null);
      } catch (err: any) {
        setError(err.message || "Failed to load DGM dashboard data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [fetchCount]);

  // Calculations for PIV Weekly Collections
  const total7DayCollection = useMemo(() => {
    return pivTotal.reduce((sum, item) => sum + (item.amount || 0), 0);
  }, [pivTotal]);

  const breakdownData = useMemo(() => {
    return [...pivTotal].reverse().map((item) => ({
      ...item,
      label: new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric", weekday: "short" }),
    }));
  }, [pivTotal]);

  // Group applications by cost center/deptId for both chart and table layouts
  const applicationChartData = useMemo(() => {
    const deptMap: Record<string, { name: string; totalCount: number;[key: string]: any }> = {};
    appCounts.forEach((item) => {
      const deptKey = item.deptId || "Other";
      if (!deptMap[deptKey]) {
        deptMap[deptKey] = { name: deptKey, totalCount: 0 };
      }
      const typeLabel = item.description || "Unknown Type";
      deptMap[deptKey][typeLabel] = (deptMap[deptKey][typeLabel] || 0) + item.noOfApplications;
      deptMap[deptKey].totalCount += item.noOfApplications;
    });
    return Object.values(deptMap);
  }, [appCounts]);

  // Filter based on Search Term
  const filteredApplicationData = useMemo(() => {
    if (!searchTerm.trim()) return applicationChartData;
    const term = searchTerm.toLowerCase().trim();
    return applicationChartData.filter((item) => item.name.toLowerCase().includes(term));
  }, [applicationChartData, searchTerm]);

  // Sort based on Sort option selected
  const sortedApplicationData = useMemo(() => {
    const data = [...filteredApplicationData];
    if (sortBy === "name") {
      data.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "count-desc") {
      data.sort((a, b) => b.totalCount - a.totalCount);
    } else if (sortBy === "count-asc") {
      data.sort((a, b) => a.totalCount - b.totalCount);
    }
    return data;
  }, [filteredApplicationData, sortBy]);

  // Extract unique application types for Recharts bars mapping
  const applicationTypes = useMemo(() => {
    const types = new Set<string>();
    appCounts.forEach((item) => {
      types.add(item.description || "Unknown Type");
    });
    return Array.from(types);
  }, [appCounts]);

  const chartColors = ["#813405", "#d45113", "#f9a03f", "#f8dda4", "#10b981", "#3b82f6", "#6366f1", "#a1a1aa"];

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="flex">
        <DashboardSelector
          activeDashboard={activeDashboard}
          onSelectDashboard={(dashboard) => navigate(`/dashboard/${dashboard}`)}
        />
        <div className="flex-1 min-w-0">
          <DashboardHeader title="DGM Dashboard" />

          {/* Action / Refresh Bar (Glassmorphic) */}
          <div className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-20 shadow-sm">
            <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-[color:var(--ceb-maroon,#813405)]/80" />
                  Western Province North Division
                </span>
              </div>
              <div className="flex items-center gap-3">
                {lastUpdated && (
                  <span className="text-xs text-slate-500 bg-slate-100/80 border border-slate-200/60 rounded-xl px-3.5 py-2 font-semibold">
                    Updated: {lastUpdated}
                  </span>
                )}
                <button
                  onClick={() => setFetchCount((c) => c + 1)}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 text-sm font-semibold text-white bg-[color:var(--ceb-maroon,#813405)] hover:bg-opacity-95 hover:shadow-md active:scale-95 rounded-xl px-4 py-2 transition-all duration-200 shadow-sm disabled:opacity-50 disabled:pointer-events-none"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </button>
              </div>
            </div>
          </div>

          <div className="p-6 max-w-7xl mx-auto space-y-6">
            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-50/70 border border-red-200/80 rounded-2xl text-sm text-red-700 shadow-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
                <span>
                  <strong>Error:</strong> {error} — check that the backend service is active.
                </span>
              </div>
            )}

            {/* Top Row Widgets */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

              {/* Stock Value Widget Card */}
              <Reveal delay={0}>
                <div className="bg-gradient-to-br from-white to-blue-50/20 rounded-3xl p-6 shadow-sm border border-slate-200/60 hover:shadow-xl hover:border-blue-500/20 transform hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all duration-500" />
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-blue-600/10 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                        <Package className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h2 className="text-base font-extrabold text-slate-800">Stock Value</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">NEW items</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-2 py-0.5 uppercase">
                      Active
                    </span>
                  </div>
                  {loading ? (
                    <div className="space-y-2 my-4">
                      <div className="h-9 w-48 bg-slate-100 rounded-lg animate-pulse" />
                      <div className="h-4 w-32 bg-slate-100 rounded-lg animate-pulse" />
                    </div>
                  ) : (
                    <div className="my-2">
                      <p className="text-3xl font-black text-slate-900 tracking-tight flex items-baseline gap-1">
                        <span className="text-sm font-extrabold text-slate-500">LKR</span>
                        {stockValue !== null ? (stockValue / 1_000_000).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}
                        <span className="text-lg font-black text-blue-600">M</span>
                      </p>
                      <p className="text-xs text-slate-400 font-semibold mt-1">
                        Full sum: LKR {stockValue?.toLocaleString("en-US", { minimumFractionDigits: 2 }) ?? "0.00"}
                      </p>
                    </div>
                  )}
                  
                </div>
              </Reveal>

              {/* PIV Daily Breakdown Card */}
              <Reveal delay={100} className="lg:col-span-2">
                <div className="bg-gradient-to-br from-white to-orange-50/20 rounded-3xl p-6 shadow-sm border border-slate-200/60 hover:shadow-xl hover:border-orange-500/20 transform hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-800">Daily PIV Breakdown</h3>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">Collections per day relative to weekly total</p>
                    </div>
                    {total7DayCollection > 0 && (
                      <span className="text-xs font-bold text-orange-700 bg-orange-50 border border-orange-100 rounded-full px-3 py-1">
                        Total: LKR {(total7DayCollection / 1_000_000).toFixed(2)}M
                      </span>
                    )}
                  </div>

                  {loading ? (
                    <div className="space-y-4 py-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="space-y-1">
                          <div className="flex justify-between"><div className="h-4 w-24 bg-slate-100 rounded animate-pulse" /><div className="h-4 w-32 bg-slate-100 rounded animate-pulse" /></div>
                          <div className="h-2 w-full bg-slate-100 rounded animate-pulse" />
                        </div>
                      ))}
                    </div>
                  ) : breakdownData.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-sm font-semibold">
                      No collection details available for this period.
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {breakdownData.map((item) => {
                        const pct = total7DayCollection > 0 ? (item.amount / total7DayCollection) * 100 : 0;
                        return (
                          <div key={item.date} className="flex flex-col gap-1.5 group">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-slate-600 group-hover:text-slate-900 transition-colors">{item.label}</span>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-slate-900 text-sm">
                                  LKR {item.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 rounded px-1.5 py-0.5 min-w-[36px] text-center">
                                  {pct.toFixed(0)}%
                                </span>
                              </div>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-[color:var(--ceb-maroon,#813405)] to-orange-500 rounded-full transition-all duration-500 shadow-sm"
                                style={{
                                  width: `${pct > 0 ? Math.max(pct, 4) : 0}%`,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </Reveal>
            </div>

            {/* Bottom Row - Connection Applications Widget */}
            <Reveal delay={200}>
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/60 hover:shadow-md transition-shadow w-full">

                {/* Header Controls */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-5">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-emerald-600/10 rounded-2xl">
                      <BarChart3 className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-extrabold text-slate-900">Connection Applications (Current Year)</h2>
                      <p className="text-xs text-slate-400 font-medium">Total submitted applications by cost center and type</p>
                    </div>
                  </div>

                  {/* Interactivity Bar */}
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Search Field */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search Dept ID..."
                        className="pl-9 pr-3 py-1.5 w-40 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[color:var(--ceb-maroon,#813405)]/30 focus:border-[color:var(--ceb-maroon,#813405)] transition-all bg-slate-50/50"
                      />
                    </div>

                    {/* Sort Selector */}
                    <div className="flex items-center gap-1.5">
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                      <select
                        value={sortBy}
                        onChange={(e: any) => setSortBy(e.target.value)}
                        className="px-2 py-1.5 text-xs font-semibold bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[color:var(--ceb-maroon,#813405)]/30 text-slate-700"
                      >
                        <option value="name">Sort: Dept Code</option>
                        <option value="count-desc">Sort: Count High-Low</option>
                        <option value="count-asc">Sort: Count Low-High</option>
                      </select>
                    </div>

                    {/* View Switcher Toggles */}
                    <div className="flex items-center bg-slate-100 rounded-xl p-1">
                      <button
                        onClick={() => setViewMode("chart")}
                        className={`p-1.5 rounded-lg transition-all ${viewMode === "chart" ? "bg-white text-[color:var(--ceb-maroon,#813405)] shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                        title="Chart View"
                      >
                        <BarChart3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setViewMode("table")}
                        className={`p-1.5 rounded-lg transition-all ${viewMode === "table" ? "bg-white text-[color:var(--ceb-maroon,#813405)] shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                        title="Table View"
                      >
                        <Table className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Main Content Area (Chart or Table) */}
                {loading ? (
                  <div className="h-72 w-full bg-slate-50 rounded-2xl animate-pulse flex items-center justify-center">
                    <span className="text-sm font-semibold text-slate-400 animate-bounce">Loading workloads...</span>
                  </div>
                ) : sortedApplicationData.length === 0 ? (
                  <div className="h-72 flex flex-col items-center justify-center text-slate-400 gap-2">
                    <BarChart3 className="w-10 h-10 opacity-20" />
                    <span className="text-sm font-bold">No application data matches filters</span>
                  </div>
                ) : viewMode === "chart" ? (
                  /* Recharts Stacked Bar Chart with Rounded Bars & Glassmorphic Tooltip */
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sortedApplicationData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                        <Tooltip
                          contentStyle={{
                            borderRadius: "16px",
                            border: "1px solid rgba(255,255,255,0.4)",
                            boxShadow: "0 10px 40px rgba(0,0,0,0.08)",
                            fontSize: 12,
                            backgroundColor: "rgba(255, 255, 255, 0.85)",
                            backdropFilter: "blur(12px)",
                          }}
                          labelStyle={{ fontWeight: "bold", color: "#1e293b", marginBottom: "4px" }}
                        />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: 11, fontWeight: 600, paddingTop: 12 }} />
                        {applicationTypes.map((type, index) => (
                          <Bar
                            key={type}
                            dataKey={type}
                            stackId="a"
                            fill={chartColors[index % chartColors.length]}
                            maxBarSize={28}
                            radius={index === applicationTypes.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                            isAnimationActive
                            animationDuration={800}
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  /* Beautifully Styled Data Table */
                  <div className="overflow-x-auto rounded-2xl border border-slate-200/80 shadow-sm max-h-[350px] overflow-y-auto">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider sticky top-0 border-b border-slate-200 z-10">
                        <tr>
                          <th className="px-5 py-3.5 bg-slate-50">Dept / Cost Center</th>
                          {applicationTypes.map((type) => (
                            <th key={type} className="px-5 py-3.5 text-right">{type}</th>
                          ))}
                          <th className="px-5 py-3.5 text-right font-black text-slate-900 bg-slate-100/60">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {sortedApplicationData.map((row, i) => (
                          <tr key={row.name} className={`hover:bg-slate-50/70 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-slate-50/20"}`}>
                            <td className="px-5 py-3 font-bold text-slate-800 font-mono">{row.name}</td>
                            {applicationTypes.map((type) => (
                              <td key={type} className="px-5 py-3 text-right font-semibold text-slate-500 font-mono">
                                {row[type] || "—"}
                              </td>
                            ))}
                            <td className="px-5 py-3 text-right font-extrabold text-[color:var(--ceb-maroon,#813405)] font-mono bg-slate-50/40">
                              {row.totalCount}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </Reveal>

          </div>
        </div>
      </div>
    </div>
  );
};

export default DgmDashboardPage;
