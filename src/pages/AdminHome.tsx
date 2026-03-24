import { useLocation } from "react-router-dom";
import UserRoles from "../mainTopics/Admin/RepRoles/userroles";
import ReportCategory from "../mainTopics/Admin/ReportCategory/reportcategory";
import RoleReport from "../mainTopics/Admin/RoleReport/rolereport";
import ReportEntry from "../mainTopics/Admin/ReportEntry/reportentry";
import AdminLanding from "../mainTopics/Admin/AdminLanding/adminlanding";

const AdminHome = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const section = (searchParams.get("section") || "home").trim().toLowerCase();

  if (section === "home") {
    return <AdminLanding />;
  }

  if (section === "user-roles") {
    return <UserRoles />;
  }

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
    return <ReportEntry />;
  }

  if (section === "role-report") {
    return <RoleReport />;
  }

  return <AdminLanding />;
};

export default AdminHome;