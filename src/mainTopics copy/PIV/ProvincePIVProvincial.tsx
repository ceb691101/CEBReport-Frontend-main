//02.PIV Collections by Provincial POS
// File: ProvincePIVProvincial.tsx
import React, {useEffect, useState, useRef} from "react";
import {Search, RotateCcw, Eye, X, Download, Printer} from "lucide-react";
import {useUser} from "../../contexts/UserContext";
import {toast} from "react-toastify";
import DateRangePicker from "../../components/utils/DateRangePicker";

interface Company {
	compId: string;
	CompName: string;
}

interface PIVItem {
	Cost_Center: string;
	Dept_Id: string;
	Paid_Dept_Id?: string; // May be present for sorting
	Piv_No: string;
	Piv_Receipt_No?: string; // May be present for sorting
	Piv_Date: string;
	Paid_Date: string;
	Payment_Mode: string;
	Cheque_No: string;
	Grand_Total: number;
	Bank_Check_No: string;
	CCT_NAME: string;
	Account_Code: string;
	Amount: number;
}

/* ────── Helpers ────── */
const csvEscape = (val: string | number | null | undefined): string => {
	if (val == null) return '""';
	const str = String(val);
	if (/[,\n"']/.test(str)) return `"${str.replace(/"/g, '""')}"`;
	return str;
};

const formatNumber = (num: number | null | undefined): string => {
	if (num === null || num === undefined || isNaN(num)) return "0.00";
	const absValue = Math.abs(num);
	const formatted = new Intl.NumberFormat("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(absValue);
	return num < 0 ? `(${formatted})` : formatted;
};

const formatDate = (dateStr: string | null): string => {
	if (!dateStr) return "-";
	try {
		return new Date(dateStr).toLocaleDateString("en-GB");
	} catch {
		return dateStr;
	}
};

const ProvincePIVProvincial: React.FC = () => {
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

	// Sort raw data in the exact order requested before any grouping
	const sortReportData = (data: PIVItem[]): PIVItem[] => {
		return [...data].sort((a, b) => {
			const paidDeptA = a.Paid_Dept_Id ?? "";
			const paidDeptB = b.Paid_Dept_Id ?? "";
			if (paidDeptA !== paidDeptB) return paidDeptA.localeCompare(paidDeptB);

			if (a.Dept_Id !== b.Dept_Id) return a.Dept_Id.localeCompare(b.Dept_Id);

			if (a.Piv_No !== b.Piv_No) return a.Piv_No.localeCompare(b.Piv_No);

			const receiptA = a.Piv_Receipt_No ?? "";
			const receiptB = b.Piv_Receipt_No ?? "";
			if (receiptA !== receiptB) return receiptA.localeCompare(receiptB);

			if (a.Piv_Date !== b.Piv_Date)
				return a.Piv_Date.localeCompare(b.Piv_Date);

			if (a.Paid_Date !== b.Paid_Date)
				return a.Paid_Date.localeCompare(b.Paid_Date);

			if (a.Payment_Mode !== b.Payment_Mode)
				return a.Payment_Mode.localeCompare(b.Payment_Mode);

			if (a.Cheque_No !== b.Cheque_No)
				return a.Cheque_No.localeCompare(b.Cheque_No);

			if (a.Grand_Total !== b.Grand_Total)
				return a.Grand_Total - b.Grand_Total;

			if (a.Account_Code !== b.Account_Code)
				return a.Account_Code.localeCompare(b.Account_Code);

			return a.Amount - b.Amount;
		});
	};

	// Group by Piv_No first
	const groupPIVData = (data: PIVItem[]) => {
		const map = new Map<
			string,
			{item: PIVItem; accountAmounts: Record<string, number>}
		>();

		data.forEach((row) => {
			const key = row.Piv_No;
			if (!map.has(key)) {
				map.set(key, {item: {...row}, accountAmounts: {}});
			}
			const entry = map.get(key)!;
			const first = entry.item;

			// Ensure header fields are filled from any row
			if (!first.Piv_Date) first.Piv_Date = row.Piv_Date;
			if (!first.Paid_Date) first.Paid_Date = row.Paid_Date;
			if (!first.Payment_Mode) first.Payment_Mode = row.Payment_Mode;
			if (!first.Cheque_No) first.Cheque_No = row.Cheque_No;
			if (!first.Bank_Check_No) first.Bank_Check_No = row.Bank_Check_No;
			if (!first.Cost_Center) first.Cost_Center = row.Cost_Center;
			if (!first.Dept_Id) first.Dept_Id = row.Dept_Id;
			if (!first.CCT_NAME) first.CCT_NAME = row.CCT_NAME;

			entry.accountAmounts[row.Account_Code] = row.Amount;
		});

		return Array.from(map.values());
	};

	// Group by Cost Center → Dept_Id (Issued ID)
	const groupByCostCenterAndDept = () => {
		const sortedPIVs = groupPIVData(sortReportData(reportData));
		const grouped: Record<string, Record<string, typeof sortedPIVs>> = {};

		sortedPIVs.forEach(({item, accountAmounts}) => {
			const cc = item.Cost_Center || "Unknown";
			const dept = item.Dept_Id || "N/A";
			if (!grouped[cc]) grouped[cc] = {};
			if (!grouped[cc][dept]) grouped[cc][dept] = [];
			grouped[cc][dept].push({item, accountAmounts});
		});

		return grouped;
	};

	const accountCodes = Array.from(
		new Set(reportData.map((i) => i.Account_Code)),
	).sort();
	const groupedData = groupByCostCenterAndDept();

	// Fetch companies
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
					`/misapi/api/incomeexpenditure/Usercompanies/${epfNo}/60`,
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
					c.CompName.toLowerCase().includes(searchName.toLowerCase())),
		);
		setFiltered(f);
		setPage(1);
	}, [searchId, searchName, companies]);

	const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

	const handleViewReport = async (company: Company) => {
		if (!fromDate || !toDate) return toast.error("Select both dates");
		if (new Date(toDate) < new Date(fromDate))
			return toast.error("Invalid date range");

		setSelectedCompany(company);
		setReportLoading(true);
		setReportData([]);
		setShowReport(true);

		try {
			const url = `/misapi/api/provincepivprovincialpos/get?compId=${
				company.compId
			}&fromDate=${fromDate.replace(/-/g, "")}&toDate=${toDate.replace(
				/-/g,
				"",
			)}`;
			const res = await fetch(url);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = await res.json();
			const items: PIVItem[] = Array.isArray(data) ? data : data.data || [];
			setReportData(items);
			items.length === 0
				? toast.warn("No records")
				: toast.success("Loaded");
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
		if (reportData.length === 0) return;

		const headers = [
			"Paid Cost Center",
			"Issued  Cost Center",
			"PIV Date",
			"Paid Date",
			"PIV No",
			"Bank Check Number",
			"PIV Total",
			...accountCodes,
			"Total",
		];

		const rows: string[] = [
			"PIV Collections by Provincial POS",
			"Issued Cost Center: Any Cost Center",
			`Paid Branch/Company: ${selectedCompany?.compId} - ${selectedCompany?.CompName}`,
			`Period: ${fromDate} to ${toDate}`,
			`Generated: ${new Date().toLocaleString()}`,
			"",
			headers.map(csvEscape).join(","),
		];

		Object.keys(groupedData).forEach((cc) => {
			const ccName =
				reportData.find((i) => i.Cost_Center === cc)?.CCT_NAME || cc;

			const paidCostCenter = `${cc} - ${ccName}`;
			const deptGroups = groupedData[cc];

			Object.keys(deptGroups).forEach((deptId) => {
				const pivGroups = deptGroups[deptId];

				pivGroups.forEach(({item, accountAmounts}) => {
					const pivTotal = accountCodes.reduce(
						(s, acc) => s + (accountAmounts[acc] || 0),
						0,
					);

					const row = [
						csvEscape(paidCostCenter),
						csvEscape(`="${deptId}"`), // Issued ID as STRING
						csvEscape(formatDate(item.Piv_Date)),
						csvEscape(formatDate(item.Paid_Date)),
						csvEscape(item.Piv_No),
						csvEscape(`="${item.Bank_Check_No || ""}"`), // Bank Check as STRING
						csvEscape(formatNumber(pivTotal)),
						...accountCodes.map((acc) =>
							csvEscape(formatNumber(accountAmounts[acc] || 0)),
						),
						csvEscape(formatNumber(pivTotal)),
					];

					rows.push(row.join(","));
				});
			});

			// Cost center total
			const ccTotal = Object.values(deptGroups)
				.flat()
				.reduce((sum, g) => {
					const pivSum = accountCodes.reduce(
						(s, acc) => s + (g.accountAmounts[acc] || 0),
						0,
					);
					return sum + pivSum;
				}, 0);

			const ccAccTotals = accountCodes.map((acc) =>
				Object.values(deptGroups)
					.flat()
					.reduce((s, g) => s + (g.accountAmounts[acc] || 0), 0),
			);

			rows.push(
				[
					csvEscape(`TOTAL - ${paidCostCenter}`),
					"",
					"",
					"",
					"",
					"",
					"",
					...ccAccTotals.map((t) => csvEscape(formatNumber(t))),
					csvEscape(formatNumber(ccTotal)),
				].join(","),
			);

			rows.push("");
		});

		// Grand total
		const grandTotal = Object.values(groupedData)
			.flatMap(Object.values)
			.flat()
			.reduce((sum, g) => {
				const pivSum = accountCodes.reduce(
					(s, acc) => s + (g.accountAmounts[acc] || 0),
					0,
				);
				return sum + pivSum;
			}, 0);

		const grandAccTotals = accountCodes.map((acc) =>
			Object.values(groupedData)
				.flatMap(Object.values)
				.flat()
				.reduce((s, g) => s + (g.accountAmounts[acc] || 0), 0),
		);

		rows.push(
			[
				csvEscape("GRAND TOTAL"),
				"",
				"",
				"",
				"",
				"",
				"",
				...grandAccTotals.map((t) => csvEscape(formatNumber(t))),
				csvEscape(formatNumber(grandTotal)),
			].join(","),
		);

		const blob = new Blob([rows.join("\n")], {
			type: "text/csv;charset=utf-8;",
		});

		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `ProvincePIV_Provincial_${selectedCompany?.compId}_${fromDate}_to_${toDate}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	};

	// Print PDF
	const printPDF = () => {
		if (reportData.length === 0 || !iframeRef.current || !selectedCompany)
			return;

		const accountCodes = Array.from(
			new Set(reportData.map((i) => i.Account_Code)),
		).sort();

		const totalDynamicColumns = accountCodes.length;
		const fixedColumns = 7; // Cost Center (rowspan), PIV Date, Paid Date, PIV No, Bank Check No, Paid Amount, Total
		const totalColumns = fixedColumns + totalDynamicColumns + 1;

		// Dynamic styling based on column count
		let fontSize = "10px";
		let headerFontSize = "11px";
		let titleFontSize = "14px";
		let padding = "8px";
		let tightColWidth = "80px";
		let tightColWidthLong = "90px";
		let numericColWidth = "80px";
		let costCenterColWidth = "180px";

		if (totalColumns > 22) {
			fontSize = "6px";
			headerFontSize = "6px";
			padding = "2px";
			tightColWidth = "20px";
			tightColWidthLong = "20px";
			numericColWidth = "20px";
			costCenterColWidth = "40px";
		} else if (totalColumns > 18) {
			fontSize = "7.5px";
			headerFontSize = "9px";
			padding = "5px";
			tightColWidth = "50px";
			tightColWidthLong = "60px";
			numericColWidth = "60px";
			costCenterColWidth = "150px";
		}

		const tableStyle = `
    table { 
      width: auto;              
      max-width: 100%;
      border-collapse: collapse; 
      table-layout: fixed; 
      font-size: ${fontSize}; 
      font-family: Arial, sans-serif;
    }
    th, td { 
      border: 1px solid #aaa; 
      padding: ${padding}; 
      word-wrap: break-word; 
      vertical-align: top; 
    }
    th { 
      font-size: ${headerFontSize}; 
      font-weight: bold;  
      text-align: center;
    }
    .cost-center { 
      background-color: #f3f4f6 !important; 
      text-align: left !important; 
      font-weight: medium;
    }
    .numeric { 
      text-align: right !important; 
      font-family: monospace;
    }
    .tight { 
      text-align: center; 
    }
    .group-total {
      background-color: #e0e0e0 !important;
      font-weight: bold;
	
    }

	.group-total-issued {
      background-color: #f0f0f0 !important;
      
    }
    .grand-total {
      background-color: #bfdbfe !important;
      font-weight: bold;
      
    }
  `;

		const colGroupHTML = `
    <colgroup>
      <col style="width: ${costCenterColWidth};" /> <!-- Paid Cost Center (rowspan) -->
      <col style="width: ${tightColWidth};" />     <!-- PIV Date -->
      <col style="width: ${tightColWidth};" />     <!-- Paid Date -->
      <col style="width: ${tightColWidthLong};" /> <!-- PIV No -->
      <col style="width: ${tightColWidthLong};" /> <!-- Bank Check No -->
      <col style="width: ${numericColWidth};" />   <!-- Paid Amount -->
      ${accountCodes
			.map(() => `<col style="width: ${numericColWidth};" />`)
			.join("")}
			<col  class="total-col" style="width: ${numericColWidth};" /> <!-- Total -->
    </colgroup>
  `;

		const escapeHtml = (text: string | undefined | null): string => {
			if (text == null) return "";
			const div = document.createElement("div");
			div.textContent = text;
			return div.innerHTML;
		};

		let bodyHTML = "";

		Object.keys(groupedData).forEach((cc) => {
			const ccName =
				reportData.find((i) => i.Cost_Center === cc)?.CCT_NAME || cc;
			const deptGroups = groupedData[cc];
			const allDeptIds = Object.keys(deptGroups);
			const totalPivCount = Object.values(deptGroups).reduce(
				(s: any, arr: any) => s + arr.length,
				0,
			);
			let rowCounter = 0;

			allDeptIds.forEach((deptId) => {
				const pivGroups = deptGroups[deptId];

				pivGroups.forEach(({item, accountAmounts}, idx) => {
					const isFirstInDept = idx === 0;
					const isFirstInCC = rowCounter === 0;
					rowCounter++;

					const pivTotal = accountCodes.reduce(
						(s, acc) => s + (accountAmounts[acc] || 0),
						0,
					);

					bodyHTML += `<tr class="${
						rowCounter % 2 === 0 ? "bg-white" : "bg-gray-50"
					}">
          ${
					isFirstInCC
						? `<td rowspan="${
								totalPivCount + allDeptIds.length + 1
							}" class="cost-center">${escapeHtml(cc)} - ${escapeHtml(
								ccName,
							)}</td>`
						: ""
				}
          ${
					isFirstInDept
						? `<td rowspan="${
								pivGroups.length + 1
							}" class="tight font-semibold bg-blue-50 text-blue-800">${escapeHtml(
								deptId,
							)}</td>`
						: ""
				}
          <td class="tight">${formatDate(item.Piv_Date)}</td>
          <td class="tight">${formatDate(item.Paid_Date)}</td>
          <td class="tight">${escapeHtml(item.Piv_No)}</td>
          <td class="tight">${escapeHtml(item.Bank_Check_No || "-")}</td>
          <td class="numeric font-bold">${formatNumber(pivTotal)}</td>
          ${accountCodes
					.map(
						(acc) =>
							`<td class="numeric">${formatNumber(
								accountAmounts[acc] || 0,
							)}</td>`,
					)
					.join("")}
          <td class="numeric font-bold">${formatNumber(pivTotal)}</td>
        </tr>`;
				});

				// Department Total Row
				const deptTotal = pivGroups.reduce(
					(s, g) =>
						s +
						accountCodes.reduce(
							(t, acc) => t + (g.accountAmounts[acc] || 0),
							0,
						),
					0,
				);

				bodyHTML += `<tr class="group-total-issued">
        <td colspan="4" style="text-align: left; padding-left: 12px;">Total - Issued  Cost Center: ${escapeHtml(
				deptId,
			)}</td>
        <td class="numeric"></td>
        ${accountCodes
				.map((acc) => {
					const sum = pivGroups.reduce(
						(s, g) => s + (g.accountAmounts[acc] || 0),
						0,
					);
					return `<td class="numeric">${formatNumber(sum)}</td>`;
				})
				.join("")}
        <td class="numeric font-bold">${formatNumber(deptTotal)}</td>
      </tr>`;
			});

			// Cost Center Total Row
			const ccTotal = Object.values(deptGroups)
				.flat()
				.reduce(
					(s, g) =>
						s +
						accountCodes.reduce(
							(t, acc) => t + (g.accountAmounts[acc] || 0),
							0,
						),
					0,
				);

			bodyHTML += `<tr class="group-total" style="background-color: #d0d0d0;">
      <td colspan="6" style="text-align: left; padding-left: 12px;">Total - ${escapeHtml(
			ccName,
		)}</td>
      ${accountCodes
			.map((acc) => {
				const sum = Object.values(deptGroups)
					.flat()
					.reduce((s, g) => s + (g.accountAmounts[acc] || 0), 0);
				return `<td class="numeric">${formatNumber(sum)}</td>`;
			})
			.join("")}
      <td class="numeric font-bold">${formatNumber(ccTotal)}</td>
    </tr>`;

			bodyHTML += `<tr><td colspan="${totalColumns}" style="height: 12px; background: white; border: none;"></td></tr>`;
		});

		// Grand Total Row
		const grandTotal = Object.values(groupedData)
			.flatMap(Object.values)
			.flat()
			.reduce(
				(s, g) =>
					s +
					accountCodes.reduce(
						(t, acc) => t + (g.accountAmounts[acc] || 0),
						0,
					),
				0,
			);

		bodyHTML += `<tr class="grand-total">
    <td colspan="6" style="text-align: right; padding-right: 12px; font-size: ${headerFontSize};">GRAND TOTAL</td>
    <td class="numeric"></td>
    ${accountCodes
			.map((acc) => {
				const sum = Object.values(groupedData)
					.flatMap(Object.values)
					.flat()
					.reduce((s, g) => s + (g.accountAmounts[acc] || 0), 0);
				return `<td class="numeric font-bold">${formatNumber(sum)}</td>`;
			})
			.join("")}
    <td class="numeric font-bold" style="font-size: ${headerFontSize};">${formatNumber(
			grandTotal,
		)}</td>
  </tr>`;

		const headerHTML = `
    <thead>
      <tr style="background-color: white;">
        <th>Paid Cost Center</th>
        <th>Issued  Cost Center</th>
        <th>PIV Date</th>
        <th>Paid Date</th>
        <th>PIV No</th>
        <th>Bank  Reference No</th>
        <th>PIV Total</th>
        ${accountCodes.map((acc) => `<th>${escapeHtml(acc)}</th>`).join("")}
        <th>Total</th>
      </tr>
    </thead>`;

		const fullHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>PIV Collections by Provincial POS</title>
  <style>
    ${tableStyle}
    body { 
      margin: 8mm; 
      print-color-adjust: exact; 
      font-family: Arial, sans-serif; 
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
      display: flex; 
      justify-content: space-between; 
      margin-bottom: 8px; 
    }
    .subtitle .left { text-align: left; }
    .subtitle .right { text-align: right; }
    .left .line { margin-bottom: 3px; }
    @page { 
      size: A3 landscape; 
      margin: 10mm; 
    }
    @page { 
      @bottom-left { content: "Printed on: ${new Date().toLocaleString()}"; font-size: 9px;  }
      @bottom-right { content: "Page " counter(page) " of " counter(pages); font-size: 9px;  }
    }
  </style>
</head>
<body>
  <h3>PIV Collections by Provincial POS</h3>
  <div class="subtitle">
    <div class="left">
      <div class="line"><strong>Issued Cost Center:</strong> Any Cost Center</div>
      <div class="line"><strong>Paid Branch/Company:</strong> ${escapeHtml(
			selectedCompany.compId,
		)} - ${escapeHtml(selectedCompany.CompName)}</div>
      <div class="line"><strong>Period:</strong> ${fromDate} to ${toDate}</div>
    </div>
    <div class="right"><strong>Currency:</strong> LKR</div>
  </div>
  <table>
    ${colGroupHTML}
    ${headerHTML}
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
		<div className="max-w-7xl mx-auto p-6 bg-white rounded-xl shadow border border-gray-200 text-sm font-sans">
			<h2 className={`text-xl font-bold mb-4 ${maroon}`}>
				PIV Collections by Provincial POS
			</h2>

			<DateRangePicker
				fromDate={fromDate}
				toDate={toDate}
				onFromChange={setFromDate}
				onToChange={setToDate}
			/>
			<div className="flex flex-wrap items-center gap-3 mb-4">
				<div className="relative">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
					<input
						type="text"
						value={searchId}
						placeholder="Search by ID"
						onChange={(e) => setSearchId(e.target.value)}
						className="pl-10 pr-4 py-1.5 w-48 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#7A0000] transition text-sm"
					/>
				</div>
				<div className="relative">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
					<input
						type="text"
						value={searchName}
						placeholder="Search by Name"
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
						className="flex items-center gap-1.5 px-4 py-1.5 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md text-xs font-medium transition"
					>
						<RotateCcw className="w-3.5 h-3.5" /> Clear
					</button>
				)}
			</div>

			{loading && (
				<div className="text-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7A0000] mx-auto"></div>
					<p className="mt-2 text-gray-600 text-sm">
						Loading companies...
					</p>
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
						<table className="w-full text-left">
							<thead className={`${maroonGrad} text-white`}>
								<tr>
									<th className="px-4 py-2">Company Code</th>
									<th className="px-4 py-2">Company Name</th>
									<th className="px-4 py-2 text-center">Action</th>
								</tr>
							</thead>
						</table>
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
										p + 1,
									),
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

			{showReport && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/90 print:static print:inset-auto print:p-0 print:bg-white">
					<div className="relative bg-white w-full max-w-[95vw] rounded-2xl shadow-2xl border border-gray-200 overflow-hidden mt-20 lg:ml-64 mx-auto print:w-full print:max-w-none print:rounded-none print:shadow-none print:border-none">
						<div className="p-4 max-h-[85vh] overflow-y-auto print:p-0 print:max-h-none print:overflow-visible">
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
								PIV Collections by Provincial POS
							</h2>

							<div className="flex justify-between text-sm mb-3">
								<div>
									<p>
										<strong>Issued Cost Center:</strong> Any Cost
										Center
									</p>
									<p>
										<strong>Paid Branch/Company:</strong>{" "}
										{selectedCompany?.compId} -{" "}
										{selectedCompany?.CompName}
									</p>
									<p>
										<strong>Period:</strong> {fromDate} to {toDate}
									</p>
								</div>
								<div className="font-semibold text-gray-600">
									Currency: LKR
								</div>
							</div>

							{reportLoading ? (
								<div className="text-center py-20">
									<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7A0000] mx-auto"></div>
									<p className="mt-2 text-gray-600">
										Loading report data...
									</p>
								</div>
							) : reportData.length === 0 ? (
								<div className="text-center py-20 text-gray-500 text-lg">
									No records found.
								</div>
							) : (
								<div className="overflow-x-auto border rounded-lg">
									<table className="w-full text-xs min-w-max table-auto">
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
												<th className="px-2 py-1.5">PIV No</th>
												<th className="px-2 py-1.5">
													Bank Reference No
												</th>
												<th className="px-2 py-1.5 text-right font-bold">
													PIV Total
												</th>
												{accountCodes.map((acc) => (
													<th
														key={acc}
														className="px-2 py-1.5 text-right font-mono"
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
											{Object.keys(groupedData).map((cc) => {
												const ccName =
													reportData.find(
														(i) => i.Cost_Center === cc,
													)?.CCT_NAME || cc;
												const deptGroups = groupedData[cc];
												const allDeptIds = Object.keys(deptGroups);
												const totalPivCount = Object.values(
													deptGroups,
												).reduce(
													(s: any, arr: any) => s + arr.length,
													0,
												);
												let rowCounter = 0;

												return (
													<React.Fragment key={cc}>
														{allDeptIds.map((deptId) => {
															const pivGroups =
																deptGroups[deptId];
															return (
																<React.Fragment key={deptId}>
																	{pivGroups.map(
																		(
																			{item, accountAmounts},
																			idx,
																		) => {
																			const isFirstInDept =
																				idx === 0;
																			const isFirstInCC =
																				rowCounter === 0;
																			rowCounter++;
																			const pivTotal =
																				accountCodes.reduce(
																					(s, acc) =>
																						s +
																						(accountAmounts[
																							acc
																						] || 0),
																					0,
																				);

																			return (
																				<tr
																					key={item.Piv_No}
																					className={
																						rowCounter %
																							2 ===
																						0
																							? "bg-white"
																							: "bg-gray-50"
																					}
																				>
																					{isFirstInCC && (
																						<td
																							rowSpan={
																								totalPivCount +
																								allDeptIds.length +
																								1
																							}
																							className="px-2 py-1 border border-gray-200 font-medium bg-gray-100 align-top"
																						>
																							{cc} -{" "}
																							{ccName}
																						</td>
																					)}
																					{isFirstInDept && (
																						<td
																							rowSpan={
																								pivGroups.length +
																								1
																							}
																							className="px-2 py-1 border border-gray-200 font-semibold bg-blue-50 text-blue-800"
																						>
																							{deptId}
																						</td>
																					)}
																					<td className="px-2 py-1 border border-gray-200">
																						{formatDate(
																							item.Piv_Date,
																						)}
																					</td>
																					<td className="px-2 py-1 border border-gray-200">
																						{formatDate(
																							item.Paid_Date,
																						)}
																					</td>
																					<td className="px-2 py-1 border border-gray-200">
																						{item.Piv_No}
																					</td>
																					<td className="px-2 py-1 border border-gray-200">
																						{item.Bank_Check_No ||
																							"-"}
																					</td>
																					<td className="px-2 py-1 border border-gray-200 text-right font-mono font-bold">
																						{formatNumber(
																							pivTotal,
																						)}
																					</td>
																					{accountCodes.map(
																						(acc) => (
																							<td
																								key={
																									acc
																								}
																								className="px-2 py-1 border border-gray-200 text-right font-mono"
																							>
																								{formatNumber(
																									accountAmounts[
																										acc
																									] ||
																										0,
																								)}
																							</td>
																						),
																					)}
																					<td className="px-2 py-1 border border-gray-200 text-right font-mono font-bold">
																						{formatNumber(
																							pivTotal,
																						)}
																					</td>
																				</tr>
																			);
																		},
																	)}
																	<tr className="bg-blue-100 font-bold text-blue-900">
																		<td
																			colSpan={4}
																			className="px-2 py-1 border border-gray-200 text-center"
																		>
																			Total - Issued Cost
																			Center: {deptId}
																		</td>
																		<td className="px-2 py-1 border border-gray-200 text-right font-mono"></td>
																		{accountCodes.map(
																			(acc) => {
																				const sum =
																					deptGroups[
																						deptId
																					].reduce(
																						(s, g) =>
																							s +
																							(g
																								.accountAmounts[
																								acc
																							] || 0),
																						0,
																					);
																				return (
																					<td
																						key={acc}
																						className="px-2 py-1 border border-gray-200 text-right font-mono"
																					>
																						{formatNumber(
																							sum,
																						)}
																					</td>
																				);
																			},
																		)}
																		<td className="px-2 py-1 border border-gray-200 text-right font-mono font-bold">
																			{formatNumber(
																				deptGroups[
																					deptId
																				].reduce(
																					(sum, g) => {
																						const pivSum =
																							accountCodes.reduce(
																								(
																									s,
																									acc,
																								) =>
																									s +
																									(g
																										.accountAmounts[
																										acc
																									] ||
																										0),
																								0,
																							);
																						return (
																							sum +
																							pivSum
																						);
																					},
																					0,
																				),
																			)}
																		</td>
																	</tr>
																</React.Fragment>
															);
														})}
														<tr className="bg-gray-200 font-bold">
															<td
																colSpan={5}
																className="px-2 py-1 border border-gray-200 text-left"
															>
																Total - {ccName}
															</td>
															<td className="px-2 py-1 border border-gray-200 text-right font-mono"></td>
															{accountCodes.map((acc) => {
																const sum = Object.values(
																	deptGroups,
																)
																	.flat()
																	.reduce(
																		(s, g) =>
																			s +
																			(g.accountAmounts[
																				acc
																			] || 0),
																		0,
																	);
																return (
																	<td
																		key={acc}
																		className="px-2 py-1 border border-gray-200 text-right font-mono"
																	>
																		{formatNumber(sum)}
																	</td>
																);
															})}
															<td className="px-2 py-1 border border-gray-200 text-right font-mono font-bold">
																{formatNumber(
																	Object.values(deptGroups)
																		.flat()
																		.reduce((sum, g) => {
																			const pivSum =
																				accountCodes.reduce(
																					(s, acc) =>
																						s +
																						(g
																							.accountAmounts[
																							acc
																						] || 0),
																					0,
																				);
																			return sum + pivSum;
																		}, 0),
																)}
															</td>
														</tr>
														<tr>
															<td
																colSpan={
																	9 + accountCodes.length
																}
																className="h-4"
															></td>
														</tr>
													</React.Fragment>
												);
											})}
											<tr
												className="bg-gray-300 font-bold"
												style={{color: "#7A0000"}}
											>
												<td
													colSpan={7}
													className="px-2 py-2 border border-gray-200 text-right text-sm"
												>
													GRAND TOTAL
												</td>
												{accountCodes.map((acc) => (
													<td
														key={acc}
														className="px-2 py-2 border border-gray-200 text-right font-mono font-bold"
													>
														{formatNumber(
															Object.values(groupedData)
																.flatMap(Object.values)
																.flat()
																.reduce(
																	(s, g) =>
																		s +
																		(g.accountAmounts[acc] ||
																			0),
																	0,
																),
														)}
													</td>
												))}
												<td className="px-2 py-2 border border-gray-200 text-right font-mono font-bold text-base">
													{formatNumber(
														Object.values(groupedData)
															.flatMap(Object.values)
															.flat()
															.reduce((sum, g) => {
																const pivSum =
																	accountCodes.reduce(
																		(s, acc) =>
																			s +
																			(g.accountAmounts[
																				acc
																			] || 0),
																		0,
																	);
																return sum + pivSum;
															}, 0),
													)}
												</td>
											</tr>
										</tbody>
									</table>
								</div>
							)}
						</div>
					</div>
					<iframe ref={iframeRef} className="hidden" title="print-frame" />
				</div>
			)}
		</div>
	);
};

export default ProvincePIVProvincial;
