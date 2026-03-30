// Solar Retail Rooftop Pending Jobs after PIV2 Paid
// File: SolarPendingJobsReport.tsx

import React, {useState, useRef, useCallback} from "react";
import {useUser} from "../../contexts/UserContext";
import {toast} from "react-toastify";
import DateRangePicker from "../../components/utils/DateRangePicker";
import ReusableCompanyList from "../../components/utils/ReusableCompanyList";
import ReportViewer from "../../components/utils/ReportViewer";

interface SolarPendingJobsItem {
	Dept_Id: string;
	Application_Id: number | null;
	Application_No: string;
	Submit_Date: Date | null;
	ProjectNo: string;
	Piv_Date: Date | null; // PIV1 Issued Date
	Paid_Date: Date | null; // PIV1 Paid Date
	Piv2_Paid_Date: Date | null; // PIV2 Paid Date
	Existing_Acc_No: string;
	Status: string;
	Application_Sub_Type: string; // Human-readable (e.g., Net Accounting)
	Comp_Nm: string;
}

interface Company {
	compId: string;
	CompName: string;
}

const formatDate = (date: Date | null): string => {
	if (!date) return "";
	return new Date(date).toLocaleDateString("en-GB", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
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

const SolarPendingJobsReport: React.FC = () => {
	const {user} = useUser();
	const epfNo = user?.Userno || "";
	const iframeRef = useRef<HTMLIFrameElement>(null);

	const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
	const [fromDate, setFromDate] = useState("");
	const [toDate, setToDate] = useState("");
	const [reportData, setReportData] = useState<SolarPendingJobsItem[]>([]);
	const [reportLoading, setReportLoading] = useState(false);
	const [showReport, setShowReport] = useState(false);

	const maroon = "text-[#7A0000]";
	const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";

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
			const url = `/misapi/api/solarpendingjobs/get?compId=${
				company.compId
			}&fromDate=${fromDate.replace(/-/g, "")}&toDate=${toDate.replace(
				/-/g,
				""
			)}`;
			const res = await fetch(url);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = await res.json();
			const items: SolarPendingJobsItem[] = Array.isArray(data)
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

		const headers = [
			"Item",
			"Dept ID",
			"Application No",
			"App Submit Date",
			"PIV1 Issued Date",
			"PIV1 Paid Date",
			"Estimate No",
			"PIV2 Paid Date",
			"Project No",
			"Status",
			"Application Sub Type",
			"Existing Account No",
		];

		const csvRows: string[] = [
			"Solar Retail Rooftop Pending Jobs after PIV2 Paid",
			`Branch/Province: ${selectedCompany.compId} - ${selectedCompany.CompName}`,
			`Period: ${fromDate} to ${toDate}`,
			"",
			headers.map(csvEscape).join(","),
		];

		reportData.forEach((item, index) => {
			const estimateNo = item.Application_No.replace("ACR", "ECR"); // or derive if needed; using Application_No as fallback per image // rough approximation based on sample image

			const row = [
				index + 1,
				`="${item.Dept_Id ?? ""}"`,
				`="${item.Application_No ?? ""}"`,
				formatDate(item.Submit_Date),
				formatDate(item.Piv_Date),
				formatDate(item.Paid_Date),
				`="${estimateNo ?? ""}"`,
				formatDate(item.Piv2_Paid_Date),
				`="${item.ProjectNo ?? ""}"`,
				item.Status || "",
				item.Application_Sub_Type || "",
				`="${item.Existing_Acc_No ?? ""}"`,
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
		link.download = `Solar_Pending_Jobs_${selectedCompany.compId}_${fromDate}_to_${toDate}.csv`;
		link.click();
		URL.revokeObjectURL(url);
	};

	const printPDF = () => {
		if (reportData.length === 0 || !iframeRef.current || !selectedCompany)
			return;

		const tableStyle = `
      table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 10px; }
      th, td { border: 1px solid #aaa; padding: 6px; word-wrap: break-word; vertical-align: top; text-align: left; }
      th { font-weight: bold; background-color: #f0f0f0; }
      .center { text-align: center; }
      .right { text-align: right; }
    `;

		const colWidths = [
			"40px", // Item
			"70px", // Dept ID
			"130px", // Application No
			"100px", // App Submit Date
			"110px", // PIV1 Issued
			"110px", // PIV1 Paid
			"130px", // Estimate No
			"110px", // PIV2 Paid
			"130px", // Project No
			"140px", // Status
			"160px", // Application Sub Type
			"120px", // Existing Account No
		];

		const colGroupHTML = colWidths
			.map((w) => `<col style="width: ${w};" />`)
			.join("");

		let bodyHTML = "";
		reportData.forEach((item, idx) => {
			const estimateNo = item.Application_No.replace("ACR", "ECR"); // mimic sample

			bodyHTML += `<tr>
        <td class="center">${idx + 1}</td>
        <td>${escapeHtml(item.Dept_Id)}</td>
        <td>${escapeHtml(item.Application_No)}</td>
        <td>${formatDate(item.Submit_Date)}</td>
        <td>${formatDate(item.Piv_Date)}</td>
        <td>${formatDate(item.Paid_Date)}</td>
        <td>${escapeHtml(estimateNo)}</td>
        <td>${formatDate(item.Piv2_Paid_Date)}</td>
        <td>${escapeHtml(item.ProjectNo)}</td>
        <td>${escapeHtml(item.Status)}</td>
        <td>${escapeHtml(item.Application_Sub_Type)}</td>
        <td>${escapeHtml(item.Existing_Acc_No)}</td>
      </tr>`;
		});

		const fullHTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Solar Retail Rooftop Pending Jobs after PIV2 Paid</title>
<style>${tableStyle}
body { font-family: Arial, sans-serif; margin: 10mm; print-color-adjust: exact; }
h3 { text-align: center; color: #7A0000; font-size: 16px; font-weight: bold; margin: 0 0 10px 0; }
.subtitle { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 8px; }
.subtitle-left { text-align: left; }
.subtitle-right { text-align: right; }
@page { size: A4 landscape; margin: 12mm; }
@page {
  @bottom-left { content: "Printed on: ${new Date().toLocaleString()}"; font-size: 9px; color: #666; }
  @bottom-right { content: "Page " counter(page) " of " counter(pages); font-size: 9px; color: #666; }
}
</style>
</head>
<body>
<h3>Solar Retail Rooftop Pending Jobs after PIV2 Paid - From ${fromDate} To ${toDate}</h3>
<div class="subtitle">
  <div class="subtitle-left">
    <strong>Branch/Province :</strong> ${escapeHtml(
			selectedCompany.compId
		)} - ${escapeHtml(selectedCompany.CompName)}
  </div>
</div>

<table>
  <colgroup>${colGroupHTML}</colgroup>
  <thead>
    <tr>
      <th>Item</th>
      <th>Dept ID</th>
      <th>Application No</th>
      <th>App Submit Date</th>
      <th>PIV1 Issued Date</th>
      <th>PIV1 Paid Date</th>
      <th>Estimate No</th>
      <th>PIV2 Paid Date</th>
      <th>Project No</th>
      <th>Status</th>
      <th>Application Sub Type</th>
      <th>Existing Account No</th>
    </tr>
  </thead>
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
		<div className="max-w-7xl mx-auto p-6 bg-white rounded-xl shadow border border-gray-200 text-sm">
			<iframe ref={iframeRef} style={{display: "none"}} />

			<h2 className={`text-xl font-bold mb-4 ${maroon}`}>
				Solar Retail Rooftop Pending Jobs after PIV2 Paid
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
								`/misapi/api/incomeexpenditure/Usercompanies/${epfNo}/60`
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
					title="Solar Retail Rooftop Pending Jobs after PIV2 Paid"
					subtitlebold2="Branch/Province :"
					subtitlenormal2={`${selectedCompany?.compId} - ${selectedCompany?.CompName}`}
					subtitlebold3="Period:"
					subtitlenormal3={`From ${fromDate} To ${toDate}`}
					loading={reportLoading}
					hasData={reportData.length > 0}
					handleDownloadCSV={handleDownloadCSV}
					printPDF={printPDF}
					closeReport={closeReport}
				>
					<table className="w-full text-xs">
						<thead className={`${maroonGrad} text-white`}>
							<tr>
								<th className="border border-gray-400 px-2 py-2 text-center whitespace-nowrap">
									Item
								</th>
								<th className="border border-gray-400 px-2 py-2 whitespace-nowrap">
									Dept ID
								</th>
								<th className="border border-gray-400 px-2 py-2 whitespace-nowrap">
									Application No
								</th>
								<th className="border border-gray-400 px-2 py-2 whitespace-nowrap">
									App Submit Date
								</th>
								<th className="border border-gray-400 px-2 py-2 whitespace-nowrap">
									PIV1 Issued Date
								</th>
								<th className="border border-gray-400 px-2 py-2 whitespace-nowrap">
									PIV1 Paid Date
								</th>
								<th className="border border-gray-400 px-2 py-2 whitespace-nowrap">
									Estimate No
								</th>
								<th className="border border-gray-400 px-2 py-2 whitespace-nowrap">
									PIV2 Paid Date
								</th>
								<th className="border border-gray-400 px-2 py-2 whitespace-nowrap">
									Project No
								</th>
								<th className="border border-gray-400 px-2 py-2 whitespace-nowrap">
									Status
								</th>
								<th className="border border-gray-400 px-2 py-2 whitespace-nowrap">
									Application Sub Type
								</th>
								<th className="border border-gray-400 px-2 py-2 whitespace-nowrap">
									Existing Account No
								</th>
							</tr>
						</thead>
						<tbody>
							{reportData.map((item, idx) => {
								const estimateNo = item.Application_No.replace(
									"ACR",
									"ECR"
								);
								return (
									<tr
										key={idx}
										className={
											idx % 2 === 0 ? "bg-white" : "bg-gray-50"
										}
									>
										<td className="border border-gray-300 px-2 py-2 text-center whitespace-nowrap">
											{idx + 1}
										</td>
										<td className="border border-gray-300 px-2 py-2 whitespace-nowrap">
											{item.Dept_Id}
										</td>
										<td className="border border-gray-300 px-2 py-2 whitespace-nowrap">
											{item.Application_No}
										</td>
										<td className="border border-gray-300 px-2 py-2 whitespace-nowrap">
											{formatDate(item.Submit_Date)}
										</td>
										<td className="border border-gray-300 px-2 py-2 whitespace-nowrap">
											{formatDate(item.Piv_Date)}
										</td>
										<td className="border border-gray-300 px-2 py-2 whitespace-nowrap">
											{formatDate(item.Paid_Date)}
										</td>
										<td className="border border-gray-300 px-2 py-2 whitespace-nowrap">
											{estimateNo}
										</td>
										<td className="border border-gray-300 px-2 py-2 whitespace-nowrap">
											{formatDate(item.Piv2_Paid_Date)}
										</td>
										<td className="border border-gray-300 px-2 py-2 whitespace-nowrap">
											{item.ProjectNo}
										</td>
										<td className="border border-gray-300 px-2 py-2 whitespace-nowrap">
											{item.Status}
										</td>
										<td className="border border-gray-300 px-2 py-2 whitespace-normal">
											{item.Application_Sub_Type}
										</td>
										<td className="border border-gray-300 px-2 py-2 whitespace-nowrap">
											{item.Existing_Acc_No}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</ReportViewer>
			)}
		</div>
	);
};

export default SolarPendingJobsReport;
