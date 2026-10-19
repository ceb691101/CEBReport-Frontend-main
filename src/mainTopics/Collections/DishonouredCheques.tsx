import React, { useState, useEffect, useRef } from "react";
import { FaFileDownload, FaPrint } from "react-icons/fa";
import { useReportScope } from "../../hooks/useReportScope";
import { useUser } from "../../contexts/UserContext";

interface DishonouredCheque {
  acctNo: string;
  name: string;
  address: string;
  chqDate: string;
  entryDate: string;
  percentage: string;
  chqNo: string;
  surcharge: number;
  postage: number;
  bankCharge: number;
  paidAmount: number;
  confirm: string;
  journal: string;
  print: string;
  email: string;
}

interface AreaItem {
  AreaCode?: string;
  areaCode?: string;
  ProvCode?: string;
  provCode?: string;
  Region?: string;
  region?: string;
  AreaName?: string;
  areaName?: string;
}

const DishonouredCheques: React.FC = () => {
  const { level, locked } = useReportScope();
  const { user } = useUser();
  const lockedRegionCode = locked["Region"]?.code;
  const lockedProvinceCode = locked["Province"]?.code;
  const lockedAreaCode = locked["Area"]?.code;

  const [allOrdinaryAreas, setAllOrdinaryAreas] = useState<AreaItem[]>([]);

  const maroon = "text-[#7A0000]";
  const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";

  const [selectedOption, setSelectedOption] =
    useState<string>("Single Account");
  // const [isLoading, setIsLoading] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [inputValue, setInputValue] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [cheques, setCheques] = useState<DishonouredCheque[]>([]);
  // const [loadingReport, setLoadingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Fetch ordinary areas on mount to enforce geographical scoping check (level < 80)
  useEffect(() => {
    if (level >= 80) return;

    const fetchAllAreas = async () => {
      try {
        const response = await fetch("/misapi/api/ordinary/areas");
        if (!response.ok) throw new Error("Failed to fetch ordinary areas");
        const result = await response.json();
        if (result?.data && Array.isArray(result.data)) {
          setAllOrdinaryAreas(result.data);
        }
      } catch (err) {
        console.error("Error fetching areas for scope verification:", err);
      }
    };

    fetchAllAreas();
  }, [level]);

  const normalizeRegion = (val?: string) => {
    if (!val) return "";
    const s = String(val).trim().toLowerCase();
    return s.replace(/^region\s*/, "").replace(/^r/, "").replace(/^0+/, "");
  };

  const isRegionMatch = (r1?: string, r2?: string) => {
    if (!r1 || !r2) return false;
    const s1 = String(r1).trim().toLowerCase();
    const s2 = String(r2).trim().toLowerCase();
    return s1 === s2 || normalizeRegion(s1) === normalizeRegion(s2);
  };

  const normalizeProv = (p?: string) => {
    if (!p) return "";
    const s = String(p).trim().toLowerCase();
    return s.startsWith("0") && s.length > 1 ? s.replace(/^0+/, "") : s;
  };

  const isProvMatch = (p1?: string, p2?: string) => {
    if (!p1 || !p2) return false;
    const s1 = String(p1).trim().toLowerCase();
    const s2 = String(p2).trim().toLowerCase();
    return s1 === s2 || normalizeProv(s1) === normalizeProv(s2);
  };

  const normalizeArea = (a?: string) => {
    if (!a) return "";
    const s = String(a).trim().toLowerCase();
    return s.startsWith("0") && s.length > 1 ? s.replace(/^0+/, "") : s;
  };

  const isAreaMatch = (a1?: string, a2?: string) => {
    if (!a1 || !a2) return false;
    const s1 = String(a1).trim().toLowerCase();
    const s2 = String(a2).trim().toLowerCase();
    return s1 === s2 || normalizeArea(s1) === normalizeArea(s2);
  };

  const resolveAccountArea = async (acct: string, areasList: AreaItem[]) => {
    const cleanAcct = String(acct || "").trim();
    if (cleanAcct.length < 2) return null;
    const prefix2 = cleanAcct.substring(0, 2);

    // 1. Direct match with ordinary areas list
    const matched = areasList.find(
      (a: AreaItem) =>
        String(a.AreaCode || a.areaCode || "").trim().toLowerCase() ===
        prefix2.toLowerCase()
    );
    if (matched) {
      return {
        areaCode: String(matched.AreaCode || matched.areaCode || "").trim(),
        provCode: String(matched.ProvCode || matched.provCode || "").trim(),
        regionCode: String(matched.Region || matched.region || "").trim(),
      };
    }

    // 2. Special Colombo legacy postal prefixes (05, 06, 07 -> Colombo South "03"; 08, 09 -> Colombo East "02")
    if (["05", "06", "07"].includes(prefix2)) {
      const cs = areasList.find(
        (a: AreaItem) => String(a.AreaCode || a.areaCode || "").trim() === "03"
      );
      if (cs) {
        return {
          areaCode: "03",
          provCode: String(cs.ProvCode || cs.provCode || "3").trim(),
          regionCode: String(cs.Region || cs.region || "R1").trim(),
        };
      }
    } else if (["08", "09"].includes(prefix2)) {
      const ce = areasList.find(
        (a: AreaItem) => String(a.AreaCode || a.areaCode || "").trim() === "02"
      );
      if (ce) {
        return {
          areaCode: "02",
          provCode: String(ce.ProvCode || ce.provCode || "3").trim(),
          regionCode: String(ce.Region || ce.region || "R1").trim(),
        };
      }
    }

    // 3. Fallback to Customer Master API if prefix not directly resolved
    try {
      const response = await fetch(
        "/MRMSAPI/API/Customer/GetOrdinaryCustomertranhst_asc",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ account_no: cleanAcct, from_cycle: "450" }),
        }
      );
      if (response.ok) {
        const result = await response.json();
        const returnedAreaCode = String(
          result?.customer_master_detail?.area_code || ""
        ).trim();
        if (returnedAreaCode) {
          const areaObj = areasList.find(
            (a: AreaItem) =>
              String(a.AreaCode || a.areaCode || "").trim().toLowerCase() ===
              returnedAreaCode.toLowerCase()
          );
          if (areaObj) {
            return {
              areaCode: String(areaObj.AreaCode || areaObj.areaCode || "").trim(),
              provCode: String(areaObj.ProvCode || areaObj.provCode || "").trim(),
              regionCode: String(
                areaObj.Region || areaObj.region || ""
              ).trim(),
            };
          }
        }
      }
    } catch {
      // Ignore fallback error
    }

    return null;
  };

  const isAccountAuthorized = (
    accountScope: { areaCode: string; provCode: string; regionCode: string } | null
  ): boolean => {
    // Level >= 80 is HQ - completely unrestricted
    if (level >= 80) return true;
    if (!accountScope) return false;

    // Region Level (Level 70 - 79)
    if (level >= 70) {
      const reg =
        lockedRegionCode ||
        user.RegionCode ||
        (user.Name?.match(/R[1-4]/i)?.[0]) ||
        "";
      if (!reg) return false;
      return isRegionMatch(accountScope.regionCode, reg);
    }

    // Province Level (Level 60 - 69)
    if (level >= 60) {
      const prov =
        lockedProvinceCode ||
        user.ProvinceCode ||
        (user.Name?.match(/Province\s*([0-9A-Z])/i)?.[1]) ||
        "";
      if (!prov) return false;
      return isProvMatch(accountScope.provCode, prov);
    }

    // Area Level (Level < 60)
    const area =
      lockedAreaCode ||
      user.AreaCode ||
      (user.Name?.match(/\b\d{2}\b/)?.[0]) ||
      "";
    if (!area) return false;
    return isAreaMatch(accountScope.areaCode, area);
  };

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedOption(e.target.value);
    setInputValue("");
    setFromDate("");
    setToDate("");
    setReportError(null);
  };

  const formatCurrency = (value: number): string => {
    return value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const downloadAsCSV = () => {
    if (!cheques.length) return;

    // Define column configurations for each option
    const columnConfigs = {
      "Single Account": {
        headers: [
          "Name",
          "Cheque Date",
          "Entry Date",
          "%",
          "Cheque No",
          "Surcharge",
          "Postage",
          "Bank Charges",
          "Paid Amount",
          "Confirm",
          "Journal",
          "Print",
          "Email",
        ],
        getRowData: (cheque: DishonouredCheque) => [
          cheque.name,
          cheque.chqDate,
          cheque.entryDate,
          cheque.percentage,
          cheque.chqNo.trim(),
          formatCurrency(cheque.surcharge),
          formatCurrency(cheque.postage),
          formatCurrency(cheque.bankCharge),
          formatCurrency(cheque.paidAmount),
          cheque.confirm,
          cheque.journal,
          cheque.print,
          cheque.email,
        ],
      },
      "Cheque No": {
        headers: [
          "Account Number",
          "Name",
          "Address",
          "Cheque Date",
          "Entry Date",
          "%",
          "Surcharge",
          "Postage",
          "Bank Charges",
          "Paid Amount",
          "Confirm",
          "Journal",
          "Print",
          "Email",
        ],
        getRowData: (cheque: DishonouredCheque) => [
          cheque.acctNo,
          cheque.name,
          cheque.address,
          cheque.chqDate,
          cheque.entryDate,
          cheque.percentage,
          formatCurrency(cheque.surcharge),
          formatCurrency(cheque.postage),
          formatCurrency(cheque.bankCharge),
          formatCurrency(cheque.paidAmount),
          cheque.confirm,
          cheque.journal,
          cheque.print,
          cheque.email,
        ],
      },
      "Date Range": {
        headers: [
          "Account Number",
          "Name",
          "Address",
          "Cheque Date",
          "Entry Date",
          "%",
          "Cheque No",
          "Surcharge",
          "Postage",
          "Bank Charges",
          "Paid Amount",
          "Confirm",
          "Journal",
          "Print",
          "Email",
        ],
        getRowData: (cheque: DishonouredCheque) => [
          cheque.acctNo,
          cheque.name,
          cheque.address,
          cheque.chqDate,
          cheque.entryDate,
          cheque.percentage,
          cheque.chqNo.trim(),
          formatCurrency(cheque.surcharge),
          formatCurrency(cheque.postage),
          formatCurrency(cheque.bankCharge),
          formatCurrency(cheque.paidAmount),
          cheque.confirm,
          cheque.journal,
          cheque.print,
          cheque.email,
        ],
      },
      All: {
        headers: [
          "Account Number",
          "Name",
          "Address",
          "Cheque Date",
          "Entry Date",
          "%",
          "Cheque No",
          "Surcharge",
          "Postage",
          "Bank Charges",
          "Paid Amount",
          "Confirm",
          "Journal",
          "Print",
          "Email",
        ],
        getRowData: (cheque: DishonouredCheque) => [
          cheque.acctNo,
          cheque.name,
          cheque.address,
          cheque.chqDate,
          cheque.entryDate,
          cheque.percentage,
          cheque.chqNo.trim(),
          formatCurrency(cheque.surcharge),
          formatCurrency(cheque.postage),
          formatCurrency(cheque.bankCharge),
          formatCurrency(cheque.paidAmount),
          cheque.confirm,
          cheque.journal,
          cheque.print,
          cheque.email,
        ],
      },
    };

    const config =
      columnConfigs[selectedOption as keyof typeof columnConfigs] ||
      columnConfigs["All"];

    const { headers, getRowData } = config;

    const rows = cheques.map(getRowData);

    const csvContent = [
      `Dishonoured Cheques Report`,
      selectedOption === "Single Account"
        ? `Account No: ${inputValue || ""}\nAddress: ${
            cheques[0]?.address || "-"
          }`
        : selectedOption === "Cheque No"
        ? `Cheque No: ${inputValue}`
        : selectedOption === "Date Range"
        ? `Date Range: ${fromDate} to ${toDate}`
        : `All Dishonoured Cheques (Last 5 Years)`,
      `Generated: ${new Date().toLocaleDateString()}`,
      "",
      headers.map((h) => `"${h}"`).join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    try {
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      // Generate the descriptive part of the filename
      const fileDescriptor =
        selectedOption === "Single Account"
          ? `AccountNo_${inputValue}`
          : selectedOption === "Cheque No"
          ? `ChequeNo_${inputValue}`
          : selectedOption === "Date Range"
          ? `DateRange_${fromDate}_to_${toDate}`
          : "All_Last5Years";

      link.setAttribute("href", url);
      link.setAttribute("download", `DishonouredCheques_${fileDescriptor}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (error) {
      console.error("Error generating CSV:", error);
      alert("Failed to export CSV");
    }
  };

  const printPDF = () => {
    if (!printRef.current) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    // Get the appropriate table component based on selected option
    // let tableComponent;
    // if (selectedOption === "Single Account") {
    //     tableComponent = renderSingleAccountTable();
    // } else if (selectedOption === "Cheque No") {
    //     tableComponent = renderChequeNoTable();
    // } else {
    //     tableComponent = renderFullTable();
    // }

    // Generate header content based on selection
    const headerContent = (() => {
      if (selectedOption === "Single Account" && cheques?.length > 0) {
        return `
        Account No: <span class="bold">${inputValue}</span><br>
        Address: <span class="bold">${cheques[0].address || "-"}</span>
      `;
      }
      if (selectedOption === "Cheque No") {
        return `Cheque No: <span class="bold">${inputValue}</span>`;
      }
      if (selectedOption === "Date Range") {
        return `Date Range: <span class="bold">${fromDate}</span> to <span class="bold">${toDate}</span>`;
      }
      return "All Dishonoured Cheques (Last 5 Years)";
    })();

    printWindow.document.write(`
    <html>
      <head>
        <title>Dishonoured Cheques Report</title>
        <style>
          body { font-family: Arial; font-size: 10px; margin: 10mm; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 2px 4px; border: 1px solid #ddd; font-size: 10px;}
          .text-left { text-align: left; }
          .text-right { text-align: right; }
          .header { 
            font-weight: bold; 
            margin-bottom: 5px; 
            color: #7A0000;
            font-size: 12px;
          }
          .subheader { 
            margin-bottom: 12px; 
            font-size: 11px;
          }
          .footer { 
            margin-top: 10px; 
            font-size: 9px; 
            color: #666;
          }
          @page {
              margin-bottom: 18mm;
              @bottom-left {
                content: "Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()} | Reporting@2026";
                font-size: 9px;
                color: #666;
                font-family: Arial;
              }
              @bottom-right {
                content: "Page " counter(page) " of " counter(pages);
                font-size: 9px;
                color: #666;
                font-family: Arial;
              }
            }
          .total-row { 
            font-weight: bold; 
            background-color: #f5f5f5; 
          }
          th { 
            background-color: #f0f0f0; 
            font-weight: bold; 
            text-align: left; 
          }
          tr:nth-child(even) {
            background-color: #f9f9f9;
          }
          .bold {
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="header">DISHONOURED CHEQUES REPORT</div>
        <div class="subheader">
          ${headerContent}
        </div>
        ${printRef.current.innerHTML}
      </body>
    </html>
  `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  const renderSingleAccountTable = () => (
    <table className="w-full border-collapse text-xs">
      <thead className="bg-gray-100 sticky top-0">
        <tr>
          <th className="border border-gray-300 px-2 py-1 text-left">Name</th>

          <th className="border border-gray-300 px-2 py-1 text-left">
            Cheque Date
          </th>
          <th className="border border-gray-300 px-2 py-1 text-left">
            Entry Date
          </th>
          <th className="border border-gray-300 px-2 py-1 text-right">%</th>
          <th className="border border-gray-300 px-2 py-1 text-left">
            Cheque No
          </th>
          <th className="border border-gray-300 px-2 py-1 text-right">
            Surcharge
          </th>
          <th className="border border-gray-300 px-2 py-1 text-right">
            Postage
          </th>
          <th className="border border-gray-300 px-2 py-1 text-right">
            Bank Charges
          </th>
          <th className="border border-gray-300 px-2 py-1 text-right">
            Paid Amount
          </th>
          <th className="border border-gray-300 px-2 py-1 text-center">
            Confirm
          </th>
          <th className="border border-gray-300 px-2 py-1 text-left">
            Journal
          </th>
          <th className="border border-gray-300 px-2 py-1 text-center">
            Print
          </th>
          <th className="border border-gray-300 px-2 py-1 text-left">Email</th>
        </tr>
      </thead>
      <tbody>
        {cheques.map((item, index) => (
          <tr
            key={index}
            className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
          >
            <td className="border border-gray-300 px-2 py-1">{item.name}</td>
            <td className="border border-gray-300 px-2 py-1">{item.chqDate}</td>
            <td className="border border-gray-300 px-2 py-1">
              {item.entryDate}
            </td>
            <td className="border border-gray-300 px-2 py-1 text-right">
              {item.percentage}
            </td>
            <td className="border border-gray-300 px-2 py-1">
              {item.chqNo.trim()}
            </td>
            <td className="border border-gray-300 px-2 py-1 text-right">
              {formatCurrency(item.surcharge)}
            </td>
            <td className="border border-gray-300 px-2 py-1 text-right">
              {formatCurrency(item.postage)}
            </td>
            <td className="border border-gray-300 px-2 py-1 text-right">
              {formatCurrency(item.bankCharge)}
            </td>
            <td className="border border-gray-300 px-2 py-1 text-right">
              {formatCurrency(item.paidAmount)}
            </td>
            <td className="border border-gray-300 px-2 py-1">{item.confirm}</td>
            <td className="border border-gray-300 px-2 py-1">{item.journal}</td>
            <td className="border border-gray-300 px-2 py-1">{item.print}</td>
            <td className="border border-gray-300 px-2 py-1">{item.email}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderChequeNoTable = () => (
    <table className="w-full border-collapse text-xs">
      <thead className="bg-gray-100 sticky top-0">
        <tr>
          <th className="border border-gray-300 px-2 py-1 text-left">
            Account Number
          </th>
          <th className="border border-gray-300 px-2 py-1 text-left">Name</th>
          <th className="border border-gray-300 px-2 py-1 text-left">
            Address
          </th>
          <th className="border border-gray-300 px-2 py-1 text-left">
            Cheque Date
          </th>
          <th className="border border-gray-300 px-2 py-1 text-left">
            Entry Date
          </th>
          <th className="border border-gray-300 px-2 py-1 text-right">%</th>

          <th className="border border-gray-300 px-2 py-1 text-right">
            Surcharge
          </th>
          <th className="border border-gray-300 px-2 py-1 text-right">
            Postage
          </th>
          <th className="border border-gray-300 px-2 py-1 text-right">
            Bank Charges
          </th>
          <th className="border border-gray-300 px-2 py-1 text-right">
            Paid Amount
          </th>
          <th className="border border-gray-300 px-2 py-1 text-center">
            Confirm
          </th>
          <th className="border border-gray-300 px-2 py-1 text-left">
            Journal
          </th>
          <th className="border border-gray-300 px-2 py-1 text-center">
            Print
          </th>
          <th className="border border-gray-300 px-2 py-1 text-left">Email</th>
        </tr>
      </thead>
      <tbody>
        {cheques.map((item, index) => (
          <tr
            key={index}
            className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
          >
            <td className="border border-gray-300 px-2 py-1">{item.acctNo}</td>
            <td className="border border-gray-300 px-2 py-1">{item.name}</td>
            <td className="border border-gray-300 px-2 py-1">{item.address}</td>
            <td className="border border-gray-300 px-2 py-1">{item.chqDate}</td>
            <td className="border border-gray-300 px-2 py-1">
              {item.entryDate}
            </td>
            <td className="border border-gray-300 px-2 py-1 text-right">
              {item.percentage}
            </td>
            <td className="border border-gray-300 px-2 py-1 text-right">
              {formatCurrency(item.surcharge)}
            </td>
            <td className="border border-gray-300 px-2 py-1 text-right">
              {formatCurrency(item.postage)}
            </td>
            <td className="border border-gray-300 px-2 py-1 text-right">
              {formatCurrency(item.bankCharge)}
            </td>
            <td className="border border-gray-300 px-2 py-1 text-right">
              {formatCurrency(item.paidAmount)}
            </td>
            <td className="border border-gray-300 px-2 py-1">{item.confirm}</td>
            <td className="border border-gray-300 px-2 py-1">{item.journal}</td>
            <td className="border border-gray-300 px-2 py-1">{item.print}</td>
            <td className="border border-gray-300 px-2 py-1">{item.email}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderFullTable = () => (
    <table className="w-full border-collapse text-xs">
      <thead className="bg-gray-100 sticky top-0">
        <tr>
          <th className="border border-gray-300 px-2 py-1 text-left">
            Account Number
          </th>
          <th className="border border-gray-300 px-2 py-1 text-left">Name</th>
          <th className="border border-gray-300 px-2 py-1 text-left">
            Address
          </th>
          <th className="border border-gray-300 px-2 py-1 text-left">
            Cheque Date
          </th>
          <th className="border border-gray-300 px-2 py-1 text-left">
            Entry Date
          </th>
          <th className="border border-gray-300 px-2 py-1 text-right">%</th>
          <th className="border border-gray-300 px-2 py-1 text-left">
            Cheque No
          </th>
          <th className="border border-gray-300 px-2 py-1 text-right">
            Surcharge
          </th>
          <th className="border border-gray-300 px-2 py-1 text-right">
            Postage
          </th>
          <th className="border border-gray-300 px-2 py-1 text-right">
            Bank Charges
          </th>
          <th className="border border-gray-300 px-2 py-1 text-right">
            Paid Amount
          </th>
          <th className="border border-gray-300 px-2 py-1 text-center">
            Confirm
          </th>
          <th className="border border-gray-300 px-2 py-1 text-left">
            Journal
          </th>
          <th className="border border-gray-300 px-2 py-1 text-center">
            Print
          </th>
          <th className="border border-gray-300 px-2 py-1 text-left">Email</th>
        </tr>
      </thead>
      <tbody>
        {cheques.map((item, index) => (
          <tr
            key={index}
            className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
          >
            <td className="border border-gray-300 px-2 py-1">{item.acctNo}</td>
            <td className="border border-gray-300 px-2 py-1">{item.name}</td>
            <td className="border border-gray-300 px-2 py-1">{item.address}</td>
            <td className="border border-gray-300 px-2 py-1">{item.chqDate}</td>
            <td className="border border-gray-300 px-2 py-1">
              {item.entryDate}
            </td>
            <td className="border border-gray-300 px-2 py-1 text-right">
              {item.percentage}
            </td>
            <td className="border border-gray-300 px-2 py-1">
              {item.chqNo.trim()}
            </td>
            <td className="border border-gray-300 px-2 py-1 text-right">
              {formatCurrency(item.surcharge)}
            </td>
            <td className="border border-gray-300 px-2 py-1 text-right">
              {formatCurrency(item.postage)}
            </td>
            <td className="border border-gray-300 px-2 py-1 text-right">
              {formatCurrency(item.bankCharge)}
            </td>
            <td className="border border-gray-300 px-2 py-1 text-right">
              {formatCurrency(item.paidAmount)}
            </td>
            <td className="border border-gray-300 px-2 py-1">{item.confirm}</td>
            <td className="border border-gray-300 px-2 py-1">{item.journal}</td>
            <td className="border border-gray-300 px-2 py-1">{item.print}</td>
            <td className="border border-gray-300 px-2 py-1">{item.email}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted", {
      selectedOption,
      inputValue,
      fromDate,
      toDate,
    });
    setLoading(true);
    setReportError(null);
    setCheques([]);
    setReportVisible(false);

    try {
      let currentAreas = allOrdinaryAreas;
      if (level < 80 && currentAreas.length === 0) {
        try {
          const res = await fetch("/misapi/api/ordinary/areas");
          if (res.ok) {
            const data = await res.json();
            if (data?.data && Array.isArray(data.data)) {
              currentAreas = data.data;
              setAllOrdinaryAreas(data.data);
            }
          }
        } catch (e) {
          console.error("Failed to load areas:", e);
        }
      }

      // Check level-based access control (LBAC) upfront for Single Account
      if (selectedOption === "Single Account" && level < 80) {
        const scope = await resolveAccountArea(inputValue.trim(), currentAreas);
        if (!scope || !isAccountAuthorized(scope)) {
          throw new Error("This account is outside your access scope.");
        }
      }

      let endpoint = "";
      let body: Record<string, unknown> = {};
      let validationError = "";

      // Validate inputs based on selected option
      switch (selectedOption) {
        case "Single Account":
          if (!inputValue.trim())
            validationError = "Account number is required";
          endpoint = "/CEBINFO_API_2025/api/acctNoDishonouredChque";
          body = { acctNo: inputValue.trim() };
          break;

        case "Cheque No":
          if (!inputValue.trim()) validationError = "Cheque number is required";
          endpoint = "/CEBINFO_API_2025/api/SingleChqueDishonouredChque";
          body = { chequeNo: inputValue.trim() };
          break;

        case "Date Range":
          if (!fromDate || !toDate) validationError = "Both dates are required";
          endpoint = "/CEBINFO_API_2025/api/DateRangeDishonouredChque";
          body = {
            date1: formatDateForAPI(fromDate),
            date2: formatDateForAPI(toDate),
          };
          break;

        case "All": {
          endpoint = "/CEBINFO_API_2025/api/DateRangeDishonouredChque";
          // Calculate 5 years ago from today
          const today = new Date();
          const fiveYearsAgo = new Date();
          fiveYearsAgo.setFullYear(today.getFullYear() - 5);

          body = {
            date1: formatDateForAPI(fiveYearsAgo.toISOString().split("T")[0]),
            date2: formatDateForAPI(today.toISOString().split("T")[0]),
          };
          break;
        }

        default:
          validationError = "Invalid search option";
      }

      if (validationError) {
        throw new Error(validationError);
      }

      console.log("Making API call to:", endpoint, "with body:", body);

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: Object.keys(body).length ? JSON.stringify(body) : undefined,
      });

      console.log("Response status:", response.status);

      // HTTP error handling
      if (!response.ok) {
        let errorMsg = `HTTP error ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.errorMessage) {
            errorMsg = errorData.errorMessage;
          } else if (errorData.message) {
            errorMsg = errorData.message;
          }
        } catch {
          errorMsg = `${errorMsg}: ${await response.text()}`;
        }
        throw new Error(errorMsg);
      }

      // Content type verification
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(`Expected JSON but got ${contentType}`);
      }

      // Process successful response
      const result = await response.json();
      console.log("API result:", result);

      // Handle different response structures
      const responseData = result.DishonChqDetail || result.data || result;
      const chequesData = Array.isArray(responseData)
        ? responseData
        : [responseData];

      if (!chequesData.length) {
        throw new Error("No data returned from API");
      }

      // Check level-based access control (LBAC) for Cheque No
      if (selectedOption === "Cheque No" && level < 80) {
        const filteredCheques: DishonouredCheque[] = [];
        for (const item of chequesData) {
          const scope = await resolveAccountArea(item.acctNo, currentAreas);
          if (scope && isAccountAuthorized(scope)) {
            filteredCheques.push(item);
          }
        }
        if (!filteredCheques.length) {
          throw new Error("This cheque is outside your access scope.");
        }
        setCheques(filteredCheques);
        setReportVisible(true);
        return;
      }

      // Check level-based access control (LBAC) for Date Range and All options
      if (
        (selectedOption === "Date Range" || selectedOption === "All") &&
        level < 80
      ) {
        const filteredCheques = chequesData.filter(
          (item: DishonouredCheque) => {
            const cleanAcct = String(item.acctNo || "").trim();
            if (cleanAcct.length < 2) return false;
            const prefix2 = cleanAcct.substring(0, 2);

            let matched = currentAreas.find(
              (a: AreaItem) =>
                String(a.AreaCode || a.areaCode || "").trim().toLowerCase() ===
                prefix2.toLowerCase()
            );
            if (!matched) {
              if (["05", "06", "07"].includes(prefix2)) {
                matched = currentAreas.find(
                  (a: AreaItem) =>
                    String(a.AreaCode || a.areaCode || "").trim() === "03"
                );
              } else if (["08", "09"].includes(prefix2)) {
                matched = currentAreas.find(
                  (a: AreaItem) =>
                    String(a.AreaCode || a.areaCode || "").trim() === "02"
                );
              }
            }
            if (!matched) return false;

            const scope = {
              areaCode: String(
                matched.AreaCode || matched.areaCode || ""
              ).trim(),
              provCode: String(
                matched.ProvCode || matched.provCode || ""
              ).trim(),
              regionCode: String(
                matched.Region || matched.region || ""
              ).trim(),
            };
            return isAccountAuthorized(scope);
          }
        );

        if (!filteredCheques.length) {
          throw new Error(
            "No dishonoured cheques found within your access scope."
          );
        }
        setCheques(filteredCheques);
        setReportVisible(true);
        return;
      }

      setCheques(chequesData);
      setReportVisible(true);
    } catch (err: unknown) {
      console.error("Error in form submission:", err);
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to load dishonoured cheques";
      // Special handling for network errors
      if (msg.includes("Failed to fetch")) {
        setReportError("Network error - please check your connection");
      } else {
        setReportError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // Helper function to format dates for API (DDMMYYYY)
  const formatDateForAPI = (dateString: string): string => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}${month}${year}`;
  };

  return (
    <div className="max-w-7xl mx-auto p-4 bg-white rounded-xl shadow border border-gray-200 text-sm font-sans">
      {/* Form Section */}
      {!reportVisible && (
        <>
          <h2 className={`text-xl font-bold mb-6 ${maroon}`}>
            Dishonoured Cheques
          </h2>
          {reportError && (
            <div className="text-red-600 bg-red-100 border border-red-300 p-4 rounded text-sm mb-4">
              <strong>Error:</strong> {reportError}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              {/* Dropdown */}
              <div className="flex flex-col">
                <label className={`${maroon} text-xs font-medium mb-1`}>
                  Select Option:
                </label>
                <select
                  name="dishonourOption"
                  value={selectedOption}
                  onChange={handleChange}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent"
                  required
                >
                  <option value="Single Account">Single Account</option>
                  <option value="Cheque No">Cheque No</option>
                  <option value="Date Range">Date Range</option>
                  <option value="All">Last 5 Years</option>
                </select>
              </div>

              {/* Conditional Text Input */}
              {["Single Account", "Cheque No"].includes(selectedOption) && (
                <div className="flex flex-col">
                  <label className={`${maroon} text-xs font-medium mb-1`}>
                    {selectedOption === "Single Account"
                      ? "Account No"
                      : "Cheque No"}
                  </label>
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={
                      selectedOption === "Single Account"
                        ? "Enter Account Number"
                        : "Enter Cheque Number"
                    }
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent"
                    required
                  />
                </div>
              )}

              {/* Conditional Date Range Fields */}
              {selectedOption === "Date Range" && (
                <>
                  <div className="flex flex-col">
                    <label className={`${maroon} text-xs font-medium mb-1`}>
                      From
                    </label>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent"
                      required
                    />
                  </div>

                  <div className="flex flex-col">
                    <label className={`${maroon} text-xs font-medium mb-1`}>
                      To
                    </label>
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent"
                      required
                    />
                  </div>
                </>
              )}
            </div>

            {/* Button */}
            <div className="w-full mt-6 flex justify-end">
              <button
                type="submit"
                className={`px-6 py-2 rounded-md font-medium transition-opacity duration-300 shadow
              ${maroonGrad} text-white ${
                  loading ? "opacity-70 cursor-not-allowed" : "hover:opacity-90"
                }`}
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Loading...
                  </span>
                ) : (
                  "View Report"
                )}
              </button>
            </div>
          </form>
        </>
      )}

      {/* Report Section Placeholder */}
      {reportVisible && (
        <div
          className="mt-4 border border-gray-300 rounded-lg overflow-hidden"
          style={{ maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}
        >
          <div className="mt-8">
            <div className="flex justify-between items-center mb-2">
              <h3 className={`text-lg font-semibold ${maroon}`}>
                Dishonoured Cheques Report
              </h3>

              <div className="flex space-x-2 mt-2 md:mt-0">
                {/* <button
                                    onClick={downloadAsCSV}
                                    className="flex items-center gap-1 px-3 py-1.5 border border-blue-400 text-blue-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-blue-50 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
                                    disabled={!cheques.length}
                                >
                                    <svg
                                    className="w-3 h-3"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                                    />
                                </svg>

                                    CSV
                                </button>
                                <button
                                    onClick={printPDF}
                                    className="flex items-center gap-1 px-3 py-1.5 border border-green-400 text-green-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-green-50 hover:text-green-800 focus:outline-none focus:ring-2 focus:ring-green-200 transition"
                                    disabled={!cheques.length}
                                >
                                    <svg
                                    className="w-3 h-3"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2z"
                                    />
                                </svg>

                                    PDF
                                </button> */}
                <button
                  onClick={downloadAsCSV}
                  className="flex items-center gap-1 px-3 py-1.5 border border-blue-400 text-blue-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-blue-50 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
                  disabled={!cheques.length}
                >
                  <FaFileDownload className="w-3 h-3" /> CSV
                </button>
                <button
                  onClick={printPDF}
                  className="flex items-center gap-1 px-3 py-1.5 border border-green-400 text-green-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-green-50 hover:text-green-800 focus:outline-none focus:ring-2 focus:ring-green-200 transition"
                  disabled={!cheques.length}
                >
                  <FaPrint className="w-3 h-3" /> PDF
                </button>
                <button
                  onClick={() => setReportVisible(false)}
                  className="px-4 py-1.5 bg-[#7A0000] hover:bg-[#A52A2A] text-xs rounded-md text-white flex items-center"
                >
                  Back to Form
                </button>
              </div>
            </div>

            {/* Auto changing text */}
            <p className="text-sm text-gray-600 mb-4">
              {selectedOption === "Single Account" && cheques.length > 0 ? (
                <>
                  Account No: <span className="font-bold">{inputValue}</span>{" "}
                  <br />
                  Address:{" "}
                  <span className="font-bold">
                    {cheques[0].address ? cheques[0].address : "-"}
                  </span>
                </>
              ) : selectedOption === "Cheque No" ? (
                <>
                  Cheque No: <span className="font-bold">{inputValue}</span>
                </>
              ) : selectedOption === "Date Range" ? (
                <>
                  Date Range: <span className="font-bold">{fromDate}</span> to{" "}
                  <span className="font-bold">{toDate}</span>
                </>
              ) : (
                "All Dishonoured Cheques (Last 5 Years)"
              )}
            </p>

            {loading && (
              <div className="text-sm text-[#7A0000] py-8 animate-pulse text-center">
                Loading report...
              </div>
            )}

            {reportError && (
              <div className="text-red-600 bg-red-100 border border-red-300 p-4 rounded text-sm mb-4">
                <strong>Error:</strong> {reportError}
              </div>
            )}

            {/* Report Table */}
            <div
              className="overflow-x-auto border border-gray-300 rounded-lg"
              ref={printRef}
            >
              {selectedOption === "Single Account" &&
                renderSingleAccountTable()}
              {selectedOption === "Cheque No" && renderChequeNoTable()}
              {(selectedOption === "Date Range" || selectedOption === "All") &&
                renderFullTable()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DishonouredCheques;
