import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MaterialHeader from "../../components/mainTopics/Materials/MaterialHeader";
import RegionChartSection from "../../components/mainTopics/Materials/RegionChartSection";
import ProvinceChartSection from "../../components/mainTopics/Materials/ProvinceChartSection";
import StockBalancesTable from "../../components/mainTopics/Materials/StockBalancesTable";
import type { MaterialStock, ProvinceStock, StockBalance } from "../../interfaces/materialTypes";

const REGION_COLORS = ["#1E40AF", "#059669", "#DC2626", "#7C3AED", "#EA580C"];
const PROVINCE_COLORS = [
  "#6366F1", "#06B6D4", "#22D3EE", "#F59E42", "#34D399", "#F43F5E", "#A78BFA", "#FBBF24", "#38BDF8", "#F87171", "#10B981", "#818CF8",
];
const REGION_TO_PROVINCES: Record<string, string[]> = {
  DD1: ["NCP", "NWP", "PDR1", "NWP 2", "CC", "PROC", "PHMR1", "NP"],
  DD2: ["PDR2", "PHMR2", "CP2", "WPN", "EP", "CCR2", "CP"],
  DD3: ["PHMR3", "CCR3", "SABP", "WPSII", "UVAP"],
  DD4: ["LSSEP", "LSHP", "SP", "PHMR4", "SP2", "WPS1", "DGMPH"],
};
const mapRegionName = (region: string): string => {
  const regionMap: { [key: string]: string } = {
    DISCO1: "DD1",
    DISCO2: "DD2",
    DISCO3: "DD3",
    DISCO4: "DD4",
  };
  return regionMap[region] || region;
};
const renderCustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 rounded-lg shadow-lg text-xs border border-gray-200">
        <div className="font-medium">MatCd: {data.MatCd}</div>
        <div>Region: {mapRegionName(data.Region)}</div>
        <div className="font-semibold text-blue-600">Qty On Hand: {data.QtyOnHand}</div>
      </div>
    );
  }
  return null;
};
const renderProvinceTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 rounded-lg shadow-lg text-xs border border-gray-200">
        <div className="font-medium">MatCd: {data.MatCd}</div>
        <div>Province: {data.Province}</div>
        <div className="font-semibold text-purple-600">Qty On Hand: {data.QtyOnHand}</div>
      </div>
    );
  }
  return null;
};

const MaterialDetails: React.FC = () => {
  const { matCd } = useParams<{ matCd: string }>();
  const [materials, setMaterials] = useState<MaterialStock[]>([]);
  const [provinceStocks, setProvinceStocks] = useState<ProvinceStock[]>([]);
  const [allProvinceStocks, setAllProvinceStocks] = useState<ProvinceStock[]>([]);
  const [stockBalances, setStockBalances] = useState<StockBalance[]>([]);
  const [materialName, setMaterialName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [provinceLoading, setProvinceLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [provinceError, setProvinceError] = useState<string | null>(null);
  const [chartType, setChartType] = useState<"bar" | "donut" | "pie">("pie");
  const [provinceChartType, setProvinceChartType] = useState<"donut" | "bar" | "pie">("pie");
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMaterial = async () => {
      setLoading(true);
      setError(null);
      try {
        const url = `/misapi/api/materials/stocks/by-matcd/${matCd}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
        const data = await response.json();
        let materialData: MaterialStock[] = [];
        if (Array.isArray(data)) materialData = data;
        else if (data.data && Array.isArray(data.data)) materialData = data.data;
        else if (data.result && Array.isArray(data.result)) materialData = data.result;
        setMaterials(materialData);
        if (materialData.length > 0 && materialData[0].MatNm) {
          console.log('Setting material name from materials API:', materialData[0].MatNm);
          setMaterialName(materialData[0].MatNm);
        }
      } catch (err: any) {
        setError(err.message || "Failed to fetch material details.");
        setMaterials([]);
      } finally {
        setLoading(false);
      }
    };
    if (matCd) fetchMaterial();
  }, [matCd]);

  useEffect(() => {
    const fetchProvinceStocks = async () => {
      setProvinceLoading(true);
      setProvinceError(null);
      try {
        const url = `/misapi/api/materials/stocks/by-matcd-province-wise/${matCd}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
        const data = await response.json();
        let provinceData: ProvinceStock[] = [];
        if (Array.isArray(data)) provinceData = data;
        else if (data.data && Array.isArray(data.data)) provinceData = data.data;
        else if (data.result && Array.isArray(data.result)) provinceData = data.result;
        const provincesWithRegion = provinceData.map((province) => {
          const region = Object.entries(REGION_TO_PROVINCES).find(([_, provinces]) => provinces.includes(province.Province))?.[0] || "Unknown";
          return { ...province, Region: region };
        });
        setProvinceStocks(provincesWithRegion);
        setAllProvinceStocks(provincesWithRegion);
      } catch (err: any) {
        setProvinceError(err.message || "Failed to fetch province stocks");
        setProvinceStocks([]);
        setAllProvinceStocks([]);
      } finally {
        setProvinceLoading(false);
      }
    };
    if (matCd) fetchProvinceStocks();
  }, [matCd]);

  useEffect(() => {
    const fetchStockBalances = async () => {
      try {
        const url = `/misapi/api/materials/stock-balances?matCd=${matCd}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
        const data = await response.json();
        console.log('Stock balances API response:', data);
        let stockBalanceData: StockBalance[] = [];
        
        // Handle different response structures
        if (Array.isArray(data)) {
          stockBalanceData = data;
        } else if (data.data && Array.isArray(data.data)) {
          stockBalanceData = data.data;
        } else if (data.result && Array.isArray(data.result)) {
          stockBalanceData = data.result;
        } else if (data.MatCd) {
          // Handle single object response
          stockBalanceData = [data];
        }
        
        console.log('Processed stock balance data:', stockBalanceData);
        setStockBalances(stockBalanceData);
        
        // Set material name from stock balances data if available
        if (stockBalanceData.length > 0) {
          console.log('First stock balance item:', stockBalanceData[0]);
          console.log('MatNm value:', stockBalanceData[0].MatNm);
          if (stockBalanceData[0].MatNm) {
            console.log('Setting material name from stock balances:', stockBalanceData[0].MatNm);
            setMaterialName(stockBalanceData[0].MatNm);
          } else {
            console.log('MatNm is empty or undefined');
          }
        } else {
          console.log('No stock balance data found');
        }
      } catch (err: any) {
        setStockBalances([]);
      } finally {
      }
    };
    if (matCd) fetchStockBalances();
  }, [matCd]);

  useEffect(() => {
    if (selectedRegion) {
      const filteredProvinces = allProvinceStocks.filter((province) => province.Region === selectedRegion);
      setProvinceStocks(filteredProvinces);
    } else {
      setProvinceStocks(allProvinceStocks);
    }
  }, [selectedRegion, allProvinceStocks]);

  const handleRegionClick = (_: any, index: number) => {
    const region = materials[index].Region;
    const mappedRegion = mapRegionName(region);
    setSelectedRegion(selectedRegion === mappedRegion ? null : mappedRegion);
  };
  const clearRegionSelection = () => setSelectedRegion(null);
  const downloadAsCSV = () => {
    if (!stockBalances || stockBalances.length === 0) return;
    
    // Create CSV content with proper topic section
    const csvContent = [
      // Topic section
      `"Material Stock Balances Report"`,
      `"Material Code: ${matCd}"`,
      `"Material Name: ${stockBalances[0]?.MatNm || 'N/A'}"`,
      `"Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}"`,
      `"Total Records: ${stockBalances.length}"`,
      "", // Empty line
      // Data section
      `"Region","Province","Department","Material Name","Unit Price","Quantity On Hand","Reorder Qty"`,
      ...stockBalances.map((balance) => [
        `"${mapRegionName(balance.Region)}"`,
        `"${balance.Province}"`,
        `"${balance.DeptId}"`,
        `"${balance.MatNm}"`,
        `"${balance.UnitPrice?.toString() ?? ""}"`,
        `"${balance.QtyOnHand?.toString() ?? ""}"`,
        `"${balance.ReorderQty?.toString() ?? ""}"`,
      ].join(",")),
      "", // Empty line
      `"For technical support, contact IT Department"`
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `StockBalances_${matCd}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  const printPDF = () => {
    if (!printRef.current) return;
    const printContents = printRef.current.innerHTML;
    const originalContents = document.body.innerHTML;
    document.body.innerHTML = printContents;
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload();
  };

  const allProvincesZero = provinceStocks.length > 0 && provinceStocks.every((p) => p.QtyOnHand === 0);

  if (loading)
    return <div className="flex justify-center items-center py-8 text-blue-600">Loading...</div>;
  if (error)
    return <div className="text-red-600 bg-red-50 border border-red-200 p-4 rounded">Error: {error}</div>;

  return (
    <div className="max-w-5xl mx-auto p-4 bg-white rounded-lg shadow border border-gray-100 text-[11px] font-sans" ref={printRef}>
      
      <MaterialHeader matCd={matCd} materialName={materialName} navigate={navigate} />
      {(materials.length > 0 || provinceStocks.length > 0) ? (
        <div className="flex flex-col md:flex-row gap-6 mb-8">
          <RegionChartSection
            materials={materials}
            chartType={chartType}
            setChartType={setChartType}
            selectedRegion={selectedRegion}
            setSelectedRegion={setSelectedRegion}
            REGION_COLORS={REGION_COLORS}
            mapRegionName={mapRegionName}
            handleRegionClick={handleRegionClick}
            clearRegionSelection={clearRegionSelection}
            renderCustomTooltip={renderCustomTooltip}
          />
          <ProvinceChartSection
            provinceStocks={provinceStocks}
            provinceChartType={provinceChartType}
            setProvinceChartType={setProvinceChartType}
            PROVINCE_COLORS={PROVINCE_COLORS}
            selectedRegion={selectedRegion}
            allProvincesZero={allProvincesZero}
            provinceLoading={provinceLoading}
            provinceError={provinceError}
            renderProvinceTooltip={renderProvinceTooltip}
          />
        </div>
      ) : (
        <div className="text-center text-sm text-gray-500 mb-8">No chart data found for material code: {matCd}</div>
      )}
      <StockBalancesTable
        matCd={matCd}
        stockBalances={stockBalances}
        printPDF={printPDF}
        downloadAsCSV={downloadAsCSV}
        onBackToHome={() => navigate("/report/inventory")}
      />
    </div>
  );
};
export default MaterialDetails;
