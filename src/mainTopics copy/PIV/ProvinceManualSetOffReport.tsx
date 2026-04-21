//18.1 Province wise Manual Set-Off PIV Details
// File: ProvinceManualSetOffReport.tsx

import React, {useState, useRef, useCallback} from "react";
import {useUser} from "../../contexts/UserContext";
import {toast} from "react-toastify";
import DateRangePicker from "../../components/utils/DateRangePicker";
import ReusableCompanyList from "../../components/utils/ReusableCompanyList";
import ReportViewer from "../../components/utils/ReportViewer";

interface ManualSetOffItem {
	DeptId: string | null;
	SPivNo: string | null;
	SPivDate: string | null;
	SPivAmount: number | null;
	SAccountCode: string | null;
	SAccountAmount: number | null;
	OPivNo: string | null;
	PaidDate: string | null;
	CompNm: string | null;
}

interface Company {
	compId: string;
	CompName: string;
}

const formatNumber = (num: number | null | undefined): string => {
	if (num == null || isNaN(num)) return "0.00";
	return new Intl.NumberFormat("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(num);
};

const formatDate = (dateStr: string | null): string => {
	if (!dateStr) return "";
	// Assuming backend returns yyyy-MM-dd or similar → force yyyy/MM/dd
	try {
		const date = new Date(dateStr);
		if (isNaN(date.getTime())) return dateStr;
		const yyyy = date.getFullYear();
		const mm = String(date.getMonth() + 1).padStart(2, "0");
		const dd = String(date.getDate()).padStart(2, "0");
		return `${yyyy}/${mm}/${dd}`;
	} catch {
		return dateStr;
	}
};

const csvEscape = (val: any): string => {
	if (val == null) return '""';
	let str = String(val);
	str = str.replace(/\r\n|\n|\r/g, " ");
	return `"${str.replace(/"/g, '""')}"`;
};

const forceText = (val: string | null | undefined): string => {
	if (!val) return "";
	return "\t" + val; // prefix tab → forces Excel to treat as text (preserves leading zeros)
};

const ProvinceManualSetOffReport: React.FC = () => {
	const {user} = useUser();
	const epfNo = user?.Userno || "";
	const iframeRef = useRef<HTMLIFrameElement>(null);

	const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
	const [fromDate, setFromDate] = useState<string>("");
	const [toDate, setToDate] = useState<string>("");
	const [reportData, setReportData] = useState<ManualSetOffItem[]>([]);
	const [reportLoading, setReportLoading] = useState(false);
	const [showReport, setShowReport] = useState(false);

	const maroon = "text-[#7A0000]";
	const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";

	const columns = [
		"Serial No",
		"Cost Center",
		"Set-Off PIV No",
		"Set-Off PIV Date",
		"Set-Off PIV Amount",
		"Set-Off Account Code",
		"Old PIV No",
		"Set-off Code Amount",
		"Old PIVPaid Date",
	];

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
			const apiFrom = fromDate.split("-").join("/");
			const apiTo = toDate.split("-").join("/");

			const url = `/misapi/api/province-manual-setoff-report/report?fromDate=${apiFrom}&toDate=${apiTo}&compId=${company.compId.trim()}`;
			const res = await fetch(url);
			if (!res.ok) throw new Error(`HTTP error ${res.status}`);

			const data = await res.json();
			const items: ManualSetOffItem[] = Array.isArray(data) ? data : [];

			// Sort by DeptId → Set-Off PIV No (matches backend ORDER BY)
			items.sort((a, b) => {
				const deptA = a.DeptId || "";
				const deptB = b.DeptId || "";
				if (deptA !== deptB) return deptA.localeCompare(deptB);
				const pivA = a.SPivNo || "";
				const pivB = b.SPivNo || "";
				return pivA.localeCompare(pivB);
			});

			setReportData(items);
			items.length === 0
				? toast.warn("No manual set-off records found for selected period")
				: toast.success("Manual PIV Set-off Report loaded");
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

		const csvRows: string[] = [
			"System generated Manual PIV set-off",
			`Company Name / Branch : ${selectedCompany.compId} / ${selectedCompany.CompName}`,
			`Period: ${fromDate} To ${toDate}`,
			"",
			columns.map(csvEscape).join(","),
		];

		reportData.forEach((item, index) => {
			const row = [
				index + 1,
				forceText(item.DeptId || ""), // cost center
				forceText(item.SPivNo || ""), // set-off piv no
				forceText(formatDate(item.SPivDate)), // date
				formatNumber(item.SPivAmount),
				forceText(item.SAccountCode || ""), // account code
				forceText(item.OPivNo || ""), // setoff_from piv no
				formatNumber(item.SAccountAmount),
				forceText(formatDate(item.PaidDate)), // paid date
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
		link.download = `Manual_PIV_SetOff_${selectedCompany.compId}_${fromDate}_to_${toDate}.csv`;
		link.click();
		URL.revokeObjectURL(url);
	};

	const escapeHtml = (text: string | null | undefined): string => {
		if (text == null) return "";
		const div = document.createElement("div");
		div.textContent = text;
		return div.innerHTML;
	};

	const printPDF = () => {
		if (reportData.length === 0 || !iframeRef.current || !selectedCompany)
			return;

		const tableStyle = `
      table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 9px; }
      th, td { border: 1px solid #aaa; padding: 5px; word-wrap: break-word; vertical-align: top; }
      th { font-weight: bold; }
      .numeric { text-align: right !important; }
      .text-center { text-align: center; }
    `;

		const colWidths = [
			"50px", // Serial No
			"80px", // Cost Center
			"100px", // Set-Off PIV No
			"95px", // Set-Off PIV Date
			"110px", // Set-Off PIV Amount
			"100px", // Set-Off Account Code
			"110px", // Set-off Code Amount
			"100px", // Old PIV No
			"95px", //Old PIV Paid Date
		];

		const colGroupHTML = `<colgroup>${colWidths.map((w) => `<col style="width: ${w};" />`).join("")}</colgroup>`;

		let bodyHTML = "";
		reportData.forEach((item, idx) => {
			bodyHTML += `<tr class="${idx % 2 === 0 ? "bg-white" : "bg-gray-50"}">
        <td class="text-center">${idx + 1}</td>
        <td>${escapeHtml(item.DeptId || "-")}</td>
        <td>${escapeHtml(item.SPivNo || "-")}</td>
        <td>${formatDate(item.SPivDate)}</td>
        <td class="numeric">${formatNumber(item.SPivAmount)}</td>
        <td>${escapeHtml(item.SAccountCode || "-")}</td>
		        <td>${escapeHtml(item.OPivNo || "-")}</td>
        <td class="numeric">${formatNumber(item.SAccountAmount)}</td>
        <td>${formatDate(item.PaidDate)}</td>
      </tr>`;
		});

		const headerHTML = `
      <thead>
        <tr>
          <th class="text-center">Serial No</th>
          <th>Cost Center</th>
          <th>Set-Off PIV No</th>
          <th>Set-Off PIV Date</th>
          <th>Set-Off PIV Amount</th>
          <th>Set-Off Account Code</th>
		            <th>Old PIV No</th>
          <th>Set-off Code Amount</th>
          <th>Old PIV Paid Date</th>
        </tr>
      </thead>`;

		const fullHTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Manual generated PIV set-off</title>
<style>
  ${tableStyle}
  body { font-family: Arial, sans-serif; margin: 10mm; print-color-adjust: exact; }
  h3 { text-align: center; color: #7A0000; font-size: 14px; margin: 6px 0; }
  .subtitle { font-size: 11px; margin: 4px 0; }
  .subtitle-left { font-size: 11px; margin: 4px 0; text-align: left; }
  .bold { font-weight: bold; }
  @page {  margin: 10mm; 
  @bottom-left { 
        content: "Printed on: ${new Date().toLocaleString()}"; 
        font-size: 9px; 
      }
      @bottom-right { 
        content: "Page " counter(page) " of " counter(pages); 
        font-size: 9px; 
      }
		}
</style>
</head>
<body>
<h3>Manual generated PIV set-off</h3>
<div class="subtitle"><span class="bold">Company Name / Branch :</span> ${escapeHtml(selectedCompany.compId)} / ${escapeHtml(selectedCompany.CompName)}</div>
<div class="subtitle"><span class="bold">Period:</span> ${fromDate} To ${toDate}</div>
<div class="subtitle-left"><span class="bold">Currency:</span>LKR</div>

<table>${colGroupHTML}${headerHTML}<tbody>${bodyHTML}</tbody></table>
</body>
</html>`;

		const doc = iframeRef.current!.contentDocument!;
		doc.open();
		doc.write(fullHTML);
		doc.close();

		setTimeout(() => iframeRef.current?.contentWindow?.print(), 800);
	};

	return (
		<div className="max-w-7xl mx-auto p-6 bg-white rounded-xl shadow border border-gray-200 text-sm">
			<iframe ref={iframeRef} style={{display: "none"}} />

			<h2 className={`text-xl font-bold mb-4 ${maroon}`}>
				Manual generated PIV set-off
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
								`/misapi/api/incomeexpenditure/Usercompanies/${epfNo}/60`,
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
						const typed: Company = {
							compId: company.id,
							CompName: company.name,
						};
						handleViewReport(typed);
					}}
					idColumnTitle="Company Code"
					nameColumnTitle="Company Name"
					loadingMessage="Loading companies..."
					emptyMessage="No companies available for selection."
				/>
			</div>

			{showReport && (
				<ReportViewer
					title="Manual generated PIV set-off"
					subtitlebold="Company Name / Branch :"
					subtitlenormal={`${selectedCompany?.compId || ""} / ${selectedCompany?.CompName || ""}`}
					subtitlebold2="Period:"
					subtitlenormal2={`${fromDate} To ${toDate}`}
					loading={reportLoading}
					hasData={reportData.length > 0}
					handleDownloadCSV={handleDownloadCSV}
					printPDF={printPDF}
					closeReport={closeReport}
				>
					<div className="overflow-x-auto">
						<table className="w-full text-xs min-w-max border-collapse">
							<thead className={`${maroonGrad} text-white`}>
								<tr>
									<th className="px-2 py-2 text-center">Serial No</th>
									<th className="px-2 py-2">Cost Center</th>
									<th className="px-2 py-2">Set-Off PIV No</th>
									<th className="px-2 py-2">Set-Off PIV Date</th>
									<th className="px-2 py-2 text-right">
										Set-Off PIV Amount
									</th>
									<th className="px-2 py-2">Set-Off Account Code</th>
									<th className="px-2 py-2">Old PIV No</th>
									<th className="px-2 py-2 text-right">
										Set-off Code Amount
									</th>

									<th className="px-2 py-2">Old PIV Paid Date</th>
								</tr>
							</thead>
							<tbody>
								{reportData.map((item, index) => (
									<tr
										key={index}
										className={
											index % 2 === 0 ? "bg-white" : "bg-gray-50"
										}
									>
										<td className="px-2 py-2 text-center border border-gray-200">
											{index + 1}
										</td>
										<td className="px-2 py-2 border border-gray-200">
											{item.DeptId || "-"}
										</td>
										<td className="px-2 py-2 border border-gray-200">
											{item.SPivNo || "-"}
										</td>
										<td className="px-2 py-2 border border-gray-200">
											{formatDate(item.SPivDate)}
										</td>
										<td className="px-2 py-2 text-right border border-gray-200">
											{formatNumber(item.SPivAmount)}
										</td>
										<td className="px-2 py-2 border border-gray-200">
											{item.SAccountCode || "-"}
										</td>
										<td className="px-2 py-2 border border-gray-200">
											{item.OPivNo || "-"}
										</td>
										<td className="px-2 py-2 text-right border border-gray-200">
											{formatNumber(item.SAccountAmount)}
										</td>

										<td className="px-2 py-2 border border-gray-200">
											{formatDate(item.PaidDate)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</ReportViewer>
			)}
		</div>
	);
};

export default ProvinceManualSetOffReport;
