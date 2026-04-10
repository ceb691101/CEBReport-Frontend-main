import React from "react";
import { useNavigate } from "react-router-dom";
import { DollarSign, TrendingDown, Target, PieChart } from "lucide-react";
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
  { icon: <DollarSign className="w-5 h-5 text-emerald-600" />, bgClassName: "bg-emerald-100", label: "Monthly Revenue", value: "LKR 12.4M", badge: "+9.1%" },
  { icon: <TrendingDown className="w-5 h-5 text-rose-600" />, bgClassName: "bg-rose-100", label: "Arrears Outstanding", value: "LKR 3.8M", badge: "-2.7%" },
  { icon: <Target className="w-5 h-5 text-blue-600" />, bgClassName: "bg-blue-100", label: "Collection Target", value: "91.6%", badge: "+4.4%" },
  { icon: <PieChart className="w-5 h-5 text-amber-600" />, bgClassName: "bg-amber-100", label: "Billing Accuracy", value: "98.3%", badge: "+1.2%" },
];

const FinancialDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const activeDashboard = "financial";
  const sortedCards = [...cards].sort((a, b) => parseMetricValue(a.value) - parseMetricValue(b.value));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <DashboardSelector
          activeDashboard={activeDashboard}
          onSelectDashboard={(dashboard) => navigate(`/dashboard/${dashboard}`)}
        />
        <div className="flex-1">
          <DashboardHeader title="Financial/Accounting Dashboard" />
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

export default FinancialDashboardPage;
