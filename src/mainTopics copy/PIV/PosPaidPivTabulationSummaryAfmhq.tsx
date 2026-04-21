//19. POS Paid PIV Tabulation Summary Report (AFMHQ)
// PosPaidPivTabulationSummaryAfmhq.tsx
import React, {useState, useRef, useMemo} from "react";
import {useUser} from "../../contexts/UserContext";
import {toast} from "react-toastify";
import DateRangePicker from "../../components/utils/DateRangePicker";
import ReusableCompanyList from "../../components/utils/ReusableCompanyList";
import ReportViewer from "../../components/utils/ReportViewer";

interface CostCenter {
	id: string;
	name: string;
}

interface RawReportRow {
	Company: string;
	Account_Code: string;
	C8: string;
	Amount: number;
	CCT_NAME1: string;
}

interface PivotedRow {
	Company: string;
	amountsByCode: Record<string, number>;
	total: number;
}

const formatNumber = (num: number | null | undefined): string => {
	if (num == null || isNaN(num)) return "0.00";
	return new Intl.NumberFormat("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(num);
};

const csvEscape = (val: string | number | null | undefined): string => {
	if (val == null) return '""';
	const str = String(val);
	if (/[,\n"]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
	return str;
};

const PosPaidPivTabulationSummaryAfmhq: React.FC = () => {
	const {user} = useUser();
	const epfNo = user?.Userno || "";

	const iframeRef = useRef<HTMLIFrameElement>(null);

	const [fromDate, setFromDate] = useState("");
	const [toDate, setToDate] = useState("");
	const [rawReportData, setRawReportData] = useState<RawReportRow[]>([]);
	const [reportLoading, setReportLoading] = useState(false);
	const [showReport, setShowReport] = useState(false);
	const [selectedCostCenter, setSelectedCostCenter] =
		useState<CostCenter | null>(null);

	const maroon = "text-[#7A0000]";
	const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";

	// Unique sorted account codes
	const accountCodes = useMemo(
		() =>
			Array.from(new Set(rawReportData.map((r) => r.Account_Code))).sort(),
		[rawReportData],
	);

	// Pivot data: one row per Company
	const pivotedRows = useMemo(() => {
		const map = new Map<string, PivotedRow>();

		rawReportData.forEach((row) => {
			const company = row.Company.trim();
			if (!map.has(company)) {
				map.set(company, {
					Company: company,
					amountsByCode: {},
					total: 0,
				});
			}

			const entry = map.get(company)!;
			const code = row.Account_Code;
			const amount = Number(row.Amount) || 0;

			entry.amountsByCode[code] = (entry.amountsByCode[code] || 0) + amount;
			entry.total += amount;
		});

		return Array.from(map.values()).sort((a, b) =>
			a.Company.localeCompare(b.Company),
		);
	}, [rawReportData]);

	// Column totals + grand total
	const columnTotals = useMemo(() => {
		const totals: Record<string, number> = {};
		accountCodes.forEach((code) => {
			totals[code] = pivotedRows.reduce(
				(sum, row) => sum + (row.amountsByCode[code] || 0),
				0,
			);
		});
		return totals;
	}, [pivotedRows, accountCodes]);

	const grandTotal = Object.values(columnTotals).reduce((a, b) => a + b, 0);

	// Fetch departments (your original implementation)
	const fetchCostCenters = async (): Promise<CostCenter[]> => {
		if (!epfNo) {
			toast.error("No EPF number available. Please login again.");
			throw new Error("Missing EPF number");
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

			if (!res.ok) {
				const errorText = await res.text();
				throw new Error(`HTTP ${res.status} - ${errorText}`);
			}

			const parsed = await res.json();
			let rawData: any[] = [];
			if (Array.isArray(parsed)) rawData = parsed;
			else if (parsed.data && Array.isArray(parsed.data))
				rawData = parsed.data;
			else if (parsed.result && Array.isArray(parsed.result))
				rawData = parsed.result;
			else if (parsed.departments && Array.isArray(parsed.departments))
				rawData = parsed.departments;

			const departments: CostCenter[] = rawData.map((item: any) => ({
				id:
					item.DeptId?.toString() ||
					item.deptId?.toString() ||
					item.id?.toString() ||
					"",
				name:
					item.DeptName?.toString().trim() ||
					item.deptName?.toString().trim() ||
					item.name?.toString().trim() ||
					"",
			}));

			if (departments.length === 0) {
				toast.warn("No departments found.");
			}

			return departments;
		} catch (err: any) {
			const msg = err.message || "Failed to load departments";
			console.error("Departments fetch error:", err);
			toast.error(msg);
			throw err;
		}
	};

	// Fetch report
	const handleViewReport = async (costCenter: CostCenter) => {
		if (!fromDate || !toDate) {
			toast.error("Please select both From and To dates.");
			return;
		}
		if (new Date(toDate) < new Date(fromDate)) {
			toast.error("To Date cannot be earlier than From Date.");
			return;
		}

		setSelectedCostCenter(costCenter);
		setReportLoading(true);
		setShowReport(true);
		setRawReportData([]);

		try {
			const url = `/misapi/api/pos-paid-piv-tabulation-afmhq/get?costCtr=${encodeURIComponent(
				costCenter.id,
			)}&fromDate=${fromDate.replace(/-/g, "")}&toDate=${toDate.replace(/-/g, "")}`;

			const res = await fetch(url);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);

			const data = await res.json();
			const items: RawReportRow[] = Array.isArray(data)
				? data
				: data.data || [];

			setRawReportData(items);

			if (items.length === 0) {
				toast.warn("No records found for the selected period.");
			} else {
				toast.success("Report loaded successfully.");
			}
		} catch (err: any) {
			toast.error("Failed to load report: " + err.message);
		} finally {
			setReportLoading(false);
		}
	};

	const closeReport = () => {
		setShowReport(false);
		setRawReportData([]);
		setSelectedCostCenter(null);
	};

	// CSV Export
	const handleDownloadCSV = () => {
		if (pivotedRows.length === 0 || !selectedCostCenter) return;

		const headers = ["Issued Division/Branch", ...accountCodes, "Total"];

		const rows = pivotedRows.map((row) => [
			csvEscape(row.Company),
			...accountCodes.map((code) =>
				formatNumber(row.amountsByCode[code] || 0),
			),
			formatNumber(row.total),
		]);

		const csvRows = [
			"POS Paid PIV Tabulation Summary Report (AFMHQ)",
			`Paid Cost Centre : ${selectedCostCenter.id} / ${selectedCostCenter.name}`,
			`Period: ${fromDate} To ${toDate}`,
			"",
			headers.map(csvEscape).join(","),
			...rows.map((r) => r.map(csvEscape).join(",")),
			"",
			[
				"GRAND TOTAL",
				...accountCodes.map((code) =>
					formatNumber(columnTotals[code] || 0),
				),
				formatNumber(grandTotal),
			]
				.map((v) => `"${v}"`)
				.join(","),
		];

		const content = csvRows.join("\n");
		const blob = new Blob(["\uFEFF" + content], {
			type: "text/csv;charset=utf-8;",
		});
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `POS-Paid-PIV-AFMHQ_${selectedCostCenter.id}_${fromDate}_to_${toDate}.csv`;
		link.click();
		URL.revokeObjectURL(url);
	};

	// Print PDF
	const printPDF = () => {
		if (!iframeRef.current || pivotedRows.length === 0 || !selectedCostCenter)
			return;

		const totalCols = accountCodes.length + 2;
		let fontSize = "9px";
		let headerFontSize = "10px";
		let titleFontSize = "14px";
		let colWidth = "105px";
		let PaddingT = "5px";

		if (totalCols > 18) {
			fontSize = "4px";
			headerFontSize = "5px";
			colWidth = "30px";
			PaddingT= "2px";
		} else if (totalCols > 12) {
			fontSize = "7px";
			headerFontSize = "8px";
			colWidth = "88px";
			PaddingT = "3px";
		}

		const tableStyle = `
      table { width: auto; table-layout: auto;   max-width: 100%;  border-collapse: collapse; font-family: Arial, sans-serif; font-size: ${fontSize}; }
      th, td { border: 1px solid #aaa; padding: ${PaddingT}; }
      th { font-weight: bold; text-align: center; font-size: ${headerFontSize}; }
      .left { text-align: left !important; padding-left: 8px; }
      .numeric { text-align: right !important; }
      .grand { background-color: #f3f4f6; font-weight: bold; }
      @media print {
    body, * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
      }
    `;

		const colGroup = `
      <colgroup>
        <col style="width: 280px;" />
        ${accountCodes.map(() => `<col style="width: ${colWidth};" />`).join("")}
        <col style="width: ${colWidth};" />
      </colgroup>
    `;

		const bodyRows = pivotedRows
			.map(
				(row, i) => `
        <tr style="background: ${i % 2 === 0 ? "#ffffff" : "#f9fafb"};">
          <td class="left company">${escapeHtml(row.Company)}</td>
          ${accountCodes
					.map(
						(code) =>
							`<td class="numeric">${formatNumber(row.amountsByCode[code] || 0)}</td>`,
					)
					.join("")}
          <td class="numeric font-bold">${formatNumber(row.total)}</td>
        </tr>`,
			)
			.join("");

		const grandRow = `
      <tr class="grand">
        <td class="left">GRAND TOTAL</td>
        ${accountCodes.map((code) => `<td class="numeric">${formatNumber(columnTotals[code] || 0)}</td>`).join("")}
        <td class="numeric">${formatNumber(grandTotal)}</td>
      </tr>`;

		const fullHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>POS Paid PIV Tabulation Summary (AFMHQ)</title>
  <style>
  
    ${tableStyle}
    body { margin: 12mm; }
    h2 { color: #7A0000; text-align: center; font-size: ${titleFontSize}; margin: 0 0 10px; }
    .subtitle { 
      font-size: 11px; 
    }

	.subtitle .left {
	text-align: left;
	}

	.subtitle .right {
	text-align: right;
	margin-bottom: 4px;
	}

	.left .line {
  margin-bottom: 3px; 
}
    @page { size: A3 landscape; margin: 12mm;
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
  <h2>POS Paid PIV Tabulation Summary Report (AFMHQ)</h2>
<div class="subtitle">
  <div class="left">
    <div class="line">
      <strong>Paid Cost Center:</strong>
      ${escapeHtml(selectedCostCenter.id)} /
      ${escapeHtml(selectedCostCenter.name)}
    </div>

    <div class="line">
      <strong>Period:</strong> ${fromDate} to ${toDate}
    </div>
  </div>

  <div class="right">
    <strong>Currency:</strong> LKR
  </div>
</div>
  <table>
    ${colGroup}
    <thead>
      <tr>
        <th class="left">Issued Division/Branch</th>
        ${accountCodes.map((c) => `<th>${escapeHtml(c)}</th>`).join("")}
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${bodyRows}
      ${grandRow}
    </tbody>
  </table>
</body>
</html>`;

		const doc = iframeRef.current.contentDocument!;
		doc.open();
		doc.write(fullHTML);
		doc.close();

		setTimeout(() => iframeRef.current?.contentWindow?.print(), 700);
	};

	const escapeHtml = (text: string) => {
		const div = document.createElement("div");
		div.textContent = text;
		return div.innerHTML;
	};

	return (
		<div className="max-w-7xl mx-auto p-6 bg-white rounded-xl shadow border border-gray-200 text-sm">
			<h2 className={`text-xl font-bold mb-5 ${maroon}`}>
				POS Paid PIV Tabulation Summary Report (AFMHQ)
			</h2>

			<DateRangePicker
				fromDate={fromDate}
				toDate={toDate}
				onFromChange={setFromDate}
				onToChange={setToDate}
			/>

			<div className="mt-6">
				<ReusableCompanyList<CostCenter>
					fetchItems={fetchCostCenters}
					onViewItem={handleViewReport}
					idColumnTitle="Department Code"
					nameColumnTitle="Department Name"
					loadingMessage="Loading departments..."
					emptyMessage="No departments available."
				/>
			</div>

			{showReport && (
				<ReportViewer
					title="POS Paid PIV Tabulation Summary Report (AFMHQ)"
					subtitlebold="Paid Cost Centre :"
					subtitlenormal={`${selectedCostCenter?.id || ""} / ${selectedCostCenter?.name || ""}`}
					subtitlebold2="Period :"
					subtitlenormal2={`${fromDate} to ${toDate}`}
					currency="Currency: LKR"
					loading={reportLoading}
					hasData={pivotedRows.length > 0}
					handleDownloadCSV={handleDownloadCSV}
					printPDF={printPDF}
					closeReport={closeReport}
				>
					{pivotedRows.length > 0 && (
						<div className="overflow-x-auto">
							<table className="w-full text-xs min-w-max">
								<thead className={`${maroonGrad} text-white`}>
									<tr>
										<th className="px-3 py-2 text-left">
											Issued Division/Branch
										</th>
										{accountCodes.map((code) => (
											<th
												key={code}
												className="px-3 py-2 text-right"
											>
												{code}
											</th>
										))}
										<th className="px-3 py-2 text-right font-bold">
											Total
										</th>
									</tr>
								</thead>
								<tbody>
									{pivotedRows.map((row, i) => (
										<tr
											key={row.Company}
											className={`${i % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-gray-100`}
										>
											<td className="px-3 py-2 font-medium border-r border-gray-200">
												{row.Company}
											</td>
											{accountCodes.map((code) => (
												<td
													key={code}
													className="px-3 py-2 text-right border-r border-gray-200"
												>
													{formatNumber(
														row.amountsByCode[code] || 0,
													)}
												</td>
											))}
											<td className="px-3 py-2 text-right font-bold border-r border-gray-200">
												{formatNumber(row.total)}
											</td>
										</tr>
									))}

									<tr className="bg-blue-100 font-bold">
										<td className="px-3 py-2 text-left">
											GRAND TOTAL
										</td>
										{accountCodes.map((code) => (
											<td
												key={code}
												className="px-3 py-2 text-right"
											>
												{formatNumber(columnTotals[code] || 0)}
											</td>
										))}
										<td className="px-3 py-2 text-right">
											{formatNumber(grandTotal)}
										</td>
									</tr>
								</tbody>
							</table>
						</div>
					)}
				</ReportViewer>
			)}

			<iframe ref={iframeRef} className="hidden" title="print-frame" />
		</div>
	);
};

export default PosPaidPivTabulationSummaryAfmhq;
