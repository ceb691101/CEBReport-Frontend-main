import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import DashboardSelector from "../../components/mainTopics/Dashboard/DashboardSelector";
import DashboardHeader from "../../components/mainTopics/Dashboard/DashboardHeader";
import { useCountUp } from "../../components/mainTopics/Dashboard/hooks/useCountUp";
import {
  Search,
  Filter,
  RefreshCw,
  Users,
  CreditCard,
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

interface BankCount {
  bankCode: string;
  branCode: string;
  bankLabel: string;
  count: number;
}

interface MnthBill {
  refId: string;
  bankCode: string;
  branCode: string;
  acctNumber: string;
  custFname: string;
  custLname: string;
  address1: string;
  address2: string;
  address3: string;
  billCycle: string;
  billMon: string;
  frmDate: string;
  toDate: string;
  kwhUnits: string;
  kwhCharge: string;
  tax: string;
  fac: string;
  payments: string;
  debit: string;
  credit: string;
  openBal: string;
  closeBal: string;
  procDate: string;
  procTime: string;
  reqstStat: string;
  reqstTime: string;
  paidAmount: string;
  paidDate: string;
}

const formatMoney = (v: string | number | undefined | null): string => {
  const n = parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
};

const formatUnits = (v: string | number | undefined | null): string => {
  const n = parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? String(Math.trunc(n)) : "0";
};

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

// Sub-component so each bank card can independently run useCountUp (hooks can't be in .map())
interface BankCardProps {
  bank: BankCount;
  isActive: boolean;
  onClick: () => void;
  loading: boolean;
}
const BankCard: React.FC<BankCardProps> = ({ bank, isActive, onClick, loading }) => {
  const animated = useCountUp(bank.count, 1200, !loading, bank.count);
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ minWidth: "100px" }}
      className={[
        "relative text-left py-2 px-3 rounded-[20px] border transition-all duration-300 select-none group flex flex-col justify-between overflow-hidden",
        "shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)] hover:-translate-y-0.5",
        isActive
          ? "bg-[var(--ceb-maroon)] border-[var(--ceb-maroon)] shadow-md"
          : "bg-white border-gray-100/80 hover:border-[var(--ceb-maroon)]/30",
      ].join(" ")}
    >
      {/* decorative blob — mirrors KpiCard */}
      <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-gradient-to-br from-gray-50 to-gray-100/50 opacity-50 blur-xl pointer-events-none transition-all duration-700 group-hover:scale-[2.5] group-hover:from-[var(--ceb-maroon)]/10 group-hover:to-rose-500/5" />

      <p
        className={`text-[9px] font-semibold tracking-wide uppercase truncate mb-1 transition-colors ${
          isActive ? "text-white/70" : "text-gray-500 group-hover:text-gray-700"
        }`}
      >
        {bank.bankLabel}
      </p>
      <p
        className={`text-[16px] font-bold tracking-tight leading-none transition-colors duration-300 ${
          isActive ? "text-white" : "text-gray-900 group-hover:text-[var(--ceb-maroon)]"
        }`}
      >
        {animated.toLocaleString()}
      </p>

    </button>
  );
};

const StandingOrdersDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const activeDashboard = "standingorders";

  const [loading, setLoading] = useState<boolean>(true);
  const [totalCount, setTotalCount] = useState<number>(0);
  const animatedTotal = useCountUp(totalCount, 1400, !loading);
  const [bankCounts, setBankCounts] = useState<BankCount[]>([]);
  const [customers, setCustomers] = useState<CustomerDetail[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterText, setFilterText] = useState<string>("");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetail | null>(null);
  const [selectedBank, setSelectedBank] = useState<{ bankCode: string; branCode: string } | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 15;

  // Monthly bills modal state
  const [billAcct, setBillAcct] = useState<string | null>(null);
  const [bills, setBills] = useState<MnthBill[]>([]);
  const [billsLoading, setBillsLoading] = useState(false);

  const openBillHistory = async (acctNumber: string) => {
    setBillAcct(acctNumber);
    setBills([]);
    setBillsLoading(true);
    try {
      const res = await fetchWithCandidates(`/api/CustomerDashboard/GetMnthBill?acctNumber=${encodeURIComponent(acctNumber)}`);
      const data = await res.json();
      const raw = Array.isArray(data) ? data : data.data ?? [];
      setBills(raw.map((b: any) => ({
        refId:      b.RefId      ?? b.refId      ?? "",
        bankCode:   b.BankCode   ?? b.bankCode   ?? "",
        branCode:   b.BranCode   ?? b.branCode   ?? "",
        acctNumber: b.AcctNumber ?? b.acctNumber ?? "",
        custFname:  b.CustFname  ?? b.custFname  ?? "",
        custLname:  b.CustLname  ?? b.custLname  ?? "",
        address1:   b.Address1   ?? b.address1   ?? "",
        address2:   b.Address2   ?? b.address2   ?? "",
        address3:   b.Address3   ?? b.address3   ?? "",
        billCycle:  b.BillCycle  ?? b.billCycle  ?? "",
        billMon:    b.BillMon    ?? b.billMon    ?? "",
        frmDate:    b.FrmDate    ?? b.frmDate    ?? "",
        toDate:     b.ToDate     ?? b.toDate     ?? "",
        kwhUnits:   b.KwhUnits   ?? b.kwhUnits   ?? "",
        kwhCharge:  b.KwhCharge  ?? b.kwhCharge  ?? "",
        tax:        b.Tax        ?? b.tax        ?? "",
        fac:        b.Fac        ?? b.fac        ?? "",
        payments:   b.Payments   ?? b.payments   ?? "",
        debit:      b.Debit      ?? b.debit      ?? "",
        credit:     b.Credit     ?? b.credit     ?? "",
        openBal:    b.OpenBal    ?? b.openBal    ?? "",
        closeBal:   b.CloseBal   ?? b.closeBal   ?? "",
        procDate:   b.ProcDate   ?? b.procDate   ?? "",
        procTime:   b.ProcTime   ?? b.procTime   ?? "",
        reqstStat:  b.ReqstStat  ?? b.reqstStat  ?? "",
        reqstTime:  b.ReqstTime  ?? b.reqstTime  ?? "",
        paidAmount: b.PaidAmount ?? b.paidAmount ?? "",
        paidDate:   b.PaidDate   ?? b.paidDate   ?? "",
      })).sort((a: MnthBill, bItem: MnthBill) => (parseInt(bItem.billCycle, 10) || 0) - (parseInt(a.billCycle, 10) || 0)));
    } catch {
      setBills([]);
    } finally {
      setBillsLoading(false);
    }
  };

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

      // Fetch Per-Bank Counts
      try {
        const bankRes = await fetchWithCandidates("/api/CustomerDashboard/GetCountByBank");
        const bankData = await bankRes.json();
        const rawBanks = Array.isArray(bankData) ? bankData : bankData.data ?? [];
        setBankCounts(
          rawBanks.map((b: any) => ({
            bankCode: b.BankCode ?? b.bankCode ?? "",
            branCode: b.BranCode ?? b.branCode ?? "",
            bankLabel: b.BankLabel ?? b.bankLabel ?? "",
            count: b.Count ?? b.count ?? 0,
          }))
        );
      } catch {
        setBankCounts([]);
      }

      // Fetch Customer Details
      const detailsPath = acctNo
        ? `/api/CustomerDashboard/GetCustomerDetails?accNumber=${encodeURIComponent(acctNo)}`
        : `/api/CustomerDashboard/GetCustomerDetails`;
      
      const detailsRes = await fetchWithCandidates(detailsPath);
      const detailsData = await detailsRes.json();
      if (detailsData?.success === false) {
        console.error("GetCustomerDetails failed:", detailsData.errorMessage);
      }

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
    let list = customers;
    if (selectedBank) {
      list = list.filter(
        (c) => c.bankCode === selectedBank.bankCode && c.branCode === selectedBank.branCode
      );
    }
    if (filterText.trim()) {
      const q = filterText.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.acctNumber?.toLowerCase().includes(q) ||
          c.branName?.toLowerCase().includes(q) ||
          c.bankCode?.toLowerCase().includes(q) ||
          c.branCode?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [customers, filterText, selectedBank]);

  const handleSelectBank = (bankCode: string, branCode: string) => {
    setSelectedBank((prev) =>
      prev && prev.bankCode === bankCode && prev.branCode === branCode
        ? null
        : { bankCode, branCode }
    );
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage) || 1;
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCustomers.slice(start, start + itemsPerPage);
  }, [filteredCustomers, currentPage, itemsPerPage]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* DASHBOARD SELECTOR SIDEBAR */}
        <DashboardSelector
          activeDashboard={activeDashboard}
          onSelectDashboard={(dashboard) => navigate(`/dashboard/${dashboard}`)}
        />

        {/* MAIN PAGE CONTENT */}
        <div className="flex-1 flex flex-col">
          {/* STICKY HEADER — same position/style as Billing Dashboard */}
          <DashboardHeader
            title="Standing Order Dashboard"
            showDivisionBar={false}
          />

          <div className="p-6 space-y-6">

          {/* METRICS CARDS — Total Registered hero LEFT, bank cards RIGHT */}
          <div className="flex gap-3 items-stretch">

            {/* TOTAL REGISTERED — large hero card on the LEFT */}
            <div className="relative flex-shrink-0 w-56 bg-gradient-to-br from-[var(--ceb-maroon)] to-[color-mix(in_srgb,var(--ceb-maroon)_60%,black)] rounded-[20px] py-3 px-5 shadow-[0_8px_30px_-4px_rgba(0,0,0,0.18)] overflow-hidden flex flex-col justify-between">
              <div className="absolute -top-3 -right-3 opacity-10">
                <Users className="w-24 h-24 text-white" />
              </div>
              <p className="text-[10px] font-semibold text-white/60 tracking-wide uppercase">Total Registered</p>
              <p className="text-[22px] font-bold text-white tracking-tight mt-1 leading-none">
                {loading ? (
                  <span className="inline-block w-24 h-9 bg-white/20 rounded animate-pulse" />
                ) : (
                  animatedTotal.toLocaleString()
                )}
              </p>
              <p className="text-[10px] text-white/50 mt-2 font-medium">Standing Orders</p>
            </div>

            {/* BANK CARDS — compact, wrapping, no scroll, on the RIGHT */}
            <div className="flex-1 flex flex-wrap gap-2 content-start">
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="bg-white rounded-[20px] border border-gray-100/80 py-2 px-3 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] animate-pulse"
                      style={{ minWidth: "90px" }}
                    >
                      <div className="h-2 bg-gray-200 rounded w-3/4 mb-2" />
                      <div className="h-5 bg-gray-200 rounded w-1/2 mb-1.5" />
                      <div className="h-2 bg-gray-100 rounded w-2/3" />
                    </div>
                  ))
                : bankCounts.map((bank) => {
                    const isActive =
                      selectedBank?.bankCode === bank.bankCode &&
                      selectedBank?.branCode === bank.branCode;
                    return (
                      <BankCard
                        key={`${bank.bankCode}-${bank.branCode}`}
                        bank={bank}
                        isActive={isActive}
                        onClick={() => handleSelectBank(bank.bankCode, bank.branCode)}
                        loading={loading}
                      />
                    );
                  })}
            </div>
          </div>

          {/* SEARCH AND FILTER BAR (SINGLE LINE SIDE-BY-SIDE) */}
          <div className="bg-white p-4 md:p-6 rounded-[20px] border border-gray-200/80 shadow-sm">
            <div className="flex flex-col lg:flex-row items-center gap-3">
              {/* DB Account Search Form */}
              <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 w-full">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search specific Account Number from DB..."
                    className="w-full pl-11 pr-4 py-2.5 rounded-[16px] border border-gray-200 bg-gray-50/50 text-xs md:text-sm focus:bg-white focus:border-[var(--ceb-maroon)] focus:ring-2 focus:ring-[var(--ceb-maroon)]/10 transition-all text-gray-800 placeholder-stone-400"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-[16px] bg-[#7A0000] hover:bg-[#5C0000] text-white text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Search className="w-3.5 h-3.5" /> Fetch Account
                </button>
              </form>

              {/* Quick Client Text Filter */}
              <div className="relative flex-1 w-full">
                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={filterText}
                  onChange={(e) => {
                    setFilterText(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Quick text filter by Account Number, Branch Name..."
                  className="w-full pl-11 pr-4 py-2.5 rounded-[16px] border border-gray-200 bg-gray-50/30 text-xs md:text-sm focus:bg-white focus:border-stone-400 transition-all text-gray-800 placeholder-stone-400"
                />
              </div>

              {(searchTerm || filterText) && (
                <button
                  type="button"
                  onClick={handleResetSearch}
                  className="px-4 py-2.5 rounded-[16px] bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold transition-colors whitespace-nowrap"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* DATA TABLE */}
          <div className="bg-white rounded-[20px] border border-gray-200/80 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {selectedBank && (
                  <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-[#7A0000]/10 text-[#7A0000] font-semibold">
                    {bankCounts.find(
                      (b) => b.bankCode === selectedBank.bankCode && b.branCode === selectedBank.branCode
                    )?.bankLabel ?? `${selectedBank.bankCode} / ${selectedBank.branCode}`}
                    <button
                      type="button"
                      onClick={() => setSelectedBank(null)}
                      className="hover:text-[#5C0000]"
                      title="Clear bank filter"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                )}
              </div>
            </div>

            {loading ? (
              <div className="p-16 text-center space-y-3">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#7A0000]" />
                <p className="text-xs font-semibold text-gray-500">Loading standing orders queue...</p>
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="p-16 text-center space-y-3">
                <AlertCircle className="w-10 h-10 mx-auto text-amber-500" />
                <h3 className="text-sm font-bold text-gray-800">No Queued Customers Found</h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  No matching records with status1 = 'Q' found for the current search criteria.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50/80 text-gray-500 font-bold uppercase tracking-wider border-b border-gray-100">
                      <th className="py-3.5 px-4 text-center w-12">#</th>
                      <th className="py-3.5 px-4">Account Number</th>
                      <th className="py-3.5 px-4">Branch Name</th>
                      <th className="py-3.5 px-4 text-center">Registered Bill Cycle</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                      <th className="py-3.5 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-gray-700">
                    {paginatedCustomers.map((cust, idx) => (
                      <tr
                        key={cust.acctNumber + idx}
                        className="hover:bg-gray-50/60 transition-colors"
                      >
                        <td className="py-3.5 px-4 text-center font-mono text-gray-400">
                          {(currentPage - 1) * itemsPerPage + idx + 1}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold">
                          <button
                            onClick={() => openBillHistory(cust.acctNumber)}
                            className="text-[var(--ceb-maroon)] hover:underline hover:text-[#5C0000] transition-colors text-left"
                          >
                            {cust.acctNumber}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-gray-800">
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
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => setSelectedCustomer(cust)}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-gray-100 hover:bg-[#7A0000] hover:text-white text-gray-700 text-[11px] font-semibold transition-colors"
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
              <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <span>
                  Page {currentPage} of {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-40 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-40 transition-colors"
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
        <div className="fixed inset-0 top-20 lg:left-64 z-50 flex items-center justify-center p-4 bg-stone-950/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[20px] max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-5 relative">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#7A0000]/10 text-[#7A0000] rounded-[16px]">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Customer Order Details</h3>
                  <p className="text-xs text-gray-400 font-mono">Account: {selectedCustomer.acctNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-gray-50 p-3 rounded-[20px] border border-gray-100 space-y-1">
                <span className="text-gray-400 font-medium text-[10px] uppercase">Branch Name</span>
                <p className="font-bold text-gray-800">{selectedCustomer.branName || "N/A"}</p>
              </div>

              <div className="bg-gray-50 p-3 rounded-[20px] border border-gray-100 space-y-1">
                <span className="text-gray-400 font-medium text-[10px] uppercase">Bill Cycle</span>
                <p className="font-bold text-gray-800 font-mono">{selectedCustomer.billCycle || "-"}</p>
              </div>

              <div className="bg-gray-50 p-3 rounded-[20px] border border-gray-100 space-y-1">
                <span className="text-gray-400 font-medium text-[10px] uppercase">Status 1</span>
                <p className="font-bold text-amber-700 font-mono">{selectedCustomer.status1 || "Q"}</p>
              </div>

              <div className="bg-gray-50 p-3 rounded-[20px] border border-gray-100 space-y-1">
                <span className="text-gray-400 font-medium text-[10px] uppercase">Calc Cycle</span>
                <p className="font-bold text-gray-800 font-mono">{selectedCustomer.calcCycle || "-"}</p>
              </div>

              <div className="bg-gray-50 p-3 rounded-[20px] border border-gray-100 space-y-1">
                <span className="text-gray-400 font-medium text-[10px] uppercase">Last Proc Date</span>
                <p className="font-bold text-gray-800 font-mono">
                  {selectedCustomer.lastProcDate ? new Date(selectedCustomer.lastProcDate).toLocaleDateString() : "-"}
                </p>
              </div>

              <div className="bg-gray-50 p-3 rounded-[20px] border border-gray-100 space-y-1">
                <span className="text-gray-400 font-medium text-[10px] uppercase">Last Outstanding Bal</span>
                <p className="font-bold text-emerald-700 font-mono">
                  Rs. {selectedCustomer.lastOutBal !== undefined && selectedCustomer.lastOutBal !== null
                    ? Number(selectedCustomer.lastOutBal).toLocaleString("en-US", { minimumFractionDigits: 2 })
                    : "0.00"}
                </p>
              </div>

              <div className="bg-gray-50 p-3 rounded-[20px] border border-gray-100 space-y-1">
                <span className="text-gray-400 font-medium text-[10px] uppercase">Bank / Branch Code</span>
                <p className="font-bold text-gray-800 font-mono">
                  {selectedCustomer.bankCode || "-"} / {selectedCustomer.branCode || "-"}
                </p>
              </div>

              <div className="bg-gray-50 p-3 rounded-[20px] border border-gray-100 space-y-1">
                <span className="text-gray-400 font-medium text-[10px] uppercase">Contact Person</span>
                <p className="font-bold text-gray-800">{selectedCustomer.contactPerson || "N/A"}</p>
              </div>

              <div className="col-span-2 bg-gray-50 p-3 rounded-[20px] border border-gray-100 space-y-1">
                <span className="text-gray-400 font-medium text-[10px] uppercase">Branch Address</span>
                <p className="font-medium text-gray-700">{selectedCustomer.branAddress || "N/A"}</p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedCustomer(null)}
                className="px-5 py-2 rounded-[16px] bg-[#7A0000] hover:bg-[#5C0000] text-white text-xs font-semibold shadow-sm transition-colors"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BILL HISTORY POPUP MODAL */}
      {billAcct && (
        <div
          className="fixed inset-0 top-20 lg:left-64 z-[9999] flex items-center justify-center p-6 bg-stone-950/50 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) { setBillAcct(null); setBills([]); } }}
        >
          <div className="bg-white rounded-[20px] shadow-2xl border border-gray-200 w-full max-w-[95%] flex flex-col"
               style={{ maxHeight: "calc(100vh - 128px)" }}>

            {/* Header */}
            <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100 shrink-0">
              <div>
                <h2 className="text-base font-bold text-gray-900 tracking-tight">Monthly Bill History</h2>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-gray-400">Account:</span>
                  <span className="text-xs font-bold font-mono text-[#7A0000]">{billAcct}</span>
                  {bills.length > 0 && (
                    <>
                      <span className="text-stone-300">|</span>
                      <span className="text-xs font-semibold text-gray-700">{bills[0].custFname} {bills[0].custLname}</span>
                      <span className="text-stone-300">|</span>
                      <span className="text-xs text-gray-400">{[bills[0].address1, bills[0].address2, bills[0].address3].filter(Boolean).join(", ")}</span>
                      <span className="ml-auto text-xs font-mono text-gray-400">{bills[0].bankCode} / {bills[0].branCode}</span>
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={() => { setBillAcct(null); setBills([]); }}
                className="ml-4 p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable table — both axes */}
            <div className="flex-1 overflow-auto">
              {billsLoading ? (
                <div className="flex flex-col items-center justify-center h-52 gap-3">
                  <RefreshCw className="w-7 h-7 animate-spin text-[#7A0000]" />
                  <p className="text-xs text-gray-400 font-semibold">Loading bill history...</p>
                </div>
              ) : bills.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-52 gap-3">
                  <AlertCircle className="w-9 h-9 text-amber-400" />
                  <p className="text-sm text-gray-600 font-semibold">No bill records found for this account.</p>
                </div>
              ) : (
                <table className="text-left text-xs border-collapse" style={{ minWidth: "100%", width: "max-content" }}>
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {[
                        ["#",         "text-center", "w-10"],
                        ["Ref ID",    "text-left",   "min-w-[140px]"],
                        ["Bill Month", "text-center", "min-w-[90px]"],
                        ["Cycle",     "text-center", "min-w-[56px]"],
                        ["From",      "text-center", "min-w-[90px]"],
                        ["To",        "text-center", "min-w-[90px]"],
                        ["kWh",       "text-right",  "min-w-[56px]"],
                        ["Charge",    "text-right",  "min-w-[72px]"],
                        ["Tax",       "text-right",  "min-w-[60px]"],
                        ["FAC",       "text-right",  "min-w-[56px]"],
                        ["Payments",  "text-right",  "min-w-[76px]"],
                        ["Debit",     "text-right",  "min-w-[64px]"],
                        ["Credit",    "text-right",  "min-w-[64px]"],
                        ["Open Bal",  "text-right",  "min-w-[80px]"],
                        ["Close Bal", "text-right",  "min-w-[80px]"],
                        ["Paid Amt",  "text-right",  "min-w-[76px]"],
                        ["Paid Date", "text-center", "min-w-[90px]"],
                        ["Status",    "text-center", "min-w-[64px]"],
                        ["Proc Date", "text-center", "min-w-[90px]"],
                      ].map(([label, align, width]) => (
                        <th key={label} className={`py-3 px-4 font-bold tracking-wider text-gray-500 whitespace-nowrap uppercase ${align} ${width}`}>
                          {label === "kWh" ? (
                            <span style={{ textTransform: "none" }}>kWh</span>
                          ) : (
                            label
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {bills.map((bill, i) => {
                      const trimDate = (d: string) => d ? d.split(" ")[0].split("T")[0] : "-";
                      return (
                        <tr key={bill.refId + i} className={`transition-colors hover:bg-gray-50 ${i % 2 === 0 ? "" : "bg-gray-50/30"}`}>
                          <td className="py-3 px-4 text-center text-gray-400 font-mono whitespace-nowrap">{i + 1}</td>
                          <td className="py-3 px-4 font-mono font-bold text-[#7A0000] whitespace-nowrap">{bill.refId || "-"}</td>
                          <td className="py-3 px-4 text-center font-semibold text-gray-800 whitespace-nowrap">{bill.billMon || "-"}</td>
                          <td className="py-3 px-4 text-center font-mono text-gray-600 whitespace-nowrap">{bill.billCycle || "-"}</td>
                          <td className="py-3 px-4 text-center text-gray-500 whitespace-nowrap">{trimDate(bill.frmDate)}</td>
                          <td className="py-3 px-4 text-center text-gray-500 whitespace-nowrap">{trimDate(bill.toDate)}</td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums text-gray-700 whitespace-nowrap">{formatUnits(bill.kwhUnits)}</td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums text-gray-700 whitespace-nowrap">{formatMoney(bill.kwhCharge)}</td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums text-gray-600 whitespace-nowrap">{formatMoney(bill.tax)}</td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums text-gray-600 whitespace-nowrap">{formatMoney(bill.fac)}</td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums text-gray-700 whitespace-nowrap">{formatMoney(bill.payments)}</td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-red-600 whitespace-nowrap">{formatMoney(bill.debit)}</td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-emerald-600 whitespace-nowrap">{formatMoney(bill.credit)}</td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums text-gray-600 whitespace-nowrap">{formatMoney(bill.openBal)}</td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-gray-900 whitespace-nowrap">{formatMoney(bill.closeBal)}</td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-emerald-700 whitespace-nowrap">{formatMoney(bill.paidAmount)}</td>
                          <td className="py-3 px-4 text-center text-gray-500 whitespace-nowrap">{trimDate(bill.paidDate)}</td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
                              {bill.reqstStat || "-"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center text-gray-500 whitespace-nowrap">{trimDate(bill.procDate)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between shrink-0">
              <span className="text-xs text-gray-400">{bills.length} record{bills.length !== 1 ? "s" : ""} · sorted by largest cycle first</span>
              <button
                onClick={() => { setBillAcct(null); setBills([]); }}
                className="px-5 py-2 rounded-[16px] bg-[#7A0000] hover:bg-[#5C0000] text-white text-xs font-semibold shadow-sm transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
};

export default StandingOrdersDashboardPage;
