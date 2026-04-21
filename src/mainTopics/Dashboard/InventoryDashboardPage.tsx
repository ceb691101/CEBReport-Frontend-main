import React from "react";
import { useNavigate } from "react-router-dom";
import { Briefcase, AlertCircle, Clock, DollarSign } from "lucide-react";
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
  { icon: <Briefcase className="w-5 h-5 text-slate-600" />, bgClassName: "bg-slate-100", label: "Stock On Hand", value: "12,460", badge: "+2.8%" },
  { icon: <AlertCircle className="w-5 h-5 text-red-600" />, bgClassName: "bg-red-100", label: "Low Stock Items", value: "38", badge: "-9.5%" },
  { icon: <Clock className="w-5 h-5 text-blue-600" />, bgClassName: "bg-blue-100", label: "Avg Lead Time", value: "5.6 days", badge: "-1.1%" },
  { icon: <DollarSign className="w-5 h-5 text-green-600" />, bgClassName: "bg-green-100", label: "Procurement Spend", value: "LKR 6.9M", badge: "+4.7%" },
];

const InventoryDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const activeDashboard = "inventory";
  const sortedCards = [...cards].sort((a, b) => parseMetricValue(a.value) - parseMetricValue(b.value));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <DashboardSelector
          activeDashboard={activeDashboard}
          onSelectDashboard={(dashboard) => navigate(`/dashboard/${dashboard}`)}
        />
        <div className="flex-1">
          <DashboardHeader title="Inventory & Procurement Dashboard" />
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

export default InventoryDashboardPage;
