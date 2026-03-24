import React, {useEffect, useState} from "react";
import {FaSearch, FaSyncAlt, FaEye, FaChevronDown} from "react-icons/fa";
import {TrialBalanceModal} from "../../components/mainTopics/RegionTrial/test-import";
import {useUser} from "../../contexts/UserContext";

interface Region {
	compId: string;
	CompName: string;
}

interface TrialBalanceData {
	AccountCode: string;
	AccountName: string;
	TitleFlag: string;
	CostCenter: string;
	CompanyName: string;
	DepartmentId: string;
	OpeningBalance: number;
	DebitAmount: number;
	CreditAmount: number;
	ClosingBalance: number;
}

const RegionTrial: React.FC = () => {
	const {user} = useUser();
	const [data, setData] = useState<Region[]>([]);
	const [searchId, setSearchId] = useState("");
	const [searchName, setSearchName] = useState("");
	const [filtered, setFiltered] = useState<Region[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [page, setPage] = useState(1);
	const pageSize = 50;

	const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
	const [selectedYear, setSelectedYear] = useState<number | undefined>(
		undefined
	);
	const [selectedMonth, setSelectedMonth] = useState<number | undefined>(
		undefined
	);

	const [yearDropdownOpen, setYearDropdownOpen] = useState(false);
	const [monthDropdownOpen, setMonthDropdownOpen] = useState(false);

	const [trialModalOpen, setTrialModalOpen] = useState(false);
	const [trialData, setTrialData] = useState({
		companyId: "",
		year: 0,
		month: "",
		regionName: "",
	});

	const [trialBalanceData, setTrialBalanceData] = useState<TrialBalanceData[]>(
		[]
	);
	const [trialLoading, setTrialLoading] = useState(false);
	const [trialError, setTrialError] = useState<string | null>(null);

	const epfNo = user?.Userno || "";

	const maroon = "text-[#7A0000]";
	const maroonBg = "bg-[#7A0000]";
	const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";

	const years = Array.from(
		{length: 21},
		(_, i) => new Date().getFullYear() - i
	);
	const months = Array.from({length: 13}, (_, i) => i + 1);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			if (
				!target.closest(".year-dropdown") &&
				!target.closest(".month-dropdown")
			) {
				setYearDropdownOpen(false);
				setMonthDropdownOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () =>
			document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	useEffect(() => {
		const fetchData = async () => {
			if (!epfNo) {
				setError("No EPF number available. Please login again.");
				setLoading(false);
				return;
			}
			setLoading(true);
			try {
				const res = await fetch(
					`/misapi/api/incomeexpenditure/Usercompanies/${epfNo}/70`
				);
				if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
				const txt = await res.text();
				const parsed = JSON.parse(txt);
				const rawData = Array.isArray(parsed) ? parsed : parsed.data || [];
				const final: Region[] = rawData.map((item: any) => ({
					compId: item.CompId,
					CompName: item.CompName,
				}));
				setData(final);
				setFiltered(final);
			} catch (e: any) {
				setError(e.message);
			} finally {
				setLoading(false);
			}
		};
		fetchData();
	}, [epfNo]);

	useEffect(() => {
		const f = data.filter(
			(c) =>
				(!searchId ||
					c.compId.toLowerCase().includes(searchId.toLowerCase())) &&
				(!searchName ||
					c.CompName.toLowerCase().includes(searchName.toLowerCase()))
		);
		setFiltered(f);
		setPage(1);
	}, [searchId, searchName, data]);

	const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

	const handleRegionSelect = (region: Region) => {
		setSelectedRegion(region);
		if (selectedMonth && selectedYear) {
			fetchTrialBalanceData(region);
		}
	};

	const fetchTrialBalanceData = async (region?: Region) => {
		const targetRegion = region || selectedRegion;
		if (!targetRegion || !selectedMonth || !selectedYear) return;
		setTrialLoading(true);
		setTrialError(null);
		try {
			const monthNum = selectedMonth;
			const apiUrl = `/misapi/api/regionwisetrial?companyId=${targetRegion.compId}&month=${monthNum}&year=${selectedYear}`;
			const response = await fetch(apiUrl, {
				credentials: "include",
				headers: {Accept: "application/json"},
			});
			if (!response.ok)
				throw new Error(`HTTP error! status: ${response.status}`);
			const contentType = response.headers.get("content-type");
			if (!contentType || !contentType.includes("application/json")) {
				const text = await response.text();
				throw new Error(
					`Expected JSON but got ${contentType}. Response: ${text.substring(
						0,
						100
					)}`
				);
			}
			const jsonData = await response.json();
			let trialBalanceArray: TrialBalanceData[] = [];
			if (Array.isArray(jsonData)) {
				trialBalanceArray = jsonData;
			} else if (jsonData.data && Array.isArray(jsonData.data)) {
				trialBalanceArray = jsonData.data;
			} else if (jsonData.result && Array.isArray(jsonData.result)) {
				trialBalanceArray = jsonData.result;
			} else {
				throw new Error("Unexpected data format received from server");
			}
			setTrialBalanceData(trialBalanceArray);
			setTrialData({
				companyId: targetRegion.compId,
				year: selectedYear,
				month: getMonthName(selectedMonth),
				regionName: targetRegion.CompName,
			});
			setTrialModalOpen(true);
		} catch (error: any) {
			setTrialError(
				error.message.includes("JSON.parse")
					? "Invalid data format received from server"
					: error.message
			);
		} finally {
			setTrialLoading(false);
		}
	};

	const getMonthName = (monthNum: number | undefined): string => {
		if (!monthNum) return "Select Month";
		const monthNames = [
			"January",
			"February",
			"March",
			"April",
			"May",
			"June",
			"July",
			"August",
			"September",
			"October",
			"November",
			"December",
			"13th Period",
		];
		return monthNames[monthNum - 1] || "Select Month";
	};

	const clearFilters = () => {
		setSearchId("");
		setSearchName("");
	};

	const closeTrialModal = () => {
		setTrialModalOpen(false);
		setTrialBalanceData([]);
		setSelectedRegion(null);
	};

	const formatNum = (num: number | null | undefined): string => {
		// Handle null, undefined, or non-number
		if (num === null || num === undefined || isNaN(Number(num))) {
			return "0.00";
		}

		const numValue = Number(num);

		// If it's zero, show 0.00
		if (numValue === 0) {
			return "0.00";
		}

		const absValue = Math.abs(numValue);
		const formatted = new Intl.NumberFormat("en-US", {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}).format(absValue);

		return numValue < 0 ? `(${formatted})` : formatted;
	};

	const getCategory = (accountCode: string): string => {
		const firstChar = accountCode.charAt(0).toUpperCase();
		switch (firstChar) {
			case "A":
				return "Assets";
			case "E":
				return "Expenditure";
			case "L":
				return "Liabilities";
			case "R":
				return "Revenue";
			default:
				return "Other";
		}
	};

	const downloadAsCSV = () => {
		if (!trialBalanceData || trialBalanceData.length === 0) return;

		const uniqueCostCenters = [
			...new Set(trialBalanceData.map((row) => row.CostCenter)),
		].sort((a, b) => parseFloat(a) - parseFloat(b));

		// Only Cost Center number
		const headers = [
			"Category",
			"Account",
			"Description",
			...uniqueCostCenters.map((cc) => cc),
			"Total of Company",
		];

		const accountsMap = new Map<
			string,
			{name: string; category: string; values: Map<string, number>}
		>();

		trialBalanceData.forEach((row) => {
			const category = getCategory(row.AccountCode);
			if (!accountsMap.has(row.AccountCode)) {
				accountsMap.set(row.AccountCode, {
					name: row.AccountName,
					category,
					values: new Map(),
				});
			}
			accountsMap
				.get(row.AccountCode)!
				.values.set(row.CostCenter, row.ClosingBalance);
		});

		const sortedAccounts = Array.from(accountsMap.keys()).sort((a, b) =>
			a.localeCompare(b, undefined, {numeric: true})
		);

		const csvRows: string[][] = [
			[`Region Wise Trial Balance - ${trialData.month}/${trialData.year}`],
			[`Region: ${trialData.regionName} (${trialData.companyId})`],
			[""],
			headers,
		];

		let currentCategory: string | null = null;
		let categoryTotals: number[] = new Array(uniqueCostCenters.length).fill(
			0
		);
		let categoryGrandTotal = 0;

		sortedAccounts.forEach((code, idx) => {
			const acc = accountsMap.get(code)!;
			const category = acc.category;

			if (currentCategory !== category) {
				if (currentCategory !== null) {
					csvRows.push([
						`TOTAL ${currentCategory.toUpperCase()}`,
						"",
						"",
						...categoryTotals.map(formatNum),
						formatNum(categoryGrandTotal),
					]);
					csvRows.push([""]);
				}
				currentCategory = category;
				categoryTotals = new Array(uniqueCostCenters.length).fill(0);
				categoryGrandTotal = 0;
				csvRows.push([
					`${category.toUpperCase()}`,
					"",
					"",
					...uniqueCostCenters.map(() => ""),
					"",
				]);
			}

			let rowTotal = 0;
			const row: string[] = [
				category.toUpperCase(),
				code.trim(),
				acc.name.trim(),
			];
			uniqueCostCenters.forEach((cc, i) => {
				const val = acc.values.get(cc) || 0;
				row.push(formatNum(val));
				rowTotal += val;
				categoryTotals[i] += val;
			});
			row.push(formatNum(rowTotal));
			csvRows.push(row);
			categoryGrandTotal += rowTotal;

			const isLastInCategory =
				idx === sortedAccounts.length - 1 ||
				accountsMap.get(sortedAccounts[idx + 1])!.category !== category;
			if (isLastInCategory) {
				csvRows.push([
					`TOTAL ${category.toUpperCase()}`,
					"",
					"",
					...categoryTotals.map(formatNum),
					formatNum(categoryGrandTotal),
				]);
				csvRows.push([""]);
			}
		});

		// Grand Total
		const grandTotals = new Array(uniqueCostCenters.length).fill(0);
		let overallGrand = 0;
		sortedAccounts.forEach((code) => {
			const acc = accountsMap.get(code)!;
			uniqueCostCenters.forEach((cc, i) => {
				const val = acc.values.get(cc) || 0;
				grandTotals[i] += val;
				overallGrand += val;
			});
		});

		csvRows.push(
			[""],
			[
				`Generated on: ${new Date().toLocaleDateString()}}`,
			]
		);

		const csvContent = csvRows
			.map((row) =>
				row
					.map(
						(cell) => `"${(cell || "").toString().replace(/"/g, '""')}"`
					)
					.join(",")
			)
			.join("\n");

		const blob = new Blob([csvContent], {type: "text/csv;charset=utf-8;"});
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `RegionTrialBalance_${trialData.companyId}_${trialData.month}_${trialData.year}.csv`;
		link.click();
		URL.revokeObjectURL(url);
	};

const printPDF = () => {
	if (!trialBalanceData || trialBalanceData.length === 0) return;

	const uniqueCostCenters = [
		...new Set(trialBalanceData.map((r) => r.CostCenter)),
	].sort((a, b) => parseFloat(a) - parseFloat(b));

	const totalColumns = uniqueCostCenters.length + 3; // Acc + Description + Cost Centers + Total

	// Dynamic font sizing based on number of columns
	const baseFontSize = 10;
	const maxColumnsPerPage = 12;

	let fontSize = baseFontSize;
	let tableFontSize = baseFontSize;
	let paddingSize = "6px 8px";
	let borderSize = "0.5px";

	if (totalColumns > maxColumnsPerPage) {
		const scaleFactor = maxColumnsPerPage / totalColumns;
		fontSize = Math.max(6, baseFontSize * scaleFactor * 0.75);
		tableFontSize = Math.max(5, baseFontSize * scaleFactor * 0.7);
		paddingSize = "3px 5px";
		borderSize = "0.3px";

		if (totalColumns > 20) {
			fontSize = Math.max(5, fontSize * 0.75);
			tableFontSize = Math.max(4, tableFontSize * 0.75);
			paddingSize = "2px 3px";
			borderSize = "0.2px";
		}

		if (totalColumns > 40) {
			fontSize = Math.max(4, fontSize * 0.7);
			tableFontSize = Math.max(3, tableFontSize * 0.7);
			paddingSize = "1px 2px";
			borderSize = "0.15px";
		}
	}

	// Build map: AccountCode → { name, category, values per CostCenter }
	const map = new Map();
	trialBalanceData.forEach((r) => {
		const cat = getCategory(r.AccountCode);
		if (!map.has(r.AccountCode)) {
			map.set(r.AccountCode, {
				n: r.AccountName.trim(),
				c: cat,
				v: new Map(),
			});
		}
		map.get(r.AccountCode).v.set(r.CostCenter, r.ClosingBalance);
	});

	const sorted = Array.from(map.keys()).sort((a, b) =>
		a.localeCompare(b, undefined, {numeric: true})
	);

	let tableRowsHTML = "";
	let curCat: string | null = null;
	let catTot = new Array(uniqueCostCenters.length).fill(0);
	let catGrand = 0;

	sorted.forEach((code, i) => {
		const acc = map.get(code)!;
		const cat = acc.c;
		const isNewCategory = curCat !== cat;

		// === Close previous category with TOTAL row (only when changing category) ===
		if (isNewCategory && curCat !== null) {
			tableRowsHTML += `
				<tr style="background-color: #d3d3d3; font-weight: bold;">
					<td style="padding: ${paddingSize}; border: ${borderSize} solid #999;"></td>
					<td style="padding: ${paddingSize}; border: ${borderSize} solid #999; font-weight: bold; color: #7A0000;">TOTAL ${curCat.toUpperCase()}</td>
					${catTot
						.map(
							(t) =>
								`<td style="padding: ${paddingSize}; border: ${borderSize} solid #999; text-align: right; font-family: monospace; font-weight: bold; font-size: ${tableFontSize}px; color: #7A0000;">${formatNum(
									t
								)}</td>`
						)
						.join("")}
					<td style="padding: ${paddingSize}; border: ${borderSize} solid #999; text-align: right; font-family: monospace; font-weight: bold; font-size: ${tableFontSize}px; color: #7A0000;">${formatNum(
				catGrand
			)}</td>
				</tr>
				<tr><td colspan="${totalColumns}" style="padding: 6px 0;"></td></tr> <!-- spacing -->
			`;
		}

		// === Start new category header ===
		if (isNewCategory) {
			curCat = cat;
			catTot = new Array(uniqueCostCenters.length).fill(0);
			catGrand = 0;

			tableRowsHTML += `
				<tr class="category-header">
					<td colspan="${totalColumns}" style="text-align: left; font-weight: bold; background-color: #e8e8e8; color: #7A0000; padding: ${paddingSize}; border: ${borderSize} solid #999; font-size: ${fontSize}px;">
						${cat.toUpperCase()}
					</td>
				</tr>
			`;
		}

		// === Current account row ===
		let rowTotal = 0;
		const cells = uniqueCostCenters.map((cc, idx) => {
			const val = acc.v.get(cc) || 0;
			rowTotal += val;
			catTot[idx] += val;
			return `<td style="padding: ${paddingSize}; border: ${borderSize} solid #ccc; text-align: right; font-family: monospace; font-size: ${tableFontSize}px;">${formatNum(
				val
			)}</td>`;
		});
		catGrand += rowTotal;

		tableRowsHTML += `
			<tr>
				<td style="padding: ${paddingSize}; border: ${borderSize} solid #ccc; font-family: monospace; font-size: ${tableFontSize}px;">${code}</td>
				<td style="padding: ${paddingSize}; border: ${borderSize} solid #ccc; font-size: ${tableFontSize}px;">${
			acc.n
		}</td>
				${cells.join("")}
				<td style="padding: ${paddingSize}; border: ${borderSize} solid #ccc; text-align: right; font-family: monospace; font-weight: bold; font-size: ${tableFontSize}px; background-color: #f5f5f5;">${formatNum(
			rowTotal
		)}</td>
			</tr>
		`;

		// === After the very last row → add final category total ===
		const isLastRow = i === sorted.length - 1;
		if (isLastRow && curCat !== null) {
			tableRowsHTML += `
				<tr style="background-color: #d3d3d3; font-weight: bold;">
					<td style="padding: ${paddingSize}; border: ${borderSize} solid #999;"></td>
					<td style="padding: ${paddingSize}; border: ${borderSize} solid #999; font-weight: bold; color: #7A0000;">TOTAL ${curCat.toUpperCase()}</td>
					${catTot
						.map(
							(t) =>
								`<td style="padding: ${paddingSize}; border: ${borderSize} solid #999; text-align: right; font-family: monospace; font-weight: bold; font-size: ${tableFontSize}px; color: #7A0000;">${formatNum(
									t
								)}</td>`
						)
						.join("")}
					<td style="padding: ${paddingSize}; border: ${borderSize} solid #999; text-align: right; font-family: monospace; font-weight: bold; font-size: ${tableFontSize}px; color: #7A0000;">${formatNum(
				catGrand
			)}</td>
				</tr>
			`;
		}
	});

	// Dynamic column widths
	const accountWidth = 70;
	const descriptionWidth = 180;
	const totalWidth = 90;
	const remainingWidth = 1000 - accountWidth - descriptionWidth - totalWidth;
	const costCenterColumnWidth = Math.max(
		50,
		Math.floor(remainingWidth / uniqueCostCenters.length)
	);

	const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Region Wise Trial Balance - ${trialData.month}/${
		trialData.year
	}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 8px; font-size: ${fontSize}px; color: #333; line-height: 1.4; }
    .header { text-align: center; margin-bottom: 12px; border-bottom: 2px solid #7A0000; padding-bottom: 10px; }
    .header h1 { color: #7A0000; font-size: ${Math.max(
			14,
			fontSize + 3
		)}px; margin: 0 0 6px 0; font-weight: bold; }
    .header h2 { color: #7A0000; font-size: ${Math.max(
			11,
			fontSize + 1
		)}px; margin: 4px 0; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 40px; font-size: ${tableFontSize}px; table-layout: fixed; }
    th { background-color: #d3d3d3; color: #000; font-weight: bold; text-align: center; padding: ${paddingSize}; border: ${borderSize} solid #999; font-size: ${tableFontSize}px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    td { padding: ${paddingSize}; border: ${borderSize} solid #ccc; font-size: ${tableFontSize}px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .account-col { width: ${accountWidth}px; }
    .description-col { width: ${descriptionWidth}px; }
    .cc-col { width: ${costCenterColumnWidth}px; }
    .total-col { width: ${totalWidth}px; background-color: #f5f5f5; }
    .footer { position: fixed; bottom: 10px; width: 100%; display: flex; justify-content: space-between; font-size: ${Math.max(
			8,
			tableFontSize
		)}px; color: #666; padding: 0 20px; }
    @media print {
      body { margin: 0.3cm; font-size: ${tableFontSize}px; }
      @page { size: A3 landscape; margin: 0.3cm; 
	   @bottom-left { 
                content: "Printed on: ${new Date().toLocaleString("en-US", {
							timeZone: "Asia/Colombo",
						})}"; 
                font-size: ${Math.max(6, tableFontSize - 2)}px; 
                color: gray; 
              }
              @bottom-right { 
                content: "Page " counter(page) " of " counter(pages); 
                font-size: ${Math.max(6, tableFontSize - 2)}px; 
                color: gray; 
              }
				}
      
  </style>
</head>
<body>
  <div class="header">
    <h1>Region Wise Trial Balance</h1>
    <h1>Period: ${trialData.month}/${trialData.year}</h1>
    <h2>Region: ${trialData.regionName} (${trialData.companyId})</h2>
  </div>
  <table>
    <thead>
      <tr>
        <th class="account-col">Acc</th>
        <th class="description-col">Description</th>
        ${uniqueCostCenters
				.map((c) => `<th class="cc-col" title="Cost Center ${c}">${c}</th>`)
				.join("")}
        <th class="total-col">Total</th>
      </tr>
    </thead>
    <tbody>
      ${tableRowsHTML}
    </tbody>
  </table>
</body>
</html>
`;

	const printWindow = window.open("", "_blank");
	if (!printWindow) return;

	printWindow.document.write(htmlContent);
	printWindow.document.close();

	printWindow.onload = () => {
		printWindow.print();
		printWindow.close();
	};
};
	const YearDropdown = () => (
		<div className="year-dropdown relative">
			<label className="block text-xs font-medium text-gray-700 mb-1">
				Year
			</label>
			<button
				type="button"
				onClick={() => {
					setYearDropdownOpen(!yearDropdownOpen);
					setMonthDropdownOpen(false);
				}}
				className="w-full flex justify-between items-center px-3 py-1.5 border border-gray-300 rounded bg-white text-gray-700 text-sm focus:outline-none focus:ring-1 focus:ring-[#7A0000]"
			>
				<span>{selectedYear || "Select Year"}</span>
				<FaChevronDown
					className={`w-3 h-3 text-gray-400 transition-transform ${
						yearDropdownOpen ? "rotate-180" : ""
					}`}
				/>
			</button>
			{yearDropdownOpen && (
				<div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
					{years.map((year) => (
						<button
							key={year}
							type="button"
							onClick={() => {
								setSelectedYear(year);
								setYearDropdownOpen(false);
								if (selectedMonth && selectedRegion)
									fetchTrialBalanceData();
							}}
							className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
								selectedYear === year
									? "bg-[#7A0000] text-white"
									: "text-gray-700"
							}`}
						>
							{year}
						</button>
					))}
				</div>
			)}
		</div>
	);

	const MonthDropdown = () => (
		<div className="month-dropdown relative">
			<label className="block text-xs font-medium text-gray-700 mb-1">
				Month
			</label>
			<button
				type="button"
				onClick={() => {
					setMonthDropdownOpen(!monthDropdownOpen);
					setYearDropdownOpen(false);
				}}
				className="w-full flex justify-between items-center px-3 py-1.5 border border-gray-300 rounded bg-white text-gray-700 text-sm focus:outline-none focus:ring-1 focus:ring-[#7A0000]"
			>
				<span>{getMonthName(selectedMonth)}</span>
				<FaChevronDown
					className={`w-3 h-3 text-gray-400 transition-transform ${
						monthDropdownOpen ? "rotate-180" : ""
					}`}
				/>
			</button>
			{monthDropdownOpen && (
				<div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
					{months.map((month) => (
						<button
							key={month}
							type="button"
							onClick={() => {
								setSelectedMonth(month);
								setMonthDropdownOpen(false);
								if (selectedYear && selectedRegion)
									fetchTrialBalanceData();
							}}
							className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
								selectedMonth === month
									? "bg-[#7A0000] text-white"
									: "text-gray-700"
							}`}
						>
							{getMonthName(month)}
						</button>
					))}
				</div>
			)}
		</div>
	);

	const CustomRegionTable = () => (
		<>
			<div className="flex justify-between items-center mb-4">
				<div>
					<h2 className={`text-xl font-bold ${maroon} normal-case`}>
						Region Wise Trial Balance
					</h2>
				</div>
			</div>

			<div className="bg-gray-50 p-4 rounded-lg mb-4 border border-gray-200">
				<div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
					<div>
						<label className="block text-xs font-medium text-gray-700 mb-1">
							Search by Code
						</label>
						<div className="relative">
							<FaSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs" />
							<input
								type="text"
								value={searchId}
								placeholder="Code"
								onChange={(e) => setSearchId(e.target.value)}
								className="pl-7 pr-2 py-1.5 w-full rounded border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-[#7A0000] text-sm"
							/>
						</div>
					</div>
					<div>
						<label className="block text-xs font-medium text-gray-700 mb-1">
							Search by Name
						</label>
						<div className="relative">
							<FaSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs" />
							<input
								type="text"
								value={searchName}
								placeholder="Name"
								onChange={(e) => setSearchName(e.target.value)}
								className="pl-7 pr-2 py-1.5 w-full rounded border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-[#7A0000] text-sm"
							/>
						</div>
					</div>
					<YearDropdown />
					<MonthDropdown />
					<div>
						{(searchId || searchName) && (
							<button
								onClick={clearFilters}
								className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm w-full justify-center"
							>
								<FaSyncAlt className="w-3 h-3" /> Clear
							</button>
						)}
					</div>
				</div>
				{selectedRegion && (
					<div className="mt-2 text-xs text-gray-600">
						Selected:{" "}
						<span className="font-semibold">
							{selectedRegion.CompName}
						</span>{" "}
						({selectedRegion.compId})
					</div>
				)}
			</div>

			{loading && (
				<div className="text-center py-8">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7A0000] mx-auto"></div>
					<p className="mt-2 text-gray-600">Loading regions...</p>
				</div>
			)}
			{error && (
				<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
					Error: {error}
				</div>
			)}
			{!loading && !error && filtered.length === 0 && (
				<div className="text-gray-600 bg-gray-100 p-4 rounded">
					No regions found.
				</div>
			)}
			{!loading && !error && filtered.length > 0 && (
				<>
					<div className="overflow-x-auto rounded-lg border border-gray-200">
						<div className="max-h-[70vh] overflow-y-auto">
							<table className="w-full table-fixed text-left text-gray-700 text-sm">
								<thead
									className={`${maroonGrad} text-white sticky top-0`}
								>
									<tr>
										<th className="px-4 py-2 w-1/4">Region Code</th>
										<th className="px-4 py-2 w-1/2">Region Name</th>
										<th className="px-4 py-2 w-1/4 text-center">
											Action
										</th>
									</tr>
								</thead>
								<tbody>
									{paginated.map((region, i) => (
										<tr
											key={i}
											className={`${
												i % 2 ? "bg-white" : "bg-gray-50"
											} ${
												selectedRegion?.compId === region.compId
													? "ring-2 ring-[#7A0000] ring-inset"
													: ""
											}`}
										>
											<td className="px-4 py-2 truncate">
												{region.compId}
											</td>
											<td className="px-4 py-2 truncate">
												{region.CompName}
											</td>
											<td className="px-4 py-2 text-center">
												<button
													onClick={() =>
														handleRegionSelect(region)
													}
													disabled={
														!selectedMonth || !selectedYear
													}
													className={`px-3 py-1 ${
														selectedRegion?.compId ===
														region.compId
															? "bg-green-600 text-white"
															: maroonGrad + " text-white"
													} rounded text-xs font-medium hover:brightness-110 transition shadow disabled:opacity-50 disabled:cursor-not-allowed`}
												>
													<FaEye className="inline-block mr-1 w-3 h-3" />
													{selectedRegion?.compId === region.compId
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
		</>
	);

	return (
		<div className="max-w-7xl mx-auto p-6 bg-white rounded-xl shadow border border-gray-200 text-sm font-sans">
			<CustomRegionTable />
			<TrialBalanceModal
				trialModalOpen={trialModalOpen}
				closeTrialModal={closeTrialModal}
				trialData={trialData}
				trialBalanceData={trialBalanceData}
				trialLoading={trialLoading}
				trialError={trialError}
				maroon={maroon}
				maroonBg={maroonBg}
				formatNumber={formatNum}
				getCategory={getCategory}
				downloadAsCSV={downloadAsCSV}
				printPDF={printPDF}
				goBack={() => setTrialModalOpen(false)}
			/>
		</div>
	);
};

export default RegionTrial;
