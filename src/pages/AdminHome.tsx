import { useLocation } from "react-router-dom";
import UserRoles from "../mainTopics/Admin/RepRoles/userroles";
import ReportCategory from "../mainTopics/Admin/ReportCategory/reportcategory";

const AdminHome = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const section = (searchParams.get("section") || "user-roles").trim().toLowerCase();

  if (section === "report-category") {
    return <ReportCategory />;
  }

  if (section === "report-parameters") {
    return (
      <div className="p-6 bg-white rounded-lg text-center">
        <h2 className="text-2xl font-bold text-stone-800">Report Parameters</h2>
        <p className="text-stone-600 mt-2">Coming Soon</p>
      </div>
    );
  }

  if (section === "report-entry") {
    return (
      <div className="p-6 bg-white rounded-lg text-center">
        <h2 className="text-2xl font-bold text-stone-800">Report Entry</h2>
        <p className="text-stone-600 mt-2">Coming Soon</p>
      </div>
    );
  }

  if (section === "role-report") {
    return (
      <div className="p-6 bg-white rounded-lg text-center">
        <h2 className="text-2xl font-bold text-stone-800">Role / Report</h2>
        <p className="text-stone-600 mt-2">Coming Soon</p>
      </div>
    );
  }

  return <UserRoles />;
};

export default AdminHome;