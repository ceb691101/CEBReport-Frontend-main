// CashBookDetailsReport.tsx
import React, {useState} from "react";
import {Download, Printer, X, RotateCcw, Eye} from "lucide-react";
import {toast} from "react-toastify";
import {useUser} from "../../contexts/UserContext";

interface CashBookItem {
	ChqRun: string | null;
	ChqDt: string | null;
	Payee: string | null;
	PymtDocNo: string | null;
	ChqAmt: number | null;
	ChqNo: string | null;
	CctName: string | null;
}

/* ────── Constants ────── */
const MIN_PAYEE_LENGTH = 3;
const MAX_PAYEE_LENGTH = 50;
const MAX_RECORDS = 5000;
const FETCH_TIMEOUT_MS = 120000;

/* ────── Formatting helpers ────── */
const formatNumber = (num: number | string | null | undefined): string => {
	const n = num === null || num === undefined ? NaN : Number(num);
	if (isNaN(n)) return "0.00";
	const abs = Math.abs(n);
	const formatted = abs.toLocaleString("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
	return n < 0 ? `(${formatted})` : formatted;
};

const formatDate = (dateStr: string | null): string => {
	if (!dateStr) return "";
	const d = new Date(dateStr);
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
};

const csvEscape = (val: string | number | null | undefined): string => {
	if (val == null) return "";
	const str = String(val);
	if (/[,\n"]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
	return str;
};

const today = new Date();
const currentYear = today.getFullYear();
const currentMonth = String(today.getMonth() + 1).padStart(2, "0");
const currentDay = String(today.getDate()).padStart(2, "0");
const maxDate = `${currentYear}-${currentMonth}-${currentDay}`; // Today's date: YYYY-MM-DD

const minYear = currentYear - 20;
const minDate = `${minYear}-${currentMonth}-${currentDay}`; // 20 years ago, same month/day

/* ────── MAIN COMPONENT ────── */
const CashBookDetailsReport: React.FC = () => {
	const {} = useUser();
	const [fromDate, setFromDate] = useState("");
	const [toDate, setToDate] = useState("");
	const [payeeInput, setPayeeInput] = useState("");
	const [reportData, setReportData] = useState<CashBookItem[]>([]);
	const [reportLoading, setReportLoading] = useState(false);
	const [showReport, setShowReport] = useState(false);

	const maroon = "text-[#7A0000]";
	const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";

	const toYYYYMMDD = (date: string): string => date.replace(/-/g, "");

	/* ────── Input validation ────── */
	const validateInputs = (): boolean => {
		if (!fromDate) {
			toast.error("Please select 'From Date'");
			return false;
		}
		if (!toDate) {
			toast.error("Please select 'To Date'");
			return false;
		}
		if (new Date(toDate) < new Date(fromDate)) {
			toast.error("'To Date' cannot be earlier than 'From Date'");
			return false;
		}
		const payee = payeeInput.trim();
		if (!payee) {
			toast.error("Payee name is required");
			return false;
		}
		if (payee.length < MIN_PAYEE_LENGTH) {
			toast.error(`Payee must be at least ${MIN_PAYEE_LENGTH} characters`);
			return false;
		}
		if (payee.length > MAX_PAYEE_LENGTH) {
			toast.error(`Payee cannot exceed ${MAX_PAYEE_LENGTH} characters`);
			return false;
		}
		if (/[%_\\]/.test(payee)) {
			toast.error("Payee contains invalid characters (%, _, \\)");
			return false;
		}
		return true;
	};

	/* ────── Fetch with timeout ────── */
	const fetchReport = async () => {
		if (!validateInputs()) return;

		const payeeToUse = payeeInput.trim();
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

		setReportLoading(true);
		setReportData([]);
		setShowReport(false);

		try {
			const payeeParam = encodeURIComponent(payeeToUse);
			const url = `/misapi/api/cashbook/report/${toYYYYMMDD(
				fromDate
			)}/${toYYYYMMDD(toDate)}/${payeeParam}`;

			const res = await fetch(url, {
				credentials: "include",
				signal: controller.signal,
			});
			clearTimeout(timeoutId);

			if (!res.ok) {
				const txt = await res.text();
				throw new Error(`HTTP ${res.status}: ${txt}`);
			}

			const json = await res.json();
			if (!json.success)
				throw new Error(json.message || "Failed to load data");

			const items: CashBookItem[] = json.data || [];
			if (items.length > MAX_RECORDS)
				throw new Error(
					`Too many records (${items.length}). Please refine your search.`
				);

			if (items.length === 0) {
				toast.warn("No records found for the selected criteria.");
				return;
			}

			setReportData(items);
			setShowReport(true);
			toast.success(`${items.length} records loaded successfully.`);
		} catch (e: any) {
			if (e.name === "AbortError") {
				toast.error("Request timed out.");
			} else {
				const msg = e.message.includes("Failed to fetch")
					? "Server unreachable. Please check your connection."
					: e.message;
				toast.error(msg);
			}
		} finally {
			setReportLoading(false);
		}
	};

	const handleGenerate = () => fetchReport();
	const clearAll = () => {
		setFromDate("");
		setToDate("");
		setPayeeInput("");
		setShowReport(false);
		setReportData([]);
		toast.info("Filters cleared.");
	};
	const closeReport = () => {
		setShowReport(false);
		setReportData([]);
	};

	/* ────── ROBUST GROUP & SORT ────── */
	const normalizeForSort = (str: string) => {
		return str
			.trim()
			.toUpperCase()
			.replace(/\s+/g, " ")
			.replace(/[.,]/g, "")
			.replace(/\(.*?\)/g, "")
			.replace(/[^A-Z0-9\s]/g, "");
	};

	const grouped = reportData.reduce((acc, cur) => {
		const raw = cur.Payee?.trim() || "UNKNOWN";
		const key = normalizeForSort(raw);
		if (!acc[key]) acc[key] = {display: raw, items: []};
		acc[key].items.push(cur);
		return acc;
	}, {} as Record<string, {display: string; items: CashBookItem[]}>);

	const sortedPayees = Object.keys(grouped).sort((a, b) =>
		a.localeCompare(b, undefined, {sensitivity: "base", numeric: true})
	);

	const sortedGrouped = sortedPayees.reduce((acc, key) => {
		const {display, items} = grouped[key];
		acc[key] = {
			display,
			items: items.sort((a, b) =>
				(a.ChqDt || "").localeCompare(b.ChqDt || "")
			),
		};
		return acc;
	}, {} as Record<string, {display: string; items: CashBookItem[]}>);

	const grandTotal = reportData.reduce((s, r) => s + (r.ChqAmt || 0), 0);

	/* ────── CSV download (same order) ────── */
	const downloadCSV = () => {
		if (reportData.length === 0) return;

		const titleRows = [
			`Cheque Details from ${fromDate} To ${toDate}`,
			`Currency : LKR`,
			"",
		];

		const headers = [
			"Cheque Run",
			"Date",
			"Paylip No.",
			"Cheque No.",
			"Payee",
			"Amount",
		];
		const rows: string[] = [];

		sortedPayees.forEach((key) => {
			const {display: payee, items} = sortedGrouped[key];
			const payeeTotal = items.reduce((s, r) => s + (r.ChqAmt || 0), 0);
			rows.push(`Payee Name : ${payee}`);
			rows.push(headers.join(","));
			items.forEach((it) => {
				rows.push(
					[
						csvEscape(it.ChqRun),
						csvEscape(formatDate(it.ChqDt)),
						csvEscape(it.PymtDocNo),
						csvEscape(it.ChqNo),
						csvEscape(it.Payee),
						csvEscape(formatNumber(it.ChqAmt)),
					].join(",")
				);
			});
			rows.push(
				`Total for Payee,,,,,${csvEscape(formatNumber(payeeTotal))}`
			);
			rows.push("");
		});

		rows.push(
			`Total for the period,,,,,${csvEscape(formatNumber(grandTotal))}`
		);

		const csv = [...titleRows, ...rows].join("\n");
		const blob = new Blob([csv], {type: "text/csv;charset=utf-8;"});
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `ChequeDetails_${fromDate}_${toDate}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	};

	/* ────── PDF print (same order) ────── */
	const printPDF = () => {
		if (reportData.length === 0) return;

		let tablesHTML = "";
		sortedPayees.forEach((key) => {
			const {display: payee, items} = sortedGrouped[key];
			const payeeTotal = items.reduce((s, r) => s + (r.ChqAmt || 0), 0);
			let rows = "";
			items.forEach((it, i) => {
				rows += `
          <tr class="${i % 2 ? "bg-white" : "bg-gray-50"}">
            <td class="px-3 py-2 border-l border-r border-gray-300 text-left text-xs font-mono">${
					it.ChqRun || ""
				}</td>
            <td class="px-3 py-2 border-r border-gray-300 text-center text-xs">${formatDate(
					it.ChqDt
				)}</td>
            <td class="px-3 py-2 border-r border-gray-300 text-left text-xs">${
					it.PymtDocNo || ""
				}</td>
            <td class="px-3 py-2 border-r border-gray-300 text-left text-xs">${
					it.ChqNo || ""
				}</td>
            <td class="px-3 py-2 border-r border-gray-300 text-left text-xs break-words">${
					it.Payee || ""
				}</td>
            <td class="px-3 py-2 border-r border-gray-300 text-right text-xs font-mono">${formatNumber(
					it.ChqAmt
				)}</td>
          </tr>`;
			});

			tablesHTML += `
        <div style="margin-bottom:28px;">
          <div style="font-weight:bold; margin-bottom:6px; font-size:10px; color:#7A0000;">Payee Name : ${payee}</div>
          <table style="width:100%; border-collapse:collapse; font-size:8.5px; border:1px solid #d1d5db;">
            <thead>
              <tr style="background:linear-gradient(to right,#7A0000,#A52A2A); color:white;">
                <th style="padding:6px 8px; border:1px solid #d1d5db; width:16%;">Cheque Run</th>
                <th style="padding:6px 8px; border:1px solid #d1d5db; width:11%;">Date</th>
                <th style="padding:6px 8px; border:1px solid #d1d5db; width:18%;">Paylip No.</th>
                <th style="padding:6px 8px; border:1px solid #d1d5db; width:14%;">Cheque No.</th>
                <th style="padding:6px 8px; border:1px solid #d1d5db; width:26%;">Payee</th>
                <th style="padding:6px 8px; border:1px solid #d1d5db; width:15%; text-align:right;">Amount</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
            <tfoot>
              <tr style="background:#f3f4f6; font-weight:bold; font-size:9px;">
                <td colspan="5" class="px-3 py-2 text-right border border-gray-300">Total for Payee</td>
                <td class="px-3 py-2 text-right font-mono border border-gray-300">${formatNumber(
							payeeTotal
						)}</td>
              </tr>
            </tfoot>
          </table>
        </div>`;
		});

		const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    @media print {
      @page { margin: 8mm 5mm 10mm 5mm; }
      body { margin:0; font-family:Arial,Helvetica,sans-serif; }
      .title { margin:10px 8px 6px; text-align:center; font-weight:bold; color:#7A0000; font-size:13px; }
      .info  { margin:6px 8px; font-size:9px; display:flex; justify-content:space-between; }
      table { border-collapse:collapse; width:100%; font-size:8.5px; }
      th, td { border:1px solid #d1d5db; padding:6px 8px; word-wrap:break-word; }
      th { background:linear-gradient(to right,#7A0000,#A52A2A); color:white; text-align:center; font-weight:bold; }
      .font-mono { font-family:monospace; }
      @page {
        @bottom-left  { content:"Printed on: ${new Date().toLocaleString(
				"en-US",
				{timeZone: "Asia/Colombo"}
			)}"; font-size:7px; color:gray; }
        @bottom-right { content:"Page " counter(page) " of " counter(pages); font-size:7px; color:gray; }
      }
    }
  </style>
</head>
<body>
  <div class="title">Cheque Details from ${fromDate} To ${toDate}</div>
  <div class="info">
    <div style="font-weight:600; color:#4B5563;">Currency : LKR</div>
  </div>

  ${tablesHTML}

  <div style="margin-top:20px; padding:8px 15px; background:#e5e7eb; font-weight:bold; font-size:10px; text-align:left;">
    Total for the period &nbsp;&nbsp; ${formatNumber(grandTotal)}
  </div>

  <div style="margin-top:20px; display:flex; justify-content:space-between; padding:0 15px; font-size:9px;">
    <div>Prepared By: ____________________</div>
    <div>Checked By: ____________________</div>
  </div>
</body>
</html>`;

		const win = window.open("", "_blank");
		if (!win) return;
		win.document.write(html);
		win.document.close();
		win.onload = () => win.print();

		const closeAfterPrint = () => {
			if (win && !win.closed) win.close();
		};
		win.onafterprint = closeAfterPrint;
	};

	const isGenerateEnabled =
		fromDate &&
		toDate &&
		payeeInput.trim().length >= MIN_PAYEE_LENGTH &&
		!reportLoading;

	/* ────── RENDER ────── */
	return (
		<div className="max-w-7xl mx-auto p-6 bg-white rounded-xl shadow border border-gray-200 text-sm font-sans">
			<div className="flex justify-between items-center mb-4">
				<h2 className={`text-xl font-bold ${maroon}`}>
					Selected Payee Within Date Range
				</h2>
			</div>

			<div className="bg-gray-50 p-4 rounded-lg mb-4 border border-gray-200">
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
					{/* From Date */}
					<div className="flex items-center gap-2">
						<label
							className={`text-xs font-bold ${maroon} whitespace-nowrap`}
						>
							From Date:
						</label>
						<input
							type="date"
							value={fromDate}
							onChange={(e) => setFromDate(e.target.value)}
							min={minDate}
							max={maxDate}
							className="pl-3 pr-3 py-1.5 w-full rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A0000] transition text-sm"
						/>
					</div>

					{/* To Date */}
					<div className="flex items-center gap-2">
						<label
							className={`text-xs font-bold ${maroon} whitespace-nowrap`}
						>
							To Date:
						</label>
						<input
							type="date"
							value={toDate}
							onChange={(e) => setToDate(e.target.value)}
							min={minDate}
							max={maxDate}
							className="pl-3 pr-3 py-1.5 w-full rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A0000] transition text-sm"
						/>
					</div>

					{/* Payee Name – with helper text */}
					<div className="relative flex flex-col gap-1">
						<div className="flex items-center gap-2">
							<label
								className={`text-xs font-bold ${maroon} whitespace-nowrap`}
							>
								Payee Name:
							</label>
							<input
								type="text"
								value={payeeInput}
								placeholder={`Payee Name`}
								onChange={(e) =>
									setPayeeInput(e.target.value.toUpperCase())
								}
								className="w-full px-3 py-1.5 rounded border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-[#7A0000] text-sm uppercase placeholder:normal-case"
							/>
						</div>

						{/* Dynamic helper message – perfectly aligned under the input */}
						{payeeInput.length > 0 &&
							payeeInput.length < MIN_PAYEE_LENGTH && (
								<p className="absolute -bottom-5 left-0 right-0 text-xs text-red-600 whitespace-nowrap">
									At least {MIN_PAYEE_LENGTH - payeeInput.length} more{" "}
									{MIN_PAYEE_LENGTH - payeeInput.length === 1
										? "letter"
										: "letters"}{" "}
									required
								</p>
							)}
					</div>
				</div>

				<div className="flex justify-end gap-2 mt-6">
					<button
						onClick={handleGenerate}
						disabled={!isGenerateEnabled}
						className={`px-4 py-1.5 ${maroonGrad} text-white rounded text-sm font-medium hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1`}
					>
						<Eye className="w-3 h-3" />
						{reportLoading ? "Viewing" : "View"}
					</button>
					<button
						onClick={clearAll}
						className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm"
					>
						<RotateCcw className="w-3 h-3" /> Clear All
					</button>
				</div>
			</div>

			{/* ────── REPORT MODAL ────── */}
			{showReport && reportData.length > 0 && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/90 print:static print:inset-auto print:p-0 print:bg-white">
					<div className="relative bg-white w-[95vw] sm:w-[90vw] md:w-[85vw] lg:w-[80vw] xl:w-[75vw] max-w-7xl rounded-2xl shadow-2xl border border-gray-200 overflow-hidden mt-20 md:mt-32 lg:mt-40 lg:ml-64 mx-auto print:relative print:w-full print:max-w-none print:rounded-none print:shadow-none print:border-none print:overflow-visible">
						<div className="p-2 md:p-2 max-h-[80vh] overflow-y-auto print:p-0 print:max-h-none print:overflow-visible print:mt-10 print:ml-12">
							<div className="flex justify-end gap-3 mb-6 md:mb-8 print:hidden">
								<button
									onClick={downloadCSV}
									className="flex items-center gap-1 px-2 py-1 text-xs border border-blue-400 text-blue-700 bg-white rounded hover:bg-blue-50"
								>
									<Download className="w-3.5 h-3.5" /> CSV
								</button>
								<button
									onClick={printPDF}
									className="flex items-center gap-1 px-2 py-1 text-xs border border-green-400 text-green-700 bg-white rounded hover:bg-green-50"
								>
									<Printer className="w-3.5 h-3.5" /> PDF
								</button>
								<button
									onClick={closeReport}
									className="flex items-center gap-1 px-2 py-1 text-xs border border-red-400 text-red-700 bg-white rounded hover:bg-red-50"
								>
									<X className="w-3.5 h-3.5" /> Close
								</button>
							</div>

							<h2
								className={`text-lg font-bold text-center mb-1 ${maroon}`}
							>
								Cheque Details from {fromDate} To {toDate}
							</h2>
							<div className="flex justify-between text-xs mb-3">
								<div></div>
								<div className="font-semibold text-gray-600">
									Currency : LKR
								</div>
							</div>

							<div className="overflow-x-auto border border-gray-300 rounded-lg">
								<div className="min-w-[1100px]">
									{sortedPayees.map((key) => {
										const {display: payee, items} =
											sortedGrouped[key];
										const payeeTotal = items.reduce(
											(s, r) => s + (r.ChqAmt || 0),
											0
										);
										return (
											<div key={key} className="mb-6 last:mb-0">
												<div className="bg-gradient-to-r from-gray-100 to-gray-50 px-4 py-2 font-bold text-sm text-gray-800 border-b border-gray-300">
													Payee Name : {payee}
												</div>
												<table className="w-full text-xs border-collapse">
													<thead
														className={`${maroonGrad} text-white`}
													>
														<tr>
															<th
																className="px-4 py-2 text-left border border-gray-300"
																style={{width: "16%"}}
															>
																Cheque Run
															</th>
															<th
																className="px-4 py-2 text-center border border-gray-300"
																style={{width: "11%"}}
															>
																Date
															</th>
															<th
																className="px-4 py-2 text-left border border-gray-300"
																style={{width: "18%"}}
															>
																Paylip No.
															</th>
															<th
																className="px-4 py-2 text-left border border-gray-300"
																style={{width: "14%"}}
															>
																Cheque No.
															</th>
															<th
																className="px-4 py-2 text-left border border-gray-300"
																style={{width: "26%"}}
															>
																Payee
															</th>
															<th
																className="px-4 py-2 text-right border border-gray-300"
																style={{width: "15%"}}
															>
																Amount
															</th>
														</tr>
													</thead>
													<tbody>
														{items.map((it, i) => (
															<tr
																key={i}
																className={
																	i % 2 === 0
																		? "bg-white"
																		: "bg-gray-50"
																}
															>
																<td className="px-4 py-2 font-mono border-l border-r border-gray-300">
																	{it.ChqRun || ""}
																</td>
																<td className="px-4 py-2 text-center border-r border-gray-300">
																	{formatDate(it.ChqDt)}
																</td>
																<td className="px-4 py-2 border-r border-gray-300">
																	{it.PymtDocNo || ""}
																</td>
																<td className="px-4 py-2 border-r border-gray-300">
																	{it.ChqNo || ""}
																</td>
																<td className="px-4 py-2 border-r border-gray-300 break-words">
																	{it.Payee || ""}
																</td>
																<td className="px-4 py-2 text-right font-mono border-r border-gray-300">
																	{formatNumber(it.ChqAmt)}
																</td>
															</tr>
														))}
													</tbody>
													<tfoot>
														<tr className="bg-gray-100 font-bold">
															<td
																colSpan={5}
																className="px-4 py-2 text-right border border-gray-300"
															>
																Total for Payee
															</td>
															<td className="px-4 py-2 text-right font-mono border border-gray-300">
																{formatNumber(payeeTotal)}
															</td>
														</tr>
													</tfoot>
												</table>
											</div>
										);
									})}
									<div className="w-full mt-5 mb-5 p-3 bg-gradient-to-r from-gray-200 to-gray-100 rounded-lg font-bold text-right text-sm border border-gray-300">
										Total for the period: &nbsp;&nbsp;{" "}
										{formatNumber(grandTotal)}
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default CashBookDetailsReport;
