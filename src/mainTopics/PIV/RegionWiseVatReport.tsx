// File: RegionWiseVatReport.tsx

import React, {useState, useRef, useCallback} from "react";
import {useUser} from "../../contexts/UserContext";
import {toast} from "react-toastify";
import DateRangePicker from "../../components/utils/DateRangePicker";
import ReusableCompanyList from "../../components/utils/ReusableCompanyList";
import ReportViewer from "../../components/utils/ReportViewer";

interface RegionWiseVatItem {
	Name: string | null;
	TitleCd: string | null;
	Description: string | null;
	PivType: string | null;
	VatNo: string | null;
	PivDate: string | null;
	PivNo: string | null;
	VatAmt: number | null;
	PivAmount: number | null;
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
	try {
		const date = new Date(dateStr);
		return date.toLocaleDateString("en-GB", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
		}); // DD/MM/YYYY
	} catch {
		return dateStr || "";
	}
};

const csvEscape = (val: any): string => {
	if (val == null) return '""';
	let str = String(val);
	str = str.replace(/\r\n|\n|\r/g, " ");
	return `"${str.replace(/"/g, '""')}"`;
};

const forceText = (val: string): string => {
	if (!val) return "";
	return "\t" + val;
};

const calculateNetValue = (
	pivAmount: number | null,
	vatAmount: number | null,
): number => {
	const piv = pivAmount ?? 0;
	const vat = vatAmount ?? 0;
	return piv - vat;
};

const formatNetValue = (
	pivAmount: number | null,
	vatAmount: number | null,
): string => {
	return formatNumber(calculateNetValue(pivAmount, vatAmount));
};

const RegionWiseVatReport: React.FC = () => {
	const {user} = useUser();
	const epfNo = user?.Userno || "";
	const iframeRef = useRef<HTMLIFrameElement>(null);

	const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
	const [fromDate, setFromDate] = useState<string>("");
	const [toDate, setToDate] = useState<string>("");
	const [reportData, setReportData] = useState<RegionWiseVatItem[]>([]);
	const [reportLoading, setReportLoading] = useState(false);
	const [showReport, setShowReport] = useState(false);

	const maroon = "text-[#7A0000]";
	const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";

	const columns = [
		"Serial No",
		"Invoice Date",
		"Tax Invoice No",
		"Purchaser's TIN",
		"Name of the Purchaser",
		"Description",
		"Value of supply",
		"VAT Amount",
		"PIV Type",
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
			// Format: yyyy/MM/dd as expected by backend API
			const apiFrom = fromDate.split("-").join("/");
			const apiTo = toDate.split("-").join("/");

			const url = `/misapi/api/region-wise-vat/report?fromDate=${apiFrom}&toDate=${apiTo}&compId=${company.compId.trim()}`;
			const res = await fetch(url);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);

			const data = await res.json();
			const items: RegionWiseVatItem[] = Array.isArray(data) ? data : [];

			// Sort by PIV No + Date (same as backend ORDER BY)
			items.sort((a, b) => {
				const pivA = a.PivNo || "";
				const pivB = b.PivNo || "";
				if (pivA !== pivB) return pivA.localeCompare(pivB);
				return (a.PivDate || "").localeCompare(b.PivDate || "");
			});

			setReportData(items);
			items.length === 0
				? toast.warn("No records found for selected period")
				: toast.success("Consolidated Output VAT Schedule loaded");
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
			"Consolidated Output VAT Schedule",
			`Company / Region: ${selectedCompany.compId}/${selectedCompany.CompName}`,
			`Period: ${fromDate} To ${toDate}`,
			"To:  Tax Unit",
			"Currency: LKR",
			"",
			columns.map(csvEscape).join(","),
		];

		reportData.forEach((item, index) => {
			const row = [
				index + 1,
				forceText(formatDate(item.PivDate)),
				forceText((item.PivNo || "").replace(/[.,]/g, "")),
				forceText((item.VatNo || "").replace(/[.,]/g, "")),
				(item.Name || "").replace(/[.,]/g, ""),
				(item.Description || "").replace(/[.,]/g, ""),
				calculateNetValue(item.PivAmount, item.VatAmt).toFixed(2),
				Number(item.VatAmt || 0).toFixed(2),
				(item.PivType || "").replace(/[.,]/g, ""),
			];
			csvRows.push(row.map(csvEscape).join(","));
		});

		csvRows.push("");
		csvRows.push(
			"Note : This report effective from after the VAT function implements in the cost center/Branch/Division.",
		);

		const csvContent = csvRows.join("\n");
		const blob = new Blob(["\uFEFF" + csvContent], {
			type: "text/csv;charset=utf-8;",
		});
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `Region_Wise_VAT_${selectedCompany.compId}_${fromDate}_to_${toDate}.csv`;
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
      table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 10px; }
      th, td { border: 1px solid #aaa; padding: 6px; word-wrap: break-word; vertical-align: top; }
      th {font-weight: bold; }
      .numeric { text-align: right !important; }
      .total-row { background-color: #bfdbfe !important; font-weight: bold; }
    `;

		const colWidths = [
			"90px", // Serial No
			"110px", // Invoice Date
			"110px", // Tax Invoice No
			"120px", // Purchaser's TIN
			"150px", // Name of the Purchaser
			"250px", // Description
			"110px", // Value of supply
			"110px", // VAT Amount
			"100px", // PIV Type
		];

		const colGroupHTML = `
      <colgroup>
        ${colWidths.map((w) => `<col style="width: ${w};" />`).join("")}
      </colgroup>
    `;

		let bodyHTML = "";
		reportData.forEach((item, idx) => {
			bodyHTML += `<tr class="${idx % 2 === 0 ? "bg-white" : "bg-gray-50"}">
        <td>${escapeHtml(`${idx + 1}`)}</td>
        <td>${formatDate(item.PivDate)}</td>
        <td>${escapeHtml(item.PivNo || "-")}</td>
        <td>${escapeHtml(item.VatNo || "-")}</td>
        <td>${escapeHtml(item.Name || "-")}</td>
        <td>${escapeHtml(item.Description || "-")}</td>
        <td class="numeric">${formatNetValue(item.PivAmount, item.VatAmt)}</td>
        <td class="numeric">${formatNumber(item.VatAmt)}</td>
        <td>${escapeHtml(item.PivType || "-")}</td>
      </tr>`;
		});

		const headerHTML = `
      <thead>
        <tr>
          <th>Serial No</th>
          <th>Invoice Date</th>
          <th>Tax Invoice No</th>
          <th>Purchaser's TIN</th>
          <th>Name of the Purchaser</th>
          <th>Description</th>
          <th>Value of supply</th>
          <th>VAT Amount</th>
          <th>PIV Type</th>
        </tr>
      </thead>`;

		const fullHTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Consolidated Output VAT Schedule</title>
<style>${tableStyle}
body { font-family: Arial, sans-serif; margin: 8mm; print-color-adjust: exact; }
h3 { text-align: center; color: #7A0000; font-size: 14px; font-weight: bold; margin: 4px 0 4px 0; }
.subtitles {display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 11px;}
.subtitle-left{ text-align: left; }
.subtitle-right{ text-align: right; }
.header-line { padding-bottom: 4px; margin-bottom: 4px; font-size: 11px; }
.italic{ font-style: italic; font-size: 10px; margin-top: 8px; }

@page {margin: 10mm; size:A4 landscape;}
@page { 
  @bottom-left { content: "Printed on: ${new Date().toLocaleString()}"; font-size: 9px;  }
  @bottom-right { content: "Page " counter(page) " of " counter(pages); font-size: 9px;  }
}
</style>
</head>
<body>
<div class="header-line">
My Ref No ....................................
</div>
<div class="header-line"><strong>To: </strong>Tax Unit</div>
<h3>Consolidated Output VAT Schedule</h3>
<div class="subtitles">
  <div class="subtitle-left">
    <div><strong>Company / Region :</strong> ${escapeHtml(selectedCompany.compId)} / ${escapeHtml(selectedCompany.CompName)}</div>
    <strong>Period :</strong> ${fromDate} to ${toDate}
  </div>
  <div class="subtitle-right">
    <strong>Currency:</strong> LKR
  </div>
</div>

<table>${colGroupHTML}${headerHTML}<tbody>${bodyHTML}</tbody></table>
<div class="italic">Note : This report effective from after the VAT function implements in the cost center/Branch/Division.
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
				Consolidated Output VAT Schedule
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
								`/misapi/api/incomeexpenditure/Usercompanies/${epfNo}/70`,
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
					nameColumnTitle="Company  Name"
					loadingMessage="Loading companies..."
					emptyMessage="No companies available for selection."
				/>
			</div>

			{showReport && (
				<ReportViewer
					title="Consolidated Output VAT Schedule"
					subtitlebold="Company / Region :"
					subtitlenormal={`${selectedCompany?.compId || ""} / ${selectedCompany?.CompName || ""}`}
					subtitlebold2="Period:"
					subtitlenormal2={`${fromDate} to ${toDate}`}
					subtitlebold3="To:"
					subtitlenormal3="Tax Unit"
					currency="Currency: LKR"
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
									<th className="px-3 py-2 text-center">Serial No</th>
									<th className="px-3 py-2">Invoice Date</th>
									<th className="px-3 py-2">Tax Invoice No</th>
									<th className="px-3 py-2">Purchaser's TIN</th>
									<th className="px-3 py-2">Name of the Purchaser</th>
									<th className="px-3 py-2 wrap-break-word whitespace-normal">
										Description
									</th>
									<th className="px-3 py-2 text-right">
										Value of supply
									</th>
									<th className="px-3 py-2 text-right">VAT Amount</th>
									<th className="px-3 py-2">PIV Type</th>
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
										<td className="px-3 py-2 text-center border border-gray-200">
											{index + 1}
										</td>
										<td className="px-3 py-2 border border-gray-200">
											{formatDate(item.PivDate)}
										</td>
										<td className="px-3 py-2 border border-gray-200">
											{item.PivNo || "-"}
										</td>
										<td className="px-3 py-2 border border-gray-200">
											{item.VatNo || "-"}
										</td>
										<td className="px-3 py-2 border border-gray-200 break-words max-w-[300px]">
											{item.Name || "-"}
										</td>
										<td
											className="px-3 py-2 border border-gray-200 break-words whitespace-normal max-w-[400px]"
											title={item.Description || "-"}
										>
											{item.Description || "-"}
										</td>
										<td className="px-3 py-2 text-right border border-gray-200">
											{formatNetValue(
												item.PivAmount,
												item.VatAmt,
											)}{" "}
										</td>
										<td className="px-3 py-2 text-right border border-gray-200">
											{formatNumber(item.VatAmt)}
										</td>
										<td className="px-3 py-2 border border-gray-200">
											{item.PivType || "-"}
										</td>
									</tr>
								))}
							</tbody>
						</table>

						{reportData.length > 0 && (
							<div className="mt-6 text-sm italic text-gray-700">
								Note : This report effective from after the VAT function
								implements in the cost center/Branch/Division.
							</div>
						)}
					</div>
				</ReportViewer>
			)}
		</div>
	);
};

export default RegionWiseVatReport;
