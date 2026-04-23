import React, {useEffect, useState} from "react";
import {
	FaSearch,
	FaSyncAlt,
	FaEye,
	FaDownload,
	FaPrint,
	FaChevronDown,
} from "react-icons/fa";
import {useUser} from "../../contexts/UserContext";

interface Company {
	compId: string;
	CompName: string;
}

interface TrialBalanceData {
	AccountCode: string;
	AccountName: string;
	TitleFlag: string;
	CostCenter: string;
	CompanyName: string;
	OpeningBalance: number;
	DebitAmount: number;
	CreditAmount: number;
	ClosingBalance: number;
}

const ProvintionalWiseTrial: React.FC = () => {
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

	// Date selection state - changed to undefined initially
	const [selectedYear, setSelectedYear] = useState<number | undefined>(
		undefined
	);
	const [selectedMonth, setSelectedMonth] = useState<number | undefined>(
		undefined
	);

	// Dropdown state
	const [yearDropdownOpen, setYearDropdownOpen] = useState(false);
	const [monthDropdownOpen, setMonthDropdownOpen] = useState(false);

	// Trial balance modal state
	const [trialModalOpen, setTrialModalOpen] = useState(false);
	const [trialBalanceData, setTrialBalanceData] = useState<TrialBalanceData[]>(
		[]
	);
	const [trialLoading, setTrialLoading] = useState(false);
	const [trialError, setTrialError] = useState<string | null>(null);

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
	const months = Array.from({length: 12}, (_, i) => i + 1); // [1, 2, ..., 12]

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

	// Fetch companies
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

	// Filter companies
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

	// Handle company selection - Auto fetch data when selected
	const handleCompanySelect = (company: Company) => {
		setSelectedCompany(company);
		// Only fetch if both month and year are selected
		if (selectedMonth && selectedYear) {
			fetchTrialBalanceData(company);
		}
	};

	// Fetch trial balance data
	const fetchTrialBalanceData = async (company?: Company) => {
		const targetCompany = company || selectedCompany;
		if (!targetCompany || !selectedMonth || !selectedYear) return;

		setTrialLoading(true);
		setTrialError(null);
		try {
			const apiUrl = `/misapi/api/trialbalance?companyId=${targetCompany.compId}&month=${selectedMonth}&year=${selectedYear}`;

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
				trialBalanceArray = [jsonData];
			}

			// Sort by AccountCode in ascending order
			trialBalanceArray.sort((a, b) =>
				a.AccountCode.localeCompare(b.AccountCode)
			);

			setTrialBalanceData(trialBalanceArray);
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

	// Process trial balance data into consolidated format with totals
	const getConsolidatedData = () => {
		const grouped: Record<
			string,
			{
				AccountCode: string;
				AccountName: string;
				TitleFlag: string;
				balances: Record<string, number>;
			}
		> = {};

		trialBalanceData.forEach((entry) => {
			const accountCode = entry.AccountCode.trim();
			const accountName = entry.AccountName.trim();
			const key = `${accountCode}_${accountName}`;
			const costCenter = entry.CostCenter.replace("CC -", "").trim();

			if (!grouped[key]) {
				grouped[key] = {
					AccountCode: accountCode,
					AccountName: accountName,
					TitleFlag: entry.TitleFlag,
					balances: {},
				};
			}

			grouped[key].balances[costCenter] = entry.ClosingBalance || 0;
		});

		// Get unique cost centers and sort them
		const costCenters = Array.from(
			new Set(
				trialBalanceData.map((e) => e.CostCenter.replace("CC -", "").trim())
			)
		).sort();

		return {costCenters, grouped};
	};

	// Get category based on AccountCode or TitleFlag
	const getCategory = (accountCode: string, titleFlag: string): string => {
		const firstChar = accountCode.charAt(0).toUpperCase();

		// Use TitleFlag first, then fall back to AccountCode pattern
		if (titleFlag === "A" || firstChar === "1") return "Assets";
		if (titleFlag === "E" || firstChar === "5" || firstChar === "6")
			return "Expenditure";
		if (titleFlag === "L" || firstChar === "2" || firstChar === "3")
			return "Liabilities";
		if (titleFlag === "R" || firstChar === "4") return "Revenue";

		return "Other";
	};

	// Calculate category totals
	const calculateCategoryTotals = () => {
		const {costCenters, grouped} = getConsolidatedData();

		const categoryTotals: Record<string, Record<string, number>> = {
			Assets: {},
			Liabilities: {},
			Revenue: {},
			Expenditure: {},
			Other: {},
		};

		// Initialize all cost centers for each category in correct order
		const categoryOrder = [
			"Assets",
			"Expenditure",
			"Liabilities",
			"Revenue",
			"Other",
		];
		categoryOrder.forEach((category) => {
			costCenters.forEach((cc) => {
				categoryTotals[category][cc] = 0;
			});
			categoryTotals[category]["total"] = 0;
		});

		// Calculate totals for each category
		Object.values(grouped).forEach((row) => {
			const category = getCategory(row.AccountCode, row.TitleFlag);

			costCenters.forEach((cc) => {
				const amount = row.balances[cc] || 0;
				categoryTotals[category][cc] += amount;
				categoryTotals[category]["total"] += amount;
			});
		});

		return {categoryTotals, costCenters};
	};

	const clearFilters = () => {
		setSearchId("");
		setSearchName("");
	};

	const closeTrialModal = () => {
		setTrialModalOpen(false);
		setTrialBalanceData([]);
		setSelectedCompany(null);
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
		];
		return monthNames[monthNum - 1] || "Select Month";
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
								// Auto-fetch data if both year and month are selected
								if (selectedMonth && selectedCompany) {
									fetchTrialBalanceData();
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
								// Auto-fetch data if both year and month are selected
								if (selectedYear && selectedCompany) {
									fetchTrialBalanceData();
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

		const escapeCSVField = (field: string | number): string => {
			const stringField = String(field);
			// If field contains comma, quote, or newline, wrap in quotes and escape internal quotes
			if (
				stringField.includes(",") ||
				stringField.includes('"') ||
				stringField.includes("\n")
			) {
				return '"' + stringField.replace(/"/g, '""') + '"';
			}
			return stringField;
		};

	// CSV export function
	const downloadAsCSV = () => {
		if (!trialBalanceData || trialBalanceData.length === 0) return;

		const {costCenters, grouped} = getConsolidatedData();
		const {categoryTotals} = calculateCategoryTotals();

		const rows: string[] = [];

		// Report Header
		rows.push(`"Monthly Trial Balance Report"`);
		rows.push(
			`"Company: ${
				selectedCompany?.compId
			} - ${selectedCompany?.CompName?.toUpperCase()}"`
		);
		rows.push(
			`"Period: ${getMonthName(
				selectedMonth
			).toUpperCase()} ${selectedYear}"`
		);
		rows.push(
			`"Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}"`
		);
		rows.push("");

		// Table Header - Account Code first!
		const header = [
			"Account Code",
			"Category",
			"Account Name",
			...costCenters,
			"Total",
		];
		rows.push(header.map(escapeCSVField).join(","));

		const emptyRow = Array(header.length).fill('""').join(",");

		// Helper to add a row
		const addRow = (
			accCode: string,
			category: string,
			accName: string,
			values: number[],
			total: number
		) => {
			const row = [
				`"${accCode}"`,
				`"${category}"`,
				`"${accName}"`,
				...values.map((v) => escapeCSVField(formatNumber(v))),
				escapeCSVField(formatNumber(total)),
			];
			rows.push(row.join(","));
		};

		// Category order
		const categories = [
			"Assets",
			"Expenditure",
			"Liabilities",
			"Revenue",
			"Other",
		] as const;

		categories.forEach((category) => {
			const categoryRows = Object.values(grouped).filter(
				(row) => getCategory(row.AccountCode, row.TitleFlag) === category
			);

			if (categoryRows.length === 0) return;

			// Add all account lines for this category
			categoryRows.forEach((row) => {
				const values = costCenters.map((cc) => row.balances[cc] || 0);
				const total = values.reduce((a, b) => a + b, 0);
				addRow(
					row.AccountCode,
					category.toUpperCase(),
					row.AccountName,
					values,
					total
				);
			});

			// Category Total
			const catValues = costCenters.map(
				(cc) => categoryTotals[category][cc] || 0
			);
			const catTotal = catValues.reduce((a, b) => a + b, 0);
			addRow(
				`TOTAL ${category.toUpperCase()}`,
				category.toUpperCase(),
				"",
				catValues,
				catTotal
			);

			rows.push(emptyRow); // Empty row after each category total
		});

		// Grand Total
		const grandTotalValues = costCenters.map((cc) =>
			categories.reduce(
				(sum, cat) => sum + (categoryTotals[cat][cc] || 0),
				0
			)
		);
		const grandTotal = grandTotalValues.reduce((a, b) => a + b, 0);

		addRow("GRAND TOTAL", "GRAND TOTAL", "", grandTotalValues, grandTotal);
		rows.push(emptyRow);

		// Footer
		rows.push("");
		rows.push('"For inquiries, contact Finance Department"');

		// Download CSV
		const csvContent = rows.join("\n");
		const blob = new Blob([csvContent], {type: "text/csv;charset=utf-8;"});
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `TrialBalance_${selectedCompany?.compId}_${getMonthName(
			selectedMonth
		)}_${selectedYear}.csv`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};
	// Print PDF function
	const printPDF = () => {
		if (!trialBalanceData || trialBalanceData.length === 0) return;
		const {costCenters, grouped} = getConsolidatedData();
		const {categoryTotals} = calculateCategoryTotals();

		const printWindow = window.open("", "_blank");
		if (!printWindow) return;

		// Generate table rows HTML for each category in correct order
		let tableRowsHTML = "";

		["Assets", "Expenditure", "Liabilities", "Revenue", "Other"].forEach(
			(category) => {
				const categoryRows = Object.values(grouped).filter(
					(row) => getCategory(row.AccountCode, row.TitleFlag) === category
				);

				if (categoryRows.length > 0) {
					const getCategoryInfo = (cat: string) => {
						switch (cat) {
							case "Assets":
								return {
									icon: "",
									desc: "ASSETS",
								};
							case "Expenditure":
								return {
									icon: "",
									desc: "EXPENDITURE",
								};
							case "Liabilities":
								return {
									icon: "📋",
									desc: "LIABILITIES",
								};
							case "Revenue":
								return {
									icon: "💰",
									desc: "REVENUE",
								};
							default:
								return {
									icon: "📊",
									desc: "OTHER",
								};
						}
					};
					const categoryInfo = getCategoryInfo(category);

					tableRowsHTML += `
          <tr class="category-header">
            <td colspan="${
					costCenters.length + 3
				}" style="text-align: center; font-weight: bold; background-color: #f5f5f5; color: #7A0000; border-top: 2px solid #7A0000; border-bottom: 2px solid #7A0000; padding: 8px;">
              ${categoryInfo.icon} ${categoryInfo.desc}
            </td>
          </tr>
        `;

					categoryRows.forEach((row) => {
						const total = costCenters.reduce(
							(sum, cc) => sum + (row.balances[cc] || 0),
							0
						);
						tableRowsHTML += `
            <tr>
              <td style="padding: 6px; border: 1px solid #ddd; font-family: monospace;">${
						row.AccountCode
					}</td>
              <td style="padding: 6px; border: 1px solid #ddd;">${
						row.AccountName
					}</td>
              ${costCenters
						.map(
							(cc) => `
                <td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-family: monospace;">${formatNumber(
							row.balances[cc] || 0
						)}</td>
              `
						)
						.join("")}
              <td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-family: monospace; font-weight: bold;">${formatNumber(
						total
					)}</td>
            </tr>
          `;
					});

					tableRowsHTML += `
          <tr class="category-total">
            <td colspan="2" style="padding: 6px; border: 1px solid #ddd; background-color: #f9f9f9; font-weight: bold; color: #7A0000; border-top: 2px solid #7A0000;">
              ${categoryInfo.icon} TOTAL ${category.toUpperCase()}
            </td>
            ${costCenters
					.map(
						(cc) => `
              <td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-family: monospace; background-color: #f9f9f9; font-weight: bold;">
                ${formatNumber(categoryTotals[category][cc])}
              </td>
            `
					)
					.join("")}
            <td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-family: monospace; background-color: #f9f9f9; font-weight: bold;">
              ${formatNumber(categoryTotals[category]["total"])}
            </td>
          </tr>
        `;
				}
			}
		);

		const grandTotalByCostCenter: Record<string, number> = {};
		costCenters.forEach((cc) => {
			grandTotalByCostCenter[cc] = Object.values(categoryTotals).reduce(
				(sum, category) => sum + (category[cc] || 0),
				0
			);
		});
		const overallGrandTotal = Object.values(categoryTotals).reduce(
			(sum, category) => sum + (category["total"] || 0),
			0
		);

		tableRowsHTML += `
      <tr style="background-color: #7A0000;  font-weight: bold;">
        <td colspan="2" style="padding: 8px; border: 1px solid #ddd;">GRAND TOTAL</td>
        ${costCenters
				.map(
					(cc) => `
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-family: monospace;">
            ${formatNumber(grandTotalByCostCenter[cc] || 0)}
          </td>
        `
				)
				.join("")}
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-family: monospace;">
          ${formatNumber(overallGrandTotal)}
        </td>
      </tr>
    `;

		const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Trial Balance - ${getMonthName(
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
          <h1>Monthly Trial Balance - ${getMonthName(
					selectedMonth
				)} ${selectedYear}</h1>
          <h2>Company: ${selectedCompany?.compId} - ${
			selectedCompany?.CompName
		}</h2>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 15%;">Account Code</th>
              <th style="width: 30%;">Account Name</th>
              ${costCenters
						.map(
							(cc) => `
                <th style="width: 15%;">${cc}</th>
              `
						)
						.join("")}
              <th style="width: 15%;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHTML}
          </tbody>
        </table>
      </body>
      </html>
    `;

		printWindow.document.write(htmlContent);
		printWindow.document.close();

		printWindow.onload = () => {
			printWindow.print();
			printWindow.close();
		};
	};

	// Company Table Component
	const CompanyTable = () => (
		<>
			<div className="flex justify-between items-center mb-4">
				<div>
					<h2 className={`text-xl font-bold ${maroon}`}>
						Company-Wise Trial Balance
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

					{/* Search by Name */}
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
								<FaSyncAlt className="w-3 h-3" /> Clear
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
														!selectedMonth || !selectedYear
													}
													className={`px-3 py-1 ${
														selectedCompany?.compId ===
														company.compId
															? "bg-green-600 text-white"
															: maroonGrad + " text-white"
													} rounded text-xs font-medium hover:brightness-110 transition shadow disabled:opacity-50 disabled:cursor-not-allowed`}
												>
													<FaEye className="inline-block mr-1 w-3 h-3" />
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
		</>
	);

	// Trial Balance Modal Component with category-based structure
	const TrialBalanceModal = () => {
		if (!trialModalOpen || !selectedCompany) return null;

		const {costCenters, grouped} = getConsolidatedData();
		const {categoryTotals} = calculateCategoryTotals();

		return (
			<div className="fixed inset-0 bg-white flex items-start justify-end z-50 pt-24 pb-8 pl-64">
				<div className="bg-white w-full max-w-6xl rounded-lg shadow-lg border border-gray-300 max-h-[85vh] flex flex-col mr-4">
					<div className="p-5 border-b">
						<div className="space-y-1">
							<h2 className="text-base font-bold text-gray-800">
								Monthly Trial Balance - {getMonthName(selectedMonth)}{" "}
								{selectedYear}
							</h2>
							<h3 className={`text-sm ${maroon}`}>
								Company: {selectedCompany.compId} -{" "}
								{selectedCompany.CompName}
							</h3>
						</div>
						{trialError && (
							<div className="text-red-600 text-xs mt-2 text-center">
								{trialError.includes("JSON.parse")
									? "Data format error"
									: trialError}
							</div>
						)}
					</div>
					<div className="px-6 py-5 overflow-y-auto flex-grow">
						{trialLoading ? (
							<div className="flex items-center justify-center py-8">
								<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7A0000] mr-3"></div>
								<span className={`${maroon} text-sm`}>
									Loading trial balance...
								</span>
							</div>
						) : trialBalanceData.length === 0 ? (
							<div className="bg-gray-100 border border-gray-300 text-gray-600 px-4 py-3 rounded text-sm text-center">
								No data found
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
											<FaDownload className="w-3 h-3" /> CSV
										</button>
										<button
											onClick={printPDF}
											className="flex items-center gap-1 px-3 py-1.5 border border-green-400 text-green-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-green-50 hover:text-green-800 focus:outline-none focus:ring-2 focus:ring-green-200 transition"
										>
											<FaPrint className="w-3 h-3" /> PDF
										</button>
										<button
											onClick={closeTrialModal}
											className={`px-4 py-1.5 text-sm ${maroonBg} text-white rounded hover:brightness-110`}
										>
											Back To Home
										</button>
									</div>
								</div>

								<div className="w-full overflow-x-auto text-xs">
									<table className="w-full border-collapse">
										<thead>
											<tr className={`${maroonBg} text-white`}>
												<th className="px-2 py-1 text-left sticky left-0 bg-[#7A0000] z-10">
													Account
												</th>
												<th className="px-2 py-1 text-left sticky left-0 bg-[#7A0000] z-10">
													Description
												</th>
												{costCenters.map((cc) => (
													<th
														key={cc}
														className="px-2 py-1 text-right min-w-[100px]"
													>
														{cc}
													</th>
												))}
												<th className="px-2 py-1 text-right font-bold min-w-[100px]">
													TOTAL
												</th>
											</tr>
										</thead>
										<tbody>
											{[
												"Assets",
												"Expenditure",
												"Liabilities",
												"Revenue",
												"Other",
											].map((category) => {
												const categoryRows = Object.values(
													grouped
												).filter(
													(row) =>
														getCategory(
															row.AccountCode,
															row.TitleFlag
														) === category
												);

												if (categoryRows.length === 0) return null;

												const getCategoryInfo = (cat: string) => {
													switch (cat) {
														case "Assets":
															return {
																icon: "🏦",
																desc: "ASSETS",
															};
														case "Expenditure":
															return {
																icon: "💸",
																desc: "EXPENDITURE",
															};
														case "Liabilities":
															return {
																icon: "📋",
																desc: "LIABILITIES",
															};
														case "Revenue":
															return {
																icon: "💰",
																desc: "REVENUE",
															};
														default:
															return {
																icon: "📊",
																desc: "OTHER - Miscellaneous accounts",
															};
													}
												};

												const categoryInfo =
													getCategoryInfo(category);

												return (
													<React.Fragment key={category}>
														<tr className="bg-gradient-to-r from-gray-100 to-gray-200 border-t-2 border-b-2 border-[#7A0000]">
															<td
																colSpan={costCenters.length + 3}
																className="px-3 py-2 font-bold text-center text-[#7A0000] text-sm"
															>
																<div className="flex items-center justify-center gap-2">
																	<span className="text-lg">
																		{categoryInfo.icon}
																	</span>
																	<span>
																		{categoryInfo.desc}
																	</span>
																</div>
															</td>
														</tr>

														{categoryRows.map((row, index) => {
															const total = costCenters.reduce(
																(sum, cc) =>
																	sum +
																	(row.balances[cc] || 0),
																0
															);
															return (
																<tr
																	key={`${category}-${index}`}
																	className="border-b hover:bg-gray-50"
																>
																	<td className="px-2 py-1 font-mono sticky left-0 bg-white">
																		{row.AccountCode}
																	</td>
																	<td className="px-2 py-1 sticky left-0 bg-white">
																		{row.AccountName}
																	</td>
																	{costCenters.map((cc) => (
																		<td
																			key={cc}
																			className="px-2 py-1 text-right font-mono"
																		>
																			{formatNumber(
																				row.balances[cc] ||
																					null
																			)}
																		</td>
																	))}
																	<td className="px-2 py-1 text-right font-mono">
																		{formatNumber(total)}
																	</td>
																</tr>
															);
														})}

														<tr className="bg-gradient-to-r from-gray-200 to-gray-300 font-bold border-t-2 border-[#7A0000]">
															<td className="px-2 py-1 sticky left-0 bg-gray-200"></td>
															<td className="px-2 py-1 sticky left-0 bg-gray-200 text-[#7A0000]">
																<div className="flex items-center gap-1">
																	<span className="text-sm">
																		{categoryInfo.icon}
																	</span>
																	<span>
																		TOTAL 
																		{category.toUpperCase()}
																	</span>
																</div>
															</td>
															{costCenters.map((cc) => (
																<td
																	key={cc}
																	className="px-2 py-1 text-right font-mono"
																>
																	{formatNumber(
																		categoryTotals[category][
																			cc
																		]
																	)}
																</td>
															))}
															<td className="px-2 py-1 text-right font-mono">
																{formatNumber(
																	categoryTotals[category][
																		"total"
																	]
																)}
															</td>
														</tr>
													</React.Fragment>
												);
											})}

											<tr className="border-t-2 border-gray-800 bg-gray-200 font-bold">
												<td className="px-2 py-1 sticky left-0 bg-gray-200"></td>
												<td className="px-2 py-1 sticky left-0 bg-gray-200">
													GRAND TOTAL
												</td>
												{costCenters.map((cc) => {
													const ccTotal = Object.values(
														categoryTotals
													).reduce(
														(sum, cat) => sum + (cat[cc] || 0),
														0
													);
													return (
														<td
															key={cc}
															className="px-2 py-1 text-right font-mono"
														>
															{formatNumber(ccTotal)}
														</td>
													);
												})}
												<td className="px-2 py-1 text-right font-mono">
													{formatNumber(
														Object.values(categoryTotals).reduce(
															(sum, cat) =>
																sum + (cat["total"] || 0),
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
			<CompanyTable />
			<TrialBalanceModal />
		</div>
	);
};

export default ProvintionalWiseTrial;
