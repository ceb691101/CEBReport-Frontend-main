import React from "react";
import { NetMeteringData, NetMeteringResponse } from "./pucslTypes.ts";
import { formatNumber } from "./pucslUtils.ts";

interface Props {
    data: NetMeteringResponse;
}

const thBase = "border border-gray-300 px-2 py-1 text-center whitespace-nowrap";
const tdBase = "border border-gray-300 px-2 py-1";
const tdRight = "border border-gray-300 px-2 py-1 text-right";

const NetMeteringTable: React.FC<Props> = ({ data }) => {
    if (!data.Data?.length) {
        return <div className="text-center py-8 text-gray-500">No data available</div>;
    }

    return (
        <table className="w-full border-collapse text-xs">
            <thead className="bg-gray-200 sticky top-0">
                <tr>
                    <th className={thBase}>Tariff Category</th>
                    <th className={thBase}>Year</th>
                    <th className={thBase}>Month</th>
                    <th className={thBase}>No of Consumers</th>
                    <th className={thBase}>Units Day (kWh)</th>
                </tr>
            </thead>
            <tbody>
                {data.Data.map((row: NetMeteringData, i: number) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className={`${tdBase} font-medium`}>{row.Category}</td>
                        <td className={tdRight}>{row.Year}</td>
                        <td className={tdRight}>{row.Month}</td>
                        <td className={tdRight}>{row.NoOfCustomers.toLocaleString("en-US")}</td>
                        <td className={tdRight}>{formatNumber(row.UnitsDayKwh, 0)}</td>
                    </tr>
                ))}
            </tbody>
            {/* {data.Total && (
                <tfoot>
                    <tr className="bg-gray-200">
                        <td className={tdBase} colSpan={2}></td>
                        <td className={`${tdBase} font-bold`}>Total</td>
                        <td className={`${tdRight} font-bold`}>{data.Total.NoOfCustomers.toLocaleString("en-US")}</td>
                        <td className={`${tdRight} font-bold`}>{formatNumber(data.Total.UnitsDayKwh, 0)}</td>
                    </tr>
                </tfoot>
            )} */}
        </table>
    );
};

export default NetMeteringTable;