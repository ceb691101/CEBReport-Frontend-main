// File: TypewisePIV.tsx

import React, {useState, useRef, useCallback} from "react";
import {useUser} from "../../contexts/UserContext";
import {toast} from "react-toastify";
import DateRangePicker from "../../components/utils/DateRangePicker";
import ReusableCompanyList from "../../components/utils/ReusableCompanyList";
import ReportViewer from "../../components/utils/ReportViewer";

// Define consistent types
interface Department {
	DeptId: string;
	DeptName: string;
}

interface TypewisePIVItem {
	Dept_Id: string;
	Title_Cd: string;
	Reference_No: string;
	Piv_Date: string | null;
	Paid_Date: string | null;
	Piv_No: string;
	Cus_Vat_No: string;
	Name: string;
	Address: string;
	Telephone_No: string;
	Collect_Person_Id: string;
	Collect_Person_Name: string;
	Description: string;
	Grand_Total: number;
	Vat_Reg_No: string;
	Payment_Mode: string;
	Cheque_No: string;
	Cct_Name: string;
}

const formatDate = (dateStr: string | null): string => {
	if (!dateStr) return "-";
	const date = new Date(dateStr);
	if (isNaN(date.getTime())) return "-";
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}/${month}/${day}`;
};

const formatCurrency = (num: number | null | undefined): string => {
	if (num == null) return "0.00";
	return num.toLocaleString("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
};

const csvEscape = (val: string | number | null | undefined): string => {
	if (val == null) return '""';
	const str = String(val);
	if (/[,\n"]/g.test(str)) return `"${str.replace(/"/g, '""')}"`;
	return str;
};

const escapeHtml = (text: string | null | undefined): string => {
	if (!text) return "";
	const div = document.createElement("div");
	div.textContent = text;
	return div.innerHTML;
};

const TypewisePIV: React.FC = () => {
	const {user} = useUser();
	const epfNo = user?.Userno || "";
	const iframeRef = useRef<HTMLIFrameElement>(null);

	const [selectedDept, setSelectedDept] = useState<Department | null>(null);
	const [fromDate, setFromDate] = useState("");
	const [toDate, setToDate] = useState("");
	const [reportData, setReportData] = useState<TypewisePIVItem[]>([]);
	const [reportLoading, setReportLoading] = useState(false);
	const [showReport, setShowReport] = useState(false);

	const maroon = "text-[#7A0000]";
	const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";

	// Group data by Title_Cd + calculate totals
	const groupedData = React.useMemo(() => {
		const groups: Record<string, {items: TypewisePIVItem[]; total: number}> =
			{};

		reportData.forEach((item) => {
			const title = item.Title_Cd?.trim() || "Unknown";
			if (!groups[title]) {
				groups[title] = {items: [], total: 0};
			}
			groups[title].items.push(item);
			groups[title].total += item.Grand_Total || 0;
		});

		return groups;
	}, [reportData]);

	const grandTotal = React.useMemo(
		() => reportData.reduce((sum, item) => sum + (item.Grand_Total || 0), 0),
		[reportData]
	);

	const handleViewReport = async (dept: Department) => {
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
			const url = `/misapi/api/typewisepiv/get?costctr=${encodeURIComponent(
				dept.DeptId.trim(),
			)}&fromDate=${fromDate.replace(/-/g, "")}&toDate=${toDate.replace(
				/-/g,
				"",
			)}`;

			const res = await fetch(url);
			if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

			const data = await res.json();
			const items: TypewisePIVItem[] = Array.isArray(data)
				? data
				: data.data || data.result || [];

			setReportData(items);
			items.length === 0
				? toast.warn("No records found for the selected period")
				: toast.success("Report loaded successfully");
		} catch (err: any) {
			toast.error(
				"Failed to load report: " + (err.message || "Unknown error")
			);
			console.error(err);
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

		const headers = [
			"Serial No",
			"Title Code",
			"PIV Date",
			"PIV No",
			"Cus VAT No",
			"Name",
			"Payment Mode",
			"Description",
			"Paid Date",
			"Address",
			"Cheque No",
			"Reference No",
			"Telephone",
			"Name of Representative",
			"Grand Total",
		];

		const csvRows: string[] = [
			`"Typewise PIV Details"`,
			`Cost Center: ${selectedDept.DeptId} - ${selectedDept.DeptName}`,
			`Period: ${fromDate} to ${toDate}`,
			`Currency: LKR`,
			"",
			headers.map(csvEscape).join(","),
		];

		let serial = 1;
		Object.entries(groupedData).forEach(([title, {items}]) => {
			items.forEach((item) => {
				const row = [
					serial++,
					title,
					`="${formatDate(item.Piv_Date)}"`,
					`="${item.Piv_No || "-"}"`,
					`="${item.Cus_Vat_No || "-"}"`,
					item.Name || "-",
					item.Payment_Mode || "-",
					csvEscape(item.Description || "-"),
					`="${formatDate(item.Paid_Date)}"`,
					csvEscape(item.Address || ""),
					`="${item.Cheque_No || "-"}"`,
					`="${item.Reference_No || "-"}"`,
`"${(item.Telephone_No || "-").replace(/[,/|]/g, "\n")}"`,
					csvEscape(item.Collect_Person_Name || "-"),
					csvEscape(formatCurrency(item.Grand_Total)),
				];
				csvRows.push(row.join(","));
			});

			csvRows.push(
				`"Total  ${title}",,,,,,,,,,,,,,${csvEscape(formatCurrency(
					groupedData[title].total
				)	)}`
			);
			csvRows.push("");
		});

		csvRows.push(`"GRAND TOTAL",,,,,,,,,,,,,,${csvEscape(formatCurrency(grandTotal))}`);

		const csvContent = csvRows.join("\n");
		const blob = new Blob(["\uFEFF" + csvContent], {
			type: "text/csv;charset=utf-8;",
		});
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `Typewise_PIV_${selectedDept.DeptId}_${fromDate}_to_${toDate}.csv`;
		link.click();
		URL.revokeObjectURL(url);
	};

	const printPDF = () => {
		if (!iframeRef.current || !selectedDept || reportData.length === 0)
			return;

		const tableStyle = `
    table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 12px; }
    th, td { border: 1px solid #aaa; padding: 6px; word-wrap: break-word; vertical-align: middle; }
	td{font-size: 9px;}
    th { font-weight: bold; }
    .numeric { text-align: right; }
    .center { text-align: center; }
    .left { text-align: left; }
    .title-row { background-color: #f0e6e6; font-weight: bold; font-size: 12px; }
    .total-row { background-color: #f0f0f0; font-weight: bold; }
	.grand-total-row { background-color: #DBEAFE; font-weight: bold; }

  `;

		const colWidths = [
			"45px", // S.No
			"80px", // PIV Date
			"120px", // PIV No
			"100px", // Cus VAT No
			"100px", // Name
			"85px", // Payment Mode
			"140px", // Description
			"80px", // Paid Date
			"160px", // Address
			"90px", // Cheque No
			"120px", // Reference No
			"100px", // Telephone
			"100px", // Name of Representative
			"100px", // Grand Total
		];

		const colGroupHTML = colWidths
			.map((w) => `<col style="width: ${w};" />`)
			.join("");

		let bodyHTML = "";
		let serial = 1;

		Object.entries(groupedData).forEach(([title, {items, total}]) => {
			bodyHTML += `
      <tr class="title-row">
        <td colspan="14"><strong>Title Code: ${escapeHtml(title)}</strong></td>
      </tr>`;

			items.forEach((item) => {
				bodyHTML += `
        <tr>
          <td class="center">${serial++}</td>
          <td class="center">${formatDate(item.Piv_Date)}</td>
          <td class="center">${escapeHtml(item.Piv_No || "-")}</td>
          <td class="center">${escapeHtml(item.Cus_Vat_No || "-")}</td>
          <td>${escapeHtml(item.Name || "-")}</td>
          <td class="center">${escapeHtml(item.Payment_Mode || "-")}</td>
          <td>${escapeHtml(item.Description || "-")}</td>
          <td class="center">${formatDate(item.Paid_Date)}</td>
          <td>${escapeHtml(item.Address || "-")}</td>
          <td class="center">${escapeHtml(item.Cheque_No || "-")}</td>
          <td class="center">${escapeHtml(item.Reference_No || "-")}</td>
          <td class="center">${escapeHtml(item.Telephone_No || "-")}</td>
          <td>${escapeHtml(item.Collect_Person_Name || "-")}</td>
          <td class="numeric">${formatCurrency(item.Grand_Total)}</td>
        </tr>`;
			});

			bodyHTML += `
      <tr class="total-row">
        <td colspan="13" class="left">Total: ${escapeHtml(title)}</td>
        <td class="numeric">${formatCurrency(total)}</td>
      </tr>
      <tr><td colspan="14" style="height:12px;"></td></tr>`;
		});

		bodyHTML += `
    <tr class="grand-total-row">
      <td colspan="13" class="left"><strong>GRAND TOTAL</strong></td>
      <td class="numeric"><strong>${formatCurrency(grandTotal)}</strong></td>
    </tr>`;

		const fullHTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Typewise PIV Details</title>
<style>
  ${tableStyle}
  body { font-family: Arial, sans-serif; margin: 15mm; print-color-adjust: exact; }
  h3 { text-align: center; color: #7A0000; font-size: 16px; font-weight: bold; margin: 0 0 10px 0; }
  .subtitles {display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 11px;}
  .subtitle-left{ text-align: left; }
  .subtitle-right{ text-align: right; }
  .info { font-size: 12px; margin-bottom: 8px; }

  @page { margin: 5mm; size: A3 landscape; }
  @page {
    @bottom-left { content: "Printed on: ${new Date().toLocaleString()}"; font-size: 9px; margin-bottom: 4mm; margin-top: 2mm;   }
    @bottom-right { content: "Page " counter(page) " of " counter(pages); font-size: 9px; margin-bottom: 4mm; margin-top: 2mm; }
  }
</style>
</head>
<body>
<h3>Typewise PIV Details</h3>

<div class="subtitles">
  <div class="subtitle-left">
    <div><strong>Cost Center:</strong> ${escapeHtml(
			selectedDept.DeptId
		)} - ${escapeHtml(selectedDept.DeptName)}</div>
    <strong>Period :</strong> ${fromDate} to ${toDate}
  </div>
  <div class="subtitle-right">
    <strong>Currency:</strong> LKR
  </div>
</div>

<table>
  <colgroup>${colGroupHTML}</colgroup>
  <thead>
    <tr>
      <th>Serial No</th>
      <th>PIV Date</th>
      <th>PIV No</th>
      <th>Cus VAT No</th>
      <th>Name</th>
      <th>Payment Mode</th>
      <th>Description</th>
      <th>Paid Date</th>
      <th>Address</th>
      <th>Cheque No</th>
      <th>Reference No</th>
      <th>Telephone</th>
      <th>Name of Representative</th>
      <th>Grand Total</th>
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
				Typewise PIV Details
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
					// Assuming ReusableCompanyList expects items with {id: string, name: string}
					fetchItems={useCallback(async () => {
						if (!epfNo) {
							toast.error("No EPF number available.");
							return [];
						}
						try {
							const res = await fetch(
								`/misapi/api/incomeexpenditure/departments/${epfNo}`
							);
							if (!res.ok)
								throw new Error(`HTTP error! status: ${res.status}`);

							const data = await res.json();
							const raw = Array.isArray(data)
								? data
								: data.data || data.departments || data.result || [];

							return raw.map((d: any) => ({
								id: (d.DeptId || d.deptId || "").toString().trim(),
								name: (d.DeptName || d.deptName || d.name || "").trim(),
							}));
						} catch (e: any) {
							toast.error(
								"Failed to load departments: " +
									(e.message || "Unknown error")
							);
							return [];
						}
					}, [epfNo])}
					// We map the generic item to our Department type
					onViewItem={(item: {id: string; name: string}) => {
						const dept: Department = {
							DeptId: item.id,
							DeptName: item.name,
						};
						handleViewReport(dept);
					}}
					idColumnTitle="Dept Code"
					nameColumnTitle="Department / Cost Center Name"
					loadingMessage="Loading departments..."
					emptyMessage="No departments available for selection."
				/>
			</div>

			{showReport && (
				<ReportViewer
					title="Typewise PIV Details"
					subtitlebold2="Cost Center:"
					subtitlenormal2={`${selectedDept?.DeptId} - ${selectedDept?.DeptName}`}
					subtitlebold3="Period:"
					subtitlenormal3={`${fromDate} to ${toDate}`}
					loading={reportLoading}
					hasData={reportData.length > 0}
					handleDownloadCSV={handleDownloadCSV}
					printPDF={printPDF}
					closeReport={closeReport}
				>
					<div className="overflow-x-auto">
						<table className="w-full text-xs border-collapse">
							<thead className={`${maroonGrad} text-white`}>
								<tr>
									<th className="border border-gray-400 px-3 py-2 text-center whitespace-nowrap">
										Serial No
									</th>
									<th className="border border-gray-400 px-3 py-2 text-center whitespace-nowrap">
										PIV Date
									</th>
									<th className="border border-gray-400 px-3 py-2 text-center whitespace-nowrap">
										PIV No
									</th>
									<th className="border border-gray-400 px-3 py-2 text-center whitespace-nowrap">
										Cus VAT No
									</th>
									<th className="border border-gray-400 px-3 py-2 text-center whitespace-nowrap">
										Name
									</th>
									<th className="border border-gray-400 px-3 py-2 text-center whitespace-nowrap">
										Payment Mode
									</th>
									<th className="border border-gray-400 px-3 py-2 text-center whitespace-nowrap">
										Description
									</th>
									<th className="border border-gray-400 px-3 py-2 text-center whitespace-nowrap">
										Paid Date
									</th>
									<th className="border border-gray-400 px-3 py-2 text-center whitespace-nowrap wrap-break-word">
										Address
									</th>
									<th className="border border-gray-400 px-3 py-2 text-center whitespace-nowrap">
										Cheque No
									</th>
									<th className="border border-gray-400 px-3 py-2 text-center whitespace-nowrap">
										Reference No
									</th>
									<th className="border border-gray-400 px-3 py-2 text-center whitespace-nowrap">
										Telephone
									</th>
									<th className="border border-gray-400 px-3 py-2 text-center whitespace-nowrap">
										Name of Representative
									</th>
									<th className="border border-gray-400 px-3 py-2 text-right whitespace-nowrap">
										Grand Total
									</th>
								</tr>
							</thead>
							<tbody>
								{Object.entries(groupedData).map(
									([title, {items, total}], groupIndex) => (
										<React.Fragment key={title}>
											<tr className="h-4">
												<td
													colSpan={14}
													className="px-4 py-2 border border-gray-300"
												></td>
											</tr>
											<tr className="bg-red-50 font-bold">
												<td
													colSpan={14}
													className="px-4 py-2 border border-gray-300"
												>
													{title}
												</td>
											</tr>

											{items.map((item, idx) => (
												<tr
													key={`${groupIndex}-${idx}`}
													className={
														idx % 2 === 0
															? "bg-white"
															: "bg-gray-50"
													}
												>
													<td className="border border-gray-300 px-3 py-2 text-center whitespace-nowrap">
														{idx + 1}
													</td>
													<td className="border border-gray-300 px-3 py-2 text-center whitespace-nowrap">
														{formatDate(item.Piv_Date)}
													</td>
													<td className="border border-gray-300 px-3 py-2 text-center whitespace-nowrap">
														{item.Piv_No || "-"}
													</td>
													<td className="border border-gray-300 px-3 py-2 text-center whitespace-nowrap">
														{item.Cus_Vat_No || "-"}
													</td>
													<td className="border border-gray-300 px-3 py-2 text-left whitespace-nowrap">
														{item.Name || "-"}
													</td>
													<td className="border border-gray-300 px-3 py-2 text-center whitespace-nowrap">
														{item.Payment_Mode || "-"}
													</td>
													<td className="border border-gray-300 px-3 py-2 whitespace-nowrap wrap-break-word">
														{item.Description || "-"}
													</td>
													<td className="border border-gray-300 px-3 py-2 text-center whitespace-nowrap">
														{formatDate(item.Paid_Date)}
													</td>
													<td className="border border-gray-300 px-3 py-2">
														{item.Address || "-"}
													</td>
													<td className="border border-gray-300 px-3 py-2 text-center whitespace-nowrap">
														{item.Cheque_No || "-"}
													</td>
													<td className="border border-gray-300 px-3 py-2 text-center">
														{item.Reference_No || "-"}
													</td>
													<td className="border border-gray-300 px-3 py-2 text-center whitespace-nowrap">
														{item.Telephone_No || "-"}
													</td>
													<td className="border border-gray-300 px-3 py-2">
														{item.Collect_Person_Name || "-"}
													</td>
													<td className="border border-gray-300 px-3 py-2 text-right whitespace-nowrap">
														{formatCurrency(item.Grand_Total)}
													</td>
												</tr>
											))}

											<tr className="bg-gray-200 font-bold">
												<td
													colSpan={13}
													className="border border-gray-300 px-4 py-2 text-left"
												>
													Total: {title}
												</td>
												<td className="border border-gray-300 px-3 py-2 text-left">
													{formatCurrency(total)}
												</td>
											</tr>
										</React.Fragment>
									)
								)}

								{/* Grand Total */}
								{reportData.length > 0 && (
									<tr className="bg-blue-100 font-bold text-sm">
										<td
											colSpan={13}
											className="border border-gray-300 px-4 py-3 text-left"
										>
											GRAND TOTAL
										</td>
										<td className="border border-gray-300 px-3 py-3 text-left">
											{formatCurrency(grandTotal)}
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>
				</ReportViewer>
			)}
		</div>
	);
};

export default TypewisePIV;
