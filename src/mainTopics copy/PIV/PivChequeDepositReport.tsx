// 11. PIV Details for Cheque Deposits/ Cheque No

// File: PivChequeDepositReport.tsx

import React, {useState, useRef} from "react";
import {useUser} from "../../contexts/UserContext";
import {toast} from "react-toastify";
import ReportViewer from "../../components/utils/ReportViewer";
import {Eye} from "lucide-react";

interface PivChequeDepositItem {
	Dept_Id: string;
	Province: string;
	Area: string;
	Application_No: string;
	Address: string;
	Id_No: string;
	Submit_Date: string | null;
	CCT_NAME: string;
	Tariff_Code: string;
	Phase: string;
	Piv_No: string;
	Paid_Date: string | null;
	Piv_Amount: number | null;
	Name: string;
	Cheque_No: string;
}

const formatDate = (dateStr: string | null): string => {
	if (!dateStr) return "";
	return new Date(dateStr).toLocaleDateString("en-GB", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	});
};

const formatNumber = (num: number | null | undefined): string => {
	if (num == null) return "0.00";
	return num.toLocaleString("en-US", {
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

const PivChequeDepositReport: React.FC = () => {
	useUser();
	const iframeRef = useRef<HTMLIFrameElement>(null);

	const [chequeNo, setChequeNo] = useState("");
	const [reportData, setReportData] = useState<PivChequeDepositItem[]>([]);
	const [reportLoading, setReportLoading] = useState(false);
	const [showReport, setShowReport] = useState(false);

	const maroon = "text-[#7A0000]";
	const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";

	// Calculate totals
	const totalAmount = reportData.reduce(
		(sum, item) => sum + (item.Piv_Amount || 0),
		0
	);

	const handleViewReport = async () => {
		if (!chequeNo.trim()) {
			toast.error("Please enter a Cheque No");
			return;
		}

		setReportLoading(true);
		setReportData([]);
		setShowReport(true);

		try {
			const url = `/misapi/api/pivchequedeposit/get?chequeNo=${encodeURIComponent(
				chequeNo.trim(),
			)}`;
			const res = await fetch(url);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = await res.json();
			const items: PivChequeDepositItem[] = Array.isArray(data)
				? data
				: data.data || [];
			setReportData(items);

			items.length === 0
				? toast.warn("No records found for this cheque number")
				: toast.success("Report loaded successfully");
		} catch (err: any) {
			toast.error("Failed to load report: " + err.message);
			setShowReport(false);
		} finally {
			setReportLoading(false);
		}
	};

	const closeReport = () => {
		setShowReport(false);
		setReportData([]);
		setChequeNo("");
	};

	const handleDownloadCSV = () => {
		if (reportData.length === 0) return;

		const headers = [
			"Item",
			"Province",
			"Area",
			"Dept Id",
			"Application No",
			"Applicant Name",
			"Applicant Service Address",
			"NIC No",
			"Submit Date",
			"Cost Center Name",
			"Tariff",
			"Phase",
			"PIV No",
			"PIV Paid Date",
			"PIV Amount",
		];

		const csvRows: string[] = [
			`"PIV Details for Cheque Deposits- Cheque No: " ${chequeNo.trim()}`,
			"Currency: LKR",
			"",
			headers.map(csvEscape).join(","),
		];

		reportData.forEach((item, index) => {
			const row = [
				index + 1,
				item.Province || "",
				item.Area || "",
				`="${item.Dept_Id ?? ""}"`,
				`="${item.Application_No ?? ""}"`,
				`="${item.Name ?? ""}"`,
				item.Address,
				`="${item.Id_No ?? ""}"`,
				`="${formatDate(item.Submit_Date)}"`,
				item.CCT_NAME,
				item.Tariff_Code,
				item.Phase,
				`="${item.Piv_No}"`,
				`="${formatDate(item.Paid_Date)}"`,
				formatNumber(item.Piv_Amount || 0.0),
			];
			csvRows.push(row.map(csvEscape).join(","));
		});

		// Total row

		csvRows.push(`"Total",,,,,,,,,,,,,,"${formatNumber(totalAmount)}"`);

		const csvContent = csvRows.join("\n");
		const blob = new Blob(["\uFEFF" + csvContent], {
			type: "text/csv;charset=utf-8;",
		});
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `PIV_Cheque_Deposit_${chequeNo.trim()}.csv`;
		link.click();
		URL.revokeObjectURL(url);
	};

	const printPDF = () => {
		if (reportData.length === 0 || !iframeRef.current) return;

		const tableStyle = `
      table { width: 100%; border-collapse: collapse; font-size: 10px; table-layout: fixed; }
      th, td { border: 1px solid #999; padding: 6px; word-wrap: break-word; vertical-align: top; }
      th {font-weight: bold; }
      .numeric { text-align: right; }
      .center { text-align: center; }
            .left { text-align: left; }

      .total-row { background-color: #f0f0f0 !important; font-weight: bold; }
      table, .total-row {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
    `;

		const colWidths = [
			"40px", // Item
			"80px", // Province
			"90px", // Area
			"80px", // Dept Id
			"140px", // App No
			"140px", // App name
			"220px", // Address
			"100px", // NIC
			"90px", // Submit Date
			"160px", // CCT Name
			"70px", // Tariff
			"50px", // Phase
			"160px", // PIV No
			"90px", // Paid Date
			"100px", // Amount
		];
		const colGroupHTML = colWidths
			.map((w) => `<col style="width: ${w};" />`)
			.join("");

		let bodyHTML = "";
		reportData.forEach((item, idx) => {
			bodyHTML += `<tr>
        <td class="center">${idx + 1}</td>
        <td>${escapeHtml(item.Province)}</td>
        <td>${escapeHtml(item.Area)}</td>
        <td class="center">${escapeHtml(item.Dept_Id)}</td>
        <td class="center">${escapeHtml(item.Application_No)}</td>
                <td class="center">${escapeHtml(item.Name)}</td>

        <td>${escapeHtml(item.Address)}</td>
        <td class="center">${escapeHtml(item.Id_No)}</td>
        <td class="center">${formatDate(item.Submit_Date)}</td>
        <td>${escapeHtml(item.CCT_NAME)}</td>
        <td class="center">${escapeHtml(item.Tariff_Code)}</td>
        <td class="center">${escapeHtml(item.Phase)}</td>
        <td class="center">${escapeHtml(item.Piv_No)}</td>
        <td class="center">${formatDate(item.Paid_Date)}</td>
        <td class="numeric">${formatNumber(item.Piv_Amount)}</td>
      </tr>`;
		});

		// Total row
		bodyHTML += `<tr class="total-row">
      <td colspan="14" class="left">Total</td>
      <td class="numeric">${formatNumber(totalAmount)}</td>
    </tr>`;

		const fullHTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>PIV Details for Cheque Deposits</title>
<style>${tableStyle}
body { font-family: Arial, sans-serif; margin: 15mm; }
h3 { text-align: center; color: #7A0000; font-size: 18px; font-weight: bold; margin-bottom: 15px; }
.subtitle-right { text-align: right; font-size: 14px; margin-bottom: 20px; }

@page { size: A3 landscape; margin: 5mm; }
@page {
  @bottom-left { content: "Printed on: ${new Date().toLocaleString()}"; font-size: 10px;  margin-bottom: 5mm;}
  @bottom-right { content: "Page " counter(page) " of " counter(pages); font-size: 10px;  margin-bottom: 5mm; }
}
</style>
</head>
<body>
<h3>PIV Details for Cheque Deposits - Cheque No: ${escapeHtml(
			chequeNo.trim()
		)}</h3>
          <div class="subtitle-right">
    <strong>Currency:</strong> LKR
  </div>
<table>
  <colgroup>${colGroupHTML}</colgroup>
  <thead>
    <tr>
      <th>Item</th>
      <th>Province</th>
      <th>Area</th>
      <th>Dept Id</th>
      <th>Application No</th>
      <th>Applicant Name</th>
      <th>Applicant Service Address</th>
      <th>NIC No</th>
      <th>Submit Date</th>
      <th>Cost Center Name</th>
      <th>Tariff</th>
      <th>Phase</th>
      <th>PIV No</th>
      <th>PIV Paid Date</th>
      <th>PIV Amount</th>
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

			<h2 className={`text-xl font-bold mb-6 ${maroon}`}>
				PIV Details for Cheque Deposits
			</h2>

			<div className="flex items-end gap-4 mb-8 align-right">
				<div className="flex-1 max-w-xs">
					<label className={`block text-sm font-medium  mb-1 ${maroon}`}>
						Cheque No
					</label>
					<input
						type="text"
						value={chequeNo}
						onChange={(e) => setChequeNo(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && handleViewReport()}
						className="w-full  px-4 py-2 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7A0000]"
						placeholder="Enter cheque number"
					/>
				</div>

				<button
					onClick={handleViewReport}
					disabled={reportLoading}
					className={`px-4 py-2 rounded text-white font-medium ${maroonGrad} disabled:opacity-50 hover:brightness-110 flex items-center gap-2`}
				>
					<Eye className="w-4 h-4" />
					View
				</button>
			</div>

			{showReport && (
				<ReportViewer
					title={`PIV Details for Cheque Deposits - Cheque No: ${chequeNo.trim()}`}
					loading={reportLoading}
					hasData={reportData.length > 0}
					handleDownloadCSV={handleDownloadCSV}
					printPDF={printPDF}
					closeReport={closeReport}
				>
					<table className="w-full text-xs">
						<thead className={`${maroonGrad} text-white`}>
							<tr>
								<th className="border border-gray-400 px-2 py-3 text-center whitespace-nowrap">
									Item
								</th>
								<th className="border border-gray-400 px-2 py-3 text-center whitespace-nowrap">
									Province
								</th>
								<th className="border border-gray-400 px-2 py-3 text-center whitespace-nowrap">
									Area
								</th>
								<th className="border border-gray-400 px-2 py-3 text-center whitespace-nowrap">
									Dept Id
								</th>
								<th className="border border-gray-400 px-2 py-3 text-center whitespace-nowrap">
									Application No
								</th>
								<th className="border border-gray-400 px-2 py-3 text-left whitespace-nowrap">
									Applicant Name
								</th>
								<th className="border border-gray-400 px-2 py-3 text-left whitespace-nowrap">
									Applicant Service Address
								</th>
								<th className="border border-gray-400 px-2 py-3 text-center whitespace-nowrap">
									NIC No
								</th>
								<th className="border border-gray-400 px-2 py-3 text-center whitespace-nowrap">
									Submit Date
								</th>
								<th className="border border-gray-400 px-2 py-3 text-left whitespace-nowrap">
									Cost Center Name
								</th>
								<th className="border border-gray-400 px-2 py-3 text-center whitespace-nowrap">
									Tariff
								</th>
								<th className="border border-gray-400 px-2 py-3 text-center whitespace-nowrap">
									Phase
								</th>
								<th className="border border-gray-400 px-2 py-3 text-center whitespace-nowrap">
									PIV No
								</th>
								<th className="border border-gray-400 px-2 py-3 text-center whitespace-nowrap">
									PIV Paid Date
								</th>
								<th className="border border-gray-400 px-2 py-3 text-right whitespace-nowrap">
									PIV Amount
								</th>
							</tr>
						</thead>
						<tbody>
							{reportData.map((item, idx) => (
								<tr
									key={idx}
									className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
								>
									<td className="border border-gray-300 px-2 py-2 text-center">
										{idx + 1}
									</td>
									<td className="border border-gray-300 px-2 py-2">
										{item.Province || ""}
									</td>
									<td className="border border-gray-300 px-2 py-2">
										{item.Area || ""}
									</td>
									<td className="border border-gray-300 px-2 py-2 text-center">
										{item.Dept_Id}
									</td>
									<td className="border border-gray-300 px-2 py-2 text-center">
										{item.Application_No}
									</td>
									<td className="border border-gray-300 px-2 py-2 whitespace-nowrap">
										{item.Name}
									</td>
									<td className="border border-gray-300 px-2 py-2">
										{item.Address}
									</td>
									<td className="border border-gray-300 px-2 py-2 text-center">
										{item.Id_No}
									</td>
									<td className="border border-gray-300 px-2 py-2 text-center">
										{formatDate(item.Submit_Date)}
									</td>
									<td className="border border-gray-300 px-2 py-2 whitespace-nowrap">
										{item.CCT_NAME}
									</td>
									<td className="border border-gray-300 px-2 py-2 text-center">
										{item.Tariff_Code}
									</td>
									<td className="border border-gray-300 px-2 py-2 text-center">
										{item.Phase}
									</td>
									<td className="border border-gray-300 px-2 py-2 text-center">
										{item.Piv_No}
									</td>
									<td className="border border-gray-300 px-2 py-2 text-center">
										{formatDate(item.Paid_Date)}
									</td>
									<td className="border border-gray-300 px-2 py-2 text-right">
										{formatNumber(item.Piv_Amount)}
									</td>
								</tr>
							))}
							{/* Total Row */}
							<tr className="bg-gray-200 font-bold">
								<td
									colSpan={14}
									className="border border-gray-400 px-4 py-3 text-left"
								>
									Total
								</td>
								<td className="border border-gray-400 px-4 py-3 text-right">
									{formatNumber(totalAmount)}
								</td>
							</tr>
						</tbody>
					</table>
				</ReportViewer>
			)}
		</div>
	);
};

export default PivChequeDepositReport;
