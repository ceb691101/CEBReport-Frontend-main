import { useState, FormEvent, useEffect } from "react";
import { MdPermIdentity, MdDateRange } from "react-icons/md";

type PaymentInquiryFormProps = {
  onSubmit: (details: {
    acctNo: string;
    fromDate: string;
    inquiryType: "full" | "paymentsOnly";
  }) => void;
  onPosSubmit: (details: {
    province: string;
    area: string;
    counter: string;
    billType: string;
    payMode: string;
    date: string;
  }) => void;
};

type ProvinceOption = {
  provCode: string;
  provName: string;
};

type AreaOption = {
  areaCode: string;
  areaName: string;
};

const PaymentInquiryForm = ({ onSubmit, onPosSubmit }: PaymentInquiryFormProps) => {
  // Individual Payments state
  const [acctNo, setAcctNo] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [inquiryType, setInquiryType] = useState<"full" | "paymentsOnly">("full");

  // POS Counter Collection state
  const [province, setProvince] = useState("");
  const [area, setArea] = useState("");
  const [counter, setCounter] = useState("");
  const [billType, setBillType] = useState("All");
  const [payMode, setPayMode] = useState("All");
  const [posDate, setPosDate] = useState("");

  // API data state
  const [provinces, setProvinces] = useState<ProvinceOption[]>([]);
  const [areas, setAreas] = useState<AreaOption[]>([]);
  const [loadingProvinces, setLoadingProvinces] = useState(true);
  const [loadingAreas, setLoadingAreas] = useState(false);
  const [errorProvinces, setErrorProvinces] = useState<string | null>(null);
  const [errorAreas, setErrorAreas] = useState<string | null>(null);

  // Fetch provinces on component mount
  useEffect(() => {
    const fetchProvinces = async () => {
      setLoadingProvinces(true);
      setErrorProvinces(null);
      try {
        const response = await fetch("/api/customerdetails/pos-provinces");
        if (!response.ok) {
          throw new Error("Failed to fetch provinces");
        }
        const result = await response.json();
        if (result.data && Array.isArray(result.data.provinces)) {
          setProvinces(result.data.provinces);
        } else {
          setErrorProvinces("Invalid data format received");
        }
      } catch (error) {
        setErrorProvinces(
          error instanceof Error ? error.message : "Failed to load provinces"
        );
        console.error("Error fetching provinces:", error);
      } finally {
        setLoadingProvinces(false);
      }
    };

    fetchProvinces();
  }, []);

  // Fetch areas when province changes
  useEffect(() => {
    if (!province) {
      setAreas([]);
      return;
    }

    const fetchAreas = async () => {
      setLoadingAreas(true);
      setErrorAreas(null);
      try {
        const response = await fetch(
          `/api/customerdetails/pos-areas?provCode=${encodeURIComponent(province)}`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch areas");
        }
        const result = await response.json();
        if (result.data && Array.isArray(result.data.areas)) {
          setAreas(result.data.areas);
        } else {
          setErrorAreas("Invalid data format received");
        }
      } catch (error) {
        setErrorAreas(
          error instanceof Error ? error.message : "Failed to load areas"
        );
        console.error("Error fetching areas:", error);
      } finally {
        setLoadingAreas(false);
      }
    };

    fetchAreas();
  }, [province]);

  const counters = [
    "Select Counter",
    "Counter 1",
    "Counter 2",
    "Counter 3",
  ];

  const billTypes = ["All", "Type A", "Type B", "Type C"];
  const payModes = ["All", "Cash", "Cheque", "Online"];

  const handleIndividualPaymentSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({
      acctNo,
      fromDate,
      inquiryType,
    });
  };

  const handlePosSubmit = (e: FormEvent) => {
    e.preventDefault();
    onPosSubmit({
      province,
      area,
      counter,
      billType,
      payMode,
      date: posDate,
    });
  };

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 bg-white rounded-lg shadow-sm">
        {/* Individual Payments Section */}
        <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
          <h3 className="text-base font-semibold text-gray-800 mb-4">
            Individual Payments.....
          </h3>

          <form onSubmit={handleIndividualPaymentSubmit} className="space-y-4">
            {/* Account Number */}
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-1">
                <MdPermIdentity className="text-[#800000]" />
                Account No
              </label>
              <input
                type="text"
                value={acctNo}
                onChange={(e) => setAcctNo(e.target.value)}
                placeholder="5390001419"
                className="rounded-md bg-white h-9 px-3 text-sm border border-gray-300 focus:border-[#800000] focus:ring-1 focus:ring-[#800000] outline-none transition-colors"
              />
            </div>

            {/* From Date */}
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-1">
                <MdDateRange className="text-[#800000]" />
                From
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="rounded-md bg-white h-9 px-3 text-sm border border-gray-300 focus:border-[#800000] focus:ring-1 focus:ring-[#800000] outline-none transition-colors"
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setInquiryType("full");
                  handleIndividualPaymentSubmit(e as any);
                }}
                className="w-full bg-[#800000] hover:bg-[#600000] text-white font-medium py-2 px-4 rounded-md transition-colors text-sm"
              >
                View Full Report
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setInquiryType("paymentsOnly");
                  handleIndividualPaymentSubmit(e as any);
                }}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-md transition-colors text-sm"
              >
                View payments only
              </button>
              <p className="text-xs text-yellow-600 mt-1">
                this option may be a little faster than above
              </p>
            </div>

            <div className="pt-2">
              <a href="#" className="text-xs text-blue-600 hover:text-blue-800 underline">
                Preview latest updation times of servers
              </a>
            </div>
          </form>
        </div>

        {/* POS Counter Collection Breakup Section */}
        <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
          <h3 className="text-base font-semibold text-gray-800 mb-4">
            POS Counter Collection Breakup.....
          </h3>

          <form onSubmit={handlePosSubmit} className="space-y-4">
            {/* Province */}
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">
                Province
              </label>
              {loadingProvinces ? (
                <div className="rounded-md bg-gray-100 h-9 px-3 text-sm border border-gray-300 flex items-center text-gray-500">
                  Loading provinces...
                </div>
              ) : errorProvinces ? (
                <div className="rounded-md bg-red-50 h-9 px-3 text-sm border border-red-300 flex items-center text-red-600">
                  {errorProvinces}
                </div>
              ) : (
                <select
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className="rounded-md bg-white h-9 px-3 text-sm border border-gray-300 focus:border-[#800000] focus:ring-1 focus:ring-[#800000] outline-none transition-colors"
                >
                  <option value="">Select Province</option>
                  {provinces.map((prov) => (
                    <option key={prov.provCode} value={prov.provCode}>
                      {prov.provName}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Area */}
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">
                Area
              </label>
              {!province ? (
                <div className="rounded-md bg-gray-100 h-9 px-3 text-sm border border-gray-300 flex items-center text-gray-500">
                  Select province first
                </div>
              ) : loadingAreas ? (
                <div className="rounded-md bg-gray-100 h-9 px-3 text-sm border border-gray-300 flex items-center text-gray-500">
                  Loading areas...
                </div>
              ) : errorAreas ? (
                <div className="rounded-md bg-red-50 h-9 px-3 text-sm border border-red-300 flex items-center text-red-600">
                  {errorAreas}
                </div>
              ) : (
                <select
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="rounded-md bg-white h-9 px-3 text-sm border border-gray-300 focus:border-[#800000] focus:ring-1 focus:ring-[#800000] outline-none transition-colors"
                >
                  <option value="">Select Area</option>
                  {areas.map((a) => (
                    <option key={a.areaCode} value={a.areaCode}>
                      {a.areaName}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Counter */}
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">
                Counter
              </label>
              <select
                value={counter}
                onChange={(e) => setCounter(e.target.value)}
                className="rounded-md bg-white h-9 px-3 text-sm border border-gray-300 focus:border-[#800000] focus:ring-1 focus:ring-[#800000] outline-none transition-colors"
              >
                {counters.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Bill Type */}
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">
                Bill Type
              </label>
              <select
                value={billType}
                onChange={(e) => setBillType(e.target.value)}
                className="rounded-md bg-white h-9 px-3 text-sm border border-gray-300 focus:border-[#800000] focus:ring-1 focus:ring-[#800000] outline-none transition-colors"
              >
                {billTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Pay Mode */}
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">
                Pay Mode
              </label>
              <select
                value={payMode}
                onChange={(e) => setPayMode(e.target.value)}
                className="rounded-md bg-white h-9 px-3 text-sm border border-gray-300 focus:border-[#800000] focus:ring-1 focus:ring-[#800000] outline-none transition-colors"
              >
                {payModes.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="date"
                value={posDate}
                onChange={(e) => setPosDate(e.target.value)}
                className="rounded-md bg-white h-9 px-3 text-sm border border-gray-300 focus:border-[#800000] focus:ring-1 focus:ring-[#800000] outline-none transition-colors"
              />
            </div>

            {/* View Report Button */}
            <button
              type="submit"
              className="w-full bg-[#800000] hover:bg-[#600000] text-white font-medium py-2 px-4 rounded-md transition-colors text-sm mt-4"
            >
              View Report
            </button>

            <p className="text-xs text-yellow-600 mt-2">
              This option provides facility to access provincial server and extract
              information about payments
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PaymentInquiryForm;
