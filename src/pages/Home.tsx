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
  BarChart3,
  ShoppingCart,
  TrendingUp,
  FileText,
  Settings,
  Briefcase,
  HeadsetIcon,
  ChevronUp,
  Clock,
  AlertCircle,
  TrendingDown,
  Battery,
  Plug,
  Eye,
  EyeOff,
  Plus,
  X,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
} from "recharts";
import DashboardSelector from "../components/dashboard/DashboardSelector";

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
  const [activeDashboard, setActiveDashboard] = useState<string>("default");
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedYear, setSelectedYear] = useState("2023");
  const [selectedMonth, setSelectedMonth] = useState("All");
  const [activePieChart, setActivePieChart] = useState<string | null>(null);
  const [activeSolarPieChart, setActiveSolarPieChart] = useState<string | null>(null);
  const [showMoreCards, setShowMoreCards] = useState(false);
  const [visibleCards, setVisibleCards] = useState<string[]>(['totalCustomers', 'solarCustomers', 'zeroConsumption', 'kioskCollection']);
  
const [customerCounts, setCustomerCounts] = useState<CustomerCounts>({
  ordinary: 0,
  bulk: 1234,
  solar: {
    netMetering: 0,
    netAccounting: 0,
    netPlus: 0,
    netPlusPlus: 0
  },
  zeroConsumption: 1234
});
const [bulkSolarCustomers, setBulkSolarCustomers] = useState({
  netMetering: 0,
  netAccounting: 0,
  netPlus: 0,
  netPlusPlus: 0
});
const [activeBillCycle, setActiveBillCycle] = useState<string>("");
const [customerCountsLoading, setCustomerCountsLoading] = useState(true);
const [customerCountsError, setCustomerCountsError] = useState<string | null>(null);
const [solarLoading, setSolarLoading] = useState(true);
const [solarError, setSolarError] = useState<string | null>(null);

  // Dashboard card configuration - 11 cards total
  const cardConfig = [
    { id: 'totalCustomers', title: 'Total Customers', default: true, category: 'customer' },
    { id: 'solarCustomers', title: 'Solar Customers', default: true, category: 'solar' },
    { id: 'zeroConsumption', title: 'Zero Consumption', default: true, category: 'consumption' },
    { id: 'kioskCollection', title: 'Kiosk Collection', default: true, category: 'collection' },
    { id: 'revenueCollection', title: 'Revenue Collection', default: false, category: 'collection' },
    { id: 'disconnections', title: 'Disconnections', default: false, category: 'customer' },
    { id: 'arrearsPosition', title: 'Arrears Position', default: false, category: 'billing' },
    { id: 'solarCapacity', title: 'Solar Capacity (kW)', default: false, category: 'solar' },
    { id: 'consumptionAnalysis', title: 'Consumption (kWh)', default: false, category: 'consumption' },
    { id: 'billCycleStatus', title: 'Bill Cycle Status', default: false, category: 'billing' },
    { id: 'newConnections', title: 'New Connections', default: false, category: 'customer' },
  ];

  const toggleCardVisibility = (cardId: string) => {
    setVisibleCards(prev => 
      prev.includes(cardId) 
        ? prev.filter(id => id !== cardId)
        : [...prev, cardId]
    );
  };

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

useEffect(() => {
  const fetchOrdinaryCount = async () => {
    setCustomerCountsLoading(true);
    setCustomerCountsError(null);
    try {
      const response = await fetch(
        `/api/dashboard/ordinary-customers-summary?billCycle=0`,
        { headers: { Accept: "application/json" } }
      );
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
      const json = await response.json();
      const total: number = json?.data?.TotalCount ?? 0;
      const activeCycle: string = json?.data?.BillCycle ?? "";
      setCustomerCounts(prev => ({ ...prev, ordinary: total }));
      setActiveBillCycle(activeCycle);
    } catch (err: any) {
      setCustomerCountsError(err.message || "Failed to load ordinary customer count");
    } finally {
      setCustomerCountsLoading(false);
    }
  };
  fetchOrdinaryCount();
}, []);

// Fetch Ordinary Solar Customer Data for all net types
useEffect(() => {
  const fetchSolarCustomerData = async () => {
    setSolarLoading(true);
    setSolarError(null);
    try {
      // Fetch max bill cycle
      const maxCycleResponse = await fetch(
        `http://localhost:44381/api/dashboard/solar-ordinary-customers/billcycle/max`,
        { headers: { Accept: "application/json" } }
      );
      if (!maxCycleResponse.ok) throw new Error(`Failed to fetch max bill cycle`);
      const maxCycleJson = await maxCycleResponse.json();
      const billCycle: string = maxCycleJson?.data?.billCycle ?? "450";

      // Fetch counts for each net-type (1, 2, 3, 4)
      const [netType1Response, netType2Response, netType3Response, netType4Response] = await Promise.all([
        fetch(`http://localhost:44381/api/dashboard/solar-ordinary-customers/count/net-type-1`, 
          { headers: { Accept: "application/json" } }),
        fetch(`http://localhost:44381/api/dashboard/solar-ordinary-customers/count/net-type-2`, 
          { headers: { Accept: "application/json" } }),
        fetch(`http://localhost:44381/api/dashboard/solar-ordinary-customers/count/net-type-3`, 
          { headers: { Accept: "application/json" } }),
        fetch(`http://localhost:44381/api/dashboard/solar-ordinary-customers/count/net-type-4`, 
          { headers: { Accept: "application/json" } })
      ]);

      if (!netType1Response.ok || !netType2Response.ok || !netType3Response.ok || !netType4Response.ok) {
        throw new Error("Failed to fetch one or more net-type counts");
      }

      const netType1Data = await netType1Response.json();
      const netType2Data = await netType2Response.json();
      const netType3Data = await netType3Response.json();
      const netType4Data = await netType4Response.json();

      const netMetering = netType1Data?.data?.CustomersCount ?? 0;
      const netAccounting = netType2Data?.data?.CustomersCount ?? 0;
      const netPlus = netType3Data?.data?.CustomersCount ?? 0;
      const netPlusPlus = netType4Data?.data?.CustomersCount ?? 0;

      setCustomerCounts(prev => ({
        ...prev,
        solar: {
          netMetering,
          netAccounting,
          netPlus,
          netPlusPlus
        }
      }));
    } catch (err: any) {
      setSolarError(err.message || "Failed to load solar customer data");
      console.error("Solar data fetch error:", err);
    } finally {
      setSolarLoading(false);
    }
  };
  fetchSolarCustomerData();
}, []);

// Fetch Bulk Solar Customer Data for all net types
useEffect(() => {
  const fetchBulkSolarCustomerData = async () => {
    try {
      // Fetch counts for each net-type (1, 2, 3, 4)
      const [netType1Response, netType2Response, netType3Response, netType4Response] = await Promise.all([
        fetch(`http://localhost:44381/api/dashboard/solar-bulk-customers/count/net-type-1`, 
          { headers: { Accept: "application/json" } }),
        fetch(`http://localhost:44381/api/dashboard/solar-bulk-customers/count/net-type-2`, 
          { headers: { Accept: "application/json" } }),
        fetch(`http://localhost:44381/api/dashboard/solar-bulk-customers/count/net-type-3`, 
          { headers: { Accept: "application/json" } }),
        fetch(`http://localhost:44381/api/dashboard/solar-bulk-customers/count/net-type-4`, 
          { headers: { Accept: "application/json" } })
      ]);

      if (!netType1Response.ok || !netType2Response.ok || !netType3Response.ok || !netType4Response.ok) {
        throw new Error("Failed to fetch bulk solar net-type counts");
      }

      const netType1Data = await netType1Response.json();
      const netType2Data = await netType2Response.json();
      const netType3Data = await netType3Response.json();
      const netType4Data = await netType4Response.json();

      const netMetering = netType1Data?.data?.CustomersCount ?? 0;
      const netAccounting = netType2Data?.data?.CustomersCount ?? 0;
      const netPlus = netType3Data?.data?.CustomersCount ?? 0;
      const netPlusPlus = netType4Data?.data?.CustomersCount ?? 0;

      setBulkSolarCustomers({
        netMetering,
        netAccounting,
        netPlus,
        netPlusPlus
      });
    } catch (err: any) {
      console.error("Bulk solar data fetch error:", err);
    }
  };
  fetchBulkSolarCustomerData();
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

  // Calculate totals for Solar Customers pie charts
  const totalOrdinarySolar = customerCounts.solar.netMetering + 
                              customerCounts.solar.netAccounting + 
                              customerCounts.solar.netPlus + 
                              customerCounts.solar.netPlusPlus;
  
  const totalBulkSolar = bulkSolarCustomers.netMetering + 
                         bulkSolarCustomers.netAccounting + 
                         bulkSolarCustomers.netPlus + 
                         bulkSolarCustomers.netPlusPlus;

  // Calculate percentages for Ordinary Solar
  const ordSolarNetMeteringPct = totalOrdinarySolar > 0 ? (customerCounts.solar.netMetering / totalOrdinarySolar) * 100 : 0;
  const ordSolarNetAccountingPct = totalOrdinarySolar > 0 ? (customerCounts.solar.netAccounting / totalOrdinarySolar) * 100 : 0;
  const ordSolarNetPlusPct = totalOrdinarySolar > 0 ? (customerCounts.solar.netPlus / totalOrdinarySolar) * 100 : 0;
  const ordSolarNetPlusPlusPct = totalOrdinarySolar > 0 ? (customerCounts.solar.netPlusPlus / totalOrdinarySolar) * 100 : 0;

  // Calculate percentages for Bulk Solar
  const bulkSolarNetMeteringPct = totalBulkSolar > 0 ? (bulkSolarCustomers.netMetering / totalBulkSolar) * 100 : 0;
  const bulkSolarNetAccountingPct = totalBulkSolar > 0 ? (bulkSolarCustomers.netAccounting / totalBulkSolar) * 100 : 0;
  const bulkSolarNetPlusPct = totalBulkSolar > 0 ? (bulkSolarCustomers.netPlus / totalBulkSolar) * 100 : 0;
  const bulkSolarNetPlusPlusPct = totalBulkSolar > 0 ? (bulkSolarCustomers.netPlusPlus / totalBulkSolar) * 100 : 0;

  // Helper function to convert percentages to circle arc
  const createArcDasharray = (startPct: number, endPct: number) => {
    const circumference = 502.4;
    const startArc = (startPct / 100) * circumference;
    const endArc = ((endPct - startPct) / 100) * circumference;
    return `${endArc} ${circumference - endArc}`;
  };

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
      ordinary: customerCounts.solar.netMetering,
      bulk: bulkSolarCustomers.netMetering,
    },
    {
      netType: "Net Accounting",
      ordinary: customerCounts.solar.netAccounting,
      bulk: bulkSolarCustomers.netAccounting,
    },
    {
      netType: "Net Plus",
      ordinary: customerCounts.solar.netPlus,
      bulk: bulkSolarCustomers.netPlus,
    },
    {
      netType: "Net Plus Plus",
      ordinary: customerCounts.solar.netPlusPlus,
      bulk: bulkSolarCustomers.netPlusPlus,
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
      {/* Dashboard Selector Sidebar */}
      <div className="flex">
        <DashboardSelector 
          activeDashboard={activeDashboard} 
          onSelectDashboard={setActiveDashboard} 
        />

        {/* Main Content Area */}
        <div className="flex-1">
          {/* Default Dashboard Content */}
          {activeDashboard === "default" && (
            <>
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
                {/* KPI Cards - Customizable */}
                <div className={`transition-all duration-1000 delay-200 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                  {/* Default Cards Row */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-4">
                    {/* Total Customers Card */}
                    {visibleCards.includes('totalCustomers') && (
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
                    )}

                    {/* Solar Customers Card */}
                    {visibleCards.includes('solarCustomers') && (
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
                    )}

                    {/* Zero Consumption Card */}
                    {visibleCards.includes('zeroConsumption') && (
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
                    )}

                    {/* Kiosk Collection Card */}
                    {visibleCards.includes('kioskCollection') && (
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
                    )}
                  </div>

                  {/* Additional Cards */}
                  {(visibleCards.includes('revenueCollection') || visibleCards.includes('disconnections') || visibleCards.includes('arrearsPosition') || visibleCards.includes('solarCapacity') || visibleCards.includes('consumptionAnalysis') || visibleCards.includes('billCycleStatus') || visibleCards.includes('newConnections')) && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-4">
                      {/* Revenue Collection Card */}
                      {visibleCards.includes('revenueCollection') && (
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                          <div className="flex items-center justify-between mb-2">
                            <div className="p-2 bg-emerald-100 rounded-lg">
                              <ShoppingCart className="w-5 h-5 text-emerald-600" />
                            </div>
                            <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">+6.8%</span>
                          </div>
                          <h3 className="text-sm font-medium text-gray-500">Revenue Collection</h3>
                          <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(125600000)}</p>
                          <p className="text-xs text-gray-500 mt-2">Year to date</p>
                        </div>
                      )}

                      {/* Disconnections Card */}
                      {visibleCards.includes('disconnections') && (
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                          <div className="flex items-center justify-between mb-2">
                            <div className="p-2 bg-orange-100 rounded-lg">
                              <AlertCircle className="w-5 h-5 text-orange-600" />
                            </div>
                            <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">+15.2%</span>
                          </div>
                          <h3 className="text-sm font-medium text-gray-500">Disconnections</h3>
                          <p className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(2456)}</p>
                          <p className="text-xs text-gray-500 mt-2">Pending action</p>
                        </div>
                      )}

                      {/* Arrears Position Card */}
                      {visibleCards.includes('arrearsPosition') && (
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                          <div className="flex items-center justify-between mb-2">
                            <div className="p-2 bg-rose-100 rounded-lg">
                              <TrendingDown className="w-5 h-5 text-rose-600" />
                            </div>
                            <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">-3.4%</span>
                          </div>
                          <h3 className="text-sm font-medium text-gray-500">Arrears Position</h3>
                          <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(456780000)}</p>
                          <p className="text-xs text-gray-500 mt-2">Total outstanding</p>
                        </div>
                      )}

                      {/* Solar Capacity Card */}
                      {visibleCards.includes('solarCapacity') && (
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                          <div className="flex items-center justify-between mb-2">
                            <div className="p-2 bg-amber-100 rounded-lg">
                              <Battery className="w-5 h-5 text-amber-600" />
                            </div>
                            <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">+9.5%</span>
                          </div>
                          <h3 className="text-sm font-medium text-gray-500">Solar Capacity</h3>
                          <p className="text-2xl font-bold text-gray-900 mt-1">{formatCompact(4814)} kW</p>
                          <p className="text-xs text-gray-500 mt-2">Total installed</p>
                        </div>
                      )}

                      {/* Consumption Analysis Card */}
                      {visibleCards.includes('consumptionAnalysis') && (
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                          <div className="flex items-center justify-between mb-2">
                            <div className="p-2 bg-violet-100 rounded-lg">
                              <Plug className="w-5 h-5 text-violet-600" />
                            </div>
                            <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">+2.3%</span>
                          </div>
                          <h3 className="text-sm font-medium text-gray-500">Consumption (kWh)</h3>
                          <p className="text-2xl font-bold text-gray-900 mt-1">{formatCompact(3579000)}</p>
                          <p className="text-xs text-gray-500 mt-2">Monthly average</p>
                        </div>
                      )}

                      {/* Bill Cycle Status Card */}
                      {visibleCards.includes('billCycleStatus') && (
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                          <div className="flex items-center justify-between mb-2">
                            <div className="p-2 bg-cyan-100 rounded-lg">
                              <Clock className="w-5 h-5 text-cyan-600" />
                            </div>
                            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">Active</span>
                          </div>
                          <h3 className="text-sm font-medium text-gray-500">Bill Cycle Status</h3>
                          <p className="text-2xl font-bold text-gray-900 mt-1">{activeBillCycle || 'Cycle 450'}</p>
                          <p className="text-xs text-gray-500 mt-2">Current cycle</p>
                        </div>
                      )}

                      {/* New Connections Card */}
                      {visibleCards.includes('newConnections') && (
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                          <div className="flex items-center justify-between mb-2">
                            <div className="p-2 bg-lime-100 rounded-lg">
                              <Plus className="w-5 h-5 text-lime-600" />
                            </div>
                            <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">+11.3%</span>
                          </div>
                          <h3 className="text-sm font-medium text-gray-500">New Connections</h3>
                          <p className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(1428)}</p>
                          <p className="text-xs text-gray-500 mt-2">Year to date</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Show More / Customize Dashboard Button */}
                  <div className="flex justify-end mb-6">
                    <button
                      onClick={() => setShowMoreCards(!showMoreCards)}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      {showMoreCards ? (
                        <>
                          <EyeOff className="w-4 h-4" />
                          Hide Cards
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4" />
                          Show More Cards
                        </>
                      )}
                    </button>
                  </div>

                  {/* Card Selection Panel */}
                  {showMoreCards && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200 mb-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">Customize Your Dashboard</h3>
                          <p className="text-sm text-gray-600 mt-1">Select cards to display on your dashboard</p>
                        </div>
                        <button
                          onClick={() => setShowMoreCards(false)}
                          className="p-1 hover:bg-white rounded-lg transition-colors"
                        >
                          <X className="w-5 h-5 text-gray-600" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {cardConfig.map((card) => (
                          <div
                            key={card.id}
                            onClick={() => toggleCardVisibility(card.id)}
                            className={`p-4 rounded-lg cursor-pointer transition-all border-2 ${
                              visibleCards.includes(card.id)
                                ? 'bg-white border-blue-500 shadow-md'
                                : 'bg-white border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900 text-sm">{card.title}</p>
                                <p className="text-xs text-gray-500 mt-1 capitalize">{card.category}</p>
                              </div>
                              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                                visibleCards.includes(card.id)
                                  ? 'bg-blue-500 border-blue-500'
                                  : 'border-gray-300'
                              }`}>
                                {visibleCards.includes(card.id) && (
                                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

        {/* Two Column Layout - Bar Chart for Sales & Collection */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 auto-rows-fr">
          {/* Sales & Collection Bar Chart */}
          <div className={`transition-all duration-1000 delay-300 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-semibold text-gray-900">Sales & Collection Distribution</h3>
                  <p className="text-sm text-gray-500 mt-1">Monthly Sales by Customer Type</p>
                </div>
                <PieChart className="w-5 h-5 text-gray-400" />
              </div>

              {/* Line Chart */}
              <div className="h-64 mb-6 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={salesBarData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
                    <Line 
                      type="monotone" 
                      dataKey="ordinary" 
                      name="Ordinary" 
                      stroke="var(--ceb-maroon)" 
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 6, fill: "var(--ceb-maroon)" }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="bulk" 
                      name="Bulk" 
                      stroke="var(--ceb-gold)" 
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 6, fill: "var(--ceb-gold)" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Monthly Breakdown */}
              <div className="mt-auto pt-4 border-t border-gray-100">
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
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-full flex flex-col">
              <style>{`
                @keyframes pieChartLoadOrdinary {
                  0% {
                    stroke-dasharray: 0 502.4;
                    stroke-dashoffset: 0;
                  }
                  100% {
                    stroke-dasharray: ${(newOrdinaryPercentage / 100) * 502.4} 502.4;
                    stroke-dashoffset: 0;
                  }
                }
                
                @keyframes pieChartLoadBulk {
                  0% {
                    stroke-dasharray: 0 502.4;
                    stroke-dashoffset: ${-((newOrdinaryPercentage / 100) * 502.4)};
                  }
                  100% {
                    stroke-dasharray: ${(newBulkPercentage / 100) * 502.4} 502.4;
                    stroke-dashoffset: ${-((newOrdinaryPercentage / 100) * 502.4)};
                  }
                }
                
                @keyframes spinLoader {
                  0% {
                    transform: rotate(0deg);
                  }
                  100% {
                    transform: rotate(360deg);
                  }
                }
                
                .pie-segment-ordinary {
                  animation: pieChartLoadOrdinary 0.9s ease-out forwards;
                  animation-delay: 0.3s;
                }
                
                .pie-segment-bulk {
                  animation: pieChartLoadBulk 0.9s ease-out forwards;
                  animation-delay: 1.2s;
                }
                
                .loading-pie {
                  animation: spinLoader 3s linear infinite;
                  animation-play-state: running;
                }
              `}</style>
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
                      strokeDasharray="0 502.4"
                      strokeDashoffset="0"
                      className="pie-segment-ordinary transition-all duration-1000 ease-out"
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
                      strokeDasharray="0 502.4"
                      strokeDashoffset={-((newOrdinaryPercentage / 100) * 502.4)}
                      className="pie-segment-bulk transition-all duration-1000 ease-out"
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
              <div className="mt-auto pt-4 border-t border-gray-100">
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
              <div className="mt-auto flex items-center justify-center gap-4 text-xs">
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

            {/* Solar Customers by Net Type - Two Pie Charts */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <style>{`
                @keyframes solarOrdinaryNetMeteringLoad {
                  0% { stroke-dasharray: 0 502.4; stroke-dashoffset: 0; }
                  100% { stroke-dasharray: ${createArcDasharray(0, ordSolarNetMeteringPct).split(' ')[0]} 502.4; stroke-dashoffset: 0; }
                }
                @keyframes solarOrdinaryNetAccountingLoad {
                  0% { stroke-dasharray: 0 502.4; stroke-dashoffset: ${-((ordSolarNetMeteringPct / 100) * 502.4)}; }
                  100% { stroke-dasharray: ${createArcDasharray(ordSolarNetMeteringPct, ordSolarNetMeteringPct + ordSolarNetAccountingPct).split(' ')[0]} 502.4; stroke-dashoffset: ${-((ordSolarNetMeteringPct / 100) * 502.4)}; }
                }
                @keyframes solarOrdinaryNetPlusLoad {
                  0% { stroke-dasharray: 0 502.4; stroke-dashoffset: ${-(((ordSolarNetMeteringPct + ordSolarNetAccountingPct) / 100) * 502.4)}; }
                  100% { stroke-dasharray: ${createArcDasharray(ordSolarNetMeteringPct + ordSolarNetAccountingPct, ordSolarNetMeteringPct + ordSolarNetAccountingPct + ordSolarNetPlusPct).split(' ')[0]} 502.4; stroke-dashoffset: ${-(((ordSolarNetMeteringPct + ordSolarNetAccountingPct) / 100) * 502.4)}; }
                }
                @keyframes solarOrdinaryNetPlusPlusLoad {
                  0% { stroke-dasharray: 0 502.4; stroke-dashoffset: ${-(((ordSolarNetMeteringPct + ordSolarNetAccountingPct + ordSolarNetPlusPct) / 100) * 502.4)}; }
                  100% { stroke-dasharray: ${createArcDasharray(ordSolarNetMeteringPct + ordSolarNetAccountingPct + ordSolarNetPlusPct, 100).split(' ')[0]} 502.4; stroke-dashoffset: ${-(((ordSolarNetMeteringPct + ordSolarNetAccountingPct + ordSolarNetPlusPct) / 100) * 502.4)}; }
                }
                @keyframes solarBulkNetMeteringLoad {
                  0% { stroke-dasharray: 0 502.4; stroke-dashoffset: 0; }
                  100% { stroke-dasharray: ${createArcDasharray(0, bulkSolarNetMeteringPct).split(' ')[0]} 502.4; stroke-dashoffset: 0; }
                }
                @keyframes solarBulkNetAccountingLoad {
                  0% { stroke-dasharray: 0 502.4; stroke-dashoffset: ${-((bulkSolarNetMeteringPct / 100) * 502.4)}; }
                  100% { stroke-dasharray: ${createArcDasharray(bulkSolarNetMeteringPct, bulkSolarNetMeteringPct + bulkSolarNetAccountingPct).split(' ')[0]} 502.4; stroke-dashoffset: ${-((bulkSolarNetMeteringPct / 100) * 502.4)}; }
                }
                @keyframes solarBulkNetPlusLoad {
                  0% { stroke-dasharray: 0 502.4; stroke-dashoffset: ${-(((bulkSolarNetMeteringPct + bulkSolarNetAccountingPct) / 100) * 502.4)}; }
                  100% { stroke-dasharray: ${createArcDasharray(bulkSolarNetMeteringPct + bulkSolarNetAccountingPct, bulkSolarNetMeteringPct + bulkSolarNetAccountingPct + bulkSolarNetPlusPct).split(' ')[0]} 502.4; stroke-dashoffset: ${-(((bulkSolarNetMeteringPct + bulkSolarNetAccountingPct) / 100) * 502.4)}; }
                }
                @keyframes solarBulkNetPlusPlusLoad {
                  0% { stroke-dasharray: 0 502.4; stroke-dashoffset: ${-(((bulkSolarNetMeteringPct + bulkSolarNetAccountingPct + bulkSolarNetPlusPct) / 100) * 502.4)}; }
                  100% { stroke-dasharray: ${createArcDasharray(bulkSolarNetMeteringPct + bulkSolarNetAccountingPct + bulkSolarNetPlusPct, 100).split(' ')[0]} 502.4; stroke-dashoffset: ${-(((bulkSolarNetMeteringPct + bulkSolarNetAccountingPct + bulkSolarNetPlusPct) / 100) * 502.4)}; }
                }
                .solar-ord-metering { animation: solarOrdinaryNetMeteringLoad 0.9s ease-out forwards; animation-delay: 0.3s; }
                .solar-ord-accounting { animation: solarOrdinaryNetAccountingLoad 0.9s ease-out forwards; animation-delay: 1.2s; }
                .solar-ord-plus { animation: solarOrdinaryNetPlusLoad 0.9s ease-out forwards; animation-delay: 2.1s; }
                .solar-ord-plusplus { animation: solarOrdinaryNetPlusPlusLoad 0.9s ease-out forwards; animation-delay: 3.0s; }
                .solar-bulk-metering { animation: solarBulkNetMeteringLoad 0.9s ease-out forwards; animation-delay: 0.3s; }
                .solar-bulk-accounting { animation: solarBulkNetAccountingLoad 0.9s ease-out forwards; animation-delay: 1.2s; }
                .solar-bulk-plus { animation: solarBulkNetPlusLoad 0.9s ease-out forwards; animation-delay: 2.1s; }
                .solar-bulk-plusplus { animation: solarBulkNetPlusPlusLoad 0.9s ease-out forwards; animation-delay: 3.0s; }
              `}</style>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-semibold text-gray-900">Solar Customers by Net Type</h3>
                  {/* <p className="text-xs text-gray-500 mt-1">Distribution by customer type (Ordinary vs Bulk)</p> */}
                </div>
                <span className="text-[color:var(--ceb-navy)] text-xs font-semibold tracking-wide">GRAPH</span>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* Ordinary Solar Pie Chart */}
                <div className="flex flex-col items-center">
                  <h4 className="text-sm font-medium text-gray-900 mb-4">Ordinary Solar</h4>
                  <div className="flex flex-col items-center justify-center gap-4 w-full">
                    {/* Pie Chart */}
                    <div className="relative w-40 h-40">
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
                        
                        {/* Net Metering Segment */}
                        <circle
                          cx="100"
                          cy="100"
                          r="80"
                          fill="none"
                          stroke="var(--ceb-maroon)"
                          strokeWidth="30"
                          strokeDasharray="0 502.4"
                          strokeDashoffset="0"
                          className="solar-ord-metering transition-all duration-300 cursor-pointer hover:opacity-80"
                          onMouseEnter={() => setActiveSolarPieChart('ordinaryNetMetering')}
                          onMouseLeave={() => setActiveSolarPieChart(null)}
                        />
                        
                        {/* Net Accounting Segment */}
                        <circle
                          cx="100"
                          cy="100"
                          r="80"
                          fill="none"
                          stroke="#A0673A"
                          strokeWidth="30"
                          strokeDasharray="0 502.4"
                          strokeDashoffset={-((ordSolarNetMeteringPct / 100) * 502.4)}
                          className="solar-ord-accounting transition-all duration-300 cursor-pointer hover:opacity-80"
                          onMouseEnter={() => setActiveSolarPieChart('ordinaryNetAccounting')}
                          onMouseLeave={() => setActiveSolarPieChart(null)}
                        />
                        
                        {/* Net Plus Segment */}
                        <circle
                          cx="100"
                          cy="100"
                          r="80"
                          fill="none"
                          stroke="var(--ceb-gold)"
                          strokeWidth="30"
                          strokeDasharray="0 502.4"
                          strokeDashoffset={-(((ordSolarNetMeteringPct + ordSolarNetAccountingPct) / 100) * 502.4)}
                          className="solar-ord-plus transition-all duration-300 cursor-pointer hover:opacity-80"
                          onMouseEnter={() => setActiveSolarPieChart('ordinaryNetPlus')}
                          onMouseLeave={() => setActiveSolarPieChart(null)}
                        />
                        
                        {/* Net Plus Plus Segment */}
                        <circle
                          cx="100"
                          cy="100"
                          r="80"
                          fill="none"
                          stroke="#C9934E"
                          strokeWidth="30"
                          strokeDasharray="0 502.4"
                          strokeDashoffset={-(((ordSolarNetMeteringPct + ordSolarNetAccountingPct + ordSolarNetPlusPct) / 100) * 502.4)}
                          className="solar-ord-plusplus transition-all duration-300 cursor-pointer hover:opacity-80"
                          onMouseEnter={() => setActiveSolarPieChart('ordinaryNetPlusPlus')}
                          onMouseLeave={() => setActiveSolarPieChart(null)}
                        />
                      </svg>
                      
                      {/* Hover Tooltip */}
                      {activeSolarPieChart && activeSolarPieChart.startsWith('ordinary') && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="bg-gray-900 text-white px-3 py-2 rounded-lg text-center shadow-lg">
                            <p className="text-xs font-semibold">
                              {activeSolarPieChart === 'ordinaryNetMetering' && 'Net Metering'}
                              {activeSolarPieChart === 'ordinaryNetAccounting' && 'Net Accounting'}
                              {activeSolarPieChart === 'ordinaryNetPlus' && 'Net Plus'}
                              {activeSolarPieChart === 'ordinaryNetPlusPlus' && 'Net Plus Plus'}
                            </p>
                            <p className="text-sm font-bold mt-1">
                              {activeSolarPieChart === 'ordinaryNetMetering' && formatNumber(customerCounts.solar.netMetering)}
                              {activeSolarPieChart === 'ordinaryNetAccounting' && formatNumber(customerCounts.solar.netAccounting)}
                              {activeSolarPieChart === 'ordinaryNetPlus' && formatNumber(customerCounts.solar.netPlus)}
                              {activeSolarPieChart === 'ordinaryNetPlusPlus' && formatNumber(customerCounts.solar.netPlusPlus)}
                            </p>
                            <p className="text-xs text-gray-300 mt-0.5">
                              {activeSolarPieChart === 'ordinaryNetMetering' && `${ordSolarNetMeteringPct.toFixed(1)}%`}
                              {activeSolarPieChart === 'ordinaryNetAccounting' && `${ordSolarNetAccountingPct.toFixed(1)}%`}
                              {activeSolarPieChart === 'ordinaryNetPlus' && `${ordSolarNetPlusPct.toFixed(1)}%`}
                              {activeSolarPieChart === 'ordinaryNetPlusPlus' && `${ordSolarNetPlusPlusPct.toFixed(1)}%`}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {/* Center text */}
                      {!activeSolarPieChart && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <p className="text-xl font-bold text-gray-900">{formatNumber(totalOrdinarySolar)}</p>
                            <p className="text-xs text-gray-500">Total</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Legend */}
                    <div className="space-y-2 w-full text-sm">
                      <div 
                        className={`flex items-center gap-2 p-1 rounded transition-colors ${activeSolarPieChart === 'ordinaryNetMetering' ? 'bg-[var(--ceb-maroon)]/10' : ''}`}
                        onMouseEnter={() => setActiveSolarPieChart('ordinaryNetMetering')}
                        onMouseLeave={() => setActiveSolarPieChart(null)}
                      >
                        <div className="w-3 h-3 bg-[var(--ceb-maroon)] rounded-full flex-shrink-0"></div>
                        <span className="text-gray-700">{customerCounts.solar.netMetering} ({ordSolarNetMeteringPct.toFixed(1)}%)</span>
                      </div>
                      <div 
                        className={`flex items-center gap-2 p-1 rounded transition-colors ${activeSolarPieChart === 'ordinaryNetAccounting' ? 'bg-[#A0673A]/10' : ''}`}
                        onMouseEnter={() => setActiveSolarPieChart('ordinaryNetAccounting')}
                        onMouseLeave={() => setActiveSolarPieChart(null)}
                      >
                        <div className="w-3 h-3 bg-[#A0673A] rounded-full flex-shrink-0"></div>
                        <span className="text-gray-700">{customerCounts.solar.netAccounting} ({ordSolarNetAccountingPct.toFixed(1)}%)</span>
                      </div>
                      <div 
                        className={`flex items-center gap-2 p-1 rounded transition-colors ${activeSolarPieChart === 'ordinaryNetPlus' ? 'bg-[var(--ceb-gold)]/10' : ''}`}
                        onMouseEnter={() => setActiveSolarPieChart('ordinaryNetPlus')}
                        onMouseLeave={() => setActiveSolarPieChart(null)}
                      >
                        <div className="w-3 h-3 bg-[var(--ceb-gold)] rounded-full flex-shrink-0"></div>
                        <span className="text-gray-700">{customerCounts.solar.netPlus} ({ordSolarNetPlusPct.toFixed(1)}%)</span>
                      </div>
                      <div 
                        className={`flex items-center gap-2 p-1 rounded transition-colors ${activeSolarPieChart === 'ordinaryNetPlusPlus' ? 'bg-[#C9934E]/10' : ''}`}
                        onMouseEnter={() => setActiveSolarPieChart('ordinaryNetPlusPlus')}
                        onMouseLeave={() => setActiveSolarPieChart(null)}
                      >
                        <div className="w-3 h-3 bg-[#C9934E] rounded-full flex-shrink-0"></div>
                        <span className="text-gray-700">{customerCounts.solar.netPlusPlus} ({ordSolarNetPlusPlusPct.toFixed(1)}%)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bulk Solar Pie Chart */}
                <div className="flex flex-col items-center">
                  <h4 className="text-sm font-medium text-gray-900 mb-4">Bulk Solar</h4>
                  <div className="flex flex-col items-center justify-center gap-4 w-full">
                    {/* Pie Chart */}
                    <div className="relative w-40 h-40">
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
                        
                        {/* Net Metering Segment */}
                        <circle
                          cx="100"
                          cy="100"
                          r="80"
                          fill="none"
                          stroke="var(--ceb-maroon)"
                          strokeWidth="30"
                          strokeDasharray="0 502.4"
                          strokeDashoffset="0"
                          className="solar-bulk-metering transition-all duration-300 cursor-pointer hover:opacity-80"
                          onMouseEnter={() => setActiveSolarPieChart('bulkNetMetering')}
                          onMouseLeave={() => setActiveSolarPieChart(null)}
                        />
                        
                        {/* Net Accounting Segment */}
                        <circle
                          cx="100"
                          cy="100"
                          r="80"
                          fill="none"
                          stroke="#A0673A"
                          strokeWidth="30"
                          strokeDasharray="0 502.4"
                          strokeDashoffset={-((bulkSolarNetMeteringPct / 100) * 502.4)}
                          className="solar-bulk-accounting transition-all duration-300 cursor-pointer hover:opacity-80"
                          onMouseEnter={() => setActiveSolarPieChart('bulkNetAccounting')}
                          onMouseLeave={() => setActiveSolarPieChart(null)}
                        />
                        
                        {/* Net Plus Segment */}
                        <circle
                          cx="100"
                          cy="100"
                          r="80"
                          fill="none"
                          stroke="var(--ceb-gold)"
                          strokeWidth="30"
                          strokeDasharray="0 502.4"
                          strokeDashoffset={-(((bulkSolarNetMeteringPct + bulkSolarNetAccountingPct) / 100) * 502.4)}
                          className="solar-bulk-plus transition-all duration-300 cursor-pointer hover:opacity-80"
                          onMouseEnter={() => setActiveSolarPieChart('bulkNetPlus')}
                          onMouseLeave={() => setActiveSolarPieChart(null)}
                        />
                        
                        {/* Net Plus Plus Segment */}
                        <circle
                          cx="100"
                          cy="100"
                          r="80"
                          fill="none"
                          stroke="#C9934E"
                          strokeWidth="30"
                          strokeDasharray="0 502.4"
                          strokeDashoffset={-(((bulkSolarNetMeteringPct + bulkSolarNetAccountingPct + bulkSolarNetPlusPct) / 100) * 502.4)}
                          className="solar-bulk-plusplus transition-all duration-300 cursor-pointer hover:opacity-80"
                          onMouseEnter={() => setActiveSolarPieChart('bulkNetPlusPlus')}
                          onMouseLeave={() => setActiveSolarPieChart(null)}
                        />
                      </svg>
                      
                      {/* Hover Tooltip */}
                      {activeSolarPieChart && activeSolarPieChart.startsWith('bulk') && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="bg-gray-900 text-white px-3 py-2 rounded-lg text-center shadow-lg">
                            <p className="text-xs font-semibold">
                              {activeSolarPieChart === 'bulkNetMetering' && 'Net Metering'}
                              {activeSolarPieChart === 'bulkNetAccounting' && 'Net Accounting'}
                              {activeSolarPieChart === 'bulkNetPlus' && 'Net Plus'}
                              {activeSolarPieChart === 'bulkNetPlusPlus' && 'Net Plus Plus'}
                            </p>
                            <p className="text-sm font-bold mt-1">
                              {activeSolarPieChart === 'bulkNetMetering' && formatNumber(bulkSolarCustomers.netMetering)}
                              {activeSolarPieChart === 'bulkNetAccounting' && formatNumber(bulkSolarCustomers.netAccounting)}
                              {activeSolarPieChart === 'bulkNetPlus' && formatNumber(bulkSolarCustomers.netPlus)}
                              {activeSolarPieChart === 'bulkNetPlusPlus' && formatNumber(bulkSolarCustomers.netPlusPlus)}
                            </p>
                            <p className="text-xs text-gray-300 mt-0.5">
                              {activeSolarPieChart === 'bulkNetMetering' && `${bulkSolarNetMeteringPct.toFixed(1)}%`}
                              {activeSolarPieChart === 'bulkNetAccounting' && `${bulkSolarNetAccountingPct.toFixed(1)}%`}
                              {activeSolarPieChart === 'bulkNetPlus' && `${bulkSolarNetPlusPct.toFixed(1)}%`}
                              {activeSolarPieChart === 'bulkNetPlusPlus' && `${bulkSolarNetPlusPlusPct.toFixed(1)}%`}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {/* Center text */}
                      {!activeSolarPieChart && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <p className="text-xl font-bold text-gray-900">{formatNumber(totalBulkSolar)}</p>
                            <p className="text-xs text-gray-500">Total</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Legend */}
                    <div className="space-y-2 w-full text-sm">
                      <div 
                        className={`flex items-center gap-2 p-1 rounded transition-colors ${activeSolarPieChart === 'bulkNetMetering' ? 'bg-[var(--ceb-maroon)]/10' : ''}`}
                        onMouseEnter={() => setActiveSolarPieChart('bulkNetMetering')}
                        onMouseLeave={() => setActiveSolarPieChart(null)}
                      >
                        <div className="w-3 h-3 bg-[var(--ceb-maroon)] rounded-full flex-shrink-0"></div>
                        <span className="text-gray-700">{bulkSolarCustomers.netMetering} ({bulkSolarNetMeteringPct.toFixed(1)}%)</span>
                      </div>
                      <div 
                        className={`flex items-center gap-2 p-1 rounded transition-colors ${activeSolarPieChart === 'bulkNetAccounting' ? 'bg-[#A0673A]/10' : ''}`}
                        onMouseEnter={() => setActiveSolarPieChart('bulkNetAccounting')}
                        onMouseLeave={() => setActiveSolarPieChart(null)}
                      >
                        <div className="w-3 h-3 bg-[#A0673A] rounded-full flex-shrink-0"></div>
                        <span className="text-gray-700">{bulkSolarCustomers.netAccounting} ({bulkSolarNetAccountingPct.toFixed(1)}%)</span>
                      </div>
                      <div 
                        className={`flex items-center gap-2 p-1 rounded transition-colors ${activeSolarPieChart === 'bulkNetPlus' ? 'bg-[var(--ceb-gold)]/10' : ''}`}
                        onMouseEnter={() => setActiveSolarPieChart('bulkNetPlus')}
                        onMouseLeave={() => setActiveSolarPieChart(null)}
                      >
                        <div className="w-3 h-3 bg-[var(--ceb-gold)] rounded-full flex-shrink-0"></div>
                        <span className="text-gray-700">{bulkSolarCustomers.netPlus} ({bulkSolarNetPlusPct.toFixed(1)}%)</span>
                      </div>
                      <div 
                        className={`flex items-center gap-2 p-1 rounded transition-colors ${activeSolarPieChart === 'bulkNetPlusPlus' ? 'bg-[#C9934E]/10' : ''}`}
                        onMouseEnter={() => setActiveSolarPieChart('bulkNetPlusPlus')}
                        onMouseLeave={() => setActiveSolarPieChart(null)}
                      >
                        <div className="w-3 h-3 bg-[#C9934E] rounded-full flex-shrink-0"></div>
                        <span className="text-gray-700">{bulkSolarCustomers.netPlusPlus} ({bulkSolarNetPlusPlusPct.toFixed(1)}%)</span>
                      </div>
                    </div>
                  </div>
                </div>
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
                  {/* <span className="font-medium">{formatNumber(customerCounts.ordinary)}</span> */}
                  <span className="font-medium">
  {customerCountsLoading
    ? "Loading..."
    : customerCountsError
    ? "Error"
    : formatNumber(customerCounts.ordinary)}
</span>
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
            </>
          )}

          {/* Analytics Dashboard */}
          {activeDashboard === "analytics" && (
            <div className="p-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-6">Analytics Dashboard</h1>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-purple-600" />
                    </div>
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">+15.3%</span>
                  </div>
                  <h3 className="text-sm font-medium text-gray-500">Traffic</h3>
                  <p className="text-2xl font-bold text-gray-900 mt-1">124,567</p>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <BarChart3 className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">+8.2%</span>
                  </div>
                  <h3 className="text-sm font-medium text-gray-500">Conversions</h3>
                  <p className="text-2xl font-bold text-gray-900 mt-1">8,945</p>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <DollarSign className="w-5 h-5 text-green-600" />
                    </div>
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">+22.1%</span>
                  </div>
                  <h3 className="text-sm font-medium text-gray-500">Revenue</h3>
                  <p className="text-2xl font-bold text-gray-900 mt-1">LKR 2.5M</p>
                </div>
              </div>
            </div>
          )}

          {/* CRM Dashboard */}
          {activeDashboard === "crm" && (
            <div className="p-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-6">CRM Dashboard</h1>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <Users className="w-5 h-5 text-orange-600" />
                    </div>
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">+12.5%</span>
                  </div>
                  <h3 className="text-sm font-medium text-gray-500">Total Leads</h3>
                  <p className="text-2xl font-bold text-gray-900 mt-1">3,456</p>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Target className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">+5.8%</span>
                  </div>
                  <h3 className="text-sm font-medium text-gray-500">Conversion Rate</h3>
                  <p className="text-2xl font-bold text-gray-900 mt-1">28.5%</p>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Briefcase className="w-5 h-5 text-green-600" />
                    </div>
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">+18.3%</span>
                  </div>
                  <h3 className="text-sm font-medium text-gray-500">Deals Closed</h3>
                  <p className="text-2xl font-bold text-gray-900 mt-1">245</p>
                </div>
              </div>
            </div>
          )}

          {/* E-commerce Dashboard */}
          {activeDashboard === "ecommerce" && (
            <div className="p-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-6">E-Commerce Dashboard</h1>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <ShoppingCart className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">+9.2%</span>
                  </div>
                  <h3 className="text-sm font-medium text-gray-500">Orders</h3>
                  <p className="text-2xl font-bold text-gray-900 mt-1">2,845</p>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <DollarSign className="w-5 h-5 text-green-600" />
                    </div>
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">+14.7%</span>
                  </div>
                  <h3 className="text-sm font-medium text-gray-500">Revenue</h3>
                  <p className="text-2xl font-bold text-gray-900 mt-1">LKR 8.2M</p>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <Target className="w-5 h-5 text-yellow-600" />
                    </div>
                    <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">-2.3%</span>
                  </div>
                  <h3 className="text-sm font-medium text-gray-500">Avg Order Value</h3>
                  <p className="text-2xl font-bold text-gray-900 mt-1">LKR 2,885</p>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-purple-600" />
                    </div>
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">+11.5%</span>
                  </div>
                  <h3 className="text-sm font-medium text-gray-500">Cart Recovery</h3>
                  <p className="text-2xl font-bold text-gray-900 mt-1">42.3%</p>
                </div>
              </div>
            </div>
          )}

          {/* LMS Dashboard */}
          {activeDashboard === "lms" && (
            <div className="p-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-6">LMS Dashboard</h1>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">New</span>
                  </div>
                  <h3 className="text-sm font-medium text-gray-500">Active Students</h3>
                  <p className="text-2xl font-bold text-gray-900 mt-1">1,234</p>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <FileText className="w-5 h-5 text-purple-600" />
                    </div>
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">New</span>
                  </div>
                  <h3 className="text-sm font-medium text-gray-500">Courses</h3>
                  <p className="text-2xl font-bold text-gray-900 mt-1">47</p>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    </div>
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">New</span>
                  </div>
                  <h3 className="text-sm font-medium text-gray-500">Completion Rate</h3>
                  <p className="text-2xl font-bold text-gray-900 mt-1">73.4%</p>
                </div>
              </div>
            </div>
          )}

          {/* Management Dashboard */}
          {activeDashboard === "management" && (
            <div className="p-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-6">Management Dashboard</h1>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Briefcase className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">+7.2%</span>
                  </div>
                  <h3 className="text-sm font-medium text-gray-500">Active Projects</h3>
                  <p className="text-2xl font-bold text-gray-900 mt-1">12</p>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <Target className="w-5 h-5 text-orange-600" />
                    </div>
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">+5.1%</span>
                  </div>
                  <h3 className="text-sm font-medium text-gray-500">Tasks Completed</h3>
                  <p className="text-2xl font-bold text-gray-900 mt-1">342</p>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Users className="w-5 h-5 text-green-600" />
                    </div>
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">+3.5%</span>
                  </div>
                  <h3 className="text-sm font-medium text-gray-500">Team Members</h3>
                  <p className="text-2xl font-bold text-gray-900 mt-1">28</p>
                </div>
              </div>
            </div>
          )}

          {/* SaaS Dashboard */}
          {activeDashboard === "saas" && (
            <div className="p-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-6">SaaS Dashboard</h1>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">+8.3%</span>
                  </div>
                  <h3 className="text-sm font-medium text-gray-500">Active Users</h3>
                  <p className="text-2xl font-bold text-gray-900 mt-1">5,234</p>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <DollarSign className="w-5 h-5 text-green-600" />
                    </div>
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">+12.7%</span>
                  </div>
                  <h3 className="text-sm font-medium text-gray-500">MRR</h3>
                  <p className="text-2xl font-bold text-gray-900 mt-1">LKR 4.5M</p>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-purple-600" />
                    </div>
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">+4.2%</span>
                  </div>
                  <h3 className="text-sm font-medium text-gray-500">Churn Rate</h3>
                  <p className="text-2xl font-bold text-gray-900 mt-1">2.3%</p>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <Target className="w-5 h-5 text-yellow-600" />
                    </div>
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">+6.8%</span>
                  </div>
                  <h3 className="text-sm font-medium text-gray-500">LTV</h3>
                  <p className="text-2xl font-bold text-gray-900 mt-1">LKR 18.5K</p>
                </div>
              </div>
            </div>
          )}

          {/* Support Desk Dashboard */}
          {activeDashboard === "support" && (
            <div className="p-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-6">Support Desk Dashboard</h1>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <HeadsetIcon className="w-5 h-5 text-red-600" />
                    </div>
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">New</span>
                  </div>
                  <h3 className="text-sm font-medium text-gray-500">Open Tickets</h3>
                  <p className="text-2xl font-bold text-gray-900 mt-1">127</p>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Clock className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">New</span>
                  </div>
                  <h3 className="text-sm font-medium text-gray-500">Avg Response Time</h3>
                  <p className="text-2xl font-bold text-gray-900 mt-1">2.4h</p>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    </div>
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">New</span>
                  </div>
                  <h3 className="text-sm font-medium text-gray-500">Resolution Rate</h3>
                  <p className="text-2xl font-bold text-gray-900 mt-1">87.5%</p>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <Users className="w-5 h-5 text-yellow-600" />
                    </div>
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">New</span>
                  </div>
                  <h3 className="text-sm font-medium text-gray-500">Customer Satisfaction</h3>
                  <p className="text-2xl font-bold text-gray-900 mt-1">4.7/5</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;