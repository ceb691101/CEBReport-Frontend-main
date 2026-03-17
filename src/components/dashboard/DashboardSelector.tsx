import React, { useState } from "react";
import { 
  BarChart3, Menu, X, Home, PieChart, Users, 
  ShoppingCart, GraduationCap, Settings, Layout, LifeBuoy 
} from "lucide-react";

interface DashboardSelectorProps {
  activeDashboard: string;
  onSelectDashboard: (dashboard: string) => void;
}

const DashboardSelector: React.FC<DashboardSelectorProps> = ({
  activeDashboard,
  onSelectDashboard,
}) => {
  const [isOpen, setIsOpen] = useState(true);

  // Added specific icons for each dashboard
  const dashboards = [
    { id: "default", label: "Default", icon: Home },
    { id: "analytics", label: "Analytics", icon: PieChart },
    { id: "crm", label: "CRM", icon: Users },
    { id: "ecommerce", label: "E commerce", icon: ShoppingCart },
    { id: "lms", label: "LMS", icon: GraduationCap },
    { id: "management", label: "Management", icon: Settings },
    { id: "saas", label: "SaaS", icon: Layout },
    { id: "support", label: "Support desk", icon: LifeBuoy },
  ];

  return (
    <div className={`${isOpen ? 'w-64' : 'w-16'} bg-white border-r border-gray-200 shadow-sm transition-all duration-300 h-screen flex flex-col`}>
      
      {/* HEADER: Only shows Hamburger when collapsed */}
      <div className={`p-4 border-b border-gray-200 flex items-center ${isOpen ? 'justify-between' : 'justify-center'}`}>
        {isOpen && (
          <div className="flex items-center gap-3 overflow-hidden">
            <BarChart3 className="w-5 h-5 text-[var(--ceb-maroon)] flex-shrink-0" />
            <h2 className="text-lg font-bold text-gray-900 truncate">Dashboard</h2>
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
              className={`w-full rounded-lg font-medium transition-all flex items-center ${
                isOpen ? 'px-4 py-3 gap-3 justify-start' : 'p-3 justify-center'
              } ${
                activeDashboard === dashboard.id
                  ? "bg-[var(--ceb-maroon)] text-white shadow-md"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
              title={!isOpen ? dashboard.label : ""}
            >
              <Icon className={`w-5 h-5 flex-shrink-0`} />
              {isOpen && <span className="truncate">{dashboard.label}</span>}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default DashboardSelector;