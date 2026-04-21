import React, {useEffect, useState} from "react";
import {FaSearch, FaSyncAlt, FaEye, FaChevronDown} from "react-icons/fa";
import TrialBalanceModal from "../../components/mainTopics/CostCenterTrial/TrialBalanceModal";
import {useUser} from "../../contexts/UserContext";

interface CostCenter {
	compId: string;
	CompName: string;
}

interface TrialBalanceData {
	AcCd: string;
	GlName: string;
	TitleFlag: string;
	OpSbal: number;
	DrSamt: number;
	CrSamt: number;
	ClSbal: number;
	CctName: string;
}

const CostCenterTrial: React.FC = () => {
	// Get user from context
	const {user} = useUser();

	// Main state
	const [data, setData] = useState<CostCenter[]>([]);
	const [searchId, setSearchId] = useState("");
	const [searchName, setSearchName] = useState("");
	const [filtered, setFiltered] = useState<CostCenter[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [page, setPage] = useState(1);
	const pageSize = 9;

	// Selection state
	const [selectedCostCenter, setSelectedCostCenter] =
		useState<CostCenter | null>(null);

	// Date selection state
	const [selectedYear, setSelectedYear] = useState<number | null>(null);
	const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

	// Dropdown state
	const [yearDropdownOpen, setYearDropdownOpen] = useState(false);
	const [monthDropdownOpen, setMonthDropdownOpen] = useState(false);

	// Trial balance modal state
	const [trialModalOpen, setTrialModalOpen] = useState(false);
	const [trialData, setTrialData] = useState({
		costctr: "",
		year: new Date().getFullYear(),
		month: "January",
		deptName: "",
	});

	// Trial balance table state
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
	const months = Array.from({length: 13}, (_, i) => i + 1); // [1, 2, ..., 13] - Added 13th period

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

	// Fetch cost centers
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

				const txt = await res.text();
				const parsed = JSON.parse(txt);

				// Handle different response structures
				let rawData = [];
				if (Array.isArray(parsed)) {
					rawData = parsed;
				} else if (parsed.data && Array.isArray(parsed.data)) {
					rawData = parsed.data;
				} else if (parsed.result && Array.isArray(parsed.result)) {
					rawData = parsed.result;
				} else if (parsed.CompId) {
					rawData = [parsed];
				}


				const final: CostCenter[] = rawData.map((item: any) => ({
					compId:
						item.CompId ||
						item.compId ||
						item.DeptId ||
						item.deptId ||
						"",
					CompName:
						item.CompName ||
						item.compName ||
						item.DeptName ||
						item.deptName ||
						"",
				}));


				// If no data found, show test data for debugging
				if (final.length === 0) {
					const testData: CostCenter[] = [
						{compId: "TEST001", CompName: "Test Division 1"},
						{compId: "TEST002", CompName: "Test Division 2"},
						{compId: "TEST003", CompName: "Test Division 3"},
					];
					setData(testData);
					setFiltered(testData);
				} else {
					setData(final);
					setFiltered(final);
				}
			} catch (e: any) {
				console.error("Error fetching data:", e);
				setError(e.message);

				// Show test data even on error for debugging
				const testData: CostCenter[] = [
					{compId: "ERROR001", CompName: "Error Test Division 1"},
					{compId: "ERROR002", CompName: "Error Test Division 2"},
				];
				setData(testData);
				setFiltered(testData);
			} finally {
				setLoading(false);
			}
		};
		fetchData();
	}, [epfNo]);

	// Filter cost centers
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

	const paginatedCostCenters = filtered.slice(
		(page - 1) * pageSize,
		page * pageSize
	);

	// Handle cost center selection - Auto fetch data when selected
	const handleCostCenterSelect = (costCenter: CostCenter) => {
		setSelectedCostCenter(costCenter);
		// Auto fetch trial balance data when cost center is selected
		fetchTrialBalanceData(costCenter);
	};

	// Fetch trial balance data
	const fetchTrialBalanceData = async (costCenter?: CostCenter) => {
		const targetCostCenter = costCenter || selectedCostCenter;
		if (!targetCostCenter || !selectedYear || !selectedMonth) return;

		setTrialLoading(true);
		setTrialError(null);
		try {
			const apiUrl = `/misapi/api/trialbalance/${targetCostCenter.compId}/${selectedYear}/${selectedMonth}`;
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
			if (Array.isArray(jsonData)) trialBalanceArray = jsonData;
			else if (jsonData.data && Array.isArray(jsonData.data))
				trialBalanceArray = jsonData.data;
			else if (jsonData.result && Array.isArray(jsonData.result))
				trialBalanceArray = jsonData.result;
			else if (jsonData.AcCd) trialBalanceArray = [jsonData];
			setTrialBalanceData(trialBalanceArray);

			// Set trial data for modal
			setTrialData({
				costctr: targetCostCenter.compId,
				year: selectedYear,
				month: getMonthName(selectedMonth),
				deptName: targetCostCenter.CompName,
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

	// Helper functions
	const getMonthName = (monthNum: number): string => {
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
		return monthNames[monthNum - 1] || "";
	};

	const clearFilters = () => {
		setSearchId("");
		setSearchName("");
	};

	const closeTrialModal = () => {
		setTrialModalOpen(false);
		setTrialBalanceData([]);
		setSelectedCostCenter(null);
	};

	const formatNumber = (num: number): string => {
		// Handle undefined, null, or NaN values
		if (num === undefined || num === null || isNaN(num)) return "0.00";

		// Convert to number if it's a string
		const numValue = typeof num === "string" ? parseFloat(num) : num;

		// Handle zero values
		if (numValue === 0) return "0.00";

		// Get absolute value for formatting
		const absValue = Math.abs(numValue);
		const formatted = new Intl.NumberFormat("en-US", {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}).format(absValue);

		// Return negative values in parentheses, positive as normal
		return numValue < 0 ? `(${formatted})` : formatted;
	};

	const getCategory = (acCd: string): string => {
		const firstChar = acCd.charAt(0).toUpperCase();
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

	const calculateTotals = () => {
		const categories = ["A", "E", "L", "R"];
		const categoryTotals: Record<
			string,
			{
				opening: number;
				debit: number;
				credit: number;
				closing: number;
				count: number;
			}
		> = {};
		categories.forEach((cat) => {
			categoryTotals[cat] = {
				opening: 0,
				debit: 0,
				credit: 0,
				closing: 0,
				count: 0,
			};
		});
		trialBalanceData.forEach((row) => {
			const firstChar = row.AcCd.charAt(0).toUpperCase();
			if (categories.includes(firstChar)) {
				categoryTotals[firstChar].opening += row.OpSbal || 0;
				categoryTotals[firstChar].debit += row.DrSamt || 0;
				categoryTotals[firstChar].credit += row.CrSamt || 0;
				categoryTotals[firstChar].closing += row.ClSbal || 0;
				categoryTotals[firstChar].count += 1;
			}
		});
		const grandTotals = {
			opening: Object.values(categoryTotals).reduce(
				(sum, cat) => sum + cat.opening,
				0
			),
			debit: Object.values(categoryTotals).reduce(
				(sum, cat) => sum + cat.debit,
				0
			),
			credit: Object.values(categoryTotals).reduce(
				(sum, cat) => sum + cat.credit,
				0
			),
			closing: Object.values(categoryTotals).reduce(
				(sum, cat) => sum + cat.closing,
				0
			),
			count: trialBalanceData.length,
		};
		return {categoryTotals, grandTotals};
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
				<span>
					{selectedMonth ? getMonthName(selectedMonth) : "Select Month"}
				</span>
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

	// Improved CSV export function
	const downloadAsCSV = () => {
		if (!trialBalanceData || trialBalanceData.length === 0) return;

		// Calculate totals for categories
		const {categoryTotals, grandTotals} = calculateTotals();

		// Sort data by category (A, E, L, R) to match PDF structure
		const sortedData = [...trialBalanceData].sort((a, b) => {
			const categoryOrder: {[key: string]: number} = {
				A: 1,
				E: 2,
				L: 3,
				R: 4,
			};
			const aCat = a.AcCd.charAt(0).toUpperCase();
			const bCat = b.AcCd.charAt(0).toUpperCase();
			return (categoryOrder[aCat] || 5) - (categoryOrder[bCat] || 5);
		});

		// Start with header information
		const csvRows = [
			[`Monthly Trial Balance - ${trialData.month}/${trialData.year}`],
			[`Cost Center: ${trialData.costctr} - ${trialData.deptName}`],
			[""], // Empty row for spacing
			[
				"Code",
				"Category",
				"Description/Name",
				"Opening Balance",
				"Debit Amount",
				"Credit Amount",
				"Closing Balance",
			], // Column headers
		];

		// Process data with category grouping
		let currentCategory = "";

		sortedData.forEach((row, index) => {
			const rowCategory = getCategory(row.AcCd);
			const categoryKey = row.AcCd.charAt(0).toUpperCase();

			// Add category header if category changes
			if (rowCategory !== currentCategory) {
				currentCategory = rowCategory;
				csvRows.push([""], [`=== ${rowCategory.toUpperCase()} ===`]); // Category separator
			}

			// Add data row with Code and Category
			csvRows.push([
				row.AcCd, // Code column
				rowCategory, // Category column (repeats for each row)
				row.GlName.trim(), // Description/Name column
				formatNumber(row.OpSbal), // Opening Balance
				formatNumber(row.DrSamt), // Debit Amount
				formatNumber(row.CrSamt), // Credit Amount
				formatNumber(row.ClSbal), // Closing Balance
			]);

			// Check if this is the last row of current category
			const nextIndex = index + 1;
			const isLastInCategory =
				nextIndex >= sortedData.length ||
				getCategory(sortedData[nextIndex].AcCd) !== currentCategory;

			// Add category total if this is the last row of the category
			if (isLastInCategory && categoryTotals[categoryKey]) {
				csvRows.push([
					`TOTAL ${rowCategory.toUpperCase()}`,
					"",
					"", 
					formatNumber(categoryTotals[categoryKey].opening),
					formatNumber(categoryTotals[categoryKey].debit),
					formatNumber(categoryTotals[categoryKey].credit),
					formatNumber(categoryTotals[categoryKey].closing),
				]);
				csvRows.push([""]); // Empty row after category total
			}
		});

		// Add grand total
		// Add grand total
		csvRows.push(
			[""], // Extra spacing before grand total
			["=== GRAND TOTAL ==="],
			[
				"GRAND TOTAL", // Spans Code + Category columns
				"",
				"", // Empty for Category
				formatNumber(grandTotals.opening),
				formatNumber(grandTotals.debit),
				formatNumber(grandTotals.credit),
				formatNumber(grandTotals.closing),
			]
		);

		// Add footer information
		csvRows.push(
			[""],
			[`Report generated on: ${new Date().toLocaleDateString()}`]
		);

		// Convert to CSV format with proper escaping
		const csvContent = csvRows
			.map((row) => {
				// Handle rows with different lengths and escape commas in content
				return row
					.map((cell) => {
						const cellStr = String(cell || "");
						// If cell contains comma, quote, or newline, wrap in quotes and escape internal quotes
						if (
							cellStr.includes(",") ||
							cellStr.includes('"') ||
							cellStr.includes("\n")
						) {
							return `"${cellStr.replace(/"/g, '""')}"`;
						}
						return cellStr;
					})
					.join(",");
			})
			.join("\n");

		// Create and download the file
		const blob = new Blob([csvContent], {type: "text/csv;charset=utf-8;"});
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `TrialBalance_${trialData.costctr}_${trialData.month}_${trialData.year}.csv`;
		link.style.display = "none";

		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};

	const printPDF = () => {
		if (!trialBalanceData || trialBalanceData.length === 0) return;

		// Calculate totals for the print
		const {categoryTotals, grandTotals} = calculateTotals();

		// Create a new window for printing
		const printWindow = window.open("", "_blank");
		if (!printWindow) return;

		// Generate table rows HTML
		let tableRowsHTML = "";
		trialBalanceData.forEach((row, index) => {
			const currentCategory = getCategory(row.AcCd);
			const prevCategory =
				index > 0 ? getCategory(trialBalanceData[index - 1].AcCd) : null;
			const showCategoryHeader = currentCategory !== prevCategory;
			const nextCategory =
				index < trialBalanceData.length - 1
					? getCategory(trialBalanceData[index + 1].AcCd)
					: null;
			const showCategoryTotal = currentCategory !== nextCategory;

			// Category header
			if (showCategoryHeader) {
				tableRowsHTML += `
          <tr class="category-header">
            <td colspan="6" style="text-align:left; font-weight: bold; background-color: #f5f5f5; color: #7A0000;  padding: 7px; font-size: 14px;">${currentCategory}</td>
          </tr>
        `;
			}

			// Data row
			tableRowsHTML += `
        <tr>
		  <td style="padding: 6px; border: 1px solid #ddd;">${row.AcCd}</td>
          <td style="padding: 6px; border: 1px solid #ddd;">${row.GlName.trim()}</td>
          <td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-family: monospace;">${formatNumber(
					row.OpSbal
				)}</td>
          <td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-family: monospace;">${formatNumber(
					row.DrSamt
				)}</td>
          <td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-family: monospace;">${formatNumber(
					row.CrSamt
				)}</td>
          <td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-family: monospace;">${formatNumber(
					row.ClSbal
				)}</td>
        </tr>
      `;

			// Category total
			if (showCategoryTotal) {
				const categoryKey = row.AcCd.charAt(0).toUpperCase();
				tableRowsHTML += `
          <tr class="category-total">
            <td colspan="2"; style="padding: 6px; border: 1px solid #ddd; background-color: #f9f9f9; font-weight: bold;">Total ${currentCategory}</td>
            <td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-family: monospace; background-color: #f9f9f9; font-weight: bold;">${formatNumber(
					categoryTotals[categoryKey].opening
				)}</td>
            <td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-family: monospace; background-color: #f9f9f9; font-weight: bold;">${formatNumber(
					categoryTotals[categoryKey].debit
				)}</td>
            <td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-family: monospace; background-color: #f9f9f9; font-weight: bold;">${formatNumber(
					categoryTotals[categoryKey].credit
				)}</td>
            <td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-family: monospace; background-color: #f9f9f9; font-weight: bold;">${formatNumber(
					categoryTotals[categoryKey].closing
				)}</td>
          </tr>
        `;
			}
		});

		// Add Grand Total row at the end of tbody
		tableRowsHTML += `
      <tr style="font-weight: bold;">
        <td colspan="2"; style="padding: 8px; border: 1px solid #ddd;">Grand Total</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-family: monospace;">${formatNumber(
				grandTotals.opening
			)}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-family: monospace;">${formatNumber(
				grandTotals.debit
			)}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-family: monospace;">${formatNumber(
				grandTotals.credit
			)}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-family: monospace;">${formatNumber(
				grandTotals.closing
			)}</td>
      </tr>
    `;

		// Create the HTML content for printing
		const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Trial Balance - ${trialData.month}/${trialData.year}</title>
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
          <h1>Monthly Trial Balance - ${trialData.month}/${trialData.year}</h1>
          <h2>Cost Center: ${trialData.costctr} - ${trialData.deptName}</h2>
        </div>
        
        <table>
          <thead>
            <tr>
			
			  <th style="width: 15%;">Code</th>
              <th style="width: 40%;">Description/Name</th>
              <th style="width: 15%;">Opening Balance</th>
              <th style="width: 15%;">Debit Amount</th>
              <th style="width: 15%;">Credit Amount</th>
              <th style="width: 15%;">Closing Balance</th>
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

	return (
		<div className="max-w-7xl mx-auto p-6 bg-white rounded-xl shadow border border-gray-200 text-sm font-sans relative">
			{/* Header */}
			<div className="flex justify-between items-center mb-4">
				<div>
					<h2 className={`text-xl font-bold ${maroon}`}>
						Cost Center Trial Balance
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

				{selectedCostCenter && (
					<div className="mt-2 text-xs text-gray-600">
						Selected:{" "}
						<span className="font-semibold">
							{selectedCostCenter.CompName}
						</span>{" "}
						({selectedCostCenter.compId})
					</div>
				)}
			</div>

			{/* Loading State */}
			{loading && (
				<div className="text-center py-8">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7A0000] mx-auto"></div>
					<p className="mt-2 text-gray-600">Loading cost centers...</p>
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
					No cost centers found.
				</div>
			)}

			{/* Table */}
			{!loading && !error && filtered.length > 0 && (
				<>
					<div className="overflow-x-auto rounded-lg border border-gray-200">
						<div className="max-h-[70vh] overflow-y-auto">
							<table className="w-full table-fixed text-left text-gray-700 text-sm">
								<thead
									className={`${maroonGrad} text-white sticky top-0`}
								>
									<tr>
										<th className="px-4 py-2 w-1/4">
											Cost Center Code
										</th>
										<th className="px-4 py-2 w-1/2">
											Cost Center Name
										</th>
										<th className="px-4 py-2 w-1/4 text-center">
											Action
										</th>
									</tr>
								</thead>
								<tbody>
									{paginatedCostCenters.map((costCenter, i) => (
										<tr
											key={`${costCenter.compId}-${i}`}
											className={`${
												i % 2 ? "bg-white" : "bg-gray-50"
											} ${
												selectedCostCenter?.compId ===
												costCenter.compId
													? "ring-2 ring-[#7A0000] ring-inset"
													: ""
											}`}
										>
											<td className="px-4 py-2 truncate font-mono">
												{costCenter.compId}
											</td>
											<td className="px-4 py-2 truncate">
												{costCenter.CompName}
											</td>
											<td className="px-4 py-2 text-center">
												<button
													onClick={() =>
														handleCostCenterSelect(costCenter)
													}
													disabled={
														!selectedYear || !selectedMonth
													}
													className={`px-3 py-1 ${
														selectedCostCenter?.compId ===
														costCenter.compId
															? "bg-green-600 text-white"
															: maroonGrad + " text-white"
													} rounded text-xs font-medium hover:brightness-110 transition shadow ${
														!selectedYear || !selectedMonth
															? "opacity-50 cursor-not-allowed"
															: ""
													}`}
												>
													<FaEye className="inline-block mr-1 w-3 h-3" />
													{selectedCostCenter?.compId ===
													costCenter.compId
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
						<span className="text-xs text-gray-600">
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

			{/* Trial Balance Modal */}
			<TrialBalanceModal
				trialModalOpen={trialModalOpen}
				closeTrialModal={closeTrialModal}
				trialData={trialData}
				trialBalanceData={trialBalanceData}
				trialLoading={trialLoading}
				trialError={trialError}
				maroon={maroon}
				maroonBg={maroonBg}
				formatNumber={formatNumber}
				getCategory={getCategory}
				calculateTotals={calculateTotals}
				downloadAsCSV={downloadAsCSV}
				printPDF={printPDF}
				goBack={() => {
					setTrialModalOpen(false);
				}}
			/>
		</div>
	);
};

export default CostCenterTrial;
