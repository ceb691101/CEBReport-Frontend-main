import React from "react";

interface KpiCardProps {
  cardId: string;
  title: string;
  value: React.ReactNode;
  subtitle?: React.ReactNode;
  details?: React.ReactNode;
  icon: React.ReactNode;
  iconBgClass: string;
  isDragging: boolean;
  isDragOver: boolean;
  onDragStart: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragEnter: () => void;
  onDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
}

const KpiCard: React.FC<KpiCardProps> = ({
  cardId,
  title,
  value,
  subtitle,
  details,
  icon,
  iconBgClass,
  isDragging,
  isDragOver,
  onDragStart,
  onDragEnter,
  onDragOver,
  onDragEnd,
}) => {
  return (
    <div
      key={cardId}
      draggable
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      className={[
        "relative bg-white rounded-[20px] p-6 border transition-all duration-300 select-none group flex flex-col justify-between overflow-hidden",
        "shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)] hover:-translate-y-1 hover:border-[var(--ceb-maroon)]/30",
        isDragging ? "opacity-40 scale-95 border-blue-300 shadow-none" : "opacity-100 scale-100",
        isDragOver ? "border-blue-500 ring-4 ring-blue-50" : "border-gray-100/80",
      ].join(" ")}
      style={{ cursor: isDragging ? "grabbing" : "grab" }}
    >
      {/* Decorative subtle background blob */}
      <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-gradient-to-br from-gray-50 to-gray-100/50 opacity-50 blur-xl pointer-events-none transition-all duration-700 ease-out group-hover:scale-[2.5] group-hover:from-[var(--ceb-maroon)]/10 group-hover:to-rose-500/5" />

      {/* Drag Handle (Visible on hover) */}
      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-30 transition-opacity p-1 cursor-grab active:cursor-grabbing">
        <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor" className="text-gray-400">
          <circle cx="3" cy="3" r="1.5" />
          <circle cx="9" cy="3" r="1.5" />
          <circle cx="3" cy="8" r="1.5" />
          <circle cx="9" cy="8" r="1.5" />
          <circle cx="3" cy="13" r="1.5" />
          <circle cx="9" cy="13" r="1.5" />
        </svg>
      </div>

      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2.5 rounded-xl flex items-center justify-center ${iconBgClass} shadow-sm backdrop-blur-sm transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3`}>
            {icon}
          </div>
          <h3 className="text-[13px] font-semibold text-gray-500 tracking-wide uppercase mt-0.5 group-hover:text-gray-700 transition-colors duration-300">
            {title}
          </h3>
        </div>

        <div className="mb-1 relative z-10">
          <p className="text-[28px] font-bold text-gray-900 tracking-tight leading-none group-hover:text-[var(--ceb-maroon)] transition-colors duration-300">
            {value}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 relative z-10">
        {details && (
          <div className="flex items-center gap-2 flex-wrap text-xs text-gray-600 font-medium">
            {React.Children.map(details, (child, i) => (
              <React.Fragment key={i}>
                <span className="bg-gray-50/80 px-2 py-1 rounded-md border border-gray-100 text-gray-600">
                  {child}
                </span>
              </React.Fragment>
            ))}
          </div>
        )}
        {subtitle && (
          <p className="text-[13px] text-gray-400 font-medium">{subtitle}</p>
        )}
      </div>
    </div>
  );
};

export default KpiCard;
