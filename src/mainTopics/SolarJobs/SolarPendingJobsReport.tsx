import React, { useEffect, useState } from "react";
import {
	Search,
	RotateCcw,
	Eye,
	ChevronLeft,
	Download,
	FileText,
} from "lucide-react";
import { useUser } from "../../contexts/UserContext";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import DateRangePicker from "../../components/utils/DateRangePicker";

interface Province {
	ProvinceId: string;
	ProvinceName: string;
}

const formatLocalYmd = (date: Date) => {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
};

const today = new Date();
const defaultFromDate = formatLocalYmd(new Date(today.getFullYear(), today.getMonth(), 1));
const defaultToDate = formatLocalYmd(today);

const SolarPendingJobsReport: React.FC = () => {
	const { user } = useUser();
	const epfNo = user?.Userno || "";

	// Province list state
	const [data, setData] = useState<Province[]>([]);
	const [filtered, setFiltered] = useState<Province[]>([]);
	const [searchId, setSearchId] = useState("");
	const [searchName, setSearchName] = useState("");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [page, setPage] = useState(1);
	const pageSize = 9;

	// Date range
	const [fromDate, setFromDate] = useState(defaultFromDate);
	const [toDate, setToDate] = useState(defaultToDate);

	// PDF report modal state
	const [selectedProvince, setSelectedProvince] = useState<Province | null>(null);
	const [modalOpen, setModalOpen] = useState(false);
	const [pdfLoading, setPdfLoading] = useState(false);
	const [pdfError, setPdfError] = useState<string | null>(null);
	const [pdfUrl, setPdfUrl] = useState<string | null>(null);

	const maroon = "text-[#7A0000]";
	const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";
	const shadedMaroon = "bg-[#A52A2A]/40";

	// Load provinces (Usercompanies)
	useEffect(() => {
		const run = async () => {
			if (!epfNo) {
				setError("No EPF number available. Please login again.");
				setLoading(false);
				return;
			}
			setLoading(true);
			try {
				const res = await fetch(`/misapi/api/incomeexpenditure/Usercompanies/${encodeURIComponent(epfNo)}/60`);
				if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
				const parsed = await res.json();
				let raw: any[] = [];
				if (Array.isArray(parsed)) raw = parsed;
				else if (parsed.data) raw = parsed.data;
				else if (parsed.result) raw = parsed.result;

				const final: Province[] = (raw || []).map((it: any) => ({
					ProvinceId: (it.CompId ?? it.compId ?? "").toString().trim(),
					ProvinceName: (it.CompNm ?? it.CompName ?? "").toString().trim(),
				})).filter(p => p.ProvinceId !== "");

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

	// Filter provinces
	useEffect(() => {
		const f = data.filter(
			(d) =>
				(!searchId || d.ProvinceId.toLowerCase().includes(searchId.toLowerCase())) &&
				(!searchName || d.ProvinceName.toLowerCase().includes(searchName.toLowerCase()))
		);
		setFiltered(f);
		setPage(1);
	}, [searchId, searchName, data]);

	// View PDF report
	const handleViewReport = async (prov: Province) => {
		if (!fromDate || !toDate) {
			toast.error("Please select a valid date range before viewing.", {
				position: "top-right",
				autoClose: 4000,
			});
			return;
		}

		const params = new URLSearchParams({
			fromDate: fromDate,
			toDate: toDate,
			provinceId: prov.ProvinceId,
		});
		const directUrl = `/misapi/api/solarjobs/pending-jobs/pdf?${params.toString()}`;

		setSelectedProvince(prov);
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

	// Download CSV
	const handleDownloadCSV = async () => {
		if (!fromDate || !toDate || !selectedProvince) return;
		try {
			const params = new URLSearchParams({
				fromDate: fromDate,
				toDate: toDate,
				provinceId: selectedProvince.ProvinceId,
			});
			const res = await fetch(`/misapi/api/solarjobs/pending-jobs/list?${params.toString()}`);
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
			a.download = `Solar_Pending_Jobs_${selectedProvince.ProvinceId}.csv`;
			a.click();
			URL.revokeObjectURL(url);
		} catch (err: any) {
			toast.error(err.message || "Failed to download CSV");
		}
	};

	const handleCloseModal = () => {
		setModalOpen(false);
		setSelectedProvince(null);
		setPdfError(null);
		if (pdfUrl) {
			URL.revokeObjectURL(pdfUrl);
			setPdfUrl(null);
		}
	};

	const paginatedProvinces = filtered.slice((page - 1) * pageSize, page * pageSize);

	return (
		<div className="w-full p-6 bg-white rounded-xl shadow border border-gray-200 text-sm font-sans relative">
			{/* Header */}
			<div className="flex justify-between items-center mb-4">
				<h2 className={`text-xl font-bold ${maroon}`}>Solar Retail Rooftop Pending Jobs after PIV2 Paid</h2>
			</div>

			{/* Date Range - Right aligned */}
			<div className="flex justify-end mb-4">
				<DateRangePicker
					fromDate={fromDate}
					toDate={toDate}
					onFromChange={setFromDate}
					onToChange={setToDate}
				/>
			</div>

			{/* Search Inputs */}
			<div className="flex flex-wrap items-center gap-3 mb-4">
				<div className="relative">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
					<input
						type="text"
						value={searchId}
						placeholder="Search by ID"
						onChange={(e) => setSearchId(e.target.value)}
						className="pl-10 pr-4 py-1.5 w-48 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#7A0000] transition text-sm"
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
						className="pl-10 pr-4 py-1.5 w-48 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#7A0000] transition text-sm"
						autoComplete="off"
					/>
				</div>

				{(searchId || searchName) && (
					<button
						onClick={() => { setSearchId(""); setSearchName(""); }}
						className="flex items-center gap-1.5 px-4 py-1.5 bg-gray-100 hover:bg-gray-200 rounded border text-xs font-medium"
					>
						<RotateCcw className="w-3.5 h-3.5" /> Clear
					</button>
				)}
			</div>

			{/* Provinces list */}
			{loading && (
				<div className="text-center py-8">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7A0000] mx-auto"></div>
					<p className="mt-2 text-gray-600">Loading provinces...</p>
				</div>
			)}
			{error && (
				<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
					Error: {error}
				</div>
			)}
			{!loading && !error && filtered.length === 0 && (
				<div className="text-gray-600 bg-gray-100 p-4 rounded">No provinces found.</div>
			)}

			{!loading && !error && filtered.length > 0 && (
				<>
					<div className="overflow-x-auto rounded-lg border border-gray-200">
						<div className="max-h-[50vh] overflow-y-auto">
							<table className="w-full table-fixed text-left text-gray-700 text-sm">
								<thead className={`${maroonGrad} text-white sticky top-0`}>
									<tr>
										<th className="px-4 py-2 w-1/4">Province Code</th>
										<th className="px-4 py-2 w-1/2">Province Name</th>
										<th className="px-4 py-2 w-1/4 text-center">Action</th>
									</tr>
								</thead>
								<tbody>
									{paginatedProvinces.map((d, i) => (
										<tr
											key={`${d.ProvinceId}-${i}`}
											className={`${i % 2 ? "bg-white" : "bg-gray-50"} ${selectedProvince?.ProvinceId === d.ProvinceId ? "ring-2 ring-[#7A0000] ring-inset" : ""
												}`}
										>
											<td className="px-4 py-2 truncate font-mono">{d.ProvinceId}</td>
											<td className="px-4 py-2 truncate">{d.ProvinceName}</td>
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
													View
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
									Solar Retail Rooftop Pending Jobs after PIV2 Paid
								</h2>
								<p className="text-xs text-gray-500 mt-0.5">
									Province:{" "}
									<span className="font-semibold text-[#7A0000]">
										{selectedProvince?.ProvinceId} — {selectedProvince?.ProvinceName}
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
									className="flex items-center gap-1.5 px-3 py-1.5 bg-green-700 text-white text-xs font-semibold rounded-md shadow hover:bg-green-800 transition"
								>
									<Download className="w-3.5 h-3.5" />
									Download CSV
								</button>
								{pdfUrl && (
									<a
										href={pdfUrl}
										download={`Solar_Pending_Jobs_${selectedProvince?.ProvinceId}.pdf`}
										className="flex items-center gap-1.5 px-3 py-1.5 bg-[#7A0000] text-white text-xs font-semibold rounded-md shadow hover:brightness-110 transition"
									>
										<Download className="w-3.5 h-3.5" />
										Download PDF
									</a>
								)}
								<button
									onClick={handleCloseModal}
									className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 text-gray-700 bg-white text-xs font-semibold rounded-md hover:bg-gray-100 transition"
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
									<p className="text-[#7A0000] font-medium text-sm">Generating Report...</p>
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
									title="Jasper Report - Solar Retail Rooftop Pending Jobs"
								/>
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default SolarPendingJobsReport;
