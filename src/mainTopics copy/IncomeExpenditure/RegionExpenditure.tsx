import React, {useEffect, useState, Fragment, useMemo} from "react";
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
	CompName: string;
	CostCtr: string;
}

const RegionExpenditure: React.FC = () => {
	// Get user from context
	const {user} = useUser();

	// Main state
	const [companies, setCompanies] = useState<Company[]>([]);
	const [searchId, setSearchId] = useState("");
	const [searchName, setSearchName] = useState("");
	const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [page, setPage] = useState(1);
	const pageSize = 9;

	// Selection state
	const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
	const [selectedYear, setSelectedYear] = useState<number | null>(null); // Changed to null
	const [selectedMonth, setSelectedMonth] = useState<number | null>(null); // Changed to null

	// Income/Expenditure modal state
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
	const months = Array.from({length: 13}, (_, i) => i + 1); // 1-13 for 13th period

	// Dropdown state
	const [yearDropdownOpen, setYearDropdownOpen] = useState(false);
	const [monthDropdownOpen, setMonthDropdownOpen] = useState(false);

	// Paginated companies
	const paginatedCompanies = filteredCompanies.slice(
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
		const fetchCompanies = async () => {
			// Don't fetch if no EPF number
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
				} else {
					rawData = [];
				}

				const companiesData: Company[] = rawData.map((item: any) => ({
					compId: item.CompId,
					CompName: item.CompName,
				}));

				setCompanies(companiesData);
				setFilteredCompanies(companiesData);
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
		fetchCompanies();
	}, [epfNo]);

	// Filter companies
	useEffect(() => {
		const filtered = companies.filter(
			(c) =>
				(!searchId ||
					c.compId.toLowerCase().includes(searchId.toLowerCase())) &&
				(!searchName ||
					c.CompName.toLowerCase().includes(searchName.toLowerCase()))
		);
		setFilteredCompanies(filtered);
		setPage(1);
	}, [searchId, searchName, companies]);

	// Fetch income & expenditure data
	const fetchIncomeExpenditureData = async (company?: Company) => {
		const targetCompany = company || selectedCompany;
		if (!targetCompany || selectedYear === null || selectedMonth === null)
			return;

		setIncomeExpLoading(true);
		setIncomeExpError(null);
		try {
			const apiUrl = `/misapi/api/incomeexpenditureregion/${targetCompany.compId}/${selectedYear}/${selectedMonth}`;

			const response = await fetch(apiUrl, {
				credentials: "include",
				headers: {Accept: "application/json"},
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

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
			let dataArray: IncomeExpenditureData[] = [];

			if (Array.isArray(jsonData)) {
				dataArray = jsonData;
			} else if (jsonData.data && Array.isArray(jsonData.data)) {
				dataArray = jsonData.data;
			} else if (jsonData.result && Array.isArray(jsonData.result)) {
				dataArray = jsonData.result;
			} else if (jsonData.TitleCd) {
				dataArray = [jsonData];
			}

			setIncomeExpData(dataArray);
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
		// Only proceed if both year and month are selected
		if (selectedYear === null || selectedMonth === null) return;
		setSelectedCompany(company);
		// Auto fetch income & expenditure data when company is selected
		fetchIncomeExpenditureData(company);
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
		if (monthNum === 13) return "13th Period";
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

	// Format number function
	const formatNumber = (num: number): string => {
		if (isNaN(num)) return "0.00";
		const formatted = new Intl.NumberFormat("en-US", {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}).format(Math.abs(num));
		return num < 0 ? `(${formatted})` : formatted;
	};

	// Custom Dropdown Components
	const YearDropdown = () => (
		<div className="year-dropdown relative w-40">
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
				<div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-48 overflow-y-auto">
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
		<div className="month-dropdown relative w-40">
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
				<div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-48 overflow-y-auto">
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

	// Calculate totals by category
	const calculateTotals = () => {
		const incomeTotal = incomeExpData
			.filter((item) => item.CatFlag === "I")
			.reduce((sum, item) => sum + (item.Actual || 0), 0);

		const expenditureTotal = incomeExpData
			.filter((item) => item.CatFlag === "X")
			.reduce((sum, item) => sum + (item.Actual || 0), 0);

		return {
			incomeTotal,
			expenditureTotal,
			netTotal: incomeTotal - expenditureTotal,
		};
	};

	// Escape CSV field function
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

	// Download as CSV function
	const downloadAsCSV = () => {
		if (!incomeExpData || incomeExpData.length === 0) return;

		// Transform data
		const excelData = (() => {
			const result: any = {income: {}, expenditure: {}};

			incomeExpData.forEach((item) => {
				const section = item.CatFlag === "I" ? "income" : "expenditure";
				const catCode = item.CatCode?.trim() || "UNCATEGORIZED";
				const account = item.Account?.trim() || "";
				const costCenter = item.CostCtr?.trim() || "DEFAULT";

				if (!result[section][catCode])
					result[section][catCode] = {accounts: {}};
				if (!result[section][catCode].accounts[account]) {
					result[section][catCode].accounts[account] = {
						description: item.CatName?.trim() || "",
						values: {},
						total: 0,
					};
				}
				result[section][catCode].accounts[account].values[costCenter] =
					item.Actual || 0;
				result[section][catCode].accounts[account].total +=
					item.Actual || 0;
			});
			return result;
		})();

		const uniqueCostCenters = Array.from(
			new Set(incomeExpData.map((i) => i.CostCtr?.trim()).filter(Boolean))
		).sort();

		const rows: string[] = [];

		// Report Header
		rows.push(`"Income & Expenditure Report - Region Wise"`);
		rows.push(
			`"Company: ${selectedCompany?.CompName || "N/A"} (${
				selectedCompany?.compId || "N/A"
			})"`
		);
		rows.push(
			`"Period: ${getMonthName(selectedMonth)} ${selectedYear || "N/A"}"`
		);
		rows.push(
			`"Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}"`
		);
		rows.push("");

		// Table Header (Account Code first!)
		const header = [
			"Account Code",
			"Category",
			"Sub Category",
			...uniqueCostCenters,
			"Company Total",
		];
		rows.push(header.map(escapeCSVField).join(","));

		const emptyRow = Array(header.length).fill('""').join(",");

		// Helper to add a row
		const addRow = (
			accCode: string,
			category: string,
			subCat: string,
			values: number[],
			total: number
		) => {
			const row = [
				`"${accCode}"`,
				`"${category}"`,
				`"${subCat}"`,
				...values.map((v) => escapeCSVField(formatNumber(v))),
				escapeCSVField(formatNumber(total)),
			];
			rows.push(row.join(","));
		};

		// === INCOME SECTION ===
		Object.entries(excelData.income).forEach(
			([catCode, categoryData]: [string, any]) => {
				// Individual account lines
				Object.entries(categoryData.accounts).forEach(
					([accountCode, accData]: [string, any]) => {
						const values = uniqueCostCenters.map(
							(cc) => accData.values[cc] || 0
						);
						addRow(
							accountCode,
							"INCOME",
							accData.description,
							values,
							accData.total
						);
					}
				);

				// Sub-total for this category
				const catTotal = Object.values(categoryData.accounts).reduce(
					(s: number, a: any) => s + a.total,
					0
				);
				addRow(
					`SUB TOTAL OF - ${catCode}`,
					"INCOME",
					"",
					uniqueCostCenters.map(() => 0),
					catTotal
				);

				rows.push(emptyRow); // Empty row after sub-total
			}
		);

		// Total Income
		const totalIncome = Object.values(excelData.income).reduce(
			(sum: number, cat: any) =>
				sum +
				Object.values(cat.accounts).reduce(
					(s: number, a: any) => s + a.total,
					0
				),
			0
		);
		addRow(
			"Total :Income",
			"INCOME",
			"",
			uniqueCostCenters.map(() => 0),
			totalIncome
		);
		rows.push(emptyRow);

		// === EXPENDITURE SECTION ===
		Object.entries(excelData.expenditure).forEach(
			([catCode, categoryData]: [string, any]) => {
				Object.entries(categoryData.accounts).forEach(
					([accountCode, accData]: [string, any]) => {
						const values = uniqueCostCenters.map(
							(cc) => accData.values[cc] || 0
						);
						addRow(
							accountCode,
							"EXPENDITURE",
							accData.description,
							values,
							accData.total
						);
					}
				);

				const catTotal = Object.values(categoryData.accounts).reduce(
					(s: number, a: any) => s + a.total,
					0
				);
				addRow(
					`SUB TOTAL OF - ${catCode}`,
					"EXPENDITURE",
					"",
					uniqueCostCenters.map(() => 0),
					catTotal
				);

				rows.push(emptyRow); // Empty row after sub-total
			}
		);

		// Total Expenditure
		const totalExpenditure = Object.values(excelData.expenditure).reduce(
			(sum: number, cat: any) =>
				sum +
				Object.values(cat.accounts).reduce(
					(s: number, a: any) => s + a.total,
					0
				),
			0
		);
		addRow(
			"Total :Expenditure",
			"EXPENDITURE",
			"",
			uniqueCostCenters.map(() => 0),
			totalExpenditure
		);
		rows.push(emptyRow);

		// Net Result
		const netTotal = totalIncome - totalExpenditure;
		addRow(
			"Income Over Expenditure",
			"INCOME OVER EXPENDITURE",
			"",
			uniqueCostCenters.map(() => 0),
			netTotal
		);

		// Footer
		rows.push("");
		rows.push('"For technical support, contact IT Department"');

		// Trigger download
		const csvContent = rows.join("\n");
		const blob = new Blob([csvContent], {type: "text/csv;charset=utf-8;"});
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `RegionIncomeExpenditure_${
			selectedCompany?.compId
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

		// Transform data to Excel format
		const transformDataToExcelFormat = () => {
			const result: any = {
				income: {},
				expenditure: {},
			};

			incomeExpData.forEach((item) => {
				const category = item.CatFlag === "I" ? "income" : "expenditure";
				const catCode = item.CatCode?.trim() || "UNCATEGORIZED";
				const account = item.Account?.trim() || "";
				const costCenter = item.CostCtr?.trim() || "DEFAULT";

				if (!result[category][catCode]) {
					result[category][catCode] = {
						accounts: {},
						description: catCode,
					};
				}

				if (!result[category][catCode].accounts[account]) {
					result[category][catCode].accounts[account] = {
						description: item.CatName?.trim() || "",
						values: {},
						total: 0,
					};
				}

				result[category][catCode].accounts[account].values[costCenter] =
					item.Actual || 0;
				result[category][catCode].accounts[account].total +=
					item.Actual || 0;
			});

			return result;
		};

		const excelData = transformDataToExcelFormat();

		// Get unique cost centers
		const uniqueCostCenters = Array.from(
			new Set(
				incomeExpData.map((item) => item.CostCtr?.trim()).filter(Boolean)
			)
		).sort();

		// Generate table rows HTML
		let tableRowsHTML = "";

		// Income section
		tableRowsHTML += `
      <tr class="category-header">
        <td colspan="${
				uniqueCostCenters.length + 4
			}" style="text-align: center; font-weight: bold; color: #7A0000; ">INCOME</td>
      </tr>
    `;

		Object.entries(excelData.income).forEach(
			([catCode, categoryData]: [string, any]) => {
				// Category header
				tableRowsHTML += `
        <tr>
          <td colspan="${
					uniqueCostCenters.length + 4
				}" style="padding: 6px; border: 1px solid #ddd; font-weight: bold; background-color: #f5f5f5;">${catCode}</td>
        </tr>
      `;

				// Account rows
				Object.entries(categoryData.accounts).forEach(
					([accountCode, accountData]: [string, any]) => {
						tableRowsHTML += `
          <tr>
            <td style="padding: 6px; border: 1px solid #ddd;"></td>
            <td style="padding: 6px; border: 1px solid #ddd; font-family: monospace;">${accountCode}</td>
            <td style="padding: 6px; border: 1px solid #ddd;">${accountData.description}</td>
        `;

						// Add values for each cost center
						uniqueCostCenters.forEach((costCenter) => {
							tableRowsHTML += `<td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-family: monospace;">${formatNumber(
								accountData.values[costCenter] || 0
							)}</td>`;
						});

						// Add account total
						tableRowsHTML += `<td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-family: monospace; font-weight: bold; background-color: #f9f9f9;">${formatNumber(
							accountData.total
						)}</td>`;

						tableRowsHTML += `</tr>`;
					}
				);

				// Category subtotal
				const categoryTotal = Object.values(categoryData.accounts).reduce(
					(sum: number, account: any) => sum + account.total,
					0
				);

				tableRowsHTML += `
        <tr>
          <td colspan="3" style="padding: 6px; border: 1px solid #ddd; font-weight: bold; background-color: #e6f3ff;">SUB TOTAL OF - ${catCode}</td>
      `;

				// Add empty cells for cost centers
				uniqueCostCenters.forEach(() => {
					tableRowsHTML += `<td style="padding: 6px; border: 1px solid #ddd; background-color: #e6f3ff;"></td>`;
				});

				tableRowsHTML += `<td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-family: monospace; background-color: #e6f3ff; font-weight: bold;">${formatNumber(
					categoryTotal
				)}</td>`;
				tableRowsHTML += `</tr>`;
			}
		);

		// Income total
		const incomeTotal = Object.values(excelData.income).reduce(
			(sum: number, category: any) => {
				return (
					sum +
					Object.values(category.accounts).reduce(
						(accSum: number, account: any) => accSum + account.total,
						0
					)
				);
			},
			0
		);

		tableRowsHTML += `
      <tr class="category-total">
        <td colspan="3" style="padding: 6px; border: 1px solid #ddd; color: #7A0000;  font-weight: bold;">Total :Income</td>
    `;

		// Add empty cells for cost centers
		uniqueCostCenters.forEach(() => {
			tableRowsHTML += `<td style="padding: 6px; border: 1px solid #ddd; background-color: #7A0000;"></td>`;
		});

		tableRowsHTML += `<td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-family: monospace; background-color: #7A0000;  font-weight: bold; color:black;">${formatNumber(
			incomeTotal
		)}</td>`;
		tableRowsHTML += `</tr>`;

		// Expenditure section
		tableRowsHTML += `
      <tr class="category-header">
        <td colspan="${
				uniqueCostCenters.length + 4
			}" style="text-align: center; font-weight: bold; background-color: #f5f5f5; color: #7A0000;">EXPENDITURE</td>
      </tr>
    `;

		Object.entries(excelData.expenditure).forEach(
			([catCode, categoryData]: [string, any]) => {
				// Category header
				tableRowsHTML += `
        <tr>
          <td colspan="${
					uniqueCostCenters.length + 4
				}" style="padding: 6px; border: 1px solid #ddd; font-weight: bold; background-color: #f5f5f5;">${catCode}</td>
        </tr>
      `;

				// Account rows
				Object.entries(categoryData.accounts).forEach(
					([accountCode, accountData]: [string, any]) => {
						tableRowsHTML += `
          <tr>
            <td style="padding: 6px; border: 1px solid #ddd;"></td>
            <td style="padding: 6px; border: 1px solid #ddd; font-family: monospace;">${accountCode}</td>
            <td style="padding: 6px; border: 1px solid #ddd;">${accountData.description}</td>
        `;

						// Add values for each cost center
						uniqueCostCenters.forEach((costCenter) => {
							tableRowsHTML += `<td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-family: monospace;">${formatNumber(
								accountData.values[costCenter] || 0
							)}</td>`;
						});

						// Add account total
						tableRowsHTML += `<td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-family: monospace; font-weight: bold; background-color: #f9f9f9;">${formatNumber(
							accountData.total
						)}</td>`;

						tableRowsHTML += `</tr>`;
					}
				);

				// Category subtotal
				const categoryTotal = Object.values(categoryData.accounts).reduce(
					(sum: number, account: any) => sum + account.total,
					0
				);

				tableRowsHTML += `
        <tr>
          <td colspan="3" style="padding: 6px; border: 1px solid #ddd; font-weight: bold; background-color: #e6f3ff;">SUB TOTAL OF - ${catCode}</td>
      `;

				// Add empty cells for cost centers
				uniqueCostCenters.forEach(() => {
					tableRowsHTML += `<td style="padding: 6px; border: 1px solid #ddd; background-color: #e6f3ff;"></td>`;
				});

				tableRowsHTML += `<td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-family: monospace; background-color: #e6f3ff; font-weight: bold;">${formatNumber(
					categoryTotal
				)}</td>`;
				tableRowsHTML += `</tr>`;
			}
		);

		// Expenditure total
		const expenditureTotal = Object.values(excelData.expenditure).reduce(
			(sum: number, category: any) => {
				return (
					sum +
					Object.values(category.accounts).reduce(
						(accSum: number, account: any) => accSum + account.total,
						0
					)
				);
			},
			0
		);

		tableRowsHTML += `
      <tr class="category-total">
        <td colspan="3" style="padding: 6px; border: 1px solid #ddd; color: #7A0000; font-weight: bold;">Total :Expenditure</td>
    `;

		// Add empty cells for cost centers
		uniqueCostCenters.forEach(() => {
			tableRowsHTML += `<td style="padding: 6px; border: 1px solid #ddd;"></td>`;
		});

		tableRowsHTML += `<td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-family: monospace; background-color: #f5f5f5; font-weight: bold; color:black;">${formatNumber(
			expenditureTotal
		)}</td>`;
		tableRowsHTML += `</tr>`;

		// Net total
		const netTotal = incomeTotal - expenditureTotal;
		tableRowsHTML += `
      <tr style="color:#7A0000; color: white; font-weight: bold;">
        <td colspan="3" style="padding: 8px; border: 1px solid #7A0000; color:#7A0000;">Income Over Expenditure</td>
    `;

		// Add empty cells for cost centers
		uniqueCostCenters.forEach(() => {
			tableRowsHTML += `<td style="padding: 8px; border: 1px solid #7A0000; color:#7A0000;"></td>`;
		});

		tableRowsHTML += `<td style="padding: 8px; border: 1px solid #7A0000; text-align: right; font-family: monospace; color:#7A0000;">${formatNumber(
			netTotal
		)}</td>`;
		tableRowsHTML += `</tr>`;

		// Create the HTML content for printing
		const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Region Income & Expenditure - ${getMonthName(selectedMonth)} ${
			selectedYear || "N/A"
		}</title>
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
            background-color: #f5f5f5;
            color: #333;
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
            background-color: #7A0000;
            color: white;
          }
          
          .category-total td {
            background-color: #7A0000;
            color: white;
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
          <h1>Consolidated Income & Expenditure Regional Statement - Period Ended Of ${getMonthName(
					selectedMonth
				)} / ${selectedYear || "N/A"}</h1>
          <h2>Company: ${selectedCompany?.compId} / ${
			selectedCompany?.CompName
		}</h2>
        </div>
        
        <table>
          <thead>
            <tr>
              <th style="width: 5%;"></th>
              <th style="width: 10%;"></th>
              <th style="width: 25%;">ACCOUNTS</th>
              ${uniqueCostCenters
						.map((cc) => `<th style="width: 8%;">${cc}</th>`)
						.join("")}
              <th style="width: 10%;">Company Total</th>
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
		if (!incomeExpModalOpen || !selectedCompany) return null;

		// Transform the flat API data into hierarchical structure like Excel
		const transformDataToExcelFormat = () => {
			const result: any = {
				income: {},
				expenditure: {},
			};

			// Process all data items
			incomeExpData.forEach((item) => {
				const category = item.CatFlag === "I" ? "income" : "expenditure";
				const catCode = item.CatCode?.trim() || "UNCATEGORIZED";
				const account = item.Account?.trim() || "";
				const costCenter = item.CostCtr?.trim() || "DEFAULT";

				// Initialize category if not exists
				if (!result[category][catCode]) {
					result[category][catCode] = {
						accounts: {},
						description: catCode,
					};
				}

				// Initialize account if not exists
				if (!result[category][catCode].accounts[account]) {
					result[category][catCode].accounts[account] = {
						description: item.CatName?.trim() || "",
						values: {},
						total: 0,
					};
				}

				// Add value for this cost center
				result[category][catCode].accounts[account].values[costCenter] =
					item.Actual || 0;
				result[category][catCode].accounts[account].total +=
					item.Actual || 0;
			});

			return result;
		};

		const excelData = transformDataToExcelFormat();
		const {incomeTotal, expenditureTotal, netTotal} = calculateTotals();

		// Get all unique cost centers for column headers
		const uniqueCostCenters = useMemo(() => {
			const centers = new Set<string>();
			incomeExpData.forEach((item) => {
				if (item.CostCtr?.trim()) {
					centers.add(item.CostCtr.trim());
				}
			});
			return Array.from(centers).sort();
		}, [incomeExpData]);

		return (
			<div className="fixed inset-0 bg-white flex items-start justify-end z-50 pt-24 pb-8 pl-64">
				<div className="bg-white w-full max-w-7xl rounded-lg shadow-lg border border-gray-300 max-h-[85vh] flex flex-col mr-4">
					<div className="p-5 border-b">
						<div className="flex justify-between items-start">
							<div className="space-y-1">
								<h2 className="text-base font-bold text-gray-800">
									Consolidated Income & Expenditure Regional Statement
									- Period Ended Of {getMonthName(selectedMonth)} /{" "}
									{selectedYear || "N/A"}
								</h2>
								<h3 className={`text-sm ${maroon}`}>
									Company: {selectedCompany.compId} /{" "}
									{selectedCompany.CompName}
								</h3>
								<p className="text-xs text-gray-600">Currency: LKR</p>
							</div>
						</div>
						{incomeExpError && (
							<div className="text-red-600 text-xs mt-2 text-center">
								{incomeExpError}
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
									We couldn't find any consolidated income or
									expenditure records for{" "}
									<strong>{selectedCompany.CompName}</strong> in{" "}
									{getMonthName(selectedMonth)} {selectedYear || "N/A"}
									.
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
									{/* Table Header */}
									<table className="w-full border-collapse">
										<thead>
											<tr>
												<th
													className="px-2 py-1 text-left w-[5%] border border-gray-300 text-gray-800"
													style={{backgroundColor: "#D3D3D3"}}
												></th>
												<th
													className="px-2 py-1 text-left w-[10%] border border-gray-300 text-gray-800"
													style={{backgroundColor: "#D3D3D3"}}
												></th>
												<th
													className="px-2 py-1 text-left w-[25%] border border-gray-300 text-gray-800"
													style={{backgroundColor: "#D3D3D3"}}
												>
													ACCOUNTS
												</th>
												<th
													className="px-2 py-1 text-left w-[10%] border border-gray-300 text-gray-800"
													style={{backgroundColor: "#D3D3D3"}}
												></th>
												{uniqueCostCenters.map((costCenter) => (
													<th
														key={costCenter}
														className="px-2 py-1 text-center w-[8%] border border-gray-300 text-gray-800 font-bold"
														style={{backgroundColor: "#D3D3D3"}}
													>
														{costCenter}
													</th>
												))}
												<th
													className="px-2 py-1 text-center w-[10%] border border-gray-300 text-gray-800 font-bold"
													style={{backgroundColor: "#D3D3D3"}}
												>
													Company Total
												</th>
											</tr>
										</thead>

										<tbody>
											{/* INCOME SECTION */}
											<tr className="bg-[#7A0000] text-white">
												<td
													colSpan={
														3 + uniqueCostCenters.length + 1
													}
													className="px-2 py-1 text-center font-bold"
												>
													INCOME
												</td>
											</tr>

											{/* Process Income Categories */}
											{Object.entries(excelData.income).map(
												([catCode, categoryData]: [
													string,
													any
												]) => (
													<Fragment key={`income-${catCode}`}>
														{/* Category Header Row */}
														<tr>
															<td className="px-2 py-1 border border-gray-300"></td>
															<td className="px-2 py-1 border border-gray-300"></td>
															<td
																colSpan={
																	2 +
																	uniqueCostCenters.length +
																	1
																}
																className="px-2 py-1 border border-gray-300 font-bold bg-gray-50"
															>
																{catCode}
															</td>
														</tr>

														{/* Account Rows */}
														{Object.entries(
															categoryData.accounts
														).map(
															([accountCode, accountData]: [
																string,
																any
															]) => (
																<tr
																	key={`income-${catCode}-${accountCode}`}
																	className="hover:bg-gray-50"
																>
																	<td className="px-2 py-1 border border-gray-300"></td>
																	<td className="px-2 py-1 border border-gray-300 font-mono">
																		{accountCode}
																	</td>
																	<td
																		colSpan={2}
																		className="px-2 py-1 border border-gray-300"
																	>
																		{accountData.description}
																	</td>

																	{/* Cost Center Values */}
																	{uniqueCostCenters.map(
																		(costCenter) => (
																			<td
																				key={costCenter}
																				className="px-2 py-1 border border-gray-300 text-right font-mono"
																			>
																				{formatNumber(
																					accountData
																						.values[
																						costCenter
																					] || 0
																				)}
																			</td>
																		)
																	)}

																	{/* Account Total */}
																	<td className="px-2 py-1 border border-gray-300 text-right font-mono font-bold bg-gray-100">
																		{formatNumber(
																			accountData.total
																		)}
																	</td>
																</tr>
															)
														)}

														{/* Category Subtotal */}
														<tr className="bg-blue-50">
															<td
																colSpan={3}
																className="px-2 py-1 border border-gray-300 font-bold"
															>
																SUB TOTAL OF - {catCode}
															</td>
															<td className="px-2 py-1 border border-gray-300"></td>

															{/* Cost Center Subtotals */}
															{uniqueCostCenters.map(
																(costCenter) => {
																	const subtotal =
																		Object.values(
																			categoryData.accounts
																		).reduce(
																			(
																				sum: number,
																				account: any
																			) =>
																				sum +
																				(account.values[
																					costCenter
																				] || 0),
																			0
																		);
																	return (
																		<td
																			key={costCenter}
																			className="px-2 py-1 border border-gray-300 text-right font-mono font-bold"
																		>
																			{formatNumber(
																				subtotal
																			)}
																		</td>
																	);
																}
															)}

															{/* Category Total */}
															<td className="px-2 py-1 border border-gray-300 text-right font-mono font-bold">
																{formatNumber(
																	Object.values(
																		categoryData.accounts
																	).reduce(
																		(
																			sum: number,
																			account: any
																		) => sum + account.total,
																		0
																	)
																)}
															</td>
														</tr>
													</Fragment>
												)
											)}

											{/* Total Income */}
											<tr className="bg-[#7A0000] text-white">
												<td
													colSpan={3}
													className="px-2 py-1 border border-gray-300 font-bold"
												>
													Total :Income
												</td>
												<td className="px-2 py-1 border border-gray-300"></td>

												{/* Cost Center Income Totals */}
												{uniqueCostCenters.map((costCenter) => {
													const costCenterTotal = Object.values(
														excelData.income
													).reduce(
														(sum: number, category: any) => {
															return (
																sum +
																Object.values(
																	category.accounts
																).reduce(
																	(
																		accSum: number,
																		account: any
																	) =>
																		accSum +
																		(account.values[
																			costCenter
																		] || 0),
																	0
																)
															);
														},
														0
													);
													return (
														<td
															key={costCenter}
															className="px-2 py-1 border border-gray-300 text-right font-mono font-bold"
														>
															{formatNumber(costCenterTotal)}
														</td>
													);
												})}

												{/* Grand Total Income */}
												<td className="px-2 py-1 border border-gray-300 text-right font-mono font-bold">
													{formatNumber(incomeTotal)}
												</td>
											</tr>

											{/* EXPENDITURE SECTION */}
											<tr className="bg-gray-200">
												<td
													colSpan={
														3 + uniqueCostCenters.length + 1
													}
													className="px-2 py-1 text-center font-bold"
												>
													EXPENDITURE
												</td>
											</tr>

											{/* Process Expenditure Categories */}
											{Object.entries(excelData.expenditure).map(
												([catCode, categoryData]: [
													string,
													any
												]) => (
													<Fragment key={`expenditure-${catCode}`}>
														{/* Category Header Row */}
														<tr>
															<td className="px-2 py-1 border border-gray-300"></td>
															<td className="px-2 py-1 border border-gray-300"></td>
															<td
																colSpan={
																	2 +
																	uniqueCostCenters.length +
																	1
																}
																className="px-2 py-1 border border-gray-300 font-bold bg-gray-50"
															>
																{catCode}
															</td>
														</tr>

														{/* Account Rows */}
														{Object.entries(
															categoryData.accounts
														).map(
															([accountCode, accountData]: [
																string,
																any
															]) => (
																<tr
																	key={`expenditure-${catCode}-${accountCode}`}
																	className="hover:bg-gray-50"
																>
																	<td className="px-2 py-1 border border-gray-300"></td>
																	<td className="px-2 py-1 border border-gray-300 font-mono">
																		{accountCode}
																	</td>
																	<td
																		colSpan={2}
																		className="px-2 py-1 border border-gray-300"
																	>
																		{accountData.description}
																	</td>

																	{/* Cost Center Values */}
																	{uniqueCostCenters.map(
																		(costCenter) => (
																			<td
																				key={costCenter}
																				className="px-2 py-1 border border-gray-300 text-right font-mono"
																			>
																				{formatNumber(
																					accountData
																						.values[
																						costCenter
																					] || 0
																				)}
																			</td>
																		)
																	)}

																	{/* Account Total */}
																	<td className="px-2 py-1 border border-gray-300 text-right font-mono font-bold bg-gray-100">
																		{formatNumber(
																			accountData.total
																		)}
																	</td>
																</tr>
															)
														)}

														{/* Category Subtotal */}
														<tr className="bg-blue-50">
															<td
																colSpan={3}
																className="px-2 py-1 border border-gray-300 font-bold"
															>
																SUB TOTAL OF - {catCode}
															</td>
															<td className="px-2 py-1 border border-gray-300"></td>

															{/* Cost Center Subtotals */}
															{uniqueCostCenters.map(
																(costCenter) => {
																	const subtotal =
																		Object.values(
																			categoryData.accounts
																		).reduce(
																			(
																				sum: number,
																				account: any
																			) =>
																				sum +
																				(account.values[
																					costCenter
																				] || 0),
																			0
																		);
																	return (
																		<td
																			key={costCenter}
																			className="px-2 py-1 border border-gray-300 text-right font-mono font-bold"
																		>
																			{formatNumber(
																				subtotal
																			)}
																		</td>
																	);
																}
															)}

															{/* Category Total */}
															<td className="px-2 py-1 border border-gray-300 text-right font-mono font-bold">
																{formatNumber(
																	Object.values(
																		categoryData.accounts
																	).reduce(
																		(
																			sum: number,
																			account: any
																		) => sum + account.total,
																		0
																	)
																)}
															</td>
														</tr>
													</Fragment>
												)
											)}

											{/* Total Expenditure */}
											<tr className="bg-gray-200">
												<td
													colSpan={3}
													className="px-2 py-1 border border-gray-300 font-bold"
												>
													Total :Expenditure
												</td>
												<td className="px-2 py-1 border border-gray-300"></td>

												{/* Cost Center Expenditure Totals */}
												{uniqueCostCenters.map((costCenter) => {
													const costCenterTotal = Object.values(
														excelData.expenditure
													).reduce(
														(sum: number, category: any) => {
															return (
																sum +
																Object.values(
																	category.accounts
																).reduce(
																	(
																		accSum: number,
																		account: any
																	) =>
																		accSum +
																		(account.values[
																			costCenter
																		] || 0),
																	0
																)
															);
														},
														0
													);
													return (
														<td
															key={costCenter}
															className="px-2 py-1 border border-gray-300 text-right font-mono font-bold"
														>
															{formatNumber(costCenterTotal)}
														</td>
													);
												})}

												{/* Grand Total Expenditure */}
												<td className="px-2 py-1 border border-gray-300 text-right font-mono font-bold">
													{formatNumber(expenditureTotal)}
												</td>
											</tr>

											{/* NET TOTAL */}
											<tr className="bg-[#7A0000] text-white">
												<td
													colSpan={3}
													className="px-2 py-1 border border-gray-300 font-bold"
												>
													Income Over Expenditure
												</td>
												<td className="px-2 py-1 border border-gray-300"></td>

												{/* Cost Center Net Totals */}
												{uniqueCostCenters.map((costCenter) => {
													const incomeTotal = Object.values(
														excelData.income
													).reduce(
														(sum: number, category: any) => {
															return (
																sum +
																Object.values(
																	category.accounts
																).reduce(
																	(
																		accSum: number,
																		account: any
																	) =>
																		accSum +
																		(account.values[
																			costCenter
																		] || 0),
																	0
																)
															);
														},
														0
													);

													const expenditureTotal = Object.values(
														excelData.expenditure
													).reduce(
														(sum: number, category: any) => {
															return (
																sum +
																Object.values(
																	category.accounts
																).reduce(
																	(
																		accSum: number,
																		account: any
																	) =>
																		accSum +
																		(account.values[
																			costCenter
																		] || 0),
																	0
																)
															);
														},
														0
													);

													return (
														<td
															key={costCenter}
															className="px-2 py-1 border border-gray-300 text-right font-mono font-bold"
														>
															{formatNumber(
																incomeTotal - expenditureTotal
															)}
														</td>
													);
												})}

												{/* Grand Net Total */}
												<td className="px-2 py-1 border border-gray-300 text-right font-mono font-bold">
													{formatNumber(netTotal)}
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
						Region Income & Expenditure Report
					</h2>
				</div>
			</div>

			{/* Search Controls */}
			<div className="flex flex-wrap gap-3 items-end mb-4">
				<div>
					<label className="block text-xs font-medium text-gray-700 mb-1">
						Search by Code
					</label>
					<div className="relative">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
						<input
							type="text"
							value={searchId}
							placeholder="Code"
							onChange={(e) => setSearchId(e.target.value)}
							className="pl-8 pr-3 py-1.5 w-40 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A0000] transition text-sm"
							autoComplete="off"
						/>
					</div>
				</div>
				<div>
					<label className="block text-xs font-medium text-gray-700 mb-1">
						Search by Name
					</label>
					<div className="relative">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
						<input
							type="text"
							value={searchName}
							placeholder="Name"
							onChange={(e) => setSearchName(e.target.value)}
							className="pl-8 pr-3 py-1.5 w-40 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A0000] transition text-sm"
							autoComplete="off"
						/>
					</div>
				</div>

				{/* Year Dropdown */}
				<YearDropdown />

				{/* Month Dropdown */}
				<MonthDropdown />

				{/* Clear Filters Button */}
				{(searchId || searchName) && (
					<div>
						<label className="block text-xs font-medium text-gray-700 mb-1">
							&nbsp;
						</label>
						<button
							onClick={clearFilters}
							className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm"
						>
							<RotateCcw className="w-3 h-3" /> Clear
						</button>
					</div>
				)}
			</div>

			{/* Loading State */}
			{loading && (
				<div className="text-center py-8">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7A0000] mx-auto"></div>
					<p className="mt-2 text-gray-600">Loading companies...</p>
				</div>
			)}

			{/* Error State */}
			{error && (
				<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
					Error: {error}
				</div>
			)}

			{/* No Results */}
			{!loading && !error && filteredCompanies.length === 0 && (
				<div className="text-gray-600 bg-gray-100 p-4 rounded">
					No companies found.
				</div>
			)}

			{/* Table */}
			{!loading && !error && filteredCompanies.length > 0 && (
				<>
					<div className="overflow-x-auto rounded-lg border border-gray-200">
						<div className="max-h-[50vh] overflow-y-auto">
							<table className="w-full table-fixed text-left text-gray-700 text-sm">
								<thead
									className={`${maroonGrad} text-white sticky top-0`}
								>
									<tr>
										<th className="px-4 py-2 w-1/4">Company ID</th>
										<th className="px-4 py-2 w-1/2">Company Name</th>
										<th className="px-4 py-2 w-1/4 text-center">
											Action
										</th>
									</tr>
								</thead>
								<tbody>
									{paginatedCompanies.map((company, i) => (
										<tr
											key={`${company.compId}-${i}`}
											className={`${
												i % 2 ? "bg-white" : "bg-gray-50"
											} ${
												selectedCompany?.compId === company.compId
													? "ring-2 ring-[#7A0000] ring-inset"
													: ""
											}`}
										>
											<td className="px-4 py-2 truncate font-mono">
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
							Page {page} of{" "}
							{Math.ceil(filteredCompanies.length / pageSize)}
						</span>
						<button
							onClick={() =>
								setPage((p) =>
									Math.min(
										Math.ceil(filteredCompanies.length / pageSize),
										p + 1
									)
								)
							}
							disabled={
								page >= Math.ceil(filteredCompanies.length / pageSize)
							}
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

export default RegionExpenditure;
