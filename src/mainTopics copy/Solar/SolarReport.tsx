import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

interface ReportEntry {
  area_code: string;
  acct_number: string;
  net_type: string;
  units_out: number;
  units_in: number;
  gen_cap: number;
  bill_cycle: number;
  tariff_code: string;
  bf_units: number;
  units_bill: number;
  period: string;
  kwh_chg: number;
  fxd_chg: number;
  fac_chg: number;
  cf_units: number;
  rate: number;
  unitsale: number;
  kwh_sales: number;
  bank_code: string;
  bran_code: string;
  bk_ac_no: string;
  agrmnt_date: string;
}

const ReportDisplay: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [reportData, setReportData] = useState<ReportEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Get filter parameters from location state
  const filterParams = location.state?.filterParams || {};

  // Fetch report data when component mounts
  useEffect(() => {
    const fetchReportData = async () => {
      setLoading(true);
      try {
        // Construct query parameters from filterParams
        const queryParams = new URLSearchParams();

        // Add all non-empty parameters
        Object.entries(filterParams).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            queryParams.append(key, value.toString());
          }
        });

        const apiUrl = `/api/solarcustomer/report?${queryParams.toString()}`;

        // Make GET request with query parameters
        const response = await axios.get(apiUrl);

        // Ensure data is in the correct format
        let processedData = response.data;

        // If data is not an array, check if it needs to be wrapped
        if (!Array.isArray(processedData)) {
          // If it's an object with a single item, wrap it in an array
          if (processedData && typeof processedData === "object") {
            processedData = [processedData];
          }
        }

        // Validate and transform the data
        if (Array.isArray(processedData)) {
          processedData = processedData.map((item) => ({
            ...item,
            // Ensure numeric fields are properly formatted
            units_out: Number(item.units_out) || 0,
            units_in: Number(item.units_in) || 0,
            gen_cap: Number(item.gen_cap) || 0,
            bf_units: Number(item.bf_units) || 0,
            units_bill: Number(item.units_bill) || 0,
            kwh_chg: Number(item.kwh_chg) || 0,
            fxd_chg: Number(item.fxd_chg) || 0,
            fac_chg: Number(item.fac_chg) || 0,
            cf_units: Number(item.cf_units) || 0,
            rate: Number(item.rate) || 0,
            unitsale: Number(item.unitsale) || 0,
            kwh_sales: Number(item.kwh_sales) || 0,
            bill_cycle: Number(item.bill_cycle) || 0,
          }));
        }

        setReportData(processedData);
      } catch (err) {
        setError(
          "Failed to load report data. Please check console for details."
        );
      } finally {
        setLoading(false);
      }
    };

    if (filterParams && Object.keys(filterParams).length > 0) {
      fetchReportData();
    } else {
      navigate("/report-form");
    }
  }, [filterParams, navigate]);

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading)
    return <div className="text-center py-8">Loading report data...</div>;
  if (error)
    return <div className="text-center py-8 text-red-600">{error}</div>;
  if (!reportData.length)
    return (
      <div className="text-center py-8">
        No data available for the selected criteria
      </div>
    );

  return (
    <div className="max-w-7xl mx-auto p-6 bg-white rounded-xl shadow border border-gray-200">
      
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-[#7A0000]">
          Solar Customer Report
        </h2>
        <button
          onClick={() => navigate("/report-form")}
          className="px-3 py-1.5 border border-gray-300 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          Back to Home
        </button>
      </div>

      {/* Report Summary Information */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="text-base font-semibold text-blue-800 mb-3">
          Report Summary
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-white p-3 rounded-md border border-blue-200">
            <p className="text-xs font-medium text-gray-600">Cycle Type</p>
            <p className="text-sm font-semibold text-blue-900">
              {filterParams.cycleType === "bill"
                ? "Bill Cycle"
                : "Calculation Cycle"}
            </p>
          </div>

          <div className="bg-white p-3 rounded-md border border-blue-200">
            <p className="text-xs font-medium text-gray-600">Report Category</p>
            <p className="text-sm font-semibold text-blue-900">
              {filterParams.reportType === "area"
                ? "Area"
                : filterParams.reportType === "province"
                ? "Province"
                : filterParams.reportType === "division"
                ? "Division"
                : filterParams.reportType === "entireceb"
                ? "Entire CEB"
                : "N/A"}
            </p>
          </div>

          <div className="bg-white p-3 rounded-md border border-blue-200">
            <p className="text-xs font-medium text-gray-600">Net Type</p>
            <p className="text-sm font-semibold text-blue-900">
              {filterParams.netType === "1"
                ? "Net Metering"
                : filterParams.netType === "2"
                ? "Net Accounting"
                : filterParams.netType === "3"
                ? "Net Plus"
                : filterParams.netType === "4"
                ? "Net Plus Plus"
                : filterParams.netType === "5"
                ? "Convert Net Metering To Net Accounting"
                : "N/A"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filterParams.cycleNumber && (
            <div className="bg-white p-3 rounded-md border border-blue-200">
              <p className="text-xs font-medium text-gray-600">Cycle Number</p>
              <p className="text-sm font-semibold text-blue-900">
                {filterParams.cycleNumber}
              </p>
            </div>
          )}

          {(filterParams.areaCode ||
            filterParams.provinceCode ||
            filterParams.region) && (
            <div className="bg-white p-3 rounded-md border border-blue-200">
              <p className="text-xs font-medium text-gray-600">
                Selected Location
              </p>
              <p className="text-sm font-semibold text-blue-900">
                {filterParams.areaCode ||
                  filterParams.provinceCode ||
                  filterParams.region}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-xs">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 py-2 text-left">Area</th>
              <th className="px-2 py-2 text-left">Account</th>
              <th className="px-2 py-2 text-left">Type</th>
              <th className="px-2 py-2 text-right">Units Out</th>
              <th className="px-2 py-2 text-right">Units In</th>
              <th className="px-2 py-2 text-right">Gen Cap</th>
              <th className="px-2 py-2 text-left">Bill Cycle</th>
              <th className="px-2 py-2 text-left">Tariff</th>
              <th className="px-2 py-2 text-right">BF Units</th>
              <th className="px-2 py-2 text-right">Units Bill</th>
              <th className="px-2 py-2 text-right">KWH Charge</th>
              <th className="px-2 py-2 text-right">Fixed Charge</th>
              <th className="px-2 py-2 text-right">Fac Charge</th>
              <th className="px-2 py-2 text-right">CF Units</th>
              <th className="px-2 py-2 text-right">Rate</th>
              <th className="px-2 py-2 text-right">Unit Sale</th>
              <th className="px-2 py-2 text-right">KWH Sales</th>
              <th className="px-2 py-2 text-left">Agreement Date</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {reportData.map((entry, index) => {
              return (
                <tr
                  key={index}
                  className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                >
                  <td className="px-2 py-2 whitespace-nowrap">
                    {entry.area_code}
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    {entry.acct_number}
                  </td>
                  <td className="px-2 py-2 text-left">{entry.net_type}</td>
                  <td className="px-2 py-2 text-right">
                    {entry.units_out.toFixed(2)}
                  </td>
                  <td className="px-2 py-2 text-right">
                    {entry.units_in.toFixed(2)}
                  </td>
                  <td className="px-2 py-2 text-right">
                    {entry.gen_cap.toFixed(2)}
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    {entry.bill_cycle}
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    {entry.tariff_code}
                  </td>
                  <td className="px-2 py-2 text-right">
                    {entry.bf_units.toFixed(2)}
                  </td>
                  <td className="px-2 py-2 text-right">
                    {entry.units_bill.toFixed(2)}
                  </td>
                  <td className="px-2 py-2 text-right">
                    {entry.kwh_chg.toFixed(2)}
                  </td>
                  <td className="px-2 py-2 text-right">
                    {entry.fxd_chg.toFixed(2)}
                  </td>
                  <td className="px-2 py-2 text-right">
                    {entry.fac_chg.toFixed(2)}
                  </td>
                  <td className="px-2 py-2 text-right">
                    {entry.cf_units.toFixed(2)}
                  </td>
                  <td className="px-2 py-2 text-right">
                    {entry.rate.toFixed(2)}
                  </td>
                  <td className="px-2 py-2 text-right">
                    {entry.unitsale.toFixed(2)}
                  </td>
                  <td className="px-2 py-2 text-right">
                    {entry.kwh_sales.toFixed(2)}
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    {formatDate(entry.agrmnt_date)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-xs text-gray-500">
        Showing {reportData.length} records
      </div>
    </div>
  );
};

export default ReportDisplay;
