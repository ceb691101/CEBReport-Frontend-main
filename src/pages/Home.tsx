import React, { useEffect, useState } from "react";
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
  Settings,
  Briefcase,
  HeadsetIcon,
  ChevronUp,
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
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
} from "recharts";
import DashboardSelector from "../components/dashboard/DashboardSelector";

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

interface SalesData {
  ordinary: { charge: number; units: number };
  bulk: { charge: number; units: number };
  kioskCollection: number;
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

// ─── Component ────────────────────────────────────────────────────────────────

const Home: React.FC = () => {
  useUser();

  // ── UI state ──────────────────────────────────────────────────────────────
  const [activeDashboard, setActiveDashboard] = useState<string>("default");
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedYear, setSelectedYear] = useState("2023");
  const [selectedMonth, setSelectedMonth] = useState("All");
  const [activePieChart, setActivePieChart] = useState<string | null>(null);
  const [activeSolarPieChart, setActiveSolarPieChart] = useState<string | null>(null);
  const [showMoreCards, setShowMoreCards] = useState(false);
  const [visibleCards, setVisibleCards] = useState<string[]>([
    "totalCustomers",
    "solarCustomers",
    "zeroConsumption",
    "kioskCollection",
  ]);

  // ── Customer counts ────────────────────────────────────────────────────────
 const [customerCounts, setCustomerCounts] = useState<CustomerCounts>({
  ordinary: 1234,      // still mock
  bulk: 0,              // ← will be fetched
  solar: {
    netMetering: 567,
    netAccounting: 234,
    netPlus: 189,
    netPlusPlus: 76
  },
  zeroConsumption: 1234
});
  const [bulkSolarCustomers, setBulkSolarCustomers] = useState({
    netMetering: 0,
    netAccounting: 0,
    netPlus: 0,
    netPlusPlus: 0,
  });
  const [activeBillCycle, setActiveBillCycle] = useState<string>("");
  const [customerCountsLoading, setCustomerCountsLoading] = useState(true);
  const [customerCountsError, setCustomerCountsError] = useState<string | null>(null);
  const [solarLoading, setSolarLoading] = useState(true);
  const [solarError, setSolarError] = useState<string | null>(null);
  const [bulkCountLoading, setBulkCountLoading] = useState(true);
const [bulkCountError, setBulkCountError] = useState<string | null>(null);

  // ── Sales / Collection (live from API — from File 1) ──────────────────────
  const [monthlySalesData, setMonthlySalesData] = useState<MonthlySalesData[]>([]);
  const [salesCollectionLoading, setSalesCollectionLoading] = useState(true);
  const [salesCollectionError, setSalesCollectionError] = useState<string | null>(null);

  // ── Static / mock data ────────────────────────────────────────────────────
  const [topCustomers] = useState<TopCustomer[]>([
    { name: "John Doe", consumption: 45231, type: "Bulk" },
    { name: "Jane Smith", consumption: 38456, type: "Bulk" },
    { name: "Michael Brown", consumption: 35678, type: "Ordinary" },
    { name: "Emily Davis", consumption: 32456, type: "Ordinary" },
    { name: "Robert Johnson", consumption: 29876, type: "Bulk" },
  ]);

  const [salesData] = useState<SalesData>({
    ordinary: { charge: 2456789, units: 1234567 },
    bulk: { charge: 5678901, units: 2345678 },
    kioskCollection: 456789,
  });

  const [monthlyNewCustomers] = useState<MonthlyNewCustomers[]>([
    { month: "Jan", ordinary: 210, bulk: 38 },
    { month: "Feb", ordinary: 225, bulk: 42 },
    { month: "Mar", ordinary: 234, bulk: 45 },
    { month: "Apr", ordinary: 218, bulk: 40 },
    { month: "May", ordinary: 242, bulk: 48 },
    { month: "Jun", ordinary: 238, bulk: 44 },
  ]);

  const [solarCapacity] = useState({
    netMetering: { count: 567, capacity: 2345 },
    netAccounting: { count: 234, capacity: 1234 },
    netPlus: { count: 189, capacity: 890 },
    netPlusPlus: { count: 76, capacity: 345 },
  });

  // ── Dashboard card config ─────────────────────────────────────────────────
  const cardConfig = [
    { id: "totalCustomers",     title: "Total Customers",     default: true,  category: "customer"     },
    { id: "solarCustomers",     title: "Solar Customers",     default: true,  category: "solar"        },
    { id: "zeroConsumption",    title: "Zero Consumption",    default: true,  category: "consumption"  },
    { id: "kioskCollection",    title: "Kiosk Collection",    default: true,  category: "collection"   },
    { id: "revenueCollection",  title: "Revenue Collection",  default: false, category: "collection"   },
    { id: "disconnections",     title: "Disconnections",      default: false, category: "customer"     },
    { id: "arrearsPosition",    title: "Arrears Position",    default: false, category: "billing"      },
    { id: "solarCapacity",      title: "Solar Capacity (kW)", default: false, category: "solar"        },
    { id: "consumptionAnalysis",title: "Consumption (kWh)",   default: false, category: "consumption"  },
    { id: "billCycleStatus",    title: "Bill Cycle Status",   default: false, category: "billing"      },
    { id: "newConnections",     title: "New Connections",     default: false, category: "customer"     },
  ];

  const toggleCardVisibility = (cardId: string) => {
    setVisibleCards((prev) =>
      prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId]
    );
  };

  // ── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Fetch ordinary customer count
  useEffect(() => {
    const fetchOrdinaryCount = async () => {
      setCustomerCountsLoading(true);
      setCustomerCountsError(null);
      try {
        const response = await fetch(
          `/api/dashboard/ordinary-customers-summary?billCycle=0`,
          { headers: { Accept: "application/json" } }
        );
        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
        const json = await response.json();
        const total: number = json?.data?.TotalCount ?? 0;
        const activeCycle: string = json?.data?.BillCycle ?? "";
        setCustomerCounts((prev) => ({ ...prev, ordinary: total }));
        setActiveBillCycle(activeCycle);
      } catch (err: any) {
        setCustomerCountsError(err.message || "Failed to load ordinary customer count");
      } finally {
        setCustomerCountsLoading(false);
      }
    };
    fetchOrdinaryCount();
  }, []);

  // Fetch bulk active customer count
useEffect(() => {
  const fetchBulkCount = async () => {
    setBulkCountLoading(true);
    setBulkCountError(null);
    try {
      const response = await fetch("/api/dashboard/customers/active-count", {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
      const json = await response.json();
      const count: number = json?.data?.activeCustomerCount ?? 0;
      setCustomerCounts((prev) => ({ ...prev, bulk: count }));
    } catch (err: any) {
      setBulkCountError(err.message || "Failed to load bulk customer count");
    } finally {
      setBulkCountLoading(false);
    }
  };
  fetchBulkCount();
}, []);

  // Fetch ordinary solar customers by net type
  useEffect(() => {
    const fetchSolarCustomerData = async () => {
      setSolarLoading(true);
      setSolarError(null);
      try {
        const maxCycleResponse = await fetch(
          `http://localhost:44381/api/dashboard/solar-ordinary-customers/billcycle/max`,
          { headers: { Accept: "application/json" } }
        );
        if (!maxCycleResponse.ok) throw new Error(`Failed to fetch max bill cycle`);

        const [r1, r2, r3, r4] = await Promise.all([
          fetch(`http://localhost:44381/api/dashboard/solar-ordinary-customers/count/net-type-1`, { headers: { Accept: "application/json" } }),
          fetch(`http://localhost:44381/api/dashboard/solar-ordinary-customers/count/net-type-2`, { headers: { Accept: "application/json" } }),
          fetch(`http://localhost:44381/api/dashboard/solar-ordinary-customers/count/net-type-3`, { headers: { Accept: "application/json" } }),
          fetch(`http://localhost:44381/api/dashboard/solar-ordinary-customers/count/net-type-4`, { headers: { Accept: "application/json" } }),
        ]);

        if (!r1.ok || !r2.ok || !r3.ok || !r4.ok) {
          throw new Error("Failed to fetch one or more net-type counts");
        }

        const [d1, d2, d3, d4] = await Promise.all([r1.json(), r2.json(), r3.json(), r4.json()]);

        setCustomerCounts((prev) => ({
          ...prev,
          solar: {
            netMetering:   d1?.data?.CustomersCount ?? 0,
            netAccounting: d2?.data?.CustomersCount ?? 0,
            netPlus:       d3?.data?.CustomersCount ?? 0,
            netPlusPlus:   d4?.data?.CustomersCount ?? 0,
          },
        }));
      } catch (err: any) {
        setSolarError(err.message || "Failed to load solar customer data");
        console.error("Solar data fetch error:", err);
      } finally {
        setSolarLoading(false);
      }
    };
    fetchSolarCustomerData();
  }, []);

  // Fetch bulk solar customers by net type
  useEffect(() => {
    const fetchBulkSolarCustomerData = async () => {
      try {
        const [r1, r2, r3, r4] = await Promise.all([
          fetch(`http://localhost:44381/api/dashboard/solar-bulk-customers/count/net-type-1`, { headers: { Accept: "application/json" } }),
          fetch(`http://localhost:44381/api/dashboard/solar-bulk-customers/count/net-type-2`, { headers: { Accept: "application/json" } }),
          fetch(`http://localhost:44381/api/dashboard/solar-bulk-customers/count/net-type-3`, { headers: { Accept: "application/json" } }),
          fetch(`http://localhost:44381/api/dashboard/solar-bulk-customers/count/net-type-4`, { headers: { Accept: "application/json" } }),
        ]);

        if (!r1.ok || !r2.ok || !r3.ok || !r4.ok) {
          throw new Error("Failed to fetch bulk solar net-type counts");
        }

        const [d1, d2, d3, d4] = await Promise.all([r1.json(), r2.json(), r3.json(), r4.json()]);

        setBulkSolarCustomers({
          netMetering:   d1?.data?.CustomersCount ?? 0,
          netAccounting: d2?.data?.CustomersCount ?? 0,
          netPlus:       d3?.data?.CustomersCount ?? 0,
          netPlusPlus:   d4?.data?.CustomersCount ?? 0,
        });
      } catch (err: any) {
        console.error("Bulk solar data fetch error:", err);
      }
    };
    fetchBulkSolarCustomerData();
  }, []);

  // Fetch sales & collection data (live — restored from File 1)
  useEffect(() => {
    const fetchSalesCollection = async () => {
      setSalesCollectionLoading(true);
      setSalesCollectionError(null);
      try {
        const [ordinaryRes, bulkRes] = await Promise.all([
          fetch("/api/dashboard/salesCollection/range/ordinary", { headers: { Accept: "application/json" } }),
          fetch("/api/dashboard/salesCollection/range/bulk",     { headers: { Accept: "application/json" } }),
        ]);

        if (!ordinaryRes.ok) throw new Error(`Ordinary fetch failed: ${ordinaryRes.status}`);
        if (!bulkRes.ok)     throw new Error(`Bulk fetch failed: ${bulkRes.status}`);

        const ordinaryJson: SalesCollectionApiResponse = await ordinaryRes.json();
        const bulkJson:     SalesCollectionApiResponse = await bulkRes.json();

        const ordinaryRecords = ordinaryJson.data.records;
        const bulkRecords     = bulkJson.data.records;

        const merged: MonthlySalesData[] = ordinaryRecords.map((rec, i) => ({
          month:    `BC ${rec.BillCycle}`,
          ordinary: rec.Sales,
          bulk:     bulkRecords[i]?.Sales ?? 0,
          target:   0, // replace when target API is ready
        }));

        setMonthlySalesData(merged);
      } catch (err: any) {
        console.error("Error fetching sales/collection data:", err);
        setSalesCollectionError(err.message || "Failed to load sales data.");
      } finally {
        setSalesCollectionLoading(false);
      }
    };
    fetchSalesCollection();
  }, []);

  // ── Formatters ────────────────────────────────────────────────────────────

  const formatNumber = (num: number) => new Intl.NumberFormat("en-US").format(num);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  const formatCompact = (n: number) =>
    new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);

  const formatInteger = (n: number) =>
    new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);

  const formatKW = (n: number) => `${formatCompact(n)} kW`;

  // ── Derived values ────────────────────────────────────────────────────────

  const totalOrdinarySales = monthlySalesData.reduce((sum, d) => sum + d.ordinary, 0);
  const totalBulkSales     = monthlySalesData.reduce((sum, d) => sum + d.bulk, 0);

  const totalNewCustomers  = monthlyNewCustomers.reduce((sum, d) => sum + d.ordinary + d.bulk, 0);
  const totalNewOrdinary   = monthlyNewCustomers.reduce((sum, d) => sum + d.ordinary, 0);
  const totalNewBulk       = monthlyNewCustomers.reduce((sum, d) => sum + d.bulk, 0);
  const newOrdinaryPercentage = (totalNewOrdinary / totalNewCustomers) * 100;
  const newBulkPercentage     = (totalNewBulk     / totalNewCustomers) * 100;

  const salesLineData = monthlySalesData.map((item) => ({
    month:    item.month,
    ordinary: item.ordinary,
    bulk:     item.bulk,
    total:    item.ordinary + item.bulk,
  }));

  // Solar totals & percentages
  const totalOrdinarySolar =
    customerCounts.solar.netMetering +
    customerCounts.solar.netAccounting +
    customerCounts.solar.netPlus +
    customerCounts.solar.netPlusPlus;

  const totalBulkSolar =
    bulkSolarCustomers.netMetering +
    bulkSolarCustomers.netAccounting +
    bulkSolarCustomers.netPlus +
    bulkSolarCustomers.netPlusPlus;

  const pct = (n: number, total: number) => (total > 0 ? (n / total) * 100 : 0);

  const ordSolarNetMeteringPct    = pct(customerCounts.solar.netMetering,   totalOrdinarySolar);
  const ordSolarNetAccountingPct  = pct(customerCounts.solar.netAccounting, totalOrdinarySolar);
  const ordSolarNetPlusPct        = pct(customerCounts.solar.netPlus,       totalOrdinarySolar);
  const ordSolarNetPlusPlusPct    = pct(customerCounts.solar.netPlusPlus,   totalOrdinarySolar);

  const bulkSolarNetMeteringPct   = pct(bulkSolarCustomers.netMetering,   totalBulkSolar);
  const bulkSolarNetAccountingPct = pct(bulkSolarCustomers.netAccounting, totalBulkSolar);
  const bulkSolarNetPlusPct       = pct(bulkSolarCustomers.netPlus,       totalBulkSolar);
  const bulkSolarNetPlusPlusPct   = pct(bulkSolarCustomers.netPlusPlus,   totalBulkSolar);

  const C = 502.4; // SVG circumference for r=80

  const createArcDasharray = (startPct: number, endPct: number) => {
    const arc = ((endPct - startPct) / 100) * C;
    return `${arc} ${C - arc}`;
  };

  const solarCapacityChartData = [
    { netType: "Net Metering",   capacity: solarCapacity.netMetering.capacity,   count: solarCapacity.netMetering.count   },
    { netType: "Net Accounting", capacity: solarCapacity.netAccounting.capacity, count: solarCapacity.netAccounting.count },
    { netType: "Net Plus",       capacity: solarCapacity.netPlus.capacity,       count: solarCapacity.netPlus.count       },
    { netType: "Net Plus Plus",  capacity: solarCapacity.netPlusPlus.capacity,   count: solarCapacity.netPlusPlus.count   },
  ];

  const solarCustomerSplitChartData = [
    { netType: "Net Metering",   ordinary: customerCounts.solar.netMetering,   bulk: bulkSolarCustomers.netMetering   },
    { netType: "Net Accounting", ordinary: customerCounts.solar.netAccounting, bulk: bulkSolarCustomers.netAccounting },
    { netType: "Net Plus",       ordinary: customerCounts.solar.netPlus,       bulk: bulkSolarCustomers.netPlus       },
    { netType: "Net Plus Plus",  ordinary: customerCounts.solar.netPlusPlus,   bulk: bulkSolarCustomers.netPlusPlus   },
  ];

  const additionalCardIds = [
    "revenueCollection", "disconnections", "arrearsPosition",
    "solarCapacity", "consumptionAnalysis", "billCycleStatus", "newConnections",
  ];
  const hasAdditionalCards = additionalCardIds.some((id) => visibleCards.includes(id));

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Dashboard Selector Sidebar */}
        <DashboardSelector
          activeDashboard={activeDashboard}
          onSelectDashboard={setActiveDashboard}
        />

        {/* Main Content */}
        <div className="flex-1">

          {/* ═══════════════════════════════════════════════════════════════════
              DEFAULT DASHBOARD
          ═══════════════════════════════════════════════════════════════════ */}
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

                      <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ceb-maroon)]"
                      >
                        <option>2024</option>
                        <option>2023</option>
                        <option>2022</option>
                      </select>

                      <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ceb-maroon)]"
                      >
                        <option>All Months</option>
                        <option>January</option>
                        <option>February</option>
                        <option>March</option>
                        <option>April</option>
                        <option>May</option>
                        <option>June</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="max-w-7xl mx-auto px-4 py-6">

                {/* ── KPI Cards ─────────────────────────────────────────────── */}
                <div className={`transition-all duration-1000 delay-200 ${isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>

                  {/* Default 4 cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-4">

                    {visibleCards.includes("totalCustomers") && (
                      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                          <div className="p-2 bg-blue-100 rounded-lg"><Users className="w-5 h-5 text-blue-600" /></div>
                          <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">+5.2%</span>
                        </div>
                        <h3 className="text-sm font-medium text-gray-500">Total Customers</h3>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                          {formatNumber(customerCounts.ordinary + customerCounts.bulk)}
                        </p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                          <span>Ordinary: {formatNumber(customerCounts.ordinary)}</span>
                          <span>Bulk: {formatNumber(customerCounts.bulk)}</span>
                        </div>
                      </div>
                    )}

                    {visibleCards.includes("solarCustomers") && (
                      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                          <div className="p-2 bg-yellow-100 rounded-lg"><Sun className="w-5 h-5 text-yellow-600" /></div>
                          <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">+12.3%</span>
                        </div>
                        <h3 className="text-sm font-medium text-gray-500">Solar Customers</h3>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                          {formatNumber(totalOrdinarySolar)}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">Net-type breakdown shown in chart</p>
                      </div>
                    )}

                    {visibleCards.includes("zeroConsumption") && (
                      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                          <div className="p-2 bg-red-100 rounded-lg"><Zap className="w-5 h-5 text-red-600" /></div>
                          <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">-2.1%</span>
                        </div>
                        <h3 className="text-sm font-medium text-gray-500">Zero Consumption</h3>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                          {formatNumber(customerCounts.zeroConsumption)}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">Last 3 months</p>
                      </div>
                    )}

                    {visibleCards.includes("kioskCollection") && (
                      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                          <div className="p-2 bg-green-100 rounded-lg"><DollarSign className="w-5 h-5 text-green-600" /></div>
                          <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">+8.7%</span>
                        </div>
                        <h3 className="text-sm font-medium text-gray-500">Kiosk Collection</h3>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                          {formatCurrency(salesData.kioskCollection)}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">This month</p>
                      </div>
                    )}
                  </div>

                  {/* Additional cards row */}
                  {hasAdditionalCards && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-4">

                      {visibleCards.includes("revenueCollection") && (
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                          <div className="flex items-center justify-between mb-2">
                            <div className="p-2 bg-emerald-100 rounded-lg"><ShoppingCart className="w-5 h-5 text-emerald-600" /></div>
                            <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">+6.8%</span>
                          </div>
                          <h3 className="text-sm font-medium text-gray-500">Revenue Collection</h3>
                          <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(125600000)}</p>
                          <p className="text-xs text-gray-500 mt-2">Year to date</p>
                        </div>
                      )}

                      {visibleCards.includes("disconnections") && (
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                          <div className="flex items-center justify-between mb-2">
                            <div className="p-2 bg-orange-100 rounded-lg"><AlertCircle className="w-5 h-5 text-orange-600" /></div>
                            <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">+15.2%</span>
                          </div>
                          <h3 className="text-sm font-medium text-gray-500">Disconnections</h3>
                          <p className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(2456)}</p>
                          <p className="text-xs text-gray-500 mt-2">Pending action</p>
                        </div>
                      )}

                      {visibleCards.includes("arrearsPosition") && (
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                          <div className="flex items-center justify-between mb-2">
                            <div className="p-2 bg-rose-100 rounded-lg"><TrendingDown className="w-5 h-5 text-rose-600" /></div>
                            <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">-3.4%</span>
                          </div>
                          <h3 className="text-sm font-medium text-gray-500">Arrears Position</h3>
                          <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(456780000)}</p>
                          <p className="text-xs text-gray-500 mt-2">Total outstanding</p>
                        </div>
                      )}

                      {visibleCards.includes("solarCapacity") && (
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                          <div className="flex items-center justify-between mb-2">
                            <div className="p-2 bg-amber-100 rounded-lg"><Battery className="w-5 h-5 text-amber-600" /></div>
                            <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">+9.5%</span>
                          </div>
                          <h3 className="text-sm font-medium text-gray-500">Solar Capacity</h3>
                          <p className="text-2xl font-bold text-gray-900 mt-1">{formatCompact(4814)} kW</p>
                          <p className="text-xs text-gray-500 mt-2">Total installed</p>
                        </div>
                      )}

                      {visibleCards.includes("consumptionAnalysis") && (
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                          <div className="flex items-center justify-between mb-2">
                            <div className="p-2 bg-violet-100 rounded-lg"><Plug className="w-5 h-5 text-violet-600" /></div>
                            <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">+2.3%</span>
                          </div>
                          <h3 className="text-sm font-medium text-gray-500">Consumption (kWh)</h3>
                          <p className="text-2xl font-bold text-gray-900 mt-1">{formatCompact(3579000)}</p>
                          <p className="text-xs text-gray-500 mt-2">Monthly average</p>
                        </div>
                      )}

                      {visibleCards.includes("billCycleStatus") && (
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                          <div className="flex items-center justify-between mb-2">
                            <div className="p-2 bg-cyan-100 rounded-lg"><Clock className="w-5 h-5 text-cyan-600" /></div>
                            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">Active</span>
                          </div>
                          <h3 className="text-sm font-medium text-gray-500">Bill Cycle Status</h3>
                          <p className="text-2xl font-bold text-gray-900 mt-1">{activeBillCycle || "Cycle 450"}</p>
                          <p className="text-xs text-gray-500 mt-2">Current cycle</p>
                        </div>
                      )}

                      {visibleCards.includes("newConnections") && (
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                          <div className="flex items-center justify-between mb-2">
                            <div className="p-2 bg-lime-100 rounded-lg"><Plus className="w-5 h-5 text-lime-600" /></div>
                            <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">+11.3%</span>
                          </div>
                          <h3 className="text-sm font-medium text-gray-500">New Connections</h3>
                          <p className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(1428)}</p>
                          <p className="text-xs text-gray-500 mt-2">Year to date</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Customize button */}
                  <div className="flex justify-end mb-6">
                    <button
                      onClick={() => setShowMoreCards(!showMoreCards)}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      {showMoreCards ? (
                        <><EyeOff className="w-4 h-4" /> Hide Cards</>
                      ) : (
                        <><Eye className="w-4 h-4" /> Show More Cards</>
                      )}
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
                          <div
                            key={card.id}
                            onClick={() => toggleCardVisibility(card.id)}
                            className={`p-4 rounded-lg cursor-pointer transition-all border-2 ${
                              visibleCards.includes(card.id)
                                ? "bg-white border-blue-500 shadow-md"
                                : "bg-white border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900 text-sm">{card.title}</p>
                                <p className="text-xs text-gray-500 mt-1 capitalize">{card.category}</p>
                              </div>
                              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                                visibleCards.includes(card.id) ? "bg-blue-500 border-blue-500" : "border-gray-300"
                              }`}>
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

                  {/* Sales & Collection Line Chart */}
                  <div className={`transition-all duration-1000 delay-300 ${isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-full flex flex-col">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h3 className="font-semibold text-gray-900">Sales & Collection Distribution</h3>
                          <p className="text-sm text-gray-500 mt-1">Monthly Sales Trend by Customer Type</p>
                        </div>
                        <PieChart className="w-5 h-5 text-gray-400" />
                      </div>

                      <div className="h-64 mb-6 flex-1">
                        {salesCollectionLoading ? (
                          <div className="h-full flex items-center justify-center text-gray-400 text-sm">Loading...</div>
                        ) : salesCollectionError ? (
                          <div className="h-full flex items-center justify-center text-red-400 text-sm">{salesCollectionError}</div>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={salesLineData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatCompact(v)} />
                              <Tooltip
                                formatter={(value: any) => formatCurrency(Number(value))}
                                labelStyle={{ fontWeight: 600 }}
                              />
                              <Legend />
                              <Line type="monotone" dataKey="ordinary" name="Ordinary" stroke="var(--ceb-maroon)" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: "var(--ceb-maroon)" }} />
                              <Line type="monotone" dataKey="bulk"     name="Bulk"     stroke="var(--ceb-gold)"   strokeWidth={3} dot={false} activeDot={{ r: 6, fill: "var(--ceb-gold)"   }} />
                            </LineChart>
                          </ResponsiveContainer>
                        )}
                      </div>

                      <div className="mt-auto pt-4 border-t border-gray-100">
                        <p className="text-xs text-gray-500 mb-2">Monthly Average</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-gray-500">Ordinary</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {formatCurrency(totalOrdinarySales / (monthlySalesData.length || 12))} / month
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Bulk</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {formatCurrency(totalBulkSales / (monthlySalesData.length || 12))} / month
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* New Customers Pie Chart */}
                  <div className={`transition-all duration-1000 delay-400 ${isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-full flex flex-col">
                      <style>{`
                        @keyframes pieChartLoadOrdinary {
                          0%   { stroke-dasharray: 0 ${C}; stroke-dashoffset: 0; }
                          100% { stroke-dasharray: ${(newOrdinaryPercentage / 100) * C} ${C}; stroke-dashoffset: 0; }
                        }
                        @keyframes pieChartLoadBulk {
                          0%   { stroke-dasharray: 0 ${C}; stroke-dashoffset: ${-((newOrdinaryPercentage / 100) * C)}; }
                          100% { stroke-dasharray: ${(newBulkPercentage / 100) * C} ${C}; stroke-dashoffset: ${-((newOrdinaryPercentage / 100) * C)}; }
                        }
                        .pie-segment-ordinary { animation: pieChartLoadOrdinary 0.9s ease-out forwards; animation-delay: 0.3s; }
                        .pie-segment-bulk     { animation: pieChartLoadBulk     0.9s ease-out forwards; animation-delay: 1.2s; }
                      `}</style>

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
                              className="pie-segment-ordinary"
                              onMouseEnter={() => setActivePieChart("newOrdinary")}
                              onMouseLeave={() => setActivePieChart(null)}
                            />
                            <circle cx="100" cy="100" r="80" fill="none" stroke="var(--ceb-gold)" strokeWidth="30"
                              strokeDasharray={`0 ${C}`} strokeDashoffset={-((newOrdinaryPercentage / 100) * C)}
                              className="pie-segment-bulk"
                              onMouseEnter={() => setActivePieChart("newBulk")}
                              onMouseLeave={() => setActivePieChart(null)}
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                              <p className="text-2xl font-bold text-gray-900">{formatNumber(totalNewCustomers)}</p>
                              <p className="text-xs text-gray-500">Total New</p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div
                            className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${activePieChart === "newOrdinary" ? "bg-[color:var(--ceb-maroon)]/5" : ""}`}
                            onMouseEnter={() => setActivePieChart("newOrdinary")}
                            onMouseLeave={() => setActivePieChart(null)}
                          >
                            <div className="w-4 h-4 bg-[color:var(--ceb-maroon)] rounded-full" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">New Ordinary</p>
                              <p className="text-xs text-gray-500">{formatNumber(totalNewOrdinary)} ({newOrdinaryPercentage.toFixed(1)}%)</p>
                            </div>
                          </div>
                          <div
                            className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${activePieChart === "newBulk" ? "bg-[color:var(--ceb-gold)]/15" : ""}`}
                            onMouseEnter={() => setActivePieChart("newBulk")}
                            onMouseLeave={() => setActivePieChart(null)}
                          >
                            <div className="w-4 h-4 bg-[color:var(--ceb-gold)] rounded-full" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">New Bulk</p>
                              <p className="text-xs text-gray-500">{formatNumber(totalNewBulk)} ({newBulkPercentage.toFixed(1)}%)</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-auto pt-4 border-t border-gray-100">
                        <p className="text-xs text-gray-500 mb-2">Monthly Average New Customers</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-gray-500">Ordinary</p>
                            <p className="text-sm font-semibold text-gray-900">{Math.round(totalNewOrdinary / 6)} / month</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Bulk</p>
                            <p className="text-sm font-semibold text-gray-900">{Math.round(totalNewBulk / 6)} / month</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-center gap-4 text-xs">
                        <span className="flex items-center gap-1 text-green-600"><ArrowUp className="w-3 h-3" />+12% vs last year</span>
                        <span className="text-gray-300">|</span>
                        <span className="text-gray-500">Target: 500/month</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Bottom 3-col grid ────────────────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                  {/* Left: Top Customers + Solar Capacity bar chart */}
                  <div className={`lg:col-span-1 space-y-6 transition-all duration-1000 delay-500 ${isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-900">Top Customers</h3>
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
                          <p className="text-xs text-gray-500 mt-1">Capacity (kW) and account count by net type</p>
                        </div>
                        <span className="text-[color:var(--ceb-navy)] text-xs font-semibold tracking-wide">GRAPH</span>
                      </div>
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={solarCapacityChartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
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
                            <Bar yAxisId="kw"    dataKey="capacity" name="Capacity (kW)" fill="var(--ceb-maroon)" radius={[6,6,0,0]}>
                              <LabelList dataKey="capacity" position="top" formatter={(v: any) => formatCompact(Number(v) || 0)} />
                            </Bar>
                            <Bar yAxisId="count" dataKey="count"    name="Accounts"      fill="var(--ceb-gold)"   radius={[6,6,0,0]}>
                              <LabelList dataKey="count"    position="top" formatter={(v: any) => formatCompact(Number(v) || 0)} />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* Centre: Target vs Region + Solar pie charts */}
                  <div className={`lg:col-span-1 space-y-6 transition-all duration-1000 delay-600 ${isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-900">Target vs Actual by Region</h3>
                        <Target className="w-4 h-4 text-gray-400" />
                      </div>
                      <div className="space-y-4">
                        {["West", "Central", "East", "South", "North"].map((region, index) => (
                          <div key={region}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-600">{region}</span>
                              <span className="font-medium">
                                <span className="text-green-600">{85 - index * 5}%</span>
                                <span className="text-gray-400 mx-1">/</span>
                                <span className="text-gray-500">100%</span>
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  index === 0 ? "bg-blue-600"   :
                                  index === 1 ? "bg-green-600"  :
                                  index === 2 ? "bg-yellow-600" :
                                  index === 3 ? "bg-orange-600" : "bg-purple-600"
                                }`}
                                style={{ width: `${85 - index * 5}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Solar customers — dual pie charts */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                      <style>{`
                        @keyframes solarOrdNetMeteringLoad    { 0% { stroke-dasharray: 0 ${C}; stroke-dashoffset: 0; } 100% { stroke-dasharray: ${createArcDasharray(0, ordSolarNetMeteringPct).split(" ")[0]} ${C}; stroke-dashoffset: 0; } }
                        @keyframes solarOrdNetAccountingLoad  { 0% { stroke-dasharray: 0 ${C}; stroke-dashoffset: ${-((ordSolarNetMeteringPct / 100) * C)}; } 100% { stroke-dasharray: ${createArcDasharray(ordSolarNetMeteringPct, ordSolarNetMeteringPct + ordSolarNetAccountingPct).split(" ")[0]} ${C}; stroke-dashoffset: ${-((ordSolarNetMeteringPct / 100) * C)}; } }
                        @keyframes solarOrdNetPlusLoad        { 0% { stroke-dasharray: 0 ${C}; stroke-dashoffset: ${-(((ordSolarNetMeteringPct + ordSolarNetAccountingPct) / 100) * C)}; } 100% { stroke-dasharray: ${createArcDasharray(ordSolarNetMeteringPct + ordSolarNetAccountingPct, ordSolarNetMeteringPct + ordSolarNetAccountingPct + ordSolarNetPlusPct).split(" ")[0]} ${C}; stroke-dashoffset: ${-(((ordSolarNetMeteringPct + ordSolarNetAccountingPct) / 100) * C)}; } }
                        @keyframes solarOrdNetPlusPlusLoad    { 0% { stroke-dasharray: 0 ${C}; stroke-dashoffset: ${-(((ordSolarNetMeteringPct + ordSolarNetAccountingPct + ordSolarNetPlusPct) / 100) * C)}; } 100% { stroke-dasharray: ${createArcDasharray(ordSolarNetMeteringPct + ordSolarNetAccountingPct + ordSolarNetPlusPct, 100).split(" ")[0]} ${C}; stroke-dashoffset: ${-(((ordSolarNetMeteringPct + ordSolarNetAccountingPct + ordSolarNetPlusPct) / 100) * C)}; } }
                        @keyframes solarBulkNetMeteringLoad   { 0% { stroke-dasharray: 0 ${C}; stroke-dashoffset: 0; } 100% { stroke-dasharray: ${createArcDasharray(0, bulkSolarNetMeteringPct).split(" ")[0]} ${C}; stroke-dashoffset: 0; } }
                        @keyframes solarBulkNetAccountingLoad { 0% { stroke-dasharray: 0 ${C}; stroke-dashoffset: ${-((bulkSolarNetMeteringPct / 100) * C)}; } 100% { stroke-dasharray: ${createArcDasharray(bulkSolarNetMeteringPct, bulkSolarNetMeteringPct + bulkSolarNetAccountingPct).split(" ")[0]} ${C}; stroke-dashoffset: ${-((bulkSolarNetMeteringPct / 100) * C)}; } }
                        @keyframes solarBulkNetPlusLoad       { 0% { stroke-dasharray: 0 ${C}; stroke-dashoffset: ${-(((bulkSolarNetMeteringPct + bulkSolarNetAccountingPct) / 100) * C)}; } 100% { stroke-dasharray: ${createArcDasharray(bulkSolarNetMeteringPct + bulkSolarNetAccountingPct, bulkSolarNetMeteringPct + bulkSolarNetAccountingPct + bulkSolarNetPlusPct).split(" ")[0]} ${C}; stroke-dashoffset: ${-(((bulkSolarNetMeteringPct + bulkSolarNetAccountingPct) / 100) * C)}; } }
                        @keyframes solarBulkNetPlusPlusLoad   { 0% { stroke-dasharray: 0 ${C}; stroke-dashoffset: ${-(((bulkSolarNetMeteringPct + bulkSolarNetAccountingPct + bulkSolarNetPlusPct) / 100) * C)}; } 100% { stroke-dasharray: ${createArcDasharray(bulkSolarNetMeteringPct + bulkSolarNetAccountingPct + bulkSolarNetPlusPct, 100).split(" ")[0]} ${C}; stroke-dashoffset: ${-(((bulkSolarNetMeteringPct + bulkSolarNetAccountingPct + bulkSolarNetPlusPct) / 100) * C)}; } }
                        .solar-ord-metering   { animation: solarOrdNetMeteringLoad    0.9s ease-out forwards; animation-delay: 0.3s; }
                        .solar-ord-accounting { animation: solarOrdNetAccountingLoad  0.9s ease-out forwards; animation-delay: 1.2s; }
                        .solar-ord-plus       { animation: solarOrdNetPlusLoad        0.9s ease-out forwards; animation-delay: 2.1s; }
                        .solar-ord-plusplus   { animation: solarOrdNetPlusPlusLoad    0.9s ease-out forwards; animation-delay: 3.0s; }
                        .solar-bulk-metering  { animation: solarBulkNetMeteringLoad   0.9s ease-out forwards; animation-delay: 0.3s; }
                        .solar-bulk-accounting{ animation: solarBulkNetAccountingLoad 0.9s ease-out forwards; animation-delay: 1.2s; }
                        .solar-bulk-plus      { animation: solarBulkNetPlusLoad       0.9s ease-out forwards; animation-delay: 2.1s; }
                        .solar-bulk-plusplus  { animation: solarBulkNetPlusPlusLoad   0.9s ease-out forwards; animation-delay: 3.0s; }
                      `}</style>

                      <div className="flex items-center justify-between mb-6">
                        <h3 className="font-semibold text-gray-900">Solar Customers by Net Type</h3>
                        <span className="text-[color:var(--ceb-navy)] text-xs font-semibold tracking-wide">GRAPH</span>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        {/* Ordinary Solar */}
                        {[
                          { label: "Ordinary Solar", prefix: "ordinary", total: totalOrdinarySolar, counts: customerCounts.solar, pcts: [ordSolarNetMeteringPct, ordSolarNetAccountingPct, ordSolarNetPlusPct, ordSolarNetPlusPlusPct], classes: ["solar-ord-metering", "solar-ord-accounting", "solar-ord-plus", "solar-ord-plusplus"], keys: ["ordinaryNetMetering","ordinaryNetAccounting","ordinaryNetPlus","ordinaryNetPlusPlus"] },
                          { label: "Bulk Solar",     prefix: "bulk",     total: totalBulkSolar,     counts: bulkSolarCustomers,   pcts: [bulkSolarNetMeteringPct, bulkSolarNetAccountingPct, bulkSolarNetPlusPct, bulkSolarNetPlusPlusPct], classes: ["solar-bulk-metering","solar-bulk-accounting","solar-bulk-plus","solar-bulk-plusplus"], keys: ["bulkNetMetering","bulkNetAccounting","bulkNetPlus","bulkNetPlusPlus"] },
                        ].map(({ label, total, counts, pcts, classes, keys }) => {
                          const colors = ["var(--ceb-maroon)", "#A0673A", "var(--ceb-gold)", "#C9934E"];
                          const netLabels = ["Net Metering", "Net Accounting", "Net Plus", "Net Plus Plus"];
                          const countValues = [counts.netMetering, counts.netAccounting, counts.netPlus, counts.netPlusPlus];
                          let offset = 0;

                          return (
                            <div key={label} className="flex flex-col items-center">
                              <h4 className="text-sm font-medium text-gray-900 mb-4">{label}</h4>
                              <div className="relative w-40 h-40">
                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                                  <circle cx="100" cy="100" r="80" fill="none" stroke="#f3f4f6" strokeWidth="30" />
                                  {classes.map((cls, i) => {
                                    const el = (
                                      <circle key={i} cx="100" cy="100" r="80" fill="none"
                                        stroke={colors[i]} strokeWidth="30"
                                        strokeDasharray={`0 ${C}`}
                                        strokeDashoffset={i === 0 ? 0 : -((offset / 100) * C)}
                                        className={`${cls} transition-all duration-300 cursor-pointer hover:opacity-80`}
                                        onMouseEnter={() => setActiveSolarPieChart(keys[i])}
                                        onMouseLeave={() => setActiveSolarPieChart(null)}
                                      />
                                    );
                                    offset += pcts[i];
                                    return el;
                                  })}
                                </svg>

                                {activeSolarPieChart && keys.includes(activeSolarPieChart) ? (
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="bg-gray-900 text-white px-3 py-2 rounded-lg text-center shadow-lg">
                                      <p className="text-xs font-semibold">{netLabels[keys.indexOf(activeSolarPieChart)]}</p>
                                      <p className="text-sm font-bold mt-1">{formatNumber(countValues[keys.indexOf(activeSolarPieChart)])}</p>
                                      <p className="text-xs text-gray-300 mt-0.5">{pcts[keys.indexOf(activeSolarPieChart)].toFixed(1)}%</p>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="text-center">
                                      <p className="text-xl font-bold text-gray-900">{formatNumber(total)}</p>
                                      <p className="text-xs text-gray-500">Total</p>
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="space-y-2 w-full text-sm mt-4">
                                {netLabels.map((nl, i) => (
                                  <div
                                    key={nl}
                                    className={`flex items-center gap-2 p-1 rounded transition-colors ${activeSolarPieChart === keys[i] ? `bg-[${colors[i]}]/10` : ""}`}
                                    onMouseEnter={() => setActiveSolarPieChart(keys[i])}
                                    onMouseLeave={() => setActiveSolarPieChart(null)}
                                  >
                                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: colors[i] }} />
                                    <span className="text-gray-700">{countValues[i]} ({pcts[i].toFixed(1)}%)</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Right: Segments + Quick Actions + Profit */}
                  <div className={`lg:col-span-1 space-y-6 transition-all duration-1000 delay-700 ${isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                      <h3 className="font-semibold text-gray-900 mb-3">Customer Segments</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Ordinary</span>
                          <span className="font-medium">
                            {customerCountsLoading ? "Loading..." : customerCountsError ? "Error" : formatNumber(customerCounts.ordinary)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Bulk</span>
                          <span className="font-medium">{formatNumber(customerCounts.bulk)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Solar</span>
                          <span className="font-medium">{formatNumber(totalOrdinarySolar)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                      <h3 className="font-semibold text-gray-900 mb-3">Quick Actions</h3>
                      <div className="space-y-2">
                        <button className="w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">Generate Monthly Report</button>
                        <button className="w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">Export Dashboard Data</button>
                        <button className="w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">View Solar Capacity Graph</button>
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
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              OTHER DASHBOARDS (unchanged from File 2)
          ═══════════════════════════════════════════════════════════════════ */}

          {activeDashboard === "analytics" && (
            <div className="p-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-6">Analytics Dashboard</h1>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { icon: <TrendingUp className="w-5 h-5 text-purple-600" />, bg: "bg-purple-100", label: "Traffic",     value: "124,567", badge: "+15.3%" },
                  { icon: <BarChart3  className="w-5 h-5 text-blue-600"   />, bg: "bg-blue-100",   label: "Conversions", value: "8,945",   badge: "+8.2%"  },
                  { icon: <DollarSign className="w-5 h-5 text-green-600"  />, bg: "bg-green-100",  label: "Revenue",     value: "LKR 2.5M",badge: "+22.1%" },
                ].map(({ icon, bg, label, value, badge }) => (
                  <div key={label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-2">
                      <div className={`p-2 ${bg} rounded-lg`}>{icon}</div>
                      <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">{badge}</span>
                    </div>
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
                  { icon: <Users    className="w-5 h-5 text-orange-600" />, bg: "bg-orange-100", label: "Total Leads",      value: "3,456", badge: "+12.5%" },
                  { icon: <Target   className="w-5 h-5 text-blue-600"   />, bg: "bg-blue-100",   label: "Conversion Rate",  value: "28.5%", badge: "+5.8%"  },
                  { icon: <Briefcase className="w-5 h-5 text-green-600" />, bg: "bg-green-100",  label: "Deals Closed",     value: "245",   badge: "+18.3%" },
                ].map(({ icon, bg, label, value, badge }) => (
                  <div key={label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-2">
                      <div className={`p-2 ${bg} rounded-lg`}>{icon}</div>
                      <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">{badge}</span>
                    </div>
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
                  { icon: <ShoppingCart className="w-5 h-5 text-blue-600"   />, bg: "bg-blue-100",   label: "Orders",         value: "2,845",      badge: "+9.2%",  badgeColor: "text-green-600 bg-green-50" },
                  { icon: <DollarSign   className="w-5 h-5 text-green-600"  />, bg: "bg-green-100",  label: "Revenue",        value: "LKR 8.2M",   badge: "+14.7%", badgeColor: "text-green-600 bg-green-50" },
                  { icon: <Target       className="w-5 h-5 text-yellow-600" />, bg: "bg-yellow-100", label: "Avg Order Value", value: "LKR 2,885",  badge: "-2.3%",  badgeColor: "text-red-600 bg-red-50"     },
                  { icon: <TrendingUp   className="w-5 h-5 text-purple-600" />, bg: "bg-purple-100", label: "Cart Recovery",  value: "42.3%",      badge: "+11.5%", badgeColor: "text-green-600 bg-green-50" },
                ].map(({ icon, bg, label, value, badge, badgeColor }) => (
                  <div key={label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-2">
                      <div className={`p-2 ${bg} rounded-lg`}>{icon}</div>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${badgeColor}`}>{badge}</span>
                    </div>
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
                  { icon: <Users      className="w-5 h-5 text-blue-600"   />, bg: "bg-blue-100",   label: "Active Students", value: "1,234"  },
                  { icon: <FileText   className="w-5 h-5 text-purple-600" />, bg: "bg-purple-100", label: "Courses",         value: "47"     },
                  { icon: <TrendingUp className="w-5 h-5 text-green-600"  />, bg: "bg-green-100",  label: "Completion Rate", value: "73.4%"  },
                ].map(({ icon, bg, label, value }) => (
                  <div key={label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-2">
                      <div className={`p-2 ${bg} rounded-lg`}>{icon}</div>
                      <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">New</span>
                    </div>
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
                  { icon: <Briefcase className="w-5 h-5 text-blue-600"   />, bg: "bg-blue-100",   label: "Active Projects",  value: "12",  badge: "+7.2%" },
                  { icon: <Target    className="w-5 h-5 text-orange-600" />, bg: "bg-orange-100", label: "Tasks Completed",  value: "342", badge: "+5.1%" },
                  { icon: <Users     className="w-5 h-5 text-green-600"  />, bg: "bg-green-100",  label: "Team Members",     value: "28",  badge: "+3.5%" },
                ].map(({ icon, bg, label, value, badge }) => (
                  <div key={label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-2">
                      <div className={`p-2 ${bg} rounded-lg`}>{icon}</div>
                      <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">{badge}</span>
                    </div>
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
                ].map(({ icon, bg, label, value, badge }) => (
                  <div key={label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-2">
                      <div className={`p-2 ${bg} rounded-lg`}>{icon}</div>
                      <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">{badge}</span>
                    </div>
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
                  { icon: <HeadsetIcon className="w-5 h-5 text-red-600"    />, bg: "bg-red-100",    label: "Open Tickets",         value: "127"   },
                  { icon: <Clock       className="w-5 h-5 text-blue-600"   />, bg: "bg-blue-100",   label: "Avg Response Time",    value: "2.4h"  },
                  { icon: <TrendingUp  className="w-5 h-5 text-green-600"  />, bg: "bg-green-100",  label: "Resolution Rate",      value: "87.5%" },
                  { icon: <Users       className="w-5 h-5 text-yellow-600" />, bg: "bg-yellow-100", label: "Customer Satisfaction", value: "4.7/5" },
                ].map(({ icon, bg, label, value }) => (
                  <div key={label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-2">
                      <div className={`p-2 ${bg} rounded-lg`}>{icon}</div>
                      <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">New</span>
                    </div>
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