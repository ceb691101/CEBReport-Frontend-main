import {useEffect, useState, useRef} from "react";
import {
	Search,
	RotateCcw,
	Eye,
	ChevronLeft,
	Download,
	Printer,
	Calendar,
	X,
} from "lucide-react";
import {useUser} from "../../contexts/UserContext";
import {toast, ToastContainer} from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface Department {
	DeptId: string;
	DeptName: string;
}

interface CompletedData {
	ProjectNo: string;
	StdCost: number;
	Descr: string;
	FundId: string;
	AccountCode: string;
	CatCd: string;
	DeptId: string;
	CctName: string;
	C8: string;
	CommitedCost: number;
	PaidDate: string | null;
	PivReceiptNo: string | null;
	PivNo: string | null;
	PivAmount: number;
	ConfDt: string;
}

interface TransformedData {
	AccountCode: string;
	ProjectNo: string;
	CategoryCode: string;
	FundId: string;
	StandCost: number;
	Description: string;
	PIVdate: string;
	PIVNo: string;
	CloseDate: string;
	Labour: number;
	Material: number;
	Other: number;
	Total: number;
}

const CompletedCostCenterWise = () => {
	const {user} = useUser();
	const epfNo = user?.Userno || "";

	const [data, setData] = useState<Department[]>([]);
	const [filtered, setFiltered] = useState<Department[]>([]);
	const [searchId, setSearchId] = useState("");
	const [searchName, setSearchName] = useState("");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [page, setPage] = useState(1);
	const pageSize = 9;

	const [selectedDepartment, setSelectedDepartment] =
		useState<Department | null>(null);
	const [showDateRangePicker, setShowDateRangePicker] = useState(false);

	const [startDate, setStartDate] = useState<Date | null>(null);
	const [endDate, setEndDate] = useState<Date | null>(null);

	const [startText, setStartText] = useState<string>("");
	const [endText, setEndText] = useState<string>("");

	const [startError, setStartError] = useState<string>("");
	const [endError, setEndError] = useState<string>("");

	const [showCalendar, setShowCalendar] = useState<"start" | "end" | null>(
		null
	);

	const [completedModalOpen, setCompletedModalOpen] = useState(false);
	const [, setCompletedData] = useState<CompletedData[]>([]);
	const [transformedData, setTransformedData] = useState<TransformedData[]>(
		[]
	);
	const [completedLoading, setCompletedLoading] = useState(false);
	const [completedError, setCompletedError] = useState<string | null>(null);

	const printRef = useRef<HTMLDivElement>(null);

	const maroon = "text-[#7A0000]";
	const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";
	const shadedMaroon = "bg-[#A52A2A]/40"
;

	const formatDate = (d?: Date | null) =>
		d
			? `${(d.getMonth() + 1).toString().padStart(2, "0")}/${d
					.getDate()
					.toString()
					.padStart(2, "0")}/${d.getFullYear()}`
			: "";

	const parseDateInput = (raw: string): Date | null => {
		const s = raw.trim();
		if (!s) return null;

		const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
		const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

		if (iso.test(s)) {
			const [, y, m, d] = s.match(iso)!;
			const date = new Date(Number(y), Number(m) - 1, Number(d));
			if (
				date &&
				date.getFullYear() === Number(y) &&
				date.getMonth() === Number(m) - 1 &&
				date.getDate() === Number(d)
			)
				return date;
			return null;
		}

		if (slash.test(s)) {
			const [, a, b, c] = s.match(slash)!;
			const try1 = new Date(Number(c), Number(a) - 1, Number(b));
			if (
				try1 &&
				try1.getFullYear() === Number(c) &&
				try1.getMonth() === Number(a) - 1 &&
				try1.getDate() === Number(b)
			)
				return try1;

			const try2 = new Date(Number(c), Number(b) - 1, Number(a));
			if (
				try2 &&
				try2.getFullYear() === Number(c) &&
				try2.getMonth() === Number(b) - 1 &&
				try2.getDate() === Number(a)
			)
				return try2;

			return null;
		}

		return null;
	};

	const isFuture = (d: Date | null) =>
		d ? d.getTime() > new Date().setHours(0, 0, 0, 0) : false;
	const daysAgo = (d: Date | null) => {
		if (!d) return 0;
		const today = new Date();
		const diff = Math.floor(
			(today.setHours(0, 0, 0, 0) -
				new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) /
				(1000 * 60 * 60 * 24)
		);
		return diff > 0 ? diff : 0;
	};

	const transformData = (rows: CompletedData[]): TransformedData[] => {
		const map = new Map<string, TransformedData>();

		rows.forEach((item) => {
			const key = item.ProjectNo?.trim();
			if (!key) return;

			if (!map.has(key)) {
				map.set(key, {
					AccountCode: item.AccountCode || "",
					ProjectNo: key,
					CategoryCode: item.CatCd || "",
					FundId: item.FundId || "",
					StandCost: item.StdCost || 0,
					Description: item.Descr || "",
					PIVdate: item.PaidDate || "",
					PIVNo: item.PivNo || "",
					CloseDate: item.ConfDt || "",
					Labour: 0,
					Material: 0,
					Other: 0,
					Total: 0,
				});
			}

			const row = map.get(key)!;
			const cost = item.CommitedCost || 0;

			switch ((item.C8 || "").toUpperCase()) {
				case "LAB":
					row.Labour += cost;
					break;
				case "MAT":
					row.Material += cost;
					break;
				case "OTH":
					row.Other += cost;
					break;
				default:
					row.Other += cost;
			}
			row.Total = row.Labour + row.Material + row.Other;
		});

		return Array.from(map.values());
	};

	useEffect(() => {
		const run = async () => {
			if (!epfNo) {
				setError("No EPF number available. Please login again.");
				setLoading(false);
				return;
			}
			setLoading(true);
			try {
				const res = await fetch(
					`/misapi/api/incomeexpenditure/departments/${epfNo}`
				);
				if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
				const parsed = await res.json();

				let raw: any[] = [];
				if (Array.isArray(parsed)) raw = parsed;
				else if (parsed.data) raw = parsed.data;
				else if (parsed.result) raw = parsed.result;
				else if (parsed.departments) raw = parsed.departments;

				const final: Department[] = (raw || []).map((it: any) => ({
					DeptId: it.DeptId?.toString() || it.deptId?.toString() || "",
					DeptName:
						it.DeptName?.toString().trim() ||
						it.deptName?.toString().trim() ||
						"",
				}));

				setData(final);
				setFiltered(final);
			} catch (e: any) {
				setError(e.message);
			} finally {
				setLoading(false);
			}
		};
		run();
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

	const handleDepartmentSelect = (department: Department) => {
		setSelectedDepartment(department);

		if (startDate && endDate && !startError && !endError) {
			handleViewCompletedProjects(department);
		} else {
			toast.error(
				"Please select a valid date range before viewing projects.",
				{
					position: "top-right",
					autoClose: 4000,
				}
			);
		}
	};

	const closeDateRangeModal = () => {
		setShowDateRangePicker(false);
		setSelectedDepartment(null);
		setStartDate(null);
		setEndDate(null);
		setStartText("");
		setEndText("");
		setStartError("");
		setEndError("");
		setShowCalendar(null);
	};

	const onStartTextChange = (val: string) => {
		setStartText(val);
		setStartError("");
		const d = parseDateInput(val);
		if (val && !d) {
			setStartError("Invalid date. Use DD/MM/YYYY or YYYY-MM-DD");
			return;
		}
		if (d && isFuture(d)) {
			setStartError("Future dates are not allowed");
			return;
		}
		if (d) setStartDate(d);
	};

	const onEndTextChange = (val: string) => {
		setEndText(val);
		setEndError("");
		const d = parseDateInput(val);
		if (val && !d) {
			setEndError("Invalid date. Use DD/MM/YYYY or YYYY-MM-DD");
			return;
		}
		if (d && isFuture(d)) {
			setEndError("Future dates are not allowed");
			return;
		}
		if (d) setEndDate(d);
	};

	const handleViewCompletedProjects = async (department?: Department) => {
		const targetDepartment = department || selectedDepartment;
		if (!targetDepartment || !startDate || !endDate || startError || endError)
			return;

		const fromDate = startDate.toISOString().split("T")[0];
		const toDate = endDate.toISOString().split("T")[0];

		setShowDateRangePicker(false);
		setCompletedModalOpen(true);
		setCompletedLoading(true);
		setCompletedError(null);
		setCompletedData([]);
		setTransformedData([]);
		setShowCalendar(null);

		try {
			const response = await fetch(
				`/misapi/api/workinprogresscompletedcostcenterwise/${targetDepartment.DeptId}/${fromDate}/${toDate}`
			);
			if (!response.ok)
				throw new Error(`HTTP error! status: ${response.status}`);

			const result = await response.json();
			let rows: any[] = [];
			if (Array.isArray(result)) rows = result;
			else if (result.data) rows = result.data;
			else if (result.result) rows = result.result;

			setCompletedData(rows as CompletedData[]);
			setTransformedData(transformData(rows as CompletedData[]));
		} catch (err: any) {
			setCompletedError(err.message);
		} finally {
			setCompletedLoading(false);
		}
	};

	const clearFilters = () => {
		setSearchId("");
		setSearchName("");
	};

	const downloadAsCSV = () => {
		if (
			!transformedData.length ||
			!selectedDepartment ||
			!startDate ||
			!endDate
		)
			return;

		// Calculate totals
		const totals = {
			standCost: transformedData.reduce((s, i) => s + (i.StandCost || 0), 0),
			labour: transformedData.reduce((s, i) => s + (i.Labour || 0), 0),
			material: transformedData.reduce((s, i) => s + (i.Material || 0), 0),
			other: transformedData.reduce((s, i) => s + (i.Other || 0), 0),
			total: transformedData.reduce((s, i) => s + (i.Total || 0), 0),
		};

		// Format number for CSV (no thousands separator, 2 decimals)
		const formatNum = (num: number) => num.toFixed(2);

		const csvRows = [
			// Header section
			[
				`WIP Close Job Report - End of ${startDate.toLocaleDateString(
					"en-CA"
				)} To ${endDate.toLocaleDateString("en-CA")}`,
			],
			[
				`Cost Center : ${
					selectedDepartment.DeptId
				} / ${selectedDepartment.DeptName.toUpperCase()}`,
			],
			[],
			// Column headers
			[
				"Account",
				"Project No.",
				"Category",
				"Fund Id",
				"Stand_Cost",
				"Description",
				"Paid Date",
				"PIV_No",
				"Project Assigned",
				"LABOUR",
				"MATERIAL",
				"OTHER",
				"TOTAL",
			],
			// Data rows
			...transformedData.map((item) => [
				item.AccountCode || "",
				item.ProjectNo || "",
				item.CategoryCode || "",
				item.FundId || "",
				formatNum(item.StandCost || 0),
				`"${(item.Description || "").replace(/"/g, '""')}"`,
				item.PIVdate || "",
				item.PIVNo || "",
				item.CloseDate
					? new Date(item.CloseDate).toLocaleDateString("en-US")
					: "",
				formatNum(item.Labour || 0),
				formatNum(item.Material || 0),
				formatNum(item.Other || 0),
				formatNum(item.Total || 0),
			]),
			// Total row
			[],
			[
				"",
				"",
				"",
				"",
				formatNum(totals.standCost),
				"TOTAL",
				"",
				"",
				"",
				formatNum(totals.labour),
				formatNum(totals.material),
				formatNum(totals.other),
				formatNum(totals.total),
			],
			[],
			// Summary section
			["SUMMARY"],
			["Total Labour", formatNum(totals.labour)],
			["Total Material", formatNum(totals.material)],
			["Total Other", formatNum(totals.other)],
			["Total Stand Cost", formatNum(totals.standCost)],
			["Grand Total", formatNum(totals.total)],
			[],
			[`Generated: ${new Date().toLocaleString()}`],
			[`${new Date().getFullYear()}`],
		];

		const csvContent = csvRows.map((r) => r.join(",")).join("\n");
		const blob = new Blob([csvContent], {type: "text/csv;charset=utf-8;"});
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `WIP_CloseJobReport_${
			selectedDepartment.DeptId
		}_${startDate.toISOString().slice(0, 10)}_${endDate
			.toISOString()
			.slice(0, 10)}.csv`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};

	// UPDATED PDF FUNCTION - Matching CostCenterTrial style
	const printPDF = () => {
		if (
			!transformedData.length ||
			!selectedDepartment ||
			!startDate ||
			!endDate
		)
			return;

		const totals = {
			labour: transformedData.reduce((s, i) => s + (i.Labour || 0), 0),
			material: transformedData.reduce((s, i) => s + (i.Material || 0), 0),
			other: transformedData.reduce((s, i) => s + (i.Other || 0), 0),
			standCost: transformedData.reduce((s, i) => s + (i.StandCost || 0), 0),
			grandTotal: transformedData.reduce((s, i) => s + (i.Total || 0), 0),
		};

		const w = window.open("", "_blank");
		if (!w) return;

		w.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Completed Projects Report</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin-top: 5mm;
          font-size: 10px;
          color: #333;
        }

        .header {
          text-align: center;
          margin-bottom: 15px;
          border-bottom: 2px solid #7A0000;
          padding-bottom: 10px;
        }

        .header h1 {
          color: #7A0000;
          font-size: 16px;
          margin: 0;
          font-weight: bold;
        }

        .header h2 {
          color: #7A0000;
          font-size: 12px;
          margin: 5px 0;
        }

        .header-info {
          margin-top: 8px;
          font-size: 10px;
          color: #666;
        }

        table {
          width: calc(100% - 2mm);
          margin-left: 0.5mm;
          margin-right: 0.5mm;
          border-collapse: collapse;
          margin-bottom: 0; /* reduced */
          table-layout: fixed;
        }

        th, td {
          padding: 4px 2px;
          border: 1px solid #ddd;
          text-align: left;
          word-wrap: break-word;
          overflow: hidden;
        }

        th {
          background-color: #7A0000;
          font-weight: bold;
          text-align: center;
        }

        th:nth-child(1), td:nth-child(1) { width: 4%; }
        th:nth-child(2), td:nth-child(2) { width: 7%; }
        th:nth-child(3), td:nth-child(3) { width: 7%; }
        th:nth-child(4), td:nth-child(4) { width: 4%; }
        th:nth-child(5), td:nth-child(5) { width: 8%; text-align: right; }
        th:nth-child(6), td:nth-child(6) { width: 23%; }
        th:nth-child(7), td:nth-child(7) { width: 7%; }
        th:nth-child(8), td:nth-child(8) { width: 7%; }
        th:nth-child(9), td:nth-child(9) { width: 7%; text-align: center; }
        th:nth-child(10), td:nth-child(10) { width: 8%; text-align: right; }
        th:nth-child(11), td:nth-child(11) { width: 8%; text-align: right; }
        th:nth-child(12), td:nth-child(12) { width: 8%; text-align: right; }
        th:nth-child(13), td:nth-child(13) { width: 9%; text-align: right; font-weight: bold; }

        .summary-section {
          margin-top: 15px;
          padding: 8px;
          background-color: #f9f9f9;
          border: 1px solid #ddd;
          border-radius: 5px;
        }

        .summary-section h4 {
          color: #7A0000;
          margin-top: 0;
          margin-bottom: 8px;
          font-size: 12px;
        }

        .summary-section p {
          margin: 4px 0;
          font-size: 10px;
        }

        .footer {
          margin-top: 2px; /* reduced */
          text-align: center;
          font-size: 9px;
          color: #666;
          border-top: 1px solid #ddd;
          padding-top: 3px; /* reduced */
        }

        @media print {
          body { margin: 4mm; }
          .header { page-break-inside: avoid; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; }
          @page {
            size: A4 landscape;
 
            @bottom-left { 
              content: "Printed on: ${new Date().toLocaleString("en-US", {
						timeZone: "Asia/Colombo",
					})}";
              font-size: 8px; 
              color: gray; 
			  
            }
            @bottom-right { 
              content: "Page " counter(page) " of " counter(pages);
              font-size: 8px; 
              color: gray; 
            }
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>COMPLETED PROJECTS REPORT</h1>
        <h2>Cost Center: ${selectedDepartment.DeptId} - ${
			selectedDepartment.DeptName
		}</h2>
        <div class="header-info">
          Period: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()} | 
          Currency: LKR | 
        
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Account Code</th>
            <th>Project No</th>
            <th>Category Code</th>
            <th>Fund Id</th>
            <th>Stand Cost</th>
            <th>Description</th>
            <th>Paid Date</th>
            <th>PIV_No</th>
            <th>Close Date</th>
            <th>Labour</th>
            <th>Material</th>
            <th>Other</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${transformedData
					.map(
						(i) => `
            <tr>
              <td>${i.AccountCode || ""}</td>
              <td style="font-family: monospace;">${i.ProjectNo || ""}</td>
              <td>${i.CategoryCode || ""}</td>
              <td style="font-family: monospace;">${i.FundId || ""}</td>
              <td style="text-align:right; font-family: monospace;">${(
						i.StandCost || 0
					).toLocaleString("en-US", {
						minimumFractionDigits: 2,
						maximumFractionDigits: 2,
					})}</td>
              <td style="white-space: normal; overflow-wrap: break-word;">${
						i.Description || ""
					}</td>
              <td>${
						i.PIVdate ? new Date(i.PIVdate).toLocaleDateString() : "-"
					}</td>
              <td style="font-family: monospace;">${i.PIVNo || "-"}</td>
              <td style="text-align:center;">${
						i.CloseDate ? new Date(i.CloseDate).toLocaleDateString() : "-"
					}</td>
              <td style="text-align:right; font-family: monospace;">${(
						i.Labour || 0
					).toLocaleString("en-US", {
						minimumFractionDigits: 2,
						maximumFractionDigits: 2,
					})}</td>
              <td style="text-align:right; font-family: monospace;">${(
						i.Material || 0
					).toLocaleString("en-US", {
						minimumFractionDigits: 2,
						maximumFractionDigits: 2,
					})}</td>
              <td style="text-align:right; font-family: monospace;">${(
						i.Other || 0
					).toLocaleString("en-US", {
						minimumFractionDigits: 2,
						maximumFractionDigits: 2,
					})}</td>
              <td style="text-align:right; font-family: monospace; font-weight: bold;">${(
						i.Total || 0
					).toLocaleString("en-US", {
						minimumFractionDigits: 2,
						maximumFractionDigits: 2,
					})}</td>
            </tr>`
					)
					.join("")}
        </tbody>
      </table>

      <div class="summary-section">
        <h4>SUMMARY</h4>
        <p><b>Total Labour:</b> ${totals.labour.toLocaleString("en-US", {
				minimumFractionDigits: 2,
				maximumFractionDigits: 2,
			})}</p>
        <p><b>Total Material:</b> ${totals.material.toLocaleString("en-US", {
				minimumFractionDigits: 2,
				maximumFractionDigits: 2,
			})}</p>
        <p><b>Total Other:</b> ${totals.other.toLocaleString("en-US", {
				minimumFractionDigits: 2,
				maximumFractionDigits: 2,
			})}</p>
        <p><b>Total Stand Cost:</b> ${totals.standCost.toLocaleString("en-US", {
				minimumFractionDigits: 2,
				maximumFractionDigits: 2,
			})}</p>
        <p><b>Grand Total:</b> ${totals.grandTotal.toLocaleString("en-US", {
				minimumFractionDigits: 2,
				maximumFractionDigits: 2,
			})}</p>
      </div>

      <div class="footer">
        <p>Generated on: ${new Date().toLocaleDateString()} |  @${new Date().getFullYear()}</p>
      </div>
    </body>
    </html>
  `);
		w.document.close();
		w.focus();
		setTimeout(() => {
			w.print();
			w.close();
		}, 300);
	};

	const CalendarComponent = ({type}: {type: "start" | "end"}) => {
		const [currentMonth, setCurrentMonth] = useState(new Date());
		const selected = type === "start" ? startDate : endDate;
		const setSelected = type === "start" ? setStartDate : setEndDate;

		const today = new Date();
		today.setHours(0, 0, 0, 0);

		const y = currentMonth.getFullYear();
		const m = currentMonth.getMonth();

		const first = new Date(y, m, 1);
		const last = new Date(y, m + 1, 0);
		const daysInMonth = last.getDate();
		const startDow = first.getDay();

		const days: (Date | null)[] = [];
		for (let i = 0; i < startDow; i++) days.push(null);
		for (let d = 1; d <= daysInMonth; d++) days.push(new Date(y, m, d));

		const pick = (d: Date) => {
			if (d > today) return;
			setSelected(d);
			if (type === "start") setStartText(formatDate(d));
			else setEndText(formatDate(d));
			setShowCalendar(null);
		};
		const prev = () => setCurrentMonth(new Date(y, m - 1, 1));
		const next = () => setCurrentMonth(new Date(y, m + 1, 1));

		const monthNames = [
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

		return (
			<div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-50 p-2 min-w-[240px] max-w-[280px]">
				<div className="flex justify-between items-center mb-2 pb-1 border-b border-gray-100">
					<button
						onClick={prev}
						className="p-0.5 hover:bg-gray-100 rounded"
					>
						<ChevronLeft className="w-3 h-3" />
					</button>
					<h3 className="font-bold text-xs text-gray-800 px-1">
						{monthNames[m]} {y}
					</h3>
					<button
						onClick={next}
						className="p-0.5 hover:bg-gray-100 rounded"
					>
						<ChevronLeft className="w-3 h-3 rotate-180" />
					</button>
				</div>
				<div className="grid grid-cols-7 gap-0.5 text-xs">
					{["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
						<div
							key={d}
							className="p-0.5 text-center font-semibold text-gray-600 bg-gray-50 rounded"
						>
							{d}
						</div>
					))}
					{days.map((date, i) => {
						if (!date) return <div key={i} className="p-0.5" />;
						const isSel =
							selected &&
							date.toDateString() === selected.toDateString();
						const isToday =
							date.toDateString() === new Date().toDateString();
						const disabled = date > today;
						return (
							<button
								key={i}
								disabled={disabled}
								onClick={() => pick(date)}
								className={`p-0.5 text-center rounded text-xs font-medium transition-colors ${
									isSel
										? "bg-[#7A0000] text-white shadow-sm"
										: isToday
										? "bg-blue-100 text-blue-600 font-bold border border-blue-300"
										: disabled
										? "text-gray-300 cursor-not-allowed bg-gray-50"
										: "hover:bg-gray-100"
								}`}
							>
								{date.getDate()}
							</button>
						);
					})}
				</div>
				<div className="mt-2 pt-1 border-t border-gray-200">
					<button
						onClick={() => setShowCalendar(null)}
						className="w-full py-0.5 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded"
					>
						Close
					</button>
				</div>
			</div>
		);
	};

	const paginatedDepartments = filtered.slice(
		(page - 1) * pageSize,
		page * pageSize
	);

	return (
		<div className="w-full p-6 bg-white rounded-xl shadow border border-gray-200 text-sm font-sans relative">
			<div className="flex justify-between items-center mb-4">
				<h2 className={`text-xl font-bold ${maroon}`}>
					Cost Center Wise Completed Projects
				</h2>
			</div>

			{/* Search and Date Selection Section */}
			<div className="bg-gray-50 p-4 rounded-lg mb-4">
				<div className="grid grid-cols-5 gap-4 items-end">
					<div className="relative">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
						<input
							type="text"
							value={searchId}
							placeholder="Search by Dept ID"
							onChange={(e) => setSearchId(e.target.value)}
							className="pl-10 pr-3 py-2 w-full rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A0000] transition text-sm"
							autoComplete="off"
						/>
					</div>
					<div className="relative">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
						<input
							type="text"
							value={searchName}
							placeholder="Search by Name"
							onChange={(e) => setSearchName(e.target.value)}
							className="pl-10 pr-3 py-2 w-full rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A0000] transition text-sm"
							autoComplete="off"
						/>
					</div>
					<div className="relative">
						<label className="block text-xs font-medium text-gray-700 mb-1">
							Start Date
						</label>
						<div className="relative">
							<input
								type="text"
								value={startText || formatDate(startDate)}
								placeholder="DD/MM/YYYY or YYYY-MM-DD"
								onChange={(e) => onStartTextChange(e.target.value)}
								onFocus={() => setShowCalendar("start")}
								className={`w-full pl-3 pr-10 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 ${
									startError
										? "border-red-400 focus:ring-red-400"
										: "border-gray-300 focus:ring-[#7A0000]"
								} bg-white`}
							/>
							<Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
						</div>
						{startError && (
							<div className="mt-1 text-[11px] text-red-600">
								{startError}
							</div>
						)}
						{showCalendar === "start" && (
							<CalendarComponent type="start" />
						)}
					</div>
					<div className="relative">
						<label className="block text-xs font-medium text-gray-700 mb-1">
							End Date
						</label>
						<div className="relative">
							<input
								type="text"
								value={endText || formatDate(endDate)}
								placeholder="DD/MM/YYYY or YYYY-MM-DD"
								onChange={(e) => onEndTextChange(e.target.value)}
								onFocus={() => setShowCalendar("end")}
								className={`w-full pl-3 pr-10 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 ${
									endError
										? "border-red-400 focus:ring-red-400"
										: "border-gray-300 focus:ring-[#7A0000]"
								} bg-white`}
							/>
							<Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
						</div>
						{endError && (
							<div className="mt-1 text-[11px] text-red-600">
								{endError}
							</div>
						)}
						{showCalendar === "end" && <CalendarComponent type="end" />}
					</div>
					<div className="flex gap-2">
						{(searchId || searchName) && (
							<button
								onClick={clearFilters}
								className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm"
							>
								<RotateCcw className="w-4 h-4" /> Clear
							</button>
						)}
					</div>
				</div>
			</div>

			{loading && (
				<div className="text-center py-8">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7A0000] mx-auto"></div>
					<p className="mt-2 text-gray-600">Loading departments...</p>
				</div>
			)}
			{error && (
				<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
					Error: {error}
				</div>
			)}
			{!loading && !error && filtered.length === 0 && (
				<div className="text-gray-600 bg-gray-100 p-4 rounded">
					No departments found.
				</div>
			)}

			{!loading && !error && filtered.length > 0 && (
				<>
					<div className="overflow-x-auto rounded-lg border border-gray-200">
						<div className="max-h-[50vh] overflow-y-auto">
							<table className="w-full table-fixed text-left text-gray-700 text-sm">
								<thead
									className={`${maroonGrad} text-white sticky top-0`}
								>
									<tr>
										<th className="px-4 py-2 w-1/4">
											Cost Center Code
										</th>
										<th className="px-4 py-2 w-1/2">
											Cost Center Name
										</th>
										<th className="px-4 py-2 w-1/4 text-center">
											Action
										</th>
									</tr>
								</thead>
								<tbody>
									{paginatedDepartments.map((d, i) => (
										<tr
											key={`${d.DeptId}-${i}`}
											className={`${
												i % 2 ? "bg-white" : "bg-gray-50"
											} ${
												selectedDepartment?.DeptId === d.DeptId
													? "ring-2 ring-[#7A0000] ring-inset"
													: ""
											}`}
										>
											<td className="px-4 py-2 truncate font-mono">
												{d.DeptId}
											</td>
											<td className="px-4 py-2 truncate">
												{d.DeptName}
											</td>
											<td className="px-4 py-2 text-center">
												<button
													onClick={() => handleDepartmentSelect(d)}
													className={`px-3 py-1 rounded-md text-xs font-medium shadow transition-opacity flex items-center gap-1 ${
														selectedDepartment?.DeptId ===
														d.DeptId
															? "bg-green-600 text-white"
															: startDate &&
															  endDate &&
															  !startError &&
															  !endError
															? maroonGrad +
															  " text-white hover:brightness-110"
															: shadedMaroon+" text-white cursor-not-allowed"
													}`}
													disabled={
														selectedDepartment?.DeptId ===
															d.DeptId ||
														!(
															startDate &&
															endDate &&
															!startError &&
															!endError
														)
													}
												>
													<Eye className="w-3 h-3" />
													{selectedDepartment?.DeptId === d.DeptId
														? "Viewing"
														: "View"}
												</button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>

					<div className="flex justify-end items-center gap-3 mt-3">
						<button
							onClick={() => setPage((p) => Math.max(1, p - 1))}
							disabled={page === 1}
							className="px-3 py-1 border rounded bg-white text-gray-600 text-xs hover:bg-gray-100 disabled:opacity-40"
						>
							Previous
						</button>
						<span className="text-xs text-gray-500">
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
							className="px-3 py-1 border rounded bg-white text-gray-600 text-xs hover:bg-gray-100 disabled:opacity-40"
						>
							Next
						</button>
					</div>
				</>
			)}

			{showDateRangePicker && (
				<div className="fixed inset-0 z-50 flex items-end justify-center p-4 pb-16">
					<div className="absolute inset-0 bg-white/90 backdrop-blur-lg"></div>
					<div className="relative bg-white w-full max-w-lg rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
						<div className="bg-white p-4 text-gray-800 border-b border-gray-200">
							<div className="flex justify-between items-center">
								<div>
									<h2 className="text-lg font-bold mb-1 text-[#7A0000]">
										SELECT DATE RANGE
									</h2>
									<div className="w-8 h-1 bg-[#7A0000] mb-1"></div>
									<h3 className="text-xl font-black text-[#7A0000]">
										VIEW PROJECTS
									</h3>
									<p className="text-gray-600 mt-1 text-xs">
										Cost Center:{" "}
										<span className="font-semibold text-[#7A0000]">
											{selectedDepartment?.DeptName}
										</span>
									</p>
								</div>
								<button
									onClick={closeDateRangeModal}
									className="text-gray-600 hover:text-gray-800 p-1 rounded-full hover:bg-gray-100"
								>
									<X className="w-5 h-5" />
								</button>
							</div>
						</div>

						<div className="p-4 min-h-[420px] flex flex-col">
							<div className="grid grid-cols-2 gap-4 mb-6">
								<div className="relative">
									<label className="block text-sm font-semibold text-gray-700 mb-1">
										START DATE
									</label>
									<div className="relative">
										<input
											type="text"
											value={startText || formatDate(startDate)}
											placeholder="DD/MM/YYYY or YYYY-MM-DD"
											onChange={(e) =>
												onStartTextChange(e.target.value)
											}
											onFocus={() => setShowCalendar("start")}
											className={`w-full pl-3 pr-10 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 ${
												startError
													? "border-red-400 focus:ring-red-400"
													: "border-gray-300 focus:ring-[#7A0000]"
											} bg-white`}
										/>
										<Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
									</div>

									{startDate &&
										!isFuture(startDate) &&
										daysAgo(startDate) > 0 &&
										!startError && (
											<div className="mt-1 text-[11px] text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-1">
												Past date by {daysAgo(startDate)} day(s)
											</div>
										)}
									{startError && (
										<div className="mt-1 text-[11px] text-red-600">
											{startError}
										</div>
									)}

									{showCalendar === "start" && (
										<CalendarComponent type="start" />
									)}
								</div>

								<div className="relative">
									<label className="block text-sm font-semibold text-gray-700 mb-1">
										END DATE
									</label>
									<div className="relative">
										<input
											type="text"
											value={endText || formatDate(endDate)}
											placeholder="DD/MM/YYYY or YYYY-MM-DD"
											onChange={(e) =>
												onEndTextChange(e.target.value)
											}
											onFocus={() => setShowCalendar("end")}
											className={`w-full pl-3 pr-10 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 ${
												endError
													? "border-red-400 focus:ring-red-400"
													: "border-gray-300 focus:ring-[#7A0000]"
											} bg-white`}
										/>
										<Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
									</div>

									{endDate &&
										!isFuture(endDate) &&
										daysAgo(endDate) > 0 &&
										!endError && (
											<div className="mt-1 text-[11px] text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-1">
												Past date by {daysAgo(endDate)} day(s)
											</div>
										)}
									{endError && (
										<div className="mt-1 text-[11px] text-red-600">
											{endError}
										</div>
									)}

									{showCalendar === "end" && (
										<CalendarComponent type="end" />
									)}
								</div>
							</div>

							<div className="flex gap-2 justify-between items-center pt-4 border-t border-gray-200 mt-auto">
								<button
									onClick={closeDateRangeModal}
									className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
								>
									Cancel
								</button>
								<button
									onClick={() => handleViewCompletedProjects()}
									disabled={
										!startDate ||
										!endDate ||
										!!startError ||
										!!endError
									}
									className={`px-6 py-2 rounded-lg font-semibold text-sm ${
										startDate && endDate && !startError && !endError
											? "bg-gradient-to-r from-[#7A0000] to-[#A52A2A] text-white hover:shadow-lg"
											: "bg-gray-300 text-gray-500 cursor-not-allowed"
									}`}
								>
									View Projects
								</button>
							</div>
						</div>
					</div>
				</div>
			)}

			{completedModalOpen && (
				<div className="fixed inset-0 bg-white flex items-start justify-end z-50 pt-24 pb-8 pl-64 pr-4">
					<div className="absolute inset-0 bg-white/90 backdrop-blur-sm"></div>

					<div className="relative bg-white w-full max-w-6xl rounded-lg shadow-lg border border-gray-300 max-h-[85vh] flex flex-col mr-4">
						<div className="p-5 border-b bg-white sticky top-[1cm] z-20 mt-[1cm]">
							<div className="flex flex-wrap justify-between items-start gap-3">
								<div className="space-y-1">
									<h2 className="text-base font-bold text-gray-800">
										Cost Center Wise Completed Projects
									</h2>
									<h3 className="text-sm text-[#7A0000]">
										Cost Center: {selectedDepartment?.DeptId} /
										{selectedDepartment?.DeptName}
									</h3>
									<div className="text-xs text-gray-600">
										Period: {startDate?.toLocaleDateString()} to{" "}
										{endDate?.toLocaleDateString()}
									</div>
								</div>

								<div className="flex flex-wrap items-center gap-2">
									<button
										onClick={downloadAsCSV}
										className="flex items-center gap-1 px-3 py-1.5 border border-blue-400 text-blue-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-blue-50"
									>
										<Download className="w-3 h-3" /> CSV
									</button>
									<button
										onClick={printPDF}
										className="flex items-center gap-1 px-3 py-1.5 border border-green-400 text-green-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-green-50"
									>
										<Printer className="w-3 h-3" /> PDF
									</button>
									<button
										onClick={() => {
											setCompletedModalOpen(false);
											setSelectedDepartment(null);
										}}
										className="px-3 py-1.5 text-xs bg-[#7A0000] text-white rounded hover:brightness-110"
									>
										Back To Home
									</button>
								</div>
							</div>
							{completedError && (
								<div className="text-red-600 text-xs mt-2">
									{completedError}
								</div>
							)}
						</div>

						<div className="px-6 py-5 overflow-y-auto flex-grow">
							{completedLoading ? (
								<div className="flex items-center justify-center py-8">
									<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7A0000] mr-3"></div>
									<span className="text-[#7A0000] text-sm">
										Loading completed projects...
									</span>
								</div>
							) : transformedData.length === 0 ? (
								<div className="flex flex-col items-center justify-center py-12">
									<div className="text-gray-400 mb-4">
										<svg
											className="w-16 h-16 mx-auto"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={1}
												d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
											/>
										</svg>
									</div>
									<h3 className="text-lg font-medium text-gray-700 mb-2">
										No Completed Projects Found
									</h3>
									<p className="text-gray-500 text-center max-w-md">
										We couldn't find any completed projects for{" "}
										<strong>{selectedDepartment?.DeptName}</strong> in
										this period.
									</p>
								</div>
							) : (
								<div
									ref={printRef}
									className="w-full overflow-x-auto text-xs"
								>
									<div className="flex justify-between items-center p-2 bg-gray-50 border border-gray-200 rounded-t-lg">
										<span className="text-xs font-semibold text-gray-600">
											Currency: LKR
										</span>
									</div>

									<div className="border border-gray-200 rounded-b-lg">
										<table className="w-full border-collapse">
											<thead
												className="sticky top-[0px] text-gray-800"
												style={{backgroundColor: "#D3D3D3"}}
											>
												<tr>
													<th className="px-2 py-1 text-left border-b border-r">
														Account Code
													</th>
													<th className="px-2 py-1 text-left border-b border-r">
														Project No
													</th>
													<th className="px-2 py-1 text-left border-b border-r">
														Category Code
													</th>
													<th className="px-2 py-1 text-left border-b border-r">
														Fund Id
													</th>
													<th className="px-2 py-1 text-right border-b border-r">
														Stand Cost
													</th>
													<th className="px-2 py-1 text-left border-b border-r">
														Description
													</th>
													<th className="px-2 py-1 text-left border-b border-r">
														Paid Date
													</th>
													<th className="px-2 py-1 text-left border-b border-r">
														PIV_No
													</th>
													<th className="px-2 py-1 text-center border-b border-r">
														Close Date
													</th>
													<th className="px-2 py-1 text-right border-b border-r">
														Labour
													</th>
													<th className="px-2 py-1 text-right border-b border-r">
														Material
													</th>
													<th className="px-2 py-1 text-right border-b border-r">
														Other
													</th>
													<th className="px-2 py-1 text-right border-b">
														Total
													</th>
												</tr>
											</thead>
											<tbody>
												{transformedData.map((item, index) => (
													<tr
														key={index}
														className="border-b hover:bg-gray-50"
													>
														<td className="px-2 py-1 border-r">
															{item.AccountCode}
														</td>
														<td className="px-2 py-1 border-r font-mono">
															{item.ProjectNo?.trim()}
														</td>
														<td className="px-2 py-1 border-r">
															{item.CategoryCode?.trim()}
														</td>
														<td className="px-2 py-1 border-r font-mono">
															{item.FundId?.trim()}
														</td>
														<td className="px-2 py-1 border-r text-right font-mono">
															{item.StandCost?.toLocaleString(
																"en-US",
																{
																	minimumFractionDigits: 2,
																	maximumFractionDigits: 2,
																}
															)}
														</td>
														<td
															className="px-2 py-1 border-r max-w-xs"
															title={item.Description?.trim()}
														>
															<div
																className="whitespace-normal break-words"
																style={{
																	fontSize: "10px",
																	lineHeight: "1.2",
																}}
															>
																{item.Description?.trim()}
															</div>
														</td>
														<td className="px-2 py-1 border-r">
															{item.PIVdate
																? new Date(
																		item.PIVdate
																  ).toLocaleDateString()
																: "-"}
														</td>
														<td className="px-2 py-1 border-r font-mono">
															{item.PIVNo || "-"}
														</td>
														<td className="px-2 py-1 border-r text-center">
															{item.CloseDate
																? new Date(
																		item.CloseDate
																  ).toLocaleDateString()
																: "-"}
														</td>
														<td className="px-2 py-1 border-r text-right font-mono">
															{item.Labour?.toLocaleString(
																"en-US",
																{
																	minimumFractionDigits: 2,
																	maximumFractionDigits: 2,
																}
															)}
														</td>
														<td className="px-2 py-1 border-r text-right font-mono">
															{item.Material?.toLocaleString(
																"en-US",
																{
																	minimumFractionDigits: 2,
																	maximumFractionDigits: 2,
																}
															)}
														</td>
														<td className="px-2 py-1 border-r text-right font-mono">
															{item.Other?.toLocaleString(
																"en-US",
																{
																	minimumFractionDigits: 2,
																	maximumFractionDigits: 2,
																}
															)}
														</td>
														<td className="px-2 py-1 text-right font-mono font-semibold">
															{item.Total?.toLocaleString(
																"en-US",
																{
																	minimumFractionDigits: 2,
																	maximumFractionDigits: 2,
																}
															)}
														</td>
													</tr>
												))}
											</tbody>
											<tfoot>
												<tr className="bg-gray-100 border-t-2 border-gray-300">
													<td
														colSpan={4}
														className="px-2 py-3 font-bold text-gray-800"
													>
														TOTAL
													</td>
													<td className="px-2 py-3 text-right font-bold text-gray-800 font-mono">
														{transformedData
															.reduce(
																(s, i) =>
																	s + (i.StandCost || 0),
																0
															)
															.toLocaleString("en-US", {
																minimumFractionDigits: 2,
																maximumFractionDigits: 2,
															})}
													</td>
													<td colSpan={4}></td>
													<td className="px-2 py-3 text-right font-bold text-gray-800 font-mono">
														{transformedData
															.reduce(
																(s, i) => s + (i.Labour || 0),
																0
															)
															.toLocaleString("en-US", {
																minimumFractionDigits: 2,
																maximumFractionDigits: 2,
															})}
													</td>
													<td className="px-2 py-3 text-right font-bold text-gray-800 font-mono">
														{transformedData
															.reduce(
																(s, i) => s + (i.Material || 0),
																0
															)
															.toLocaleString("en-US", {
																minimumFractionDigits: 2,
																maximumFractionDigits: 2,
															})}
													</td>
													<td className="px-2 py-3 text-right font-bold text-gray-800 font-mono">
														{transformedData
															.reduce(
																(s, i) => s + (i.Other || 0),
																0
															)
															.toLocaleString("en-US", {
																minimumFractionDigits: 2,
																maximumFractionDigits: 2,
															})}
													</td>
													<td className="px-2 py-3 text-right font-bold text-[#7A0000] text-sm font-mono">
														{transformedData
															.reduce(
																(s, i) => s + (i.Total || 0),
																0
															)
															.toLocaleString("en-US", {
																minimumFractionDigits: 2,
																maximumFractionDigits: 2,
															})}
													</td>
												</tr>
											</tfoot>
										</table>
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
			)}

			{/* Toast Container */}
			<ToastContainer
				position="top-right"
				autoClose={4000}
				hideProgressBar={false}
				newestOnTop={false}
				closeOnClick
				rtl={false}
				pauseOnFocusLoss
				draggable
				pauseOnHover
				theme="light"
			/>
		</div>
	);
};

export default CompletedCostCenterWise;
