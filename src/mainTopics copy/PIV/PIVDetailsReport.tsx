// File: PIVDetailsReport.tsx
import React, {useState, useRef} from "react";
import {Eye} from "lucide-react";
import {useUser} from "../../contexts/UserContext";
import {toast} from "react-toastify";
import DateRangePicker from "../../components/utils/DateRangePicker";
import ReportViewer from "../../components/utils/ReportViewer";

interface PIVDetailsItem {
	Dept_Id: string;
	Paid_Dept_Id: string;
	Piv_No: string;
	Piv_Receipt_No: string;
	Piv_Date: string | null;
	Paid_Date: string | null;
	Payment_Mode: string;
	Piv_Amount: number;
	Paid_Amount: number;
	Difference: number;
	Bank_Check_No: string;
	Cct_Name: string;
	Company: string;
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

const formatDate = (dateStr: string | null): string => {
	if (!dateStr) return "";
	try {
		const date = new Date(dateStr);

		return date
			.toLocaleDateString("en-GB", {
				year: "numeric",
				month: "2-digit",
				day: "2-digit",
			})
			.replace(/\//g, "/"); // Optional, ensures separator is '/'
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

const PIVDetailsReport: React.FC = () => {
	useUser();

	const [fromDate, setFromDate] = useState("");
	const [toDate, setToDate] = useState("");
	const [reportData, setReportData] = useState<PIVDetailsItem[]>([]);
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
		setShowReport(true);

		try {
			const url = `/misapi/api/pivdetails/get?fromDate=${fromDate.replace(
				/-/g,
				""
			)}&toDate=${toDate.replace(/-/g, "")}`;
			const res = await fetch(url);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = await res.json();
			const items: PIVDetailsItem[] = Array.isArray(data)
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

	// CSV Export
	const handleDownloadCSV = () => {
		if (reportData.length === 0) return;

		const headers = [
			"Branch",
			"Company",
			"Bank Check No",
			"PIV No",
			"PIV Date",
			"Paid Date",
			"PIV Amount",
			"Paid Amount",
			"Difference",
		];

		const csvRows: string[] = [
			"PIV Details Report (PIV Amount not tallied with Paid Amount)",
			`Period: ${fromDate} To ${toDate}`,
			"Currency: LKR",

			"",
			headers.map(csvEscape).join(","),
		];

		reportData.forEach((item) => {
			const row = [
				`="${item.Dept_Id ?? ""}"`,
				`="${item.Company ?? ""}"`,
				`="${item.Bank_Check_No ?? ""}"`,
				`="${item.Piv_No ?? ""}"`,
				formatDate(item.Piv_Date),
				formatDate(item.Paid_Date),
				formatNumber(item.Piv_Amount),
				formatNumber(item.Paid_Amount),
				formatNumber(item.Difference),
			];
			csvRows.push(row.map(csvEscape).join(","));
		});

	

		const csvContent = csvRows.join("\n");
		const blob = new Blob(["\uFEFF" + csvContent], {
			type: "text/csv;charset=utf-8;",
		});
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `PIV_Details_Report_${fromDate}_to_${toDate}.csv`;
		link.click();
		URL.revokeObjectURL(url);
	};

	// Print PDF
	const printPDF = () => {
		if (reportData.length === 0 || !iframeRef.current) return;

		const tableStyle = `
      table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 10px; }
      th, td { border: 1px solid #aaa; padding: 6px; word-wrap: break-word; vertical-align: top; }
      th {font-weight: bold; }
      .numeric { text-align: right !important; }
      .total-row { background-color: #bfdbfe !important; font-weight: bold; }
    `;

		const colWidths = [
			"90px", // Branch
			"130px", // Company
			"110px", // Bank Check No
			"110px", // PIV No
			"100px", // PIV Date
			"100px", // Paid Date
			"110px", // PIV Amount
			"110px", // Paid Amount
			"110px", // Difference
		];

		const colGroupHTML = `
      <colgroup>
        ${colWidths.map((w) => `<col style="width: ${w};" />`).join("")}
      </colgroup>
    `;

		let bodyHTML = "";
		reportData.forEach((item, idx) => {
			bodyHTML += `<tr class="${idx % 2 === 0 ? "bg-white" : "bg-gray-50"}">
        <td>${escapeHtml(`${item.Dept_Id}`)}</td>
        <td>${escapeHtml(item.Company || "-")}</td>
        <td>${escapeHtml(item.Bank_Check_No || "-")}</td>
        <td>${escapeHtml(item.Piv_No)}</td>
        <td>${formatDate(item.Piv_Date)}</td>
        <td>${formatDate(item.Paid_Date)}</td>
        <td class="numeric">${formatNumber(item.Piv_Amount)}</td>
        <td class="numeric">${formatNumber(item.Paid_Amount)}</td>
        <td class="numeric">${formatNumber(item.Difference)}</td>
      </tr>`;
		});

		

		const headerHTML = `
      <thead>
        <tr>
          <th>Branch</th>
          <th>Company</th>
          <th>Bank Check No</th>
          <th>PIV No</th>
          <th>PIV Date</th>
          <th>Paid Date</th>
          <th>PIV Amount</th>
          <th>Paid Amount</th>
          <th>Difference</th>
        </tr>
      </thead>`;

		const fullHTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>PIV Details Report</title>
<style>${tableStyle}
body { font-family: Arial, sans-serif; margin: 8mm; print-color-adjust: exact; }
h3 { text-align: center; color: #7A0000; font-size: 14px; font-weight: bold; margin: 0 0 4px 0; }
.subtitles {display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 11px;}
.subtitle-left{ text-align: left; }
.subtitle-right{ text-align: right; }

@page {margin: 10mm; }
@page { 
  @bottom-left { content: "Printed on: ${new Date().toLocaleString()}"; font-size: 9px; color: #666; }
  @bottom-right { content: "Page " counter(page) " of " counter(pages); font-size: 9px; color: #666; }
}
</style>
</head>
<body>
<h3>PIV Details Report (PIV Amount not tallied with Paid Amount)</h3>
<div class="subtitles">
  <div class="subtitle-left">
    <strong>Period :</strong> ${fromDate} to ${toDate}
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

	return (
		<div className="max-w-7xl mx-auto p-6 bg-white rounded-xl shadow border border-gray-200 text-sm">
			<iframe ref={iframeRef} style={{display: "none"}} />

			<h2 className={`text-xl font-bold mb-4 ${maroon}`}>
				PIV Details Report (PIV Amount not tallied with Paid Amount)
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
					title="PIV Details Report (PIV Amount not tallied with Paid Amount)"
					subtitlebold="Period:"
					subtitlenormal={`${fromDate} to ${toDate}`}
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
								<th className="px-3 py-2 text-left">Branch</th>
								<th className="px-3 py-2 text-left">Company</th>
								<th className="px-3 py-2 text-left">Bank Check No</th>
								<th className="px-3 py-2 text-left">PIV No</th>
								<th className="px-3 py-2 text-left">PIV Date</th>
								<th className="px-3 py-2 text-left">Paid Date</th>
								<th className="px-3 py-2 text-right">PIV Amount</th>
								<th className="px-3 py-2 text-right">Paid Amount</th>
								<th className="px-3 py-2 text-right">Difference</th>
							</tr>
						</thead>
						<tbody>
							{reportData.map((item, idx) => (
								<tr
									key={idx}
									className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
								>
									<td className="px-3 py-3 border border-gray-300">
										{item.Dept_Id}
									</td>
									<td className="px-3 py-3 border border-gray-300">
										{item.Company || "-"}
									</td>
									<td className="px-3 py-3 border border-gray-300">
										{item.Bank_Check_No || "-"}
									</td>
									<td className="px-3 py-3 border border-gray-300">
										{item.Piv_No}
									</td>
									<td className="px-3 py-3 border border-gray-300">
										{formatDate(item.Piv_Date)}
									</td>
									<td className="px-3 py-3 border border-gray-300">
										{formatDate(item.Paid_Date)}
									</td>
									<td className="px-3 py-3 text-right border border-gray-300">
										{formatNumber(item.Piv_Amount)}
									</td>
									<td className="px-3 py-3 text-right border border-gray-300">
										{formatNumber(item.Paid_Amount)}
									</td>
									<td className="px-3 py-3 text-right border border-gray-300">
										{formatNumber(item.Difference)}
									</td>
								</tr>
							))}
							
						</tbody>
					</table>
				</ReportViewer>
			)}
		</div>
	);
};

export default PIVDetailsReport;
