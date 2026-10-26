// File: src/mainTopics/SMC-ManagementInfo/ProvincewiseSMCJobMaterialDetails.tsx

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Search, RotateCcw, Eye, X, Download, Printer } from "lucide-react";
import { toast } from "react-toastify";
import { useUser } from "../../contexts/UserContext";

/* ---------------- Interfaces ---------------- */
export interface Company {
	compId: string;
	CompName: string;
}

export interface RawMaterialDetailItem {
	Phase?: string | null;
	phase?: string | null;
	PHASE?: string | null;

	ConnectionType?: string | null;
	connectionType?: string | null;
	CONNECTION_TYPE?: string | null;

	TariffCatCode?: string | null;
	tariffCatCode?: string | null;
	TARIFF_CAT_CODE?: string | null;

	LoopCable?: string | null;
	loopCable?: string | null;
	LOOP_CABLE?: string | null;

	WiringType?: string | null;
	wiringType?: string | null;
	WIRING_TYPE?: string | null;

	LineLength?: number | string | null;
	lineLength?: number | string | null;
	LINE_LENGTH?: number | string | null;

	ServiceLength?: number | string | null;
	serviceLength?: number | string | null;
	SERVICE_LENGTH?: number | string | null;

	ActualCost?: number | string | null;
	actualCost?: number | string | null;
	ACTUAL_COST?: number | string | null;

	StandardCost?: number | string | null;
	standardCost?: number | string | null;
	STANDARD_COST?: number | string | null;

	ProjectNo?: string | null;
	projectNo?: string | null;
	PROJECT_NO?: string | null;

	ResCd?: string | null;
	resCd?: string | null;
	RES_CD?: string | null;

	Qty?: number | string | null;
	qty?: number | string | null;
	QTY?: number | string | null;

	MaterialName?: string | null;
	materialName?: string | null;
	MAT_NM?: string | null;

	MajorUom?: string | null;
	majorUom?: string | null;
	MAJ_UOM?: string | null;

	Area?: string | null;
	area?: string | null;
	AREA?: string | null;

	CompName?: string | null;
	compName?: string | null;
	COMP_NM?: string | null;
}

export interface PivotedJobRow {
	rowKey: string;
	projectNo: string;
	phase: string;
	connectionType: string;
	loopService: string;
	tariffCategory: string;
	wiringType: string;
	lineLength: number | null;
	serviceLength: number | null;
	standardCost: number | null;
	actualCost: number | null;
	area: string;
	compName: string;
	quantities: Record<string, number>;
}

/* ---------------- Property Extraction Helpers ---------------- */
const getStr = (item: any, ...keys: string[]): string => {
	if (!item) return "";
	for (const k of keys) {
		if (item[k] !== undefined && item[k] !== null) {
			return String(item[k]).trim();
		}
	}
	return "";
};

const getNum = (item: any, ...keys: string[]): number | null => {
	if (!item) return null;
	for (const k of keys) {
		if (item[k] !== undefined && item[k] !== null && item[k] !== "") {
			const n = Number(item[k]);
			if (!isNaN(n)) return n;
		}
	}
	return null;
};

/* ---------------- Formatting Helpers ---------------- */
const csvEscape = (val: string | number | null | undefined): string => {
	if (val == null) return '""';
	const str = String(val);
	if (/[,\n"']/.test(str)) {
		return `"${str.replace(/"/g, '""')}"`;
	}
	return str;
};

const formatCost = (num: number | null | undefined): string => {
	if (num == null || isNaN(Number(num))) return "0.00";
	const absNum = Math.abs(Number(num));
	const formatted = new Intl.NumberFormat("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(absNum);

	if (Number(num) < 0) {
		return `(${formatted})`;
	}
	return formatted;
};

const formatQty = (qty: number | null | undefined): string => {
	if (qty == null || isNaN(Number(qty)) || Number(qty) === 0) return "0";
	const n = Number(qty);
	return Number.isInteger(n) ? n.toString() : n.toFixed(2);
};

const formatLength = (len: number | null | undefined): string => {
	if (len == null || isNaN(Number(len))) return "-";
	const n = Number(len);
	return Number.isInteger(n) ? n.toString() : n.toFixed(1);
};

const today = new Date();
const currentYear = today.getFullYear();
const currentMonth = String(today.getMonth() + 1).padStart(2, "0");
const currentDay = String(today.getDate()).padStart(2, "0");
const maxDate = `${currentYear}-${currentMonth}-${currentDay}`;

const minYear = currentYear - 20;
const minDate = `${minYear}-${currentMonth}-${currentDay}`;

/* ---------------- Shared API Fetch Helper ---------------- */
async function apiFetch<T>(
	url: string
): Promise<{ data: T | null; errorMessage: string | null }> {
	try {
		const res = await fetch(url, {
			headers: { Accept: "application/json" },
			credentials: "include",
			signal: AbortSignal.timeout(120000),
		});
		if (!res.ok) {
			if (res.status === 404)
				throw new Error("API endpoint not found (404). Please check if the backend is running.");
			if (res.status === 500)
				throw new Error("Database error (500). Please check your database connection.");
			const txt = await res.text().catch(() => "");
			throw new Error(`HTTP ${res.status}: ${res.statusText}${txt ? " - " + txt : ""}`);
		}
		const contentType = res.headers.get("content-type");
		if (!contentType || !contentType.includes("application/json"))
			throw new Error(`Expected JSON but got ${contentType}`);
		return await res.json();
	} catch (err: any) {
		if (err.name === "AbortError" || err.name === "TimeoutError")
			return { data: null, errorMessage: "Request timeout. Please check your connection." };
		if (err.message.includes("Failed to fetch"))
			return { data: null, errorMessage: "Cannot connect to server. Please ensure the backend is running." };
		return { data: null, errorMessage: err.message };
	}
}

const COMPANY_NAME = "Electricity Distribution Lanka Private Limited";

/* ---------------- Main Component ---------------- */
const ProvincewiseSMCJobMaterialDetails: React.FC = () => {
	const { user } = useUser();
	const epfNo = user?.Userno || "";
	const iframeRef = useRef<HTMLIFrameElement>(null);
	const isExportingCsvRef = useRef(false);

	// Maroon / red theme styling
	const maroon = "text-[#7A0000]";
	const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";

	// Company list states
	const [companies, setCompanies] = useState<Company[]>([]);
	const [filtered, setFiltered] = useState<Company[]>([]);
	const [searchId, setSearchId] = useState("");
	const [searchName, setSearchName] = useState("");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [page, setPage] = useState(1);
	const pageSize = 50;

	// Date filter states
	const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
	const [fromDate, setFromDate] = useState("");
	const [toDate, setToDate] = useState("");
	const [wiringType, setWiringType] = useState("ALL");
	const [resolvedWiringType, setResolvedWiringType] = useState("ALL");

	/* ────── Wiring Type label helper ────── */
	const getWiringTypeLabel = (type: string): string => {
		switch (type) {
			case "OH":
				return "Over Head";
			case "UG":
				return "Under Ground";
			case "ALL":
			default:
				return "All (Both OH & UG)";
		}
	};

	// Report states
	const [reportData, setReportData] = useState<RawMaterialDetailItem[]>([]);
	const [reportLoading, setReportLoading] = useState(false);
	const [showReport, setShowReport] = useState(false);

	/* ---------------- 1. Fetch Companies ---------------- */
	useEffect(() => {
		const fetchCompanies = async () => {
			if (!epfNo) {
				setError("No EPF number available.");
				setLoading(false);
				return;
			}
			setLoading(true);
			try {
				const response = await apiFetch<any>(
					`/misapi/api/incomeexpenditure/Usercompanies/${epfNo}/60`
				);
				if (response.errorMessage) {
					setError(response.errorMessage);
					toast.error(response.errorMessage);
					return;
				}
				const raw = response;
				const list: any[] = Array.isArray(raw)
					? raw
					: Array.isArray(raw?.data)
						? raw.data
						: [];
				const comps: Company[] = list
					.map((c: any) => ({
						compId: (c.CompId ?? c.compId ?? "").toString().trim(),
						CompName: (c.CompName ?? c.compName ?? "").toString().trim(),
					}))
					.filter((c: Company) => c.compId !== "");
				setCompanies(comps);
				setFiltered(comps);
			} catch (e: any) {
				setError(e.message);
				toast.error(e.message);
			} finally {
				setLoading(false);
			}
		};
		fetchCompanies();
	}, [epfNo]);

	/* ---------------- 2. Search & Filter Companies ---------------- */
	useEffect(() => {
		const f = companies.filter(
			(c) =>
				(!searchId ||
					c.compId.toLowerCase().includes(searchId.toLowerCase())) &&
				(!searchName ||
					c.CompName.toLowerCase().includes(searchName.toLowerCase()))
		);
		setFiltered(f);
		setPage(1);
	}, [searchId, searchName, companies]);

	const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

	/* ---------------- 3. Load Report on View Click ---------------- */
	const handleViewReport = async (company: Company) => {
		if (!fromDate || !toDate) return toast.error("Please select both dates");
		if (new Date(toDate) < new Date(fromDate))
			return toast.error("To Date cannot be earlier than From Date");

		setSelectedCompany(company);
		setResolvedWiringType(wiringType);
		setReportLoading(true);
		setReportData([]);
		setShowReport(true);

		const compIdSnapshot = company.compId.trim();
		const fromSnapshot = fromDate;
		const toSnapshot = toDate;
		const wiringTypeSnapshot = wiringType;

		try {
			const url = `/misapi/api/provincewise-smc-job-material-details/report?compId=${encodeURIComponent(compIdSnapshot)}&fromDate=${encodeURIComponent(fromSnapshot)}&toDate=${encodeURIComponent(toSnapshot)}&wiringType=${encodeURIComponent(wiringTypeSnapshot)}`;
			const response = await apiFetch<any>(url);

			if (response.errorMessage) {
				toast.error(response.errorMessage);
				return;
			}

			const raw: any = response;
			if (!raw || raw.success === false) {
				const msg = raw?.message || "No data returned from server.";
				toast.error(msg);
				return;
			}

			const items: RawMaterialDetailItem[] = Array.isArray(raw.data)
				? raw.data
				: Array.isArray(raw)
					? raw
					: [];

			setReportData(items);
			if (items.length === 0) {
				toast.warn("No records found for the selected company and date range.");
			} else {
				toast.success(`${items.length} records loaded.`);
			}
		} catch (err: any) {
			const msg = err.message || "Failed to fetch report data. Please try again.";
			toast.error(msg);
		} finally {
			setReportLoading(false);
		}
	};

	const clearFilters = () => {
		setFromDate("");
		setToDate("");
		setWiringType("ALL");
		setSearchId("");
		setSearchName("");
	};

	const closeReport = () => {
		setShowReport(false);
		setReportData([]);
		setSelectedCompany(null);
	};

	/* ---------------- 4. Dynamic Material-Code Pivot ---------------- */
	// Discover unique material codes (ResCd) from API response
	const materialCodes = useMemo(() => {
		const codes = new Set<string>();
		reportData.forEach((item) => {
			const code = getStr(item, "ResCd", "resCd", "RES_CD");
			if (code) codes.add(code);
		});
		return Array.from(codes).sort();
	}, [reportData]);

	// Material description & UOM dictionary for tooltips
	const materialInfoMap = useMemo(() => {
		const map: Record<string, { name: string; uom: string }> = {};
		reportData.forEach((item) => {
			const code = getStr(item, "ResCd", "resCd", "RES_CD");
			if (code && !map[code]) {
				map[code] = {
					name: getStr(item, "MaterialName", "materialName", "MAT_NM"),
					uom: getStr(item, "MajorUom", "majorUom", "MAJ_UOM"),
				};
			}
		});
		return map;
	}, [reportData]);

	// Pivot raw records into one row per distinct project/attribute combination
	const pivotedRows = useMemo(() => {
		const rowsMap = new Map<string, PivotedJobRow>();

		reportData.forEach((item) => {
			const projectNo = getStr(item, "ProjectNo", "projectNo", "PROJECT_NO");
			const phase = getStr(item, "Phase", "phase", "PHASE");
			const connectionType = getStr(item, "ConnectionType", "connectionType", "CONNECTION_TYPE");
			const loopCable = getStr(item, "LoopCable", "loopCable", "LOOP_CABLE");
			const tariffCatCode = getStr(item, "TariffCatCode", "tariffCatCode", "TARIFF_CAT_CODE");
			const wiringType = getStr(item, "WiringType", "wiringType", "WIRING_TYPE");
			const lineLength = getNum(item, "LineLength", "lineLength", "LINE_LENGTH");
			const serviceLength = getNum(item, "ServiceLength", "serviceLength", "SERVICE_LENGTH");
			const standardCost = getNum(item, "StandardCost", "standardCost", "STANDARD_COST");
			const actualCost = getNum(item, "ActualCost", "actualCost", "ACTUAL_COST");
			const area = getStr(item, "Area", "area", "AREA");
			const compName = getStr(item, "CompName", "compName", "COMP_NM");
			const resCd = getStr(item, "ResCd", "resCd", "RES_CD");
			const qty = getNum(item, "Qty", "qty", "QTY") ?? 0;

			// Deterministic structured key for fixed attributes
			const key = JSON.stringify([
				projectNo,
				phase,
				connectionType,
				loopCable,
				tariffCatCode,
				wiringType,
				lineLength,
				serviceLength,
				standardCost,
				actualCost,
				area,
			]);

			if (!rowsMap.has(key)) {
				rowsMap.set(key, {
					rowKey: key,
					projectNo,
					phase,
					connectionType,
					loopService: loopCable,
					tariffCategory: tariffCatCode,
					wiringType,
					lineLength,
					serviceLength,
					standardCost,
					actualCost,
					area,
					compName,
					quantities: {},
				});
			}

			const row = rowsMap.get(key)!;
			if (resCd) {
				row.quantities[resCd] = (row.quantities[resCd] || 0) + qty;
			}
		});

		return Array.from(rowsMap.values()).sort((a, b) =>
			a.projectNo.localeCompare(b.projectNo, undefined, { numeric: true })
		);
	}, [reportData]);

	// Calculate totals for footer, CSV, and PDF
	const totals = useMemo(() => {
		let totalStdCost = 0;
		let totalActCost = 0;
		const materialTotals: Record<string, number> = {};

		materialCodes.forEach((code) => {
			materialTotals[code] = 0;
		});

		pivotedRows.forEach((row) => {
			if (row.standardCost != null) totalStdCost += Number(row.standardCost);
			if (row.actualCost != null) totalActCost += Number(row.actualCost);

			materialCodes.forEach((code) => {
				const q = row.quantities[code] || 0;
				materialTotals[code] += q;
			});
		});

		return {
			totalStdCost,
			totalActCost,
			materialTotals,
		};
	}, [pivotedRows, materialCodes]);

	/* ---------------- 5. CSV Export ---------------- */
	const handleDownloadCSV = (e?: React.MouseEvent) => {
		if (e) {
			e.preventDefault();
			e.stopPropagation();
		}
		if (isExportingCsvRef.current) return;
		if (pivotedRows.length === 0 || !selectedCompany) return;

		isExportingCsvRef.current = true;
		try {
			const headers = [
				"Project No",
				"Phase",
				"Connection Type",
				"Loop Service",
				"Tariff Category",
				"Wiring Type",
				"Line length",
				"Service length",
				"Standard Cost",
				"Actual Cost",
				"Area",
				...materialCodes,
			];

			const resolvedWiringTypeLabel = getWiringTypeLabel(resolvedWiringType);

			const rows: string[] = [
				"Provincewise SMC Job Material Details",
				`Province: ${selectedCompany.compId} - ${selectedCompany.CompName}`,
				`Period: ${fromDate} To ${toDate}`,
				`Wiring Type: ${resolvedWiringTypeLabel}`,
				`Total Records: ${pivotedRows.length}`,
				"",
				headers.map(csvEscape).join(","),
			];

			pivotedRows.forEach((row) => {
				const rowData = [
					csvEscape(row.projectNo),
					csvEscape(row.phase),
					csvEscape(row.connectionType),
					csvEscape(row.loopService),
					csvEscape(row.tariffCategory),
					csvEscape(row.wiringType),
					csvEscape(row.lineLength != null ? row.lineLength : ""),
					csvEscape(row.serviceLength != null ? row.serviceLength : ""),
					csvEscape(row.standardCost != null ? row.standardCost.toFixed(2) : "0.00"),
					csvEscape(row.actualCost != null ? row.actualCost.toFixed(2) : "0.00"),
					csvEscape(row.area),
					...materialCodes.map((code) => {
						const q = row.quantities[code] || 0;
						return csvEscape(formatQty(q));
					}),
				];
				rows.push(rowData.join(","));
			});

			// Total Row
			const totalRowData = [
				"TOTAL",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				csvEscape(totals.totalStdCost.toFixed(2)),
				csvEscape(totals.totalActCost.toFixed(2)),
				"",
				...materialCodes.map((code) => csvEscape(formatQty(totals.materialTotals[code] || 0))),
			];
			rows.push(totalRowData.join(","));

			const csvContent = rows.join("\n");
			const blob = new Blob(["\uFEFF" + csvContent], {
				type: "text/csv;charset=utf-8;",
			});
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `SMC_Jobs_Actual_Used_Materials_${selectedCompany.compId}_${fromDate}_to_${toDate}.csv`;
			link.style.display = "none";
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			setTimeout(() => {
				URL.revokeObjectURL(url);
			}, 1000);
		} catch (err: any) {
			console.error("Failed to export CSV:", err);
			toast.error("Failed to export CSV. Please try again.");
		} finally {
			setTimeout(() => {
				isExportingCsvRef.current = false;
			}, 500);
		}
	};

	/* ---------------- 6. PDF Export (Browser Print via hidden iframe) ---------------- */
	const printPDF = (e?: React.MouseEvent) => {
		if (e) {
			e.preventDefault();
			e.stopPropagation();
		}
		if (pivotedRows.length === 0 || !iframeRef.current || !selectedCompany)
			return;

		const totalCols = 11 + materialCodes.length;
		const baseFontSize =
			totalCols > 50
				? "5.5px"
				: totalCols > 40
					? "6px"
					: totalCols > 30
						? "6.5px"
						: totalCols > 20
							? "7.5px"
							: "8.5px";

		const cellPadding = totalCols > 40 ? "2px 2.5px" : "3px 4px";
		const printedTimestamp = new Date().toLocaleString();
		const resolvedWiringTypeLabel = getWiringTypeLabel(resolvedWiringType);

		let tableHeadersHTML = `
			<tr>
				<th style="text-align: left;">Project No</th>
				<th style="text-align: center;">Phase</th>
				<th style="text-align: center;">Connection Type</th>
				<th style="text-align: center;">Loop Service</th>
				<th style="text-align: center;">Tariff Category</th>
				<th style="text-align: center;">Wiring Type</th>
				<th style="text-align: right;">Line length</th>
				<th style="text-align: right;">Service length</th>
				<th style="text-align: right;">Standard Cost</th>
				<th style="text-align: right;">Actual Cost</th>
				<th style="text-align: left;">Area</th>
				${materialCodes
				.map(
					(code) =>
						`<th style="text-align: right;" title="${materialInfoMap[code]?.name || ""}">${code}</th>`
				)
				.join("")}
			</tr>
		`;

		let tableRowsHTML = "";
		pivotedRows.forEach((row, i) => {
			tableRowsHTML += `
				<tr style="background-color: ${i % 2 === 0 ? "#ffffff" : "#f9fafb"};">
					<td style="text-align: left; font-family: monospace;">${row.projectNo}</td>
					<td style="text-align: center;">${row.phase}</td>
					<td style="text-align: center;">${row.connectionType}</td>
					<td style="text-align: center;">${row.loopService}</td>
					<td style="text-align: center;">${row.tariffCategory}</td>
					<td style="text-align: center;">${row.wiringType}</td>
					<td style="text-align: right; font-family: monospace;">${formatLength(row.lineLength)}</td>
					<td style="text-align: right; font-family: monospace;">${formatLength(row.serviceLength)}</td>
					<td style="text-align: right; font-family: monospace;">${formatCost(row.standardCost)}</td>
					<td style="text-align: right; font-family: monospace;">${formatCost(row.actualCost)}</td>
					<td style="text-align: left;">${row.area}</td>
					${materialCodes
					.map((code) => {
						const q = row.quantities[code] || 0;
						return `<td style="text-align: right; font-family: monospace; ${q > 0 ? "font-weight: bold; color: #111827;" : "color: #9ca3af;"}">${formatQty(q)}</td>`;
					})
					.join("")}
				</tr>
			`;
		});

		const totalRowHTML = `
			<tr style="background-color: #f3f4f6; font-weight: bold; border-top: 2px solid #7A0000;">
				<td style="text-align: left; font-weight: bold;">TOTAL</td>
				<td></td>
				<td></td>
				<td></td>
				<td></td>
				<td></td>
				<td></td>
				<td></td>
				<td style="text-align: right; font-family: monospace; font-weight: bold;">${formatCost(totals.totalStdCost)}</td>
				<td style="text-align: right; font-family: monospace; font-weight: bold;">${formatCost(totals.totalActCost)}</td>
				<td></td>
				${materialCodes
				.map((code) => {
					const q = totals.materialTotals[code] || 0;
					return `<td style="text-align: right; font-family: monospace; font-weight: bold;">${formatQty(q)}</td>`;
				})
				.join("")}
			</tr>
		`;

		const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>&nbsp;</title>
<style>
	@page {
		size: A3 landscape;
		margin: 10mm 8mm 14mm 8mm;
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
			content: "Printed on: ${printedTimestamp}";
			font-size: 8px;
			color: #666;
			font-family: Arial, sans-serif;
		}
		@bottom-right {
			content: "Page " counter(page) " of " counter(pages);
			font-size: 8px;
			color: #666;
			font-family: Arial, sans-serif;
		}
	}
	@media print {
		body {
			margin: 0;
			font-family: Arial, sans-serif;
			-webkit-print-color-adjust: exact !important;
			print-color-adjust: exact !important;
		}
		table {
			page-break-inside: auto;
			border-collapse: collapse;
			width: 100%;
		}
		tr {
			page-break-inside: avoid;
			page-break-after: auto;
		}
		td, th {
			page-break-inside: avoid;
			page-break-after: auto;
		}
		thead {
			display: table-header-group !important;
		}
	}
	body {
		font-size: ${baseFontSize};
		line-height: 1.25;
		font-family: Arial, sans-serif;
		padding: 0 4px;
		margin: 0;
		background-color: #ffffff;
		-webkit-print-color-adjust: exact !important;
		print-color-adjust: exact !important;
	}
	.title {
		text-align: center;
		font-weight: bold;
		color: #7A0000;
		font-size: 14px;
		margin: 0 0 6px 0;
	}
	.header-info {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		font-size: 9px;
		margin-bottom: 8px;
		color: #333;
	}
	.header-left div {
		margin-bottom: 2px;
	}
	.header-right {
		font-weight: bold;
		color: #555;
	}
	table {
		width: 100%;
		border-collapse: collapse;
	}
	th {
		background-color: #7A0000 !important;
		color: #ffffff !important;
		font-weight: bold;
		border: 1px solid #5a0000;
		font-size: ${baseFontSize};
		padding: ${cellPadding};
		white-space: nowrap;
		-webkit-print-color-adjust: exact !important;
		print-color-adjust: exact !important;
	}
	td {
		font-size: ${baseFontSize};
		border: 1px solid #d1d5db;
		padding: ${cellPadding};
		white-space: nowrap;
	}
</style>
</head>
<body>
	<h2 class="title">Provincewise SMC Job Material Details</h2>
	<div class="header-info">
		<div class="header-left">
			<div><strong>Province:</strong> ${selectedCompany.compId} - ${selectedCompany.CompName}</div>
			<div><strong>Period:</strong> ${fromDate} To ${toDate}</div>
			<div><strong>Wiring Type:</strong> ${resolvedWiringTypeLabel}</div>
		</div>
		<div class="header-right">
			<div><strong>Total Records:</strong> ${pivotedRows.length} &nbsp;|&nbsp; <strong>Material Types:</strong> ${materialCodes.length} &nbsp;|&nbsp; <strong>Currency:</strong> LKR</div>
		</div>
	</div>
	<table>
		<thead>${tableHeadersHTML}</thead>
		<tbody>
			${tableRowsHTML}
			${totalRowHTML}
		</tbody>
	</table>
</body>
</html>`;

		try {
			const doc = iframeRef.current?.contentDocument;
			if (doc) {
				doc.open();
				doc.write(html);
				doc.close();
				setTimeout(() => {
					iframeRef.current?.contentWindow?.focus();
					iframeRef.current?.contentWindow?.print();
				}, 800);
			}
		} catch (err: any) {
			console.error("Failed to generate PDF:", err);
			toast.error("Failed to generate PDF. Please try again.");
		}
	};

	/* ---------------- 7. Render JSX ---------------- */
	return (
		<div className="max-w-7xl mx-auto p-6 bg-white rounded-xl shadow border border-gray-200 text-sm">
			{/* Hidden iframe for PDF printing */}
			<iframe ref={iframeRef} className="hidden" title="print_frame" />

			<h2 className={`text-xl font-bold mb-4 ${maroon}`}>
				Provincewise SMC Job Material Details
			</h2>

			{/* Date & Wiring Type Filters */}
			<div className="flex flex-wrap items-center gap-4 sm:gap-6 mb-4">
				<div className="flex items-center gap-2">
					<label htmlFor="fromDate" className="text-xs font-bold text-[#7A0000] whitespace-nowrap">
						From Date:
					</label>
					<input
						id="fromDate"
						type="date"
						value={fromDate}
						onChange={(e) => setFromDate(e.target.value)}
						min={minDate}
						max={maxDate}
						className="pl-3 pr-3 py-1.5 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A0000] transition text-sm"
					/>
				</div>
				<div className="flex items-center gap-2">
					<label htmlFor="toDate" className="text-xs font-bold text-[#7A0000] whitespace-nowrap">
						To Date:
					</label>
					<input
						id="toDate"
						type="date"
						value={toDate}
						onChange={(e) => setToDate(e.target.value)}
						min={minDate}
						max={maxDate}
						className="pl-3 pr-3 py-1.5 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A0000] transition text-sm"
					/>
				</div>
				<div className="flex items-center gap-2">
					<label htmlFor="wiringType" className="text-xs font-bold text-[#7A0000] whitespace-nowrap">
						Wiring Type:
					</label>
					<select
						id="wiringType"
						name="wiringType"
						value={wiringType}
						onChange={(e) => setWiringType(e.target.value)}
						className="pl-3 pr-3 py-1.5 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A0000] transition text-sm min-w-[210px]"
					>
						<option value="ALL">ALL — All (Both OH & UG)</option>
						<option value="OH">OH — Over Head</option>
						<option value="UG">UG — Under Ground</option>
					</select>
				</div>
			</div>

			{/* Search */}
			<div className="flex flex-wrap items-center gap-3 mb-4">
				<div className="relative">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
					<input
						type="text"
						placeholder="Search by ID"
						value={searchId}
						onChange={(e) => setSearchId(e.target.value)}
						className="pl-10 pr-4 py-1.5 w-48 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#7A0000] transition text-sm"
					/>
				</div>
				<div className="relative">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
					<input
						type="text"
						placeholder="Search by Name"
						value={searchName}
						onChange={(e) => setSearchName(e.target.value)}
						className="pl-10 pr-4 py-1.5 w-48 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#7A0000] transition text-sm"
					/>
				</div>
				<button
					onClick={clearFilters}
					className="flex items-center gap-1.5 px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded border border-gray-300 text-xs font-medium"
				>
					<RotateCcw className="w-3.5 h-3.5" /> Clear All
				</button>
			</div>

			{/* Companies List */}
			{loading && (
				<div className="text-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7A0000] mx-auto"></div>
					<p className="mt-2">Loading companies...</p>
				</div>
			)}
			{error && (
				<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
					Error: {error}
				</div>
			)}
			{!loading && filtered.length > 0 && (
				<>
					<div className="rounded-lg border border-gray-200 overflow-hidden">
						<table className="w-full text-left">
							<thead className={`${maroonGrad} text-white`}>
								<tr>
									<th className="px-4 py-2">Company Code</th>
									<th className="px-4 py-2">Company Name</th>
									<th className="px-4 py-2 text-center">Action</th>
								</tr>
							</thead>
						</table>

						<div className="max-h-[60vh] overflow-y-auto">
							<table className="w-full text-left">
								<tbody>
									{paginated.map((c, i) => (
										<tr key={i} className="hover:bg-gray-50">
											<td className="px-4 py-2">{c.compId}</td>
											<td className="px-4 py-2">{c.CompName}</td>
											<td className="px-4 py-2 text-center">
												<button
													onClick={() => handleViewReport(c)}
													disabled={!fromDate || !toDate}
													className={`px-3 py-1 rounded text-white text-xs font-medium ${maroonGrad} disabled:opacity-50 hover:brightness-110`}
												>
													<Eye className="inline w-3 h-3 mr-1" />{" "}
													View
												</button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>

					<div className="flex justify-end items-center gap-3 mt-4">
						<button
							onClick={() => setPage((p) => Math.max(1, p - 1))}
							disabled={page === 1}
							className="px-3 py-1 border rounded bg-white text-gray-600 text-xs hover:bg-gray-100 disabled:opacity-40"
						>
							Previous
						</button>
						<span className="text-xs text-gray-500">
							Page {page} of {Math.ceil(filtered.length / pageSize)}
						</span>
						<button
							onClick={() =>
								setPage((p) =>
									Math.min(
										Math.ceil(filtered.length / pageSize),
										p + 1
									)
								)
							}
							disabled={page >= Math.ceil(filtered.length / pageSize)}
							className="px-3 py-1 border rounded bg-white text-gray-600 text-xs hover:bg-gray-100 disabled:opacity-40"
						>
							Next
						</button>
					</div>
				</>
			)}

			{!loading && filtered.length === 0 && !error && (
				<div className="text-center py-12 text-gray-500">
					No companies found.
				</div>
			)}

			{/* Report Modal */}
			{showReport && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/90">
					<div className="relative bg-white w-full max-w-[95vw] rounded-2xl shadow-2xl border border-gray-200 overflow-hidden mt-20 lg:ml-64 mx-auto">
						<div className="p-4 max-h-[85vh] overflow-y-auto">
							<div className="flex justify-end gap-3 mb-4 print:hidden">
								<button
									type="button"
									onClick={handleDownloadCSV}
									className="flex items-center gap-1 px-3 py-1.5 border border-blue-400 text-blue-700 bg-white rounded hover:bg-blue-50 text-xs"
								>
									<Download className="w-4 h-4" /> CSV
								</button>
								<button
									type="button"
									onClick={printPDF}
									className="flex items-center gap-1 px-3 py-1.5 border border-green-400 text-green-700 bg-white rounded hover:bg-green-50 text-xs"
								>
									<Printer className="w-4 h-4" /> PDF
								</button>
								<button
									type="button"
									onClick={closeReport}
									className="flex items-center gap-1 px-3 py-1.5 border border-red-400 text-red-700 bg-white rounded hover:bg-red-50 text-xs"
								>
									<X className="w-4 h-4" /> Close
								</button>
							</div>

							<h2
								className={`text-xl font-bold text-center mb-4 ${maroon}`}
							>
								Provincewise SMC Job Material Details
							</h2>
							<div className="flex justify-between text-sm mb-3">
								<div>
									<p>
										<strong>Province:</strong>{" "}
										{selectedCompany?.compId} - {selectedCompany?.CompName}
									</p>
									<p>
										<strong>Period:</strong> {fromDate} to {toDate}
									</p>
									<p>
										<strong>Wiring Type:</strong> {getWiringTypeLabel(resolvedWiringType)}
									</p>
								</div>
								<div className="font-semibold text-gray-600 self-end">
									Currency: LKR
								</div>
							</div>

							{reportLoading ? (
								<div className="text-center py-20">
									<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7A0000] mx-auto"></div>
									<p className="mt-2 text-gray-600">Loading report...</p>
								</div>
							) : reportData.length === 0 ? (
								<div className="text-center py-20 text-gray-500 text-lg">
									No records found.
								</div>
							) : (
								<div className="overflow-x-auto border border-gray-300 rounded-lg">
									<div className="max-h-[62vh] overflow-y-auto">
										<table className="w-full text-xs min-w-max border-collapse border border-gray-300">
											<thead className={`sticky top-0 z-20 ${maroonGrad} text-white`}>
												<tr>
													{/* 11 Fixed Columns */}
													<th className="px-2.5 py-1.5 border border-white/20 font-bold text-left whitespace-nowrap">
														Project No
													</th>
													<th className="px-2 py-1.5 border border-white/20 font-bold text-center whitespace-nowrap">
														Phase
													</th>
													<th className="px-2 py-1.5 border border-white/20 font-bold text-center whitespace-nowrap">
														Connection Type
													</th>
													<th className="px-2 py-1.5 border border-white/20 font-bold text-center whitespace-nowrap">
														Loop Service
													</th>
													<th className="px-2 py-1.5 border border-white/20 font-bold text-center whitespace-nowrap">
														Tariff Category
													</th>
													<th className="px-2 py-1.5 border border-white/20 font-bold text-center whitespace-nowrap">
														Wiring Type
													</th>
													<th className="px-2 py-1.5 border border-white/20 font-bold text-right whitespace-nowrap">
														Line length
													</th>
													<th className="px-2 py-1.5 border border-white/20 font-bold text-right whitespace-nowrap">
														Service length
													</th>
													<th className="px-2.5 py-1.5 border border-white/20 font-bold text-right whitespace-nowrap">
														Standard Cost
													</th>
													<th className="px-2.5 py-1.5 border border-white/20 font-bold text-right whitespace-nowrap">
														Actual Cost
													</th>
													<th className="px-3 py-1.5 border border-white/20 font-bold text-left whitespace-nowrap">
														Area
													</th>

													{/* Dynamic Material Code Columns */}
													{materialCodes.map((code) => {
														const info = materialInfoMap[code];
														return (
															<th
																key={code}
																title={info ? `${info.name} (${info.uom})` : code}
																className="px-2 py-1.5 border border-white/20 font-bold text-right whitespace-nowrap font-mono hover:bg-white/10"
															>
																{code}
															</th>
														);
													})}
												</tr>
											</thead>
											<tbody>
												{pivotedRows.map((row, idx) => (
													<tr
														key={row.rowKey || idx}
														className={`hover:bg-amber-50/50 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/60"
															}`}
													>
														<td className="px-2.5 py-1 border border-gray-300 font-mono text-gray-900 whitespace-nowrap text-left">
															{row.projectNo}
														</td>
														<td className="px-2 py-1 border border-gray-300 text-center whitespace-nowrap">
															{row.phase}
														</td>
														<td className="px-2 py-1 border border-gray-300 text-center whitespace-nowrap">
															{row.connectionType}
														</td>
														<td className="px-2 py-1 border border-gray-300 text-center whitespace-nowrap">
															{row.loopService}
														</td>
														<td className="px-2 py-1 border border-gray-300 text-center whitespace-nowrap">
															{row.tariffCategory}
														</td>
														<td className="px-2 py-1 border border-gray-300 text-center whitespace-nowrap">
															{row.wiringType}
														</td>
														<td className="px-2 py-1 border border-gray-300 text-right whitespace-nowrap font-mono">
															{formatLength(row.lineLength)}
														</td>
														<td className="px-2 py-1 border border-gray-300 text-right whitespace-nowrap font-mono">
															{formatLength(row.serviceLength)}
														</td>
														<td className="px-2.5 py-1 border border-gray-300 text-right whitespace-nowrap font-mono">
															{formatCost(row.standardCost)}
														</td>
														<td className="px-2.5 py-1 border border-gray-300 text-right whitespace-nowrap font-mono">
															{formatCost(row.actualCost)}
														</td>
														<td className="px-3 py-1 border border-gray-300 text-gray-800 whitespace-nowrap text-left">
															{row.area}
														</td>

														{/* Material Quantities */}
														{materialCodes.map((code) => {
															const q = row.quantities[code] || 0;
															return (
																<td
																	key={code}
																	className={`px-2 py-1 border border-gray-300 text-right whitespace-nowrap font-mono ${q > 0 ? "font-semibold text-gray-900" : "text-gray-400"
																		}`}
																>
																	{formatQty(q)}
																</td>
															);
														})}
													</tr>
												))}
											</tbody>

										</table>
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default ProvincewiseSMCJobMaterialDetails;
