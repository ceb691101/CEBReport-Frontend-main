import React, { useEffect, useRef, useState } from "react";
import { useInView } from "./hooks/useInView";

interface DrawingLineChartProps {
  data: { month: string; ordinary: number; bulk: number }[];
  formatCompact: (n: number) => string;
  chartKey: number;
}

const DrawingLineChart: React.FC<DrawingLineChartProps> = ({
  data,
  formatCompact,
  chartKey,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    month: string;
    ordinary: number;
    bulk: number;
  } | null>(null);
  const [animate, setAnimate] = useState(false);

  const { triggerCount } = useInView(containerRef as React.RefObject<Element>, {
    threshold: 0.3,
  });

  const width = 480;
  const height = 230;
  const padL = 60;
  const padR = 16;
  const padT = 16;
  const padB = 38;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;

  const allValues = data.flatMap((item) => [item.ordinary, item.bulk]).filter(Boolean);
  const minValue = 0;
  const maxValue = allValues.length ? Math.max(...allValues) * 1.1 : 1;

  const xOf = (index: number) => padL + (index / Math.max(data.length - 1, 1)) * chartW;
  const yOf = (value: number) =>
    padT + chartH - ((value - minValue) / (maxValue - minValue)) * chartH;

  const toPolyline = (key: "ordinary" | "bulk") =>
    data.map((item, index) => `${xOf(index)},${yOf(item[key])}`).join(" ");

  const polylineLength = (points: string) => {
    const pointPairs = points.split(" ").map((point) => point.split(",").map(Number));
    let length = 0;

    for (let index = 1; index < pointPairs.length; index++) {
      const dx = pointPairs[index][0] - pointPairs[index - 1][0];
      const dy = pointPairs[index][1] - pointPairs[index - 1][1];
      length += Math.sqrt(dx * dx + dy * dy);
    }

    return length;
  };

  const ordinaryPoints = data.length >= 2 ? toPolyline("ordinary") : "";
  const bulkPoints = data.length >= 2 ? toPolyline("bulk") : "";
  const ordinaryLength = ordinaryPoints ? polylineLength(ordinaryPoints) : 0;
  const bulkLength = bulkPoints ? polylineLength(bulkPoints) : 0;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((fraction) => ({
    val: minValue + fraction * (maxValue - minValue),
    y: padT + chartH - fraction * chartH,
  }));

  useEffect(() => {
    setAnimate(false);
    const timeoutId = setTimeout(() => setAnimate(true), 60);
    return () => clearTimeout(timeoutId);
  }, [chartKey, triggerCount]);

  const handleMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || !data.length) return;

    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = width / rect.width;
    const mouseX = (event.clientX - rect.left) * scaleX - padL;
    const step = chartW / Math.max(data.length - 1, 1);
    const index = Math.max(0, Math.min(data.length - 1, Math.round(mouseX / step)));
    const datum = data[index];

    setTooltip({
      x: xOf(index),
      y: Math.min(yOf(datum.ordinary), yOf(datum.bulk)) - 8,
      month: datum.month,
      ordinary: datum.ordinary,
      bulk: datum.bulk,
    });
  };

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%", userSelect: "none" }}>
      <div style={{ display: "flex", gap: 20, marginBottom: 8, paddingLeft: padL }}>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            fontWeight: 500,
            color: "#374151",
          }}
        >
          <svg width="20" height="4">
            <line x1="0" y1="2" x2="20" y2="2" stroke="var(--ceb-maroon)" strokeWidth="2.5" />
          </svg>
          Ordinary
        </span>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            fontWeight: 500,
            color: "#374151",
          }}
        >
          <svg width="20" height="4">
            <line x1="0" y1="2" x2="20" y2="2" stroke="var(--ceb-gold)" strokeWidth="2.5" />
          </svg>
          Bulk
        </span>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: "100%", height: "auto", overflow: "visible" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
      >
        <defs>
          <style>{`
            @keyframes drawLine {
              from { stroke-dashoffset: var(--line-len); }
              to   { stroke-dashoffset: 0; }
            }
            .draw-ordinary {
              stroke-dasharray: ${ordinaryLength};
              stroke-dashoffset: ${ordinaryLength};
              animation: ${animate
                ? "drawLine 1.6s cubic-bezier(0.4,0,0.2,1) forwards"
                : "none"};
            }
            .draw-bulk {
              stroke-dasharray: ${bulkLength};
              stroke-dashoffset: ${bulkLength};
              animation: ${animate
                ? "drawLine 1.6s cubic-bezier(0.4,0,0.2,1) 0.4s forwards"
                : "none"};
            }
          `}</style>
        </defs>

        {yTicks.map((tick, index) => (
          <line
            key={index}
            x1={padL}
            y1={tick.y}
            x2={width - padR}
            y2={tick.y}
            stroke="#eef2f7"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        ))}

        {yTicks.map((tick, index) => (
          <text
            key={index}
            x={padL - 8}
            y={tick.y + 4}
            textAnchor="end"
            fontSize="12"
            fontWeight="500"
            fill="#374151"
          >
            {formatCompact(tick.val)}
          </text>
        ))}

        {data.map((datum, index) => (
          <text
            key={index}
            x={xOf(index)}
            y={height - 2}
            textAnchor="middle"
            fontSize="12"
            fontWeight="500"
            fill="#374151"
          >
            {datum.month}
          </text>
        ))}

        {ordinaryPoints && (
          <polyline
            points={ordinaryPoints}
            fill="none"
            stroke="var(--ceb-maroon)"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            className="draw-ordinary"
            style={{ "--line-len": `${ordinaryLength}` } as React.CSSProperties}
          />
        )}

        {bulkPoints && (
          <polyline
            points={bulkPoints}
            fill="none"
            stroke="var(--ceb-gold)"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            className="draw-bulk"
            style={{ "--line-len": `${bulkLength}` } as React.CSSProperties}
          />
        )}

        {tooltip &&
          data.map((datum, index) => (
            <g key={index}>
              {xOf(index) === tooltip.x && (
                <>
                  <circle cx={xOf(index)} cy={yOf(datum.ordinary)} r="5" fill="var(--ceb-maroon)" stroke="#fff" strokeWidth="2" />
                  <circle cx={xOf(index)} cy={yOf(datum.bulk)} r="5" fill="var(--ceb-gold)" stroke="#fff" strokeWidth="2" />
                  <line
                    x1={xOf(index)}
                    y1={padT}
                    x2={xOf(index)}
                    y2={padT + chartH}
                    stroke="#e5e7eb"
                    strokeWidth="1"
                    strokeDasharray="4 2"
                  />
                </>
              )}
            </g>
          ))}

        {tooltip && (() => {
          const boxX = Math.min(tooltip.x - 2, width - padR - 130);
          const boxY = Math.max(padT, tooltip.y - 60);

          return (
            <g>
              <rect x={boxX} y={boxY} width="128" height="58" rx="6" fill="#1f2937" opacity="0.93" />
              <text x={boxX + 10} y={boxY + 16} fontSize="11" fontWeight="600" fill="#f9fafb">
                {tooltip.month}
              </text>
              <circle cx={boxX + 10} cy={boxY + 30} r="4" fill="var(--ceb-maroon)" />
              <text x={boxX + 20} y={boxY + 34} fontSize="10" fill="#d1d5db">
                Ordinary:
              </text>
              <text x={boxX + 72} y={boxY + 34} fontSize="10" fill="#f9fafb" fontWeight="500">
                {formatCompact(tooltip.ordinary)}
              </text>
              <circle cx={boxX + 10} cy={boxY + 46} r="4" fill="var(--ceb-gold)" />
              <text x={boxX + 20} y={boxY + 50} fontSize="10" fill="#d1d5db">
                Bulk:
              </text>
              <text x={boxX + 55} y={boxY + 50} fontSize="10" fill="#f9fafb" fontWeight="500">
                {formatCompact(tooltip.bulk)}
              </text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
};

export default DrawingLineChart;
