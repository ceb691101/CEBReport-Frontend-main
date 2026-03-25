import { useState, useEffect } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// API base – set VITE_API_BASE_URL in your .env file, e.g.:
//   VITE_API_BASE_URL=http://localhost:5000
// ─────────────────────────────────────────────────────────────────────────────
const API_BASE = (import.meta as { env?: Record<string, string> }).env
  ?.VITE_API_BASE_URL ?? "";

// ── Types ─────────────────────────────────────────────────────────────────────
interface CustomerRecord {
  AccountNumber: string;
  Name: string;
  Address: string;
  City: string;
  Tariff: string;
  ContractDemand: string;
  SecurityDeposit: string;
  TotalKWOUnits: string;
  TotalKWDUnits: string;
  TotalKWPUnits: string;
  KVA: string;
  MonthlyCharge: string;
  ProvinceCode: string | null;
  AreaCode: string;
  Province: string | null;
  Area: string | null;
  BillCycle: string;
  ErrorMessage: string;
  RawContractDemand: number;
  RawSecurityDeposit: number;
  RawTotalKWOUnits: number;
  RawTotalKWDUnits: number;
  RawTotalKWPUnits: number;
  RawKVA: number;
  RawMonthlyCharge: number;
}

// ── Static reference data ─────────────────────────────────────────────────────
const AREAS = [
  { code: "43", label: "Kurunegala" },
  { code: "84", label: "Narammala" },
  { code: "76", label: "Wariyapola" },
  { code: "89", label: "Mahawa" },
  { code: "64", label: "Embilipitiya" },
];

const PROVINCES = [
  { code: "D",  label: "NWP2" },
  { code: "SP", label: "Southern Province" },
];

// ── Helper (defined OUTSIDE the component to avoid re-creation on every render)
function depositStatus(deposit: number, demand: number): "ok" | "low" | "zero" {
  if (deposit === 0) return "zero";
  return deposit / (demand || 1) >= 1000 ? "ok" : "low";
}

// SortIcon also defined outside the component
const SortIcon = ({
  field,
  sortField,
  sortDir,
}: {
  field: keyof CustomerRecord;
  sortField: keyof CustomerRecord;
  sortDir: "asc" | "desc";
}) => (
  <span className="ml-1 opacity-60 text-[10px]">
    {sortField === field ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}
  </span>
);

// ── Component ─────────────────────────────────────────────────────────────────
const SecurityDepositContractDemandBulk = () => {

  // ── Filter state ───────────────────────────────────────────────────────────
  const [billCycle, setBillCycle]   = useState<string>("");
  const [filterType, setFilterType] = useState<"area" | "province">("area");
  const [areaCode, setAreaCode]     = useState<string>("");
  const [provCode, setProvCode]     = useState<string>("");

  // ── Bill-cycle dropdown (fetched from API) ─────────────────────────────────
  const [billCycles, setBillCycles]               = useState<string[]>([]);
  const [billCyclesLoading, setBillCyclesLoading] = useState<boolean>(true);
  const [billCyclesError, setBillCyclesError]     = useState<string | null>(null);

  // ── Report state ──────────────────────────────────────────────────────────
  const [data, setData]         = useState<CustomerRecord[]>([]);
  const [loading, setLoading]   = useState<boolean>(false);
  const [error, setError]       = useState<string | null>(null);
  const [searched, setSearched] = useState<boolean>(false);

  // ── Table UX ──────────────────────────────────────────────────────────────
  const [searchText, setSearchText]   = useState<string>("");
  const [sortField, setSortField]     = useState<keyof CustomerRecord>("AccountNumber");
  const [sortDir, setSortDir]         = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const PAGE_SIZE = 20;

  // ── Fetch bill cycles on mount ─────────────────────────────────────────────
  // Calls: GET api/contract-demand/bill-cycles
  // Returns: { data: { maxBillCycle: string, billCycles: string[] }, errorMessage: null }
  useEffect(() => {
    let cancelled = false;

    const fetchCycles = async () => {
      setBillCyclesLoading(true);
      setBillCyclesError(null);

      try {
        const res = await fetch(`${API_BASE}/api/contract-demand/bill-cycles`);
        if (!res.ok) throw new Error(`Server returned ${res.status}`);

        const json = await res.json() as {
          data: { maxBillCycle: string; billCycles: string[] } | null;
          errorMessage: string | null;
        };

        if (json.errorMessage) throw new Error(json.errorMessage);
        if (!json.data?.billCycles?.length) throw new Error("No bill cycles returned.");

        if (!cancelled) {
          setBillCycles(json.data.billCycles);
          // Pre-select most recent cycle (first in list)
          setBillCycle(json.data.billCycles[0]);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : "Failed to load bill cycles";
          setBillCyclesError(msg);
          // Graceful fallback so the form is still usable
          setBillCycles(["438", "437", "436"]);
        }
      } finally {
        if (!cancelled) setBillCyclesLoading(false);
      }
    };

    fetchCycles();
    return () => { cancelled = true; };
  }, []);

  // ── Fetch report data ──────────────────────────────────────────────────────
  // Area:     GET api/contract-demand/bulk/area?billCycle={cycle}&areaCode={code}
  // Province: GET api/contract-demand/bulk/province?billCycle={cycle}&provCode={code}
  const handleViewReport = async () => {
    if (!billCycle) return;
    if (filterType === "area"     && !areaCode) return;
    if (filterType === "province" && !provCode) return;

    setLoading(true);
    setError(null);
    setSearched(false);
    setData([]);

    try {
      // Bill cycle strings may look like "438 - Jan 2026"; only the number is sent.
      const rawCycle = billCycle.split(" ")[0];

      const url =
        filterType === "area"
          ? `${API_BASE}/api/contract-demand/bulk/area?billCycle=${rawCycle}&areaCode=${areaCode}`
          : `${API_BASE}/api/contract-demand/bulk/province?billCycle=${rawCycle}&provCode=${provCode}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);

      const json = await res.json() as {
        data: CustomerRecord[] | null;
        errorMessage: string | null;
      };

      if (json.errorMessage) throw new Error(json.errorMessage);
      setData(json.data ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load report data");
    } finally {
      setLoading(false);
      setSearched(true);
      setCurrentPage(1);
    }
  };

  // ── Client-side search ────────────────────────────────────────────────────
  const filtered = data.filter((r) => {
    const q = searchText.toLowerCase();
    return (
      r.AccountNumber.toLowerCase().includes(q) ||
      r.Name.toLowerCase().includes(q) ||
      (r.Tariff ?? "").toLowerCase().includes(q) ||
      (r.Area   ?? "").toLowerCase().includes(q)
    );
  });

  // ── Client-side sort ──────────────────────────────────────────────────────
  const sorted = [...filtered].sort((a, b) => {
    const av = String(a[sortField] ?? "");
    const bv = String(b[sortField] ?? "");
    const cmp = av.localeCompare(bv, undefined, { numeric: true });
    return sortDir === "asc" ? cmp : -cmp;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paged      = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // ── Summary stats ─────────────────────────────────────────────────────────
  const totalDeposit = filtered.reduce((s, r) => s + r.RawSecurityDeposit, 0);
  const totalDemand  = filtered.reduce((s, r) => s + r.RawContractDemand,  0);
  const zeroCount    = filtered.filter((r) => r.RawSecurityDeposit === 0).length;
  const lowCount     = filtered.filter(
    (r) =>
      r.RawSecurityDeposit > 0 &&
      r.RawSecurityDeposit / (r.RawContractDemand || 1) < 1000
  ).length;

  // ── Sort handler ──────────────────────────────────────────────────────────
  const handleSort = (field: keyof CustomerRecord) => {
    if (field === sortField) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  // ── Derived values ────────────────────────────────────────────────────────
  const canSubmit =
    !!billCycle && (filterType === "area" ? !!areaCode : !!provCode);

  const rawCyclePreview = billCycle.split(" ")[0];
  const previewUrl = canSubmit
    ? filterType === "area"
      ? `GET api/contract-demand/bulk/area?billCycle=${rawCyclePreview}&areaCode=${areaCode}`
      : `GET api/contract-demand/bulk/province?billCycle=${rawCyclePreview}&provCode=${provCode}`
    : null;

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="font-sans text-sm text-gray-800">

      {/* ── Filter panel ──────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm mb-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">
          Report Filters
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">

          {/* Bill Cycle */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Bill Cycle <span className="text-red-600">*</span>
            </label>

            {billCyclesLoading ? (
              <div className="w-full h-9 bg-gray-100 animate-pulse rounded-md" />
            ) : (
              <select
                value={billCycle}
                onChange={(e) => setBillCycle(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-red-700
                           focus:border-transparent"
              >
                <option value="">— Select —</option>
                {billCycles.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}

            {billCyclesError && (
              <p className="text-[10px] text-amber-600 mt-1">
                ⚠ Could not load from server. Using defaults.
              </p>
            )}
          </div>

          {/* Filter type + value */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Filter By <span className="text-red-600">*</span>
            </label>

            {/* Radio buttons */}
            <div className="flex gap-5 mb-2">
              {(["area", "province"] as const).map((t) => (
                <label
                  key={t}
                  className="flex items-center gap-1.5 cursor-pointer text-sm"
                >
                  <input
                    type="radio"
                    name="filterType"
                    value={t}
                    checked={filterType === t}
                    onChange={() => {
                      setFilterType(t);
                      setAreaCode("");
                      setProvCode("");
                    }}
                    className="accent-red-700"
                  />
                  {t === "area" ? "Area" : "Province"}
                </label>
              ))}
            </div>

            {/* Area / Province dropdown */}
            {filterType === "area" ? (
              <select
                value={areaCode}
                onChange={(e) => setAreaCode(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-red-700"
              >
                <option value="">— Select Area —</option>
                {AREAS.map((a) => (
                  <option key={a.code} value={a.code}>{a.label}</option>
                ))}
              </select>
            ) : (
              <select
                value={provCode}
                onChange={(e) => setProvCode(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-red-700"
              >
                <option value="">— Select Province —</option>
                {PROVINCES.map((p) => (
                  <option key={p.code} value={p.code}>{p.label}</option>
                ))}
              </select>
            )}
          </div>

          {/* View Report button */}
          <div>
            <button
              onClick={handleViewReport}
              disabled={!canSubmit || loading || billCyclesLoading}
              className="w-full bg-red-800 hover:bg-red-900
                         disabled:opacity-50 disabled:cursor-not-allowed
                         text-white font-semibold py-2 px-4 rounded-md
                         transition-colors duration-150
                         flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12" cy="12" r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                  Loading…
                </>
              ) : (
                "View Report"
              )}
            </button>
          </div>
        </div>

        {/* Live URL preview */}
        {previewUrl && (
          <p className="mt-3 text-[10px] text-gray-400 font-mono truncate">
            {previewUrl}
          </p>
        )}
      </div>

      {/* ── Error banner ──────────────────────────────────────────────────── */}
      {error && (
        <div
          className="mb-4 bg-red-50 border border-red-200 text-red-700
                     rounded-lg px-4 py-3 text-sm flex items-start gap-2"
        >
          <svg
            className="h-4 w-4 mt-0.5 shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2
                 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1
                 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span>
            <strong>Error:</strong> {error}
          </span>
        </div>
      )}

      {/* ── Results ───────────────────────────────────────────────────────── */}
      {searched && !error && (
        <>
          {/* Summary cards */}
          {filtered.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {[
                {
                  label: "Total Records",
                  value: filtered.length.toLocaleString(),
                  color: "text-gray-800",
                },
                {
                  label: "Total Security Deposit",
                  value: `Rs. ${totalDeposit.toLocaleString("en-US", {
                    maximumFractionDigits: 0,
                  })}`,
                  color: "text-blue-700",
                },
                {
                  label: "Total Contract Demand",
                  value: `${totalDemand.toLocaleString()} kVA`,
                  color: "text-green-700",
                },
                {
                  label: "Deposit Issues",
                  value: `${zeroCount} zero · ${lowCount} low`,
                  color: "text-red-700",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm"
                >
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider">
                    {s.label}
                  </div>
                  <div className={`text-sm font-bold mt-0.5 ${s.color}`}>
                    {s.value}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Search bar */}
          {filtered.length > 0 && (
            <div className="flex items-center gap-3 mb-3">
              <div className="relative">
                <svg
                  className="absolute left-2.5 top-2 h-3.5 w-3.5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="Search account, name, tariff…"
                  value={searchText}
                  onChange={(e) => {
                    setSearchText(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-8 pr-3 py-1.5 border border-gray-300 rounded-md
                             text-xs w-60 focus:outline-none focus:ring-2
                             focus:ring-red-700"
                />
              </div>
              <span className="text-xs text-gray-500">
                {sorted.length.toLocaleString()} of{" "}
                {filtered.length.toLocaleString()} records
              </span>
            </div>
          )}

          {/* Empty state */}
          {paged.length === 0 && (
            <div
              className="bg-white border border-gray-200 rounded-lg p-10
                         text-center text-gray-400 text-sm"
            >
              No records found for the selected filters.
            </div>
          )}

          {/* Data table */}
          {paged.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="bg-red-800 text-white">
                      {(
                        [
                          ["AccountNumber",   "Account No."],
                          ["Name",            "Name"],
                          ["Tariff",          "Tariff"],
                          ["Area",            "Area"],
                          ["ContractDemand",  "Contract Demand"],
                          ["SecurityDeposit", "Security Deposit (Rs.)"],
                          ["MonthlyCharge",   "Monthly Charge (Rs.)"],
                        ] as [keyof CustomerRecord, string][]
                      ).map(([field, label]) => (
                        <th
                          key={field}
                          onClick={() => handleSort(field)}
                          className="px-3 py-2.5 text-left font-semibold cursor-pointer
                                     whitespace-nowrap hover:bg-red-900 select-none"
                        >
                          {label}
                          <SortIcon
                            field={field}
                            sortField={sortField}
                            sortDir={sortDir}
                          />
                        </th>
                      ))}
                      <th className="px-3 py-2.5 text-left font-semibold">
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {paged.map((r, i) => {
                      const status = depositStatus(
                        r.RawSecurityDeposit,
                        r.RawContractDemand
                      );
                      return (
                        <tr
                          key={r.AccountNumber}
                          className={`border-t border-gray-100 transition-colors
                            ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}
                            hover:bg-red-50`}
                        >
                          <td className="px-3 py-2 font-mono text-gray-700 whitespace-nowrap">
                            {r.AccountNumber}
                          </td>
                          <td
                            className="px-3 py-2 max-w-[180px] truncate"
                            title={r.Name}
                          >
                            {r.Name}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className="bg-gray-100 text-gray-700 px-1.5 py-0.5
                                         rounded text-[10px] font-medium"
                            >
                              {r.Tariff}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                            {r.Area ?? r.AreaCode}
                          </td>
                          <td className="px-3 py-2 text-right font-mono">
                            {r.ContractDemand || "—"}
                          </td>
                          <td className="px-3 py-2 text-right font-mono">
                            {r.RawSecurityDeposit === 0 ? (
                              <span className="text-red-400">—</span>
                            ) : (
                              r.SecurityDeposit
                            )}
                          </td>
                          <td className="px-3 py-2 text-right font-mono">
                            {r.MonthlyCharge || "—"}
                          </td>
                          <td className="px-3 py-2">
                            {status === "ok" && (
                              <span
                                className="bg-green-100 text-green-700 text-[10px]
                                           font-semibold px-2 py-0.5 rounded-full"
                              >
                                OK
                              </span>
                            )}
                            {status === "low" && (
                              <span
                                className="bg-yellow-100 text-yellow-700 text-[10px]
                                           font-semibold px-2 py-0.5 rounded-full"
                              >
                                LOW
                              </span>
                            )}
                            {status === "zero" && (
                              <span
                                className="bg-red-100 text-red-700 text-[10px]
                                           font-semibold px-2 py-0.5 rounded-full"
                              >
                                ZERO
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div
                  className="flex items-center justify-between px-4 py-2.5
                             border-t border-gray-200 bg-gray-50"
                >
                  <span className="text-xs text-gray-500">
                    Page {currentPage} of {totalPages} ·{" "}
                    {sorted.length.toLocaleString()} records
                  </span>

                  <div className="flex gap-1">
                    {/* First / Prev */}
                    {(
                      [
                        { label: "«", page: 1,                disabled: currentPage === 1 },
                        { label: "‹", page: currentPage - 1, disabled: currentPage === 1 },
                      ] as { label: string; page: number; disabled: boolean }[]
                    ).map(({ label, page, disabled }) => (
                      <button
                        key={label}
                        onClick={() => setCurrentPage(page)}
                        disabled={disabled}
                        className="px-2 py-1 text-xs rounded border border-gray-300
                                   disabled:opacity-40 hover:bg-gray-100"
                      >
                        {label}
                      </button>
                    ))}

                    {/* Page numbers */}
                    {Array.from(
                      { length: Math.min(5, totalPages) },
                      (_, i) => {
                        const start = Math.max(
                          1,
                          Math.min(currentPage - 2, totalPages - 4)
                        );
                        const p = start + i;
                        return (
                          <button
                            key={p}
                            onClick={() => setCurrentPage(p)}
                            className={`px-2 py-1 text-xs rounded border ${
                              p === currentPage
                                ? "bg-red-800 text-white border-red-800"
                                : "border-gray-300 hover:bg-gray-100"
                            }`}
                          >
                            {p}
                          </button>
                        );
                      }
                    )}

                    {/* Next / Last */}
                    {(
                      [
                        {
                          label: "›",
                          page: currentPage + 1,
                          disabled: currentPage === totalPages,
                        },
                        {
                          label: "»",
                          page: totalPages,
                          disabled: currentPage === totalPages,
                        },
                      ] as { label: string; page: number; disabled: boolean }[]
                    ).map(({ label, page, disabled }) => (
                      <button
                        key={label}
                        onClick={() => setCurrentPage(page)}
                        disabled={disabled}
                        className="px-2 py-1 text-xs rounded border border-gray-300
                                   disabled:opacity-40 hover:bg-gray-100"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SecurityDepositContractDemandBulk;