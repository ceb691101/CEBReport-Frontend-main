import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

interface BillCycle {
  billCycle: number;
  monthYear: string;
}

interface CalCycle {
  calCycle: number;
  monthYear: string;
}




const ReportForm: React.FC = () => {
  const navigate = useNavigate();
  const [cycleType, setCycleType] = useState<"bill" | "calculation">("bill");
  const [cycles, setCycles] = useState<(BillCycle | CalCycle)[]>([]);
  const [selectedCycle, setSelectedCycle] = useState("");

  const [reportCategory, setReportCategory] = useState("");
  const [categoryOptions, setCategoryOptions] = useState<any[]>([]);
  const [selectedCategoryOption, setSelectedCategoryOption] = useState("");

  const types = [
    "Net Metering",
    "Net Accounting",
    "Net Plus",
    "Net Plus Plus",
    "Convert Net Metering To Net Accounting",
  ];
  const [selectedType, setSelectedType] = useState("");

  // Cycle type options for dropdown
  const cycleTypeOptions = [
    { value: "bill", label: "Bill Cycle (for selected month)" },
    { value: "calculation", label: "Calculation Cycle (for all customers)" },
  ];

  // Report category options for dropdown
  const reportCategoryOptions = [
    { value: "Area", label: "Area" },
    { value: "Province", label: "Province" },
    { value: "Division", label: "Division" },
    { value: "EntireCEB", label: "Entire CEB" },
  ];

  // Fetch cycles based on cycleType
  useEffect(() => {
    const fetchCycles = async () => {
      try {
        const url =
          cycleType === "bill" ? "/api/BillCycleInfo" : "/api/CalCycle";
        const response = await axios.get(url);
        setCycles(response.data);
        setSelectedCycle("");
      } catch (error) {
        console.error("Failed to fetch cycles", error);
      }
    };
    fetchCycles();
  }, [cycleType]);

  // Fetch category options
  useEffect(() => {
    const fetchCategoryData = async () => {
      try {
        let url = "";
        if (reportCategory === "Area") url = "/misapi/api/areas";
        else if (reportCategory === "Province") url = "/api/Province";
        else if (reportCategory === "Division") url = "/api/Region";
        else {
          setCategoryOptions([]);
          return;
        }

        const response = await axios.get(url);
        setCategoryOptions(response.data);
        setSelectedCategoryOption("");
      } catch (error) {
        console.error("Failed to fetch category data", error);
      }
    };
    fetchCategoryData();
  }, [reportCategory]);

  const isFormValid =
    selectedCycle &&
    (reportCategory === "EntireCEB" || selectedCategoryOption) &&
    selectedType;

  function mapTypeToNetType(typeName: string): string {
    switch (typeName) {
      case "Net Metering":
        return "1";
      case "Net Accounting":
        return "2";
      case "Net Plus":
        return "3";
      case "Net Plus Plus":
        return "4";
      case "Convert Net Metering To Net Accounting":
        return "5";
      default:
        return "1";
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6 bg-white rounded-xl shadow border border-gray-200 text-sm font-sans">
      {/* Form Section */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4 text-[#7A0000]">
          Solar Payment Information
        </h2>
        <form className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cycle Type Dropdown */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Cycle Type
              </label>
              <select
                value={cycleType}
                onChange={(e) =>
                  setCycleType(e.target.value as "bill" | "calculation")
                }
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent"
              >
                {cycleTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Month Dropdown */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Month
              </label>
              <select
                value={selectedCycle}
                onChange={(e) => setSelectedCycle(e.target.value)}
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent"
                style={{ maxHeight: "200px" }}
              >
                <option value="">---Select Cycle---</option>
                {cycles.map((cycle: any, idx) => {
                  const value =
                    cycleType === "bill" ? cycle.billCycle : cycle.calCycle;
                  return (
                    <option key={idx} value={value} className="text-xs py-1">
                      {cycle.monthYear}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Report Category Dropdown */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Report Category
              </label>
              <select
                value={reportCategory}
                onChange={(e) => setReportCategory(e.target.value)}
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent"
              >
                <option value="">---Select Category---</option>
                {reportCategoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Dynamic Category Dropdown */}
            {reportCategory !== "EntireCEB" && reportCategory && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Select {reportCategory}
                </label>
                <select
                  value={selectedCategoryOption}
                  onChange={(e) => setSelectedCategoryOption(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent"
                  style={{ maxHeight: "200px" }}
                >
                  <option value="">-----Select One-----</option>
                  {categoryOptions.map((opt: any, idx) => (
                    <option
                      key={idx}
                      value={
                        opt[
                          reportCategory === "Area"
                            ? "area_code"
                            : reportCategory === "Province"
                            ? "provCode"
                            : "regionName"
                        ]
                      }
                    >
                      {String(
                        opt[
                          reportCategory === "Area"
                            ? "area_name"
                            : reportCategory === "Province"
                            ? "provName"
                            : "regionName"
                        ]
                      ).trim()}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Type Dropdown */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent"
                style={{ maxHeight: "200px" }}
              >
                <option value="">-----Select One-----</option>
                {types.map((t, idx) => (
                  <option key={idx} value={t} className="text-xs py-1">
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#7A0000]"
            >
              Back
            </button>

            <button
              type="button"
              disabled={!isFormValid}
              onClick={() => {
                // Map your form values to the filter parameters
                const filterParams = {
                  reportType: reportCategory.toLowerCase(), // Ensure lowercase to match API expectations
                  cycleType: cycleType,
                  areaCode:
                    reportCategory === "Area"
                      ? selectedCategoryOption
                      : undefined,
                  provinceCode:
                    reportCategory === "Province"
                      ? selectedCategoryOption
                      : undefined,
                  region:
                    reportCategory === "Division"
                      ? selectedCategoryOption
                      : undefined,
                  netType: mapTypeToNetType(selectedType),
                  cycleNumber: parseInt(selectedCycle),
                };

                // Remove undefined values
                const cleanedParams = Object.fromEntries(
                  Object.entries(filterParams).filter(
                    ([_, value]) => value !== undefined
                  )
                );

                navigate("/report-display", {
                  state: { filterParams: cleanedParams },
                });
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium text-white bg-gradient-to-r from-[#7A0000] to-[#A30000] hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#7A0000] disabled:opacity-50`}
            >
              View Report
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReportForm;
