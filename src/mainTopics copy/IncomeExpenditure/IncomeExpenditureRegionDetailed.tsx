// File: IncomeExpenditureRegionDetailed.tsx
import React, {useState, useRef, useMemo} from "react";
import {X, Download, Printer} from "lucide-react";
import {useUser} from "../../contexts/UserContext";
import {toast} from "react-toastify";
import YearMonthDropdowns from "../../components/utils/YearMonthDropdowns";
import ReusableCompanyList from "../../components/utils/ReusableCompanyList";

interface ReportItem {
	Title_cd: string;
	Account: string;
	Actual: number;
	Catname: string;
	Maxrev: string;
	Catcode: string;
	Catflag: string;
	Comp_nm: string;
	Costctr: string;
}

interface Company {
	compId: string;
	CompName: string;
}

const formatNumber = (num: number | null | undefined): string => {
	if (num == null || isNaN(num)) return "0.00";
	const absNum = Math.abs(num);
	const formatted = new Intl.NumberFormat("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(absNum);
	return num < 0 ? `(${formatted})` : formatted;
};

const getMonthName = (month: number): string => {
	const date = new Date(2025, month - 1); // month is 1-12, Date() expects 0-11
	return date.toLocaleString("en-US", {month: "long"});
};

const csvEscape = (val: string | number | null | undefined): string => {
	if (val == null) return '""';
	const str = String(val);
	if (/[,\n"']/.test(str)) return `"${str.replace(/"/g, '""')}"`;
	return str;
};

const asText = (value: string | number) => `="${value}"`;

const escapeHtml = (text: string): string => {
	const div = document.createElement("div");
	div.textContent = text;
	return div.innerHTML;
};

const IncomeExpenditureRegionDetailed: React.FC = () => {
	const {user} = useUser();
	const epfNo = user?.Userno || "";
	const iframeRef = useRef<HTMLIFrameElement>(null);

	const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
	const [selectedYear, setSelectedYear] = useState<number | null>(null);
	const [selectedMonth, setSelectedMonth] = useState<number | null>(null); // defaults to current month
	const [reportData, setReportData] = useState<ReportItem[]>([]);
	const [reportLoading, setReportLoading] = useState(false);
	const [showReport, setShowReport] = useState(false);

	const maroon = "text-[#7A0000]";
	const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";

	// Group data
	const groupedData = useMemo(() => {
		const map = new Map<string, any>();
		reportData.forEach((item) => {
			const key = `${item.Catflag}|${item.Title_cd}|${item.Catcode}|${item.Account}`;
			if (!map.has(key)) {
				map.set(key, {
					catflag: item.Catflag,
					title_cd: item.Title_cd,
					catcode: item.Catcode,
					account: item.Account,
					catname: item.Catname,
					costCenterValues: {},
					total: 0,
				});
			}
			const group = map.get(key)!;
			group.costCenterValues[item.Costctr] =
				(group.costCenterValues[item.Costctr] || 0) + item.Actual;
			group.total += item.Actual;
		});

		return Array.from(map.values()).sort((a, b) => {
			if (a.catflag !== b.catflag) return a.catflag.localeCompare(b.catflag);
			if (a.title_cd !== b.title_cd)
				return a.title_cd.localeCompare(b.title_cd);
			if (a.catcode !== b.catcode) return a.catcode.localeCompare(b.catcode);
			return a.account.localeCompare(b.account);
		});
	}, [reportData]);

	const costCenters = useMemo(() => {
		const set = new Set<string>();
		reportData.forEach((item) => set.add(item.Costctr));
		return Array.from(set).sort();
	}, [reportData]);

	const incomeGroups = useMemo(
		() => groupedData.filter((g) => g.catflag === "I"),
		[groupedData]
	);
	const expenditureGroups = useMemo(
		() => groupedData.filter((g) => g.catflag === "X"),
		[groupedData]
	);

	const incomeTotal = useMemo(
		() => incomeGroups.reduce((sum, g) => sum + g.total, 0),
		[incomeGroups]
	);
	const expenditureTotal = useMemo(
		() => expenditureGroups.reduce((sum, g) => sum + g.total, 0),
		[expenditureGroups]
	);
	const surplusDeficit = incomeTotal + expenditureTotal;

	// Calculate totals per cost center for Income
	const incomeCostCenterTotals = useMemo(
		() =>
			costCenters.reduce((acc, cc) => {
				acc[cc] = incomeGroups.reduce(
					(sum, group) => sum + (group.costCenterValues[cc] || 0),
					0
				);
				return acc;
			}, {} as Record<string, number>),
		[costCenters, incomeGroups]
	);

	// Calculate totals per cost center for Expenditure
	const expenditureCostCenterTotals = useMemo(
		() =>
			costCenters.reduce((acc, cc) => {
				acc[cc] = expenditureGroups.reduce(
					(sum, group) => sum + (group.costCenterValues[cc] || 0),
					0
				);
				return acc;
			}, {} as Record<string, number>),
		[costCenters, expenditureGroups]
	);

	// Add rowspan info
	type GroupWithRowspan = (typeof groupedData)[0] & {
		catRowspan: number;
		codeRowspan: number;
		isFirstCat: boolean;
		isFirstCode: boolean;
	};

	const allGroupsWithRowspan = useMemo(() => {
		const result: GroupWithRowspan[] = [];
		let lastCatflag = "";
		let lastCatcode = "";
		let catRowspan = 0;
		let codeRowspan = 0;

		const process = (
			groups: typeof incomeGroups | typeof expenditureGroups
		) => {
			groups.forEach((group) => {
				const isFirstCat = group.catflag !== lastCatflag;
				const isFirstCode = group.catcode !== lastCatcode;

				if (isFirstCat) {
					catRowspan = groups.filter(
						(g) => g.catflag === group.catflag
					).length;
					lastCatflag = group.catflag;
				}
				if (isFirstCode) {
					codeRowspan = groups.filter(
						(g) => g.catcode === group.catcode
					).length;
					lastCatcode = group.catcode;
				}

				result.push({
					...group,
					catRowspan: isFirstCat ? catRowspan : 0,
					codeRowspan: isFirstCode ? codeRowspan : 0,
					isFirstCat,
					isFirstCode,
				});
			});
		};

		process(incomeGroups);
		process(expenditureGroups);
		return result;
	}, [incomeGroups, expenditureGroups]);

	const handleViewReport = async (company: Company) => {
		// Validate inputs first
		if (!selectedYear || !selectedMonth) {
			toast.error(" Year and Month are required.");
			return;
		}

		setSelectedCompany(company);
		setReportLoading(true);
		setReportData([]);
		setShowReport(true);
		try {
			const url = `/misapi/api/IncomeExpenditureRegionDetailed?compId=${
				company.compId
			}&year=${selectedYear}&month=${String(selectedMonth).padStart(
				2,
				"0"
			)}`;
			const res = await fetch(url);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = await res.json();
			const items: ReportItem[] = Array.isArray(data)
				? data
				: data.data || [];
			setReportData(items);
			items.length === 0
				? toast.warn("No records found")
				: toast.success("Report loaded");
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

	const handleDownloadCSV = () => {
		if (groupedData.length === 0 || !selectedCompany) return;

		const headers = [
			"Category",
			"Code",
			"Account",
			"Description",
			...costCenters.map((cc) => asText(cc)),
			"Total",
		];

		// Pre-calculate totals per cost center for Income and Expenditure
		const incomeCostCenterTotals = costCenters.reduce((acc, cc) => {
			acc[cc] = incomeGroups.reduce(
				(sum, group) => sum + (group.costCenterValues[cc] || 0),
				0
			);
			return acc;
		}, {} as Record<string, number>);

		const expenditureCostCenterTotals = costCenters.reduce((acc, cc) => {
			acc[cc] = expenditureGroups.reduce(
				(sum, group) => sum + (group.costCenterValues[cc] || 0),
				0
			);
			return acc;
		}, {} as Record<string, number>);

		const csvRows: string[] = [
			"Consolidated Income & Expenditure Regional Statement",
			`Region / Company: ${selectedCompany.compId} - ${selectedCompany.CompName}`,
			`Period Ended: ${getMonthName(selectedMonth!)}/${selectedYear}`,
			"Currency: LKR",
			"",
			headers.map(csvEscape).join(","),
		];

		// Income rows
		incomeGroups.forEach((group) => {
			csvRows.push(
				[
					"Income",
					group.catcode,
					group.account,
					group.catname,
					...costCenters.map((cc) =>
						formatNumber(group.costCenterValues[cc] || 0)
					),
					formatNumber(group.total),
				]
					.map(csvEscape)
					.join(",")
			);
		});

		// Total Income row with cost center totals
		csvRows.push(""); // empty row for spacing
		csvRows.push(
			[
				"Total Income",
				"",
				"",
				"",

				...costCenters.map((cc) =>
					formatNumber(incomeCostCenterTotals[cc] || 0)
				),
				formatNumber(incomeTotal),
			]
				.map(csvEscape)
				.join(",")
		);
		csvRows.push(""); // empty row for spacing

		// Expenditure rows
		expenditureGroups.forEach((group) => {
			csvRows.push(
				[
					"Expenditure",
					group.catcode,
					group.account,
					group.catname,
					...costCenters.map((cc) =>
						formatNumber(group.costCenterValues[cc] || 0)
					),
					formatNumber(group.total),
				]
					.map(csvEscape)
					.join(",")
			);
		});
		csvRows.push(""); // empty row for spacing

		// Total Expenditure row with cost center totals
		csvRows.push(
			[
				"Total Expenditure",
				"",
				"",
				"",
				...costCenters.map((cc) =>
					formatNumber(expenditureCostCenterTotals[cc] || 0)
				),
				formatNumber(expenditureTotal),
			]
				.map(csvEscape)
				.join(",")
		);
		csvRows.push(""); // empty row for spacing

		csvRows.push(""); // empty row

		// Income Over Expenditure (Surplus/Deficit) per cost center
		csvRows.push(
			[
				"",
				"Income Over Expenditure",
				"",
				"",
				...costCenters.map((cc) =>
					formatNumber(
						(incomeCostCenterTotals[cc] || 0) +
							(expenditureCostCenterTotals[cc] || 0)
					)
				),
				formatNumber(surplusDeficit),
			]
				.map(csvEscape)
				.join(",")
		);

		const csvContent = csvRows.join("\n");
		const blob = new Blob(["\uFEFF" + csvContent], {
			type: "text/csv;charset=utf-8;",
		});
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `IncomeExpenditureRegion_${
			selectedCompany.compId
		}_$$ {selectedYear}_ $${String(selectedMonth).padStart(2, "0")}.csv`;
		link.click();
		URL.revokeObjectURL(url);
	};

	const printPDF = () => {
		if (groupedData.length === 0 || !iframeRef.current || !selectedCompany)
			return;

		let fontSize = "10px";
		let headerFontSize = "11px";
		let titleFontSize = "14px";
		let accountWidth = "100px";
		let descWidth = "220px";
		let codeWidth = "80px";
		let categoryWidth = "120px";

		if (costCenters.length > 15) {
			fontSize = "7px";
			headerFontSize = "8px";
			accountWidth = "70px";
			descWidth = "100px";
			codeWidth = "60px";
			categoryWidth = "100px";
		} else if (costCenters.length > 10) {
			fontSize = "8px";
			accountWidth = "80px";
			descWidth = "150px";
		}

		const tableStyle = `
		table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: ${fontSize}; }
		th, td { border: 1px solid #ccc; padding: 5px; word-wrap: break-word; vertical-align: top; }
		th { font-weight: bold;  font-size: ${headerFontSize}; }
		.account-col { width: ${accountWidth}; text-align: left; }
		.desc-col { width: ${descWidth}; text-align: left; }
		.code-col { width: ${codeWidth}; text-align: center; }
		.category-col { width: ${categoryWidth}; text-align: left; font-weight: bold; background: #f5f5f5; }
		.numeric { text-align: right; }
		.total-row { background-color: #E5E7EB; font-weight: bold; }
		.surplus-row { background-color: #BFDBFE; font-weight: bold; }
	`;

		// Pre-calculate totals per cost center
		const incomeCostCenterTotals = costCenters.reduce((acc, cc) => {
			acc[cc] = incomeGroups.reduce(
				(sum, group) => sum + (group.costCenterValues[cc] || 0),
				0
			);
			return acc;
		}, {} as Record<string, number>);

		const expenditureCostCenterTotals = costCenters.reduce((acc, cc) => {
			acc[cc] = expenditureGroups.reduce(
				(sum, group) => sum + (group.costCenterValues[cc] || 0),
				0
			);
			return acc;
		}, {} as Record<string, number>);

		let bodyHTML = "";
		let lastCatflag = "";
		let lastCatcode = "";

		const processGroups = (
			groups: typeof incomeGroups,
			sectionName: string
		) => {
			groups.forEach((group) => {
				const isFirstCat = group.catflag !== lastCatflag;
				const isFirstCode = group.catcode !== lastCatcode;

				const catRowspan = isFirstCat
					? groups.filter((g) => g.catflag === group.catflag).length
					: 0;
				const codeRowspan = isFirstCode
					? groups.filter((g) => g.catcode === group.catcode).length
					: 0;

				bodyHTML += `<tr>
				${
					isFirstCat
						? `<td class="category-col" rowspan="${catRowspan}" style="vertical-align:top;">${sectionName}</td>`
						: ""
				}
				${
					isFirstCode
						? `<td class="code-col" rowspan="${codeRowspan}" style="vertical-align:top;">${escapeHtml(
								group.catcode
						  )}</td>`
						: ""
				}
				<td class="account-col">${escapeHtml(group.account)}</td>
				<td class="desc-col">${escapeHtml(group.catname)}</td>
				${costCenters
					.map(
						(cc) =>
							`<td class="numeric">${formatNumber(
								group.costCenterValues[cc] || 0
							)}</td>`
					)
					.join("")}
				<td class="numeric" style="font-weight: bold;">${formatNumber(group.total)}</td>
			</tr>`;

				if (isFirstCat) lastCatflag = group.catflag;
				if (isFirstCode) lastCatcode = group.catcode;
			});
		};

		// Income Section
		processGroups(incomeGroups, "Income");

		// Total Income Row — now with cost center totals
		bodyHTML += `<tr class="total-row">
		<td colspan="4" style="text-align: left; padding-left: 12px;">Total Income</td>
		${costCenters
			.map(
				(cc) =>
					`<td class="numeric">${formatNumber(
						incomeCostCenterTotals[cc] || 0
					)}</td>`
			)
			.join("")}
		<td class="numeric">${formatNumber(incomeTotal)}</td>
	</tr>`;

		bodyHTML += `<tr><td colspan="${
			4 + costCenters.length + 1
		}" style="height: 15px; border: none;"></td></tr>`;

		// Expenditure Section
		lastCatflag = "";
		lastCatcode = "";
		processGroups(expenditureGroups, "Expenditure");

		// Total Expenditure Row — now with cost center totals
		bodyHTML += `<tr class="total-row">
		<td colspan="4" style="text-align: left; padding-left: 12px;">Total Expenditure</td>
		${costCenters
			.map(
				(cc) =>
					`<td class="numeric">${formatNumber(
						expenditureCostCenterTotals[cc] || 0
					)}</td>`
			)
			.join("")}
		<td class="numeric">${formatNumber(expenditureTotal)}</td>
	</tr>`;

		// Income Over Expenditure — net per cost center
		bodyHTML += `<tr class="surplus-row">
		<td colspan="4" style="text-align: left; padding-left: 12px;">Income Over Expenditure</td>
		${costCenters
			.map(
				(cc) =>
					`<td class="numeric">${formatNumber(
						(incomeCostCenterTotals[cc] || 0) -
							(expenditureCostCenterTotals[cc] || 0)
					)}</td>`
			)
			.join("")}
		<td class="numeric">${formatNumber(surplusDeficit)}</td>
	</tr>`;

		const fullHTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Consolidated Income & Expenditure Regional Statement</title><style>${tableStyle}
body { font-family: Arial, sans-serif; margin: 10mm; print-color-adjust: exact; }
h3 { text-align: center; color: #7A0000; font-size: ${titleFontSize}; font-weight: bold; margin: 0 0 8px 0; }
.subtitle { font-size: 11px; margin-bottom: 8px; display: flex; justify-content: space-between; }
@page { size: A3 landscape; margin: 12mm; }
@page {
	@bottom-left { content: "Printed on: ${new Date().toLocaleString()}"; font-size: 9px; color: #666; }
	@bottom-right { content: "Page " counter(page) " of " counter(pages); font-size: 9px; color: #666; }
}
</style>
</head>
<body>
<h3>Consolidated Income & Expenditure Regional Statement</h3>
<div class="subtitle">
	<div>
		<strong>Period Ended :</strong> ${getMonthName(selectedMonth!)}/ ${selectedYear}
	</div>
	<div><strong>Currency:</strong> LKR</div>
</div>
<table>
	<thead>
		<tr>
			<th>Category</th>
			<th>Code</th>
			<th>Account</th>
			<th>Description</th>
			${costCenters.map((cc) => `<th>${escapeHtml(cc)}</th>`).join("")}
			<th>Total</th>
		</tr>
	</thead>
	<tbody>${bodyHTML}</tbody>
</table>
</body>
</html>`;

		const doc = iframeRef.current!.contentDocument!;
		doc.open();
		doc.write(fullHTML);
		doc.close();

		setTimeout(() => iframeRef.current?.contentWindow?.print(), 1000);
	};

	return (
		<div className="max-w-7xl mx-auto p-6 bg-white rounded-xl shadow border border-gray-200 text-sm">
			<h2 className={`text-xl font-bold mb-4 ${maroon}`}>
				Consolidated Income & Expenditure Regional Statement
			</h2>

			<div className="flex justify-end mb-4">
				<YearMonthDropdowns
					selectedYear={selectedYear}
					setSelectedYear={setSelectedYear}
					selectedMonth={selectedMonth}
					setSelectedMonth={setSelectedMonth}
					className="gap-8" // optional: adjusts spacing between year and month
				/>
			</div>

			<div className="mt-6">
				<ReusableCompanyList
					fetchItems={async () => {
						if (!epfNo) {
							toast.error("No EPF number available.");
							return [];
						}
						try {
							const res = await fetch(
								`/misapi/api/incomeexpenditure/Usercompanies/${epfNo}/70`
							);
							if (!res.ok) throw new Error(`HTTP ${res.status}`);
							const txt = await res.text();
							const parsed = JSON.parse(txt);
							const raw = Array.isArray(parsed)
								? parsed
								: parsed.data || [];
							return raw.map((c: any) => ({
								id: c.CompId,
								name: c.CompName,
							}));
						} catch (e: any) {
							toast.error(e.message || "Failed to load companies");
							return [];
						}
					}}
					onViewItem={(company) => {
						// Reuse your existing handleViewReport logic
						// But we need to cast since id/name are generic
						const typedCompany = {
							compId: company.id,
							CompName: company.name,
						} as Company;
						handleViewReport(typedCompany);
					}}
					idColumnTitle="Company Code"
					nameColumnTitle="Company Name"
					loadingMessage="Loading companies..."
					emptyMessage="No companies available for selection."
				/>
			</div>

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
								className={`text-xl font-bold text-center mb-4 ${maroon}`}
							>
								Consolidated Income & Expenditure Regional Statement
							</h2>

							<div className="flex justify-between text-sm mb-3">
								<div>
									<strong>Region /Company :</strong>{" "}
									{selectedCompany?.compId} -{" "}
									{selectedCompany?.CompName}
									<br />
									<strong>Period Ended of :</strong>{" "}
									{getMonthName(selectedMonth!)}/{selectedYear}
								</div>
								<div className="font-semibold text-gray-600 self-end">
									Currency: LKR
								</div>
							</div>

							{reportLoading ? (
								<div className="text-center py-20">
									<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7A0000] mx-auto"></div>
									<p>Loading report...</p>
								</div>
							) : groupedData.length === 0 ? (
								<div className="text-center py-20 text-gray-500 text-lg">
									No records found.
								</div>
							) : (
								<div className="overflow-x-auto border rounded-lg">
									<table className="w-full text-xs border-collapse">
										<thead className={`${maroonGrad} text-white`}>
											<tr>
												<th
													className="border border-gray-400 px-4 py-2 text-center w-32"
													colSpan={4}
												>
													Account
												</th>

												{costCenters.map((cc) => (
													<th
														key={cc}
														className="border border-gray-400 px-4 py-2 text-center"
													>
														{cc}
													</th>
												))}
												<th className="border border-gray-400 px-4 py-2 text-center  font-bold">
													Total
												</th>
											</tr>
										</thead>
										<tbody>
											{/* Income Section Rows */}
											{allGroupsWithRowspan
												.filter((group) => group.catflag === "I")
												.map((group, idx) => {
													const sectionName = "Income";

													return (
														<tr key={`income-${idx}`}>
															{group.isFirstCat && (
																<td
																	rowSpan={group.catRowspan}
																	className="border border-gray-400 px-4 py-2 font-bold  text-left align-top"
																>
																	{sectionName}
																</td>
															)}
															{group.isFirstCode && (
																<td
																	rowSpan={group.codeRowspan}
																	className="border border-gray-400 px-4 py-2 text-left align-top"
																>
																	{group.catcode}
																</td>
															)}
															<td className="border border-gray-400 px-4 py-2 text-left">
																{group.account}
															</td>
															<td className="border border-gray-400 px-4 py-2 pl-8 text-left">
																{group.catname}
															</td>
															{costCenters.map((cc) => (
																<td
																	key={cc}
																	className="border border-gray-400 px-4 py-2 text-right"
																>
																	{formatNumber(
																		group.costCenterValues[
																			cc
																		] || 0
																	)}
																</td>
															))}
															<td className="border border-gray-400 px-4 py-2 text-right font-bold">
																{formatNumber(group.total)}
															</td>
														</tr>
													);
												})}

											<tr className="bg-gray-200 font-bold">
												<td
													colSpan={4}
													className="border border-gray-400 px-4 py-2 text-left pl-8"
												>
													Total Income
												</td>
												{costCenters.map((cc) => (
													<td
														key={cc}
														className="border border-gray-400 px-4 py-2 text-right"
													>
														{formatNumber(
															incomeCostCenterTotals[cc] || 0
														)}
													</td>
												))}
												<td className="border border-gray-400 px-4 py-2 text-right">
													{formatNumber(incomeTotal)}
												</td>
											</tr>

											{/* Expenditure Section Rows */}
											{allGroupsWithRowspan
												.filter((group) => group.catflag !== "I")
												.map((group, idx) => {
													const sectionName = "Expenditure";

													return (
														<tr key={`expenditure-${idx}`}>
															{group.isFirstCat && (
																<td
																	rowSpan={group.catRowspan}
																	className="border border-gray-400 px-4 py-2 font-bold  text-left align-top"
																>
																	{sectionName}
																</td>
															)}
															{group.isFirstCode && (
																<td
																	rowSpan={group.codeRowspan}
																	className="border border-gray-400 px-4 py-2 text-left align-top"
																>
																	{group.catcode}
																</td>
															)}
															<td className="border border-gray-400 px-4 py-2 text-left">
																{group.account}
															</td>
															<td className="border border-gray-400 px-4 py-2 pl-8 text-left">
																{group.catname}
															</td>
															{costCenters.map((cc) => (
																<td
																	key={cc}
																	className="border border-gray-400 px-4 py-2 text-right"
																>
																	{formatNumber(
																		group.costCenterValues[
																			cc
																		] || 0
																	)}
																</td>
															))}
															<td className="border border-gray-400 px-4 py-2 text-right font-bold">
																{formatNumber(group.total)}
															</td>
														</tr>
													);
												})}

											{/* Total Expenditure Row - right after Expenditure data */}
											<tr className="bg-gray-200 font-bold">
												<td
													colSpan={4}
													className="border border-gray-400 px-4 py-2 text-left pl-8"
												>
													Total Expenditure
												</td>
												{costCenters.map((cc) => (
													<td
														key={cc}
														className="border border-gray-400 px-4 py-2 text-right"
													>
														{formatNumber(
															expenditureCostCenterTotals[cc] ||
																0
														)}
													</td>
												))}
												<td className="border border-gray-400 px-4 py-2 text-right">
													{formatNumber(expenditureTotal)}
												</td>
											</tr>
											{/* Final Surplus/Deficit Row */}
											<tr className="bg-blue-100 font-bold text-normal">
												<td
													colSpan={4}
													className="border border-gray-400 px-4 py-3 text-left pl-8"
												>
													Income Over Expenditure
												</td>
												{costCenters.map((cc) => (
													<td
														key={cc}
														className="border border-gray-400 px-4 py-3 text-right"
													>
														{formatNumber(
															(incomeCostCenterTotals[cc] || 0) +
																(expenditureCostCenterTotals[
																	cc
																] || 0)
														)}
													</td>
												))}
												<td className="border border-gray-400 px-4 py-3 text-right">
													{formatNumber(surplusDeficit)}
												</td>
											</tr>
										</tbody>
									</table>
								</div>
							)}
						</div>
					</div>
					<iframe ref={iframeRef} className="hidden" title="print" />
				</div>
			)}
		</div>
	);
};

export default IncomeExpenditureRegionDetailed;
