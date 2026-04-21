import React, { useEffect, useState } from "react";
import { Search, RotateCcw, Eye, Download, Printer } from "lucide-react";
import { useUser } from "../../contexts/UserContext";

interface CostCenter {
  CostCenterId: string;
  CostCenterName: string;
}

interface QuantityOnHandData {
  MatCd: string;
  MatNm: string;
  GrdCd: string;
  MajUom: string;
  Alocated: number;
  QtyOnHand: number;
  UnitPrice: number;
  Value: number;
  CctName: string;
}

const CostCenterQuantityHnad: React.FC = () => {
  // Get user from context
  const { user } = useUser();
  
  // Main state
  const [data, setData] = useState<CostCenter[]>([]);
  const [searchId, setSearchId] = useState("");
  const [searchName, setSearchName] = useState("");
  const [filtered, setFiltered] = useState<CostCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 9;

  // Selection state
  const [selectedCostCenter, setSelectedCostCenter] = useState<CostCenter | null>(null);

  // Material selection state
  const [materialSelectionType, setMaterialSelectionType] = useState<'all' | 'specific'>('all');
  const [materialCode, setMaterialCode] = useState('');
  const [showMaterialSelection, setShowMaterialSelection] = useState(false);

  // Quantity On Hand modal state
  const [quantityModalOpen, setQuantityModalOpen] = useState(false);
  const [quantityData, setQuantityData] = useState<QuantityOnHandData[]>([]);
  const [quantityLoading, setQuantityLoading] = useState(false);
  const [quantityError, setQuantityError] = useState<string | null>(null);

  // Get EPF Number from user context (Userno field)
  const epfNo = user?.Userno || "";
  
  // Debug log to see what EPF number is being used
  useEffect(() => {
  }, [user, epfNo]);

  // Colors
  const maroon = "text-[#7A0000]";
  const maroonBg = "bg-[#7A0000]";
  const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";


  // Paginated cost centers
  const paginatedCostCenters = filtered.slice((page - 1) * pageSize, page * pageSize);

  // Fetch cost centers
  useEffect(() => {
    const fetchData = async () => {
      // Don't fetch if no EPF number
      if (!epfNo) {
        setError("No EPF number available. Please login again.");
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(`/misapi/api/incomeexpenditure/departments/${epfNo}`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await res.text();
          throw new Error(`Expected JSON but got ${contentType}. Response: ${text.substring(0, 100)}`);
        }
        
        const parsed = await res.json();
        
        let rawData = [];
        if (Array.isArray(parsed)) {
          rawData = parsed;
        } else if (parsed.data && Array.isArray(parsed.data)) {
          rawData = parsed.data;
        } else if (parsed.result && Array.isArray(parsed.result)) {
          rawData = parsed.result;
        } else if (parsed.departments && Array.isArray(parsed.departments)) {
          rawData = parsed.departments;
        } else {
          rawData = [];
        }
        
        const final: CostCenter[] = rawData.map((item: any) => ({
          CostCenterId: item.DeptId?.toString() || item.deptId?.toString() || item.CostCenterId?.toString() || "",
          CostCenterName: item.DeptName?.toString().trim() || item.deptName?.toString().trim() || item.CostCenterName?.toString().trim() || "",
        }));
        
        setData(final);
        setFiltered(final);
      } catch (e: any) {
        console.error('API Error:', e);
        setError(e.message.includes("JSON.parse") ? "Invalid data format received from server. Please check if the API is returning valid JSON." : e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [epfNo]);

  // Filter cost centers
  useEffect(() => {
    const f = data.filter(
      (d) =>
        (!searchId || d.CostCenterId.toLowerCase().includes(searchId.toLowerCase())) &&
        (!searchName || d.CostCenterName.toLowerCase().includes(searchName.toLowerCase()))
    );
    setFiltered(f);
    setPage(1);
  }, [searchId, searchName, data]);

  // Fetch quantity on hand data
  const fetchQuantityData = async () => {
    if (!selectedCostCenter) return;
    
    setQuantityLoading(true);
    setQuantityError(null);
    try {
      // Build API URL based on selection type
      let apiUrl = `/misapi/api/inventoryonhand/${selectedCostCenter.CostCenterId}`;
      if (materialSelectionType === 'specific' && materialCode.trim()) {
        apiUrl += `?matCode=${encodeURIComponent(materialCode.trim())}`;
      }
      
      const res = await fetch(apiUrl);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text();
        throw new Error(`Expected JSON but got ${contentType}. Response: ${text.substring(0, 100)}`);
      }
      
      const parsed = await res.json();
      
      let rawData = [];
      if (Array.isArray(parsed)) {
        rawData = parsed;
      } else if (parsed.data && Array.isArray(parsed.data)) {
        rawData = parsed.data;
      } else if (parsed.result && Array.isArray(parsed.result)) {
        rawData = parsed.result;
      } else if (parsed.materials && Array.isArray(parsed.materials)) {
        rawData = parsed.materials;
      } else {
        rawData = [];
      }
      
      setQuantityData(rawData);
      setQuantityModalOpen(true);
    } catch (error: any) {
      console.error('API Error:', error);
      setQuantityError(error.message.includes("JSON.parse") ? "Invalid data format received from server. Please check if the API is returning valid JSON." : error.message);
    } finally {
      setQuantityLoading(false);
    }
  };

  const handleCostCenterSelect = (costCenter: CostCenter) => {
    setSelectedCostCenter(costCenter);
    setShowMaterialSelection(true);
  };

  const handleViewData = () => {
    if (materialSelectionType === 'specific' && !materialCode.trim()) {
      setQuantityError('Please enter a material code for specific material selection.');
      return;
    }
    fetchQuantityData();
  };

  const closeQuantityModal = () => {
    setQuantityModalOpen(false);
    setQuantityData([]);
    setSelectedCostCenter(null);
    setShowMaterialSelection(false);
    setMaterialCode('');
    setMaterialSelectionType('all');
  };

  const clearFilters = () => {
    setSearchId("");
    setSearchName("");
  };


  const formatNumber = (num: number | null): string => {
    if (num === null || num === 0) return "0.00";
    return new Intl.NumberFormat('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    }).format(num);
  };

  // Download as CSV function - Updated to match the second code's structure
  const downloadAsCSV = () => {
    if (!quantityData || quantityData.length === 0) return;

    // Calculate totals
    const totals = {
      allocated: quantityData.reduce((sum, item) => sum + (item.Alocated || 0), 0),
      qtyOnHand: quantityData.reduce((sum, item) => sum + (item.QtyOnHand || 0), 0),
      value: quantityData.reduce((sum, item) => sum + (item.Value || 0), 0)
    };

    // Format number for CSV (no thousands separator, 2 decimals)
    const formatNum = (num: number) => num.toFixed(2);

    const csvRows = [
      // Header section
      [`Quantity On Hand Report - ${new Date().toLocaleDateString()}`],
      [`Cost Centre : ${selectedCostCenter?.CostCenterId} / ${selectedCostCenter?.CostCenterName.toUpperCase()}${materialSelectionType === 'specific' && materialCode ? ` / Material Code - ${materialCode}` : ''}`],
      [],
      // Column headers
      ["Material Code", "Material Name", "Grade Code", "Unit", "Allocated", "Quantity On Hand", "Unit Price", "Value"],
      // Data rows
      ...quantityData.map((item) => [
        item.MatCd?.trim() || "",
        `"${(item.MatNm?.trim() || "").replace(/"/g, '""')}"`,
        item.GrdCd?.trim() || "",
        item.MajUom?.trim() || "",
        formatNum(item.Alocated || 0),
        formatNum(item.QtyOnHand || 0),
        formatNum(item.UnitPrice || 0),
        formatNum(item.Value || 0)
      ]),
      // Total row
      [],
      [
        "", "", "", "", 
        formatNum(totals.allocated),
        formatNum(totals.qtyOnHand),
        "TOTAL",
        formatNum(totals.value)
      ],
      [],
      // Summary section
      ["SUMMARY"],
      ["Total Allocated", formatNum(totals.allocated)],
      ["Total Quantity On Hand", formatNum(totals.qtyOnHand)],
      ["Total Value", formatNum(totals.value)],
      ["Total Records", quantityData.length.toString()],
      [],
      [`Generated: ${new Date().toLocaleString()}`],
      [`${new Date().getFullYear()}`]
    ];

    const csvContent = csvRows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const materialSuffix = materialSelectionType === 'specific' && materialCode ? `_${materialCode}` : '';
    link.download = `QuantityOnHand_${selectedCostCenter?.CostCenterId}${materialSuffix}_${new Date().toLocaleDateString().replace(/\//g, '-')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Print PDF function
  const printPDF = () => {
    if (!quantityData || quantityData.length === 0) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let tableRowsHTML = '';
    quantityData.forEach((item) => {
      const allocated = item.Alocated || item.Alocated === 0 ? (item.Alocated === 0 ? "-" : item.Alocated) : "-";
      const qtyOnHand = item.QtyOnHand || item.QtyOnHand === 0 ? (item.QtyOnHand === 0 ? "-" : item.QtyOnHand) : "-";
      const unitPrice = item.UnitPrice || item.UnitPrice === 0 ? (item.UnitPrice === 0 ? "-" : formatNumber(item.UnitPrice)) : "-";
      const value = item.Value || item.Value === 0 ? (item.Value === 0 ? "-" : formatNumber(item.Value)) : "-";
      
      tableRowsHTML += `
        <tr>
          <td style="padding: 4px 8px; border: 1px solid #333; font-family: monospace; font-size: 11px;">${item.MatCd?.trim() || ""}</td>
          <td style="padding: 4px 8px; border: 1px solid #333; font-size: 11px;">${item.MatNm?.trim() || ""}</td>
          <td style="padding: 4px 8px; border: 1px solid #333; text-align: center; font-size: 11px;">${item.GrdCd?.trim() || ""}</td>
          <td style="padding: 4px 8px; border: 1px solid #333; text-align: center; font-size: 11px;">${item.MajUom?.trim() || ""}</td>
          <td style="padding: 4px 8px; border: 1px solid #333; text-align: right; font-family: monospace; font-size: 11px;">${allocated}</td>
          <td style="padding: 4px 8px; border: 1px solid #333; text-align: right; font-family: monospace; font-size: 11px;">${qtyOnHand}</td>
          <td style="padding: 4px 8px; border: 1px solid #333; text-align: right; font-family: monospace; font-size: 11px;">${unitPrice}</td>
          <td style="padding: 4px 8px; border: 1px solid #333; text-align: right; font-family: monospace; font-size: 11px;">${value}</td>
        </tr>
      `;
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Quantity On Hand Report - ${new Date().toLocaleDateString()}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 15px;
            font-size: 11px;
            color: #000;
            line-height: 1.2;
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
          }
          .header h1 {
            font-size: 14px;
            margin: 0;
            font-weight: bold;
            text-transform: uppercase;
          }
          .header h2 {
            font-size: 12px;
            margin: 3px 0;
            font-weight: normal;
            text-transform: uppercase;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
            font-size: 11px;
          }
          th {
            background-color: #fff;
            color: #000;
            font-weight: bold;
            text-align: center;
            padding: 6px 8px;
            border: 1px solid #333;
            font-size: 11px;
          }
          .currency-info {
            text-align: left;
            margin-bottom: 10px;
            font-size: 10px;
          }
          .footer {
            margin-top: 20px;
            text-align: center;
            font-size: 9px;
            color: #666;
            border-top: 1px solid #333;
            padding-top: 10px;
          }
          @media print {
            body { margin: 0; }
            .header { page-break-inside: avoid; }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>CEYLON ELECTRICITY BOARD - INVENTORY REPORT - COST CENTRE: ${selectedCostCenter?.CostCenterId} / ${selectedCostCenter?.CostCenterName}${materialSelectionType === 'specific' && materialCode ? ` / MATERIAL CODE - ${materialCode}` : ''}</h1>
          <h2>QUANTITY ON HAND REPORT - ${new Date().toLocaleDateString()}</h2>
        </div>
        
        <div class="currency-info">
          <strong>Currency: LKR</strong>
        </div>
        
        <table>
          <thead>
            <tr>
              <th style="width: 12%; text-align: left;">MATERIAL CODE</th>
              <th style="width: 30%; text-align: left;">MATERIAL NAME</th>
              <th style="width: 10%; text-align: center;">GRADE CODE</th>
              <th style="width: 10%; text-align: center;">UNIT</th>
              <th style="width: 12%; text-align: center;">ALLOCATED</th>
              <th style="width: 14%; text-align: center;">QUANTITY ON HAND</th>
              <th style="width: 12%; text-align: center;">UNIT PRICE</th>
              <th style="width: 12%; text-align: center;">VALUE</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHTML}
          </tbody>
        </table>
        
        <div class="footer">
          <p>Generated on: ${new Date().toLocaleDateString()} | Inventory System</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  };
// Material Selection Modal Component
  const MaterialSelectionModal = () => {
    if (!showMaterialSelection || !selectedCostCenter) return null;

    return (
      <div className="fixed inset-0 bg-white bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 pt-24 pb-8 pl-64 animate-fadeIn">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-xl mx-4 transform transition-all animate-slideUp">
          {/* Header with gradient */}
          <div className={`${maroonGrad} rounded-t-2xl p-4 text-white`}>
            <h3 className="text-lg font-bold">
              Material Selection
            </h3>
            <p className="text-xs text-white text-opacity-90 mt-1">
              Configure your inventory report parameters
            </p>
          </div>

          {/* Body */}
          <div className="p-5">
            {/* Cost Center Info Card */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-3 mb-4 border border-gray-200">
              <p className="text-xs text-gray-500 mb-0.5 font-medium">Selected Cost Center</p>
              <p className="text-sm font-bold text-gray-800">
                {selectedCostCenter.CostCenterId}
              </p>
              <p className="text-xs text-gray-700 mt-0.5">
                {selectedCostCenter.CostCenterName}
              </p>
            </div>

            <div className="space-y-4">
              {/* Selection Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Select Report Scope
                </label>
                <div className="space-y-2">
                  <label className={`flex items-center cursor-pointer p-2 rounded-lg border-2 transition-all ${
                    materialSelectionType === 'all' 
                      ? 'border-[#7A0000] bg-red-50 shadow-sm' 
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                  }`}>
                    <input
                      type="radio"
                      name="materialType"
                      value="all"
                      checked={materialSelectionType === 'all'}
                      onChange={(e) => setMaterialSelectionType(e.target.value as 'all' | 'specific')}
                      className="mr-2.5 w-4 h-4 text-[#7A0000] focus:ring-[#7A0000]"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-semibold text-gray-800 block">All Materials</span>
                      <span className="text-xs text-gray-500">Generate report for all materials</span>
                    </div>
                  </label>
                  <label className={`flex items-center cursor-pointer p-2 rounded-lg border-2 transition-all ${
                    materialSelectionType === 'specific' 
                      ? 'border-[#7A0000] bg-red-50 shadow-sm' 
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                  }`}>
                    <input
                      type="radio"
                      name="materialType"
                      value="specific"
                      checked={materialSelectionType === 'specific'}
                      onChange={(e) => setMaterialSelectionType(e.target.value as 'all' | 'specific')}
                      className="mr-2.5 w-4 h-4 text-[#7A0000] focus:ring-[#7A0000]"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-semibold text-gray-800 block">Specific Material</span>
                      <span className="text-xs text-gray-500">Generate report for single material</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Material Code Input with animation */}
              {materialSelectionType === 'specific' && (
                <div className="animate-slideDown">
                  <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                    Material Code
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={materialCode}
                      onChange={(e) => setMaterialCode(e.target.value.toUpperCase())}
                      placeholder="Enter material code"
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7A0000] focus:border-transparent text-sm font-mono tracking-wide transition-all"
                      autoComplete="off"
                      autoFocus={materialSelectionType === 'specific'}
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                      <Search className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 ml-1">
                    💡 Enter exact material code
                  </p>
                </div>
              )}

              {/* Error Message with icon */}
              {quantityError && (
                <div className="bg-red-50 border-l-4 border-red-500 p-2 rounded-lg animate-shake">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-4 w-4 text-red-400 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-2">
                      <p className="text-xs font-medium text-red-800">{quantityError}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowMaterialSelection(false);
                  setSelectedCostCenter(null);
                  setMaterialCode('');
                  setMaterialSelectionType('all');
                  setQuantityError(null);
                }}
                className="px-6 py-2.5 border-2 border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 hover:border-gray-400 text-sm font-semibold transition-all shadow-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleViewData}
                disabled={quantityLoading}
                className={`px-6 py-2.5 ${maroonGrad} text-white rounded-xl hover:brightness-110 text-sm font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2`}
              >
                {quantityLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Loading...
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" />
                    View Report
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };
  // Quantity On Hand Modal Component
  const QuantityOnHandModal = () => {
    if (!quantityModalOpen || !selectedCostCenter) return null;
    
    const totalValue = quantityData.reduce((sum, item) => sum + (item.Value || 0), 0);

    return (
      <div className="fixed inset-0 bg-white flex items-start justify-end z-50 pt-24 pb-8 pl-64">
        <div className="bg-white w-full max-w-7xl rounded-lg shadow-lg border border-gray-300 max-h-[85vh] flex flex-col mr-4">
          <div className="p-5 border-b">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h2 className="text-base font-bold text-gray-800">
                  CEYLON ELECTRICITY BOARD - INVENTORY REPORT
                </h2>
                <h3 className="text-sm font-semibold text-gray-700">
                  COST CENTRE: {selectedCostCenter.CostCenterId} / ${selectedCostCenter.CostCenterName}
                  {materialSelectionType === 'specific' && materialCode && (
                    <span className="ml-2 text-blue-600">/ MATERIAL CODE - ${materialCode}</span>
                  )}
                </h3>
                <h4 className={`text-sm ${maroon} font-medium`}>
                  QUANTITY ON HAND REPORT - {new Date().toLocaleDateString()}
                </h4>
                <p className="text-xs text-gray-600 mt-2">Currency: LKR</p>
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={downloadAsCSV}
                  className="flex items-center gap-1 px-3 py-1.5 border border-blue-400 text-blue-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-blue-50 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
                >
                  <Download className="w-3 h-3" /> CSV
                </button>
                <button
                  onClick={printPDF}
                  className="flex items-center gap-1 px-3 py-1.5 border border-green-400 text-green-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-green-50 hover:text-green-800 focus:outline-none focus:ring-2 focus:ring-green-200 transition"
                >
                  <Printer className="w-3 h-3" /> PDF
                </button>
              </div>
            </div>
            {quantityError && (
              <div className="text-red-600 text-xs mt-2 text-center">
                {quantityError}
              </div>
            )}
          </div>
          <div className="px-6 py-5 overflow-y-auto flex-grow">
            {quantityLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7A0000] mr-3"></div>
                <span className={`${maroon} text-sm`}>Loading quantity on hand data...</span>
              </div>
            ) : quantityData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="text-gray-400 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-700 mb-2">No Data Available</h3>
                <p className="text-gray-500 text-center max-w-md">
                  We couldn't find any quantity on hand records for <strong>{selectedCostCenter.CostCenterName}</strong>.
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Try selecting a different month or year, or contact your administrator if you believe this is an error.
                </p>
              </div>
            ) : (
              <div className="w-full overflow-x-auto text-xs">
                <table className="w-full border-collapse border border-gray-200">
                  <thead>
                    <tr className="text-gray-800" style={{backgroundColor: '#D3D3D3'}}>
                      <th className="px-4 py-3 text-left border-r border-gray-300 font-bold">MATERIAL<br/>CODE</th>
                      <th className="px-4 py-3 text-left border-r border-gray-300 font-bold">MATERIAL<br/>NAME</th>
                      <th className="px-4 py-3 text-center border-r border-gray-300 font-bold">GRADE<br/>CODE</th>
                      <th className="px-4 py-3 text-center border-r border-gray-300 font-bold">UNIT</th>
                      <th className="px-4 py-3 text-center border-r border-gray-300 font-bold">ALLOCATED</th>
                      <th className="px-4 py-3 text-center border-r border-gray-300 font-bold">QUANTITY<br/>ON HAND</th>
                      <th className="px-4 py-3 text-center border-r border-gray-300 font-bold">UNIT<br/>PRICE</th>
                      <th className="px-4 py-3 text-center font-bold">VALUE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quantityData.map((item, index) => (
                      <tr key={`item-${index}`} className={index % 2 ? "bg-white" : "bg-gray-50"}>
                        <td className="px-4 py-2 font-mono border-r border-gray-200">{item.MatCd?.trim() || ""}</td>
                        <td className="px-4 py-2 border-r border-gray-200">{item.MatNm?.trim() || ""}</td>
                        <td className="px-4 py-2 text-center border-r border-gray-200">{item.GrdCd?.trim() || ""}</td>
                        <td className="px-4 py-2 text-center border-r border-gray-200">{item.MajUom?.trim() || ""}</td>
                        <td className="px-4 py-2 text-right font-mono border-r border-gray-200">{item.Alocated || item.Alocated === 0 ? (item.Alocated === 0 ? "-" : item.Alocated) : "-"}</td>
                        <td className="px-4 py-2 text-right font-mono border-r border-gray-200">{item.QtyOnHand || item.QtyOnHand === 0 ? (item.QtyOnHand === 0 ? "-" : item.QtyOnHand) : "-"}</td>
                        <td className="px-4 py-2 text-right font-mono border-r border-gray-200">{item.UnitPrice || item.UnitPrice === 0 ? (item.UnitPrice === 0 ? "-" : formatNumber(item.UnitPrice)) : "-"}</td>
                        <td className="px-4 py-2 text-right font-mono">{item.Value || item.Value === 0 ? (item.Value === 0 ? "-" : formatNumber(item.Value)) : "-"}</td>
                      </tr>
                    ))}
                    {/* Summary Row */}
                    <tr className="bg-gray-100 border-t-2 border-gray-300">
                      <td className="px-4 py-3 font-bold border-r border-gray-200"></td>
                      <td className="px-4 py-3 font-bold border-r border-gray-200">TOTAL</td>
                      <td className="px-4 py-3 text-center border-r border-gray-200"></td>
                      <td className="px-4 py-3 text-center border-r border-gray-200"></td>
                      <td className="px-4 py-3 text-right font-mono border-r border-gray-200"></td>
                      <td className="px-4 py-3 text-right font-mono border-r border-gray-200"></td>
                      <td className="px-4 py-3 text-center border-r border-gray-200"></td>
                      <td className="px-4 py-3 text-right font-mono font-bold">{formatNumber(totalValue)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="p-5 border-t flex justify-center gap-3">
            <button
              onClick={closeQuantityModal}
              className={`px-4 py-1.5 text-sm ${maroonBg} text-white rounded hover:brightness-110`} 
            >
              Back To Home
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-6 bg-white rounded-xl shadow border border-gray-200 text-sm font-sans">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className={`text-xl font-bold ${maroon}`}>
            Cost Center Quantity On Hand
          </h2>
        </div>
      </div>

      {/* Search Controls */}
      <div className="flex flex-wrap gap-3 justify-end mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
          <input
            type="text"
            value={searchId}
            placeholder="Search by Cost Center ID"
            onChange={(e) => setSearchId(e.target.value)}
            className="pl-8 pr-3 py-1.5 w-40 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A0000] transition text-sm"
            autoComplete="off"
          />
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
          <input
            type="text"
            value={searchName}
            placeholder="Search by Name"
            onChange={(e) => setSearchName(e.target.value)}
            className="pl-8 pr-3 py-1.5 w-40 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A0000] transition text-sm"
            autoComplete="off"
          />
        </div>
        {(searchId || searchName) && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm"
          >
            <RotateCcw className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7A0000] mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading cost centers...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          Error: {error}
        </div>
      )}

      {/* No Results */}
      {!loading && !error && filtered.length === 0 && (
        <div className="text-gray-600 bg-gray-100 p-4 rounded">No cost centers found.</div>
      )}

      {/* Table */}
      {!loading && !error && filtered.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <div className="max-h-[50vh] overflow-y-auto">
              <table className="w-full table-fixed text-left text-gray-700 text-sm">
                <thead className={`${maroonGrad} text-white sticky top-0`}>
                  <tr>
                    <th className="px-4 py-2 w-1/4">Cost Center ID</th>
                    <th className="px-4 py-2 w-1/2">Cost Center Name</th>
                    <th className="px-4 py-2 w-1/4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedCostCenters.map((costCenter, i) => (
                    <tr 
                      key={`${costCenter.CostCenterId}-${i}`} 
                      className={`${i % 2 ? "bg-white" : "bg-gray-50"} ${
                        selectedCostCenter?.CostCenterId === costCenter.CostCenterId ? "ring-2 ring-[#7A0000] ring-inset" : ""
                      }`}
                    >
                      <td className="px-4 py-2 truncate font-mono">{costCenter.CostCenterId}</td>
                      <td className="px-4 py-2 truncate">{costCenter.CostCenterName}</td>
                      <td className="px-4 py-2 text-center">
                        <button
                          onClick={() => handleCostCenterSelect(costCenter)}
                          className={`px-3 py-1 ${
                            selectedCostCenter?.CostCenterId === costCenter.CostCenterId 
                              ? "bg-green-600 text-white" 
                              : maroonGrad + " text-white"
                          } rounded-md text-xs font-medium hover:brightness-110 transition shadow`}
                        >
                          <Eye className="inline-block mr-1 w-3 h-3" /> 
                          {selectedCostCenter?.CostCenterId === costCenter.CostCenterId ? "Viewing" : "View"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex justify-end items-center gap-3 mt-3">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 border rounded bg-white text-gray-600 text-xs hover:bg-gray-100 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-xs text-gray-500">
              Page {page} of {Math.ceil(filtered.length / pageSize)}
            </span>
            <button
              onClick={() => setPage(p => Math.min(Math.ceil(filtered.length / pageSize), p + 1))}
              disabled={page >= Math.ceil(filtered.length / pageSize)}
              className="px-3 py-1 border rounded bg-white text-gray-600 text-xs hover:bg-gray-100 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </>
      )}


      {/* Material Selection Modal */}
      <MaterialSelectionModal />

      {/* Quantity On Hand Modal */}
      <QuantityOnHandModal />
    </div>
  );
};

export default CostCenterQuantityHnad;