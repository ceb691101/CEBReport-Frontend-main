import React, { useState, useRef } from "react";
import { FaFileDownload, FaPrint } from "react-icons/fa";

interface BlockCharge {
  BlockLimit: number;
  FromUnits: number;
  ToUnits: number;
  ProratedFrom: number;
  ProratedTo: number;
  Rate: number;
  OriginalRate: number;
  UnitsInBlock: number;
  Charge: number;
  ChargeCalculation: string;
  BlockLimitDisplay: string;
  ProratedBlocksDisplay: string;
}

interface PeriodCalculation {
  FromDate: string;
  ToDate: string;
  NumberOfDays: number;
  NumberOfUnits: number;
  KWHCharge: number;
  FixedCharge: number;
  FacCharge: number;
  TotalCharge: number;
  BlockCharges: BlockCharge[];
  FromDateDisplay: string;
  ToDateDisplay: string;
  PeriodDisplay: string;
}

interface BillCalculationResult {
  Category: number;
  FullUnits: number;
  FromDate: string;
  ToDate: string;
  NumberOfDays: number;
  PeriodCalculations: PeriodCalculation[];
  KWHCharge: number;
  FixedCharge: number;
  FacCharge: number;
  TotalCharge: number;
  TotalPeriods: number;
  TotalUnitsProcessed: number;
}

const TARIFF_CATEGORIES = [
  { value: 11, label: "Category 11 (Domestic)" },
  { value: 21, label: "Category 21 (Industrial)" },
  { value: 31, label: "Category 31 (General Purpose)" },
  { value: 33, label: "Category 33 (Government)" },
  { value: 41, label: "Category 41 (Hotel)" },
  { value: 51, label: "Category 51 (Religious & Charity)" },
];

const today = new Date().toISOString().split("T")[0];

const BillCalculation: React.FC = () => {
  const maroon = "text-[#7A0000]";
  const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";

  const [category, setCategory] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>(today);
  const [units, setUnits] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [result, setResult] = useState<BillCalculationResult | null>(null);

  const printRef = useRef<HTMLDivElement>(null);

  const isFromDateDisabled = () => !category;
  const isToDateDisabled = () => !category || !fromDate;
  const isUnitsDisabled = () => !category || !fromDate || !toDate;

  const canSubmit = () =>
    !!category && !!fromDate && !!toDate && !!units && parseFloat(units) > 0;

  const formatNumber = (value: number, decimals = 2): string => {
    if (value === undefined || value === null) return "-";
    return value.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  const getCategoryLabel = (value: number): string => {
    return TARIFF_CATEGORIES.find((c) => c.value === value)?.label ?? String(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setReportError(null);
    setResult(null);
    setReportVisible(false);

    try {
      if (!category) throw new Error("Please select a tariff category.");
      if (!fromDate) throw new Error("Please select a From Date.");
      if (!toDate) throw new Error("Please select a To Date.");
      if (!units || parseFloat(units) <= 0) throw new Error("Units must be greater than 0.");
      if (fromDate >= toDate) throw new Error("From Date must be before To Date.");

      const payload = {
        category: parseInt(category),
        fullUnits: parseFloat(units),
        fromDate,
        toDate,
      };

      const response = await fetch("/misapi/api/billcalculation/calculate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMsg = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.message) errorMsg = errorData.message;
          else if (errorData.errorMessage) errorMsg = errorData.errorMessage;
        } catch {
          errorMsg = response.statusText;
        }
        throw new Error(errorMsg);
      }

      const data: BillCalculationResult = await response.json();
      setResult(data);
      setReportVisible(true);
    } catch (err: any) {
      setReportError(err.message || "Failed to calculate bill.");
    } finally {
      setLoading(false);
    }
  };

  const downloadAsCSV = () => {
    if (!result) return;
 
    // Wrap values containing commas in quotes so CSV columns stay intact
    const csvNum = (value: number, decimals = 2): string =>
      `"${value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}"`;
    const csvInt = (value: number): string =>
      `"${value.toLocaleString("en-US")}"`;
 
    const rows: string[] = [];
    rows.push(`Bill Calculation Report`);
    rows.push(`Category,${getCategoryLabel(result.Category)}`);
    rows.push(`From Date,${result.FromDate?.split("T")[0]}`);
    rows.push(`To Date,${result.ToDate?.split("T")[0]}`);
    rows.push(`Number of Days,${csvInt(result.NumberOfDays)}`);
    rows.push(`Total Units,${csvNum(result.FullUnits, 0)}`);
    rows.push(``);
    rows.push(`From,To,Days,Units,KWH Charge,Fixed,FAC,Total`);
    result.PeriodCalculations.forEach((p) => {
      rows.push([
        p.FromDateDisplay,
        p.ToDateDisplay,
        csvInt(p.NumberOfDays),
        csvNum(p.NumberOfUnits, 0),
        csvNum(p.KWHCharge),
        csvNum(p.FixedCharge),
        csvNum(p.FacCharge),
        csvNum(p.TotalCharge),
      ].join(","));
    });
    rows.push([
      "Grand Total", "",
      csvInt(result.NumberOfDays),
      csvNum(result.TotalUnitsProcessed, 0),
      csvNum(result.KWHCharge),
      csvNum(result.FixedCharge),
      csvNum(result.FacCharge),
      csvNum(result.TotalCharge),
    ].join(","));
    rows.push(``);
    rows.push(`Break Down - KWH Charge`);
    result.PeriodCalculations.forEach((p) => {
      rows.push(p.PeriodDisplay);
      rows.push(`No of Days,${csvInt(p.NumberOfDays)},No of Units,${csvNum(p.NumberOfUnits, 0)}`);
      rows.push(`Block Limit (From),Block Limit (To),Prorated From,Prorated To,Rate,Block Charge`);
      p.BlockCharges.forEach((b) => {
        rows.push([
          b.FromUnits,
          b.ToUnits,
          csvInt(b.ProratedFrom),
          csvInt(b.ProratedTo),
          csvNum(b.Rate),
          b.Charge > 0 ? `"${b.UnitsInBlock} x ${b.Rate.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} = ${b.Charge.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}"` : "-",
        ].join(","));
      });
      rows.push(``);
    });
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `BillCalculation_${result.FromDate?.split("T")[0]}_${result.ToDate?.split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Print PDF Function
    const printPDF = () => {
    const content = printRef.current;
    if (!content || !result) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
 
    const reportTitle = "BILL CALCULATION";
    const selectionInfo = `Category: <span class="bold">${getCategoryLabel(result.Category)}</span><br>From: <span class="bold">${result.FromDate?.split("T")[0]}</span> &nbsp;&nbsp; To: <span class="bold">${result.ToDate?.split("T")[0]}</span> &nbsp;&nbsp; Units: <span class="bold">${result.FullUnits}</span>`;
 
    printWindow.document.write(`
      <html>
        <head>
          <title>Bill Calculation Report</title>
          <style>
            body { font-family: Arial; font-size: 10px; margin: 10mm; color: #111; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
            th, td { padding: 4px 6px; border: 1px solid #d1d5db; font-size: 10px; vertical-align: top; }
 
            /* Header row — bg-gray-200 */
            thead tr th { background-color: #e5e7eb; font-weight: bold; text-align: center; }
 
            /* Alternating rows */
            .row-even { background-color: #ffffff; }
            .row-odd  { background-color: #f9fafb; }
 
            /* Grand total row — bg-gray-200 font-bold */
            .row-total { background-color: #e5e7eb; font-weight: bold; }
 
            /* Text alignment */
            .text-right { text-align: right; }
            .text-left  { text-align: left; }
            .text-center { text-align: center; }
 
            /* Typography */
            .font-bold, .font-semibold { font-weight: bold; }
            .bold { font-weight: bold; }
 
            /* No of Days/Units row */
            .meta-row { font-weight: bold; color: #374151; margin-bottom: 6px; font-size: 10px; display: flex; gap: 32px; }
            .meta-row span { display: inline-block; margin-right: 32px; }
 
            /* Section title — underlined maroon */
            .section-title { color: #7A0000; font-weight: bold; text-decoration: underline; margin: 14px 0 8px; font-size: 11px; }
 
            /* Period header — maroon bold */
            .period-header { color: #7A0000; font-weight: bold; margin: 10px 0 4px; font-size: 10px; }
 
            /* Period meta */
            .period-meta { color: #374151; font-weight: normal; margin-bottom: 4px; }
            .period-meta b { font-weight: bold; }
 
            /* Summary box */
            .summary-box { border: 1px solid #e5e7eb; border-radius: 4px; padding: 8px 10px; background-color: #f9fafb; margin-top: 14px; }
            .summary-title { color: #7A0000; font-weight: bold; margin-bottom: 6px; font-size: 10px; }
            .summary-grid { display: table; width: 100%; }
            .summary-cell { display: table-cell; width: 25%; padding-right: 8px; font-size: 10px; }
            .summary-label { color: #6b7280; }
            .summary-value { font-weight: 600; color: #374151; margin-left: 4px; }
            .summary-value-total { font-weight: bold; color: #7A0000; font-size: 11px; margin-left: 4px; }
 
            /* Report header */
            .header { font-weight: bold; margin-bottom: 5px; color: #7A0000; font-size: 13px; }
            .subheader { margin-bottom: 14px; font-size: 10px; line-height: 1.6; }
 
            @page {
              margin-bottom: 18mm;
              @bottom-left { content: "Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}"; font-size: 9px; color: #666; font-family: Arial; }
              @bottom-right { content: "Page " counter(page) " of " counter(pages); font-size: 9px; color: #666; font-family: Arial; }
            }
          </style>
        </head>
        <body>
          <div class="header">${reportTitle}</div>
          <div class="subheader">${selectionInfo}</div>
 
          <!-- No of Days / No of Units -->
          <div class="meta-row">
            <span><b>No of Days</b>&nbsp;&nbsp;${result.NumberOfDays.toLocaleString()}</span>
            <span><b>No of Units</b>&nbsp;&nbsp;${result.TotalUnitsProcessed}</span>
          </div>
 
          <!-- Period Summary Table -->
          <table>
            <thead>
              <tr>
                <th>From</th><th>To</th><th>Days</th><th>Units</th>
                <th>KWH Charge</th><th>Fixed</th><th>Fac</th><th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${result.PeriodCalculations.map((p, i) => `
                <tr class="${i % 2 === 0 ? "row-even" : "row-odd"}">
                  <td>${p.FromDateDisplay}</td>
                  <td>${p.ToDateDisplay}</td>
                  <td class="text-right">${p.NumberOfDays.toLocaleString()}</td>
                  <td class="text-right">${p.NumberOfUnits.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                  <td class="text-right">${p.KWHCharge.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td class="text-right">${p.FixedCharge.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td class="text-right">${p.FacCharge.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td class="text-right">${p.TotalCharge.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              `).join("")}
              <tr class="row-total">
                <td colspan="2">Grand Total</td>
                <td class="text-right">${result.NumberOfDays.toLocaleString()}</td>
                <td class="text-right">${result.TotalUnitsProcessed.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                <td class="text-right">${result.KWHCharge.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td class="text-right">${result.FixedCharge.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td class="text-right">${result.FacCharge.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td class="text-right">${result.TotalCharge.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>
 
          <!-- Break Down - KWH Charge -->
          <div class="section-title">Break Down - KWH Charge</div>
 
          ${result.PeriodCalculations.map((period) => `
            <div class="period-header">${period.PeriodDisplay}</div>
            <div class="period-meta">
              <b>No of Days</b>&nbsp;&nbsp;${period.NumberOfDays}&nbsp;&nbsp;&nbsp;&nbsp;
              <b>No of Units</b>&nbsp;&nbsp;${period.NumberOfUnits}
            </div>
            <table>
              <thead>
                <tr>
                  <th colspan="2">Block Limit</th>
                  <th colspan="2">Prorated Blocks</th>
                  <th>Rate</th>
                  <th>Block Charge</th>
                </tr>
              </thead>
              <tbody>
                ${period.BlockCharges.map((block, bi) => `
                  <tr class="${bi % 2 === 0 ? "row-even" : "row-odd"}">
                    <td class="text-right">${block.FromUnits}</td>
                    <td class="text-left">- ${block.ToUnits}</td>
                    <td class="text-right">${block.ProratedFrom}</td>
                    <td class="text-left">- ${block.ProratedTo}</td>
                    <td class="text-right">${block.Rate.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td class="text-right">${block.Charge > 0 ? `<span style="color:#6b7280">${block.UnitsInBlock} × ${block.Rate.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} = </span>${block.Charge.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "-"}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          `).join("")}
 
          <!-- Summary Box -->
          <div class="summary-box">
            <div class="summary-title">Summary</div>
            <div class="summary-grid">
              <div class="summary-cell">
                <span class="summary-label">KWH Charge:</span>
                <span class="summary-value">${result.KWHCharge.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div class="summary-cell">
                <span class="summary-label">Fixed Charge:</span>
                <span class="summary-value">${result.FixedCharge.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div class="summary-cell">
                <span class="summary-label">FAC Charge:</span>
                <span class="summary-value">${result.FacCharge.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div class="summary-cell">
                <span class="summary-label" style="font-weight:bold;">Total Charge:</span>
                <span class="summary-value-total">${result.TotalCharge.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  };
  const renderSummaryTable = () => {
    if (!result) return null;
    return (
      <table className="w-full border-collapse text-xs mb-4">
        <thead className="bg-gray-200 sticky top-0">
          <tr>
            <th className="border border-gray-300 px-2 py-1 text-center">From</th>
            <th className="border border-gray-300 px-2 py-1 text-center">To</th>
            <th className="border border-gray-300 px-2 py-1 text-center">Days</th>
            <th className="border border-gray-300 px-2 py-1 text-center">Units</th>
            <th className="border border-gray-300 px-2 py-1 text-center">KWH Charge</th>
            <th className="border border-gray-300 px-2 py-1 text-center">Fixed</th>
            <th className="border border-gray-300 px-2 py-1 text-center">Fac</th>
            <th className="border border-gray-300 px-2 py-1 text-center">Total</th>
          </tr>
        </thead>
        <tbody>
          {result.PeriodCalculations.map((p, i) => (
            <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
              <td className="border border-gray-300 px-2 py-1">{p.FromDateDisplay}</td>
              <td className="border border-gray-300 px-2 py-1">{p.ToDateDisplay}</td>
              <td className="border border-gray-300 px-2 py-1 text-right">{p.NumberOfDays.toLocaleString()}</td>
              <td className="border border-gray-300 px-2 py-1 text-right">{formatNumber(p.NumberOfUnits, 0)}</td>
              <td className="border border-gray-300 px-2 py-1 text-right">{formatNumber(p.KWHCharge)}</td>
              <td className="border border-gray-300 px-2 py-1 text-right">{formatNumber(p.FixedCharge)}</td>
              <td className="border border-gray-300 px-2 py-1 text-right">{formatNumber(p.FacCharge)}</td>
              <td className="border border-gray-300 px-2 py-1 text-right">{formatNumber(p.TotalCharge)}</td>
            </tr>
          ))}
          <tr className="bg-gray-200 font-bold">
            <td className="border border-gray-300 px-2 py-1" colSpan={2}>Grand Total</td>
            <td className="border border-gray-300 px-2 py-1 text-right">{result.NumberOfDays.toLocaleString()}</td>
            <td className="border border-gray-300 px-2 py-1 text-right">{formatNumber(result.TotalUnitsProcessed, 0)}</td>
            <td className="border border-gray-300 px-2 py-1 text-right">{formatNumber(result.KWHCharge)}</td>
            <td className="border border-gray-300 px-2 py-1 text-right">{formatNumber(result.FixedCharge)}</td>
            <td className="border border-gray-300 px-2 py-1 text-right">{formatNumber(result.FacCharge)}</td>
            <td className="border border-gray-300 px-2 py-1 text-right">{formatNumber(result.TotalCharge)}</td>
          </tr>
        </tbody>
      </table>
    );
  };

  const renderBreakdownTables = () => {
    if (!result) return null;
    return result.PeriodCalculations.map((period, pi) => (
      <div key={pi} className="mb-6">
        <p className="text-xs font-bold mb-2 text-[#7A0000]">
          {period.PeriodDisplay}
        </p>
        <div className="flex gap-8 mb-2 text-xs text-gray-700">
          <span><span className="font-bold">No of Days</span>&nbsp;&nbsp;{period.NumberOfDays}</span>
          <span><span className="font-bold">No of Units</span>&nbsp;&nbsp;{period.NumberOfUnits}</span>
        </div>
        <table className="w-full border-collapse text-xs">
          <thead className="bg-gray-200">
            <tr>
              <th className="border border-gray-300 px-2 py-1 text-center" colSpan={2}>Block Limit</th>
              <th className="border border-gray-300 px-2 py-1 text-center" colSpan={2}>Prorated Blocks</th>
              <th className="border border-gray-300 px-2 py-1 text-center">Rate</th>
              <th className="border border-gray-300 px-2 py-1 text-center">Block Charge</th>
            </tr>
          </thead>
          <tbody>
            {period.BlockCharges.map((block, bi) => (
              <tr key={bi} className={bi % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="border border-gray-300 px-2 py-1 text-right w-14">{block.FromUnits}</td>
                <td className="border border-gray-300 px-2 py-1 text-left w-16">- {block.ToUnits}</td>
                <td className="border border-gray-300 px-2 py-1 text-right w-16">{block.ProratedFrom}</td>
                <td className="border border-gray-300 px-2 py-1 text-left w-20">- {block.ProratedTo}</td>
                <td className="border border-gray-300 px-2 py-1 text-right">{formatNumber(block.Rate)}</td>
                {/* <td className="border border-gray-300 px-2 py-1 text-right">{block.Charge > 0 ? formatNumber(block.Charge) : "-"}</td> */}
                <td className="border border-gray-300 px-2 py-1 text-right">
                  {block.Charge > 0 ? (
                    <span>
                      <span className="text-gray-500">{block.UnitsInBlock} × {formatNumber(block.Rate)} = </span>
                      {formatNumber(block.Charge)}
                    </span>
                  ) : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ));
  };

  return (
    <div className="max-w-7xl mx-auto p-4 bg-white rounded-xl shadow border border-gray-200 text-sm font-sans">
      {!reportVisible && (
        <>
          <h2 className={`text-xl font-bold mb-6 ${maroon}`}>Bill Calculation</h2>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">

              <div className="flex flex-col">
                <label className={`text-xs font-medium mb-1 ${maroon}`}>Select Tariff:</label>
                <select
                  value={category}
                  onChange={(e) => { setCategory(e.target.value); setFromDate(""); setToDate(today); setUnits(""); }}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent"
                  required
                >
                  <option value="">Select Tariff Category</option>
                  {TARIFF_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col">
                <label className={`text-xs font-medium mb-1 ${isFromDateDisabled() ? "text-gray-400" : maroon}`}>
                  From Date:
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => { setFromDate(e.target.value); setUnits(""); }}
                  max={toDate || today}
                  disabled={isFromDateDisabled()}
                  required
                  className={`w-full px-2 py-1.5 text-xs border rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent ${isFromDateDisabled() ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed" : "border-gray-300"}`}
                />
              </div>

              <div className="flex flex-col">
                <label className={`text-xs font-medium mb-1 ${isToDateDisabled() ? "text-gray-400" : maroon}`}>
                  To Date:
                </label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => { setToDate(e.target.value); setUnits(""); }}
                  min={fromDate || undefined}
                  max={today}
                  disabled={isToDateDisabled()}
                  required
                  className={`w-full px-2 py-1.5 text-xs border rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent ${isToDateDisabled() ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed" : "border-gray-300"}`}
                />
              </div>

              <div className="flex flex-col">
                <label className={`text-xs font-medium mb-1 ${isUnitsDisabled() ? "text-gray-400" : maroon}`}>
                  Units:
                </label>
                <input
                  type="number"
                  value={units}
                  onChange={(e) => setUnits(e.target.value)}
                  min={1}
                  step="any"
                  placeholder="Enter units"
                  disabled={isUnitsDisabled()}
                  required
                  className={`w-full px-2 py-1.5 text-xs border rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent ${isUnitsDisabled() ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed" : "border-gray-300"}`}
                />
              </div>
            </div>

            <div className="w-full mt-6 flex justify-end">
              <button
                type="submit"
                className={`px-6 py-2 rounded-md font-medium transition-opacity duration-300 shadow ${maroonGrad} text-white ${loading || !canSubmit() ? "opacity-70 cursor-not-allowed" : "hover:opacity-90"}`}
                disabled={loading || !canSubmit()}
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading...
                  </span>
                ) : "Generate Report"}
              </button>
            </div>
          </form>
        </>
      )}

      {reportVisible && result && (
        <div className="mt-2">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
            <div>
              <h2 className={`text-xl font-bold ${maroon}`}>Bill Calculation</h2>
              <p className="text-sm text-gray-600 mt-1">
                {getCategoryLabel(result.Category)} | From: {result.FromDate?.split("T")[0]} | To: {result.ToDate?.split("T")[0]} | Units: {result.FullUnits}
              </p>
            </div>
            <div className="flex space-x-2 mt-2 md:mt-0">
              <button onClick={downloadAsCSV} className="flex items-center gap-1 px-3 py-1.5 border border-blue-400 text-blue-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-blue-50 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-200 transition">
                <FaFileDownload className="w-3 h-3" /> CSV
              </button>
              <button onClick={printPDF} className="flex items-center gap-1 px-3 py-1.5 border border-green-400 text-green-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-green-50 hover:text-green-800 focus:outline-none focus:ring-2 focus:ring-green-200 transition">
                <FaPrint className="w-3 h-3" /> PDF
              </button>
              <button onClick={() => setReportVisible(false)} className="px-4 py-1.5 bg-[#7A0000] hover:bg-[#A52A2A] text-xs rounded-md text-white flex items-center">
                Back to Form
              </button>
            </div>
          </div>

          <div className="border border-gray-300 rounded-lg overflow-x-auto">
            <div ref={printRef} className="min-w-full p-4">
              <div className="flex gap-8 mb-3 text-xs font-bold text-gray-700">
                <span>No of Days&nbsp;&nbsp;{result.NumberOfDays.toLocaleString()}</span>
                <span>No of Units&nbsp;&nbsp;{result.TotalUnitsProcessed}</span>
              </div>

              {renderSummaryTable()}

              <div className="mt-6">
                <p className={`text-sm font-bold underline mb-3 ${maroon}`}>
                  Break Down - KWH Charge
                </p>
                {renderBreakdownTables()}
              </div>

              <div className="mt-4 border border-gray-200 rounded p-3 bg-gray-50 text-xs">
                <p className={`font-bold mb-2 ${maroon}`}>Summary</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <span className="text-gray-500">KWH Charge:</span>
                    <span className="ml-2 font-semibold text-gray-700">{formatNumber(result.KWHCharge)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Fixed Charge:</span>
                    <span className="ml-2 font-semibold text-gray-700">{formatNumber(result.FixedCharge)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">FAC Charge:</span>
                    <span className="ml-2 font-semibold text-gray-700">{formatNumber(result.FacCharge)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 font-bold">Total Charge:</span>
                    <span className={`ml-2 font-bold text-sm ${maroon}`}>{formatNumber(result.TotalCharge)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {reportError && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {reportError}
        </div>
      )}
    </div>
  );
};

export default BillCalculation;