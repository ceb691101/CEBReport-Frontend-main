import { useLocation } from "react-router-dom";
import UserRoles from "../mainTopics/Admin/RepRoles/userroles";
import ReportCategory from "../mainTopics/Admin/ReportCategory/reportcategory";
import RoleReport from "../mainTopics/Admin/RoleReport/rolereport";
import ReportEntry from "../mainTopics/Admin/ReportEntry/reportentry";
import AdminLanding from "../mainTopics/Admin/AdminLanding/adminlanding";
import ReportParameters from "../mainTopics/Admin/ReportParameters/reportparameters";

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
    return <ReportParameters />;
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