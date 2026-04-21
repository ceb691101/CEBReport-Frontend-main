//24. Bank Piv Tabulation
// BankPivTabulation.tsx

import React, {useState, useRef, useMemo} from "react";
import {Eye, X, Download, Printer} from "lucide-react";
import {toast} from "react-toastify";
import DateRangePicker from "../../components/utils/DateRangePicker";

interface BankPivItem {
	C6: string; // dept_id → Issued Cost Center
	PivNo: string;
	PivReceiptNo: string;
	PivDate: string | null;
	PaidDate: string | null;
	ChequeNo: string;
	GrandTotal: number | null;
	C8: string; // account_code
	Amount: number | null;
	BankCheckNo: string;
	PaymentMode: string;
	CctName: string; // dept_nm
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

const BankPivTabulation: React.FC = () => {
	const iframeRef = useRef<HTMLIFrameElement>(null);

	const [fromDate, setFromDate] = useState("");
	const [toDate, setToDate] = useState("");
	const [reportData, setReportData] = useState<BankPivItem[]>([]);
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
			const key = `${item.PivNo}-${item.PivDate}-${item.PaidDate}-${item.PaymentMode}-${item.BankCheckNo}-${item.C6}-${item.CctName}-${item.GrandTotal}`;
			if (!map.has(key)) {
				map.set(key, {
					...item,
					amounts: {[item.C8]: item.Amount ?? 0},
				});
			} else {
				const existing = map.get(key);
				existing.amounts[item.C8] =
					(existing.amounts[item.C8] || 0) + (item.Amount ?? 0);
			}
		});

		return Array.from(map.values());
	}, [reportData]);

	// Group by Issued Cost Center (C6 + CctName)
	const sortedGroupedData = useMemo(() => {
		const groups: Record<string, any[]> = {};
		mergedReportData.forEach((item: any) => {
			const issuedId = item.C6 ?? "";
			const issuedName = item.CctName ?? "";
			const key = `${issuedId}|||${issuedName}`;
			if (!groups[key]) groups[key] = [];
			groups[key].push(item);
		});

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
				const dx = x.PivDate ? new Date(x.PivDate).getTime() : 0;
				const dy = y.PivDate ? new Date(y.PivDate).getTime() : 0;
				if (dx !== dy) return dx - dy;
				return (x.PivNo ?? "").localeCompare(y.PivNo ?? "", undefined, {
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
				.reduce((sum, i) => sum + (i.Amount ?? 0), 0);
		});
		return totals;
	}, [reportData, accountCodes]);

	const rowTotal = (amounts: Record<string, number>) =>
		Object.values(amounts).reduce((s, v) => s + v, 0);

	const handleViewReport = async () => {
		if (!fromDate || !toDate) return toast.error("Please select both dates");
		if (new Date(toDate) < new Date(fromDate))
			return toast.error("To Date cannot be earlier than From Date");

		setReportLoading(true);
		setReportData([]);
		setShowReport(true);

		try {
			const url = `/misapi/api/bank-piv-tabulation/report?fromDate=${fromDate.replace(/-/g, "/")}&toDate=${toDate.replace(/-/g, "/")}`;
			const res = await fetch(url);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = await res.json();
			const items: BankPivItem[] = Array.isArray(data)
				? data
				: data.data || [];
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
	};

	const handleDownloadCSV = () => {
		if (reportData.length === 0) return;

		const headers = [
			"Issued Cost Center",
			"PIV No",
			"PIV Date",
			"Paid Date",
			"PIV Total",
			"Payment mode",
			"Bank Check No",
			...accountCodes,
			"Total",
		];

		const csvRows: string[] = [
			"PIV Collections by Banks ",
			`Period : ${fromDate} To ${toDate}`,
			"",
			headers.map(csvEscape).join(","),
		];

		Object.keys(sortedGroupedData).forEach((key) => {
			const items = sortedGroupedData[key];
			const [issuedId, issuedName] = key.split("|||");
			const fullIssued = `${issuedId} - ${issuedName}`;

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
					fullIssued,
					`="${item.PivNo ?? ""}"`,
					formatDate(item.PivDate),
					formatDate(item.PaidDate),
					formatNumber(item.GrandTotal),
					csvEscape(item.PaymentMode || "-"),
					`="${item.BankCheckNo || ""}"`,
					...accountCodes.map((code) =>
						formatNumber(item.amounts[code] || 0),
					),
					formatNumber(rowTotal(item.amounts)),
				];
				csvRows.push(row.map(csvEscape).join(","));
			});

			const totalRow = [
				`Total of : ${fullIssued}`,
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
			...accountCodes.map((c) => formatNumber(columnTotals[c] || 0)),
			formatNumber(grandTotal),
		];
		csvRows.push(grandRow.map(csvEscape).join(","));

		const csvContent = "\uFEFF" + csvRows.join("\n");
		const blob = new Blob([csvContent], {type: "text/csv;charset=utf-8;"});
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `Bank_PIV_Tabulation_${fromDate}_to_${toDate}.csv`;
		link.click();
		URL.revokeObjectURL(url);
	};

	const printPDF = () => {
		if (reportData.length === 0 || !iframeRef.current) return;

		const totalDynamicColumns = accountCodes.length;
		const totalColumns = 7 + totalDynamicColumns + 1; // Issued + PIV No + PIV Date + Paid Date + PIV Total + Payment mode + Bank Check No + accounts + Total

		let fontSize = "4px";
		let headerFontSize = "5px";
		let titleFontSize = "13px";
		let padding = "3px";

		const tableStyle = `
      table { width: auto; border-collapse: collapse; font-family: Arial, sans-serif; font-size: ${fontSize}; }
      th, td { border: 1px solid #999; padding: ${padding}; text-align: left; vertical-align: top; }
      th { font-size: ${headerFontSize}; font-weight: bold; }
      .numeric { text-align: right !important; }
      .center { text-align: center; }
      .group-header { background-color: #f5f5f5 !important; font-weight: bold; }
      .group-total { background-color: #e8e8e8 !important; font-weight: bold; }
      .grand-total { background-color: #bfdbfe !important; font-weight: bold; }
    `;

		let bodyHTML = "";

		Object.keys(sortedGroupedData).forEach((key) => {
			const items = sortedGroupedData[key];
			const [issuedId, issuedName] = key.split("|||");

			items.forEach((item, idx) => {
				bodyHTML += `
          <tr ${idx % 2 === 0 ? 'style="background:#fff;"' : 'style="background:#f9f9f9;"'}>
            ${idx === 0 ? `<td rowspan="${items.length + 1}" class="group-header">${escapeHtml(issuedId + " - " + issuedName)}</td>` : ""}
            <td class="center">${escapeHtml(item.PivNo || "-")}</td>
            <td class="center">${formatDate(item.PivDate)}</td>
            <td class="center">${formatDate(item.PaidDate)}</td>
            <td class="numeric">${formatNumber(item.GrandTotal)}</td>
            <td class="center">${escapeHtml(item.PaymentMode || "-")}</td>
            <td class="center">${escapeHtml(item.BankCheckNo || "-")}</td>
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
          <td colspan="6">Total of : ${escapeHtml(issuedId + " - " + issuedName)}</td>
          ${accountCodes.map((code) => `<td class="numeric">${formatNumber(groupColumnTotals[code] || 0)}</td>`).join("")}
          <td class="numeric">${formatNumber(groupRowTotal)}</td>
        </tr>
        <tr><td colspan="${totalColumns}" style="height:8px; border:none; background:white;"></td></tr>`;
		});

		const grandTotal = Object.values(columnTotals).reduce((a, b) => a + b, 0);

		bodyHTML += `
      <tr class="grand-total">
        <td colspan="7">GRAND TOTAL</td>
        ${accountCodes.map((code) => `<td class="numeric">${formatNumber(columnTotals[code] || 0)}</td>`).join("")}
        <td class="numeric">${formatNumber(grandTotal)}</td>
      </tr>`;

		const headerHTML = `
      <thead>
        <tr>
          <th>Issued Cost Center</th>
          <th>PIV No</th>
          <th>PIV Date</th>
          <th>Paid Date</th>
          <th>PIV Total</th>
          <th>Payment mode</th>
          <th>Bank Check No</th>
          ${accountCodes.map((c) => `<th>${escapeHtml(c)}</th>`).join("")}
          <th>Total</th>
        </tr>
      </thead>`;

		const fullHTML = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Bank PIV Tabulation</title>
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
<h2> PIV Collections by Banks</h2>
<div class="subtitle clearfix">
  <div class="left">
    <div><strong>Period :</strong> ${fromDate} to ${toDate}</div></br>

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
				PIV Collections by Banks
			</h2>

			<div className="flex justify-end items-center gap-6 mb-6">
				<DateRangePicker
					fromDate={fromDate}
					toDate={toDate}
					onFromChange={setFromDate}
					onToChange={setToDate}
				/>

				<button
					onClick={handleViewReport}
					disabled={!fromDate || !toDate || reportLoading}
					className={`px-5 py-2 rounded text-white font-medium ${maroonGrad} disabled:opacity-50 hover:brightness-110 flex items-center gap-2`}
				>
					<Eye className="w-4 h-4" />
					View
				</button>
			</div>

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
								PIV Collections by Banks
							</h2>

							<div className="flex justify-between text-sm mb-2">
								<div>
									<strong>Period :</strong> {fromDate} to {toDate}{" "}
									<br />
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
													Issued Cost Center
												</th>
												<th className="px-2 py-1.5">PIV No</th>
												<th className="px-2 py-1.5">PIV Date</th>
												<th className="px-2 py-1.5">Paid Date</th>
												<th className="px-2 py-1.5 text-right">
													PIV Total
												</th>
												<th className="px-2 py-1.5">
													Payment mode
												</th>
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
												<th className="px-2 py-1.5 text-right">
													Total
												</th>
											</tr>
										</thead>
										<tbody>
											{Object.keys(sortedGroupedData).map((key) => {
												const items = sortedGroupedData[key];
												const [issuedId, issuedName] =
													key.split("|||");

												return (
													<React.Fragment key={key}>
														{items.map((item, idx) => (
															<tr
																key={`${item.PivNo}-${idx}`}
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
																		{issuedId} - {issuedName}
																	</td>
																)}
																<td className="px-2 py-1 border border-gray-300">
																	{item.PivNo || "-"}
																</td>
																<td className="px-2 py-1 border border-gray-300">
																	{formatDate(item.PivDate)}
																</td>
																<td className="px-2 py-1 border border-gray-300">
																	{formatDate(item.PaidDate)}
																</td>
																<td className="px-2 py-1 text-right font-medium border border-gray-300">
																	{formatNumber(
																		item.GrandTotal,
																	)}
																</td>
																<td className="px-2 py-1 border border-gray-300">
																	{item.PaymentMode || "-"}
																</td>
																<td className="px-2 py-1 border border-gray-300">
																	{item.BankCheckNo || "-"}
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
																		colSpan={6}
																		className="px-2 py-1 border border-gray-300"
																	>
																		Total of : {issuedId} -{" "}
																		{issuedName}
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
																	7 + accountCodes.length
																}
																className="h-3 bg-white border-none"
															></td>
														</tr>
													</React.Fragment>
												);
											})}

											<tr className="bg-blue-100 font-bold">
												<td
													colSpan={7}
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

export default BankPivTabulation;
