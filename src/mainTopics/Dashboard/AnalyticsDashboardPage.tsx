import React from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp, BarChart3, DollarSign } from "lucide-react";
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
  { icon: <TrendingUp className="w-5 h-5 text-purple-600" />, bgClassName: "bg-purple-100", label: "Traffic", value: "124,567", badge: "+15.3%" },
  { icon: <BarChart3 className="w-5 h-5 text-blue-600" />, bgClassName: "bg-blue-100", label: "Conversions", value: "8,945", badge: "+8.2%" },
  { icon: <DollarSign className="w-5 h-5 text-green-600" />, bgClassName: "bg-green-100", label: "Revenue", value: "LKR 2.5M", badge: "+22.1%" },
];

const AnalyticsDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const activeDashboard = "analytics";
  const sortedCards = [...cards].sort((a, b) => parseMetricValue(a.value) - parseMetricValue(b.value));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <DashboardSelector
          activeDashboard={activeDashboard}
          onSelectDashboard={(dashboard) => navigate(`/dashboard/${dashboard}`)}
        />
        <div className="flex-1">
          <DashboardHeader title="Analytics Dashboard" />
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

export default AnalyticsDashboardPage;
