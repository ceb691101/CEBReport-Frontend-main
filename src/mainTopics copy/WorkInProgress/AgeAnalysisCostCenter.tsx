import {useEffect, useState, useRef} from "react";
import {
	Search,
	RotateCcw,
	Eye,
	Download,
	Printer,
	ArrowRight,
} from "lucide-react";
import {useUser} from "../../contexts/UserContext";
import CostCenterWorkInprogress from "./CostCenterWorkInprogress";
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	Legend,
	ResponsiveContainer,
} from "recharts";

interface Department {
	DeptId: string;
	DeptName: string;
}

interface ProjectCommitmentSummary {
	Period: string;
	Sum: number;
	CctName: string;
}

interface ProjectAgeAnalysis {
	Period: string;
	NoOfProjects: number;
	CctName: string;
}

interface ConsolidatedAgeAnalysis {
	Period: string;
	CctName: string;
	NoOfProjects: number;
	Amount: number;
}

const AgeAnalysisCostCenter = () => {
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

	// Age Analysis Modal State
	const [selectedDepartment, setSelectedDepartment] =
		useState<Department | null>(null);
	const [showAgeAnalysis, setShowAgeAnalysis] = useState(false);
	const [ageAnalysisData, setAgeAnalysisData] = useState<
		ConsolidatedAgeAnalysis[]
	>([]);
	const [ageAnalysisLoading, setAgeAnalysisLoading] = useState(false);
	const [ageAnalysisError, setAgeAnalysisError] = useState<string | null>(
		null
	);

	// Navigation State
	const [showWorkInProgress, setShowWorkInProgress] = useState(false);

	// Ref for print functionality
	const printRef = useRef<HTMLDivElement>(null);

	// Get EPF Number from user context (Userno field)
	const epfNo = user?.Userno || "";

	// Debug log to see what EPF number is being used
	useEffect(() => {
	}, [user, epfNo]);

	// Colors
	const maroon = "text-[#7A0000]";
	const maroonBg = "bg-[#7A0000]";
	const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";

	// Paginated departments
	const paginatedDepartments = filtered.slice(
		(page - 1) * pageSize,
		page * pageSize
	);

	// Fetch departments - Same API as CostCenterWorkInprogress
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

	// Filter departments
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

	// Fetch age analysis data from both APIs
	const fetchAgeAnalysisData = async (deptId: string) => {
		// Clear previous results and show modal immediately so user sees a loading state
		setAgeAnalysisError(null);
		setAgeAnalysisData([]);
		setShowAgeAnalysis(true);
		setAgeAnalysisLoading(true);

		try {
			// Fetch data from both APIs in parallel
			const [commitmentResponse, ageAnalysisResponse] = await Promise.all([
				fetch(`/misapi/api/projectcommitmentsummary/${deptId}`, {
					credentials: "include",
					headers: {Accept: "application/json"},
				}),
				fetch(`/misapi/api/projectageanalysis/${deptId}`, {
					credentials: "include",
					headers: {Accept: "application/json"},
				}),
			]);

			if (!commitmentResponse.ok)
				throw new Error(
					`Commitment API error! status: ${commitmentResponse.status}`
				);
			if (!ageAnalysisResponse.ok)
				throw new Error(
					`Age Analysis API error! status: ${ageAnalysisResponse.status}`
				);

			const [commitmentData, ageAnalysisData] = await Promise.all([
				commitmentResponse.json(),
				ageAnalysisResponse.json(),
			]);

			// Process commitment data
			let commitmentArray: ProjectCommitmentSummary[] = [];
			if (Array.isArray(commitmentData)) {
				commitmentArray = commitmentData;
			} else if (commitmentData.data && Array.isArray(commitmentData.data)) {
				commitmentArray = commitmentData.data;
			} else if (
				commitmentData.result &&
				Array.isArray(commitmentData.result)
			) {
				commitmentArray = commitmentData.result;
			}

			// Process age analysis data
			let ageAnalysisArray: ProjectAgeAnalysis[] = [];
			if (Array.isArray(ageAnalysisData)) {
				ageAnalysisArray = ageAnalysisData;
			} else if (
				ageAnalysisData.data &&
				Array.isArray(ageAnalysisData.data)
			) {
				ageAnalysisArray = ageAnalysisData.data;
			} else if (
				ageAnalysisData.result &&
				Array.isArray(ageAnalysisData.result)
			) {
				ageAnalysisArray = ageAnalysisData.result;
			}

			// Create a map to consolidate data by Period + CctName
			const consolidatedMap = new Map<string, ConsolidatedAgeAnalysis>();

			// Add commitment data
			commitmentArray.forEach((item: any) => {
				const key = `${item.Period?.trim()}-${item.CctName?.trim()}`;
				consolidatedMap.set(key, {
					Period: item.Period?.trim() || "",
					CctName: item.CctName?.trim() || "",
					NoOfProjects: 0,
					Amount: parseFloat(item.Sum || 0),
				});
			});

			// Add age analysis data
			ageAnalysisArray.forEach((item: any) => {
				const key = `${item.Period?.trim()}-${item.CctName?.trim()}`;
				if (consolidatedMap.has(key)) {
					consolidatedMap.get(key)!.NoOfProjects = parseInt(
						item.NoOfProjects || 0
					);
				} else {
					consolidatedMap.set(key, {
						Period: item.Period?.trim() || "",
						CctName: item.CctName?.trim() || "",
						NoOfProjects: parseInt(item.NoOfProjects || 0),
						Amount: 0,
					});
				}
			});

			// Convert map to array and sort by Period
			const consolidatedData = Array.from(consolidatedMap.values()).sort(
				(a, b) => {
					return a.Period.localeCompare(b.Period);
				}
			);

			setAgeAnalysisData(consolidatedData);
			// modal already opened when loading started
		} catch (error: any) {
			setAgeAnalysisError(
				error.message.includes("JSON.parse")
					? "Invalid data format received from server"
					: error.message
			);
		} finally {
			setAgeAnalysisLoading(false);
		}
	};

	const handleDepartmentSelect = (department: Department) => {
		setSelectedDepartment(department);
		fetchAgeAnalysisData(department.DeptId);
	};

	const closeAgeAnalysisModal = () => {
		// Close the modal and return to the cost-center list (home)
		setShowAgeAnalysis(false);
		// Clear loaded report and selected department so the list view is shown as 'home'
		setAgeAnalysisData([]);
		setSelectedDepartment(null);
		// Ensure any work-in-progress view is closed as well
		setShowWorkInProgress(false);
		// Clear any outstanding loading/error state
		setAgeAnalysisLoading(false);
		setAgeAnalysisError(null);
	};

	const navigateToWorkInProgress = () => {
		setShowWorkInProgress(true);
		setShowAgeAnalysis(false);
	};

	// Prepare chart data
	const chartData = ageAnalysisData.map((item) => ({
		period: item.Period,
		noOfProjects: item.NoOfProjects,
		amount: item.Amount,
	}));

	// Custom tooltip for the chart
	const CustomTooltip = ({active, payload, label}: any) => {
		if (active && payload && payload.length) {
			return (
				<div className="bg-white p-3 border border-gray-300 rounded shadow-lg">
					<p className="font-semibold text-sm">{`Period: ${label}`}</p>
					{payload.map((entry: any, index: number) => (
						<p
							key={index}
							className="text-xs"
							style={{color: entry.color}}
						>
							{entry.dataKey === "noOfProjects"
								? "No of Projects (Count)"
								: "Amount (LKR)"}
							:{" "}
							{entry.dataKey === "noOfProjects"
								? entry.value.toLocaleString()
								: `Rs. ${entry.value.toLocaleString("en-US", {
										minimumFractionDigits: 2,
										maximumFractionDigits: 2,
								  })}`}
						</p>
					))}
				</div>
			);
		}
		return null;
	};

	const clearFilters = () => {
		setSearchId("");
		setSearchName("");
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

	// Improved Download as CSV function
	const downloadAsCSV = () => {
		if (!ageAnalysisData || ageAnalysisData.length === 0) return;

		// Create headers
		const headers = ["Period", "No of Projects", "Amount (LKR)"];

		// Create data rows with proper CSV formatting
		const dataRows = ageAnalysisData.map((item) => [
			escapeCSVField(item.Period),
			escapeCSVField(item.NoOfProjects),
			escapeCSVField(
				item.Amount.toLocaleString("en-US", {
					minimumFractionDigits: 2,
					maximumFractionDigits: 2,
				})
			),
		]);

		// Calculate grand totals
		const totalProjects = ageAnalysisData.reduce(
			(sum, item) => sum + item.NoOfProjects,
			0
		);
		const totalAmount = ageAnalysisData.reduce(
			(sum, item) => sum + item.Amount,
			0
		);

		// Add grand total row
		const grandTotalRow = [
			escapeCSVField("GRAND TOTAL"),
			escapeCSVField(totalProjects),
			escapeCSVField(
				totalAmount.toLocaleString("en-US", {
					minimumFractionDigits: 2,
					maximumFractionDigits: 2,
				})
			),
		];

		// Create CSV content with topic section
		const csvContent = [
			// Topic section
			`"Work In Progress - Age Analysis As At ${new Date().toLocaleDateString()}"`,
			`"Cost Center : ${selectedDepartment?.DeptId} / ${selectedDepartment?.DeptName}"`,
			"", // Empty line
			// Data section
			headers.join(","),
			...dataRows.map((row) => row.join(",")),
			grandTotalRow.join(","),
			"", // Empty line
			`"Generated: ${new Date().toLocaleString()}"`,
			`"${new Date().getFullYear()}"`,
		].join("\n");

		// Create download link
		const blob = new Blob([csvContent], {type: "text/csv;charset=utf-8;"});
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `AgeAnalysis_${selectedDepartment?.DeptId}_${
			new Date().toISOString().split("T")[0]
		}.csv`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};

	// Print PDF function
	const printPDF = () => {
		if (!ageAnalysisData || ageAnalysisData.length === 0) return;

		const printWindow = window.open("", "_blank");
		if (!printWindow) return;

		// Calculate grand totals
		const grandTotalProjects = ageAnalysisData.reduce(
			(sum, item) => sum + item.NoOfProjects,
			0
		);
		const grandTotalAmount = ageAnalysisData.reduce(
			(sum, item) => sum + item.Amount,
			0
		);

		// Generate table rows HTML
		let tableRowsHTML = "";
		ageAnalysisData.forEach((item) => {
			tableRowsHTML += `
        <tr>
          <td style="padding: 6px; border: 1px solid #ddd; font-size: 10px;">${
					item.Period || ""
				}</td>
          <td style="padding: 6px; border: 1px solid #ddd; font-size: 10px; text-align: center; font-family: monospace;">${item.NoOfProjects.toLocaleString()}</td>
          <td style="padding: 6px; border: 1px solid #ddd; font-size: 10px; text-align: right; font-family: monospace;">${item.Amount.toLocaleString(
					"en-US",
					{minimumFractionDigits: 2, maximumFractionDigits: 2}
				)}</td>
        </tr>
      `;
		});

		// Add grand total row
		tableRowsHTML += `
      <tr style="background-color: #7A0000; color: white; font-weight: bold;">
        <td style="padding: 8px; border: 1px solid #7A0000; font-size: 10px;">GRAND TOTAL</td>
        <td style="padding: 8px; border: 1px solid #7A0000; font-size: 10px; text-align: center; font-family: monospace;">${grandTotalProjects.toLocaleString()}</td>
        <td style="padding: 8px; border: 1px solid #7A0000; font-size: 10px; text-align: right; font-family: monospace;">${grandTotalAmount.toLocaleString(
				"en-US",
				{minimumFractionDigits: 2, maximumFractionDigits: 2}
			)}</td>
      </tr>
    `;

		// Create the HTML content for printing
		const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Age Analysis Report</title>
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
            color: white;
            font-weight: bold;
            text-align: center;
            padding: 8px;
            border: 1px solid #7A0000;
          }
          
          td {
            padding: 6px;
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
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Work In Progress - Age Analysis As At ${new Date().toLocaleDateString()}</h1>
          <div style="border-bottom: 1px solid #333; margin: 10px 0;"></div>
          <h2>Cost Center : ${selectedDepartment?.DeptId} / ${
			selectedDepartment?.DeptName
		}</h2>
          <div style="border-bottom: 1px solid #333; margin: 10px 0;"></div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th style="width: 40%;">Period</th>
              <th style="width: 30%;">No of Projects</th>
              <th style="width: 30%;">Amount (LKR)</th>
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

	// Age Analysis Modal Component
	const AgeAnalysisModal = () => {
		if (!showAgeAnalysis || !selectedDepartment) return null;

		// Calculate grand totals
		const grandTotalProjects = ageAnalysisData.reduce(
			(sum, item) => sum + item.NoOfProjects,
			0
		);
		const grandTotalAmount = ageAnalysisData.reduce(
			(sum, item) => sum + item.Amount,
			0
		);

		return (
			<div className="fixed inset-0 bg-white flex items-start justify-end z-50 pt-24 pb-8 pl-64">
				<div className="bg-white w-full max-w-6xl rounded-lg shadow-lg border border-gray-300 max-h-[85vh] flex flex-col mr-4">
					<div className="p-5 border-b">
						<div className="flex justify-between items-start">
							<div className="space-y-2 w-full">
								<h2 className="text-lg font-bold text-gray-800 text-center">
									Work In Progress - Age Analysis As At{" "}
									{new Date().toLocaleDateString()}
								</h2>
								<div className="border-b border-gray-300 my-2"></div>
								<h3 className={`text-sm ${maroon} text-center`}>
									Cost Center : {selectedDepartment.DeptId} /{" "}
									{selectedDepartment.DeptName}
								</h3>
								<div className="border-b border-gray-300 my-2"></div>
							</div>
						</div>
						{ageAnalysisError && (
							<div className="flex items-center justify-center gap-3 mt-2">
								<div className="text-red-600 text-xs text-center">
									{ageAnalysisError.includes("JSON.parse")
										? "Data format error"
										: ageAnalysisError}
								</div>
								<button
									onClick={closeAgeAnalysisModal}
									className={`px-3 py-1 text-sm ${maroonBg} text-white rounded hover:brightness-110`}
								>
									Back To Home
								</button>
							</div>
						)}
					</div>
					<div className="px-6 py-5 overflow-y-auto flex-grow">
						{ageAnalysisLoading ? (
							<div className="flex items-center justify-center py-8">
								<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7A0000] mr-3"></div>
								<span className={`${maroon} text-sm font-medium`}>
									Loading age analysis data...
								</span>
							</div>
						) : ageAnalysisData.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-12">
								<button
									onClick={closeAgeAnalysisModal}
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
											d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
										/>
									</svg>
								</div>
								<h3 className="text-lg font-medium text-gray-700 mb-2">
									No Age Analysis Data Available
								</h3>
								<p className="text-gray-500 text-center max-w-md">
									We couldn't find any age analysis records for{" "}
									<strong>{selectedDepartment.DeptName}</strong>.
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
											onClick={navigateToWorkInProgress}
											className="flex items-center gap-2 px-4 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
										>
											View Work in Progress{" "}
											<ArrowRight className="w-4 h-4" />
										</button>
										<button
											onClick={closeAgeAnalysisModal}
											className={`px-4 py-1.5 text-sm ${maroonBg} text-white rounded hover:brightness-110`}
										>
											Back To Home
										</button>
									</div>
								</div>

								<div ref={printRef} className="w-full space-y-6">
									{/* Table Section */}
									<div className="bg-white border border-gray-200 rounded-lg shadow-sm">
										{/* Currency indicator */}
										<div className="flex justify-between items-center p-3 bg-gray-50 border-b rounded-t-lg">
											<div className="flex items-center gap-3">
												<span className="text-xs font-semibold text-gray-700">
													Currency: LKR
												</span>
												<span className="text-xs text-gray-600">
													Total Records:{" "}
													<span className="font-semibold">
														{ageAnalysisData.length}
													</span>
												</span>
											</div>
											<div className="text-xs text-gray-600">
												Generated:{" "}
												<span className="font-mono">
													{new Date().toLocaleString()}
												</span>
											</div>
										</div>

										<div className="overflow-x-auto">
											<table className="w-full border-collapse">
												<thead>
													<tr
														className="text-gray-800"
														style={{backgroundColor: "#D3D3D3"}}
													>
														<th className="px-3 py-2 text-left border-r font-semibold text-xs">
															Period
														</th>
														<th className="px-3 py-2 text-center border-r font-semibold text-xs">
															No of Projects
														</th>
														<th className="px-3 py-2 text-right font-semibold text-xs">
															Amount (LKR)
														</th>
													</tr>
												</thead>
												<tbody>
													{ageAnalysisData.map((item, index) => (
														<tr
															key={`${item.Period}-${index}`}
															className="border-b hover:bg-gray-50 transition-colors"
														>
															<td className="px-3 py-2 text-xs border-r font-medium text-gray-800">
																{item.Period}
															</td>
															<td className="px-3 py-2 text-center text-xs border-r font-mono text-gray-800">
																{item.NoOfProjects.toLocaleString()}
															</td>
															<td className="px-3 py-2 text-right font-mono text-xs text-gray-800">
																{item.Amount.toLocaleString(
																	"en-US",
																	{
																		minimumFractionDigits: 2,
																		maximumFractionDigits: 2,
																	}
																)}
															</td>
														</tr>
													))}
													{/* Grand Total Row */}
													<tr className="border-t-2 border-gray-400 bg-gray-100 font-bold">
														<td className="px-3 py-2 text-xs border-r text-gray-800">
															GRAND TOTAL
														</td>
														<td className="px-3 py-2 text-center text-xs border-r font-mono text-gray-800">
															{grandTotalProjects.toLocaleString()}
														</td>
														<td className="px-3 py-2 text-right font-mono text-xs text-gray-800">
															{grandTotalAmount.toLocaleString(
																"en-US",
																{
																	minimumFractionDigits: 2,
																	maximumFractionDigits: 2,
																}
															)}
														</td>
													</tr>
												</tbody>
											</table>
										</div>
									</div>

									{/* Chart Section */}
									<div className="bg-white border border-gray-200 rounded-lg shadow-sm">
										{/* Chart header */}
										<div className="flex justify-between items-center p-3 bg-gray-50 border-b rounded-t-lg">
											<div className="flex items-center gap-3">
												<span className="text-sm font-semibold text-gray-700">
													Age Analysis Chart
												</span>
												<span className="text-xs text-gray-600">
													Currency: LKR
												</span>
											</div>
											<div className="text-xs text-gray-600">
												Generated:{" "}
												<span className="font-mono">
													{new Date().toLocaleString()}
												</span>
											</div>
										</div>

										{/* Bar Chart */}
										<div className="p-4">
											<div
												className="w-full"
												style={{height: "280px"}}
											>
												<ResponsiveContainer
													width="100%"
													height="100%"
												>
													<BarChart
														data={chartData}
														margin={{
															top: 15,
															right: 50,
															left: 30,
															bottom: 60,
														}}
														maxBarSize={80}
													>
														<CartesianGrid strokeDasharray="3 3" />
														<XAxis
															dataKey="period"
															tick={{fontSize: 11}}
															interval={0}
															angle={-45}
															textAnchor="end"
															height={60}
															tickMargin={10}
														/>
														<YAxis
															yAxisId="left"
															orientation="left"
															tick={{fontSize: 10}}
															tickFormatter={(value) =>
																value.toLocaleString()
															}
															width={70}
															label={{
																value: "No of Projects",
																angle: -90,
																position: "insideLeft",
																style: {textAnchor: "middle"},
															}}
														/>
														<YAxis
															yAxisId="right"
															orientation="right"
															tick={{fontSize: 10}}
															tickFormatter={(value) =>
																(value / 1000000).toFixed(1) +
																"M"
															}
															width={70}
															label={{
																value: "Amount (LKR)",
																angle: 90,
																position: "insideRight",
																style: {textAnchor: "middle"},
															}}
														/>
														<Tooltip
															content={<CustomTooltip />}
														/>
														<Legend />
														<Bar
															yAxisId="left"
															dataKey="noOfProjects"
															fill="#2D3748"
															name="No of Projects (Count)"
															radius={[3, 3, 0, 0]}
														/>
														<Bar
															yAxisId="right"
															dataKey="amount"
															fill="#7A0000"
															name="Amount (LKR)"
															radius={[3, 3, 0, 0]}
														/>
													</BarChart>
												</ResponsiveContainer>
											</div>

											{/* Chart Summary */}
											<div className="mt-4 flex justify-center">
												<div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg px-6 py-4 shadow-sm">
													<div className="text-xs font-medium text-green-600 mb-1 text-center">
														Total Amount
													</div>
													<div className="text-xl font-bold text-green-800 font-mono text-center">
														{grandTotalAmount.toLocaleString(
															"en-US",
															{
																minimumFractionDigits: 2,
																maximumFractionDigits: 2,
															}
														)}
													</div>
													<div className="text-xs text-green-600 mt-1 text-center">
														LKR
													</div>
												</div>
											</div>
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

	// If showing Work in Progress, render that component with the selected department
	if (showWorkInProgress && selectedDepartment) {
		return (
			<div className="fixed inset-0 bg-white flex items-start justify-end z-50 pt-24 pb-8 pl-64">
				<div className="bg-white w-full max-w-6xl rounded-lg shadow-lg border border-gray-300 max-h-[85vh] flex flex-col mr-4">
					<div className="p-5 border-b">
						<div className="flex justify-between items-start">
							<div className="space-y-2 w-full">
								<h2 className="text-lg font-bold text-gray-800 text-center">
									Cost Center Work in Progress
								</h2>
								<div className="border-b border-gray-300 my-2"></div>
								<h3 className={`text-sm ${maroon} text-center`}>
									Cost Center : {selectedDepartment.DeptId} /{" "}
									{selectedDepartment.DeptName}
								</h3>
								<div className="border-b border-gray-300 my-2"></div>
							</div>
						</div>
					</div>
					<div className="px-6 py-5 overflow-y-auto flex-grow">
						<CostCenterWorkInprogress
							preSelectedDepartment={selectedDepartment}
							onBack={() => {
								setShowWorkInProgress(false);
								setShowAgeAnalysis(true);
							}}
							onHome={closeAgeAnalysisModal}
						/>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="max-w-7xl mx-auto p-6 bg-white rounded-xl shadow border border-gray-200 text-sm font-sans">
			{/* Header */}
			<div className="flex justify-between items-center mb-4">
				<div>
					<h2 className={`text-xl font-bold ${maroon}`}>
						Age Analysis - Cost Center Selection
					</h2>
				</div>
			</div>

			{/* Search Controls */}
			<div className="flex flex-wrap gap-3 justify-end mb-4">
				<div className="relative">
					<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
					<input
						type="text"
						value={searchId}
						placeholder="Search by Dept ID"
						onChange={(e) => setSearchId(e.target.value)}
						className="pl-8 pr-3 py-1.5 w-40 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A0000] transition text-sm"
						autoComplete="off"
					/>
				</div>
				<div className="relative">
					<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
					<input
						type="text"
						value={searchName}
						placeholder="Search by Name"
						onChange={(e) => setSearchName(e.target.value)}
						className="pl-8 pr-3 py-1.5 w-40 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A0000] transition text-sm"
						autoComplete="off"
					/>
				</div>
				{(searchId || searchName) && (
					<button
						onClick={clearFilters}
						className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm"
					>
						<RotateCcw className="w-3 h-3" /> Clear
					</button>
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
													className={`px-3 py-1 ${
														selectedDepartment?.DeptId ===
														department.DeptId
															? "bg-green-600 text-white"
															: maroonGrad + " text-white"
													} rounded-md text-xs font-medium hover:brightness-110 transition shadow`}
												>
													<Eye className="inline-block mr-1 w-3 h-3" />
													{selectedDepartment?.DeptId ===
													department.DeptId
														? "Viewing"
														: "View Age Analysis"}
												</button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>

					{/* Pagination */}
					<div className="flex justify-end items-center gap-2 mt-1">
						<button
							onClick={() => setPage((p) => Math.max(1, p - 1))}
							disabled={page === 1}
							className="px-2 py-0.5 border rounded bg-white text-gray-600 text-[10px] hover:bg-gray-100 disabled:opacity-40"
						>
							Previous
						</button>
						<span className="text-[10px] text-gray-500">
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
							className="px-2 py-0.5 border rounded bg-white text-gray-600 text-[10px] hover:bg-gray-100 disabled:opacity-40"
						>
							Next
						</button>
					</div>
				</>
			)}

			{/* Age Analysis Modal */}
			<AgeAnalysisModal />
		</div>
	);
};

export default AgeAnalysisCostCenter;
