//03. Branch/Province wise PIV Collections Paid to Provincial POS

// File: ProvincePIVAll.tsx
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
	Paid_Dept_Id: string;
	Dept_Id: string;
	Piv_No: string;
	Piv_Receipt_No: string;
	Piv_Date: string | null;
	Paid_Date: string | null;
	Payment_Mode: string;
	Cheque_No: string;
	Grand_Total: number;
	Account_Code: string;
	Amount: number;
	Bank_Check_No: string;
	CCT_NAME: string;
	CCT_NAME1: string;
}

/* ────── Helpers ────── */
const csvEscape = (val: string | number | null | undefined): string => {
	if (val == null) return '""';
	const str = String(val);
	if (/[,\n"']/.test(str)) return `"${str.replace(/"/g, '""')}"`;
	return str;
};

const formatNumber = (num: number | null | undefined): string => {
	if (num === null || num === undefined || isNaN(num)) return "0.00";
	const absValue = Math.abs(num);
	const formatted = new Intl.NumberFormat("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(absValue);

	return num < 0 ? `(${formatted})` : formatted;
};

const formatDate = (dateStr: string | null): string => {
	if (!dateStr) return "-";
	try {
		return new Date(dateStr).toLocaleDateString("en-GB");
	} catch {
		return dateStr || "-";
	}
};



const ProvincePIVAll: React.FC = () => {
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

	// Group raw data by Piv_No
	const groupPIVData = (data: PIVItem[]) => {
		const map = new Map<
			string,
			{item: PIVItem; accountAmounts: Record<string, number>}
		>();

		data.forEach((row) => {
			const key = row.Piv_No;
			if (!map.has(key)) {
				map.set(key, {item: {...row}, accountAmounts: {}});
			}

			const entry = map.get(key)!;
			const first = entry.item;
			if (!first.Piv_Date) first.Piv_Date = row.Piv_Date;
			if (!first.Paid_Date) first.Paid_Date = row.Paid_Date;
			if (!first.Bank_Check_No) first.Bank_Check_No = row.Bank_Check_No;
			if (!first.Paid_Dept_Id) first.Paid_Dept_Id = row.Paid_Dept_Id;
			if (!first.Dept_Id) first.Dept_Id = row.Dept_Id;
			if (!first.CCT_NAME) first.CCT_NAME = row.CCT_NAME;
			if (!first.Payment_Mode) first.Payment_Mode = row.Payment_Mode;

			entry.accountAmounts[row.Account_Code] = row.Amount;
		});

		return Array.from(map.values());
	};

	const groupByPaidDeptAndDept = () => {
		const groupedPIVs = groupPIVData(reportData);
		const grouped: Record<string, Record<string, typeof groupedPIVs>> = {};

		groupedPIVs.forEach(({item, accountAmounts}) => {
			const paidDept = item.Paid_Dept_Id || "Unknown";
			const dept = item.Dept_Id || "N/A";
			if (!grouped[paidDept]) grouped[paidDept] = {};
			if (!grouped[paidDept][dept]) grouped[paidDept][dept] = [];
			grouped[paidDept][dept].push({item, accountAmounts});
		});

		return grouped;
	};

	const accountCodes = Array.from(
		new Set(reportData.map((i) => i.Account_Code))
	).sort();
	const groupedData = groupByPaidDeptAndDept();

	// Fetch companies
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
			const url = `/misapi/api/provincepivall/get?compId=${company.compId.trim()}&fromDate=${fromDate.replace(
				/-/g,
				""
			)}&toDate=${toDate.replace(/-/g, "")}`;
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

	// CSV Export
	const handleDownloadCSV = () => {
		if (reportData.length === 0) return;

		const headers = [
			"Paid Cost Center",
			"Issued Dept ID",
			"PIV Date",
			"Paid Date",
			"PIV Total ",
			"PIV No",
			"Bank Check Number",
			...accountCodes,
			"Total",
		];

		const rows: string[] = [
			"PIV Collections by Provincial POS relevant to the Province ",
			`Both Issued and Paid  Branch: ${selectedCompany?.compId} - ${selectedCompany?.CompName}`,
			`Period: ${fromDate} to ${toDate}`,
			`Generated: ${new Date().toLocaleString()}`,
			"",
			headers.map(csvEscape).join(","),
		];

		Object.keys(groupedData).forEach((paidDept) => {
			const paidDeptName =
				reportData.find((i) => i.Paid_Dept_Id === paidDept)?.CCT_NAME ||
				paidDept;
			const deptGroups = groupedData[paidDept];

			Object.keys(deptGroups).forEach((deptId) => {
				const pivGroups = deptGroups[deptId];

				pivGroups.forEach(({item, accountAmounts}) => {
					const pivTotal = accountCodes.reduce(
						(s, acc) => s + (accountAmounts[acc] || 0),
						0
					);
					const row = [
						csvEscape(`${item.Paid_Dept_Id} - ${item.CCT_NAME}`),
						csvEscape(`="${deptId}"`),
						csvEscape(formatDate(item.Piv_Date)),
						csvEscape(formatDate(item.Paid_Date)),
						csvEscape(formatNumber(item.Grand_Total)),
						csvEscape(item.Piv_No),
						csvEscape(`="${item.Bank_Check_No ?? ""}"`),
						...accountCodes.map((acc) =>
							csvEscape(formatNumber(accountAmounts[acc] || 0))
						),
						csvEscape(formatNumber(pivTotal)),
					];
					rows.push(row.join(","));
				});

				const deptTotal = pivGroups.reduce((sum, g) => {
					const pivSum = accountCodes.reduce(
						(s, acc) => s + (g.accountAmounts[acc] || 0),
						0
					);
					return sum + pivSum;
				}, 0);

				const deptAccTotals = accountCodes.map((acc) =>
					pivGroups.reduce((s, g) => s + (g.accountAmounts[acc] || 0), 0)
				);

				rows.push(
					[
						"",
						"",
						"",
						"",
						"",
						"",
						csvEscape(`TOTAL - Issued Dept ID: ${deptId}`),

						...deptAccTotals.map((t) => csvEscape(formatNumber(t))),
						csvEscape(formatNumber(deptTotal)),
					].join(",")
				);
				rows.push("");
			});

			const paidDeptTotal = Object.values(deptGroups)
				.flat()
				.reduce((sum, g) => {
					const pivSum = accountCodes.reduce(
						(s, acc) => s + (g.accountAmounts[acc] || 0),
						0
					);
					return sum + pivSum;
				}, 0);

			const paidDeptAccTotals = accountCodes.map((acc) =>
				Object.values(deptGroups)
					.flat()
					.reduce((s, g) => s + (g.accountAmounts[acc] || 0), 0)
			);

			rows.push(
				[
					csvEscape(`TOTAL - ${paidDeptName}`),
					"",
					"",
					"",
					"",
					"",
					"",

					...paidDeptAccTotals.map((t) => csvEscape(formatNumber(t))),
					csvEscape(formatNumber(paidDeptTotal)),
				].join(",")
			);
			rows.push("");
		});

		const grandTotal = Object.values(groupedData)
			.flatMap(Object.values)
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
				.flatMap(Object.values)
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
		a.download = `ProvincePIV_All_${selectedCompany?.compId}_${fromDate}_to_${toDate}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	};

	// Print PDF
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

		// Updated header with Payment Mode column (if needed, otherwise same)
		const headerHTML = `
			<thead style="display: table-header-group;">
				<tr class="font-bold">
					<th class="px-2 py-1.5">Paid Cost Center</th>
					<th class="px-2 py-1.5">Issued Dept ID</th>
					<th class="px-2 py-1.5">PIV Date</th>
					<th class="px-2 py-1.5">Paid Date</th>
					<th class="px-2 py-1.5 text-right font-bold">PIV Total </th>
					<th class="px-2 py-1.5">PIV No</th>
					<th class="px-2 py-1.5">Bank Check No</th>
					
					${accountCodes
						.map(
							(acc) =>
								`<th class="px-2 py-1.5 text-right font-mono">${acc}</th>`
						)
						.join("")}
					<th class="px-2 py-1.5 text-right font-bold">Total</th>
				</tr>
			</thead>
		`;

		let bodyHTML = "";

		Object.keys(groupedData).forEach((paidDept) => {
			const paidDeptName =
				reportData.find((i) => i.Paid_Dept_Id === paidDept)?.CCT_NAME ||
				paidDept;
			const deptGroups = groupedData[paidDept];
			const allDeptIds = Object.keys(deptGroups);
			const totalPivCount = Object.values(deptGroups).reduce(
				(s: any, arr: any) => s + arr.length,
				0
			);

			let rowCounter = 0;

			allDeptIds.forEach((deptId) => {
				const pivGroups = deptGroups[deptId];

				pivGroups.forEach(({item, accountAmounts}, idx) => {
					const isFirstInDept = idx === 0;
					const isFirstInPaidDept = rowCounter === 0;
					rowCounter++;

					const pivTotal = accountCodes.reduce(
						(s, acc) => s + (accountAmounts[acc] || 0),
						0
					);

					bodyHTML += `<tr class="${
						rowCounter % 2 === 0 ? "bg-white" : "bg-gray-50"
					}">
						${
							isFirstInPaidDept
								? `
						<td rowspan="${totalPivCount + allDeptIds.length + 1}" 
						    class="px-2 py-1 border border-gray-200 font-medium bg-gray-100 align-top">
							${paidDept} - ${paidDeptName}
						</td>`
								: ""
						}
						${
							isFirstInDept
								? `
						<td rowspan="${pivGroups.length + 1}" 
						    class="px-2 py-1 border border-gray-200 font-semibold bg-blue-50 text-blue-800">
							${deptId}
						</td>`
								: ""
						}
						<td class="px-2 py-1 border border-gray-200">${formatDate(item.Piv_Date)}</td>
						<td class="px-2 py-1 border border-gray-200">${formatDate(item.Paid_Date)}</td>
						<td class="px-2 py-1 border border-gray-200 text-right font-mono font-bold">${formatNumber(
							item.Grand_Total
						)}</td>
						<td class="px-2 py-1 border border-gray-200">${item.Piv_No}</td>
						<td class="px-2 py-1 border border-gray-200">${item.Bank_Check_No || "-"}</td>
						
						${accountCodes
							.map(
								(acc) =>
									`<td class="px-2 py-1 border border-gray-200 text-right font-mono">
								${formatNumber(accountAmounts[acc] || 0)}
							</td>`
							)
							.join("")}
						<td class="px-2 py-1 border border-gray-200 text-right font-mono font-bold">${formatNumber(
							pivTotal
						)}</td>
					</tr>`;
				});

				// Dept Total
				const deptTotal = pivGroups.reduce(
					(s, g) =>
						s +
						accountCodes.reduce(
							(t, acc) => t + (g.accountAmounts[acc] || 0),
							0
						),
					0
				);
				bodyHTML += `<tr class="bg-indigo-100">
					<td colspan="4" class="px-2 py-1 border border-gray-200 text-center font-bold text-indigo-900">
						Total - Issued Dept ID: ${deptId}
					</td>
					<td class="px-2 py-1 border border-gray-200 text-right font-mono"></td>
					${accountCodes
						.map((acc) => {
							const sum = pivGroups.reduce(
								(s, g) => s + (g.accountAmounts[acc] || 0),
								0
							);
							return `<td class="px-2 py-1 border border-gray-200 text-right font-mono font-bold">${formatNumber(
								sum
							)}</td>`;
						})
						.join("")}
					<td class="px-2 py-1 border border-gray-200 text-right font-mono font-bold">${formatNumber(
						deptTotal
					)}</td>
				</tr>`;
			});

			// Paid Dept Total
			const paidDeptTotal = Object.values(deptGroups)
				.flat()
				.reduce(
					(s, g) =>
						s +
						accountCodes.reduce(
							(t, acc) => t + (g.accountAmounts[acc] || 0),
							0
						),
					0
				);
			bodyHTML += `<tr class="bg-gray-200">
				<td colspan="5" class="px-2 py-1 border border-gray-200 text-left font-bold" >
					Total - ${paidDeptName}
				</td>
				<td class="px-2 py-1 border border-gray-200 text-right font-mono"></td>
				${accountCodes
					.map((acc) => {
						const sum = Object.values(deptGroups)
							.flat()
							.reduce((s, g) => s + (g.accountAmounts[acc] || 0), 0);
						return `<td class="px-2 py-1 border border-gray-200 text-right font-mono font-bold">${formatNumber(
							sum
						)}</td>`;
					})
					.join("")}
				<td class="px-2 py-1 border border-gray-200 text-right font-mono font-bold">${formatNumber(
					paidDeptTotal
				)}</td>
			</tr>`;

			// Small gap
			bodyHTML += `<tr><td colspan="${
				10 + accountCodes.length
			}" class="h-4"></td></tr>`;
		});

		// Grand Total
		const grandTotal = Object.values(groupedData)
			.flatMap(Object.values)
			.flat()
			.reduce(
				(s, g) =>
					s +
					accountCodes.reduce(
						(t, acc) => t + (g.accountAmounts[acc] || 0),
						0
					),
				0
			);

		const grandTotalRow = `
			<tr class="bg-gray-200">
				<td colspan="7" class="px-2 py-2 border border-gray-200 text-right font-bold">
					GRAND TOTAL
				</td>
				
				${accountCodes
					.map((acc) => {
						const sum = Object.values(groupedData)
							.flatMap(Object.values)
							.flat()
							.reduce((s, g) => s + (g.accountAmounts[acc] || 0), 0);
						return `<td class="px-2 py-2 border border-gray-200 text-right font-mono font-bold">${formatNumber(
							sum
						)}</td>`;
					})
					.join("")}
				<td class="px-2 py-2 border border-gray-200 text-right font-mono font-bold text-lg">
					${formatNumber(grandTotal)}
				</td>
			</tr>
		`;

		const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
	@media print {
		@page { margin: 10mm; size: A3 landscape; }
		body { margin: 0; font-family: Arial, sans-serif; print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important; }
		thead { display: table-header-group !important; }
		tr { page-break-inside: avoid; }
		table { print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important; }
		th, td { print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important;}
	}
	body { font-size: ${baseFontSize}; line-height: 1.3; print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important; }
	.title { margin: 8px 0; text-align: center; font-weight: bold; color: #7A0000; font-size: 13px; }
	table { width: 100%; border-collapse: collapse; print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important; }
	th, td { 
		border: 1px solid #ccc; 
		padding: 3px 4px; 
		white-space: nowrap; 
		print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important;
	}
	
	/* Header gradient */
	.${maroonGrad} { 
		background: linear-gradient(to right, #7A0000, #A52A2A) !important; 
	}
	th {
		color: black !important;
		font-weight: bold;
	}
	
	/* Row background classes - now properly defined */
	.bg-white { background-color: #ffffff !important; }
	.bg-gray-50 { background-color: #f9fafb !important; }
	.bg-gray-100 { background-color: #f3f4f6 !important; }
	.bg-gray-200 { background-color: #e5e7eb !important; }
	.bg-blue-50 { background-color: #eff6ff !important; }
	.bg-indigo-100 { background-color: #e0e7ff !important; }
	.bg-maroon { background-color: #991b1b !important; }
	
	.text-indigo-900 { color: #1e3a8a !important; }
	
	@page {
		@bottom-left { content: "Printed on: ${new Date().toLocaleString()}"; font-size: 7px; color: #666; }
		@bottom-right { content: "Page " counter(page) " of " counter(pages); font-size: 7px; color: #666; }
	}
</style>
</head><body>
	<div class="title">PIV Collections by Provincial POS relevant to the Province </div>
	<div style="margin:4px 8px; font-size:8px; display:flex; justify-content:space-between;">
		<div><strong>Both Issued and Paid  Branch:</strong> ${
			selectedCompany.compId
		} - ${
			selectedCompany.CompName
		}<br><strong>Period:</strong> ${fromDate} to ${toDate}</div>
		<div style="text-align:right"><strong>Currency: LKR</strong></div>
	</div>

	<table>
		${headerHTML}
		<tbody>${bodyHTML}
		${grandTotalRow}</tbody>
	</table>
</body></html>`;

		const doc = iframeRef.current!.contentDocument!;
		doc.open();
		doc.write(html);
		doc.close();

		setTimeout(() => iframeRef.current?.contentWindow?.print(), 1000);
	};
	return (
		<div className="max-w-7xl mx-auto p-6 bg-white rounded-xl shadow border border-gray-200 text-sm font-sans">
			<h2 className={`text-xl font-bold mb-4 ${maroon}`}>
				PIV Collections by Provincial POS relevant to the Province
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

			{/* Loading / Companies */}
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
						{/* Fixed Header Table - exactly your original header */}
						<table className="w-full text-left">
							<thead className={`${maroonGrad} text-white`}>
								<tr>
									<th className="px-4 py-2">Company Code</th>
									<th className="px-4 py-2">Company Name</th>
									<th className="px-4 py-2 text-center">Action</th>
								</tr>
							</thead>
						</table>

						{/* Scrollable Body - your original rows and styling preserved */}
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

					{/* Pagination controls - unchanged */}
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
								className={`text-xl font-bold text-center mb-4 ${maroon}`}
							>
								PIV Collections by Provincial POS relevant to the
								Province
							</h2>
							<div className="flex justify-between text-sm mb-3">
								<div>
									<p>
										<strong>Both Issued and Paid Branch:</strong>{" "}
										{selectedCompany?.compId} -{" "}
										{selectedCompany?.CompName}
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
													Paid Cost Center
												</th>
												<th className="px-2 py-1.5">
													Issued Dept ID
												</th>
												<th className="px-2 py-1.5">PIV Date</th>
												<th className="px-2 py-1.5">Paid Date</th>
												<th className="px-2 py-1.5 text-right font-bold">
													PIV Total
												</th>
												<th className="px-2 py-1.5">PIV No</th>
												<th className="px-2 py-1.5">
													Bank Check No
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
											{Object.keys(groupedData).map((paidDept) => {
												const paidDeptName =
													reportData.find(
														(i) => i.Paid_Dept_Id === paidDept
													)?.CCT_NAME || paidDept;
												const deptGroups = groupedData[paidDept];
												const allDeptIds = Object.keys(deptGroups);
												const totalPivCount = Object.values(
													deptGroups
												).reduce(
													(s: any, arr: any) => s + arr.length,
													0
												);

												let rowCounter = 0;

												return (
													<React.Fragment key={paidDept}>
														{allDeptIds.map((deptId) => {
															const pivGroups =
																deptGroups[deptId];

															return (
																<React.Fragment key={deptId}>
																	{pivGroups.map(
																		(
																			{item, accountAmounts},
																			idx
																		) => {
																			const isFirstInDept =
																				idx === 0;
																			const isFirstInPaidDept =
																				rowCounter === 0;
																			rowCounter++;

																			const pivTotal =
																				accountCodes.reduce(
																					(s, acc) =>
																						s +
																						(accountAmounts[
																							acc
																						] || 0),
																					0
																				);

																			return (
																				<tr
																					key={item.Piv_No}
																					className={
																						rowCounter %
																							2 ===
																						0
																							? "bg-white"
																							: "bg-gray-50"
																					}
																				>
																					{isFirstInPaidDept && (
																						<td
																							rowSpan={
																								totalPivCount +
																								allDeptIds.length +
																								1
																							}
																							className="px-2 py-1 border border-gray-200 font-medium bg-gray-100 align-top"
																						>
																							{paidDept}{" "}
																							-{" "}
																							{
																								paidDeptName
																							}
																						</td>
																					)}
																					{isFirstInDept && (
																						<td
																							rowSpan={
																								pivGroups.length +
																								1
																							}
																							className="px-2 py-1 border border-gray-200 font-semibold bg-blue-50 text-blue-800"
																						>
																							{deptId}
																						</td>
																					)}
																					<td className="px-2 py-1 border border-gray-200">
																						{formatDate(
																							item.Piv_Date
																						)}
																					</td>
																					<td className="px-2 py-1 border border-gray-200">
																						{formatDate(
																							item.Paid_Date
																						)}
																					</td>
																					<td className="px-2 py-1 border border-gray-200 text-right font-mono font-bold">
																						{formatNumber(
																							item.Grand_Total
																						)}
																					</td>

																					<td className="px-2 py-1 border border-gray-200">
																						{item.Piv_No}
																					</td>

																					<td className="px-2 py-1 border border-gray-200">
																						{item.Bank_Check_No ||
																							"-"}
																					</td>

																					{accountCodes.map(
																						(acc) => (
																							<td
																								key={
																									acc
																								}
																								className="px-2 py-1 border border-gray-200 text-right font-mono"
																							>
																								{formatNumber(
																									accountAmounts[
																										acc
																									] ||
																										0
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

																	<tr className="bg-blue-100 font-bold text-blue-900">
																		<td
																			colSpan={5}
																			className="px-2 py-1 border border-gray-200 text-center"
																		>
																			Total - Issued Dept ID:{" "}
																			{deptId}
																		</td>

																		{accountCodes.map(
																			(acc) => {
																				const sum =
																					pivGroups.reduce(
																						(s, g) =>
																							s +
																							(g
																								.accountAmounts[
																								acc
																							] || 0),
																						0
																					);
																				return (
																					<td
																						key={acc}
																						className="px-2 py-1 border border-gray-200 text-right font-mono"
																					>
																						{formatNumber(
																							sum
																						)}
																					</td>
																				);
																			}
																		)}
																		<td className="px-2 py-1 border border-gray-200 text-right font-mono font-bold">
																			{formatNumber(
																				pivGroups.reduce(
																					(sum, g) => {
																						const pivSum =
																							accountCodes.reduce(
																								(
																									s,
																									acc
																								) =>
																									s +
																									(g
																										.accountAmounts[
																										acc
																									] ||
																										0),
																								0
																							);
																						return (
																							sum +
																							pivSum
																						);
																					},
																					0
																				)
																			)}
																		</td>
																	</tr>
																</React.Fragment>
															);
														})}

														<tr className="bg-gray-200 font-bold">
															<td
																colSpan={6}
																className="px-2 py-1 border border-gray-200 text-left"
															>
																Total - {paidDeptName}
															</td>

															{accountCodes.map((acc) => {
																const sum = Object.values(
																	deptGroups
																)
																	.flat()
																	.reduce(
																		(s, g) =>
																			s +
																			(g.accountAmounts[
																				acc
																			] || 0),
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
															<td className="px-2 py-1 border border-gray-200 text-right font-mono font-bold">
																{formatNumber(
																	Object.values(deptGroups)
																		.flat()
																		.reduce((sum, g) => {
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
																		}, 0)
																)}
															</td>
														</tr>
														<tr>
															<td
																colSpan={
																	10 + accountCodes.length
																}
																className="h-4"
															></td>
														</tr>
													</React.Fragment>
												);
											})}

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
																.flatMap(Object.values)
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
															.flatMap(Object.values)
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

export default ProvincePIVAll;
