import React, { useEffect, useState } from "react";
import {
	Search,
	RotateCcw,
	Eye,
	ChevronLeft,
	Download,
	Calendar,
	FileText,
	X,
} from "lucide-react";
import { useUser } from "../../contexts/UserContext";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import DateRangePicker from "../../components/utils/DateRangePicker";

interface Department {
	DeptId: string;
	DeptName: string;
}

const formatLocalYmd = (date: Date) => {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
};

<<<<<<< HEAD
=======
const defaultFromDate = formatLocalYmd(new Date(today.getFullYear(), today.getMonth(), 1));
const defaultToDate = formatLocalYmd(today);

const formatDate = (date: string | null): string => {
if (!date) return "";
const dateObj = new Date(date);
if (Number.isNaN(dateObj.getTime())) return date;
return dateObj.toLocaleDateString("en-GB", {
year: "numeric",
month: "2-digit",
day: "2-digit",
});
};

const csvEscape = (val: string | number | null | undefined): string => {
if (val == null) return '""';
const str = String(val);
if (/[,\n"']/.test(str)) return `"${str.replace(/"/g, '""')}"`;
return str;
};

const buildApiUrl = (fromDate: string, toDate: string, costctr: string) => {
        const base = API_BASE || "/misapi";
        const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
        const params = new URLSearchParams({
                fromDate,
                toDate,
                costctr,
        });
        return `/misapi/api/solarjobs/ccapplication/list?${params.toString()}`;
};

const columns = [
"Application ID",
"Application No",
"Submit Date",
"Approved Date",
"Project No",
"PIV Date",
"Application Sub Type",
"Paid Date",
"PIV2 Paid Date",
"Energized Date",
"Existing Acc No",
"Cost Center"
];

>>>>>>> c998d1df1da9fd2e403ae3fac07d2e5814e3d305
const CcApplicationProgress: React.FC = () => {
	const { user } = useUser();
	const epfNo = user?.Userno || "";

	// Department list state
	const [data, setData] = useState<Department[]>([]);
	const [filtered, setFiltered] = useState<Department[]>([]);
	const [searchId, setSearchId] = useState("");
	const [searchName, setSearchName] = useState("");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [page, setPage] = useState(1);
	const pageSize = 9;

	// Date range
	const [fromDate, setFromDate] = useState("");
	const [toDate, setToDate] = useState("");

	// PDF report modal state
	const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
	const [modalOpen, setModalOpen] = useState(false);
	const [pdfLoading, setPdfLoading] = useState(false);
	const [pdfError, setPdfError] = useState<string | null>(null);
	const [pdfUrl, setPdfUrl] = useState<string | null>(null);

	const maroon = "text-[#7A0000]";
	const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";
	const shadedMaroon = "bg-[#A52A2A]/40";

	// Load departments
	useEffect(() => {
		const run = async () => {
			if (!epfNo) {
				setError("No EPF number available. Please login again.");
				setLoading(false);
				return;
			}
			setLoading(true);
			try {
				const res = await fetch(`/misapi/api/incomeexpenditure/departments/${epfNo}`);
				if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
				const parsed = await res.json();
				let raw: any[] = [];
				if (Array.isArray(parsed)) raw = parsed;
				else if (parsed.data) raw = parsed.data;
				else if (parsed.result) raw = parsed.result;
				else if (parsed.departments) raw = parsed.departments;
				const final: Department[] = (raw || []).map((it: any) => ({
					DeptId: it.DeptId?.toString() || it.deptId?.toString() || "",
					DeptName: it.DeptName?.toString().trim() || it.deptName?.toString().trim() || "",
				}));
				setData(final);
				setFiltered(final);
			} catch (e: any) {
				setError(e.message);
			} finally {
				setLoading(false);
			}
		};
		run();
	}, [epfNo]);

	// Filter departments
	useEffect(() => {
		const f = data.filter(
			(d) =>
				(!searchId || d.DeptId.toLowerCase().includes(searchId.toLowerCase())) &&
				(!searchName || d.DeptName.toLowerCase().includes(searchName.toLowerCase()))
		);
		setFiltered(f);
		setPage(1);
	}, [searchId, searchName, data]);

	// When "View" is clicked — fetch PDF from Jasper backend
	const handleViewReport = async (dept: Department) => {
		if (!fromDate || !toDate) {
			toast.error("Please select a valid date range before viewing.", {
				position: "top-right",
				autoClose: 4000,
			});
			return;
		}

		const fromDt = fromDate;
		const toDt = toDate;

		// Build the direct PDF URL for download button
		const params = new URLSearchParams({
			fromDate: fromDt,
			toDate: toDt,
			costctr: dept.DeptId,
			costctrName: dept.DeptName,
		});
		const directUrl = `/misapi/api/solarjobs/ccapplication/pdf?${params.toString()}`;

		setSelectedDepartment(dept);
		setModalOpen(true);
		setPdfLoading(true);
		setPdfError(null);
		setPdfUrl(null);

		try {
			const response = await fetch(directUrl);
			if (!response.ok) {
				const text = await response.text();
				throw new Error(text || `HTTP ${response.status}`);
			}
			const blob = await response.blob();
			const objectUrl = URL.createObjectURL(blob);
			setPdfUrl(objectUrl);
		} catch (err: any) {
			setPdfError(err.message || "Failed to generate report.");
			toast.error("Failed to load Jasper report: " + (err.message || "Unknown error"));
		} finally {
			setPdfLoading(false);
		}
	};

	const handleDownloadCSV = async () => {
		if (!fromDate || !toDate || !selectedDepartment) return;
		try {
			const fromDt = fromDate;
			const toDt = toDate;
			const params = new URLSearchParams({
				fromDate: fromDt,
				toDate: toDt,
				costctr: selectedDepartment.DeptId,
			});
			const res = await fetch(`/misapi/api/solarjobs/ccapplication/list?${params.toString()}`);
			if (!res.ok) throw new Error("Failed to fetch data for CSV");
			const json = await res.json();
			const dataList = json.data || [];
			if (dataList.length === 0) {
				toast.info("No data available to download.");
				return;
			}
			const headers = Object.keys(dataList[0]);
			const csvRows = [headers.join(",")];
			for (const row of dataList) {
				const values = headers.map((h) => {
					const val = row[h] == null ? "" : row[h];
					return `"${String(val).replace(/"/g, '""')}"`;
				});
				csvRows.push(values.join(","));
			}
			const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `Cc_Application_Progress_${selectedDepartment.DeptId}.csv`;
			a.click();
			URL.revokeObjectURL(url);
		} catch (err: any) {
			toast.error(err.message || "Failed to download CSV");
		}
	};

	const handleCloseModal = () => {
		setModalOpen(false);
		setSelectedDepartment(null);
		setPdfError(null);
		if (pdfUrl) {
			URL.revokeObjectURL(pdfUrl);
			setPdfUrl(null);
		}
	};

	const paginatedDepartments = filtered.slice((page - 1) * pageSize, page * pageSize);

	// ── Render ───────────────────────────────────────────────────────────────

	// ── Render ───────────────────────────────────────────────────────────────
	return (
		<div className="w-full p-6 bg-white rounded-xl shadow border border-gray-200 text-sm font-sans relative">
			{/* Header */}
			<div className="flex justify-between items-center mb-4">
				<h2 className={`text-xl font-bold ${maroon}`}>C/C Solar Application Progress</h2>
			</div>

			{/* Filters */}
			<div className="bg-gray-50 p-4 rounded-lg mb-4 flex flex-col xl:flex-row gap-4 xl:items-end xl:justify-between">
				<div className="flex flex-col sm:flex-row gap-4 flex-1">
					{/* Search by ID */}
					<div className="relative w-full max-w-[200px]">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
						<input
							type="text"
							value={searchId}
							placeholder="Search by Dept ID"
							onChange={(e) => setSearchId(e.target.value)}
							className="pl-10 pr-3 py-2 w-full rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A0000] transition text-sm"
							autoComplete="off"
						/>
					</div>

					{/* Search by Name */}
					<div className="relative w-full max-w-[200px]">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
						<input
							type="text"
							value={searchName}
							placeholder="Search by Name"
							onChange={(e) => setSearchName(e.target.value)}
							className="pl-10 pr-3 py-2 w-full rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A0000] transition text-sm"
							autoComplete="off"
						/>
					</div>
				</div>

				<div className="flex items-center gap-4 flex-wrap">
					{/* DateRangePicker */}
					<div className="mt-2 mb-0">
						<DateRangePicker
							fromDate={fromDate}
							toDate={toDate}
							onFromChange={setFromDate}
							onToChange={setToDate}
						/>
					</div>

					{/* Clear filters */}
					<div className="flex gap-2">
						{(searchId || searchName || fromDate || toDate) && (
							<button
								onClick={() => { setSearchId(""); setSearchName(""); setFromDate(""); setToDate(""); }}
								className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-100 text-gray-700 text-sm transition"
							>
								<RotateCcw className="w-4 h-4" /> Clear
							</button>
						)}
					</div>
				</div>
			</div>

			{/* Department list */}
			{loading && (
				<div className="text-center py-8">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7A0000] mx-auto"></div>
					<p className="mt-2 text-gray-600">Loading departments...</p>
				</div>
			)}
			{error && (
				<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
					Error: {error}
				</div>
			)}
			{!loading && !error && filtered.length === 0 && (
				<div className="text-gray-600 bg-gray-100 p-4 rounded">No departments found.</div>
			)}

			{!loading && !error && filtered.length > 0 && (
				<>
					<div className="overflow-x-auto rounded-lg border border-gray-200">
						<div className="max-h-[50vh] overflow-y-auto">
							<table className="w-full table-fixed text-left text-gray-700 text-sm">
								<thead className={`${maroonGrad} text-white sticky top-0`}>
									<tr>
										<th className="px-4 py-2 w-1/4">Cost Center Code</th>
										<th className="px-4 py-2 w-1/2">Cost Center Name</th>
										<th className="px-4 py-2 w-1/4 text-center">Action</th>
									</tr>
								</thead>
								<tbody>
									{paginatedDepartments.map((d, i) => (
										<tr
											key={`${d.DeptId}-${i}`}
											className={`${i % 2 ? "bg-white" : "bg-gray-50"} ${selectedDepartment?.DeptId === d.DeptId ? "ring-2 ring-[#7A0000] ring-inset" : ""
												}`}
										>
											<td className="px-4 py-2 truncate font-mono">{d.DeptId}</td>
											<td className="px-4 py-2 truncate">{d.DeptName}</td>
											<td className="px-4 py-2 text-center">
												<button
													onClick={() => handleViewReport(d)}
													disabled={!(fromDate && toDate)}
													className={`px-3 py-1 rounded-md text-xs font-medium shadow transition-all flex items-center justify-center mx-auto gap-1 ${fromDate && toDate
														? `${maroonGrad} text-white hover:brightness-110`
														: `${shadedMaroon} text-white cursor-not-allowed`
														}`}
												>
													<Eye className="w-3 h-3" />
													View Report
												</button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>

					{/* Pagination */}
					<div className="flex justify-end items-center gap-3 mt-3">
						<button
							onClick={() => setPage((p) => Math.max(1, p - 1))}
							disabled={page === 1}
							className="px-3 py-1 border rounded bg-white text-gray-600 text-xs hover:bg-gray-100 disabled:opacity-40"
						>
							Previous
						</button>
						<span className="text-xs text-gray-500">
							Page {page} of {Math.ceil(filtered.length / pageSize) || 1}
						</span>
						<button
							onClick={() => setPage((p) => Math.min(Math.ceil(filtered.length / pageSize), p + 1))}
							disabled={page >= Math.ceil(filtered.length / pageSize) || filtered.length === 0}
							className="px-3 py-1 border rounded bg-white text-gray-600 text-xs hover:bg-gray-100 disabled:opacity-40"
						>
							Next
						</button>
					</div>
				</>
			)}

			{/* ── PDF Report Modal ─────────────────────────────────────────────── */}
			{modalOpen && (
				<div className="fixed top-20 right-0 bottom-0 left-0 lg:left-64 z-[60] flex p-4 sm:p-6 bg-gray-900/80 backdrop-blur-sm">
					<div className="relative bg-white w-full h-full flex flex-col rounded-xl shadow-2xl overflow-hidden border border-gray-300">
						{/* Modal header */}
						<div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 border-b bg-white shadow-sm shrink-0 gap-4">
							<div>
								<h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
									<FileText className="w-4 h-4 text-[#7A0000]" />
									C/C Solar Application Progress — Jasper Report
								</h2>
								<p className="text-xs text-gray-500 mt-0.5">
									Cost Center:{" "}
									<span className="font-semibold text-[#7A0000]">
										{selectedDepartment?.DeptId} — {selectedDepartment?.DeptName}
									</span>
									{fromDate && toDate && (
										<>
											&nbsp;&nbsp;|&nbsp;&nbsp;Period:{" "}
											{fromDate} to {toDate}
										</>
									)}
								</p>
							</div>

							<div className="flex items-center gap-2">
								<button
									onClick={handleDownloadCSV}
									className="flex items-center gap-1.5 px-3 py-1.5 bg-green-700 text-white text-xs font-medium rounded-md shadow hover:bg-green-800 transition"
								>
									<Download className="w-3.5 h-3.5" />
									Download CSV
								</button>
								{pdfUrl && (
									<a
										href={pdfUrl}
										download={`Cc_Application_Progress_${selectedDepartment?.DeptId}.pdf`}
										className="flex items-center gap-1.5 px-3 py-1.5 bg-[#7A0000] text-white text-xs font-medium rounded-md shadow hover:brightness-110 transition"
									>
										<Download className="w-3.5 h-3.5" />
										Download PDF
									</a>
								)}
								<button
									onClick={handleCloseModal}
									className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 text-gray-700 bg-white text-xs font-medium rounded-md hover:bg-gray-100 transition"
								>
									<ChevronLeft className="w-3.5 h-3.5" />
									Go Back
								</button>
							</div>
						</div>

						{/* Modal body */}
						<div className="flex-1 overflow-hidden bg-gray-100">
							{pdfLoading && (
								<div className="flex flex-col items-center justify-center h-full gap-4">
									<div className="animate-spin rounded-full h-12 w-12 border-4 border-[#7A0000] border-t-transparent"></div>
									<p className="text-[#7A0000] font-medium text-sm">Generating Jasper Report...</p>
									<p className="text-gray-500 text-xs">This may take a moment</p>
								</div>
							)}

							{!pdfLoading && pdfError && (
								<div className="flex flex-col items-center justify-center h-full gap-4 px-8">
									<div className="bg-red-50 border border-red-300 rounded-lg p-6 max-w-lg w-full text-center">
										<FileText className="w-10 h-10 text-red-400 mx-auto mb-3" />
										<h3 className="font-semibold text-red-700 mb-2">Report Generation Failed</h3>
										<p className="text-red-600 text-xs">{pdfError}</p>
										<p className="text-gray-500 text-xs mt-3">
											Please ensure the Jasper report service and JAR are deployed on the backend server.
										</p>
									</div>
								</div>
							)}

							{!pdfLoading && !pdfError && pdfUrl && (
								<iframe
									src={pdfUrl}
									className="w-full h-full border-none"
									title="Jasper Report - C/C Solar Application Progress"
								/>
							)}
						</div>

					</div>
				</div>
			)}
		</div>
	);
};

export default CcApplicationProgress;
