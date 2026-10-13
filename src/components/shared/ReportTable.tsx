import React from "react";

type Column = {
  label: string;
  accessor: string;
  align?: "left" | "right" | "center";
  className?: string;
};

type ReportTableProps = {
  columns: Column[];
  data: any[];
  rowKey?: (row: any, idx: number) => React.Key;
  rowClassName?: (row: any, idx: number) => string;
  stickyHeader?: boolean;
  emptyMessage?: string;
};

const ReportTable: React.FC<ReportTableProps> = ({
  columns,
  data,
  rowKey,
  rowClassName,
  stickyHeader = true,
  emptyMessage = "No data found.",
}) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border border-gray-200 rounded shadow-sm overflow-hidden text-xs">
        <thead
          className={
            stickyHeader ? "bg-gray-100 sticky top-0 z-10" : "bg-gray-100"
          }
        >
          <tr>
            {columns.map((col, idx) => (
              <th
                key={col.accessor || idx}
                className={`px-3 py-2 border-b font-medium text-gray-700 ${
                  col.align === "right"
                    ? "text-right"
                    : col.align === "center"
                    ? "text-center"
                    : "text-left"
                } ${col.className || ""}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="text-center text-gray-400 py-4"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr
                key={rowKey ? rowKey(row, idx) : idx}
                className={
                  rowClassName
                    ? rowClassName(row, idx)
                    : idx % 2 === 0
                    ? "bg-white hover:bg-gray-50 transition"
                    : "bg-gray-50 hover:bg-gray-100 transition"
                }
              >
                {columns.map((col, cidx) => (
                  <td
                    key={col.accessor || cidx}
                    className={`px-3 py-2 border-b ${
                      col.align === "right"
                        ? "text-right"
                        : col.align === "center"
                        ? "text-center"
                        : "text-left"
                    } ${col.className || ""}`}
                  >
                    {row[col.accessor]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ReportTable;
