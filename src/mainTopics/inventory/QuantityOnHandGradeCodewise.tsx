import React, { useState, useEffect, useRef } from "react";
import { Search, RotateCcw, Eye, Download, Printer, X } from "lucide-react";
import { toast } from "react-toastify";
import { useUser } from "../../contexts/UserContext";

/* ────── Interfaces ────── */
interface Department {
	DeptId: string;
	DeptName: string;
}

interface QuantityOnHandGradeCodewiseItem {
	WarehouseCode: string;
	MaterialCode: string;
	MaterialName: string;
	GradeCode: string;
	MajorUom: string;
	QuantityOnHand: number;
	UnitPrice: number;
	Value: number;
	Status: string;
	CostCenterName: string;
}

interface ApiResponseWrapper {
	Data?: any[];
	data?: any[];
	result?: any[];
	ErrorMessage?: string | null;
	ErrorDetails?: string | null;
}

/* ────── Constants & Helpers ────── */
const PAGE_SIZE = 9;

const parseNumber = (value: any): number => {
	if (value === undefined || value === null || value === "") return 0;
	if (typeof value === "number") return value;
	const num = parseFloat(String(value).replace(/,/g, ""));
	return isNaN(num) ? 0 : num;
};

const formatNumber = (num: number | string | null | undefined): string => {
	const n = num === null || num === undefined ? NaN : Number(num);
	if (isNaN(n)) return "0.00";
	return n.toLocaleString("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
};

const csvEscape = (val: string | number | null | undefined): string => {
	if (val == null) return "";
	const str = String(val);
	if (/[,\n"\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
	return str;
};

const forceText = (val: string | number | null | undefined): string => {
	if (val == null) return '""';
	const str = String(val).trim();
	return `="${str.replace(/"/g, '""')}"`;
};

/* ────── MAIN COMPONENT ────── */
const QuantityOnHandGradeCodewise: React.FC = () => {
	const { user } = useUser();
	const epfNo = user?.Userno || "";

	// Corporate Maroon theme
	const maroon = "text-[#7A0000]";
	const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";

	/* ── 1. Filter Inputs State (Top of Selection Page) ── */
	const [materialCode, setMaterialCode] = useState("");
	const [gradeCode, setGradeCode] = useState("");

	/* ── 2. Cost Center Selection Table & Search State ── */
	const [departments, setDepartments] = useState<Department[]>([]);
	const [filtered, setFiltered] = useState<Department[]>([]);
	const [searchId, setSearchId] = useState("");
	const [searchName, setSearchName] = useState("");
	const [page, setPage] = useState(1);
	const [deptLoading, setDeptLoading] = useState(true);
	const [deptError, setDeptError] = useState<string | null>(null);

	/* ── 3. Report Results Modal / Viewer State ── */
	const [selectedDept, setSelectedDept] = useState<Department | null>(null);
	const [reportData, setReportData] = useState<QuantityOnHandGradeCodewiseItem[]>([]);
	const [reportLoading, setReportLoading] = useState(false);
	const [showReport, setShowReport] = useState(false);
	const [, setReportError] = useState<string | null>(null);
	const [executedFilters, setExecutedFilters] = useState<{
		costCenterCode: string;
		costCenterName: string;
		gradeCode: string;
		materialCode: string;
	} | null>(null);

	// Abort controller ref for in-flight request cancellation
	const abortControllerRef = useRef<AbortController | null>(null);

	/* ── Parse diverse backend department responses ── */
	const parseApiResponse = (response: any): any[] => {
		if (Array.isArray(response)) return response;
		if (response?.Data && Array.isArray(response.Data)) return response.Data;
		if (response?.data && Array.isArray(response.data)) return response.data;
		if (response?.result && Array.isArray(response.result)) return response.result;
		if (response?.departments && Array.isArray(response.departments)) return response.departments;
		return [];
	};

	/* ── Fetch Cost Centers ── */
	useEffect(() => {
		const fetchDepartments = async () => {
			if (!epfNo) {
				setDeptError("No EPF number available. Please login again.");
				toast.error("No EPF number available. Please login again.");
				setDeptLoading(false);
				return;
			}

			setDeptLoading(true);
			setDeptError(null);
			try {
				const res = await fetch(
					`/misapi/api/incomeexpenditure/departments/${encodeURIComponent(epfNo)}`,
					{
						method: "GET",
						headers: {
							"Content-Type": "application/json",
							Accept: "application/json",
						},
						credentials: "include",
					}
				);

				if (!res.ok) {
					const errorText = await res.text();
					throw new Error(`HTTP ${res.status}: ${errorText}`);
				}

				const parsed = await res.json();
				const rawData = parseApiResponse(parsed);

				const final: Department[] = rawData.map((item: any) => ({
					DeptId: String(item.DeptId ?? item.deptId ?? item.CostCenterId ?? "").trim(),
					DeptName: String(item.DeptName ?? item.deptName ?? item.CostCenterName ?? "").trim(),
				}));

				setDepartments(final);
				setFiltered(final);
			} catch (err: any) {
				console.error("Cost Center Fetch Error:", err);
				const errorMessage = err.message?.includes("Failed to fetch")
					? "Failed to connect to the server. Please check your network connection."
					: err.message || "Failed to load cost centers.";
				setDeptError(errorMessage);
				toast.error(errorMessage);
			} finally {
				setDeptLoading(false);
			}
		};

		fetchDepartments();
	}, [epfNo]);

	/* ── Search filter for Cost Centers ── */
	useEffect(() => {
		const qId = searchId.toLowerCase().trim();
		const qName = searchName.toLowerCase().trim();
		const f = departments.filter((dept) => {
			const matchId = !qId || dept.DeptId.toLowerCase().includes(qId);
			const matchName = !qName || dept.DeptName.toLowerCase().includes(qName);
			return matchId && matchName;
		});
		setFiltered(f);
		setPage(1);
	}, [searchId, searchName, departments]);

	const clearFilters = () => {
		setSearchId("");
		setSearchName("");
	};

	const clearInputs = () => {
		setMaterialCode("");
		setGradeCode("");
	};

	/* ── View Report Action (Separate Report Page workflow) ── */
	const handleViewReport = async (dept: Department) => {
		// 1. Validate Grade Code (Required)
		const trimmedGrade = gradeCode.trim();
		if (!trimmedGrade) {
			toast.error("Please enter Grade Code.");
			return;
		}

		// Abort any prior in-flight request
		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
		}
		const controller = new AbortController();
		abortControllerRef.current = controller;

		// Open the separate report page viewer immediately with loading state
		setSelectedDept(dept);
		setReportLoading(true);
		setReportData([]);
		setShowReport(true);
		setReportError(null);

		const costCenterParam = dept.DeptId.trim();
		const trimmedMatCode = materialCode.trim();
		const matCodeSegment = trimmedMatCode ? `/${encodeURIComponent(trimmedMatCode)}` : "";

		// Primary endpoint & Fallback URL
		const primaryUrl = `/api/quantity-on-hand-grade-codewise/report/${encodeURIComponent(costCenterParam)}/${encodeURIComponent(trimmedGrade)}${matCodeSegment}`;
		const fallbackUrl = `/misapi/api/quantity-on-hand-grade-codewise/report/${encodeURIComponent(costCenterParam)}/${encodeURIComponent(trimmedGrade)}${matCodeSegment}`;

		try {
			let response: Response;
			try {
				response = await fetch(primaryUrl, {
					method: "GET",
					headers: {
						"Content-Type": "application/json",
						Accept: "application/json",
					},
					credentials: "include",
					signal: controller.signal,
				});

				if (response.status === 404) {
					response = await fetch(fallbackUrl, {
						method: "GET",
						headers: {
							"Content-Type": "application/json",
							Accept: "application/json",
						},
						credentials: "include",
						signal: controller.signal,
					});
				}
			} catch (fetchErr: any) {
				if (fetchErr.name === "AbortError") {
					return;
				}
				response = await fetch(fallbackUrl, {
					method: "GET",
					headers: {
						"Content-Type": "application/json",
						Accept: "application/json",
					},
					credentials: "include",
					signal: controller.signal,
				});
			}

			if (!response.ok) {
				const errorText = await response.text().catch(() => "");
				let msg = `HTTP ${response.status}`;
				try {
					const parsedErr = JSON.parse(errorText);
					msg = parsedErr.Message || parsedErr.message || parsedErr.ErrorMessage || msg;
				} catch {
					if (errorText.trim()) msg = errorText;
				}
				throw new Error(msg);
			}

			const json: ApiResponseWrapper = await response.json();

			if (json.ErrorMessage) {
				throw new Error(json.ErrorMessage);
			}

			const rawList = Array.isArray(json)
				? json
				: Array.isArray(json.Data)
					? json.Data
					: Array.isArray(json.data)
						? json.data
						: Array.isArray(json.result)
							? json.result
							: [];

			setExecutedFilters({
				costCenterCode: dept.DeptId,
				costCenterName: dept.DeptName,
				gradeCode: trimmedGrade,
				materialCode: trimmedMatCode,
			});

			if (!Array.isArray(rawList) || rawList.length === 0) {
				toast.warn(`No records found for Cost Center ${dept.DeptId} with Grade Code ${trimmedGrade}.`);
				setReportData([]);
				return;
			}

			const mappedItems: QuantityOnHandGradeCodewiseItem[] = rawList.map((item: any) => ({
				WarehouseCode: String(item.WarehouseCode ?? item.wrhCd ?? "").trim(),
				MaterialCode: String(item.MaterialCode ?? item.matCd ?? "").trim(),
				MaterialName: String(item.MaterialName ?? item.matNm ?? "").trim(),
				GradeCode: String(item.GradeCode ?? item.grdCd ?? "").trim(),
				MajorUom: String(item.MajorUom ?? item.majUom ?? item.MajUom ?? "").trim(),
				QuantityOnHand: parseNumber(item.QuantityOnHand ?? item.qtyOnHand),
				UnitPrice: parseNumber(item.UnitPrice ?? item.unitPrice),
				Value: parseNumber(item.Value ?? item.value),
				Status: String(item.Status ?? item.status ?? "").trim(),
				CostCenterName: String(item.CostCenterName ?? item.cctName ?? dept.DeptName ?? "").trim(),
			}));

			setReportData(mappedItems);
			toast.success(`${mappedItems.length} records loaded successfully.`);
		} catch (err: any) {
			if (err.name === "AbortError") {
				return;
			}
			console.error("Report fetch error:", err);
			const msg = err.message || "Failed to retrieve report data.";
			setReportError(msg);
			toast.error(`Error: ${msg}`);
			setReportData([]);
		} finally {
			setReportLoading(false);
		}
	};

	/* ── Close Report (Returns to selection page, preserving entered filters) ── */
	const closeReport = () => {
		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
			abortControllerRef.current = null;
		}
		setShowReport(false);
		setReportData([]);
		setSelectedDept(null);
		setReportLoading(false);
		setReportError(null);
	};

	// Active metadata for viewer and exports
	const reportGradeCode = executedFilters?.gradeCode || gradeCode.trim();
	const reportMaterialCode = executedFilters?.materialCode ?? materialCode.trim();
	const costCtrDisplay = executedFilters?.costCenterCode || selectedDept?.DeptId || "";
	const cctName = executedFilters?.costCenterName || selectedDept?.DeptName || "";

	// Calculate total value
	const totalValue = reportData.reduce((acc, r) => acc + (r.Value || 0), 0);

	/* ── CSV Download ── */
	const downloadCSV = () => {
		if (reportData.length === 0) {
			toast.error("No data to export.");
			return;
		}

		const titleRows = [
			`Quantity On Hand (All Active/ Inactive Material) - Grade Code : ${reportGradeCode}`,
			`Cost Centre : ${costCtrDisplay} / ${cctName}`,
			`Material Code : ${reportMaterialCode}`,
			`Currency: LKR`,
			`Generated On: ${new Date().toLocaleString("en-US")}`,
			"",
		];

		const headers = [
			"Warehouse Code",
			"Material Code",
			"Material Name",
			"Status",
			"Major UOM",
			"Grade Code",
			"Qty On Hand",
			"UnitPrice",
			"Value",
		];

		const rows = reportData.map((item) => [
			csvEscape(item.WarehouseCode),
			forceText(item.MaterialCode),
			csvEscape(item.MaterialName),
			csvEscape(item.Status),
			csvEscape(item.MajorUom),
			csvEscape(item.GradeCode),
			csvEscape(item.QuantityOnHand.toFixed(2)),
			csvEscape(item.UnitPrice.toFixed(2)),
			csvEscape(item.Value.toFixed(2)),
		]);

		const summaryRows = [
			"",
			[
				csvEscape("TOTAL"),
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				csvEscape(totalValue.toFixed(2)),
			].join(","),
		];

		const csv = [
			...titleRows,
			headers.map(csvEscape).join(","),
			...rows.map((row) => row.join(",")),
			...summaryRows,
		].join("\n");

		const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		const ccSuffix = costCtrDisplay.replace(/[^a-zA-Z0-9]/g, "_");
		const gradeSuffix = reportGradeCode.replace(/[^a-zA-Z0-9]/g, "_");
		a.download = `QuantityOnHand_${ccSuffix}_${gradeSuffix}_${new Date().toISOString().split("T")[0]}.csv`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
		toast.success("CSV file downloaded successfully.");
	};

	/* ── PDF Download / Print ── */
	const printPDF = () => {
		if (reportData.length === 0) {
			toast.error("No data to export.");
			return;
		}

		const printedOn = new Date().toLocaleString("en-US", {
			timeZone: "Asia/Colombo",
		});

		let rowsHTML = "";
		reportData.forEach((item, index) => {
			rowsHTML += `
				<tr class="${index % 2 === 0 ? "bg-white" : "bg-gray-50"}">
					<td style="padding: 4px 6px; border: 1px solid #d1d5db; text-align: center; font-size: 8px; font-family: monospace;">${item.WarehouseCode || ""}</td>
					<td style="padding: 4px 6px; border: 1px solid #d1d5db; text-align: center; font-size: 8px; font-family: monospace;">${item.MaterialCode || ""}</td>
					<td style="padding: 4px 6px; border: 1px solid #d1d5db; text-align: left; font-size: 8px; word-break: break-word;">${item.MaterialName || ""}</td>
					<td style="padding: 4px 6px; border: 1px solid #d1d5db; text-align: center; font-size: 8px;">${item.Status || ""}</td>
					<td style="padding: 4px 6px; border: 1px solid #d1d5db; text-align: center; font-size: 8px;">${item.MajorUom || ""}</td>
					<td style="padding: 4px 6px; border: 1px solid #d1d5db; text-align: center; font-size: 8px; font-family: monospace;">${item.GradeCode || ""}</td>
					<td style="padding: 4px 6px; border: 1px solid #d1d5db; text-align: right; font-size: 8px; font-family: monospace;">${formatNumber(item.QuantityOnHand)}</td>
					<td style="padding: 4px 6px; border: 1px solid #d1d5db; text-align: right; font-size: 8px; font-family: monospace;">${formatNumber(item.UnitPrice)}</td>
					<td style="padding: 4px 6px; border: 1px solid #d1d5db; text-align: right; font-size: 8px; font-family: monospace;">${formatNumber(item.Value)}</td>
				</tr>
			`;
		});

		const html = `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<title>Quantity On Hand (All Active/ Inactive Material) - Grade Code : ${reportGradeCode}</title>
	<style>
		@media print {
			@page {
				size: A4 landscape;
				margin: 8mm 6mm 10mm 6mm;
				@bottom-left { content: "Printed on: ${printedOn}"; font-size: 8px; color: #666; font-family: Arial, sans-serif; }
				@bottom-right { content: "Page " counter(page) " of " counter(pages); font-size: 8px; color: #666; font-family: Arial, sans-serif; }
			}
			body {
				margin: 0;
				font-family: Arial, Helvetica, sans-serif;
				font-size: 8.5px;
				color: #111827;
				-webkit-print-color-adjust: exact !important;
				print-color-adjust: exact !important;
			}
			.company-title {
				text-align: center;
				font-size: 8.5px;
				font-weight: normal;
				color: #333333;
				margin: 0 0 6px 0;
				text-transform: uppercase;
				letter-spacing: 0.5px;
			}
			.title {
				margin: 0 0 6px 0;
				text-align: center;
				font-weight: bold;
				color: #7A0000;
				font-size: 13px;
				text-decoration: underline;
			}
			.cost-centre { text-align: center; font-weight: bold; font-size: 9.5px; margin-bottom: 6px; }
			.info { margin: 4px 0 8px; font-size: 8.5px; display: flex; justify-content: space-between; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
			table { border-collapse: collapse; width: 100%; font-size: 8.5px; table-layout: fixed; }
			thead { display: table-header-group; }
			tr { page-break-inside: avoid; }
			th, td { border: 1px solid #d1d5db; padding: 4px 6px; word-wrap: break-word; }
			th { background: linear-gradient(to right, #7A0000, #A52A2A); color: white; text-align: center; font-weight: bold; font-size: 8px; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
			tfoot td { background-color: #f3f4f6; font-weight: bold; font-size: 8px; }
			.signoff {
				margin-top: 30px;
				padding: 0 20px;
				font-size: 8.5px;
				page-break-inside: avoid;
			}
			.signoff-row {
				display: flex;
				justify-content: space-between;
				align-items: center;
				margin-bottom: 24px;
			}
			.signoff-row:last-child {
				margin-bottom: 0;
			}
			.signoff-col {
				width: 45%;
			}
		}
	</style>
</head>
<body>
	<div class="company-title">ELECTRICITY DISTRIBUTION LANKA (PRIVATE) LIMITED</div>
	<div class="title">Quantity On Hand (All Active/ Inactive Material) - Grade Code : ${reportGradeCode}</div>
	<div class="cost-centre">Cost Centre : ${costCtrDisplay} / ${cctName}</div>
	<div class="info">
		<div><strong>Material Code : </strong>${reportMaterialCode}</div>
		<div style="font-weight: 600; color: #4B5563;">Currency: LKR</div>
	</div>

	<table>
		<thead>
			<tr>
				<th style="width: 10%;">Warehouse Code</th>
				<th style="width: 12%;">Material Code</th>
				<th style="width: 25%;">Material Name</th>
				<th style="width: 7%;">Status</th>
				<th style="width: 8%;">Major UOM</th>
				<th style="width: 8%;">Grade Code</th>
				<th style="width: 10%;">Qty On Hand</th>
				<th style="width: 9%;">UnitPrice</th>
				<th style="width: 11%;">Value</th>
			</tr>
		</thead>
		<tbody>${rowsHTML}</tbody>
		<tfoot>
			<tr>
				<td colspan="8" style="text-align: right;">TOTAL:</td>
				<td style="text-align: right; font-family: monospace;">${formatNumber(totalValue)}</td>
			</tr>
		</tfoot>
	</table>

	<div class="signoff">
		<div class="signoff-row">
			<div class="signoff-col"><strong>Prepared By:</strong> ____________________</div>
			<div class="signoff-col"><strong>Certified Correct:</strong> ____________________</div>
		</div>
		<div class="signoff-row">
			<div class="signoff-col"><strong>Checked By:</strong> ____________________</div>
			<div class="signoff-col"><strong>Accountant:</strong> ____________________</div>
		</div>
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

	// Cost center pagination
	const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
	const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

	return (
		<div className="max-w-7xl mx-auto p-6 bg-white rounded-xl shadow border border-gray-200 text-sm font-sans">
			{/* ────── 1. Report Selection Page Title ────── */}
			<div className="flex justify-between items-center mb-4">
				<h2 className={`text-xl font-bold ${maroon}`}>
					Quantity On Hand (All Active/Inactive) Materials (Grade Code Wise)
				</h2>
			</div>

			{/* ────── 2. Material Code and Grade Code Filter Section ────── */}
			<div className="bg-gray-50 p-4 rounded-lg mb-4 border border-gray-200">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
					{/* Material Code */}
					<div className="flex items-center gap-2">
						<label className={`text-xs font-bold ${maroon} whitespace-nowrap min-w-[90px]`}>
							Material Code:
						</label>
						<input
							type="text"
							value={materialCode}
							onChange={(e) => setMaterialCode(e.target.value.toUpperCase())}
							placeholder="ENTER MATERIAL CODE"
							className="pl-3 pr-3 py-1.5 w-full rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A0000] transition text-sm uppercase font-mono"
							autoComplete="off"
						/>
					</div>

					{/* Grade Code (Required) */}
					<div className="flex items-center gap-2">
						<label className={`text-xs font-bold ${maroon} whitespace-nowrap min-w-[90px]`}>
							Grade Code: <span className="text-red-600">*</span>
						</label>
						<input
							type="text"
							value={gradeCode}
							onChange={(e) => setGradeCode(e.target.value.toUpperCase())}
							placeholder="ENTER GRADE CODE"
							required
							className="pl-3 pr-3 py-1.5 w-full rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A0000] transition text-sm uppercase font-mono"
							autoComplete="off"
						/>
					</div>
				</div>

				{(materialCode || gradeCode) && (
					<div className="flex justify-end mt-4">
						<button
							onClick={clearInputs}
							className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm transition"
						>
							<RotateCcw className="w-3 h-3" /> Clear Inputs
						</button>
					</div>
				)}
			</div>

			{/* ────── 3. Cost Center Selection Table Section ────── */}
			{/* Search Inputs */}
			<div className="flex flex-wrap gap-2 mb-4">
				<div className="relative">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
					<input
						type="text"
						value={searchId}
						placeholder="Search by ID"
						onChange={(e) => setSearchId(e.target.value)}
						className="pl-10 pr-3 py-1.5 w-40 rounded border border-gray-300 focus:ring-2 focus:ring-[#7A0000] text-sm"
						autoComplete="off"
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
						autoComplete="off"
					/>
				</div>
				{(searchId || searchName) && (
					<button
						onClick={clearFilters}
						className="flex items-center gap-1 px-3 py-1.5 border rounded bg-gray-100 hover:bg-gray-200 text-xs transition"
					>
						<RotateCcw className="w-3 h-3" /> Clear
					</button>
				)}
			</div>

			{/* Cost Center Loading */}
			{deptLoading && (
				<div className="flex flex-col items-center justify-center py-12">
					<div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[#7A0000]"></div>
					<p className="mt-3 text-gray-600 text-sm">
						Loading cost centers...
					</p>
				</div>
			)}

			{/* Cost Center Error */}
			{deptError && (
				<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">
					{deptError}
				</div>
			)}

			{/* Cost Center Empty Search Results */}
			{!deptLoading && !deptError && filtered.length === 0 && (
				<div className="text-gray-600 bg-gray-50 border border-gray-200 p-4 rounded mb-4 text-sm text-center">
					No cost centers found matching your search.
				</div>
			)}

			{/* Cost Center Table (with Action Column) */}
			{!deptLoading && !deptError && filtered.length > 0 && (
				<>
					<div className="overflow-x-auto rounded-lg border border-gray-200">
						<div className="max-h-[50vh] overflow-y-auto">
							<table className="w-full table-fixed text-left text-xs md:text-sm">
								<thead className={`${maroonGrad} text-white sticky top-0 z-10`}>
									<tr>
										<th className="px-4 py-2 w-1/4">Cost Center Code</th>
										<th className="px-4 py-2 w-1/2">Cost Center Name</th>
										<th className="px-4 py-2 w-1/4 text-center">Action</th>
									</tr>
								</thead>
								<tbody>
									{paginated.map((dept, i) => (
										<tr
											key={`${dept.DeptId}-${i}`}
											className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}
										>
											<td className="px-4 py-2 truncate font-mono">
												{dept.DeptId}
											</td>
											<td className="px-4 py-2 truncate">
												{dept.DeptName}
											</td>
											<td className="px-4 py-2 text-center">
												<button
													onClick={() => handleViewReport(dept)}
													className={`px-3 py-1 rounded text-xs font-medium hover:brightness-110 transition shadow flex items-center gap-1 mx-auto disabled:opacity-50 disabled:cursor-not-allowed ${selectedDept?.DeptId === dept.DeptId && reportLoading
														? "bg-green-600 text-white"
														: selectedDept?.DeptId === dept.DeptId && showReport
															? "bg-green-600 text-white"
															: `${maroonGrad} text-white`
														}`}
												>
													<Eye className="w-3 h-3" />
													{selectedDept?.DeptId === dept.DeptId && reportLoading
														? "Viewing..."
														: selectedDept?.DeptId === dept.DeptId && showReport
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

					{/* Cost Center Pagination */}
					<div className="flex justify-end items-center gap-3 mt-3">
						<button
							onClick={() => setPage((p) => Math.max(1, p - 1))}
							disabled={page === 1}
							className="px-3 py-1 border rounded bg-white text-gray-600 text-xs hover:bg-gray-100 disabled:opacity-40 transition"
						>
							Previous
						</button>
						<span className="text-xs text-gray-600">
							Page {page} of {totalPages}
						</span>
						<button
							onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
							disabled={page >= totalPages}
							className="px-3 py-1 border rounded bg-white text-gray-600 text-xs hover:bg-gray-100 disabled:opacity-40 transition"
						>
							Next
						</button>
					</div>
				</>
			)}

			{/* ────── 4. SEPARATE REPORT PAGE / VIEWER ────── */}
			{showReport && selectedDept && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/90 print:static print:inset-auto print:p-0 print:bg-white">
					<div className="relative bg-white w-[95vw] sm:w-[90vw] md:w-[85vw] lg:w-[80vw] xl:w-[75vw] max-w-7xl rounded-2xl shadow-2xl border border-gray-200 overflow-hidden mt-20 md:mt-32 lg:mt-40 lg:ml-64 mx-auto print:relative print:w-full print:max-w-none print:rounded-none print:shadow-none print:border-none print:overflow-visible">
						{/* Loading Overlay */}
						{reportLoading && (
							<div className="absolute inset-0 bg-white/95 z-50 flex flex-col items-center justify-center gap-4">
								<div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#7A0000]"></div>
								<p className="text-xl font-bold text-[#7A0000]">
									Loading Report...
								</p>
								<p className="text-sm text-gray-600">
									Fetching Quantity On Hand records for Cost Center {selectedDept.DeptId}
								</p>
							</div>
						)}

						{/* Loaded Report View */}
						{!reportLoading && reportData.length > 0 && (
							<div className="p-2 md:p-2 max-h-[80vh] overflow-y-auto print:p-0 print:max-h-none print:overflow-visible print:mt-10 print:ml-12">
								{/* Exactly Three Action Buttons: CSV, PDF, Close */}
								<div className="flex justify-end gap-3 mb-4 print:hidden">
									<button
										onClick={downloadCSV}
										className="flex items-center gap-1 px-3 py-1.5 border border-blue-400 text-blue-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-blue-50 transition"
									>
										<Download className="w-4 h-4" /> CSV
									</button>
									<button
										onClick={printPDF}
										className="flex items-center gap-1 px-3 py-1.5 border border-green-400 text-green-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-green-50 transition"
									>
										<Printer className="w-4 h-4" /> PDF
									</button>
									<button
										onClick={closeReport}
										className="flex items-center gap-1 px-3 py-1.5 border border-red-400 text-red-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-red-50 transition"
									>
										<X className="w-4 h-4" /> Close
									</button>
								</div>

								{/* 1. Dynamic Report Header Title with Underline */}
								<h2 className={`text-lg md:text-xl font-bold text-center underline decoration-1 underline-offset-4 mb-1.5 ${maroon}`}>
									Quantity On Hand (All Active/ Inactive Material) - Grade Code : {reportGradeCode}
								</h2>

								{/* 2. Centered Cost Centre Information */}
								<div className="text-center font-bold text-xs md:text-sm text-gray-800 mb-1.5">
									Cost Centre : {costCtrDisplay} / {cctName}
								</div>

								{/* 3. Material Code Information & Right-Aligned Currency: LKR */}
								<div className="flex justify-between items-center text-xs md:text-sm mb-3 ml-5 mr-5">
									<div className="font-bold text-gray-800">
										Material Code : <span className="font-normal font-mono">{reportMaterialCode}</span>
									</div>
									<div className="font-semibold text-gray-700">
										Currency: LKR
									</div>
								</div>

								{/* 4 & 5. Exact 9 Columns Table */}
								<div className="ml-5 mr-5 mb-5 border border-gray-200 rounded-lg overflow-x-auto print:ml-12 print:mt-12 print:overflow-visible">
									<div className="min-w-[1000px]">
										<table className="w-full text-xs border-collapse">
											<thead className={`${maroonGrad} text-white`}>
												<tr>
													<th className="px-3 py-2 border border-gray-300 text-center whitespace-nowrap" style={{ width: "10%" }}>
														Warehouse Code
													</th>
													<th className="px-3 py-2 border border-gray-300 text-center whitespace-nowrap" style={{ width: "12%" }}>
														Material Code
													</th>
													<th className="px-3 py-2 border border-gray-300 text-left" style={{ width: "25%" }}>
														Material Name
													</th>
													<th className="px-3 py-2 border border-gray-300 text-center whitespace-nowrap" style={{ width: "7%" }}>
														Status
													</th>
													<th className="px-3 py-2 border border-gray-300 text-center whitespace-nowrap" style={{ width: "8%" }}>
														Major UOM
													</th>
													<th className="px-3 py-2 border border-gray-300 text-center whitespace-nowrap" style={{ width: "8%" }}>
														Grade Code
													</th>
													<th className="px-3 py-2 border border-gray-300 text-right whitespace-nowrap" style={{ width: "10%" }}>
														Qty On Hand
													</th>
													<th className="px-3 py-2 border border-gray-300 text-right whitespace-nowrap" style={{ width: "9%" }}>
														UnitPrice
													</th>
													<th className="px-3 py-2 border border-gray-300 text-right whitespace-nowrap" style={{ width: "11%" }}>
														Value
													</th>
												</tr>
											</thead>
											<tbody>
												{reportData.map((item, index) => (
													<tr
														key={`${item.MaterialCode}-${item.WarehouseCode}-${index}`}
														className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
													>
														<td className="px-3 py-2 border border-gray-300 text-center font-mono">
															{item.WarehouseCode || "-"}
														</td>
														<td className="px-3 py-2 border border-gray-300 text-center font-mono font-medium">
															{item.MaterialCode || "-"}
														</td>
														<td className="px-3 py-2 border border-gray-300 text-left break-words">
															{item.MaterialName || "-"}
														</td>
														<td className="px-3 py-2 border border-gray-300 text-center">
															{item.Status || "-"}
														</td>
														<td className="px-3 py-2 border border-gray-300 text-center">
															{item.MajorUom || "-"}
														</td>
														<td className="px-3 py-2 border border-gray-300 text-center font-mono">
															{item.GradeCode || "-"}
														</td>
														<td className="px-3 py-2 border border-gray-300 text-right font-mono">
															{formatNumber(item.QuantityOnHand)}
														</td>
														<td className="px-3 py-2 border border-gray-300 text-right font-mono">
															{formatNumber(item.UnitPrice)}
														</td>
														<td className="px-3 py-2 border border-gray-300 text-right font-mono font-medium">
															{formatNumber(item.Value)}
														</td>
													</tr>
												))}
											</tbody>
											<tfoot className="bg-gray-100 font-semibold border-t-2 border-gray-300">
												<tr>
													<td colSpan={8} className="px-3 py-2 text-right border border-gray-300 font-bold">
														TOTAL:
													</td>
													<td className="px-3 py-2 text-right font-mono font-bold border border-gray-300">
														{formatNumber(totalValue)}
													</td>
												</tr>
											</tfoot>
										</table>
									</div>
								</div>
							</div>
						)}

						{/* Empty Results within Report Viewer */}
						{!reportLoading && reportData.length === 0 && (
							<div className="p-8 text-center">
								<div className="flex justify-end mb-4">
									<button
										onClick={closeReport}
										className="flex items-center gap-1 px-3 py-1.5 border border-red-400 text-red-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-red-50"
									>
										<X className="w-4 h-4" /> Close
									</button>
								</div>
								<h2 className={`text-lg font-bold underline mb-2 ${maroon}`}>
									Quantity On Hand (All Active/ Inactive Material) - Grade Code : {reportGradeCode}
								</h2>
								<div className="text-center font-bold text-xs md:text-sm text-gray-800 mb-2">
									Cost Centre : {costCtrDisplay} / {cctName}
								</div>
								<p className="text-sm text-gray-600 mt-4">
									No records found for Cost Center <strong>{costCtrDisplay}</strong> with Grade Code <strong>{reportGradeCode}</strong>.
								</p>
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
};

export default QuantityOnHandGradeCodewise;
