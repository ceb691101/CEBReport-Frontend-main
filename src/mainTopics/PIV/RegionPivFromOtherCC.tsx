//23.Region wise PIV Collections by Provincial POS relevant to Other Cost Centers
// RegionPivFromOtherCC.tsx

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
	C6: string; // paid_dept_id
	Dept_Id: string;
	Piv_No: string;
	Piv_Receipt_No: string;
	Piv_Date: string | null;
	Paid_Date: string | null;
	Payment_Mode: string;
	Cheque_No: string;
	Grand_Total: number;
	C8: string; // account_code
	Amount: number;
	Bank_Check_No: string;
	CCT_NAME: string; // paid dept name
	CCT_NAME1: string; // company name
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
		const date = new Date(dateStr);
		const yyyy = date.getFullYear();
		const mm = String(date.getMonth() + 1).padStart(2, "0");
		const dd = String(date.getDate()).padStart(2, "0");
		return `${yyyy}/${mm}/${dd}`;
	} catch {
		return dateStr;
	}
};

const csvEscape = (val: string | number | null | undefined): string => {
	if (val == null) return '""';
	const str = String(val);
	if (/[,\n"]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
	return str;
};

const RegionPivFromOtherCC: React.FC = () => {
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
	const accountCodes = useMemo(
		() => Array.from(new Set(reportData.map((i) => i.C8))).sort(),
		[reportData],
	);

	// Merge rows with same PIV (different account codes → pivot)
	const mergedReportData = useMemo(() => {
		const map = new Map<string, any>();

		reportData.forEach((item) => {
			const key = `${item.Piv_No}-${item.Piv_Date}-${item.Paid_Date}-${item.Payment_Mode}-${item.Bank_Check_No}-${item.C6}-${item.CCT_NAME}-${item.Grand_Total}`;
			if (!map.has(key)) {
				map.set(key, {
					...item,
					amounts: {[item.C8]: item.Amount},
				});
			} else {
				const existing = map.get(key);
				existing.amounts[item.C8] =
					(existing.amounts[item.C8] || 0) + item.Amount;
			}
		});

		return Array.from(map.values());
	}, [reportData]);

	// Group by Paid Cost Center (C6 + CCT_NAME)
	const sortedGroupedData = useMemo(() => {
		const groups: Record<string, any[]> = {};
		mergedReportData.forEach((item: any) => {
			const paidId = item.C6 ?? "";
			const paidName = item.CCT_NAME ?? "";
			const key = `${paidId}|||${paidName}`;
			if (!groups[key]) groups[key] = [];
			groups[key].push(item);
		});

		// Sort groups by paid dept id (numeric friendly)
		const sortedKeys = Object.keys(groups).sort((a, b) => {
			const [aId] = a.split("|||");
			const [bId] = b.split("|||");
			return aId.localeCompare(bId, undefined, {
				numeric: true,
				sensitivity: "base",
			});
		});

		const sorted: Record<string, any[]> = {};
		sortedKeys.forEach((k) => {
			sorted[k] = groups[k].slice().sort((x: any, y: any) => {
				// Sort inside group: by Dept_Id → Piv_Date → Piv_No
				const deptCmp = (x.Dept_Id ?? "").localeCompare(
					y.Dept_Id ?? "",
					undefined,
					{
						numeric: true,
						sensitivity: "base",
					},
				);
				if (deptCmp !== 0) return deptCmp;

				const dx = x.Piv_Date ? new Date(x.Piv_Date).getTime() : 0;
				const dy = y.Piv_Date ? new Date(y.Piv_Date).getTime() : 0;
				if (dx !== dy) return dx - dy;

				return (x.Piv_No ?? "").localeCompare(y.Piv_No ?? "", undefined, {
					numeric: true,
					sensitivity: "base",
				});
			});
		});

		return sorted;
	}, [mergedReportData]);

	const columnTotals = useMemo(() => {
		const totals: Record<string, number> = {};
		accountCodes.forEach((code) => {
			totals[code] = reportData
				.filter((i) => i.C8 === code)
				.reduce((sum, i) => sum + i.Amount, 0);
		});
		return totals;
	}, [reportData, accountCodes]);

	const rowTotal = (amounts: Record<string, number>) =>
		Object.values(amounts).reduce((s, v) => s + v, 0);

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
					`/misapi/api/incomeexpenditure/Usercompanies/${epfNo}/70`,
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
		if (!fromDate || !toDate) return toast.error("Please select both dates");
		if (new Date(toDate) < new Date(fromDate))
			return toast.error("To Date cannot be earlier than From Date");

		setSelectedCompany(company);
		setReportLoading(true);
		setReportData([]);
		setShowReport(true);

		try {
			const url = `/misapi/api/Regional-POS-relevant-to-OtherCC/get?compId=${company.compId.trim()}&fromDate=${fromDate.replace(/-/g, "")}&toDate=${toDate.replace(/-/g, "")}`;
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

	const handleDownloadCSV = () => {
		if (reportData.length === 0 || !selectedCompany) return;

		const headers = [
			"Paid Cost Center  ",
			"PIV No",
			"PIV Date",
			"Paid Date",
			"PIV Total",
			"Payment Mode",
			"Bank Reference No",
			"Issued Cost Center  ",
			...accountCodes,
			"Total",
		];

		const csvRows: string[] = [
			" PIV Collections by Regional POS relevant to Other Cost Centers  ",
			`Paid Division : ${selectedCompany.compId}/${selectedCompany.CompName} `,
			`Issued Cost Center : Other Cost Centers`,
			`Period : ${fromDate} To ${toDate}`,
			"",
			headers.map(csvEscape).join(","),
		];

		Object.keys(sortedGroupedData).forEach((key) => {
			const items = sortedGroupedData[key];
			const [paidId, paidName] = key.split("|||");
			const fullPaid = `${paidId} - ${paidName}`;

			const groupColumnTotals = accountCodes.reduce(
				(acc, code) => {
					acc[code] = items.reduce(
						(sum, item) => sum + (item.amounts[code] || 0),
						0,
					);
					return acc;
				},
				{} as Record<string, number>,
			);

			const groupRowTotal = Object.values(groupColumnTotals).reduce(
				(a, b) => a + b,
				0,
			);

			items.forEach((item) => {
				const row = [
					fullPaid,
					`="${item.Piv_No ?? ""}"`,
					formatDate(item.Piv_Date),
					formatDate(item.Paid_Date),
					formatNumber(item.Grand_Total),
					csvEscape(item.Payment_Mode || "-"),
					`="${item.Bank_Check_No || ""}"`,
					`="${item.Dept_Id ?? ""}"`,
					...accountCodes.map((code) =>
						formatNumber(item.amounts[code] || 0),
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
				"",
				...accountCodes.map((code) =>
					formatNumber(groupColumnTotals[code] || 0),
				),
				formatNumber(groupRowTotal),
			];
			csvRows.push(totalRow.map(csvEscape).join(","));
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
			"",
			...accountCodes.map((c) => formatNumber(columnTotals[c] || 0)),
			formatNumber(grandTotal),
		];
		csvRows.push(grandRow.map(csvEscape).join(","));

		const csvContent = "\uFEFF" + csvRows.join("\n");
		const blob = new Blob([csvContent], {type: "text/csv;charset=utf-8;"});
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `PIV Collections_by_Regional_POS_relevant_to_OtherCC _${selectedCompany.compId}_${fromDate}_to_${toDate}.csv`;
		link.click();
		URL.revokeObjectURL(url);
	};

	const printPDF = () => {
		if (reportData.length === 0 || !iframeRef.current || !selectedCompany)
			return;

		const totalDynamicColumns = accountCodes.length;
		const totalColumns = 8 + totalDynamicColumns + 1; // 8 fixed + accounts + total

		let fontSize = "4px";
		let headerFontSize = "5px";
		let titleFontSize = "13px";
		let padding = "3px";

		const tableStyle = `
      table {  width: auto; border-collapse: collapse; font-family: Arial, sans-serif; font-size: ${fontSize}; }
      th, td { border: 1px solid #999; padding: ${padding}; text-align: left; vertical-align: top; }
      th { font-size: ${headerFontSize}; font-weight: bold; }
      .numeric { text-align: right !important; }
      .center { text-align: center; }
      .paid-group { background-color: #f5f5f5 !important; font-weight: bold; }
      .group-total { background-color: #e8e8e8 !important; font-weight: bold; }
      .grand-total { background-color: #bfdbfe !important; font-weight: bold; }
    `;

		let bodyHTML = "";

		Object.keys(sortedGroupedData).forEach((key) => {
			const items = sortedGroupedData[key];
			const [paidId, paidName] = key.split("|||");

			items.forEach((item, idx) => {
				bodyHTML += `
          <tr ${idx % 2 === 0 ? 'style="background:#fff;"' : 'style="background:#f9f9f9;"'}>
            ${idx === 0 ? `<td rowspan="${items.length + 1}" class="paid-group">${paidId} - ${escapeHtml(paidName)}</td>` : ""}
            <td class="center">${escapeHtml(item.Piv_No || "-")}</td>
            <td class="center">${formatDate(item.Piv_Date)}</td>
            <td class="center">${formatDate(item.Paid_Date)}</td>
            <td class="numeric">${formatNumber(item.Grand_Total)}</td>
            <td class="center">${escapeHtml(item.Payment_Mode || "-")}</td>
            <td class="center">${escapeHtml(item.Bank_Check_No || "-")}</td>
            <td class="center">${escapeHtml(item.Dept_Id || "-")}</td>
            ${accountCodes.map((code) => `<td class="numeric">${formatNumber(item.amounts[code] || 0)}</td>`).join("")}
            <td class="numeric">${formatNumber(rowTotal(item.amounts))}</td>
          </tr>`;
			});

			const groupColumnTotals = accountCodes.reduce(
				(acc, code) => {
					acc[code] = items.reduce(
						(sum, it) => sum + (it.amounts[code] || 0),
						0,
					);
					return acc;
				},
				{} as Record<string, number>,
			);

			const groupRowTotal = Object.values(groupColumnTotals).reduce(
				(a, b) => a + b,
				0,
			);

			bodyHTML += `
        <tr class="group-total">
          <td colspan="7">Total of : ${escapeHtml(paidId)} - ${escapeHtml(paidName)}</td>
          ${accountCodes.map((code) => `<td class="numeric">${formatNumber(groupColumnTotals[code] || 0)}</td>`).join("")}
          <td class="numeric">${formatNumber(groupRowTotal)}</td>
        </tr>
        <tr><td colspan="${totalColumns}" style="height:8px; border:none; background:white;"></td></tr>`;
		});

		const grandTotal = Object.values(columnTotals).reduce((a, b) => a + b, 0);

		bodyHTML += `
      <tr class="grand-total">
        <td colspan="8">GRAND TOTAL</td>
        ${accountCodes.map((code) => `<td class="numeric">${formatNumber(columnTotals[code] || 0)}</td>`).join("")}
        <td class="numeric">${formatNumber(grandTotal)}</td>
      </tr>`;

		const headerHTML = `
      <thead>
        <tr>
          <th>Paid Cost Center</th>
          <th>PIV No</th>
          <th>PIV Date</th>
          <th>Paid Date</th>
          <th>PIV Total</th>
          <th>Payment Mode</th>
          <th>Bank Reference No</th>
          <th>Issued Cost Center</th>
          ${accountCodes.map((c) => `<th>${escapeHtml(c)}</th>`).join("")}
          <th>Total</th>
        </tr>
      </thead>`;

		const fullHTML = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>PIV Province from Other CC</title>
<style>
  ${tableStyle}
  body { margin: 5mm; }
  h2 { color: #7A0000; text-align: center; margin-bottom: 6px; font-size: ${titleFontSize}; font-family: Arial, sans-serif; }
  .subtitle { font-size: 10px; margin-bottom: 12px; font-family: Arial, sans-serif; }
  .left { float: left; }
  .right { float: right; }
  .clearfix::after { content: ""; display: table; clear: both; }
  @page { size: A3 landscape; margin: 10mm; }
  @page { 
        @bottom-left { content: "Printed on: ${new Date().toLocaleString("en-US", {timeZone: "Asia/Colombo"})}"; font-size: 9px; }
        @bottom-right { content: "Page " counter(page) " of " counter(pages); font-size: 9px; }
      }
      @media print {
        body, * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      }
    
</style>
</head>
<body>
<h2> PIV Collections by Regional POS relevant to Other Cost Centers  </h2>
<div class="subtitle clearfix">
  <div class="left">
    <div>Paid Division : ${selectedCompany.compId}/${selectedCompany.CompName} </div>
    <div>Issued Cost Center: Other Cost Center</div>
    <div>Period : ${fromDate} to ${toDate}</div>
  </div>
  <div class="right">
    Currency : LKR
  </div>
</div>
<table>${headerHTML}<tbody>${bodyHTML}</tbody></table>
</body>
</html>`;

		const doc = iframeRef.current!.contentDocument!;
		doc.open();
		doc.write(fullHTML);
		doc.close();

		setTimeout(() => iframeRef.current?.contentWindow?.print(), 800);
	};

	const escapeHtml = (text: string) => {
		const div = document.createElement("div");
		div.textContent = text;
		return div.innerHTML;
	};

	return (
		<div className="max-w-7xl mx-auto p-6 bg-white rounded-xl shadow border border-gray-200 text-sm">
			<h2 className={`text-xl font-bold mb-4 ${maroon}`}>
				PIV Collections by Regional POS relevant to Other Cost Centers
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
						placeholder="Search by ID"
						value={searchId}
						onChange={(e) => setSearchId(e.target.value)}
						className="pl-10 pr-4 py-1.5 w-48 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#7A0000]"
					/>
				</div>
				<div className="relative">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
					<input
						type="text"
						placeholder="Search by Name"
						value={searchName}
						onChange={(e) => setSearchName(e.target.value)}
						className="pl-10 pr-4 py-1.5 w-48 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#7A0000]"
					/>
				</div>
				{(searchId || searchName) && (
					<button
						onClick={() => {
							setSearchId("");
							setSearchName("");
						}}
						className="flex items-center gap-1.5 px-4 py-1.5 bg-gray-100 hover:bg-gray-200 rounded border text-xs"
					>
						<RotateCcw className="w-3.5 h-3.5" /> Clear
					</button>
				)}
			</div>

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
								className={`text-xl font-bold text-center mb-3 ${maroon}`}
							>
								PIV Collections by Regional POS relevant to Other Cost
								Centers
							</h2>

							<div className="flex justify-between text-sm mb-4">
								<div>
									<strong>Paid Division : </strong>
									{selectedCompany?.compId}/{selectedCompany?.CompName}{" "}
									<br />
									<strong>Issued Cost Center:</strong> Other Cost
									Centers
									<br />
									<strong>Period :</strong> {fromDate} to {toDate}
								</div>
								<div className="font-semibold text-gray-700 self-end">
									Currency : LKR
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
								<div className="overflow-x-auto border rounded">
									<table className="w-full text-xs min-w-max">
										<thead className={`${maroonGrad} text-white`}>
											<tr>
												<th className="px-2 py-1.5">
													Paid Cost Center
												</th>
												<th className="px-2 py-1.5">PIV No</th>
												<th className="px-2 py-1.5">PIV Date</th>
												<th className="px-2 py-1.5">Paid Date</th>
												<th className="px-2 py-1.5 text-right">
													PIV Total
												</th>
												<th className="px-2 py-1.5">
													Payment Mode
												</th>
												<th className="px-2 py-1.5">
													Bank Reference No
												</th>
												<th className="px-2 py-1.5">
													Issued Cost Center
												</th>
												{accountCodes.map((acc) => (
													<th
														key={acc}
														className="px-2 py-1.5 text-right"
													>
														{acc}
													</th>
												))}
												<th className="px-2 py-1.5 text-right">
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
																	{item.Piv_No || "-"}
																</td>
																<td className="px-2 py-1 border border-gray-300">
																	{formatDate(item.Piv_Date)}
																</td>
																<td className="px-2 py-1 border border-gray-300">
																	{formatDate(item.Paid_Date)}
																</td>
																<td className="px-2 py-1 text-right font-medium border border-gray-300">
																	{formatNumber(
																		item.Grand_Total,
																	)}
																</td>
																<td className="px-2 py-1 border border-gray-300">
																	{item.Payment_Mode || "-"}
																</td>
																<td className="px-2 py-1 border border-gray-300">
																	{item.Bank_Check_No || "-"}
																</td>
																<td className="px-2 py-1 border border-gray-300">
																	{item.Dept_Id || "-"}
																</td>
																{accountCodes.map((code) => (
																	<td
																		key={code}
																		className="px-2 py-1 text-right border border-gray-300"
																	>
																		{formatNumber(
																			item.amounts[code] ||
																				0,
																		)}
																	</td>
																))}
																<td className="px-2 py-1 text-right font-medium border border-gray-300">
																	{formatNumber(
																		rowTotal(item.amounts),
																	)}
																</td>
															</tr>
														))}

														{(() => {
															const groupColumnTotals =
																accountCodes.reduce(
																	(acc, code) => {
																		acc[code] = items.reduce(
																			(sum, it) =>
																				sum +
																				(it.amounts[code] ||
																					0),
																			0,
																		);
																		return acc;
																	},
																	{} as Record<string, number>,
																);
															const groupRowTotal =
																Object.values(
																	groupColumnTotals,
																).reduce((a, b) => a + b, 0);

															return (
																<tr className="bg-gray-200 font-bold">
																	<td
																		colSpan={7}
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
																				] || 0,
																			)}
																		</td>
																	))}
																	<td className="px-2 py-1 text-right border border-gray-300">
																		{formatNumber(
																			groupRowTotal,
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
																className="h-3 bg-white border-none"
															></td>
														</tr>
													</React.Fragment>
												);
											})}

											<tr className="bg-blue-100 font-bold">
												<td
													colSpan={8}
													className="px-2 py-1.5 text-center border border-gray-300"
												>
													GRAND TOTAL
												</td>
												{accountCodes.map((code) => (
													<td
														key={code}
														className="px-2 py-1.5 text-right border border-gray-300"
													>
														{formatNumber(
															columnTotals[code] || 0,
														)}
													</td>
												))}
												<td className="px-2 py-1.5 text-right border border-gray-300">
													{formatNumber(
														Object.values(columnTotals).reduce(
															(a, b) => a + b,
															0,
														),
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

export default RegionPivFromOtherCC;
