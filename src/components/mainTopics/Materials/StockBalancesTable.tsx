import React from "react";
import { FaPrint, FaDownload } from "react-icons/fa";
import ReportTable from "../../shared/ReportTable";

interface StockBalance {
  Region: string;
  Province: string;
  DeptId: string;
  MatNm: string;
  GradeCd?: string;
  UnitPrice?: number;
  QtyOnHand?: number;
  CommittedCost?: number;
  ReorderQty?: number;
  UomCd: string;
}

interface StockBalancesTableProps {
  matCd: string | undefined;
  stockBalances: StockBalance[];
  printPDF: () => void;
  downloadAsCSV: () => void;
  onBackToHome: () => void;
}

const StockBalancesTable: React.FC<StockBalancesTableProps> = ({ matCd, stockBalances, printPDF, downloadAsCSV, onBackToHome }) => {
  // Format numbers with commas and 2 decimal places
  const formatNumber = (value: number | undefined): string => {
    if (typeof value === "number") {
      return value.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    return "-";
  };

  // Transform data with formatted numbers for display
  const formattedStockBalances = stockBalances.map(row => ({
    ...row,
    QtyOnHand: formatNumber(row.QtyOnHand),
    CommittedCost: formatNumber(row.CommittedCost),
    ReorderQty: formatNumber(row.ReorderQty),
  }));

  return (
    <div className="mb-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
        <div className="px-2 sm:px-4 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2">
            <h3 className="text-[12px] sm:text-[13px] font-semibold text-gray-700">
              Stock Balances Of - {matCd}
            </h3>
            <div className="flex gap-2">
              <button
                onClick={downloadAsCSV}
                className="flex items-center gap-1 px-3 py-1.5 border border-blue-400 text-blue-700 bg-white rounded-md text-[11px] font-medium shadow-sm hover:bg-blue-50 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
              >
                <FaDownload className="w-3 h-3" /> CSV
              </button>
              <button
                onClick={printPDF}
                className="flex items-center gap-1 px-3 py-1.5 border border-green-400 text-green-700 bg-white rounded-md text-[11px] font-medium shadow-sm hover:bg-green-50 hover:text-green-800 focus:outline-none focus:ring-2 focus:ring-green-200 transition"
              >
                <FaPrint className="w-3 h-3" /> PDF
              </button>
              <button
                onClick={onBackToHome}
                className="px-3 py-1.5 text-[11px] bg-[#7A0000] text-white rounded-md font-medium shadow-sm hover:bg-[#A52A2A] transition"
              >
                Back to Home
              </button>
            </div>
          </div>
          {stockBalances.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[11px]">
              <div className="flex">
                <div className="text-gray-500 font-semibold mr-2">Material Name:</div>
                <div className="text-gray-700">{stockBalances[0].MatNm}</div>
              </div>
              <div className="flex">
                <div className="text-gray-500 font-semibold mr-2">Unit of Measure:</div>
                <div className="text-gray-700">{stockBalances[0].UomCd || "-"}</div>
              </div>
              <div className="flex">
                <div className="text-gray-500 font-semibold mr-2">Unit Price:</div>
                <div className="text-gray-700">
                  {typeof stockBalances[0].UnitPrice === "number"
                    ? `LKR ${stockBalances[0].UnitPrice.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}`
                    : "-"}
                </div>
              </div>
            </div>
          )}
        </div>
        <ReportTable
          columns={[
            { label: "Region", accessor: "Region" },
            { label: "Province", accessor: "Province" },
            { label: "Cost Center", accessor: "DeptId" },
            { label: "Grade Code", accessor: "GradeCd", className: "hidden print:table-cell" },
            { label: "Quantity On Hand", accessor: "QtyOnHand", align: "right" },
            { label: "Reorder Quantity", accessor: "ReorderQty", align: "right" },
          ]}
          data={formattedStockBalances}
          rowKey={(_, idx) => idx}
        />
        {/* Removed the total row as requested */}
      </div>
    </div>
  );
};

export default StockBalancesTable;