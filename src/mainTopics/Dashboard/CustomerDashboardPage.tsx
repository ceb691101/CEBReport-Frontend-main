import React from "react";
import { useNavigate } from "react-router-dom";
import { Users, Plus, AlertCircle, Clock } from "lucide-react";
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
  { icon: <Users className="w-5 h-5 text-blue-600" />, bgClassName: "bg-blue-100", label: "Active Customers", value: "168,420", badge: "+3.9%" },
  { icon: <Plus className="w-5 h-5 text-lime-600" />, bgClassName: "bg-lime-100", label: "New Connections", value: "1,842", badge: "+11.3%" },
  { icon: <AlertCircle className="w-5 h-5 text-red-600" />, bgClassName: "bg-red-100", label: "Disconnection Cases", value: "412", badge: "-1.8%" },
  { icon: <Clock className="w-5 h-5 text-cyan-600" />, bgClassName: "bg-cyan-100", label: "Avg Service Time", value: "2.1 days", badge: "-6.5%" },
];

const CustomerDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const activeDashboard = "customer";
  const sortedCards = [...cards].sort((a, b) => parseMetricValue(a.value) - parseMetricValue(b.value));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <DashboardSelector
          activeDashboard={activeDashboard}
          onSelectDashboard={(dashboard) => navigate(`/dashboard/${dashboard}`)}
        />
        <div className="flex-1">
          <DashboardHeader title="Customer Management Dashboard" />
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

export default CustomerDashboardPage;
