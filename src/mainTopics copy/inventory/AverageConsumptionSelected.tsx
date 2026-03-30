import React, {useEffect, useState} from "react";
import {Search, RotateCcw, Eye, X, Download, Printer} from "lucide-react";
import {useUser} from "../../contexts/UserContext";
import {toast} from "react-toastify";

interface Department {
	DeptId: string;
	DeptName: string;
}

interface Warehouse {
	WarehouseCode: string;
	CostCenterId?: string;
}

interface AverageConsumption {
	WarehouseCode: string;
	MaterialCode: string;
	MaterialName: string;
	GradeCode: string;
	UnitPrice: number;
	QuantityOnHand: number;
	TransactionQuantity: number;
	AverageConsumption: number;
	CostCenterName: string;
}

interface ApiDepartmentResponse {
	DeptId: string;
	DeptName: string;
}

interface ApiWarehouseResponse {
	WarehouseCode: string;
	CostCenterId?: string;
}

interface ApiInventoryResponse {
	WarehouseCode: string;
	MaterialCode: string;
	MaterialName: string;
	GradeCode: string;
	UnitPrice: number;
	QuantityOnHand: number;
	TransactionQuantity: number;
	AverageConsumption: number;
	CostCenterName: string;
}

const formatNumber = (num: number | string | null | undefined): string => {
	const n = num === null || num === undefined ? NaN : Number(num);
	if (isNaN(n)) return "0.00";
	return n.toLocaleString("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
};

const AverageConsumptionSelected: React.FC = () => {
	const {user} = useUser();
	const [data, setData] = useState<Department[]>([]);
	const [searchId, setSearchId] = useState("");
	const [searchName, setSearchName] = useState("");
	const [filtered, setFiltered] = useState<Department[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [, setWarehouseError] = useState<string | null>(null);
	const [page, setPage] = useState(1);
	const [selectedDepartment, setSelectedDepartment] =
		useState<Department | null>(null);
	const [fromDate, setFromDate] = useState("");
	const [toDate, setToDate] = useState("");
	const [materialCode, setMaterialCode] = useState(""); // ← NEW
	const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
	const [selectedWarehouse, setSelectedWarehouse] = useState("");
	const [inventoryData, setInventoryData] = useState<AverageConsumption[]>([]);
	const [inventoryLoading, setInventoryLoading] = useState(false);
	const [inventoryError, setInventoryError] = useState<string | null>(null);
	const [showInventoryModal, setShowInventoryModal] = useState(false);
	const pageSize = 9;

	const maroon = "text-[#7A0000]";
	const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";

	const epfNo = user?.Userno || "";
	const today = new Date();
	const currentYear = today.getFullYear();
	const currentMonth = String(today.getMonth() + 1).padStart(2, "0");
	const currentDay = String(today.getDate()).padStart(2, "0");
	const maxDate = `${currentYear}-${currentMonth}-${currentDay}`; // Today's date: YYYY-MM-DD

	const minYear = currentYear - 20;
	const minDate = `${minYear}-${currentMonth}-${currentDay}`; // 20 years ago, same month/day

	const parseApiResponse = (response: any): any[] => {
		if (Array.isArray(response)) return response;
		if (response.data && Array.isArray(response.data)) return response.data;
		if (response.result && Array.isArray(response.result))
			return response.result;
		if (response.departments && Array.isArray(response.departments))
			return response.departments;
		if (response.Data && Array.isArray(response.Data)) return response.Data;
		if (response.warehouses && Array.isArray(response.warehouses))
			return response.warehouses;
		console.warn("Unexpected API response format:", response);
		return [];
	};

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
					`/misapi/api/incomeexpenditure/departments/${encodeURIComponent(
						epfNo
					)}`,
					{
						method: "GET",
						headers: {
							"Content-Type": "application/json",
							Accept: "application/json",
						},
						credentials: "include",
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
				const rawData = parseApiResponse(parsed);

				const final: Department[] = rawData.map(
					(item: ApiDepartmentResponse) => ({
						DeptId: item.DeptId?.toString() || "",
						DeptName: item.DeptName?.toString().trim() || "",
					})
				);

				setData(final);
				setFiltered(final);
			} catch (e: any) {
				console.error("Cost Center Fetch Error:", e);
				const errorMessage = e.message.includes("JSON.parse")
					? "Invalid data format received from server."
					: e.message.includes("Failed to fetch")
					? "Failed to connect to the server. Please check if the server is running."
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

	useEffect(() => {
		const fetchWarehouses = async () => {
			setWarehouses([]);
			setSelectedWarehouse("");
			setWarehouseError(null);

			if (!selectedDepartment || !epfNo) {
				setWarehouseError(
					"Please select a cost center to view associated warehouses."
				);
				return;
			}

			setLoading(true);
			try {
				const url = `/misapi/api/inventoryaverageconsumption/warehouses/${encodeURIComponent(
					epfNo
				)}?costCenterId=${encodeURIComponent(
					selectedDepartment.DeptId
				)}&t=${Date.now()}`;
				const response = await fetch(url, {
					method: "GET",
					headers: {
						"Content-Type": "application/json",
						Accept: "application/json",
					},
					credentials: "include",
				});

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
				const rawData = parseApiResponse(result);
				const data: Warehouse[] = rawData.map(
					(item: ApiWarehouseResponse) => ({
						WarehouseCode: item.WarehouseCode?.toString().trim() || "",
						CostCenterId: item.CostCenterId?.toString().trim() || "",
					})
				);

				const filteredData = data.filter(
					(item) =>
						!item.CostCenterId ||
						item.CostCenterId === selectedDepartment.DeptId
				);

				setWarehouses(filteredData);
				if (filteredData.length === 0) {
					setWarehouseError(
						`No warehouses found for cost center ${selectedDepartment.DeptId}.`
					);
					toast.warn(
						`No warehouses found for cost center ${selectedDepartment.DeptId}.`
					);
				} else {
					if (filteredData.length === 1) {
						setSelectedWarehouse(filteredData[0].WarehouseCode);
					}
					toast.success(
						`Successfully fetched ${filteredData.length} warehouse(s) for cost center ${selectedDepartment.DeptId}.`
					);
				}
			} catch (error: any) {
				const errorMessage = error.message.includes("Failed to fetch")
					? "Failed to connect to the server. Please verify the warehouse endpoint exists."
					: error.message;
				setWarehouseError(errorMessage);
				toast.error(`Failed to fetch warehouses: ${errorMessage}`);
			} finally {
				setLoading(false);
			}
		};

		fetchWarehouses();
	}, [selectedDepartment, epfNo]);

	const handleViewClick = async () => {
		if (!selectedDepartment) {
			toast.error("Please select a cost center.");
			return;
		}
		if (!fromDate) {
			toast.error("Please enter a from date.");
			return;
		}
		if (!toDate) {
			toast.error("Please enter a to date.");
			return;
		}
		if (fromDate === toDate) {
			toast.error(
				"From date and To date cannot be the same. Please select a different range."
			);
			return;
		}
		if (new Date(toDate) < new Date(fromDate)) {
			toast.error("To date cannot be earlier than from date.");
			return;
		}
		if (!selectedWarehouse) {
			toast.error("Please select a warehouse code.");
			return;
		}

		setInventoryLoading(true);
		setInventoryError(null);
		setInventoryData([]);
		setShowInventoryModal(true);

		try {
			const formattedFromDate = fromDate.replace(/-/g, "");
			const formattedToDate = toDate.replace(/-/g, "");
			const matCodeParam = materialCode.trim()
				? `/${encodeURIComponent(materialCode.trim())}`
				: "";

			const response = await fetch(
				`/misapi/api/avg-consumption-selected/${encodeURIComponent(
					selectedDepartment.DeptId,
				)}/${encodeURIComponent(
					selectedWarehouse.trim(),
				)}/${formattedFromDate}/${formattedToDate}${matCodeParam}`,
				{
					method: "GET",
					headers: {
						"Content-Type": "application/json",
						Accept: "application/json",
					},
					credentials: "include",
				},
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
			const data: AverageConsumption[] = parseApiResponse(result).map(
				(item: ApiInventoryResponse) => ({
					WarehouseCode: item.WarehouseCode?.toString().trim() || "",
					MaterialCode: item.MaterialCode?.toString().trim() || "",
					MaterialName: item.MaterialName?.toString().trim() || "",
					GradeCode: item.GradeCode?.toString().trim() || "",
					UnitPrice: Number(item.UnitPrice) || 0,
					QuantityOnHand: Number(item.QuantityOnHand) || 0,
					TransactionQuantity: Number(item.TransactionQuantity) || 0,
					AverageConsumption: Number(item.AverageConsumption) || 0,
					CostCenterName: item.CostCenterName?.toString().trim() || "",
				})
			);

			setInventoryData(data);
			if (data.length === 0) {
				toast.warn(`No data found for the selected criteria.`);
			} else {
				toast.success(`Successfully fetched data.`);
			}
		} catch (error: any) {
			const errorMessage = error.message.includes("Failed to fetch")
				? "Failed to connect to the server."
				: error.message;
			setInventoryError(errorMessage);
			toast.error(`Failed to fetch data: ${errorMessage}`);
		} finally {
			setInventoryLoading(false);
		}
	};

	const clearFilters = () => {
		setSearchId("");
		setSearchName("");
	};

	const printPDF = () => {
		if (inventoryData.length === 0) {
			toast.error("No data to print.");
			return;
		}

		const costCenterName = selectedDepartment?.DeptName || "";
		const columnWidths = {
			materialCode: "15%",
			materialName: "22%",
			gradeCode: "8%",
			unitPrice: "10%",
			quantityOnHand: "12%",
			transactionQuantity: "12%",
			averageConsumption: "13%",
		};

		let tableRowsHTML = "";
		inventoryData.forEach((item, index) => {
			tableRowsHTML += `
      <tr class="${index % 2 ? "bg-white" : "bg-gray-50"}">
        <td style="width:${
				columnWidths.materialCode
			}; padding:4px 6px; border:1px solid #d1d5db; text-align:left; font-size:8.5px;">${
				item.MaterialCode
			}</td>
        <td style="width:${
				columnWidths.materialName
			}; padding:4px 6px; border:1px solid #d1d5db; text-align:left; font-size:8.5px; word-break:break-word;">${
				item.MaterialName
			}</td>
        <td style="width:${
				columnWidths.gradeCode
			}; padding:4px 6px; border:1px solid #d1d5db; text-align:left; font-size:8.5px;">${
				item.GradeCode
			}</td>
        <td style="width:${
				columnWidths.unitPrice
			}; padding:4px 6px; border:1px solid #d1d5db; text-align:right; font-size:8.5px; font-family:monospace;">${formatNumber(
				item.UnitPrice
			)}</td>
        <td style="width:${
				columnWidths.quantityOnHand
			}; padding:4px 6px; border:1px solid #d1d5db; text-align:right; font-size:8.5px; font-family:monospace;">${formatNumber(
				item.QuantityOnHand
			)}</td>
        <td style="width:${
				columnWidths.transactionQuantity
			}; padding:4px 6px; border:1px solid #d1d5db; text-align:right; font-size:8.5px; font-family:monospace;">${formatNumber(
				item.TransactionQuantity
			)}</td>
        <td style="width:${
				columnWidths.averageConsumption
			}; padding:4px 6px; border:1px solid #d1d5db; text-align:right; font-size:8.5px; font-family:monospace;">${formatNumber(
				item.AverageConsumption
			)}</td>
      </tr>`;
		});

		const reportTitle =
			"Inventory Average Consumption Report - Selected Material";
		const printedOn = new Date().toLocaleString("en-US", {
			timeZone: "Asia/Colombo",
		});

		const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${reportTitle}</title>
  <style>
    @media print {
      @page { margin: 8mm 5mm 10mm 5mm; }
      body { margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 8.5px; }
      .container { width: 100%; padding: 0; }
      .header { text-align: center; font-weight: bold; color: #7A0000; font-size: 13px; margin: 10px 8px 6px; }
      .info { margin-bottom: 6px; font-size: 9px; text-align: right; }
      .summary { margin: 10px 8px 15px; font-size: 9px; }
      .summary p { margin: 3px 0; }
      .equation { margin: 8px 8px 12px; font-size: 7.5px; color: #9CA3AF; }
      table { width: 100%; border-collapse: collapse; table-layout: fixed; }
      th, td { border: 1px solid #d1d5db; padding: 4px 6px; word-wrap: break-word; }
      th { background: linear-gradient(to right, #7A0000, #A52A2A); text-align: center; font-weight: bold; font-size: 8.5px; }
      .signoff { margin-top: 25px; display: flex; justify-content: space-between; padding: 0 15px; font-size: 9px; }
      @page {
        @bottom-left { content: "Printed on: ${printedOn}"; font-size: 8px;  }
        @bottom-right { content: "Page " counter(page) " of " counter(pages); font-size: 8px;   }
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">${reportTitle}</div>
   

    <div class="summary">
      <p><strong>Cost Center:</strong> ${
			selectedDepartment?.DeptId || ""
		} - ${costCenterName}</p>
      <p><strong>Warehouse:</strong> ${selectedWarehouse}</p>
      ${
			materialCode.trim()
				? `<p><strong>Material Code:</strong> ${materialCode.trim()}</p>`
				: ""
		}
      <p><strong>Period:</strong> ${fromDate} to ${toDate}</p>
    </div>

    <div class="equation">
      Average Consumption = Σ(Issue + Issue Cancellation within Date Range) ÷ Round(MonthsBetween(ToDate, FromDate))
    </div>
	 <div class="info">
      <div>Currency: LKR</div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:${columnWidths.materialCode};">Material Code</th>
          <th style="width:${columnWidths.materialName};">Material Name</th>
          <th style="width:${columnWidths.gradeCode};">Grade Code</th>
          <th style="width:${columnWidths.unitPrice};">Unit Price</th>
          <th style="width:${
					columnWidths.quantityOnHand
				};">Quantity On Hand</th>
          <th style="width:${
					columnWidths.transactionQuantity
				};">Transaction Quantity</th>
          <th style="width:${
					columnWidths.averageConsumption
				};">Average Consumption</th>
        </tr>
      </thead>
      <tbody>
        ${tableRowsHTML}
      </tbody>
    </table>

    <div class="signoff">
      <div>Prepared By: ____________________</div>
      <div>Checked By: ____________________</div>
    </div>
  </div>
</body>
</html>`;

		const printWindow = window.open("", "_blank");
		if (!printWindow) {
			toast.error("Popup blocked. Please allow popups to print.");
			return;
		}

		printWindow.document.write(htmlContent);
		printWindow.document.close();

		printWindow.onload = () => {
			printWindow.focus();
			printWindow.print();
		};

		const closeAfterPrint = () => {
			if (printWindow && !printWindow.closed) printWindow.close();
		};
		printWindow.onafterprint = closeAfterPrint;
	};

	const handlePrintClick = () => {
		printPDF();
	};

	const handleDownloadCSV = () => {
		if (inventoryData.length === 0) return;

		const headers = [
			"Material Code",
			"Material Name",
			"Grade Code",
			"Unit Price",
			"Quantity On Hand",
			"Transaction Quantity",
			"Average Consumption",
		];

		const escapeCsv = (value: string | number | null | undefined) => {
			const s = value === null || value === undefined ? "" : String(value);
			return `"${s.replace(/"/g, '""')}"`;
		};

		const csvContent = [
			`Inventory Average Consumption Report - Selected Material`,
			`Cost Center: ${selectedDepartment?.DeptId || ""} - ${
				selectedDepartment?.DeptName || ""
			}`,
			`Warehouse: ${selectedWarehouse}`,
			materialCode.trim() ? `Material Code: ${materialCode.trim()}` : "",
			`Date Range: ${fromDate || ""} to ${toDate || ""}`,
			`Printed on: ${new Date().toLocaleString("en-US")}`,
			`Currency: LKR`,
			"",
			headers.join(","),
			...inventoryData.map((item) => {
				return [
					escapeCsv(`\t${item.MaterialCode || ""}`),
					escapeCsv(item.MaterialName || ""),
					escapeCsv(item.GradeCode || ""),
					escapeCsv(formatNumber(item.UnitPrice ?? 0)),
					escapeCsv(formatNumber(item.QuantityOnHand ?? 0)),
					escapeCsv(formatNumber(item.TransactionQuantity ?? 0)),
					escapeCsv(formatNumber(item.AverageConsumption ?? 0)),
				].join(",");
			}),
		].join("\n");

		const blob = new Blob([csvContent], {type: "text/csv;charset=utf-8;"});
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `inventory_avg_consumption_selected_${selectedWarehouse}${
			materialCode.trim() ? "_" + materialCode.trim() : ""
		}.csv`;
		link.click();
		URL.revokeObjectURL(url);
	};

	const handleCostCenterSelect = (department: Department) => {
		if (selectedDepartment?.DeptId === department.DeptId) {
			setSelectedDepartment(null);
			setWarehouses([]);
			setSelectedWarehouse("");
			setWarehouseError(null);
			setInventoryData([]);
			setShowInventoryModal(false);
			return;
		}

		setSelectedDepartment(department);
		setWarehouses([]);
		setSelectedWarehouse("");
		setWarehouseError(null);
		setInventoryData([]);
		setShowInventoryModal(false);
	};

	const paginatedDepartments = filtered.slice(
		(page - 1) * pageSize,
		page * pageSize
	);

	return (
		<div className="max-w-[95%] mx-auto p-2 md:p-4 bg-white rounded-xl shadow border border-gray-200 text-sm md:text-base font-sans">
			<h2 className={`text-lg md:text-xl font-bold mb-4 ${maroon}`}>
				Inventory Average Consumption - Selected Material
			</h2>

			<div className="flex flex-col md:flex-row flex-wrap gap-2 md:gap-3 mb-4 justify-end items-end">
				{/* Material Code - NEW FIELD */}
				<div className="flex w-full md:w-auto items-center gap-2">
					<label
						className={`text-xs md:text-sm font-bold ${maroon} whitespace-nowrap`}
					>
						Material Code:
					</label>
					<input
						type="text"
						value={materialCode}
						onChange={(e) =>
							setMaterialCode(e.target.value.toUpperCase())
						}
						placeholder="Enter Material Code"
						className="pl-2 md:pl-3 pr-2 md:pr-3 py-1 md:py-1.5 w-full md:w-44 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A0000] transition text-xs md:text-sm "
					/>
				</div>

				{/* From Date */}
				<div className="flex w-full md:w-auto items-center gap-2">
					<label
						className={`text-xs md:text-sm font-bold ${maroon} whitespace-nowrap`}
					>
						From Date:
					</label>
					<input
						type="date"
						value={fromDate}
						onChange={(e) => setFromDate(e.target.value)}
						min={minDate}
						max={maxDate}
						className="pl-2 md:pl-3 pr-2 md:pr-3 py-1 md:py-1.5 w-full md:w-40 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A0000] transition text-xs md:text-sm"
					/>
				</div>

				{/* To Date */}
				<div className="flex w-full md:w-auto items-center gap-2">
					<label
						className={`text-xs md:text-sm font-bold ${maroon} whitespace-nowrap`}
					>
						To Date:
					</label>
					<input
						type="date"
						value={toDate}
						min={minDate}
						max={maxDate}
						onChange={(e) => setToDate(e.target.value)}
						className="pl-2 md:pl-3 pr-2 md:pr-3 py-1 md:py-1.5 w-full md:w-40 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A0000] transition text-xs md:text-sm"
					/>
				</div>

				{/* Warehouse Code + View Button */}
				<div className="flex flex-col md:flex-row w-full md:w-auto gap-2 md:gap-2 items-end">
					<div className="flex items-center gap-2 md:gap-3">
						<label
							className={`text-xs md:text-sm font-bold ${maroon} whitespace-nowrap`}
						>
							Warehouse Code
						</label>

						<select
							value={selectedWarehouse}
							onChange={(e) => setSelectedWarehouse(e.target.value)}
							className="pl-2 md:pl-3 pr-2 md:pr-3 py-1 md:py-1.5 w-full md:w-40 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A0000] transition text-xs md:text-sm"
							disabled={!selectedDepartment || loading}
						>
							<option value="">Select Warehouse</option>
							{warehouses.map((wh) => (
								<option key={wh.WarehouseCode} value={wh.WarehouseCode}>
									{wh.WarehouseCode}
								</option>
							))}
						</select>
					</div>

					<button
						onClick={handleViewClick}
						disabled={
							!selectedDepartment || !selectedWarehouse || loading
						}
						className={`px-2 md:px-3 py-1 md:py-1 ${maroonGrad} text-white rounded-md text-xs md:text-sm font-medium hover:brightness-110 transition shadow ${
							!selectedDepartment || !selectedWarehouse || loading
								? "opacity-50 cursor-not-allowed"
								: ""
						}`}
					>
						<Eye className="inline-block mr-1 w-3 md:w-3 h-3 md:h-3" />{" "}
						View
					</button>
				</div>
			</div>

			{/* The rest remains exactly the same as your original code */}
			{/* Search fields */}
			<div className="flex flex-col md:flex-row flex-wrap gap-2 md:gap-3 mb-2 md:mb-4">
				<div className="relative w-full md:w-auto">
					<Search className="absolute left-2 md:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 md:w-3 h-3 md:h-3" />
					<input
						type="text"
						value={searchId}
						placeholder="Search by ID"
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

			{loading && !warehouses.length && (
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

			{!loading && !error && filtered.length > 0 && (
				<>
					<div className="overflow-x-auto rounded-lg border border-gray-200">
						<div className="max-h-[50vh] overflow-y-auto">
							<table className="w-full table-fixed text-left text-gray-700 text-xs md:text-sm">
								<thead
									className={`${maroonGrad} text-white sticky top-0`}
								>
									<tr>
										<th className="px-2 md:px-4 py-1 md:py-2 w-1/2 md:w-auto">
											Cost Center Code
										</th>
										<th className="px-2 md:px-4 py-1 md:py-2 w-1/2 md:w-auto">
											Cost Center Name
										</th>
									</tr>
								</thead>
								<tbody>
									{paginatedDepartments.map((department, i) => (
										<tr
											key={`${department.DeptId}-${i}`}
											onClick={() =>
												handleCostCenterSelect(department)
											}
											className={`cursor-pointer ${
												selectedDepartment?.DeptId ===
												department.DeptId
													? "bg-[#7A0000] text-white"
													: i % 2
													? "bg-white hover:bg-gray-100"
													: "bg-gray-50 hover:bg-gray-100"
											}`}
										>
											<td className="px-2 md:px-4 py-1 md:py-2 truncate min-w-0">
												{department.DeptId}
											</td>
											<td className="px-2 md:px-4 py-1 md:py-2 truncate min-w-0">
												{department.DeptName}
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

			{showInventoryModal && selectedDepartment && (
				<div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4 sm:p-6 print:static print:inset-auto print:p-0 print:flex-col print:items-start print:justify-start print:overflow-visible">
					<style>{`
            @media print {
              @page { size: A4; margin: 20mm 15mm 25mm 15mm; }
              body { margin: 0; font-family: Arial, sans-serif; }
              .print-container { width: 100%; margin: 0; padding: 0; }
              .print-table { border-collapse: collapse; width: 100%; table-layout: auto; }
              .print-table th, .print-table td { border: 1px solid #D1D5DB; padding: 0.25rem; font-size: 0.75rem; white-space: normal; word-break: break-word; }
              .print-table th { background: linear-gradient(to right, #7A0000, #A52A2A); color: white; text-align: center; }
              .print-table td { text-align: right; }
              .print-table td.text-left { text-align: left; }
              .print-table tr { page-break-inside: avoid; }
              thead { display: table-header-group; }
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
										onClick={handlePrintClick}
										className="flex items-center gap-1 px-3 py-1.5 border border-green-400 text-green-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-green-50 hover:text-green-800 focus:outline-none focus:ring-2 focus:ring-green-200 transition"
									>
										<Printer className="w-4 h-4" /> PDF
									</button>
									<button
										onClick={() => setShowInventoryModal(false)}
										className="flex items-center gap-1 px-3 py-1.5 border border-red-400 text-red-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-red-50 hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-red-200 transition"
									>
										<X className="w-4 h-4" /> Close
									</button>
								</div>

								<h2
									className={`text-lg md:text-xl font-bold text-center md:mb-6 ${maroon}`}
								>
									{`Inventory Average Consumption Report - Selected Material${
										fromDate && toDate
											? ` - ${fromDate} to ${toDate}`
											: ""
									}`}
								</h2>

								<div className="flex justify-between md:mb-2 md:text-sm leading-5">
									<div className="ml-5">
										<p>
											<span className="font-bold">
												Cost Center:{" "}
											</span>
											{selectedDepartment?.DeptId || ""} -{" "}
											{selectedDepartment?.DeptName}
										</p>
										<p>
											<span className="font-bold">Warehouse:</span>{" "}
											{selectedWarehouse}
										</p>
										{materialCode.trim() && (
											<p>
												<span className="font-bold">
													Material Code:
												</span>{" "}
												{materialCode.trim()}
											</p>
										)}
										<p>
											<span className="font-bold">
												Calculation based on:{" "}
											</span>
											<span className="text-gray-400">
												Average Consumption = Σ(Issue + Issue
												Cancellation within Date Range) ÷
												Round(MonthsBetween(ToDate, FromDate))
											</span>
										</p>
									</div>
								</div>

								<div className="flex justify-end text-sm md:text-base font-semibold text-gray-600 mr-5">
									Currency: LKR
								</div>

								<div className="ml-5 mt-1 border border-gray-200 rounded-lg overflow-x-auto print:ml-12 print:mt-12 print:overflow-visible">
									<table className="w-full border-collapse text-sm min-w-[700px] print-table">
										<thead className="bg-gradient-to-r from-[#7A0000] to-[#A52A2A] text-white">
											<tr>
												<th className="px-2 py-1.5 border-r border-gray-200 w-[15%] text-xs">
													Material Code
												</th>
												<th className="px-2 py-1.5 border-r border-gray-200 w-[20%] text-xs">
													Material Name
												</th>
												<th className="px-2 py-1.5 border-r border-gray-200 w-[10%] text-xs">
													Grade Code
												</th>
												<th className="px-2 py-1.5 border-r border-gray-200 w-[12%] text-xs">
													Unit Price
												</th>
												<th className="px-2 py-1.5 border-r border-gray-200 w-[12%] text-xs">
													Quantity On Hand
												</th>
												<th className="px-2 py-1.5 border-r border-gray-200 w-[12%] text-xs">
													Transaction Quantity
												</th>
												<th className="px-2 py-1.5 w-[12%] text-xs">
													Average Consumption
												</th>
											</tr>
										</thead>
										<tbody>
											{inventoryLoading ? (
												<tr>
													<td
														colSpan={7}
														className="text-center py-6"
													>
														<div className="animate-spin rounded-full h-6 md:h-8 w-6 md:w-8 border-b-2 border-[#7A0000] mx-auto"></div>
														<p className="mt-1 md:mt-2 text-gray-600 text-xs md:text-sm">
															Loading data...
														</p>
													</td>
												</tr>
											) : inventoryError ? (
												<tr>
													<td
														colSpan={7}
														className="text-center py-6"
													>
														<div className="bg-red-100 border border-red-400 text-red-700 px-2 md:px-4 py-2 md:py-3 rounded text-xs md:text-sm">
															Error: {inventoryError}
														</div>
													</td>
												</tr>
											) : inventoryData.length === 0 ? (
												<tr>
													<td
														colSpan={7}
														className="text-center py-6"
													>
														<div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6 md:p-10">
															<div className="text-gray-400 mb-4 md:mb-6">
																No data available.
															</div>
														</div>
													</td>
												</tr>
											) : (
												inventoryData.map((item, index) => (
													<tr
														key={`${item.WarehouseCode}-${item.MaterialCode}-${index}`}
														className={
															index % 2
																? "bg-white"
																: "bg-gray-50"
														}
													>
														<td className="px-2 py-1.5 border-r border-gray-200 text-xs text-left">
															{item.MaterialCode}
														</td>
														<td className="px-2 py-1.5 border-r border-gray-200 text-xs text-left break-words">
															{item.MaterialName}
														</td>
														<td className="px-2 py-1.5 border-r border-gray-200 text-xs text-left">
															{item.GradeCode}
														</td>
														<td className="px-2 py-1.5 border-r border-gray-200 text-right font-mono text-xs">
															{formatNumber(item.UnitPrice)}
														</td>
														<td className="px-2 py-1.5 border-r border-gray-200 text-right font-mono text-xs">
															{formatNumber(item.QuantityOnHand)}
														</td>
														<td className="px-2 py-1.5 border-r border-gray-200 text-right font-mono text-xs">
															{formatNumber(
																item.TransactionQuantity
															)}
														</td>
														<td className="px-2 py-1.5 text-right font-mono text-xs">
															{formatNumber(
																item.AverageConsumption
															)}
														</td>
													</tr>
												))
											)}
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
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default AverageConsumptionSelected;
