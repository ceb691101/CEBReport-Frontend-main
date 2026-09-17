import React, { useState } from "react";
import {
  MdPermIdentity,
  MdSearch,
  MdOutlineReceiptLong,
  MdAccountBalance,
  MdCalendarToday,
  MdRefresh,
} from "react-icons/md";
import { FaFileDownload, FaPrint } from "react-icons/fa";

interface StandingOrderRecord {
  id: string;
  accountNo: string;
  customerName: string;
  bankName: string;
  branchName: string;
  bankAccNo: string;
  amount: number;
  frequency: string;
  startDate: string;
  endDate: string;
  lastExecutionDate: string;
  status: "Active" | "Inactive" | "Expired";
}

// Sample mock data for UI visualization until API is connected
const MOCK_DATA: StandingOrderRecord[] = [
  {
    id: "SO-001",
    accountNo: "0428512345",
    customerName: "K. M. Perera",
    bankName: "Bank of Ceylon",
    branchName: "Kollupitiya (012)",
    bankAccNo: "78239401",
    amount: 8500.0,
    frequency: "Monthly",
    startDate: "2024-01-15",
    endDate: "2025-01-15",
    lastExecutionDate: "2024-08-15",
    status: "Active",
  },
  {
    id: "SO-002",
    accountNo: "0428512345",
    customerName: "K. M. Perera",
    bankName: "People's Bank",
    branchName: "Bambalapitiya (045)",
    bankAccNo: "12498234",
    amount: 12000.0,
    frequency: "Monthly",
    startDate: "2023-05-10",
    endDate: "2024-05-10",
    lastExecutionDate: "2024-05-10",
    status: "Expired",
  },
];

const StandingOrder: React.FC = () => {
  const [acctNo, setAcctNo] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [records, setRecords] = useState<StandingOrderRecord[]>([]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!acctNo.trim()) return;

    setLoading(true);
    setSearched(true);

    // Simulated fetch - will be replaced with real API later
    setTimeout(() => {
      setRecords(MOCK_DATA);
      setLoading(false);
    }, 400);
  };

  const handleReset = () => {
    setAcctNo("");
    setStatusFilter("All");
    setSearched(false);
    setRecords([]);
  };

  const filteredRecords = records.filter((rec) => {
    if (statusFilter === "All") return true;
    return rec.status === statusFilter;
  });

  const getStatusBadge = (status: StandingOrderRecord["status"]) => {
    switch (status) {
      case "Active":
        return "bg-emerald-50 text-emerald-700 border border-emerald-200";
      case "Expired":
        return "bg-amber-50 text-amber-700 border border-amber-200";
      case "Inactive":
        return "bg-gray-100 text-gray-600 border border-gray-200";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <div className="p-2 sm:p-3 w-full max-w-[2000px] mx-auto flex flex-col gap-4">
      {/* Search Filter Form */}
      <form
        onSubmit={handleSearch}
        className="p-4 rounded-lg shadow-sm border border-gray-100 w-full bg-white flex flex-col md:flex-row items-stretch md:items-end justify-between gap-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 flex-1">
          {/* Account Number Input */}
          <div className="flex flex-col">
            <label className="text-xs text-gray-600 flex items-center gap-1.5 mb-1 font-medium">
              <MdPermIdentity className="text-[#800000] text-sm" />
              Account Number
            </label>
            <input
              type="text"
              value={acctNo}
              onChange={(e) => setAcctNo(e.target.value)}
              className="rounded-md bg-gray-50 h-8 px-3 text-xs border border-gray-200 focus:border-[#800000] focus:ring-1 focus:ring-[#800000] outline-none transition-colors"
              placeholder="e.g. 0428512345"
              required
            />
          </div>

          {/* Status Filter */}
          <div className="flex flex-col">
            <label className="text-xs text-gray-600 flex items-center gap-1.5 mb-1 font-medium">
              <MdCalendarToday className="text-[#800000] text-sm" />
              Order Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-md bg-gray-50 h-8 px-3 text-xs border border-gray-200 focus:border-[#800000] focus:ring-1 focus:ring-[#800000] outline-none transition-colors text-gray-700"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Expired">Expired</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 items-center">
          <button
            type="submit"
            disabled={loading}
            className="bg-[#800000] text-white px-5 py-2 rounded-md text-xs font-medium h-8 hover:bg-[#800000]/90 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <MdSearch className="text-base" />
            {loading ? "Searching..." : "Search"}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="bg-gray-100 text-gray-700 px-3 py-2 rounded-md text-xs font-medium h-8 hover:bg-gray-200 transition-colors flex items-center justify-center gap-1"
            title="Reset Filters"
          >
            <MdRefresh className="text-base" />
            Reset
          </button>
        </div>
      </form>

      {/* Customer Info Card if Searched */}
      {searched && filteredRecords.length > 0 && (
        <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs text-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#800000]/10 flex items-center justify-center text-[#800000]">
              <MdAccountBalance className="text-base" />
            </div>
            <div>
              <p className="font-semibold text-gray-800">
                Customer: {filteredRecords[0]?.customerName}
              </p>
              <p className="text-[11px] text-gray-500">
                Account No: <span className="font-mono">{acctNo || filteredRecords[0]?.accountNo}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-1.5 border border-gray-200 text-gray-700 rounded text-xs hover:bg-gray-50 flex items-center gap-1 transition-colors"
            >
              <FaPrint className="text-gray-500" />
              Print
            </button>
            <button
              type="button"
              className="px-3 py-1.5 border border-gray-200 text-gray-700 rounded text-xs hover:bg-gray-50 flex items-center gap-1 transition-colors"
            >
              <FaFileDownload className="text-gray-500" />
              Export CSV
            </button>
          </div>
        </div>
      )}

      {/* Results Table / Empty State */}
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden min-h-[160px]">
        {loading ? (
          <div className="py-12 text-center text-xs text-gray-500 flex flex-col items-center justify-center gap-2">
            <div className="w-6 h-6 border-2 border-[#800000] border-t-transparent rounded-full animate-spin"></div>
            <span>Fetching standing order details...</span>
          </div>
        ) : searched && filteredRecords.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-gray-600">
              <thead className="bg-[#800000]/5 text-gray-700 uppercase text-[10.5px] border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2.5">Order ID</th>
                  <th className="px-3 py-2.5">Bank Name</th>
                  <th className="px-3 py-2.5">Branch</th>
                  <th className="px-3 py-2.5">Bank Account No</th>
                  <th className="px-3 py-2.5 text-right">Max Limit / Amount (LKR)</th>
                  <th className="px-3 py-2.5">Frequency</th>
                  <th className="px-3 py-2.5">Start Date</th>
                  <th className="px-3 py-2.5">End Date</th>
                  <th className="px-3 py-2.5">Last Executed</th>
                  <th className="px-3 py-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRecords.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-3 py-2.5 font-medium text-gray-800">{item.id}</td>
                    <td className="px-3 py-2.5">{item.bankName}</td>
                    <td className="px-3 py-2.5">{item.branchName}</td>
                    <td className="px-3 py-2.5 font-mono">{item.bankAccNo}</td>
                    <td className="px-3 py-2.5 text-right font-medium text-gray-800">
                      {item.amount.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-3 py-2.5">{item.frequency}</td>
                    <td className="px-3 py-2.5">{item.startDate}</td>
                    <td className="px-3 py-2.5">{item.endDate}</td>
                    <td className="px-3 py-2.5">{item.lastExecutionDate}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${getStatusBadge(
                          item.status
                        )}`}
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : searched && filteredRecords.length === 0 ? (
          <div className="py-12 text-center text-xs text-gray-400">
            No standing orders found matching your criteria.
          </div>
        ) : (
          <div className="py-12 flex flex-col items-center justify-center text-gray-400 gap-2">
            <MdOutlineReceiptLong className="text-4xl text-gray-300" />
            <p className="text-xs">Enter an account number above to retrieve Standing Order records</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StandingOrder;

