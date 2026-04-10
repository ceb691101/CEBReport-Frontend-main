// import { useState } from "react";
// import axios from "axios";

// type ChargeData = {
//   tariff: string;
//   noAccts: string;
//   kwhUnits: string;
//   kwhCharge: number;
//   fuelCharge: number;
//   taxCharge: 2223830.81;
//   fixedCharge: 4850548.65;
//   Charge: 88953349.46;
// };

// const ChargeTable = () => {
//   const [billCycle, setBillCycle] = useState("");
//   const [data, setData] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");

//   const fetchCharges = async () => {
//     if (!billCycle) {
//       setError("Please enter a bill cycle.");
//       return;
//     }

//     setLoading(true);
//     setError("");
//     setData([]);

//     try {
//       const response = await axios.post("/CEBINFO_API_2025/api/ordinarySales", {
//         billCycle: Number(billCycle),
//       });

//       setData(response.data.OrdList || []);
//     } catch (err) {
//       setError("Failed to fetch data");
//       console.error(err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="p-6 max-w-6xl mx-auto">
//       <h2 className="text-2xl font-semibold mb-4">Charges Table</h2>

//       {/* Input Form */}
//       <div className="flex items-center gap-4 mb-6">
//         <input
//           type="number"
//           placeholder="Enter Bill Cycle"
//           className="border border-gray-300 px-4 py-2 rounded-md w-60 focus:outline-none focus:ring-2 focus:ring-blue-500"
//           value={billCycle}
//           onChange={(e) => setBillCycle(e.target.value)}
//         />
//         <button
//           onClick={fetchCharges}
//           className="bg-blue-600 text-white px-5 py-2 rounded-md hover:bg-blue-700 transition"
//         >
//           Get Charges
//         </button>
//       </div>

//       {/* Loading / Error */}
//       {loading && <p className="text-gray-600">Loading...</p>}
//       {error && <p className="text-red-500 mb-4">{error}</p>}

//       {/* Table */}
//       {data.length > 0 && (
//         <div className="overflow-x-auto rounded-lg shadow">
//           <table className="min-w-full bg-white border border-gray-200">
//             <thead className="bg-gray-100 text-gray-700">
//               <tr>
//                 <th className="py-2 px-4 border-b">Tariff</th>
//                 <th className="py-2 px-4 border-b">No. of Accounts</th>
//                 <th className="py-2 px-4 border-b">kWh Units</th>
//                 <th className="py-2 px-4 border-b">kWh Charge</th>
//                 <th className="py-2 px-4 border-b">Fuel Charge</th>
//                 <th className="py-2 px-4 border-b">Tax Charge</th>
//                 <th className="py-2 px-4 border-b">Fixed Charge</th>
//                 <th className="py-2 px-4 border-b">Total Charge</th>
//               </tr>
//             </thead>
//             <tbody>
//               {data.map((row, index) => (
//                 <tr key={index} className="hover:bg-gray-50">
//                   <td className="py-2 px-4 border-b">{row.tariff.trim()}</td>
//                   <td className="py-2 px-4 border-b text-right">
//                     {row.noAccts}
//                   </td>
//                   <td className="py-2 px-4 border-b text-right">
//                     {row.kwhUnits}
//                   </td>
//                   <td className="py-2 px-4 border-b text-right">
//                     {Number(row.kwhCharge).toLocaleString()}
//                   </td>
//                   <td className="py-2 px-4 border-b text-right">
//                     {Number(row.fuelCharge).toLocaleString()}
//                   </td>
//                   <td className="py-2 px-4 border-b text-right">
//                     {Number(row.taxCharge).toLocaleString()}
//                   </td>
//                   <td className="py-2 px-4 border-b text-right">
//                     {Number(row.fixedCharge).toLocaleString()}
//                   </td>
//                   <td className="py-2 px-4 border-b text-right font-semibold">
//                     {Number(row.Charge).toLocaleString()}
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       )}
//     </div>
//   );
// };

// export default ChargeTable;
