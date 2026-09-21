// File: SolarOrdinaryCustomersGenerationCapacity.tsx
import React, { useState, useRef } from "react";
import { Eye } from "lucide-react";
import { useUser } from "../../contexts/UserContext";
import { toast } from "react-toastify";
import DateRangePicker from "../../components/utils/DateRangePicker";
import ReportViewer from "../../components/utils/ReportViewer";

interface SolarGenerationItem {
	Division: string;
	NoOfAccounts: number;
	GeneratedCapacity: number | null;
}

interface SolarGenerationSummary {
	fromDate: string;
	toDate: string;
	totalAccounts: number;
	totalGeneratedCapacity: number;
}

const formatNumber = (num: number | null | undefined): string => {
	if (num == null || isNaN(num)) return "0.00";

	const absNum = Math.abs(num);
	const formatted = new Intl.NumberFormat("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(absNum);

	return num < 0 ? `(${formatted})` : formatted;
};

const formatInteger = (num: number | null | undefined): string => {
	if (num == null || isNaN(num)) return "0";
	return new Intl.NumberFormat("en-US", {
		maximumFractionDigits: 0,
	}).format(num);
};

const csvEscape = (val: string | number | null | undefined): string => {
	if (val == null) return '""';
	const str = String(val);
	if (/[,\n"']/.test(str)) return `"${str.replace(/"/g, '""')}"`;
	return str;
};

const SolarOrdinaryCustomersGenerationCapacity: React.FC = () => {
	useUser();

	const [fromDate, setFromDate] = useState("");
	const [toDate, setToDate] = useState("");
	const [reportData, setReportData] = useState<SolarGenerationItem[]>([]);
	const [summaryData, setSummaryData] = useState<SolarGenerationSummary | null>(null);
	const [reportLoading, setReportLoading] = useState(false);
	const [showReport, setShowReport] = useState(false);
	const iframeRef = useRef<HTMLIFrameElement>(null);

	const maroon = "text-[#7A0000]";
	const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";

	const handleViewReport = async () => {
		if (!fromDate || !toDate) return toast.error("Please select both dates");
		if (new Date(toDate) < new Date(fromDate))
			return toast.error("To Date cannot be earlier than From Date");

		setReportLoading(true);
		setReportData([]);
		setSummaryData(null);
		setShowReport(true);

		try {
			const formattedFromDate = fromDate.replace(/-/g, "/");
			const formattedToDate = toDate.replace(/-/g, "/");

			const url = `/misapi/api/solarordinarycustomersgenerationcapacity/report?fromDate=${formattedFromDate}&toDate=${formattedToDate}`;
			const res = await fetch(url);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			
			const json = await res.json();
			const items: SolarGenerationItem[] = Array.isArray(json.data) ? json.data : [];
			const summary: SolarGenerationSummary | null = json.summary || null;

			setReportData(items);
			setSummaryData(summary);

			if (items.length === 0) {
				toast.warn("No records found");
			} else {
				toast.success("Report loaded");
			}
		} catch (err: any) {
			toast.error("Failed: " + err.message);
		} finally {
			setReportLoading(false);
		}
	};

	const closeReport = () => {
		setShowReport(false);
		setReportData([]);
		setSummaryData(null);
	};

	const computedTotalAccounts = summaryData?.totalAccounts ?? reportData.reduce((acc, item) => acc + (item.NoOfAccounts || 0), 0);
	const computedTotalCapacity = summaryData?.totalGeneratedCapacity ?? reportData.reduce((acc, item) => acc + (item.GeneratedCapacity || 0), 0);

	// CSV Export
	const handleDownloadCSV = () => {
		if (reportData.length === 0) return;

		const headers = [
			"Division",
			"No. of Accounts",
			"Generated Capacity",
		];

		const formattedFrom = fromDate.replace(/-/g, "/");
		const formattedTo = toDate.replace(/-/g, "/");

		const csvRows: string[] = [
			"Solar Ordinary Customers Generation Capacity",
			`Period: ${formattedFrom} To ${formattedTo}`,
			"Currency: LKR",
			"",
			headers.map(csvEscape).join(","),
		];

		reportData.forEach((item) => {
			const row = [
				`="${item.Division ?? ""}"`,
				item.NoOfAccounts ?? 0,
				formatNumber(item.GeneratedCapacity),
			];
			csvRows.push(row.map(csvEscape).join(","));
		});

		// Summary row
		const summaryRow = [
			'"Total"',
			computedTotalAccounts,
			formatNumber(computedTotalCapacity),
		];
		csvRows.push(summaryRow.join(","));

		const csvContent = csvRows.join("\n");
		const blob = new Blob(["\uFEFF" + csvContent], {
			type: "text/csv;charset=utf-8;",
		});
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `SOLARORDINARYCUSTOMERSGENERATIONCAPACITYREPORT_${fromDate}_to_${toDate}.csv`;
		link.click();
		URL.revokeObjectURL(url);
	};

	// Print PDF
	const printPDF = () => {
		if (reportData.length === 0 || !iframeRef.current) return;

		const formattedFrom = fromDate.replace(/-/g, "/");
		const formattedTo = toDate.replace(/-/g, "/");

		const tableStyle = `
      table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 11px; }
      th, td { border: 1px solid #aaa; padding: 6px; word-wrap: break-word; vertical-align: top; }
      th { font-weight: bold; background-color: #7A0000; color: white; text-align: left; }
      th.numeric, td.numeric { text-align: right !important; }
      .total-row { background-color: #f3f4f6 !important; font-weight: bold; }
    `;

		const colWidths = [
			"40%", // Division
			"30%", // No. of Accounts
			"30%", // Generated Capacity
		];

		const colGroupHTML = `
      <colgroup>
        ${colWidths.map((w) => `<col style="width: ${w};" />`).join("")}
      </colgroup>
    `;

		let bodyHTML = "";
		reportData.forEach((item, idx) => {
			bodyHTML += `<tr class="${idx % 2 === 0 ? "bg-white" : "bg-gray-50"}">
        <td>${escapeHtml(item.Division || "-")}</td>
        <td class="numeric">${formatInteger(item.NoOfAccounts)}</td>
        <td class="numeric">${formatNumber(item.GeneratedCapacity)}</td>
      </tr>`;
		});

		// Summary Row
		bodyHTML += `<tr class="total-row">
      <td><strong>Total</strong></td>
      <td class="numeric"><strong>${formatInteger(computedTotalAccounts)}</strong></td>
      <td class="numeric"><strong>${formatNumber(computedTotalCapacity)}</strong></td>
    </tr>`;

		const headerHTML = `
      <thead>
        <tr>
          <th>Division</th>
          <th class="numeric">No. of Accounts</th>
          <th class="numeric">Generated Capacity</th>
        </tr>
      </thead>`;

		const fullHTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Solar Ordinary Customers Generation Capacity</title>
<style>${tableStyle}
body { font-family: Arial, sans-serif; margin: 8mm; print-color-adjust: exact; }
h3 { text-align: center; color: #7A0000; font-size: 16px; font-weight: bold; margin: 0 0 8px 0; }
.subtitles { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; font-size: 11px; }
.subtitle-left { text-align: left; }
.subtitle-right { text-align: right; }

@page { margin: 10mm; }
@page { 
  @bottom-left { content: "Printed on: ${new Date().toLocaleString()}"; font-size: 9px; color: #666; }
  @bottom-right { content: "Page " counter(page) " of " counter(pages); font-size: 9px; color: #666; }
}
</style>
</head>
<body>
<h3>Solar Ordinary Customers Generation Capacity</h3>
<div class="subtitles">
  <div class="subtitle-left">
    <strong>Period :</strong> ${formattedFrom} to ${formattedTo}
  </div>
  <div class="subtitle-right">
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

	const formattedDisplayFrom = fromDate ? fromDate.replace(/-/g, "/") : "";
	const formattedDisplayTo = toDate ? toDate.replace(/-/g, "/") : "";

	return (
		<div className="max-w-7xl mx-auto p-6 bg-white rounded-xl shadow border border-gray-200 text-sm">
			<iframe ref={iframeRef} style={{ display: "none" }} />

			<h2 className={`text-xl font-bold mb-4 ${maroon}`}>
				Solar Ordinary Customers Generation Capacity
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
					className={`px-4 py-1.5 rounded text-white font-medium ${maroonGrad} disabled:opacity-50 hover:brightness-110 flex items-center gap-2`}
				>
					<Eye className="w-4 h-4" />
					View
				</button>
			</div>

			{showReport && (
				<ReportViewer
					title="Solar Ordinary Customers Generation Capacity"
					subtitlebold="Period:"
					subtitlenormal={`${formattedDisplayFrom} to ${formattedDisplayTo}`}
					currency="Currency: LKR"
					loading={reportLoading}
					hasData={reportData.length > 0}
					handleDownloadCSV={handleDownloadCSV}
					printPDF={printPDF}
					closeReport={closeReport}
				>
					<table className="w-full text-xs">
						<thead className={`${maroonGrad} text-white`}>
							<tr>
								<th className="px-4 py-2.5 text-left font-semibold">Division</th>
								<th className="px-4 py-2.5 text-right font-semibold">No. of Accounts</th>
								<th className="px-4 py-2.5 text-right font-semibold">Generated Capacity</th>
							</tr>
						</thead>
						<tbody>
							{reportData.map((item, idx) => (
								<tr
									key={idx}
									className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
								>
									<td className="px-4 py-2.5 border border-gray-300 font-medium text-gray-800">
										{item.Division}
									</td>
									<td className="px-4 py-2.5 text-right border border-gray-300 text-gray-700">
										{formatInteger(item.NoOfAccounts)}
									</td>
									<td className="px-4 py-2.5 text-right border border-gray-300 text-gray-700">
										{formatNumber(item.GeneratedCapacity)}
									</td>
								</tr>
							))}
						</tbody>
						{reportData.length > 0 && (
							<tfoot>
								<tr className="bg-gray-100 font-bold border-t-2 border-gray-400">
									<td className="px-4 py-2.5 border border-gray-300 text-left">
										Total
									</td>
									<td className="px-4 py-2.5 border border-gray-300 text-right">
										{formatInteger(computedTotalAccounts)}
									</td>
									<td className="px-4 py-2.5 border border-gray-300 text-right">
										{formatNumber(computedTotalCapacity)}
									</td>
								</tr>
							</tfoot>
						)}
					</table>
				</ReportViewer>
			)}
		</div>
	);
};

export default SolarOrdinaryCustomersGenerationCapacity;
