import React, {useState, useRef, useEffect, JSX} from "react";
import {Eye, X, Download, Printer, RotateCcw, ChevronDown} from "lucide-react";
import {toast} from "react-toastify";

interface LedgerCardItem {
	GlCd: string;
	SubAc: string;
	Remarks: string | null;
	AcctDt: string | null;
	DocPf: string | null;
	DocNo: string | null;
	Ref1: string | null;
	ChqNo: string | null;
	CrAmt: number | null;
	DrAmt: number | null;
	SeqNo: number | null;
	LogMth: number | null;
	OpeningBalance: number | null;
	ClosingBalance: number | null;
	GLOpeningBalance: number | null;
	GLClosingBalance: number | null;
	AcName: string | null;
	AcName1: string | null;
	CctName: string | null;
}

const formatNumber = (num: number | string | null | undefined): string => {
	const n = num === null || num === undefined ? NaN : Number(num);
	if (isNaN(n)) return "0.00";

	const abs = Math.abs(n);
	const formatted = abs.toLocaleString("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});

	return n < 0 ? `(${formatted})` : formatted;
};

/* ────── Reusable Dropdown with Portal-like positioning ────── */
const CustomDropdown = <T,>({
	label,
	value,
	options,
	onSelect,
	open,
	setOpen,
	displayFn,
	className = "",
}: {
	label: string;
	value: T | undefined;
	options: T[];
	onSelect: (val: T) => void;
	open: boolean;
	setOpen: (v: boolean) => void;
	displayFn: (v: T) => string;
	className?: string;
}) => {
	const btnRef = useRef<HTMLButtonElement>(null);
	const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

	useEffect(() => {
		if (open && btnRef.current) {
			const rect = btnRef.current.getBoundingClientRect();
			const viewportHeight = window.innerHeight;
			const spaceBelow = viewportHeight - rect.bottom;
			const dropdownHeight = Math.min(240, options.length * 40);

			setDropdownStyle({
				position: "fixed",
				top:
					spaceBelow >= dropdownHeight
						? rect.bottom + 4
						: rect.top - dropdownHeight - 4,
				left: rect.left,
				width: rect.width,
				zIndex: 9999,
			});
		}
	}, [open, options.length]);

	return (
		<>
			<div className={className}>
				<label
					className={`block text-xs md:text-sm font-bold text-[#7A0000] mb-1`}
				>
					{label}
				</label>
				<button
					ref={btnRef}
					type="button"
					onClick={() => setOpen(!open)}
					className="w-full flex justify-between items-center pl-3 pr-2 py-1.5 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#7A0000] text-xs md:text-sm text-gray-900 bg-white"
				>
					<span className={value === undefined ? "text-gray-400" : ""}>
						{value !== undefined ? displayFn(value) : `Select ${label}`}
					</span>
					<ChevronDown
						className={`w-4 h-4 text-gray-400 transition-transform ${
							open ? "rotate-180" : ""
						}`}
					/>
				</button>
			</div>

			{open && (
				<div
					className="bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto"
					style={dropdownStyle}
				>
					{options.map((opt) => (
						<button
							key={String(opt)}
							type="button"
							onClick={() => {
								onSelect(opt);
								setOpen(false);
							}}
							className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
								value === opt
									? "bg-[#7A0000] text-white"
									: "text-gray-700"
							}`}
						>
							{displayFn(opt)}
						</button>
					))}
				</div>
			)}
		</>
	);
};

const LCWithoutSubAcc: React.FC = () => {
	const [ledgerCode, setLedgerCode] = useState("");
	const [year, setYear] = useState<number | undefined>(undefined);
	const [startMonth, setStartMonth] = useState<number | undefined>(undefined);
	const [endMonth, setEndMonth] = useState<number | undefined>(undefined);
	const [data, setData] = useState<LedgerCardItem[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [showReport, setShowReport] = useState(false);
	const [subAccountTotals, setSubAccountTotals] = useState<
		Record<
			string,
			{dr: number; cr: number; runningTotal: number; openingBalance: number}
		>
	>({});
	const iframeRef = useRef<HTMLIFrameElement>(null);

	// Dropdown states
	const [yearOpen, setYearOpen] = useState(false);
	const [startMonthOpen, setStartMonthOpen] = useState(false);
	const [endMonthOpen, setEndMonthOpen] = useState(false);

	// Close other dropdowns when one opens
	const handleYearOpen = (val: boolean) => {
		if (val) {
			setStartMonthOpen(false);
			setEndMonthOpen(false);
		}
		setYearOpen(val);
	};

	const handleStartMonthOpen = (val: boolean) => {
		if (val) {
			setYearOpen(false);
			setEndMonthOpen(false);
		}
		setStartMonthOpen(val);
	};

	const handleEndMonthOpen = (val: boolean) => {
		if (val) {
			setYearOpen(false);
			setStartMonthOpen(false);
		}
		setEndMonthOpen(val);
	};

	const maroon = "text-[#7A0000]";
	const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";

	const currentYear = new Date().getFullYear();
	const years = Array.from({length: 21}, (_, i) => currentYear - i);
	const months = Array.from({length: 12}, (_, i) => i + 1);

	const getMonthName = (m: number) => {
		const names = [
			"January",
			"February",
			"March",
			"April",
			"May",
			"June",
			"July",
			"August",
			"September",
			"October",
			"November",
			"December",
		];
		return `${m} - ${names[m - 1]}`;
	};

	// Close all dropdowns when clicking outside
	useEffect(() => {
		const handleOutsideClick = (e: MouseEvent) => {
			const target = e.target as HTMLElement;
			if (
				!target.closest("button") &&
				!target.closest("[style*='position: fixed']")
			) {
				setYearOpen(false);
				setStartMonthOpen(false);
				setEndMonthOpen(false);
			}
		};
		document.addEventListener("mousedown", handleOutsideClick);
		return () =>
			document.removeEventListener("mousedown", handleOutsideClick);
	}, []);

	const handleViewClick = async () => {
		if (!ledgerCode.trim()) {
			toast.error("Please enter Ledger Code.");
			return;
		}
		if (!year) {
			toast.error("Please select a Year.");
			return;
		}
		if (!startMonth || !endMonth) {
			toast.error("Please select both Start and End Month.");
			return;
		}
		if (endMonth < startMonth) {
			toast.error("End Month cannot be before Start Month.");
			return;
		}

		setLoading(true);
		setError(null);
		setData([]);
		setShowReport(false);

		try {
			const response = await fetch(
				`/misapi/api/ledgercard/report/${encodeURIComponent(
					ledgerCode.trim()
				)}/${year}/${startMonth.toString().padStart(2, "0")}/${endMonth
					.toString()
					.padStart(2, "0")}`,
				{
					method: "GET",
					headers: {
						"Content-Type": "application/json",
						Accept: "application/json",
					},
					credentials: "include",
				}
			);

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(
					`HTTP ${response.status}: ${errorText || "Unknown error"}`
				);
			}

			const result = await response.json();
			const items: LedgerCardItem[] = result.data || [];

			if (items.length === 0) {
				toast.warn("No ledger entries found for the given criteria.");
				return;
			}

			const grouped = items.reduce((acc, item) => {
				const subAc = item.SubAc || "UNKNOWN";
				if (!acc[subAc]) {
					acc[subAc] = {
						dr: 0,
						cr: 0,
						runningTotal: item.OpeningBalance || 0,
						openingBalance: item.OpeningBalance || 0,
						entries: [],
					};
				}

				const dr = item.DrAmt || 0;
				const cr = item.CrAmt || 0;
				acc[subAc].dr += dr;
				acc[subAc].cr += cr;
				acc[subAc].runningTotal += dr - cr;
				acc[subAc].entries.push({...item});

				return acc;
			}, {} as Record<string, any>);

			const flatData: LedgerCardItem[] = [];
			Object.keys(grouped).forEach((subAc) => {
				flatData.push(...grouped[subAc].entries);
			});

			setData(flatData);
			setSubAccountTotals(
				Object.keys(grouped).reduce((acc, subAc) => {
					acc[subAc] = {
						dr: grouped[subAc].dr,
						cr: grouped[subAc].cr,
						runningTotal: grouped[subAc].runningTotal,
						openingBalance: grouped[subAc].openingBalance,
					};
					return acc;
				}, {} as any)
			);
			setShowReport(true);
			toast.success("Ledger card data loaded successfully.");
		} catch (err: any) {
			console.error("Fetch Error:", err);
			const msg = err.message.includes("Failed to fetch")
				? "Cannot connect to server. Please check your connection."
				: err.message;
			setError(msg);
			toast.error(msg);
		} finally {
			setLoading(false);
		}
	};

	const clearFilters = () => {
		setLedgerCode("");
		setYear(undefined);
		setStartMonth(undefined);
		setEndMonth(undefined);
		setData([]);
		setShowReport(false);
	};

	const printPDF = () => {
		if (data.length === 0 || !iframeRef.current) return;

		const firstItem = data[0];
		const ledgerName = firstItem.AcName || "N/A";

		let tableRows = "";
		let currentSubAc = "";
		let subAcRunning = 0;
		let subAcOpening = 0;

		data.forEach((item, i) => {
			const isNewSubAc = item.SubAc !== currentSubAc;
			if (isNewSubAc && currentSubAc) {
				const subTotal = subAccountTotals[currentSubAc];
				const subNetMovement = subTotal.dr - subTotal.cr;
				tableRows += `
          <tr class="bg-yellow-50 font-bold">
            <td colspan="6" class="p-1 border border-gray-300 text-right">Sub Account Total - ${currentSubAc}:</td>
            <td class="p-1 border border-gray-300 text-right font-mono">${formatNumber(
					subTotal.dr
				)}</td>
            <td class="p-1 border border-gray-300 text-right font-mono">${formatNumber(
					subTotal.cr
				)}</td>
            <td class="p-1 border border-gray-300 text-right font-mono">${formatNumber(
					subTotal.runningTotal
				)}</td>
          </tr>
          <tr class="bg-yellow-100 font-bold">
            <td colspan="6" class="p-1 border border-gray-300 text-right">Net Movement - ${currentSubAc}:</td>
            <td colspan="3" class="p-1 border border-gray-300 text-right font-mono">${formatNumber(
					subNetMovement
				)}</td>
          </tr>
          <tr class="bg-yellow-100 font-bold">
            <td colspan="6" class="p-1 border border-gray-300 text-right">Closing Balance - ${currentSubAc}:</td>
            <td colspan="3" class="p-1 border border-gray-300 text-right font-mono">${formatNumber(
					subTotal.runningTotal
				)}</td>
          </tr>
          <tr><td colspan="9" class="p-2 border-0">&nbsp;</td></tr>`;
			}

			if (isNewSubAc) {
				currentSubAc = item.SubAc || "";
				subAcOpening = subAccountTotals[currentSubAc]?.openingBalance || 0;
				subAcRunning = subAcOpening;
				tableRows += `
          <tr class="bg-gray-100 font-bold">
            <td colspan="9" class="p-1 border border-gray-300 text-left">
              Sub Account: ${currentSubAc} | Opening Balance: ${formatNumber(
					subAcOpening
				)}
            </td>
          </tr>`;
			}

			const dr = item.DrAmt || 0;
			const cr = item.CrAmt || 0;
			subAcRunning += dr - cr;

			tableRows += `
        <tr class="${i % 2 ? "bg-white" : "bg-gray-50"}">
          <td class="p-1 border border-gray-300 text-left text-xs">${
					item.DocPf || ""
				}</td>
          <td class="p-1 border border-gray-300 text-left text-xs" style="word-wrap: break-word;">${
					item.DocNo || ""
				}</td>
          <td class="p-1 border border-gray-300 text-left text-xs" style="word-wrap: break-word; word-break: break-word;">${
					item.Remarks || ""
				}</td>
          <td class="p-1 border border-gray-300 text-center text-xs">${
					item.AcctDt ? new Date(item.AcctDt).toLocaleDateString() : ""
				}</td>
          <td class="p-1 border border-gray-300 text-left text-xs">${
					item.Ref1 || ""
				}</td>
          <td class="p-1 border border-gray-300 text-left text-xs">${
					item.ChqNo || ""
				}</td>
          <td class="p-1 border border-gray-300 text-right font-mono text-xs">${formatNumber(
					dr
				)}</td>
          <td class="p-1 border border-gray-300 text-right font-mono text-xs">${formatNumber(
					cr
				)}</td>
          <td class="p-1 border border-gray-300 text-right font-mono text-xs">${formatNumber(
					subAcRunning
				)}</td>
        </tr>`;
		});

		if (currentSubAc) {
			const subTotal = subAccountTotals[currentSubAc];
			const subNetMovement = subTotal.dr - subTotal.cr;
			tableRows += `
        <tr class="bg-yellow-50 font-bold">
          <td colspan="6" class="p-1 border border-gray-300 text-right">Sub Account Total - ${currentSubAc}:</td>
          <td class="p-1 border border-gray-300 text-right font-mono">${formatNumber(
					subTotal.dr
				)}</td>
          <td class="p-1 border border-gray-300 text-right font-mono">${formatNumber(
					subTotal.cr
				)}</td>
          <td class="p-1 border border-gray-300 text-right font-mono">${formatNumber(
					subTotal.runningTotal
				)}</td>
        </tr>
        <tr class="bg-yellow-100 font-bold">
          <td colspan="6" class="p-1 border border-gray-300 text-right">Net Movement - ${currentSubAc}:</td>
          <td colspan="3" class="p-1 border border-gray-300 text-right font-mono">${formatNumber(
					subNetMovement
				)}</td>
        </tr>
        <tr class="bg-yellow-100 font-bold">
          <td colspan="6" class="p-1 border border-gray-300 text-right">Closing Balance - ${currentSubAc}:</td>
          <td colspan="3" class="p-1 border border-gray-300 text-right font-mono">${formatNumber(
					subTotal.runningTotal
				)}</td>
        </tr>`;
		}

		const htmlContent = `
      <html>
        <head>
          <style>
            @media print {
              @page { margin: 10mm 5mm 15mm 5mm; }
              body { margin: 0; font-family: Arial, sans-serif; font-size: 10px; }
              .print-header { margin: 15px 10px 8px; text-align: center; }
              .print-header h2 { font-weight: bold; color: #7A0000; margin: 0; font-size: 14px; }
              .print-summary { margin: 8px 10px; font-size: 10px; }
              .print-summary p { margin: 2px 3px; }
              .print-currency { text-align: right; margin-right: 3px; font-weight: 600; color: #4B5563; font-size: 10px; }
              table { border-collapse: collapse; width: 100%; margin: 0; table-layout: fixed; }
              th, td { border: 1px solid #D1D5DB; padding: 3px; font-size: 9px; overflow: hidden; }
              th { background: linear-gradient(to right, #7A0000, #A52A2A); color: white; text-align: center; font-size: 9px; }
              td { text-align: right; }
              td.text-left { text-align: left; }
              .bg-yellow-50 { background-color: #FFFBEB !important; }
              .bg-yellow-100 { background-color: #FEF3C7 !important; }
              .bg-gray-100 { background-color: #F3F4F6 !important; }
              .font-bold { font-weight: bold; }
              .font-mono { font-family: monospace; }
              .col-docpf { width: 8%; }
              .col-docno { width: 9%; }
              .col-remarks { width: 23%; word-wrap: break-word; word-break: break-word; }
              .col-date { width: 8%; }
              .col-ref { width: 12%; }
              .col-chq { width: 7%; }
              .col-dr { width: 12%; }
              .col-cr { width: 12%; }
              .col-running { width: 13%; }
              @page {
                @bottom-left { content: "Printed on: ${new Date().toLocaleString(
							"en-US",
							{timeZone: "Asia/Colombo"}
						)}"; font-size: 8px; color: gray; }
                @bottom-right { content: "Page " counter(page) " of " counter(pages); font-size: 8px; color: gray; }
              }
            }
          </style>
        </head>
        <body>
          <div class="print-header">
            <h2>Ledger Card - Details ${startMonth
					?.toString()
					.padStart(2, "0")}/${year} to ${endMonth
			?.toString()
			.padStart(2, "0")}/${year}</h2>
          </div>
          <div class="print-summary">
            <p><span class="font-bold">Cost Centre :</span> ${
					firstItem.CctName || "N/A"
				}</p>
            <p><span class="font-bold">GL Code :</span> ${
					firstItem.GlCd
				} - ${ledgerName}</p>
            <p><span class="font-bold">Opening Balance for 01/01/${year} :</span> ${formatNumber(
			firstItem.GLOpeningBalance
		)}</p>
          </div>
          <div class="print-currency">Currency : LKR</div>
          <table>
            <thead>
              <tr>
                <th class="col-docpf">Doc Pf</th>
                <th class="col-docno">Doc No</th>
                <th class="col-remarks">Remarks</th>
                <th class="col-date">Acct. Date</th>
                <th class="col-ref">Reference 1</th>
                <th class="col-chq">Cheque No</th>
                <th class="col-dr">Dr Amount</th>
                <th class="col-cr">Cr Amount</th>
                <th class="col-running">Running Total</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
          <p class="font-bold" style="margin: 10px 0;">
            Closing Balance: ${formatNumber(firstItem.GLClosingBalance)}
          </p>
          <div style="margin-top: 30px; display: flex; justify-content: space-between; padding: 0 20px; font-size: 10px;">
            <div>Prepared By: ____________________</div>
            <div>Checked By: ____________________</div>
          </div>
        </body>
      </html>`;

		const iframeDoc = iframeRef.current?.contentDocument;
		if (iframeDoc) {
			iframeDoc.open();
			iframeDoc.write(htmlContent);
			iframeDoc.close();
			setTimeout(() => iframeRef.current?.contentWindow?.print(), 500);
		}
	};

	const handleDownloadCSV = () => {
		if (data.length === 0) return;

		const headers = [
			"Document Profile",
			"Document No",
			"Remarks",
			"Acct. Date",
			"Reference 1",
			"Cheque No",
			"Dr Amount",
			"Cr Amount",
			"Running Total",
			"Sub Account",
		];

		const escapeCsv = (value: any) =>
			`"${String(value ?? "").replace(/"/g, '""')}"`;

		const rows = data.map((item) => {
			const subAc = item.SubAc || "";
			const runningTotal =
				(subAccountTotals[subAc]?.openingBalance || 0) +
				(item.DrAmt || 0) -
				(item.CrAmt || 0);
			return [
				item.DocPf || "",
				item.DocNo || "",
				item.Remarks || "",
				item.AcctDt ? new Date(item.AcctDt).toLocaleDateString() : "",
				item.Ref1 || "",
				item.ChqNo || "",
				formatNumber(item.DrAmt),
				formatNumber(item.CrAmt),
				formatNumber(runningTotal),
				subAc,
			]
				.map(escapeCsv)
				.join(",");
		});

		const totalDr = Object.values(subAccountTotals).reduce(
			(s, t) => s + t.dr,
			0
		);
		const totalCr = Object.values(subAccountTotals).reduce(
			(s, t) => s + t.cr,
			0
		);
		const netMovement = totalDr - totalCr;

		const csvContent = [
			`Ledger Card - ${startMonth}/${year} to ${endMonth}/${year}`,
			`GL Code: ${data[0].GlCd} - ${data[0].AcName || "N/A"}`,
			`Cost Centre: ${data[0].CctName || "N/A"}`,
			`"Opening Balance: ${formatNumber(data[0].GLOpeningBalance)}"`,
			`Currency: LKR`,
			"",
			headers.join(","),
			...rows,
			"",
			`"Net Movement: ${formatNumber(netMovement)}"`,
			`"Closing Balance: ${formatNumber(data[0].GLClosingBalance)}"`,
		].join("\n");

		const blob = new Blob([csvContent], {type: "text/csv"});
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `ledger_card_${ledgerCode}_${year}_${startMonth}-${endMonth}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	};

	return (
		<div className="max-w-[95%] mx-auto p-2 md:p-4 bg-white rounded-xl shadow border border-gray-200 text-sm md:text-base font-sans">
			<h2 className={`text-lg md:text-xl font-bold mb-4 ${maroon}`}>
				Ledger Card without Subaccounts
			</h2>

			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
				<div>
					<label
						className={`block text-xs md:text-sm font-bold ${maroon} mb-1`}
					>
						Ledger Code
					</label>
					<input
						type="text"
						value={ledgerCode}
						onChange={(e) => setLedgerCode(e.target.value.toUpperCase())}
						placeholder="Enter Ledger Code"
						className="w-full pl-3 pr-2 py-1.5 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#7A0000] text-xs md:text-sm text-uppercase placeholder:normal-case"
					/>
				</div>

				<CustomDropdown
					label="Year"
					value={year}
					options={years}
					open={yearOpen}
					setOpen={handleYearOpen}
					onSelect={setYear}
					displayFn={(y) => String(y)}
				/>

				<CustomDropdown
					label="Start Month"
					value={startMonth}
					options={months}
					open={startMonthOpen}
					setOpen={handleStartMonthOpen}
					onSelect={setStartMonth}
					displayFn={getMonthName}
				/>

				<CustomDropdown
					label="End Month"
					value={endMonth}
					options={months}
					open={endMonthOpen}
					setOpen={handleEndMonthOpen}
					onSelect={setEndMonth}
					displayFn={getMonthName}
				/>
			</div>

			<div className="flex flex-wrap gap-2 mb-4 justify-end">
				<button
					onClick={handleViewClick}
					disabled={loading}
					className={`flex items-center gap-1 px-3 py-1.5 ${maroonGrad} text-white rounded-md text-xs md:text-sm font-medium hover:brightness-110 transition shadow ${
						loading ? "opacity-50 cursor-not-allowed" : ""
					}`}
				>
					<Eye className="w-4 h-4" /> View
				</button>
				<button
					onClick={clearFilters}
					className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs md:text-sm"
				>
					<RotateCcw className="w-4 h-4" /> Clear
				</button>
			</div>

			{loading && (
				<div className="text-center py-8">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7A0000] mx-auto"></div>
					<p className="mt-2 text-gray-600">Loading ledger data...</p>
				</div>
			)}

			{error && (
				<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
					Error: {error}
				</div>
			)}

			{showReport && data.length > 0 && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/90 print:static print:inset-auto print:p-0 print:bg-white">
					<div
						className="
              relative bg-white
              w-[95vw] sm:w-[90vw] md:w-[85vw] lg:w-[80vw] xl:w-[75vw]
              max-w-7xl
              rounded-2xl shadow-2xl border border-gray-200 overflow-hidden
              mt-20 md:mt-32 lg:mt-40 lg:ml-64
              mx-auto
              print:relative print:w-full print:max-w-none print:rounded-none
              print:shadow-none print:border-none print:overflow-visible print-container
            "
					>
						<div className="p-2 md:p-2 max-h-[80vh] overflow-y-auto print:p-0 print:max-h-none print:overflow-visible print:mt-10 print:ml-12">
							<div className="flex justify-end gap-3 mb-6 md:mb-8 print:hidden">
								<button
									onClick={handleDownloadCSV}
									className="flex items-center gap-1 px-3 py-1.5 border border-blue-400 text-blue-700 bg-white rounded-md text-xs font-medium hover:bg-blue-50"
								>
									<Download className="w-4 h-4" /> CSV
								</button>
								<button
									onClick={printPDF}
									className="flex items-center gap-1 px-3 py-1.5 border border-green-400 text-green-700 bg-white rounded-md text-xs font-medium hover:bg-green-50"
								>
									<Printer className="w-4 h-4" /> PDF
								</button>
								<button
									onClick={() => setShowReport(false)}
									className="flex items-center gap-1 px-3 py-1.5 border border-red-400 text-red-700 bg-white rounded-md text-xs font-medium hover:bg-red-50"
								>
									<X className="w-4 h-4" /> Close
								</button>
							</div>

							<h2
								className={`text-xl font-bold text-center mb-4 ${maroon}`}
							>
								Ledger Card - Details {startMonth}/{year} to {endMonth}/
								{year}
							</h2>

							<div className="grid grid-cols-1 md:grid-cols-2 text-sm mb-4">
								<div>
									<p>
										<span className="font-bold">Cost Center :</span>{" "}
										{data[0].CctName || "N/A"}
									</p>
									<p>
										<span className="font-bold">
											Opening Balance for 01/01/{year} :
										</span>{" "}
										{formatNumber(data[0].GLOpeningBalance)}
									</p>
								</div>
								<div className="text-right font-semibold text-gray-600">
									Currency : LKR
								</div>
							</div>

							<div className="overflow-x-auto border rounded-lg">
								<table className="w-full text-xs border-collapse table-fixed min-w-[1000px]">
									<thead className={`${maroonGrad} text-white`}>
										<tr>
											<th className="px-2 py-1.5">Document No</th>
											<th className="px-2 py-1.5">Remarks</th>
											<th className="px-2 py-1.5">Acct. Date</th>
											<th className="px-2 py-1.5">
												Reference 1 / Cheque No
											</th>
											<th className="px-2 py-1.5">Dr Amount</th>
											<th className="px-2 py-1.5">Cr Amount</th>
											<th className="px-2 py-1.5">Running Total</th>
										</tr>
									</thead>
									<tbody>
										{(() => {
											let currentSubAc = "";
											let running = 0;
											let opening = 0;
											const rows: JSX.Element[] = [];

											data.forEach((item, i) => {
												const isNewSubAc =
													item.SubAc !== currentSubAc;
												const dr = item.DrAmt || 0;
												const cr = item.CrAmt || 0;

												if (isNewSubAc) {
													if (currentSubAc)
														rows.push(
															<tr key={`spacer-${currentSubAc}`}>
																<td
																	colSpan={7}
																	className="h-4"
																/>
															</tr>
														);
													currentSubAc = item.SubAc || "";
													opening =
														subAccountTotals[currentSubAc]
															?.openingBalance || 0;
													running = opening;
												}
												running += dr - cr;

												const isLastInSubAc =
													i === data.length - 1 ||
													data[i + 1].SubAc !== currentSubAc;

												rows.push(
													<React.Fragment key={i}>
														{isNewSubAc && (
															<tr className="bg-gray-100 font-bold text-xs">
																<td
																	colSpan={7}
																	className="px-2 py-1"
																>
																	Sub Account:{" "}
																	{item.AcName1 ||
																		currentSubAc}{" "}
																	| Opening Balance:{" "}
																	{formatNumber(opening)}
																</td>
															</tr>
														)}
														<tr
															className={
																i % 2
																	? "bg-white"
																	: "bg-gray-50"
															}
														>
															<td className="px-2 py-1 text-left break-words">
																{item.DocPf}
																{item.DocNo}
															</td>
															<td className="px-2 py-1 text-left break-words">
																{item.Remarks}
															</td>
															<td className="px-2 py-1 text-center">
																{item.AcctDt
																	? new Date(
																			item.AcctDt
																	  ).toLocaleDateString()
																	: ""}
															</td>
															<td className="px-2 py-1 text-left break-words">
																{item.Ref1}{" "}
																{item.ChqNo &&
																	`/ Chq: ${item.ChqNo}`}
															</td>
															<td className="px-2 py-1 text-right font-mono">
																{formatNumber(dr)}
															</td>
															<td className="px-2 py-1 text-right font-mono">
																{formatNumber(cr)}
															</td>
															<td className="px-2 py-1 text-right font-mono">
																{formatNumber(running)}
															</td>
														</tr>
														{isLastInSubAc && (
															<>
																<tr className="bg-yellow-50 font-bold text-xs">
																	<td
																		colSpan={4}
																		className="px-2 py-1 text-right"
																	>
																		Sub Account Total -{" "}
																		{currentSubAc}:
																	</td>
																	<td className="px-2 py-1 text-right font-mono">
																		{formatNumber(
																			subAccountTotals[
																				currentSubAc
																			]?.dr || 0
																		)}
																	</td>
																	<td className="px-2 py-1 text-right font-mono">
																		{formatNumber(
																			subAccountTotals[
																				currentSubAc
																			]?.cr || 0
																		)}
																	</td>
																	<td className="px-2 py-1 text-right font-mono">
																		{formatNumber(running)}
																	</td>
																</tr>
																<tr className="bg-yellow-100 font-bold text-xs">
																	<td
																		colSpan={7}
																		className="px-2 py-1 text-left"
																	>
																		Closing Balance -{" "}
																		{currentSubAc}:{" "}
																		{formatNumber(running)}
																	</td>
																</tr>
															</>
														)}
													</React.Fragment>
												);
											});
											return rows;
										})()}
									</tbody>
								</table>
							</div>

							<div className="mt-4 grid grid-cols-1 md:grid-cols-2 text-sm font-bold">
								<div>
									<p>
										Net Movement:{" "}
										{formatNumber(
											Object.values(subAccountTotals).reduce(
												(s, t) => s + t.dr,
												0
											) -
												Object.values(subAccountTotals).reduce(
													(s, t) => s + t.cr,
													0
												)
										)}
									</p>
								</div>
								<div className="text-right">
									<p>
										Closing Balance:{" "}
										{formatNumber(data[0].GLClosingBalance)}
									</p>
								</div>
							</div>
						</div>
					</div>

					<iframe ref={iframeRef} className="hidden" title="print-frame" />
				</div>
			)}
		</div>
	);
};

export default LCWithoutSubAcc;
