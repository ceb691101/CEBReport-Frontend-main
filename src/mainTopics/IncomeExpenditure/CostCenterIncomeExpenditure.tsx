import React, {useEffect, useState} from "react";
import {Search, RotateCcw, Eye, Download, Printer} from "lucide-react";
import {FaChevronDown} from "react-icons/fa";
import {useUser} from "../../contexts/UserContext";

interface Department {
	DeptId: string;
	DeptName: string;
}

interface IncomeExpenditureData {
	CatFlag: string;
	TitleCode: string;
	CatCode: string;
	AcCd: string;
	CatName: string;
	TotalBudget: number;
	Clbal: number;
	Varience: number;
	CctName: string;
}

const CostCenterIncomeExpenditure: React.FC = () => {
	// Get user from context
	const {user} = useUser();

	// Main state
	const [data, setData] = useState<Department[]>([]);
	const [searchId, setSearchId] = useState("");
	const [searchName, setSearchName] = useState("");
	const [filtered, setFiltered] = useState<Department[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [page, setPage] = useState(1);
	const pageSize = 9;

	// Selection state
	const [selectedDepartment, setSelectedDepartment] =
		useState<Department | null>(null);
	const [selectedYear, setSelectedYear] = useState<number | null>(null);
	const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

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

	// Dropdown state
	const [yearDropdownOpen, setYearDropdownOpen] = useState(false);
	const [monthDropdownOpen, setMonthDropdownOpen] = useState(false);

	// Paginated departments
	const paginatedDepartments = filtered.slice(
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

	// Fetch departments
	useEffect(() => {
		const fetchData = async () => {
			// Don't fetch if no EPF number
			if (!epfNo) {
				setError("No EPF number available. Please login again.");
				setLoading(false);
				return;
			}

			setLoading(true);
			try {
				const res = await fetch(
					`/misapi/api/incomeexpenditure/departments/${epfNo}`
				);
				if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

				const contentType = res.headers.get("content-type");
				if (!contentType || !contentType.includes("application/json")) {
					const text = await res.text();
					throw new Error(
						`Expected JSON but got ${contentType}. Response: ${text.substring(
							0,
							100
						)}`
					);
				}

				const parsed = await res.json();

				let rawData = [];
				if (Array.isArray(parsed)) {
					rawData = parsed;
				} else if (parsed.data && Array.isArray(parsed.data)) {
					rawData = parsed.data;
				} else if (parsed.result && Array.isArray(parsed.result)) {
					rawData = parsed.result;
				} else if (
					parsed.departments &&
					Array.isArray(parsed.departments)
				) {
					rawData = parsed.departments;
				} else {
					rawData = [];
				}

				const final: Department[] = rawData.map((item: any) => ({
					DeptId: item.DeptId?.toString() || item.deptId?.toString() || "",
					DeptName:
						item.DeptName?.toString().trim() ||
						item.deptName?.toString().trim() ||
						"",
				}));

				setData(final);
				setFiltered(final);
			} catch (e: any) {
				console.error("API Error:", e);
				setError(
					e.message.includes("JSON.parse")
						? "Invalid data format received from server. Please check if the API is returning valid JSON."
						: e.message
				);
			} finally {
				setLoading(false);
			}
		};
		fetchData();
	}, [epfNo]);

	// Filter departments - simplified without debouncing
	useEffect(() => {
		const f = data.filter(
			(d) =>
				(!searchId ||
					d.DeptId.toLowerCase().includes(searchId.toLowerCase())) &&
				(!searchName ||
					d.DeptName.toLowerCase().includes(searchName.toLowerCase()))
		);
		setFiltered(f);
		setPage(1);
	}, [searchId, searchName, data]);

	// Fetch income & expenditure data
	const fetchIncomeExpenditureData = async (department?: Department) => {
		const targetDepartment = department || selectedDepartment;
		if (!targetDepartment || !selectedYear || !selectedMonth) return;

		setIncomeExpLoading(true);
		setIncomeExpError(null);
		try {
			const apiUrl = `/misapi/api/incomeexpenditure/${targetDepartment.DeptId}/${selectedYear}/${selectedMonth}`;

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

	const handleDepartmentSelect = (department: Department) => {
		setSelectedDepartment(department);
		// Only fetch data if both year and month are selected
		if (selectedYear && selectedMonth) {
			fetchIncomeExpenditureData(department);
		}
	};

	const closeIncomeExpModal = () => {
		setIncomeExpModalOpen(false);
		setIncomeExpData([]);
		setSelectedDepartment(null);
	};

	const clearFilters = () => {
		setSearchId("");
		setSearchName("");
	};

	const getMonthName = (monthNum: number | null): string => {
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
		];
		return monthNames[monthNum - 1] || "Select Month";
	};

	// Updated function to get category names based on your actual data
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
			"OTHER EXPENSES": "OTHER EXPENSES",
		};
		return categoryMap[categoryCode] || categoryCode;
	};

	const formatNumber = (num: number | null): string => {
		if (num === null || num === undefined) return "-";
		const absNum = Math.abs(num);
		const formatted = new Intl.NumberFormat("en-US", {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}).format(absNum);

		return num < 0 ? `(${formatted})` : formatted;
	};

	// Custom Dropdown Components
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
								// Fetch data if department and month are selected
								if (selectedDepartment && selectedMonth) {
									fetchIncomeExpenditureData();
								}
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
								// Fetch data if department and year are selected
								if (selectedDepartment && selectedYear) {
									fetchIncomeExpenditureData();
								}
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

	// UPDATED Download as CSV function to match CompletedCostCenterWise style
	// UPDATED Download as CSV function with correct Category and Sub Category columns
	const downloadAsCSV = () => {
		if (!incomeExpData || incomeExpData.length === 0) return;

		// Calculate totals
		const incomeData = incomeExpData.filter((item) => item.CatFlag === "I");
		const expenditureData = incomeExpData.filter(
			(item) => item.CatFlag === "X"
		);

		const totals = {
			incomeBudget: incomeData.reduce(
				(sum, item) => sum + item.TotalBudget,
				0
			),
			incomeCumulative: incomeData.reduce(
				(sum, item) => sum + item.Clbal,
				0
			),
			incomeBalance: incomeData.reduce(
				(sum, item) => sum + item.Varience,
				0
			),
			expenditureBudget: expenditureData.reduce(
				(sum, item) => sum + item.TotalBudget,
				0
			),
			expenditureCumulative: expenditureData.reduce(
				(sum, item) => sum + item.Clbal,
				0
			),
			expenditureBalance: expenditureData.reduce(
				(sum, item) => sum + item.Varience,
				0
			),
		};

		// Format number for CSV (no thousands separator, 2 decimals)
		const formatNum = (num: number) => num.toFixed(2);

		// Escape CSV field
		const escape = (field: string | number): string => {
			const str = String(field);
			if (str.includes(",") || str.includes('"') || str.includes("\n")) {
				return '"' + str.replace(/"/g, '""') + '"';
			}
			return str;
		};

		// Get category name function (same as in the component)
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
				"OTHER EXPENSES": "OTHER EXPENSES",
			};
			return categoryMap[categoryCode] || categoryCode;
		};

		const csvRows = [
			// Header section
			[`Income & Expenditure Report - Cost Center Wise`],
			[
				`Cost Center: ${
					selectedDepartment?.DeptId
				} / ${selectedDepartment?.DeptName.toUpperCase()}`,
			],
			[`Period: ${getMonthName(selectedMonth)} ${selectedYear}`],
			[`Generated: ${new Date().toLocaleString()}`],
			[],

			// Column headers with Category (INCOME/EXPENDITURES) and Sub Category
			[
				"Category",
				"Sub Category",
				"Account Code",
				"Description",
				"Budget",
				"Actual Cumulative Cost",
				"Balance Budget (excess/shortfall)",
			],

			// Income section
			["==INCOME=="],
			...incomeData.map((item) => [
				"INCOME", // Category: INCOME for all income items
				escape(getCategoryName(item.CatCode.trim())), // Sub Category: TURNOVER, PERSONNEL EXPENSES, etc.
				item.AcCd.trim(), // Account Code
				escape(item.CatName.trim()), // Description
				formatNum(item.TotalBudget),
				formatNum(item.Clbal),
				formatNum(item.Varience),
			]),
			[],
			[
				"TOTAL INCOME", // Sub Category
				"",
				"", // Account Code
				"",
				formatNum(totals.incomeBudget),
				formatNum(totals.incomeCumulative),
				formatNum(totals.incomeBalance),
			],
			[],

			// Expenditure section
			["==EXPENDITURES=="],
			...expenditureData.map((item) => [
				"EXPENDITURES", // Category: EXPENDITURES for all expenditure items
				escape(getCategoryName(item.CatCode.trim())), // Sub Category: TURNOVER, PERSONNEL EXPENSES, etc.
				item.AcCd.trim(), // Account Code
				escape(item.CatName.trim()), // Description
				formatNum(item.TotalBudget),
				formatNum(item.Clbal),
				formatNum(item.Varience),
			]),
			[],
			[
				"TOTAL EXPENDITURES", // Sub Category
				"", // Account Code
				"",
				"",
				formatNum(totals.expenditureBudget),
				formatNum(totals.expenditureCumulative),
				formatNum(totals.expenditureBalance),
			],
			[],

			// Net total
			[
				"NET TOTAL", // Category
				"", // Account Code
				"",
				"",
				formatNum(totals.incomeBudget + totals.expenditureBudget),
				formatNum(totals.incomeCumulative + totals.expenditureCumulative),
				formatNum(totals.incomeBalance + totals.expenditureBalance),
			],
			[],

			// Summary section
			["==SUMMARY=="],
			[
				"INCOME",
				"Total Income Budget",
				"",
				"",
				formatNum(totals.incomeBudget),
				"",
				"",
			],
			[
				"INCOME",
				"Total Income Cumulative",
				"",
				"",
				formatNum(totals.incomeCumulative),
				"",
				"",
			],
			[
				"EXPENDITURES",
				"Total Expenditure Budget",
				"",
				"",
				formatNum(totals.expenditureBudget),
				"",
				"",
			],
			[
				"EXPENDITURES",
				"Total Expenditure Cumulative",
				"",
				"",
				formatNum(totals.expenditureCumulative),
				"",
				"",
			],
			[
				"NET TOTAL",
				"Net Total",
				"",
				"",
				formatNum(totals.incomeCumulative + totals.expenditureCumulative),
				"",
			],

			[],
		];

		const csvContent = csvRows.map((r) => r.join(",")).join("\n");
		const blob = new Blob([csvContent], {type: "text/csv;charset=utf-8;"});
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `IncomeExpenditure_${
			selectedDepartment?.DeptId
		}_${getMonthName(selectedMonth)}_${selectedYear}.csv`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};

	// Print PDF function
	const printPDF = () => {
		if (!incomeExpData || incomeExpData.length === 0) return;

		const printWindow = window.open("", "_blank");
		if (!printWindow) return;

		// Generate table rows HTML
		let tableRowsHTML = "";

		// Income section
		const incomeData = incomeExpData.filter((item) => item.CatFlag === "I");
		if (incomeData.length > 0) {
			tableRowsHTML += `
        <tr class="category-header">
          <td colspan="7" style="text-align: center; font-weight: bold; background-color: #f5f5f5; color: #7A0000;">INCOME</td>
        </tr>
      `;

			// Group income items by category using the CatCode field
			const groupedIncome = incomeData.reduce((groups, item) => {
				const category = item.CatCode.trim();
				if (!groups[category]) {
					groups[category] = [];
				}
				groups[category].push(item);
				return groups;
			}, {} as Record<string, typeof incomeData>);

			Object.entries(groupedIncome).forEach(([category, items]) => {
				// Category sub-header
				tableRowsHTML += `
          <tr>
            <td style="padding: 6px; border: 1px solid #ddd;"></td>
            <td style="padding: 6px; border: 1px solid #ddd; font-weight: bold; background-color: #f9f9f9;">${getCategoryName(
					category
				)}</td>
            <td style="padding: 6px; border: 1px solid #ddd;"></td>
            <td style="padding: 6px; border: 1px solid #ddd;"></td>
            <td style="padding: 6px; border: 1px solid #ddd;"></td>
            <td style="padding: 6px; border: 1px solid #ddd;"></td>
            <td style="padding: 6px; border: 1px solid #ddd;"></td>
          </tr>
        `;

				// Individual items
				items.forEach((item) => {
					tableRowsHTML += `
            <tr>
              <td style="padding: 6px; border: 1px solid #ddd;"></td>
              <td style="padding: 6px; border: 1px solid #ddd;"></td>
              <td style="padding: 6px; border: 1px solid #ddd; font-family: monospace;">${item.AcCd.trim()}</td>
              <td style="padding: 6px; border: 1px solid #ddd;">${item.CatName.trim()}</td>
              <td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-family: monospace;">${formatNumber(
						item.TotalBudget
					)}</td>
              <td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-family: monospace;">${formatNumber(
						item.Clbal
					)}</td>
              <td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-family: monospace;">${formatNumber(
						item.Varience
					)}</td>
            </tr>
          `;
				});

				// Category subtotal
				tableRowsHTML += `
          <tr>
            <td style="padding: 6px; border: 1px solid #ddd;"></td>
            <td style="padding: 6px; border: 1px solid #ddd; font-weight: bold; background-color: #f9f9f9;">SUB TOTAL OF - ${getCategoryName(
					category
				)}</td>
            <td style="padding: 6px; border: 1px solid #ddd;"></td>
            <td style="padding: 6px; border: 1px solid #ddd;"></td>
            <td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-family: monospace; background-color: #f9f9f9; font-weight: bold;">
              ${formatNumber(
						items.reduce((sum, item) => sum + item.TotalBudget, 0)
					)}
            </td>
            <td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-family: monospace; background-color: #f9f9f9; font-weight: bold;">
              ${formatNumber(items.reduce((sum, item) => sum + item.Clbal, 0))}
            </td>
            <td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-family: monospace; background-color: #f9f9f9; font-weight: bold;">
              ${formatNumber(
						items.reduce((sum, item) => sum + item.Varience, 0)
					)}
            </td>
          </tr>
        `;
			});

			// Income total
			const incomeTotal = incomeData.reduce(
				(sum, item) => sum + item.Clbal,
				0
			);
			tableRowsHTML += `
        <tr class="category-total">
          <td colspan="4" style="padding: 6px; border: 1px solid #ddd; background-color: #f9f9f9; font-weight: bold;">TOTAL INCOME</td>
          <td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-family: monospace; background-color: #f9f9f9; font-weight: bold;">
            ${formatNumber(
					incomeData.reduce((sum, item) => sum + item.TotalBudget, 0)
				)}
          </td>
          <td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-family: monospace; background-color: #f9f9f9; font-weight: bold;">
            ${formatNumber(incomeTotal)}
          </td>
          <td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-family: monospace; background-color: #f9f9f9; font-weight: bold;">
            ${formatNumber(
					incomeData.reduce((sum, item) => sum + item.Varience, 0)
				)}
          </td>
        </tr>
      `;
		}

		// Expenditure section
		const expenditureData = incomeExpData.filter(
			(item) => item.CatFlag === "X"
		);
		if (expenditureData.length > 0) {
			tableRowsHTML += `
        <tr class="category-header">
          <td colspan="7" style="text-align: center; font-weight: bold; background-color: #f5f5f5; color: #7A0000;">EXPENDITURES</td>
        </tr>
      `;

			// Group expenditure items by category using the CatCode field
			const groupedExpenditure = expenditureData.reduce((groups, item) => {
				const category = item.CatCode.trim();
				if (!groups[category]) {
					groups[category] = [];
				}
				groups[category].push(item);
				return groups;
			}, {} as Record<string, typeof expenditureData>);

			Object.entries(groupedExpenditure).forEach(([category, items]) => {
				// Category sub-header
				tableRowsHTML += `
          <tr>
            <td style="padding: 6px; border: 1px solid #ddd;"></td>
            <td style="padding: 6px; border: 1px solid #ddd; font-weight: bold; background-color: #f9f9f9;">${getCategoryName(
					category
				)}</td>
            <td style="padding: 6px; border: 1px solid #ddd;"></td>
            <td style="padding: 6px; border: 1px solid #ddd;"></td>
            <td style="padding: 6px; border: 1px solid #ddd;"></td>
            <td style="padding: 6px; border: 1px solid #ddd;"></td>
            <td style="padding: 6px; border: 1px solid #ddd;"></td>
          </tr>
        `;

				// Individual items
				items.forEach((item) => {
					tableRowsHTML += `
            <tr>
              <td style="padding: 6px; border: 1px solid #ddd;"></td>
              <td style="padding: 6px; border: 1px solid #ddd;"></td>
              <td style="padding: 6px; border: 1px solid #ddd; font-family: monospace;">${item.AcCd.trim()}</td>
              <td style="padding: 6px; border: 1px solid #ddd;">${item.CatName.trim()}</td>
              <td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-family: monospace;">${formatNumber(
						item.TotalBudget
					)}</td>
              <td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-family: monospace;">${formatNumber(
						item.Clbal
					)}</td>
              <td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-family: monospace;">${formatNumber(
						item.Varience
					)}</td>
            </tr>
          `;
				});

				// Category subtotal
				tableRowsHTML += `
          <tr>
            <td style="padding: 6px; border: 1px solid #ddd;"></td>
            <td style="padding: 6px; border: 1px solid #ddd; font-weight: bold; background-color: #f9f9f9;">SUB TOTAL OF - ${getCategoryName(
					category
				)}</td>
            <td style="padding: 6px; border: 1px solid #ddd;"></td>
            <td style="padding: 6px; border: 1px solid #ddd;"></td>
            <td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-family: monospace; background-color: #f9f9f9; font-weight: bold;">
              ${formatNumber(
						items.reduce((sum, item) => sum + item.TotalBudget, 0)
					)}
            </td>
            <td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-family: monospace; background-color: #f9f9f9; font-weight: bold;">
              ${formatNumber(items.reduce((sum, item) => sum + item.Clbal, 0))}
            </td>
            <td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-family: monospace; background-color: #f9f9f9; font-weight: bold;">
              ${formatNumber(
						items.reduce((sum, item) => sum + item.Varience, 0)
					)}
            </td>
          </tr>
        `;
			});

			// Expenditure total
			const expenditureTotal = expenditureData.reduce(
				(sum, item) => sum + item.Clbal,
				0
			);
			tableRowsHTML += `
        <tr class="category-total">
          <td colspan="4" style="padding: 6px; border: 1px solid #ddd; background-color: #f9f9f9; font-weight: bold;">TOTAL EXPENDITURES</td>
          <td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-family: monospace; background-color: #f9f9f9; font-weight: bold;">
            ${formatNumber(
					expenditureData.reduce((sum, item) => sum + item.TotalBudget, 0)
				)}
          </td>
          <td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-family: monospace; background-color: #f9f9f9; font-weight: bold;">
            ${formatNumber(expenditureTotal)}
          </td>
          <td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-family: monospace; background-color: #f9f9f9; font-weight: bold;">
            ${formatNumber(
					expenditureData.reduce((sum, item) => sum + item.Varience, 0)
				)}
          </td>
        </tr>
      `;
		}

		// Net total
		const netTotal =
			incomeData.reduce((sum, item) => sum + item.Clbal, 0) +
			expenditureData.reduce((sum, item) => sum + item.Clbal, 0);
		tableRowsHTML += `
      <tr style="background-color: #7A0000; color: white; font-weight: bold;">
        <td colspan="4" style="padding: 8px; border: 1px solid #7A0000;">NET TOTAL</td>
        <td style="padding: 8px; border: 1px solid #7A0000; text-align: right; font-family: monospace;">
          ${formatNumber(
					incomeData.reduce((sum, item) => sum + item.TotalBudget, 0) +
						expenditureData.reduce(
							(sum, item) => sum + item.TotalBudget,
							0
						)
				)}
        </td>
        <td style="padding: 8px; border: 1px solid #7A0000; text-align: right; font-family: monospace;">
          ${formatNumber(netTotal)}
        </td>
        <td style="padding: 8px; border: 1px solid #7A0000; text-align: right; font-family: monospace;">
          ${formatNumber(
					incomeData.reduce((sum, item) => sum + item.Varience, 0) +
						expenditureData.reduce((sum, item) => sum + item.Varience, 0)
				)}
        </td>
      </tr>
    `;

		// Create the HTML content for printing
		const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Income & Expenditure - ${getMonthName(
				selectedMonth
			)} ${selectedYear}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            font-size: 12px;
            color: #333;
          }
          
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #7A0000;
            padding-bottom: 15px;
          }
          
          .header h1 {
            color: #7A0000;
            font-size: 18px;
            margin: 0;
            font-weight: bold;
          }
          
          .header h2 {
            color: #7A0000;
            font-size: 14px;
            margin: 5px 0;
          }
          
          .header-info {
            margin-top: 10px;
            font-size: 12px;
            color: #666;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          
          th {
            background-color: #7A0000;
            font-weight: bold;
            text-align: center;
            padding: 8px;
            border: 1px solid #ddd;
          }
          
          td {
            padding: 6px;
            border: 1px solid #ddd;
          }
          
          .category-header td {
            text-align: center;
            font-weight: bold;
            background-color: #f5f5f5;
            color: #7A0000;
          }
          
          .category-total td {
            background-color: #f9f9f9;
            font-weight: bold;
          }
          
          .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 10px;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 15px;
          }
          
          @media print {
            body { margin: 0; }
            .header { page-break-inside: avoid; }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; }
            @page {
                @bottom-left { content: "Printed on: ${new Date().toLocaleString(
							"en-US",
							{timeZone: "Asia/Colombo"}
						)}"; font-size: 0.75rem; color: gray; }
                @bottom-right { content: "Page " counter(page) " of " counter(pages); font-size: 0.75rem; color: gray; }
              }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Cost Center Income & Expenditure - ${getMonthName(
					selectedMonth
				)} ${selectedYear}</h1>
          <h2>Cost Center: ${selectedDepartment?.DeptId} - ${
			selectedDepartment?.DeptName
		}</h2>
  
        </div>
        
        <table>
          <thead>
            <tr>
              <th style="width: 8%;"></th>
              <th style="width: 12%;"></th>
              <th style="width: 12%;">Ledger Code</th>
              <th style="width: 30%;">Description</th>
              <th style="width: 12%;">Budget</th>
              <th style="width: 13%;">Actual Cumulative Cost</th>
              <th style="width: 13%;">
                Balance Budget<br/>
                <span style="font-size: 10px; font-weight: normal;">(excess/shortfall)</span>
              </th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHTML}
          </tbody>
        </table>
       
      </body>
      </html>
    `;

		// Write content to the new window and print
		printWindow.document.write(htmlContent);
		printWindow.document.close();

		// Wait for content to load then print
		printWindow.onload = () => {
			printWindow.print();
			printWindow.close();
		};
	};

	// Income & Expenditure Modal Component
	const IncomeExpenditureModal = () => {
		if (!incomeExpModalOpen || !selectedDepartment) return null;

		// Separate income and expenditure data
		const incomeData = incomeExpData.filter((item) => item.CatFlag === "I");
		const expenditureData = incomeExpData.filter(
			(item) => item.CatFlag === "X"
		);

		// Calculate totals
		const incomeTotal = incomeData.reduce((sum, item) => sum + item.Clbal, 0);
		const expenditureTotal = expenditureData.reduce(
			(sum, item) => sum + item.Clbal,
			0
		);
		const netTotal = incomeTotal + expenditureTotal;

		return (
			<div className="fixed inset-0 bg-white flex items-start justify-end z-50 pt-24 pb-8 pl-64">
				<div className="bg-white w-full max-w-6xl rounded-lg shadow-lg border border-gray-300 max-h-[85vh] flex flex-col mr-4">
					<div className="p-5 border-b">
						<div className="flex justify-between items-start">
							<div className="space-y-1">
								<h2 className="text-base font-bold text-gray-800">
									Cost Center Income & Expenditure -{" "}
									{getMonthName(selectedMonth)} {selectedYear}
								</h2>
								<h3 className={`text-sm ${maroon}`}>
									Cost Center: {selectedDepartment.DeptId} -{" "}
									{selectedDepartment.DeptName}
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
									Loading income & expenditure data...
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
									We couldn't find any income or expenditure records
									for <strong>{selectedDepartment.DeptName}</strong> in{" "}
									{getMonthName(selectedMonth)} {selectedYear}.
								</p>
								<p className="text-xs text-gray-400 mt-2">
									Try selecting a different month or year, or contact
									your administrator if you believe this is an error.
								</p>
							</div>
						) : (
							<div>
								{/* Buttons section above table */}
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
												<th className="px-2 py-1 text-center"></th>
												<th className="px-2 py-1 text-left"></th>
												<th className="px-2 py-1 text-left">
													Ledger Code
												</th>
												<th className="px-2 py-1 text-left">
													Description
												</th>
												<th className="px-2 py-1 text-right">
													Budget
												</th>
												<th className="px-2 py-1 text-right">
													Actual Cumulative Cost
												</th>
												<th className="px-2 py-1 text-right">
													Balance Budget
													<div className="text-xs font-normal">
														(excess/shortfall)
													</div>
												</th>
											</tr>
										</thead>
										<tbody>
											{/* Income Section */}
											{incomeData.length > 0 && (
												<>
													<tr className="category-header">
														<td
															colSpan={2}
															className="text-left font-bold bg-gray-100 text-[#7A0000] px-2 py-1"
														>
															INCOME
														</td>
														<td className="px-2 py-1"></td>
														<td className="px-2 py-1"></td>
														<td className="px-2 py-1"></td>
														<td className="px-2 py-1"></td>
														<td className="px-2 py-1"></td>
													</tr>

													{/* Group income items by category using CatCode */}
													{(() => {
														const groupedIncome =
															incomeData.reduce(
																(groups, item) => {
																	const category =
																		item.CatCode.trim();
																	if (!groups[category]) {
																		groups[category] = [];
																	}
																	groups[category].push(item);
																	return groups;
																},
																{} as Record<
																	string,
																	typeof incomeData
																>
															);

														return Object.entries(
															groupedIncome
														).map(([category, items]) => (
															<React.Fragment
																key={`income-category-${category}`}
															>
																{/* Category sub-header */}
																<tr className="sub-category-header">
																	<td className="px-2 py-1"></td>
																	<td className="px-2 py-1 font-bold bg-gray-50">
																		{getCategoryName(
																			category
																		)}
																	</td>
																	<td className="px-2 py-1"></td>
																	<td className="px-2 py-1"></td>
																	<td className="px-2 py-1"></td>
																	<td className="px-2 py-1"></td>
																	<td className="px-2 py-1"></td>
																</tr>

																{/* Individual items */}
																{items.map((item, index) => (
																	<tr
																		key={`income-${category}-${index}`}
																		className="border-b hover:bg-gray-50"
																	>
																		<td className="px-2 py-1"></td>
																		<td className="px-2 py-1"></td>
																		<td className="px-2 py-1 font-mono">
																			{item.AcCd.trim()}
																		</td>
																		<td className="px-2 py-1">
																			{item.CatName.trim()}
																		</td>
																		<td className="px-2 py-1 text-right font-mono">
																			{formatNumber(
																				item.TotalBudget
																			)}
																		</td>
																		<td className="px-2 py-1 text-right font-mono">
																			{formatNumber(
																				item.Clbal
																			)}
																		</td>
																		<td className="px-2 py-1 text-right font-mono">
																			{formatNumber(
																				item.Varience
																			)}
																		</td>
																	</tr>
																))}

																{/* Category subtotal */}
																<tr className="sub-category-total">
																	<td className="px-2 py-1"></td>
																	<td className="px-2 py-1 font-bold bg-gray-50">
																		SUB TOTAL OF -{" "}
																		{getCategoryName(
																			category
																		)}
																	</td>
																	<td className="px-2 py-1"></td>
																	<td className="px-2 py-1"></td>
																	<td className="px-2 py-1 text-right font-mono bg-gray-50 font-bold">
																		{formatNumber(
																			items.reduce(
																				(sum, item) =>
																					sum +
																					item.TotalBudget,
																				0
																			)
																		)}
																	</td>
																	<td className="px-2 py-1 text-right font-mono bg-gray-50 font-bold">
																		{formatNumber(
																			items.reduce(
																				(sum, item) =>
																					sum + item.Clbal,
																				0
																			)
																		)}
																	</td>
																	<td className="px-2 py-1 text-right font-mono bg-gray-50 font-bold">
																		{formatNumber(
																			items.reduce(
																				(sum, item) =>
																					sum +
																					item.Varience,
																				0
																			)
																		)}
																	</td>
																</tr>
															</React.Fragment>
														));
													})()}

													{/* Total Income */}
													<tr className="category-total">
														<td
															colSpan={2}
															className="px-2 py-1 font-bold bg-gray-100"
														>
															TOTAL INCOME
														</td>
														<td className="px-2 py-1"></td>
														<td className="px-2 py-1"></td>
														<td className="px-2 py-1 text-right font-mono bg-gray-100 font-bold">
															{formatNumber(
																incomeData.reduce(
																	(sum, item) =>
																		sum + item.TotalBudget,
																	0
																)
															)}
														</td>
														<td className="px-2 py-1 text-right font-mono bg-gray-100 font-bold">
															{formatNumber(incomeTotal)}
														</td>
														<td className="px-2 py-1 text-right font-mono bg-gray-100 font-bold">
															{formatNumber(
																incomeData.reduce(
																	(sum, item) =>
																		sum + item.Varience,
																	0
																)
															)}
														</td>
													</tr>
												</>
											)}

											{/* Expenditure Section */}
											{expenditureData.length > 0 && (
												<>
													<tr className="category-header">
														<td
															colSpan={2}
															className="text-left font-bold bg-gray-100 text-[#7A0000] px-2 py-1"
														>
															EXPENDITURES
														</td>
														<td className="px-2 py-1"></td>
														<td className="px-2 py-1"></td>
														<td className="px-2 py-1"></td>
														<td className="px-2 py-1"></td>
														<td className="px-2 py-1"></td>
													</tr>

													{/* Group expenditure items by category using CatCode */}
													{(() => {
														const groupedExpenditure =
															expenditureData.reduce(
																(groups, item) => {
																	const category =
																		item.CatCode.trim();
																	if (!groups[category]) {
																		groups[category] = [];
																	}
																	groups[category].push(item);
																	return groups;
																},
																{} as Record<
																	string,
																	typeof expenditureData
																>
															);

														return Object.entries(
															groupedExpenditure
														).map(([category, items]) => (
															<React.Fragment
																key={`exp-category-${category}`}
															>
																{/* Category sub-header */}
																<tr className="sub-category-header">
																	<td className="px-2 py-1"></td>
																	<td className="px-2 py-1 font-bold bg-gray-50">
																		{getCategoryName(
																			category
																		)}
																	</td>
																	<td className="px-2 py-1"></td>
																	<td className="px-2 py-1"></td>
																	<td className="px-2 py-1"></td>
																	<td className="px-2 py-1"></td>
																	<td className="px-2 py-1"></td>
																</tr>

																{/* Individual items */}
																{items.map((item, index) => (
																	<tr
																		key={`exp-${category}-${index}`}
																		className="border-b hover:bg-gray-50"
																	>
																		<td className="px-2 py-1"></td>
																		<td className="px-2 py-1"></td>
																		<td className="px-2 py-1 font-mono">
																			{item.AcCd.trim()}
																		</td>
																		<td className="px-2 py-1">
																			{item.CatName.trim()}
																		</td>
																		<td className="px-2 py-1 text-right font-mono">
																			{formatNumber(
																				item.TotalBudget
																			)}
																		</td>
																		<td className="px-2 py-1 text-right font-mono">
																			{formatNumber(
																				item.Clbal
																			)}
																		</td>
																		<td className="px-2 py-1 text-right font-mono">
																			{formatNumber(
																				item.Varience
																			)}
																		</td>
																	</tr>
																))}

																{/* Category subtotal */}
																<tr className="sub-category-total">
																	<td className="px-2 py-1"></td>
																	<td className="px-2 py-1 font-bold bg-gray-50">
																		SUB TOTAL OF -{" "}
																		{getCategoryName(
																			category
																		)}
																	</td>
																	<td className="px-2 py-1"></td>
																	<td className="px-2 py-1"></td>
																	<td className="px-2 py-1 text-right font-mono bg-gray-50 font-bold">
																		{formatNumber(
																			items.reduce(
																				(sum, item) =>
																					sum +
																					item.TotalBudget,
																				0
																			)
																		)}
																	</td>
																	<td className="px-2 py-1 text-right font-mono bg-gray-50 font-bold">
																		{formatNumber(
																			items.reduce(
																				(sum, item) =>
																					sum + item.Clbal,
																				0
																			)
																		)}
																	</td>
																	<td className="px-2 py-1 text-right font-mono bg-gray-50 font-bold">
																		{formatNumber(
																			items.reduce(
																				(sum, item) =>
																					sum +
																					item.Varience,
																				0
																			)
																		)}
																	</td>
																</tr>
															</React.Fragment>
														));
													})()}

													{/* Total Expenditures */}
													<tr className="category-total">
														<td
															colSpan={2}
															className="px-2 py-1 font-bold bg-gray-100"
														>
															TOTAL EXPENDITURES
														</td>
														<td className="px-2 py-1"></td>
														<td className="px-2 py-1"></td>
														<td className="px-2 py-1 text-right font-mono bg-gray-100 font-bold">
															{formatNumber(
																expenditureData.reduce(
																	(sum, item) =>
																		sum + item.TotalBudget,
																	0
																)
															)}
														</td>
														<td className="px-2 py-1 text-right font-mono bg-gray-100 font-bold">
															{formatNumber(expenditureTotal)}
														</td>
														<td className="px-2 py-1 text-right font-mono bg-gray-100 font-bold">
															{formatNumber(
																expenditureData.reduce(
																	(sum, item) =>
																		sum + item.Varience,
																	0
																)
															)}
														</td>
													</tr>
												</>
											)}

											{/* Net Total */}
											<tr className="border-t-2 border-gray-800 bg-[#7A0000] text-white font-bold">
												<td colSpan={2} className="px-2 py-1">
													NET TOTAL
												</td>
												<td className="px-2 py-1"></td>
												<td className="px-2 py-1"></td>
												<td className="px-2 py-1 text-right font-mono">
													{formatNumber(
														incomeData.reduce(
															(sum, item) =>
																sum + item.TotalBudget,
															0
														) +
															expenditureData.reduce(
																(sum, item) =>
																	sum + item.TotalBudget,
																0
															)
													)}
												</td>
												<td className="px-2 py-1 text-right font-mono">
													{formatNumber(netTotal)}
												</td>
												<td className="px-2 py-1 text-right font-mono">
													{formatNumber(
														incomeData.reduce(
															(sum, item) => sum + item.Varience,
															0
														) +
															expenditureData.reduce(
																(sum, item) =>
																	sum + item.Varience,
																0
															)
													)}
												</td>
											</tr>
										</tbody>
									</table>
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
			{/* Header */}
			<div className="flex justify-between items-center mb-4">
				<div>
					<h2 className={`text-xl font-bold ${maroon}`}>
						Cost Center Income & Expenditure
					</h2>
				</div>
			</div>

			{/* Search and Date Selection Section */}
			<div className="bg-gray-50 p-4 rounded-lg mb-4 border border-gray-200">
				<div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
					{/* Search by Code */}
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

					{/* Search by Name */}
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

					{/* Year Dropdown */}
					<YearDropdown />

					{/* Month Dropdown */}
					<MonthDropdown />

					{/* Clear Filters Button */}
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

				{selectedDepartment && (
					<div className="mt-2 text-xs text-gray-600">
						Selected:{" "}
						<span className="font-semibold">
							{selectedDepartment.DeptName}
						</span>{" "}
						({selectedDepartment.DeptId})
					</div>
				)}
			</div>

			{/* Loading State */}
			{loading && (
				<div className="text-center py-8">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7A0000] mx-auto"></div>
					<p className="mt-2 text-gray-600">Loading departments...</p>
				</div>
			)}

			{/* Error State */}
			{error && (
				<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
					Error: {error}
				</div>
			)}

			{/* No Results */}
			{!loading && !error && filtered.length === 0 && (
				<div className="text-gray-600 bg-gray-100 p-4 rounded">
					No departments found.
				</div>
			)}

			{/* Table */}
			{!loading && !error && filtered.length > 0 && (
				<>
					<div className="overflow-x-auto rounded-lg border border-gray-200">
						<div className="max-h-[50vh] overflow-y-auto">
							<table className="w-full table-fixed text-left text-gray-700 text-sm">
								<thead
									className={`${maroonGrad} text-white sticky top-0`}
								>
									<tr>
										<th className="px-4 py-2 w-1/4">Department ID</th>
										<th className="px-4 py-2 w-1/2">
											Department Name
										</th>
										<th className="px-4 py-2 w-1/4 text-center">
											Action
										</th>
									</tr>
								</thead>
								<tbody>
									{paginatedDepartments.map((department, i) => (
										<tr
											key={`${department.DeptId}-${i}`}
											className={`${
												i % 2 ? "bg-white" : "bg-gray-50"
											} ${
												selectedDepartment?.DeptId ===
												department.DeptId
													? "ring-2 ring-[#7A0000] ring-inset"
													: ""
											}`}
										>
											<td className="px-4 py-2 truncate font-mono">
												{department.DeptId}
											</td>
											<td className="px-4 py-2 truncate">
												{department.DeptName}
											</td>
											<td className="px-4 py-2 text-center">
												<button
													onClick={() =>
														handleDepartmentSelect(department)
													}
													disabled={
														!selectedYear || !selectedMonth
													}
													className={`px-3 py-1 ${
														selectedDepartment?.DeptId ===
														department.DeptId
															? "bg-green-600 text-white"
															: maroonGrad + " text-white"
													} rounded-md text-xs font-medium hover:brightness-110 transition shadow disabled:opacity-50 disabled:cursor-not-allowed`}
												>
													<Eye className="inline-block mr-1 w-3 h-3" />
													{selectedDepartment?.DeptId ===
													department.DeptId
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

			{/* Income & Expenditure Modal */}
			<IncomeExpenditureModal />
		</div>
	);
};

export default CostCenterIncomeExpenditure;
