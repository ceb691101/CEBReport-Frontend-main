import React, {useEffect, useState, useRef} from "react";
import {Search, RotateCcw, Eye, X, Download, Printer} from "lucide-react";
import {useUser} from "../../contexts/UserContext";
import {toast} from "react-toastify";

interface Department {
	DeptId: string;
	DeptName: string;
}

interface MaterialItem {
	TrxType: string;
	DocNo: string;
	TrxDt: string | null;
	MatCd: string;
	MatNm: string;
	GradeCd: string;
	TrxQty: number;
	UnitCost: number;
	TrxVal: number;
}

// Format number: negative values in parentheses
const formatNumber = (num: number): string => {
	const abs = Math.abs(num).toLocaleString("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
	return num < 0 ? `(${abs})` : abs;
};

const csvEscape = (val: string | null | undefined): string => {
	if (val == null) return "";
	const str = String(val);
	if (/[,\n"]/.test(str)) {
		return `"${str.replace(/"/g, '""')}"`;
	}
	return str;
};

const JobCardMaterialsTable: React.FC<{
	materials: MaterialItem[];
	loading: boolean;
	error: string | null;
	departmentName: string;
	projectNo: string;
	onClose: () => void;
}> = ({materials, loading, error, departmentName, projectNo, onClose}) => {
	const maroon = "text-[#7A0000]";
	const iframeRef = useRef<HTMLIFrameElement | null>(null);

	// Group by DocNo and keep original order
	const groupedMaterials = materials.reduce((acc, item, index) => {
		const key = item.DocNo;
		if (!acc[key]) {
			acc[key] = {items: [], firstIndex: index};
		}
		acc[key].items.push(item);
		return acc;
	}, {} as Record<string, {items: MaterialItem[]; firstIndex: number}>);

	const sortedGroups = Object.values(groupedMaterials).sort(
		(a, b) => a.firstIndex - b.firstIndex
	);

	const grandTotal = materials.reduce((sum, m) => sum + m.TrxVal, 0);

	const printPDF = () => {
		if (materials.length === 0) return;

		const columnWidths = {
			trxType: "w-[8%]",
			docNo: "w-[15%]",
			date: "w-[10%]",
			matCd: "w-[10%]",
			matNm: "w-[25%]",
			grade: "w-[8%]",
			qty: "w-[8%]",
			unitCost: "w-[8%]",
			value: "w-[8%]",
		};

		let tableRowsHTML = "";
		sortedGroups.forEach((group, groupIndex) => {
			const groupTotal = group.items.reduce((s, i) => s + i.TrxVal, 0);
			group.items.forEach((m, idx) => {
				const isFirst = idx === 0;
				tableRowsHTML += `
          <tr class="${groupIndex % 2 ? "bg-white" : "bg-gray-50"}">
            <td class="${
					columnWidths.trxType
				} p-1 border border-gray-300 text-left text-xs">${
					m.TrxType?.trim() || ""
				}</td>
            <td class="${
					columnWidths.docNo
				} p-1 border border-gray-300 text-left break-words text-xs">${
					isFirst ? m.DocNo : ""
				}</td>
            <td class="${
					columnWidths.date
				} p-1 border border-gray-300 text-left text-xs">${
					m.TrxDt
						? new Date(m.TrxDt).toLocaleDateString("en-GB", {
								day: "2-digit",
								month: "2-digit",
								year: "numeric",
						  })
						: "-"
				}</td>
            <td class="${
					columnWidths.matCd
				} p-1 border border-gray-300 text-left text-xs">${
					m.MatCd || ""
				}</td>
            <td class="${
					columnWidths.matNm
				} p-1 border border-gray-300 text-left break-words text-xs">${
					m.MatNm || ""
				}</td>
            <td class="${
					columnWidths.grade
				} p-1 border border-gray-300 text-left text-xs">${
					m.GradeCd || ""
				}</td>
            <td class="${
					columnWidths.qty
				} p-1 border border-gray-300 text-right font-mono text-xs">${formatNumber(
					m.TrxQty
				)}</td>
            <td class="${
					columnWidths.unitCost
				} p-1 border border-gray-300 text-right font-mono text-xs">${formatNumber(
					m.UnitCost
				)}</td>
            <td class="${
					columnWidths.value
				} p-1 border border-gray-300 text-right font-mono text-xs">${formatNumber(
					m.TrxVal
				)}</td>
          </tr>`;
			});

			// Changed: colspan=8 and bold text for Document Total in PDF
			tableRowsHTML += `
  <tr class="bg-gray-100 font-bold">
    <td colspan="8" class="p-1 border border-gray-300 text-xs" style=" text-align:left; font-weight: bold;">Document Total</td>
    <td class="p-1 border border-gray-300 text-right font-mono text-xs" style="font-weight: bold;">${formatNumber(
			groupTotal
		)}</td>
  </tr>`;

			if (groupIndex < sortedGroups.length - 1) {
				tableRowsHTML += `<tr><td colspan="9" class="border-t border-gray-300 " style="height: 20px; border: none;"></td></tr>`;
			}
		});

		tableRowsHTML += `
  <tr class="bg-gray-200 font-bold print-totals">
    <td colspan="8" class="p-1 border border-gray-300  text-xs" style="text-align:left; font-weight: bold;">Grand Total</td>
    <td class="p-1 border border-gray-300 text-right font-mono text-xs" style="font-weight: bold;">${formatNumber(
			grandTotal
		)}</td>
  </tr>`;

		const htmlContent = `
      <html>
        <head>
          <style>
            @media print {
              @page { margin: 20mm 15mm 25mm 15mm; }
              body { margin: 0; font-family: Arial, sans-serif; }
              .print-container { width: 100%; margin: 0; padding: 0; }
              .print-header { margin-bottom: 0.5rem; margin-top: 3rem; margin-left: 2rem; font-size: 1.125rem; text-align: center; }
              .print-header h2 { font-weight: bold; color: #7A0000; margin-bottom: 2.5rem;}
			  .print-header-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
  font-size: 14px;
}
  .project-title {
  font-weight: bold;
}


              .print-projectNo { text-align: left; font-size: 0.875rem; margin-bottom: 1rem; margin-right: 2rem; }
              .print-currency { text-align: right; font-size: 0.875rem; font-weight: 600; color: #4B5563; margin-bottom: 1.25rem; margin-right: 2rem; }
              table.print-table { border-collapse: collapse; width: 100%; margin-left: 0; margin-right: 3rem; }
              table.print-table th, table.print-table td { border: 1px solid #D1D5DB; padding: 0.25rem; font-size: 0.75rem; }
              table.print-table th { background: linear-gradient(to right, #7A0000, #A52A2A);  text-align: center; }
              table.print-table td { text-align: right; }
              table.print-table tr.bg-white { background-color: #fff; }
              table.print-table tr.bg-gray-50 { background-color: #F9FAFB; }
              table.print-table tr.bg-gray-200 { background-color: #E5E7EB; }
              table.print-table tr { page-break-inside: avoid; }
              thead { display: table-header-group; }
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
          <div class="print-container">
            <div class="print-header">
              <h2> Job Card -  Material Details</h2>
            </div>
		<div class="print-header-row">
  <div class="print-projectNo">
    <span class="project-title">Job Card for Project No.</span>
    ${projectNo || "-"}
  </div>

  <div class="print-currency">
    Currency: LKR
  </div>
</div>

</div>
            <table class="print-table">
              <thead>
                <tr>
                  <th class="${columnWidths.trxType}">Tran.</th>
                  <th class="${columnWidths.docNo}">Doc No</th>
                  <th class="${columnWidths.date}">Tran. Date</th>
                  <th class="${columnWidths.matCd}">Mat code</th>
                  <th class="${columnWidths.matNm}">Material Name</th>
                  <th class="${columnWidths.grade}">Grade</th>
                  <th class="${columnWidths.qty}">Trx. Qty</th>
                  <th class="${columnWidths.unitCost}">Unit Cost</th>
                  <th class="${columnWidths.value}">Trx. Value</th>
                </tr>
              </thead>
              <tbody>${tableRowsHTML}</tbody>
            </table>
          </div>
        </body>
      </html>`;

		if (iframeRef.current) {
			const doc =
				iframeRef.current.contentDocument ||
				iframeRef.current.contentWindow?.document;
			if (doc) {
				doc.open();
				doc.write(htmlContent);
				doc.close();
				iframeRef.current.contentWindow?.print();
			}
		}
	};

	const handleDownloadCSV = () => {
		if (materials.length === 0) return;

		const headers = [
			"Tran.",
			"Doc No",
			"Tran. Date",
			"Mat code",
			"Material Name",
			"Grade",
			"Trx. Qty",
			"Unit Cost",
			"Trx. Value",
		];
		const rows = materials.map((m) => [
			csvEscape(m.TrxType) || "",
			csvEscape(m.DocNo),
			m.TrxDt ? new Date(m.TrxDt).toLocaleDateString("en-GB") : "-",
			csvEscape(m.MatCd) || "",
			csvEscape(m.MatNm) || "",
			csvEscape(m.GradeCd) || "",
			csvEscape(formatNumber(m.TrxQty)),
			csvEscape(formatNumber(m.UnitCost)),
			csvEscape(formatNumber(m.TrxVal)),
		]);

		const csvContent = [
			`Job Card - Material Details for Project No. ${projectNo || "-"}`,
			`Currency: LKR`,
			`Department: ${departmentName}`,
			"",
			headers.join(","),
			...rows.map((r) => r.join(",")),
			"",
			`Grand Total,,,,,,,,${csvEscape(formatNumber(grandTotal))}`,
		].join("\n");

		const blob = new Blob([csvContent], {type: "text/csv;charset=utf-8;"});
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = "jobcard_materials.csv";
		link.click();
		URL.revokeObjectURL(url);
	};

	if (loading) {
		return (
			<div className="text-center py-6 sm:py-8 md:py-12 lg:py-16 xl:py-20">
				<div className="animate-spin rounded-full h-6 md:h-8 w-6 md:w-8 border-b-2 border-[#7A0000] mx-auto"></div>
				<p className="mt-1 md:mt-2 text-gray-600 text-xs md:text-sm">
					Loading materials...
				</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className="bg-red-100 border border-red-400 text-red-700 px-2 md:px-4 py-2 md:py-3 rounded mb-2 md:mb-4 text-xs md:text-sm">
				Error: {error}
			</div>
		);
	}

	if (materials.length === 0) {
		return (
			<div className="text-center py-6 sm:py-8 md:py-12 lg:py-16 xl:py-20">
				<div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6 md:p-10">
					<div className="text-gray-400 mb-4 md:mb-6">
						No Data Available.
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4 sm:p-6 print:static print:inset-auto print:p-0 print:flex-col print:items-start print:justify-start print:overflow-visible">
			<style>{`
        @media print {
          @page { size: A4 landscape; margin: 20mm 15mm 25mm 15mm; }
          body { margin: 0; font-family: Arial, sans-serif; }
          .print-container { width: 100%; margin: 0; padding: 0; }
          .print-header { margin-bottom: 2.5rem; margin-top: 3rem; margin-left: 2rem; font-size: 1.125rem; font-weight: bold; text-align: center; }
          .print-table { border-collapse: collapse; width: 100%; }
          .print-table th, .print-table td { border: 1px solid #D1D5DB; padding: 0.25rem; font-size: 0.75rem; }
          .print-table th { background: linear-gradient(to right, #7A0000, #A52A2A); color: white; text-align: center; }
          .print-table tr { page-break-inside: avoid; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
          tbody { display: table-row-group; }
          .print-totals { font-weight: bold; background-color: #E5E7EB; }
          @page {
            @bottom-left { content: "Printed on: ${new Date().toLocaleString(
					"en-US",
					{timeZone: "Asia/Colombo"}
				)}"; font-size: 0.75rem; color: gray; }
            @bottom-right { content: "Page " counter(page) " of " counter(pages); font-size: 0.75rem; color: gray; }
          }
        }
      `}</style>

			<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/90 print:static print:inset-auto print:p-0 print:bg-white mb-6">
				<div className="relative bg-white w-[95vw] sm:w-[90vw] md:w-[85vw] lg:w-[80vw] xl:w-[75vw] max-w-7xl rounded-2xl shadow-2xl border border-gray-200 overflow-hidden mt-20 md:mt-32 lg:mt-40 lg:ml-64 mx-auto print:relative print:w-full print:max-w-none print:rounded-none print:shadow-none print:border-none print:overflow-visible">
					<div className="p-2 md:p-2 max-h-[80vh] overflow-y-auto print:p-0 print:max-h-none print:overflow-visible print:mt-10 print:ml-12">
						<div className="flex justify-end gap-3 mb-6 md:mb-8 print:hidden">
							<button
								onClick={handleDownloadCSV}
								className="flex items-center gap-1 px-3 py-1.5 border border-blue-400 text-blue-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-blue-50 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
							>
								<Download className="w-4 h-4" /> CSV
							</button>
							<button
								onClick={printPDF}
								className="flex items-center gap-1 px-3 py-1.5 border border-green-400 text-green-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-green-50 hover:text-green-800 focus:outline-none focus:ring-2 focus:ring-green-200 transition"
							>
								<Printer className="w-4 h-4" /> PDF
							</button>
							<button
								onClick={onClose}
								className="flex items-center gap-1 px-3 py-1.5 border border-red-400 text-red-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-red-50 hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-red-200 transition"
							>
								<X className="w-4 h-4" /> Close
							</button>
						</div>

						<h2
							className={`text-lg md:text-xl font-bold text-center md:mb-6 ${maroon}`}
						>
							Job Card - Material Details
						</h2>
						<div className="flex justify-between items-center mb-2">
							<div className="text-sm md:text-base">
								<span className="font-semibold ml-8">
									Job Card for Project No.
								</span>{" "}
								{projectNo || "-"}
							</div>
							<div className="text-sm md:text-base font-semibold text-gray-600 mr-4">
								Currency: LKR
							</div>
						</div>

						<div className="ml-5 mt-1 border border-gray-200 rounded-lg overflow-x-auto print:ml-12 print:mt-12 print:overflow-visible">
							<table className="w-full border-collapse text-sm min-w-[700px] print-table">
								<thead className="bg-gradient-to-r from-[#7A0000] to-[#A52A2A] text-white">
									<tr>
										<th className="px-2 py-1.5 border-r border-gray-200 w-[8%] text-xs">
											Tran.
										</th>
										<th className="px-2 py-1.5 border-r border-gray-200 w-[15%] text-xs">
											Doc No
										</th>
										<th className="px-2 py-1.5 border-r border-gray-200 w-[10%] text-xs">
											Tran. Date
										</th>
										<th className="px-2 py-1.5 border-r border-gray-200 w-[10%] text-xs">
											Mat code
										</th>
										<th className="px-2 py-1.5 border-r border-gray-200 w-[25%] text-xs">
											Material Name
										</th>
										<th className="px-2 py-1.5 border-r border-gray-200 w-[8%] text-xs">
											Grade
										</th>
										<th className="px-2 py-1.5 border-r border-gray-200 w-[8%] text-xs">
											Trx. Qty
										</th>
										<th className="px-2 py-1.5 border-r border-gray-200 w-[8%] text-xs">
											Unit Cost
										</th>
										<th className="px-2 py-1.5 w-[8%] text-xs">
											Trx. Value
										</th>
									</tr>
								</thead>
								<tbody>
									{sortedGroups.map((group, groupIndex) => {
										const groupTotal = group.items.reduce(
											(s, i) => s + i.TrxVal,
											0
										);
										return (
											<React.Fragment key={groupIndex}>
												{group.items.map((m, idx) => (
													<tr
														key={idx}
														className={
															groupIndex % 2
																? "bg-white"
																: "bg-gray-50"
														}
													>
														<td className="px-2 py-1.5 border-r border-gray-200 text-xs">
															{m.TrxType}
														</td>
														<td className="px-2 py-1.5 border-r border-gray-200 text-xs">
															{idx === 0 ? m.DocNo : ""}
														</td>
														<td className="px-2 py-1.5 border-r border-gray-200 text-xs">
															{m.TrxDt
																? new Date(
																		m.TrxDt
																  ).toLocaleDateString(
																		"en-GB",
																		{
																			day: "2-digit",
																			month: "2-digit",
																			year: "numeric",
																		}
																  )
																: "-"}
														</td>
														<td className="px-2 py-1.5 border-r border-gray-200 text-xs">
															{m.MatCd}
														</td>
														<td className="px-2 py-1.5 border-r border-gray-200 text-xs">
															{m.MatNm}
														</td>
														<td className="px-2 py-1.5 border-r border-gray-200 text-xs">
															{m.GradeCd}
														</td>
														<td className="px-2 py-1.5 border-r border-gray-200 text-right font-mono text-xs">
															{formatNumber(m.TrxQty)}
														</td>
														<td className="px-2 py-1.5 border-r border-gray-200 text-right font-mono text-xs">
															{formatNumber(m.UnitCost)}
														</td>
														<td className="px-2 py-1.5 text-right font-mono text-xs">
															{formatNumber(m.TrxVal)}
														</td>
													</tr>
												))}
												<tr className="bg-gray-100 font-bold">
													<td
														colSpan={6}
														className="px-2 py-1.5 text-right border-r border-gray-200 text-xs"
													>
														Document Total
													</td>
													<td className="px-2 py-1.5 border-r border-gray-200"></td>
													<td className="px-2 py-1.5 border-r border-gray-200"></td>
													<td className="px-2 py-1.5 text-right font-mono text-xs">
														{formatNumber(groupTotal)}
													</td>
												</tr>
												{groupIndex < sortedGroups.length - 1 && (
													<tr>
														<td
															colSpan={9}
															className="border-t border-gray-300"
														></td>
													</tr>
												)}
											</React.Fragment>
										);
									})}
									<tr className="bg-gray-200 font-bold print-totals ">
										<td
											colSpan={6}
											className="px-2 py-1.5 text-right border-r border-gray-200 text-xs"
										>
											Grand Total
										</td>
										<td className="px-2 py-1.5 border-r border-gray-200"></td>
										<td className="px-2 py-1.5 border-r border-gray-200"></td>
										<td className="px-2 py-1.5 text-right font-mono text-xs">
											{formatNumber(grandTotal)}
										</td>
									</tr>
								</tbody>
							</table>
						</div>
					</div>
					<iframe ref={iframeRef} className="hidden" />
				</div>
			</div>
		</div>
	);
};

const JobCardMaterials: React.FC = () => {
	const {user} = useUser();
	const [data, setData] = useState<Department[]>([]);
	const [searchId, setSearchId] = useState("");
	const [searchName, setSearchName] = useState("");
	const [filtered, setFiltered] = useState<Department[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [page, setPage] = useState(1);
	const [projectNo, setProjectNo] = useState("");
	const [selectedDepartment, setSelectedDepartment] =
		useState<Department | null>(null);
	const [materials, setMaterials] = useState<MaterialItem[]>([]);
	const [jobCardLoading, setJobCardLoading] = useState(false);
	const [jobCardError, setJobCardError] = useState<string | null>(null);
	const [showJobCardModal, setShowJobCardModal] = useState(false);
	const [isProjectLoading, setIsProjectLoading] = useState(false);
	const pageSize = 9;

	const epfNo = user?.Userno || "";
	const maroon = "text-[#7A0000]";
	const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";

	useEffect(() => {
		const fetchDepartments = async () => {
			if (!epfNo) {
				setError("No EPF number available. Please login again.");
				toast.error("No EPF number available. Please login again.");
				setLoading(false);
				return;
			}

			setLoading(true);
			try {
				const res = await fetch(
					`/misapi/api/incomeexpenditure/departments/${epfNo}`,
					{
						method: "GET",
						headers: {
							"Content-Type": "application/json",
							Accept: "application/json",
						},
					}
				);
				if (!res.ok) {
					const errorText = await res.text();
					throw new Error(
						`HTTP error! status: ${res.status}, message: ${errorText}`
					);
				}
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
				if (Array.isArray(parsed)) rawData = parsed;
				else if (parsed.data && Array.isArray(parsed.data))
					rawData = parsed.data;
				else if (parsed.result && Array.isArray(parsed.result))
					rawData = parsed.result;
				else if (parsed.departments && Array.isArray(parsed.departments))
					rawData = parsed.departments;
				else rawData = [];

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
				console.error("Department Fetch Error:", e);
				const errorMessage = e.message.includes("JSON.parse")
					? "Invalid data format received from server."
					: e.message.includes("Failed to fetch")
					? "Failed to connect to the server. Please check if the server is running and CORS is configured correctly."
					: e.message;
				setError(errorMessage);
				toast.error(errorMessage);
			} finally {
				setLoading(false);
			}
		};
		fetchDepartments();
	}, [epfNo]);

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

	const handleDepartmentSelect = async (department: Department) => {
		if (!projectNo.trim()) {
			toast.error("Please enter a valid project number.");
			return;
		}

		setSelectedDepartment(department);
		setJobCardLoading(true);
		setIsProjectLoading(true);
		setJobCardError(null);
		setMaterials([]);
		setShowJobCardModal(true);

		try {
			const response = await fetch(
				`/misapi/api/jobcardmaterials?projectNo=${encodeURIComponent(
					projectNo
				)}&costCtr=${encodeURIComponent(department.DeptId)}`,
				{
					method: "GET",
					headers: {
						"Content-Type": "application/json",
						Accept: "application/json",
					},
				}
			);
			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(
					`HTTP error! status: ${response.status}, message: ${errorText}`
				);
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
			const result = await response.json();
			let data: MaterialItem[] = [];
			if (Array.isArray(result)) data = result;
			else if (result.data && Array.isArray(result.data)) data = result.data;
			else if (result.result && Array.isArray(result.result))
				data = result.result;
			else data = [];

			setMaterials(data);
			if (data.length === 0) {
				toast.warn(
					`No materials found for project number ${projectNo} in department ${department.DeptId}.`
				);
			} else {
				toast.success(`Successfully fetched material consumption details.`);
			}
		} catch (error: any) {
			console.error("Materials Fetch Error:", error);
			const errorMessage = error.message.includes("Failed to fetch")
				? "Failed to connect to the server. Please check if the server is running and CORS is configured correctly."
				: error.message;
			setJobCardError(errorMessage);
			toast.error(`Failed to fetch materials: ${errorMessage}`);
		} finally {
			setJobCardLoading(false);
			setIsProjectLoading(false);
		}
	};

	const clearFilters = () => {
		setSearchId("");
		setSearchName("");
	};

	const paginatedDepartments = filtered.slice(
		(page - 1) * pageSize,
		page * pageSize
	);

	return (
		<div
			className="max-w-[95%] mx-auto p-2 md:p-4 bg-white rounded-xl shadow border border-gray-200 text-sm md:text-base font-sans relative ml-16 mt-8"
			style={{marginLeft: "2rem"}}
		>
			<div className="flex flex-col md:flex-row justify-between items-center mb-2 md:mb-4">
				<div>
					<h2 className={`text-lg md:text-xl font-bold ${maroon}`}>
						Job Card - Material Details
					</h2>
				</div>
			</div>

			<div className="flex flex-col md:flex-row justify-end items-center mb-2 md:mb-3 space-y-2 md:space-y-0 md:space-x-2">
				<label className={`text-xs md:text-sm font-bold ${maroon}`}>
					Project Number
				</label>
				<input
					type="text"
					value={projectNo}
					placeholder="Enter Project Number"
					onChange={(e) => setProjectNo(e.target.value)}
					className="pl-2 md:pl-3 pr-2 md:pr-3 py-1 md:py-1.5 w-full md:w-40 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A0000] transition text-xs md:text-sm"
					autoComplete="on"
				/>
			</div>

			<div className="flex flex-col md:flex-row flex-wrap gap-2 md:gap-3 justify-end mb-2 md:mb-4">
				<div className="relative w-full md:w-auto">
					<Search className="absolute left-2 md:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 md:w-4 h-3 md:h-4" />
					<input
						type="text"
						value={searchId}
						placeholder="Search by ID"
						onChange={(e) => setSearchId(e.target.value)}
						className="pl-8 md:pl-10 pr-2 md:pr-3 py-1 md:py-1.5 w-full md:w-40 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A0000] transition text-xs md:text-sm"
						autoComplete="off"
					/>
				</div>
				<div className="relative w-full md:w-auto">
					<Search className="absolute left-2 md:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 md:w-4 h-3 md:h-4" />
					<input
						type="text"
						value={searchName}
						placeholder="Search by Name"
						onChange={(e) => setSearchName(e.target.value)}
						className="pl-8 md:pl-10 pr-2 md:pr-3 py-1 md:py-1.5 w-full md:w-40 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A0000] transition text-xs md:text-sm"
						autoComplete="off"
					/>
				</div>
				{(searchId || searchName) && (
					<button
						onClick={clearFilters}
						className="flex items-center gap-1 px-2 md:px-3 py-1 md:py-1.5 border border-gray-300 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs md:text-sm"
					>
						<RotateCcw className="w-3 md:w-4 h-3 md:h-4" /> Clear
					</button>
				)}
			</div>

			{loading && (
				<div className="text-center py-4 md:py-8">
					<div className="animate-spin rounded-full h-6 md:h-8 w-6 md:w-8 border-b-2 border-[#7A0000] mx-auto"></div>
					<p className="mt-1 md:mt-2 text-gray-600 text-xs md:text-sm">
						Loading cost centers...
					</p>
				</div>
			)}

			{error && (
				<div className="bg-red-100 border border-red-400 text-red-700 px-2 md:px-4 py-2 md:py-3 rounded mb-2 md:mb-4 text-xs md:text-sm">
					Error: {error}
				</div>
			)}

			{!loading && !error && filtered.length === 0 && (
				<div className="text-gray-600 bg-gray-100 p-2 md:p-4 rounded text-xs md:text-sm">
					No cost centers found.
				</div>
			)}

			{!loading && !error && filtered.length > 0 && !isProjectLoading && (
				<>
					<div className="overflow-x-auto rounded-lg border border-gray-200">
						<div className="max-h-[50vh] overflow-y-auto">
							<table className="w-full table-fixed text-left text-gray-700 text-xs md:text-sm">
								<thead
									className={`${maroonGrad} text-white sticky top-0`}
								>
									<tr>
										<th className="px-2 md:px-4 py-1 md:py-2 w-1/4 md:w-auto">
											Cost Center Code
										</th>
										<th className="px-2 md:px-4 py-1 md:py-2 w-1/2 md:w-auto">
											Cost Center Name
										</th>
										<th className="px-2 md:px-4 py-1 md:py-2 w-1/4 md:w-auto text-center">
											Action
										</th>
									</tr>
								</thead>
								<tbody>
									{paginatedDepartments.map((department, i) => (
										<tr
											key={`${department.DeptId}-${i}`}
											className={i % 2 ? "bg-white" : "bg-gray-50"}
										>
											<td className="px-2 md:px-4 py-1 md:py-2 truncate min-w-0">
												{department.DeptId}
											</td>
											<td className="px-2 md:px-4 py-1 md:py-2 truncate min-w-0">
												{department.DeptName}
											</td>
											<td className="px-2 md:px-4 py-1 md:py-2 text-center">
												<button
													onClick={() =>
														handleDepartmentSelect(department)
													}
													className={`px-2 md:px-3 py-1 md:py-1 ${maroonGrad} text-white rounded-md text-xs md:text-sm font-medium hover:brightness-110 transition shadow`}
												>
													<Eye className="inline-block mr-1 w-3 md:w-4 h-3 md:h-4" />{" "}
													View
												</button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>

					<div className="flex flex-col md:flex-row justify-end items-center gap-2 md:gap-3 mt-2 md:mt-3">
						<button
							onClick={() => setPage((p) => Math.max(1, p - 1))}
							disabled={page === 1}
							className="px-2 md:px-3 py-1 md:py-1 border rounded bg-white text-gray-600 text-xs md:text-sm hover:bg-gray-100 disabled:opacity-40"
						>
							Previous
						</button>
						<span className="text-xs md:text-sm text-gray-600">
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
							className="px-2 md:px-3 py-1 md:py-1 border rounded bg-white text-gray-600 text-xs md:text-sm hover:bg-gray-100 disabled:opacity-40"
						>
							Next
						</button>
					</div>
				</>
			)}

			{showJobCardModal && selectedDepartment && (
				<JobCardMaterialsTable
					materials={materials}
					loading={jobCardLoading}
					error={jobCardError}
					departmentName={selectedDepartment.DeptName}
					projectNo={projectNo}
					onClose={() => setShowJobCardModal(false)}
				/>
			)}
		</div>
	);
};

export default JobCardMaterials;
