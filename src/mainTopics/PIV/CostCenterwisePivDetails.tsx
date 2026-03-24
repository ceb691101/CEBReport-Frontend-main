// File: CostCenterwisePivDetails.tsx
import React, {useState, useRef, useCallback} from "react";
import {toast} from "react-toastify";
import {useUser} from "../../contexts/UserContext";
import DateRangePicker from "../../components/utils/DateRangePicker";
import ReportViewer from "../../components/utils/ReportViewer";
import ReusableCompanyList from "../../components/utils/ReusableCompanyList";

interface CostCenterPivItem {
	DeptId: string | null;
	PivNo: string | null;
	PivDate: string | null;
	PaidDate: string | null;
	PaymentMode: string | null;
	PivAmount: number | null;
	Status: string | null;
	CctName: string | null;
	CctName1: string | null;
}

interface ListItem {
	id: string;
	name: string;
	originalDeptId: string;
	originalDeptName: string;
}

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

const formatNumber = (num: number | null | undefined): string => {
	if (num == null || isNaN(num)) return "0.00";
	return new Intl.NumberFormat("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(num);
};

const csvEscape = (val: any): string => {
	if (val == null) return '""';
	const str = String(val)
		.replace(/\r\n|\n|\r/g, " ")
		.trim();
	return `"${str.replace(/"/g, '""')}"`;
};

const CostCenterwisePivDetails: React.FC = () => {
	const {user} = useUser();
	const epfNo = user?.Userno || "";

	const iframeRef = useRef<HTMLIFrameElement>(null);

	const [selectedDept, setSelectedDept] = useState<{
		DeptId: string;
		DeptName: string;
	} | null>(null);

	const [fromDate, setFromDate] = useState("");
	const [toDate, setToDate] = useState("");
	const [reportData, setReportData] = useState<CostCenterPivItem[]>([]);
	const [loading, setLoading] = useState(false);
	const [showReport, setShowReport] = useState(false);

	const maroon = "text-[#7A0000]";
	const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";

	const loadReport = async (dept: {DeptId: string; DeptName: string}) => {
		if (!fromDate || !toDate) {
			toast.error("Please select both From and To dates");
			return;
		}
		if (new Date(toDate) < new Date(fromDate)) {
			toast.error("To Date cannot be earlier than From Date");
			return;
		}

		setSelectedDept(dept);
		setLoading(true);
		setReportData([]);
		setShowReport(true);

		try {
			const apiFrom = fromDate.split("-").join("/");
			const apiTo = toDate.split("-").join("/");

			const url = `/misapi/api/costcenter-piv/report?costctr=${encodeURIComponent(
				dept.DeptId.trim(),
			)}&fromDate=${apiFrom}&toDate=${apiTo}`;

			const res = await fetch(url);
			if (!res.ok) throw new Error(`HTTP error ${res.status}`);

			const data = await res.json();
			const items: CostCenterPivItem[] = Array.isArray(data)
				? data
				: data.data || [];

			setReportData(items);

			items.length === 0
				? toast.warn("No records found for selected period")
				: toast.success(`Loaded ${items.length} record(s)`);
		} catch (err: any) {
			toast.error(
				"Failed to load report: " + (err.message || "Unknown error"),
			);
		} finally {
			setLoading(false);
		}
	};

	const closeReport = () => {
		setShowReport(false);
		setReportData([]);
		// setSelectedDept(null);  ← optional: keep selected or reset
	};


	const handleDownloadCSV = () => {
		if (reportData.length === 0 || !selectedDept) return;

		const csvRows = [
			"Cost Center wise PIV Details Report",
			`Cost Center: ${selectedDept.DeptId} / ${selectedDept.DeptName}`,
			`Period: From ${fromDate} To ${toDate}`,
			"Currency: LKR",
			"",
			[
				"PIV No",
				"PIV Issued Date",
				"PIV Paid Date",
				"PIV Amount",
				"Status",
				"Payment Mode",
			]
				.map(csvEscape)
				.join(","),
			...reportData.map((row) =>
				[
					csvEscape(row.PivNo || ""),
					csvEscape(formatDate(row.PivDate)),
					csvEscape(formatDate(row.PaidDate)),
					csvEscape(formatNumber(row.PivAmount)),
					csvEscape(row.Status || "-"),
					csvEscape(row.PaymentMode || "-"),
				].join(","),
			),
		];

		const csvContent = csvRows.join("\n");
		const blob = new Blob(["\uFEFF" + csvContent], {
			type: "text/csv;charset=utf-8;",
		});
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `CostCenter_PIV_${selectedDept.DeptId}_${fromDate}_to_${toDate}.csv`;
		link.click();
		URL.revokeObjectURL(url);
	};

	const printPDF = () => {
		if (reportData.length === 0 || !iframeRef.current || !selectedDept)
			return;

		const printDate = new Date().toLocaleString("en-US", {
			timeZone: "Asia/Colombo",
		});

		const tableStyle = `
      table { width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 10px; }
      th, td { border: 1px solid #888; padding: 6px; text-align: left; font-family: Arial, sans-serif; font-size: 10px; }
      th { font-weight: bold; }
      .numeric { text-align: right !important; }
      .title { color: #7A0000; font-size: 18px; font-weight: bold; text-align: center; margin-bottom: 15px;  font-family: Arial, sans-serif; font-size: 10px;}
      .subtitle { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px; font-family: Arial, sans-serif; font-size: 10px; }
      .left { text-align: left; }
      .right { text-align: right; }
      @page { margin: 12mm; }
      @page { 
        @bottom-left { content: "Printed on: ${printDate}"; font-size: 9px; }
        @bottom-right { content: "Page " counter(page) " of " counter(pages); font-size: 9px; }
      }
    `;

		const bodyHTML = reportData
			.map(
				(row) => `
      <tr>
        <td>${row.PivNo || "-"}</td>
        <td>${formatDate(row.PivDate) || "-"}</td>
        <td>${formatDate(row.PaidDate) || "-"}</td>
        <td class="numeric">${formatNumber(row.PivAmount)}</td>
        <td>${row.Status || "-"}</td>
        <td>${row.PaymentMode || "-"}</td>
      </tr>`,
			)
			.join("");

		const fullHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Cost Center wise PIV Details</title>
  <style>${tableStyle}</style>
</head>
<body>
  <div class="title">Cost Center wise PIV Details Report</div>
  
  <div class="subtitle">
    <div class="left">
      <strong>Cost Center:</strong> ${selectedDept.DeptId} / ${selectedDept.DeptName}
    </div>
    <div class="right">
      Currency: LKR
    </div>
  </div>

  <div class="subtitle">
    <div class="left">
      <strong>Period:</strong> ${fromDate} to ${toDate}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>PIV No</th>
        <th>PIV Issued Date</th>
        <th>PIV Paid Date</th>
        <th class="numeric">PIV Amount</th>
        <th>Status</th>
        <th>Payment Mode</th>
      </tr>
    </thead>
    <tbody>${bodyHTML}</tbody>
  </table>
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

			<h2 className={`text-xl font-bold mb-5 ${maroon}`}>
				Cost Center wise PIV Details
			</h2>

			<div className="flex flex-wrap justify-end items-end gap-6 mb-6">
				<div className="flex-1 min-w-[320px]">
					<div className="flex justify-end mb-4">
						<DateRangePicker
							fromDate={fromDate}
							toDate={toDate}
							onFromChange={setFromDate}
							onToChange={setToDate}
						/>
					</div>
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
							loadReport({
								DeptId: item.originalDeptId,
								DeptName: item.originalDeptName,
							});
						}}
						idColumnTitle="Dept ID"
						nameColumnTitle="Dept Name"
						actionButtonText="View"
						loadingMessage="Loading cost centers..."
						emptyMessage="No cost centers available."
						pageSize={12}
					/>
				</div>
			</div>

			{showReport && (
				<ReportViewer
					title="Cost Center wise PIV Details"
					subtitlebold2="Cost Center :"
					subtitlenormal2={`${selectedDept?.DeptId || ""} / ${selectedDept?.DeptName || ""}`}
					subtitlebold3="Period :"
					subtitlenormal3={`${fromDate} To ${toDate}`}
					loading={loading}
					hasData={reportData.length > 0}
					handleDownloadCSV={handleDownloadCSV}
					printPDF={printPDF}
					closeReport={closeReport}
				>
					<div className="overflow-x-auto">
						<table className="w-full text-xs border-collapse min-w-max">
							<thead className={`${maroonGrad} text-white`}>
								<tr>
									<th className="px-4 py-2">PIV No</th>
									<th className="px-4 py-2">PIV Issued Date</th>
									<th className="px-4 py-2">PIV Paid Date</th>
									<th className="px-4 py-2 text-right">PIV Amount</th>
									<th className="px-4 py-2">Status</th>
									<th className="px-4 py-2">Payment Mode</th>
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
										<td className="px-4 py-2 border border-gray-200 font-mono">
											{row.PivNo || "-"}
										</td>
										<td className="px-4 py-2 border border-gray-200">
											{formatDate(row.PivDate)}
										</td>
										<td className="px-4 py-2 border border-gray-200">
											{formatDate(row.PaidDate)}
										</td>
										<td className="px-4 py-2 text-right border border-gray-200 font-medium">
											{formatNumber(row.PivAmount)}
										</td>
										<td className="px-4 py-2 border border-gray-200">
											{row.Status || "-"}
										</td>
										<td className="px-4 py-2 border border-gray-200">
											{row.PaymentMode || "-"}
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

export default CostCenterwisePivDetails;
