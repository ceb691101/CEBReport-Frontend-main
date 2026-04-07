//01.Branch/Province wise PIV Collections Paid to Bank

// File: ProvincePIV.tsx
import React, {useEffect, useState, useRef} from "react";
import {Search, RotateCcw, Eye, X, Download, Printer} from "lucide-react";
import {useUser} from "../../contexts/UserContext";
import {toast} from "react-toastify";
import DateRangePicker from "../../components/utils/DateRangePicker";

interface Company {
	compId: string;
	CompName: string;
}

interface PIVItem {
	CostCenter: string;
	CCT_NAME: string;
	PivNo: string;
	PivReceiptNo: string;
	PivDate: string | null;
	PaidDate: string | null;
	GrandTotal: number;
	AccountCode: string;
	Amount: number;
	BankCheckNo: string;
	PaymentMode: string;
	COMPANY_NAME?: string; // optional if present
}

/* ────── Helpers ────── */
const csvEscape = (val: string | number | null | undefined): string => {
	if (val == null) return '""';
	const str = String(val);
	if (/[,\n"']/.test(str)) {
		return `"${str.replace(/"/g, '""')}"`;
	}
	return str;
};

const formatNumber = (num: number | null | undefined): string => {
	if (num === null || num === undefined || isNaN(num)) return "0.00";
	return new Intl.NumberFormat("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(num);
};

const formatDate = (dateStr: string | null): string => {
	if (!dateStr) return "-";
	try {
		return new Date(dateStr).toLocaleDateString("en-GB");
	} catch {
		return dateStr || "-";
	}
};

const ProvincePIV: React.FC = () => {
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
	const [fromDate, setFromDate] = useState("");
	const [toDate, setToDate] = useState("");

	const [reportData, setReportData] = useState<PIVItem[]>([]);
	const [reportLoading, setReportLoading] = useState(false);
	const [showReport, setShowReport] = useState(false);

	const maroon = "text-[#7A0000]";
	const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";

	/* ────── NEW: Same grouping method as ProvincePIVAll.tsx ────── */
	const groupPIVData = (data: PIVItem[]) => {
		const map = new Map<
			string,
			{item: PIVItem; accountAmounts: Record<string, number>}
		>();

		data.forEach((row) => {
			const key = row.PivNo;
			if (!map.has(key)) {
				map.set(key, {item: {...row}, accountAmounts: {}});
			}

			const entry = map.get(key)!;
			const first = entry.item;

			// Fill missing common fields from any row
			if (!first.PivDate) first.PivDate = row.PivDate;
			if (!first.PaidDate) first.PaidDate = row.PaidDate;
			if (!first.BankCheckNo) first.BankCheckNo = row.BankCheckNo;
			if (!first.CCT_NAME) first.CCT_NAME = row.CCT_NAME;
			if (!first.PaymentMode) first.PaymentMode = row.PaymentMode;
			if (!first.PivReceiptNo) first.PivReceiptNo = row.PivReceiptNo;

			// Accumulate account amounts
			entry.accountAmounts[row.AccountCode] = row.Amount;
		});

		return Array.from(map.values());
	};

	const groupByCostCenter = () => {
		const groupedPIVs = groupPIVData(reportData);
		const grouped: Record<string, typeof groupedPIVs> = {};

		groupedPIVs.forEach(({item, accountAmounts}) => {
			const cc = item.CostCenter || "Unknown";
			if (!grouped[cc]) grouped[cc] = [];
			grouped[cc].push({item, accountAmounts});
		});

		return grouped;
	};

	const accountCodes = Array.from(
		new Set(reportData.map((i) => i.AccountCode))
	).sort();

	const groupedData = groupByCostCenter();

	// Fetch companies (unchanged)
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
					`/misapi/api/incomeexpenditure/Usercompanies/${epfNo}/60`
				);
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				const txt = await res.text();
				const parsed = JSON.parse(txt);
				const raw = Array.isArray(parsed) ? parsed : parsed.data || [];
				const comps: Company[] = raw.map((c: any) => ({
					compId: c.CompId,
					CompName: c.CompName,
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
					c.CompName.toLowerCase().includes(searchName.toLowerCase()))
		);
		setFiltered(f);
		setPage(1);
	}, [searchId, searchName, companies]);

	const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

	const handleViewReport = async (company: Company) => {
		if (!fromDate || !toDate) return toast.error("Select both dates");
		if (new Date(toDate) < new Date(fromDate))
			return toast.error("Invalid date range");

		setSelectedCompany(company);
		setReportLoading(true);
		setReportData([]);
		setShowReport(true);

		try {
			const url = `/misapi/api/provincepivbank/get?compId=${
				company.compId
			}&fromDate=${fromDate.replace(/-/g, "")}&toDate=${toDate.replace(
				/-/g,
				""
			)}`;
			const res = await fetch(url);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = await res.json();
			const items: PIVItem[] = Array.isArray(data) ? data : data.data || [];
			setReportData(items);
			items.length === 0
				? toast.warn("No records")
				: toast.success("Loaded");
		} catch (err: any) {
			toast.error("Failed: " + err.message);
		} finally {
			setReportLoading(false);
		}
	};

	const closeReport = () => {
		setShowReport(false);
		setReportData([]);
		setSelectedCompany(null);
	};

	// CSV Export - Updated to use new grouping
	const handleDownloadCSV = () => {
		if (reportData.length === 0) return;

		const headers = [
			"Issued Cost Center",
			"PIV Date",
			"Paid Date",
			"Paid Amount",
			"PIV No",
			"Bank Chq No",
			"Payment Mode",
			...accountCodes,
			"Total",
		];

		const rows: string[] = [
			"PIV Collections by Banks",
			`Issued Company: ${selectedCompany?.compId} - ${selectedCompany?.CompName}`,
			"Paid Cost Center: Bank",
			`Period: ${fromDate} to ${toDate}`,
			`Generated: ${new Date().toLocaleString()}`,
			"",
			headers.map(csvEscape).join(","),
		];

		Object.keys(groupedData).forEach((cc) => {
			const ccName =
				reportData.find((i) => i.CostCenter === cc)?.CCT_NAME || cc;
			const pivGroups = groupedData[cc];

			pivGroups.forEach(({item, accountAmounts}) => {
				const pivTotal = accountCodes.reduce(
					(s, acc) => s + (accountAmounts[acc] || 0),
					0
				);
				const row = [
					csvEscape(`${cc} - ${ccName}`),
					csvEscape(formatDate(item.PivDate)),
					csvEscape(formatDate(item.PaidDate)),
					csvEscape(item.Amount),
					csvEscape(item.PivNo),
					csvEscape(`="${item.BankCheckNo ?? ""}"`),
					csvEscape(item.PaymentMode),
					...accountCodes.map((acc) =>
						csvEscape(formatNumber(accountAmounts[acc] || 0))
					),
					csvEscape(formatNumber(pivTotal)),
				];
				rows.push(row.join(","));
			});

			// Cost Center Total
			const ccTotal = pivGroups.reduce((sum, g) => {
				const pivSum = accountCodes.reduce(
					(s, acc) => s + (g.accountAmounts[acc] || 0),
					0
				);
				return sum + pivSum;
			}, 0);

			const ccAccTotals = accountCodes.map((acc) =>
				pivGroups.reduce((s, g) => s + (g.accountAmounts[acc] || 0), 0)
			);

			rows.push(
				[
					csvEscape(`TOTAL: Issued Cost Center: ${cc} - ${ccName}`),
					"",
					"",
					"",
					"",
					"",
					"",

					...ccAccTotals.map((t) => csvEscape(formatNumber(t))),
					csvEscape(formatNumber(ccTotal)),
				].join(",")
			);
			rows.push("");
		});

		// Grand Total
		const grandTotal = Object.values(groupedData)
			.flat()
			.reduce((sum, g) => {
				const pivSum = accountCodes.reduce(
					(s, acc) => s + (g.accountAmounts[acc] || 0),
					0
				);
				return sum + pivSum;
			}, 0);

		const grandAccTotals = accountCodes.map((acc) =>
			Object.values(groupedData)
				.flat()
				.reduce((s, g) => s + (g.accountAmounts[acc] || 0), 0)
		);

		rows.push(
			[
				csvEscape("GRAND TOTAL"),
				"",
				"",
				"",
				"",
				"",
				"",
				...grandAccTotals.map((t) => csvEscape(formatNumber(t))),
				csvEscape(formatNumber(grandTotal)),
			].join(",")
		);

		const blob = new Blob([rows.join("\n")], {
			type: "text/csv;charset=utf-8;",
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `ProvincePIV_Bank_${selectedCompany?.compId}_${fromDate}_to_${toDate}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	};

	// Print PDF - Updated to use new grouping
	const printPDF = () => {
		if (reportData.length === 0 || !iframeRef.current || !selectedCompany)
			return;

		const numAccCols = accountCodes.length;
		const baseFontSize =
			numAccCols > 20
				? "4.2px"
				: numAccCols > 15
				? "4.5px"
				: numAccCols > 10
				? "4.8px"
				: "5.2px";

		let bodyHTML = "";

		Object.keys(groupedData).forEach((cc, groupIndex) => {
			const ccName =
				reportData.find((i) => i.CostCenter === cc)?.CCT_NAME || cc;
			const pivGroups = groupedData[cc];

			pivGroups.forEach(({item, accountAmounts}, idx) => {
				const pivTotal = accountCodes.reduce(
					(s, acc) => s + (accountAmounts[acc] || 0),
					0
				);

				bodyHTML += `<tr class="${
					idx % 2 === 0 ? "bg-white" : "bg-gray-50"
				}">
					${
						idx === 0
							? `<td rowspan="${pivGroups.length}" class="border border-gray-300 p-1 text-2xs bg-gray-100 align-top font-medium" style="word-break: break-word; white-space: normal;">
								${cc}<br/><small style="font-size:4.8px; color:#444;">${ccName}</small>
						   </td>`
							: ""
					}
					<td class="border border-gray-300 p-1 text-2xs text-center">${formatDate(
						item.PivDate
					)}</td>
					
					<td class="border border-gray-300 p-1 text-2xs text-center">${formatDate(
						item.PaidDate
					)}</td>
					<td class="border border-gray-300 p-1 text-right text-2xs font-bold">${formatNumber(
						pivTotal
					)}</td>
					<td class="border border-gray-300 p-1 text-2xs">${item.PivNo}</td>
					<td class="border border-gray-300 p-1 text-2xs">${item.BankCheckNo || "-"}</td>
					<td class="border border-gray-300 p-1 text-2xs">${item.PaymentMode}</td>
					${accountCodes
						.map(
							(acc) =>
								`<td class="border border-gray-300 p-1 text-right text-2xs">${formatNumber(
									accountAmounts[acc] || 0
								)}</td>`
						)
						.join("")}
					<td class="border border-gray-300 p-1 text-right text-2xs font-bold">${formatNumber(
						pivTotal
					)}</td>
				</tr>`;
			});

			// Cost Center Total
			const ccTotal = pivGroups.reduce((sum, g) => {
				const pivSum = accountCodes.reduce(
					(s, acc) => s + (g.accountAmounts[acc] || 0),
					0
				);
				return sum + pivSum;
			}, 0);

			bodyHTML += `<tr class="bg-gray-200 font-bold">
				<td colspan="2" class="border border-gray-300 p-1 text-2xs"></td>
				<td colspan="5" class="border border-gray-300 p-1 text-right text-2xs">Total - ${ccName}</td>
				${accountCodes
					.map((acc) => {
						const sum = pivGroups.reduce(
							(s, g) => s + (g.accountAmounts[acc] || 0),
							0
						);
						return `<td class="border border-gray-300 p-1 text-right text-2xs font-bold">${formatNumber(
							sum
						)}</td>`;
					})
					.join("")}
				<td class="border border-gray-300 p-1 text-right text-2xs font-bold">${formatNumber(
					ccTotal
				)}</td>
			</tr>`;

			if (groupIndex < Object.keys(groupedData).length - 1) {
				bodyHTML += `<tr class="no-border-row">
					<td colspan="${
						7 + accountCodes.length + 1
					}" style="height: 14px; border: none !important; padding: 0; background: transparent;"></td>
				</tr>`;
			}
		});

		// Grand Total
		const grandTotal = Object.values(groupedData)
			.flat()
			.reduce((sum, g) => {
				const pivSum = accountCodes.reduce(
					(s, acc) => s + (g.accountAmounts[acc] || 0),
					0
				);
				return sum + pivSum;
			}, 0);

		bodyHTML += `<tr class="bg-gray-300 font-bold">
			<td colspan="7" class="border border-gray-300 p-2 text-right text-xs">GRAND TOTAL</td>
			${accountCodes
				.map((acc) => {
					const sum = Object.values(groupedData)
						.flat()
						.reduce((s, g) => s + (g.accountAmounts[acc] || 0), 0);
					return `<td class="border border-gray-300 p-2 text-right text-xs font-bold">${formatNumber(
						sum
					)}</td>`;
				})
				.join("")}
			<td class="border border-gray-300 p-2 text-right text-xs font-bold">${formatNumber(
				grandTotal
			)}</td>
		</tr>`;

		const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
	@media print {
		@page { margin: 10mm; size: A3 landscape; }
		body { margin: 0; font-family: Arial, sans-serif; }
  table { page-break-inside: auto; border-collapse: collapse; }
    tr { page-break-inside: avoid; page-break-after: auto; }
  td, th { page-break-inside: avoid; page-break-after: auto; }
  		thead { display: table-header-group !important; }
		tr, th, td{ page-break-inside: avoid;
		page-break-after: auto; }
		tr:first-child { page-break-before: avoid !important; }
	}
	body { font-size: ${baseFontSize}; line-height: 1.3; }
	.title { margin: 8px 0; text-align: center; font-weight: bold; color: #7A0000; font-size: 13px; }
	table { width: 100%; border-collapse: collapse; }
	th, td { border: 1px solid #ccc; padding: 3px 4px; font-size: 5.2px; white-space: nowrap; }
	.no-border-row td { border: none !important; padding: 0 !important; height: 14px !important; }
	@page {
		@bottom-left { content: "Printed on: ${new Date().toLocaleString()}"; font-size: 7px; color: #666; }
		@bottom-right { content: "Page " counter(page) " of " counter(pages); font-size: 7px; color: #666; }
	}
</style>
</head><body>
	<div class="title">PIV Collections by Banks - From ${fromDate} to ${toDate}</div>
	<div style="margin:4px 8px; font-size:8px; display:flex; justify-content:space-between;">
		<div><strong>Issued Company:</strong> ${selectedCompany.compId} - ${
			selectedCompany.CompName
		}
		<br><strong>Paid Cost Center: </strong>Bank</div>
		<div style="text-align:right"><strong>Currency: LKR</strong></div>
	</div>

	<table>
		<thead>
			<tr>
				<th width="11%">Issued Cost Center</th>
				<th width="6%">Piv Date</th>
				<th width="8%"> Paid Date </th>
				<th width="8%"> Paid Amount </th>
				<th width="8%">PIV No</th>
				<th width="7%">Bank Chq No</th>
				<th width="5%">Payment Mode</th>
				${accountCodes.map((acc) => `<th width="4.8%">${acc}</th>`).join("")}
				<th width="9%">Total</th>
			</tr>
		</thead>
		<tbody>${bodyHTML}</tbody>
	</table>
</body></html>`;

		const doc = iframeRef.current!.contentDocument!;
		doc.open();
		doc.write(html);
		doc.close();

		setTimeout(() => iframeRef.current?.contentWindow?.print(), 800);
	};

	// Render (updated table to use groupedData)
	return (
		<div className="max-w-7xl mx-auto p-6 bg-white rounded-xl shadow border border-gray-200 text-sm font-sans">
			<h2 className={`text-xl font-bold mb-4 ${maroon}`}>
				PIV Collections by Banks
			</h2>

			{/* Date Pickers */}
			<DateRangePicker
				fromDate={fromDate}
				toDate={toDate}
				onFromChange={setFromDate}
				onToChange={setToDate}
			/>

			{/* Search */}
			<div className="flex flex-wrap items-center gap-3 mb-4">
				<div className="relative">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
					<input
						type="text"
						value={searchId}
						placeholder="Search by ID"
						onChange={(e) => setSearchId(e.target.value)}
						className="pl-10 pr-4 py-1.5 w-48 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#7A0000] transition text-sm"
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
					/>
				</div>
				{(searchId || searchName) && (
					<button
						onClick={() => {
							setSearchId("");
							setSearchName("");
						}}
						className="flex items-center gap-1.5 px-4 py-1.5 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md text-xs font-medium transition"
					>
						<RotateCcw className="w-3.5 h-3.5" /> Clear
					</button>
				)}
			</div>

			{/* Loading / Companies (unchanged) */}
			{loading && (
				<div className="text-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7A0000] mx-auto"></div>
					<p className="mt-2 text-gray-600 text-sm">
						Loading companies...
					</p>
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

			{/* Report Modal */}
			{showReport && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/90 print:static print:inset-auto print:p-0 print:bg-white">
					<div className="relative bg-white w-full max-w-[95vw] rounded-2xl shadow-2xl border border-gray-200 overflow-hidden mt-20 lg:ml-64 mx-auto print:w-full print:max-w-none print:rounded-none print:shadow-none print:border-none">
						<div className="p-4 max-h-[85vh] overflow-y-auto print:p-0 print:max-h-none print:overflow-visible">
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
								className={`text-xl font-bold text-center mb-2 ${maroon}`}
							>
								PIV Collections by Banks
							</h2>
							<div className="flex justify-between text-sm mb-3">
								<div>
									<p>
										<strong>Issued Company:</strong>{" "}
										{selectedCompany?.compId} -{" "}
										{selectedCompany?.CompName}
									</p>
									<p>
										<strong>Paid Cost Center: </strong> Bank
									</p>
									<p>
										<strong>Period:</strong> {fromDate} to {toDate}
									</p>
								</div>
								<div className="font-semibold text-gray-600 self-end">
									Currency: LKR
								</div>
							</div>

							{reportLoading ? (
								<div className="text-center py-20">
									<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7A0000] mx-auto"></div>
									<p className="mt-2 text-gray-600">
										Loading report data...
									</p>
								</div>
							) : reportData.length === 0 ? (
								<div className="text-center py-20 text-gray-500 text-lg">
									No records found.
								</div>
							) : (
								<div className="overflow-x-auto border rounded-lg">
									<table className="w-full text-xs min-w-max table-auto">
										<thead className={`${maroonGrad} text-white`}>
											<tr>
												<th className="px-2 py-1.5">
													Issued Cost Center
												</th>
												<th className="px-2 py-1.5">Piv Date</th>
												<th className="px-2 py-1.5">Paid Date</th>
												<th className="px-2 py-1.5 text-right font-bold">
													Paid Amount
												</th>
												<th className="px-2 py-1.5">PIV No</th>
												<th className="px-2 py-1.5">
													Bank Cheque No
												</th>
												<th className="px-2 py-1.5">
													Payment Mode
												</th>
												{accountCodes.map((acc) => (
													<th
														key={acc}
														className="px-2 py-1.5 text-right font-mono"
													>
														{acc}
													</th>
												))}
												<th className="px-2 py-1.5 text-right font-bold">
													Total
												</th>
											</tr>
										</thead>
										<tbody>
											{Object.keys(groupedData).map((cc) => {
												const ccName =
													reportData.find(
														(i) => i.CostCenter === cc
													)?.CCT_NAME || cc;
												const pivGroups = groupedData[cc];

												return (
													<React.Fragment key={cc}>
														{pivGroups.map(
															({item, accountAmounts}, idx) => {
																const pivTotal =
																	accountCodes.reduce(
																		(s, acc) =>
																			s +
																			(accountAmounts[acc] ||
																				0),
																		0
																	);

																return (
																	<tr
																		key={item.PivNo}
																		className={
																			idx % 2 === 0
																				? "bg-white"
																				: "bg-gray-50"
																		}
																	>
																		{idx === 0 && (
																			<td
																				rowSpan={
																					pivGroups.length
																				}
																				className="px-2 py-1 border border-gray-200 font-medium bg-gray-100 text-left align-top break-words"
																			>
																				{cc} - {ccName}
																			</td>
																		)}
																		<td className="px-2 py-1 border border-gray-200">
																			{formatDate(
																				item.PivDate
																			)}
																		</td>

																		<td className="px-2 py-1 border border-gray-200 text-center">
																			{formatDate(
																				item.PaidDate
																			)}
																		</td>
																		<td className="px-2 py-1 border border-gray-200 text-right font-mono font-bold">
																			{formatNumber(
																				pivTotal
																			)}
																		</td>
																		<td className="px-2 py-1 border border-gray-200">
																			{item.PivNo}
																		</td>
																		<td className="px-2 py-1 border border-gray-200">
																			{item.BankCheckNo ||
																				"-"}
																		</td>
																		<td className="px-2 py-1 border border-gray-200">
																			{item.PaymentMode}
																		</td>

																		{accountCodes.map(
																			(acc) => (
																				<td
																					key={acc}
																					className="px-2 py-1 border border-gray-200 text-right font-mono"
																				>
																					{formatNumber(
																						accountAmounts[
																							acc
																						] || 0
																					)}
																				</td>
																			)
																		)}
																		<td className="px-2 py-1 border border-gray-200 text-right font-mono font-bold">
																			{formatNumber(
																				pivTotal
																			)}
																		</td>
																	</tr>
																);
															}
														)}

														{/* Cost Center Total */}
														<tr className="bg-gray-200 font-bold">
															<td
																colSpan={7}
																className="px-2 py-1 border border-gray-200 text-right"
															>
																Total - {ccName}
															</td>
															{accountCodes.map((acc) => {
																const sum = pivGroups.reduce(
																	(s, g) =>
																		s +
																		(g.accountAmounts[acc] ||
																			0),
																	0
																);
																return (
																	<td
																		key={acc}
																		className="px-2 py-1 border border-gray-200 text-right font-mono"
																	>
																		{formatNumber(sum)}
																	</td>
																);
															})}
															<td className="px-2 py-1 border border-gray-200 text-right font-mono">
																{formatNumber(
																	pivGroups.reduce(
																		(sum, g) => {
																			const pivSum =
																				accountCodes.reduce(
																					(s, acc) =>
																						s +
																						(g
																							.accountAmounts[
																							acc
																						] || 0),
																					0
																				);
																			return sum + pivSum;
																		},
																		0
																	)
																)}
															</td>
														</tr>
														<tr>
															<td
																colSpan={
																	7 + accountCodes.length + 1
																}
																className="h-4"
															></td>
														</tr>
													</React.Fragment>
												);
											})}

											{/* Grand Total */}
											<tr className="bg-gray-300 font-bold">
												<td
													colSpan={7}
													className="px-2 py-2 border border-gray-200 text-right text-sm"
												>
													GRAND TOTAL
												</td>
												{accountCodes.map((acc) => (
													<td
														key={acc}
														className="px-2 py-2 border border-gray-200 text-right font-mono font-bold"
													>
														{formatNumber(
															Object.values(groupedData)
																.flat()
																.reduce(
																	(s, g) =>
																		s +
																		(g.accountAmounts[acc] ||
																			0),
																	0
																)
														)}
													</td>
												))}
												<td className="px-2 py-2 border border-gray-200 text-right font-mono font-bold text-base">
													{formatNumber(
														Object.values(groupedData)
															.flat()
															.reduce((sum, g) => {
																const pivSum =
																	accountCodes.reduce(
																		(s, acc) =>
																			s +
																			(g.accountAmounts[
																				acc
																			] || 0),
																		0
																	);
																return sum + pivSum;
															}, 0)
													)}
												</td>
											</tr>
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

export default ProvincePIV;
