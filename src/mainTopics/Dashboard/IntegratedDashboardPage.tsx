import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../contexts/UserContext";
import {
  AlertCircle,
  BarChart3,
  TrendingUp,
  FileText,
  Wallet,
  RotateCcw,
  Sparkles,
  Package,
  Calendar,
  Activity,
  Search,
  ArrowUpDown,
  Table,
  ChevronDown,
  ChevronUp,
  Info,
  Layers,
  MapPin,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import DashboardSelector from "../../components/mainTopics/Dashboard/DashboardSelector";
import IntegratedDashboardHeader, {
  COMPANY_TO_PROVINCE,
  resolveAreaToCompanyId,
} from "../../components/mainTopics/Dashboard/IntegratedDashboardHeader";

// ── InView & Reveal Helper ──────────────────────────────────────────────────
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
        transform: inView ? "translateY(0)" : "translateY(20px)",
        transition: `opacity 0.5s ease ${delay}ms, transform 0.5s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
};

// ── Custom Tooltip for Construction Progress Chart ──────────────────────────
const ConstructionTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const grouped: Record<string, { app?: number; conn?: number }> = {};
    let totalApps = 0;
    let totalConns = 0;

    payload.forEach((item: any) => {
      const nameStr = item.name || "";
      const isApp = nameStr.endsWith(" (App)");
      const cleanName = nameStr.replace(" (App)", "").replace(" (Conn)", "");
      const val = Number(item.value) || 0;

      if (!grouped[cleanName]) {
        grouped[cleanName] = {};
      }

      if (isApp) {
        grouped[cleanName].app = val;
        totalApps += val;
      } else {
        grouped[cleanName].conn = val;
        totalConns += val;
      }
    });

    const totalPending = Math.max(0, totalApps - totalConns);

    return (
      <div className="bg-white/95 backdrop-blur-md p-4 border border-slate-200/80 shadow-xl rounded-2xl text-xs space-y-3 font-sans min-w-[280px]">
        <div className="border-b border-slate-100 pb-2">
          <div className="font-extrabold text-slate-800 text-sm font-mono">
            Dept: {label}
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total Apps</span>
              <span className="text-xs font-extrabold text-[#813405] font-mono">{totalApps}</span>
            </div>
            <div className="flex flex-col border-l border-slate-200/60 pl-2">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total Conns</span>
              <span className="text-xs font-extrabold text-emerald-600 font-mono">{totalConns}</span>
            </div>
            <div className="flex flex-col border-l border-slate-200/60 pl-2">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Pending</span>
              <span className="text-xs font-extrabold text-red-600 font-mono">{totalPending}</span>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Type Breakdown</div>
          {Object.entries(grouped).map(([typeName, values]) => {
            const appVal = values.app || 0;
            const connVal = values.conn || 0;
            const pendingVal = Math.max(0, appVal - connVal);

            return (
              <div key={typeName} className="flex flex-col gap-1 border-b border-slate-100/50 pb-2 last:border-0 last:pb-0">
                <span className="font-bold text-slate-700 text-[11px]">{typeName}</span>
                <div className="flex items-center justify-between gap-4 text-[10px]">
                  <div className="flex items-center gap-1 text-orange-700 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                    <span>Applied: {appVal}</span>
                  </div>
                  <div className="flex items-center gap-1 text-emerald-700 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Given: {connVal}</span>
                  </div>
                  <div className="flex items-center gap-1 text-red-600 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    <span>Pending: {pendingVal}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};

// ── Material Master Data Interfaces ─────────────────────────────────────────
interface AreaQtyItem {
  areaId: string;
  areaName: string;
  qtyOnHand: number;
  stockValue: number;
}

interface AreaEngineerMaterialMasterItem {
  matCd: string;
  matNm: string;
  uomCd: string;
  unitPrice: number;
  provinceQtyOnHand: number;
  provinceStockValue: number;
  areaBreakdown?: AreaQtyItem[];
}

interface AreaEngineerMaterialMasterSummaryModel {
  areaId?: string;
  areaName?: string;
  totalProvinceQtyOnHand?: number;
  totalProvinceStockValue?: number;
  areaTotals?: AreaQtyItem[];
  materials?: AreaEngineerMaterialMasterItem[];
}

const SOLAR_NET_TYPE_COLORS = [
  "#813405",
  "#d45113",
  "#f9a03f",
  "#f8dda4",
  "#8B5E3C",
];
const C = 502.65;

export default function IntegratedDashboardPage() {
  const { user } = useUser();
  const navigate = useNavigate();
  const activeDashboard = "integrated";

  // ── Helper functions to resolve role-based initial scope ──────────────────
  const getInitialDivision = (): string => {
    if (!user || (user.Level !== undefined && user.Level >= 80) || user.Company?.toUpperCase().trim() === "DIST") {
      return "all";
    }
    if (user.Company) {
      const match = /^DISCO(\d+)$/i.exec(user.Company.trim());
      if (match) return `d${match[1]}`.toLowerCase();
    }
    if (user.RegionCode) {
      const match = /^R?(\d+)$/i.exec(user.RegionCode.trim());
      if (match) return `d${match[1]}`.toLowerCase();
    }
    const prov = user.ProvinceCode ? user.ProvinceCode.trim().toUpperCase() : "";
    if (prov) {
      const provDivMap: Record<string, string> = {
        "1": "d1", "WPN": "d1", "NWP": "d1", "8": "d1", "D": "d1",
        "2": "d2", "WPS1": "d2", "SP": "d2", "B": "d2",
        "C": "d3", "WPS2": "d3", "WPSII": "d3", "CP": "d3", "5": "d3",
        "E": "d4", "EP": "d4", "NP": "d4", "SAB": "d4", "UVA": "d4", "NC": "d4"
      };
      if (provDivMap[prov]) return provDivMap[prov];
    }
    return "all";
  };

  const getInitialProvince = (): string => {
    if (!user || (user.Level !== undefined && (user.Level >= 80 || user.Level === 70)) || user.Company?.toUpperCase().trim() === "DIST") {
      return "all";
    }
    if (user.ProvinceCode) {
      return user.ProvinceCode.trim();
    }
    const areaKey = (user.AreaCode || user.Company || "").toUpperCase().trim();
    if (areaKey) {
      const resolved = resolveAreaToCompanyId(areaKey);
      if (COMPANY_TO_PROVINCE[resolved]) {
        return COMPANY_TO_PROVINCE[resolved];
      }
      if (COMPANY_TO_PROVINCE[areaKey]) {
        return COMPANY_TO_PROVINCE[areaKey];
      }
    }
    return "all";
  };

  const getInitialArea = (): string => {
    if (!user || (user.Level !== undefined && user.Level >= 60) || user.Company?.toUpperCase().trim() === "DIST") {
      return "all";
    }
    if (user.AreaCode) return user.AreaCode.trim();
    if (user.Company) return user.Company.trim();
    return "all";
  };

  // ── Hierarchy Filters (Cascading: Division, Province, Area) ───────────────
  const [selectedDivision, setSelectedDivision] = useState<string>(getInitialDivision);
  const [selectedProvince, setSelectedProvince] = useState<string>(getInitialProvince);
  const [selectedArea, setSelectedArea] = useState<string>(getInitialArea);

  // Sync state when user object updates or is loaded asynchronously
  useEffect(() => {
    if (!user) return;
    const userLevel = user.Level ?? 0;
    if (userLevel === 0) return;

    if (userLevel > 0 && userLevel < 60) {
      // Area Engineer (Level 50)
      const initArea = getInitialArea();
      if (initArea !== "all" && (selectedArea === "all" || !selectedArea)) {
        setSelectedArea(initArea);
      }
      const initProv = getInitialProvince();
      if (initProv !== "all" && (selectedProvince === "all" || !selectedProvince)) {
        setSelectedProvince(initProv);
      }
      const initDiv = getInitialDivision();
      if (initDiv !== "all" && (selectedDivision === "all" || !selectedDivision)) {
        setSelectedDivision(initDiv);
      }
    } else if (userLevel >= 60 && userLevel < 70) {
      // Province User (Level 60)
      const initProv = getInitialProvince();
      if (initProv !== "all" && (selectedProvince === "all" || !selectedProvince)) {
        setSelectedProvince(initProv);
      }
      const initDiv = getInitialDivision();
      if (initDiv !== "all" && (selectedDivision === "all" || !selectedDivision)) {
        setSelectedDivision(initDiv);
      }
    } else if (userLevel >= 70 && userLevel < 80) {
      // Region User (Level 70)
      const initDiv = getInitialDivision();
      if (initDiv !== "all" && (selectedDivision === "all" || !selectedDivision)) {
        setSelectedDivision(initDiv);
      }
    }
  }, [user]);

  // Metadata map for area code to friendly name
  const [areaNameMap, setAreaNameMap] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/misapi/api/ordinary/areas", { headers: { Accept: "application/json" } })
      .then((res) => res.json())
      .then((json) => {
        const list = json?.data || [];
        const map: Record<string, string> = {};
        list.forEach((item: any) => {
          const code = String(item.AreaCode || item.areaCode || "").trim();
          const name = String(item.AreaName || item.areaName || code).trim();
          if (code) map[code] = name;
        });
        setAreaNameMap(map);
      })
      .catch(() => {});
  }, []);

  const selectedAreaName = useMemo(() => {
    if (!selectedArea || selectedArea === "all") return "";
    return areaNameMap[selectedArea] || selectedArea;
  }, [selectedArea, areaNameMap]);

  // ── Determine active view mode based on user selection: ───────────────────
  // 1. When an Area is selected -> "Area Engineer Dashboard" view!
  // 2. When a Province is selected -> "Construction Progress Dashboard" view!
  // 3. When neither is selected (Province is "all") -> "Consolidated Financial Dashboard" view!
  const isAreaView = Boolean(selectedArea && selectedArea !== "all");
  const isProvinceView = Boolean(selectedProvince && selectedProvince !== "all" && !isAreaView);

  // ── General / Financial State ──────────────────────────────────────────────
  const [pivTotal, setPivTotal] = useState<{ date: string; amount: number }[]>([]);
  const [pivDivision, setPivDivision] = useState<{ date: string; company: string; amount: number }[]>([]);
  const [stockTotal, setStockTotal] = useState<number>(0);
  const [stockDivision, setStockDivision] = useState<{ company: string; amount: number }[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [pivTotalTime, setPivTotalTime] = useState<string | null>(null);
  const [stockTotalTime, setStockTotalTime] = useState<string | null>(null);
  const [fetchCount, setFetchCount] = useState<number>(0);

  // ── Chart Type Switchers (Line vs Bar) ──────────────────────────────────
  const [area7DaysChartType, setArea7DaysChartType] = useState<"line" | "bar">("line");
  const [provincial7DaysChartType, setProvincial7DaysChartType] = useState<"line" | "bar">("line");
  const [divisionChartType, setDivisionChartType] = useState<"bar" | "line">("bar");

  // ── Construction Progress / Area Engineer Dashboard Specific State ────────
  const [constructionStockValue, setConstructionStockValue] = useState<number | null>(null);
  const [appCounts, setAppCounts] = useState<{ deptId: string; description: string; appType: string; noOfApplications: number }[]>([]);
  const [connectionsGiven, setConnectionsGiven] = useState<{ deptId: string; description: string; appType: string; noOfConnections: number }[]>([]);
  const [pendingApplications, setPendingApplications] = useState<{ deptId: string; description: string; appType: string; applicationNo: string }[]>([]);
  const [constructionYear, setConstructionYear] = useState<number>(2026);

  // Area Engineer Specific Material Master & Donut State
  const [areaMaterialMasterData, setAreaMaterialMasterData] = useState<AreaEngineerMaterialMasterSummaryModel | null>(null);
  const [activeMaterialPieIndex, setActiveMaterialPieIndex] = useState<number | null>(null);

  // Custom PIV Period range (defaulting to 30 days)
  const [customPivStart, setCustomPivStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [customPivEnd, setCustomPivEnd] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0];
  });
  const [customPivTotalAmount, setCustomPivTotalAmount] = useState<number | null>(null);
  const [customPivLoading, setCustomPivLoading] = useState<boolean>(false);
  const [customPivError, setCustomPivError] = useState<string | null>(null);
  // Track whether the main summary endpoint already populated customPivTotalAmount
  // to avoid a redundant second API call on initial load
  const pivPeriodLoadedBySummaryRef = useRef(false);

  // Interactive controls for progress chart & tables
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortBy, setSortBy] = useState<"name" | "apps-desc" | "conns-desc" | "pending-desc">("name");
  const [viewMode, setViewMode] = useState<"chart" | "table" | "pending">("chart");
  const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({});
  const [expandedPendingDepts, setExpandedPendingDepts] = useState<Record<string, boolean>>({});

  const toggleDeptExpand = (name: string) => {
    setExpandedDepts((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const togglePendingDeptExpand = (deptId: string) => {
    setExpandedPendingDepts((prev) => ({ ...prev, [deptId]: !prev[deptId] }));
  };

  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const formattedYesterday = yesterdayDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const todayDate = new Date();
  const formattedToday = todayDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // ── Fetch Data: Switches between Area Engineer, Construction Progress, and Financial ──
  useEffect(() => {
    let active = true;

    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        const isRefresh = fetchCount > 0;

        if (isAreaView) {
          // ══════════════════════════════════════════════════════════════════
          // 1. AREA ENGINEER VIEW: Fetch Area-Level Engineering & Progress Data
          // ══════════════════════════════════════════════════════════════════
          const targetProvince = selectedProvince && selectedProvince !== "all" ? selectedProvince.trim().toUpperCase() : "WPN";
          const targetArea = resolveAreaToCompanyId(selectedArea, targetProvince);

          const summaryUrl = `/misapi/api/integrated/areaengineer/summary?province=${encodeURIComponent(targetProvince)}&area=${encodeURIComponent(targetArea)}&year=${constructionYear}&startDate=${encodeURIComponent(customPivStart)}&endDate=${encodeURIComponent(customPivEnd)}${isRefresh ? "&refresh=true" : ""}`;

          let fetchedSuccessfully = false;
          try {
            const sumRes = await fetch(summaryUrl, { headers: { Accept: "application/json" } });
            if (sumRes.ok) {
              const parsed = await sumRes.json();
              const val = parsed?.Value ?? parsed?.value ?? parsed;
              if (val) {
                if (!active) return;
                setConstructionStockValue(typeof val.StockValue === "number" ? val.StockValue : 0);
                setPivTotal(Array.isArray(val.PivTotal) ? val.PivTotal : []);
                setCustomPivTotalAmount(typeof val.PivPeriodSummary === "number" ? val.PivPeriodSummary : 0);
                pivPeriodLoadedBySummaryRef.current = true;
                setAreaMaterialMasterData(val.MaterialMaster || null);
                setAppCounts(Array.isArray(val.ApplicationCounts) ? val.ApplicationCounts : []);
                setConnectionsGiven(Array.isArray(val.ConnectionsGiven) ? val.ConnectionsGiven : []);
                setPendingApplications(Array.isArray(val.PendingApplications) ? val.PendingApplications : []);
                const timeStr = (parsed.FetchedAt || parsed.fetchedAt)
                  ? new Date(parsed.FetchedAt || parsed.fetchedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true })
                  : new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true });
                setLastUpdated(timeStr);
                setPivTotalTime(timeStr);
                setStockTotalTime(timeStr);
                fetchedSuccessfully = true;
              }
            }
          } catch (e) {
            console.warn("Integrated area engineer summary endpoint error, trying fallback:", e);
          }

          if (!fetchedSuccessfully) {
            // Resilient fallback to individual areaengineer endpoints
            const queryBase = `?companyId=${encodeURIComponent(targetArea)}${isRefresh ? "&refresh=true" : ""}`;
            const queryAppConn = `?companyId=${encodeURIComponent(targetArea)}&year=${constructionYear}${isRefresh ? "&refresh=true" : ""}`;

            const [r1, r2, r3, r4, r5, r6, r7] = await Promise.all([
              fetch(`/misapi/api/areaengineer/piv-total${queryBase}`, { headers: { Accept: "application/json" } }),
              fetch(`/misapi/api/areaengineer/stock-value${queryBase}`, { headers: { Accept: "application/json" } }),
              fetch(`/misapi/api/areaengineer/application-count${queryAppConn}`, { headers: { Accept: "application/json" } }),
              fetch(`/misapi/api/areaengineer/connections-given${queryAppConn}`, { headers: { Accept: "application/json" } }),
              fetch(`/misapi/api/areaengineer/pending-applications${queryAppConn}`, { headers: { Accept: "application/json" } }),
              fetch(`/misapi/api/areaengineer/material-master${queryBase}`, { headers: { Accept: "application/json" } }),
              fetch(`/misapi/api/areaengineer/piv-period-summary${queryBase}&startDate=${encodeURIComponent(customPivStart)}&endDate=${encodeURIComponent(customPivEnd)}`, { headers: { Accept: "application/json" } }),
            ]);

            if (!active) return;
            const [pivData, stockData, appData, connData, pendingData, matData, periodData] = await Promise.all([
              r1.ok ? r1.json() : null,
              r2.ok ? r2.json() : null,
              r3.ok ? r3.json() : null,
              r4.ok ? r4.json() : null,
              r5.ok ? r5.json() : null,
              r6.ok ? r6.json() : null,
              r7.ok ? r7.json() : null,
            ]);

            const getVal = (obj: any) => obj?.Value ?? obj?.value;
            const list = Array.isArray(getVal(pivData)) ? getVal(pivData) : [];
            setPivTotal([...list].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));

            const stockObj = getVal(stockData);
            setConstructionStockValue(typeof stockObj?.stockValue === "number" ? stockObj.stockValue : 0);

            const periodObj = getVal(periodData);
            setCustomPivTotalAmount(typeof periodObj?.pivCollection === "number" ? periodObj.pivCollection : 0);

            setAppCounts(Array.isArray(getVal(appData)) ? getVal(appData) : []);
            setConnectionsGiven(Array.isArray(getVal(connData)) ? getVal(connData) : []);
            setPendingApplications(Array.isArray(getVal(pendingData)) ? getVal(pendingData) : []);
            setAreaMaterialMasterData(getVal(matData) || null);
            setLastUpdated(new Date().toLocaleTimeString());
          }
        } else if (isProvinceView) {
          // ══════════════════════════════════════════════════════════════════
          // 2. PROVINCE VIEW: Fetch Construction Progress Data
          // ══════════════════════════════════════════════════════════════════
          const targetProvince = selectedProvince.trim().toUpperCase();

          const summaryUrl = `/misapi/api/integrated/construction/summary?province=${encodeURIComponent(targetProvince)}&year=${constructionYear}&startDate=${encodeURIComponent(customPivStart)}&endDate=${encodeURIComponent(customPivEnd)}&area=all${isRefresh ? "&refresh=true" : ""}`;

          let fetchedSuccessfully = false;
          try {
            const sumRes = await fetch(summaryUrl, { headers: { Accept: "application/json" } });
            if (sumRes.ok) {
              const parsed = await sumRes.json();
              const val = parsed?.Value ?? parsed?.value ?? parsed;
              if (val) {
                if (!active) return;
                setConstructionStockValue(typeof val.StockValue === "number" ? val.StockValue : 0);
                setPivTotal(Array.isArray(val.PivTotal) ? val.PivTotal : []);
                setCustomPivTotalAmount(typeof val.PivPeriodSummary === "number" ? val.PivPeriodSummary : 0);
                pivPeriodLoadedBySummaryRef.current = true;
                setAppCounts(Array.isArray(val.ApplicationCounts) ? val.ApplicationCounts : []);
                setConnectionsGiven(Array.isArray(val.ConnectionsGiven) ? val.ConnectionsGiven : []);
                setPendingApplications(Array.isArray(val.PendingApplications) ? val.PendingApplications : []);
                const timeStr = (parsed.FetchedAt || parsed.fetchedAt)
                  ? new Date(parsed.FetchedAt || parsed.fetchedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true })
                  : new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true });
                setLastUpdated(timeStr);
                setPivTotalTime(timeStr);
                setStockTotalTime(timeStr);
                fetchedSuccessfully = true;
              }
            }
          } catch (e) {
            console.warn("Integrated summary endpoint not ready, falling back to individual endpoints:", e);
          }

          if (!fetchedSuccessfully) {
            const queryBase = `?companyId=${targetProvince}${isRefresh ? "&refresh=true" : ""}`;
            const queryAppConn = `?companyId=${targetProvince}&year=${constructionYear}${isRefresh ? "&refresh=true" : ""}`;

            const [r1, r2, r3, r4, r5] = await Promise.all([
              fetch(`/misapi/api/dgm/piv-total${queryBase}`, { headers: { Accept: "application/json" } }),
              fetch(`/misapi/api/dgm/stock-value${queryBase}`, { headers: { Accept: "application/json" } }),
              fetch(`/misapi/api/dgm/application-count${queryAppConn}`, { headers: { Accept: "application/json" } }),
              fetch(`/misapi/api/dgm/connections-given${queryAppConn}`, { headers: { Accept: "application/json" } }),
              fetch(`/misapi/api/dgm/pending-applications${queryAppConn}`, { headers: { Accept: "application/json" } }),
            ]);

            if (!active) return;
            if (!r1.ok || !r2.ok || !r3.ok || !r4.ok || !r5.ok) {
              throw new Error("Failed to load construction progress data for this province");
            }

            const [pivData, stockData, appData, connData, pendingData] = await Promise.all([
              r1.json(),
              r2.json(),
              r3.json(),
              r4.json(),
              r5.json(),
            ]);

            const getVal = (obj: any) => obj?.Value ?? obj?.value;
            const getAt = (obj: any) => obj?.FetchedAt ?? obj?.fetchedAt;

            const list = Array.isArray(getVal(pivData)) ? getVal(pivData) : Array.isArray(pivData) ? pivData : [];
            setPivTotal([...list].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));

            const stockObj = getVal(stockData);
            setConstructionStockValue(typeof stockObj?.stockValue === "number" ? stockObj.stockValue : 0);

            const appList = Array.isArray(getVal(appData)) ? getVal(appData) : Array.isArray(appData) ? appData : [];
            setAppCounts(appList);

            const connList = Array.isArray(getVal(connData)) ? getVal(connData) : Array.isArray(connData) ? connData : [];
            setConnectionsGiven(connList);

            const pendingList = Array.isArray(getVal(pendingData)) ? getVal(pendingData) : Array.isArray(pendingData) ? pendingData : [];
            setPendingApplications(pendingList);

            const latestTime = new Date(
              Math.max(
                new Date(getAt(pivData) || 0).getTime(),
                new Date(getAt(stockData) || 0).getTime(),
                new Date(getAt(appData) || 0).getTime(),
                new Date(getAt(connData) || 0).getTime(),
                new Date(getAt(pendingData) || 0).getTime()
              )
            );
            setLastUpdated(latestTime.getTime() > 0 ? latestTime.toLocaleTimeString() : new Date().toLocaleTimeString());
          }
        } else {
          // ══════════════════════════════════════════════════════════════════
          // 3. CONSOLIDATED VIEW: Fetch Financial / Accounting Data
          // ══════════════════════════════════════════════════════════════════
          const queryParams = new URLSearchParams({
            division: selectedDivision || "all",
            province: "all",
            area: "all",
            refresh: isRefresh ? "true" : "false",
          }).toString();

          let fetchedSuccessfully = false;
          try {
            const integratedRes = await fetch(`/misapi/api/integrated/financial/summary?${queryParams}`, {
              headers: { Accept: "application/json" },
            });
            if (integratedRes.ok) {
              const resJson = await integratedRes.json();
              if (!active) return;
              const data = resJson?.Value ?? resJson?.value ?? resJson;
              if (data) {
                setPivTotal(data.PivTotal || data.pivTotal || []);
                setPivDivision(data.PivDivision || data.pivDivision || []);
                setStockTotal(typeof (data.StockTotal ?? data.stockTotal) === "number" ? (data.StockTotal ?? data.stockTotal) : 0);
                setStockDivision(data.StockDivision || data.stockDivision || []);
                const timeStr = (resJson?.FetchedAt || resJson?.fetchedAt)
                  ? new Date(resJson.FetchedAt || resJson.fetchedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true })
                  : new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true });
                setLastUpdated(timeStr);
                setPivTotalTime(timeStr);
                setStockTotalTime(timeStr);
                fetchedSuccessfully = true;
              }
            }
          } catch (e) {
            console.warn("Integrated financial summary not ready, falling back:", e);
          }

          if (!fetchedSuccessfully) {
            const query = isRefresh ? "?refresh=true" : "";
            const [r1, r2, r3, r4] = await Promise.all([
              fetch(`/misapi/api/piv/piv-total${query}`, { headers: { Accept: "application/json" } }),
              fetch(`/misapi/api/piv/piv-division${query}`, { headers: { Accept: "application/json" } }),
              fetch(`/misapi/api/piv/stock-total${query}`, { headers: { Accept: "application/json" } }),
              fetch(`/misapi/api/piv/stock-division${query}`, { headers: { Accept: "application/json" } }),
            ]);

            if (!active) return;
            if (!r1.ok || !r2.ok || !r3.ok || !r4.ok) {
              throw new Error("Failed to load financial and accounting data");
            }

            const [pivTotalData, pivDivData, stockTotalData, stockDivData] = await Promise.all([
              r1.json(),
              r2.json(),
              r3.json(),
              r4.json(),
            ]);

            const getVal = (obj: any) => obj?.Value ?? obj?.value;
            const getAt = (obj: any) => obj?.FetchedAt ?? obj?.fetchedAt;

            setPivTotal(Array.isArray(getVal(pivTotalData)) ? getVal(pivTotalData) : []);
            setPivDivision(Array.isArray(getVal(pivDivData)) ? getVal(pivDivData) : []);
            setStockTotal(typeof getVal(stockTotalData) === "number" ? getVal(stockTotalData) : 0);
            setStockDivision(Array.isArray(getVal(stockDivData)) ? getVal(stockDivData) : []);

            const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleTimeString() : null);
            setPivTotalTime(fmtDate(getAt(pivTotalData)));
            setStockTotalTime(fmtDate(getAt(stockTotalData)));
            setLastUpdated(new Date().toLocaleTimeString());
          }
        }
      } catch (err: any) {
        if (!active) return;
        console.error("IntegratedDashboard fetch error:", err);
        setError(err.message || "Failed to load dashboard data");
      } finally {
        if (active) setLoading(false);
      }
    };

    loadData();
    return () => {
      active = false;
    };
  }, [fetchCount, selectedDivision, selectedProvince, selectedArea, constructionYear, isAreaView, isProvinceView]);

  // Fetch custom PIV period collections independently when in province or area view
  // Skip if the main summary endpoint already loaded this data (on initial load)
  useEffect(() => {
    if (!isProvinceView && !isAreaView) return;
    // If the summary already populated this value, skip the redundant fetch
    if (pivPeriodLoadedBySummaryRef.current) {
      pivPeriodLoadedBySummaryRef.current = false; // Clear for next date-range change
      return;
    }
    let active = true;

    const fetchCustomPiv = async () => {
      setCustomPivLoading(true);
      setCustomPivError(null);
      try {
        if (isAreaView) {
          const targetArea = resolveAreaToCompanyId(selectedArea, selectedProvince);
          const res = await fetch(
            `/misapi/api/areaengineer/piv-period-summary?companyId=${encodeURIComponent(targetArea)}&startDate=${customPivStart}&endDate=${customPivEnd}`,
            { headers: { Accept: "application/json" } }
          );
          if (!res.ok) throw new Error("Failed to fetch custom PIV collections");
          const data = await res.json();
          if (!active) return;
          const val = data?.Value?.pivCollection ?? data?.value?.pivCollection ?? data?.pivCollection ?? 0;
          setCustomPivTotalAmount(typeof val === "number" ? val : 0);
        } else {
          const targetProvince = selectedProvince.trim().toUpperCase();
          const res = await fetch(
            `/misapi/api/dgm/piv-period-summary?companyId=${targetProvince}&startDate=${customPivStart}&endDate=${customPivEnd}`,
            { headers: { Accept: "application/json" } }
          );
          if (!res.ok) throw new Error("Failed to fetch custom PIV collections");
          const data = await res.json();
          if (!active) return;
          const val = data?.Value?.pivCollection ?? data?.value?.pivCollection ?? data?.pivCollection ?? 0;
          setCustomPivTotalAmount(typeof val === "number" ? val : 0);
        }
      } catch (err: any) {
        if (!active) return;
        setCustomPivError(err.message || "Failed to load PIV period sum");
        setCustomPivTotalAmount(0);
      } finally {
        if (active) setCustomPivLoading(false);
      }
    };

    fetchCustomPiv();
    return () => {
      active = false;
    };
  }, [isProvinceView, isAreaView, selectedProvince, selectedArea, customPivStart, customPivEnd, fetchCount]);

  // ── Calculations for Consolidated Financial Dashboard ─────────────────────
  const normalizeCompany = (value?: string) => {
    const v = (value || "Other").trim();
    return v === "A" ? "hq" : v;
  };

  const displayPivDivision = useMemo(() => {
    if (!selectedDivision || selectedDivision === "all") return pivDivision;
    return pivDivision.filter(
      (item) => normalizeCompany(item.company).toLowerCase() === selectedDivision.toLowerCase()
    );
  }, [pivDivision, selectedDivision]);

  const displayStockDivision = useMemo(() => {
    if (!selectedDivision || selectedDivision === "all") return stockDivision;
    return stockDivision.filter(
      (item) => normalizeCompany(item.company).toLowerCase() === selectedDivision.toLowerCase()
    );
  }, [stockDivision, selectedDivision]);

  const displayPivTotal = useMemo(() => {
    if (!selectedDivision || selectedDivision === "all") return pivTotal;
    const dailyMap: Record<string, number> = {};
    displayPivDivision.forEach((item) => {
      dailyMap[item.date] = (dailyMap[item.date] || 0) + item.amount;
    });
    return Object.entries(dailyMap).map(([date, amount]) => ({ date, amount }));
  }, [pivTotal, displayPivDivision, selectedDivision]);

  const displayStockTotal = useMemo(() => {
    if (!selectedDivision || selectedDivision === "all") return stockTotal;
    return displayStockDivision.reduce((sum, item) => sum + (item.amount || 0), 0);
  }, [stockTotal, displayStockDivision, selectedDivision]);

  const divisionChartData = useMemo(() => {
    const dateMap: { [key: string]: any } = {};
    displayPivDivision.forEach((item) => {
      const dateKey = new Date(item.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      if (!dateMap[dateKey]) {
        dateMap[dateKey] = { name: dateKey };
      }
      const comp = normalizeCompany(item.company);
      dateMap[dateKey][comp] = (dateMap[dateKey][comp] || 0) + item.amount;
    });
    return Object.values(dateMap).sort(
      (a, b) => new Date(b.name).getTime() - new Date(a.name).getTime()
    );
  }, [displayPivDivision]);

  const companyKeys = useMemo(() => {
    const keys = new Set<string>();
    displayPivDivision.forEach((item) => keys.add(normalizeCompany(item.company)));
    return Array.from(keys);
  }, [displayPivDivision]);

  const total7DayCollection = useMemo(() => {
    return displayPivTotal.reduce((sum, item) => sum + (item.amount || 0), 0);
  }, [displayPivTotal]);

  const latestPivDate = useMemo(() => {
    if (displayPivTotal.length === 0) return null;
    return displayPivTotal.reduce(
      (max, item) => (new Date(item.date) > new Date(max) ? item.date : max),
      displayPivTotal[0].date
    );
  }, [displayPivTotal]);

  const latestPivLabel = useMemo(() => {
    return latestPivDate
      ? new Date(latestPivDate).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : formattedYesterday;
  }, [latestPivDate, formattedYesterday]);

  const pivDivisionLatest = useMemo(() => {
    if (!latestPivDate) return [] as { date: string; company: string; amount: number }[];
    return displayPivDivision.filter((item) => item.date === latestPivDate);
  }, [displayPivDivision, latestPivDate]);

  const pivDivisionLatestTotal = useMemo(() => {
    return pivDivisionLatest.reduce((sum, item) => sum + (item.amount || 0), 0);
  }, [pivDivisionLatest]);

  const pivDailySeries = useMemo(() => {
    return [...displayPivTotal]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map((item) => ({
        ...item,
        label: new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      }));
  }, [displayPivTotal]);

  const total30DayCollection = useMemo(() => {
    return pivTotal.reduce((sum, item) => sum + (item.amount || 0), 0);
  }, [pivTotal]);

  const recent7DaysLineChartData = useMemo(() => {
    if (!pivTotal || pivTotal.length === 0) return [];
    // Sort descending to get latest 7 records, then sort ascending for chronological line chart
    const sortedDesc = [...pivTotal].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const last7 = sortedDesc.slice(0, 7).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return last7.map((item) => {
      const d = new Date(item.date);
      return {
        date: item.date,
        day: d.toLocaleDateString("en-US", { weekday: "short" }),
        formattedDate: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        amount: item.amount || 0,
      };
    });
  }, [pivTotal]);

  const provinceBreakdownData = useMemo(() => {
    return [...pivTotal].reverse().map((item) => ({
      ...item,
      label: new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric", weekday: "short" }),
    }));
  }, [pivTotal]);

  // Data processing for Material Master SVG Donut Chart (Area Engineer view)
  const materialPieChartItems = useMemo(() => {
    if (!areaMaterialMasterData?.materials) return [];
    const top = areaMaterialMasterData.materials
      .filter((m) => m.provinceQtyOnHand > 0)
      .slice(0, 5);

    const totalStockVal = top.reduce((sum, m) => {
      const stockVal =
        m.provinceStockValue !== undefined &&
        m.provinceStockValue !== null &&
        !isNaN(m.provinceStockValue) &&
        m.provinceStockValue > 0
          ? m.provinceStockValue
          : (m.unitPrice || 0) * (m.provinceQtyOnHand || 0);
      return sum + stockVal;
    }, 0);

    if (totalStockVal === 0) return [];

    return top.map((m) => {
      const stockVal =
        m.provinceStockValue !== undefined &&
        m.provinceStockValue !== null &&
        !isNaN(m.provinceStockValue) &&
        m.provinceStockValue > 0
          ? m.provinceStockValue
          : (m.unitPrice || 0) * (m.provinceQtyOnHand || 0);
      return {
        matCd: m.matCd,
        matNm: m.matNm,
        qty: m.provinceQtyOnHand,
        stockValue: stockVal,
        pct: (stockVal / totalStockVal) * 100,
      };
    });
  }, [areaMaterialMasterData]);

  const totalMaterialDonutStockValue = useMemo(() => {
    return materialPieChartItems.reduce((sum, item) => sum + item.stockValue, 0);
  }, [materialPieChartItems]);

  // Group applications and connections given side-by-side
  const applicationChartData = useMemo(() => {
    const deptMap: Record<string, { name: string; totalApps: number; totalConns: number; completionRate: number; [key: string]: any }> = {};

    appCounts.forEach((item) => {
      const deptKey = item.deptId || "Other";
      if (!deptMap[deptKey]) {
        deptMap[deptKey] = { name: deptKey, totalApps: 0, totalConns: 0, completionRate: 0 };
      }
      const typeLabel = item.description || "Unknown Type";
      const key = `${typeLabel} (App)`;
      deptMap[deptKey][key] = (deptMap[deptKey][key] || 0) + item.noOfApplications;
      deptMap[deptKey].totalApps += item.noOfApplications;
    });

    connectionsGiven.forEach((item) => {
      const deptKey = item.deptId || "Other";
      if (!deptMap[deptKey]) {
        deptMap[deptKey] = { name: deptKey, totalApps: 0, totalConns: 0, completionRate: 0 };
      }
      const typeLabel = item.description || "Unknown Type";
      const key = `${typeLabel} (Conn)`;
      deptMap[deptKey][key] = (deptMap[deptKey][key] || 0) + item.noOfConnections;
      deptMap[deptKey].totalConns += item.noOfConnections;
    });

    Object.values(deptMap).forEach((dept) => {
      dept.completionRate = dept.totalApps > 0 ? (dept.totalConns / dept.totalApps) * 100 : 0;
      dept.pending = Math.max(0, dept.totalApps - dept.totalConns);
    });

    return Object.values(deptMap);
  }, [appCounts, connectionsGiven]);

  // Filter based on Search Term
  const filteredApplicationData = useMemo(() => {
    let list = applicationChartData;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      list = list.filter((item) => item.name.toLowerCase().includes(term));
    }
    return list;
  }, [applicationChartData, searchTerm]);

  const sortedApplicationData = useMemo(() => {
    const data = [...filteredApplicationData];
    if (sortBy === "name") {
      data.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "apps-desc") {
      data.sort((a, b) => b.totalApps - a.totalApps);
    } else if (sortBy === "conns-desc") {
      data.sort((a, b) => b.totalConns - a.totalConns);
    } else if (sortBy === "pending-desc") {
      data.sort((a, b) => b.pending - a.pending);
    }
    return data;
  }, [filteredApplicationData, sortBy]);

  const appTypesList = useMemo(() => {
    const types = new Set<string>();
    appCounts.forEach((item) => {
      types.add(`${item.description || "Unknown Type"} (App)`);
    });
    return Array.from(types);
  }, [appCounts]);

  const connTypesList = useMemo(() => {
    const types = new Set<string>();
    connectionsGiven.forEach((item) => {
      types.add(`${item.description || "Unknown Type"} (Conn)`);
    });
    return Array.from(types);
  }, [connectionsGiven]);

  const allCleanTypes = useMemo(() => {
    const set = new Set<string>();
    appCounts.forEach((it) => { if (it.description) set.add(it.description); });
    connectionsGiven.forEach((it) => { if (it.description) set.add(it.description); });
    return Array.from(set).sort();
  }, [appCounts, connectionsGiven]);

  const groupedPendingApplications = useMemo(() => {
    let filtered = pendingApplications;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(
        (app) =>
          app.deptId.toLowerCase().includes(term) ||
          app.applicationNo.toLowerCase().includes(term) ||
          app.description.toLowerCase().includes(term)
      );
    }
    const grouped: Record<string, typeof pendingApplications> = {};
    filtered.forEach((app) => {
      if (!grouped[app.deptId]) {
        grouped[app.deptId] = [];
      }
      grouped[app.deptId].push(app);
    });
    return grouped;
  }, [pendingApplications, searchTerm]);

  // Palettes
  const colors = ["#813405", "#d45113", "#f9a03f", "#f8dda4", "#a1a1aa", "#3b82f6"];
  const appColors = ["#813405", "#d45113", "#f9a03f", "#f8dda4", "#a04006", "#bd5008"];
  const connColors = ["#10b981", "#059669", "#06b6d4", "#3b82f6", "#6366f1", "#4f46e5"];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar Selector */}
      <DashboardSelector
        activeDashboard={activeDashboard}
        onSelectDashboard={(dashboard) => navigate(`/dashboard/${dashboard}`)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* ── Integrated Dashboard Header with Cascading Filters ──────────────── */}
        <IntegratedDashboardHeader
          title={
            isAreaView
              ? "Area Dashboard"
              : isProvinceView
              ? "Provincial Dashboard"
              : "Divisional Dashboard"
          }
          selectedDivision={selectedDivision}
          selectedProvince={selectedProvince}
          selectedArea={selectedArea}
          lastUpdated={lastUpdated}
          onDivisionChange={setSelectedDivision}
          onProvinceChange={setSelectedProvince}
          onAreaChange={setSelectedArea}
          onRefresh={() => setFetchCount((c) => c + 1)}
          loading={loading}
          onResetFilters={() => {
            setSelectedDivision("all");
            setSelectedProvince("all");
            setSelectedArea("all");
          }}
        />

        {/* ── Main Dashboard Body ─────────────────────────────────────────────── */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full flex-1">
          {error && (
            <div className="mb-6 flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700 shadow-xs">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
              <div>
                <p className="font-semibold">Unable to load live dashboard data</p>
                <p className="text-xs text-red-600 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {isAreaView ? (
            /* ══════════════════════════════════════════════════════════════════════
               1. AREA SELECTED: AREA ENGINEER DASHBOARD VIEW
               (Stock Value, PIV Period Summary, Daily PIV Breakdown, Material Master,
               and Area Job Progress Monitoring)
               ══════════════════════════════════════════════════════════════════════ */
            <div className="space-y-8">
              {/* ── UPPER ROW: 3 KEY SUMMARY CARDS ── */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
                {/* Card 1: Stock Value */}
                <Reveal delay={0}>
                  <div className="bg-gradient-to-br from-white via-white to-blue-50/20 rounded-3xl p-6 shadow-sm border border-slate-200/60 hover:border-blue-400/30 hover:shadow-lg transition-all duration-300 relative overflow-hidden h-full flex flex-col justify-between group min-h-[220px]">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                            <Package className="w-6 h-6 text-blue-600" />
                          </div>
                          <div>
                            <h2 className="text-base font-extrabold text-slate-800">Stock Value</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Area Stock Valuation</p>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-blue-700 bg-blue-100/80 px-2.5 py-1 rounded-full">
                          Real-time
                        </span>
                      </div>

                      {loading ? (
                        <div className="space-y-3 my-4">
                          <div className="h-10 w-48 bg-slate-100 rounded-xl animate-pulse" />
                          <div className="h-4 w-32 bg-slate-100 rounded-xl animate-pulse" />
                        </div>
                      ) : (
                        <div className="my-3">
                          <p className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight flex items-baseline gap-1.5">
                            <span className="text-sm font-extrabold text-slate-400">LKR</span>
                            {constructionStockValue !== null
                              ? (constructionStockValue / 1_000_000).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                              : "0.00"}
                            <span className="text-xl font-black text-blue-600">M</span>
                          </p>
                          <p className="text-xs text-slate-500 font-semibold mt-2">
                            Full Sum: LKR {constructionStockValue?.toLocaleString("en-US", { minimumFractionDigits: 2 }) ?? "0.00"}
                          </p>
                          <p className="text-xs text-slate-400 font-medium mt-3">
                            Area: {selectedAreaName || selectedArea} &nbsp;•&nbsp; Status: Active
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </Reveal>

                {/* Card 2: Total 30-Day Collections */}
                <Reveal delay={50}>
                  <div className="bg-gradient-to-br from-white via-white to-orange-50/20 rounded-3xl p-6 shadow-sm border border-slate-200/60 hover:border-orange-400/30 hover:shadow-lg transition-all duration-300 relative overflow-hidden h-full flex flex-col justify-between group min-h-[220px]">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-orange-50 border border-orange-100 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                            <Wallet className="w-6 h-6 text-orange-600" />
                          </div>
                          <div>
                            <h2 className="text-base font-extrabold text-slate-800">Total 30-Day Collections</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">30-Day Activity for {selectedAreaName || selectedArea}</p>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-orange-700 bg-orange-100/80 px-2.5 py-1 rounded-full">
                          30 Days
                        </span>
                      </div>

                      {loading ? (
                        <div className="space-y-3 my-4">
                          <div className="h-10 w-48 bg-slate-100 rounded-xl animate-pulse" />
                          <div className="h-4 w-32 bg-slate-100 rounded-xl animate-pulse" />
                        </div>
                      ) : (
                        <div className="my-3">
                          <p className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight flex items-baseline gap-1.5">
                            <span className="text-sm font-extrabold text-slate-400">LKR</span>
                            {total30DayCollection !== null
                              ? (total30DayCollection / 1_000_000).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                              : "0.00"}
                            <span className="text-xl font-black text-orange-600">M</span>
                          </p>
                          <p className="text-xs text-slate-500 font-semibold mt-2">
                            Full Sum: LKR {total30DayCollection.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                          <p className="text-xs text-slate-400 font-medium mt-3">
                            Daily Avg: LKR {(total30DayCollection / (pivTotal.length || 30)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </Reveal>

                {/* Card 3: PIV Period Summary */}
                <Reveal delay={100}>
                  <div className="bg-gradient-to-br from-white via-white to-amber-50/15 rounded-3xl p-6 shadow-sm border border-slate-200/60 hover:border-amber-400/30 hover:shadow-lg transition-all duration-300 relative overflow-hidden h-full flex flex-col justify-between group min-h-[220px]">
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-amber-50 border border-amber-100 rounded-2xl group-hover:scale-105 transition-transform duration-300">
                          <Calendar className="w-6 h-6 text-amber-600" />
                        </div>
                        <div>
                          <h2 className="text-base font-extrabold text-slate-800">PIV Period Summary</h2>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Custom Date Range</p>
                        </div>
                      </div>

                      {/* Date Inputs Form */}
                      <div className="grid grid-cols-2 gap-2.5 my-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-1">Start Date</span>
                          <input
                            type="date"
                            value={customPivStart}
                            onChange={(e) => setCustomPivStart(e.target.value)}
                            className="w-full px-2 py-1.5 text-[11px] border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-bold text-slate-600 transition-all font-mono"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-1">End Date</span>
                          <input
                            type="date"
                            value={customPivEnd}
                            onChange={(e) => setCustomPivEnd(e.target.value)}
                            className="w-full px-2 py-1.5 text-[11px] border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-bold text-slate-600 transition-all font-mono"
                          />
                        </div>
                      </div>

                      {/* Calculation Value Display */}
                      {customPivLoading ? (
                        <div className="my-2 space-y-1.5">
                          <div className="h-7 w-36 bg-slate-100 rounded-xl animate-pulse" />
                        </div>
                      ) : customPivError ? (
                        <div className="my-2 text-[11px] text-red-500 font-bold bg-red-50/50 p-2.5 border border-red-100 rounded-xl">
                          {customPivError}
                        </div>
                      ) : (
                        <div className="my-2 bg-gradient-to-r from-amber-50/40 to-orange-50/20 border border-amber-100/50 rounded-2xl p-2.5 shadow-xs">
                          <span className="text-[9px] font-black text-amber-800/80 uppercase tracking-widest">Total Collected</span>
                          <p className="text-lg font-black text-slate-800 tracking-tight mt-0.5 flex items-baseline gap-1">
                            <span className="text-xs font-bold text-slate-400 font-mono">LKR</span>
                            {customPivTotalAmount !== null
                              ? customPivTotalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                              : "0.00"}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </Reveal>
              </div>

              {/* ── LOWER SECTION: RECENT 7 DAYS ACTIVITY (LINE CHART) ── */}
              <Reveal delay={150}>
                <div className="bg-gradient-to-br from-white via-white to-orange-50/10 rounded-3xl p-6 shadow-sm border border-slate-200/60 hover:border-orange-400/30 hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-orange-50 border border-orange-100 rounded-2xl group-hover:scale-105 transition-transform duration-300">
                        <Activity className="w-5 h-5 text-orange-600 animate-pulse" />
                      </div>
                      <div>
                        <h3 className="text-lg font-extrabold text-slate-800">
                          Recent 7 Days Activity
                        </h3>
                        <p className="text-xs font-medium text-slate-400 mt-0.5">
                          Daily PIV collection trend for {selectedAreaName || selectedArea}
                        </p>
                      </div>
                    </div>

                    {!loading && recent7DaysLineChartData.length > 0 && (
                      <div className="flex flex-wrap items-center gap-3">
                        {/* Switcher Button: Line vs Bar */}
                        <div className="flex items-center bg-slate-100/90 rounded-xl p-0.5 border border-slate-200/50">
                          <button
                            type="button"
                            onClick={() => setArea7DaysChartType("line")}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              area7DaysChartType === "line"
                                ? "bg-white text-orange-600 shadow-xs"
                                : "text-slate-400 hover:text-slate-600"
                            }`}
                            title="Line Chart"
                          >
                            <TrendingUp className="w-3.5 h-3.5" />
                            <span>Line</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setArea7DaysChartType("bar")}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              area7DaysChartType === "bar"
                                ? "bg-white text-orange-600 shadow-xs"
                                : "text-slate-400 hover:text-slate-600"
                            }`}
                            title="Bar Chart"
                          >
                            <BarChart3 className="w-3.5 h-3.5" />
                            <span>Bar</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-2 bg-orange-50/70 border border-orange-100/80 rounded-2xl px-3.5 py-1.5">
                          <span className="text-[10px] font-black text-orange-800/80 uppercase tracking-wider">7-Day Total:</span>
                          <span className="text-sm font-black text-slate-800 font-mono">
                            LKR {recent7DaysLineChartData.reduce((s, it) => s + (it.amount || 0), 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-orange-700 bg-orange-100/80 px-3 py-1.5 rounded-xl hidden sm:inline-block">
                          Last 7 Days
                        </span>
                      </div>
                    )}
                  </div>

                  {loading ? (
                    <div className="h-64 flex items-center justify-center">
                      <div className="w-full space-y-4">
                        <div className="h-44 bg-slate-100/80 rounded-2xl animate-pulse" />
                        <div className="grid grid-cols-7 gap-3">
                          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                            <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : recent7DaysLineChartData.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-sm font-semibold">
                      No recent 7-day collection activity found.
                    </div>
                  ) : (
                    <div>
                      {/* Chart Container: Line Chart or Bar Chart */}
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          {area7DaysChartType === "line" ? (
                            <AreaChart
                              data={recent7DaysLineChartData}
                              margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
                            >
                              <defs>
                                <linearGradient id="areaPivGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#ea580c" stopOpacity={0.25} />
                                  <stop offset="95%" stopColor="#ea580c" stopOpacity={0.0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                              <XAxis
                                dataKey="formattedDate"
                                tick={{ fontSize: 12, fill: "#64748b", fontWeight: 600 }}
                                axisLine={{ stroke: "#e2e8f0" }}
                                tickLine={false}
                              />
                              <YAxis
                                tick={{ fontSize: 11, fill: "#94a3b8" }}
                                tickFormatter={(v) => `${(Number(v) / 1_000_000).toFixed(1)}M`}
                                axisLine={false}
                                tickLine={false}
                                width={55}
                              />
                              <Tooltip
                                formatter={(val: any) => [
                                  `LKR ${Number(val).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
                                  "Collection",
                                ]}
                                labelFormatter={(_, items) => {
                                  if (items && items[0]) {
                                    const payload = items[0].payload;
                                    return `${payload.day}, ${payload.formattedDate}`;
                                  }
                                  return "";
                                }}
                                contentStyle={{
                                  borderRadius: "16px",
                                  border: "1px solid rgba(234, 88, 12, 0.2)",
                                  boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
                                  fontSize: 13,
                                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                                  backdropFilter: "blur(12px)",
                                }}
                                cursor={{ stroke: "#ea580c", strokeWidth: 1, strokeDasharray: "4 4" }}
                              />
                              <Area
                                type="monotone"
                                dataKey="amount"
                                stroke="#ea580c"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#areaPivGradient)"
                                activeDot={{ r: 6, fill: "#ea580c", stroke: "#ffffff", strokeWidth: 2 }}
                              />
                            </AreaChart>
                          ) : (
                            <BarChart
                              data={recent7DaysLineChartData}
                              margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
                            >
                              <defs>
                                <linearGradient id="areaPivBarGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#ea580c" stopOpacity={0.95} />
                                  <stop offset="100%" stopColor="#c2410c" stopOpacity={0.75} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                              <XAxis
                                dataKey="formattedDate"
                                tick={{ fontSize: 12, fill: "#64748b", fontWeight: 600 }}
                                axisLine={{ stroke: "#e2e8f0" }}
                                tickLine={false}
                              />
                              <YAxis
                                tick={{ fontSize: 11, fill: "#94a3b8" }}
                                tickFormatter={(v) => `${(Number(v) / 1_000_000).toFixed(1)}M`}
                                axisLine={false}
                                tickLine={false}
                                width={55}
                              />
                              <Tooltip
                                formatter={(val: any) => [
                                  `LKR ${Number(val).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
                                  "Collection",
                                ]}
                                labelFormatter={(_, items) => {
                                  if (items && items[0]) {
                                    const payload = items[0].payload;
                                    return `${payload.day}, ${payload.formattedDate}`;
                                  }
                                  return "";
                                }}
                                contentStyle={{
                                  borderRadius: "16px",
                                  border: "1px solid rgba(234, 88, 12, 0.2)",
                                  boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
                                  fontSize: 13,
                                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                                  backdropFilter: "blur(12px)",
                                }}
                                cursor={{ fill: "rgba(234, 88, 12, 0.08)" }}
                              />
                              <Bar
                                dataKey="amount"
                                fill="url(#areaPivBarGradient)"
                                radius={[6, 6, 0, 0]}
                                maxBarSize={38}
                                isAnimationActive
                                animationDuration={600}
                              />
                            </BarChart>
                          )}
                        </ResponsiveContainer>
                      </div>

                      {/* Daily Breakdown Mini Cards Row */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mt-5 pt-5 border-t border-slate-100">
                        {(() => {
                          const sum7 = recent7DaysLineChartData.reduce((s, it) => s + (it.amount || 0), 0);
                          return recent7DaysLineChartData.map((item) => {
                            const pct = sum7 > 0 ? (item.amount / sum7) * 100 : 0;
                            const itemDate = new Date(item.date);
                            return (
                              <div
                                key={item.date}
                                className="flex flex-col justify-between p-3 rounded-2xl border border-slate-100 hover:border-orange-300 hover:bg-orange-50/20 transition-all duration-200 bg-white shadow-2xs group/pill"
                              >
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-[10px] font-black text-slate-400 uppercase font-mono">
                                    {item.day}
                                  </span>
                                  <span className="text-[10px] font-bold text-slate-500">
                                    {itemDate.toLocaleDateString("en-US", { month: "numeric", day: "numeric" })}
                                  </span>
                                </div>
                                <span className="text-xs font-black text-slate-800 font-mono truncate">
                                  LKR {(item.amount / 1_000_000).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}M
                                </span>
                                <div className="w-full h-1 bg-slate-100 rounded-full mt-2 overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-[color:var(--ceb-maroon,#813405)] to-orange-500 rounded-full transition-all duration-500"
                                    style={{ width: `${pct > 0 ? Math.max(pct, 4) : 0}%` }}
                                  />
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              </Reveal>

              {/* SECTION 2 — MATERIAL MASTER (DONUT PIE CHART) */}
              <Reveal delay={100}>
                <div className="bg-white rounded-[24px] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] border border-gray-100/80 p-6 flex flex-col hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.06)] transition-all duration-300 relative overflow-hidden group">
                  <div className="flex items-center justify-between mb-6 relative z-10 border-b border-gray-100 pb-3">
                    <div>
                      <h3 className="font-bold text-[15px] text-gray-900 tracking-tight flex items-center gap-2">
                        <Layers className="w-5 h-5 text-[color:var(--ceb-maroon,#813405)]" />
                        Material Master
                      </h3>
                      <p className="text-[13px] text-gray-500 font-medium mt-1">
                        Top Material Items Stock Breakdown for {selectedAreaName || selectedArea}
                      </p>
                    </div>
                  </div>

                  {loading ? (
                    <div className="h-64 flex items-center justify-center">
                      <RotateCcw className="w-6 h-6 animate-spin text-[color:var(--ceb-maroon,#813405)]" />
                    </div>
                  ) : materialPieChartItems.length > 0 ? (
                    <div className="flex flex-col md:flex-row items-center justify-around gap-8 py-4">
                      {/* SVG Donut Chart with center total callout & slice hover callout */}
                      <div className="relative w-56 h-56 flex-shrink-0 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                          <circle cx="100" cy="100" r="80" fill="none" stroke="#f3f4f6" strokeWidth="30" />
                          {(() => {
                            let currentOffset = 0;
                            return materialPieChartItems.map((item, i) => {
                              const isActive = activeMaterialPieIndex === i;
                              const isAnyActive = activeMaterialPieIndex !== null;
                              const color = SOLAR_NET_TYPE_COLORS[i % SOLAR_NET_TYPE_COLORS.length];
                              const strokeDash = `${(item.pct / 100) * C} ${C}`;
                              const strokeOff = -((currentOffset / 100) * C);
                              currentOffset += item.pct;

                              return (
                                <circle
                                  key={item.matCd}
                                  cx="100"
                                  cy="100"
                                  r="80"
                                  fill="none"
                                  stroke={color}
                                  strokeDasharray={strokeDash}
                                  strokeDashoffset={strokeOff}
                                  className="transition-all duration-300 cursor-pointer"
                                  style={{
                                    strokeWidth: isActive ? 36 : 30,
                                    opacity: isAnyActive && !isActive ? 0.3 : 1,
                                  }}
                                  onMouseEnter={() => setActiveMaterialPieIndex(i)}
                                  onMouseLeave={() => setActiveMaterialPieIndex(null)}
                                />
                              );
                            });
                          })()}
                        </svg>

                        {/* Center Callout Overlay */}
                        {activeMaterialPieIndex !== null && materialPieChartItems[activeMaterialPieIndex] ? (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="bg-gray-900 text-white px-3.5 py-2.5 rounded-xl text-center shadow-xl border border-gray-700/60 max-w-[170px]">
                              <p className="text-[11px] font-semibold truncate text-gray-200">
                                {materialPieChartItems[activeMaterialPieIndex].matCd}
                              </p>
                              <p className="text-xs font-extrabold mt-0.5 text-white font-mono">
                                LKR {materialPieChartItems[activeMaterialPieIndex].stockValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </p>
                              <p className="text-[11px] text-emerald-400 font-mono mt-0.5">
                                {materialPieChartItems[activeMaterialPieIndex].pct.toFixed(1)}%
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center px-2">
                              <p className="text-xs font-black text-gray-900 font-mono">
                                LKR {totalMaterialDonutStockValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </p>
                              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">Total Stock Value</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Donut Legend List */}
                      <div className="space-y-2.5 w-full max-w-md">
                        {materialPieChartItems.map((item, i) => {
                          const isActive = activeMaterialPieIndex === i;
                          const color = SOLAR_NET_TYPE_COLORS[i % SOLAR_NET_TYPE_COLORS.length];
                          return (
                            <div
                              key={item.matCd}
                              onMouseEnter={() => setActiveMaterialPieIndex(i)}
                              onMouseLeave={() => setActiveMaterialPieIndex(null)}
                              className={`flex items-center justify-between p-2.5 rounded-xl transition-all duration-300 cursor-pointer ${
                                isActive
                                  ? "bg-slate-100 ring-1 ring-slate-300 scale-[1.02] shadow-xs"
                                  : "hover:bg-slate-50"
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span
                                  className="w-3.5 h-3.5 rounded-full flex-shrink-0 shadow-2xs"
                                  style={{ backgroundColor: color }}
                                />
                                <div className="truncate">
                                  <span className="text-xs font-bold text-slate-800 font-mono mr-2">{item.matCd}</span>
                                  <span className="text-xs text-slate-600 truncate font-medium">{item.matNm}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                                <span className="text-xs font-extrabold text-slate-900 font-mono">
                                  LKR {item.stockValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-bold text-slate-600 font-mono">
                                  {item.pct.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-xs text-slate-400 font-medium">
                      No material stock breakdown available for this area
                    </div>
                  )}
                </div>
              </Reveal>

              {/* SECTION 3 — AREA JOB PROGRESS MONITORING */}
              <Reveal delay={200}>
                <div className="bg-white rounded-[24px] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] border border-slate-200/80 p-6 hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.06)] transition-all duration-300 w-full">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-6">
                    <div className="flex items-center gap-3.5">
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                        <BarChart3 className="w-6 h-6 text-emerald-600 animate-pulse" />
                      </div>
                      <div>
                        <h2 className="text-lg font-black text-slate-900 tracking-tight">Area Job Progress Monitoring</h2>
                        <p className="text-xs text-slate-400 font-semibold mt-0.5">
                          Applications submitted vs Connections given / Job closed by Area ({selectedAreaName || selectedArea} - {constructionYear})
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                          type="text"
                          placeholder="Search Dept / Area..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 pr-3.5 py-2 w-44 text-xs font-semibold rounded-2xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-[color:var(--ceb-maroon,#813405)]/10 focus:border-[color:var(--ceb-maroon,#813405)] transition-all bg-slate-50/50"
                        />
                      </div>

                      <div className="flex items-center gap-1.5 relative">
                        <Calendar className="absolute left-2.5 text-slate-400 w-3.5 h-3.5 pointer-events-none" />
                        <select
                          value={constructionYear}
                          onChange={(e) => setConstructionYear(Number(e.target.value))}
                          className="pl-8 pr-8 py-2 text-xs font-bold bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-[color:var(--ceb-maroon,#813405)]/10 text-slate-700 appearance-none cursor-pointer"
                        >
                          {[2026, 2025, 2024, 2023, 2022, 2021, 2020].map((yr) => (
                            <option key={yr} value={yr}>
                              {yr}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2.5 text-slate-400 w-3.5 h-3.5 pointer-events-none" />
                      </div>

                      <div className="flex items-center gap-1.5 relative">
                        <ArrowUpDown className="absolute left-2.5 text-slate-400 w-3.5 h-3.5 pointer-events-none" />
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as "name" | "apps-desc" | "conns-desc" | "pending-desc")}
                          className="pl-8 pr-8 py-2 text-xs font-bold bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-[color:var(--ceb-maroon,#813405)]/10 text-slate-700 appearance-none cursor-pointer"
                        >
                          <option value="name">Sort: Dept Code</option>
                          <option value="apps-desc">Sort: Applications (High-Low)</option>
                          <option value="conns-desc">Sort: Connections Given / Job Closed (High-Low)</option>
                          <option value="pending-desc">Sort: Pending (High-Low)</option>
                        </select>
                        <ChevronDown className="absolute right-2.5 text-slate-400 w-3.5 h-3.5 pointer-events-none" />
                      </div>

                      <div className="flex items-center bg-slate-100 rounded-2xl p-0.5 border border-slate-200/40">
                        <button
                          type="button"
                          onClick={() => setViewMode("chart")}
                          className={`p-1.5 rounded-xl transition cursor-pointer ${viewMode === "chart" ? "bg-white text-[color:var(--ceb-maroon,#813405)] shadow-xs" : "text-slate-500"}`}
                          title="Chart View"
                        >
                          <BarChart3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setViewMode("table")}
                          className={`p-1.5 rounded-xl transition cursor-pointer ${viewMode === "table" ? "bg-white text-[color:var(--ceb-maroon,#813405)] shadow-xs" : "text-slate-500"}`}
                          title="Table View"
                        >
                          <Table className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setViewMode("pending")}
                          className={`p-1.5 rounded-xl transition cursor-pointer ${viewMode === "pending" ? "bg-white text-[color:var(--ceb-maroon,#813405)] shadow-xs" : "text-slate-500"}`}
                          title="Pending List"
                        >
                          <Activity className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {viewMode === "chart" && (
                    <div className="h-96 w-full">
                      {loading ? (
                        <div className="h-full flex items-center justify-center">
                          <RotateCcw className="w-6 h-6 animate-spin text-[color:var(--ceb-maroon,#813405)]" />
                        </div>
                      ) : sortedApplicationData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={sortedApplicationData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                            <Tooltip content={<ConstructionTooltip />} cursor={{ fill: "rgba(0,0,0,0.02)" }} />
                            <Legend
                              content={() => (
                                <div className="flex items-center justify-center gap-8 pt-3 pb-1">
                                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50">
                                    <span className="w-3 h-3 rounded-full bg-[#813405]" />
                                    <span className="text-[11px] font-bold text-slate-700">Applications Submitted</span>
                                  </div>
                                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50">
                                    <span className="w-3 h-3 rounded-full bg-emerald-500" />
                                    <span className="text-[11px] font-bold text-slate-700">Connections Given / Job Closed</span>
                                  </div>
                                </div>
                              )}
                            />
                            {appTypesList.map((type, index) => (
                              <Bar
                                key={type}
                                dataKey={type}
                                stackId="apps"
                                fill={appColors[index % appColors.length]}
                                maxBarSize={16}
                                radius={index === appTypesList.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                                legendType="none"
                                isAnimationActive
                                animationDuration={800}
                              />
                            ))}
                            {connTypesList.map((type, index) => (
                              <Bar
                                key={type}
                                dataKey={type}
                                stackId="conns"
                                fill={connColors[index % connColors.length]}
                                maxBarSize={16}
                                radius={index === connTypesList.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                                legendType="none"
                                isAnimationActive
                                animationDuration={800}
                              />
                            ))}
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-xs text-slate-400 font-medium">
                          No construction application data available for the selected year and area
                        </div>
                      )}
                    </div>
                  )}

                  {viewMode === "table" && (
                    <div className="border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
                      <div className="max-h-96 overflow-y-auto">
                        <table className="w-full text-left text-xs font-sans">
                          <thead className="bg-slate-800 text-slate-100 sticky top-0 font-bold uppercase tracking-wider text-[10px]">
                            <tr>
                              <th className="px-4 py-3">Area / Dept ID</th>
                              <th className="px-4 py-3 text-center">Applied</th>
                              <th className="px-4 py-3 text-center">Connections Given / Job Closed</th>
                              <th className="px-4 py-3 text-center">Pending</th>
                              <th className="px-4 py-3 text-right">Completion Rate</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                            {sortedApplicationData.map((row) => (
                              <tr key={row.name} className="hover:bg-slate-50 font-medium">
                                <td className="px-4 py-2.5 font-bold font-mono text-slate-900">{row.name}</td>
                                <td className="px-4 py-2.5 text-center font-bold font-mono text-[#813405]">{row.totalApps}</td>
                                <td className="px-4 py-2.5 text-center font-bold font-mono text-emerald-600">{row.totalConns}</td>
                                <td className="px-4 py-2.5 text-center font-bold font-mono text-red-600">{row.pending}</td>
                                <td className="px-4 py-2.5 text-right font-bold font-mono text-blue-600">
                                  {row.completionRate.toFixed(1)}%
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {viewMode === "pending" && (
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                      {Object.keys(groupedPendingApplications).length > 0 ? (
                        Object.entries(groupedPendingApplications).map(([deptId, apps]) => {
                          const isExpanded = expandedPendingDepts[deptId];
                          return (
                            <div key={deptId} className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-sm">
                              <button
                                type="button"
                                onClick={() => togglePendingDeptExpand(deptId)}
                                className="w-full px-4 py-3 bg-slate-50 flex items-center justify-between text-xs font-bold text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                              >
                                <span className="font-mono text-sm text-[color:var(--ceb-maroon,#813405)]">
                                  Area/Dept: {deptId} ({apps.length} Pending Applications)
                                </span>
                                {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                              </button>
                              {isExpanded && (
                                <div className="p-4 space-y-2 border-t border-slate-100">
                                  {apps.map((app, i) => (
                                    <div key={i} className="flex justify-between items-center text-xs p-2 bg-slate-50/70 rounded-xl border border-slate-100">
                                      <div>
                                        <span className="font-bold text-slate-800 font-mono">{app.applicationNo}</span>
                                        <span className="text-slate-500 ml-2 font-medium">({app.description})</span>
                                      </div>
                                      <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-lg text-[10px] font-bold">Pending</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center py-8 text-xs text-slate-400 font-medium">
                          No pending applications found
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Reveal>
            </div>
          ) : isProvinceView ? (
            /* ══════════════════════════════════════════════════════════════════════
               2. PROVINCE SELECTED: CONSTRUCTION PROGRESS DASHBOARD VIEW
               (Exact Construction Progress Dashboard design from DGM Dashboard)
               ══════════════════════════════════════════════════════════════════════ */
            <>
              {/* ── UPPER ROW: 3 KEY SUMMARY CARDS ── */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch mb-8">
                {/* Card 1: Stock Value Card */}
                <Reveal delay={0}>
                  <div className="bg-gradient-to-br from-white via-white to-blue-50/20 rounded-3xl p-6 shadow-sm border border-slate-200/60 hover:border-blue-400/30 hover:shadow-lg transition-all duration-300 relative overflow-hidden group min-h-[220px] flex flex-col justify-between h-full">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl group-hover:scale-105 transition-transform duration-300">
                            <Package className="w-6 h-6 text-blue-600" />
                          </div>
                          <div>
                            <h2 className="text-base font-extrabold text-slate-800">Stock Value</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">NEW items — {selectedProvince}</p>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-blue-700 bg-blue-100/80 px-2.5 py-1 rounded-full">
                          Real-time
                        </span>
                      </div>

                      {loading ? (
                        <div className="space-y-3 my-4">
                          <div className="h-10 w-48 bg-slate-100 rounded-xl animate-pulse" />
                          <div className="h-4 w-32 bg-slate-100 rounded-xl animate-pulse" />
                        </div>
                      ) : (
                        <div className="my-3">
                          <p className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight flex items-baseline gap-1.5">
                            <span className="text-sm font-extrabold text-slate-400">LKR</span>
                            {constructionStockValue !== null
                              ? (constructionStockValue / 1_000_000).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                              : "0.00"}
                            <span className="text-xl font-black text-blue-600">M</span>
                          </p>
                          <p className="text-xs text-slate-500 font-semibold mt-2">
                            Full Sum: LKR {constructionStockValue?.toLocaleString("en-US", { minimumFractionDigits: 2 }) ?? "0.00"}
                          </p>
                          <p className="text-xs text-slate-400 font-medium mt-4">
                            Grade Code: NEW &nbsp;•&nbsp; Status: Active
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </Reveal>

                {/* Card 2: Total 30-Day Collections */}
                <Reveal delay={50}>
                  <div className="bg-gradient-to-br from-white via-white to-orange-50/20 rounded-3xl p-6 shadow-sm border border-slate-200/60 hover:border-orange-400/30 hover:shadow-lg transition-all duration-300 relative overflow-hidden h-full flex flex-col justify-between group min-h-[220px]">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-orange-50 border border-orange-100 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                            <Wallet className="w-6 h-6 text-orange-600" />
                          </div>
                          <div>
                            <h2 className="text-base font-extrabold text-slate-800">Total 30-Day Collections</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">30-Day Activity for {selectedProvince}</p>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-orange-700 bg-orange-100/80 px-2.5 py-1 rounded-full">
                          30 Days
                        </span>
                      </div>

                      {loading ? (
                        <div className="space-y-3 my-4">
                          <div className="h-10 w-48 bg-slate-100 rounded-xl animate-pulse" />
                          <div className="h-4 w-32 bg-slate-100 rounded-xl animate-pulse" />
                        </div>
                      ) : (
                        <div className="my-3">
                          <p className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight flex items-baseline gap-1.5">
                            <span className="text-sm font-extrabold text-slate-400">LKR</span>
                            {total30DayCollection !== null
                              ? (total30DayCollection / 1_000_000).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                              : "0.00"}
                            <span className="text-xl font-black text-orange-600">M</span>
                          </p>
                          <p className="text-xs text-slate-500 font-semibold mt-2">
                            Full Sum: LKR {total30DayCollection.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                          <p className="text-xs text-slate-400 font-medium mt-3">
                            Daily Avg: LKR {(total30DayCollection / (pivTotal.length || 30)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </Reveal>

                {/* Card 3: Custom PIV Period Lookup Card */}
                <Reveal delay={100}>
                  <div className="bg-gradient-to-br from-white via-white to-amber-50/15 rounded-3xl p-6 shadow-sm border border-slate-200/60 hover:border-amber-400/30 hover:shadow-lg transition-all duration-300 relative overflow-hidden h-full flex flex-col justify-between group min-h-[220px]">
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-amber-50 border border-amber-100 rounded-2xl group-hover:scale-105 transition-transform duration-300">
                          <Calendar className="w-6 h-6 text-amber-600" />
                        </div>
                        <div>
                          <h2 className="text-base font-extrabold text-slate-800">PIV Period Summary</h2>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Custom Date Range</p>
                        </div>
                      </div>

                      {/* Date Inputs Form */}
                      <div className="grid grid-cols-2 gap-2.5 my-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-1">Start Date</span>
                          <input
                            type="date"
                            value={customPivStart}
                            onChange={(e) => setCustomPivStart(e.target.value)}
                            className="w-full px-2 py-1.5 text-[11px] border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-bold text-slate-600 transition-all font-mono"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-1">End Date</span>
                          <input
                            type="date"
                            value={customPivEnd}
                            onChange={(e) => setCustomPivEnd(e.target.value)}
                            className="w-full px-2 py-1.5 text-[11px] border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-bold text-slate-600 transition-all font-mono"
                          />
                        </div>
                      </div>

                      {/* Calculation Value Display */}
                      {customPivLoading ? (
                        <div className="my-2 space-y-1.5">
                          <div className="h-7 w-36 bg-slate-100 rounded-xl animate-pulse" />
                        </div>
                      ) : customPivError ? (
                        <div className="my-2 text-[11px] text-red-500 font-bold bg-red-50/50 p-2.5 border border-red-100 rounded-xl">
                          {customPivError}
                        </div>
                      ) : (
                        <div className="my-2 bg-gradient-to-r from-amber-50/40 to-orange-50/20 border border-amber-100/50 rounded-2xl p-2.5 shadow-xs">
                          <span className="text-[9px] font-black text-amber-800/80 uppercase tracking-widest">Total Collected</span>
                          <p className="text-lg font-black text-slate-800 tracking-tight mt-0.5 flex items-baseline gap-1">
                            <span className="text-xs font-bold text-slate-400 font-mono">LKR</span>
                            {customPivTotalAmount !== null
                              ? customPivTotalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                              : "0.00"}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </Reveal>
              </div>

              {/* ── LOWER SECTION: RECENT 7 DAYS ACTIVITY (LINE CHART) ── */}
              <Reveal delay={150}>
                <div className="bg-gradient-to-br from-white via-white to-orange-50/10 rounded-3xl p-6 shadow-sm border border-slate-200/60 hover:border-orange-400/30 hover:shadow-lg transition-all duration-300 relative overflow-hidden group mb-8">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-orange-50 border border-orange-100 rounded-2xl group-hover:scale-105 transition-transform duration-300">
                        <Activity className="w-5 h-5 text-orange-600 animate-pulse" />
                      </div>
                      <div>
                        <h3 className="text-lg font-extrabold text-slate-800">
                          Recent 7 Days Activity
                        </h3>
                        <p className="text-xs font-medium text-slate-400 mt-0.5">
                          Daily PIV collection trend for {selectedProvince}
                        </p>
                      </div>
                    </div>

                    {!loading && recent7DaysLineChartData.length > 0 && (
                      <div className="flex flex-wrap items-center gap-3">
                        {/* Switcher Button: Line vs Bar */}
                        <div className="flex items-center bg-slate-100/90 rounded-xl p-0.5 border border-slate-200/50">
                          <button
                            type="button"
                            onClick={() => setProvincial7DaysChartType("line")}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              provincial7DaysChartType === "line"
                                ? "bg-white text-orange-600 shadow-xs"
                                : "text-slate-400 hover:text-slate-600"
                            }`}
                            title="Line Chart"
                          >
                            <TrendingUp className="w-3.5 h-3.5" />
                            <span>Line</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setProvincial7DaysChartType("bar")}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              provincial7DaysChartType === "bar"
                                ? "bg-white text-orange-600 shadow-xs"
                                : "text-slate-400 hover:text-slate-600"
                            }`}
                            title="Bar Chart"
                          >
                            <BarChart3 className="w-3.5 h-3.5" />
                            <span>Bar</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-2 bg-orange-50/70 border border-orange-100/80 rounded-2xl px-3.5 py-1.5">
                          <span className="text-[10px] font-black text-orange-800/80 uppercase tracking-wider">7-Day Total:</span>
                          <span className="text-sm font-black text-slate-800 font-mono">
                            LKR {recent7DaysLineChartData.reduce((s, it) => s + (it.amount || 0), 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-orange-700 bg-orange-100/80 px-3 py-1.5 rounded-xl hidden sm:inline-block">
                          Last 7 Days
                        </span>
                      </div>
                    )}
                  </div>

                  {loading ? (
                    <div className="h-64 flex items-center justify-center">
                      <div className="w-full space-y-4">
                        <div className="h-44 bg-slate-100/80 rounded-2xl animate-pulse" />
                        <div className="grid grid-cols-7 gap-3">
                          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                            <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : recent7DaysLineChartData.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-sm font-semibold">
                      No collection details available for this province.
                    </div>
                  ) : (
                    <div>
                      {/* Chart Container: Line Chart or Bar Chart */}
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          {provincial7DaysChartType === "line" ? (
                            <AreaChart
                              data={recent7DaysLineChartData}
                              margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
                            >
                              <defs>
                                <linearGradient id="provincePivGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#ea580c" stopOpacity={0.25} />
                                  <stop offset="95%" stopColor="#ea580c" stopOpacity={0.0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                              <XAxis
                                dataKey="formattedDate"
                                tick={{ fontSize: 12, fill: "#64748b", fontWeight: 600 }}
                                axisLine={{ stroke: "#e2e8f0" }}
                                tickLine={false}
                              />
                              <YAxis
                                tick={{ fontSize: 11, fill: "#94a3b8" }}
                                tickFormatter={(v) => `${(Number(v) / 1_000_000).toFixed(1)}M`}
                                axisLine={false}
                                tickLine={false}
                                width={55}
                              />
                              <Tooltip
                                formatter={(val: any) => [
                                  `LKR ${Number(val).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
                                  "Collection",
                                ]}
                                labelFormatter={(_, items) => {
                                  if (items && items[0]) {
                                    const payload = items[0].payload;
                                    return `${payload.day}, ${payload.formattedDate}`;
                                  }
                                  return "";
                                }}
                                contentStyle={{
                                  borderRadius: "16px",
                                  border: "1px solid rgba(234, 88, 12, 0.2)",
                                  boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
                                  fontSize: 13,
                                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                                  backdropFilter: "blur(12px)",
                                }}
                                cursor={{ stroke: "#ea580c", strokeWidth: 1, strokeDasharray: "4 4" }}
                              />
                              <Area
                                type="monotone"
                                dataKey="amount"
                                stroke="#ea580c"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#provincePivGradient)"
                                activeDot={{ r: 6, fill: "#ea580c", stroke: "#ffffff", strokeWidth: 2 }}
                              />
                            </AreaChart>
                          ) : (
                            <BarChart
                              data={recent7DaysLineChartData}
                              margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
                            >
                              <defs>
                                <linearGradient id="provincePivBarGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#ea580c" stopOpacity={0.95} />
                                  <stop offset="100%" stopColor="#c2410c" stopOpacity={0.75} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                              <XAxis
                                dataKey="formattedDate"
                                tick={{ fontSize: 12, fill: "#64748b", fontWeight: 600 }}
                                axisLine={{ stroke: "#e2e8f0" }}
                                tickLine={false}
                              />
                              <YAxis
                                tick={{ fontSize: 11, fill: "#94a3b8" }}
                                tickFormatter={(v) => `${(Number(v) / 1_000_000).toFixed(1)}M`}
                                axisLine={false}
                                tickLine={false}
                                width={55}
                              />
                              <Tooltip
                                formatter={(val: any) => [
                                  `LKR ${Number(val).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
                                  "Collection",
                                ]}
                                labelFormatter={(_, items) => {
                                  if (items && items[0]) {
                                    const payload = items[0].payload;
                                    return `${payload.day}, ${payload.formattedDate}`;
                                  }
                                  return "";
                                }}
                                contentStyle={{
                                  borderRadius: "16px",
                                  border: "1px solid rgba(234, 88, 12, 0.2)",
                                  boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
                                  fontSize: 13,
                                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                                  backdropFilter: "blur(12px)",
                                }}
                                cursor={{ fill: "rgba(234, 88, 12, 0.08)" }}
                              />
                              <Bar
                                dataKey="amount"
                                fill="url(#provincePivBarGradient)"
                                radius={[6, 6, 0, 0]}
                                maxBarSize={38}
                                isAnimationActive
                                animationDuration={600}
                              />
                            </BarChart>
                          )}
                        </ResponsiveContainer>
                      </div>

                      {/* Daily Breakdown Mini Cards Row */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mt-5 pt-5 border-t border-slate-100">
                        {(() => {
                          const sum7 = recent7DaysLineChartData.reduce((s, it) => s + (it.amount || 0), 0);
                          return recent7DaysLineChartData.map((item) => {
                            const pct = sum7 > 0 ? (item.amount / sum7) * 100 : 0;
                            const itemDate = new Date(item.date);
                            return (
                              <div
                                key={item.date}
                                className="flex flex-col justify-between p-3 rounded-2xl border border-slate-100 hover:border-orange-300 hover:bg-orange-50/20 transition-all duration-200 bg-white shadow-2xs group/pill"
                              >
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-[10px] font-black text-slate-400 uppercase font-mono">
                                    {item.day}
                                  </span>
                                  <span className="text-[10px] font-bold text-slate-500">
                                    {itemDate.toLocaleDateString("en-US", { month: "numeric", day: "numeric" })}
                                  </span>
                                </div>
                                <span className="text-xs font-black text-slate-800 font-mono truncate">
                                  LKR {(item.amount / 1_000_000).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}M
                                </span>
                                <div className="w-full h-1 bg-slate-100 rounded-full mt-2 overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-[color:var(--ceb-maroon,#813405)] to-orange-500 rounded-full transition-all duration-500"
                                    style={{ width: `${pct > 0 ? Math.max(pct, 4) : 0}%` }}
                                  />
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              </Reveal>

              {/* Bottom Row: Construction Progress Monitoring (Applications Submitted vs Connections Given) */}
              <Reveal delay={200}>
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/60 hover:shadow-md transition-all duration-300 w-full">
                  {/* Header Controls */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-6">
                    <div className="flex items-center gap-3.5">
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                        <BarChart3 className="w-6 h-6 text-emerald-600 animate-pulse" />
                      </div>
                      <div>
                        <h2 className="text-lg font-black text-slate-900 tracking-tight">Construction Progress Monitoring</h2>
                        <p className="text-xs text-slate-400 font-semibold mt-0.5">
                          Side-by-side comparison of Applications Submitted vs Connections Given ({selectedProvince} - {constructionYear})
                        </p>
                      </div>
                    </div>

                    {/* Controls Toolbar */}
                    <div className="flex flex-wrap items-center gap-3">
                      {/* Search */}
                      <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder="Search Dept ID..."
                          className="pl-10 pr-3.5 py-2 w-44 text-xs font-semibold rounded-2xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-[color:var(--ceb-maroon,#813405)]/10 focus:border-[color:var(--ceb-maroon,#813405)] transition-all bg-slate-50/50"
                        />
                      </div>

                      {/* Year Selector */}
                      <div className="flex items-center gap-1.5 relative">
                        <Calendar className="absolute left-2.5 text-slate-400 w-3.5 h-3.5 pointer-events-none" />
                        <select
                          value={constructionYear}
                          onChange={(e) => setConstructionYear(Number(e.target.value))}
                          className="pl-8 pr-8 py-2 text-xs font-bold bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-[color:var(--ceb-maroon,#813405)]/10 text-slate-700 appearance-none cursor-pointer"
                        >
                          {[2026, 2025, 2024, 2023, 2022, 2021, 2020].map((yr) => (
                            <option key={yr} value={yr}>
                              {yr}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2.5 text-slate-400 w-3.5 h-3.5 pointer-events-none" />
                      </div>

                      {/* Sort Selector */}
                      <div className="flex items-center gap-1.5 relative">
                        <ArrowUpDown className="absolute left-2.5 text-slate-400 w-3.5 h-3.5 pointer-events-none" />
                        <select
                          value={sortBy}
                          onChange={(e: any) => setSortBy(e.target.value)}
                          className="pl-8 pr-8 py-2 text-xs font-bold bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-[color:var(--ceb-maroon,#813405)]/10 text-slate-700 appearance-none cursor-pointer"
                        >
                          <option value="name">Sort: Dept Code</option>
                          <option value="apps-desc">Sort: Applications (High-Low)</option>
                          <option value="conns-desc">Sort: Connections Given (High-Low)</option>
                          <option value="pending-desc">Sort: Pending (High-Low)</option>
                        </select>
                        <ChevronDown className="absolute right-2.5 text-slate-400 w-3.5 h-3.5 pointer-events-none" />
                      </div>

                      {/* View Switcher (Chart vs Table) */}
                      <div className="flex items-center bg-slate-100 rounded-2xl p-0.5 border border-slate-200/40">
                        <button
                          type="button"
                          onClick={() => setViewMode("chart")}
                          className={`p-2 rounded-xl transition-all cursor-pointer ${
                            viewMode === "chart" ? "bg-white text-[color:var(--ceb-maroon,#813405)] shadow-xs" : "text-slate-400 hover:text-slate-600"
                          }`}
                          title="Chart View"
                        >
                          <BarChart3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setViewMode("table")}
                          className={`p-2 rounded-xl transition-all cursor-pointer ${
                            viewMode === "table" ? "bg-white text-[color:var(--ceb-maroon,#813405)] shadow-xs" : "text-slate-400 hover:text-slate-600"
                          }`}
                          title="Table View"
                        >
                          <Table className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Standalone Pending Details Button */}
                      <button
                        type="button"
                        onClick={() => setViewMode(viewMode === "pending" ? "chart" : "pending")}
                        className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 border shadow-xs cursor-pointer ${
                          viewMode === "pending"
                            ? "bg-red-600 text-white border-red-600 shadow-red-200"
                            : "bg-red-50 text-red-600 border-red-200/80 hover:bg-red-100/80"
                        }`}
                      >
                        <AlertCircle className="w-4 h-4" />
                        <span>Pending Details</span>
                        {pendingApplications.length > 0 && (
                          <span
                            className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                              viewMode === "pending" ? "bg-white/20 text-white" : "bg-red-200/60 text-red-700"
                            }`}
                          >
                            {pendingApplications.length}
                          </span>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Main Content Area: Chart, Table, or Pending */}
                  {loading ? (
                    <div className="h-80 w-full bg-slate-50 rounded-2xl animate-pulse flex items-center justify-center">
                      <span className="text-sm font-semibold text-slate-400 animate-bounce">Loading data...</span>
                    </div>
                  ) : viewMode === "pending" ? (
                    <div className="flex flex-col gap-4 max-h-[460px] overflow-y-auto pr-1">
                      {/* Summary Banner */}
                      <div className="bg-red-50/50 border border-red-100/80 rounded-2xl p-4 flex items-center gap-3 sticky top-0 z-10 shadow-xs backdrop-blur-md">
                        <div className="bg-red-100/80 p-2 rounded-xl text-red-600">
                          <AlertCircle className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-red-800 font-bold text-sm">
                            {Object.values(groupedPendingApplications).flat().length} Pending Applications
                          </div>
                          <div className="text-red-600/80 text-xs font-semibold">
                            Across {Object.keys(groupedPendingApplications).length} Departments
                          </div>
                        </div>
                      </div>

                      {/* Grouped Accordion */}
                      <div className="flex flex-col gap-3">
                        {Object.entries(groupedPendingApplications).sort(([a], [b]) => a.localeCompare(b)).map(([deptId, apps]) => {
                          const isExpanded = expandedPendingDepts[deptId];
                          return (
                            <div key={deptId} className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-xs">
                              <button
                                type="button"
                                onClick={() => togglePendingDeptExpand(deptId)}
                                className="w-full flex items-center justify-between p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="text-slate-400">
                                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                  </div>
                                  <span className="font-extrabold text-slate-800 font-mono tracking-tight text-sm">{deptId}</span>
                                </div>
                                <span className="bg-red-50 text-red-600 border border-red-100 px-3 py-1 rounded-full text-[11px] font-bold shadow-xs">
                                  {apps.length} pending
                                </span>
                              </button>

                              {isExpanded && (
                                <div className="border-t border-slate-100">
                                  <table className="w-full text-left text-xs text-slate-700">
                                    <thead className="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                      <tr>
                                        <th className="px-6 py-3 border-b border-slate-100 w-16 text-center">#</th>
                                        <th className="px-6 py-3 border-b border-slate-100">Application No</th>
                                        <th className="px-6 py-3 border-b border-slate-100">Description</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {apps.map((app, idx) => (
                                        <tr key={app.applicationNo} className="hover:bg-slate-50/50 transition-colors">
                                          <td className="px-6 py-3 text-center font-mono text-slate-400">{idx + 1}</td>
                                          <td className="px-6 py-3 font-mono font-bold text-slate-700">{app.applicationNo}</td>
                                          <td className="px-6 py-3 font-medium text-slate-600">{app.description}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {Object.keys(groupedPendingApplications).length === 0 && (
                          <div className="py-12 flex flex-col items-center gap-2 text-center text-slate-400">
                            <AlertCircle className="w-10 h-10 opacity-20" />
                            <span className="text-sm font-semibold">No pending applications found.</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : sortedApplicationData.length === 0 ? (
                    <div className="h-80 flex flex-col items-center justify-center text-slate-400 gap-2">
                      <BarChart3 className="w-10 h-10 opacity-20" />
                      <span className="text-sm font-bold">No records match search criteria for {selectedProvince}</span>
                    </div>
                  ) : viewMode === "chart" ? (
                    /* Grouped Stacked Bar Chart */
                    <div className="h-96 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={sortedApplicationData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                          <Tooltip content={<ConstructionTooltip />} cursor={{ fill: "rgba(0,0,0,0.02)" }} />

                          {/* Legend */}
                          <Legend
                            content={() => (
                              <div className="flex items-center justify-center gap-8 pt-3 pb-1">
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50">
                                  <span className="w-3 h-3 rounded-full bg-[#813405]" />
                                  <span className="text-[11px] font-bold text-slate-700">Applications Submitted</span>
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50">
                                  <span className="w-3 h-3 rounded-full bg-emerald-500" />
                                  <span className="text-[11px] font-bold text-slate-700">Connections Given</span>
                                </div>
                              </div>
                            )}
                          />

                          {/* Stacking applications (Warm colors) */}
                          {appTypesList.map((type, index) => (
                            <Bar
                              key={type}
                              dataKey={type}
                              stackId="apps"
                              fill={appColors[index % appColors.length]}
                              maxBarSize={18}
                              radius={index === appTypesList.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                              legendType="none"
                              isAnimationActive
                              animationDuration={800}
                            />
                          ))}

                          {/* Stacking connections given (Cool colors) */}
                          {connTypesList.map((type, index) => (
                            <Bar
                              key={type}
                              dataKey={type}
                              stackId="conns"
                              fill={connColors[index % connColors.length]}
                              maxBarSize={18}
                              radius={index === connTypesList.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                              legendType="none"
                              isAnimationActive
                              animationDuration={800}
                            />
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    /* Performance Table View */
                    <div className="overflow-x-auto rounded-2xl border border-slate-200/80 shadow-xs max-h-[460px] overflow-y-auto pr-1">
                      <table className="w-full text-left text-xs text-slate-700">
                        <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider sticky top-0 border-b border-slate-200 z-10">
                          <tr>
                            <th className="px-6 py-4 bg-slate-50 w-12"></th>
                            <th className="px-6 py-4">Dept / Cost Center</th>
                            <th className="px-6 py-4 text-right">Total Applications</th>
                            <th className="px-6 py-4 text-right">Total Connections Given</th>
                            <th className="px-6 py-4 text-right text-red-600/90 font-extrabold">Pending</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {sortedApplicationData.map((row, i) => {
                            const isExpanded = !!expandedDepts[row.name];
                            return (
                              <React.Fragment key={row.name}>
                                <tr
                                  onClick={() => toggleDeptExpand(row.name)}
                                  className={`cursor-pointer hover:bg-slate-50/80 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-slate-50/20"}`}
                                >
                                  <td className="px-6 py-3.5 text-center text-slate-400">
                                    {isExpanded ? <ChevronUp className="w-4 h-4 text-[#813405] font-bold" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                                  </td>
                                  <td className="px-6 py-3.5 font-extrabold text-slate-800 font-mono tracking-tight text-sm">{row.name}</td>
                                  <td className="px-6 py-3.5 text-right font-bold text-slate-700 font-mono">{row.totalApps}</td>
                                  <td className="px-6 py-3.5 text-right font-bold text-emerald-600 font-mono">{row.totalConns}</td>
                                  <td className="px-6 py-3.5 text-right font-mono">
                                    <span
                                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold inline-block ${
                                        row.pending > 0
                                          ? "bg-red-50 text-red-600 border border-red-100"
                                          : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                      }`}
                                    >
                                      {row.pending}
                                    </span>
                                  </td>
                                </tr>
                                {isExpanded && (
                                  <tr className="bg-slate-50/40">
                                    <td colSpan={5} className="px-6 sm:px-12 py-4 border-t border-b border-slate-200/50">
                                      <div className="max-w-3xl bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-3.5">
                                        <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                          <Info className="w-4 h-4 text-indigo-500" />
                                          Comparable Type Breakdowns for {row.name}
                                        </p>
                                        <div className="overflow-x-auto rounded-xl border border-slate-100">
                                          <table className="w-full text-left text-xs text-slate-700">
                                            <thead className="bg-slate-50/80 text-[9px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                                              <tr>
                                                <th className="px-4 py-3">Connection Type</th>
                                                <th className="px-4 py-3 text-right">Applications Submitted</th>
                                                <th className="px-4 py-3 text-right">Connections Given</th>
                                                <th className="px-4 py-3 text-right text-red-600/90 font-extrabold">Pending</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                              {allCleanTypes.map((type) => {
                                                const appKey = `${type} (App)`;
                                                const connKey = `${type} (Conn)`;
                                                const typeApps = row[appKey] || 0;
                                                const typeConns = row[connKey] || 0;
                                                if (typeApps === 0 && typeConns === 0) return null;
                                                const typePending = Math.max(0, typeApps - typeConns);

                                                return (
                                                  <tr key={type} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-4 py-2.5 font-bold text-slate-700">{type}</td>
                                                    <td className="px-4 py-2.5 text-right font-mono font-semibold text-slate-600">{typeApps}</td>
                                                    <td className="px-4 py-2.5 text-right font-mono font-semibold text-emerald-600">{typeConns}</td>
                                                    <td className="px-4 py-2.5 text-right font-mono">
                                                      <span className={typePending > 0 ? "font-bold text-red-600" : "font-semibold text-slate-400"}>
                                                        {typePending}
                                                      </span>
                                                    </td>
                                                  </tr>
                                                );
                                              })}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </Reveal>
            </>
          ) : (
            /* ══════════════════════════════════════════════════════════════════════
               3. PROVINCE NOT SELECTED (ALL PROVINCES): FINANCIAL & ACCOUNTING VIEW
               (Stock Value on Left, PIV Collection on Right, 7-Day Chart, Summary Table)
               ══════════════════════════════════════════════════════════════════════ */
            <>
              {/* ── KPI Cards Section ────────────────────────────────────────── */}
              <Reveal delay={0}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  {/* Card 1: Stock Value (Left) */}
                  <div className="relative bg-gradient-to-br from-white to-blue-50/30 rounded-2xl p-6 sm:p-7 shadow-xs border border-gray-100 transition-all duration-300 hover:border-blue-600/40 hover:shadow-md flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="p-2.5 bg-blue-50 rounded-xl text-blue-700">
                          <BarChart3 className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-semibold text-blue-700 bg-blue-100/80 px-2.5 py-1 rounded-full">
                          Real-time
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 tracking-tight">Stock Value</h3>
                      {loading ? (
                        <div className="h-8 w-48 bg-gray-100 rounded-lg animate-pulse mt-2" />
                      ) : (
                        <p className="text-3xl font-extrabold text-gray-900 mt-2">
                          {(displayStockTotal / 1_000_000).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
                          <span className="text-xl font-semibold text-gray-600">M LKR</span>
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1.5 flex items-center justify-between">
                        <span>{formattedToday} — NEW Grade Items</span>
                        {stockTotalTime && (
                          <span className="text-[10px] text-gray-400">Data as of: {stockTotalTime}</span>
                        )}
                      </p>
                    </div>

                    {!loading && displayStockDivision.length > 0 && (
                      <div className="mt-5 pt-4 border-t border-gray-100 space-y-2.5">
                        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                          Breakdown by Division
                        </p>
                        {displayStockDivision.map((item) => (
                          <div key={item.company} className="flex items-center justify-between gap-3 text-xs">
                            <span className="min-w-[56px] font-medium text-gray-700 uppercase">
                              {normalizeCompany(item.company)}
                            </span>
                            <div className="flex-1 h-2 rounded-full bg-blue-100 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-blue-700 transition-all duration-500"
                                style={{
                                  width: `${displayStockTotal > 0 ? Math.max((item.amount / displayStockTotal) * 100, 6) : 0}%`,
                                }}
                              />
                            </div>
                            <span className="min-w-[80px] text-right font-semibold text-gray-800 font-mono">
                              LKR {(item.amount / 1_000_000).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Card 2: PIV Collection (Right) */}
                  <div className="relative bg-gradient-to-br from-white to-orange-50/30 rounded-2xl p-6 sm:p-7 shadow-xs border border-gray-100 transition-all duration-300 hover:border-[#7A0000]/40 hover:shadow-md">
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2.5 bg-[#7A0000]/10 rounded-xl text-[#7A0000]">
                        <Wallet className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-semibold text-orange-700 bg-orange-100/80 px-2.5 py-1 rounded-full">
                        Last 7 Days
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 tracking-tight">PIV Collection</h3>
                    <p className="text-xs text-gray-500 mt-1.5 flex items-center justify-between">
                      <span>
                        {selectedDivision === "all" ? "All Divisions" : `Division ${selectedDivision.toUpperCase()}`}
                      </span>
                      {pivTotalTime && (
                        <span className="text-[10px] text-gray-400">Data as of: {pivTotalTime}</span>
                      )}
                    </p>

                    {loading ? (
                      <div className="mt-5 pt-4 border-t border-gray-100 space-y-3">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div key={i} className="h-4 bg-gray-100 rounded animate-pulse" />
                        ))}
                      </div>
                    ) : pivDailySeries.length > 0 ? (
                      <div className="mt-5 pt-4 border-t border-gray-100 space-y-2.5">
                        {pivDailySeries.map((item) => (
                          <div key={item.date} className="flex items-center justify-between gap-3 text-xs">
                            <span className="min-w-[56px] font-medium text-gray-500">{item.label}</span>
                            <div className="flex-1 h-2 rounded-full bg-orange-100 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-[color:var(--ceb-maroon)] transition-all duration-500"
                                style={{
                                  width: `${total7DayCollection > 0 ? Math.max((item.amount / total7DayCollection) * 100, 6) : 0}%`,
                                }}
                              />
                            </div>
                            <span className="min-w-[110px] text-right font-semibold text-gray-800 font-mono">
                              LKR {item.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </Reveal>

              {/* ── Chart Section ────────────────────────────────────────────── */}
              <Reveal delay={100} className="mb-8">
                <div className="bg-white rounded-2xl shadow-xs border border-gray-100 p-6 flex flex-col">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 tracking-tight">
                        PIV Collection by Division & Company
                      </h2>
                      <p className="text-xs text-gray-400 mt-1">
                        Breakdown across the past 7 days grouped by accounting cost center
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Switcher Button: Bar Chart vs Line Chart */}
                      <div className="flex items-center bg-gray-100 rounded-xl p-0.5 border border-gray-200/60">
                        <button
                          type="button"
                          onClick={() => setDivisionChartType("bar")}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            divisionChartType === "bar"
                              ? "bg-white text-[#7A0000] shadow-xs"
                              : "text-gray-400 hover:text-gray-600"
                          }`}
                          title="Bar Chart"
                        >
                          <BarChart3 className="w-3.5 h-3.5" />
                          <span>Bar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDivisionChartType("line")}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            divisionChartType === "line"
                              ? "bg-white text-[#7A0000] shadow-xs"
                              : "text-gray-400 hover:text-gray-600"
                          }`}
                          title="Line Chart"
                        >
                          <TrendingUp className="w-3.5 h-3.5" />
                          <span>Line</span>
                        </button>
                      </div>

                      <div className="p-2 bg-[color:var(--ceb-maroon)]/10 rounded-xl text-[#7A0000] hidden sm:block">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                    </div>
                  </div>

                  {loading ? (
                    <div className="space-y-3">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
                      ))}
                    </div>
                  ) : companyKeys.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-52 text-gray-400">
                      <BarChart3 className="w-12 h-12 mb-3 opacity-20" />
                      <p className="text-sm font-medium">No division collection data available</p>
                    </div>
                  ) : (
                    <div className="min-h-[260px] w-full">
                      <ResponsiveContainer width="100%" height={260}>
                        {divisionChartType === "bar" ? (
                          <BarChart
                            data={divisionChartData}
                            margin={{ top: 10, right: 10, left: 0, bottom: 8 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#f3ece8" vertical={false} />
                            <XAxis
                              dataKey="name"
                              tick={{ fontSize: 12, fill: "#6b7280" }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis
                              tick={{ fontSize: 11, fill: "#94a3af" }}
                              tickFormatter={(v) => `${(Number(v) / 1_000_000).toFixed(1)}M`}
                              axisLine={false}
                              tickLine={false}
                              width={52}
                            />
                            <Tooltip
                              formatter={(val: any, name: string) => [
                                `LKR ${Number(val).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
                                name.toUpperCase(),
                              ]}
                              labelStyle={{ color: "#374151", fontWeight: 600 }}
                              contentStyle={{
                                borderRadius: "12px",
                                border: "1px solid rgba(255,255,255,0.4)",
                                boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                                fontSize: 13,
                                backgroundColor: "rgba(255, 255, 255, 0.9)",
                                backdropFilter: "blur(12px)",
                              }}
                              cursor={{ fill: "rgba(0,0,0,0.03)" }}
                            />
                            <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                            {companyKeys.map((company, i) => (
                              <Bar
                                key={company}
                                dataKey={company}
                                fill={colors[i % colors.length]}
                                maxBarSize={22}
                                radius={[4, 4, 0, 0]}
                                isAnimationActive
                                animationDuration={800}
                              />
                            ))}
                          </BarChart>
                        ) : (
                          <LineChart
                            data={divisionChartData}
                            margin={{ top: 10, right: 10, left: 0, bottom: 8 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#f3ece8" vertical={false} />
                            <XAxis
                              dataKey="name"
                              tick={{ fontSize: 12, fill: "#6b7280" }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis
                              tick={{ fontSize: 11, fill: "#94a3af" }}
                              tickFormatter={(v) => `${(Number(v) / 1_000_000).toFixed(1)}M`}
                              axisLine={false}
                              tickLine={false}
                              width={52}
                            />
                            <Tooltip
                              formatter={(val: any, name: string) => [
                                `LKR ${Number(val).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
                                name.toUpperCase(),
                              ]}
                              labelStyle={{ color: "#374151", fontWeight: 600 }}
                              contentStyle={{
                                borderRadius: "12px",
                                border: "1px solid rgba(255,255,255,0.4)",
                                boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                                fontSize: 13,
                                backgroundColor: "rgba(255, 255, 255, 0.9)",
                                backdropFilter: "blur(12px)",
                              }}
                            />
                            <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                            {companyKeys.map((company, i) => (
                              <Line
                                key={company}
                                type="monotone"
                                dataKey={company}
                                stroke={colors[i % colors.length]}
                                strokeWidth={2.5}
                                dot={{ r: 4, strokeWidth: 2, fill: "#ffffff" }}
                                activeDot={{ r: 6, strokeWidth: 2 }}
                                isAnimationActive
                                animationDuration={800}
                              />
                            ))}
                          </LineChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </Reveal>

              {/* ── Division Summary Table Section ───────────────────────────── */}
              <Reveal delay={200}>
                {!loading && (displayPivDivision.length > 0 || displayStockDivision.length > 0) && (
                  <div className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden">
                    <div className="px-6 py-4.5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <FileText className="w-5 h-5 text-[#7A0000]" />
                        <h2 className="text-base font-bold text-gray-900 tracking-tight">
                          Division & Company Summary
                        </h2>
                      </div>
                      <span className="text-xs text-gray-500 font-medium">
                        Consolidated View
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-gray-200">
                            <th className="px-6 py-3.5 text-left">Company / Division</th>
                            <th className="px-6 py-3.5 text-right">
                              <div className="flex flex-col items-end">
                                <span>Stock Value</span>
                                <span className="text-[10px] font-normal text-gray-400 mt-0.5">
                                  {formattedToday}
                                </span>
                              </div>
                            </th>
                            <th className="px-6 py-3.5 text-right">
                              <div className="flex flex-col items-end">
                                <span>PIV Collection</span>
                                <span className="text-[10px] font-normal text-gray-400 mt-0.5">
                                  {latestPivLabel}
                                </span>
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {Array.from(
                            new Set([
                              ...pivDivisionLatest.map((d) => normalizeCompany(d.company)),
                              ...displayStockDivision.map((d) => d.company || "Other"),
                            ])
                          ).map((company, i) => {
                            const piv = pivDivisionLatest.find(
                              (d) => normalizeCompany(d.company) === company
                            );
                            const stk = displayStockDivision.find(
                              (d) => (d.company || "Other") === company
                            );
                            const compColor = colors[i % colors.length];

                            return (
                              <tr
                                key={company}
                                className={`hover:bg-orange-50/30 transition-colors ${
                                  i % 2 === 0 ? "bg-white" : "bg-gray-50/40"
                                }`}
                              >
                                <td className="px-6 py-4 font-semibold text-gray-800">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-2.5 h-2.5 rounded-full"
                                      style={{ backgroundColor: compColor }}
                                    />
                                    <span className="uppercase">{company}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-right font-mono text-blue-700 font-medium">
                                  {stk
                                    ? `LKR ${stk.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                                    : "—"}
                                </td>
                                <td className="px-6 py-4 text-right font-mono text-[#7A0000] font-medium">
                                  {piv
                                    ? `LKR ${piv.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                                    : "—"}
                                </td>
                              </tr>
                            );
                          })}
                          <tr className="border-t-2 border-gray-300 bg-gray-50/90 font-bold">
                            <td className="px-6 py-4 text-gray-800">Grand Total</td>
                            <td className="px-6 py-4 text-right font-mono text-blue-800 text-base">
                              LKR {displayStockTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-4 text-right font-mono text-[#7A0000] text-base">
                              LKR {pivDivisionLatestTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </Reveal>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
