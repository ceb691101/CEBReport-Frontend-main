// import React, { useEffect, useState } from "react";
// import { useUser } from "../contexts/UserContext";
// import {
//   Users,
//   Zap,
//   DollarSign,
//   Target,
//   PieChart,
//   Sun,
//   ArrowUp,
// } from "lucide-react";
// import {
//   ResponsiveContainer,
//   BarChart,
//   Bar,
//   XAxis,
//   YAxis,
//   CartesianGrid,
//   Tooltip,
//   Legend,
//   LabelList,
// } from "recharts";

// interface CustomerCounts {
//   ordinary: number;
//   bulk: number;
//   solar: {
//     netMetering: number;
//     netAccounting: number;
//     netPlus: number;
//     netPlusPlus: number;
//   };
//   zeroConsumption: number;
// }

// interface TopCustomer {
//   name: string;
//   consumption: number;
//   type: string;
// }

// interface SalesData {
//   ordinary: { charge: number; units: number };
//   bulk: { charge: number; units: number };
//   kioskCollection: number;
// }

// interface MonthlySalesData {
//   month: string;
//   ordinary: number;
//   bulk: number;
//   target: number;
// }

// interface MonthlyNewCustomers {
//   month: string;
//   ordinary: number;
//   bulk: number;
// }

// const Home: React.FC = () => {
//   useUser();
//   const [isLoaded, setIsLoaded] = useState(false);
//   const [selectedYear, setSelectedYear] = useState("2023");
//   const [selectedMonth, setSelectedMonth] = useState("All");
//   const [activePieChart, setActivePieChart] = useState<string | null>(null);

//   const [customerCounts] = useState<CustomerCounts>({
//     ordinary: 45231,
//     bulk: 1234,
//     solar: {
//       netMetering: 567,
//       netAccounting: 234,
//       netPlus: 189,
//       netPlusPlus: 76
//     },
//     zeroConsumption: 1234
//   });

//   const [topCustomers] = useState<TopCustomer[]>([
//     { name: "John Doe", consumption: 45231, type: "Bulk" },
//     { name: "Jane Smith", consumption: 38456, type: "Bulk" },
//     { name: "Michael Brown", consumption: 35678, type: "Ordinary" },
//     { name: "Emily Davis", consumption: 32456, type: "Ordinary" },
//     { name: "Robert Johnson", consumption: 29876, type: "Bulk" }
//   ]);

//   const [salesData] = useState<SalesData>({
//     ordinary: { charge: 2456789, units: 1234567 },
//     bulk: { charge: 5678901, units: 2345678 },
//     kioskCollection: 456789
//   });

//   // Monthly Sales Data (12 months)
//   const [monthlySalesData] = useState<MonthlySalesData[]>([
//     { month: "Jan", ordinary: 2100000, bulk: 5200000, target: 7500000 },
//     { month: "Feb", ordinary: 2250000, bulk: 5400000, target: 7800000 },
//     { month: "Mar", ordinary: 2450000, bulk: 5680000, target: 8200000 },
//     { month: "Apr", ordinary: 2350000, bulk: 5500000, target: 8000000 },
//     { month: "May", ordinary: 2550000, bulk: 5800000, target: 8400000 },
//     { month: "Jun", ordinary: 2480000, bulk: 5750000, target: 8300000 },
//     { month: "Jul", ordinary: 2520000, bulk: 5820000, target: 8500000 },
//     { month: "Aug", ordinary: 2600000, bulk: 5900000, target: 8600000 },
//     { month: "Sep", ordinary: 2550000, bulk: 5850000, target: 8550000 },
//     { month: "Oct", ordinary: 2620000, bulk: 5950000, target: 8700000 },
//     { month: "Nov", ordinary: 2580000, bulk: 5880000, target: 8650000 },
//     { month: "Dec", ordinary: 2700000, bulk: 6000000, target: 8800000 },
//   ]);

//   // Monthly New Customers Data
//   const [monthlyNewCustomers] = useState<MonthlyNewCustomers[]>([
//     { month: 'Jan', ordinary: 210, bulk: 38 },
//     { month: 'Feb', ordinary: 225, bulk: 42 },
//     { month: 'Mar', ordinary: 234, bulk: 45 },
//     { month: 'Apr', ordinary: 218, bulk: 40 },
//     { month: 'May', ordinary: 242, bulk: 48 },
//     { month: 'Jun', ordinary: 238, bulk: 44 }
//   ]);

//   const [solarCapacity] = useState({
//     netMetering: { count: 567, capacity: 2345 },
//     netAccounting: { count: 234, capacity: 1234 },
//     netPlus: { count: 189, capacity: 890 },
//     netPlusPlus: { count: 76, capacity: 345 }
//   });

//   useEffect(() => {
//     const timer = setTimeout(() => setIsLoaded(true), 100);
//     return () => clearTimeout(timer);
//   }, []);

//   const formatNumber = (num: number) => {
//     return new Intl.NumberFormat('en-US').format(num);
//   };

//   const formatCurrency = (amount: number) => {
//     return new Intl.NumberFormat('en-US', {
//       style: 'currency',
//       currency: 'LKR',
//       minimumFractionDigits: 0,
//       maximumFractionDigits: 0
//     }).format(amount);
//   };

//   // Calculate totals for Sales
//   const totalSales = monthlySalesData.reduce(
//     (sum, d) => sum + d.ordinary + d.bulk,
//     0
//   );
//   const totalOrdinarySales = monthlySalesData.reduce(
//     (sum, d) => sum + d.ordinary,
//     0
//   );
//   const totalBulkSales = monthlySalesData.reduce(
//     (sum, d) => sum + d.bulk,
//     0
//   );

//   // Calculate pie chart segments for New Customers
//   const totalNewCustomers = monthlyNewCustomers.reduce((sum, d) => sum + d.ordinary + d.bulk, 0);
//   const totalNewOrdinary = monthlyNewCustomers.reduce((sum, d) => sum + d.ordinary, 0);
//   const totalNewBulk = monthlyNewCustomers.reduce((sum, d) => sum + d.bulk, 0);

//   const newOrdinaryPercentage = (totalNewOrdinary / totalNewCustomers) * 100;
//   const newBulkPercentage = (totalNewBulk / totalNewCustomers) * 100;

//   // Sales & Collection Distribution bar chart data
//   const salesBarData = monthlySalesData.map(item => ({
//     month: item.month,
//     ordinary: item.ordinary,
//     bulk: item.bulk,
//     total: item.ordinary + item.bulk
//   }));

//   const solarCapacityChartData = [
//     {
//       netType: "Net Metering",
//       capacity: solarCapacity.netMetering.capacity,
//       count: solarCapacity.netMetering.count,
//     },
//     {
//       netType: "Net Accounting",
//       capacity: solarCapacity.netAccounting.capacity,
//       count: solarCapacity.netAccounting.count,
//     },
//     {
//       netType: "Net Plus",
//       capacity: solarCapacity.netPlus.capacity,
//       count: solarCapacity.netPlus.count,
//     },
//     {
//       netType: "Net Plus Plus",
//       capacity: solarCapacity.netPlusPlus.capacity,
//       count: solarCapacity.netPlusPlus.count,
//     },
//   ];

//   const solarCustomerSplitChartData = [
//     {
//       netType: "Net Metering",
//       ordinary: Math.round(customerCounts.solar.netMetering * 0.72),
//       bulk: customerCounts.solar.netMetering - Math.round(customerCounts.solar.netMetering * 0.72),
//     },
//     {
//       netType: "Net Accounting",
//       ordinary: Math.round(customerCounts.solar.netAccounting * 0.68),
//       bulk: customerCounts.solar.netAccounting - Math.round(customerCounts.solar.netAccounting * 0.68),
//     },
//     {
//       netType: "Net Plus",
//       ordinary: Math.round(customerCounts.solar.netPlus * 0.64),
//       bulk: customerCounts.solar.netPlus - Math.round(customerCounts.solar.netPlus * 0.64),
//     },
//     {
//       netType: "Net Plus Plus",
//       ordinary: Math.round(customerCounts.solar.netPlusPlus * 0.6),
//       bulk: customerCounts.solar.netPlusPlus - Math.round(customerCounts.solar.netPlusPlus * 0.6),
//     },
//   ];

//   const formatCompact = (n: number) =>
//     new Intl.NumberFormat("en-US", {
//       notation: "compact",
//       maximumFractionDigits: 1,
//     }).format(n);

//   const formatInteger = (n: number) =>
//     new Intl.NumberFormat("en-US", {
//       maximumFractionDigits: 0,
//     }).format(n);

//   const formatKW = (n: number) => `${formatCompact(n)} kW`;

//   return (
//     <div className="min-h-screen bg-gray-50">
//       {/* Header with Filters */}
//       <div className={`bg-white border-b border-gray-200 sticky top-0 z-10 transition-all duration-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
//         <div className="max-w-7xl mx-auto px-4 py-4">
//           <div className="flex items-center justify-between">
//             <div>
//               <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
//             </div>

//             {/* Filter Tabs */}
//             <div className="flex items-center gap-4">
//               <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
//                 <button className="px-3 py-1.5 text-sm font-medium rounded-md bg-white shadow-sm">All Regions</button>
//                 <button className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-white/50 rounded-md">Central</button>
//                 <button className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-white/50 rounded-md">West</button>
//                 <button className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-white/50 rounded-md">East</button>
//               </div>

//               <select 
//                 value={selectedYear}
//                 onChange={(e) => setSelectedYear(e.target.value)}
//                 className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ceb-maroon)]"
//               >
//                 <option>2024</option>
//                 <option>2023</option>
//                 <option>2022</option>
//               </select>

//               <select 
//                 value={selectedMonth}
//                 onChange={(e) => setSelectedMonth(e.target.value)}
//                 className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ceb-maroon)]"
//               >
//                 <option>All Months</option>
//                 <option>January</option>
//                 <option>February</option>
//                 <option>March</option>
//                 <option>April</option>
//                 <option>May</option>
//                 <option>June</option>
//               </select>
//             </div>
//           </div>
//         </div>
//       </div>

//       <div className="max-w-7xl mx-auto px-4 py-6">
//         {/* KPI Cards - Top Row */}
//         <div className={`grid grid-cols-1 md:grid-cols-4 gap-6 mb-6 transition-all duration-1000 delay-200 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
//           <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
//             <div className="flex items-center justify-between mb-2">
//               <div className="p-2 bg-blue-100 rounded-lg">
//                 <Users className="w-5 h-5 text-blue-600" />
//               </div>
//               <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">+5.2%</span>
//             </div>
//             <h3 className="text-sm font-medium text-gray-500">Total Customers</h3>
//             <p className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(customerCounts.ordinary + customerCounts.bulk)}</p>
//             <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
//               <span>Ordinary: {formatNumber(customerCounts.ordinary)}</span>
//               <span>Bulk: {formatNumber(customerCounts.bulk)}</span>
//             </div>
//           </div>

//           <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
//             <div className="flex items-center justify-between mb-2">
//               <div className="p-2 bg-yellow-100 rounded-lg">
//                 <Sun className="w-5 h-5 text-yellow-600" />
//               </div>
//               <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">+12.3%</span>
//             </div>
//             <h3 className="text-sm font-medium text-gray-500">Solar Customers</h3>
//             <p className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(
//               customerCounts.solar.netMetering + 
//               customerCounts.solar.netAccounting + 
//               customerCounts.solar.netPlus + 
//               customerCounts.solar.netPlusPlus
//             )}</p>
//             <p className="text-xs text-gray-500 mt-2">Net-type breakdown shown in chart</p>
//           </div>

//           <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
//             <div className="flex items-center justify-between mb-2">
//               <div className="p-2 bg-red-100 rounded-lg">
//                 <Zap className="w-5 h-5 text-red-600" />
//               </div>
//               <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">-2.1%</span>
//             </div>
//             <h3 className="text-sm font-medium text-gray-500">Zero Consumption</h3>
//             <p className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(customerCounts.zeroConsumption)}</p>
//             <p className="text-xs text-gray-500 mt-2">Last 3 months</p>
//           </div>

//           <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
//             <div className="flex items-center justify-between mb-2">
//               <div className="p-2 bg-green-100 rounded-lg">
//                 <DollarSign className="w-5 h-5 text-green-600" />
//               </div>
//               <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">+8.7%</span>
//             </div>
//             <h3 className="text-sm font-medium text-gray-500">Kiosk Collection</h3>
//             <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(salesData.kioskCollection)}</p>
//             <p className="text-xs text-gray-500 mt-2">This month</p>
//           </div>
//         </div>

//         {/* Two Column Layout - Bar Chart for Sales & Collection */}
//         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
//           {/* Sales & Collection Bar Chart */}
//           <div className={`transition-all duration-1000 delay-300 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
//             <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
//               <div className="flex items-center justify-between mb-6">
//                 <div>
//                   <h3 className="font-semibold text-gray-900">Sales & Collection Distribution</h3>
//                   <p className="text-sm text-gray-500 mt-1">Monthly Sales by Customer Type</p>
//                 </div>
//                 <PieChart className="w-5 h-5 text-gray-400" />
//               </div>

//               {/* Bar Chart */}
//               <div className="h-64 mb-6">
//                 <ResponsiveContainer width="100%" height="100%">
//                   <BarChart data={salesBarData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
//                     <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
//                     <XAxis dataKey="month" tick={{ fontSize: 12 }} />
//                     <YAxis 
//                       tick={{ fontSize: 12 }}
//                       tickFormatter={(value) => formatCompact(value)}
//                     />
//                     <Tooltip 
//                       formatter={(value: any) => formatCurrency(Number(value))}
//                       labelStyle={{ fontWeight: 600 }}
//                     />
//                     <Legend />
//                     <Bar dataKey="ordinary" name="Ordinary" fill="var(--ceb-maroon)" radius={[4, 4, 0, 0]}>
//                       <LabelList dataKey="ordinary" position="top" formatter={(v: any) => formatCompact(Number(v))} />
//                     </Bar>
//                     <Bar dataKey="bulk" name="Bulk" fill="var(--ceb-gold)" radius={[4, 4, 0, 0]}>
//                       <LabelList dataKey="bulk" position="top" formatter={(v: any) => formatCompact(Number(v))} />
//                     </Bar>
//                   </BarChart>
//                 </ResponsiveContainer>
//               </div>

//               {/* Monthly Breakdown */}
//               <div className="mt-6 pt-4 border-t border-gray-100">
//                 <p className="text-xs text-gray-500 mb-2">Monthly Average</p>
//                 <div className="grid grid-cols-2 gap-4">
//                   <div>
//                     <p className="text-xs text-gray-500">Ordinary</p>
//                     <p className="text-sm font-semibold text-gray-900">
//                       {formatCurrency(totalOrdinarySales / 12)} / month
//                     </p>
//                   </div>
//                   <div>
//                     <p className="text-xs text-gray-500">Bulk</p>
//                     <p className="text-sm font-semibold text-gray-900">
//                       {formatCurrency(totalBulkSales / 12)} / month
//                     </p>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* New Customers Pie Chart */}
//           <div className={`transition-all duration-1000 delay-400 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
//             <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
//               <div className="flex items-center justify-between mb-6">
//                 <div>
//                   <h3 className="font-semibold text-gray-900">New Customers (YTD)</h3>
//                   <p className="text-sm text-gray-500 mt-1">Customer Acquisition Distribution</p>
//                 </div>
//                 <span className="text-gray-500 text-xs font-semibold tracking-wide">
//                   NEW
//                 </span>
//               </div>

//               <div className="flex flex-col md:flex-row items-center justify-center gap-8">
//                 {/* Pie Chart */}
//                 <div className="relative w-48 h-48">
//                   <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
//                     {/* Background circle */}
//                     <circle
//                       cx="100"
//                       cy="100"
//                       r="80"
//                       fill="none"
//                       stroke="#f3f4f6"
//                       strokeWidth="30"
//                     />

//                     {/* New Ordinary Customers Segment */}
//                     <circle
//                       cx="100"
//                       cy="100"
//                       r="80"
//                       fill="none"
//                       stroke="var(--ceb-maroon)"
//                       strokeWidth="30"
//                       strokeDasharray={`${(newOrdinaryPercentage / 100) * 502.4} 502.4`}
//                       strokeDashoffset="0"
//                       className="transition-all duration-1000 ease-out"
//                       onMouseEnter={() => setActivePieChart('newOrdinary')}
//                       onMouseLeave={() => setActivePieChart(null)}
//                     />

//                     {/* New Bulk Customers Segment */}
//                     <circle
//                       cx="100"
//                       cy="100"
//                       r="80"
//                       fill="none"
//                       stroke="var(--ceb-gold)"
//                       strokeWidth="30"
//                       strokeDasharray={`${(newBulkPercentage / 100) * 502.4} 502.4`}
//                       strokeDashoffset={-((newOrdinaryPercentage / 100) * 502.4)}
//                       className="transition-all duration-1000 ease-out"
//                       onMouseEnter={() => setActivePieChart('newBulk')}
//                       onMouseLeave={() => setActivePieChart(null)}
//                     />
//                   </svg>

//                   {/* Center text */}
//                   <div className="absolute inset-0 flex items-center justify-center">
//                     <div className="text-center">
//                       <p className="text-2xl font-bold text-gray-900">{formatNumber(totalNewCustomers)}</p>
//                       <p className="text-xs text-gray-500">Total New</p>
//                     </div>
//                   </div>
//                 </div>

//                 {/* Legend */}
//                 <div className="space-y-3">
//                   <div 
//                     className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${activePieChart === 'newOrdinary' ? 'bg-[color:var(--ceb-maroon)]/5' : ''}`}
//                     onMouseEnter={() => setActivePieChart('newOrdinary')}
//                     onMouseLeave={() => setActivePieChart(null)}
//                   >
//                     <div className="w-4 h-4 bg-[color:var(--ceb-maroon)] rounded-full"></div>
//                     <div>
//                       <p className="text-sm font-medium text-gray-900">New Ordinary</p>
//                       <p className="text-xs text-gray-500">{formatNumber(totalNewOrdinary)} ({newOrdinaryPercentage.toFixed(1)}%)</p>
//                     </div>
//                   </div>

//                   <div 
//                     className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${activePieChart === 'newBulk' ? 'bg-[color:var(--ceb-gold)]/15' : ''}`}
//                     onMouseEnter={() => setActivePieChart('newBulk')}
//                     onMouseLeave={() => setActivePieChart(null)}
//                   >
//                     <div className="w-4 h-4 bg-[color:var(--ceb-gold)] rounded-full"></div>
//                     <div>
//                       <p className="text-sm font-medium text-gray-900">New Bulk</p>
//                       <p className="text-xs text-gray-500">{formatNumber(totalNewBulk)} ({newBulkPercentage.toFixed(1)}%)</p>
//                     </div>
//                   </div>
//                 </div>
//               </div>

//               {/* Monthly Average */}
//               <div className="mt-6 pt-4 border-t border-gray-100">
//                 <p className="text-xs text-gray-500 mb-2">Monthly Average New Customers</p>
//                 <div className="grid grid-cols-2 gap-4">
//                   <div>
//                     <p className="text-xs text-gray-500">Ordinary</p>
//                     <p className="text-sm font-semibold text-gray-900">
//                       {Math.round(totalNewOrdinary / 6)} / month
//                     </p>
//                   </div>
//                   <div>
//                     <p className="text-xs text-gray-500">Bulk</p>
//                     <p className="text-sm font-semibold text-gray-900">
//                       {Math.round(totalNewBulk / 6)} / month
//                     </p>
//                   </div>
//                 </div>
//               </div>

//               {/* Growth Indicator */}
//               <div className="mt-4 flex items-center justify-center gap-4 text-xs">
//                 <span className="flex items-center gap-1 text-green-600">
//                   <ArrowUp className="w-3 h-3" />
//                   +12% vs last year
//                 </span>
//                 <span className="text-gray-300">|</span>
//                 <span className="text-gray-500">Target: 500/month</span>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Rest of the dashboard remains the same */}
//         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//           {/* Left Column - Customer Analysis */}
//           <div className={`lg:col-span-1 space-y-6 transition-all duration-1000 delay-500 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
//             {/* Top Customers */}
//             <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
//               <div className="flex items-center justify-between mb-4">
//                 <h3 className="font-semibold text-gray-900">Top Customers</h3>
//                 <span className="text-xs text-gray-500">Current Month</span>
//               </div>
//               <div className="space-y-4">
//                 {topCustomers.map((customer, index) => (
//                   <div key={index} className="flex items-center justify-between">
//                     <div className="flex items-center gap-3">
//                       <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[color:var(--ceb-maroon)] to-[color:var(--ceb-maroon-2)] flex items-center justify-center text-white font-medium text-sm">
//                         {customer.name.charAt(0)}
//                       </div>
//                       <div>
//                         <p className="text-sm font-medium text-gray-900">{customer.name}</p>
//                         <p className="text-xs text-gray-500">{customer.type}</p>
//                       </div>
//                     </div>
//                     <div className="text-right">
//                       <p className="text-sm font-semibold text-gray-900">{formatNumber(customer.consumption)}</p>
//                       <p className="text-xs text-gray-500">kWh</p>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//               <button className="mt-4 w-full text-center text-sm text-[color:var(--ceb-maroon)] hover:text-[color:var(--ceb-maroon-2)] font-medium">
//                 View All Customers →
//               </button>
//             </div>

//             {/* Solar Capacity */}
//             <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
//               <div className="flex items-center justify-between mb-4">
//                 <div>
//                   <h3 className="font-semibold text-gray-900">Solar Capacity (Last Month)</h3>
//                   <p className="text-xs text-gray-500 mt-1">Capacity (kW) and account count by net type</p>
//                 </div>
//                 <span className="text-[color:var(--ceb-navy)] text-xs font-semibold tracking-wide">
//                   GRAPH
//                 </span>
//               </div>

//               <div className="h-56">
//                 <ResponsiveContainer width="100%" height="100%">
//                   <BarChart data={solarCapacityChartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
//                     <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
//                     <XAxis
//                       dataKey="netType"
//                       tick={{ fontSize: 11 }}
//                       interval={0}
//                       tickMargin={8}
//                     />
//                     <YAxis
//                       yAxisId="kw"
//                       tick={{ fontSize: 11 }}
//                       tickFormatter={(v) => formatCompact(Number(v))}
//                       width={44}
//                     />
//                     <YAxis
//                       yAxisId="count"
//                       orientation="right"
//                       tick={{ fontSize: 11 }}
//                       tickFormatter={(v) => formatCompact(Number(v))}
//                       width={44}
//                     />
//                     <Tooltip
//                       formatter={(value: any, name: any) => {
//                         const n = Number(value) || 0;
//                         if (name === "Capacity (kW)") return [formatKW(n), name];
//                         if (name === "Accounts") return [formatInteger(n), name];
//                         return [String(value), String(name)];
//                       }}
//                       labelStyle={{ fontWeight: 600 }}
//                     />
//                     <Legend />
//                     <Bar
//                       yAxisId="kw"
//                       dataKey="capacity"
//                       name="Capacity (kW)"
//                       fill="var(--ceb-maroon)"
//                       radius={[6, 6, 0, 0]}
//                     >
//                       <LabelList dataKey="capacity" position="top" formatter={(v: any) => formatCompact(Number(v) || 0)} />
//                     </Bar>
//                     <Bar
//                       yAxisId="count"
//                       dataKey="count"
//                       name="Accounts"
//                       fill="var(--ceb-gold)"
//                       radius={[6, 6, 0, 0]}
//                     >
//                       <LabelList dataKey="count" position="top" formatter={(v: any) => formatCompact(Number(v) || 0)} />
//                     </Bar>
//                   </BarChart>
//                 </ResponsiveContainer>
//               </div>
//             </div>
//           </div>

//           {/* Center Column */}
//           <div className={`lg:col-span-1 space-y-6 transition-all duration-1000 delay-600 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
//             {/* Target vs Actual by Region */}
//             <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
//               <div className="flex items-center justify-between mb-4">
//                 <h3 className="font-semibold text-gray-900">Target vs Actual by Region</h3>
//                 <Target className="w-4 h-4 text-gray-400" />
//               </div>

//               <div className="space-y-4">
//                 {['West', 'Central', 'East', 'South', 'North'].map((region, index) => (
//                   <div key={region}>
//                     <div className="flex justify-between text-sm mb-1">
//                       <span className="text-gray-600">{region}</span>
//                       <span className="font-medium">
//                         <span className="text-green-600">{85 - index * 5}%</span>
//                         <span className="text-gray-400 mx-1">/</span>
//                         <span className="text-gray-500">100%</span>
//                       </span>
//                     </div>
//                     <div className="w-full bg-gray-200 rounded-full h-2">
//                       <div 
//                         className={`h-2 rounded-full ${
//                           index === 0 ? 'bg-blue-600' :
//                           index === 1 ? 'bg-green-600' :
//                           index === 2 ? 'bg-yellow-600' :
//                           index === 3 ? 'bg-orange-600' : 'bg-purple-600'
//                         }`}
//                         style={{ width: `${85 - index * 5}%` }}
//                       ></div>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             </div>

//             {/* Solar Customers Split */}
//             <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
//               <div className="flex items-center justify-between mb-4">
//                 <div>
//                   <h3 className="font-semibold text-gray-900">Solar Customers by Net Type</h3>
//                   <p className="text-xs text-gray-500 mt-1">Ordinary vs Bulk accounts</p>
//                 </div>
//                 <span className="text-[color:var(--ceb-navy)] text-xs font-semibold tracking-wide">GRAPH</span>
//               </div>

//               <div className="h-56">
//                 <ResponsiveContainer width="100%" height="100%">
//                   <BarChart data={solarCustomerSplitChartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
//                     <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
//                     <XAxis
//                       dataKey="netType"
//                       tick={{ fontSize: 11 }}
//                       interval={0}
//                       tickMargin={8}
//                     />
//                     <YAxis
//                       tick={{ fontSize: 11 }}
//                       tickFormatter={(v) => formatInteger(Number(v))}
//                       width={44}
//                     />
//                     <Tooltip
//                       formatter={(value: any, name: any) => [formatInteger(Number(value) || 0), String(name)]}
//                       labelStyle={{ fontWeight: 600 }}
//                     />
//                     <Legend />
//                     <Bar dataKey="ordinary" name="Ordinary" fill="var(--ceb-maroon)" radius={[6, 6, 0, 0]}>
//                       <LabelList dataKey="ordinary" position="top" formatter={(v: any) => formatInteger(Number(v) || 0)} />
//                     </Bar>
//                     <Bar dataKey="bulk" name="Bulk" fill="var(--ceb-gold)" radius={[6, 6, 0, 0]}>
//                       <LabelList dataKey="bulk" position="top" formatter={(v: any) => formatInteger(Number(v) || 0)} />
//                     </Bar>
//                   </BarChart>
//                 </ResponsiveContainer>
//               </div>
//             </div>
//           </div>

//           {/* Right Column - Additional Metrics */}
//           <div className={`lg:col-span-1 space-y-6 transition-all duration-1000 delay-700 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
//             <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
//               <h3 className="font-semibold text-gray-900 mb-3">Customer Segments</h3>
//               <div className="space-y-2">
//                 <div className="flex justify-between text-sm">
//                   <span>Ordinary</span>
//                   <span className="font-medium">{formatNumber(customerCounts.ordinary)}</span>
//                 </div>
//                 <div className="flex justify-between text-sm">
//                   <span>Bulk</span>
//                   <span className="font-medium">{formatNumber(customerCounts.bulk)}</span>
//                 </div>
//                 <div className="flex justify-between text-sm">
//                   <span>Solar</span>
//                   <span className="font-medium">{formatNumber(
//                     customerCounts.solar.netMetering + 
//                     customerCounts.solar.netAccounting + 
//                     customerCounts.solar.netPlus + 
//                     customerCounts.solar.netPlusPlus
//                   )}</span>
//                 </div>
//               </div>
//             </div>

//             <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
//               <h3 className="font-semibold text-gray-900 mb-3">Quick Actions</h3>
//               <div className="space-y-2">
//                 <button className="w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
//                   Generate Monthly Report
//                 </button>
//                 <button className="w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
//                   Export Dashboard Data
//                 </button>
//                 <button className="w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
//                   View Solar Capacity Graph
//                 </button>
//               </div>
//             </div>

//             {/* Profit Margin */}
//             <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
//               <div className="text-center">
//                 <p className="text-sm text-gray-500 mb-2">Profit Margin</p>
//                 <p className="text-4xl font-bold text-gray-900 mb-2">15.34%</p>
//                 <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
//                   <div className="bg-green-500 h-3 rounded-full" style={{ width: '15.34%' }}></div>
//                 </div>
//                 <p className="text-sm text-gray-600">Sales Target Achievement: <span className="font-semibold text-[color:var(--ceb-maroon)]">52.21%</span></p>
//               </div>
//             </div>

//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Home;



import React, { useEffect, useState } from "react";
import { useUser } from "../contexts/UserContext";
import {
  Users,
  Zap,
  DollarSign,
  Target,
  PieChart,
  Sun,
  ArrowUp,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
} from "recharts";

interface CustomerCounts {
  ordinary: number;
  bulk: number;
  solar: {
    netMetering: number;
    netAccounting: number;
    netPlus: number;
    netPlusPlus: number;
  };
  zeroConsumption: number;
}

interface TopCustomer {
  name: string;
  consumption: number;
  type: string;
}

interface SalesData {
  ordinary: { charge: number; units: number };
  bulk: { charge: number; units: number };
  kioskCollection: number;
}

interface MonthlySalesData {
  month: string;
  ordinary: number;
  bulk: number;
  target: number;
}

interface MonthlyNewCustomers {
  month: string;
  ordinary: number;
  bulk: number;
}

interface SalesCollectionRecord {
  BillCycle: number;
  Collection: number;
  Sales: number;
  ErrorMessage: string;
}

interface SalesCollectionApiResponse {
  data: {
    maxBillCycle: number;
    records: SalesCollectionRecord[];
  };
  errorMessage: string | null;
}

const Home: React.FC = () => {
  useUser();
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedYear, setSelectedYear] = useState("2023");
  const [selectedMonth, setSelectedMonth] = useState("All");
  const [activePieChart, setActivePieChart] = useState<string | null>(null);

const [customerCounts, setCustomerCounts] = useState<CustomerCounts>({
  ordinary: 45231,      // still mock
  bulk: 0,              // ← will be fetched
  solar: {
    netMetering: 567,
    netAccounting: 234,
    netPlus: 189,
    netPlusPlus: 76
  },
  zeroConsumption: 1234
});
const [customerCountsLoading, setCustomerCountsLoading] = useState(true);
const [customerCountsError, setCustomerCountsError] = useState<string | null>(null);


  useEffect(() => {
  const fetchActiveCustomerCount = async () => {
    setCustomerCountsLoading(true);
    setCustomerCountsError(null);
    try {
      const response = await fetch("/api/dashboard/customers/active-count", {
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        let errorMsg = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.errorMessage) errorMsg = errorData.errorMessage;
        } catch {
          errorMsg = response.statusText;
        }
        throw new Error(errorMsg);
      }

      const json = await response.json();
      // Response shape: { data: { activeCustomerCount: number }, errorMessage: null }
      const activeCount: number = json?.data?.activeCustomerCount ?? 0;

      setCustomerCounts((prev) => ({
  ...prev,
  bulk: activeCount,   // ← was ordinary, now bulk
}));
    } catch (err: any) {
      console.error("Error fetching active customer count:", err);
      setCustomerCountsError(err.message || "Failed to load customer count.");
    } finally {
      setCustomerCountsLoading(false);
    }
  };

  fetchActiveCustomerCount();
}, []);

  const [topCustomers] = useState<TopCustomer[]>([
    { name: "John Doe", consumption: 45231, type: "Bulk" },
    { name: "Jane Smith", consumption: 38456, type: "Bulk" },
    { name: "Michael Brown", consumption: 35678, type: "Ordinary" },
    { name: "Emily Davis", consumption: 32456, type: "Ordinary" },
    { name: "Robert Johnson", consumption: 29876, type: "Bulk" }
  ]);

  const [salesData] = useState<SalesData>({
    ordinary: { charge: 2456789, units: 1234567 },
    bulk: { charge: 5678901, units: 2345678 },
    kioskCollection: 456789
  });

  // Monthly Sales & Collection Data - fetched from API
const [monthlySalesData, setMonthlySalesData] = useState<MonthlySalesData[]>([]);
const [salesCollectionLoading, setSalesCollectionLoading] = useState(true);
const [salesCollectionError, setSalesCollectionError] = useState<string | null>(null);

useEffect(() => {
  const fetchSalesCollection = async () => {
    setSalesCollectionLoading(true);
    setSalesCollectionError(null);
    try {
      // Fetch both ordinary and bulk in parallel
      const [ordinaryRes, bulkRes] = await Promise.all([
        fetch("/api/dashboard/salesCollection/range/ordinary", {
          headers: { Accept: "application/json" },
        }),
        fetch("/api/dashboard/salesCollection/range/bulk", {
          headers: { Accept: "application/json" },
        }),
      ]);

      if (!ordinaryRes.ok) throw new Error(`Ordinary fetch failed: ${ordinaryRes.status}`);
      if (!bulkRes.ok) throw new Error(`Bulk fetch failed: ${bulkRes.status}`);

      const ordinaryJson: SalesCollectionApiResponse = await ordinaryRes.json();
      const bulkJson: SalesCollectionApiResponse = await bulkRes.json();

      const ordinaryRecords = ordinaryJson.data.records;
      const bulkRecords = bulkJson.data.records;

      // Both arrays are aligned by index (same BillCycles), so zip them together
      const merged: MonthlySalesData[] = ordinaryRecords.map((rec, i) => ({
        month: `BC ${rec.BillCycle}`,        // label shown on X-axis
        ordinary: rec.Sales,
        bulk: bulkRecords[i]?.Sales ?? 0,
        target: 0,                           // still mock — replace when target API is ready
      }));

      setMonthlySalesData(merged);
    } catch (err: any) {
      console.error("Error fetching sales/collection data:", err);
      setSalesCollectionError(err.message || "Failed to load sales data.");
    } finally {
      setSalesCollectionLoading(false);
    }
  };

  fetchSalesCollection();
}, []);

  // Monthly New Customers Data
  const [monthlyNewCustomers] = useState<MonthlyNewCustomers[]>([
    { month: 'Jan', ordinary: 210, bulk: 38 },
    { month: 'Feb', ordinary: 225, bulk: 42 },
    { month: 'Mar', ordinary: 234, bulk: 45 },
    { month: 'Apr', ordinary: 218, bulk: 40 },
    { month: 'May', ordinary: 242, bulk: 48 },
    { month: 'Jun', ordinary: 238, bulk: 44 }
  ]);

  const [solarCapacity] = useState({
    netMetering: { count: 567, capacity: 2345 },
    netAccounting: { count: 234, capacity: 1234 },
    netPlus: { count: 189, capacity: 890 },
    netPlusPlus: { count: 76, capacity: 345 }
  });

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Calculate totals for Sales
  const totalSales = monthlySalesData.reduce(
    (sum, d) => sum + d.ordinary + d.bulk,
    0
  );
  const totalOrdinarySales = monthlySalesData.reduce(
    (sum, d) => sum + d.ordinary,
    0
  );
  const totalBulkSales = monthlySalesData.reduce(
    (sum, d) => sum + d.bulk,
    0
  );

  // Calculate pie chart segments for New Customers
  const totalNewCustomers = monthlyNewCustomers.reduce((sum, d) => sum + d.ordinary + d.bulk, 0);
  const totalNewOrdinary = monthlyNewCustomers.reduce((sum, d) => sum + d.ordinary, 0);
  const totalNewBulk = monthlyNewCustomers.reduce((sum, d) => sum + d.bulk, 0);

  const newOrdinaryPercentage = (totalNewOrdinary / totalNewCustomers) * 100;
  const newBulkPercentage = (totalNewBulk / totalNewCustomers) * 100;

  // Sales & Collection Distribution bar chart data
  const salesBarData = monthlySalesData.map(item => ({
    month: item.month,
    ordinary: item.ordinary,
    bulk: item.bulk,
    total: item.ordinary + item.bulk
  }));

  const solarCapacityChartData = [
    {
      netType: "Net Metering",
      capacity: solarCapacity.netMetering.capacity,
      count: solarCapacity.netMetering.count,
    },
    {
      netType: "Net Accounting",
      capacity: solarCapacity.netAccounting.capacity,
      count: solarCapacity.netAccounting.count,
    },
    {
      netType: "Net Plus",
      capacity: solarCapacity.netPlus.capacity,
      count: solarCapacity.netPlus.count,
    },
    {
      netType: "Net Plus Plus",
      capacity: solarCapacity.netPlusPlus.capacity,
      count: solarCapacity.netPlusPlus.count,
    },
  ];

  const solarCustomerSplitChartData = [
    {
      netType: "Net Metering",
      ordinary: Math.round(customerCounts.solar.netMetering * 0.72),
      bulk: customerCounts.solar.netMetering - Math.round(customerCounts.solar.netMetering * 0.72),
    },
    {
      netType: "Net Accounting",
      ordinary: Math.round(customerCounts.solar.netAccounting * 0.68),
      bulk: customerCounts.solar.netAccounting - Math.round(customerCounts.solar.netAccounting * 0.68),
    },
    {
      netType: "Net Plus",
      ordinary: Math.round(customerCounts.solar.netPlus * 0.64),
      bulk: customerCounts.solar.netPlus - Math.round(customerCounts.solar.netPlus * 0.64),
    },
    {
      netType: "Net Plus Plus",
      ordinary: Math.round(customerCounts.solar.netPlusPlus * 0.6),
      bulk: customerCounts.solar.netPlusPlus - Math.round(customerCounts.solar.netPlusPlus * 0.6),
    },
  ];

  const formatCompact = (n: number) =>
    new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(n);

  const formatInteger = (n: number) =>
    new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 0,
    }).format(n);

  const formatKW = (n: number) => `${formatCompact(n)} kW`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Filters */}
      <div className={`bg-white border-b border-gray-200 sticky top-0 z-10 transition-all duration-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                <button className="px-3 py-1.5 text-sm font-medium rounded-md bg-white shadow-sm">All Regions</button>
                <button className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-white/50 rounded-md">Central</button>
                <button className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-white/50 rounded-md">West</button>
                <button className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-white/50 rounded-md">East</button>
              </div>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ceb-maroon)]"
              >
                <option>2024</option>
                <option>2023</option>
                <option>2022</option>
              </select>

              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ceb-maroon)]"
              >
                <option>All Months</option>
                <option>January</option>
                <option>February</option>
                <option>March</option>
                <option>April</option>
                <option>May</option>
                <option>June</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* KPI Cards - Top Row */}
        <div className={`grid grid-cols-1 md:grid-cols-4 gap-6 mb-6 transition-all duration-1000 delay-200 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">+5.2%</span>
            </div>
            <h3 className="text-sm font-medium text-gray-500">Total Customers</h3>
            <p className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(customerCounts.ordinary + customerCounts.bulk)}</p>
            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
              <span>Ordinary: {formatNumber(customerCounts.ordinary)}</span>
              <span>Bulk: {formatNumber(customerCounts.bulk)}</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Sun className="w-5 h-5 text-yellow-600" />
              </div>
              <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">+12.3%</span>
            </div>
            <h3 className="text-sm font-medium text-gray-500">Solar Customers</h3>
            <p className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(
              customerCounts.solar.netMetering +
              customerCounts.solar.netAccounting +
              customerCounts.solar.netPlus +
              customerCounts.solar.netPlusPlus
            )}</p>
            <p className="text-xs text-gray-500 mt-2">Net-type breakdown shown in chart</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-red-100 rounded-lg">
                <Zap className="w-5 h-5 text-red-600" />
              </div>
              <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">-2.1%</span>
            </div>
            <h3 className="text-sm font-medium text-gray-500">Zero Consumption</h3>
            <p className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(customerCounts.zeroConsumption)}</p>
            <p className="text-xs text-gray-500 mt-2">Last 3 months</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">+8.7%</span>
            </div>
            <h3 className="text-sm font-medium text-gray-500">Kiosk Collection</h3>
            <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(salesData.kioskCollection)}</p>
            <p className="text-xs text-gray-500 mt-2">This month</p>
          </div>
        </div>

        {/* Two Column Layout - Bar Chart for Sales & Collection */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Sales & Collection Bar Chart */}
          <div className={`transition-all duration-1000 delay-300 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-semibold text-gray-900">Sales & Collection Distribution</h3>
                  <p className="text-sm text-gray-500 mt-1">Monthly Sales by Customer Type</p>
                </div>
                <PieChart className="w-5 h-5 text-gray-400" />
              </div>

              {/* Bar Chart */}
              <div className="h-64 mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesBarData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => formatCompact(value)}
                    />
                    <Tooltip
                      formatter={(value: any) => formatCurrency(Number(value))}
                      labelStyle={{ fontWeight: 600 }}
                    />
                    <Legend />
                    <Bar dataKey="ordinary" name="Ordinary" fill="var(--ceb-maroon)" radius={[4, 4, 0, 0]}>
                      <LabelList dataKey="ordinary" position="top" formatter={(v: any) => formatCompact(Number(v))} />
                    </Bar>
                    <Bar dataKey="bulk" name="Bulk" fill="var(--ceb-gold)" radius={[4, 4, 0, 0]}>
                      <LabelList dataKey="bulk" position="top" formatter={(v: any) => formatCompact(Number(v))} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Monthly Breakdown */}
              <div className="mt-6 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-2">Monthly Average</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Ordinary</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatCurrency(totalOrdinarySales / 12)} / month
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Bulk</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatCurrency(totalBulkSales / 12)} / month
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* New Customers Pie Chart */}
          <div className={`transition-all duration-1000 delay-400 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-semibold text-gray-900">New Customers (YTD)</h3>
                  <p className="text-sm text-gray-500 mt-1">Customer Acquisition Distribution</p>
                </div>
                <span className="text-gray-500 text-xs font-semibold tracking-wide">
                  NEW
                </span>
              </div>

              <div className="flex flex-col md:flex-row items-center justify-center gap-8">
                {/* Pie Chart */}
                <div className="relative w-48 h-48">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                    {/* Background circle */}
                    <circle
                      cx="100"
                      cy="100"
                      r="80"
                      fill="none"
                      stroke="#f3f4f6"
                      strokeWidth="30"
                    />

                    {/* New Ordinary Customers Segment */}
                    <circle
                      cx="100"
                      cy="100"
                      r="80"
                      fill="none"
                      stroke="var(--ceb-maroon)"
                      strokeWidth="30"
                      strokeDasharray={`${(newOrdinaryPercentage / 100) * 502.4} 502.4`}
                      strokeDashoffset="0"
                      className="transition-all duration-1000 ease-out"
                      onMouseEnter={() => setActivePieChart('newOrdinary')}
                      onMouseLeave={() => setActivePieChart(null)}
                    />

                    {/* New Bulk Customers Segment */}
                    <circle
                      cx="100"
                      cy="100"
                      r="80"
                      fill="none"
                      stroke="var(--ceb-gold)"
                      strokeWidth="30"
                      strokeDasharray={`${(newBulkPercentage / 100) * 502.4} 502.4`}
                      strokeDashoffset={-((newOrdinaryPercentage / 100) * 502.4)}
                      className="transition-all duration-1000 ease-out"
                      onMouseEnter={() => setActivePieChart('newBulk')}
                      onMouseLeave={() => setActivePieChart(null)}
                    />
                  </svg>

                  {/* Center text */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{formatNumber(totalNewCustomers)}</p>
                      <p className="text-xs text-gray-500">Total New</p>
                    </div>
                  </div>
                </div>

                {/* Legend */}
                <div className="space-y-3">
                  <div
                    className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${activePieChart === 'newOrdinary' ? 'bg-[color:var(--ceb-maroon)]/5' : ''}`}
                    onMouseEnter={() => setActivePieChart('newOrdinary')}
                    onMouseLeave={() => setActivePieChart(null)}
                  >
                    <div className="w-4 h-4 bg-[color:var(--ceb-maroon)] rounded-full"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">New Ordinary</p>
                      <p className="text-xs text-gray-500">{formatNumber(totalNewOrdinary)} ({newOrdinaryPercentage.toFixed(1)}%)</p>
                    </div>
                  </div>

                  <div
                    className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${activePieChart === 'newBulk' ? 'bg-[color:var(--ceb-gold)]/15' : ''}`}
                    onMouseEnter={() => setActivePieChart('newBulk')}
                    onMouseLeave={() => setActivePieChart(null)}
                  >
                    <div className="w-4 h-4 bg-[color:var(--ceb-gold)] rounded-full"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">New Bulk</p>
                      <p className="text-xs text-gray-500">{formatNumber(totalNewBulk)} ({newBulkPercentage.toFixed(1)}%)</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Monthly Average */}
              <div className="mt-6 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-2">Monthly Average New Customers</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Ordinary</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {Math.round(totalNewOrdinary / 6)} / month
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Bulk</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {Math.round(totalNewBulk / 6)} / month
                    </p>
                  </div>
                </div>
              </div>

              {/* Growth Indicator */}
              <div className="mt-4 flex items-center justify-center gap-4 text-xs">
                <span className="flex items-center gap-1 text-green-600">
                  <ArrowUp className="w-3 h-3" />
                  +12% vs last year
                </span>
                <span className="text-gray-300">|</span>
                <span className="text-gray-500">Target: 500/month</span>
              </div>
            </div>
          </div>
        </div>

        {/* Rest of the dashboard remains the same */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Customer Analysis */}
          <div className={`lg:col-span-1 space-y-6 transition-all duration-1000 delay-500 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {/* Top Customers */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Top Customers</h3>
                <span className="text-xs text-gray-500">Current Month</span>
              </div>
              <div className="space-y-4">
                {topCustomers.map((customer, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[color:var(--ceb-maroon)] to-[color:var(--ceb-maroon-2)] flex items-center justify-center text-white font-medium text-sm">
                        {customer.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{customer.name}</p>
                        <p className="text-xs text-gray-500">{customer.type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">{formatNumber(customer.consumption)}</p>
                      <p className="text-xs text-gray-500">kWh</p>
                    </div>
                  </div>
                ))}
              </div>
              <button className="mt-4 w-full text-center text-sm text-[color:var(--ceb-maroon)] hover:text-[color:var(--ceb-maroon-2)] font-medium">
                View All Customers →
              </button>
            </div>

            {/* Solar Capacity */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">Solar Capacity (Last Month)</h3>
                  <p className="text-xs text-gray-500 mt-1">Capacity (kW) and account count by net type</p>
                </div>
                <span className="text-[color:var(--ceb-navy)] text-xs font-semibold tracking-wide">
                  GRAPH
                </span>
              </div>

              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={solarCapacityChartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                    <XAxis
                      dataKey="netType"
                      tick={{ fontSize: 11 }}
                      interval={0}
                      tickMargin={8}
                    />
                    <YAxis
                      yAxisId="kw"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => formatCompact(Number(v))}
                      width={44}
                    />
                    <YAxis
                      yAxisId="count"
                      orientation="right"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => formatCompact(Number(v))}
                      width={44}
                    />
                    <Tooltip
                      formatter={(value: any, name: any) => {
                        const n = Number(value) || 0;
                        if (name === "Capacity (kW)") return [formatKW(n), name];
                        if (name === "Accounts") return [formatInteger(n), name];
                        return [String(value), String(name)];
                      }}
                      labelStyle={{ fontWeight: 600 }}
                    />
                    <Legend />
                    <Bar
                      yAxisId="kw"
                      dataKey="capacity"
                      name="Capacity (kW)"
                      fill="var(--ceb-maroon)"
                      radius={[6, 6, 0, 0]}
                    >
                      <LabelList dataKey="capacity" position="top" formatter={(v: any) => formatCompact(Number(v) || 0)} />
                    </Bar>
                    <Bar
                      yAxisId="count"
                      dataKey="count"
                      name="Accounts"
                      fill="var(--ceb-gold)"
                      radius={[6, 6, 0, 0]}
                    >
                      <LabelList dataKey="count" position="top" formatter={(v: any) => formatCompact(Number(v) || 0)} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Center Column */}
          <div className={`lg:col-span-1 space-y-6 transition-all duration-1000 delay-600 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {/* Target vs Actual by Region */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Target vs Actual by Region</h3>
                <Target className="w-4 h-4 text-gray-400" />
              </div>

              <div className="space-y-4">
                {['West', 'Central', 'East', 'South', 'North'].map((region, index) => (
                  <div key={region}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{region}</span>
                      <span className="font-medium">
                        <span className="text-green-600">{85 - index * 5}%</span>
                        <span className="text-gray-400 mx-1">/</span>
                        <span className="text-gray-500">100%</span>
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${index === 0 ? 'bg-blue-600' :
                            index === 1 ? 'bg-green-600' :
                              index === 2 ? 'bg-yellow-600' :
                                index === 3 ? 'bg-orange-600' : 'bg-purple-600'
                          }`}
                        style={{ width: `${85 - index * 5}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Solar Customers Split */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">Solar Customers by Net Type</h3>
                  <p className="text-xs text-gray-500 mt-1">Ordinary vs Bulk accounts</p>
                </div>
                <span className="text-[color:var(--ceb-navy)] text-xs font-semibold tracking-wide">GRAPH</span>
              </div>

              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={solarCustomerSplitChartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                    <XAxis
                      dataKey="netType"
                      tick={{ fontSize: 11 }}
                      interval={0}
                      tickMargin={8}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => formatInteger(Number(v))}
                      width={44}
                    />
                    <Tooltip
                      formatter={(value: any, name: any) => [formatInteger(Number(value) || 0), String(name)]}
                      labelStyle={{ fontWeight: 600 }}
                    />
                    <Legend />
                    <Bar dataKey="ordinary" name="Ordinary" fill="var(--ceb-maroon)" radius={[6, 6, 0, 0]}>
                      <LabelList dataKey="ordinary" position="top" formatter={(v: any) => formatInteger(Number(v) || 0)} />
                    </Bar>
                    <Bar dataKey="bulk" name="Bulk" fill="var(--ceb-gold)" radius={[6, 6, 0, 0]}>
                      <LabelList dataKey="bulk" position="top" formatter={(v: any) => formatInteger(Number(v) || 0)} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Right Column - Additional Metrics */}
          <div className={`lg:col-span-1 space-y-6 transition-all duration-1000 delay-700 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Customer Segments</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Ordinary</span>
                  <span className="font-medium">{formatNumber(customerCounts.ordinary)}</span>
                </div>
                <div className="flex justify-between text-sm">
  <span>Bulk</span>
  <span className="font-medium">
    {customerCountsLoading
      ? "Loading..."
      : customerCountsError
      ? "—"
      : formatNumber(customerCounts.bulk)}
  </span>
</div>
                <div className="flex justify-between text-sm">
                  <span>Solar</span>
                  <span className="font-medium">{formatNumber(
                    customerCounts.solar.netMetering +
                    customerCounts.solar.netAccounting +
                    customerCounts.solar.netPlus +
                    customerCounts.solar.netPlusPlus
                  )}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <button className="w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                  Generate Monthly Report
                </button>
                <button className="w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                  Export Dashboard Data
                </button>
                <button className="w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                  View Solar Capacity Graph
                </button>
              </div>
            </div>

            {/* Profit Margin */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-2">Profit Margin</p>
                <p className="text-4xl font-bold text-gray-900 mb-2">15.34%</p>
                <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                  <div className="bg-green-500 h-3 rounded-full" style={{ width: '15.34%' }}></div>
                </div>
                <p className="text-sm text-gray-600">Sales Target Achievement: <span className="font-semibold text-[color:var(--ceb-maroon)]">52.21%</span></p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;