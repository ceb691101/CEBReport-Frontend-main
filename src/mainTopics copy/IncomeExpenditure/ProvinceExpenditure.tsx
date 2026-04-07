import React, {useEffect, useState} from "react";
import {Search, RotateCcw, Eye, Download, Printer} from "lucide-react";
import {FaChevronDown} from "react-icons/fa";
import {useUser} from "../../contexts/UserContext";

interface Company {
	compId: string;
	CompName: string;
}

interface IncomeExpenditureData {
	TitleCd: string;
	Account: string;
	Actual: number;
	CatName: string;
	MaxRev: string;
	CatCode: string;
	CatFlag: string;
	AreaNum: string;
	CctName: string;
	FormattedActual: string;
	IsIncome: boolean;
	IsExpenditure: boolean;
}

const ProvinceExpenditure: React.FC = () => {
	// Get user from context
	const {user} = useUser();

	// Main state
	const [data, setData] = useState<Company[]>([]);
	const [searchId, setSearchId] = useState("");
	const [searchName, setSearchName] = useState("");
	const [filtered, setFiltered] = useState<Company[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [page, setPage] = useState(1);
	const pageSize = 9;

	// Selection state
	const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
	const [selectedYear, setSelectedYear] = useState<number | null>(null);
	const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

	// Dropdown state
	const [yearDropdownOpen, setYearDropdownOpen] = useState(false);
	const [monthDropdownOpen, setMonthDropdownOpen] = useState(false);

	// Income & Expenditure modal state
	const [incomeExpModalOpen, setIncomeExpModalOpen] = useState(false);
	const [incomeExpData, setIncomeExpData] = useState<IncomeExpenditureData[]>(
		[]
	);
	const [incomeExpLoading, setIncomeExpLoading] = useState(false);
	const [incomeExpError, setIncomeExpError] = useState<string | null>(null);

	// Get EPF Number from user context (Userno field)
	const epfNo = user?.Userno || "";

	// Debug log to see what EPF number is being used
	useEffect(() => {
	}, [user, epfNo]);

	// Colors
	const maroon = "text-[#7A0000]";
	const maroonBg = "bg-[#7A0000]";
	const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";

	// Available years and months
	const years = Array.from(
		{length: 21},
		(_, i) => new Date().getFullYear() - i
	);
	const months = Array.from({length: 12}, (_, i) => i + 1);

	// Paginated companies
	const paginatedCompanies = filtered.slice(
		(page - 1) * pageSize,
		page * pageSize
	);

	// Close dropdowns when clicking outside
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
					`/misapi/api/incomeexpenditure/Usercompanies/${epfNo}/60`
				);
				if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

				const txt = await res.text();
				const parsed = JSON.parse(txt);
				const rawData = Array.isArray(parsed) ? parsed : parsed.data || [];

				const final: Company[] = rawData.map((item: any) => ({
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

	const fetchProvinceIncomeExpenditureData = async (company?: Company) => {
		const targetCompany = company || selectedCompany;
		if (!targetCompany || selectedYear === null || selectedMonth === null)
			return;

		setIncomeExpLoading(true);
		setIncomeExpError(null);
		try {
			const apiUrl = `/misapi/api/provinceincomeexpenditure/${targetCompany.compId}/${selectedYear}/${selectedMonth}`;

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
			let incomeExpArray: IncomeExpenditureData[] = [];

			if (Array.isArray(jsonData)) {
				incomeExpArray = jsonData;
			} else if (jsonData.data && Array.isArray(jsonData.data)) {
				incomeExpArray = jsonData.data;
			} else if (jsonData.result && Array.isArray(jsonData.result)) {
				incomeExpArray = jsonData.result;
			} else {
				incomeExpArray = [jsonData];
			}

			setIncomeExpData(incomeExpArray);
			setIncomeExpModalOpen(true);
		} catch (error: any) {
			setIncomeExpError(
				error.message.includes("JSON.parse")
					? "Invalid data format received from server"
					: error.message
			);
		} finally {
			setIncomeExpLoading(false);
		}
	};

	const handleCompanySelect = (company: Company) => {
		if (selectedYear === null || selectedMonth === null) return;
		setSelectedCompany(company);
		fetchProvinceIncomeExpenditureData(company);
	};

	const closeIncomeExpModal = () => {
		setIncomeExpModalOpen(false);
		setIncomeExpData([]);
		setSelectedCompany(null);
	};

	const clearFilters = () => {
		setSearchId("");
		setSearchName("");
	};

	const getMonthName = (monthNum: number | null): string => {
		if (monthNum === null) return "Select Month";
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
		];
		return monthNames[monthNum - 1] || "Select Month";
	};

	const formatNumber = (num: number | null | undefined): string => {
		if (num === null || num === undefined) return "0.00";
		if (num === 0) return "0.00";

		const absNum = Math.abs(num);
		const formatted = new Intl.NumberFormat("en-US", {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}).format(absNum);

		return num < 0 ? `(${formatted})` : formatted;
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
				<span>{selectedYear !== null ? selectedYear : "Select Year"}</span>
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

	// Function to get category names based on actual data
	const getCategoryName = (categoryCode: string): string => {
		const categoryMap: Record<string, string> = {
			TURNOVER: "TURNOVER",
			"INTEREST INCOME": "INTEREST INCOME",
			"OVERHEAD RECOVERIES": "OVERHEAD RECOVERIES",
			"PROFIT/ LOSS ON DISPOSAL OF PPE": "PROFIT/LOSS ON DISPOSAL OF PPE",
			"MICSELANIOUS INCOME": "MISCELLANEOUS INCOME",
			"PERSONNEL EXPENSES": "PERSONNEL EXPENSES",
			"MATERIAL COST": "MATERIAL COST",
			"ACCOMMODATION EXPENSES": "ACCOMMODATION EXPENSES",
			"TRANSPORT & COMMUNICATION EXPENSES":
				"TRANSPORT & COMMUNICATION EXPENSES",
			"ADMINISTRATIVE EXPENSES": "ADMINISTRATIVE EXPENSES",
			DEPRECIATION: "DEPRECIATION",
			"REPAIR & MAINTENANCE": "REPAIR & MAINTENANCE",
			"UTILITY EXPENSES": "UTILITY EXPENSES",
			"INSURANCE EXPENSES": "INSURANCE EXPENSES",
			"PROFESSIONAL FEES": "PROFESSIONAL FEES",
			"OTHER EXPENSES": "OTHER EXPENSES",
			"FINANCE COST": "FINANCE COST",
			"TAX EXPENSES": "TAX EXPENSES",
		};
		return categoryMap[categoryCode] || categoryCode;
	};

	const groupDataByArea = () => {
		const grouped: {[key: string]: IncomeExpenditureData[]} = {};
		const areas = new Set<string>();

		incomeExpData.forEach((item) => {
			const key = `${item.TitleCd}-${item.Account}`;
			if (!grouped[key]) {
				grouped[key] = [];
			}
			grouped[key].push(item);
			areas.add(item.AreaNum);
		});

		return {grouped, areas: Array.from(areas).sort()};
	};

	const calculateTotals = () => {
		const {grouped, areas} = groupDataByArea();

		const incomeKeys = Object.keys(grouped).filter(
			(key) => grouped[key][0].CatFlag === "I"
		);
		const expenditureKeys = Object.keys(grouped).filter(
			(key) =>
				grouped[key][0].CatFlag === "E" || grouped[key][0].CatFlag === "X"
		);

		const incomeTotalsByArea: {[area: string]: number} = {};
		const expenditureTotalsByArea: {[area: string]: number} = {};

		areas.forEach((area) => {
			incomeTotalsByArea[area] = 0;
			expenditureTotalsByArea[area] = 0;
		});

		incomeKeys.forEach((key) => {
			const items = grouped[key];
			items.forEach((item) => {
				incomeTotalsByArea[item.AreaNum] += item.Actual;
			});
		});

		expenditureKeys.forEach((key) => {
			const items = grouped[key];
			items.forEach((item) => {
				expenditureTotalsByArea[item.AreaNum] += item.Actual;
			});
		});

		const totalIncomeGrand = Object.values(incomeTotalsByArea).reduce(
			(sum, val) => sum + val,
			0
		);
		const totalExpenditureGrand = Object.values(
			expenditureTotalsByArea
		).reduce((sum, val) => sum + val, 0);
		const netTotalGrand = totalIncomeGrand - totalExpenditureGrand;

		const netTotalsByArea: {[area: string]: number} = {};
		areas.forEach((area) => {
			netTotalsByArea[area] =
				incomeTotalsByArea[area] - expenditureTotalsByArea[area];
		});

		return {
			incomeTotalsByArea,
			expenditureTotalsByArea,
			netTotalsByArea,
			totalIncomeGrand,
			totalExpenditureGrand,
			netTotalGrand,
			areas,
		};
	};

	const downloadAsCSV = () => {
		if (!incomeExpData || incomeExpData.length === 0) return;

		const {grouped, areas} = groupDataByArea();
		const totals = calculateTotals();

		// Format number for CSV (no thousands separator, 2 decimals)
		const formatNum = (num: number) => {
			if (num === undefined || num === null || isNaN(num)) return "0.00";
			if (num === 0) return "0.00";
			return num.toFixed(2);
		};

		// Escape CSV field
		const escape = (field: string | number): string => {
			const str = String(field || "");
			if (str.includes(",") || str.includes('"') || str.includes("\n")) {
				return '"' + str.replace(/"/g, '""') + '"';
			}
			return str;
		};

		// Get category name function
		const getCategoryName = (categoryCode: string): string => {
			const categoryMap: Record<string, string> = {
				TURNOVER: "TURNOVER",
				"INTEREST INCOME": "INTEREST INCOME",
				"OVERHEAD RECOVERIES": "OVERHEAD RECOVERIES",
				"PROFIT/ LOSS ON DISPOSAL OF PPE": "PROFIT/LOSS ON DISPOSAL OF PPE",
				"MICSELANIOUS INCOME": "MISCELLANEOUS INCOME",
				"PERSONNEL EXPENSES": "PERSONNEL EXPENSES",
				"MATERIAL COST": "MATERIAL COST",
				"ACCOMMODATION EXPENSES": "ACCOMMODATION EXPENSES",
				"TRANSPORT & COMMUNICATION EXPENSES":
					"TRANSPORT & COMMUNICATION EXPENSES",
				"ADMINISTRATIVE EXPENSES": "ADMINISTRATIVE EXPENSES",
				DEPRECIATION: "DEPRECIATION",
				"REPAIR & MAINTENANCE": "REPAIR & MAINTENANCE",
				"UTILITY EXPENSES": "UTILITY EXPENSES",
				"INSURANCE EXPENSES": "INSURANCE EXPENSES",
				"PROFESSIONAL FEES": "PROFESSIONAL FEES",
				"OTHER EXPENSES": "OTHER EXPENSES",
				"FINANCE COST": "FINANCE COST",
				"TAX EXPENSES": "TAX EXPENSES",
			};
			return categoryMap[categoryCode] || categoryCode;
		};

		const csvRows: string[][] = [
			// Header section
			[`Consolidated Income & Expenditure Provincial Statement`],
			[`Period Ended: ${getMonthName(selectedMonth)} ${selectedYear}`],
			[
				`Province Company: ${selectedCompany?.compId} / ${selectedCompany?.CompName}`,
			],
			[`Generated: ${new Date().toLocaleString()}`],
			[],

			// Column headers with Category and Sub Category
			[
				"Account Code",
				"Category",
				"Sub Category",
				"Description",
				...areas.map((area) => ` ${area}`),
				"Company Total",
			],
		];

		const incomeKeys = Object.keys(grouped).filter(
			(key) => grouped[key][0].CatFlag === "I"
		);

		// INCOME SECTION
		if (incomeKeys.length > 0) {
			csvRows.push(["", "", "", "", ...Array(areas.length + 1).fill("")]);

			// Group income by category
			const groupedIncome = incomeKeys.reduce((groups, key) => {
				const items = grouped[key];
				const firstItem = items[0];
				const category = firstItem.CatCode?.trim() || "UNCATEGORIZED";
				if (!groups[category]) {
					groups[category] = [];
				}
				groups[category].push({key, items, firstItem});
				return groups;
			}, {} as Record<string, Array<{key: string; items: IncomeExpenditureData[]; firstItem: IncomeExpenditureData}>>);

			// Add each category and its accounts
			Object.entries(groupedIncome).forEach(([category, categoryItems]) => {
				// Individual account rows
				categoryItems.forEach(({items, firstItem}) => {
					const row: string[] = [
						firstItem.Account.trim(), // Account Code
						"INCOME", // Category
						getCategoryName(category), // Sub Category
						escape(firstItem.CatName.trim()), // Description
					];

					// Add area columns
					areas.forEach((area) => {
						const areaItem = items.find((item) => item.AreaNum === area);
						row.push(formatNum(areaItem?.Actual || 0));
					});

					// Add company total
					const total = items.reduce((sum, item) => sum + item.Actual, 0);
					row.push(formatNum(total));

					csvRows.push(row);
				});
			});

			// INCOME TOTAL
			csvRows.push([]);
			const totalIncomeRow = [
				"TOTAL INCOME",
				"",
				"",
				"",
				...areas.map((area) => formatNum(totals.incomeTotalsByArea[area])),
				formatNum(totals.totalIncomeGrand),
			];
			csvRows.push(totalIncomeRow);
		}

		const expenditureKeys = Object.keys(grouped).filter(
			(key) =>
				grouped[key][0].CatFlag === "E" || grouped[key][0].CatFlag === "X"
		);

		// EXPENDITURES SECTION
		if (expenditureKeys.length > 0) {
			csvRows.push(["", "", "", "", ...Array(areas.length + 1).fill("")]);

			// Group expenditures by category
			const groupedExpenditure = expenditureKeys.reduce((groups, key) => {
				const items = grouped[key];
				const firstItem = items[0];
				const category = firstItem.CatCode?.trim() || "UNCATEGORIZED";
				if (!groups[category]) {
					groups[category] = [];
				}
				groups[category].push({key, items, firstItem});
				return groups;
			}, {} as Record<string, Array<{key: string; items: IncomeExpenditureData[]; firstItem: IncomeExpenditureData}>>);

			// Add each category and its accounts
			Object.entries(groupedExpenditure).forEach(
				([category, categoryItems]) => {
					// Individual account rows
					categoryItems.forEach(({items, firstItem}) => {
						const row: string[] = [
							firstItem.Account.trim(), // Account Code
							"EXPENDITURES", // Category
							getCategoryName(category), // Sub Category
							escape(firstItem.CatName.trim()), // Description
						];

						// Add area columns
						areas.forEach((area) => {
							const areaItem = items.find(
								(item) => item.AreaNum === area
							);
							row.push(formatNum(areaItem?.Actual || 0));
						});

						// Add company total
						const total = items.reduce(
							(sum, item) => sum + item.Actual,
							0
						);
						row.push(formatNum(total));

						csvRows.push(row);
					});
				}
			);

			// EXPENDITURES TOTAL
			csvRows.push([]);
			const totalExpenditureRow = [
				"TOTAL EXPENDITURES",
				"",
				"",
				"",
				...areas.map((area) =>
					formatNum(totals.expenditureTotalsByArea[area])
				),
				formatNum(totals.totalExpenditureGrand),
			];
			csvRows.push(totalExpenditureRow);
		}

		// NET TOTAL
		csvRows.push([]);
		const netTotalRow = [
			"NET TOTAL",
			"",
			"",
			"",
			...areas.map((area) => formatNum(totals.netTotalsByArea[area])),
			formatNum(totals.netTotalGrand),
		];
		csvRows.push(netTotalRow);

		// SUMMARY SECTION
		csvRows.push([]);
		csvRows.push(["SUMMARY"]);
		csvRows.push([
			"INCOME",
			"Total Income",
	
			formatNum(totals.totalIncomeGrand),
		]);
		csvRows.push([
			"EXPENDITURES",
			"Total Expenditure",
			
			formatNum(totals.totalExpenditureGrand),
		]);
		csvRows.push([
			"NET TOTAL",
			"Net Total",
			
			formatNum(totals.netTotalGrand),
		]);
		csvRows.push([
			"",
			`Number of Areas: ${areas.length}`,
			
			...Array(areas.length).fill(""),
			"",
		]);
		csvRows.push([]);
		csvRows.push([`${new Date().getFullYear()}`]);

		const csvContent = csvRows.map((row) => row.join(",")).join("\n");
		const blob = new Blob([csvContent], {type: "text/csv;charset=utf-8;"});
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `ProvinceIncomeExpenditure_${
			selectedCompany?.compId
		}_${getMonthName(selectedMonth)}_${selectedYear}.csv`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};

	const printPDF = () => {
		if (!incomeExpData || incomeExpData.length === 0) return;

		const {grouped, areas} = groupDataByArea();
		const totals = calculateTotals();
		const printWindow = window.open("", "_blank");
		if (!printWindow) return;

		// Calculate dynamic font sizing based on number of areas
		const totalColumns = 2 + areas.length + 1; // Account + Description + Areas + Total
		const baseFontSize = 10;
		const maxColumnsPerPage = 8; // Adjust this based on your preference

		let fontSize = baseFontSize;
		let tableFontSize = baseFontSize;
		let paddingSize = "4px";

		if (totalColumns > maxColumnsPerPage) {
			// Scale down font size for more columns
			const scaleFactor = maxColumnsPerPage / totalColumns;
			fontSize = Math.max(6, baseFontSize * scaleFactor * 0.8); // Minimum 6px
			tableFontSize = Math.max(5, baseFontSize * scaleFactor * 0.7);
			paddingSize = "2px";

			// Further reduce if still too many columns
			if (totalColumns > 12) {
				fontSize = Math.max(5, fontSize * 0.8);
				tableFontSize = Math.max(4, tableFontSize * 0.8);
				paddingSize = "1px";
			}
		}

		let tableRowsHTML = "";

		const incomeKeys = Object.keys(grouped).filter(
			(key) => grouped[key][0].CatFlag === "I"
		);
		const expenditureKeys = Object.keys(grouped).filter(
			(key) =>
				grouped[key][0].CatFlag === "E" || grouped[key][0].CatFlag === "X"
		);

		if (incomeKeys.length > 0) {
			tableRowsHTML += `
        <tr class="category-header">
          <td colspan="${totalColumns}" style="text-align: left; font-weight: bold; background-color: #f5f5f5; color: #7A0000; padding: ${paddingSize}; border: 1px solid #ddd; font-size: ${fontSize}px;">INCOME</td>
        </tr>
      `;

			incomeKeys.forEach((key) => {
				const items = grouped[key];
				const firstItem = items[0];
				tableRowsHTML += `
          <tr>
            <td style="padding: ${paddingSize}; border: 1px solid #ddd; font-family: monospace; font-size: ${tableFontSize}px;">${firstItem.Account.trim()}</td>
            <td style="padding: ${paddingSize}; border: 1px solid #ddd; font-size: ${tableFontSize}px;">${firstItem.CatName.trim()}</td>
        `;

				areas.forEach((area) => {
					const areaItem = items.find((item) => item.AreaNum === area);
					tableRowsHTML += `
            <td style="padding: ${paddingSize}; border: 1px solid #ddd; text-align: right; font-family: monospace; font-size: ${tableFontSize}px;">
              ${formatNumber(areaItem?.Actual || 0)}
            </td>
          `;
				});

				const total = items.reduce((sum, item) => sum + item.Actual, 0);
				tableRowsHTML += `
            <td style="padding: ${paddingSize}; border: 1px solid #ddd; text-align: right; font-family: monospace; font-weight: bold; font-size: ${tableFontSize}px;">
              ${formatNumber(total)}
            </td>
          </tr>
        `;
			});

			tableRowsHTML += `
        <tr style="background-color: #f0f0f0; font-weight: bold;">
          <td style="padding: ${paddingSize}; border: 1px solid #ddd; font-size: ${tableFontSize}px;"></td>
          <td style="padding: ${paddingSize}; border: 1px solid #ddd; font-size: ${tableFontSize}px; font-weight: bold;">TOTAL INCOME</td>
      `;
			areas.forEach((area) => {
				tableRowsHTML += `
          <td style="padding: ${paddingSize}; border: 1px solid #ddd; text-align: right; font-family: monospace; font-weight: bold; font-size: ${tableFontSize}px;">
            ${formatNumber(totals.incomeTotalsByArea[area])}
          </td>
        `;
			});
			tableRowsHTML += `
          <td style="padding: ${paddingSize}; border: 1px solid #ddd; text-align: right; font-family: monospace; font-weight: bold; font-size: ${tableFontSize}px;">
            ${formatNumber(totals.totalIncomeGrand)}
          </td>
        </tr>
      `;
		}

		if (expenditureKeys.length > 0) {
			tableRowsHTML += `
        <tr class="category-header">
          <td colspan="${totalColumns}" style="text-align: left; font-weight: bold; background-color: #f5f5f5; color: #7A0000; padding: ${paddingSize}; border: 1px solid #ddd; font-size: ${fontSize}px;">EXPENDITURES</td>
        </tr>
      `;

			expenditureKeys.forEach((key) => {
				const items = grouped[key];
				const firstItem = items[0];
				tableRowsHTML += `
          <tr>
            <td style="padding: ${paddingSize}; border: 1px solid #ddd; font-family: monospace; font-size: ${tableFontSize}px;">${firstItem.Account.trim()}</td>
            <td style="padding: ${paddingSize}; border: 1px solid #ddd; font-size: ${tableFontSize}px;">${firstItem.CatName.trim()}</td>
        `;

				areas.forEach((area) => {
					const areaItem = items.find((item) => item.AreaNum === area);
					tableRowsHTML += `
            <td style="padding: ${paddingSize}; border: 1px solid #ddd; text-align: right; font-family: monospace; font-size: ${tableFontSize}px;">
              ${formatNumber(areaItem?.Actual || 0)}
            </td>
          `;
				});

				const total = items.reduce((sum, item) => sum + item.Actual, 0);
				tableRowsHTML += `
            <td style="padding: ${paddingSize}; border: 1px solid #ddd; text-align: right; font-family: monospace; font-weight: bold; font-size: ${tableFontSize}px;">
              ${formatNumber(total)}
            </td>
          </tr>
        `;
			});

			tableRowsHTML += `
        <tr style="background-color: #f0f0f0; font-weight: bold;">
          <td style="padding: ${paddingSize}; border: 1px solid #ddd; font-size: ${tableFontSize}px;"></td>
          <td style="padding: ${paddingSize}; border: 1px solid #ddd; font-size: ${tableFontSize}px; font-weight: bold;">TOTAL EXPENDITURE</td>
      `;
			areas.forEach((area) => {
				tableRowsHTML += `
          <td style="padding: ${paddingSize}; border: 1px solid #ddd; text-align: right; font-family: monospace; font-weight: bold; font-size: ${tableFontSize}px;">
            ${formatNumber(totals.expenditureTotalsByArea[area])}
          </td>
        `;
			});
			tableRowsHTML += `
          <td style="padding: ${paddingSize}; border: 1px solid #ddd; text-align: right; font-family: monospace; font-weight: bold; font-size: ${tableFontSize}px;">
            ${formatNumber(totals.totalExpenditureGrand)}
          </td>
        </tr>
      `;
		}

		tableRowsHTML += `
      <tr style="background-color: #e0e0e0; font-weight: bold; border-top: 2px solid #ddd;">
        <td style="padding: ${paddingSize}; border: 1px solid #ddd; font-size: ${tableFontSize}px;"></td>
        <td style="padding: ${paddingSize}; border: 1px solid #ddd; font-size: ${tableFontSize}px; font-weight: bold;">NET TOTAL</td>
    `;
		areas.forEach((area) => {
			tableRowsHTML += `
        <td style="padding: ${paddingSize}; border: 1px solid #ddd; text-align: right; font-family: monospace; font-weight: bold; font-size: ${tableFontSize}px;">
          ${formatNumber(totals.netTotalsByArea[area])}
        </td>
      `;
		});
		tableRowsHTML += `
        <td style="padding: ${paddingSize}; border: 1px solid #ddd; text-align: right; font-family: monospace; font-weight: bold; font-size: ${tableFontSize}px;">
          ${formatNumber(totals.netTotalGrand)}
        </td>
      </tr>
    `;

		// Dynamic column widths calculation
		const accountWidth = 80;
		const descriptionWidth = 200;
		const totalWidth = 80;
		const remainingWidth = 800 - accountWidth - descriptionWidth - totalWidth;
		const areaColumnWidth = Math.floor(remainingWidth / areas.length);

		const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Consolidated Income & Expenditure Provincial Statement - ${getMonthName(
				selectedMonth
			)} ${selectedYear}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 10px;
            font-size: ${fontSize}px;
            color: #333;
            line-height: 1.2;
          }
          .header {
            text-align: center;
            margin-bottom: 15px;
            border-bottom: 2px solid #7A0000;
            padding-bottom: 8px;
          }
          .header h1 {
            color: #7A0000;
            font-size: ${Math.max(12, fontSize + 2)}px;
            margin: 0 0 5px 0;
            font-weight: bold;
          }
          .header h2 {
            color: #7A0000;
            font-size: ${Math.max(10, fontSize)}px;
            margin: 3px 0;
            font-weight: bold;
          }
          .header-info {
            font-size: ${Math.max(8, fontSize - 1)}px;
            color: #666;
            margin-top: 5px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
            font-size: ${tableFontSize}px;
            table-layout: fixed;
          }
          th {
            background-color: #7A0000;
            font-weight: bold;
            text-align: center;
            padding: ${paddingSize};
            border: 1px solid #ddd;
            font-size: ${tableFontSize}px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          td {
            padding: ${paddingSize};
            border: 1px solid #ddd;
            font-size: ${tableFontSize}px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .account-col { width: ${accountWidth}px; }
          .description-col { width: ${descriptionWidth}px; }
          .area-col { width: ${areaColumnWidth}px; }
          .total-col { width: ${totalWidth}px; }
          .footer {
            margin-top: 25px;
            text-align: center;
            font-size: ${Math.max(7, tableFontSize - 1)}px;
          }
          @media print {
            body { 
              margin: 0.5cm; 
              font-size: ${tableFontSize}px;
            }
            table { 
              font-size: ${tableFontSize}px; 
              page-break-inside: auto;
            }
            th, td { 
              padding: ${paddingSize}; 
              font-size: ${tableFontSize}px;
            }
            tr { page-break-inside: avoid; page-break-after: auto; }
            .header { page-break-inside: avoid; }
            @page {
              size: A4 landscape;
              margin: 0.5cm;
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
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Consolidated Income & Expenditure Provincial Statement</h1>
          <h1>Period Ended ${getMonthName(selectedMonth)} ${selectedYear}</h1>
          <h2>Province/Company: ${selectedCompany?.compId} - ${
			selectedCompany?.CompName
		}</h2>
        </div>
        <table>
          <thead>
            <tr>
              <th class="account-col">Account</th>
              <th class="description-col">Description</th>
              ${areas
						.map(
							(area) =>
								`<th class="area-col" title="Area ${area}">${area}</th>`
						)
						.join("")}
              <th class="total-col">Total</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHTML}
          </tbody>
        </table>
        <div class="footer">
          <p>Prepared By: _________________ | Checked By: _________________ | Accountant: _________________</p>
          
        </div>
      </body>
      </html>
    `;

		printWindow.document.write(htmlContent);
		printWindow.document.close();

		printWindow.onload = () => {
			printWindow.print();
			// Keep window open for review
			printWindow.close();
		};
	};

	const IncomeExpenditureModal = () => {
		if (!incomeExpModalOpen || !selectedCompany) return null;

		const {grouped, areas} = groupDataByArea();
		const totals = calculateTotals();

		const incomeKeys = Object.keys(grouped).filter(
			(key) => grouped[key][0].CatFlag === "I"
		);
		const expenditureKeys = Object.keys(grouped).filter(
			(key) =>
				grouped[key][0].CatFlag === "E" || grouped[key][0].CatFlag === "X"
		);

		return (
			<div className="fixed inset-0 bg-white flex items-start justify-end z-50 pt-24 pb-8 pl-64">
				<div className="bg-white w-full max-w-6xl rounded-lg shadow-lg border border-gray-300 max-h-[85vh] flex flex-col mr-4">
					<div className="p-5 border-b">
						<div className="flex justify-between items-start">
							<div className="space-y-1">
								<h2 className="text-base font-bold text-gray-800">
									Consolidated Income & Expenditure Provincial
									Statement
								</h2>
								<h3 className="text-base font-bold text-gray-800">
									Period Ended {getMonthName(selectedMonth)}{" "}
									{selectedYear}
								</h3>
								<h3 className={`text-sm ${maroon}`}>
									Province/Company: {selectedCompany.compId} -{" "}
									{selectedCompany.CompName}
								</h3>
							</div>
						</div>
						{incomeExpError && (
							<div className="text-red-600 text-xs mt-2 text-center">
								{incomeExpError.includes("JSON.parse")
									? "Data format error"
									: incomeExpError}
							</div>
						)}
					</div>

					<div className="px-6 py-5 overflow-y-auto flex-grow">
						{incomeExpLoading ? (
							<div className="flex items-center justify-center py-8">
								<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7A0000] mr-3"></div>
								<span className={`${maroon} text-sm`}>
									Loading province income & expenditure data...
								</span>
							</div>
						) : incomeExpData.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-12">
								<button
									onClick={closeIncomeExpModal}
									className={`px-4 py-1.5 text-sm ${maroonBg} text-white rounded hover:brightness-110`}
								>
									Back To Home
								</button>
								<div className="text-gray-400 mb-4">
									<svg
										className="w-16 h-16 mx-auto"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={1}
											d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
										/>
									</svg>
								</div>

								<h3 className="text-lg font-medium text-gray-700 mb-2">
									No Data Available
								</h3>
								<p className="text-gray-500 text-center max-w-md">
									We couldn't find any province income or expenditure
									records for{" "}
									<strong>{selectedCompany.CompName}</strong> in{" "}
									{getMonthName(selectedMonth)} {selectedYear}.
								</p>
							</div>
						) : (
							<div>
								<div className="flex justify-between items-center mb-2">
									<div></div>
									<div className="flex gap-2">
										<button
											onClick={downloadAsCSV}
											className="flex items-center gap-1 px-3 py-1.5 border border-blue-400 text-blue-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-blue-50 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
										>
											<Download className="w-3 h-3" /> CSV
										</button>
										<button
											onClick={printPDF}
											className="flex items-center gap-1 px-3 py-1.5 border border-green-400 text-green-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-green-50 hover:text-green-800 focus:outline-none focus:ring-2 focus:ring-green-200 transition"
										>
											<Printer className="w-3 h-3" /> PDF
										</button>
										<button
											onClick={closeIncomeExpModal}
											className={`px-4 py-1.5 text-sm ${maroonBg} text-white rounded hover:brightness-110`}
										>
											Back To Home
										</button>
									</div>
								</div>

								<div className="w-full overflow-x-auto text-xs">
									<table className="w-full border-collapse">
										<thead>
											<tr
												className="text-gray-800"
												style={{backgroundColor: "#D3D3D3"}}
											>
												<th
													className="px-2 py-1 text-left sticky left-0 z-10 min-w-[100px]"
													style={{backgroundColor: "#D3D3D3"}}
												>
													Account
												</th>
												<th
													className="px-2 py-1 text-left sticky left-0 z-10 min-w-[200px]"
													style={{backgroundColor: "#D3D3D3"}}
												>
													Description
												</th>
												{areas.map((area) => (
													<th
														key={area}
														className="px-2 py-1 text-right min-w-[100px]"
													>
														{area}
													</th>
												))}
												<th className="px-2 py-1 text-right font-bold min-w-[100px]">
													COMPANY TOTAL
												</th>
											</tr>
										</thead>
										<tbody>
											{incomeKeys.length > 0 && (
												<>
													<tr className="bg-gray-100 border-t border-b border-gray-300">
														<td
															colSpan={areas.length + 3}
															className="px-2 py-1 font-medium text-center text-[#7A0000]"
														>
															INCOME
														</td>
													</tr>
													{(() => {
														const groupedIncome =
															incomeKeys.reduce(
																(groups, key) => {
																	const items = grouped[key];
																	const firstItem = items[0];
																	const category =
																		firstItem.CatCode?.trim() ||
																		"UNCATEGORIZED";
																	if (!groups[category]) {
																		groups[category] = [];
																	}
																	groups[category].push({
																		key,
																		items,
																		firstItem,
																	});
																	return groups;
																},
																{} as Record<
																	string,
																	Array<{
																		key: string;
																		items: IncomeExpenditureData[];
																		firstItem: IncomeExpenditureData;
																	}>
																>
															);

														return Object.entries(
															groupedIncome
														).map(([category, categoryItems]) => (
															<React.Fragment
																key={`income-category-${category}`}
															>
																<tr className="sub-category-header">
																	<td className="px-2 py-1"></td>
																	<td className="px-2 py-1 font-bold bg-gray-50 sticky left-0">
																		{getCategoryName(
																			category
																		)}
																	</td>
																	{areas.map(() => (
																		<td
																			key={Math.random()}
																			className="px-2 py-1"
																		></td>
																	))}
																	<td className="px-2 py-1"></td>
																</tr>
																{categoryItems.map(
																	(
																		{items, firstItem},
																		index
																	) => {
																		const accountTotal =
																			items.reduce(
																				(sum, item) =>
																					sum +
																					item.Actual,
																				0
																			);
																		return (
																			<tr
																				key={`income-${category}-${index}`}
																				className="border-b hover:bg-gray-50"
																			>
																				<td className="px-2 py-1 font-mono sticky left-0 bg-white">
																					{firstItem.Account.trim()}
																				</td>
																				<td className="px-2 py-1 sticky left-0 bg-white">
																					{firstItem.CatName.trim()}
																				</td>
																				{areas.map(
																					(area) => {
																						const areaItem =
																							items.find(
																								(
																									item
																								) =>
																									item.AreaNum ===
																									area
																							);
																						return (
																							<td
																								key={
																									area
																								}
																								className="px-2 py-1 text-right font-mono"
																							>
																								{formatNumber(
																									areaItem?.Actual ||
																										0
																								)}
																							</td>
																						);
																					}
																				)}
																				<td className="px-2 py-1 text-right font-mono">
																					{formatNumber(
																						accountTotal
																					)}
																				</td>
																			</tr>
																		);
																	}
																)}
															</React.Fragment>
														));
													})()}
													<tr className="bg-gray-200 border-t-2 border-gray-400">
														<td className="px-2 py-1 font-mono sticky left-0 bg-gray-200"></td>
														<td className="px-2 py-1 font-bold sticky left-0 bg-gray-200">
															TOTAL INCOME
														</td>
														{areas.map((area) => (
															<td
																key={area}
																className="px-2 py-1 text-right font-mono font-bold"
															>
																{formatNumber(
																	totals.incomeTotalsByArea[
																		area
																	]
																)}
															</td>
														))}
														<td className="px-2 py-1 text-right font-mono font-bold">
															{formatNumber(
																totals.totalIncomeGrand
															)}
														</td>
													</tr>
												</>
											)}
											{expenditureKeys.length > 0 && (
												<>
													<tr className="bg-gray-100 border-t border-b border-gray-300">
														<td
															colSpan={areas.length + 3}
															className="px-2 py-1 font-medium text-center text-[#7A0000]"
														>
															EXPENDITURES
														</td>
													</tr>
													{expenditureKeys.map((key, index) => {
														const items = grouped[key];
														const firstItem = items[0];
														const accountTotal = items.reduce(
															(sum, item) => sum + item.Actual,
															0
														);
														return (
															<tr
																key={`exp-${index}`}
																className="border-b hover:bg-gray-50"
															>
																<td className="px-2 py-1 font-mono sticky left-0 bg-white">
																	{firstItem.Account.trim()}
																</td>
																<td className="px-2 py-1 sticky left-0 bg-white">
																	{firstItem.CatName.trim()}
																</td>
																{areas.map((area) => {
																	const areaItem = items.find(
																		(item) =>
																			item.AreaNum === area
																	);
																	return (
																		<td
																			key={area}
																			className="px-2 py-1 text-right font-mono"
																		>
																			{formatNumber(
																				areaItem?.Actual ||
																					0
																			)}
																		</td>
																	);
																})}
																<td className="px-2 py-1 text-right font-mono">
																	{formatNumber(accountTotal)}
																</td>
															</tr>
														);
													})}
													<tr className="bg-gray-200 border-t-2 border-gray-400">
														<td className="px-2 py-1 font-mono sticky left-0 bg-gray-200"></td>
														<td className="px-2 py-1 font-bold sticky left-0 bg-gray-200">
															TOTAL EXPENDITURE
														</td>
														{areas.map((area) => (
															<td
																key={area}
																className="px-2 py-1 text-right font-mono font-bold"
															>
																{formatNumber(
																	totals
																		.expenditureTotalsByArea[
																		area
																	]
																)}
															</td>
														))}
														<td className="px-2 py-1 text-right font-mono font-bold">
															{formatNumber(
																totals.totalExpenditureGrand
															)}
														</td>
													</tr>
												</>
											)}
											<tr className="bg-yellow-100 border-t-4 border-[#7A0000]">
												<td className="px-2 py-1 font-mono sticky left-0 bg-yellow-100"></td>
												<td className="px-2 py-1 font-bold sticky left-0 bg-yellow-100 text-[#7A0000]">
													NET TOTAL
												</td>
												{areas.map((area) => (
													<td
														key={area}
														className="px-2 py-1 text-right font-mono font-bold text-[#7A0000]"
													>
														{formatNumber(
															totals.netTotalsByArea[area]
														)}
													</td>
												))}
												<td className="px-2 py-1 text-right font-mono font-bold text-[#7A0000] text-lg">
													{formatNumber(totals.netTotalGrand)}
												</td>
											</tr>
										</tbody>
									</table>
									<div className="mt-6 text-xs">
										<div className="grid grid-cols-3 gap-4 border-t pt-4">
											<div>
												<strong>Prepared By:</strong>{" "}
												_________________
											</div>
											<div>
												<strong>Checked By:</strong>{" "}
												_________________
											</div>
											<div>
												<strong>Accountant:</strong>{" "}
												_________________
											</div>
										</div>
										<div className="text-center mt-4">
											<strong>Date:</strong>{" "}
											{new Date().toLocaleDateString()}
										</div>
									</div>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		);
	};

	return (
		<div className="max-w-7xl mx-auto p-6 bg-white rounded-xl shadow border border-gray-200 text-sm font-sans">
			<div className="flex justify-between items-center mb-4">
				<div>
					<h2 className={`text-xl font-bold ${maroon}`}>
						Province Income & Expenditure
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
							<Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
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
							<Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
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
								<RotateCcw className="w-3 h-3" /> Clear
							</button>
						)}
					</div>
				</div>
				{selectedCompany && (
					<div className="mt-2 text-xs text-gray-600">
						Selected:{" "}
						<span className="font-semibold">
							{selectedCompany.CompName}
						</span>{" "}
						({selectedCompany.compId})
					</div>
				)}
			</div>

			{loading && (
				<div className="text-center py-8">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7A0000] mx-auto"></div>
					<p className="mt-2 text-gray-600">Loading companies...</p>
				</div>
			)}

			{error && (
				<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
					Error: {error}
				</div>
			)}

			{/* No Results */}
			{!loading && !error && filtered.length === 0 && (
				<div className="text-gray-600 bg-gray-100 p-4 rounded">
					No companies found.
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
										<th className="px-4 py-2 w-1/4">Company Code</th>
										<th className="px-4 py-2 w-1/2">Company Name</th>
										<th className="px-4 py-2 w-1/4 text-center">
											Action
										</th>
									</tr>
								</thead>
								<tbody>
									{paginatedCompanies.map((company, i) => (
										<tr
											key={i}
											className={`${
												i % 2 ? "bg-white" : "bg-gray-50"
											} ${
												selectedCompany?.compId === company.compId
													? "ring-2 ring-[#7A0000] ring-inset"
													: ""
											}`}
										>
											<td className="px-4 py-2 truncate">
												{company.compId}
											</td>
											<td className="px-4 py-2 truncate">
												{company.CompName}
											</td>
											<td className="px-4 py-2 text-center">
												<button
													onClick={() =>
														handleCompanySelect(company)
													}
													disabled={
														selectedYear === null ||
														selectedMonth === null
													}
													className={`px-3 py-1 ${
														selectedCompany?.compId ===
														company.compId
															? "bg-green-600 text-white"
															: maroonGrad + " text-white"
													} rounded-md text-xs font-medium hover:brightness-110 transition shadow ${
														selectedYear === null ||
														selectedMonth === null
															? "opacity-50 cursor-not-allowed"
															: ""
													}`}
												>
													<Eye className="inline-block mr-1 w-3 h-3" />
													{selectedCompany?.compId ===
													company.compId
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

			<IncomeExpenditureModal />
		</div>
	);
};

export default ProvinceExpenditure;
