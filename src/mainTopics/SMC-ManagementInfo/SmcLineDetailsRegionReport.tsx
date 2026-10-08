// SmcLineDetailsRegionReport.tsx
import React, {useEffect, useState} from "react";
import {Download, Printer, X, RotateCcw, Eye, Search} from "lucide-react";
import {toast} from "react-toastify";
import {useUser} from "../../contexts/UserContext";

interface Region {
	CompId: string;
	CompName: string;
}

interface SmcLineDetailsItem {
	CompNm: string | null;
	Area: string | null;
	DeptId: string | null;
	Phase: string | null;
	ConnectionType: string | null;
	TariffCatCode: string | null;
	LoopCable: string | null;
	WiringType: string | null;
	LineLength: number | null;
	ServiceLength: number | null;
	InsideLength: number | null;
	ActualCost: number | null;
	StandardCost: number | null;
	ProjectNo: string | null;
}

/* ────── Constants ────── */
const MAX_RECORDS = 5000;
const FETCH_TIMEOUT_MS = 120000;
const PAGE_SIZE = 9;

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

const slashDate = (d: string): string => d.replace(/-/g, "/");

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
const maxDate = `${currentYear}-${currentMonth}-${currentDay}`;

const minYear = currentYear - 20;
const minDate = `${minYear}-${currentMonth}-${currentDay}`;

/* ────── MAIN COMPONENT ────── */
const SmcLineDetailsRegionReport: React.FC = () => {
	const {user} = useUser();
	const epfNo = user?.Userno || "";

	/* ── Region list state ── */
	const [regions, setRegions] = useState<Region[]>([]);
	const [filtered, setFiltered] = useState<Region[]>([]);
	const [searchId, setSearchId] = useState("");
	const [searchName, setSearchName] = useState("");
	const [page, setPage] = useState(1);
	const [regionLoading, setRegionLoading] = useState(true);
	const [regionError, setRegionError] = useState<string | null>(null);

	/* ── Report state ── */
	const [fromDate, setFromDate] = useState("");
	const [toDate, setToDate] = useState("");
	const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
	const [reportData, setReportData] = useState<SmcLineDetailsItem[]>([]);
	const [reportLoading, setReportLoading] = useState(false);
	const [showReport, setShowReport] = useState(false);

	const maroon = "text-[#7A0000]";
	const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";

	/* ────── Fetch Regions ────── */
	useEffect(() => {
		const fetchRegions = async () => {
			if (!epfNo) {
				setRegionError("No EPF number available.");
				toast.error("Login required.");
				setRegionLoading(false);
				return;
			}

			setRegionLoading(true);
			try {
				const res = await fetch(
					`/misapi/api/incomeexpenditure/Usercompanies/${epfNo}/70`
				);
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				const txt = await res.text();
				const parsed = JSON.parse(txt);
				const raw = Array.isArray(parsed) ? parsed : parsed.data || [];
				const list: Region[] = raw.map((c: any) => ({
					CompId: c.CompId,
					CompName: c.CompName,
				}));
				setRegions(list);
				setFiltered(list);
			} catch (e: any) {
				setRegionError(e.message);
				toast.error("Failed to load regions.");
			} finally {
				setRegionLoading(false);
			}
		};
		fetchRegions();
	}, [epfNo]);

	/* ────── Filter Regions ────── */
	useEffect(() => {
		const f = regions.filter(
			(r) =>
				(!searchId ||
					r.CompId.toLowerCase().includes(searchId.toLowerCase())) &&
				(!searchName ||
					r.CompName.toLowerCase().includes(searchName.toLowerCase()))
		);
		setFiltered(f);
		setPage(1);
	}, [searchId, searchName, regions]);

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
		return true;
	};

	/* ────── Fetch report for a selected Region ────── */
	const fetchReport = async (region: Region) => {
		if (!validateInputs()) return;

		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

		setSelectedRegion(region);
		setReportLoading(true);
		setReportData([]);
		setShowReport(true);

		try {
			const compIdParam = encodeURIComponent(region.CompId);
			const url = `/misapi/api/smclinedetails/report/${fromDate}/${toDate}/${compIdParam}`;

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

			const items: SmcLineDetailsItem[] = json.data || [];
			if (items.length > MAX_RECORDS)
				throw new Error(
					`Too many records (${items.length}). Please refine your search.`
				);

			if (items.length === 0) {
				toast.warn("No records found for the selected criteria.");
				setShowReport(false);
				setSelectedRegion(null);
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
			setSelectedRegion(null);
		} finally {
			setReportLoading(false);
		}
	};

	const clearFilters = () => {
		setSearchId("");
		setSearchName("");
	};

	const clearAll = () => {
		setFromDate("");
		setToDate("");
		setSearchId("");
		setSearchName("");
		setShowReport(false);
		setReportData([]);
		setSelectedRegion(null);
		toast.info("Filters cleared.");
	};

	const closeReport = () => {
		setShowReport(false);
		setReportData([]);
		setSelectedRegion(null);
		setReportLoading(false);
	};

	/* ────── Single flat table, matches ORDER BY dept_id, project_no, phase, ... ────── */
	const sortedData = [...reportData].sort(
		(a, b) =>
			(a.DeptId || "").localeCompare(b.DeptId || "") ||
			(a.ProjectNo || "").localeCompare(b.ProjectNo || "") ||
			(a.Phase || "").localeCompare(b.Phase || "") ||
			(a.ConnectionType || "").localeCompare(b.ConnectionType || "") ||
			(a.TariffCatCode || "").localeCompare(b.TariffCatCode || "") ||
			(a.LoopCable || "").localeCompare(b.LoopCable || "") ||
			(a.WiringType || "").localeCompare(b.WiringType || "")
	);

	const regionName =
		reportData.find((r) => r.CompNm)?.CompNm || selectedRegion?.CompName || "";
	const regionDisplay = selectedRegion?.CompId || "";

	/* ────── CSV download ────── */
	const downloadCSV = () => {
		if (reportData.length === 0) return;

		const titleRows = [
			`SMC Line Details From ${slashDate(fromDate)} To ${slashDate(toDate)}`,
			`Division/Region : ${regionDisplay}/${regionName}`,
			"",
		];

		const headers = [
			"No",
			"Division",
			"Area",
			"CSC Code",
			"Phase",
			"Connection Type",
			"Loop Service",
			"Tariff Category",
			"Wiring Type",
			"Project No",
			"Line Length",
			"Service Length",
			"Inside Length",
			"Actual Cost",
			"Standard Cost",
		];
		const rows: string[] = [headers.join(",")];

		sortedData.forEach((it, i) => {
			rows.push(
				[
					csvEscape(i + 1),
					csvEscape(it.CompNm),
					csvEscape(it.Area),
					csvEscape(it.DeptId),
					csvEscape(it.Phase),
					csvEscape(it.ConnectionType),
					csvEscape(it.LoopCable),
					csvEscape(it.TariffCatCode),
					csvEscape(it.WiringType),
					csvEscape(it.ProjectNo),
					csvEscape(formatNumber(it.LineLength)),
					csvEscape(formatNumber(it.ServiceLength)),
					csvEscape(formatNumber(it.InsideLength)),
					csvEscape(formatNumber(it.ActualCost)),
					csvEscape(formatNumber(it.StandardCost)),
				].join(",")
			);
		});

		const csv = [...titleRows, ...rows].join("\n");
		const blob = new Blob([csv], {type: "text/csv;charset=utf-8;"});
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `SmcLineDetails_${fromDate}_${toDate}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	};

	/* ────── PDF print ────── */
	const printPDF = () => {
		if (reportData.length === 0) return;

		let rows = "";
		sortedData.forEach((it, i) => {
			rows += `
          <tr class="${i % 2 ? "bg-white" : "bg-gray-50"}">
            <td class="px-2 py-2 border-l border-r border-gray-300 text-center text-xs">${
					i + 1
				}</td>
            <td class="px-2 py-2 border-r border-gray-300 text-left text-xs">${
					it.CompNm || ""
				}</td>
            <td class="px-2 py-2 border-r border-gray-300 text-left text-xs">${
					it.Area || ""
				}</td>
            <td class="px-2 py-2 border-r border-gray-300 text-left text-xs font-mono">${
					it.DeptId || ""
				}</td>
            <td class="px-2 py-2 border-r border-gray-300 text-left text-xs">${
					it.Phase || ""
				}</td>
            <td class="px-2 py-2 border-r border-gray-300 text-left text-xs">${
					it.ConnectionType || ""
				}</td>
            <td class="px-2 py-2 border-r border-gray-300 text-left text-xs">${
					it.LoopCable || ""
				}</td>
            <td class="px-2 py-2 border-r border-gray-300 text-left text-xs">${
					it.TariffCatCode || ""
				}</td>
            <td class="px-2 py-2 border-r border-gray-300 text-left text-xs">${
					it.WiringType || ""
				}</td>
            <td class="px-2 py-2 border-r border-gray-300 text-left text-xs font-mono">${
					it.ProjectNo || ""
				}</td>
            <td class="px-2 py-2 border-r border-gray-300 text-right text-xs font-mono">${formatNumber(
					it.LineLength
				)}</td>
            <td class="px-2 py-2 border-r border-gray-300 text-right text-xs font-mono">${formatNumber(
					it.ServiceLength
				)}</td>
            <td class="px-2 py-2 border-r border-gray-300 text-right text-xs font-mono">${formatNumber(
					it.InsideLength
				)}</td>
            <td class="px-2 py-2 border-r border-gray-300 text-right text-xs font-mono">${formatNumber(
					it.ActualCost
				)}</td>
            <td class="px-2 py-2 border-r border-gray-300 text-right text-xs font-mono">${formatNumber(
					it.StandardCost
				)}</td>
          </tr>`;
		});

		const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    @media print {
      @page { size: landscape; margin: 8mm 5mm 10mm 5mm; }
      body { margin:0; font-family:Arial,Helvetica,sans-serif; }
      .title { margin: 10px 8px 20px; text-align:center; font-weight:bold; color:#7A0000; font-size:13px; }
      .info { margin:6px 8px; font-size:9px; display:flex; justify-content:space-between; }
      table { border-collapse:collapse; width:100%; font-size:7.5px; }
      th, td { border:1px solid #d1d5db; padding:4px 5px; word-wrap:break-word; }
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
  <div class="title">SMC Line Details From ${slashDate(fromDate)} To ${slashDate(toDate)}</div>
  <div class="info">
    <div><strong>Division/Region :</strong> ${regionDisplay}/${regionName}</div>
    <div style="font-weight:600; color:#4B5563;">Currency : LKR</div>
  </div>
  <table style="width:100%; border-collapse:collapse; font-size:7.5px; border:1px solid #d1d5db;">
    <thead>
      <tr style="background:linear-gradient(to right,#7A0000,#A52A2A); color:white;">
        <th style="padding:4px 5px;">No</th>
        <th style="padding:4px 5px;">Division</th>
        <th style="padding:4px 5px;">Area</th>
        <th style="padding:4px 5px;">CSC Code</th>
        <th style="padding:4px 5px;">Phase</th>
        <th style="padding:4px 5px;">Connection Type</th>
        <th style="padding:4px 5px;">Loop Service</th>
        <th style="padding:4px 5px;">Tariff Category</th>
        <th style="padding:4px 5px;">Wiring Type</th>
        <th style="padding:4px 5px;">Project No</th>
        <th style="padding:4px 5px; text-align:right;">Line Length</th>
        <th style="padding:4px 5px; text-align:right;">Service Length</th>
        <th style="padding:4px 5px; text-align:right;">Inside Length</th>
        <th style="padding:4px 5px; text-align:right;">Actual Cost</th>
        <th style="padding:4px 5px; text-align:right;">Standard Cost</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
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

	const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

	/* ────── RENDER ────── */
	return (
		<div className="max-w-7xl mx-auto p-6 bg-white rounded-xl shadow border border-gray-200 text-sm font-sans">
			<div className="flex justify-between items-center mb-4">
				<h2 className={`text-xl font-bold ${maroon}`}>
					SMC Line Details Region Wise
				</h2>
			</div>

			<div className="bg-gray-50 p-4 rounded-lg mb-4 border border-gray-200">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
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

			{/* ────── Region List ────── */}
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

			{regionLoading && (
				<div className="flex flex-col items-center justify-center py-12">
					<div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[#7A0000]"></div>
					<p className="mt-3 text-gray-600 text-sm">
						Loading regions...
					</p>
				</div>
			)}

			{regionError && (
				<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">
					{regionError}
				</div>
			)}

			{!regionLoading && !regionError && filtered.length > 0 && (
				<>
					<div className="overflow-x-auto rounded-lg border border-gray-200">
						<div className="max-h-[50vh] overflow-y-auto">
							<table className="w-full table-fixed text-left text-xs md:text-sm">
								<thead
									className={`${maroonGrad} text-white sticky top-0`}
								>
									<tr>
										<th className="px-4 py-2 w-1/4">
											Region Code
										</th>
										<th className="px-4 py-2 w-1/2">
											Region Name
										</th>
										<th className="px-4 py-2 w-1/4 text-center">
											Action
										</th>
									</tr>
								</thead>
								<tbody>
									{paginated.map((region, i) => (
										<tr
											key={i}
											className={i % 2 ? "bg-white" : "bg-gray-50"}
										>
											<td className="px-4 py-2 truncate">
												{region.CompId}
											</td>
											<td className="px-4 py-2 truncate">
												{region.CompName}
											</td>
											<td className="px-4 py-2 text-center">
												<button
													onClick={() => fetchReport(region)}
													disabled={!fromDate || !toDate}
													className={`px-3 py-1 rounded text-xs font-medium hover:brightness-110 transition shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 mx-auto
                            ${
											selectedRegion?.CompId === region.CompId &&
											reportLoading
												? "bg-green-600 text-white"
												: selectedRegion?.CompId === region.CompId
												? "bg-green-600 text-white"
												: `${maroonGrad} text-white`
										}`}
												>
													<Eye className="w-3 h-3" />
													{selectedRegion?.CompId === region.CompId &&
													reportLoading
														? "Viewing"
														: selectedRegion?.CompId === region.CompId
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

			{/* ────── REPORT MODAL ────── */}
			{showReport && selectedRegion && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/90 print:static print:inset-auto print:p-0 print:bg-white">
					<div className="relative bg-white w-[95vw] sm:w-[92vw] md:w-[90vw] lg:w-[88vw] xl:w-[85vw] max-w-[1600px] rounded-2xl shadow-2xl border border-gray-200 overflow-hidden mt-16 md:mt-24 lg:mt-32 lg:ml-64 mx-auto print:relative print:w-full print:max-w-none print:rounded-none print:shadow-none print:border-none print:overflow-visible">
						{reportLoading && (
							<div className="absolute inset-0 bg-white/95 z-50 flex flex-col items-center justify-center gap-4">
								<div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#7A0000]"></div>
								<p className="text-xl font-bold text-[#7A0000]">
									Loading Report...
								</p>
								<p className="text-sm text-gray-600">
									Fetching SMC line details from server
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
									className={`text-lg md:text-xl font-bold text-center md:mb-2 ${maroon}`}
								>
									SMC Line Details From {slashDate(fromDate)} To {slashDate(toDate)}
								</h2>
								<div className="flex justify-between text-sm mb-3 ml-5 mr-12">
									<div>
										<span className="font-bold">Division/Region :</span>{" "}
										{regionDisplay}/{regionName}
									</div>
									<div className="font-semibold text-gray-600">
										Currency : LKR
									</div>
								</div>

								<div className="ml-5 mt-1 mb-5 border border-gray-200 rounded-lg overflow-x-auto print:ml-12 print:mt-12 print:overflow-visible">
									<div className="min-w-[1800px]">
										<table className="w-full text-xs border-collapse">
											<thead className={`${maroonGrad} text-white`}>
												<tr>
													<th className="px-2 py-2 border border-gray-300">No</th>
													<th className="px-2 py-2 border border-gray-300">Division</th>
													<th className="px-2 py-2 border border-gray-300">Area</th>
													<th className="px-2 py-2 border border-gray-300">CSC Code</th>
													<th className="px-2 py-2 border border-gray-300">Phase</th>
													<th className="px-2 py-2 border border-gray-300">Connection Type</th>
													<th className="px-2 py-2 border border-gray-300">Loop Service</th>
													<th className="px-2 py-2 border border-gray-300">Tariff Category</th>
													<th className="px-2 py-2 border border-gray-300">Wiring Type</th>
													<th className="px-2 py-2 border border-gray-300">Project No</th>
													<th className="px-2 py-2 border border-gray-300 text-right">Line Length</th>
													<th className="px-2 py-2 border border-gray-300 text-right">Service Length</th>
													<th className="px-2 py-2 border border-gray-300 text-right">Inside Length</th>
													<th className="px-2 py-2 border border-gray-300 text-right">Actual Cost</th>
													<th className="px-2 py-2 border border-gray-300 text-right">Standard Cost</th>
												</tr>
											</thead>
											<tbody>
												{sortedData.map((it, i) => (
													<tr
														key={i}
														className={
															i % 2 === 0
																? "bg-white"
																: "bg-gray-50"
														}
													>
														<td className="px-2 py-2 border-l border-r border-gray-300 text-center">
															{i + 1}
														</td>
														<td className="px-2 py-2 border-r border-gray-300">
															{it.CompNm || ""}
														</td>
														<td className="px-2 py-2 border-r border-gray-300">
															{it.Area || ""}
														</td>
														<td className="px-2 py-2 font-mono border-r border-gray-300">
															{it.DeptId || ""}
														</td>
														<td className="px-2 py-2 border-r border-gray-300">
															{it.Phase || ""}
														</td>
														<td className="px-2 py-2 border-r border-gray-300">
															{it.ConnectionType || ""}
														</td>
														<td className="px-2 py-2 border-r border-gray-300">
															{it.LoopCable || ""}
														</td>
														<td className="px-2 py-2 border-r border-gray-300">
															{it.TariffCatCode || ""}
														</td>
														<td className="px-2 py-2 border-r border-gray-300">
															{it.WiringType || ""}
														</td>
														<td className="px-2 py-2 font-mono border-r border-gray-300">
															{it.ProjectNo || ""}
														</td>
														<td className="px-2 py-2 text-right font-mono border-r border-gray-300">
															{formatNumber(it.LineLength)}
														</td>
														<td className="px-2 py-2 text-right font-mono border-r border-gray-300">
															{formatNumber(it.ServiceLength)}
														</td>
														<td className="px-2 py-2 text-right font-mono border-r border-gray-300">
															{formatNumber(it.InsideLength)}
														</td>
														<td className="px-2 py-2 text-right font-mono border-r border-gray-300">
															{formatNumber(it.ActualCost)}
														</td>
														<td className="px-2 py-2 text-right font-mono border-r border-gray-300">
															{formatNumber(it.StandardCost)}
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

export default SmcLineDetailsRegionReport;