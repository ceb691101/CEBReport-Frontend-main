// File: BankPaidPIVDetails.tsx
import React, {useState, useRef} from "react";
import {Eye,} from "lucide-react";
import {toast} from "react-toastify";
import DateRangePicker from "../../components/utils/DateRangePicker"; // assuming you have this
import ReportViewer from "../../components/utils/ReportViewer"; // assuming you have this

interface BankPaidPIVItem {
	PaidDate: string | null; // comes as string "yyyy/mm/dd" or null
	BankCheckNo: string | null;
	PaidAgent: string | null;
	DeptId: string | null;
	PaidBranch: string | null;
	PaidAmount: number | null;
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
	if (num == null || isNaN(num)) return "0.00";
	return new Intl.NumberFormat("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(num);
};

const csvEscape = (val: string | number | null | undefined, ): string => {
	if (val == null) return '""';
	const str = String(val).trim();
	if (/[,\n"]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
	return str;
};

const forceText = (val: string | number | null | undefined): string => {
	if (val == null) return '""';
	const str = String(val).trim();
	return `="${str.replace(/"/g, '""')}"`;
};

const BankPaidPIVDetails: React.FC = () => {
	const [fromDate, setFromDate] = useState("");
	const [toDate, setToDate] = useState("");
	const [reportData, setReportData] = useState<BankPaidPIVItem[]>([]);
	const [loading, setLoading] = useState(false);
	const [showReport, setShowReport] = useState(false);
	const iframeRef = useRef<HTMLIFrameElement>(null);

	const handleViewReport = async () => {
		if (!fromDate || !toDate) return toast.error("Please select both dates");
		const from = new Date(fromDate);
		const to = new Date(toDate);
		if (to < from)
			return toast.error("To Date cannot be earlier than From Date");

		// Convert to yyyy/mm/dd format expected by backend
		const formatForApi = (dateStr: string) => {
			if (!dateStr) return "";
			const [year, month, day] = dateStr.split("-");
			return `${year}/${month}/${day}`;
		};

		const fromApi = formatForApi(fromDate);
		const toApi = formatForApi(toDate);

		setLoading(true);
		setReportData([]);
		setShowReport(true);

		try {
			// Adjust URL to match your .NET API route
			const url = `/misapi/api/bank-paid-piv/report?fromDate=${fromApi}&toDate=${toApi}`;
			const res = await fetch(url);
			if (!res.ok) throw new Error(`HTTP error ${res.status}`);
			const data = await res.json();
			const items: BankPaidPIVItem[] = Array.isArray(data)
				? data
				: data.data || [];
			setReportData(items);

			items.length === 0
				? toast.warn("No records found for selected period")
				: toast.success(`Loaded ${items.length} record(s)`);
		} catch (err: any) {
			toast.error("Failed to load report: " + err.message);
		} finally {
			setLoading(false);
		}
	};;

	const closeReport = () => {
		setShowReport(false);
		setReportData([]);
	};

	const grandTotal = reportData.reduce(
		(sum, row) => sum + (row.PaidAmount || 0),
		0,
	);

	const handleDownloadCSV = () => {
		if (reportData.length === 0) return;

		const headers = [
			"Paid Date",
			"Bank Cheque No",
			"Paid Agent",
			"Dept Id",
			"Paid Branch",
			"Paid Amount",
		];

		const csvRows = [
			`Bank Paid PIV Details Report From ${fromDate} to ${toDate}`,
			"Currency: LKR",
			"",
			headers.map(csvEscape).join(","),
			...reportData.map((row) =>
				[
					csvEscape(formatDate(row.PaidDate)),
					csvEscape(forceText(row.BankCheckNo || "")),
					csvEscape(forceText(row.PaidAgent || "")),
					csvEscape(forceText(row.DeptId || "")),
					csvEscape(forceText(row.PaidBranch || "")),
					csvEscape(formatNumber(row.PaidAmount)),
				].join(","),
			),
			"",
			`Total, , , , ,${csvEscape(formatNumber(grandTotal))}`,
		];

		const csvContent = csvRows.join("\n");
		const blob = new Blob(["\uFEFF" + csvContent], {
			type: "text/csv;charset=utf-8;",
		});
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `Bank_Paid_PIV_Details_${fromDate}_to_${toDate}.csv`;
		link.click();
		URL.revokeObjectURL(url);
	};

	const printPDF = () => {
		if (reportData.length === 0 || !iframeRef.current) return;

		const printDate = new Date().toLocaleString();

		const tableStyle = `
      table { width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 10px; }
      th, td { border: 1px solid #888; padding: 6px; text-align: left; font-family: Arial, sans-serif; }
      th { background-color: #7A0000;  font-weight: bold; font-family: Arial, sans-serif;  }
      .numeric { text-align: right !important; }
      .title { color: #7A0000; font-size: 16px; font-weight: bold; text-align: center; margin-bottom: 4px; font-family: Arial, sans-serif;  }
      .subtitle { font-size: 11px; text-align: right; margin-bottom: 12px; font-family: Arial, sans-serif; }
      .total-row { background-color: #e0e0e0; font-weight: bold; }
.signature-section { margin-top: 30px; font-size: 12px; font-weight: bold; font-family: Arial, sans-serif;}
      @page { margin: 12mm; }
      @page { 
        @bottom-left { content: "Printed on: ${printDate}"; font-size: 9px;  }
        @bottom-right { content: "Page " counter(page) " of " counter(pages); font-size: 9px; }
      }
    `;

		let bodyHTML = reportData
			.map(
				(row) => `
      <tr>
        <td>${formatDate(row.PaidDate) || "-"}</td>
        <td>${row.BankCheckNo || "-"}</td>
        <td>${row.PaidAgent || "-"}</td>
        <td>${row.DeptId || "-"}</td>
        <td>${row.PaidBranch || "-"}</td>
        <td class="numeric">${formatNumber(row.PaidAmount)}</td>
      </tr>`,
			)
			.join("");

		const fullHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Bank Paid PIV Details</title>
  <style>${tableStyle}</style>
</head>
<body>
  <div class="title">Bank Paid PIV Details Report - From ${fromDate} to ${toDate} </div>
  <div class="subtitle">
    Currency: LKR
  </div>
  <table>
    <thead>
      <tr>
        <th>Paid Date</th>
        <th>Bank Cheque No</th>
        <th>Paid Agent</th>
        <th>Dept Id</th>
        <th>Paid Branch</th>
        <th class="numeric">Paid Amount</th>
      </tr>
    </thead>
    <tbody>
      ${bodyHTML}
      <tr class="total-row">
        <td colspan="5" style="text-align: left; padding-right: 12px;">Total</td>
        <td class="numeric">${formatNumber(grandTotal)}</td>
      </tr>
    </tbody>
  </table>
 <div class="signature-section">
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px 100px;">
      <div>
        <p>Prepared By: ...........................</p>
      </div>
      <div>
        <p>Certified: ........................... </p>
      </div>
      <div>
        <p>Checked By: ...........................</p>
      </div>
      <div>
        <p>Accountant: ...........................</p>
      </div>
    </div>
  </div>
</body>
</html>`;

		const doc = iframeRef.current.contentDocument!;
		doc.open();
		doc.write(fullHTML);
		doc.close();

		setTimeout(() => iframeRef.current?.contentWindow?.print(), 800);
	};

	return (
		<div className="max-w-7xl mx-auto p-6 bg-white rounded-xl shadow border border-gray-200 text-sm">
			<iframe ref={iframeRef} style={{display: "none"}} />

			<h2 className="text-xl font-bold mb-5 text-[#7A0000]">
				Bank Paid PIV Details
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
					disabled={!fromDate || !toDate || loading}
					className="px-5 py-2 rounded text-white font-medium bg-gradient-to-r from-[#7A0000] to-[#A52A2A] disabled:opacity-50 hover:brightness-110 flex items-center gap-2"
				>
					<Eye className="w-4 h-4" />
					View
				</button>
			</div>

			{showReport && (
				<ReportViewer
					title={`Bank Paid PIV Details Report - From ${fromDate} to ${toDate}`}
					subtitlebold=""
					subtitlenormal=""
					loading={loading}
					hasData={reportData.length > 0}
					handleDownloadCSV={handleDownloadCSV}
					printPDF={printPDF}
					closeReport={closeReport}
				>
					<div className="overflow-x-auto">
						<table className="w-full text-xs border-collapse min-w-max">
							<thead className="bg-gradient-to-r from-[#7A0000] to-[#A52A2A] text-white">
								<tr>
									<th className="px-4 py-2">Paid Date</th>
									<th className="px-4 py-2">Bank Cheque No</th>
									<th className="px-4 py-2">Paid Agent</th>
									<th className="px-4 py-2">Dept Id</th>
									<th className="px-4 py-2">Paid Branch</th>
									<th className="px-4 py-2 text-right">Paid Amount</th>
								</tr>
							</thead>
							<tbody>
								{reportData.map((row, idx) => (
									<tr
										key={idx}
										className={
											idx % 2 === 0 ? "bg-white" : "bg-gray-50"
										}
									>
										<td className="px-4 py-2 border border-gray-200">
											{formatDate(row.PaidDate)}
										</td>
										<td className="px-4 py-2 border border-gray-200 font-mono">
											{row.BankCheckNo || "-"}
										</td>
										<td className="px-4 py-2 border border-gray-200 font-mono">
											{row.PaidAgent || "-"}
										</td>
										<td className="px-4 py-2 border border-gray-200">
											{row.DeptId || "-"}
										</td>
										<td className="px-4 py-2 border border-gray-200 font-mono">
											{row.PaidBranch || "-"}
										</td>
										<td className="px-4 py-2 text-right border border-gray-200 font-medium">
											{formatNumber(row.PaidAmount)}
										</td>
									</tr>
								))}

								<tr className="bg-gray-200 font-bold">
									<td colSpan={5} className="px-4 py-2 text-right">
										Total
									</td>
									<td className="px-4 py-2 text-right">
										{formatNumber(grandTotal)}
									</td>
								</tr>
							</tbody>
						</table>
					</div>
				</ReportViewer>
			)}
		</div>
	);
};

export default BankPaidPIVDetails;
