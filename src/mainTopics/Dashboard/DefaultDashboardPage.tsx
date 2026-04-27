import React, { useEffect, useState, useRef } from "react";
import { useUser } from "../../contexts/UserContext";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Zap,
  DollarSign,
  PieChart,
  Sun,
  Battery,
  Eye,
  EyeOff,
  X,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
} from "recharts";
import DashboardSelector from "../../components/mainTopics/Dashboard/DashboardSelector";
import KpiCard from "../../components/mainTopics/Dashboard/KpiCard";
import DashboardHeader from "../../components/mainTopics/Dashboard/DashboardHeader";

const SOLAR_ORDINARY_COLOR = "#0f4c81";
const SOLAR_BULK_COLOR = "#f59e0b";
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

interface MonthlySalesData {
  month: string;
  ordinary: number;
  bulk: number;
}

interface SalesCollectionRecord {
  Date: string;
  Amount: number;
  ErrorMessage: string;
}

interface SalesCollectionApiResponse {
  data: {
    records: SalesCollectionRecord[];
  } | null;
  errorMessage: string | null;
  errorDetails?: string;
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

interface SolarGenerationCapacityApiRecord {
  NetType?: string;
  AccountsCount?: number;
  CapacityKw?: number;
  netType?: string;
  accountsCount?: number;
  capacityKw?: number;
}

interface SolarGenerationCapacityApiData {
  SelectedBillCycle?: string;
  AvailableBillCycles?: string[];
  Records?: SolarGenerationCapacityApiRecord[];
  selectedBillCycle?: string;
  availableBillCycles?: string[];
  records?: SolarGenerationCapacityApiRecord[];
}

interface SolarGenerationCapacityApiResponse {
  data: SolarGenerationCapacityApiData | null;
  errorMessage?: string | null;
}

interface SolarCapacityComparisonRow {
  netType: string;
  ordinaryCapacity: number;
  bulkCapacity: number;
  ordinaryCount: number;
  bulkCount: number;
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
  formatDateLabel: (value: string) => string;
  chartKey: number;
}

const DrawingLineChart: React.FC<DrawingLineChartProps> = ({
  data,
  formatCurrency,
  formatCompact,
  formatDateLabel,
  chartKey,
}) => {
  const svgRef       = React.useRef<SVGSVGElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = React.useState<{
    index: number; x: number; y: number; month: string; ordinary: number; bulk: number;
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
    setTooltip({
      index: idx,
      x: xOf(idx),
      y: Math.min(yOf(d.ordinary), yOf(d.bulk)) - 8,
      month: d.month,
      ordinary: d.ordinary,
      bulk: d.bulk,
    });
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
        {data.map((_, i) => (
          <line key={`x-grid-${i}`} x1={xOf(i)} y1={padT} x2={xOf(i)} y2={padT + chartH} stroke="#eef2f7" strokeWidth="1" strokeDasharray="3 3" />
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
            {formatDateLabel(d.month)}
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

        {/* Hover cursor + dots */}
        {tooltip && (
          <rect
            x={Math.max(padL, xOf(tooltip.index) - (chartW / Math.max(data.length - 1, 1)) * 0.35)}
            y={padT}
            width={Math.min(
              (chartW / Math.max(data.length - 1, 1)) * 0.7,
              W - padR - Math.max(padL, xOf(tooltip.index) - (chartW / Math.max(data.length - 1, 1)) * 0.35)
            )}
            height={chartH}
            fill="#f3f4f6"
            opacity={0.45}
            rx={4}
          />
        )}
        {tooltip && data.map((d, i) => (
          <g key={i}>
            {i === tooltip.index && (
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
          const boxW = 188;
          const boxH = 66;
          const placeLeft = tooltip.x > W * 0.62;
          const preferredX = placeLeft ? tooltip.x - boxW - 12 : tooltip.x + 12;
          const preferredY = tooltip.y - boxH / 2;
          const bx = Math.max(padL, Math.min(preferredX, W - padR - boxW));
          const by = Math.max(padT, Math.min(preferredY, padT + chartH - boxH));
          return (
            <g>
              <rect x={bx + 2} y={by + 3} width={boxW} height={boxH} rx="6" fill="#d1d5db" opacity="0.4" />
              <rect x={bx} y={by} width={boxW} height={boxH} rx="6" fill="#ffffff" stroke="#e5e7eb" strokeWidth="1" />
              <text x={bx + 10} y={by + 16} fontSize="11" fontWeight="600" fill="#111827">{formatDateLabel(tooltip.month)}</text>
              <circle cx={bx + 10} cy={by + 31} r="4" fill="var(--ceb-maroon)" />
              <text x={bx + 20} y={by + 35} fontSize="10" fill="#6b7280">Ordinary :</text>
              <text x={bx + 82} y={by + 35} fontSize="10" fill="#111827" fontWeight="500">{formatCurrency(tooltip.ordinary)}</text>
              <circle cx={bx + 10} cy={by + 49} r="4" fill="var(--ceb-gold)" />
              <text x={bx + 20} y={by + 53} fontSize="10" fill="#6b7280">Bulk :</text>
              <text x={bx + 60} y={by + 53} fontSize="10" fill="#111827" fontWeight="500">{formatCurrency(tooltip.bulk)}</text>
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

// ─── SolarCapacityChart ───────────────────────────────────────────────────────
// Grouped bars show ordinary vs bulk capacity per net type.

interface SolarCapacityChartProps {
  data: SolarCapacityComparisonRow[];
  formatCompact: (n: number) => string;
  formatKW:      (n: number) => string;
}

const SolarCapacityChart: React.FC<SolarCapacityChartProps> = ({
  data, formatCompact, formatKW,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const { inView } = useInView(ref as React.RefObject<Element>, { threshold: 0.2 });

  return (
    <div ref={ref} className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }} barCategoryGap="22%">
          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
          <XAxis dataKey="netType" tick={{ fontSize: 11 }} interval={0} tickMargin={8} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCompact(Number(v))} width={44} />
          <Tooltip
            formatter={(value: any, name: any) => {
              const n = Number(value) || 0;

              if (name === "Ordinary") {
                return [formatKW(n), "Ordinary Capacity"];
              }

              if (name === "Bulk") {
                return [formatKW(n), "Bulk Capacity"];
              }

              return [String(value), String(name)];
            }}
            labelStyle={{ fontWeight: 600 }}
          />
          <Legend />
          <Bar dataKey="ordinaryCapacity" name="Ordinary" fill={SOLAR_ORDINARY_COLOR} radius={[6,6,0,0]}
            isAnimationActive={inView} animationDuration={900} animationEasing="ease-out" animationBegin={0}>
            <LabelList dataKey="ordinaryCapacity" position="top" formatter={(v: any) => formatCompact(Number(v) || 0)} style={{ fontSize: 10, fill: "#6b7280" }} />
          </Bar>
          <Bar dataKey="bulkCapacity" name="Bulk" fill={SOLAR_BULK_COLOR} radius={[6,6,0,0]}
            isAnimationActive={inView} animationDuration={900} animationEasing="ease-out" animationBegin={250}>
            <LabelList dataKey="bulkCapacity" position="top" formatter={(v: any) => formatCompact(Number(v) || 0)} style={{ fontSize: 10, fill: "#6b7280" }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

const DefaultDashboardPage: React.FC = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const activeDashboard = "default";

  const [selectedDivision, setSelectedDivision] = useState("all");
  const toRegion = (division: string) => {
    const match = /^d(\d+)$/i.exec(division || "");
    return match ? `R${match[1]}` : null;
  };
  const selectedRegion = toRegion(selectedDivision);
  const withRegion = (url: string) => {
    if (!selectedRegion) return url;
    const joiner = url.includes("?") ? "&" : "?";
    return `${url}${joiner}region=${encodeURIComponent(selectedRegion)}`;
  };

  // ── UI state ──────────────────────────────────────────────────────────────
  const [isLoaded, setIsLoaded]               = useState(false);
  const [activeSolarPieChart, setActiveSolarPieChart] = useState<string | null>(null);
  const [showMoreCards, setShowMoreCards]     = useState(false);
  const [visibleCards, setVisibleCards]       = useState<string[]>([
    "totalCustomers", "solarCustomers", /* "zeroConsumption", */ "kioskCollection",
  ]);
  const [draggedCardId, setDraggedCardId]   = useState<string | null>(null);
  const [dragOverCardId, setDragOverCardId] = useState<string | null>(null);

  // ── Scroll-trigger refs ───────────────────────────────────────────────────
  const kpiRef             = useRef<HTMLDivElement>(null);
  const solarPieRef        = useRef<HTMLDivElement>(null);
  const kioskTrendRef      = useRef<HTMLDivElement>(null);

  const { triggerCount: kpiTrigger }        = useInView(kpiRef        as React.RefObject<Element>, { threshold: 0.15 });
  const { triggerCount: solarPieTrigger }   = useInView(solarPieRef   as React.RefObject<Element>, { threshold: 0.3 });
  const { inView: kioskTrendInView, triggerCount: kioskTrendTrigger } = useInView(kioskTrendRef as React.RefObject<Element>, { threshold: 0.35 });

  // Pie chart animation keys — new key = new @keyframe names = animation replays
  const [solarPieAnimKey,   setSolarPieAnimKey]   = useState(0);

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
  const [customerCountsLoading, setCustomerCountsLoading] = useState(true);
  const [, setCustomerCountsError]     = useState<string | null>(null);
  const [solarLoading, setSolarLoading]                   = useState(true);
  const [bulkSolarLoading, setBulkSolarLoading]           = useState(true);
  const [, setSolarError]                       = useState<string | null>(null);
  const [bulkCountLoading, setBulkCountLoading]           = useState(true);
  const [, setBulkCountError]               = useState<string | null>(null);

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

  const [selectedSolarBillCycle, setSelectedSolarBillCycle] = useState<string>("");
  const [availableSolarBillCycles, setAvailableSolarBillCycles] = useState<string[]>([]);
  const [solarCapacityChartData, setSolarCapacityChartData] = useState<SolarCapacityComparisonRow[]>([]);
  const [solarCapacityLoading, setSolarCapacityLoading] = useState<boolean>(true);
  const [solarCapacityError, setSolarCapacityError] = useState<string | null>(null);
  const [solarCapacityInitialized, setSolarCapacityInitialized] = useState(false);

  // ── Dashboard card config ─────────────────────────────────────────────────
  const cardConfig = [
    { id: "totalCustomers",      title: "Total Customers",     default: true,  category: "customer"    },
    { id: "solarCustomers",      title: "Solar Customers",     default: true,  category: "solar"       },
    // { id: "zeroConsumption",     title: "Zero Consumption",    default: true,  category: "consumption" },
    { id: "kioskCollection",     title: "Kiosk Collection",    default: true,  category: "collection"  },
    { id: "salesCollectionDistribution", title: "Sales & Collection Distribution", default: false, category: "collection" },
    { id: "solarCapacity",       title: "Solar Generation Capacity (kW)", default: false, category: "solar"       },
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
        const res  = await fetch(withRegion(`/api/dashboard/ordinary-customers-summary?billCycle=0`), { headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
        const json = await res.json();
        setCustomerCounts((p) => ({ ...p, ordinary: json?.data?.TotalCount ?? 0 }));

      } catch (err: any) { setCustomerCountsError(err.message || "Failed to load ordinary customer count"); }
      finally { setCustomerCountsLoading(false); }
    };
    fetchOrdinaryCount();
  }, [selectedRegion]);

  useEffect(() => {
    const fetchBulkCount = async () => {
      setBulkCountLoading(true); setBulkCountError(null);
      try {
        const res  = await fetch(withRegion("/api/dashboard/customers/active-count"), { headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
        const json = await res.json();
        setCustomerCounts((p) => ({ ...p, bulk: json?.data?.activeCustomerCount ?? 0 }));
      } catch (err: any) { setBulkCountError(err.message || "Failed to load bulk customer count"); }
      finally { setBulkCountLoading(false); }
    };
    fetchBulkCount();
  }, [selectedRegion]);

  useEffect(() => {
    const fetchSolarCustomerData = async () => {
      setSolarLoading(true); setSolarError(null);
      try {
        const maxRes = await fetch(`/api/dashboard/solar-ordinary-customers/billcycle/max`, { headers: { Accept: "application/json" } });
        if (!maxRes.ok) throw new Error(`Failed to fetch max bill cycle`);
        const [r1, r2, r3, r4] = await Promise.all([
          fetch(withRegion(`/api/dashboard/solar-ordinary-customers/count/net-type-1`), { headers: { Accept: "application/json" } }),
          fetch(withRegion(`/api/dashboard/solar-ordinary-customers/count/net-type-2`), { headers: { Accept: "application/json" } }),
          fetch(withRegion(`/api/dashboard/solar-ordinary-customers/count/net-type-3`), { headers: { Accept: "application/json" } }),
          fetch(withRegion(`/api/dashboard/solar-ordinary-customers/count/net-type-4`), { headers: { Accept: "application/json" } }),
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
  }, [selectedRegion]);

  useEffect(() => {
    const fetchBulkSolarCustomerData = async () => {
      setBulkSolarLoading(true);
      try {
        const [r1, r2, r3, r4] = await Promise.all([
          fetch(withRegion(`/api/dashboard/solar-bulk-customers/count/net-type-1`), { headers: { Accept: "application/json" } }),
          fetch(withRegion(`/api/dashboard/solar-bulk-customers/count/net-type-2`), { headers: { Accept: "application/json" } }),
          fetch(withRegion(`/api/dashboard/solar-bulk-customers/count/net-type-3`), { headers: { Accept: "application/json" } }),
          fetch(withRegion(`/api/dashboard/solar-bulk-customers/count/net-type-4`), { headers: { Accept: "application/json" } }),
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
  }, [selectedRegion]);

  useEffect(() => {
    const fetchSalesCollection = async () => {
      setSalesCollectionLoading(true); setSalesCollectionError(null);
      try {
        const normalizeSalesRecords = (records: any[] = []): SalesCollectionRecord[] => {
          return records
            .map((rec) => ({
              Date: String(rec?.Date ?? rec?.date ?? ""),
              Amount: Number(rec?.Amount ?? rec?.amount ?? 0),
              ErrorMessage: String(rec?.ErrorMessage ?? rec?.errorMessage ?? ""),
            }))
            .filter((rec) => rec.Date);
        };

        const fetchSalesApiWithFallback = async (
          primaryUrl: string,
          fallbackUrl: string,
          sourceLabel: string
        ): Promise<SalesCollectionRecord[]> => {
          const read = async (url: string): Promise<SalesCollectionRecord[]> => {
            const res = await fetch(url, { headers: { Accept: "application/json" } });
            if (!res.ok) throw new Error(`${sourceLabel} fetch failed: ${res.status}`);

            const json: SalesCollectionApiResponse = await res.json();
            if (json?.errorMessage) {
              const details = json?.errorDetails ? ` (${json.errorDetails})` : "";
              throw new Error(`${sourceLabel} API error: ${json.errorMessage}${details}`);
            }

            if (!json?.data?.records || !Array.isArray(json.data.records)) {
              throw new Error(`${sourceLabel} API returned an invalid response format.`);
            }

            return normalizeSalesRecords(json.data.records);
          };

          try {
            return await read(primaryUrl);
          } catch (primaryError) {
            console.warn(`Primary endpoint failed for ${sourceLabel}. Retrying fallback endpoint...`, primaryError);
            return await read(fallbackUrl);
          }
        };

        const [ordinaryRecords, bulkRecords] = await Promise.all([
          fetchSalesApiWithFallback(
            withRegion("/api/dashboard/salesCollection/range/ordinary"),
            withRegion("/api/dashboard/salesCollection/range/ordinary"),
            "Ordinary sales/collection"
          ),
          fetchSalesApiWithFallback(
            withRegion("/api/dashboard/salesCollection/range/bulk"),
            withRegion("/api/dashboard/salesCollection/range/bulk"),
            "Bulk sales/collection"
          ),
        ]);

        const ordinaryByDate = new Map(ordinaryRecords.map((rec) => [rec.Date, Number(rec.Amount) || 0]));
        const bulkByDate = new Map(bulkRecords.map((rec) => [rec.Date, Number(rec.Amount) || 0]));
        const allDates = Array.from(new Set([...ordinaryByDate.keys(), ...bulkByDate.keys()]));

        const merged: MonthlySalesData[] = allDates.map((date) => ({
          month: date,
          ordinary: ordinaryByDate.get(date) ?? 0,
          bulk: bulkByDate.get(date) ?? 0,
        }));

        if (merged.length === 0) {
          throw new Error("Sales & collection API returned no records for the selected 7-day range.");
        }

        setMonthlySalesData([...merged].sort((a, b) =>
          new Date(a.month).getTime() - new Date(b.month).getTime()
        ));
        setSalesChartKey((k) => k + 1);
      } catch (err: any) { console.error("Error fetching sales/collection data:", err); setSalesCollectionError(err.message || "Failed to load sales data."); }
      finally { setSalesCollectionLoading(false); }
    };
    fetchSalesCollection();
  }, [selectedRegion]);

  useEffect(() => {
    const normalizeRecords = (records: SolarGenerationCapacityApiRecord[] = []) =>
      records.map((record) => ({
        netType: String(record.NetType ?? record.netType ?? ""),
        capacityKw: Number(record.CapacityKw ?? record.capacityKw ?? 0),
        accountsCount: Number(record.AccountsCount ?? record.accountsCount ?? 0),
      }));

    const fetchCapacityByEndpoint = async (endpoint: string, billCycle: string) => {
      const url = billCycle
        ? withRegion(`${endpoint}?billCycle=${encodeURIComponent(billCycle)}`)
        : withRegion(endpoint);

      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) {
        throw new Error(`Solar capacity fetch failed: ${res.status}`);
      }

      const json: SolarGenerationCapacityApiResponse = await res.json();
      if (json?.errorMessage) {
        throw new Error(json.errorMessage);
      }

      const data = json?.data;
      return {
        selectedBillCycle: String(data?.SelectedBillCycle ?? data?.selectedBillCycle ?? billCycle ?? ""),
        availableBillCycles: (data?.AvailableBillCycles ?? data?.availableBillCycles ?? []).map(String),
        records: normalizeRecords(data?.Records ?? data?.records ?? []),
      };
    };

    const fetchSolarCapacityGraph = async () => {
      setSolarCapacityLoading(true);
      setSolarCapacityError(null);

      try {
        const ordinaryEndpoint = "/api/dashboard/solar-ordinary-customers/generation-capacity";
        const bulkEndpoint = "/api/dashboard/solar-bulk-customers/generation-capacity";

        const ordinaryData = await fetchCapacityByEndpoint(ordinaryEndpoint, selectedSolarBillCycle);

        const resolvedBillCycles = ordinaryData.availableBillCycles;
        const latestBillCycle = resolvedBillCycles[0] || ordinaryData.selectedBillCycle || selectedSolarBillCycle;

        setAvailableSolarBillCycles(resolvedBillCycles);

        if (!solarCapacityInitialized) {
          setSolarCapacityInitialized(true);
          if (latestBillCycle && latestBillCycle !== selectedSolarBillCycle) {
            setSelectedSolarBillCycle(latestBillCycle);
            return;
          }
        }

        const resolvedBillCycle = selectedSolarBillCycle || latestBillCycle;
        if (resolvedBillCycle && resolvedBillCycle !== selectedSolarBillCycle) {
          setSelectedSolarBillCycle(resolvedBillCycle);
        }

        const bulkData = await fetchCapacityByEndpoint(bulkEndpoint, resolvedBillCycle);

        const rows = new Map<string, SolarCapacityComparisonRow>();
        const addRow = (item: SolarGenerationCapacityApiRecord, isOrdinary: boolean) => {
          const netType = String(item.NetType ?? item.netType ?? "");
          if (!netType) return;

          if (!rows.has(netType)) {
            rows.set(netType, {
              netType,
              ordinaryCapacity: 0,
              bulkCapacity: 0,
              ordinaryCount: 0,
              bulkCount: 0,
            });
          }

          const row = rows.get(netType)!;
          if (isOrdinary) {
            row.ordinaryCapacity += Number(item.CapacityKw ?? item.capacityKw ?? 0);
            row.ordinaryCount += Number(item.AccountsCount ?? item.accountsCount ?? 0);
          } else {
            row.bulkCapacity += Number(item.CapacityKw ?? item.capacityKw ?? 0);
            row.bulkCount += Number(item.AccountsCount ?? item.accountsCount ?? 0);
          }
        };

        ordinaryData.records.forEach((item) => addRow(item, true));
        bulkData.records.forEach((item) => addRow(item, false));

        const ordered = ["Net Metering", "Net Accounting", "Net Plus", "Net Plus Plus"];
        const chartRows = ordered
          .filter((netType) => rows.has(netType))
          .map((netType) => rows.get(netType)!);

        setSolarCapacityChartData(chartRows);
      } catch (err: any) {
        console.error("Solar capacity graph fetch error:", err);
        setSolarCapacityError(err?.message || "Failed to load solar capacity graph data.");
        setSolarCapacityChartData([]);
      } finally {
        setSolarCapacityLoading(false);
      }
    };

    fetchSolarCapacityGraph();
  }, [selectedSolarBillCycle, solarCapacityInitialized, selectedRegion]);

  const loggedUserId = (user?.Userno || "").trim().toUpperCase();
  const kioskUserId = loggedUserId.startsWith("KIOS") ? loggedUserId : "KIOS00";

  useEffect(() => {
    const fetchKioskWeeklyCollection = async () => {
      setKioskLoading(true);
      setKioskError(null);

      try {
        const res = await fetch(
          withRegion(`/api/dashboard/kiosk-collection?userId=${encodeURIComponent(kioskUserId)}`),
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
        const trendRecords = records.slice(-7);
        const weeklyTotal = records.reduce(
          (sum, row) => sum + (Number(row.CollectionAmount) || 0),
          0
        );

        setKioskWeeklyTotal(weeklyTotal);
        setKioskDailyRecords(records);
        setKioskDateRange({
          fromDate: trendRecords[0]?.TransDate ?? json?.data?.fromDate ?? "",
          toDate: trendRecords[trendRecords.length - 1]?.TransDate ?? json?.data?.toDate ?? "",
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
  }, [kioskUserId, selectedRegion]);

  // ── Formatters ────────────────────────────────────────────────────────────

  const formatNumber   = (n: number) => new Intl.NumberFormat("en-US").format(n);
  const formatCurrency = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "LKR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
  const formatCompact  = (n: number) => new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
  const formatKW       = (n: number) => `${formatCompact(n)} kW`;
  const formatIsoDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getLast7DaysRangeLabel = () => {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 1);

    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 6);

    return `${formatIsoDate(startDate)} to ${formatIsoDate(endDate)}`;
  };
  const formatMonthDayLabel = (value: string) => {
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];

    const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      const monthIndex = Number(isoMatch[2]) - 1;
      return `${months[monthIndex] || isoMatch[2]}-${isoMatch[3]}`;
    }

    const monthDayMatch = value.match(/^(\d{2})-(\d{2})$/);
    if (monthDayMatch) {
      const monthIndex = Number(monthDayMatch[1]) - 1;
      return `${months[monthIndex] || monthDayMatch[1]}-${monthDayMatch[2]}`;
    }

    return value;
  };

  const formatKioskDateTick = (value: string) => formatMonthDayLabel(value);

  // ── Derived values ────────────────────────────────────────────────────────

  const totalOrdinarySales = monthlySalesData.reduce((s, d) => s + d.ordinary, 0);
  const totalBulkSales     = monthlySalesData.reduce((s, d) => s + d.bulk, 0);

  const salesLineData = monthlySalesData
    .map((item) => ({ month: item.month, ordinary: item.ordinary, bulk: item.bulk, total: item.ordinary + item.bulk }))
    .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

  const salesCollectionDateRange = salesLineData.length
    ? `(${salesLineData[0].month} to ${salesLineData[salesLineData.length - 1].month})`
    : "";

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

  const ordinarySolarCapacityKw = solarCapacityChartData.reduce((sum, item) => sum + item.ordinaryCapacity, 0);
  const bulkSolarCapacityKw = solarCapacityChartData.reduce((sum, item) => sum + item.bulkCapacity, 0);
  const totalSolarCapacityKw = ordinarySolarCapacityKw + bulkSolarCapacityKw;
  const solarCapacityWeekRange = getLast7DaysRangeLabel();

  //const additionalCardIds = ["solarCapacity"];
  //const hasAdditionalCards = additionalCardIds.some((id) => visibleCards.includes(id));

  // ── Animated values ───────────────────────────────────────────────────────

  const animatedTotal       = useCountUp(customerCounts.ordinary + customerCounts.bulk, 1400, !customerCountsLoading && !bulkCountLoading, kpiTrigger);
  const animatedOrdinary    = useCountUp(customerCounts.ordinary,      1400, !customerCountsLoading, kpiTrigger);
  const animatedBulk        = useCountUp(customerCounts.bulk,          1400, !bulkCountLoading,      kpiTrigger);
  const animatedSolar       = useCountUp(totalSolarCustomers,          1400, !solarLoading && !bulkSolarLoading, kpiTrigger);
  const animatedZero        = useCountUp(customerCounts.zeroConsumption, 1400, true, kpiTrigger);
  const animatedKiosk       = useCountUp(kioskWeeklyTotal,             1400, !kioskLoading, kpiTrigger);
  const animatedSalesCollectionTotal = useCountUp(totalOrdinarySales + totalBulkSales, 1400, !salesCollectionLoading, kpiTrigger);
  const animatedSalesOrdinary = useCountUp(totalOrdinarySales, 1400, !salesCollectionLoading, kpiTrigger);
  const animatedSalesBulk = useCountUp(totalBulkSales, 1400, !salesCollectionLoading, kpiTrigger);
  const animatedSolarCap    = useCountUp(totalSolarCapacityKw, 1400, !solarCapacityLoading, kpiTrigger);

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
        <DashboardSelector
          activeDashboard={activeDashboard}
          onSelectDashboard={(dashboard) => navigate(`/dashboard/${dashboard}`)}
        />

        <div className="flex-1">

          <>
              <DashboardHeader
                title="Dashboard"
                selectedDivision={selectedDivision}
                onDivisionChange={setSelectedDivision}
              />

              <div className="max-w-7xl mx-auto px-4 py-6">

                {/* ── KPI Cards ─────────────────────────────────────────────── */}
                <div ref={kpiRef} className={`transition-all duration-1000 delay-200 ${isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-4">
                    {visibleCards.map((cardId) => {
                      const isDragging = draggedCardId === cardId;
                      const isDragOver = dragOverCardId === cardId;

                      if (cardId === "totalCustomers") {
                        return (
                          <KpiCard
                            cardId={cardId}
                            title="Total Customers"
                            value={customerCountsLoading && bulkCountLoading ? "Loading..." : formatNumber(animatedTotal)}
                            details={
                              <>
                                <span>Ordinary: {customerCountsLoading ? "..." : formatNumber(animatedOrdinary)}</span>
                                <span>Bulk: {bulkCountLoading ? "..." : formatNumber(animatedBulk)}</span>
                              </>
                            }
                            icon={<Users className="w-5 h-5 text-blue-600" />}
                            iconBgClass="bg-blue-100"
                            isDragging={isDragging}
                            isDragOver={isDragOver}
                            onDragStart={(e) => handleDragStart(e, cardId)}
                            onDragEnter={() => handleDragEnter(cardId)}
                            onDragOver={handleDragOver}
                            onDragEnd={handleDragEnd}
                          />
                        );
                      }

                      if (cardId === "solarCustomers") {
                        return (
                          <KpiCard
                            cardId={cardId}
                            title="Solar Customers"
                            value={solarLoading || bulkSolarLoading ? "Loading..." : formatNumber(animatedSolar)}
                            details={
                              <>
                                <span>Ordinary: {solarLoading ? "..." : formatNumber(animatedOrdSolarTotal)}</span>
                                <span>Bulk: {bulkSolarLoading ? "..." : formatNumber(animatedBulkSolarTotal)}</span>
                              </>
                            }
                            icon={<Sun className="w-5 h-5 text-yellow-600" />}
                            iconBgClass="bg-yellow-100"
                            isDragging={isDragging}
                            isDragOver={isDragOver}
                            onDragStart={(e) => handleDragStart(e, cardId)}
                            onDragEnter={() => handleDragEnter(cardId)}
                            onDragOver={handleDragOver}
                            onDragEnd={handleDragEnd}
                          />
                        );
                      }

                      if (cardId === "zeroConsumption") {
                        return (
                          <KpiCard
                            cardId={cardId}
                            title="Zero Consumption"
                            value={formatNumber(animatedZero)}
                            subtitle="Last 3 months"
                            icon={<Zap className="w-5 h-5 text-red-600" />}
                            iconBgClass="bg-red-100"
                            isDragging={isDragging}
                            isDragOver={isDragOver}
                            onDragStart={(e) => handleDragStart(e, cardId)}
                            onDragEnter={() => handleDragEnter(cardId)}
                            onDragOver={handleDragOver}
                            onDragEnd={handleDragEnd}
                          />
                        );
                      }

                      if (cardId === "kioskCollection") {
                        return (
                          <KpiCard
                            cardId={cardId}
                            title="Kiosk Collection"
                            value={kioskLoading ? "Loading..." : formatCurrency(animatedKiosk)}
                            subtitle={
                              kioskError
                                ? kioskError
                                : `${kioskDateRange.fromDate || "-"} to ${kioskDateRange.toDate || "-"}`
                            }
                            icon={<DollarSign className="w-5 h-5 text-green-600" />}
                            iconBgClass="bg-green-100"
                            isDragging={isDragging}
                            isDragOver={isDragOver}
                            onDragStart={(e) => handleDragStart(e, cardId)}
                            onDragEnter={() => handleDragEnter(cardId)}
                            onDragOver={handleDragOver}
                            onDragEnd={handleDragEnd}
                          />
                        );
                      }

                      if (cardId === "solarCapacity") {
                        return (
                          <KpiCard
                            cardId={cardId}
                            title="Solar Generation Capacity"
                            value={
                              solarCapacityLoading
                                ? "Loading..."
                                : solarCapacityError
                                  ? "Unavailable"
                                  : `${formatCompact(animatedSolarCap)} kW`
                            }
                            details={
                              solarCapacityLoading || solarCapacityError
                                ? undefined
                                : (
                                  <>
                                    <span>Ordinary: {formatKW(ordinarySolarCapacityKw)}</span>
                                    <span>Bulk: {formatKW(bulkSolarCapacityKw)}</span>
                                  </>
                                )
                            }
                            subtitle={
                              solarCapacityError
                                ? solarCapacityError
                                : solarCapacityWeekRange
                            }
                            icon={<Battery className="w-5 h-5 text-amber-600" />}
                            iconBgClass="bg-amber-100"
                            isDragging={isDragging}
                            isDragOver={isDragOver}
                            onDragStart={(e) => handleDragStart(e, cardId)}
                            onDragEnter={() => handleDragEnter(cardId)}
                            onDragOver={handleDragOver}
                            onDragEnd={handleDragEnd}
                          />
                        );
                      }

                      if (cardId === "salesCollectionDistribution") {
                        return (
                          <KpiCard
                            cardId={cardId}
                            title="Sales & Collection Distribution"
                            value={
                              salesCollectionLoading && salesLineData.length === 0
                                ? "Loading..."
                                : salesCollectionError && salesLineData.length === 0
                                  ? "Unavailable"
                                  : formatCurrency(animatedSalesCollectionTotal)
                            }
                            details={
                              salesCollectionLoading && salesLineData.length === 0
                                ? undefined
                                : (
                                  <>
                                    <span>Ordinary: {formatCurrency(animatedSalesOrdinary)}</span>
                                    <span>Bulk: {formatCurrency(animatedSalesBulk)}</span>
                                  </>
                                )
                            }
                            subtitle={
                              salesCollectionError && salesLineData.length === 0
                                ? salesCollectionError
                                : salesLineData.length > 0
                                  ? `${salesLineData[0].month} to ${salesLineData[salesLineData.length - 1].month}`
                                  : "Last 7 days"
                            }
                            icon={<PieChart className="w-5 h-5 text-violet-600" />}
                            iconBgClass="bg-violet-100"
                            isDragging={isDragging}
                            isDragOver={isDragOver}
                            onDragStart={(e) => handleDragStart(e, cardId)}
                            onDragEnter={() => handleDragEnter(cardId)}
                            onDragOver={handleDragOver}
                            onDragEnd={handleDragEnd}
                          />
                        );
                      }

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

                {/* ── Sales Chart ───────────────────────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 auto-rows-fr">

                  <Reveal delay={0} className="h-full">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-full flex flex-col">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h3 className="font-semibold text-gray-900">Kiosk Daily Collection Trend</h3>
                          <p className="text-sm text-gray-500 mt-1">
                            Daily collection amounts for the week {kioskDateRange.fromDate && kioskDateRange.toDate ? `(${kioskDateRange.fromDate} to ${kioskDateRange.toDate})` : ""}
                          </p>
                        </div>
                      </div>
                      <div ref={kioskTrendRef} className="mb-6 flex-1">
                        {kioskLoading ? (
                          <div className="h-64 flex items-center justify-center text-gray-400 text-sm">Loading...</div>
                        ) : kioskError ? (
                          <div className="h-64 flex items-center justify-center text-red-400 text-sm">{kioskError}</div>
                        ) : kioskDailyRecords.length === 0 ? (
                          <div className="h-64 flex items-center justify-center text-gray-400 text-sm">No kiosk collection data for this week.</div>
                        ) : (
                          <ResponsiveContainer key={`kiosk-trend-${kioskTrendTrigger}`} width="100%" height="100%">
                            <LineChart data={kioskDailyRecords.slice(-7)} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                              <XAxis
                                dataKey="TransDate"
                                tick={{ fontSize: 12, fill: "#374151", fontWeight: 700 }}
                                tickFormatter={(date) => formatKioskDateTick(String(date))}
                                interval={0}
                                minTickGap={0}
                              />
                              <YAxis
                                tick={{ fontSize: 11, fontWeight: 600, fill: "#374151" }}
                                tickFormatter={(v) => formatCompact(Number(v) || 0)}
                                width={44}
                              />
                              <Tooltip
                                formatter={(value: any) => formatCurrency(Number(value) || 0)}
                                labelFormatter={(label: any) => formatMonthDayLabel(String(label))}
                                labelStyle={{ fontWeight: 700 }}
                              />
                              <Line
                                type="monotone"
                                dataKey="CollectionAmount"
                                name="Collection Amount"
                                stroke="var(--ceb-maroon)"
                                strokeWidth={2.5}
                                dot={{ fill: "var(--ceb-maroon)", r: 5 }}
                                activeDot={{ r: 7 }}
                                isAnimationActive={kioskTrendInView}
                                animationDuration={900}
                                animationEasing="ease-out"
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        )}
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
                          <p className="text-sm text-gray-500 mt-1">Daily Collection Trend by Customer Type {salesCollectionDateRange}
                          </p>
                        </div>
                        <PieChart className="w-5 h-5 text-gray-400" />
                      </div>
                      <div className="mb-6 flex-1 min-h-[16rem]">
                        {salesCollectionLoading && salesLineData.length === 0 ? (
                          <div className="h-64 flex items-center justify-center text-gray-400 text-sm">Loading...</div>
                        ) : salesCollectionError && salesLineData.length === 0 ? (
                          <div className="h-64 flex items-center justify-center text-red-400 text-sm">{salesCollectionError}</div>
                        ) : (
                          <div className="h-full flex flex-col">
                            <DrawingLineChart data={salesLineData} formatCurrency={formatCurrency} formatCompact={formatCompact} formatDateLabel={formatMonthDayLabel} chartKey={salesChartKey} />
                          </div>
                        )}
                      </div>
                      <div className="mt-auto pt-4 border-t border-gray-100">
                        <p className="text-xs text-gray-500 mb-2">Daily Average (Last 7 Days)</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-gray-500">Ordinary</p>
                            <p className="text-sm font-semibold text-gray-900">{formatCurrency(totalOrdinarySales / (monthlySalesData.length || 7))} / day</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Bulk</p>
                            <p className="text-sm font-semibold text-gray-900">{formatCurrency(totalBulkSales / (monthlySalesData.length || 7))} / day</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Reveal>

                  <Reveal delay={300} className="h-full">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-full flex flex-col">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-gray-900">Solar Generation Capacity</h3>
                          <p className="text-xs text-gray-500 mt-1">
                            Capacity (kW) 
                            {selectedSolarBillCycle ? ` - Bill Cycle ${selectedSolarBillCycle}` : ""}
                          </p>
                        </div>
                        <span className="text-[color:var(--ceb-navy)] text-xs font-semibold tracking-wide">GRAPH</span>
                      </div>

                      <div className="mb-3">
                        <label className="block text-xs text-gray-500 mb-1">Bill Cycle</label>
                        <select
                          value={selectedSolarBillCycle}
                          onChange={(e) => setSelectedSolarBillCycle(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[color:var(--ceb-maroon)]"
                          disabled={solarCapacityLoading || availableSolarBillCycles.length === 0}
                        >
                          {availableSolarBillCycles.map((cycle) => (
                            <option key={cycle} value={cycle}>
                              {cycle}
                            </option>
                          ))}
                        </select>
                      </div>

                      {solarCapacityLoading ? (
                        <div className="h-56 flex items-center justify-center text-sm text-gray-400">Loading solar capacity graph...</div>
                      ) : solarCapacityError ? (
                        <div className="h-56 flex items-center justify-center text-sm text-red-500">{solarCapacityError}</div>
                      ) : solarCapacityChartData.length === 0 ? (
                        <div className="h-56 flex items-center justify-center text-sm text-gray-400">No solar capacity data available.</div>
                      ) : (
                        <SolarCapacityChart data={solarCapacityChartData} formatCompact={formatCompact} formatKW={formatKW} />
                      )}
                    </div>
                  </Reveal>

                </div>
              </div>
          </>

        </div>
      </div>
    </div>
  );
};

export default DefaultDashboardPage;
