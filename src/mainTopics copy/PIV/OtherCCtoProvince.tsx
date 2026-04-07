//05.Branch wise PIV Collections by Other Cost Centers relevant to the Province

// File: OtherCCtoProvince.tsx
import React, {useEffect, useState, useRef, useMemo} from "react";
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
	CCT_NAME: string; // Receiving department name (province side)
	CCT_NAME1: string; // Company name (province)
}

const formatNumber = (num: number | null | undefined): string => {
	if (num == null || isNaN(num)) return "0.00";
	return new Intl.NumberFormat("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(num);
};

const formatDate = (dateStr: string | null): string => {
	if (!dateStr) return "-";
	try {
		return new Date(dateStr).toLocaleDateString("en-GB");
	} catch {
		return dateStr;
	}

};

const csvEscape = (val: string | number | null | undefined): string => {
		if (val == null) return '""';
		const str = String(val);
		if (/[,\n"']/.test(str)) return `"${str.replace(/"/g, '""')}"`;
		return str;
	};




const OtherCCtoProvince: React.FC = () => {
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

	// Unique sorted account codes
	const accountCodes = Array.from(
		new Set(reportData.map((i) => i.Account_Code))
	).sort();

	// Merge same PIV rows by different account codes
	const mergedReportData = useMemo(() => {
		const map = new Map<string, any>();

		reportData.forEach((item) => {
			const key = `${item.Piv_No}-${item.Piv_Date}-${item.Paid_Date}-${item.Payment_Mode}-${item.Bank_Check_No}-${item.Paid_Dept_Id}-${item.CCT_NAME}-${item.Grand_Total}`;
			if (!map.has(key)) {
				map.set(key, {
					...item,
					amounts: {[item.Account_Code]: item.Amount},
				});
			} else {
				const existing = map.get(key);
				existing.amounts[item.Account_Code] =
					(existing.amounts[item.Account_Code] || 0) + item.Amount;
			}
		});

		return Array.from(map.values());
	}, [reportData]);

	// Group by Paid Cost Center (Other CC) and sort naturally
	const sortedGroupedData = useMemo(() => {
		const groups: Record<string, any[]> = {};
		mergedReportData.forEach((item: any) => {
			const paidId = item.Paid_Dept_Id ?? "";
			const paidName = item.CCT_NAME ?? "";
			const key = `${paidId}|||${paidName}`;
			if (!groups[key]) groups[key] = [];
			groups[key].push(item);
		});

		const sortedKeys = Object.keys(groups).sort((a, b) => {
			const [aId, aName] = a.split("|||");
			const [bId, bName] = b.split("|||");
			const cmpId = aId.localeCompare(bId, undefined, {
				numeric: true,
				sensitivity: "base",
			});
			if (cmpId !== 0) return cmpId;
			return aName.localeCompare(bName, undefined, {
				numeric: true,
				sensitivity: "base",
			});
		});

		const sorted: Record<string, any[]> = {};
		sortedKeys.forEach((k) => {
			sorted[k] = groups[k].slice().sort((x: any, y: any) => {
				// Primary sort: Issued Cost Center (Dept_Id)
				const deptX = x.Dept_Id ?? "";
				const deptY = y.Dept_Id ?? "";
				const deptCmp = deptX.localeCompare(deptY, undefined, {
					numeric: true,
					sensitivity: "base",
				});
				if (deptCmp !== 0) return deptCmp;

				// Secondary: PIV Date
				const dx = x.Piv_Date ? new Date(x.Piv_Date).getTime() : 0;
				const dy = y.Piv_Date ? new Date(y.Piv_Date).getTime() : 0;
				if (dx !== dy) return dx - dy;

				// Tertiary: PIV No
				return String(x.Piv_No ?? "").localeCompare(
					String(y.Piv_No ?? ""),
					undefined,
					{
						numeric: true,
						sensitivity: "base",
					}
				);
			});
		});

		return sorted;
	}, [mergedReportData]);
	// Column totals for gra
	// nd total
	const columnTotals = useMemo(() => {
		const totals: Record<string, number> = {};
		accountCodes.forEach((code) => {
			totals[code] = reportData
				.filter((i) => i.Account_Code === code)
				.reduce((sum, i) => sum + i.Amount, 0);
		});
		return totals;
	}, [reportData, accountCodes]);

	const rowTotal = (amounts: Record<string, number>) => {
		return Object.values(amounts).reduce((s, v) => s + v, 0);
	};

	// Fetch Companies
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
		if (!fromDate || !toDate) return toast.error("Please select both dates");
		if (new Date(toDate) < new Date(fromDate))
			return toast.error("To Date cannot be earlier than From Date");

		setSelectedCompany(company);
		setReportLoading(true);
		setReportData([]);
		setShowReport(true);

		try {
			const url = `/misapi/api/othercctoprovince/get?compId=${company.compId.trim()}&fromDate=${fromDate.replace(
				/-/g,
				""
			)}&toDate=${toDate.replace(/-/g, "")}`;
			const res = await fetch(url);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = await res.json();
			const items: PIVItem[] = Array.isArray(data) ? data : data.data || [];
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

	// CSV Export
	const handleDownloadCSV = () => {
		if (reportData.length === 0 || !selectedCompany) return;

		const headers = [
			"Paid Cost Center",
			"Issued Cost Center",
			"PIV Date",
			"Paid Date",
			"PIV Total",
			"PIV No",
			"Bank Check No",
			...accountCodes,
			"Total",
		];

		const csvRows: string[] = [
			"PIV Collections by Other Cost Centers relevant to the Province",
			`Paid Cost Center : Any other POS Counter`,
			`Issued Branch/Company: ${selectedCompany.compId} / ${selectedCompany.CompName}`,
			`Period ${fromDate} To ${toDate}`,
			"",
			headers.map(csvEscape).join(","),
		];

		Object.keys(sortedGroupedData).forEach((key) => {
			const items = sortedGroupedData[key];
			const [paidId, paidName] = key.split("|||");
			const fullPaid = `${paidId} - ${paidName}`;

			const groupColumnTotals = accountCodes.reduce((acc, code) => {
				acc[code] = items.reduce(
					(sum, item) => sum + (item.amounts[code] || 0),
					0
				);
				return acc;
			}, {} as Record<string, number>);
			const groupRowTotal = Object.values(groupColumnTotals).reduce(
				(a, b) => a + b,
				0
			);

			items.forEach((item) => {
				const row = [
					fullPaid,
					`="${item.Dept_Id ?? ""}"`,
					formatDate(item.Piv_Date),
					formatDate(item.Paid_Date),
					formatNumber(item.Grand_Total),
					`="${item.Piv_No ?? ""}"`,
					`="${item.Bank_Check_No ?? ""}"`,
					...accountCodes.map((code) =>
						formatNumber(item.amounts[code] || 0)
					),
					formatNumber(rowTotal(item.amounts)),
				];
				csvRows.push(row.map(csvEscape).join(","));
			});

			const totalRow = [
				`Total of : ${fullPaid}`,
				"",
				"",
				"",
				"",
				"",
				"",
				...accountCodes.map((code) =>
					formatNumber(groupColumnTotals[code] || 0)
				),
				formatNumber(groupRowTotal),
			];
			csvRows.push(totalRow.map((v) => `"${v}"`).join(","));
			csvRows.push("");
		});

		const grandTotal = Object.values(columnTotals).reduce((a, b) => a + b, 0);
		const grandRow = [
			"GRAND TOTAL",
			"",
			"",
			"",
			"",
			"",
			"",
			...accountCodes.map((c) => formatNumber(columnTotals[c] || 0)),
			formatNumber(grandTotal),
		];
		csvRows.push(grandRow.map((v) => `"${v}"`).join(","));

		const csvContent = csvRows.join("\n");
		const blob = new Blob(["\uFEFF" + csvContent], {
			type: "text/csv;charset=utf-8;",
		});
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `OtherCCtoProvince_${selectedCompany.compId}_${fromDate}_to_${toDate}.csv`;
		link.click();
		URL.revokeObjectURL(url);
	};

	// Print PDF
	const printPDF = () => {
		if (reportData.length === 0 || !iframeRef.current || !selectedCompany)
			return;

		const totalDynamicColumns = accountCodes.length;
		const fixedColumns = 7;
		const totalColumns = fixedColumns + totalDynamicColumns + 1;

		let fontSize = "8.5px";
		let headerFontSize = "10px";
		let titleFontSize = "14px";
		let padding = "4px";
		let tightColWidth = "80px";
		let numericColWidth = "92px";
		let paidCostCenterWidth = "280px";

		if (totalColumns > 22) {
			fontSize = "6px";
			headerFontSize = "8px";
			padding = "2px";
			tightColWidth = "50px";
			numericColWidth = "55px";
			paidCostCenterWidth = "180px";
		} else if (totalColumns > 18) {
			fontSize = "7.5px";
			headerFontSize = "9px";
			tightColWidth = "70px";
			numericColWidth = "80px";
			paidCostCenterWidth = "220px";
		}

		const tableStyle = `
      table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: ${fontSize}; }
      th, td { border: 1px solid #aaa; padding: ${padding}; word-wrap: break-word; vertical-align: top; }
      th { font-size: ${headerFontSize}; font-weight: bold; }
      .paid-cost-center {  background-color: #f3f4f6 !important; text-align: left !important; }
      .numeric { text-align: right !important; }
      .tight { text-align: center; }
    `;

		const colGroupHTML = `
      <colgroup>
        <col style="width: ${paidCostCenterWidth};" />
        <col style="width: ${tightColWidth};" /> <!-- Issued CC -->
        <col style="width: ${tightColWidth};" /> <!-- PIV Date -->
        <col style="width: ${tightColWidth};" /> <!-- Paid Date -->
        <col style="width: ${numericColWidth};" /> <!-- PIV Total -->
        <col style="width: ${tightColWidth};" /> <!-- PIV No -->
        <col style="width: ${tightColWidth};" /> <!-- Bank Check No -->
        ${accountCodes
				.map(() => `<col style="width: ${numericColWidth};" />`)
				.join("")}
        <col style="width: ${numericColWidth}; background-color: #ffebee;" />
      </colgroup>
    `;

		let bodyHTML = "";
		Object.keys(sortedGroupedData).forEach((key) => {
			const items = sortedGroupedData[key];
			const [paidId, paidName] = key.split("|||");

			items.forEach((item, idx) => {
				bodyHTML += `<tr class="${
					idx % 2 === 0 ? "bg-white" : "bg-gray-50"
				}">
          ${
					idx === 0
						? `<td rowspan="${
								items.length + 1
						  }" class="paid-cost-center">${escapeHtml(
								paidId
						  )} - ${escapeHtml(paidName)}</td>`
						: ""
				}
          <td class="tight">${item.Dept_Id || ""}</td>
          <td class="tight">${formatDate(item.Piv_Date)}</td>
          <td class="tight">${formatDate(item.Paid_Date)}</td>
          <td class="numeric">${formatNumber(item.Grand_Total)}</td>
          <td class="tight">${item.Piv_No || ""}</td>
          <td class="tight">${item.Bank_Check_No || "-"}</td>
          ${accountCodes
					.map(
						(code) =>
							`<td class="numeric">${formatNumber(
								item.amounts[code] || 0
							)}</td>`
					)
					.join("")}
          <td class="numeric">${formatNumber(
					rowTotal(item.amounts)
				)}</td>
        </tr>`;
			});

			const groupColumnTotals = accountCodes.reduce((acc, code) => {
				acc[code] = items.reduce(
					(sum, item) => sum + (item.amounts[code] || 0),
					0
				);
				return acc;
			}, {} as Record<string, number>);
			const groupRowTotal = Object.values(groupColumnTotals).reduce(
				(a, b) => a + b,
				0
			);

			bodyHTML += `
        <tr style="background-color: #e0e0e0;">
          <td colspan="6" style="text-align: left; padding-left: 8px;">Total of : ${escapeHtml(
					paidId
				)} - ${escapeHtml(paidName)}</td>
          ${accountCodes
					.map(
						(code) =>
							`<td class="numeric">${formatNumber(
								groupColumnTotals[code] || 0
							)}</td>`
					)
					.join("")}
          <td class="numeric">${formatNumber(groupRowTotal)}</td>
        </tr>
        <tr><td colspan="${totalColumns}" style="height: 12px; background: white;"></td></tr>`;
		});

		const grandRowTotal = Object.values(columnTotals).reduce(
			(a, b) => a + b,
			0
		);
		bodyHTML += `
      <tr style="background-color: #bfdbfe; font-weight: bold;">
        <td colspan="7" style="text-align: left; padding-left: 12px;">GRAND TOTAL</td>
        ${accountCodes
				.map(
					(code) =>
						`<td class="numeric font-bold">${formatNumber(
							columnTotals[code] || 0
						)}</td>`
				)
				.join("")}
        <td class="numeric font-bold">${formatNumber(grandRowTotal)}</td>
      </tr>`;

		const headerHTML = `
      <thead>
        <tr style="background-color: white; ">
          <th>Paid Cost Center</th>
          <th>Issued Cost Center</th>
          <th>PIV Date</th>
          <th>Paid Date</th>
          <th>PIV Total</th>
          <th>PIV No</th>
          <th>Bank Check No</th>
          ${accountCodes.map((c) => `<th>${escapeHtml(c)}</th>`).join("")}
          <th>Total</th>
        </tr>
      </thead>`;

		const fullHTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>PIV Report - Other CC to Province</title>
<style>${tableStyle}
body { 
font-family: Arial, sans-serif;
 margin: 8mm; 
 print-color-adjust: exact;
  }

h3 { 
text-align: center;
 color: #7A0000; 
 font-size: ${titleFontSize}; 
 font-weight: bold; 
 margin: 0 0 4px 0; 
 }

    .subtitle { 
      font-size: 11px; 
    }

	.subtitle .left {
	text-align: left;
	}

	.subtitle .right {
	text-align: right;
	margin-bottom: 4px;
	}

	.left .line {
  margin-bottom: 3px; 
}

@page { 
size: A3 landscape;
 margin: 10mm; 

@bottom-left { 
        content: "Printed on: ${new Date().toLocaleString()}"; 
        font-size: 9px; 
        color: #666; 
      }
      @bottom-right { 
        content: "Page " counter(page) " of " counter(pages); 
        font-size: 9px; 
        color: #666; 
      }
        }

</style>
</head>
<body>
<h3>PIV Collections by Other Cost Centers relevant to the Province</h3>
<div class="subtitle">
  <div class="left">
    <div class="line">
      <strong>Paid Cost Center:</strong>
      Any other POS Counter </br> Issued Branch :
      ${escapeHtml(selectedCompany.compId)} /
      ${escapeHtml(selectedCompany.CompName)}
    </div>

    <div class="line">
      <strong>Period:</strong> ${fromDate} to ${toDate}
    </div>
  </div>

  <div class="right">
    <strong>Currency:</strong> LKR
  </div>
</div>
<table>${colGroupHTML}${headerHTML}<tbody>${bodyHTML}</tbody></table>
</body>
</html>`;

		const doc = iframeRef.current!.contentDocument!;
		doc.open();
		doc.write(fullHTML);
		doc.close();

		setTimeout(() => iframeRef.current?.contentWindow?.print(), 1000);
	};

	const escapeHtml = (text: string) => {
		const div = document.createElement("div");
		div.textContent = text;
		return div.innerHTML;
	};

	return (
		<div className="max-w-7xl mx-auto p-6 bg-white rounded-xl shadow border border-gray-200 text-sm">
			<h2 className={`text-xl font-bold mb-4 ${maroon}`}>
				PIV Collections by Other Cost Centers relevant to the Province
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
						placeholder="Search by ID"
						value={searchId}
						onChange={(e) => setSearchId(e.target.value)}
						className="pl-10 pr-4 py-1.5 w-48 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#7A0000] transition text-sm"
					/>
				</div>
				<div className="relative">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
					<input
						type="text"
						placeholder="Search by Name"
						value={searchName}
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
						className="flex items-center gap-1.5 px-4 py-1.5 bg-gray-100 hover:bg-gray-200 rounded border text-xs font-medium"
					>
						<RotateCcw className="w-3.5 h-3.5" /> Clear
					</button>
				)}
			</div>

			{/* Companies List */}
			{loading && (
				<div className="text-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7A0000] mx-auto"></div>
					<p className="mt-2">Loading companies...</p>
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
								PIV Collections by Other Cost Centers relevant to the
								Province
							</h2>
							<div className="flex justify-between text-sm mb-3">
								<div>
									<strong>Paid Cost Center :</strong> Any other POS
									Counter <br />
									<strong>Issued Branch :</strong>{" "}
									{selectedCompany?.compId} /{" "}
									{selectedCompany?.CompName}
									<br />
									<strong>Period:</strong> {fromDate} to {toDate}
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
							) : reportData.length === 0 ? (
								<div className="text-center py-20 text-gray-500 text-lg">
									No records found.
								</div>
							) : (
								<div className="overflow-x-auto border rounded-lg">
									<table className="w-full text-xs min-w-max">
										<thead className={`${maroonGrad} text-white`}>
											<tr>
												<th className="px-2 py-1.5">
													Paid Cost Center
												</th>
												<th className="px-2 py-1.5">
													Issued Cost Center
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
														className="px-2 py-1.5 text-right"
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
											{Object.keys(sortedGroupedData).map((key) => {
												const items = sortedGroupedData[key];
												const [paidId, paidName] = key.split("|||");

												return (
													<React.Fragment key={key}>
														{items.map((item, idx) => (
															<tr
																key={`${item.Piv_No}-${idx}`}
																className={
																	idx % 2 === 0
																		? "bg-white"
																		: "bg-gray-50"
																}
															>
																{idx === 0 && (
																	<td
																		rowSpan={items.length + 1}
																		className="px-2 py-1 font-medium bg-gray-100 align-top border border-gray-300"
																	>
																		{paidId} - {paidName}
																	</td>
																)}
																<td className="px-2 py-1 border border-gray-300">
																	{item.Dept_Id}
																</td>
																<td className="px-2 py-1 border border-gray-300">
																	{formatDate(item.Piv_Date)}
																</td>
																<td className="px-2 py-1 border border-gray-300">
																	{formatDate(item.Paid_Date)}
																</td>
																<td className="px-2 py-1 text-right font-bold border border-gray-300">
																	{formatNumber(
																		item.Grand_Total
																	)}
																</td>
																<td className="px-2 py-1 border border-gray-300">
																	{item.Piv_No}
																</td>
																<td className="px-2 py-1 border border-gray-300">
																	{item.Bank_Check_No || "-"}
																</td>
																{accountCodes.map((code) => (
																	<td
																		key={code}
																		className="px-2 py-1 text-right border border-gray-300"
																	>
																		{formatNumber(
																			item.amounts[code] || 0
																		)}
																	</td>
																))}
																<td className="px-2 py-1 text-right font-bold border border-gray-300">
																	{formatNumber(
																		rowTotal(item.amounts)
																	)}
																</td>
															</tr>
														))}

														{/* Group Total */}
														{(() => {
															const groupColumnTotals =
																accountCodes.reduce(
																	(acc, code) => {
																		acc[code] = items.reduce(
																			(sum, it) =>
																				sum +
																				(it.amounts[code] ||
																					0),
																			0
																		);
																		return acc;
																	},
																	{} as Record<string, number>
																);
															const groupRowTotal =
																Object.values(
																	groupColumnTotals
																).reduce((a, b) => a + b, 0);

															return (
																<tr className="bg-gray-200 font-bold">
																	<td
																		colSpan={6}
																		className="px-2 py-1 border border-gray-300"
																	>
																		Total of : {paidId} -{" "}
																		{paidName}
																	</td>
																	{accountCodes.map((code) => (
																		<td
																			key={code}
																			className="px-2 py-1 text-right border border-gray-300"
																		>
																			{formatNumber(
																				groupColumnTotals[
																					code
																				] || 0
																			)}
																		</td>
																	))}
																	<td className="px-2 py-1 text-right border border-gray-300">
																		{formatNumber(
																			groupRowTotal
																		)}
																	</td>
																</tr>
															);
														})()}

														<tr>
															<td
																colSpan={
																	8 + accountCodes.length
																}
																className="h-4"
															></td>
														</tr>
													</React.Fragment>
												);
											})}

											{/* Grand Total */}
											<tr className="bg-blue-200 font-bold text-sm">
												<td
													colSpan={7}
													className="px-2 py-1 border border-white text-center"
												>
													GRAND TOTAL
												</td>
												{accountCodes.map((code) => (
													<td
														key={code}
														className="px-2 py-1 text-right border border-white"
													>
														{formatNumber(
															columnTotals[code] || 0
														)}
													</td>
												))}
												<td className="px-2 py-1 text-right border border-white">
													{formatNumber(
														Object.values(columnTotals).reduce(
															(a, b) => a + b,
															0
														)
													)}
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

export default OtherCCtoProvince;
