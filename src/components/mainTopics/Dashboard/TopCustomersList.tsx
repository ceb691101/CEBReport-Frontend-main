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
interface CustomerRowProps {
  item: TopCustomerItem;
  widthPercent: number;
}

const CustomerRow: React.FC<CustomerRowProps> = ({ item, widthPercent }) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const { inView } = useInView(rowRef as React.RefObject<Element>, {
    threshold: 0.4,
  });

  return (
    <div ref={rowRef} className="relative group p-3 -mx-3 rounded-xl hover:bg-gray-50/80 transition-all duration-200">
      <div className="relative flex items-center gap-4">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--ceb-maroon)] to-rose-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-sm shadow-rose-900/20 group-hover:scale-105 transition-transform duration-300">
          {getInitials(item.name)}
        </div>

        {/* Name + account */}
        <div className="min-w-0 flex-1 pr-2">
          <p className="text-sm font-semibold text-gray-900 leading-tight truncate group-hover:text-[var(--ceb-maroon)] transition-colors duration-200">
            {item.name}
          </p>
          <p className="text-xs text-gray-500 font-medium mt-0.5 truncate flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
            {item.accountNumber}
          </p>
        </div>

        {/* kWh value */}
        <div className="flex flex-col items-end min-w-[80px]">
          <p className="text-[15px] font-bold text-gray-900 leading-none tracking-tight">
            {formatCompact(item.kwh)}
          </p>
          <p className="text-[11px] text-gray-400 font-semibold uppercase mt-1">kWh</p>
        </div>
      </div>

      {/* Progress bar */}
      <div
        className="mt-3 h-1.5 rounded-full bg-gray-100 overflow-hidden"
        style={{ marginLeft: 56 }}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-[var(--ceb-maroon)] to-rose-500 transition-[width] duration-1000 ease-out"
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
}) => {
  const [expanded, setExpanded] = useState(false);

  const maxKwh = Math.max(...items.map((item) => item.kwh), 1);
  const visibleItems = expanded ? items : items.slice(0, VISIBLE_LIMIT);
  const hasMore = items.length > VISIBLE_LIMIT;

  return (
    <div className="bg-white rounded-[20px] p-6 border border-gray-100/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.06)] transition-shadow duration-300 h-full flex flex-col relative overflow-hidden">
      {/* Decorative background blur */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-rose-50 to-transparent opacity-60 pointer-events-none" />

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div>
          <h3 className="text-[15px] font-bold text-gray-900 tracking-tight">Top Customers</h3>
          <p className="text-[13px] text-gray-500 font-medium mt-1">
            Highest consumption this cycle
          </p>
        </div>
        <div className="bg-rose-50 text-[var(--ceb-maroon)] px-2.5 py-1 rounded-md text-[11px] font-bold tracking-widest uppercase">
          Rank
        </div>
      </div>

      {/* ── Customer list ── */}
      <div className="flex-1 overflow-hidden flex flex-col relative z-10">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-400 font-medium animate-pulse">
            Loading top customers...
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center text-sm text-rose-500 font-medium text-center px-6">
            {error}
          </div>
        ) : items.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-400 font-medium text-center px-6">
            No top customer data available.
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-1 pr-2 scrollbar-thin scrollbar-thumb-gray-200">
            {visibleItems.map((item, index) => (
              <CustomerRow
                key={`${item.accountNumber}-${index}`}
                item={item}
                widthPercent={Math.max(8, (item.kwh / maxKwh) * 100)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      {!loading && !error && items.length > 0 && (
        <div className="pt-4 mt-2 border-t border-gray-100/80 flex justify-center relative z-10">
          {hasMore ? (
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="text-[var(--ceb-maroon)] font-semibold text-[13px] hover:text-rose-700 transition-colors px-4 py-2 rounded-lg hover:bg-rose-50/50"
            >
              {expanded
                ? "Collapse List"
                : `View All Customers (${items.length})`}
            </button>
          ) : (
            <span className="text-[12px] font-medium text-gray-400 bg-gray-50 px-3 py-1 rounded-full">All customers shown</span>
          )}
        </div>
      )}
    </div>
  );
};

export default TopCustomersList;