import React from "react";
import { RawSolarData, RawDataForSolarResponse } from "./pucslTypes.ts";
import { formatNumber } from "./pucslUtils.ts";

interface Props {
    data: RawDataForSolarResponse;
}

const thBase = "border border-gray-300 px-2 py-1 text-center";
const tdBase = "border border-gray-300 px-2 py-1";
const tdRight = "border border-gray-300 px-2 py-1 text-right";

// ── Shared table structure ────────────────────────────────────────────────────
// Header (3 rows matching screenshot):
//   Row 1: Category | Year | Month | Import (×3) | Export (×3) | Brought Forward kWh | Carry Forward kWh
//   Row 2: (blank)  | ...  | ...   | Day | Peak | Off Peak | Day | Peak | Off Peak | (blank) | (blank)
//
// Ordinary: Peak/OffPeak always 0 — shown as blank
// Net Metering only: BroughtForward/CarryForward populated

const fmt = (v: number) => v === 0 ? "" : formatNumber(v, 0);

const RawSolarTable: React.FC<{
    rows: RawSolarData[];
    total: RawSolarData;
    label: string;
}> = ({ rows, total, label }) => (
    <>
        <p className="text-sm font-bold mt-4 mb-2">{label}</p>
        <table className="w-full border-collapse text-xs">
            <thead className="bg-gray-200 sticky top-0">
                {/* Row 1 — group headers */}
                <tr>
                    <th className={thBase} rowSpan={2}>Tariff Category</th>
                    <th className={thBase} rowSpan={2}>Year</th>
                    <th className={thBase} rowSpan={2}>Month</th>
                    <th className={thBase} colSpan={3}>Import</th>
                    <th className={thBase} colSpan={3}>Export</th>
                    <th className={thBase} rowSpan={2}>
                        Brought Forward kWh{"\n"}(Only in Net Metering)
                    </th>
                    <th className={thBase} rowSpan={2}>
                        Carry Forward kWh{"\n"}(Only in Net Metering)
                    </th>
                </tr>
                {/* Row 2 — sub-headers */}
                <tr>
                    <th className={thBase}>Day</th>
                    <th className={thBase}>Peak</th>
                    <th className={thBase}>Off Peak</th>
                    <th className={thBase}>Day</th>
                    <th className={thBase}>Peak</th>
                    <th className={thBase}>Off Peak</th>
                </tr>
            </thead>
            <tbody>
                {rows.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className={`${tdBase} font-medium`}>{row.Category}</td>
                        <td className={tdRight}>{row.Year}</td>
                        <td className={tdRight}>{row.Month}</td>
                        <td className={tdRight}>{fmt(row.ImportDay)}</td>
                        <td className={tdRight}>{fmt(row.ImportPeak)}</td>
                        <td className={tdRight}>{fmt(row.ImportOffPeak)}</td>
                        <td className={tdRight}>{fmt(row.ExportDay)}</td>
                        <td className={tdRight}>{fmt(row.ExportPeak)}</td>
                        <td className={tdRight}>{fmt(row.ExportOffPeak)}</td>
                        <td className={tdRight}>{fmt(row.BroughtForwardKwh)}</td>
                        <td className={tdRight}>{fmt(row.CarryForwardKwh)}</td>
                    </tr>
                ))}
            </tbody>
            <tfoot>
                <tr className="bg-gray-200">
                    <td className={tdBase} colSpan={2}></td>
                    <td className={`${tdBase} font-bold`}>Total</td>
                    <td className={`${tdRight} font-bold`}>{fmt(total.ImportDay)}</td>
                    <td className={`${tdRight} font-bold`}>{fmt(total.ImportPeak)}</td>
                    <td className={`${tdRight} font-bold`}>{fmt(total.ImportOffPeak)}</td>
                    <td className={`${tdRight} font-bold`}>{fmt(total.ExportDay)}</td>
                    <td className={`${tdRight} font-bold`}>{fmt(total.ExportPeak)}</td>
                    <td className={`${tdRight} font-bold`}>{fmt(total.ExportOffPeak)}</td>
                    <td className={`${tdRight} font-bold`}>{fmt(total.BroughtForwardKwh)}</td>
                    <td className={`${tdRight} font-bold`}>{fmt(total.CarryForwardKwh)}</td>
                </tr>
            </tfoot>
        </table>
    </>
);

// ── Main export ───────────────────────────────────────────────────────────────

const RawDataForSolarTable: React.FC<Props> = ({ data }) => {
    if (!data.Ordinary?.length && !data.Bulk?.length) {
        return <div className="text-center py-8 text-gray-500">No data available</div>;
    }
    return (
        <div>
            {data.Ordinary?.length > 0 && data.OrdinaryTotal && (
                <RawSolarTable rows={data.Ordinary} total={data.OrdinaryTotal} label="Ordinary" />
            )}
            {data.Bulk?.length > 0 && data.BulkTotal && (
                <RawSolarTable rows={data.Bulk} total={data.BulkTotal} label="Bulk" />
            )}
        </div>
    );
};

export default RawDataForSolarTable;