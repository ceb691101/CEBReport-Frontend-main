// src/mainTopics/SMC-ManagementInfo/CostPaidJobProgress.tsx
import React, { useEffect, useState } from "react";
import { Download, Printer, X, RotateCcw, Eye, Search } from "lucide-react";
import { toast } from "react-toastify";
import { useUser } from "../../contexts/UserContext";

interface Department {
	DeptId: string;
	DeptName: string;
}

export interface CostPaidJobProgressItem {
	ApplicationNo?: string | null;
	applicationNo?: string | null;
	SubmitDate?: string | null;
	submitDate?: string | null;
	Name?: string | null;
	name?: string | null;
	Address?: string | null;
	address?: string | null;
	ApprovedDate?: string | null;
	approvedDate?: string | null;
	PivNo?: string | null;
	pivNo?: string | null;
	PaidDate?: string | null;
	paidDate?: string | null;
	PivAmount?: number | string | null;
	pivAmount?: number | string | null;
	AllocatedDate?: string | null;
	allocatedDate?: string | null;
	FinishedDate?: string | null;
	finishedDate?: string | null;
	ContractorId?: string | null;
	contractorId?: string | null;
	ProjectNo?: string | null;
	projectNo?: string | null;
	EstimateDate?: string | null;
	estimateDate?: string | null;
	ReinspectionPivNo?: string | null;
	reinspectionPivNo?: string | null;
	ReinspectionPivDate?: string | null;
	reinspectionPivDate?: string | null;
	ProjectAssignedDate?: string | null;
	projectAssignedDate?: string | null;
	BillNo?: string | null;
	billNo?: string | null;
	BillDate?: string | null;
	billDate?: string | null;
	CctName?: string | null;
	cctName?: string | null;
}

/* ────── Constants ────── */
const COMPANY_NAME = "Electricity Distribution Lanka (Private) Limited";
const MAX_RECORDS = 5000;
const FETCH_TIMEOUT_MS = 120000;
const PAGE_SIZE = 9;

/* ────── Formatting helpers ────── */
const formatNumber = (num: number | string | null | undefined): string => {
	const n = num === null || num === undefined || num === "" ? NaN : Number(num);
	if (isNaN(n)) return "-";
	const abs = Math.abs(n);
	const formatted = abs.toLocaleString("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
	return n < 0 ? `(${formatted})` : formatted;
};

const formatDate = (dateStr: string | null | undefined): string => {
	if (!dateStr) return "-";
	const d = new Date(dateStr);
	if (isNaN(d.getTime())) return "-";
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
};

const formatText = (val: string | null | undefined): string => {
	if (!val || val === "null" || val === "undefined" || val.trim() === "") {
		return "-";
	}
	return val.trim();
};

const csvEscape = (val: string | number | null | undefined): string => {
	if (val === null || val === undefined) return '""';
	const str = String(val);
	if (/[,\n"\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
	return str;
};

const today = new Date();
const currentYear = today.getFullYear();
const currentMonth = String(today.getMonth() + 1).padStart(2, "0");
const currentDay = String(today.getDate()).padStart(2, "0");
const maxDate = `${currentYear}-${currentMonth}-${currentDay}`;

const minYear = currentYear - 20;
const minDate = `${minYear}-${currentMonth}-${currentDay}`;

/* ────── MAIN COMPONENT ────── */
const CostPaidJobProgress: React.FC = () => {
	const { user } = useUser();
	const epfNo = user?.Userno || "";

	/* ── Cost center list state ── */
	const [departments, setDepartments] = useState<Department[]>([]);
	const [filtered, setFiltered] = useState<Department[]>([]);
	const [searchId, setSearchId] = useState("");
	const [searchName, setSearchName] = useState("");
	const [page, setPage] = useState(1);
	const [deptLoading, setDeptLoading] = useState(true);
	const [deptError, setDeptError] = useState<string | null>(null);

	/* ── Filter Form state ── */
	const [fromDate, setFromDate] = useState("");
	const [toDate, setToDate] = useState("");
	const [applicationNo, setApplicationNo] = useState("");

	/* ── Report view state ── */
	const [selectedDept, setSelectedDept] = useState<Department | null>(null);
	const [reportData, setReportData] = useState<CostPaidJobProgressItem[]>([]);
	const [reportLoading, setReportLoading] = useState(false);
	const [showReport, setShowReport] = useState(false);
	const [searchedAppNo, setSearchedAppNo] = useState("");

	const maroon = "text-[#7A0000]";
	const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";

	/* ────── Fetch Cost Centers (Departments) ────── */
	useEffect(() => {
		const fetchDepartments = async () => {
			if (!epfNo) {
				setDeptError("No EPF number available.");
				toast.error("Login required.");
				setDeptLoading(false);
				return;
			}

			setDeptLoading(true);
			try {
				const res = await fetch(
					`/misapi/api/incomeexpenditure/departments/${encodeURIComponent(epfNo)}`
				);
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				const json = await res.json();
				const raw = Array.isArray(json)
					? json
					: json.data || json.result || json.departments || [];
				const deps: Department[] = raw.map((d: any) => ({
					DeptId: String(d.DeptId || d.deptId || "").trim(),
					DeptName: String(d.DeptName || d.deptName || "").trim(),
				})).filter((d: Department) => d.DeptId.length > 0);

				setDepartments(deps);
				setFiltered(deps);
			} catch (e: any) {
				setDeptError(e.message);
				toast.error("Failed to load cost centers.");
			} finally {
				setDeptLoading(false);
			}
		};
		fetchDepartments();
	}, [epfNo]);

	/* ────── Filter Departments by ID and Name ────── */
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
		if (!applicationNo.trim()) {
			toast.error("Please enter Application No.");
			return false;
		}
		return true;
	};

	/* ────── Fetch report for a selected Cost Center ────── */
	const fetchReport = async (dept: Department) => {
		if (!validateInputs()) return;

		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

		setSelectedDept(dept);
		setSearchedAppNo(applicationNo.trim());
		setReportLoading(true);
		setReportData([]);
		setShowReport(true);

		try {
			const params = new URLSearchParams({
				deptId: dept.DeptId.trim(),
				applicationNo: applicationNo.trim(),
				fromDate: fromDate.trim(),
				toDate: toDate.trim(),
			});

			const primaryUrl = `/api/cost-paid-job-progress/report?${params.toString()}`;
			let res: Response;

			try {
				res = await fetch(primaryUrl, {
					credentials: "include",
					signal: controller.signal,
				});

				// Fallback to /misapi/api prefix if 404 (e.g. reverse proxy path)
				if (res.status === 404) {
					const fallbackUrl = `/misapi/api/cost-paid-job-progress/report?${params.toString()}`;
					const fallbackRes = await fetch(fallbackUrl, {
						credentials: "include",
						signal: controller.signal,
					});
					if (fallbackRes.ok || fallbackRes.status !== 404) {
						res = fallbackRes;
					}
				}
			} catch (fetchErr: any) {
				const fallbackUrl = `/misapi/api/cost-paid-job-progress/report?${params.toString()}`;
				res = await fetch(fallbackUrl, {
					credentials: "include",
					signal: controller.signal,
				});
			}

			clearTimeout(timeoutId);

			if (!res.ok) {
				const txt = await res.text().catch(() => "");
				let message = `HTTP ${res.status}`;
				try {
					const parsed = JSON.parse(txt);
					message = parsed.Message || parsed.message || parsed.ExceptionMessage || message;
				} catch {
					if (txt.trim()) message = txt;
				}
				throw new Error(message);
			}

			const json = await res.json();
			const items: CostPaidJobProgressItem[] = Array.isArray(json)
				? json
				: Array.isArray(json.data)
					? json.data
					: Array.isArray(json.result)
						? json.result
						: [];

			if (items.length > MAX_RECORDS) {
				throw new Error(
					`Too many records (${items.length}). Please refine your search.`
				);
			}

			if (items.length === 0) {
				toast.warn("No records found for the selected criteria.");
				setShowReport(false);
				setSelectedDept(null);
				return;
			}

			setReportData(items);
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
	};

	/* ────── Clear All ────── */
	const clearAll = () => {
		setFromDate("");
		setToDate("");
		setApplicationNo("");
		setSearchId("");
		setSearchName("");
		setShowReport(false);
		setReportData([]);
		setSelectedDept(null);
		setSearchedAppNo("");
		toast.info("Filters cleared.");
	};

	/* ────── Close Report (Preserves From Date, To Date, Application No.) ────── */
	const closeReport = () => {
		setShowReport(false);
		setReportData([]);
		setSelectedDept(null);
		setReportLoading(false);
	};

	/* ────── Sorted Data ────── */
	const sortedData = [...reportData].sort((a, b) =>
		(a.ApplicationNo || a.applicationNo || "").localeCompare(
			b.ApplicationNo || b.applicationNo || ""
		)
	);

	const grandTotalPivAmount = reportData.reduce((sum, r) => {
		const val = Number(r.PivAmount ?? r.pivAmount);
		return isNaN(val) ? sum : sum + val;
	}, 0);

	const costCenterName =
		reportData.find((r) => r.CctName || r.cctName)?.CctName ||
		reportData.find((r) => r.CctName || r.cctName)?.cctName ||
		selectedDept?.DeptName ||
		"";
	const costCenterDisplay = selectedDept?.DeptId || "";

	/* ────── Field Resolvers for Table Row ────── */
	const getRowValues = (row: CostPaidJobProgressItem) => ({
		appNo: formatText(row.ApplicationNo ?? row.applicationNo),
		submitDate: formatDate(row.SubmitDate ?? row.submitDate),
		name: formatText(row.Name ?? row.name),
		address: formatText(row.Address ?? row.address),
		approvedDate: formatDate(row.ApprovedDate ?? row.approvedDate),
		pivNo: formatText(row.PivNo ?? row.pivNo),
		paidDate: formatDate(row.PaidDate ?? row.paidDate),
		pivAmount: formatNumber(row.PivAmount ?? row.pivAmount),
		allocatedDate: formatDate(row.AllocatedDate ?? row.allocatedDate),
		finishedDate: formatDate(row.FinishedDate ?? row.finishedDate),
		contractorId: formatText(row.ContractorId ?? row.contractorId),
		projectNo: formatText(row.ProjectNo ?? row.projectNo),
		estimateDate: formatDate(row.EstimateDate ?? row.estimateDate),
		reinspectionPivNo: formatText(row.ReinspectionPivNo ?? row.reinspectionPivNo),
		reinspectionPivDate: formatDate(row.ReinspectionPivDate ?? row.reinspectionPivDate),
		projectAssignedDate: formatDate(row.ProjectAssignedDate ?? row.projectAssignedDate),
		billNo: formatText(row.BillNo ?? row.billNo),
		billDate: formatDate(row.BillDate ?? row.billDate),
	});

	/* ────── CSV Download ────── */
	const downloadCSV = () => {
		if (reportData.length === 0) return;

		const titleRows = [
			`C/C Cost Paid Job Progress Report - From ${fromDate} To ${toDate}`,
			`Cost Center : ${costCenterDisplay}/${costCenterName}`,
			`Application No : ${searchedAppNo || applicationNo}`,
			"",
		];

		const headers = [
			"Serial No.",
			"Application No.",
			"Submit Date",
			"Applicant Name",
			"Address",
			"Approved Date",
			"PIV No.",
			"Paid Date",
			"PIV Amount",
			"Allocated Date",
			"Finished Date",
			"Contractor ID",
			"Job No.",
			"Estimate Date",
			"PIV 2 No.",
			"PIV 2 Paid Date",
			"Project Assigned Date",
			"Bill No.",
			"Bill Date",
		];
		const rows: string[] = [headers.join(",")];

		sortedData.forEach((row, i) => {
			const v = getRowValues(row);
			rows.push(
				[
					csvEscape(i + 1),
					csvEscape(v.appNo),
					csvEscape(v.submitDate),
					csvEscape(v.name),
					csvEscape(v.address),
					csvEscape(v.approvedDate),
					csvEscape(v.pivNo),
					csvEscape(v.paidDate),
					csvEscape(v.pivAmount),
					csvEscape(v.allocatedDate),
					csvEscape(v.finishedDate),
					csvEscape(v.contractorId),
					csvEscape(v.projectNo),
					csvEscape(v.estimateDate),
					csvEscape(v.reinspectionPivNo),
					csvEscape(v.reinspectionPivDate),
					csvEscape(v.projectAssignedDate),
					csvEscape(v.billNo),
					csvEscape(v.billDate),
				].join(",")
			);
		});

		rows.push(
			`Total,,,,,,,,${csvEscape(formatNumber(grandTotalPivAmount))},,,,,,,,,,`
		);

		const csv = [...titleRows, ...rows].join("\n");
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `CostPaidJobProgress_${fromDate}_${toDate}.csv`;
		a.click();
		URL.revokeObjectURL(url);
		toast.success("CSV export downloaded successfully.");
	};

	/* ────── PDF Print ────── */
	const printPDF = () => {
		if (reportData.length === 0) return;

		let rows = "";
		sortedData.forEach((row, i) => {
			const v = getRowValues(row);
			rows += `
				<tr class="${i % 2 ? "bg-white" : "bg-gray-50"}">
					<td class="px-2 py-1.5 border-l border-r border-gray-300 text-center text-xs">${i + 1}</td>
					<td class="px-2 py-1.5 border-r border-gray-300 text-left text-xs font-mono">${v.appNo}</td>
					<td class="px-2 py-1.5 border-r border-gray-300 text-center text-xs">${v.submitDate}</td>
					<td class="px-2 py-1.5 border-r border-gray-300 text-left text-xs">${v.name}</td>
					<td class="px-2 py-1.5 border-r border-gray-300 text-left text-xs">${v.address}</td>
					<td class="px-2 py-1.5 border-r border-gray-300 text-center text-xs">${v.approvedDate}</td>
					<td class="px-2 py-1.5 border-r border-gray-300 text-center text-xs font-mono">${v.pivNo}</td>
					<td class="px-2 py-1.5 border-r border-gray-300 text-center text-xs">${v.paidDate}</td>
					<td class="px-2 py-1.5 border-r border-gray-300 text-right text-xs font-mono font-semibold">${v.pivAmount}</td>
					<td class="px-2 py-1.5 border-r border-gray-300 text-center text-xs">${v.allocatedDate}</td>
					<td class="px-2 py-1.5 border-r border-gray-300 text-center text-xs">${v.finishedDate}</td>
					<td class="px-2 py-1.5 border-r border-gray-300 text-center text-xs font-mono">${v.contractorId}</td>
					<td class="px-2 py-1.5 border-r border-gray-300 text-center text-xs font-mono">${v.projectNo}</td>
					<td class="px-2 py-1.5 border-r border-gray-300 text-center text-xs">${v.estimateDate}</td>
					<td class="px-2 py-1.5 border-r border-gray-300 text-center text-xs font-mono">${v.reinspectionPivNo}</td>
					<td class="px-2 py-1.5 border-r border-gray-300 text-center text-xs">${v.reinspectionPivDate}</td>
					<td class="px-2 py-1.5 border-r border-gray-300 text-center text-xs">${v.projectAssignedDate}</td>
					<td class="px-2 py-1.5 border-r border-gray-300 text-center text-xs font-mono">${v.billNo}</td>
					<td class="px-2 py-1.5 border-r border-gray-300 text-center text-xs">${v.billDate}</td>
				</tr>
			`;
		});

		const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    @page {
      size: landscape;
      margin: 10mm 5mm 10mm 5mm;
      @top-left { content: ""; }
      @top-center {
        content: "${COMPANY_NAME}";
        font-size: 8.5px;
        font-weight: normal;
        color: #333;
        font-family: Arial, sans-serif;
      }
      @top-right { content: ""; }
      @bottom-left {
        content: "Printed on: ${new Date().toLocaleString("en-US", { timeZone: "Asia/Colombo" })}";
        font-size: 7px;
        color: gray;
        font-family: Arial, sans-serif;
      }
      @bottom-right {
        content: "Page " counter(page) " of " counter(pages);
        font-size: 7px;
        color: gray;
        font-family: Arial, sans-serif;
      }
    }
    @media print {
      body { margin:0; font-family:Arial,Helvetica,sans-serif; }
      .title { margin: 8px 8px 15px; text-align:center; font-weight:bold; color:#7A0000; font-size:14px; }
      .info { margin:6px 8px 12px; font-size:10px; display:flex; justify-content:space-between; }
      table { border-collapse:collapse; width:100%; font-size:8px; }
      th, td { border:1px solid #d1d5db; padding:5px 6px; word-wrap:break-word; }
      th { background:linear-gradient(to right,#7A0000,#A52A2A); color:white; text-align:center; font-weight:bold; }
      tfoot td { background:#d3d3d3; font-weight:bold; }
      .font-mono { font-family:monospace; }
    }
  </style>
</head>
<body>
  <div class="title">C/C Cost Paid Job Progress Report - From ${fromDate} To ${toDate}</div>
  <div class="info">
    <div>
      <div><strong>Cost Center :</strong> ${costCenterDisplay}/${costCenterName}</div>
      <div><strong>Application No :</strong> ${searchedAppNo || applicationNo}</div>
    </div>
    <div style="text-align:right;">
      <div><strong>Total Records :</strong> ${reportData.length}</div>
    </div>
  </div>
  <table style="width:100%; border-collapse:collapse; font-size:8px; border:1px solid #d1d5db;">
    <thead>
      <tr style="background:linear-gradient(to right,#7A0000,#A52A2A); color:white;">
        <th style="padding:6px 4px; width:2%;">No</th>
        <th style="padding:6px 4px; width:5%;">App No</th>
        <th style="padding:6px 4px; width:5%;">Submit Date</th>
        <th style="padding:6px 4px; width:7%;">Name</th>
        <th style="padding:6px 4px; width:10%;">Address</th>
        <th style="padding:6px 4px; width:5%;">Approved Date</th>
        <th style="padding:6px 4px; width:5%;">PIV No</th>
        <th style="padding:6px 4px; width:5%;">Paid Date</th>
        <th style="padding:6px 4px; width:6%; text-align:right;">PIV Amount</th>
        <th style="padding:6px 4px; width:5%;">Allocated Date</th>
        <th style="padding:6px 4px; width:5%;">Finished Date</th>
        <th style="padding:6px 4px; width:5%;">Contractor ID</th>
        <th style="padding:6px 4px; width:5%;">Job No.</th>
        <th style="padding:6px 4px; width:5%;">Estimate Date</th>
        <th style="padding:6px 4px; width:6%;">PIV 2 No.</th>
        <th style="padding:6px 4px; width:6%;">PIV 2 Paid Date</th>
        <th style="padding:6px 4px; width:5%;">Prj Ass Date</th>
        <th style="padding:6px 4px; width:5%;">Bill No</th>
        <th style="padding:6px 4px; width:5%;">Bill Date</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
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

	const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

	/* ────── RENDER ────── */
	return (
		<div className="max-w-7xl mx-auto p-6 bg-white rounded-xl shadow border border-gray-200 text-sm font-sans">
			{/* Heading */}
			<div className="flex justify-between items-center mb-4">
				<h2 className={`text-xl font-bold ${maroon}`}>
					C/C Cost Paid Job Progress
				</h2>
			</div>

			{/* Filter Panel (Exactly 3 Fields: From Date, To Date, Application No.) */}
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

					{/* Application No. */}
					<div className="flex items-center gap-2">
						<label
							className={`text-xs font-bold ${maroon} whitespace-nowrap`}
						>
							Application No:
						</label>
						<input
							type="text"
							value={applicationNo}
							onChange={(e) => setApplicationNo(e.target.value)}
							placeholder="Enter Application No."
							className="pl-3 pr-3 py-1.5 w-full rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A0000] transition text-sm"
						/>
					</div>
				</div>

				<div className="flex justify-end mt-4">
					<button
						onClick={clearAll}
						className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm"
					>
						<RotateCcw className="w-3 h-3" /> Clear All
					</button>
				</div>
			</div>

			{/* Cost Center List (Search by ID, Search by Name, and Clear) */}
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

			{deptLoading && (
				<div className="flex flex-col items-center justify-center py-12">
					<div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[#7A0000]"></div>
					<p className="mt-3 text-gray-600 text-sm">
						Loading cost centers...
					</p>
				</div>
			)}

			{deptError && (
				<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">
					{deptError}
				</div>
			)}

			{!deptLoading && !deptError && filtered.length > 0 && (
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
													disabled={!fromDate || !toDate || !applicationNo.trim()}
													className={`px-3 py-1 rounded text-xs font-medium hover:brightness-110 transition shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 mx-auto
														${
															selectedDept?.DeptId === dept.DeptId && reportLoading
																? "bg-green-600 text-white"
																: selectedDept?.DeptId === dept.DeptId
																? "bg-green-600 text-white"
																: `${maroonGrad} text-white`
														}`}
												>
													<Eye className="w-3 h-3" />
													{selectedDept?.DeptId === dept.DeptId && reportLoading
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

			{/* ────── REPORT MODAL (Following TenderDocInquiryReport Pattern) ────── */}
			{showReport && selectedDept && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/90 print:static print:inset-auto print:p-0 print:bg-white">
					<div className="relative bg-white w-[95vw] sm:w-[90vw] md:w-[85vw] lg:w-[80vw] xl:w-[75vw] max-w-7xl rounded-2xl shadow-2xl border border-gray-200 overflow-hidden mt-20 md:mt-32 lg:mt-40 lg:ml-64 mx-auto print:relative print:w-full print:max-w-none print:rounded-none print:shadow-none print:border-none print:overflow-visible">
						{reportLoading && (
							<div className="absolute inset-0 bg-white/95 z-50 flex flex-col items-center justify-center gap-4">
								<div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#7A0000]"></div>
								<p className="text-xl font-bold text-[#7A0000]">
									Loading Report...
								</p>
								<p className="text-sm text-gray-600">
									Fetching cost paid job progress records from server
								</p>
							</div>
						)}
						{!reportLoading && reportData.length > 0 && (
							<div className="p-2 md:p-2 max-h-[80vh] overflow-y-auto print:p-0 print:max-h-none print:overflow-visible print:mt-10 print:ml-12">
								{/* Action Buttons: CSV, PDF, Close */}
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
										onClick={closeReport}
										className="flex items-center gap-1 px-3 py-1.5 border border-red-400 text-red-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-red-50"
									>
										<X className="w-4 h-4" /> Close
									</button>
								</div>

								{/* Report Header */}
								<h2
									className={`text-lg md:text-xl font-bold text-center md:mb-2 ${maroon}`}
								>
									C/C Cost Paid Job Progress Report - From {fromDate} To {toDate}
								</h2>
								<div className="text-sm mb-1 ml-5 mr-12">
									<span className="font-bold">Cost Center :</span>{" "}
									{costCenterDisplay}/{costCenterName}
								</div>
								<div className="text-sm mb-3 ml-5 mr-12">
									<span className="font-bold">Application No :</span>{" "}
									{searchedAppNo || applicationNo}
								</div>

								{/* Results Table (20 Columns with Horizontal Scrolling) */}
								<div className="ml-5 mt-1 mb-5 border border-gray-200 rounded-lg overflow-x-auto print:ml-12 print:mt-12 print:overflow-visible">
									<div className="min-w-[2200px]">
										<table className="w-full text-xs border-collapse">
											<thead className={`${maroonGrad} text-white`}>
												<tr>
													<th className="px-3 py-2 border border-gray-300 text-center" style={{ width: "3%" }}>
														No
													</th>
													<th className="px-3 py-2 border border-gray-300 text-left" style={{ width: "5%" }}>
														Application No.
													</th>
													<th className="px-3 py-2 border border-gray-300 text-center" style={{ width: "5%" }}>
														Submit Date
													</th>
													<th className="px-3 py-2 border border-gray-300 text-left" style={{ width: "8%" }}>
														Applicant Name
													</th>
													<th className="px-3 py-2 border border-gray-300 text-left" style={{ width: "10%" }}>
														Address
													</th>
													<th className="px-3 py-2 border border-gray-300 text-center" style={{ width: "5%" }}>
														Approved Date
													</th>
													<th className="px-3 py-2 border border-gray-300 text-center" style={{ width: "5%" }}>
														PIV No.
													</th>
													<th className="px-3 py-2 border border-gray-300 text-center" style={{ width: "5%" }}>
														Paid Date
													</th>
													<th className="px-3 py-2 border border-gray-300 text-right" style={{ width: "6%" }}>
														PIV Amount
													</th>
													<th className="px-3 py-2 border border-gray-300 text-center" style={{ width: "5%" }}>
														Allocated Date
													</th>
													<th className="px-3 py-2 border border-gray-300 text-center" style={{ width: "5%" }}>
														Finished Date
													</th>
													<th className="px-3 py-2 border border-gray-300 text-center" style={{ width: "5%" }}>
														Contractor ID
													</th>
													<th className="px-3 py-2 border border-gray-300 text-center" style={{ width: "5%" }}>
														Job No.
													</th>
													<th className="px-3 py-2 border border-gray-300 text-center" style={{ width: "5%" }}>
														Estimate Date
													</th>
													<th className="px-3 py-2 border border-gray-300 text-center" style={{ width: "6%" }}>
														PIV 2 No.
													</th>
													<th className="px-3 py-2 border border-gray-300 text-center" style={{ width: "5%" }}>
														PIV 2 Paid Date
													</th>
													<th className="px-3 py-2 border border-gray-300 text-center" style={{ width: "5%" }}>
														Project Assigned Date
													</th>
													<th className="px-3 py-2 border border-gray-300 text-center" style={{ width: "5%" }}>
														Bill No.
													</th>
													<th className="px-3 py-2 border border-gray-300 text-center" style={{ width: "5%" }}>
														Bill Date
													</th>
												</tr>
											</thead>
											<tbody>
												{sortedData.map((row, i) => {
													const v = getRowValues(row);
													return (
														<tr
															key={i}
															className={
																i % 2 === 0
																	? "bg-white"
																	: "bg-gray-50"
															}
														>
															<td className="px-3 py-2 border-l border-r border-gray-300 text-center font-mono">
																{i + 1}
															</td>
															<td className="px-3 py-2 font-mono border-r border-gray-300">
																{v.appNo}
															</td>
															<td className="px-3 py-2 text-center border-r border-gray-300">
																{v.submitDate}
															</td>
															<td className="px-3 py-2 border-r border-gray-300 break-words">
																{v.name}
															</td>
															<td className="px-3 py-2 border-r border-gray-300 break-words">
																{v.address}
															</td>
															<td className="px-3 py-2 text-center border-r border-gray-300">
																{v.approvedDate}
															</td>
															<td className="px-3 py-2 font-mono text-center border-r border-gray-300">
																{v.pivNo}
															</td>
															<td className="px-3 py-2 text-center border-r border-gray-300">
																{v.paidDate}
															</td>
															<td className="px-3 py-2 font-mono text-right font-semibold border-r border-gray-300">
																{v.pivAmount}
															</td>
															<td className="px-3 py-2 text-center border-r border-gray-300">
																{v.allocatedDate}
															</td>
															<td className="px-3 py-2 text-center border-r border-gray-300">
																{v.finishedDate}
															</td>
															<td className="px-3 py-2 font-mono text-center border-r border-gray-300">
																{v.contractorId}
															</td>
															<td className="px-3 py-2 font-mono text-center border-r border-gray-300">
																{v.projectNo}
															</td>
															<td className="px-3 py-2 text-center border-r border-gray-300">
																{v.estimateDate}
															</td>
															<td className="px-3 py-2 font-mono text-center border-r border-gray-300">
																{v.reinspectionPivNo}
															</td>
															<td className="px-3 py-2 text-center border-r border-gray-300">
																{v.reinspectionPivDate}
															</td>
															<td className="px-3 py-2 text-center border-r border-gray-300">
																{v.projectAssignedDate}
															</td>
															<td className="px-3 py-2 font-mono text-center border-r border-gray-300">
																{v.billNo}
															</td>
															<td className="px-3 py-2 text-center border-r border-gray-300">
																{v.billDate}
															</td>
														</tr>
													);
												})}
											</tbody>
											<tfoot>
												<tr className="bg-[#d3d3d3] font-bold">
													<td
														colSpan={8}
														className="px-3 py-2 text-right border border-gray-300"
													>
														Total
													</td>
													<td className="px-3 py-2 text-right font-mono border border-gray-300">
														{formatNumber(grandTotalPivAmount)}
													</td>
													<td
														colSpan={10}
														className="border border-gray-300"
													></td>
												</tr>
											</tfoot>
										</table>
										<p className="text-xs text-gray-500 mt-2 text-right px-2">
											Total records: {reportData.length.toLocaleString()}
										</p>
									</div>
								</div>
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
};

export default CostPaidJobProgress;
