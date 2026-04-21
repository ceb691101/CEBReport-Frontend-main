// File: PivSearchReport.tsx

import React, {useState, useRef} from "react";
import {useUser} from "../../contexts/UserContext";
import {toast} from "react-toastify";
import ReportViewer from "../../components/utils/ReportViewer";
import {Eye} from "lucide-react";

interface PivSearchItem {
	Piv_No: string;
	Reference_No: string;
	Cheque_No: string;
	Paid_Amount: number | null;
	Piv_Date: string | null;
	Paid_Date: string | null;
	Paid_Dept_Id: string;
	Payment_Mode: string;
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
	if (num == null) return "";
	return num.toLocaleString("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
};

const escapeHtml = (text: string | null | undefined): string => {
	if (text == null) return "";
	const div = document.createElement("div");
	div.textContent = text;
	return div.innerHTML;
};

const PivSearchReport: React.FC = () => {
	useUser();
	const iframeRef = useRef<HTMLIFrameElement>(null);

	const [piv, setPiv] = useState("");
	const [project, setProject] = useState("");
	const [reportData, setReportData] = useState<PivSearchItem | null>(null);
	const [reportLoading, setReportLoading] = useState(false);
	const [showReport, setShowReport] = useState(false);

	const maroon = "text-[#7A0000]";
	const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";

	const handleViewReport = async () => {
		if (!piv.trim() && !project.trim()) {
			toast.error("Please enter either PIV No or Project No");
			return;
		}

		setReportLoading(true);
		setReportData(null);
		setShowReport(true);

		try {
			let url = `/misapi/api/pivsearch/get`;
			const params = new URLSearchParams();
			if (piv.trim()) params.append("piv", piv.trim());
			if (project.trim()) params.append("project", project.trim());
			if (params.toString()) url += `?${params.toString()}`;

			const res = await fetch(url);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = await res.json();
			const items: PivSearchItem[] = Array.isArray(data)
				? data
				: data.data || [];

			if (items.length === 0) {
				toast.warn("No records found");
				setReportData(null);
			} else {
				// Take the first record (voucher format assumes one main record)
				setReportData(items[0]);
				toast.success("Report loaded successfully");
			}
		} catch (err: any) {
			toast.error("Failed to load report: " + err.message);
			setShowReport(false);
		} finally {
			setReportLoading(false);
		}
	};

	const closeReport = () => {
		setShowReport(false);
		setReportData(null);
		setPiv("");
		setProject("");
	};

	const printPDF = () => {
		if (!reportData || !iframeRef.current) return;

		const style = `
      body { font-family: Arial, sans-serif; margin: 30px; font-size: 14px; 
      -webkit-print-color-adjust: exact; /* Crucial for Chrome/Edge/Safari */
    print-color-adjust: exact;}
      .header { text-align: center; color: #7A0000; padding: 10px; font-size: 18px; font-weight: bold; }
      .subheader { text-align: center; font-size: 16px; margin: 20px 0; }
      table { width: 100%; border-collapse: collapse; margin-top: 20px; }
      td { border: 1px solid #000; padding: 10px; vertical-align: top; }
      .label { background-color: #f3f4f6; font-weight: bold; width: 180px; }
      .value { background-color: #fff; }
      .amount { text-align: right; font-weight: bold; }
      @page {  margin: 15mm;
  @bottom-left { content: "Printed on: ${new Date().toLocaleString()}"; font-size: 10px;  margin-bottom: 5mm;}
  @bottom-right { content: "Page " counter(page) " of " counter(pages); font-size: 10px;  margin-bottom: 5mm; }
} }
    `;

		const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Paying In Voucher</title>
<style>${style}</style>
</head>
<body>
  <div class="header">Paying In Voucher</div>
  <div class="subheader">
    PIV No : ${escapeHtml(piv)}<br/>
    Estimate No : ${escapeHtml(project || "")}
  </div>

  <table>
    <tr>
      <td class="label">PIV No.</td>
      <td class="value">${escapeHtml(reportData.Piv_No)}</td>
    </tr>
    <tr>
      <td class="label">Cheque No</td>
      <td class="value">${escapeHtml(reportData.Cheque_No || "")}</td>
    </tr>
    <tr>
      <td class="label">Estimate No</td>
      <td class="value">${escapeHtml(reportData.Reference_No || "")}</td>
    </tr>
    <tr>
      <td class="label">Payment Mode</td>
      <td class="value">${escapeHtml(reportData.Payment_Mode)}</td>
    </tr>
    <tr>
      <td class="label">Paid Date</td>
      <td class="value">${formatDate(reportData.Paid_Date)}</td>
    </tr>
    <tr>
      <td class="label">PIV Date</td>
      <td class="value">${formatDate(reportData.Piv_Date)}</td>
    </tr>
    <tr>
      <td class="label">Paid Dept Id</td>
      <td class="value">${escapeHtml(reportData.Paid_Dept_Id || "")}</td>
    </tr>
    <tr>
      <td class="label">Paid Amount</td>
      <td class="value amount">${formatNumber(reportData.Paid_Amount)}</td>
    </tr>
  </table>
</body>
</html>`;

		const doc = iframeRef.current!.contentDocument!;
		doc.open();
		doc.write(html);
		doc.close();
		setTimeout(() => iframeRef.current?.contentWindow?.print(), 800);
	};

	const handleDownloadCSV = () => {
		if (!reportData) return;

		const rows = [
			["Paying In Voucher"],
			[`PIV No : ${piv}`],
			[`Estimate No : ${project || ""}`],
			[],
			["Field", "Value"],
			["PIV No.", reportData.Piv_No],
			["Cheque No", reportData.Cheque_No || ""],
			["Estimate No", reportData.Reference_No || ""],
			["Payment Mode", reportData.Payment_Mode],
			["Paid Date", formatDate(reportData.Paid_Date)],
			["PIV Date", formatDate(reportData.Piv_Date)],
			["Paid Dept Id", reportData.Paid_Dept_Id || ""],
			["Paid Amount", formatNumber(reportData.Paid_Amount)],
		];

		const csvContent = rows
			.map((row) => row.map((cell) => `"${cell}"`).join(","))
			.join("\n");
		const blob = new Blob(["\uFEFF" + csvContent], {
			type: "text/csv;charset=utf-8;",
		});
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `Paying_In_Voucher_${reportData.Piv_No}.csv`;
		link.click();
		URL.revokeObjectURL(url);
	};

	return (
		<div className="max-w-7xl mx-auto p-6 bg-white rounded-xl shadow border border-gray-200 text-sm">
			<iframe ref={iframeRef} style={{display: "none"}} />

			<h2 className={`text-xl font-bold mb-6 ${maroon}`}>
				Paying In Voucher
			</h2>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
				<div>
					<label className={`block text-sm font-medium mb-1 ${maroon}`}>
						PIV No
					</label>
					<input
						type="text"
						value={piv}
						onChange={(e) => setPiv(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && handleViewReport()}
						className="w-full px-4 py-2 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7A0000]"
						placeholder="Enter PIV No"
					/>
				</div>

				<div>
					<label className={`block text-sm font-medium mb-1 ${maroon}`}>
						Project No
					</label>
					<input
						type="text"
						value={project}
						onChange={(e) => setProject(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && handleViewReport()}
						className="w-full px-4 py-2 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7A0000]"
						placeholder="Enter Project No"
					/>
				</div>

				<div className="flex items-end">
					<button
						onClick={handleViewReport}
						disabled={reportLoading}
						className={`px-4 py-2 rounded text-white font-medium ${maroonGrad} disabled:opacity-50 hover:brightness-110 flex items-center gap-2`}
					>
						<Eye className="w-4 h-4" />
						View
					</button>
				</div>
			</div>

			{showReport && (
				<ReportViewer
					title="Paying In Voucher"
					currency=""
					loading={reportLoading}
					hasData={!!reportData}
					handleDownloadCSV={handleDownloadCSV}
					printPDF={printPDF}
					closeReport={closeReport}
				>
					{reportData ? (
						<>
							<div className="text-center mb-8">
								<div className="text-base mt-4">
									<strong>PIV No :</strong> {piv}
									<br />
									<strong>Estimate No :</strong> {project || ""}
								</div>
							</div>

							<table className="w-full border-collapse">
								<tbody>
									<tr>
										<td className="bg-gray-100 font-bold border border-black px-4 py-2 w-48">
											PIV No.
										</td>
										<td className="border border-black px-4 py-3">
											{reportData.Piv_No}
										</td>
									</tr>
									<tr>
										<td className="bg-gray-100 font-bold border border-black px-4 py-3">
											Cheque No
										</td>
										<td className="border border-black px-4 py-3">
											{reportData.Cheque_No || ""}
										</td>
									</tr>
									<tr>
										<td className="bg-gray-100 font-bold border border-black px-4 py-3">
											Estimate No
										</td>
										<td className="border border-black px-4 py-3">
											{reportData.Reference_No || ""}
										</td>
									</tr>
									<tr>
										<td className="bg-gray-100 font-bold border border-black px-4 py-3">
											Payment Mode
										</td>
										<td className="border border-black px-4 py-3">
											{reportData.Payment_Mode}
										</td>
									</tr>
									<tr>
										<td className="bg-gray-100 font-bold border border-black px-4 py-3">
											Paid Date
										</td>
										<td className="border border-black px-4 py-3">
											{formatDate(reportData.Paid_Date)}
										</td>
									</tr>
									<tr>
										<td className="bg-gray-100 font-bold border border-black px-4 py-3">
											PIV Date
										</td>
										<td className="border border-black px-4 py-3">
											{formatDate(reportData.Piv_Date)}
										</td>
									</tr>
									<tr>
										<td className="bg-gray-100 font-bold border border-black px-4 py-3">
											Paid Dept Id
										</td>
										<td className="border border-black px-4 py-3">
											{reportData.Paid_Dept_Id || ""}
										</td>
									</tr>
									<tr>
										<td className="bg-gray-100 font-bold border border-black px-4 py-3">
											Paid Amount
										</td>
										<td className="border border-black px-4 py-3 text-right font-bold">
											{formatNumber(reportData.Paid_Amount)}
										</td>
									</tr>
								</tbody>
							</table>
						</>
					) : (
						<div className="text-center text-gray-500 py-10">
							No data found.
						</div>
					)}
				</ReportViewer>
			)}
		</div>
	);
};

export default PivSearchReport;
