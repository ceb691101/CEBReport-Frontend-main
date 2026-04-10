import React, { useState } from "react";

interface DashboardHeaderProps {
  title: string;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  title,
}) => {
  const [selectedDivision, setSelectedDivision] = useState("all");

  const divisions = [
    { id: "all", label: "All Divisions" },
    { id: "r1", label: "R1" },
    { id: "r2", label: "R2" },
    { id: "r3", label: "R3" },
    { id: "r4", label: "R4" },
  ];

  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-10 transition-all duration-1000 opacity-100">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <div className="ml-auto flex items-center justify-end">
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
              {divisions.map((division) => {
                const isSelected = selectedDivision === division.id;

                return (
                  <button
                    key={division.id}
                    type="button"
                    onClick={() => setSelectedDivision(division.id)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                      isSelected
                        ? "bg-white shadow-sm text-gray-900"
                        : "text-gray-600 hover:bg-white/50"
                    }`}
                  >
                    {division.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;
