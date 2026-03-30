  
// Province codes constant
  const provinceCodes = [
    { code: "1", name: "Western Province North" },
    { code: "2", name: "Western Province South" },
    { code: "3", name: "Colombo City" },
    { code: "4", name: "Northern Province" },
    { code: "5", name: "Central Province" },
    { code: "6", name: "Uva Province" },
    { code: "7", name: "Eastern Province" },
    { code: "8", name: "North Western Province" },
    { code: "9", name: "Sabaragamuwa Province" },
    { code: "A", name: "North Central Province" },
    { code: "B", name: "Southern Province" },
    { code: "C", name: "Western Province South 2" },
    { code: "D", name: "North Western Province 2" },
    { code: "E", name: "Central Province 2" },
    { code: "F", name: "Southern Province 2" }
  ];

  // Helper to get province name from code
  const getProvinceName = (code: string) => {
    const found = provinceCodes.find(p => p.code === code);
    return found ? found.name : code;
  };
import React, { useState, useEffect, useRef } from "react";
import { FaFileDownload, FaPrint } from "react-icons/fa";

interface BillCycleOption {
  display: string;
  code: string;
}

interface DetailedTariffRow {
  Province: string;
  Division: string;
  Area: string;
  Month: string;
  D1: number;
  D1TOU: number;
  GP1: number;
  GovtHospSchools: number;
  GovtUniversities: number;
  H1: number;
  I1: number;
  AGRI: number;
  R1: number;
  Total: number;
}

const ActiveCustomersSalesByTariff: React.FC = () => {

  const [reportType, setReportType] = useState<"ordinary" | "bulk">("ordinary");
  const [fromCycle, setFromCycle] = useState("");
  const [toCycle, setToCycle] = useState("");
  const [selectedOption, setSelectedOption] = useState("Area");

  const [billCycleOptions, setBillCycleOptions] = useState<BillCycleOption[]>([]);
  const [isLoadingBillCycles, setIsLoadingBillCycles] = useState(false);

  const [detailedTariffData, setDetailedTariffData] = useState<DetailedTariffRow[]>([]);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  const printRef = useRef<HTMLDivElement>(null);

  const fetchWithErrorHandling = async (url: string) => {
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  };

  const generateBillCycleOptions = (billCycles: string[], maxCycle: string) => {
    const max = parseInt(maxCycle);
    return billCycles.map((c, i) => ({
      display: `${max - i} - ${c}`,
      code: (max - i).toString(),
    }));
  };

  useEffect(() => {
    const fetchBillCycles = async () => {
      setIsLoadingBillCycles(true);
      try {
        const data = await fetchWithErrorHandling("/misapi/api/billcycle/max");
        const cycles = data.data?.BillCycles || [];
        const max = data.data?.MaxBillCycle || "0";
        const options = generateBillCycleOptions(cycles, max);
        setBillCycleOptions(options);

        if (options.length > 0) {
          setFromCycle(options[0].code);
          setToCycle(options[0].code);
        }
      } finally {
        setIsLoadingBillCycles(false);
      }
    };
    fetchBillCycles();
  }, []);

  // Grouped table rendering: Province > Division > Area > Month
  const renderTable = () => {
    if (detailedTariffData.length === 0) {
      return (
        <table className="w-full border-collapse text-xs">
          <thead className="bg-gray-100 sticky top-0 z-10">
            <tr>
              <th className="border px-2 py-1 text-left">Province</th>
              <th className="border px-2 py-1 text-left">Division</th>
              <th className="border px-2 py-1 text-left">Area</th>
              <th className="border px-2 py-1 text-left">Month</th>
              <th className="border px-2 py-1 text-right">D1</th>
              <th className="border px-2 py-1 text-right">D1-TOU</th>
              <th className="border px-2 py-1 text-right">GP1</th>
              <th className="border px-2 py-1 text-right">Govt. Hosp & Schools</th>
              <th className="border px-2 py-1 text-right">Govt. Universities</th>
              <th className="border px-2 py-1 text-right">H1</th>
              <th className="border px-2 py-1 text-right">I1</th>
              <th className="border px-2 py-1 text-right">AGRI</th>
              <th className="border px-2 py-1 text-right">R1</th>
              <th className="border px-2 py-1 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={14} className="text-center py-2 text-gray-500">
                No data found
              </td>
            </tr>
          </tbody>
        </table>
      );
    }

    // Group data by Province > Division > Area > Month
    const grouped: Record<string, Record<string, Record<string, Record<string, DetailedTariffRow>>>> = {};
    detailedTariffData.forEach(row => {
      if (!grouped[row.Province]) grouped[row.Province] = {};
      if (!grouped[row.Province][row.Division]) grouped[row.Province][row.Division] = {};
      if (!grouped[row.Province][row.Division][row.Area]) grouped[row.Province][row.Division][row.Area] = {};
      grouped[row.Province][row.Division][row.Area][row.Month] = row;
    });

    // Calculate rowspans
    const provinceRowspans: Record<string, number> = {};
    const divisionRowspans: Record<string, Record<string, number>> = {};
    const areaRowspans: Record<string, Record<string, Record<string, number>>> = {};
    Object.keys(grouped).forEach(province => {
      let provinceCount = 0;
      divisionRowspans[province] = {};
      areaRowspans[province] = {};
      Object.keys(grouped[province]).forEach(division => {
        let divisionCount = 0;
        areaRowspans[province][division] = {};
        Object.keys(grouped[province][division]).forEach(area => {
          const monthCount = Object.keys(grouped[province][division][area]).length;
          areaRowspans[province][division][area] = monthCount;
          divisionCount += monthCount;
        });
        divisionRowspans[province][division] = divisionCount;
        provinceCount += divisionCount;
      });
      provinceRowspans[province] = provinceCount;
    });

    // Render rows
    const rows: React.ReactNode[] = [];
    Object.keys(grouped).forEach(province => {
      Object.keys(grouped[province]).forEach(division => {
        Object.keys(grouped[province][division]).forEach(area => {
          Object.keys(grouped[province][division][area]).forEach((month, monthIdx) => {
            const row = grouped[province][division][area][month];
            const isFirstProvince =
              division === Object.keys(grouped[province])[0] &&
              area === Object.keys(grouped[province][division])[0] &&
              monthIdx === 0;
            const isFirstDivision =
              area === Object.keys(grouped[province][division])[0] &&
              monthIdx === 0;
            const isFirstArea = monthIdx === 0;
            rows.push(
              <tr key={`${province}|${division}|${area}|${month}`} className={rows.length % 2 ? "bg-gray-50" : "bg-white"}>
                {isFirstProvince && (
                  <td className="border px-2 py-1" rowSpan={provinceRowspans[province]}>{getProvinceName(province)}</td>
                )}
                {isFirstDivision && (
                  <td className="border px-2 py-1" rowSpan={divisionRowspans[province][division]}>{division}</td>
                )}
                {isFirstArea && (
                  <td className="border px-2 py-1" rowSpan={areaRowspans[province][division][area]}>{area}</td>
                )}
                <td className="border px-2 py-1">{month}</td>
                <td className="border px-2 py-1 text-right">{row.D1.toLocaleString()}</td>
                <td className="border px-2 py-1 text-right">{row.D1TOU.toLocaleString()}</td>
                <td className="border px-2 py-1 text-right">{row.GP1.toLocaleString()}</td>
                <td className="border px-2 py-1 text-right">{row.GovtHospSchools.toLocaleString()}</td>
                <td className="border px-2 py-1 text-right">{row.GovtUniversities.toLocaleString()}</td>
                <td className="border px-2 py-1 text-right">{row.H1.toLocaleString()}</td>
                <td className="border px-2 py-1 text-right">{row.I1.toLocaleString()}</td>
                <td className="border px-2 py-1 text-right">{row.AGRI.toLocaleString()}</td>
                <td className="border px-2 py-1 text-right">{row.R1.toLocaleString()}</td>
                <td className="border px-2 py-1 text-right font-bold">{row.Total.toLocaleString()}</td>
              </tr>
            );
          });
        });
      });
    });

    return (
      <table className="w-full border-collapse text-xs">
        <thead className="bg-gray-100 sticky top-0 z-10">
          <tr>
            <th className="border px-2 py-1 text-left">Province Name</th>
            <th className="border px-2 py-1 text-left">Division</th>
            <th className="border px-2 py-1 text-left">Area</th>
            <th className="border px-2 py-1 text-left">Month</th>
            <th className="border px-2 py-1 text-right">D1</th>
            <th className="border px-2 py-1 text-right">D1-TOU</th>
            <th className="border px-2 py-1 text-right">GP1</th>
            <th className="border px-2 py-1 text-right">Govt. Hosp & Schools</th>
            <th className="border px-2 py-1 text-right">Govt. Universities</th>
            <th className="border px-2 py-1 text-right">H1</th>
            <th className="border px-2 py-1 text-right">I1</th>
            <th className="border px-2 py-1 text-right">AGRI</th>
            <th className="border px-2 py-1 text-right">R1</th>
            <th className="border px-2 py-1 text-right">Total</th>
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
    );
  };

  const downloadCSV = () => {
    if (!detailedTariffData.length) return;

    const headers = [
      "Province","Area","Month","D1","D1TOU","GP1",
      "GovtHospSchools","GovtUniversities","H1","I1","AGRI","R1","Total"
    ];

    const rows = detailedTariffData.map(r => [
      r.Province,
      r.Area,
      r.Month,
      r.D1,
      r.D1TOU,
      r.GP1,
      r.GovtHospSchools,
      r.GovtUniversities,
      r.H1,
      r.I1,
      r.AGRI,
      r.R1,
      r.Total
    ]);

    const csv = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `ActiveCustomersSalesByTariff_${fromCycle}_${toCycle}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  };

  const printPDF = () => {
    if (!printRef.current) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
      <head>
        <title>Active Customers & Sales by Tariff</title>
        <style>
          body { font-family: Arial; font-size: 10px; margin:20px; }
          table { width:100%; border-collapse: collapse; }
          th,td { border:1px solid #ccc; padding:4px; text-align:right; }
          th { background:#eee; }
          td:first-child, th:first-child { text-align:left; }
        </style>
      </head>
      <body>
        <h3>Active Customers & Sales by Tariff</h3>
        ${printRef.current.innerHTML}
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.print();
  };

  const handleGenerate = async () => {
    setIsLoadingReport(true);
    setReportError(null);

    try {
      const query = new URLSearchParams({
        customerType: reportType,
        level: selectedOption,
        fromCycle,
        toCycle,
      }).toString();

      const url = `http://localhost:44381/api/active-customer-tariff/report?${query}`;
      const response = await fetchWithErrorHandling(url);

      const raw =
        Array.isArray(response?.Data) ? response.Data :
        Array.isArray(response?.data) ? response.data :
        Array.isArray(response) ? response : [];

      const filteredData = raw.filter((item: any) => {
        const cycle = Number(item.BillCycle || item.Month);
        return cycle >= Number(fromCycle) && cycle <= Number(toCycle);
      });

      // Group by Province > Division > Area > Month
      const grouped: Record<string, any> = {};
      filteredData.forEach((x: any) => {
        const province = x.Province || "";
        const division = x.Division || x.Region || "";
        const area = x.Area || "";
        const month = x.BillCycle || x.Month || "";
        const key = `${province}|${division}|${area}|${month}`;
        if (!grouped[key]) {
          grouped[key] = {
            Province: province,
            Division: division,
            Area: area,
            Month: month,
            D1: 0, D1TOU: 0, GP1: 0, GovtHospSchools: 0,
            GovtUniversities: 0, H1: 0, I1: 0, AGRI: 0, R1: 0
          };
        }

        const t = (x.Tariff || "").trim().toUpperCase();
        const v = Number(x.NoOfCustomers || 0);

        if (t === "D1") grouped[key].D1 += v;
        if (t === "D1-TOU" || t === "D1TOU") grouped[key].D1TOU += v;
        if (t === "GP1") grouped[key].GP1 += v;
        if (t === "H1") grouped[key].H1 += v;
        if (t === "I1") grouped[key].I1 += v;
        if (t === "AGRI") grouped[key].AGRI += v;
        if (t === "R1") grouped[key].R1 += v;
        if (t === "GV1SH" || t === "GV1SC") grouped[key].GovtHospSchools += v;
        if (t === "GU1") grouped[key].GovtUniversities += v;
      });

      const finalData = Object.values(grouped).map((r: any) => ({
        ...r,
        Total:
          r.D1 + r.D1TOU + r.GP1 + r.GovtHospSchools +
          r.GovtUniversities + r.H1 + r.I1 + r.AGRI + r.R1,
      }));

      setDetailedTariffData(finalData);
    } catch (err: any) {
      setReportError(err.message);
      setDetailedTariffData([]);
    } finally {
      setIsLoadingReport(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 bg-white rounded-xl shadow border border-gray-200 text-sm font-sans">
      {/* Form Section */}
      <h2 className="text-xl font-bold mb-6 text-[#7A0000]">Active Customers & Sales by Tariff</h2>
      <form
        onSubmit={e => {
          e.preventDefault();
          handleGenerate();
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          {/* Customer Type */}
          <div className="flex flex-col">
            <label className="text-[#7A0000] text-xs font-medium mb-1">Customer Type</label>
            <select
              value={reportType}
              onChange={e => setReportType(e.target.value as any)}
              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent"
              required
            >
              <option value="ordinary">Ordinary</option>
              <option value="bulk">Bulk</option>
            </select>
          </div>

          {/* Bill Cycles */}
          <div className="flex flex-col">
            <label className="text-[#7A0000] text-xs font-medium mb-1">From Bill Cycle</label>
            <select
              value={fromCycle}
              onChange={e => setFromCycle(e.target.value)}
              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent"
              required
            >
              {billCycleOptions.map(o => (
                <option key={o.code} value={o.code}>{o.display}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-[#7A0000] text-xs font-medium mb-1">To Bill Cycle</label>
            <select
              value={toCycle}
              onChange={e => setToCycle(e.target.value)}
              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent"
              required
            >
              {billCycleOptions.map(o => (
                <option key={o.code} value={o.code}>{o.display}</option>
              ))}
            </select>
          </div>

          {/* Scope */}
          <div className="flex flex-col">
            <label className="text-[#7A0000] text-xs font-medium mb-1">Analysis Option</label>
            <select
              value={selectedOption}
              onChange={e => setSelectedOption(e.target.value)}
              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent"
              required
            >
              <option value="Area">Area</option>
              <option value="Province">Province</option>
              <option value="Division">Division</option>
              <option value="Entire CEB">Entire CEB</option>
            </select>
          </div>
        </div>
        <div className="w-full mt-6 flex justify-end">
          <button
            type="submit"
            className="px-6 py-2 rounded-md font-medium transition-opacity duration-300 shadow bg-gradient-to-r from-[#7A0000] to-[#A52A2A] text-white hover:opacity-90"
            disabled={isLoadingReport}
          >
            {isLoadingReport ? "Loading..." : "Generate"}
          </button>
        </div>
      </form>

      {isLoadingReport && <div className="text-xs mt-4">Loading...</div>}
      {reportError && <div className="text-red-500 text-xs mt-4">{reportError}</div>}

      {/* CSV / PDF buttons */}
      {detailedTariffData.length > 0 && (
        <div className="flex gap-2 mt-6">
          <button
            onClick={downloadCSV}
            className="flex items-center gap-1 px-4 py-2 text-sm border border-blue-400 text-blue-700 rounded hover:bg-blue-50"
          >
            <FaFileDownload className="w-4 h-4" />
            CSV
          </button>

          <button
            onClick={printPDF}
            className="flex items-center gap-1 px-4 py-2 text-sm border border-green-400 text-green-700 rounded hover:bg-green-50"
          >
            <FaPrint className="w-4 h-4" />
            PDF
          </button>
        </div>
      )}

      {/* Scrollable table */}
      <div className="overflow-x-auto max-h-[calc(100vh-350px)] border rounded mt-6">
        <div ref={printRef}>
          {renderTable()}
        </div>
      </div>
    </div>
  );
};

export default ActiveCustomersSalesByTariff;

