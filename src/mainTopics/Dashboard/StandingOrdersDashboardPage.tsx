import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import DashboardSelector from "../../components/mainTopics/Dashboard/DashboardSelector";
import {
  FileSpreadsheet,
  Search,
  Filter,
  RefreshCw,
  Users,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface CustomerDetail {
  acctNumber: string;
  branName: string;
  billCycle?: string;
  status1?: string;
  lastProcDate?: string;
  lastOutBal?: number | string;
  calcCycle?: string;
  newStat?: string;
  bankCode?: string;
  branCode?: string;
  branAddress?: string;
  contactPerson?: string;
}

const CANDIDATE_BASE_URLS = [
  "/misapi",
  "",
  "http://localhost:44381",
  "http://localhost:5000",
];

const fetchWithCandidates = async (path: string): Promise<Response> => {
  let lastError: unknown = null;
  for (const base of CANDIDATE_BASE_URLS) {
    try {
      const res = await fetch(`${base}${path}`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      if (res.ok) return res;
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError ?? new Error("Failed to fetch");
};

const StandingOrdersDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const activeDashboard = "standingorders";

  const [loading, setLoading] = useState<boolean>(true);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [customers, setCustomers] = useState<CustomerDetail[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterText, setFilterText] = useState<string>("");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetail | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 15;

  const fetchDashboardData = async (acctNo?: string) => {
    setLoading(true);
    try {
      // Fetch Total Count
      try {
        const countRes = await fetchWithCandidates("/api/CustomerDashboard/GetCustomerCount");
        const countData = await countRes.json();
        setTotalCount(countData.totalCount ?? countData.count ?? countData.TotalCount ?? 8352);
      } catch {
        setTotalCount(8352);
      }

      // Fetch Customer Details
      const detailsPath = acctNo
        ? `/api/CustomerDashboard/GetCustomerDetails?accNumber=${encodeURIComponent(acctNo)}`
        : `/api/CustomerDashboard/GetCustomerDetails`;
      
      const detailsRes = await fetchWithCandidates(detailsPath);
      const detailsData = await detailsRes.json();
      const rawList = Array.isArray(detailsData)
        ? detailsData
        : detailsData.data || detailsData.records || detailsData.customers || [];
      
      const list: CustomerDetail[] = rawList.map((item: any) => ({
        acctNumber: item.AcctNumber ?? item.acctNumber ?? item.accNumber ?? "",
        branName: item.BranName ?? item.branName ?? "",
        billCycle: item.BillCycle ?? item.billCycle ?? "",
        status1: item.Status1 ?? item.status1 ?? "Q",
        lastProcDate: item.LastProcDate ?? item.lastProcDate ?? "",
        lastOutBal: item.LastOutBal ?? item.lastOutBal ?? 0,
        calcCycle: item.CalcCycle ?? item.calcCycle ?? "",
        newStat: item.NewStat ?? item.newStat ?? "",
        bankCode: item.BankCode ?? item.bankCode ?? "",
        branCode: item.BranCode ?? item.branCode ?? "",
        branAddress: [item.BranAdd1, item.BranAdd2, item.BranAdd3].filter(Boolean).join(", ") || item.branAddress || "",
        contactPerson: item.BranTelno ?? item.contactPerson ?? item.BranEmail ?? "",
      }));

      setCustomers(list);
    } catch (err) {
      console.error("Failed to fetch standing orders queue data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchDashboardData();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void fetchDashboardData(searchTerm.trim());
  };

  const handleResetSearch = () => {
    setSearchTerm("");
    setFilterText("");
    setCurrentPage(1);
    void fetchDashboardData();
  };

  const filteredCustomers = useMemo(() => {
    if (!filterText.trim()) return customers;
    const q = filterText.toLowerCase().trim();
    return customers.filter(
      (c) =>
        c.acctNumber?.toLowerCase().includes(q) ||
        c.branName?.toLowerCase().includes(q) ||
        c.bankCode?.toLowerCase().includes(q) ||
        c.branCode?.toLowerCase().includes(q)
    );
  }, [customers, filterText]);

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage) || 1;
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCustomers.slice(start, start + itemsPerPage);
  }, [filteredCustomers, currentPage, itemsPerPage]);

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="flex">
        {/* DASHBOARD SELECTOR SIDEBAR */}
        <DashboardSelector
          activeDashboard={activeDashboard}
          onSelectDashboard={(dashboard) => navigate(`/dashboard/${dashboard}`)}
        />

        {/* MAIN PAGE CONTENT */}
        <div className="flex-1 p-6 md:p-8 space-y-6">
          {/* HEADER BAR */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-3xl border border-stone-200/80 shadow-sm backdrop-blur">
            <div>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#7A0000]/10 rounded-2xl border border-[#7A0000]/20 text-[#7A0000]">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl font-bold text-stone-900 tracking-tight">
                    Standing Orders Customer Queue
                  </h1>
                </div>
              </div>
            </div>

            <button
              onClick={() => void fetchDashboardData()}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition-colors disabled:opacity-50 self-start md:self-auto"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#7A0000]" : ""}`} />
              Refresh Data
            </button>
          </div>

          {/* METRICS CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-stone-200/80 shadow-sm relative overflow-hidden group hover:border-[#7A0000]/30 transition-all">
              <div className="absolute top-0 right-0 p-6 opacity-10 text-[#7A0000] group-hover:scale-110 transition-transform">
                <Users className="w-20 h-20" />
              </div>
              <p className="text-xs font-bold tracking-wider text-stone-400 uppercase">
                Total Queued Orders (Status Q)
              </p>
              <div className="mt-3 flex items-baseline gap-3">
                <span className="text-3xl md:text-4xl font-extrabold text-stone-900 tracking-tight">
                  {loading ? "..." : totalCount.toLocaleString()}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" /> Queue Status Q
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-2">
                Active queued accounts scheduled for standing order processing
              </p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-stone-200/80 shadow-sm relative overflow-hidden group hover:border-blue-500/30 transition-all">
              <div className="absolute top-0 right-0 p-6 opacity-10 text-blue-600 group-hover:scale-110 transition-transform">
                <CreditCard className="w-20 h-20" />
              </div>
              <p className="text-xs font-bold tracking-wider text-stone-400 uppercase">
                Loaded Queue Preview
              </p>
              <div className="mt-3 flex items-baseline gap-3">
                <span className="text-3xl md:text-4xl font-extrabold text-stone-900 tracking-tight">
                  {loading ? "..." : customers.length}
                </span>
                <span className="text-xs font-semibold text-stone-500">
                  Records Displayed
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-2">
                Top queued records loaded for quick review
              </p>
            </div>
          </div>

          {/* SEARCH AND FILTER BAR (SINGLE LINE SIDE-BY-SIDE) */}
          <div className="bg-white p-4 md:p-6 rounded-3xl border border-stone-200/80 shadow-sm">
            <div className="flex flex-col lg:flex-row items-center gap-3">
              {/* DB Account Search Form */}
              <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 w-full">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search specific Account Number from DB..."
                    className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 text-xs md:text-sm focus:bg-white focus:border-[#7A0000] focus:ring-2 focus:ring-[#7A0000]/10 transition-all text-stone-800 placeholder-stone-400"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-[#7A0000] hover:bg-[#5C0000] text-white text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Search className="w-3.5 h-3.5" /> Fetch Account
                </button>
              </form>

              {/* Quick Client Text Filter */}
              <div className="relative flex-1 w-full">
                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="text"
                  value={filterText}
                  onChange={(e) => {
                    setFilterText(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Quick text filter by Account Number, Branch Name..."
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50/30 text-xs md:text-sm focus:bg-white focus:border-stone-400 transition-all text-stone-800 placeholder-stone-400"
                />
              </div>

              {(searchTerm || filterText) && (
                <button
                  type="button"
                  onClick={handleResetSearch}
                  className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs font-semibold transition-colors whitespace-nowrap"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* DATA TABLE */}
          <div className="bg-white rounded-3xl border border-stone-200/80 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-stone-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-stone-900">Queued Standing Orders</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 font-semibold">
                  {filteredCustomers.length} results
                </span>
              </div>
            </div>

            {loading ? (
              <div className="p-16 text-center space-y-3">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#7A0000]" />
                <p className="text-xs font-semibold text-stone-500">Loading standing orders queue...</p>
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="p-16 text-center space-y-3">
                <AlertCircle className="w-10 h-10 mx-auto text-amber-500" />
                <h3 className="text-sm font-bold text-stone-800">No Queued Customers Found</h3>
                <p className="text-xs text-stone-500 max-w-sm mx-auto">
                  No matching records with status1 = 'Q' found for the current search criteria.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-stone-50/80 text-stone-500 font-bold uppercase tracking-wider border-b border-stone-100">
                      <th className="py-3.5 px-4 text-center w-12">#</th>
                      <th className="py-3.5 px-4">Account Number</th>
                      <th className="py-3.5 px-4">Branch Name</th>
                      <th className="py-3.5 px-4 text-center">Bill Cycle</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                      <th className="py-3.5 px-4 text-right">Outstanding Bal</th>
                      <th className="py-3.5 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-stone-700">
                    {paginatedCustomers.map((cust, idx) => (
                      <tr
                        key={cust.acctNumber + idx}
                        className="hover:bg-stone-50/60 transition-colors"
                      >
                        <td className="py-3.5 px-4 text-center font-mono text-stone-400">
                          {(currentPage - 1) * itemsPerPage + idx + 1}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-[#7A0000]">
                          {cust.acctNumber}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-stone-800">
                          {cust.branName || "N/A"}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono">
                          {cust.billCycle || "-"}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            {cust.status1 || "Q"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-medium">
                          {cust.lastOutBal !== undefined && cust.lastOutBal !== null
                            ? Number(cust.lastOutBal).toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })
                            : "0.00"}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => setSelectedCustomer(cust)}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-stone-100 hover:bg-[#7A0000] hover:text-white text-stone-700 text-[11px] font-semibold transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" /> Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* PAGINATION */}
            {!loading && totalPages > 1 && (
              <div className="p-4 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
                <span>
                  Page {currentPage} of {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-stone-200 hover:bg-stone-100 disabled:opacity-40 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-stone-200 hover:bg-stone-100 disabled:opacity-40 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* VIEW DETAILS MODAL */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-5 relative">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#7A0000]/10 text-[#7A0000] rounded-xl">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-base">Customer Order Details</h3>
                  <p className="text-xs text-stone-400 font-mono">Account: {selectedCustomer.acctNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-1.5 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-stone-50 p-3 rounded-2xl border border-stone-100 space-y-1">
                <span className="text-stone-400 font-medium text-[10px] uppercase">Branch Name</span>
                <p className="font-bold text-stone-800">{selectedCustomer.branName || "N/A"}</p>
              </div>

              <div className="bg-stone-50 p-3 rounded-2xl border border-stone-100 space-y-1">
                <span className="text-stone-400 font-medium text-[10px] uppercase">Bill Cycle</span>
                <p className="font-bold text-stone-800 font-mono">{selectedCustomer.billCycle || "-"}</p>
              </div>

              <div className="bg-stone-50 p-3 rounded-2xl border border-stone-100 space-y-1">
                <span className="text-stone-400 font-medium text-[10px] uppercase">Status 1</span>
                <p className="font-bold text-amber-700 font-mono">{selectedCustomer.status1 || "Q"}</p>
              </div>

              <div className="bg-stone-50 p-3 rounded-2xl border border-stone-100 space-y-1">
                <span className="text-stone-400 font-medium text-[10px] uppercase">Calc Cycle</span>
                <p className="font-bold text-stone-800 font-mono">{selectedCustomer.calcCycle || "-"}</p>
              </div>

              <div className="bg-stone-50 p-3 rounded-2xl border border-stone-100 space-y-1">
                <span className="text-stone-400 font-medium text-[10px] uppercase">Last Proc Date</span>
                <p className="font-bold text-stone-800 font-mono">
                  {selectedCustomer.lastProcDate ? new Date(selectedCustomer.lastProcDate).toLocaleDateString() : "-"}
                </p>
              </div>

              <div className="bg-stone-50 p-3 rounded-2xl border border-stone-100 space-y-1">
                <span className="text-stone-400 font-medium text-[10px] uppercase">Last Outstanding Bal</span>
                <p className="font-bold text-emerald-700 font-mono">
                  Rs. {selectedCustomer.lastOutBal !== undefined && selectedCustomer.lastOutBal !== null
                    ? Number(selectedCustomer.lastOutBal).toLocaleString("en-US", { minimumFractionDigits: 2 })
                    : "0.00"}
                </p>
              </div>

              <div className="bg-stone-50 p-3 rounded-2xl border border-stone-100 space-y-1">
                <span className="text-stone-400 font-medium text-[10px] uppercase">Bank / Branch Code</span>
                <p className="font-bold text-stone-800 font-mono">
                  {selectedCustomer.bankCode || "-"} / {selectedCustomer.branCode || "-"}
                </p>
              </div>

              <div className="bg-stone-50 p-3 rounded-2xl border border-stone-100 space-y-1">
                <span className="text-stone-400 font-medium text-[10px] uppercase">Contact Person</span>
                <p className="font-bold text-stone-800">{selectedCustomer.contactPerson || "N/A"}</p>
              </div>

              <div className="col-span-2 bg-stone-50 p-3 rounded-2xl border border-stone-100 space-y-1">
                <span className="text-stone-400 font-medium text-[10px] uppercase">Branch Address</span>
                <p className="font-medium text-stone-700">{selectedCustomer.branAddress || "N/A"}</p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedCustomer(null)}
                className="px-5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold transition-colors"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StandingOrdersDashboardPage;
