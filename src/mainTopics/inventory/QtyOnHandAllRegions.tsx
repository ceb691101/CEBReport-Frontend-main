import React, {useEffect, useState, useMemo, useRef} from "react";
import {Search, RotateCcw, Eye, X, Download, Printer} from "lucide-react";
import {toast} from "react-toastify";
import {useUser} from "../../contexts/UserContext";

interface Company {
	compId: string;
	CompName: string;
}

interface StockItem {
	MAT_CD: string | null;
	MAT_NM: string | null;
	UOM_CD: string | null;
	REGION: string | null;
	C8: string | null;
	DEPT_ID: string | null;
	UNIT_PRICE: number;
	COMMITED_COST: number;
}

const formatNumber = (num: number | null | undefined): string => {
	if (num == null || isNaN(num)) return "0.00";
	return new Intl.NumberFormat("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(num);
};

const csvEscape = (val: string | number | null | undefined): string => {
	if (val == null) return '""';
	const str = String(val);
	if (/[,\n"]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
	return str;
};

const QtyOnHandAllRegion: React.FC = () => {
	const {user} = useUser();
	const epfNo = user?.Userno || "";
	const iframeRef = useRef<HTMLIFrameElement>(null);

	const [companies, setCompanies] = useState<Company[]>([]);
	const [filtered, setFiltered] = useState<Company[]>([]);
	const [searchId, setSearchId] = useState("");
	const [searchName, setSearchName] = useState("");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [page, setPage] = useState(1);
	const pageSize = 50;

	const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
	const [matCode, setMatCode] = useState("");
	const [reportData, setReportData] = useState<StockItem[]>([]);
	const [reportLoading, setReportLoading] = useState(false);
	const [showReport, setShowReport] = useState(false);

	const maroon = "text-[#7A0000]";
	const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";

	// Unique sorted C8 values (regions / company codes)
	const c8Codes = useMemo(
		() =>
			Array.from(new Set(reportData.map((i) => i.C8 || "Unknown"))).sort(),
		[reportData],
	);

	// Pivot: one row per MAT_CD + MAT_NM + UOM_CD
	const pivotedData = useMemo(() => {
		const map = new Map<string, any>();

		reportData.forEach((item) => {
			const key = `${item.MAT_CD || ""}|||${item.MAT_NM || ""}|||${item.UOM_CD || ""}`;
			if (!map.has(key)) {
				map.set(key, {
					MAT_CD: item.MAT_CD,
					MAT_NM: item.MAT_NM,
					UOM_CD: item.UOM_CD,
					qtyByC8: {[item.C8 || "Unknown"]: item.COMMITED_COST},
				});
			} else {
				const existing = map.get(key);
				existing.qtyByC8[item.C8 || "Unknown"] =
					(existing.qtyByC8[item.C8 || "Unknown"] || 0) +
					item.COMMITED_COST;
			}
		});

		return Array.from(map.values());
	}, [reportData]);

	// Fetch companies (adjust endpoint if needed)
	useEffect(() => {
		const fetchCompanies = async () => {
			if (!epfNo) {
				setError("No EPF number available.");
				setLoading(false);
				return;
			}
			setLoading(true);
			try {
				const res = await fetch(
					`/misapi/api/incomeexpenditure/Usercompanies/${epfNo}/70`,
				);
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				const txt = await res.text();
				const parsed = JSON.parse(txt);
				const raw = Array.isArray(parsed) ? parsed : parsed.data || [];
				const comps: Company[] = raw.map((c: any) => ({
					compId: c.CompId || c.compId,
					CompName: c.CompName || c.compName,
				}));
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

	useEffect(() => {
		const f = companies.filter(
			(c) =>
				(!searchId ||
					c.compId.toLowerCase().includes(searchId.toLowerCase())) &&
				(!searchName ||
					c.CompName.toLowerCase().includes(searchName.toLowerCase())),
		);
		setFiltered(f);
		setPage(1);
	}, [searchId, searchName, companies]);

	const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

	const handleViewReport = async (company: Company) => {
		setSelectedCompany(company);
		setReportLoading(true);
		setReportData([]);
		setShowReport(true);

		try {
			const mc = matCode.trim();
			const url = `/misapi/api/qty-on-hand-all-region?compId=${company.compId.trim()}&matcode=${encodeURIComponent(mc)}`;
			const res = await fetch(url);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = await res.json();
			const items: StockItem[] = data.data || data || [];
			setReportData(items);
			items.length === 0
				? toast.warn("No stock records found")
				: toast.success("Data loaded");
		} catch (err: any) {
			toast.error("Failed to load data: " + err.message);
		} finally {
			setReportLoading(false);
		}
	};

	const closeReport = () => {
		setShowReport(false);
		setReportData([]);
		setSelectedCompany(null);
	};

	const handleDownloadCSV = () => {
		if (reportData.length === 0 || !selectedCompany) return;

		const headers = [
			"Material Code",
			"Material Name",
			"Unit of Measure",
			...c8Codes,
			"Total",
		];

		const csvRows: string[] = [
			`Stock Report with Provincial Stores and All Consumer Servises Centers - As at ${new Date().toISOString().split("T")[0]} `,
			`Division : ${selectedCompany.compId} / ${selectedCompany.CompName}`,
			"",
			headers.map(csvEscape).join(","),
		];

		pivotedData.forEach((row) => {
			const csvRow = [
				`="${row.MAT_CD || ""}"`, // preserve leading zeros
				csvEscape(row.MAT_NM || ""),
				csvEscape(row.UOM_CD || ""),
				...c8Codes.map((c8) => formatNumber(row.qtyByC8[c8] || 0)),
				formatNumber(
					c8Codes.reduce((sum, c8) => sum + (row.qtyByC8[c8] || 0), 0),
				),
			];
			csvRows.push(csvRow.map(csvEscape).join(","));
		});

		const csvContent = "\uFEFF" + csvRows.join("\n");
		const blob = new Blob([csvContent], {type: "text/csv;charset=utf-8;"});
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `Qty_On_Hand_All_Regions_${selectedCompany.compId}_${new Date().toISOString().slice(0, 10)}.csv`;
		link.click();
		URL.revokeObjectURL(url);
	};

	const printPDF = () => {
		if (!iframeRef.current || !selectedCompany) return;

		const tableStyle = `
      table { width: auto; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 10px; }
      th, td { border: 1px solid #999; padding: 5px;}
      th { font-size: 10px; font-weight: bold;  }
      .numeric { text-align: right !important; }
      .center { text-align: center; }
      body { margin: 5mm; }
      h2 { color: #7A0000; text-align: center; font-size: 13px; margin-bottom: 6px; font-family: Arial, sans-serif;}
      .subtitle { font-size: 9px; margin-bottom: 10px; font-family: Arial, sans-serif; }
      .left { float: left; }
      .right { float: right; }
      .clearfix::after { content: ""; display: table; clear: both; }
      @page {@bottom-left { content: "Printed on: ${new Date().toLocaleString("en-US", {timeZone: "Asia/Colombo"})}"; font-size: 9px; }
        @bottom-right { content: "Page " counter(page) " of " counter(pages); font-size: 9px; } }
    `;

		let bodyHTML = "";

		pivotedData.forEach((row, idx) => {
			bodyHTML += `
        <tr style="background:${idx % 2 === 0 ? "#fff" : "#f9f9f9"};">
          <td class="center">${escapeHtml(row.MAT_CD || "-")}</td>
          <td>${escapeHtml(row.MAT_NM || "-")}</td>
          <td class="center">${escapeHtml(row.UOM_CD || "-")}</td>
          ${c8Codes.map((c8) => `<td class="numeric">${formatNumber(row.qtyByC8[c8] || 0)}</td>`).join("")}
          <td class="numeric font-bold">${formatNumber(c8Codes.reduce((s, c) => s + (row.qtyByC8[c] || 0), 0))}</td>
        </tr>`;
		});

		const headerHTML = `
      <thead>
        <tr>
          <th>Material Code</th>
          <th>Material Name</th>
          <th>Unit of Measure</th>
          ${c8Codes.map((c) => `<th class="numeric">${escapeHtml(c)}</th>`).join("")}
          <th class="numeric">Total</th>
        </tr>
      </thead>`;

		const fullHTML = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Qty On Hand All Regions</title>
<style>${tableStyle}</style>
</head>
<body>
<h2>Stock Report with Provincial Stores and All Consumer Servises Centers - As at ${new Date().toISOString().split("T")[0]} </h2>
<div class="subtitle clearfix">
  <div class="left">
    <div>Division : ${selectedCompany.compId} / ${escapeHtml(selectedCompany.CompName)}</div>
  </div>
  <div class="right">
    Currency : LKR
  </div>
</div>
<table>${headerHTML}<tbody>${bodyHTML}</tbody></table>
</body>
</html>`;

		const doc = iframeRef.current.contentDocument!;
		doc.open();
		doc.write(fullHTML);
		doc.close();

		setTimeout(() => iframeRef.current?.contentWindow?.print(), 800);
	};

	const escapeHtml = (text: string) => {
		const div = document.createElement("div");
		div.textContent = text;
		return div.innerHTML;
	};

	return (
		<div className="max-w-7xl mx-auto p-6 bg-white rounded-xl shadow border border-gray-200 text-sm">
			<h2 className={`text-xl font-bold mb-4 ${maroon}`}>
				Stock Report with Provincial Stores and All Consumer Servises
				Centers
			</h2>

			<div className="flex justify-end mb-4">
				<div className="flex items-center gap-3  px-4 py-2">
					<label className="text-sm font-medium text-gray-700">
						Material Code
					</label>

					<div className="relative">
						<input
							type="text"
							placeholder="e.g. A0105"
							value={matCode}
							onChange={(e) => setMatCode(e.target.value.toUpperCase())}
							className="pl-3 pr-4 py-1.5 w-64 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#7A0000]"
						/>
					</div>
				</div>
			</div>
			<div className="flex flex-wrap items-center gap-3 mb-4">
				<div className="relative">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
					<input
						type="text"
						placeholder="Search Company ID"
						value={searchId}
						onChange={(e) => setSearchId(e.target.value)}
						className="pl-10 pr-4 py-1.5 w-48 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#7A0000]"
					/>
				</div>

				<div className="relative">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
					<input
						type="text"
						placeholder="Search Company Name"
						value={searchName}
						onChange={(e) => setSearchName(e.target.value)}
						className="pl-10 pr-4 py-1.5 w-64 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#7A0000]"
					/>
				</div>

				{(searchId || searchName || matCode) && (
					<button
						onClick={() => {
							setSearchId("");
							setSearchName("");
							setMatCode("");
						}}
						className="flex items-center gap-1.5 px-4 py-1.5 bg-gray-100 hover:bg-gray-200 rounded border text-xs"
					>
						<RotateCcw className="w-3.5 h-3.5" /> Clear
					</button>
				)}
			</div>

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
													className={`px-3 py-1 rounded text-white text-xs font-medium ${maroonGrad} hover:brightness-110`}
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
										p + 1,
									),
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

			{showReport && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/90">
					<div className="relative bg-white w-full max-w-[95vw] rounded-2xl shadow-2xl border border-gray-200 overflow-hidden mt-20 lg:ml-64 mx-auto">
						<div className="p-4 max-h-[85vh] overflow-y-auto">
							<div className="flex justify-end gap-3 mb-4 print:hidden">
								<button
									onClick={handleDownloadCSV}
									className="flex items-center gap-1 px-3 py-1.5 border border-blue-400 text-blue-700 bg-white rounded hover:bg-blue-50 text-xs"
								>
									<Download className="w-4 h-4" /> CSV
								</button>
								<button
									onClick={printPDF}
									className="flex items-center gap-1 px-3 py-1.5 border border-green-400 text-green-700 bg-white rounded hover:bg-green-50 text-xs"
								>
									<Printer className="w-4 h-4" /> PDF
								</button>
								<button
									onClick={closeReport}
									className="flex items-center gap-1 px-3 py-1.5 border border-red-400 text-red-700 bg-white rounded hover:bg-red-50 text-xs"
								>
									<X className="w-4 h-4" /> Close
								</button>
							</div>

							<h2
								className={`text-xl font-bold text-center mb-3 ${maroon}`}
							>
								Stock Report with Provincial Stores and All Consumer
								Servises Centers - As at{" "}
								{new Date().toISOString().split("T")[0]}
							</h2>

							<div className="flex justify-between text-sm mb-4">
								<div>
									<strong>Division : </strong>
									{selectedCompany?.compId} /{" "}
									{selectedCompany?.CompName}
								</div>
								<div className="font-semibold text-gray-700 self-end">
									Currency: LKR
								</div>
							</div>

							{reportLoading ? (
								<div className="text-center py-20">
									<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7A0000] mx-auto"></div>
									<p>Loading...</p>
								</div>
							) : pivotedData.length === 0 ? (
								<div className="text-center py-20 text-gray-500 text-lg">
									No records found.
								</div>
							) : (
								<div className="overflow-x-auto border rounded">
									<table className="w-full text-xs min-w-max">
										<thead className={`${maroonGrad} text-white`}>
											<tr>
												<th className="px-2 py-1.5 w-32">
													{" "}
													{/* ← give fixed-ish width */}
													Material Code
												</th>
												<th className="px-2 py-1.5 w-80">
													{" "}
													{/* ← most space for name */}
													Material Name
												</th>
												<th className="px-2 py-1.5 w-24 text-center">
													Unit Of Measure
												</th>
												{c8Codes.map((c8) => (
													<th
														key={c8}
														className="px-2 py-1.5 text-right w-28" // ← fixed width per region
													>
														{c8}
													</th>
												))}
												<th className="px-2 py-1.5 text-right w-32">
													Total
												</th>
											</tr>
										</thead>
										<tbody>
											{pivotedData.map((row, idx) => (
												<tr
													key={row.MAT_CD || idx}
													className={
														idx % 2 === 0
															? "bg-white"
															: "bg-gray-50"
													}
												>
													<td className="px-2 py-1 border border-gray-300 font-mono">
														{row.MAT_CD || "-"}
													</td>
													<td className="px-2 py-1 border border-gray-300 break-words">
														{row.MAT_NM || "-"}
													</td>
													<td className="px-2 py-1 border border-gray-300 text-center">
														{row.UOM_CD || "-"}
													</td>
													{c8Codes.map((c8) => (
														<td
															key={c8}
															className="px-2 py-1 text-right border border-gray-300"
														>
															{formatNumber(
																row.qtyByC8[c8] || 0,
															)}
														</td>
													))}
													<td className="px-2 py-1 text-right font-medium border border-gray-300">
														{formatNumber(
															c8Codes.reduce(
																(sum, c) =>
																	sum + (row.qtyByC8[c] || 0),
																0,
															),
														)}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							)}
						</div>
					</div>
					<iframe ref={iframeRef} className="hidden" title="print-frame" />
				</div>
			)}
		</div>
	);
};

export default QtyOnHandAllRegion;
