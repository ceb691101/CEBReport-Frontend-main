import React, {useEffect, useState, useRef} from "react";
import {Search, RotateCcw, Eye, X, Download, Printer} from "lucide-react";
import {useUser} from "../../contexts/UserContext";
import {toast} from "react-toastify";

interface Department {
	DeptId: string;
	DeptName: string;
}

interface JobcardModel {
	ProjectNo: string;
	CommitedCost: number;
	Description: string;
	EstimatedCost: number;
	FundSource: string;
	EstimateNo: string;
	ProjectAssignedDate: string | null;
	Status: string;
	LogYear: number;
	LogMonth: number;
	DocumentProfile: string;
	DocumentNo: string;
	AccDate: string | null;
	SequenceNo: number;
	TrxAmt: number;
	ResType: string;
}

// Format number: negative values in parentheses
const formatNumber = (num: number): string => {
	const abs = Math.abs(num).toLocaleString("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
	return num < 0 ? `(${abs})` : abs;
};

// JobCardTable Component
const JobCardTable: React.FC<{
	jobCards: JobcardModel[];
	loading: boolean;
	error: string | null;
	departmentName: string;
	onClose: () => void;
}> = ({jobCards, loading, error, departmentName, onClose}) => {
	const maroon = "text-[#7A0000]";
	const iframeRef = useRef<HTMLIFrameElement | null>(null);

	// Print in landscape (fixed)
	const printPDF = (jobCards: JobcardModel[], _departmentName: string) => {
		if (!jobCards || jobCards.length === 0) return;

		const firstJob = jobCards[0];
		const variance = firstJob.EstimatedCost - firstJob.CommitedCost;
		const variancePercent =
			firstJob.EstimatedCost !== 0
				? ((variance / firstJob.EstimatedCost) * 100).toFixed(2)
				: "0.00";

		// Group job cards
		const groupedJobCards = jobCards.reduce((acc, job, index) => {
			const key = `${job.LogYear}-${job.DocumentProfile}-${job.DocumentNo}-${
				job.AccDate || "-"
			}`;
			if (!acc[key]) {
				acc[key] = {jobs: [], firstIndex: index};
			}
			acc[key].jobs.push(job);
			return acc;
		}, {} as Record<string, {jobs: JobcardModel[]; firstIndex: number}>);

		const sortedGroups = Object.values(groupedJobCards).sort(
			(a, b) => a.firstIndex - b.firstIndex
		);

		const totals = jobCards.reduce(
			(acc, job) => {
				const resType = job.ResType.toUpperCase();
				if (resType === "LABOUR") acc.lab += job.TrxAmt;
				else if (resType === "MATERIAL") acc.mat += job.TrxAmt;
				else if (resType === "OTHER") acc.other += job.TrxAmt;
				acc.total += job.TrxAmt;
				return acc;
			},
			{lab: 0, mat: 0, other: 0, total: 0}
		);

		// Landscape column widths
		const columnWidths = {
			year: "w-[6%]",
			month: "w-[6%]",
			docProfile: "w-[16%]",
			docNo: "w-[16%]",
			date: "w-[9%]",
			seqNo: "w-[7%]",
			lab: "w-[10%]",
			mat: "w-[10%]",
			other: "w-[10%]",
			total: "w-[10%]",
		};

		let tableRowsHTML = "";
		sortedGroups.forEach((group, groupIndex) => {
			const sortedJobs = [...group.jobs].sort(
				(a, b) => a.SequenceNo - b.SequenceNo
			);
			sortedJobs.forEach((job, jobIndex) => {
				const lab = job.ResType.toUpperCase() === "LABOUR" ? job.TrxAmt : 0;
				const mat =
					job.ResType.toUpperCase() === "MATERIAL" ? job.TrxAmt : 0;
				const other =
					job.ResType.toUpperCase() === "OTHER" ? job.TrxAmt : 0;
				const total = lab + mat + other;
				const isFirstInGroup = jobIndex === 0;
				const isLastInGroup = jobIndex === sortedJobs.length - 1;

				tableRowsHTML += `
          <tr class="${groupIndex % 2 ? "bg-white" : "bg-gray-50"}">
            <td class="${
					columnWidths.year
				} p-1 border border-gray-300 text-left">${
					isFirstInGroup ? job.LogYear : ""
				}</td>
            <td class="${
					columnWidths.month
				} p-1 border border-gray-300 text-left">${
					isFirstInGroup ? job.LogMonth : ""
				}</td>
            <td class="${
					columnWidths.docProfile
				} p-1 border border-gray-300 text-left break-words">${
					isFirstInGroup ? job.DocumentProfile.trim() : ""
				}</td>
            <td class="${
					columnWidths.docNo
				} p-1 border border-gray-300 text-left break-words">${
					isFirstInGroup ? job.DocumentNo.trim() : ""
				}</td>
            <td class="${
					columnWidths.date
				} p-1 border border-gray-300 text-left">${
					isFirstInGroup && job.AccDate
						? new Date(job.AccDate).toLocaleDateString("en-GB", {
								day: "2-digit",
								month: "2-digit",
								year: "numeric",
						  })
						: isFirstInGroup
						? "-"
						: ""
				}</td>
            <td class="${
					columnWidths.seqNo
				} p-1 border border-gray-300 text-right">${job.SequenceNo}</td>
            <td class="${
					columnWidths.lab
				} p-1 border border-gray-300 text-right font-mono">${formatNumber(
					lab
				)}</td>
            <td class="${
					columnWidths.mat
				} p-1 border border-gray-300 text-right font-mono">${formatNumber(
					mat
				)}</td>
            <td class="${
					columnWidths.other
				} p-1 border border-gray-300 text-right font-mono">${formatNumber(
					other
				)}</td>
            <td class="${
					columnWidths.total
				} p-1 border border-gray-300 text-right font-mono">${formatNumber(
					total
				)}</td>
          </tr>
        `;
				if (isLastInGroup && groupIndex < sortedGroups.length - 1) {
					tableRowsHTML += `
            <tr>
              <td colspan="10" class="border-t border-gray-300"></td>
            </tr>
          `;
				}
			});
		});

		// Totals row
		tableRowsHTML += `
      <tr class="bg-gray-200 font-bold">
        <td colspan="6" class="p-1 border border-gray-300 text-right ">Total</td>
        <td class="p-1 border border-gray-300 text-right font-mono">${formatNumber(
				totals.lab
			)}</td>
        <td class="p-1 border border-gray-300 text-right font-mono">${formatNumber(
				totals.mat
			)}</td>
        <td class="p-1 border border-gray-300 text-right font-mono">${formatNumber(
				totals.other
			)}</td>
        <td class="p-1 border border-gray-300 text-right font-mono">${formatNumber(
				totals.total
			)}</td>
      </tr>
    `;

		const htmlContent = `
      <html>
  <head>
    <style>
      @media print {
        @page { margin: 20mm 15mm 25mm 15mm; }
        body { margin: 0; font-family: Arial, sans-serif; }
        .print-container { width: 100%; margin: 0; padding: 0; }
        .print-header { margin-bottom: 2.5rem; margin-top: 3rem; margin-left: 2rem; font-size: 1.125rem; text-align: center; }
        .print-header h2 { font-weight: bold; color: #7A0000; }
        .print-summary { display: flex; justify-content: space-between; margin-left: 1rem; margin-right: 1rem; font-size: 0.875rem; margin-bottom: 0; }
        .print-summary div { flex: 1; }
        .print-summary p { margin: 0.125rem 0; }
        .print-summary .font-bold { font-weight: bold; }
        .print-project-scope { width: 90%; margin: 0.5rem 1rem 1.5rem 1rem; font-size: 0.875rem; text-align: left; word-wrap: break-word; }
        .print-project-scope .font-bold { font-weight: bold; }
        .print-currency { text-align: right; font-size: 0.875rem; font-weight: 600; color: #4B5563; margin-bottom: 1.25rem; margin-right: 2rem; }
        table.print-table { border-collapse: collapse; width: 100%; margin-left: 0; margin-right: 3rem; }
        table.print-table th, table.print-table td { border: 1px solid #D1D5DB; padding: 0.25rem; font-size: 0.75rem; }
        table.print-table th { background: linear-gradient(to right, #7A0000, #A52A2A);  text-align: center; }
        table.print-table td { text-align: right; }
        table.print-table tr.bg-white { background-color: #fff; }
        table.print-table tr.bg-gray-50 { background-color: #F9FAFB; }
        table.print-table tr.bg-gray-200 { background-color: #E5E7EB; }
        table.print-table tr { page-break-inside: avoid; }
        thead { display: table-header-group; }
        @page {
          @bottom-left { content: "Printed on: ${new Date().toLocaleString(
					"en-US",
					{timeZone: "Asia/Colombo"}
				)}"; font-size: 0.75rem; color: gray; }
          @bottom-right { content: "Page " counter(page) " of " counter(pages); font-size: 0.75rem; color: gray; }
        }
      }
    </style>
  </head>
  <body>
    <div class="print-container">
      <div class="print-header">
        <h2>Job Card</h2>
      </div>
      <div class="print-summary">
        <div>
          <p><span class="font-bold">Project No.</span> ${firstJob.ProjectNo.trim()}</p>
          <p><span class="font-bold">Estimated Cost:</span> ${formatNumber(
					firstJob.EstimatedCost
				)}</p>
          <p><span class="font-bold">Committed Cost:</span> ${formatNumber(
					firstJob.CommitedCost
				)}</p>
          <p><span class="font-bold">Variance in Rs.:</span> ${formatNumber(
					variance
				)}</p>
          <p><span class="font-bold">Variance in %:</span> ${variancePercent}</p>
        </div>
        <div>
          <p><span class="font-bold">Fund Source:</span> ${firstJob.FundSource.trim()}</p>
          <p><span class="font-bold">Job Status:</span> ${firstJob.Status.trim()}</p>
          <p><span class="font-bold">Estimate No:</span> ${firstJob.EstimateNo.trim()}</p>
          <p><span class="font-bold">Job Assigned Date:</span> ${
					firstJob.ProjectAssignedDate
						? new Date(firstJob.ProjectAssignedDate).toLocaleDateString(
								"en-GB",
								{
									day: "2-digit",
									month: "2-digit",
									year: "numeric",
								}
						  )
						: "-"
				}</p>
        </div>
      </div>
      <div class="print-project-scope">
        <p><span class="font-bold">Scope of the Project:</span> ${firstJob.Description.trim()}</p>
      </div>
      <div class="print-currency">Currency: LKR</div>
      <table class="print-table">
        <thead>
          <tr>
            <th class="${columnWidths.year}">Year</th>
            <th class="${columnWidths.month}">Month</th>
            <th class="${columnWidths.docProfile}">Document Profile</th>
            <th class="${columnWidths.docNo}">Document No.</th>
            <th class="${columnWidths.date}">Date</th>
            <th class="${columnWidths.seqNo}">Sequence No.</th>
            <th class="${columnWidths.lab}">LAB</th>
            <th class="${columnWidths.mat}">MAT</th>
            <th class="${columnWidths.other}">OTHER</th>
            <th class="${columnWidths.total}">Total</th>
          </tr>
        </thead>
        <tbody>
          ${tableRowsHTML}
        </tbody>
      </table>
    </div>
  </body>
</html>
    `;

		if (iframeRef.current) {
			const iframeDoc =
				iframeRef.current.contentDocument ||
				iframeRef.current.contentWindow?.document;
			if (iframeDoc) {
				iframeDoc.open();
				iframeDoc.write(htmlContent);
				iframeDoc.close();
				iframeRef.current.contentWindow?.print();
			}
		}
	};

	// CSV Download
	const handleDownloadCSV = () => {
		if (jobCards.length === 0) return;

		const firstJob = jobCards[0];
		const titleRows = [
			`Job Card Report`,
			`Department: ${departmentName}`,
			`Project No: ${firstJob.ProjectNo.trim()}`,
			"",
		];

		const headers = [
			"Year",
			"Month",
			"Document Profile",
			"Document No.",
			"Date",
			"Sequence No.",
			"LAB",
			"MAT",
			"OTHER",
			"Total",
		];

		const csvContent = [
			...titleRows,
			headers.join(","),
			...jobCards.map((job) => {
				const lab = job.ResType.toUpperCase() === "LABOUR" ? job.TrxAmt : 0;
				const mat =
					job.ResType.toUpperCase() === "MATERIAL" ? job.TrxAmt : 0;
				const other =
					job.ResType.toUpperCase() === "OTHER" ? job.TrxAmt : 0;
				const total = lab + mat + other;
				return [
					job.LogYear,
					job.LogMonth,
					`"${job.DocumentProfile.trim()}"`,
					`"${job.DocumentNo.trim()}"`,
					job.AccDate ? new Date(job.AccDate).toLocaleDateString() : "-",
					job.SequenceNo,
					`"${formatNumber(lab)}"`,
					`"${formatNumber(mat)}"`,
					`"${formatNumber(other)}"`,
					`"${formatNumber(total)}"`,
				].join(",");
			}),
			[
				"",
				"",
				"",
				"",
				"",
				"Total",
				`"${formatNumber(totals.lab)}"`,
				`"${formatNumber(totals.mat)}"`,
				`"${formatNumber(totals.other)}"`,
				`"${formatNumber(totals.total)}"`,
			].join(","),
		].join("\n");

		const blob = new Blob([csvContent], {type: "text/csv;charset=utf-8;"});
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = "job_card_report.csv";
		link.click();
		URL.revokeObjectURL(url);
	};

	if (loading) {
		return (
			<div className="text-center py-6 sm:py-8 md:py-12 lg:py-16 xl:py-20">
				<div className="animate-spin rounded-full h-6 md:h-8 w-6 md:w-8 border-b-2 border-[#7A0000] mx-auto"></div>
				<p className="mt-1 md:mt-2 text-gray-600 text-xs md:text-sm">
					Loading job cards...
				</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className="bg-red-100 border border-red-400 text-red-700 px-2 md:px-4 py-2 md:py-3 rounded mb-2 md:mb-4 text-xs md:text-sm">
				Error: {error}
			</div>
		);
	}

	if (jobCards.length === 0) {
		return (
			<div className="text-center py-6 sm:py-8 md:py-12 lg:py-16 xl:py-20">
				<div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6 md:p-10">
					<div className="text-gray-400 mb-4 md:mb-6">
						No Data Available.
					</div>
				</div>
			</div>
		);
	}

	const firstJob = jobCards[0];
	const variance = firstJob.EstimatedCost - firstJob.CommitedCost;
	const variancePercent =
		firstJob.EstimatedCost !== 0
			? ((variance / firstJob.EstimatedCost) * 100).toFixed(2)
			: "0.00";

	const groupedJobCards = jobCards.reduce((acc, job, index) => {
		const key = `${job.LogYear}-${job.DocumentProfile}-${job.DocumentNo}-${
			job.AccDate || "-"
		}`;
		if (!acc[key]) {
			acc[key] = {jobs: [], firstIndex: index};
		}
		acc[key].jobs.push(job);
		return acc;
	}, {} as Record<string, {jobs: JobcardModel[]; firstIndex: number}>);

	const sortedGroups = Object.values(groupedJobCards).sort(
		(a, b) => a.firstIndex - b.firstIndex
	);

	const totals = jobCards.reduce(
		(acc, job) => {
			const resType = job.ResType.toUpperCase();
			if (resType === "LABOUR") acc.lab += job.TrxAmt;
			else if (resType === "MATERIAL") acc.mat += job.TrxAmt;
			else if (resType === "OTHER") acc.other += job.TrxAmt;
			acc.total += job.TrxAmt;
			return acc;
		},
		{lab: 0, mat: 0, other: 0, total: 0}
	);

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4 sm:p-6 print:static print:inset-auto print:p-0 print:flex-col print:items-start print:justify-start print:overflow-visible">
			<style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 20mm 15mm 25mm 15mm;
          }
          body { margin: 0; font-family: Arial, sans-serif; }
          .print-container { width: 100%; margin: 0; padding: 0; }
          .print-header { margin-bottom: 2.5rem; margin-top: 3rem; margin-left: 2rem; font-size: 1.125rem; font-weight: bold; text-align: center; }
          .print-table { border-collapse: collapse; width: 100%; }
          .print-table th, .print-table td { border: 1px solid #D1D5DB; padding: 0.25rem; font-size: 0.75rem; }
          .print-table th { background: linear-gradient(to right, #7A0000, #A52A2A);  text-align: center; }
          .print-table tr { page-break-inside: avoid; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
          tbody { display: table-row-group; }
          .print-totals { font-weight: bold; background-color: #E5E7EB; }
          @page {
            @bottom-left { content: "Printed on: ${new Date().toLocaleString(
					"en-US",
					{timeZone: "Asia/Colombo"}
				)}"; font-size: 0.75rem; color: gray; }
            @bottom-right { content: "Page " counter(page) " of " counter(pages); font-size: 0.75rem; color: gray; }
          }
        }
      `}</style>
			<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/90 print:static print:inset-auto print:p-0 print:bg-white">
				<div className="relative bg-white w-[95vw] sm:w-[90vw] md:w-[85vw] lg:w-[80vw] xl:w-[75vw] max-w-7xl rounded-2xl shadow-2xl border border-gray-200 overflow-hidden mt-20 md:mt-32 lg:mt-40 lg:ml-64 mx-auto print:relative print:w-full print:max-w-none print:rounded-none print:shadow-none print:border-none print:overflow-visible">
					<div className="p-2 md:p-2 max-h-[80vh] overflow-y-auto print:p-0 print:max-h-none print:overflow-visible print:mt-10 print:ml-12">
						<div className="flex justify-end gap-3 mb-6 md:mb-8 print:hidden">
							<button
								onClick={handleDownloadCSV}
								className="flex items-center gap-1 px-3 py-1.5 border border-blue-400 text-blue-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-blue-50 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
							>
								<Download className="w-4 h-4" /> CSV
							</button>
							<button
								onClick={() => printPDF(jobCards, departmentName)}
								className="flex items-center gap-1 px-3 py-1.5 border border-green-400 text-green-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-green-50 hover:text-green-800 focus:outline-none focus:ring-2 focus:ring-green-200 transition"
							>
								<Printer className="w-4 h-4" /> PDF
							</button>
							<button
								onClick={onClose}
								className="flex items-center gap-1 px-3 py-1.5 border border-red-400 text-red-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-red-50 hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-red-200 transition"
							>
								<X className="w-4 h-4" /> Close
							</button>
						</div>

						<h2
							className={`text-lg md:text-xl font-bold text-center md:mb-6 ${maroon}`}
						>
							Job Card
						</h2>

						<div className="flex justify-between md:mb-2 md:text-sm leading-5">
							<div className="ml-5">
								<p>
									<span className="font-bold">Project No.</span>{" "}
									{firstJob.ProjectNo.trim()}
								</p>
								<p>
									<span className="font-bold">Estimated Cost:</span>{" "}
									{formatNumber(firstJob.EstimatedCost)}
								</p>
								<p>
									<span className="font-bold">Committed Cost:</span>{" "}
									{formatNumber(firstJob.CommitedCost)}
								</p>
								<p>
									<span className="font-bold">Variance in Rs.:</span>{" "}
									{formatNumber(variance)}
								</p>
								<p>
									<span className="font-bold">Variance in %:</span>{" "}
									{variancePercent}
								</p>
								<p>
									<span className="font-bold">
										Scope of the Project:
									</span>{" "}
									{firstJob.Description.trim()}
								</p>
							</div>
							<div className="mr-12">
								<p>
									<span className="font-bold">Fund Source:</span>{" "}
									{firstJob.FundSource.trim()}
								</p>
								<p>
									<span className="font-bold">Job Status:</span>{" "}
									{firstJob.Status.trim()}
								</p>
								<p>
									<span className="font-bold">Estimate No:</span>{" "}
									{firstJob.EstimateNo.trim()}
								</p>
								<p>
									<span className="font-bold">Job Assigned Date:</span>{" "}
									{firstJob.ProjectAssignedDate
										? new Date(
												firstJob.ProjectAssignedDate
										  ).toLocaleDateString("en-GB", {
												day: "2-digit",
												month: "2-digit",
												year: "numeric",
										  })
										: "-"}
								</p>
							</div>
						</div>
						<div className="flex justify-end text-sm md:text-base font-semibold text-gray-600 mr-8">
							Currency: LKR
						</div>

						<div className="ml-5 mt-1 border border-gray-200 rounded-lg overflow-x-auto print:ml-12 print:mt-12 print:overflow-visible">
							<table className="w-full border-collapse text-sm min-w-[700px] print-table">
								<thead className="bg-gradient-to-r from-[#7A0000] to-[#A52A2A] text-white">
									<tr>
										<th className="px-2 py-1.5 border-r border-gray-200 w-[8%] text-xs">
											Year
										</th>
										<th className="px-2 py-1.5 border-r border-gray-200 w-[8%] text-xs">
											Month
										</th>
										<th className="px-2 py-1.5 border-r border-gray-200 w-[15%] text-xs">
											Document Profile
										</th>
										<th className="px-2 py-1.5 border-r border-gray-200 w-[15%] text-xs">
											Document No.
										</th>
										<th className="px-2 py-1.5 border-r border-gray-200 w-[10%] text-xs">
											Date
										</th>
										<th className="px-2 py-1.5 border-r border-gray-200 w-[10%] text-xs">
											Sequence No.
										</th>
										<th className="px-2 py-1.5 border-r border-gray-200 w-[12%] text-xs">
											LAB
										</th>
										<th className="px-2 py-1.5 border-r border-gray-200 w-[12%] text-xs">
											MAT
										</th>
										<th className="px-2 py-1.5 border-r border-gray-200 w-[12%] text-xs">
											OTHER
										</th>
										<th className="px-2 py-1.5 w-[12%] text-xs">
											Total
										</th>
									</tr>
								</thead>
								<tbody>
									{sortedGroups.map((group, groupIndex) => {
										const sortedJobs = [...group.jobs].sort(
											(a, b) => a.SequenceNo - b.SequenceNo
										);
										return sortedJobs.map((job, jobIndex) => {
											const lab =
												job.ResType.toUpperCase() === "LABOUR"
													? job.TrxAmt
													: 0;
											const mat =
												job.ResType.toUpperCase() === "MATERIAL"
													? job.TrxAmt
													: 0;
											const other =
												job.ResType.toUpperCase() === "OTHER"
													? job.TrxAmt
													: 0;
											const total = lab + mat + other;
											const isFirstInGroup = jobIndex === 0;
											const isLastInGroup =
												jobIndex === sortedJobs.length - 1;

											return (
												<React.Fragment
													key={`${job.LogYear}-${job.LogMonth}-${job.DocumentNo}-${job.SequenceNo}-${groupIndex}-${jobIndex}`}
												>
													<tr
														className={
															groupIndex % 2
																? "bg-white"
																: "bg-gray-50"
														}
													>
														<td className="px-2 py-1.5 border-r border-gray-200 text-xs">
															{isFirstInGroup ? job.LogYear : ""}
														</td>
														<td className="px-2 py-1.5 border-r border-gray-200 text-xs">
															{isFirstInGroup
																? job.LogMonth
																: ""}
														</td>
														<td className="px-2 py-1.5 truncate border-r border-gray-200 text-xs">
															{isFirstInGroup
																? job.DocumentProfile.trim()
																: ""}
														</td>
														<td className="px-2 py-1.5 truncate border-r border-gray-200 text-xs">
															{isFirstInGroup
																? job.DocumentNo.trim()
																: ""}
														</td>
														<td className="px-2 py-1.5 border-r border-gray-200 text-xs">
															{isFirstInGroup && job.AccDate
																? new Date(
																		job.AccDate
																  ).toLocaleDateString(
																		"en-GB",
																		{
																			day: "2-digit",
																			month: "2-digit",
																			year: "numeric",
																		}
																  )
																: isFirstInGroup
																? "-"
																: ""}
														</td>
														<td className="px-2 py-1.5 border-r border-gray-200 text-right text-xs">
															{job.SequenceNo}
														</td>
														<td className="px-2 py-1.5 border-r border-gray-200 text-right font-mono text-xs">
															{formatNumber(lab)}
														</td>
														<td className="px-2 py-1.5 border-r border-gray-200 text-right font-mono text-xs">
															{formatNumber(mat)}
														</td>
														<td className="px-2 py-1.5 border-r border-gray-200 text-right font-mono text-xs">
															{formatNumber(other)}
														</td>
														<td className="px-2 py-1.5 text-right font-mono text-xs">
															{formatNumber(total)}
														</td>
													</tr>
													{isLastInGroup &&
														groupIndex <
															sortedGroups.length - 1 && (
															<tr>
																<td
																	colSpan={10}
																	className="border-t border-gray-300"
																></td>
															</tr>
														)}
												</React.Fragment>
											);
										});
									})}
									<tr className="bg-gray-200 font-bold print-totals">
										<td
											colSpan={6}
											className="px-2 py-1.5 text-right border-r border-gray-200"
										>
											Total
										</td>
										<td className="px-2 py-1.5 border-r border-gray-200 text-right font-mono">
											{formatNumber(totals.lab)}
										</td>
										<td className="px-2 py-1.5 border-r border-gray-200 text-right font-mono">
											{formatNumber(totals.mat)}
										</td>
										<td className="px-2 py-1.5 border-r border-gray-200 text-right font-mono">
											{formatNumber(totals.other)}
										</td>
										<td className="px-2 py-1.5 text-right font-mono">
											{formatNumber(totals.total)}
										</td>
									</tr>
								</tbody>
							</table>
						</div>
						<div className="hidden print:block text-xs text-gray-500 mt-12 text-center">
							Printed on:{" "}
							{new Date().toLocaleString("en-US", {
								timeZone: "Asia/Colombo",
							})}
						</div>
					</div>
					<iframe ref={iframeRef} className="hidden" />
				</div>
			</div>
		</div>
	);
};

// Main JobCardInfo Component
const JobCardInfo: React.FC = () => {
	const {user} = useUser();
	const [data, setData] = useState<Department[]>([]);
	const [searchId, setSearchId] = useState("");
	const [searchName, setSearchName] = useState("");
	const [filtered, setFiltered] = useState<Department[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [page, setPage] = useState(1);
	const [projectNo, setProjectNo] = useState("");
	const [selectedDepartment, setSelectedDepartment] =
		useState<Department | null>(null);
	const [jobCards, setJobCards] = useState<JobcardModel[]>([]);
	const [jobCardLoading, setJobCardLoading] = useState(false);
	const [jobCardError, setJobCardError] = useState<string | null>(null);
	const [showJobCardModal, setShowJobCardModal] = useState(false);
	const [isProjectLoading, setIsProjectLoading] = useState(false);
	const pageSize = 9;

	const epfNo = user?.Userno || "";
	const maroon = "text-[#7A0000]";
	const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";

	useEffect(() => {
		const fetchDepartments = async () => {
			if (!epfNo) {
				setError("No EPF number available. Please login again.");
				toast.error("No EPF number available. Please login again.");
				setLoading(false);
				return;
			}

			setLoading(true);
			try {
				const res = await fetch(
					`/misapi/api/incomeexpenditure/departments/${epfNo}`,
					{
						method: "GET",
						headers: {
							"Content-Type": "application/json",
							Accept: "application/json",
						},
					}
				);
				if (!res.ok) {
					const errorText = await res.text();
					throw new Error(
						`HTTP error! status: ${res.status}, message: ${errorText}`
					);
				}
				const contentType = res.headers.get("content-type");
				if (!contentType || !contentType.includes("application/json")) {
					const text = await res.text();
					throw new Error(
						`Expected JSON but got ${contentType}. Response: ${text.substring(
							0,
							100
						)}`
					);
				}
				const parsed = await res.json();
				let rawData = [];
				if (Array.isArray(parsed)) rawData = parsed;
				else if (parsed.data && Array.isArray(parsed.data))
					rawData = parsed.data;
				else if (parsed.result && Array.isArray(parsed.result))
					rawData = parsed.result;
				else if (parsed.departments && Array.isArray(parsed.departments))
					rawData = parsed.departments;
				else rawData = [];

				const final: Department[] = rawData.map((item: any) => ({
					DeptId: item.DeptId?.toString() || item.deptId?.toString() || "",
					DeptName:
						item.DeptName?.toString().trim() ||
						item.deptName?.toString().trim() ||
						"",
				}));

				setData(final);
				setFiltered(final);
			} catch (e: any) {
				console.error("Department Fetch Error:", e);
				const errorMessage = e.message.includes("JSON.parse")
					? "Invalid data format received from server."
					: e.message.includes("Failed to fetch")
					? "Failed to connect to the server. Please check if the server is running and CORS is configured correctly."
					: e.message;
				setError(errorMessage);
				toast.error(errorMessage);
			} finally {
				setLoading(false);
			}
		};
		fetchDepartments();
	}, [epfNo]);

	useEffect(() => {
		const f = data.filter(
			(d) =>
				(!searchId ||
					d.DeptId.toLowerCase().includes(searchId.toLowerCase())) &&
				(!searchName ||
					d.DeptName.toLowerCase().includes(searchName.toLowerCase()))
		);
		setFiltered(f);
		setPage(1);
	}, [searchId, searchName, data]);

	const handleDepartmentSelect = async (department: Department) => {
		if (!projectNo.trim()) {
			toast.error("Please enter a valid project number.");
			return;
		}

		setSelectedDepartment(department);
		setJobCardLoading(true);
		setIsProjectLoading(true);
		setJobCardError(null);
		setJobCards([]);
		setShowJobCardModal(true);

		try {
			const response = await fetch(
				`/misapi/api/jobcard?projectNo=${encodeURIComponent(
					projectNo
				)}&costCtr=${encodeURIComponent(department.DeptId)}`,
				{
					method: "GET",
					headers: {
						"Content-Type": "application/json",
						Accept: "application/json",
					},
				}
			);
			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(
					`HTTP error! status: ${response.status}, message: ${errorText}`
				);
			}
			const contentType = response.headers.get("content-type");
			if (!contentType || !contentType.includes("application/json")) {
				const text = await response.text();
				throw new Error(
					`Expected JSON but got ${contentType}. Response: ${text.substring(
						0,
						100
					)}`
				);
			}
			const result = await response.json();
			let data: JobcardModel[] = [];
			if (Array.isArray(result)) data = result;
			else if (result.data && Array.isArray(result.data)) data = result.data;
			else if (result.result && Array.isArray(result.result))
				data = result.result;
			else data = [];

			setJobCards(data);
			if (data.length === 0) {
				toast.warn(
					`No job cards found for project number ${projectNo} in department ${department.DeptId}.`
				);
			} else {
				toast.success(`Successfully fetched job card details.`);
			}
		} catch (error: any) {
			console.error("Job Card Fetch Error:", error);
			const errorMessage = error.message.includes("Failed to fetch")
				? "Failed to connect to the server. Please check if the server is running and CORS is configured correctly."
				: error.message;
			setJobCardError(errorMessage);
			toast.error(`Failed to fetch job cards: ${errorMessage}`);
		} finally {
			setJobCardLoading(false);
			setIsProjectLoading(false);
		}
	};

	const clearFilters = () => {
		setSearchId("");
		setSearchName("");
	};

	const paginatedDepartments = filtered.slice(
		(page - 1) * pageSize,
		page * pageSize
	);

	return (
		<div
			className="max-w-[95%] mx-auto p-2 md:p-4 bg-white rounded-xl shadow border border-gray-200 text-sm md:text-base font-sans relative ml-16 mt-8"
			style={{marginLeft: "2rem"}}
		>
			<div className="flex flex-col md:flex-row justify-between items-center mb-2 md:mb-4">
				<div>
					<h2 className={`text-lg md:text-xl font-bold ${maroon}`}>
						Job Card Information
					</h2>
				</div>
			</div>

			<div className="flex flex-col md:flex-row justify-end items-center mb-2 md:mb-3 space-y-2 md:space-y-0 md:space-x-2">
				<label className={`text-xs md:text-em font-bold ${maroon}`}>
					Enter Project Number
				</label>
				<input
					type="text"
					value={projectNo}
					placeholder="Enter Project Number"
					onChange={(e) => setProjectNo(e.target.value)}
					className="pl-2 md:pl-3 pr-2 md:pr-3 py-1 md:py-1.5 w-full md:w-40 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A0000] transition text-xs md:text-sm"
					autoComplete="on"
				/>
			</div>

			<div className="flex flex-col md:flex-row flex-wrap gap-2 md:gap-3 justify-end mb-2 md:mb-4">
				<div className="relative w-full md:w-auto">
					<Search className="absolute left-2 md:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 md:w-3 h-3 md:h-3" />
					<input
						type="text"
						value={searchId}
						placeholder="Search by Dept ID"
						onChange={(e) => setSearchId(e.target.value)}
						className="pl-8 md:pl-8 pr-2 md:pr-3 py-1 md:py-1.5 w-full md:w-40 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A0000] transition text-xs md:text-sm"
						autoComplete="off"
					/>
				</div>
				<div className="relative w-full md:w-auto">
					<Search className="absolute left-2 md:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 md:w-3 h-3 md:h-3" />
					<input
						type="text"
						value={searchName}
						placeholder="Search by Name"
						onChange={(e) => setSearchName(e.target.value)}
						className="pl-8 md:pl-10 pr-2 md:pr-3 py-1 md:py-1.5 w-full md:w-40 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A0000] transition text-xs md:text-sm"
						autoComplete="off"
					/>
				</div>
				{(searchId || searchName) && (
					<button
						onClick={clearFilters}
						className="flex items-center gap-1 px-2 md:px-3 py-1 md:py-1.5 border border-gray-300 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs md:text-sm"
					>
						<RotateCcw className="w-3 md:w-3 h-3 md:h-3" /> Clear
					</button>
				)}
			</div>

			{loading && (
				<div className="text-center py-4 md:py-8">
					<div className="animate-spin rounded-full h-6 md:h-8 w-6 md:w-8 border-b-2 border-[#7A0000] mx-auto"></div>
					<p className="mt-1 md:mt-2 text-gray-600 text-xs md:text-sm">
						Loading cost centers...
					</p>
				</div>
			)}

			{error && (
				<div className="bg-red-100 border border-red-400 text-red-700 px-2 md:px-4 py-2 md:py-3 rounded mb-2 md:mb-4 text-xs md:text-sm">
					Error: {error}
				</div>
			)}

			{!loading && !error && filtered.length === 0 && (
				<div className="text-gray-600 bg-gray-100 p-2 md:p-4 rounded text-xs md:text-sm">
					No cost centers found.
				</div>
			)}

			{!loading && !error && filtered.length > 0 && !isProjectLoading && (
				<>
					<div className="overflow-x-auto rounded-lg border border-gray-200">
						<div className="max-h-[50vh] overflow-y-auto">
							<table className="w-full table-fixed text-left text-gray-700 text-xs md:text-sm">
								<thead
									className={`${maroonGrad} text-white sticky top-0`}
								>
									<tr>
										<th className="px-2 md:px-4 py-1 md:py-2 w-1/4 md:w-auto">
											Cost Center Code
										</th>
										<th className="px-2 md:px-4 py-1 md:py-2 w-1/2 md:w-auto">
											Cost Center Name
										</th>
										<th className="px-2 md:px-4 py-1 md:py-2 w-1/4 md:w-auto text-center">
											Action
										</th>
									</tr>
								</thead>
								<tbody>
									{paginatedDepartments.map((department, i) => (
										<tr
											key={`${department.DeptId}-${i}`}
											className={i % 2 ? "bg-white" : "bg-gray-50"}
										>
											<td className="px-2 md:px-4 py-1 md:py-2 truncate min-w-0">
												{department.DeptId}
											</td>
											<td className="px-2 md:px-4 py-1 md:py-2 truncate min-w-0">
												{department.DeptName}
											</td>
											<td className="px-2 md:px-4 py-1 md:py-2 text-center">
												<button
													onClick={() =>
														handleDepartmentSelect(department)
													}
													className={`px-2 md:px-3 py-1 md:py-1 ${maroonGrad} text-white rounded-md text-xs md:text-sm font-medium hover:brightness-110 transition shadow`}
												>
													<Eye className="inline-block mr-1 w-3 md:w-3 h-3 md:h-3" />{" "}
													View
												</button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>

					<div className="flex flex-col md:flex-row justify-end items-center gap-2 md:gap-3 mt-2 md:mt-3">
						<button
							onClick={() => setPage((p) => Math.max(1, p - 1))}
							disabled={page === 1}
							className="px-2 md:px-3 py-1 md:py-1 border rounded bg-white text-gray-600 text-xs md:text-sm hover:bg-gray-100 disabled:opacity-40"
						>
							Previous
						</button>
						<span className="text-xs md:text-sm text-gray-600">
							Page {page} of {Math.ceil(filtered.length / pageSize)}
						</span>
						<button
							onClick={() =>
								setPage((p) =>
									Math.min(
										Math.ceil(filtered.length / pageSize),
										p + 1
									)
								)
							}
							disabled={page >= Math.ceil(filtered.length / pageSize)}
							className="px-2 md:px-3 py-1 md:py-1 border rounded bg-white text-gray-600 text-xs md:text-sm hover:bg-gray-100 disabled:opacity-40"
						>
							Next
						</button>
					</div>
				</>
			)}

			{showJobCardModal && selectedDepartment && (
				<JobCardTable
					jobCards={jobCards}
					loading={jobCardLoading}
					error={jobCardError}
					departmentName={selectedDepartment.DeptName}
					onClose={() => setShowJobCardModal(false)}
				/>
			)}
		</div>
	);
};

export default JobCardInfo;
