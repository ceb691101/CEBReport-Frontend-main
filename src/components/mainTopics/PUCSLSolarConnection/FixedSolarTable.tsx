import React from "react";
import { FixedSolarDataModel } from "./pucslTypes.ts";
import { formatNumber } from "./pucslUtils.ts";

interface Props {
    data: FixedSolarDataModel[];
}

const FixedSolarTable: React.FC<Props> = ({ data }) => {
    if (!data.length) {
        return <div className="text-center py-8 text-gray-500">No data available</div>;
    }

    const th = "border border-gray-300 px-2 py-1 text-center";
    const td = "border border-gray-300 px-2 py-1";

    return (
        <table className="w-full border-collapse text-xs">
            <thead className="bg-gray-200 sticky top-0">
                <tr>
                    <th className={th}>Tariff Category</th>
                    <th className={th}>Year</th>
                    <th className={th}>Month</th>
                    <th className={th}>No of Customers</th>
                    <th className={th}>kWh Purchased at 15.50</th>
                    <th className={th}>kWh Purchased at 22.00</th>
                    <th className={th}>kWh Purchased at 34.50</th>
                    <th className={th}>kWh Purchased at 37.00</th>
                    <th className={th}>kWh Purchased at 23.18</th>
                    <th className={th}>kWh Purchased at 27.06</th>
                    <th className={th}>kWh Others</th>
                    <th className={th}>Paid Amount (Rs.)</th>
                </tr>
            </thead>
            <tbody>
                {data.map((item, index) => (
                    <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className={`${td} font-medium`}>{item.Category}</td>
                        <td className={`${td} text-right whitespace-nowrap`}>{item.Year}</td>
                        <td className={`${td} text-right whitespace-nowrap`}>{item.Month}</td>
                        <td className={`${td} text-right`}>{item.NoOfCustomers.toLocaleString("en-US")}</td>
                        <td className={`${td} text-right`}>{formatNumber(item.KwhAt1550)}</td>
                        <td className={`${td} text-right`}>{formatNumber(item.KwhAt22)}</td>
                        <td className={`${td} text-right`}>{formatNumber(item.KwhAt3450)}</td>
                        <td className={`${td} text-right`}>{formatNumber(item.KwhAt37)}</td>
                        <td className={`${td} text-right`}>{formatNumber(item.KwhAt2318)}</td>
                        <td className={`${td} text-right`}>{formatNumber(item.KwhAt2706)}</td>
                        <td className={`${td} text-right`}>{formatNumber(item.KwhOthers)}</td>
                        <td className={`${td} text-right font-medium`}>{formatNumber(item.PaidAmount)}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

export default FixedSolarTable;