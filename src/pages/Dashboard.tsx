import React from "react";
import { useNavigate, useParams } from "react-router-dom";

import DefaultDashboardPage from "../mainTopics/Dashboard/DefaultDashboardPage";
import AnalyticsDashboardPage from "../mainTopics/Dashboard/AnalyticsDashboardPage";
import FinancialDashboardPage from "../mainTopics/Dashboard/FinancialDashboardPage";
import CustomerDashboardPage from "../mainTopics/Dashboard/CustomerDashboardPage";
import OperationsDashboardPage from "../mainTopics/Dashboard/OperationsDashboardPage";
import SolarDashboardPage from "../mainTopics/Dashboard/SolarDashboardPage";
import CollectionsDashboardPage from "../mainTopics/Dashboard/CollectionsDashboardPage";
import ExecutiveDashboardPage from "../mainTopics/Dashboard/ExecutiveDashboardPage";
import InventoryDashboardPage from "../mainTopics/Dashboard/InventoryDashboardPage";

const secondaryDashboardPages: Record<string, React.ComponentType> = {
  analytics: AnalyticsDashboardPage,
  financial: FinancialDashboardPage,
  customer: CustomerDashboardPage,
  operations: OperationsDashboardPage,
  solar: SolarDashboardPage,
  collections: CollectionsDashboardPage,
  executive: ExecutiveDashboardPage,
  inventory: InventoryDashboardPage,
};

const dashboardKeyBySubtopicId: Record<number, string> = {
  2000: "default",
  2001: "financial",
  2002: "customer",
  2003: "operations",
  2004: "analytics",
  2005: "solar",
  2006: "collections",
  2007: "executive",
  2008: "inventory",
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { dashboardId } = useParams<{ dashboardId?: string }>();
  const parsedId = dashboardId ? Number(dashboardId) : NaN;
  const activeDashboard =
    dashboardId == null
      ? "default"
      : dashboardKeyBySubtopicId[parsedId] ?? dashboardId;
  const SecondaryDashboardPage = secondaryDashboardPages[activeDashboard];

  if (activeDashboard === "default") {
    return <DefaultDashboardPage />;
  }

  if (SecondaryDashboardPage) {
    return <SecondaryDashboardPage />;
  }

  return (
    <div className="p-8">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Dashboard Not Found</h1>
        <p className="text-gray-500 mb-4">The selected dashboard is not available.</p>
        <button
          onClick={() => navigate("/dashboard/default")}
          className="px-4 py-2 rounded-lg bg-[var(--ceb-maroon)] text-white text-sm font-medium"
        >
          Back to Default Dashboard
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
