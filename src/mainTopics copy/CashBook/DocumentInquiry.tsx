// DocumentInquiry.tsx
import React, {useEffect, useState} from "react";
import {Search, RotateCcw, Eye, X, Download, Printer} from "lucide-react";
import {useUser} from "../../contexts/UserContext";
import {toast} from "react-toastify";
interface Department {
	DeptId: string;
	DeptName: string;
}
// Updated to exactly match backend DocumentInquiryModel
interface DocumentInquiryItem {
	Category: string;
	DocDt: string; // from DOC_DT → formatted later
	NonTaxabl: string;
	DocNo: string;
	ApprvUid1: string;
	ApprDt1: string;
	TranStatus: string;
	Payee: string;
	ChqDt: string;
	ChqNo: string;
	PymtDocno: string;
	PpStatus: string;
	CctName: string;
}
/* ────── Constants ────── */
const PAGE_SIZE = 9;
const FETCH_TIMEOUT_MS = 240000;
/* ────── Helpers ────── */
const formatDate = (dateStr: string | null | undefined): string => {
	if (!dateStr?.trim()) return "";
	const dt = dateStr.trim();

	// Handle ISO datetime: "2025-01-09T00:00:00" → take date part only
	if (dt.includes("T")) {
		return dt.split("T")[0].replace(/-/g, "/");
	}

	// Handle YYYYMMDD format
	if (/^\d{8}$/.test(dt)) {
		return `${dt.slice(0, 4)}/${dt.slice(4, 6)}/${dt.slice(6)}`;
	}

	// Handle YYYY-MM-DD
	if (/^\d{4}-\d{2}-\d{2}$/.test(dt)) {
		return dt.replace(/-/g, "/");
	}

	return dt; // fallback
};
const csvEscape = (val: string | number | null | undefined): string => {
	if (val == null) return "";
	const str = String(val);
	return /[,\n"]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
};

const formatAmount = (amount: string | number | null | undefined): string => {
	if (amount == null || amount === "" || isNaN(Number(amount))) return "0.00";
	const num = parseFloat(String(amount));
	return num.toLocaleString("en-LK", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
};

const today = new Date();
const currentYear = today.getFullYear();
const currentMonth = String(today.getMonth() + 1).padStart(2, "0");
const currentDay = String(today.getDate()).padStart(2, "0");
const maxDate = `${currentYear}-${currentMonth}-${currentDay}`; // Today's date: YYYY-MM-DD

const minYear = currentYear - 20;
const minDate = `${minYear}-${currentMonth}-${currentDay}`; // 20 years ago, same month/day

const toYYYYMMDD = (date: string): string => date.replace(/-/g, "");
/* ────── Single Table Modal (No Payee Grouping) ────── */
const DocumentInquiryTable: React.FC<{
	data: DocumentInquiryItem[];
	fromDate: string;
	toDate: string;
	costCenter: string;
	departmentName: string;
	onClose: () => void;
}> = ({data, fromDate, toDate, costCenter, departmentName, onClose}) => {
	const maroon = "text-[#7A0000]";
	const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";
	// Sort by DocDt then DocNo
	// Primary: Sort by Payslip No. (DocNo), Secondary: by Transaction Date
	const sortedData = [...data].sort((a, b) => {
		// First compare Payslip No. (DocNo) – treat as string, but pad numbers if needed
		const docNoA = (a.DocNo || "").trim().padStart(10, "0");
		const docNoB = (b.DocNo || "").trim().padStart(10, "0");

		const docNoCmp = docNoA.localeCompare(docNoB);
		if (docNoCmp !== 0) return docNoCmp;

		// If same Payslip No., fallback to Transaction Date
		const dateA = a.DocDt || "";
		const dateB = b.DocDt || "";
		return dateA.localeCompare(dateB);
	});
	/* ────── CSV Download ────── */
	const downloadCSV = () => {
		const titleRows = [
			`Cost Centerwise Pay Slips Inquiry Report - From ${fromDate} To ${toDate}`,
			`Cost Center: ${costCenter}/${departmentName}`,
			`Currency : LKR`,
			"",
		];
		const headers = [
			"Category",
			"Transaction Date",
			"Payslips No.",
			"Amount",
			"Approved by",
			"Approved",
			"PaySlip-Status",
			"Payee",
			"Chq Date",
			"Cheque No",
			"PP No.",
			"Cheque-Status",
		];
		const rows = sortedData.map((it) =>
			[
				csvEscape(it.Category),
				csvEscape(formatDate(it.DocDt)),
				csvEscape(it.DocNo),
				csvEscape(formatAmount(it.NonTaxabl)),
				csvEscape(it.ApprvUid1),
				csvEscape(it.ApprDt1),
				csvEscape(it.TranStatus),
				csvEscape(it.Payee),
				csvEscape(it.ChqDt),
				csvEscape(it.ChqNo),
				csvEscape(it.PymtDocno),
				csvEscape(it.PpStatus),
			].join(",")
		);
		const csv = [...titleRows, headers.join(","), ...rows].join("\n");
		const blob = new Blob([csv], {type: "text/csv;charset=utf-8;"});
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `CashBook_Inquiry_${costCenter}_${fromDate}_${toDate}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	};
	/* ────── Print PDF ────── */
	const printPDF = () => {
		let rowsHTML = "";
		sortedData.forEach((it, i) => {
			rowsHTML += `
        <tr class="${i % 2 ? "bg-white" : "bg-gray-50"}">
          <td class="px-3 py-2 border-l border-r border-gray-300 text-left text-xs">${
					it.Category || ""
				}</td>
          <td class="px-3 py-2 border-r border-gray-300 text-center text-xs">${formatDate(
					it.DocDt
				)}</td>
          <td class="px-3 py-2 border-r border-gray-300 text-left text-xs">${
					it.DocNo || ""
				}</td>
          <td class="px-3 py-2 border-r border-gray-300 text-left text-xs">${
					formatAmount(it.NonTaxabl) || ""
				}</td>
          <td class="px-3 py-2 border-r border-gray-300 text-left text-xs">${
					it.ApprvUid1 || ""
				}</td>
          <td class="px-3 py-2 border-r border-gray-300 text-center text-xs">${
					it.ApprDt1 || ""
				}</td>
          <td class="px-3 py-2 border-r border-gray-300 text-left text-xs">${
					it.TranStatus || ""
				}</td>
          <td class="px-3 py-2 border-r border-gray-300 text-left text-xs break-words">${
					it.Payee || ""
				}</td>
          <td class="px-3 py-2 border-r border-gray-300 text-center text-xs">${
					it.ChqDt || ""
				}</td>
          <td class="px-3 py-2 border-r border-gray-300 text-left text-xs">${
					it.ChqNo || ""
				}</td>
          <td class="px-3 py-2 border-r border-gray-300 text-left text-xs">${
					it.PymtDocno || ""
				}</td>
          <td class="px-3 py-2 border-r border-gray-300 text-left text-xs">${
					it.PpStatus || ""
				}</td>
        </tr>`;
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
      .info { margin:6px 8px; font-size:9px; display:flex; justify-content:space-between; }
      table { border-collapse:collapse; width:100%; font-size:8.5px; }
      th, td { border:1px solid #d1d5db; padding:6px 8px; word-wrap:break-word; }
      th { background:linear-gradient(to right,#7A0000,#A52A2A); color:white; text-align:center; font-weight:bold; }
      @page {
        @bottom-left { content:"Printed on: ${new Date().toLocaleString(
				"en-US",
				{timeZone: "Asia/Colombo"}
			)}"; font-size:7px; color:gray; }
        @bottom-right { content:"Page " counter(page) " of " counter(pages); font-size:7px; color:gray; }
      }
    }
  </style>
</head>
<body>
  <div class="title">Cost Centerwise Pay Slips Inquiry Report - From ${fromDate} To ${toDate}</div>
  <div class="info">
    <div><strong>Cost Center:</strong> ${costCenter} / ${departmentName}</div>
    <div style="font-weight:600; color:#4B5563;">Currency : LKR</div>
  </div>
  <table style="width:100%; border-collapse:collapse; font-size:8.5px; border:1px solid #d1d5db;">
    <thead>
      <tr style="background:linear-gradient(to right,#7A0000,#A52A2A); color:white;">
        <th style="padding:6px 8px; width:6%;">Category</th>
        <th style="padding:6px 8px; width:6%;">Transaction Date</th>
        <th style="padding:6px 8px; width:8%;">Payslips No.</th>
        <th style="padding:6px 8px; width:8%;">Amount</th>
        <th style="padding:6px 8px; width:6%;">Approved by</th>
        <th style="padding:6px 8px; width:7%;">Approved</th>
        <th style="padding:6px 8px; width:9%;">PaySlip-Status</th>
        <th style="padding:6px 8px; width:17%;">Payee</th>
        <th style="padding:6px 8px; width:7%;">Chq Date</th>
        <th style="padding:6px 8px; width:7%;">Cheque No</th>
        <th style="padding:6px 8px; width:8%;">PP No.</th>
        <th style="padding:6px 8px; width:9%;">Cheque-Status</th>
      </tr>
    </thead>
    <tbody>${rowsHTML}</tbody>
  </table>
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
						Cost Centerwise Pay Slips Inquiry Report - From {fromDate} To{" "}
						{toDate}
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
					<div className="ml-5 mt-1 mb-5 border border-gray-200 rounded-lg overflow-x-auto print:ml-12 print:mt-12 print:overflow-visible">
						<div className="min-w-[1400px]">
							<table className="w-full text-xs border-collapse">
								<thead className={`${maroonGrad} text-white`}>
									<tr>
										<th className="px-4 py-2 border border-gray-300">
											Category
										</th>
										<th className="px-4 py-2 border border-gray-300">
											Transaction Date
										</th>
										<th className="px-4 py-2 border border-gray-300">
											Payslips No.
										</th>
										<th className="px-4 py-2 border border-gray-300">
											Amount
										</th>
										<th className="px-4 py-2 border border-gray-300">
											Approved by
										</th>
										<th className="px-4 py-2 border border-gray-300">
											Approved
										</th>
										<th className="px-4 py-2 border border-gray-300">
											PaySlip-Status
										</th>
										<th className="px-4 py-2 border border-gray-300">
											Payee
										</th>
										<th className="px-4 py-2 border border-gray-300">
											Chq Date
										</th>
										<th className="px-4 py-2 border border-gray-300">
											Cheque No
										</th>
										<th className="px-4 py-2 border border-gray-300">
											PP No.
										</th>
										<th className="px-4 py-2 border border-gray-300">
											Cheque-Status
										</th>
									</tr>
								</thead>
								<tbody>
									{sortedData.map((it, i) => (
										<tr
											key={i}
											className={
												i % 2 === 0 ? "bg-white" : "bg-gray-50"
											}
										>
											<td className="px-4 py-2 border-l border-r border-gray-300">
												{it.Category}
											</td>
											<td className="px-4 py-2 text-center border-r border-gray-300">
												{formatDate(it.DocDt)}
											</td>
											<td className="px-4 py-2 border-r border-gray-300">
												{it.DocNo}
											</td>
											<td className="px-4 py-2 border-r border-gray-300">
												{formatAmount(it.NonTaxabl)}
											</td>
											<td className="px-4 py-2 border-r border-gray-300">
												{it.ApprvUid1}
											</td>
											<td className="px-4 py-2 text-center border-r border-gray-300">
												{it.ApprDt1}
											</td>
											<td className="px-4 py-2 border-r border-gray-300">
												{it.TranStatus}
											</td>
											<td className="px-4 py-2 border-r border-gray-300 break-words">
												{it.Payee}
											</td>
											<td className="px-4 py-2 text-center border-r border-gray-300">
												{it.ChqDt}
											</td>
											<td className="px-4 py-2 border-r border-gray-300">
												{it.ChqNo}
											</td>
											<td className="px-4 py-2 border-r border-gray-300">
												{it.PymtDocno}
											</td>
											<td className="px-4 py-2 border-r border-gray-300">
												{it.PpStatus}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};
/* ────── MAIN COMPONENT (Unchanged except URL) ────── */
const DocumentInquiry: React.FC = () => {
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
	const [selectedDept, setSelectedDept] = useState<Department | null>(null);
	const [reportData, setReportData] = useState<DocumentInquiryItem[]>([]);
	const [showReport, setShowReport] = useState(false);
	const [reportLoading, setReportLoading] = useState(false);
	const epfNo = user?.Userno || "";
	const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";
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
	const fetchReport = async (dept: Department) => {
		if (!fromDate || !toDate) {
			toast.error("Select date range.");
			return;
		}
		if (new Date(toDate) < new Date(fromDate)) {
			toast.error("'To Date' cannot be earlier than 'From Date'");
			return;
		}
		setReportLoading(true);
		setSelectedDept(dept);
		setReportData([]);
		setShowReport(true);
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
		try {
			const url = `/misapi/api/documentinquiry/cashbook?costCtr=${
				dept.DeptId
			}&fromDate=${toYYYYMMDD(fromDate)}&toDate=${toYYYYMMDD(toDate)}`;
			const res = await fetch(url, {signal: controller.signal});
			clearTimeout(timeout);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const json = await res.json();
			if (!json.success) throw new Error(json.message || "No data");
			const items: DocumentInquiryItem[] = json.data || [];
			if (items.length === 0) {
				toast.warn("No records found.");
				setShowReport(false);
				setSelectedDept(null);
				return;
			}
			setReportData(items);
			toast.success(`${items.length} records loaded.`);
		} catch (e: any) {
			toast.error(
				e.name === "AbortError"
					? "Request timed out."
					: e.message.includes("Failed to fetch")
					? "Server unreachable."
					: e.message
			);
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
				Cost Center Wise Document Inquiry Cash Book With Cheque Details
			</h2>
			<div className="flex justify-end gap-6 mb-4">
				<div className="flex items-center gap-2">
					<label className="text-xs font-bold text-[#7A0000]">
						From Date:
					</label>
					<input
						type="date"
						value={fromDate}
						onChange={(e) => setFromDate(e.target.value)}
						min={minDate}
						max={maxDate}
						className="pl-3 pr-3 py-1.5 rounded-md border border-gray-300 bg-white
                 focus:outline-none focus:ring-2 focus:ring-[#7A0000] transition text-sm"
					/>
				</div>
				<div className="flex items-center gap-2">
					<label className="text-xs font-bold text-[#7A0000]">
						To Date:
					</label>
					<input
						type="date"
						value={toDate}
						onChange={(e) => setToDate(e.target.value)}
						min={minDate}
						max={maxDate}
						className="pl-3 pr-3 py-1.5 rounded-md border border-gray-300 bg-white
                 focus:outline-none focus:ring-2 focus:ring-[#7A0000] transition text-sm"
					/>
				</div>
			</div>
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
			{loading && (
				<div className="flex flex-col items-center justify-center py-12">
					<div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[#7A0000]"></div>
					<p className="mt-3 text-gray-600 text-sm">
						Loading cost centers...
					</p>
				</div>
			)}
			{error && (
				<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">
					{error}
				</div>
			)}
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
			{showReport && selectedDept && (
				<div className="fixed inset-0 z-50 bg-transparent flex items-center justify-center p-4">
					<div className="relative bg-white w-full max-w-[95vw] sm:max-w-4xl md:max-w-6xl lg:max-w-7xl rounded-2xl shadow-2xl overflow-hidden">
						{reportLoading && (
							<div className="absolute inset-0 bg-white/95 z-50 flex flex-col items-center justify-center gap-4">
								<div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#7A0000]"></div>
								<p className="text-xl font-bold text-[#7A0000]">
									Loading Report...
								</p>
								<p className="text-sm text-gray-600">
									Fetching document details from server
								</p>
							</div>
						)}
						{!reportLoading && reportData.length > 0 && (
							<DocumentInquiryTable
								data={reportData}
								fromDate={fromDate}
								toDate={toDate}
								costCenter={selectedDept.DeptId}
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
export default DocumentInquiry;
