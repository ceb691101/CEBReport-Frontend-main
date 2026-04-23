import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaSearch, FaSyncAlt, FaEye } from "react-icons/fa";
import type { Material, MaterialMasterProps } from "../../interfaces/materialTypes";

const MaterialMaster: React.FC<MaterialMasterProps> = ({
  title = "Material Details",
}) => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [searchTermName, setSearchTermName] = useState("");
  const [searchTermCode, setSearchTermCode] = useState("");
  const [filteredMaterials, setFilteredMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;
  const navigate = useNavigate();

  useEffect(() => {
    const loadMaterials = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/misapi/api/materials");
        const text = await response.text();
        const result = JSON.parse(text);
        const data = Array.isArray(result) ? result : result.data || [];
        setMaterials(data);
        setFilteredMaterials(data);
      } catch (err: any) {
        setError(err.message || "Failed to load materials.");
        setMaterials([]);
        setFilteredMaterials([]);
      } finally {
        setLoading(false);
      }
    };
    loadMaterials();
  }, []);

  useEffect(() => {
    const filtered = materials.filter((m) =>
      (!searchTermName || m.MatNm.toLowerCase().includes(searchTermName.toLowerCase())) &&
      (!searchTermCode || m.MatCd.toLowerCase().includes(searchTermCode.toLowerCase()))
    );
    setFilteredMaterials(filtered);
    setCurrentPage(1);
  }, [searchTermName, searchTermCode, materials]);

  const paginatedMaterials = filteredMaterials.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleView = (matCd: string) => navigate(`/report/inventory/material-details/${matCd}`);
  const clearAllFilters = () => {
    setSearchTermName("");
    setSearchTermCode("");
  };

  const maroon = "text-[#7A0000]";
  const maroonBg = "bg-[#7A0000]";
  const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";

  if (loading) return <div className="text-center py-8 text-[#7A0000] text-sm animate-pulse">Loading...</div>;
  if (error) return <div className="text-red-600 bg-red-100 border border-red-300 p-4 rounded text-sm">Error: {error}</div>;

  return (
    <div className="max-w-5xl mx-auto p-6 bg-white rounded-xl shadow border border-gray-200 text-sm font-sans">
      <div className="flex justify-between items-center mb-4">
        <h2 className={`text-xl font-bold ${maroon}`}>
          {title}
          <span className="ml-2 text-xs text-gray-500"></span>
        </h2>
      </div>

      <div className="flex flex-wrap gap-3 justify-end mb-4">
        {[{ value: searchTermCode, set: setSearchTermCode, placeholder: "Material Code" },
          { value: searchTermName, set: setSearchTermName, placeholder: "Material Name" }
        ].map((input, idx) => (
          <div key={idx} className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs" />
            <input
              type="text"
              value={input.value}
              placeholder={input.placeholder}
              onChange={(e) => input.set(e.target.value)}
              className="pl-8 pr-3 py-1.5 w-40 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A0000] transition"
            />
          </div>
        ))}
        {(searchTermName || searchTermCode) && (
          <button onClick={clearAllFilters} className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700">
            <FaSyncAlt className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {filteredMaterials.length === 0 ? (
        <div className="text-gray-600 bg-gray-100 p-4 rounded">No materials found.</div>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full table-fixed text-left text-gray-700 text-sm">
              <thead className={`${maroonBg} text-white sticky top-0 z-10`}>
                <tr>
                  <th className="px-4 py-2 w-1/4">Material Code</th>
                  <th className="px-4 py-2 w-1/2">Material Name</th>
                  <th className="px-4 py-2 w-1/4 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedMaterials.map((mat, i) => (
                  <tr key={i} className={i % 2 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-4 py-2 truncate">{mat.MatCd}</td>
                    <td className="px-4 py-2 truncate">{mat.MatNm}</td>
                    <td className="px-4 py-2 text-center">
                      <button
                        onClick={() => handleView(mat.MatCd)}
                        className={`px-3 py-1 ${maroonGrad} text-white rounded-md text-xs font-medium hover:brightness-110 transition shadow`}
                      >
                        <FaEye className="inline-block mr-1 w-3 h-3" /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex justify-end items-center gap-3 mt-3">
        <button
          onClick={() => setCurrentPage((p) => p - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1 border rounded bg-white text-gray-600 text-xs hover:bg-gray-100 disabled:opacity-40"
        >
          Prev
        </button>
        <span className="text-xs text-gray-500">
          Page {currentPage} of {Math.ceil(filteredMaterials.length / pageSize)}
        </span>
        <button
          onClick={() => setCurrentPage((p) => p + 1)}
          disabled={currentPage >= Math.ceil(filteredMaterials.length / pageSize)}
          className="px-3 py-1 border rounded bg-white text-gray-600 text-xs hover:bg-gray-100 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default MaterialMaster;
