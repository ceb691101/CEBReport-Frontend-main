import React, { useState } from "react";
import { 
  BarChart3, Menu, X, Home, DollarSign, Users,
  Briefcase, Sun, CreditCard, Target, Package
} from "lucide-react";

interface DashboardSelectorProps {
  activeDashboard: string;
  onSelectDashboard: (dashboard: string) => void;
}

const DashboardSelector: React.FC<DashboardSelectorProps> = ({
  activeDashboard,
  onSelectDashboard,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // CEB-specific dashboards with role-based access control planned
  const dashboards = [
    { id: "default", label: "Default", icon: Home },
    { id: "financial", label: "Financial", icon: DollarSign },
   // { id: "customer", label: "Customer Management", icon: Users },
   // { id: "operations", label: "Operations/Field", icon: Briefcase },
    //{ id: "analytics", label: "Analytics", icon: BarChart3 },
    //{ id: "solar", label: "Solar Operations", icon: Sun },
    //{ id: "collections", label: "Collections & Payments", icon: CreditCard },
    //{ id: "executive", label: "Executive/KPI", icon: Target },
    //{ id: "inventory", label: "Inventory & Procurement", icon: Package },
  ];

  return (
    <div className={`${isOpen ? 'w-64' : 'w-16'} bg-white border-r border-gray-200 shadow-sm transition-all duration-300 h-screen flex flex-col`}>
      
      {/* HEADER: Only shows Hamburger when collapsed */}
      <div className={`p-4 border-b border-gray-200 flex items-center ${isOpen ? 'justify-between' : 'justify-center'}`}>
        {isOpen && (
          <div className="flex items-center gap-3 overflow-hidden">
            <BarChart3 className="w-5 h-5 text-[var(--ceb-maroon)] flex-shrink-0" />
            <h2 className="text-sm font-semibold text-gray-900 truncate tracking-wide">Dashboard</h2>
          </div>
        )}
        
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center"
        >
          {isOpen ? <X className="w-5 h-5 text-gray-600" /> : <Menu className="w-5 h-5 text-gray-600" />}
        </button>
      </div>

      {/* NAVIGATION: Shows Icon + Text (Open) or Just Icon (Closed) */}
      <nav className="p-2 space-y-2">
        {dashboards.map((dashboard) => {
          const Icon = dashboard.icon; // Get the specific icon component
          return (
            <button
              key={dashboard.id}
              onClick={() => onSelectDashboard(dashboard.id)}
              className={`w-full rounded-lg text-sm transition-all flex items-center ${
                isOpen ? 'px-4 py-3 gap-3 justify-start' : 'p-3 justify-center'
              } ${
                activeDashboard === dashboard.id
                  ? "bg-[var(--ceb-maroon)] text-white shadow-md font-medium"
                  : "text-gray-700 hover:bg-gray-100 font-normal"
              }`}
              title={!isOpen ? dashboard.label : ""}
            >
              <Icon className={`w-5 h-5 flex-shrink-0`} />
              {isOpen && <span className="truncate tracking-wide">{dashboard.label}</span>}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default DashboardSelector;