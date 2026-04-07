// File: RegionalPIVStampDutyReport.tsx

import React, {useState, useRef, useCallback} from "react";
import {useUser} from "../../contexts/UserContext";
import {toast} from "react-toastify";
import DateRangePicker from "../../components/utils/DateRangePicker";
import ReusableCompanyList from "../../components/utils/ReusableCompanyList";
import ReportViewer from "../../components/utils/ReportViewer";

interface RegionalPIVStampDutyItem {
	Paid_Date: string | null; // ISO string from backend (or Date)
	Pay_type: string;
	Count: number;
	Amount: number;
	Stamp_Duty: number;
	Comp_nm: string;
}

interface Company {
	compId: string;
	CompName: string;
}

const formatDate = (dateStr: string | null): string => {
	if (!dateStr) return "";
	return new Date(dateStr).toLocaleDateString("en-GB", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	});
};

const formatNumber = (num: number | null | undefined): string => {
	if (num == null) return "0.00";
	return num.toLocaleString("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
};

const csvEscape = (val: string | number | null | undefined): string => {
	if (val == null) return '""';
	const str = String(val);
	if (/[,\n"']/.test(str)) return `"${str.replace(/"/g, '""')}"`;
	return str;
};

const escapeHtml = (text: string | null | undefined): string => {
	if (text == null) return "";
	const div = document.createElement("div");
	div.textContent = text;
	return div.innerHTML;
};

const RegionalPIVStampDutyReport: React.FC = () => {
	const {user} = useUser();
	const epfNo = user?.Userno || "";
	const iframeRef = useRef<HTMLIFrameElement>(null);

	const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
	const [fromDate, setFromDate] = useState("");
	const [toDate, setToDate] = useState("");
	const [reportData, setReportData] = useState<RegionalPIVStampDutyItem[]>([]);
	const [reportLoading, setReportLoading] = useState(false);
	const [showReport, setShowReport] = useState(false);

	const maroon = "text-[#7A0000]";
	const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";

	// Calculate totals
	const totals = reportData.reduce(
		(acc, item) => ({
			Count: acc.Count + item.Count,
			Amount: acc.Amount + item.Amount,
			Stamp_Duty: acc.Stamp_Duty + item.Stamp_Duty,
		}),
		{Count: 0, Amount: 0, Stamp_Duty: 0}
	);

	const handleViewReport = async (company: Company) => {
		if (!fromDate || !toDate) {
			toast.error("Please select both From and To dates");
			return;
		}
		if (new Date(toDate) < new Date(fromDate)) {
			toast.error("To Date cannot be earlier than From Date");
			return;
		}

		setSelectedCompany(company);
		setReportLoading(true);
		setReportData([]);
		setShowReport(true);

		try {
			const url = `/misapi/api/regionalpivstampduty/get?compID=${company.compId.trim()}&fromDate=${fromDate.replace(
				/-/g,
				"",
			)}&toDate=${toDate.replace(/-/g, "")}`;
			const res = await fetch(url);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = await res.json();
			const items: RegionalPIVStampDutyItem[] = Array.isArray(data)
				? data
				: data.data || [];
			setReportData(items);
			items.length === 0
				? toast.warn("No records found")
				: toast.success("Report loaded successfully");
		} catch (err: any) {
			toast.error("Failed to load report: " + err.message);
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

		const headers = ["Date", "Pay Type", "Count", "Amount", "Stamp Duty"];

		const csvRows: string[] = [
			`"STAMP DUTY FOR PIV TRANSACTIONS ABOVE RS. 25,000"`,
			`Company / Division: ${selectedCompany.compId} / ${selectedCompany.CompName}`,
			`Period: ${fromDate} to ${toDate}`,
			"Currency: LKR",
			"",
			headers.map(csvEscape).join(","),
		];

		reportData.forEach((item) => {
			const row = [
				`="${formatDate(item.Paid_Date)}"`,
				item.Pay_type,
				item.Count,
				item.Amount,
				item.Stamp_Duty,
			];
			csvRows.push(row.map(csvEscape).join(","));
		});

		// Add Total row
		csvRows.push("");
		csvRows.push(
			"Total Stamp duty for the period,,,," + totals.Stamp_Duty.toFixed(2)
		);

		const csvContent = csvRows.join("\n");
		const blob = new Blob(["\uFEFF" + csvContent], {
			type: "text/csv;charset=utf-8;",
		});
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `Regional_PIV_Stamp_Duty_${selectedCompany.compId}_${fromDate}_to_${toDate}.csv`;
		link.click();
		URL.revokeObjectURL(url);
	};

	const printPDF = () => {
		if (reportData.length === 0 || !iframeRef.current || !selectedCompany)
			return;

		const tableStyle = `
      table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 12px; }
      th, td { border: 1px solid #aaa; padding: 8px; word-wrap: break-word; vertical-align: middle; }
      th { font-weight: bold; }
      .numeric { text-align: right; }
      .center { text-align: center; }
      .total-row { background-color: #f0f0f0; }
    `;

		const colWidths = ["120px", "100px", "100px", "150px", "150px"];

		const colGroupHTML = colWidths
			.map((w) => `<col style="width: ${w};" />`)
			.join("");

		let bodyHTML = "";
		reportData.forEach((item) => {
			bodyHTML += `<tr>
        <td class="center">${formatDate(item.Paid_Date)}</td>
        <td class="center">${escapeHtml(item.Pay_type)}</td>
        <td class="numeric">${formatNumber(item.Count)}</td>
        <td class="numeric">${formatNumber(item.Amount)}</td>
        <td class="numeric">${formatNumber(item.Stamp_Duty)}</td>
      </tr>`;
		});

		// Total row in PDF
		bodyHTML += `<tr class="total-row">
      <td colspan="4" class="left"><strong>Total Stamp duty for the period</strong></td>
      <td class="numeric"><strong>${formatNumber(
			totals.Stamp_Duty
		)}</strong></td>
    </tr>`;

		const fullHTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Regional Stamp Duty for PIV Transactions</title>
<style>${tableStyle}
body { font-family: Arial, sans-serif; margin: 15mm; print-color-adjust: exact; }
h3 { text-align: center; color: #7A0000; font-size: 16px; font-weight: bold; margin: 0 0 10px 0; }
.subtitles {display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 10px;}
.subtitle-left{ text-align: left; }
.subtitle-right{ text-align: right; }
.signatures { margin-top: 70px; display: flex; justify-content: space-between; align-items: end;}
.signature-box {width: 45%; text-align: center; font-size: 12px;}
.dotted-line {margin-bottom: 10px;}

@page { margin: 10mm; }
@page {
  @bottom-left { content: "Printed on: ${new Date().toLocaleString()}"; font-size: 9px; color: #666; }
  @bottom-right { content: "Page " counter(page) " of " counter(pages); font-size: 9px; color: #666; }
}
</style>
</head>
<body>
<h3>Stamp Duty for PIV Transactions above Rs. 25,000</h3>
<div class="subtitles">
  <div class="subtitle-left">
    <div><strong>Company / Division:</strong> ${escapeHtml(
			selectedCompany.compId
		)} / ${escapeHtml(selectedCompany.CompName)}</div>
    <strong>Period :</strong> ${fromDate} to ${toDate}
  </div>
  <div class="subtitle-right">
    <strong>Currency:</strong> LKR
  </div>
</div>

<table>
  <colgroup>${colGroupHTML}</colgroup>
  <thead>
    <tr>
      <th>Date</th>
      <th>Pay Type</th>
      <th>Count</th>
      <th>Amount</th>
      <th>Stamp Duty</th>
    </tr>
  </thead>
  <tbody>${bodyHTML}</tbody>
</table>
<div class="signatures">
  <div class="signature-box">
    <div class="dotted-line">
      ............................................................................
    </div>
    <strong>Checked By </strong>
    
  </div>

  <div class="signature-box">
    <div class="dotted-line">
      ............................................................................
    </div>
    <strong>Accountant (Cash)</strong>
    
  </div>
</div>
</body>
</html>`;

		const doc = iframeRef.current!.contentDocument!;
		doc.open();
		doc.write(fullHTML);
		doc.close();
		setTimeout(() => iframeRef.current?.contentWindow?.print(), 1000);
	};

	return (
		<div className="max-w-7xl mx-auto p-6 bg-white rounded-xl shadow border border-gray-200 text-sm">
			<iframe ref={iframeRef} style={{display: "none"}} />

			<h2 className={`text-xl font-bold mb-4 ${maroon}`}>
				Stamp Duty for PIV Transactions above Rs. 25,000
			</h2>

			<div className="flex justify-end mb-4">
				<DateRangePicker
					fromDate={fromDate}
					toDate={toDate}
					onFromChange={setFromDate}
					onToChange={setToDate}
				/>
			</div>

			<div className="mt-6">
				<ReusableCompanyList
					fetchItems={useCallback(async () => {
						if (!epfNo) {
							toast.error("No EPF number available.");
							return [];
						}
						try {
							const res = await fetch(
								`/misapi/api/incomeexpenditure/Usercompanies/${epfNo}/70`
							);
							if (!res.ok) throw new Error(`HTTP ${res.status}`);
							const txt = await res.text();
							const parsed = JSON.parse(txt);
							const raw = Array.isArray(parsed)
								? parsed
								: parsed.data || [];
							return raw.map((c: any) => ({
								id: c.CompId,
								name: c.CompName,
							}));
						} catch (e: any) {
							toast.error(e.message || "Failed to load companies");
							return [];
						}
					}, [epfNo])}
					onViewItem={(company: {id: string; name: string}) => {
						const typedCompany: Company = {
							compId: company.id,
							CompName: company.name,
						};
						handleViewReport(typedCompany);
					}}
					idColumnTitle="Company Code"
					nameColumnTitle="Company Name"
					loadingMessage="Loading companies..."
					emptyMessage="No companies available for selection."
				/>
			</div>

			{showReport && (
				<ReportViewer
					title="Stamp Duty for PIV Transactions above Rs. 25,000"
					subtitlebold2="Company / Division:"
					subtitlenormal2={`${selectedCompany?.compId} / ${selectedCompany?.CompName}`}
					subtitlebold3="Period:"
					subtitlenormal3={`${fromDate} to ${toDate}`}
					loading={reportLoading}
					hasData={reportData.length > 0}
					handleDownloadCSV={handleDownloadCSV}
					printPDF={printPDF}
					closeReport={closeReport}
				>
					<table className="w-full text-xs">
						<thead className={`${maroonGrad} text-white`}>
							<tr>
								<th className="border border-gray-400 px-4 py-3 text-center whitespace-nowrap">
									Date
								</th>
								<th className="border border-gray-400 px-4 py-3 text-center whitespace-nowrap">
									Pay Type
								</th>
								<th className="border border-gray-400 px-4 py-3 text-center whitespace-nowrap">
									Count
								</th>
								<th className="border border-gray-400 px-4 py-3 text-right whitespace-nowrap">
									Amount
								</th>
								<th className="border border-gray-400 px-4 py-3 text-right whitespace-nowrap">
									Stamp Duty
								</th>
							</tr>
						</thead>
						<tbody>
							{reportData.map((item, idx) => (
								<tr
									key={idx}
									className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
								>
									<td className="border border-gray-300 px-4 py-2 text-center whitespace-nowrap">
										{formatDate(item.Paid_Date)}
									</td>
									<td className="border border-gray-300 px-4 py-2 text-center whitespace-nowrap">
										{item.Pay_type}
									</td>
									<td className="border border-gray-300 px-4 py-2 text-center whitespace-nowrap">
										{item.Count.toLocaleString()}
									</td>
									<td className="border border-gray-300 px-4 py-2 text-right whitespace-nowrap">
										{formatNumber(item.Amount)}
									</td>
									<td className="border border-gray-300 px-4 py-2 text-right whitespace-nowrap">
										{formatNumber(item.Stamp_Duty)}
									</td>
								</tr>
							))}
							{/* Total Row */}
							<tr className="bg-gray-200 font-bold text-sm">
								<td
									colSpan={4}
									className="border border-gray-400 px-4 py-3 text-left"
								>
									Total Stamp duty for the period
								</td>
								<td className="border border-gray-400 px-4 py-3 text-right">
									{formatNumber(totals.Stamp_Duty)}
								</td>
							</tr>
						</tbody>
					</table>
				</ReportViewer>
			)}
		</div>
	);
};

export default RegionalPIVStampDutyReport;
