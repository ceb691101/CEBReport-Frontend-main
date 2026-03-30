// File: PivBySLT.tsx
import React, {useState, useMemo, useRef} from "react";
import {Eye} from "lucide-react";
import {useUser} from "../../contexts/UserContext";
import {toast} from "react-toastify";
import DateRangePicker from "../../components/utils/DateRangePicker";
import ReportViewer from "../../components/utils/ReportViewer";

interface PIVItem {
	Cost_center_ID: string;
	Account_Code: string;
	Amount: number;
	Cost_center_Name: string;
	Company_name: string;
}

const formatNumber = (num: number | null | undefined): string => {
	if (num == null || isNaN(num)) return "0.00";

	const absNum = Math.abs(num);
	const formatted = new Intl.NumberFormat("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(absNum);

	if (num < 0) {
		return `(${formatted})`;
	}
	return formatted;
};

const csvEscape = (val: string | number | null | undefined): string => {
	if (val == null) return '""';
	const str = String(val);
	if (/[,\n"']/.test(str)) return `"${str.replace(/"/g, '""')}"`;
	return str;
};

const PivBySLT: React.FC = () => {
	useUser();

	const [fromDate, setFromDate] = useState("");
	const [toDate, setToDate] = useState("");
	const [reportData, setReportData] = useState<PIVItem[]>([]);
	const [reportLoading, setReportLoading] = useState(false);
	const [showReport, setShowReport] = useState(false);
	const iframeRef = useRef<HTMLIFrameElement>(null);

	const maroon = "text-[#7A0000]";
	const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";

	// Unique sorted account codes for dynamic columns
	const accountCodes = useMemo(() => {
		return Array.from(new Set(reportData.map((i) => i.Account_Code))).sort();
	}, [reportData]);

	// Hierarchical grouping: first by Company, then by Cost Center + calculate company totals
	const groupedData = useMemo(() => {
		type CostCenter = {
			id: string;
			name: string;
			amounts: Record<string, number>;
		};
		type CompanyGroup = {
			costCenters: CostCenter[];
			companyTotals: Record<string, number>;
			companyRowTotal: number;
		};

		const companyMap = new Map<string, CompanyGroup>();

		reportData.forEach((item) => {
			const company = item.Company_name.trim() || "No Company";

			if (!companyMap.has(company)) {
				companyMap.set(company, {
					costCenters: [],
					companyTotals: {},
					companyRowTotal: 0,
				});
			}

			const group = companyMap.get(company)!;

			// Add to company totals
			group.companyTotals[item.Account_Code] =
				(group.companyTotals[item.Account_Code] || 0) + item.Amount;

			const ccKey = `${item.Cost_center_ID}|||${item.Cost_center_Name}`;
			let cc = group.costCenters.find(
				(c) => `${c.id}|||${c.name}` === ccKey
			);

			if (!cc) {
				cc = {
					id: item.Cost_center_ID,
					name: item.Cost_center_Name,
					amounts: {},
				};
				group.costCenters.push(cc);
			}

			cc.amounts[item.Account_Code] =
				(cc.amounts[item.Account_Code] || 0) + item.Amount;
		});

		// Calculate company row total
		companyMap.forEach((group) => {
			group.companyRowTotal = Object.values(group.companyTotals).reduce(
				(a, b) => a + b,
				0
			);
		});

		// Sort companies alphabetically
		const sortedCompanies = Array.from(companyMap.entries()).sort(
			([a], [b]) => a.localeCompare(b)
		);

		return sortedCompanies;
	}, [reportData]);

	// Grand total per account code
	const columnTotals = useMemo(() => {
		const totals: Record<string, number> = {};
		accountCodes.forEach((code) => {
			totals[code] = reportData
				.filter((i) => i.Account_Code === code)
				.reduce((sum, i) => sum + i.Amount, 0);
		});
		return totals;
	}, [reportData, accountCodes]);

	const handleViewReport = async () => {
		if (!fromDate || !toDate) return toast.error("Please select both dates");
		if (new Date(toDate) < new Date(fromDate))
			return toast.error("To Date cannot be earlier than From Date");

		setReportLoading(true);
		setReportData([]);
		setShowReport(true);

		try {
			const url = `/misapi/api/pivbyslt/get?fromDate=${fromDate.replace(
				/-/g,
				""
			)}&toDate=${toDate.replace(/-/g, "")}`;
			const res = await fetch(url);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = await res.json();
			const items: PIVItem[] = Array.isArray(data) ? data : data.data || [];
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
	};

	// CSV Export - now includes company total row
	const handleDownloadCSV = () => {
		if (reportData.length === 0) return;

		const headers = [
			"Company",
			"Issued Cost Center",
			...accountCodes,
			"Total",
		];

		const csvRows: string[] = [
			"PIV Collections by IPG (SLT)",
			`Period: ${fromDate} To ${toDate}`,
			"Currency: LKR",
			"",
			headers.map(csvEscape).join(","),
		];

		groupedData.forEach(([company, group]) => {
			const {costCenters, companyTotals, companyRowTotal} = group;

			costCenters.forEach((cc) => {
				const rowTotal = Object.values(cc.amounts).reduce(
					(a, b) => a + b,
					0
				);
				const row = [
					company,
					`${cc.id} - ${cc.name}`,
					...accountCodes.map((code) =>
						formatNumber(cc.amounts[code] || 0)
					),
					formatNumber(rowTotal),
				];
				csvRows.push(row.map(csvEscape).join(","));
			});

			// Company Total Row
			const companyTotalRow = [
				`Total of : ${company}`,
				"",
				...accountCodes.map((code) =>
					formatNumber(companyTotals[code] || 0)
				),
				formatNumber(companyRowTotal),
			];
			csvRows.push(companyTotalRow.map(csvEscape).join(","));

			csvRows.push(""); // blank line after company total
		});

		const grandTotal = Object.values(columnTotals).reduce((a, b) => a + b, 0);
		const grandRow = [
			"GRAND TOTAL",
			"",
			...accountCodes.map((c) => formatNumber(columnTotals[c] || 0)),
			formatNumber(grandTotal),
		];
		csvRows.push(grandRow.map(csvEscape).join(","));

		const csvContent = csvRows.join("\n");
		const blob = new Blob(["\uFEFF" + csvContent], {
			type: "text/csv;charset=utf-8;",
		});
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `PIV_Collections_by_ipg(slt)_${fromDate}_to_${toDate}.csv`;
		link.click();
		URL.revokeObjectURL(url);
	};

	// Print PDF - now includes company total row
	const printPDF = () => {
		if (reportData.length === 0 || !iframeRef.current) return;

		const totalDynamicColumns = accountCodes.length;
		const fixedColumns = 2;
		const totalColumns = fixedColumns + totalDynamicColumns + 1;

		let fontSize = "10px";
		let headerFontSize = "11px";
		let titleFontSize = "14px";
		let padding = "8px";
		let numericColWidth = "90px";
		let companyColWidth = "200px";
		let issuedColWidth = "250px";

		if (totalColumns > 28) {
			fontSize = "4px";
			headerFontSize = "4px";
			padding = "1px";
			numericColWidth = "30px";
			companyColWidth = "20px";
			issuedColWidth = "50px";
		} else if (totalColumns > 15) {
			fontSize = "8px";
			headerFontSize = "9px";
			numericColWidth = "70px";
			companyColWidth = "150px";
			issuedColWidth = "200px";
		}

		const tableStyle = `
      table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: ${fontSize}; }
      th, td { border: 1px solid #aaa; padding: ${padding}; word-wrap: break-word; vertical-align: top; }
      th { font-size: ${headerFontSize}; font-weight: bold; }
      .numeric { text-align: right !important; }
      .company-header { background-color: #e0e0e0 !important; font-weight: bold; text-align: left !important; }
      .company-total { background-color: #d0d0d0 !important; font-weight: bold; }
    `;

		const colGroupHTML = `
      <colgroup>
        <col style="width: ${companyColWidth};" />
        <col style="width: ${issuedColWidth};" />
        ${accountCodes
				.map(() => `<col style="width: ${numericColWidth};" />`)
				.join("")}
        <col style="width: ${numericColWidth}; background-color: #ffebee;" />
      </colgroup>
    `;

		let bodyHTML = "";

		groupedData.forEach(([company, group]) => {
			const {costCenters, companyTotals, companyRowTotal} = group;
			const companyRowSpan = costCenters.length;

			costCenters.forEach((cc, idx) => {
				const rowTotal = Object.values(cc.amounts).reduce(
					(a, b) => a + b,
					0
				);

				bodyHTML += `<tr class="${
					idx % 2 === 0 ? "bg-white" : "bg-gray-50"
				}">
          ${
					idx === 0
						? `<td rowspan="${companyRowSpan}" class="company-header">${escapeHtml(
								company
						  )}</td>`
						: ""
				}
          <td>${escapeHtml(`${cc.id} - ${cc.name}`)}</td>
          ${accountCodes
					.map(
						(code) =>
							`<td class="numeric">${formatNumber(
								cc.amounts[code] || 0
							)}</td>`
					)
					.join("")}
          <td class="numeric">${formatNumber(rowTotal)}</td>
        </tr>`;
			});

			// Company Total Row
			bodyHTML += `<tr class="company-total">
          <td colspan="2" style="text-align: left; padding-left: 12px;">Total of : ${escapeHtml(
					company
				)}</td>
          ${accountCodes
					.map(
						(code) =>
							`<td class="numeric">${formatNumber(
								companyTotals[code] || 0
							)}</td>`
					)
					.join("")}
          <td class="numeric">${formatNumber(companyRowTotal)}</td>
        </tr>`;

			bodyHTML += `<tr><td colspan="${totalColumns}" style="height: 12px; background: white;"></td></tr>`;
		});

		const grandRowTotal = Object.values(columnTotals).reduce(
			(a, b) => a + b,
			0
		);
		bodyHTML += `
      <tr style="background-color: #bfdbfe; font-weight: bold;">
        <td colspan="2" style="text-align: left; padding-left: 12px;">GRAND TOTAL</td>
        ${accountCodes
				.map(
					(code) =>
						`<td class="numeric font-bold">${formatNumber(
							columnTotals[code] || 0
						)}</td>`
				)
				.join("")}
        <td class="numeric font-bold">${formatNumber(grandRowTotal)}</td>
      </tr>`;

		const headerHTML = `
      <thead>
        <tr style="background-color: white;">
          <th>Company</th>
          <th>Issued Cost Center</th>
          ${accountCodes.map((c) => `<th>${escapeHtml(c)}</th>`).join("")}
          <th>Total</th>
        </tr>
      </thead>`;

		const fullHTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>PIV Collections by IPG (SLT)</title>
<style>${tableStyle}
body { font-family: Arial, sans-serif; margin: 8mm; print-color-adjust: exact; }
h3 { text-align: center; color: #7A0000; font-size: ${titleFontSize}; font-weight: bold; margin: 0 0 4px 0; }
.subtitles {display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 11px;}
.subtitle-left{ text-align: left; }
.subtitle-right{ text-align: right; }
@page { size: A3 landscape; margin: 10mm; }
@page { 
  @bottom-left { content: "Printed on: ${new Date().toLocaleString()}"; font-size: 9px; color: #666; }
  @bottom-right { content: "Page " counter(page) " of " counter(pages); font-size: 9px; color: #666; }
}
</style>
</head>
<body>
<h3>PIV Collections by IPG (SLT)</h3>
<div class="subtitles">
  <div class="subtitle-left">
    <strong>Period :</strong> ${fromDate} to ${toDate}
  </div>
  <div class="subtitle-right">
    <strong>Currency:</strong> LKR
  </div>
</div>
<table>${colGroupHTML}${headerHTML}<tbody>${bodyHTML}</tbody></table>
</body>
</html>`;

		const doc = iframeRef.current!.contentDocument!;
		doc.open();
		doc.write(fullHTML);
		doc.close();

		setTimeout(() => iframeRef.current?.contentWindow?.print(), 1000);
	};

	const escapeHtml = (text: string) => {
		const div = document.createElement("div");
		div.textContent = text;
		return div.innerHTML;
	};

	return (
		<div className="max-w-7xl mx-auto p-6 bg-white rounded-xl shadow border border-gray-200 text-sm">
			<iframe ref={iframeRef} style={{ display: "none" }} />
			<h2 className={`text-xl font-bold mb-4 ${maroon}`}>
				PIV Collections by IPG (SLT)
			</h2>

			{/* Date Range Picker and View Button */}
			<div className="flex justify-end items-center gap-6 mb-6">
				<DateRangePicker
					fromDate={fromDate}
					toDate={toDate}
					onFromChange={setFromDate}
					onToChange={setToDate}
				/>
				<button
					onClick={handleViewReport}
					disabled={!fromDate || !toDate || reportLoading}
					className={`px-4 py-1.5 rounded text-white font-medium ${maroonGrad} disabled:opacity-50 hover:brightness-110 flex items-center gap-2`}
				>
					<Eye className="w-4 h-4" />
					View
				</button>
			</div>

			{/* Report Modal */}
			{showReport && (
				
  <ReportViewer
    title="PIV Collections by IPG (SLT)"
    subtitlebold3="Period:"
    subtitlenormal3={`${fromDate} to ${toDate}`}
    currency="Currency: LKR"
    loading={reportLoading}
    hasData={reportData.length > 0}
    handleDownloadCSV={handleDownloadCSV}
    printPDF={printPDF}
    closeReport={closeReport}
  >
    {/* This is the actual table content */}
    <table className="w-full text-xs min-w-max">
      <thead className={`${maroonGrad} text-white`}>
        <tr>
          <th className="px-3 py-2">Company</th>
          <th className="px-3 py-2">Issued Cost Center</th>
          {accountCodes.map((acc) => (
            <th key={acc} className="px-3 py-2 text-right">
              {acc}
            </th>
          ))}
          <th className="px-3 py-2 text-right font-bold">Total</th>
        </tr>
      </thead>
      <tbody>
        {groupedData.map(([company, group]) => {
          const { costCenters, companyTotals, companyRowTotal } = group;
          return (
            <React.Fragment key={company}>
              {costCenters.map((cc, idx) => {
                const rowTotal = Object.values(cc.amounts).reduce((a, b) => a + b, 0);

                return (
                  <tr
                    key={`${company}-${cc.id}`}
                    className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                  >
                    {idx === 0 && (
                      <td
                        rowSpan={costCenters.length}
                        className="px-3 py-2 font-bold bg-gray-200 border border-gray-300 align-top"
                      >
                        {company}
                      </td>
                    )}
                    <td className="px-3 py-2 font-medium border border-gray-300">
                      {cc.id} - {cc.name}
                    </td>
                    {accountCodes.map((code) => (
                      <td
                        key={code}
                        className="px-3 py-2 text-right border border-gray-300"
                      >
                        {formatNumber(cc.amounts[code] || 0)}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right font-bold border border-gray-300">
                      {formatNumber(rowTotal)}
                    </td>
                  </tr>
                );
              })}

              {/* Company Total Row */}
              <tr className="bg-gray-300 font-bold">
                <td
                  colSpan={2}
                  className="px-3 py-2 border border-gray-300 text-left"
                >
                  Total of : {company}
                </td>
                {accountCodes.map((code) => (
                  <td
                    key={code}
                    className="px-3 py-2 text-right border border-gray-300"
                  >
                    {formatNumber(companyTotals[code] || 0)}
                  </td>
                ))}
                <td className="px-3 py-2 text-right border border-gray-300">
                  {formatNumber(companyRowTotal)}
                </td>
              </tr>

              <tr>
                <td colSpan={3 + accountCodes.length} className="h-4"></td>
              </tr>
            </React.Fragment>
          );
        })}

        {/* Grand Total */}
        <tr className="bg-blue-200 font-bold text-sm">
          <td colSpan={2} className="px-3 py-2 border border-white text-left">
            GRAND TOTAL
          </td>
          {accountCodes.map((code) => (
            <td
              key={code}
              className="px-3 py-2 text-right border border-white"
            >
              {formatNumber(columnTotals[code] || 0)}
            </td>
          ))}
          <td className="px-3 py-2 text-right border border-white">
            {formatNumber(
              Object.values(columnTotals).reduce((a, b) => a + b, 0)
            )}
          </td>
        </tr>
      </tbody>
    </table>
  </ReportViewer>
)}
							
		</div>
	);
};

export default PivBySLT;
