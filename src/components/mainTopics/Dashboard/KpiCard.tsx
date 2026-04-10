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
        "relative bg-white rounded-2xl p-6 shadow-sm border transition-all duration-150 select-none group",
        isDragging ? "opacity-40 scale-95 border-blue-300 shadow-none" : "opacity-100 scale-100",
        isDragOver ? "border-blue-500 ring-2 ring-blue-300 shadow-md" : "border-gray-100",
      ].join(" ")}
      style={{ cursor: isDragging ? "grabbing" : "grab" }}
    >
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-40 transition-opacity">
        <svg width="12" height="16" viewBox="0 0 12 16" fill="#6b7280">
          <circle cx="3" cy="3" r="1.5" />
          <circle cx="9" cy="3" r="1.5" />
          <circle cx="3" cy="8" r="1.5" />
          <circle cx="9" cy="8" r="1.5" />
          <circle cx="3" cy="13" r="1.5" />
          <circle cx="9" cy="13" r="1.5" />
        </svg>
      </div>

      <div className="flex items-center justify-end mb-2">
        <div className={`p-2 ${iconBgClass} rounded-lg`}>{icon}</div>
      </div>

      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>

      {details ? <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">{details}</div> : null}
      {subtitle ? <p className="text-xs text-gray-500 mt-2">{subtitle}</p> : null}
    </div>
  );
};

export default KpiCard;
