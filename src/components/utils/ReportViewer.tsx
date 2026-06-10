import React, { useRef } from "react";
import { Download, Printer, X } from "lucide-react";

interface ReportViewerProps {
	title: string;
	subtitlebold?: string;
	subtitlenormal?: string;
	subtitlebold2?: string;
	subtitlenormal2?: string;
	subtitlebold3?: string;
	subtitlenormal3?: string;
	currency?: string;
	loading: boolean;
	hasData: boolean; // or use data.length > 0
	handleDownloadCSV?: () => void;
	printPDF: () => void;
	handleDownloadPDF?: () => void;
	closeReport: () => void;
	renderMode?: "table" | "pdf";
	pdfUrl?: string;
	children?: React.ReactNode;
}

const maroon = "text-[#7A0000]";


const ReportViewer: React.FC<ReportViewerProps> = ({
	title,
	subtitlebold,
	subtitlenormal,
	subtitlebold2,
	subtitlenormal2,
	subtitlebold3,
	subtitlenormal3,
	currency = "Currency: LKR",
	loading,
	hasData,
	handleDownloadCSV,
	printPDF,
	handleDownloadPDF,
	closeReport,
	renderMode = "table",
	pdfUrl,
	children,
}) => {
	const iframeRef = useRef<HTMLIFrameElement>(null);

	// You can later move print logic here and use iframeRef if needed

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/90">
			<div className="relative bg-white w-full max-w-[95vw] rounded-2xl shadow-2xl border border-gray-200 overflow-hidden mt-20 lg:ml-64 mx-auto">
				<div className="p-4 max-h-[85vh] overflow-y-auto">
					<div className="flex justify-end gap-3 mb-4 print:hidden">
						{/* Buttons */}
						{handleDownloadCSV && (
							<button
								onClick={handleDownloadCSV}
								className="flex items-center gap-1 px-3 py-1.5 border border-blue-400 text-blue-700 bg-white rounded hover:bg-blue-50 text-xs"
							>
								<Download className="w-4 h-4" /> CSV
							</button>
						)}

						<button
							onClick={printPDF}
							className="flex items-center gap-1 px-3 py-1.5 border border-green-400 text-green-700 bg-white rounded hover:bg-green-50 text-xs"
						>
							<Printer className="w-4 h-4" /> PDF
						</button>

						{handleDownloadPDF && (
							<button
								onClick={handleDownloadPDF}
								className="flex items-center gap-1 px-3 py-1.5 border border-amber-400 text-amber-700 bg-white rounded hover:bg-amber-50 text-xs"
							>
								<Download className="w-4 h-4" /> Download PDF
							</button>
						)}

						<button
							onClick={closeReport}
							className="flex items-center gap-1 px-3 py-1.5 border border-red-400 text-red-700 bg-white rounded hover:bg-red-50 text-xs"
						>
							<X className="w-4 h-4" /> Close
						</button>
					</div>

					{/* Header */}
					<h2 className={`text-xl font-bold text-center mb-4 ${maroon}`}>
						{title}
					</h2>

					<div className="flex justify-between text-sm mb-1 self-end">
						<div>
							<strong>{subtitlebold}</strong> {subtitlenormal} <br />
							<strong>{subtitlebold2}</strong> {subtitlenormal2} <br />
							<strong>{subtitlebold3}</strong> {subtitlenormal3}
						</div>
						<div className="font-semibold text-gray-600 self-end">
							{currency}
						</div>
					</div>

					{/* States */}
					{loading ? (
						<div className="text-center py-32">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7A0000] mx-auto"></div>
							<p className="text-gray-600">Loading report...</p>
						</div>
					) : renderMode === "pdf" ? (
						pdfUrl ? (
							<div className="w-full h-[72vh] border border-gray-300 rounded-lg overflow-hidden bg-gray-50">
								<iframe
									src={pdfUrl}
									title="jasper-report-pdf"
									className="w-full h-full"
								/>
							</div>
						) : (
							<div className="text-center py-32 text-gray-500 text-lg">
								No PDF URL available for the selected report.
							</div>
						)
					) : !hasData ? (
						<div className="text-center py-32 text-gray-500 text-lg">
							No records found for the selected period.
						</div>
					) : (
						<div className="overflow-x-auto border border-gray-300 rounded-lg">
							{children}
						</div>
					)}
				</div>

				{/* Hidden iframe for print */}
				<iframe ref={iframeRef} className="hidden" title="print-iframe" />
			</div>
		</div>
	);
};

export default ReportViewer;