import React from "react";
import { useNavigate } from "react-router-dom";
import { Briefcase, Clock, Zap, Target } from "lucide-react";
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
  { icon: <Briefcase className="w-5 h-5 text-indigo-600" />, bgClassName: "bg-indigo-100", label: "Field Jobs Open", value: "286", badge: "+5.1%" },
  { icon: <Clock className="w-5 h-5 text-blue-600" />, bgClassName: "bg-blue-100", label: "Avg Response Time", value: "1.8h", badge: "-4.0%" },
  { icon: <Zap className="w-5 h-5 text-amber-600" />, bgClassName: "bg-amber-100", label: "Outage Events", value: "34", badge: "-12.2%" },
  { icon: <Target className="w-5 h-5 text-green-600" />, bgClassName: "bg-green-100", label: "SLA Compliance", value: "94.7%", badge: "+2.3%" },
];

const OperationsDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const activeDashboard = "operations";
  const sortedCards = [...cards].sort((a, b) => parseMetricValue(a.value) - parseMetricValue(b.value));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <DashboardSelector
          activeDashboard={activeDashboard}
          onSelectDashboard={(dashboard) => navigate(`/dashboard/${dashboard}`)}
        />
        <div className="flex-1">
          <DashboardHeader title="Operations/Field Dashboard" />
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

export default OperationsDashboardPage;
