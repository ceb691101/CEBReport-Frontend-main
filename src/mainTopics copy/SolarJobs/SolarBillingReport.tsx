//Area-wise Solar Sent to Billing Details
// File: SolarBillingReport.tsx
import React, {useState, useRef, useCallback} from "react";
import {useUser} from "../../contexts/UserContext";
import {toast} from "react-toastify";
import DateRangePicker from "../../components/utils/DateRangePicker";
import ReusableCompanyList from "../../components/utils/ReusableCompanyList";
import ReportViewer from "../../components/utils/ReportViewer";

interface SolarBillingItem {
	Dept_Id: string;
	Id_No: string;
	Application_No: string;
	Application_Sub_Type: string;
	Name: string;
	Address: string;
	Submit_Date: Date | null;
	Capacity: number | null;
	Account_No: string;
	Exported_Date: Date | null;
	Tariff_Code: string;
	Phase: string;
	Project_No: string;
	Agreement_Date: Date | null;
	Bank_Account_No: string;
	Bank_Code: string;
	Branch_Code: string;
	Cost_Center_Name: string;
	Company_Name: string;
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

const getSolarType = (subType: string): string => {
	const map: Record<string, string> = {
		NM: "Net Metering",
		NP: "Net Plus",
		NA: "Net Accounting",
		BM: "Bulk Net Metering",
		BP: "Bulk Net Plus",
		BA: "Bulk Net Accounting",
		NT: "Net Accounting (New Tariff)",
		AC: "Advanced Credit",
		PC: "Partial Credit",
		PP: "Partial Plus",
		PN: "Partial Net",
		PB: "Partial Bulk",
	};
	return map[subType] || subType || "-";
};

const SolarBillingReport: React.FC = () => {
	const {user} = useUser();
	const epfNo = user?.Userno || "";
	const iframeRef = useRef<HTMLIFrameElement>(null);

	const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
	const [fromDate, setFromDate] = useState("");
	const [toDate, setToDate] = useState("");
	const [reportData, setReportData] = useState<SolarBillingItem[]>([]);
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
			const url = `/misapi/api/solarbilling/get?compId=${company.compId.trim()}&fromDate=${fromDate.replace(
				/-/g,
				""
			)}&toDate=${toDate.replace(/-/g, "")}`;
			const res = await fetch(url);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = await res.json();
			const items: SolarBillingItem[] = Array.isArray(data)
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
		setSelectedCompany(null);
	};

	const handleDownloadCSV = () => {
		if (reportData.length === 0 || !selectedCompany) return;

		const headers = [
			"Item",
			"Dept Id",
			"Application No",
			"Applicant Name",
			"Applicant Address",
			"NIC No",
			"Exported Date",
			"Bank Account No",
			"Cost Center Name",
			"Tariff",
			"Phase",
			"Capacity",
			"Ele. Account No",
			"Project / Job No",
			"Solar Type",
			"Bank Code",
			"Bank Branch",
		];

		const csvRows: string[] = [
			"Solar Details Sent to billing",
			`Company: ${selectedCompany.compId} / ${selectedCompany.CompName}`,
			`Period: ${fromDate} to ${toDate}`,
			"Currency: LKR",
			"",
			headers.map(csvEscape).join(","),
		];

		reportData.forEach((item, index) => {
			const row = [
				index + 1,
				`="${item.Dept_Id ?? ""}"`,
				`="${item.Application_No ?? ""}"`,
				`="${item.Name ?? ""}"`,
				item.Address || "",
				`="${item.Id_No ?? ""}"`,
				`="${formatDate(item.Exported_Date) || ""}"`,
				`="${item.Bank_Account_No ?? ""}"`,
				`="${item.Cost_Center_Name ?? ""}"`,
				`="${item.Tariff_Code ?? ""}"`,
				`="${item.Phase ?? ""}"`,
				`="${item.Capacity ?? ""}"`,
				`="${item.Account_No ?? ""}"`,
				`="${item.Project_No ?? ""}"`,
				getSolarType(item.Application_Sub_Type),
				`="${item.Bank_Code ?? ""}"`,
				`="${item.Branch_Code ?? ""}"`,
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
		link.download = `Solar_Billing_Report_${selectedCompany.compId}_${fromDate}_to_${toDate}.csv`;
		link.click();
		URL.revokeObjectURL(url);
	};

	const printPDF = () => {
		if (reportData.length === 0 || !iframeRef.current || !selectedCompany)
			return;

		const tableStyle = `
      table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 10px; }
      th, td { border: 1px solid #aaa; padding: 6px; word-wrap: break-word; vertical-align: top; text-align: left; }
      th { font-weight: bold; }
      .numeric { text-align: right; }
      .center { text-align: center; }
    
    `;

		const colWidths = [
			"40px",
			"80px",
			"120px",
			"200px",
			"160px",
			"90px",
			"90px",
			"120px",
			"250px",
			"80px",
			"60px",
			"70px",
			"100px",
			"120px",
			"110px",
			"80px",
			"90px",
		];

		const colGroupHTML = colWidths
			.map((w) => `<col style="width: ${w};" />`)
			.join("");

		let bodyHTML = "";
		reportData.forEach((item, idx) => {
			bodyHTML += `<tr>
        <td class="center">${idx + 1}</td>
        <td>${escapeHtml(item.Dept_Id)}</td>
        <td>${escapeHtml(item.Application_No)}</td>
        <td>${escapeHtml(item.Name)}</td>
        <td>${escapeHtml(item.Address)}</td>
        <td>${escapeHtml(item.Id_No)}</td>
        <td>${formatDate(item.Exported_Date)}</td>
        <td>${escapeHtml(item.Bank_Account_No)}</td>
        <td>${escapeHtml(item.Cost_Center_Name)}</td>
        <td>${escapeHtml(item.Tariff_Code)}</td>
        <td>${escapeHtml(item.Phase)}</td>
        <td class="numeric">${item.Capacity}</td>
        <td>${escapeHtml(item.Account_No)}</td>
        <td>${escapeHtml(item.Project_No)}</td>
        <td>${escapeHtml(getSolarType(item.Application_Sub_Type))}</td>
        <td>${escapeHtml(item.Bank_Code)}</td>
        <td>${escapeHtml(item.Branch_Code)}</td>
      </tr>`;
		});

		const fullHTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Solar Details Sent to billing</title>
<style>${tableStyle}
body { font-family: Arial, sans-serif; margin: 10mm; print-color-adjust: exact; }
h3 { text-align: center; color: #7A0000; font-size: 14px; font-weight: bold; margin: 0 0 8px 0; }
.subtitle { display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 2px; }
.subtitle-right { text-align: right;  }
.subtitle-left { text-align: left; margin-bottom: 2px; }
.subtitle-left-group { display: flex; flex-direction: column;}
@page { size: A3 landscape; margin: 12mm; }
@page {
  @bottom-left { content: "Printed on: ${new Date().toLocaleString()}"; font-size: 9px; color: #666; }
  @bottom-right { content: "Page " counter(page) " of " counter(pages); font-size: 9px; color: #666; }
}
</style>
</head>
<body>
<h3>Solar Details Sent to billing</h3>
<div class="subtitle">
  <div class="subtitle-left-group">
    <div class="subtitle-left">
      <strong>Company:</strong>
      ${escapeHtml(selectedCompany.compId)} /
      ${escapeHtml(selectedCompany.CompName)}
    </div>

    <div class="subtitle-left">
      <strong>Period:</strong> ${fromDate} to ${toDate}
    </div>
  </div>

  <div class="subtitle-right">
    <strong>Currency:</strong> LKR
  </div>
</div>

<table>
  <colgroup>${colGroupHTML}</colgroup>
  <thead>
    <tr>
      <th>Item</th>
      <th>Dept Id</th>
      <th>Application No</th>
      <th>Applicant Name</th>
      <th>Applicant Address</th>
      <th>NIC No</th>
      <th>Exported Date</th>
      <th>Bank Account No</th>
      <th>Cost Center Name</th>
      <th>Tariff</th>
      <th>Phase</th>
      <th>Capacity</th>
      <th>Ele. Account No</th>
      <th>Project / Job No</th>
      <th>Solar Type</th>
      <th>Bank Code</th>
      <th>Bank Branch</th>
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
				Solar Details Sent to billing
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
								`/misapi/api/incomeexpenditure/Usercompanies/${epfNo}/50`
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
					title="Solar Details Sent to billing"
					subtitlebold2="Company:"
					subtitlenormal2={`${selectedCompany?.compId} / ${selectedCompany?.CompName}`}
					subtitlebold3="Period:"
					subtitlenormal3={`${fromDate} to ${toDate}`}
					loading={reportLoading}
					hasData={reportData.length > 0}
					handleDownloadCSV={handleDownloadCSV}
					printPDF={printPDF}
					closeReport={closeReport}
				>
					{/* Children: the table only */}
					<table className="w-full text-xs">
						<thead className={`${maroonGrad} text-white`}>
							<tr>
								<th className="border border-gray-400 px-2 py-2 text-center whitespace-nowrap">
									Item
								</th>
								<th className="border border-gray-400 px-2 py-2 whitespace-nowrap">
									Dept Id
								</th>
								<th className="border border-gray-400 px-2 py-2  whitespace-nowrap">
									Application No
								</th>
								<th className="border border-gray-400 px-2 py-2 whitespace-nowrap">
									Applicant Name
								</th>
								<th className="border border-gray-400 px-2 py-2 whitespace-nowrap">
									Applicant Address
								</th>
								<th className="border border-gray-400 px-2 py-2 whitespace-nowrap">
									NIC No
								</th>
								<th className="border border-gray-400 px-2 py-2 whitespace-nowrap">
									Exported Date
								</th>
								<th className="border border-gray-400 px-2 py-2 whitespace-nowrap">
									Bank Account No
								</th>
								<th className="border border-gray-400 px-2 py-2 whitespace-nowrap">
									Cost Center Name
								</th>
								<th className="border border-gray-400 px-2 py-2 whitespace-nowrap">
									Tariff
								</th>
								<th className="border border-gray-400 px-2 py-2 whitespace-nowrap">
									Phase
								</th>
								<th className="border border-gray-400 px-2 py-2 text-right whitespace-nowrap">
									Capacity
								</th>
								<th className="border border-gray-400 px-2 py-2  whitespace-nowrap">
									Ele. Account No
								</th>
								<th className="border border-gray-400 px-2 py-2 whitespace-nowrap">
									Project / Job No
								</th>
								<th className="border border-gray-400 px-2 py-2 whitespace-nowrap">
									Solar Type
								</th>
								<th className="border border-gray-400 px-2 py-2 whitespace-nowrap">
									Bank Code
								</th>
								<th className="border border-gray-400 px-2 py-2 whitespace-nowrap">
									Bank Branch
								</th>
							</tr>
						</thead>
						<tbody>
							{reportData.map((item, idx) => (
								<tr
									key={idx}
									className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
								>
									<td className="border border-gray-300 px-2 py-2 text-center  whitespace-nowrap">
										{idx + 1}
									</td>
									<td className="border border-gray-300 px-2 py-2  whitespace-nowrap">
										{item.Dept_Id}
									</td>
									<td className="border border-gray-300 px-2 py-2  whitespace-nowrap">
										{item.Application_No}
									</td>
									<td className="border border-gray-300 px-2 py-2 whitespace-nowrap">
										{item.Name}
									</td>
									<td className="border border-gray-300 px-2 py-2 whitespace-normal break-words">
										{item.Address}
									</td>
									<td className="border border-gray-300 px-2 py-2  whitespace-nowrap">
										{item.Id_No}
									</td>
									<td className="border border-gray-300 px-2 py-2  whitespace-nowrap">
										{formatDate(item.Exported_Date)}
									</td>
									<td className="border border-gray-300 px-2 py-2  whitespace-nowrap">
										{item.Bank_Account_No}
									</td>
									<td className="border border-gray-300 px-2 py-2 whitespace-nowrap">
										{item.Cost_Center_Name}
									</td>
									<td className="border border-gray-300 px-2 py-2 whitespace-nowrap">
										{item.Tariff_Code}
									</td>
									<td className="border border-gray-300 px-2 py-2 whitespace-nowrap">
										{item.Phase}
									</td>
									<td className="border border-gray-300 px-2 py-2 text-right whitespace-nowrap">
										{item.Capacity}
									</td>
									<td className="border border-gray-300 px-2 py-2 whitespace-nowrap">
										{item.Account_No}
									</td>
									<td className="border border-gray-300 px-2 py-2 whitespace-nowrap">
										{item.Project_No}
									</td>
									<td className="border border-gray-300 px-2 py-2 whitespace-nowrap">
										{getSolarType(item.Application_Sub_Type)}
									</td>
									<td className="border border-gray-300 px-2 py-2 whitespace-nowrap">
										{item.Bank_Code}
									</td>
									<td className="border border-gray-300 px-2 py-2 whitespace-nowrap">
										{item.Branch_Code}
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

export default SolarBillingReport;
