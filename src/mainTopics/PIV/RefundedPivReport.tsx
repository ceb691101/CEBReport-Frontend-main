//22. Refunded PIV Details (Refunded within selected period, specific cost center)
// File: RefundedPivReport.tsx

import React, {useState, useRef, useCallback} from "react";
import {useUser} from "../../contexts/UserContext";
import {toast} from "react-toastify";
import DateRangePicker from "../../components/utils/DateRangePicker";
import ReportViewer from "../../components/utils/ReportViewer";
import ReusableCompanyList from "../../components/utils/ReusableCompanyList";

interface RefundedPivItem {
	DeptId: string | null;
	TitleCd: string | null;
	PivDate: string | null;
	PaidDate: string | null;
	PivNo: string | null;
	Name: string | null;
	Address: string | null;
	Description: string | null;
	GrandTotal: number | null;
	RefundableAmount: number | null;
	RefundDate: string | null;
	AccountCode: string | null;
	CctName: string | null;
}

interface ListItem {
	id: string;
	name: string;
	originalDeptId: string;
	originalDeptName: string;
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
	let str = String(val).replace(/\r\n|\n|\r/g, " ");
	return `"${str.replace(/"/g, '""')}"`;
};

const forceText = (val: string | null | undefined): string => {
	if (!val) return "";
	return "\t" + val;
};

const RefundedPivReport: React.FC = () => {
	const {user} = useUser();
	const epfNo = user?.Userno || "";
	const iframeRef = useRef<HTMLIFrameElement>(null);

	const [selectedDept, setSelectedDept] = useState<{
		DeptId: string;
		DeptName: string;
	} | null>(null);
	const [fromDate, setFromDate] = useState<string>("");
	const [toDate, setToDate] = useState<string>("");
	const [reportData, setReportData] = useState<RefundedPivItem[]>([]);
	const [reportLoading, setReportLoading] = useState(false);
	const [showReport, setShowReport] = useState(false);

	const maroon = "text-[#7A0000]";
	const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";

	const handleViewReport = async (dept: {
		DeptId: string;
		DeptName: string;
	}) => {
		if (!fromDate || !toDate) {
			toast.error("Please select both From and To dates");
			return;
		}
		if (new Date(toDate) < new Date(fromDate)) {
			toast.error("To Date cannot be earlier than From Date");
			return;
		}

		setSelectedDept(dept);
		setReportLoading(true);
		setReportData([]);
		setShowReport(true);

		try {
			const apiFrom = fromDate.split("-").join("/");
			const apiTo = toDate.split("-").join("/");
			const url = `/misapi/api/refunded-piv/report?fromDate=${apiFrom}&toDate=${apiTo}&costctr=${dept.DeptId}`;

			const res = await fetch(url);
			if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

			const data = await res.json();
			const items: RefundedPivItem[] = Array.isArray(data) ? data : [];

			// Sort by dept → title → piv_no (as in SQL ORDER BY)
			items.sort((a, b) => {
				const dA = a.DeptId || "";
				const dB = b.DeptId || "";
				if (dA !== dB) return dA.localeCompare(dB);

				const tA = a.TitleCd || "";
				const tB = b.TitleCd || "";
				if (tA !== tB) return tA.localeCompare(tB);

				const pA = a.PivNo || "";
				const pB = b.PivNo || "";
				return pA.localeCompare(pB);
			});

			setReportData(items);

			items.length === 0
				? toast.warn(
						"No refunded PIV records found for selected period and cost centre",
					)
				: toast.success("Refunded PIV Details loaded");
		} catch (err: any) {
			toast.error("Failed to load report: " + err.message);
		} finally {
			setReportLoading(false);
		}
	};

	const closeReport = () => {
		setShowReport(false);
		setReportData([]);
		setSelectedDept(null);
	};

	const handleDownloadCSV = () => {
		if (reportData.length === 0 || !selectedDept) return;

		const csvRows: string[] = [
			`Refunded PIV Details - Refunded Date From ${fromDate} To ${toDate}`,
			`Cost Center : ${selectedDept.DeptId} / ${selectedDept.DeptName}`,
			"",
			[
				"PIV No",
				"PIV Paid date",
				"PIV Issued date",
				"Name",
				"Address",
				"Account Code",
				"Refunded Date",
				"PIV Paid Amount",
				"Refundable Amount",
			]
				.map(csvEscape)
				.join(","),
		];

		let grandTotalPaid = 0;
		let grandTotalRefundable = 0;

		reportData.forEach((item) => {
			csvRows.push(
				[
					forceText(item.PivNo || ""),
					formatDate(item.PaidDate),
					formatDate(item.PivDate),
					forceText(item.Name || ""),
					forceText(item.Address || ""),
					forceText(item.AccountCode || ""),
					formatDate(item.RefundDate),
					formatNumber(item.GrandTotal),
					formatNumber(item.RefundableAmount),
				]
					.map(csvEscape)
					.join(","),
			);

			if (item.GrandTotal != null) grandTotalPaid += item.GrandTotal;
			if (item.RefundableAmount != null)
				grandTotalRefundable += item.RefundableAmount;
		});

		const csvContent = csvRows.join("\n");
		const blob = new Blob(["\uFEFF" + csvContent], {
			type: "text/csv;charset=utf-8;",
		});
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `RefundedPIV_${selectedDept.DeptId}_${fromDate}_to_${toDate}.csv`;
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
		if (reportData.length === 0 || !iframeRef.current || !selectedDept)
			return;

		const tableStyle = `
      table { width: 100%; border-collapse: collapse; font-size: 10px; }
      th, td { border: 1px solid #aaa; padding: 5px 7px; vertical-align: middle; }
      th { font-weight: bold; }
      .numeric { text-align: right !important; }
      .text-right { text-align: right !important; }
      .grand-total-row { background-color: #BFDBFE !important; font-weight: bold; font-size: 11px; }
      @page {
        @bottom-left { content: "Printed on: ${new Date().toLocaleString("en-US", {timeZone: "Asia/Colombo"})}"; font-size: 9px; }
        @bottom-right { content: "Page " counter(page) " of " counter(pages); font-size: 9px; }
      }
      @media print {
        body, * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      }
    `;

		let bodyHTML = "";
		let grandTotalPaid = 0;
		let grandTotalRefundable = 0;

		reportData.forEach((item, idx) => {
			bodyHTML += `
        <tr class="${idx % 2 === 0 ? "alternate-even" : "alternate-odd"}">
          <td>${escapeHtml(item.PivNo || "-")}</td>
          <td>${formatDate(item.PaidDate)}</td>
          <td>${formatDate(item.PivDate)}</td>
          <td>${escapeHtml(item.Name || "-")}</td>
          <td>${escapeHtml(item.Address || "-")}</td>
          <td>${escapeHtml(item.AccountCode || "-")}</td>
          <td>${formatDate(item.RefundDate)}</td>
          <td class="numeric">${formatNumber(item.GrandTotal)}</td>
          <td class="numeric">${formatNumber(item.RefundableAmount)}</td>
        </tr>
      `;

			if (item.GrandTotal != null) grandTotalPaid += item.GrandTotal;
			if (item.RefundableAmount != null)
				grandTotalRefundable += item.RefundableAmount;
		});

		const fullHTML = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Refunded PIV Details</title>
<style>
  ${tableStyle}
  body { font-family: Arial, Helvetica, sans-serif; margin: 12mm; font-size: 10px; line-height: 1.3; }
  h3 { text-align: center; color: #7A0000; margin: 0 0 12px 0; font-size: 15px; }
  .subtitles { margin-bottom: 16px; font-size: 11px; }
  @page { margin: 10mm; }
</style>
</head>
<body>
<h3>Refunded PIV Details - Refunded Date From ${fromDate} To ${toDate}</h3>

<div class="subtitles">
  <strong>Cost Center:</strong> ${selectedDept.DeptId} / ${escapeHtml(selectedDept.DeptName)}
</div>

<table>
  <colgroup>
    <col style="width:100px" />
    <col style="width:90px" />
    <col style="width:90px" />
    <col style="width:140px" />
    <col style="width:180px" />
    <col style="width:90px" />
    <col style="width:90px" />
    <col style="width:100px" />
    <col style="width:100px" />
  </colgroup>
  <thead>
    <tr class="${maroonGrad} text-white">
      <th>PIV No</th>
      <th>PIV Paid date</th>
      <th>PIV Issued date</th>
      <th>Name</th>
      <th>Address</th>
      <th>Account Code</th>
      <th>Refunded Date</th>
      <th class="numeric">PIV Paid Amount</th>
      <th class="numeric">Refundable Amount</th>
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

		setTimeout(() => {
			iframeRef.current?.contentWindow?.print();
		}, 800);
	};

	return (
		<div className="max-w-7xl mx-auto p-6 bg-white rounded-xl shadow border border-gray-200 text-sm">
			<iframe ref={iframeRef} style={{display: "none"}} />

			<h2 className={`text-xl font-bold mb-4 ${maroon}`}>
				Refunded PIV Details
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
				<ReusableCompanyList<ListItem>
					fetchItems={useCallback(async () => {
						if (!epfNo) {
							toast.error("No EPF number available.");
							return [];
						}
						try {
							const res = await fetch(
								`/misapi/api/incomeexpenditure/departments/${epfNo}`,
								{
									method: "GET",
									headers: {
										"Content-Type": "application/json",
										Accept: "application/json",
									},
								},
							);
							if (!res.ok) throw new Error(`HTTP ${res.status}`);

							const parsed = await res.json();
							let rawData = Array.isArray(parsed)
								? parsed
								: parsed.data ||
									parsed.result ||
									parsed.departments ||
									[];

							return rawData.map((item: any) => ({
								id: item.DeptId?.toString() || "",
								name: item.DeptName?.toString().trim() || "",
								originalDeptId: item.DeptId?.toString() || "",
								originalDeptName:
									item.DeptName?.toString().trim() || "",
							}));
						} catch (e: any) {
							toast.error("Failed to load departments: " + e.message);
							return [];
						}
					}, [epfNo])}
					onViewItem={(item: ListItem) => {
						handleViewReport({
							DeptId: item.originalDeptId,
							DeptName: item.originalDeptName,
						});
					}}
					idColumnTitle="Dept Code"
					nameColumnTitle="Dept Name"
					loadingMessage="Loading departments..."
					emptyMessage="No departments available."
				/>
			</div>

			{showReport && (
				<ReportViewer
					title={`Refunded PIV Details - Refunded Date From ${fromDate} To ${toDate}`}
					subtitlebold="Cost Center :"
					subtitlenormal={`${selectedDept?.DeptId || ""} / ${selectedDept?.DeptName || ""}`}
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
									<th className="px-3 py-2">PIV No</th>
									<th className="px-3 py-2">PIV Paid date</th>
									<th className="px-3 py-2">PIV Issued date</th>
									<th className="px-3 py-2">Name</th>
									<th className="px-3 py-2">Address</th>
									<th className="px-3 py-2">Account Code</th>
									<th className="px-3 py-2">Refunded Date</th>
									<th className="px-3 py-2 text-right">
										PIV Paid Amount
									</th>
									<th className="px-3 py-2 text-right">
										Refundable Amount
									</th>
								</tr>
							</thead>
							<tbody>
								{reportData.map((item, idx) => (
									<tr
										key={idx}
										className={
											idx % 2 === 0 ? "bg-white" : "bg-gray-50"
										}
									>
										<td className="px-3 py-1 border border-gray-200">
											{item.PivNo || "-"}
										</td>
										<td className="px-3 py-1 border border-gray-200">
											{formatDate(item.PaidDate)}
										</td>
										<td className="px-3 py-1 border border-gray-200">
											{formatDate(item.PivDate)}
										</td>
										<td className="px-3 py-1 border border-gray-200">
											{item.Name || "-"}
										</td>
										<td className="px-3 py-1 border border-gray-200">
											{item.Address || "-"}
										</td>
										<td className="px-3 py-1 border border-gray-200">
											{item.AccountCode || "-"}
										</td>
										<td className="px-3 py-1 border border-gray-200">
											{formatDate(item.RefundDate)}
										</td>
										<td className="px-3 py-1 text-right border border-gray-200">
											{formatNumber(item.GrandTotal)}
										</td>
										<td className="px-3 py-1 text-right border border-gray-200">
											{formatNumber(item.RefundableAmount)}
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

export default RefundedPivReport;
