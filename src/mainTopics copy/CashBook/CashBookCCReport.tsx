// CashBookCCReport.tsx
import React, {useEffect, useState} from "react";
import {Search, RotateCcw, Eye, X, Download, Printer} from "lucide-react";
import {useUser} from "../../contexts/UserContext";
import {toast} from "react-toastify";

interface Department {
	DeptId: string;
	DeptName: string;
}

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
const PAGE_SIZE = 9;
const FETCH_TIMEOUT_MS = 180000;

/* ────── Formatting helpers ────── */
const formatNumber = (num: number | string | null | undefined): string => {
	const n = num === null || num === undefined ? NaN : Number(num);
	if (isNaN(n)) return "0.00";
	return Math.abs(n).toLocaleString("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
};

const formatDate = (dateStr: string | null): string => {
	if (!dateStr) return "";
	const d = new Date(dateStr);
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
		2,
		"0"
	)}-${String(d.getDate()).padStart(2, "0")}`;
};

const csvEscape = (val: string | number | null | undefined): string => {
	if (val == null) return "";
	const str = String(val);
	if (/[,\n"]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
	return str;
};

const toYYYYMMDD = (date: string): string => date.replace(/-/g, "");

const today = new Date();
const currentYear = today.getFullYear();
const currentMonth = String(today.getMonth() + 1).padStart(2, "0");
const currentDay = String(today.getDate()).padStart(2, "0");
const maxDate = `${currentYear}-${currentMonth}-${currentDay}`; // Today's date: YYYY-MM-DD

const minYear = currentYear - 20;
const minDate = `${minYear}-${currentMonth}-${currentDay}`; // 20 years ago, same month/day

/* ────── CashBook Table Modal ────── */
const CashBookTable: React.FC<{
	data: CashBookItem[];
	fromDate: string;
	toDate: string;
	costCenter: string;
	payeeFilter: string;
	departmentName: string;
	onClose: () => void;
}> = ({data, fromDate, toDate, costCenter, departmentName, onClose}) => {
	const maroon = "text-[#7A0000]";
	const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";

	// Normalize for sorting & grouping
	const normalize = (str: string) =>
		str
			.trim()
			.toUpperCase()
			.replace(/\s+/g, " ")
			.replace(/[.,]/g, "")
			.replace(/\(.*?\)/g, "")
			.replace(/[^A-Z0-9\s]/g, "");

	const grouped = data.reduce((acc, cur) => {
		const raw = cur.Payee?.trim() || "UNKNOWN";
		const key = normalize(raw);
		if (!acc[key]) acc[key] = {display: raw, items: []};
		acc[key].items.push(cur);
		return acc;
	}, {} as Record<string, {display: string; items: CashBookItem[]}>);

	const sortedPayees = Object.keys(grouped).sort((a, b) =>
		a.localeCompare(b, undefined, {sensitivity: "base", numeric: true})
	);

	const sortedGrouped = sortedPayees.reduce((acc, key) => {
		acc[key] = {
			display: grouped[key].display,
			items: grouped[key].items.sort((a, b) =>
				(a.ChqDt || "").localeCompare(b.ChqDt || "")
			),
		};
		return acc;
	}, {} as Record<string, {display: string; items: CashBookItem[]}>);

	const grandTotal = data.reduce((s, r) => s + (r.ChqAmt || 0), 0);

	/* ────── CSV Download ────── */
	const downloadCSV = () => {
		const titleRows = [
			`Cheque Details from ${fromDate} To ${toDate}`,
			`Cost Center: ${costCenter}/${departmentName}`,
			`Currency : LKR`,
			"",
		];

		const headers = [
			"Cheque Run",
			"Date",
			"Payslips No.",
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
		a.download = `CashBook_${costCenter}_${fromDate}_${toDate}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	};

	/* ────── PDF Print ────── */
	const printPDF = () => {
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
        <div style="margin-bottom:20px;">
          <div style="font-weight:bold; margin-bottom:6px; font-size:10px; color:#7A0000;">Payee Name : ${payee}</div>
          <table style="width:100%; border-collapse:collapse; font-size:8.5px; border:1px solid #d1d5db;">
            <thead>
              <tr style="background:linear-gradient(to right,#7A0000,#A52A2A); color:white;">
                <th style="padding:6px 8px; border:1px solid #d1d5db; width:16%;">Cheque Run</th>
                <th style="padding:6px 8px; border:1px solid #d1d5db; width:11%;">Date</th>
                <th style="padding:6px 8px; border:1px solid #d1d5db; width:18%;">Payslips No.</th>
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
      .title { margin: 10px 8px 20px; text-align:center; font-weight:bold; color:#7A0000; font-size:13px; }
      .info  { margin:6px 8px; font-size:9px; display:flex; justify-content:space-between; }
      .costCenter { font-size: 11px; margin-left: 0px; font-weight: 500; } 
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
    <div class="costCenter">
      <strong>Cost Center:</strong> ${costCenter} / ${departmentName}
    </div>
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
		if (!win) {
			toast.error("Popup blocked. Please allow popups.");
			return;
		}
		win.document.write(html);
		win.document.close();
		win.onload = () => win.print();
		win.onafterprint = () => win.close();
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/90 print:static print:inset-auto print:p-0 print:bg-white">
			<div className="relative bg-white w-[95vw] sm:w-[90vw] md:w-[85vw] lg:w-[80vw] xl:w-[75vw] max-w-7xl rounded-2xl shadow-2xl border border-gray-200 overflow-hidden mt-20 md:mt-32 lg:mt-40 lg:ml-64 mx-auto print:relative print:w-full print:max-w-none print:rounded-none print:shadow-none print:border-none print:overflow-visible">
				<div className="p-2 md:p-2 max-h-[80vh] overflow-y-auto print:p-0 print:max-h-none print:overflow-visible print:mt-10 print:ml-12">
					<div className="flex justify-end gap-3 mb-6 md:mb-8 print:hidden">
						<button
							onClick={downloadCSV}
							className="flex items-center gap-1 px-3 py-1.5 border border-blue-400 text-blue-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-blue-50"
						>
							<Download className="w-4 h-4" /> CSV
						</button>
						<button
							onClick={printPDF}
							className="flex items-center gap-1 px-3 py-1.5 border border-green-400 text-green-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-green-50"
						>
							<Printer className="w-4 h-4" /> PDF
						</button>
						<button
							onClick={onClose}
							className="flex items-center gap-1 px-3 py-1.5 border border-red-400 text-red-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-red-50"
						>
							<X className="w-4 h-4" /> Close
						</button>
					</div>

					<h2
						className={`text-lg md:text-xl font-bold text-center md:mb-6 ${maroon}`}
					>
						Cheque Details from {fromDate} To {toDate}
					</h2>
					<div className="flex justify-between text-sm mb-3 ml-5 mr-12">
						<div>
							<span className="font-bold">Cost Center:</span>{" "}
							{costCenter} / {departmentName}
						</div>
						<div className="font-semibold text-gray-600">
							Currency : LKR
						</div>
					</div>

					<div className="ml-5 mt-1 border border-gray-200 rounded-lg overflow-x-auto print:ml-12 print:mt-12 print:overflow-visible">
						<div className="min-w-[1100px]">
							{sortedPayees.map((key) => {
								const {display: payee, items} = sortedGrouped[key];
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
											<thead className={`${maroonGrad} text-white`}>
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
														Payslips No.
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
	);
};

/* ────── MAIN COMPONENT ────── */
const CashBookCCReport: React.FC = () => {
	const {user} = useUser();
	const [departments, setDepartments] = useState<Department[]>([]);
	const [filtered, setFiltered] = useState<Department[]>([]);
	const [searchId, setSearchId] = useState("");
	const [searchName, setSearchName] = useState("");
	const [page, setPage] = useState(1);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const [fromDate, setFromDate] = useState("");
	const [toDate, setToDate] = useState("");
	const [payeeInput, setPayeeInput] = useState("");
	const [selectedDept, setSelectedDept] = useState<Department | null>(null);
	const [reportData, setReportData] = useState<CashBookItem[]>([]);
	const [showReport, setShowReport] = useState(false);
	const [reportLoading, setReportLoading] = useState(false);

	const epfNo = user?.Userno || "";
	const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";

	/* ────── Fetch Departments ────── */
	useEffect(() => {
		const fetchDepartments = async () => {
			if (!epfNo) {
				setError("No EPF number available.");
				toast.error("Login required.");
				setLoading(false);
				return;
			}

			setLoading(true);
			try {
				const res = await fetch(
					`/misapi/api/incomeexpenditure/departments/${epfNo}`
				);
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				const json = await res.json();
				const raw = Array.isArray(json)
					? json
					: json.data || json.result || json.departments || [];
				const deps: Department[] = raw.map((d: any) => ({
					DeptId: String(d.DeptId || d.deptId || ""),
					DeptName: String(d.DeptName || d.deptName || "").trim(),
				}));
				setDepartments(deps);
				setFiltered(deps);
			} catch (e: any) {
				setError(e.message);
				toast.error("Failed to load cost centers.");
			} finally {
				setLoading(false);
			}
		};
		fetchDepartments();
	}, [epfNo]);

	/* ────── Filter Departments ────── */
	useEffect(() => {
		const f = departments.filter(
			(d) =>
				(!searchId ||
					d.DeptId.toLowerCase().includes(searchId.toLowerCase())) &&
				(!searchName ||
					d.DeptName.toLowerCase().includes(searchName.toLowerCase()))
		);
		setFiltered(f);
		setPage(1);
	}, [searchId, searchName, departments]);

	/* ────── Fetch Report — INSTANT "Viewing" ────── */
	const fetchReport = async (dept: Department) => {
		if (!fromDate || !toDate) {
			toast.error("Select date range.");
			return;
		}
		if (new Date(toDate) < new Date(fromDate)) {
			toast.error("'To Date' cannot be earlier than 'From Date'");
			return;
		}
		const payee = payeeInput.trim();

		if (!payee) {
			toast.error("Payee Name is required.");
			return;
		}

		if (payee.length < MIN_PAYEE_LENGTH) {
			toast.error(`Payee must be at least ${MIN_PAYEE_LENGTH} characters.`);
			return;
		}

		if (payee.length > MAX_PAYEE_LENGTH) {
			toast.error(`Payee cannot exceed ${MAX_PAYEE_LENGTH} characters`);
			return;
		}

		setReportLoading(true);
		setSelectedDept(dept);
		setReportData([]);
		setShowReport(true);

		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

		try {
			const payeeParam = payee ? encodeURIComponent(payee) : "";
			const url = `/misapi/api/cashbook/ccreport/${toYYYYMMDD(
				fromDate
			)}/${toYYYYMMDD(toDate)}/${dept.DeptId}/${payeeParam}`;
			const res = await fetch(url, {signal: controller.signal});
			clearTimeout(timeout);

			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const json = await res.json();
			if (!json.success) throw new Error(json.message || "No data");

			const items: CashBookItem[] = json.data || [];
			if (items.length === 0) {
				toast.warn("No records found.");
				setShowReport(false);
				setSelectedDept(null);
				return;
			}

			setReportData(items);
			toast.success(`${items.length} records loaded.`);
		} catch (e: any) {
			if (e.name === "AbortError") {
				toast.error("Request timed out.");
			} else {
				const msg = e.message.includes("Failed to fetch")
					? "Server unreachable."
					: e.message;
				toast.error(msg);
			}
			setReportData([]);
			setShowReport(false);
			setSelectedDept(null);
		} finally {
			setReportLoading(false);
		}
	};

	const clearFilters = () => {
		setSearchId("");
		setSearchName("");
		setPayeeInput("");
		setFromDate("");
		setToDate("");
	};

	const closeReport = () => {
		setShowReport(false);
		setReportData([]);
		setSelectedDept(null);
		setReportLoading(false);
	};

	const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

	return (
		<div
			className="max-w-[95%] mx-auto p-2 md:p-4 bg-white rounded-xl shadow border border-gray-200 text-sm md:text-base font-sans relative ml-16 mt-8"
			style={{marginLeft: "2rem"}}
		>
			<h2 className="text-lg md:text-xl font-bold mb-4 text-[#7A0000]">
				Cost Center Wise Selected Payee Within Date Range
			</h2>

			{/* Date + Payee */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
				<div>
					<label className="block text-xs font-bold text-[#7A0000] mb-1">
						From Date
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
				<div>
					<label className="block text-xs font-bold text-[#7A0000] mb-1">
						To Date
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

				{/* Payee with Helper Text */}
				<div className="relative flex flex-col gap-1">
					<label className="block text-xs font-bold text-[#7A0000] mb-1">
						Payee Name
					</label>
					<input
						type="text"
						value={payeeInput}
						placeholder="Payee Name"
						onChange={(e) => setPayeeInput(e.target.value.toUpperCase())}
						className="w-full px-3 py-1.5 rounded border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-[#7A0000] text-sm uppercase placeholder:normal-case"
					/>

					{/* Dynamic Helper Message */}
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

			{/* Search */}
			<div className="flex flex-wrap gap-2 mb-4">
				<div className="relative">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
					<input
						type="text"
						value={searchId}
						placeholder="Search by ID"
						onChange={(e) => setSearchId(e.target.value)}
						className="pl-10 pr-3 py-1.5 w-40 rounded border border-gray-300 focus:ring-2 focus:ring-[#7A0000] text-sm"
					/>
				</div>
				<div className="relative">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
					<input
						type="text"
						value={searchName}
						placeholder="Search by Name"
						onChange={(e) => setSearchName(e.target.value)}
						className="pl-10 pr-3 py-1.5 w-40 rounded border border-gray-300 focus:ring-2 focus:ring-[#7A0000] text-sm"
					/>
				</div>
				{(searchId || searchName) && (
					<button
						onClick={clearFilters}
						className="flex items-center gap-1 px-3 py-1.5 border rounded bg-gray-100 hover:bg-gray-200 text-xs"
					>
						<RotateCcw className="w-3 h-3" /> Clear
					</button>
				)}
			</div>

			{/* Loading Spinner */}
			{loading && (
				<div className="flex flex-col items-center justify-center py-12">
					<div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[#7A0000]"></div>
					<p className="mt-3 text-gray-600 text-sm">
						Loading cost centers...
					</p>
				</div>
			)}

			{/* Error */}
			{error && (
				<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">
					{error}
				</div>
			)}

			{/* Table */}
			{!loading && !error && filtered.length > 0 && (
				<>
					<div className="overflow-x-auto rounded-lg border border-gray-200">
						<div className="max-h-[50vh] overflow-y-auto">
							<table className="w-full table-fixed text-left text-xs md:text-sm">
								<thead
									className={`${maroonGrad} text-white sticky top-0`}
								>
									<tr>
										<th className="px-4 py-2 w-1/4">
											Cost Center Code
										</th>
										<th className="px-4 py-2 w-1/2">
											Cost Center Name
										</th>
										<th className="px-4 py-2 w-1/4 text-center">
											Action
										</th>
									</tr>
								</thead>
								<tbody>
									{paginated.map((dept, i) => (
										<tr
											key={i}
											className={i % 2 ? "bg-white" : "bg-gray-50"}
										>
											<td className="px-4 py-2 truncate">
												{dept.DeptId}
											</td>
											<td className="px-4 py-2 truncate">
												{dept.DeptName}
											</td>
											<td className="px-4 py-2 text-center">
												<button
													onClick={() => fetchReport(dept)}
													disabled={!fromDate || !toDate}
													className={`px-3 py-1 rounded text-xs font-medium hover:brightness-110 transition shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1
                            ${
											selectedDept?.DeptId === dept.DeptId &&
											reportLoading
												? "bg-green-600 text-white"
												: selectedDept?.DeptId === dept.DeptId
												? "bg-green-600 text-white"
												: `${maroonGrad} text-white`
										}`}
												>
													<Eye className="w-3 h-3" />
													{selectedDept?.DeptId === dept.DeptId &&
													reportLoading
														? "Viewing"
														: selectedDept?.DeptId === dept.DeptId
														? "Viewing"
														: "View"}
												</button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>

					<div className="flex justify-end items-center gap-3 mt-3">
						<button
							onClick={() => setPage((p) => Math.max(1, p - 1))}
							disabled={page === 1}
							className="px-3 py-1 border rounded bg-white text-gray-600 text-xs hover:bg-gray-100 disabled:opacity-40"
						>
							Previous
						</button>
						<span className="text-xs text-gray-600">
							Page {page} of {Math.ceil(filtered.length / PAGE_SIZE)}
						</span>
						<button
							onClick={() =>
								setPage((p) =>
									Math.min(
										Math.ceil(filtered.length / PAGE_SIZE),
										p + 1
									)
								)
							}
							disabled={page >= Math.ceil(filtered.length / PAGE_SIZE)}
							className="px-3 py-1 border rounded bg-white text-gray-600 text-xs hover:bg-gray-100 disabled:opacity-40"
						>
							Next
						</button>
					</div>
				</>
			)}

			{/* ────── Report Modal with Loading & Empty States ────── */}
			{showReport && selectedDept && (
				<div className="fixed inset-0 z-50 bg-transparent flex items-center justify-center p-4">
					<div className="relative bg-white w-full max-w-[95vw] sm:max-w-4xl md:max-w-6xl lg:max-w-7xl rounded-2xl shadow-2xl overflow-hidden">
						{/* LOADING OVERLAY */}
						{reportLoading && (
							<div className="absolute inset-0 bg-white/95 z-50 flex flex-col items-center justify-center gap-4">
								<div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#7A0000]"></div>
								<p className="text-xl font-bold text-[#7A0000]">
									Loading Report...
								</p>
								<p className="text-sm text-gray-600">
									Fetching cheque details from server
								</p>
							</div>
						)}
						{/* ACTUAL REPORT */}
						{!reportLoading && reportData.length > 0 && (
							<CashBookTable
								data={reportData}
								fromDate={fromDate}
								toDate={toDate}
								costCenter={selectedDept.DeptId}
								payeeFilter={payeeInput}
								departmentName={selectedDept.DeptName}
								onClose={closeReport}
							/>
						)}
					</div>
				</div>
			)}
		</div>
	);
};

export default CashBookCCReport;
