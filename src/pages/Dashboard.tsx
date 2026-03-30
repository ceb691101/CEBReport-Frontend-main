import React, { useEffect, useState, useRef } from "react";
import { useUser } from "../contexts/UserContext";
import {
  Users,
  Zap,
  DollarSign,
  Target,
  PieChart,
  Sun,
  ArrowUp,
  BarChart3,
  ShoppingCart,
  TrendingUp,
  FileText,
  //Settings,
  Briefcase,
  HeadsetIcon,
  //ChevronUp,
  Clock,
  AlertCircle,
  TrendingDown,
  Battery,
  Plug,
  Eye,
  EyeOff,
  Plus,
  X,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
} from "recharts";
import DashboardSelector from "../components/mainTopics/Dashboard/DashboardSelector";

// ─── Bar chart color palette (auto-assigned per net-type) ─────────────────────
const BAR_CAPACITY_COLORS = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b"];
const BAR_COUNT_COLORS    = ["#818cf8", "#38bdf8", "#34d399", "#fbbf24"];
const SOLAR_NET_TYPE_COLORS = [
  "#813405",
  "#d45113   ",
  "#f9a03f   ",
  "#f8dda4   ",
];

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface CustomerCounts {
  ordinary: number;
  bulk: number;
  solar: {
    netMetering: number;
    netAccounting: number;
    netPlus: number;
    netPlusPlus: number;
  };
  zeroConsumption: number;
}

interface TopCustomer {
  name: string;
  consumption: number;
  type: string;
}

interface MonthlySalesData {
  month: string;
  ordinary: number;
  bulk: number;
  target: number;
}

interface MonthlyNewCustomers {
  month: string;
  ordinary: number;
  bulk: number;
}

interface SalesCollectionRecord {
  BillCycle: number;
  Collection: number;
  Sales: number;
  ErrorMessage: string;
}

interface SalesCollectionApiResponse {
  data: {
    maxBillCycle: number;
    records: SalesCollectionRecord[];
  };
  errorMessage: string | null;
}

interface KioskCollectionRecord {
  TransDate: string;
  CollectionAmount: number;
  ErrorMessage: string;
}

interface KioskCollectionApiResponse {
  data: {
    userId: string;
    fromDate: string;
    toDate: string;
    records: KioskCollectionRecord[];
  } | null;
  errorMessage: string | null;
  errorDetails?: string;
}

// ─── useInView Hook ───────────────────────────────────────────────────────────
// Returns inView (boolean) and triggerCount (increments each time element enters
// viewport). Use triggerCount to replay animations on re-entry.

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

// ─── useCountUp Hook ──────────────────────────────────────────────────────────
// Accepts a `trigger` param — increments cause the count to replay from 0.

function useCountUp(
  target: number,
  duration = 1400,
  active = true,
  trigger = 0
): number {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!active || target === 0) {
      setDisplay(target);
      return;
    }
    setDisplay(0);
    const start = performance.now();
    let raf: number;
    const step = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(eased * target));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, active, trigger]);

  return display;
}

// ─── DrawingLineChart ─────────────────────────────────────────────────────────
// SVG line chart that draws left-to-right. Re-animates every time it scrolls
// back into view (uses useInView internally).

interface DrawingLineChartProps {
  data: { month: string; ordinary: number; bulk: number }[];
  formatCurrency: (n: number) => string;
  formatCompact: (n: number) => string;
  chartKey: number;
}

const DrawingLineChart: React.FC<DrawingLineChartProps> = ({
  data,
  //formatCurrency,
  formatCompact,
  chartKey,
}) => {
  const svgRef       = React.useRef<SVGSVGElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = React.useState<{
    x: number; y: number; month: string; ordinary: number; bulk: number;
  } | null>(null);
  const [animate, setAnimate] = React.useState(false);

  const { triggerCount } = useInView(containerRef as React.RefObject<Element>, {
    threshold: 0.3,
  });

  const W = 480, H = 230;
  const padL = 60, padR = 16, padT = 16, padB = 38;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const allVals = data.flatMap((d) => [d.ordinary, d.bulk]).filter(Boolean);
  const minVal  = 0;
  const maxVal  = allVals.length ? Math.max(...allVals) * 1.1 : 1;

  const xOf = (i: number) => padL + (i / Math.max(data.length - 1, 1)) * chartW;
  const yOf = (v: number) => padT + chartH - ((v - minVal) / (maxVal - minVal)) * chartH;

  const toPolyline = (key: "ordinary" | "bulk") =>
    data.map((d, i) => `${xOf(i)},${yOf(d[key])}`).join(" ");

  const polylineLength = (points: string) => {
    const pts = points.split(" ").map((p) => p.split(",").map(Number));
    let len = 0;
    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i][0] - pts[i - 1][0];
      const dy = pts[i][1] - pts[i - 1][1];
      len += Math.sqrt(dx * dx + dy * dy);
    }
    return len;
  };

  const ordPoints  = data.length >= 2 ? toPolyline("ordinary") : "";
  const bulkPoints = data.length >= 2 ? toPolyline("bulk")     : "";
  const ordLen     = ordPoints  ? polylineLength(ordPoints)  : 0;
  const bulkLen    = bulkPoints ? polylineLength(bulkPoints) : 0;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    val: minVal + f * (maxVal - minVal),
    y:   padT + chartH - f * chartH,
  }));

  // Re-trigger on new data OR on each scroll re-entry
  React.useEffect(() => {
    setAnimate(false);
    const t = setTimeout(() => setAnimate(true), 60);
    return () => clearTimeout(t);
  }, [chartKey, triggerCount]);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || !data.length) return;
    const rect  = svgRef.current.getBoundingClientRect();
    const scaleX = W / rect.width;
    const mx    = (e.clientX - rect.left) * scaleX - padL;
    const step  = chartW / Math.max(data.length - 1, 1);
    const idx   = Math.max(0, Math.min(data.length - 1, Math.round(mx / step)));
    const d     = data[idx];
    setTooltip({ x: xOf(idx), y: Math.min(yOf(d.ordinary), yOf(d.bulk)) - 8, month: d.month, ordinary: d.ordinary, bulk: d.bulk });
  };

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%", userSelect: "none" }}>
      {/* Legend */}
      <div style={{ display: "flex", gap: 20, marginBottom: 8, paddingLeft: padL }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 500, color: "#374151" }}>
          <svg width="20" height="4"><line x1="0" y1="2" x2="20" y2="2" stroke="var(--ceb-maroon)" strokeWidth="2.5" /></svg>
          Ordinary
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 500, color: "#374151" }}>
          <svg width="20" height="4"><line x1="0" y1="2" x2="20" y2="2" stroke="var(--ceb-gold)" strokeWidth="2.5" /></svg>
          Bulk
        </span>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height: "auto", overflow: "visible" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
      >
        <defs>
          <style>{`
            @keyframes drawLine {
              from { stroke-dashoffset: var(--line-len); }
              to   { stroke-dashoffset: 0; }
            }
            .draw-ordinary {
              stroke-dasharray: ${ordLen};
              stroke-dashoffset: ${ordLen};
              animation: ${animate ? `drawLine 1.6s cubic-bezier(0.4,0,0.2,1) forwards` : "none"};
            }
            .draw-bulk {
              stroke-dasharray: ${bulkLen};
              stroke-dashoffset: ${bulkLen};
              animation: ${animate ? `drawLine 1.6s cubic-bezier(0.4,0,0.2,1) 0.4s forwards` : "none"};
            }
          `}</style>
        </defs>

        {/* Grid lines */}
        {yTicks.map((t, i) => (
          <line key={i} x1={padL} y1={t.y} x2={W - padR} y2={t.y} stroke="#eef2f7" strokeWidth="1" strokeDasharray="3 3" />
        ))}

        {/* Y-axis labels */}
        {yTicks.map((t, i) => (
          <text key={i} x={padL - 8} y={t.y + 4} textAnchor="end" fontSize="12" fontWeight="500" fill="#374151">
            {formatCompact(t.val)}
          </text>
        ))}

        {/* X-axis labels */}
        {data.map((d, i) => (
          <text key={i} x={xOf(i)} y={H - 2} textAnchor="middle" fontSize="12" fontWeight="500" fill="#374151">
            {d.month}
          </text>
        ))}

        {/* Lines */}
        {ordPoints && (
          <polyline points={ordPoints} fill="none" stroke="var(--ceb-maroon)" strokeWidth="2.5"
            strokeLinejoin="round" strokeLinecap="round" className="draw-ordinary"
            style={{ "--line-len": `${ordLen}` } as React.CSSProperties} />
        )}
        {bulkPoints && (
          <polyline points={bulkPoints} fill="none" stroke="var(--ceb-gold)" strokeWidth="2.5"
            strokeLinejoin="round" strokeLinecap="round" className="draw-bulk"
            style={{ "--line-len": `${bulkLen}` } as React.CSSProperties} />
        )}

        {/* Hover dots */}
        {tooltip && data.map((d, i) => (
          <g key={i}>
            {xOf(i) === tooltip.x && (
              <>
                <circle cx={xOf(i)} cy={yOf(d.ordinary)} r="5" fill="var(--ceb-maroon)" stroke="#fff" strokeWidth="2" />
                <circle cx={xOf(i)} cy={yOf(d.bulk)}     r="5" fill="var(--ceb-gold)"   stroke="#fff" strokeWidth="2" />
                <line x1={xOf(i)} y1={padT} x2={xOf(i)} y2={padT + chartH} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4 2" />
              </>
            )}
          </g>
        ))}

        {/* Tooltip box */}
        {tooltip && (() => {
          const bx = Math.min(tooltip.x - 2, W - padR - 130);
          const by = Math.max(padT, tooltip.y - 60);
          return (
            <g>
              <rect x={bx} y={by} width="128" height="58" rx="6" fill="#1f2937" opacity="0.93" />
              <text x={bx + 10} y={by + 16} fontSize="11" fontWeight="600" fill="#f9fafb">{tooltip.month}</text>
              <circle cx={bx + 10} cy={by + 30} r="4" fill="var(--ceb-maroon)" />
              <text x={bx + 20} y={by + 34} fontSize="10" fill="#d1d5db">Ordinary: </text>
              <text x={bx + 72} y={by + 34} fontSize="10" fill="#f9fafb" fontWeight="500">{formatCompact(tooltip.ordinary)}</text>
              <circle cx={bx + 10} cy={by + 46} r="4" fill="var(--ceb-gold)" />
              <text x={bx + 20} y={by + 50} fontSize="10" fill="#d1d5db">Bulk: </text>
              <text x={bx + 55} y={by + 50} fontSize="10" fill="#f9fafb" fontWeight="500">{formatCompact(tooltip.bulk)}</text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
};

// ─── Reveal wrapper ───────────────────────────────────────────────────────────
// Fades + slides up when the element first enters the viewport.

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
        opacity:    inView ? 1 : 0,
        transform:  inView ? "translateY(0)" : "translateY(28px)",
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
};

// ─── RegionBar ────────────────────────────────────────────────────────────────
// Animates a progress bar from 0 → value on scroll, auto-colors by performance.

interface RegionBarProps {
  region: string;
  value: number;
  delay?: number;
}

const RegionBar: React.FC<RegionBarProps> = ({ region, value, delay = 0 }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { inView } = useInView(ref as React.RefObject<Element>, { threshold: 0.15 });

  const barColor =
    value >= 80 ? "#16a34a" :
    value >= 65 ? "#2563eb" :
    value >= 50 ? "#d97706" :
                  "#dc2626";

  const labelColor = barColor;

  return (
    <div ref={ref}>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600">{region}</span>
        <span className="font-medium">
          <span style={{ color: labelColor }}>{value}%</span>
          <span className="text-gray-400 mx-1">/</span>
          <span className="text-gray-500">100%</span>
        </span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
        <div
          style={{
            height: "100%",
            borderRadius: "9999px",
            backgroundColor: barColor,
            width:      inView ? `${value}%` : "0%",
            transition: inView ? `width 0.9s cubic-bezier(0.4,0,0.2,1) ${delay}ms` : "none",
          }}
        />
      </div>
    </div>
  );
};

// ─── SolarCapacityChart ───────────────────────────────────────────────────────
// Separate component so useInView is called at the top level of a component.
// Bars animate up when scrolled into view; each net-type gets a distinct color.

interface SolarCapacityChartProps {
  data: { netType: string; capacity: number; count: number }[];
  formatCompact: (n: number) => string;
  formatKW:      (n: number) => string;
  formatInteger: (n: number) => string;
}

const SolarCapacityChart: React.FC<SolarCapacityChartProps> = ({
  data, formatCompact, formatKW, formatInteger,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const { inView } = useInView(ref as React.RefObject<Element>, { threshold: 0.2 });

  return (
    <div ref={ref} className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
          <XAxis dataKey="netType" tick={{ fontSize: 11 }} interval={0} tickMargin={8} />
          <YAxis yAxisId="kw"    tick={{ fontSize: 11 }} tickFormatter={(v) => formatCompact(Number(v))} width={44} />
          <YAxis yAxisId="count" orientation="right" tick={{ fontSize: 11 }} tickFormatter={(v) => formatCompact(Number(v))} width={44} />
          <Tooltip
            formatter={(value: any, name: any) => {
              const n = Number(value) || 0;
              if (name === "Capacity (kW)") return [formatKW(n), name];
              if (name === "Accounts")      return [formatInteger(n), name];
              return [String(value), String(name)];
            }}
            labelStyle={{ fontWeight: 600 }}
          />
          <Legend />
          <Bar yAxisId="kw" dataKey="capacity" name="Capacity (kW)" radius={[6,6,0,0]}
            isAnimationActive={inView} animationDuration={900} animationEasing="ease-out" animationBegin={0}>
            {data.map((_, i) => <Cell key={i} fill={BAR_CAPACITY_COLORS[i % BAR_CAPACITY_COLORS.length]} />)}
            <LabelList dataKey="capacity" position="top" formatter={(v: any) => formatCompact(Number(v) || 0)} style={{ fontSize: 10, fill: "#6b7280" }} />
          </Bar>
          <Bar yAxisId="count" dataKey="count" name="Accounts" radius={[6,6,0,0]}
            isAnimationActive={inView} animationDuration={900} animationEasing="ease-out" animationBegin={250}>
            {data.map((_, i) => <Cell key={i} fill={BAR_COUNT_COLORS[i % BAR_COUNT_COLORS.length]} />)}
            <LabelList dataKey="count" position="top" formatter={(v: any) => formatCompact(Number(v) || 0)} style={{ fontSize: 10, fill: "#6b7280" }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

const Home: React.FC = () => {
  const { user } = useUser();

  // ── UI state ──────────────────────────────────────────────────────────────
  const [activeDashboard, setActiveDashboard] = useState<string>("default");
  const [isLoaded, setIsLoaded]               = useState(false);
  const [selectedYear, setSelectedYear]       = useState("2023");
  const [selectedMonth, setSelectedMonth]     = useState("All");
  const [activePieChart, setActivePieChart]   = useState<string | null>(null);
  const [activeSolarPieChart, setActiveSolarPieChart] = useState<string | null>(null);
  const [showMoreCards, setShowMoreCards]     = useState(false);
  const [visibleCards, setVisibleCards]       = useState<string[]>([
    "totalCustomers", "solarCustomers", "zeroConsumption", "kioskCollection",
  ]);
  const [draggedCardId, setDraggedCardId]   = useState<string | null>(null);
  const [dragOverCardId, setDragOverCardId] = useState<string | null>(null);

  // ── Scroll-trigger refs ───────────────────────────────────────────────────
  const kpiRef             = useRef<HTMLDivElement>(null);
  const newCustomersPieRef = useRef<HTMLDivElement>(null);
  const solarPieRef        = useRef<HTMLDivElement>(null);
  const bottomGridRef      = useRef<HTMLDivElement>(null);

  const { triggerCount: kpiTrigger }        = useInView(kpiRef        as React.RefObject<Element>, { threshold: 0.15 });
  const { triggerCount: newCustTrigger }    = useInView(newCustomersPieRef as React.RefObject<Element>, { threshold: 0.3 });
  const { triggerCount: solarPieTrigger }   = useInView(solarPieRef   as React.RefObject<Element>, { threshold: 0.3 });
  const { triggerCount: bottomGridTrigger } = useInView(bottomGridRef as React.RefObject<Element>, { threshold: 0.1 });

  // Pie chart animation keys — new key = new @keyframe names = animation replays
  const [newCustPieAnimKey, setNewCustPieAnimKey] = useState(0);
  const [solarPieAnimKey,   setSolarPieAnimKey]   = useState(0);

  useEffect(() => { setNewCustPieAnimKey((k) => k + 1); }, [newCustTrigger]);
  useEffect(() => { setSolarPieAnimKey((k)   => k + 1); }, [solarPieTrigger]);

  // ── Customer counts ────────────────────────────────────────────────────────
  const [customerCounts, setCustomerCounts] = useState<CustomerCounts>({
    ordinary: 0, bulk: 0,
    solar: { netMetering: 0, netAccounting: 0, netPlus: 0, netPlusPlus: 0 },
    zeroConsumption: 1234,
  });
  const [bulkSolarCustomers, setBulkSolarCustomers] = useState({
    netMetering: 0, netAccounting: 0, netPlus: 0, netPlusPlus: 0,
  });
  const [activeBillCycle, setActiveBillCycle]         = useState<string>("");
  const [customerCountsLoading, setCustomerCountsLoading] = useState(true);
  const [customerCountsError, setCustomerCountsError]     = useState<string | null>(null);
  const [solarLoading, setSolarLoading]                   = useState(true);
  const [bulkSolarLoading, setBulkSolarLoading]           = useState(true);
  const [solarError, setSolarError]                       = useState<string | null>(null);
  const [bulkCountLoading, setBulkCountLoading]           = useState(true);
  const [bulkCountError, setBulkCountError]               = useState<string | null>(null);

  // ── Sales / Collection ────────────────────────────────────────────────────
  const [monthlySalesData, setMonthlySalesData]         = useState<MonthlySalesData[]>([]);
  const [salesCollectionLoading, setSalesCollectionLoading] = useState(true);
  const [salesCollectionError, setSalesCollectionError]     = useState<string | null>(null);
  const [salesChartKey, setSalesChartKey]                   = useState(0);
  const [kioskWeeklyTotal, setKioskWeeklyTotal]             = useState(0);
  const [kioskDateRange, setKioskDateRange]                 = useState({ fromDate: "", toDate: "" });
  const [kioskDailyRecords, setKioskDailyRecords]           = useState<KioskCollectionRecord[]>([]);
  const [kioskLoading, setKioskLoading]                     = useState(true);
  const [kioskError, setKioskError]                         = useState<string | null>(null);

  // ── Static / mock data ────────────────────────────────────────────────────
  const [topCustomers] = useState<TopCustomer[]>(
    [
      { name: "Robert Johnson", consumption: 29876, type: "Bulk"     },
      { name: "Emily Davis",    consumption: 32456, type: "Ordinary" },
      { name: "Michael Brown",  consumption: 35678, type: "Ordinary" },
      { name: "Jane Smith",     consumption: 38456, type: "Bulk"     },
      { name: "John Doe",       consumption: 45231, type: "Bulk"     },
    ].sort((a, b) => a.consumption - b.consumption)
  );

  const [monthlyNewCustomers] = useState<MonthlyNewCustomers[]>(
    [
      { month: "Jan", ordinary: 210, bulk: 38 },
      { month: "Feb", ordinary: 225, bulk: 42 },
      { month: "Mar", ordinary: 234, bulk: 45 },
      { month: "Apr", ordinary: 218, bulk: 40 },
      { month: "May", ordinary: 242, bulk: 48 },
      { month: "Jun", ordinary: 238, bulk: 44 },
    ].sort((a, b) => {
      const mo = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      return mo.indexOf(a.month) - mo.indexOf(b.month);
    })
  );

  const [solarCapacity] = useState(() => ({
    netMetering:   { count: 567, capacity: 2345 },
    netAccounting: { count: 234, capacity: 1234 },
    netPlus:       { count: 189, capacity: 890  },
    netPlusPlus:   { count: 76,  capacity: 345  },
  }));

  // ── Dashboard card config ─────────────────────────────────────────────────
  const cardConfig = [
    { id: "totalCustomers",      title: "Total Customers",     default: true,  category: "customer"    },
    { id: "solarCustomers",      title: "Solar Customers",     default: true,  category: "solar"       },
    { id: "zeroConsumption",     title: "Zero Consumption",    default: true,  category: "consumption" },
    { id: "kioskCollection",     title: "Kiosk Collection",    default: true,  category: "collection"  },
    { id: "revenueCollection",   title: "Revenue Collection",  default: false, category: "collection"  },
    { id: "disconnections",      title: "Disconnections",      default: false, category: "customer"    },
    { id: "arrearsPosition",     title: "Arrears Position",    default: false, category: "billing"     },
    { id: "solarCapacity",       title: "Solar Capacity (kW)", default: false, category: "solar"       },
    { id: "consumptionAnalysis", title: "Consumption (kWh)",   default: false, category: "consumption" },
    { id: "billCycleStatus",     title: "Bill Cycle Status",   default: false, category: "billing"     },
    { id: "newConnections",      title: "New Connections",     default: false, category: "customer"    },
  ].sort((a, b) => a.title.localeCompare(b.title));

  const toggleCardVisibility = (cardId: string) =>
    setVisibleCards((prev) =>
      prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId]
    );

  // ── Drag-and-drop handlers ────────────────────────────────────────────────
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, cardId: string) => {
    setDraggedCardId(cardId);
    e.dataTransfer.effectAllowed = "move";
    const ghost = document.createElement("div");
    ghost.style.position = "fixed";
    ghost.style.top = "-9999px";
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 0, 0);
    setTimeout(() => document.body.removeChild(ghost), 0);
  };

  const handleDragEnter = (cardId: string) => {
    if (cardId !== draggedCardId) setDragOverCardId(cardId);
  };

  const handleDragEnd = () => {
    if (draggedCardId && dragOverCardId && draggedCardId !== dragOverCardId) {
      setVisibleCards((prev) => {
        const next = [...prev];
        const fi = next.indexOf(draggedCardId);
        const ti = next.indexOf(dragOverCardId);
        if (fi !== -1 && ti !== -1) { next.splice(fi, 1); next.splice(ti, 0, draggedCardId); }
        return next;
      });
    }
    setDraggedCardId(null);
    setDragOverCardId(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  // ── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const fetchOrdinaryCount = async () => {
      setCustomerCountsLoading(true); setCustomerCountsError(null);
      try {
        const res  = await fetch(`/misapi/api/dashboard/ordinary-customers-summary?billCycle=0`, { headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
        const json = await res.json();
        setCustomerCounts((p) => ({ ...p, ordinary: json?.data?.TotalCount ?? 0 }));
        setActiveBillCycle(json?.data?.BillCycle ?? "");
      } catch (err: any) { setCustomerCountsError(err.message || "Failed to load ordinary customer count"); }
      finally { setCustomerCountsLoading(false); }
    };
    fetchOrdinaryCount();
  }, []);

  useEffect(() => {
    const fetchBulkCount = async () => {
      setBulkCountLoading(true); setBulkCountError(null);
      try {
        const res  = await fetch("/misapi/api/dashboard/customers/active-count", { headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
        const json = await res.json();
        setCustomerCounts((p) => ({ ...p, bulk: json?.data?.activeCustomerCount ?? 0 }));
      } catch (err: any) { setBulkCountError(err.message || "Failed to load bulk customer count"); }
      finally { setBulkCountLoading(false); }
    };
    fetchBulkCount();
  }, []);

  useEffect(() => {
    const fetchSolarCustomerData = async () => {
      setSolarLoading(true); setSolarError(null);
      try {
        const maxRes = await fetch(`/misapi/api/dashboard/solar-ordinary-customers/billcycle/max`, { headers: { Accept: "application/json" } });
        if (!maxRes.ok) throw new Error(`Failed to fetch max bill cycle`);
        const [r1, r2, r3, r4] = await Promise.all([
          fetch(`/misapi/api/dashboard/solar-ordinary-customers/count/net-type-1`, { headers: { Accept: "application/json" } }),
          fetch(`/misapi/api/dashboard/solar-ordinary-customers/count/net-type-2`, { headers: { Accept: "application/json" } }),
          fetch(`/misapi/api/dashboard/solar-ordinary-customers/count/net-type-3`, { headers: { Accept: "application/json" } }),
          fetch(`/misapi/api/dashboard/solar-ordinary-customers/count/net-type-4`, { headers: { Accept: "application/json" } }),
        ]);
        if (!r1.ok || !r2.ok || !r3.ok || !r4.ok) throw new Error("Failed to fetch one or more net-type counts");
        const [d1, d2, d3, d4] = await Promise.all([r1.json(), r2.json(), r3.json(), r4.json()]);
        setCustomerCounts((p) => ({
          ...p,
          solar: {
            netMetering:   d1?.data?.CustomersCount ?? 0,
            netAccounting: d2?.data?.CustomersCount ?? 0,
            netPlus:       d3?.data?.CustomersCount ?? 0,
            netPlusPlus:   d4?.data?.CustomersCount ?? 0,
          },
        }));
      } catch (err: any) { setSolarError(err.message || "Failed to load solar customer data"); console.error("Solar data fetch error:", err); }
      finally { setSolarLoading(false); }
    };
    fetchSolarCustomerData();
  }, []);

  useEffect(() => {
    const fetchBulkSolarCustomerData = async () => {
      setBulkSolarLoading(true);
      try {
        const [r1, r2, r3, r4] = await Promise.all([
          fetch(`/misapi/api/dashboard/solar-bulk-customers/count/net-type-1`, { headers: { Accept: "application/json" } }),
          fetch(`/misapi/api/dashboard/solar-bulk-customers/count/net-type-2`, { headers: { Accept: "application/json" } }),
          fetch(`/misapi/api/dashboard/solar-bulk-customers/count/net-type-3`, { headers: { Accept: "application/json" } }),
          fetch(`/misapi/api/dashboard/solar-bulk-customers/count/net-type-4`, { headers: { Accept: "application/json" } }),
        ]);
        if (!r1.ok || !r2.ok || !r3.ok || !r4.ok) throw new Error("Failed to fetch bulk solar net-type counts");
        const [d1, d2, d3, d4] = await Promise.all([r1.json(), r2.json(), r3.json(), r4.json()]);
        setBulkSolarCustomers({
          netMetering:   d1?.data?.CustomersCount ?? 0,
          netAccounting: d2?.data?.CustomersCount ?? 0,
          netPlus:       d3?.data?.CustomersCount ?? 0,
          netPlusPlus:   d4?.data?.CustomersCount ?? 0,
        });
      } catch (err: any) { console.error("Bulk solar data fetch error:", err); }
      finally { setBulkSolarLoading(false); }
    };
    fetchBulkSolarCustomerData();
  }, []);

  useEffect(() => {
    const fetchSalesCollection = async () => {
      setSalesCollectionLoading(true); setSalesCollectionError(null);
      try {
        const [ordRes, bulkRes] = await Promise.all([
          fetch("/misapi/api/dashboard/salesCollection/range/ordinary", { headers: { Accept: "application/json" } }),
          fetch("/misapi/api/dashboard/salesCollection/range/bulk",     { headers: { Accept: "application/json" } }),
        ]);
        if (!ordRes.ok)  throw new Error(`Ordinary fetch failed: ${ordRes.status}`);
        if (!bulkRes.ok) throw new Error(`Bulk fetch failed: ${bulkRes.status}`);
        const ordJson:  SalesCollectionApiResponse = await ordRes.json();
        const bulkJson: SalesCollectionApiResponse = await bulkRes.json();
        const merged: MonthlySalesData[] = ordJson.data.records.map((rec, i) => ({
          month:    String(rec.BillCycle),
          ordinary: rec.Sales,
          bulk:     bulkJson.data.records[i]?.Sales ?? 0,
          target:   0,
        }));
        setMonthlySalesData([...merged].sort((a, b) =>
          parseInt(a.month) - parseInt(b.month)
        ));
        setSalesChartKey((k) => k + 1);
      } catch (err: any) { console.error("Error fetching sales/collection data:", err); setSalesCollectionError(err.message || "Failed to load sales data."); }
      finally { setSalesCollectionLoading(false); }
    };
    fetchSalesCollection();
  }, []);

  const loggedUserId = (user?.Userno || "").trim().toUpperCase();
  const kioskUserId = loggedUserId.startsWith("KIOS") ? loggedUserId : "KIOS00";

  useEffect(() => {
    const fetchKioskWeeklyCollection = async () => {
      setKioskLoading(true);
      setKioskError(null);

      try {
        const res = await fetch(
          `/api/dashboard/kiosk-collection?userId=${encodeURIComponent(kioskUserId)}`,
          { headers: { Accept: "application/json" } }
        );

        if (!res.ok) {
          throw new Error(`Kiosk collection fetch failed: ${res.status}`);
        }

        const json: KioskCollectionApiResponse = await res.json();

        if (json?.errorMessage) {
          const details = json?.errorDetails ? ` (${json.errorDetails})` : "";
          throw new Error(`${json.errorMessage}${details}`);
        }

        const records = json?.data?.records ?? [];
        const weeklyTotal = records.reduce(
          (sum, row) => sum + (Number(row.CollectionAmount) || 0),
          0
        );

        setKioskWeeklyTotal(weeklyTotal);
        setKioskDailyRecords(records);
        setKioskDateRange({
          fromDate: json?.data?.fromDate ?? "",
          toDate: json?.data?.toDate ?? "",
        });
      } catch (err: any) {
        console.error("Error fetching kiosk collection data:", err);
        setKioskError(err?.message || "Failed to load kiosk collection data.");
        setKioskWeeklyTotal(0);
      } finally {
        setKioskLoading(false);
      }
    };

    fetchKioskWeeklyCollection();
  }, [kioskUserId]);

  // ── Formatters ────────────────────────────────────────────────────────────

  const formatNumber   = (n: number) => new Intl.NumberFormat("en-US").format(n);
  const formatCurrency = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "LKR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
  const formatCompact  = (n: number) => new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
  const formatInteger  = (n: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
  const formatKW       = (n: number) => `${formatCompact(n)} kW`;

  // ── Derived values ────────────────────────────────────────────────────────

  const totalOrdinarySales = monthlySalesData.reduce((s, d) => s + d.ordinary, 0);
  const totalBulkSales     = monthlySalesData.reduce((s, d) => s + d.bulk, 0);

  const totalNewCustomers     = monthlyNewCustomers.reduce((s, d) => s + d.ordinary + d.bulk, 0);
  const totalNewOrdinary      = monthlyNewCustomers.reduce((s, d) => s + d.ordinary, 0);
  const totalNewBulk          = monthlyNewCustomers.reduce((s, d) => s + d.bulk, 0);
  const newOrdinaryPercentage = (totalNewOrdinary / totalNewCustomers) * 100;
  const newBulkPercentage     = (totalNewBulk     / totalNewCustomers) * 100;

  const salesLineData = monthlySalesData
    .map((item) => ({ month: item.month, ordinary: item.ordinary, bulk: item.bulk, total: item.ordinary + item.bulk }))
    .sort((a, b) => parseInt(a.month) - parseInt(b.month));

  const totalOrdinarySolar = customerCounts.solar.netMetering + customerCounts.solar.netAccounting + customerCounts.solar.netPlus + customerCounts.solar.netPlusPlus;
  const totalBulkSolar     = bulkSolarCustomers.netMetering   + bulkSolarCustomers.netAccounting   + bulkSolarCustomers.netPlus   + bulkSolarCustomers.netPlusPlus;
  const totalSolarCustomers = totalOrdinarySolar + totalBulkSolar;

  const pct = (n: number, total: number) => (total > 0 ? (n / total) * 100 : 0);

  const ordSolarNetMeteringPct   = pct(customerCounts.solar.netMetering,   totalOrdinarySolar);
  const ordSolarNetAccountingPct = pct(customerCounts.solar.netAccounting, totalOrdinarySolar);
  const ordSolarNetPlusPct       = pct(customerCounts.solar.netPlus,       totalOrdinarySolar);
  const ordSolarNetPlusPlusPct   = pct(customerCounts.solar.netPlusPlus,   totalOrdinarySolar);

  const bulkSolarNetMeteringPct   = pct(bulkSolarCustomers.netMetering,   totalBulkSolar);
  const bulkSolarNetAccountingPct = pct(bulkSolarCustomers.netAccounting, totalBulkSolar);
  const bulkSolarNetPlusPct       = pct(bulkSolarCustomers.netPlus,       totalBulkSolar);
  const bulkSolarNetPlusPlusPct   = pct(bulkSolarCustomers.netPlusPlus,   totalBulkSolar);

  const C = 502.4;
  const createArcDasharray = (s: number, e: number) => { const arc = ((e - s) / 100) * C; return `${arc} ${C - arc}`; };

  const solarCapacityChartData = [
    { netType: "Net Metering",   capacity: solarCapacity.netMetering.capacity,   count: solarCapacity.netMetering.count   },
    { netType: "Net Accounting", capacity: solarCapacity.netAccounting.capacity, count: solarCapacity.netAccounting.count },
    { netType: "Net Plus",       capacity: solarCapacity.netPlus.capacity,       count: solarCapacity.netPlus.count       },
    { netType: "Net Plus Plus",  capacity: solarCapacity.netPlusPlus.capacity,   count: solarCapacity.netPlusPlus.count   },
  ].sort((a, b) => a.capacity - b.capacity);

  //const additionalCardIds = ["revenueCollection","disconnections","arrearsPosition","solarCapacity","consumptionAnalysis","billCycleStatus","newConnections"];
  //const hasAdditionalCards = additionalCardIds.some((id) => visibleCards.includes(id));

  // ── Animated values ───────────────────────────────────────────────────────

  const animatedTotal       = useCountUp(customerCounts.ordinary + customerCounts.bulk, 1400, !customerCountsLoading && !bulkCountLoading, kpiTrigger);
  const animatedOrdinary    = useCountUp(customerCounts.ordinary,      1400, !customerCountsLoading, kpiTrigger);
  const animatedBulk        = useCountUp(customerCounts.bulk,          1400, !bulkCountLoading,      kpiTrigger);
  const animatedSolar       = useCountUp(totalSolarCustomers,          1400, !solarLoading && !bulkSolarLoading, kpiTrigger);
  const animatedZero        = useCountUp(customerCounts.zeroConsumption, 1400, true, kpiTrigger);
  const animatedKiosk       = useCountUp(kioskWeeklyTotal,             1400, !kioskLoading, kpiTrigger);
  const animatedRevenue     = useCountUp(125600000, 1400, true, kpiTrigger);
  const animatedDisconnect  = useCountUp(2456,      1400, true, kpiTrigger);
  const animatedArrears     = useCountUp(456780000, 1400, true, kpiTrigger);
  const animatedSolarCap    = useCountUp(4814,      1400, true, kpiTrigger);
  const animatedConsumption = useCountUp(3579000,   1400, true, kpiTrigger);
  const animatedNewConn     = useCountUp(1428,      1400, true, kpiTrigger);

  const animatedNewOrdinary = useCountUp(totalNewOrdinary,  1400, true, newCustTrigger);
  const animatedNewBulk     = useCountUp(totalNewBulk,      1400, true, newCustTrigger);
  const animatedNewTotal    = useCountUp(totalNewCustomers, 1400, true, newCustTrigger);

  const animatedSegOrdinary = useCountUp(customerCounts.ordinary, 1400, !customerCountsLoading, bottomGridTrigger);
  const animatedSegBulk     = useCountUp(customerCounts.bulk,     1400, !bulkCountLoading,      bottomGridTrigger);
  const animatedSegSolar    = useCountUp(totalSolarCustomers,      1400, !solarLoading && !bulkSolarLoading, bottomGridTrigger);

  // Solar pie — animated counts for each net type (ordinary + bulk), replay on solarPieTrigger
  const animatedOrdNetMetering   = useCountUp(customerCounts.solar.netMetering,   1200, !solarLoading, solarPieTrigger);
  const animatedOrdNetAccounting = useCountUp(customerCounts.solar.netAccounting, 1200, !solarLoading, solarPieTrigger);
  const animatedOrdNetPlus       = useCountUp(customerCounts.solar.netPlus,       1200, !solarLoading, solarPieTrigger);
  const animatedOrdNetPlusPlus   = useCountUp(customerCounts.solar.netPlusPlus,   1200, !solarLoading, solarPieTrigger);
  const animatedOrdSolarTotal    = useCountUp(totalOrdinarySolar,                 1200, !solarLoading, solarPieTrigger);

  const animatedBulkNetMetering   = useCountUp(bulkSolarCustomers.netMetering,   1200, true, solarPieTrigger);
  const animatedBulkNetAccounting = useCountUp(bulkSolarCustomers.netAccounting, 1200, true, solarPieTrigger);
  const animatedBulkNetPlus       = useCountUp(bulkSolarCustomers.netPlus,       1200, true, solarPieTrigger);
  const animatedBulkNetPlusPlus   = useCountUp(bulkSolarCustomers.netPlusPlus,   1200, true, solarPieTrigger);
  const animatedBulkSolarTotal    = useCountUp(totalBulkSolar,                   1200, true, solarPieTrigger);

  // ── Pie chart CSS animation strings ──────────────────────────────────────

  const newCustPieStyles = `
    @keyframes pieChartLoadOrdinary_${newCustPieAnimKey} {
      0%   { stroke-dasharray: 0 ${C}; stroke-dashoffset: 0; }
      100% { stroke-dasharray: ${(newOrdinaryPercentage / 100) * C} ${C}; stroke-dashoffset: 0; }
    }
    @keyframes pieChartLoadBulk_${newCustPieAnimKey} {
      0%   { stroke-dasharray: 0 ${C}; stroke-dashoffset: ${-((newOrdinaryPercentage / 100) * C)}; }
      100% { stroke-dasharray: ${(newBulkPercentage / 100) * C} ${C}; stroke-dashoffset: ${-((newOrdinaryPercentage / 100) * C)}; }
    }
    .pie-segment-ordinary-${newCustPieAnimKey} { animation: pieChartLoadOrdinary_${newCustPieAnimKey} 0.9s ease-out forwards; animation-delay: 0.3s; }
    .pie-segment-bulk-${newCustPieAnimKey}     { animation: pieChartLoadBulk_${newCustPieAnimKey}     0.9s ease-out forwards; animation-delay: 1.2s; }
  `;

  const solarPieStyles = `
    @keyframes solarOrdNetMeteringLoad_${solarPieAnimKey}    { 0% { stroke-dasharray: 0 ${C}; stroke-dashoffset: 0; } 100% { stroke-dasharray: ${createArcDasharray(0, ordSolarNetMeteringPct).split(" ")[0]} ${C}; stroke-dashoffset: 0; } }
    @keyframes solarOrdNetAccountingLoad_${solarPieAnimKey}  { 0% { stroke-dasharray: 0 ${C}; stroke-dashoffset: ${-((ordSolarNetMeteringPct / 100) * C)}; } 100% { stroke-dasharray: ${createArcDasharray(ordSolarNetMeteringPct, ordSolarNetMeteringPct + ordSolarNetAccountingPct).split(" ")[0]} ${C}; stroke-dashoffset: ${-((ordSolarNetMeteringPct / 100) * C)}; } }
    @keyframes solarOrdNetPlusLoad_${solarPieAnimKey}        { 0% { stroke-dasharray: 0 ${C}; stroke-dashoffset: ${-(((ordSolarNetMeteringPct + ordSolarNetAccountingPct) / 100) * C)}; } 100% { stroke-dasharray: ${createArcDasharray(ordSolarNetMeteringPct + ordSolarNetAccountingPct, ordSolarNetMeteringPct + ordSolarNetAccountingPct + ordSolarNetPlusPct).split(" ")[0]} ${C}; stroke-dashoffset: ${-(((ordSolarNetMeteringPct + ordSolarNetAccountingPct) / 100) * C)}; } }
    @keyframes solarOrdNetPlusPlusLoad_${solarPieAnimKey}    { 0% { stroke-dasharray: 0 ${C}; stroke-dashoffset: ${-(((ordSolarNetMeteringPct + ordSolarNetAccountingPct + ordSolarNetPlusPct) / 100) * C)}; } 100% { stroke-dasharray: ${createArcDasharray(ordSolarNetMeteringPct + ordSolarNetAccountingPct + ordSolarNetPlusPct, 100).split(" ")[0]} ${C}; stroke-dashoffset: ${-(((ordSolarNetMeteringPct + ordSolarNetAccountingPct + ordSolarNetPlusPct) / 100) * C)}; } }
    @keyframes solarBulkNetMeteringLoad_${solarPieAnimKey}   { 0% { stroke-dasharray: 0 ${C}; stroke-dashoffset: 0; } 100% { stroke-dasharray: ${createArcDasharray(0, bulkSolarNetMeteringPct).split(" ")[0]} ${C}; stroke-dashoffset: 0; } }
    @keyframes solarBulkNetAccountingLoad_${solarPieAnimKey} { 0% { stroke-dasharray: 0 ${C}; stroke-dashoffset: ${-((bulkSolarNetMeteringPct / 100) * C)}; } 100% { stroke-dasharray: ${createArcDasharray(bulkSolarNetMeteringPct, bulkSolarNetMeteringPct + bulkSolarNetAccountingPct).split(" ")[0]} ${C}; stroke-dashoffset: ${-((bulkSolarNetMeteringPct / 100) * C)}; } }
    @keyframes solarBulkNetPlusLoad_${solarPieAnimKey}       { 0% { stroke-dasharray: 0 ${C}; stroke-dashoffset: ${-(((bulkSolarNetMeteringPct + bulkSolarNetAccountingPct) / 100) * C)}; } 100% { stroke-dasharray: ${createArcDasharray(bulkSolarNetMeteringPct + bulkSolarNetAccountingPct, bulkSolarNetMeteringPct + bulkSolarNetAccountingPct + bulkSolarNetPlusPct).split(" ")[0]} ${C}; stroke-dashoffset: ${-(((bulkSolarNetMeteringPct + bulkSolarNetAccountingPct) / 100) * C)}; } }
    @keyframes solarBulkNetPlusPlusLoad_${solarPieAnimKey}   { 0% { stroke-dasharray: 0 ${C}; stroke-dashoffset: ${-(((bulkSolarNetMeteringPct + bulkSolarNetAccountingPct + bulkSolarNetPlusPct) / 100) * C)}; } 100% { stroke-dasharray: ${createArcDasharray(bulkSolarNetMeteringPct + bulkSolarNetAccountingPct + bulkSolarNetPlusPct, 100).split(" ")[0]} ${C}; stroke-dashoffset: ${-(((bulkSolarNetMeteringPct + bulkSolarNetAccountingPct + bulkSolarNetPlusPct) / 100) * C)}; } }
    .solar-ord-metering-${solarPieAnimKey}    { animation: solarOrdNetMeteringLoad_${solarPieAnimKey}    0.9s ease-out forwards; animation-delay: 0.3s; }
    .solar-ord-accounting-${solarPieAnimKey}  { animation: solarOrdNetAccountingLoad_${solarPieAnimKey}  0.9s ease-out forwards; animation-delay: 1.2s; }
    .solar-ord-plus-${solarPieAnimKey}        { animation: solarOrdNetPlusLoad_${solarPieAnimKey}        0.9s ease-out forwards; animation-delay: 2.1s; }
    .solar-ord-plusplus-${solarPieAnimKey}    { animation: solarOrdNetPlusPlusLoad_${solarPieAnimKey}    0.9s ease-out forwards; animation-delay: 3.0s; }
    .solar-bulk-metering-${solarPieAnimKey}   { animation: solarBulkNetMeteringLoad_${solarPieAnimKey}   0.9s ease-out forwards; animation-delay: 0.3s; }
    .solar-bulk-accounting-${solarPieAnimKey} { animation: solarBulkNetAccountingLoad_${solarPieAnimKey} 0.9s ease-out forwards; animation-delay: 1.2s; }
    .solar-bulk-plus-${solarPieAnimKey}       { animation: solarBulkNetPlusLoad_${solarPieAnimKey}       0.9s ease-out forwards; animation-delay: 2.1s; }
    .solar-bulk-plusplus-${solarPieAnimKey}   { animation: solarBulkNetPlusPlusLoad_${solarPieAnimKey}   0.9s ease-out forwards; animation-delay: 3.0s; }
  `;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <DashboardSelector activeDashboard={activeDashboard} onSelectDashboard={setActiveDashboard} />

        <div className="flex-1">

          {activeDashboard === "default" && (
            <>
              {/* Header */}
              <div className={`bg-white border-b border-gray-200 sticky top-0 z-10 transition-all duration-1000 ${isLoaded ? "opacity-100" : "opacity-0"}`}>
                <div className="max-w-7xl mx-auto px-4 py-4">
                  <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                        <button className="px-3 py-1.5 text-sm font-medium rounded-md bg-white shadow-sm">All Regions</button>
                        <button className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-white/50 rounded-md">Central</button>
                        <button className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-white/50 rounded-md">West</button>
                        <button className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-white/50 rounded-md">East</button>
                      </div>
                      <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}
                        className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ceb-maroon)]">
                        <option>2024</option><option>2023</option><option>2022</option>
                      </select>
                      <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}
                        className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ceb-maroon)]">
                        <option>All Months</option><option>January</option><option>February</option>
                        <option>March</option><option>April</option><option>May</option><option>June</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="max-w-7xl mx-auto px-4 py-6">

                {/* ── KPI Cards ─────────────────────────────────────────────── */}
                <div ref={kpiRef} className={`transition-all duration-1000 delay-200 ${isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-4">
                    {visibleCards.map((cardId) => {
                      const isDragging = draggedCardId === cardId;
                      const isDragOver = dragOverCardId === cardId;

                      const wrapCard = (content: React.ReactNode) => (
                        <div
                          key={cardId}
                          draggable
                          onDragStart={(e) => handleDragStart(e, cardId)}
                          onDragEnter={() => handleDragEnter(cardId)}
                          onDragOver={handleDragOver}
                          onDragEnd={handleDragEnd}
                          className={[
                            "relative bg-white rounded-2xl p-6 shadow-sm border transition-all duration-150 select-none group",
                            isDragging ? "opacity-40 scale-95 border-blue-300 shadow-none" : "opacity-100 scale-100",
                            isDragOver ? "border-blue-500 ring-2 ring-blue-300 shadow-md" : "border-gray-100",
                          ].join(" ")}
                          style={{ cursor: isDragging ? "grabbing" : "grab" }}
                        >
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-40 transition-opacity">
                            <svg width="12" height="16" viewBox="0 0 12 16" fill="#6b7280">
                              <circle cx="3" cy="3"  r="1.5"/><circle cx="9" cy="3"  r="1.5"/>
                              <circle cx="3" cy="8"  r="1.5"/><circle cx="9" cy="8"  r="1.5"/>
                              <circle cx="3" cy="13" r="1.5"/><circle cx="9" cy="13" r="1.5"/>
                            </svg>
                          </div>
                          {content}
                        </div>
                      );

                      if (cardId === "totalCustomers") return wrapCard(<>
                        <div className="flex items-center justify-end mb-2">
                          <div className="p-2 bg-blue-100 rounded-lg"><Users className="w-5 h-5 text-blue-600" /></div>
                        </div>
                        <h3 className="text-sm font-medium text-gray-500">Total Customers</h3>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                          {customerCountsLoading && bulkCountLoading ? "Loading..." : formatNumber(animatedTotal)}
                        </p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                          <span>Ordinary: {customerCountsLoading ? "..." : formatNumber(animatedOrdinary)}</span>
                          <span>Bulk: {bulkCountLoading ? "..." : formatNumber(animatedBulk)}</span>
                        </div>
                      </>);
                      if (cardId === "solarCustomers") return wrapCard(<>
                        <div className="flex items-center justify-end mb-2">
                          <div className="p-2 bg-yellow-100 rounded-lg"><Sun className="w-5 h-5 text-yellow-600" /></div>
                        </div>
                        <h3 className="text-sm font-medium text-gray-500">Solar Customers</h3>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{solarLoading || bulkSolarLoading ? "Loading..." : formatNumber(animatedSolar)}</p>
                         <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                          <span>Ordinary: {solarLoading ? "..." : formatNumber(animatedOrdSolarTotal)}</span>
                          <span>Bulk: {bulkSolarLoading ? "..." : formatNumber(animatedBulkSolarTotal)}</span>
                        </div>
                      </>);
                      if (cardId === "zeroConsumption") return wrapCard(<>
                        <div className="flex items-center justify-end mb-2">
                          <div className="p-2 bg-red-100 rounded-lg"><Zap className="w-5 h-5 text-red-600" /></div>
                        </div>
                        <h3 className="text-sm font-medium text-gray-500">Zero Consumption</h3>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(animatedZero)}</p>
                        <p className="text-xs text-gray-500 mt-2">Last 3 months</p>
                      </>);
                      if (cardId === "kioskCollection") return wrapCard(<>
                        <div className="flex items-center justify-end mb-2">
                          <div className="p-2 bg-green-100 rounded-lg"><DollarSign className="w-5 h-5 text-green-600" /></div>
                        </div>
                        <h3 className="text-sm font-medium text-gray-500">Kiosk Collection</h3>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                          {kioskLoading ? "Loading..." : formatCurrency(animatedKiosk)}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          {kioskError
                            ? kioskError
                            : `${kioskDateRange.fromDate || "-"} to ${kioskDateRange.toDate || "-"}`}
                        </p>
                      </>);
                      if (cardId === "revenueCollection") return wrapCard(<>
                        <div className="flex items-center justify-end mb-2">
                          <div className="p-2 bg-emerald-100 rounded-lg"><ShoppingCart className="w-5 h-5 text-emerald-600" /></div>
                        </div>
                        <h3 className="text-sm font-medium text-gray-500">Revenue Collection</h3>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(animatedRevenue)}</p>
                        <p className="text-xs text-gray-500 mt-2">Year to date</p>
                      </>);
                      if (cardId === "disconnections") return wrapCard(<>
                        <div className="flex items-center justify-end mb-2">
                          <div className="p-2 bg-orange-100 rounded-lg"><AlertCircle className="w-5 h-5 text-orange-600" /></div>
                        </div>
                        <h3 className="text-sm font-medium text-gray-500">Disconnections</h3>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(animatedDisconnect)}</p>
                        <p className="text-xs text-gray-500 mt-2">Pending action</p>
                      </>);
                      if (cardId === "arrearsPosition") return wrapCard(<>
                        <div className="flex items-center justify-end mb-2">
                          <div className="p-2 bg-rose-100 rounded-lg"><TrendingDown className="w-5 h-5 text-rose-600" /></div>
                        </div>
                        <h3 className="text-sm font-medium text-gray-500">Arrears Position</h3>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(animatedArrears)}</p>
                        <p className="text-xs text-gray-500 mt-2">Total outstanding</p>
                      </>);
                      if (cardId === "solarCapacity") return wrapCard(<>
                        <div className="flex items-center justify-end mb-2">
                          <div className="p-2 bg-amber-100 rounded-lg"><Battery className="w-5 h-5 text-amber-600" /></div>
                        </div>
                        <h3 className="text-sm font-medium text-gray-500">Solar Capacity</h3>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{formatCompact(animatedSolarCap)} kW</p>
                        <p className="text-xs text-gray-500 mt-2">Total installed</p>
                      </>);
                      if (cardId === "consumptionAnalysis") return wrapCard(<>
                        <div className="flex items-center justify-end mb-2">
                          <div className="p-2 bg-violet-100 rounded-lg"><Plug className="w-5 h-5 text-violet-600" /></div>
                        </div>
                        <h3 className="text-sm font-medium text-gray-500">Consumption (kWh)</h3>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{formatCompact(animatedConsumption)}</p>
                        <p className="text-xs text-gray-500 mt-2">Monthly average</p>
                      </>);
                      if (cardId === "billCycleStatus") return wrapCard(<>
                        <div className="flex items-center justify-end mb-2">
                          <div className="p-2 bg-cyan-100 rounded-lg"><Clock className="w-5 h-5 text-cyan-600" /></div>
                        </div>
                        <h3 className="text-sm font-medium text-gray-500">Bill Cycle Status</h3>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{activeBillCycle || "Cycle 450"}</p>
                        <p className="text-xs text-gray-500 mt-2">Current cycle</p>
                      </>);
                      if (cardId === "newConnections") return wrapCard(<>
                        <div className="flex items-center justify-end mb-2">
                          <div className="p-2 bg-lime-100 rounded-lg"><Plus className="w-5 h-5 text-lime-600" /></div>
                        </div>
                        <h3 className="text-sm font-medium text-gray-500">New Connections</h3>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(animatedNewConn)}</p>
                        <p className="text-xs text-gray-500 mt-2">Year to date</p>
                      </>);
                      return null;
                    })}
                  </div>

                  {/* Customize button */}
                  <div className="flex justify-end mb-6">
                    <button onClick={() => setShowMoreCards(!showMoreCards)}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                      {showMoreCards ? <><EyeOff className="w-4 h-4" /> Hide Cards</> : <><Eye className="w-4 h-4" /> Show More Cards</>}
                    </button>
                  </div>

                  {/* Card selection panel */}
                  {showMoreCards && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200 mb-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">Customize Your Dashboard</h3>
                          <p className="text-sm text-gray-600 mt-1">Select cards to display on your dashboard</p>
                        </div>
                        <button onClick={() => setShowMoreCards(false)} className="p-1 hover:bg-white rounded-lg transition-colors">
                          <X className="w-5 h-5 text-gray-600" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {cardConfig.map((card) => (
                          <div key={card.id} onClick={() => toggleCardVisibility(card.id)}
                            className={`p-4 rounded-lg cursor-pointer transition-all border-2 ${visibleCards.includes(card.id) ? "bg-white border-blue-500 shadow-md" : "bg-white border-gray-200 hover:border-gray-300"}`}>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900 text-sm">{card.title}</p>
                                <p className="text-xs text-gray-500 mt-1 capitalize">{card.category}</p>
                              </div>
                              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${visibleCards.includes(card.id) ? "bg-blue-500 border-blue-500" : "border-gray-300"}`}>
                                {visibleCards.includes(card.id) && (
                                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Sales Chart + New Customers ──────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 auto-rows-fr">

                  <Reveal delay={0} className="h-full">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-full flex flex-col">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h3 className="font-semibold text-gray-900">Kiosk Daily Collection Trend</h3>
                          <p className="text-sm text-gray-500 mt-1">Daily collection amounts for the week</p>
                        </div>
                        <DollarSign className="w-5 h-5 text-gray-400" />
                      </div>
                      <div className="mb-6 flex-1">
                        {kioskLoading ? (
                          <div className="h-64 flex items-center justify-center text-gray-400 text-sm">Loading...</div>
                        ) : kioskError ? (
                          <div className="h-64 flex items-center justify-center text-red-400 text-sm">{kioskError}</div>
                        ) : kioskDailyRecords.length === 0 ? (
                          <div className="h-64 flex items-center justify-center text-gray-400 text-sm">No kiosk collection data for this week.</div>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={kioskDailyRecords} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                              <XAxis
                                dataKey="TransDate"
                                tick={{ fontSize: 11 }}
                                tickFormatter={(date) => date.slice(5)}
                              />
                              <YAxis
                                tick={{ fontSize: 11 }}
                                tickFormatter={(v) => formatCompact(Number(v) || 0)}
                                width={44}
                              />
                              <Tooltip
                                formatter={(value: any) => formatCurrency(Number(value) || 0)}
                                labelStyle={{ fontWeight: 600 }}
                              />
                              <Line
                                type="monotone"
                                dataKey="CollectionAmount"
                                name="Collection Amount"
                                stroke="var(--ceb-maroon)"
                                strokeWidth={2.5}
                                dot={{ fill: "var(--ceb-maroon)", r: 5 }}
                                activeDot={{ r: 7 }}
                                isAnimationActive={true}
                                animationDuration={900}
                                animationEasing="ease-out"
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                      <div className="mt-auto pt-4 border-t border-gray-100">
                        <p className="text-xs text-gray-500 mb-2">Weekly Summary</p>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs text-gray-500">Period</p>
                            <p className="text-sm font-semibold text-gray-900">{kioskDateRange.fromDate} to {kioskDateRange.toDate}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Weekly Total</p>
                            <p className="text-sm font-semibold text-gray-900">{formatCurrency(kioskWeeklyTotal)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">User ID</p>
                            <p className="text-sm font-semibold text-gray-900">{kioskUserId}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Reveal>

                  {/* Solar customers — dual pie charts */}
                  <Reveal delay={120} className="h-full">
                    <div ref={solarPieRef} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-full flex flex-col">
                      <style key={solarPieAnimKey}>{solarPieStyles}</style>
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="font-semibold text-gray-900">Solar Customers by Net Type</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                        {[
                          { label: "Ordinary Solar", total: animatedOrdSolarTotal,
                            animatedCounts: [animatedOrdNetMetering, animatedOrdNetAccounting, animatedOrdNetPlus, animatedOrdNetPlusPlus],
                            pcts: [ordSolarNetMeteringPct, ordSolarNetAccountingPct, ordSolarNetPlusPct, ordSolarNetPlusPlusPct],
                            classes: [`solar-ord-metering-${solarPieAnimKey}`, `solar-ord-accounting-${solarPieAnimKey}`, `solar-ord-plus-${solarPieAnimKey}`, `solar-ord-plusplus-${solarPieAnimKey}`],
                            keys: ["ordinaryNetMetering","ordinaryNetAccounting","ordinaryNetPlus","ordinaryNetPlusPlus"] },
                          { label: "Bulk Solar", total: animatedBulkSolarTotal,
                            animatedCounts: [animatedBulkNetMetering, animatedBulkNetAccounting, animatedBulkNetPlus, animatedBulkNetPlusPlus],
                            pcts: [bulkSolarNetMeteringPct, bulkSolarNetAccountingPct, bulkSolarNetPlusPct, bulkSolarNetPlusPlusPct],
                            classes: [`solar-bulk-metering-${solarPieAnimKey}`, `solar-bulk-accounting-${solarPieAnimKey}`, `solar-bulk-plus-${solarPieAnimKey}`, `solar-bulk-plusplus-${solarPieAnimKey}`],
                            keys: ["bulkNetMetering","bulkNetAccounting","bulkNetPlus","bulkNetPlusPlus"] },
                        ].map(({ label, total, animatedCounts, pcts, classes, keys }) => {
                          const colors    = SOLAR_NET_TYPE_COLORS;
                          const netLabels = ["Net Metering", "Net Accounting", "Net Plus", "Net Plus Plus"];
                          let offset = 0;
                          return (
                            <div key={label} className="flex flex-col items-center">
                              <h4 className="text-sm font-medium text-gray-900 mb-4">{label}</h4>
                              <div className="relative w-40 h-40">
                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                                  <circle cx="100" cy="100" r="80" fill="none" stroke="#f3f4f6" strokeWidth="30" />
                                  {classes.map((cls, i) => {
                                    const el = (
                                      <circle key={i} cx="100" cy="100" r="80" fill="none" stroke={colors[i]} strokeWidth="30"
                                        strokeDasharray={`0 ${C}`} strokeDashoffset={i === 0 ? 0 : -((offset / 100) * C)}
                                        className={`${cls} transition-all duration-300 cursor-pointer hover:opacity-80`}
                                        onMouseEnter={() => setActiveSolarPieChart(keys[i])}
                                        onMouseLeave={() => setActiveSolarPieChart(null)} />
                                    );
                                    offset += pcts[i];
                                    return el;
                                  })}
                                </svg>
                                {activeSolarPieChart && keys.includes(activeSolarPieChart) ? (
                                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="bg-gray-900 text-white px-3 py-2 rounded-lg text-center shadow-lg">
                                      <p className="text-xs font-semibold">{netLabels[keys.indexOf(activeSolarPieChart)]}</p>
                                      <p className="text-sm font-bold mt-1">{formatNumber(animatedCounts[keys.indexOf(activeSolarPieChart)])}</p>
                                      <p className="text-xs text-gray-300 mt-0.5">{pcts[keys.indexOf(activeSolarPieChart)].toFixed(1)}%</p>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="text-center">
                                      <p className="text-xl font-bold text-gray-900">{formatNumber(total)}</p>
                                      <p className="text-xs text-gray-500">Total</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="space-y-2 w-full text-sm mt-4">
                                {netLabels.map((nl, i) => (
                                  <div key={nl} className="flex items-center gap-2 p-1 rounded">
                                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: colors[i] }} />
                                    <div>
                                      <p className="text-sm font-medium text-gray-900">{nl}</p>
                                      <p className="text-xs text-gray-500">{formatNumber(animatedCounts[i])} ({pcts[i].toFixed(1)}%)</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </Reveal>
                </div>

                {/* ── Sales & Collection Distribution ──────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 auto-rows-fr">
                  <Reveal delay={240} className="h-full">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-full flex flex-col">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h3 className="font-semibold text-gray-900">Sales & Collection Distribution</h3>
                          <p className="text-sm text-gray-500 mt-1">Monthly Sales Trend by Customer Type (Sorted by Bill Cycle)</p>
                        </div>
                        <PieChart className="w-5 h-5 text-gray-400" />
                      </div>
                      <div className="mb-6 flex-1 min-h-[16rem]">
                        {salesCollectionLoading ? (
                          <div className="h-64 flex items-center justify-center text-gray-400 text-sm">Loading...</div>
                        ) : salesCollectionError ? (
                          <div className="h-64 flex items-center justify-center text-red-400 text-sm">{salesCollectionError}</div>
                        ) : (
                          <DrawingLineChart data={salesLineData} formatCurrency={formatCurrency} formatCompact={formatCompact} chartKey={salesChartKey} />
                        )}
                      </div>
                      <div className="mt-auto pt-4 border-t border-gray-100">
                        <p className="text-xs text-gray-500 mb-2">Monthly Average</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-gray-500">Ordinary</p>
                            <p className="text-sm font-semibold text-gray-900">{formatCurrency(totalOrdinarySales / (monthlySalesData.length || 12))} / month</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Bulk</p>
                            <p className="text-sm font-semibold text-gray-900">{formatCurrency(totalBulkSales / (monthlySalesData.length || 12))} / month</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Reveal>

                  <Reveal delay={300} className="h-full">
                    <div ref={newCustomersPieRef} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-full flex flex-col">
                      <style key={newCustPieAnimKey}>{newCustPieStyles}</style>
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h3 className="font-semibold text-gray-900">New Customers (YTD)</h3>
                          <p className="text-sm text-gray-500 mt-1">Customer Acquisition Distribution</p>
                        </div>
                        <span className="text-gray-500 text-xs font-semibold tracking-wide">NEW</span>
                      </div>
                      <div className="flex flex-col md:flex-row items-center justify-center gap-8">
                        <div className="relative w-48 h-48">
                          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                            <circle cx="100" cy="100" r="80" fill="none" stroke="#f3f4f6" strokeWidth="30" />
                            <circle cx="100" cy="100" r="80" fill="none" stroke="var(--ceb-maroon)" strokeWidth="30"
                              strokeDasharray={`0 ${C}`} strokeDashoffset="0"
                              className={`pie-segment-ordinary-${newCustPieAnimKey}`}
                              onMouseEnter={() => setActivePieChart("newOrdinary")}
                              onMouseLeave={() => setActivePieChart(null)} />
                            <circle cx="100" cy="100" r="80" fill="none" stroke="var(--ceb-gold)" strokeWidth="30"
                              strokeDasharray={`0 ${C}`} strokeDashoffset={-((newOrdinaryPercentage / 100) * C)}
                              className={`pie-segment-bulk-${newCustPieAnimKey}`}
                              onMouseEnter={() => setActivePieChart("newBulk")}
                              onMouseLeave={() => setActivePieChart(null)} />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                              <p className="text-2xl font-bold text-gray-900">{formatNumber(animatedNewTotal)}</p>
                              <p className="text-xs text-gray-500">Total New</p>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${activePieChart === "newOrdinary" ? "bg-[color:var(--ceb-maroon)]/5" : ""}`}
                            onMouseEnter={() => setActivePieChart("newOrdinary")} onMouseLeave={() => setActivePieChart(null)}>
                            <div className="w-4 h-4 bg-[color:var(--ceb-maroon)] rounded-full" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">New Ordinary</p>
                              <p className="text-xs text-gray-500">{formatNumber(animatedNewOrdinary)} ({newOrdinaryPercentage.toFixed(1)}%)</p>
                            </div>
                          </div>
                          <div className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${activePieChart === "newBulk" ? "bg-[color:var(--ceb-gold)]/15" : ""}`}
                            onMouseEnter={() => setActivePieChart("newBulk")} onMouseLeave={() => setActivePieChart(null)}>
                            <div className="w-4 h-4 bg-[color:var(--ceb-gold)] rounded-full" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">New Bulk</p>
                              <p className="text-xs text-gray-500">{formatNumber(animatedNewBulk)} ({newBulkPercentage.toFixed(1)}%)</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="mt-auto pt-4 border-t border-gray-100">
                        <p className="text-xs text-gray-500 mb-2">Monthly Average New Customers</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div><p className="text-xs text-gray-500">Ordinary</p><p className="text-sm font-semibold text-gray-900">{Math.round(totalNewOrdinary / 6)} / month</p></div>
                          <div><p className="text-xs text-gray-500">Bulk</p><p className="text-sm font-semibold text-gray-900">{Math.round(totalNewBulk / 6)} / month</p></div>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-center gap-4 text-xs">
                        <span className="flex items-center gap-1 text-green-600"><ArrowUp className="w-3 h-3" />+12% vs last year</span>
                        <span className="text-gray-300">|</span>
                        <span className="text-gray-500">Target: 500/month</span>
                      </div>
                    </div>
                  </Reveal>
                </div>

                {/* ── Bottom 3-col grid ────────────────────────────────────── */}
                <div ref={bottomGridRef} className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                  <Reveal delay={0} className="lg:col-span-1 space-y-6">

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-900">Top Customers (Sorted by Consumption - Lowest to Highest)</h3>
                        <span className="text-xs text-gray-500">Current Month</span>
                      </div>
                      <div className="space-y-4">
                        {topCustomers.map((customer, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[color:var(--ceb-maroon)] to-[color:var(--ceb-maroon-2)] flex items-center justify-center text-white font-medium text-sm">
                                {customer.name.charAt(0)}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{customer.name}</p>
                                <p className="text-xs text-gray-500">{customer.type}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-gray-900">{formatNumber(customer.consumption)}</p>
                              <p className="text-xs text-gray-500">kWh</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button className="mt-4 w-full text-center text-sm text-[color:var(--ceb-maroon)] hover:text-[color:var(--ceb-maroon-2)] font-medium">
                        View All Customers →
                      </button>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-gray-900">Solar Capacity (Last Month)</h3>
                          <p className="text-xs text-gray-500 mt-1">Capacity (kW) and account count by net type (Sorted by Capacity)</p>
                        </div>
                        <span className="text-[color:var(--ceb-navy)] text-xs font-semibold tracking-wide">GRAPH</span>
                      </div>
                      <SolarCapacityChart data={solarCapacityChartData} formatCompact={formatCompact} formatKW={formatKW} formatInteger={formatInteger} />
                    </div>
                  </Reveal>

                  <Reveal delay={120} className="lg:col-span-1 space-y-6">

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-900">Target vs Actual by Region</h3>
                        <Target className="w-4 h-4 text-gray-400" />
                      </div>
                      <div className="space-y-4">
                        {([
                          { region: "Central", value: 85 },
                          { region: "East",    value: 72 },
                          { region: "North",   value: 61 },
                          { region: "South",   value: 78 },
                          { region: "West",    value: 54 },
                        ] as { region: string; value: number }[]).map(({ region, value }, i) => (
                          <RegionBar key={region} region={region} value={value} delay={i * 80} />
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-gray-100">
                        {[
                          { label: "≥ 80%",  color: "#16a34a" },
                          { label: "65–79%", color: "#2563eb" },
                          { label: "50–64%", color: "#d97706" },
                          { label: "< 50%",  color: "#dc2626" },
                        ].map(({ label, color }) => (
                          <span key={label} className="flex items-center gap-1.5 text-xs text-gray-500">
                            <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", backgroundColor: color }} />
                            {label}
                          </span>
                        ))}
                      </div>
                    </div>

                    
                  </Reveal>

                  <Reveal delay={240} className="lg:col-span-1 space-y-6">

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                      <h3 className="font-semibold text-gray-900 mb-3">Customer Segments (Sorted by Count)</h3>
                      <div className="space-y-2">
                        {[
                          { label: "Ordinary", value: animatedSegOrdinary, loading: customerCountsLoading, error: customerCountsError },
                          { label: "Bulk",     value: animatedSegBulk,     loading: bulkCountLoading,      error: bulkCountError      },
                          { label: "Solar",    value: animatedSegSolar,    loading: solarLoading,          error: solarError          },
                        ]
                          .sort((a, b) => (typeof a.value === "number" ? a.value : 0) - (typeof b.value === "number" ? b.value : 0))
                          .map((item) => (
                            <div key={item.label} className="flex justify-between text-sm">
                              <span>{item.label}</span>
                              <span className="font-medium">
                                {item.loading ? "Loading..." : item.error ? "Error" : formatNumber(item.value)}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                      <h3 className="font-semibold text-gray-900 mb-3">Quick Actions</h3>
                      <div className="space-y-2">
                        {["Generate Monthly Report", "Export Dashboard Data", "View Solar Capacity Graph"].sort().map((action) => (
                          <button key={action} className="w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                            {action}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                      <div className="text-center">
                        <p className="text-sm text-gray-500 mb-2">Profit Margin</p>
                        <p className="text-4xl font-bold text-gray-900 mb-2">15.34%</p>
                        <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                          <div className="bg-green-500 h-3 rounded-full" style={{ width: "15.34%" }} />
                        </div>
                        <p className="text-sm text-gray-600">
                          Sales Target Achievement:{" "}
                          <span className="font-semibold text-[color:var(--ceb-maroon)]">52.21%</span>
                        </p>
                      </div>
                    </div>
                  </Reveal>
                </div>
              </div>
            </>
          )}

          {activeDashboard === "analytics" && (
            <div className="p-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-6">Analytics Dashboard</h1>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { icon: <TrendingUp className="w-5 h-5 text-purple-600" />, bg: "bg-purple-100", label: "Traffic",     value: "124,567", badge: "+15.3%" },
                  { icon: <BarChart3  className="w-5 h-5 text-blue-600"   />, bg: "bg-blue-100",   label: "Conversions", value: "8,945",   badge: "+8.2%"  },
                  { icon: <DollarSign className="w-5 h-5 text-green-600"  />, bg: "bg-green-100",  label: "Revenue",     value: "LKR 2.5M",badge: "+22.1%" },
                ].sort((a, b) => (parseInt(a.value.replace(/[^0-9]/g,"")) || 0) - (parseInt(b.value.replace(/[^0-9]/g,"")) || 0))
                .map(({ icon, bg, label, value, badge }) => (
                  <div key={label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-2"><div className={`p-2 ${bg} rounded-lg`}>{icon}</div><span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">{badge}</span></div>
                    <h3 className="text-sm font-medium text-gray-500">{label}</h3>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeDashboard === "financial" && (
            <div className="p-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-6">Financial/Accounting Dashboard</h1>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { icon: <DollarSign className="w-5 h-5 text-emerald-600" />, bg: "bg-emerald-100", label: "Monthly Revenue", value: "LKR 12.4M", badge: "+9.1%" },
                  { icon: <TrendingDown className="w-5 h-5 text-rose-600" />, bg: "bg-rose-100", label: "Arrears Outstanding", value: "LKR 3.8M", badge: "-2.7%" },
                  { icon: <Target className="w-5 h-5 text-blue-600" />, bg: "bg-blue-100", label: "Collection Target", value: "91.6%", badge: "+4.4%" },
                  { icon: <PieChart className="w-5 h-5 text-amber-600" />, bg: "bg-amber-100", label: "Billing Accuracy", value: "98.3%", badge: "+1.2%" },
                ]
                  .sort((a, b) => (parseFloat(a.value.replace(/[^0-9.-]/g, "")) || 0) - (parseFloat(b.value.replace(/[^0-9.-]/g, "")) || 0))
                  .map(({ icon, bg, label, value, badge }) => (
                    <div key={label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                      <div className="flex items-center justify-between mb-2"><div className={`p-2 ${bg} rounded-lg`}>{icon}</div><span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">{badge}</span></div>
                      <h3 className="text-sm font-medium text-gray-500">{label}</h3>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {activeDashboard === "customer" && (
            <div className="p-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-6">Customer Management Dashboard</h1>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { icon: <Users className="w-5 h-5 text-blue-600" />, bg: "bg-blue-100", label: "Active Customers", value: "168,420", badge: "+3.9%" },
                  { icon: <Plus className="w-5 h-5 text-lime-600" />, bg: "bg-lime-100", label: "New Connections", value: "1,842", badge: "+11.3%" },
                  { icon: <AlertCircle className="w-5 h-5 text-red-600" />, bg: "bg-red-100", label: "Disconnection Cases", value: "412", badge: "-1.8%" },
                  { icon: <Clock className="w-5 h-5 text-cyan-600" />, bg: "bg-cyan-100", label: "Avg Service Time", value: "2.1 days", badge: "-6.5%" },
                ]
                  .sort((a, b) => (parseFloat(a.value.replace(/[^0-9.-]/g, "")) || 0) - (parseFloat(b.value.replace(/[^0-9.-]/g, "")) || 0))
                  .map(({ icon, bg, label, value, badge }) => (
                    <div key={label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                      <div className="flex items-center justify-between mb-2"><div className={`p-2 ${bg} rounded-lg`}>{icon}</div><span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">{badge}</span></div>
                      <h3 className="text-sm font-medium text-gray-500">{label}</h3>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {activeDashboard === "operations" && (
            <div className="p-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-6">Operations/Field Dashboard</h1>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { icon: <Briefcase className="w-5 h-5 text-indigo-600" />, bg: "bg-indigo-100", label: "Field Jobs Open", value: "286", badge: "+5.1%" },
                  { icon: <Clock className="w-5 h-5 text-blue-600" />, bg: "bg-blue-100", label: "Avg Response Time", value: "1.8h", badge: "-4.0%" },
                  { icon: <Zap className="w-5 h-5 text-amber-600" />, bg: "bg-amber-100", label: "Outage Events", value: "34", badge: "-12.2%" },
                  { icon: <Target className="w-5 h-5 text-green-600" />, bg: "bg-green-100", label: "SLA Compliance", value: "94.7%", badge: "+2.3%" },
                ]
                  .sort((a, b) => (parseFloat(a.value.replace(/[^0-9.-]/g, "")) || 0) - (parseFloat(b.value.replace(/[^0-9.-]/g, "")) || 0))
                  .map(({ icon, bg, label, value, badge }) => (
                    <div key={label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                      <div className="flex items-center justify-between mb-2"><div className={`p-2 ${bg} rounded-lg`}>{icon}</div><span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">{badge}</span></div>
                      <h3 className="text-sm font-medium text-gray-500">{label}</h3>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {activeDashboard === "solar" && (
            <div className="p-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-6">Solar Operations Dashboard</h1>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { icon: <Sun className="w-5 h-5 text-yellow-600" />, bg: "bg-yellow-100", label: "Solar Customers", value: "2,146", badge: "+12.3%" },
                  { icon: <Battery className="w-5 h-5 text-amber-600" />, bg: "bg-amber-100", label: "Installed Capacity", value: "4.8 MW", badge: "+9.5%" },
                  { icon: <Plug className="w-5 h-5 text-violet-600" />, bg: "bg-violet-100", label: "Grid Export", value: "1.2 GWh", badge: "+7.8%" },
                  { icon: <Target className="w-5 h-5 text-blue-600" />, bg: "bg-blue-100", label: "Net Metering Share", value: "58.4%", badge: "+1.4%" },
                ]
                  .sort((a, b) => (parseFloat(a.value.replace(/[^0-9.-]/g, "")) || 0) - (parseFloat(b.value.replace(/[^0-9.-]/g, "")) || 0))
                  .map(({ icon, bg, label, value, badge }) => (
                    <div key={label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                      <div className="flex items-center justify-between mb-2"><div className={`p-2 ${bg} rounded-lg`}>{icon}</div><span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">{badge}</span></div>
                      <h3 className="text-sm font-medium text-gray-500">{label}</h3>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {activeDashboard === "collections" && (
            <div className="p-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-6">Collections & Payments Dashboard</h1>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { icon: <DollarSign className="w-5 h-5 text-green-600" />, bg: "bg-green-100", label: "Today Collection", value: "LKR 8.7M", badge: "+6.8%" },
                  { icon: <ShoppingCart className="w-5 h-5 text-emerald-600" />, bg: "bg-emerald-100", label: "Digital Payments", value: "62.4%", badge: "+10.2%" },
                  { icon: <TrendingDown className="w-5 h-5 text-rose-600" />, bg: "bg-rose-100", label: "Overdue Accounts", value: "9,842", badge: "-3.6%" },
                  { icon: <BarChart3 className="w-5 h-5 text-blue-600" />, bg: "bg-blue-100", label: "Collection Efficiency", value: "89.1%", badge: "+2.1%" },
                ]
                  .sort((a, b) => (parseFloat(a.value.replace(/[^0-9.-]/g, "")) || 0) - (parseFloat(b.value.replace(/[^0-9.-]/g, "")) || 0))
                  .map(({ icon, bg, label, value, badge }) => (
                    <div key={label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                      <div className="flex items-center justify-between mb-2"><div className={`p-2 ${bg} rounded-lg`}>{icon}</div><span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">{badge}</span></div>
                      <h3 className="text-sm font-medium text-gray-500">{label}</h3>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {activeDashboard === "executive" && (
            <div className="p-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-6">Executive/KPI Dashboard</h1>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { icon: <Target className="w-5 h-5 text-blue-600" />, bg: "bg-blue-100", label: "Strategic KPI Score", value: "84.2%", badge: "+3.2%" },
                  { icon: <TrendingUp className="w-5 h-5 text-green-600" />, bg: "bg-green-100", label: "Revenue Growth", value: "11.7%", badge: "+1.6%" },
                  { icon: <Users className="w-5 h-5 text-purple-600" />, bg: "bg-purple-100", label: "Customer Satisfaction", value: "4.6/5", badge: "+0.2" },
                  { icon: <AlertCircle className="w-5 h-5 text-amber-600" />, bg: "bg-amber-100", label: "Critical Risks", value: "7", badge: "-2" },
                ]
                  .sort((a, b) => (parseFloat(a.value.replace(/[^0-9.-]/g, "")) || 0) - (parseFloat(b.value.replace(/[^0-9.-]/g, "")) || 0))
                  .map(({ icon, bg, label, value, badge }) => (
                    <div key={label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                      <div className="flex items-center justify-between mb-2"><div className={`p-2 ${bg} rounded-lg`}>{icon}</div><span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">{badge}</span></div>
                      <h3 className="text-sm font-medium text-gray-500">{label}</h3>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {activeDashboard === "inventory" && (
            <div className="p-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-6">Inventory & Procurement Dashboard</h1>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { icon: <Briefcase className="w-5 h-5 text-slate-600" />, bg: "bg-slate-100", label: "Stock On Hand", value: "12,460", badge: "+2.8%" },
                  { icon: <AlertCircle className="w-5 h-5 text-red-600" />, bg: "bg-red-100", label: "Low Stock Items", value: "38", badge: "-9.5%" },
                  { icon: <Clock className="w-5 h-5 text-blue-600" />, bg: "bg-blue-100", label: "Avg Lead Time", value: "5.6 days", badge: "-1.1%" },
                  { icon: <DollarSign className="w-5 h-5 text-green-600" />, bg: "bg-green-100", label: "Procurement Spend", value: "LKR 6.9M", badge: "+4.7%" },
                ]
                  .sort((a, b) => (parseFloat(a.value.replace(/[^0-9.-]/g, "")) || 0) - (parseFloat(b.value.replace(/[^0-9.-]/g, "")) || 0))
                  .map(({ icon, bg, label, value, badge }) => (
                    <div key={label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                      <div className="flex items-center justify-between mb-2"><div className={`p-2 ${bg} rounded-lg`}>{icon}</div><span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">{badge}</span></div>
                      <h3 className="text-sm font-medium text-gray-500">{label}</h3>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {activeDashboard === "crm" && (
            <div className="p-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-6">CRM Dashboard</h1>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { icon: <Users     className="w-5 h-5 text-orange-600" />, bg: "bg-orange-100", label: "Total Leads",     value: "3,456", badge: "+12.5%" },
                  { icon: <Target    className="w-5 h-5 text-blue-600"   />, bg: "bg-blue-100",   label: "Conversion Rate", value: "28.5%", badge: "+5.8%"  },
                  { icon: <Briefcase className="w-5 h-5 text-green-600"  />, bg: "bg-green-100",  label: "Deals Closed",   value: "245",   badge: "+18.3%" },
                ].sort((a, b) => (parseFloat(a.value) || 0) - (parseFloat(b.value) || 0))
                .map(({ icon, bg, label, value, badge }) => (
                  <div key={label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-2"><div className={`p-2 ${bg} rounded-lg`}>{icon}</div><span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">{badge}</span></div>
                    <h3 className="text-sm font-medium text-gray-500">{label}</h3>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeDashboard === "ecommerce" && (
            <div className="p-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-6">E-Commerce Dashboard</h1>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { icon: <ShoppingCart className="w-5 h-5 text-blue-600"   />, bg: "bg-blue-100",   label: "Orders",          value: "2,845",     badge: "+9.2%",  badgeColor: "text-green-600 bg-green-50" },
                  { icon: <DollarSign   className="w-5 h-5 text-green-600"  />, bg: "bg-green-100",  label: "Revenue",         value: "LKR 8.2M",  badge: "+14.7%", badgeColor: "text-green-600 bg-green-50" },
                  { icon: <Target       className="w-5 h-5 text-yellow-600" />, bg: "bg-yellow-100", label: "Avg Order Value", value: "LKR 2,885", badge: "-2.3%",  badgeColor: "text-red-600 bg-red-50"     },
                  { icon: <TrendingUp   className="w-5 h-5 text-purple-600" />, bg: "bg-purple-100", label: "Cart Recovery",   value: "42.3%",     badge: "+11.5%", badgeColor: "text-green-600 bg-green-50" },
                ].sort((a, b) => (parseFloat(a.value.replace(/[^0-9.-]/g,"")) || 0) - (parseFloat(b.value.replace(/[^0-9.-]/g,"")) || 0))
                .map(({ icon, bg, label, value, badge, badgeColor }) => (
                  <div key={label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-2"><div className={`p-2 ${bg} rounded-lg`}>{icon}</div><span className={`text-xs font-medium px-2 py-1 rounded-full ${badgeColor}`}>{badge}</span></div>
                    <h3 className="text-sm font-medium text-gray-500">{label}</h3>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeDashboard === "lms" && (
            <div className="p-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-6">LMS Dashboard</h1>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { icon: <Users      className="w-5 h-5 text-blue-600"   />, bg: "bg-blue-100",   label: "Active Students", value: "1,234" },
                  { icon: <FileText   className="w-5 h-5 text-purple-600" />, bg: "bg-purple-100", label: "Courses",         value: "47"    },
                  { icon: <TrendingUp className="w-5 h-5 text-green-600"  />, bg: "bg-green-100",  label: "Completion Rate", value: "73.4%" },
                ].sort((a, b) => (parseFloat(a.value) || 0) - (parseFloat(b.value) || 0))
                .map(({ icon, bg, label, value }) => (
                  <div key={label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-2"><div className={`p-2 ${bg} rounded-lg`}>{icon}</div><span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">New</span></div>
                    <h3 className="text-sm font-medium text-gray-500">{label}</h3>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeDashboard === "management" && (
            <div className="p-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-6">Management Dashboard</h1>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { icon: <Briefcase className="w-5 h-5 text-blue-600"   />, bg: "bg-blue-100",   label: "Active Projects", value: "12",  badge: "+7.2%" },
                  { icon: <Target    className="w-5 h-5 text-orange-600" />, bg: "bg-orange-100", label: "Tasks Completed", value: "342", badge: "+5.1%" },
                  { icon: <Users     className="w-5 h-5 text-green-600"  />, bg: "bg-green-100",  label: "Team Members",   value: "28",  badge: "+3.5%" },
                ].sort((a, b) => (parseInt(a.value) || 0) - (parseInt(b.value) || 0))
                .map(({ icon, bg, label, value, badge }) => (
                  <div key={label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-2"><div className={`p-2 ${bg} rounded-lg`}>{icon}</div><span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">{badge}</span></div>
                    <h3 className="text-sm font-medium text-gray-500">{label}</h3>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeDashboard === "saas" && (
            <div className="p-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-6">SaaS Dashboard</h1>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { icon: <Users      className="w-5 h-5 text-blue-600"   />, bg: "bg-blue-100",   label: "Active Users", value: "5,234",     badge: "+8.3%"  },
                  { icon: <DollarSign className="w-5 h-5 text-green-600"  />, bg: "bg-green-100",  label: "MRR",          value: "LKR 4.5M",  badge: "+12.7%" },
                  { icon: <TrendingUp className="w-5 h-5 text-purple-600" />, bg: "bg-purple-100", label: "Churn Rate",   value: "2.3%",      badge: "+4.2%"  },
                  { icon: <Target     className="w-5 h-5 text-yellow-600" />, bg: "bg-yellow-100", label: "LTV",          value: "LKR 18.5K", badge: "+6.8%"  },
                ].sort((a, b) => (parseFloat(a.value.replace(/[^0-9.-]/g,"")) || 0) - (parseFloat(b.value.replace(/[^0-9.-]/g,"")) || 0))
                .map(({ icon, bg, label, value, badge }) => (
                  <div key={label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-2"><div className={`p-2 ${bg} rounded-lg`}>{icon}</div><span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">{badge}</span></div>
                    <h3 className="text-sm font-medium text-gray-500">{label}</h3>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeDashboard === "support" && (
            <div className="p-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-6">Support Desk Dashboard</h1>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { icon: <HeadsetIcon className="w-5 h-5 text-red-600"    />, bg: "bg-red-100",    label: "Open Tickets",          value: "127"   },
                  { icon: <Clock       className="w-5 h-5 text-blue-600"   />, bg: "bg-blue-100",   label: "Avg Response Time",     value: "2.4h"  },
                  { icon: <TrendingUp  className="w-5 h-5 text-green-600"  />, bg: "bg-green-100",  label: "Resolution Rate",       value: "87.5%" },
                  { icon: <Users       className="w-5 h-5 text-yellow-600" />, bg: "bg-yellow-100", label: "Customer Satisfaction", value: "4.7/5" },
                ].sort((a, b) => (parseFloat(a.value) || 0) - (parseFloat(b.value) || 0))
                .map(({ icon, bg, label, value }) => (
                  <div key={label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-2"><div className={`p-2 ${bg} rounded-lg`}>{icon}</div><span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">New</span></div>
                    <h3 className="text-sm font-medium text-gray-500">{label}</h3>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Home;
