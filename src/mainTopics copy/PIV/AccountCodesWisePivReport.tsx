//20. PIV Details (Issued and Paid Cost Centers AFMHQ Only)
// File: AccountCodesWisePivReport.tsx
import React, {useState, useRef, useCallback, JSX} from "react";
import {useUser} from "../../contexts/UserContext";
import {toast} from "react-toastify";
import DateRangePicker from "../../components/utils/DateRangePicker";
import ReportViewer from "../../components/utils/ReportViewer";
import ReusableCompanyList from "../../components/utils/ReusableCompanyList";

interface PivItem {
	DeptId: string | null;
	PivNo: string | null;
	PivReceiptNo: string | null;
	PivDate: string | null;
	PaidDate: string | null;
	AccountCode: string | null;
	Amount: number | null;
	CctName: string | null;
	CctName1: string | null;
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

const AccountCodesWisePivReport: React.FC = () => {
	const {user} = useUser();
	const epfNo = user?.Userno || "";
	const iframeRef = useRef<HTMLIFrameElement>(null);

	const [selectedDept, setSelectedDept] = useState<{
		DeptId: string;
		DeptName: string;
	} | null>(null);
	const [fromDate, setFromDate] = useState<string>("");
	const [toDate, setToDate] = useState<string>("");
	const [reportData, setReportData] = useState<PivItem[]>([]);
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
			const url = `/misapi/api/account-codes-wise-piv/report?fromDate=${apiFrom}&toDate=${apiTo}&costctr=${dept.DeptId.trim()}`;

			const res = await fetch(url);
			if (!res.ok) throw new Error(`HTTP error ${res.status}`);

			const data = await res.json();
			const items: PivItem[] = Array.isArray(data) ? data : [];

			// Sort: by DeptId → AccountCode → PivNo
			items.sort((a, b) => {
				const dA = a.DeptId || "";
				const dB = b.DeptId || "";
				if (dA !== dB) return dA.localeCompare(dB);

				const accA = a.AccountCode || "";
				const accB = b.AccountCode || "";
				if (accA !== accB) return accA.localeCompare(accB);

				const pivA = a.PivNo || "";
				const pivB = b.PivNo || "";
				return pivA.localeCompare(pivB);
			});

			setReportData(items);

			items.length === 0
				? toast.warn("No records found for selected period and cost centre")
				: toast.success("Account Codes wise PIV Details loaded");
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
		"Account Codes wise PIV Details",
		"Issued Company: AFMHQ",
		`Cost Center : ${selectedDept.DeptId} / ${selectedDept.DeptName}`,
		`Paid Date From ${fromDate} To ${toDate}`,
		`Currency : LKR`,
		"",
		[
			"Issued Cost Center",
			"PIV No",
			"PIV date",
			"Account Code",
			"Paid Date",
			"Amount",
		]
			.map(csvEscape)
			.join(","),
	];

	let accTotal = 0;
	let grandTotal = 0;

	reportData.forEach((item, index) => {
		const currDept = item.CctName || item.DeptId || "";
		const currAcc = item.AccountCode || "";
		const isLast = index === reportData.length - 1;
		const nextAcc = isLast ? "" : reportData[index + 1]?.AccountCode || "";

		// Changed line: always show the full value — no more empty string when same as previous
		const deptDisplay = `${item.DeptId || ""} - ${currDept}`;

		csvRows.push(
			[
				forceText(deptDisplay), // ← now repeats every row
				forceText(item.PivNo || ""),
				formatDate(item.PivDate),
				forceText(item.AccountCode || ""),
				formatDate(item.PaidDate),
				formatNumber(item.Amount),
			]
				.map(csvEscape)
				.join(","),
		);

		if (item.Amount != null) {
			accTotal += item.Amount;
			grandTotal += item.Amount;
		}

		if (currAcc !== nextAcc || isLast) {
			csvRows.push(
				[
					`Total for Account Code ${currAcc}`,
					"",
					"",
					"",
					"",
					formatNumber(accTotal),
				]
					.map(csvEscape)
					.join(","),
			);
			csvRows.push(""); // empty line between account codes
			accTotal = 0;
		}

	});

	csvRows.push(
		["Total of all account codes", "", "", "", "", formatNumber(grandTotal)]
			.map(csvEscape)
			.join(","),
	);

	const csvContent = csvRows.join("\n");
	const blob = new Blob(["\uFEFF" + csvContent], {
		type: "text/csv;charset=utf-8;",
	});
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = `AccountCodesWisePIV_${selectedDept.DeptId}_${fromDate}_to_${toDate}.csv`;
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
      .subtotal-row { background-color: #f5f5f5 !important; font-weight: bold; }
      .grand-total-row { background-color: #e0e0e0 !important; font-weight: bold; font-size: 11px; }
      @page{
      @bottom-left { content: "Printed on: ${new Date().toLocaleString("en-US", {timeZone: "Asia/Colombo"})}"; font-size: 9px; }
        @bottom-right { content: "Page " counter(page) " of " counter(pages); font-size: 9px; }
}
      @media print {
        body, * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      }
    `;

		let bodyHTML = "";
		let prevDept = "";
		let accTotal = 0;
		let grandTotal = 0;

		reportData.forEach((item, idx) => {
			const currDept = item.CctName || item.DeptId || "-";
			const currDeptDisplay = `${item.DeptId || "-"} - ${currDept}`;
			const currAcc = item.AccountCode || "-";
			const isLast = idx === reportData.length - 1;
			const nextAcc = isLast ? "" : reportData[idx + 1]?.AccountCode || "";

			bodyHTML += `
        <tr class="${idx % 2 === 0 ? "alternate-even" : "alternate-odd"}">
          <td>${prevDept === currDept ? "" : escapeHtml(currDeptDisplay)}</td>
          <td>${escapeHtml(item.PivNo || "-")}</td>
          <td>${formatDate(item.PivDate)}</td>
          <td>${escapeHtml(item.AccountCode || "-")}</td>
          <td>${formatDate(item.PaidDate)}</td>
          <td class="numeric">${formatNumber(item.Amount)}</td>
        </tr>
      `;

			if (item.Amount != null) {
				accTotal += item.Amount;
				grandTotal += item.Amount;
			}

			if (currAcc !== nextAcc || isLast) {
				bodyHTML += `
          <tr class="subtotal-row">
          
            <td colspan="5" class="text-right">Total for Account Code ${currAcc}</td>
            <td class="numeric">${formatNumber(accTotal)}</td>
          </tr>
        `;
				accTotal = 0;
			}

			prevDept = currDept;
		});

		bodyHTML += `
      <tr class="grand-total-row">
        <td colspan="5" class="text-right">Total of all account codes</td>
        <td class="numeric">${formatNumber(grandTotal)}</td>
      </tr>
    `;

		const fullHTML = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Account Codes wise PIV Details</title>
<style>
  ${tableStyle}
  body { font-family: Arial, Helvetica, sans-serif; margin: 12mm; font-size: 10px; line-height: 1.3; }
  h3 { text-align: center; color: #7A0000; margin: 0 0 12px 0; font-size: 15px; }
  .subtitles { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 11px; }
  .subtitle-left { text-align: left; }
  .subtitle-right { text-align: right; }
  @page { margin: 10mm; }
  @bottom-left { content: "Printed on: ${new Date().toLocaleString("en-US", {timeZone: "Asia/Colombo"})}"; font-size: 9px; }
  @bottom-right { content: "Page " counter(page) " of " counter(pages); font-size: 9px; }
</style>
</head>
<body>
<h3>Account Codes wise PIV Details</h3>

<div class="subtitles">
  <div class="subtitle-left">
    <strong>Issued Company: </strong>AFMHQ<br>
    <strong>Cost Center:</strong> ${selectedDept.DeptId} / ${selectedDept.DeptName}<br>
    <strong>Period:</strong> ${fromDate} to ${toDate}
  </div>
  <div class="subtitle-right">
    <strong>Currency:</strong> LKR
  </div>
</div>

<table>
  <colgroup>
    <col style="width:160px" />
    <col style="width:110px" />
    <col style="width:80px" />
    <col style="width:90px" />
    <col style="width:80px" />
    <col style="width:100px" />
  </colgroup>
  <thead>
    <tr class="${maroonGrad} text-white">
      <th>Issued Cost Center</th>
      <th>PIV No</th>
      <th>PIV date</th>
      <th>Account Code</th>
      <th>Paid Date</th>
      <th class="numeric">Amount</th>
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
				Account Codes wise PIV Details
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
					title="Account Codes wise PIV Details"
					subtitlebold="Issued Company: "
					subtitlenormal="AFMHQ"
					subtitlebold2="Cost Center :"
					subtitlenormal2={`${selectedDept?.DeptId || ""} / ${selectedDept?.DeptName || ""}`}
					subtitlebold3="Period: "
					subtitlenormal3={`${fromDate} To ${toDate}`}
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
									<th className="px-3 py-2">Issued Cost Center</th>
									<th className="px-3 py-2">PIV No</th>
									<th className="px-3 py-2">PIV date</th>
									<th className="px-3 py-2">Account Code</th>
									<th className="px-3 py-2">Paid Date</th>
									<th className="px-3 py-2 text-right">Amount</th>
								</tr>
							</thead>
							<tbody>
								{(() => {
									let prevDept = "";
									let accTotal = 0;
									let grandTotal = 0;

									return reportData
										.map((item, idx) => {
											const currDept =
												item.CctName || item.DeptId || "-";
											const currDeptDisplay = `${item.DeptId || "-"} - ${currDept}`;
											const currAcc = item.AccountCode || "-";
											const isLast = idx === reportData.length - 1;
											const nextAcc = isLast
												? ""
												: reportData[idx + 1]?.AccountCode || "";
											const rows: JSX.Element[] = [];

											// Data row
											rows.push(
												<tr
													key={`row-${idx}`}
													className={
														idx % 2 === 0
															? "bg-white"
															: "bg-gray-50"
													}
												>
													<td className="px-3 py-1 border border-gray-200">
														{prevDept === currDept
															? ""
															: currDeptDisplay}
													</td>
													<td className="px-3 py-1 border border-gray-200">
														{item.PivNo || "-"}
													</td>
													<td className="px-3 py-1 border border-gray-200">
														{formatDate(item.PivDate)}
													</td>
													<td className="px-3 py-1 border border-gray-200">
														{item.AccountCode || "-"}
													</td>
													<td className="px-3 py-1 border border-gray-200">
														{formatDate(item.PaidDate)}
													</td>
													<td className="px-3 py-1 text-right border border-gray-200">
														{formatNumber(item.Amount)}
													</td>
												</tr>,
											);

											if (item.Amount != null) {
												accTotal += item.Amount;
												grandTotal += item.Amount;
											}

											// Subtotal when account code changes or end of data
											if (currAcc !== nextAcc || isLast) {
												rows.push(
													<tr key={`sub-${idx}`}>
														<td
															colSpan={5}
															className="font-bold bg-gray-100 text-right px-3 py-1"
														>
															Total for Account Code {currAcc}
														</td>
														<td className="font-bold bg-gray-100 text-right px-3 py-1">
															{formatNumber(accTotal)}
														</td>
													</tr>,
												);
												accTotal = 0;
											}

											// Grand total only at the very end
											if (isLast) {
												rows.push(
													<tr key={`grand-${idx}`}>
														<td
															colSpan={5}
															className="font-bold bg-gray-200 text-right px-3 py-1"
														>
															Total of all account codes
														</td>
														<td className="font-bold bg-gray-200 text-right px-3 py-1">
															{formatNumber(grandTotal)}
														</td>
													</tr>,
												);
											}

											prevDept = currDept;

											return rows;
										})
										.flat();
								})()}
							</tbody>
						</table>
					</div>
				</ReportViewer>
			)}
		</div>
	);
};

export default AccountCodesWisePivReport;
