import React, { useState, useEffect } from "react";
import { Download, Printer, X, RotateCcw, Eye, Search } from "lucide-react";
import { toast } from "react-toastify";
import { useUser } from "../../contexts/UserContext";

interface Department {
	DeptId: string;
	DeptName: string;
}

interface QuantityOnHandRow {
	warehouseCode: string;
	materialCode: string;
	materialName: string;
	quantityOnHand: number;
	reorderQuantity: number;
	uomCode: string;
	reference: string;
	minimumStock: number;
	costCentreName: string;
}

/* ────── Constants ────── */
const PAGE_SIZE = 9;
const FETCH_TIMEOUT_MS = 30000;

/* ────── Helpers ────── */
const parseNumber = (value: any): number => {
	if (value === undefined || value === null || value === "") return 0;
	if (typeof value === "number") return value;
	const num = parseFloat(String(value).replace(/,/g, ""));
	return isNaN(num) ? 0 : num;
};

const csvEscape = (val: string | number | null | undefined): string => {
	if (val == null) return "";
	const str = String(val);
	if (/[,\n"]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
	return str;
};

const forceText = (val: string | number | null | undefined): string => {
	if (val == null) return '""';
	const str = String(val).trim();
	return `="${str.replace(/"/g, '""')}"`;
};

/* ────── MAIN COMPONENT ────── */
const QuantityOnHandLessThanReorderLevel: React.FC = () => {
	const { user } = useUser();
	const epfNo = user?.Userno || "";

	const maroon = "text-[#7A0000]";
	const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";

	/* ── Cost Center list state ── */
	const [departments, setDepartments] = useState<Department[]>([]);
	const [filtered, setFiltered] = useState<Department[]>([]);
	const [searchId, setSearchId] = useState("");
	const [searchName, setSearchName] = useState("");
	const [page, setPage] = useState(1);
	const [deptLoading, setDeptLoading] = useState(true);
	const [deptError, setDeptError] = useState<string | null>(null);

	/* ── Report state ── */
	const [selectedDept, setSelectedDept] = useState<Department | null>(null);
	const [reportData, setReportData] = useState<QuantityOnHandRow[]>([]);
	const [reportLoading, setReportLoading] = useState(false);
	const [showReport, setShowReport] = useState(false);
	const [, setReportError] = useState<string | null>(null);

	/* ────── Fetch Departments ────── */
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
				setDeptError(e.message);
				toast.error("Failed to load cost centers.");
			} finally {
				setDeptLoading(false);
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

	/* ────── Fetch report for a selected Cost Center ────── */
	const fetchReport = async (dept: Department) => {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

		setSelectedDept(dept);
		setReportLoading(true);
		setReportData([]);
		setShowReport(true);
		setReportError(null);

		try {
			const cleanDeptId = (dept.DeptId || "").trim();
			const costCtrParam = encodeURIComponent(cleanDeptId);
			const url = `/misapi/api/quantityonhandlessthanreorderlevel/report?costCtr=${costCtrParam}`;

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

			if (json && json.errorMessage) {
				throw new Error(
					json.errorMessage + (json.errorDetails ? `: ${json.errorDetails}` : "")
				);
			}

			const raw = Array.isArray(json)
				? json
				: json.data || json.result || [];

			if (!Array.isArray(raw) || raw.length === 0) {
				toast.warn("No records found for the selected cost centre.");
				setShowReport(false);
				setSelectedDept(null);
				return;
			}

			const mappedRows: QuantityOnHandRow[] = raw.map((item: any) => ({
				warehouseCode: String(item.WarehouseCode ?? item.warehouseCode ?? "").trim(),
				materialCode: String(item.MaterialCode ?? item.materialCode ?? "").trim(),
				materialName: String(item.MaterialName ?? item.materialName ?? "").trim(),
				quantityOnHand: parseNumber(item.QuantityOnHand ?? item.quantityOnHand),
				reorderQuantity: parseNumber(item.ReorderQuantity ?? item.reorderQuantity),
				uomCode: String(item.UomCode ?? item.uomCode ?? "").trim(),
				reference: String(item.Reference ?? item.reference ?? "").trim(),
				minimumStock: parseNumber(item.MinimumStock ?? item.minimumStock),
				costCentreName: String(item.CostCentreName ?? item.costCentreName ?? "").trim(),
			}));

			setReportData(mappedRows);
			toast.success(`${mappedRows.length} records loaded successfully.`);
		} catch (e: any) {
			if (e.name === "AbortError") {
				toast.error("Request timed out.");
			} else {
				const msg = e.message.includes("Failed to fetch")
					? "Server unreachable. Please check your connection."
					: e.message;
				toast.error(msg);
				setReportError(msg);
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

	const closeReport = () => {
		setShowReport(false);
		setReportData([]);
		setSelectedDept(null);
		setReportLoading(false);
		setReportError(null);
	};

	const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

	const costCtrDisplay = selectedDept?.DeptId || "";
	const cctName = reportData[0]?.costCentreName || selectedDept?.DeptName || "";

	/* ────── CSV download ────── */
	const downloadCSV = () => {
		if (reportData.length === 0) {
			toast.error("No data to export.");
			return;
		}

		const titleRows = [
			`Quantity on Hand Less than Reorder Level`,
			`Cost Centre: ${costCtrDisplay} | ${cctName}`,
			"",
		];

		const headers = [
			"Warehouse Code",
			"Material Code",
			"Material Name",
			"Quantity on Hand",
			"Reorder Level",
			"UOM Code",
			"Reference",
			"Minimum Quantity",
		];

		const rows = reportData.map((r) => {
			const val = r.quantityOnHand;
			const qtyOnHand =
				val === null || val === undefined || (val as any) === "" || isNaN(Number(val))
					? "0.00"
					: Number(val).toFixed(2);

			return [
				csvEscape(r.warehouseCode),
				forceText(r.materialCode),
				csvEscape(r.materialName),
				csvEscape(qtyOnHand),
				csvEscape(r.reorderQuantity),
				csvEscape(r.uomCode),
				csvEscape(r.reference),
				csvEscape(r.minimumStock),
			];
		});

		const csv = [
			...titleRows,
			headers.map(csvEscape).join(","),
			...rows.map((row) => row.join(",")),
		].join("\n");

		const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `QuantityOnHandLessThanReorderLevel_${costCtrDisplay}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	};



	/* ────── PDF print ────── */
	const printPDF = () => {
		if (reportData.length === 0) {
			toast.error("No data to export.");
			return;
		}

		let rows = "";
		reportData.forEach((r, i) => {
			const val = r.quantityOnHand;
			const qtyOnHand =
				val === null || val === undefined || val === ("" as any) || isNaN(Number(val))
					? "0.00"
					: Number(val).toFixed(2);

			rows += `
          <tr class="${i % 2 ? "bg-white" : "bg-gray-50"}">
            <td style="text-align:left;" class="px-2 py-1.5 border-l border-r border-gray-300 text-left text-xs font-mono">${r.warehouseCode}</td>
            <td style="text-align:left;" class="px-2 py-1.5 border-r border-gray-300 text-left text-xs font-mono">${r.materialCode}</td>
            <td style="text-align:left;" class="px-2 py-1.5 border-r border-gray-300 text-left text-xs">${r.materialName}</td>
            <td style="text-align:right;" class="px-2 py-1.5 border-r border-gray-300 text-right text-xs font-mono">${qtyOnHand}</td>
            <td style="text-align:right;" class="px-2 py-1.5 border-r border-gray-300 text-right text-xs font-mono">${r.reorderQuantity}</td>
            <td style="text-align:center;" class="px-2 py-1.5 border-r border-gray-300 text-center text-xs font-mono">${r.uomCode}</td>
            <td style="text-align:center;" class="px-2 py-1.5 border-r border-gray-300 text-center text-xs font-mono">${r.reference}</td>
            <td style="text-align:right;" class="px-2 py-1.5 border-r border-gray-300 text-right text-xs font-mono">${r.minimumStock}</td>
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
      .title { margin: 10px 8px 20px; text-align:center; font-weight:bold; color:#7A0000; font-size:14px; }
      .info { margin:6px 8px; font-size:10px; display:flex; justify-content:space-between; }
      table { border-collapse:collapse; width:100%; font-size:9px; }
      th, td { border:1px solid #d1d5db; padding:6px 6px; word-wrap:break-word; }
      th { background:linear-gradient(to right,#7A0000,#A52A2A); color:white; font-weight:bold; }
      .font-mono { font-family:monospace; }
      @page {
        @bottom-left  { content:"Printed on: ${new Date().toLocaleString("en-US", { timeZone: "Asia/Colombo" })}"; font-size:7px; color:gray; }
        @bottom-right { content:"Page " counter(page) " of " counter(pages); font-size:7px; color:gray; }
      }
    }
  </style>
</head>
<body>
  <div class="title">Quantity on Hand Less than Reorder Level</div>
  <div class="info">
    <div><strong>Cost Centre:</strong> ${costCtrDisplay} / ${cctName}</div>
  </div>
  <table style="width:100%; border-collapse:collapse; font-size:9px; border:1px solid #d1d5db;">
    <thead>
      <tr style="background:linear-gradient(to right,#7A0000,#A52A2A); color:white;">
        <th style="padding:6px; width:14%; text-align:left;">Warehouse Code</th>
        <th style="padding:6px; width:14%; text-align:left;">Material Code</th>
        <th style="padding:6px; width:30%; text-align:left;">Material Name</th>
        <th style="padding:6px; width:11%; text-align:right;">Quantity on Hand</th>
        <th style="padding:6px; width:11%; text-align:right;">Reorder Level</th>
        <th style="padding:6px; width:6%; text-align:center;">UOM Code</th>
        <th style="padding:6px; width:6%; text-align:center;">Reference</th>
        <th style="padding:6px; width:8%; text-align:right;">Minimum Quantity</th>
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

	/* ────── RENDER ────── */
	return (
		<div className="max-w-7xl mx-auto p-6 bg-white rounded-xl shadow border border-gray-200 text-sm font-sans">
			<div className="flex justify-between items-center mb-4">
				<h2 className={`text-xl font-bold ${maroon}`}>
					Quantity On Hand Less Than Reorder Level
				</h2>
			</div>

			{/* ────── Cost Center List Filters ────── */}
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
													className={`px-3 py-1 rounded text-xs font-medium hover:brightness-110 transition shadow flex items-center gap-1 mx-auto
                            ${selectedDept?.DeptId === dept.DeptId &&
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

			{/* ────── REPORT MODAL / DISPLAY AREA ────── */}
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
									Fetching inventory reorder report from server
								</p>
							</div>
						)}
						{!reportLoading && reportData.length > 0 && (
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
										onClick={closeReport}
										className="flex items-center gap-1 px-3 py-1.5 border border-red-400 text-red-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-red-50"
									>
										<X className="w-4 h-4" /> Close
									</button>
								</div>

								<h2
									className={`text-lg md:text-xl font-bold text-center md:mb-6 ${maroon}`}
								>
									Quantity on Hand Less than Reorder Level
								</h2>
								<div className="flex justify-between text-sm mb-3 ml-5 mr-12">
									<div>
										<span className="font-bold">Cost Centre:</span>{" "}
										{costCtrDisplay} / {cctName}
									</div>
								</div>

								<div className="ml-5 mt-1 mb-5 border border-gray-200 rounded-lg overflow-x-auto print:ml-12 print:mt-12 print:overflow-visible">
									<div className="min-w-[800px]">
										<table className="w-full text-xs border-collapse">
											<thead className={`${maroonGrad} text-white`}>
												<tr>
													<th className="px-3 py-2 border border-gray-300 text-center" style={{ width: "14%" }}>
														Warehouse Code
													</th>
													<th className="px-3 py-2 border border-gray-300 text-center" style={{ width: "14%" }}>
														Material Code
													</th>
													<th className="px-3 py-2 border border-gray-300 text-left" style={{ width: "30%" }}>
														Material Name
													</th>
													<th className="px-3 py-2 border border-gray-300 text-right" style={{ width: "11%" }}>
														Quantity on Hand
													</th>
													<th className="px-3 py-2 border border-gray-300 text-right" style={{ width: "11%" }}>
														Reorder Level
													</th>
													<th className="px-3 py-2 border border-gray-300 text-center" style={{ width: "6%" }}>
														UOM Code
													</th>
													<th className="px-3 py-2 border border-gray-300 text-center" style={{ width: "6%" }}>
														Reference
													</th>
													<th className="px-3 py-2 border border-gray-300 text-right" style={{ width: "8%" }}>
														Minimum Quantity
													</th>
												</tr>
											</thead>
											<tbody>
												{reportData.map((r, i) => (
													<tr
														key={`${r.materialCode}-${i}`}
														className={
															i % 2 === 0
																? "bg-white"
																: "bg-gray-50"
														}
													>
														<td className="px-3 py-2 border-l border-r border-gray-300 text-center font-mono">
															{r.warehouseCode}
														</td>
														<td className="px-3 py-2 text-center font-mono border-r border-gray-300">
															{r.materialCode}
														</td>
														<td className="px-3 py-2 border-r border-gray-300 text-left">
															{r.materialName}
														</td>
														<td className="px-3 py-2 text-right font-mono border-r border-gray-300">
															{r.quantityOnHand}
														</td>
														<td className="px-3 py-2 text-right font-mono border-r border-gray-300">
															{r.reorderQuantity}
														</td>
														<td className="px-3 py-2 text-center font-mono border-r border-gray-300">
															{r.uomCode}
														</td>
														<td className="px-3 py-2 text-center font-mono border-r border-gray-300">
															{r.reference}
														</td>
														<td className="px-3 py-2 text-right font-mono border-r border-gray-300">
															{r.minimumStock}
														</td>
													</tr>
												))}
											</tbody>
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

export default QuantityOnHandLessThanReorderLevel;
