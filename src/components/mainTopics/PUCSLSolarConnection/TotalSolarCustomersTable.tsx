import React from "react";
import { OrdinaryData, BulkData, TotalSolarCustomersResponse } from "./pucslTypes.ts";
import { formatNumber } from "./pucslUtils.ts";

interface Props {
    data: TotalSolarCustomersResponse;
}

const thBase = "border border-gray-300 px-2 py-1 text-center";
const tdBase = "border border-gray-300 px-2 py-1";
const tdRight = "border border-gray-300 px-2 py-1 text-right";

// ── Ordinary Table ─────────────────────────────────────────────────────────────
// Header structure (matches screenshot exactly):
//   Tariff Category | Net Metering | Net Metering (kWh) | Net Accounting | Net Accounting (kWh) | Net Plus | Net Plus (kWh) | Net Plus Plus | Net Plus Plus (kWh)

const OrdinaryTable: React.FC<{ rows: OrdinaryData[]; total: OrdinaryData }> = ({ rows, total }) => (
    <>
        <p className="text-sm font-bold mt-4 mb-2">Ordinary</p>
        <table className="w-full border-collapse text-xs">
            <thead className="bg-gray-200 sticky top-0">
                <tr>
                    <th className={thBase}>Tariff Category</th>
                    <th className={thBase}>Net Metering</th>
                    <th className={thBase}>Net Metering (kWh)</th>
                    <th className={thBase}>Net Accounting</th>
                    <th className={thBase}>Net Accounting (kWh)</th>
                    <th className={thBase}>Net Plus</th>
                    <th className={thBase}>Net Plus (kWh)</th>
                    <th className={thBase}>Net Plus Plus</th>
                    <th className={thBase}>Net Plus Plus (kWh)</th>
                </tr>
            </thead>
            <tbody>
                {rows.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className={`${tdBase} font-medium`}>{row.TariffCategory}</td>
                        <td className={tdRight}>{row.NetMeteringCustomers.toLocaleString("en-US")}</td>
                        <td className={tdRight}>{formatNumber(row.NetMeteringUnits, 0)}</td>
                        <td className={tdRight}>{row.NetAccountingCustomers.toLocaleString("en-US")}</td>
                        <td className={tdRight}>{formatNumber(row.NetAccountingUnits, 0)}</td>
                        <td className={tdRight}>{row.NetPlusCustomers.toLocaleString("en-US")}</td>
                        <td className={tdRight}>{formatNumber(row.NetPlusUnits, 0)}</td>
                        <td className={tdRight}>{row.NetPlusPlusCustomers.toLocaleString("en-US")}</td>
                        <td className={tdRight}>{formatNumber(row.NetPlusPlusUnits, 0)}</td>
                    </tr>
                ))}
            </tbody>
            <tfoot>
                <tr className="bg-gray-200">
                    <td className={`${tdBase} font-bold`}>Total</td>
                    <td className={`${tdRight} font-bold`}>{total.NetMeteringCustomers.toLocaleString("en-US")}</td>
                    <td className={`${tdRight} font-bold`}>{formatNumber(total.NetMeteringUnits, 0)}</td>
                    <td className={`${tdRight} font-bold`}>{total.NetAccountingCustomers.toLocaleString("en-US")}</td>
                    <td className={`${tdRight} font-bold`}>{formatNumber(total.NetAccountingUnits, 0)}</td>
                    <td className={`${tdRight} font-bold`}>{total.NetPlusCustomers.toLocaleString("en-US")}</td>
                    <td className={`${tdRight} font-bold`}>{formatNumber(total.NetPlusUnits, 0)}</td>
                    <td className={`${tdRight} font-bold`}>{total.NetPlusPlusCustomers.toLocaleString("en-US")}</td>
                    <td className={`${tdRight} font-bold`}>{formatNumber(total.NetPlusPlusUnits, 0)}</td>
                </tr>
            </tfoot>
        </table>
    </>
);

// ── Bulk Table ─────────────────────────────────────────────────────────────────
// Header structure (matches screenshot exactly):
//   Tariff Category | Net Metering | Units Day (kWh) | Net Accounting | Units Day (kWh) | Net Plus | Units Day (kWh) | Net Plus Plus | Units Day (kWh)

const BulkTable: React.FC<{ rows: BulkData[]; total: BulkData }> = ({ rows, total }) => (
    <>
        <p className="text-sm font-bold mt-8 mb-2">Bulk</p>
        <table className="w-full border-collapse text-xs">
            <thead className="bg-gray-200 sticky top-0">
                <tr>
                    <th className={thBase}>Tariff Category</th>
                    <th className={thBase}>Net Metering</th>
                    <th className={thBase}>Units Day (kWh)</th>
                    <th className={thBase}>Net Accounting</th>
                    <th className={thBase}>Units Day (kWh)</th>
                    <th className={thBase}>Net Plus</th>
                    <th className={thBase}>Units Day (kWh)</th>
                    <th className={thBase}>Net Plus Plus</th>
                    <th className={thBase}>Units Day (kWh)</th>
                </tr>
            </thead>
            <tbody>
                {rows.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className={`${tdBase} font-medium`}>{row.TariffCategory}</td>
                        <td className={tdRight}>{row.NetMeteringCustomers.toLocaleString("en-US")}</td>
                        <td className={tdRight}>{formatNumber(row.NetMeteringUnits, 0)}</td>
                        <td className={tdRight}>{row.NetAccountingCustomers.toLocaleString("en-US")}</td>
                        <td className={tdRight}>{formatNumber(row.NetAccountingUnits, 0)}</td>
                        <td className={tdRight}>{row.NetPlusCustomers.toLocaleString("en-US")}</td>
                        <td className={tdRight}>{formatNumber(row.NetPlusUnits, 0)}</td>
                        <td className={tdRight}>{row.NetPlusPlusCustomers.toLocaleString("en-US")}</td>
                        <td className={tdRight}>{formatNumber(row.NetPlusPlusUnits, 0)}</td>
                    </tr>
                ))}
            </tbody>
            <tfoot>
                <tr className="bg-gray-200">
                    <td className={`${tdBase} font-bold`}>Total</td>
                    <td className={`${tdRight} font-bold`}>{total.NetMeteringCustomers.toLocaleString("en-US")}</td>
                    <td className={`${tdRight} font-bold`}>{formatNumber(total.NetMeteringUnits, 0)}</td>
                    <td className={`${tdRight} font-bold`}>{total.NetAccountingCustomers.toLocaleString("en-US")}</td>
                    <td className={`${tdRight} font-bold`}>{formatNumber(total.NetAccountingUnits, 0)}</td>
                    <td className={`${tdRight} font-bold`}>{total.NetPlusCustomers.toLocaleString("en-US")}</td>
                    <td className={`${tdRight} font-bold`}>{formatNumber(total.NetPlusUnits, 0)}</td>
                    <td className={`${tdRight} font-bold`}>{total.NetPlusPlusCustomers.toLocaleString("en-US")}</td>
                    <td className={`${tdRight} font-bold`}>{formatNumber(total.NetPlusPlusUnits, 0)}</td>
                </tr>
            </tfoot>
        </table>
    </>
);

// ── Main export ───────────────────────────────────────────────────────────────

const TotalSolarCustomersTable: React.FC<Props> = ({ data }) => {
    if (!data.Ordinary?.length && !data.Bulk?.length) {
        return <div className="text-center py-8 text-gray-500">No data available</div>;
    }
    return (
        <div>
            {data.Ordinary?.length > 0 && data.OrdinaryTotal && (
                <OrdinaryTable rows={data.Ordinary} total={data.OrdinaryTotal} />
            )}
            {data.Bulk?.length > 0 && data.BulkTotal && (
                <BulkTable rows={data.Bulk} total={data.BulkTotal} />
            )}
        </div>
    );
};

export default TotalSolarCustomersTable;