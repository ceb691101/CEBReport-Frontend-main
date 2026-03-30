// Area Wise SRP Application PIV (PIVI) To be Paid Report
// File: AreaWiseSRPApplicationPIV.tsx

import React, {useState, useRef, useCallback} from "react";
import {useUser} from "../../contexts/UserContext";
import {toast} from "react-toastify";
import DateRangePicker from "../../components/utils/DateRangePicker";
import ReusableCompanyList from "../../components/utils/ReusableCompanyList";
import ReportViewer from "../../components/utils/ReportViewer";

interface SRPApplicationPIVItem {
	Dept_Id: string;
	Id_No: string;
	Application_No: string;
	Name: string;
	Address: string;
	Submit_Date: Date | null;
	Description: string;
	Piv_No: string;
	Paid_Date: Date | null;
	Piv_Amount: number;
	Tariff_Code: string;
	Phase: string;
	Existing_Acc_No: string;
	Area: string;
	Province: string;
	Cct_Name: string;
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

const formatAmount = (amount: number | null | undefined): string => {
	if (amount == null) return "";
	return amount.toLocaleString("en-US", {
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

const AreaWiseSRPApplicationPIV: React.FC = () => {
	const {user} = useUser();
	const epfNo = user?.Userno || "";
	const iframeRef = useRef<HTMLIFrameElement>(null);

	const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
	const [fromDate, setFromDate] = useState("");
	const [toDate, setToDate] = useState("");
	const [reportData, setReportData] = useState<SRPApplicationPIVItem[]>([]);
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
			const url = `/srpapi/api/areawisesrpapplicationpiv/get?compId=${company.compId.trim()}&fromDate=${fromDate.replace(
				/-/g,
				""
			)}&toDate=${toDate.replace(/-/g, "")}`;
			const res = await fetch(url);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = await res.json();
			const items: SRPApplicationPIVItem[] = Array.isArray(data)
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
			"Dept ID",
			"ID No",
			"Application No",
			"Name",
			"Address",
			"Submit Date",
			"Description",
			"PIV No",
			"Paid Date",
			"PIV Amount",
			"Tariff Code",
			"Phase",
			"Existing Account No",
			"Area",
			"Province",
			"Cost Center",
		];

		const csvRows: string[] = [
			`Area wise SRP Application fee (PIV I) to be paid  Details PIV I Generated date From ${fromDate}  To ${toDate}`,
			`AREA : ${selectedCompany.compId} / ${selectedCompany.CompName}`,
			"",
			headers.map(csvEscape).join(","),
		];

		reportData.forEach((item, index) => {
			const row = [
				index + 1,
				`="${item.Dept_Id ?? ""}"`,
				`="${item.Id_No ?? ""}"`,
				`="${item.Application_No ?? ""}"`,
				item.Name || "",
				item.Address || "",
				formatDate(item.Submit_Date),
				item.Description || "",
				`="${item.Piv_No ?? ""}"`,
				formatDate(item.Paid_Date),
				item.Piv_Amount ?? "",
				item.Tariff_Code || "",
				item.Phase || "",
				`="${item.Existing_Acc_No ?? ""}"`,
				item.Area || "",
				item.Province || "",
				item.Cct_Name || "",
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
		link.download = `SRP_Application_PIV_${selectedCompany.compId}_${fromDate}_to_${toDate}.csv`;
		link.click();
		URL.revokeObjectURL(url);
	};

	const printPDF = () => {
		if (reportData.length === 0 || !iframeRef.current || !selectedCompany)
			return;

		const tableStyle = `
      table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 10px; }
      thead { display: table-header-group; }
      th, td { border: 1px solid #aaa; padding: 6px; word-wrap: break-word; vertical-align: top; text-align: left; }
      th { font-weight: bold; }
      .numeric { text-align: right; }
      .center { text-align: center; }
      .nowrap { white-space: nowrap; }
    `;

		const colWidths = [
			"40px",  // Item
			"70px",  // Dept Id
			"80px",  // ID No
			"110px", // Application No
			"140px", // Name
			"140px", // Address
			"80px",  // Submit Date
			"100px", // Description
			"130px", // PIV No
			"80px",  // Paid Date
			"90px",  // PIV Amount
			"60px",  // Tariff Code
			"50px",  // Phase
			"100px", // Existing Acc No
			"80px",  // Area
			"80px",  // Province
			"120px", // Cost Center
		];

		const colGroupHTML = colWidths.map((w) => `<col style="width: ${w};" />`).join("");

		let bodyHTML = "";
		reportData.forEach((item, idx) => {
			bodyHTML += `<tr>
        <td class="center">${idx + 1}</td>
        <td class="center">${escapeHtml(item.Dept_Id)}</td>
        <td>${escapeHtml(item.Id_No)}</td>
        <td>${escapeHtml(item.Application_No)}</td>
        <td>${escapeHtml(item.Name)}</td>
        <td>${escapeHtml(item.Address)}</td>
        <td>${formatDate(item.Submit_Date)}</td>
        <td>${escapeHtml(item.Description)}</td>
        <td class="nowrap">${escapeHtml(item.Piv_No)}</td>
        <td>${formatDate(item.Paid_Date)}</td>
        <td class="numeric">${formatAmount(item.Piv_Amount)}</td>
        <td class="center">${escapeHtml(item.Tariff_Code)}</td>
        <td class="center">${escapeHtml(item.Phase)}</td>
        <td>${escapeHtml(item.Existing_Acc_No)}</td>
        <td>${escapeHtml(item.Area)}</td>
        <td>${escapeHtml(item.Province)}</td>
        <td>${escapeHtml(item.Cct_Name)}</td>
      </tr>`;
		});

		const fullHTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Area Wise SRP Application PIV (PIVI) To be Paid Report</title>
<style>${tableStyle}
body { font-family: Arial, sans-serif; margin: 10mm; print-color-adjust: exact; }
h3 { text-align: center; color: #7A0000; font-size: 14px; font-weight: bold; margin: 0 0 4px 0; }
.header-cell { border: none !important; padding: 0 0 6px 0 !important; }
.subtitle { display: flex; justify-content: space-between; align-items: center; font-size: 10px; margin-bottom: 2px; }
.subtitle-left { text-align: left; }
@page { size: A3 landscape; margin: 12mm; }
@page {
  @bottom-left { content: "Printed on: ${new Date().toLocaleString()}"; font-size: 9px; color: #666; }
  @bottom-right { content: "Page " counter(page) " of " counter(pages); font-size: 9px; color: #666; }
}
</style>
</head>
<body>
<table>
  <colgroup>${colGroupHTML}</colgroup>
  <thead>
    <tr><td colspan="17" class="header-cell">
      <h3>Area wise SRP Application fee (PIV I) to be paid &nbsp;&nbsp;Details PIV I Generated date &nbsp;From ${fromDate} &nbsp;&nbsp;To ${toDate}</h3>
      <div class="subtitle">
        <div class="subtitle-left"><strong>AREA :</strong> ${escapeHtml(selectedCompany.compId)} / ${escapeHtml(selectedCompany.CompName)}</div>
      </div>
    </td></tr>
    <tr>
      <th class="center">Item</th>
      <th class="center">Dept ID</th>
      <th>ID No</th>
      <th>Application No</th>
      <th>Name</th>
      <th>Address</th>
      <th>Submit Date</th>
      <th>Description</th>
      <th>PIV No</th>
      <th>Paid Date</th>
      <th class="numeric">PIV Amount</th>
      <th class="center">Tariff Code</th>
      <th class="center">Phase</th>
      <th>Existing Acc No</th>
      <th>Area</th>
      <th>Province</th>
      <th>Cost Center</th>
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
				Area Wise SRP Application PIV (PIVI) To be Paid Report
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
							const raw = Array.isArray(parsed) ? parsed : parsed.data || [];
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
					title="Area Wise SRP Application PIV (PIVI) To be Paid Report"
					currency=""
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
					<table className="w-full text-xs">
						<thead className={`${maroonGrad} text-white`}>
							<tr>
								<th className="border border-gray-400 px-2 py-2 text-center whitespace-nowrap">Item</th>
								<th className="border border-gray-400 px-2 py-2 whitespace-nowrap">Dept ID</th>
								<th className="border border-gray-400 px-2 py-2 whitespace-nowrap">ID No</th>
								<th className="border border-gray-400 px-2 py-2 whitespace-nowrap">Application No</th>
								<th className="border border-gray-400 px-2 py-2 whitespace-nowrap">Name</th>
								<th className="border border-gray-400 px-2 py-2 whitespace-nowrap">Address</th>
								<th className="border border-gray-400 px-2 py-2 whitespace-nowrap">Submit Date</th>
								<th className="border border-gray-400 px-2 py-2 whitespace-nowrap">Description</th>
								<th className="border border-gray-400 px-2 py-2 whitespace-nowrap">PIV No</th>
								<th className="border border-gray-400 px-2 py-2 whitespace-nowrap">Paid Date</th>
								<th className="border border-gray-400 px-2 py-2 text-right whitespace-nowrap">PIV Amount</th>
								<th className="border border-gray-400 px-2 py-2 whitespace-nowrap">Tariff Code</th>
								<th className="border border-gray-400 px-2 py-2 whitespace-nowrap">Phase</th>
								<th className="border border-gray-400 px-2 py-2 whitespace-nowrap">Existing Acc No</th>
								<th className="border border-gray-400 px-2 py-2 whitespace-nowrap">Area</th>
								<th className="border border-gray-400 px-2 py-2 whitespace-nowrap">Province</th>
								<th className="border border-gray-400 px-2 py-2 whitespace-nowrap">Cost Center</th>
							</tr>
						</thead>
						<tbody>
							{reportData.map((item, idx) => (
								<tr
									key={idx}
									className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
								>
									<td className="border border-gray-300 px-2 py-2 text-center whitespace-nowrap">{idx + 1}</td>
									<td className="border border-gray-300 px-2 py-2 whitespace-nowrap">{item.Dept_Id}</td>
									<td className="border border-gray-300 px-2 py-2 whitespace-nowrap">{item.Id_No}</td>
									<td className="border border-gray-300 px-2 py-2 whitespace-nowrap">{item.Application_No}</td>
									<td className="border border-gray-300 px-2 py-2 whitespace-normal">{item.Name}</td>
									<td className="border border-gray-300 px-2 py-2 whitespace-normal">{item.Address}</td>
									<td className="border border-gray-300 px-2 py-2 whitespace-nowrap">{formatDate(item.Submit_Date)}</td>
									<td className="border border-gray-300 px-2 py-2 whitespace-normal">{item.Description}</td>
									<td className="border border-gray-300 px-2 py-2 whitespace-nowrap">{item.Piv_No}</td>
									<td className="border border-gray-300 px-2 py-2 whitespace-nowrap">{formatDate(item.Paid_Date)}</td>
									<td className="border border-gray-300 px-2 py-2 text-right whitespace-nowrap">{formatAmount(item.Piv_Amount)}</td>
									<td className="border border-gray-300 px-2 py-2 whitespace-nowrap">{item.Tariff_Code}</td>
									<td className="border border-gray-300 px-2 py-2 whitespace-nowrap">{item.Phase}</td>
									<td className="border border-gray-300 px-2 py-2 whitespace-nowrap">{item.Existing_Acc_No}</td>
									<td className="border border-gray-300 px-2 py-2 whitespace-nowrap">{item.Area}</td>
									<td className="border border-gray-300 px-2 py-2 whitespace-nowrap">{item.Province}</td>
									<td className="border border-gray-300 px-2 py-2 whitespace-nowrap">{item.Cct_Name}</td>
								</tr>
							))}
						</tbody>
					</table>
				</ReportViewer>
			)}
		</div>
	);
};

export default AreaWiseSRPApplicationPIV;
