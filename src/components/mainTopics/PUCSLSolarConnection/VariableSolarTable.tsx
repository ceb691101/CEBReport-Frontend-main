import React from "react";
import { VariableSolarDataModel } from "./pucslTypes.ts";
import { formatNumber } from "./pucslUtils.ts";

interface Props {
    data: VariableSolarDataModel[];
}

const CAPACITY_GROUPS = [
    "0 < x \u2264 20 (Capacity x in kW)",
    "20 < x \u2264 100 (Capacity x in kW)",
    "100 < x \u2264 500 (Capacity x in kW)",
    "x > 500 (Capacity x in kW)",
    "Aggregator Scheme",
];

const VariableSolarTable: React.FC<Props> = ({ data }) => {
    if (!data.length) {
        return <div className="text-center py-8 text-gray-500">No data available</div>;
    }

    const th = "border border-gray-300 px-2 py-1 text-center";
    const td = "border border-gray-300 px-2 py-1 text-right";

    return (
        <table className="w-full border-collapse text-xs">
            <thead className="bg-gray-200 sticky top-0">
                {/* Row 1 — capacity range group headers */}
                <tr>
                    <th className={th} rowSpan={2}>Tariff Category</th>
                    <th className={th} rowSpan={2}>Year</th>
                    <th className={th} rowSpan={2}>Month</th>
                    {CAPACITY_GROUPS.map((label) => (
                        <th key={label} className={th} colSpan={3}>{label}</th>
                    ))}
                </tr>
                {/* Row 2 — sub-headers per group */}
                <tr>
                    {CAPACITY_GROUPS.map((label) => (
                        <React.Fragment key={label}>
                            <th className={th}>No of Consumers</th>
                            <th className={th}>kWh Units Purchased</th>
                            <th className={th}>Paid Amount LKR</th>
                        </React.Fragment>
                    ))}
                </tr>
            </thead>
            <tbody>
                {data.map((item, index) => (
                    <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="border border-gray-300 px-2 py-1 font-medium">{item.Category}</td>
                        <td className={`${td} whitespace-nowrap`}>{item.Year}</td>
                        <td className={`${td} whitespace-nowrap`}>{item.Month}</td>
                        {/* 0–20 kW */}
                        <td className={td}>{item.NoOfCustomers0To20.toLocaleString("en-US")}</td>
                        <td className={td}>{formatNumber(item.KwhUnits0To20)}</td>
                        <td className={td}>{formatNumber(item.PaidAmount0To20)}</td>
                        {/* 20–100 kW */}
                        <td className={td}>{item.NoOfCustomers20To100.toLocaleString("en-US")}</td>
                        <td className={td}>{formatNumber(item.KwhUnits20To100)}</td>
                        <td className={td}>{formatNumber(item.PaidAmount20To100)}</td>
                        {/* 100–500 kW */}
                        <td className={td}>{item.NoOfCustomers100To500.toLocaleString("en-US")}</td>
                        <td className={td}>{formatNumber(item.KwhUnits100To500)}</td>
                        <td className={td}>{formatNumber(item.PaidAmount100To500)}</td>
                        {/* >500 kW */}
                        <td className={td}>{item.NoOfCustomersAbove500.toLocaleString("en-US")}</td>
                        <td className={td}>{formatNumber(item.KwhUnitsAbove500)}</td>
                        <td className={td}>{formatNumber(item.PaidAmountAbove500)}</td>
                        {/* Aggregator */}
                        <td className={td}>{item.NoOfCustomersAggregator.toLocaleString("en-US")}</td>
                        <td className={td}>{formatNumber(item.KwhUnitsAggregator)}</td>
                        <td className={td}>{formatNumber(item.PaidAmountAggregator)}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

export default VariableSolarTable;