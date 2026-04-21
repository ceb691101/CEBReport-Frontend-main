//21. PIV Details (Paid Cost center: 913.00 and Issued Other Company)
// File: AccCodeWisePivNotAfmhqReport.tsx

import React, {useState, useRef, useCallback, JSX} from "react";
import {useUser} from "../../contexts/UserContext";
import {toast} from "react-toastify";
import DateRangePicker from "../../components/utils/DateRangePicker";
import ReportViewer from "../../components/utils/ReportViewer";
import ReusableCompanyList from "../../components/utils/ReusableCompanyList";

interface PivItem {
	Company: string | null;
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

const AccCodeWisePivNotAfmhqReport: React.FC = () => {
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
			const url = `/misapi/api/acc-code-wise-piv-not-afmhq/report?fromDate=${apiFrom}&toDate=${apiTo}&costctr=${dept.DeptId.trim()}`;

			const res = await fetch(url);
			if (!res.ok) throw new Error(`HTTP error ${res.status}`);

			const data = await res.json();
			const items: PivItem[] = Array.isArray(data) ? data : [];

			// Sort: by Company → DeptId → AccountCode → PivNo
			items.sort((a, b) => {
				const compA = a.Company || "";
				const compB = b.Company || "";
				if (compA !== compB) return compA.localeCompare(compB);

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
			`Cost Center : ${selectedDept.DeptId} / ${selectedDept.DeptName}`,
			"Issued Company: Not AFMHQ",
			`Paid Date: From ${fromDate} To ${toDate}`,
			`Currency : LKR`,
			"",
			[
				"Company",
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
		let compTotal = 0;
		let grandTotal = 0;

		reportData.forEach((item, index) => {
			const currComp = item.Company || "";
			const currDept = item.CctName || item.DeptId || "";
			const currAcc = item.AccountCode || "";
			const isLast = index === reportData.length - 1;
			const nextComp = isLast ? "" : reportData[index + 1]?.Company || "";
			const nextAcc = isLast ? "" : reportData[index + 1]?.AccountCode || "";

			const deptDisplay = `${item.DeptId || ""} - ${currDept}`;

			csvRows.push(
				[
					forceText(currComp),
					forceText(deptDisplay),
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
				compTotal += item.Amount;
				grandTotal += item.Amount;
			}

			// Account code subtotal
			if (currAcc !== nextAcc || isLast) {
				csvRows.push(
					[
						`Total for Account Code ${currAcc}`,
						"",
						"",
						"",
						"",
						"",
						formatNumber(accTotal),
					]
						.map(csvEscape)
						.join(","),
				);
				csvRows.push(""); // empty line after account total
				accTotal = 0;
			}

			// Company total (when company changes or end)
			if (currComp !== nextComp || isLast) {
				csvRows.push(
					[
						`Total for Division ${currComp}`,
						"",
						"",
						"",
						"",
						"",
						formatNumber(compTotal),
					]
						.map(csvEscape)
						.join(","),
				);
				csvRows.push(""); // empty line after company total
				compTotal = 0;
			}
		});

		csvRows.push(
			["Grand Total", "", "", "", "", "", formatNumber(grandTotal)]
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
      .company-header { background-color: #f0f0f0 !important; font-weight: bold; font-size: 11px; }
      .subtotal-row { background-color: #f5f5f5 !important; font-weight: bold; }
      .subtotal-row-divi{ background-color: #FEF9C3 !important; font-weight: bold; }
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
		let prevComp = "";
		let prevDept = "";
		let accTotal = 0;
		let compTotal = 0;
		let grandTotal = 0;

		reportData.forEach((item, idx) => {
			const currComp = item.Company || "-";
			const currDept = item.CctName || item.DeptId || "-";
			const currDeptDisplay = `${item.DeptId || "-"} - ${currDept}`;
			const currAcc = item.AccountCode || "-";
			const isLast = idx === reportData.length - 1;
			const nextComp = isLast ? "" : reportData[idx + 1]?.Company || "";
			const nextAcc = isLast ? "" : reportData[idx + 1]?.AccountCode || "";

			const showCompHeader = prevComp !== currComp;
			const showDeptHeader = showCompHeader || prevDept !== currDept;

			// Company header row (Division :)
			if (showCompHeader) {
				if (prevComp !== "") {
					// Previous company total before new company starts
					bodyHTML += `
            <tr class="subtotal-row-divi">
              <td colspan="5" class="text-right">Total for Division: ${prevComp}</td>
              <td colspan="2" class="numeric">${formatNumber(compTotal)}</td>
            </tr>
            <tr><td colspan="7" style="height:8px;"></td></tr>
          `;
					compTotal = 0;
				}

				bodyHTML += `
          <tr class="company-header">
            <td colspan="7">Division : ${escapeHtml(currComp)}</td>
          </tr>
        `;
			}

			// Data row
			bodyHTML += `
        <tr class="${idx % 2 === 0 ? "alternate-even" : "alternate-odd"}">
          <td>${showDeptHeader ? escapeHtml(currDeptDisplay) : ""}</td>
          <td>${escapeHtml(item.PivNo || "-")}</td>
          <td>${formatDate(item.PivDate)}</td>
          <td>${escapeHtml(item.AccountCode || "-")}</td>
          <td>${formatDate(item.PaidDate)}</td>
          <td class="numeric">${formatNumber(item.Amount)}</td>
        </tr>
      `;

			if (item.Amount != null) {
				accTotal += item.Amount;
				compTotal += item.Amount;
				grandTotal += item.Amount;
			}

			// Account code subtotal
			if (currAcc !== nextAcc || currComp !== nextComp || isLast) {
				bodyHTML += `
          <tr class="subtotal-row">
            <td colspan="5" class="text-right">Total for Account Code ${currAcc}</td>
            <td colspan="2" class="numeric">${formatNumber(accTotal)}</td>
          </tr>
        `;
				accTotal = 0;
			}

			prevComp = currComp;
			prevDept = currDept;

			// Last company total
			if (isLast && compTotal > 0) {
				bodyHTML += `
          <tr class="subtotal-row-divi">
            <td colspan="5" class="text-right">Total for Division: ${currComp}</td>
            <td colspan="2" class="numeric">${formatNumber(compTotal)}</td>
          </tr>
        `;
			}
		});

		// Final Grand Total
		bodyHTML += `
      <tr class="grand-total-row">
        <td colspan="5" class="text-right">Grand Total</td>
        <td colspan="2" class="numeric">${formatNumber(grandTotal)}</td>
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
</style>
</head>
<body>
<h3>Account Codes wise PIV Details</h3>

<div class="subtitles">
  <div class="subtitle-left">
    <strong>Cost Center:</strong> ${selectedDept.DeptId} / ${selectedDept.DeptName}<br>
    <strong>Issued Company: </strong>Not AFMHQ 
    <br><strong>Period:</strong> ${fromDate} to ${toDate}
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
					subtitlebold="Cost Center :"
					subtitlenormal={`${selectedDept?.DeptId || ""} / ${selectedDept?.DeptName || ""}`}
					subtitlebold2="Issued Company: "
                    subtitlenormal2="Not AFMHQ"
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
									<th className=" px-3 py-2 w-[250px] max-w-[250px] overflow-hidden text-ellipsis whitespace-nowrap">
										Issued Cost Center
									</th>
									<th className="px-3 py-2">PIV No</th>
									<th className="px-3 py-2">PIV date</th>
									<th className="px-3 py-2">Account Code</th>
									<th className="px-3 py-2">Paid Date</th>
									<th className="px-3 py-2 text-right">Amount</th>
								</tr>
							</thead>
							<tbody>
								{(() => {
									let prevComp = "";
									let prevDept = "";
									let accTotal = 0;
									let compTotal = 0;
									let grandTotal = 0;

									return reportData
										.map((item, idx) => {
											const currComp = item.Company || "-";
											const currDept =
												item.CctName || item.DeptId || "-";
											const currDeptDisplay = `${item.DeptId || "-"} - ${currDept}`;
											const currAcc = item.AccountCode || "-";
											const isLast = idx === reportData.length - 1;
											const nextAcc = isLast
												? ""
												: reportData[idx + 1]?.AccountCode || "";

											const showCompHeader = prevComp !== currComp;
											const showDeptHeader =
												showCompHeader || prevDept !== currDept;

											const rows: JSX.Element[] = [];

											// Company header row
											if (showCompHeader) {
												if (prevComp !== "") {
													// Close previous company with total
													rows.push(
														<tr
															key={`comp-total-prev-${idx}`}
															className="subtotal-row"
														>
															<td
																colSpan={5}
																className="text-right px-3 py-2 text-sm font-bold bg-yellow-100"
															>
																Total for Division: {prevComp}
															</td>
															<td className="text-right px-3 py-2 text-sm font-bold bg-yellow-100">
																{formatNumber(compTotal)}
															</td>
														</tr>,
													);
													rows.push(
														<tr key={`spacer-${idx}`}>
															<td
																colSpan={6}
																style={{height: "12px"}}
															></td>
														</tr>,
													);
													compTotal = 0;
												}

												rows.push(
													<tr
														key={`comp-header-${idx}`}
														className="bg-gray-200 font-bold"
													>
														<td colSpan={6} className="px-3 py-1">
															Division : {currComp}
														</td>
													</tr>,
												);
											}

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
														{showDeptHeader
															? currDeptDisplay
															: ""}
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
												compTotal += item.Amount;
												grandTotal += item.Amount;
											}

											// Account subtotal
											if (
												currAcc !== nextAcc ||
												showCompHeader ||
												isLast
											) {
												rows.push(
													<tr
														key={`sub-acc-${idx}`}
														className="bg-gray-100 font-bold"
													>
														<td
															colSpan={5}
															className="text-right px-3 py-1"
														>
															Total for Account Code {currAcc}
														</td>
														<td className="text-right px-3 py-1">
															{formatNumber(accTotal)}
														</td>
													</tr>,
												);
												accTotal = 0;
											}

											// Last company total
											if (isLast && compTotal > 0) {
												rows.push(
													<tr
														key={`comp-total-last-${idx}`}
														className="subtotal-row"
													>
														<td
															colSpan={5}
															className="text-right px-3 py-2 text-sm font-bold bg-yellow-100"
														>
															Total for Division: {currComp}
														</td>
														<td className="text-right px-3 py-2 text-sm font-bold bg-yellow-100">
															{formatNumber(compTotal)}
														</td>
													</tr>,
												);
											}

											// Grand total at the very end
											if (isLast) {
												rows.push(
													<tr
														key={`grand-${idx}`}
														className="grand-total-row"
													>
														<td
															colSpan={5}
															className="text-right font-bold px-4 py-2 bg-blue-200 text-base"
														>
															Grand Total
														</td>
														<td className="text-right font-bold px-4 py-2 bg-blue-200 text-base">
															{formatNumber(grandTotal)}
														</td>
													</tr>,
												);
											}

											prevComp = currComp;
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

export default AccCodeWisePivNotAfmhqReport;
