import React from "react";
import { useNavigate } from "react-router-dom";
import { Sun, Battery, Plug, Target } from "lucide-react";
import DashboardHeader from "../../components/mainTopics/Dashboard/DashboardHeader";
import DashboardSelector from "../../components/mainTopics/Dashboard/DashboardSelector";

interface DashboardCardItem {
  label: string;
  value: string;
  badge?: string;
  badgeClassName?: string;
  bgClassName: string;
  icon: React.ReactNode;
}

const parseMetricValue = (value: string): number =>
  parseFloat(value.replace(/[^0-9.-]/g, "")) || 0;

const cards: DashboardCardItem[] = [
  { icon: <Sun className="w-5 h-5 text-yellow-600" />, bgClassName: "bg-yellow-100", label: "Solar Customers", value: "2,146", badge: "+12.3%" },
  { icon: <Battery className="w-5 h-5 text-amber-600" />, bgClassName: "bg-amber-100", label: "Installed Capacity", value: "4.8 MW", badge: "+9.5%" },
  { icon: <Plug className="w-5 h-5 text-violet-600" />, bgClassName: "bg-violet-100", label: "Grid Export", value: "1.2 GWh", badge: "+7.8%" },
  { icon: <Target className="w-5 h-5 text-blue-600" />, bgClassName: "bg-blue-100", label: "Net Metering Share", value: "58.4%", badge: "+1.4%" },
];

const SolarDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const activeDashboard = "solar";
  const sortedCards = [...cards].sort((a, b) => parseMetricValue(a.value) - parseMetricValue(b.value));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <DashboardSelector
          activeDashboard={activeDashboard}
          onSelectDashboard={(dashboard) => navigate(`/dashboard/${dashboard}`)}
        />
        <div className="flex-1">
          <DashboardHeader title="Solar Operations Dashboard" />
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {sortedCards.map(({ label, value, badge, badgeClassName, bgClassName, icon }) => (
                <div key={label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-2 ${bgClassName} rounded-lg`}>{icon}</div>
                    {badge && (
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${badgeClassName ?? "text-green-600 bg-green-50"}`}>
                        {badge}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-medium text-gray-500">{label}</h3>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SolarDashboardPage;
