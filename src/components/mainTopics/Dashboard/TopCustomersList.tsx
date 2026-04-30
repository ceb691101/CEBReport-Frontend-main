import React, { useRef, useState } from "react";
import { useInView } from "./hooks/useInView";

export interface TopCustomerItem {
  accountNumber: string;
  name: string;
  kwh: number;
  rank: number;
}

interface TopCustomersListProps {
  items: TopCustomerItem[];
  loading: boolean;
  error?: string | null;
  billCycle?: string;
}

// Number of rows visible before "View All Customers" expands the list
const VISIBLE_LIMIT = 5;

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts.slice(0, 2).map((part) => part[0]).join("").toUpperCase();
};

const formatCompact = (value: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);

// ── Per-row component with its own IntersectionObserver ──────────────────────
// Each row observes itself so its bar animates exactly when that row enters
// the viewport — whether on initial page scroll or after "View All" expands.
interface CustomerRowProps {
  item: TopCustomerItem;
  widthPercent: number;
}

const CustomerRow: React.FC<CustomerRowProps> = ({ item, widthPercent }) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const { inView } = useInView(rowRef as React.RefObject<Element>, {
    threshold: 0.4, // fire when at least 40 % of the row is visible
  });

  return (
    <div ref={rowRef} className="relative">
      <div className="absolute left-0 right-0 top-1/2 h-px bg-gray-100" />

      <div className="relative flex items-center gap-3 py-1">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-[color:var(--ceb-maroon)] text-white flex items-center justify-center font-semibold text-xs flex-shrink-0 shadow-sm">
          {getInitials(item.name)}
        </div>

        {/* Name + account */}
        <div className="min-w-0 flex-1 pr-2">
          <p className="text-sm font-semibold text-gray-900 leading-tight truncate">
            {item.name}
          </p>
          <p className="text-xs text-gray-500 truncate">
            {item.accountNumber}
          </p>
        </div>

        {/* kWh value */}
        <div className="flex flex-col items-end min-w-[80px]">
          <p className="text-sm font-semibold text-gray-900 leading-none">
            {formatCompact(item.kwh)}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">kWh</p>
        </div>
      </div>

      {/* Progress bar — animates from 0 → widthPercent when row enters view */}
      <div
        className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden"
        style={{ marginLeft: 52 }}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-[color:var(--ceb-maroon)] to-[#c2410c] transition-[width] duration-700 ease-out"
          style={{ width: inView ? `${widthPercent}%` : "0%" }}
        />
      </div>
    </div>
  );
};

const TopCustomersList: React.FC<TopCustomersListProps> = ({
  items,
  loading,
  error,
  // billCycle,
}) => {
  const [expanded, setExpanded] = useState(false);

  const maxKwh = Math.max(...items.map((item) => item.kwh), 1);
  const visibleItems = expanded ? items : items.slice(0, VISIBLE_LIMIT);
  const hasMore = items.length > VISIBLE_LIMIT;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-full flex flex-col">
      {/* ── Header — same structure & font sizes as Sales & Collection Distribution ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold text-gray-900">Top Customers</h3>
          <p className="text-sm text-gray-500 mt-1">
            Sorted by consumption — Highest to Lowest
            {/* {billCycle ? ` (Bill Cycle ${billCycle})` : ""} */}
          </p>
        </div>
        <span className="text-[10px] font-semibold tracking-[0.24em] text-[color:var(--ceb-maroon)] uppercase">
          kWh
        </span>
      </div>

      {/* ── Customer list — flex-1 so it fills available card height ── */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
            Loading top customers...
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center text-sm text-red-500 text-center px-6">
            {error}
          </div>
        ) : items.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-400 text-center px-6">
            No top customer data available.
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin scrollbar-thumb-gray-200">
            {visibleItems.map((item, index) => (
              <CustomerRow
                key={`${item.accountNumber}-${index}`}
                item={item}
                widthPercent={Math.max(12, (item.kwh / maxKwh) * 100)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Footer — matches Sales & Collection's mt-auto border-t footer ── */}
      {!loading && !error && items.length > 0 && (
        <div className="pt-4 mt-4 border-t border-gray-100 flex justify-center">
          {hasMore ? (
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="text-[color:var(--ceb-maroon)] font-semibold text-sm hover:opacity-80 transition-opacity"
            >
              {expanded
                ? "← Show Less"
                : `View All Customers (${items.length}) →`}
            </button>
          ) : (
            <span className="text-xs text-gray-400">All customers shown</span>
          )}
        </div>
      )}
    </div>
  );
};

export default TopCustomersList;