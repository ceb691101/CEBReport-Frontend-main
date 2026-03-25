import React, { useRef } from "react";
import { useInView } from "./hooks/useInView";

interface RegionBarProps {
  region: string;
  value: number;
  delay?: number;
}

const RegionBar: React.FC<RegionBarProps> = ({ region, value, delay = 0 }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { inView } = useInView(ref as React.RefObject<Element>, { threshold: 0.15 });

  const barColor =
    value >= 80 ? "#16a34a" : value >= 65 ? "#2563eb" : value >= 50 ? "#d97706" : "#dc2626";

  return (
    <div ref={ref}>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600">{region}</span>
        <span className="font-medium">
          <span style={{ color: barColor }}>{value}%</span>
          <span className="text-gray-400 mx-1">/</span>
          <span className="text-gray-500">100%</span>
        </span>
      </div>

      <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
        <div
          style={{
            height: "100%",
            borderRadius: "9999px",
            backgroundColor: barColor,
            width: inView ? `${value}%` : "0%",
            transition: inView
              ? `width 0.9s cubic-bezier(0.4,0,0.2,1) ${delay}ms`
              : "none",
          }}
        />
      </div>
    </div>
  );
};

export default RegionBar;
