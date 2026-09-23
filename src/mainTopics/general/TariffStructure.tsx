import { useRef, useState } from "react";
import { FaFileDownload, FaPrint } from "react-icons/fa";
import tariffStructure from "../../data/tariffStructure.json";

// CSV has no merged cells: repeat row labels and reserve merged columns.
const toCsvRows = (rows: typeof tariffStructure.tables[number]["rows"]) => {
  const grid: string[][] = [];
  rows.forEach((row, rowIndex) => {
    grid[rowIndex] ??= [];
    let column = 0;
    row.forEach((cell) => {
      while (grid[rowIndex][column] !== undefined) column++;
      for (let r = 0; r < cell.rowSpan; r++) {
        grid[rowIndex + r] ??= [];
        for (let c = 0; c < cell.colSpan; c++) {
          grid[rowIndex + r][column + c] = c === 0 ? cell.text : "";
        }
      }
      column += cell.colSpan;
    });
  });
  const width = Math.max(...grid.map((row) => row.length));
  return grid.map((row) => Array.from({ length: width }, (_, index) => row[index] ?? ""));
};

// Static copy of the legacy tariff tables. Update this data when tariffs change.
const TariffStructure = () => {
  const tablesRef = useRef<HTMLDivElement>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const downloadAsCSV = () => {
    setExportError(null);
    const rows: string[][] = [["Tariff Structure"], ["Effective from", tariffStructure.effectiveFrom]];
    tariffStructure.tables.forEach((table) => {
      rows.push([], [table.title], ...toCsvRows(table.rows));
    });
    const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `TariffStructure_${tariffStructure.effectiveFrom.replace(/\//g, "-")}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const printPDF = () => {
    setExportError(null);
    if (!tablesRef.current) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      setExportError("Please allow pop-ups to open the PDF print view.");
      return;
    }
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
    printWindow.document.write(`<!doctype html>
      <html><head><title>Tariff Structure</title><style>
        @page { size: A4 landscape; margin: 10mm; }
        body { font-family: Arial, sans-serif; font-size: 10px; color: #111; }
        h1 { font-size: 20px; color: #7A0000; margin: 0 0 6px; }
        p { margin: 0 0 16px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        caption { text-align: left; font-weight: bold; color: #7A0000; margin-bottom: 8px; }
        th, td { border: 1px solid #d1d5db; padding: 4px 6px; }
        th { background: #e5e7eb; font-weight: bold; }
        tr:nth-child(even) td { background: #f9fafb; }
        tr { break-inside: avoid; }
        .text-left { text-align: left; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        * { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      </style></head><body>
        <h1>Tariff Structure</h1>
        <p>Effective from ${tariffStructure.effectiveFrom}</p>
        ${tablesRef.current.innerHTML}
      </body></html>`);
    printWindow.document.close();
  };

  return (
  <div className="w-full min-w-0 space-y-4">
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
      <div>
      <h2 className="text-xl font-bold text-[#7A0000]">Tariff Structure</h2>
      <p className="mt-1 text-sm text-gray-600">
        Effective from {tariffStructure.effectiveFrom}
      </p>
      </div>
      <div className="flex space-x-2">
        <button type="button" onClick={downloadAsCSV} className="flex items-center gap-1 px-3 py-1.5 border border-blue-400 text-blue-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-blue-50 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-200 transition">
          <FaFileDownload className="w-3 h-3" /> CSV
        </button>
        <button type="button" onClick={printPDF} title="Print or save as PDF" className="flex items-center gap-1 px-3 py-1.5 border border-green-400 text-green-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-green-50 hover:text-green-800 focus:outline-none focus:ring-2 focus:ring-green-200 transition">
          <FaPrint className="w-3 h-3" /> PDF
        </button>
      </div>
    </div>
    {exportError && <p role="alert" className="text-sm text-red-700">{exportError}</p>}
    <div ref={tablesRef} className="max-h-[75dvh] space-y-6 overflow-auto rounded-lg border border-gray-300 bg-white p-4">
      {tariffStructure.tables.map((table, tableIndex) => (
        <table key={table.title} className="w-full border-collapse text-xs">
          <caption className="sr-only">{table.title}</caption>
          <tbody>
            {table.rows.map((row, rowIndex) => (
              <tr key={rowIndex} className={rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                {row.map((cell, cellIndex) => {
                  const isHeader = cell.header || (tableIndex === 2 && rowIndex === 1);
                  const Cell = isHeader ? "th" : "td";
                  const alignment = isHeader
                    ? (cell.colSpan > 3 ? "text-left" : "text-center")
                    : cell.align === "right" ? "text-right"
                    : cell.align === "center" ? "text-center" : "text-left";
                  return (
                    <Cell
                      key={cellIndex}
                      colSpan={cell.colSpan}
                      rowSpan={cell.rowSpan}
                      className={`border border-gray-300 px-2 py-1 ${alignment} ${
                        isHeader ? "bg-gray-200 font-bold" : ""
                      }`}
                    >
                      {cell.text || "\u00a0"}
                    </Cell>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      ))}
    </div>
  </div>
);
};

export default TariffStructure;
