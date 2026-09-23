import {Routes, Route, Navigate, useLocation, useNavigate} from "react-router-dom";
import { useEffect } from "react";
import { useUser } from "./contexts/UserContext";
import { useLogged } from "./contexts/UserLoggedStateContext";
import {ToastContainer} from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./index.css";

import LoginPage from "./pages/LoginPage";
import Layout from "./Layout";
import UserDetails from "./pages/UserDetails";
import MaterialDetails from "./mainTopics/inventory/MaterialDetails";
import ReportRoutes from "./routes/ReportRoutes";
import CostCenterTrial from "./mainTopics/TrialBalance/CostCenterTrial";
// import SelectCostCenterTrial from "./mainTopics/TrialBalance/SelectCostCeneterTrial";

import AdminHome from "./pages/AdminHome";
import Dashboard from "./pages/Dashboard.tsx";

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { setUser } = useUser();
  const { setLogged } = useLogged();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const username = params.get("username");
    
    if (username) {
      const fetchUserData = async () => {
        let level = 0;
        let company = "";
        let areaCode = "";
        let areaName = "";
        let provCode = "";
        let provName = "";
        let regCode = "";
        let regName = "";

        try {
          const billMapRes = await fetch(`http://localhost:44381/api/billmap/${username.trim()}`);
          if (billMapRes.ok) {
            const billMapData = await billMapRes.json();
            const entry = Array.isArray(billMapData) ? billMapData[0] : null;
            if (entry) {
              level = parseInt(entry.LevelNo, 10) || 0;
              const code = (entry.BillMap || "").trim();
              const name = (entry.CompanyName || "").trim();
              
              if (level >= 80) {
                // top level
              } else if (level >= 70) {
                regCode = code; regName = name;
              } else if (level >= 60) {
                provCode = code; provName = name;
              } else {
                areaCode = code; areaName = name;
              }
            }
          }
        } catch (err) {
          console.error("Could not load BillMap:", err);
        }

        try {
          const userRoleRes = await fetch(`http://localhost:44381/api/userrole/${username.trim()}`);
          if (userRoleRes.ok) {
            const userRoleData = await userRoleRes.json();
            const roleList = Array.isArray(userRoleData?.data) ? userRoleData.data : [];
            if (roleList.length > 0 && roleList[0]?.COMPANY) {
              company = String(roleList[0].COMPANY).trim();
            }
          }
        } catch (err) {
          console.error("Could not load user role info:", err);
        }

        setUser({
          Userno: username,
          Name: username,
          Logged: true,
          Level: level,
          Company: company,
          AreaCode: areaCode,
          AreaName: areaName,
          ProvinceCode: provCode,
          ProvinceName: provName,
          RegionCode: regCode,
          RegionName: regName,
        } as any);
        
        setLogged({ Logged: true, Errormsg: "" });
        navigate("/dashboard", { replace: true });
      };

      fetchUserData();
    }
  }, [location, setUser, setLogged, navigate]);

	return (
		<>
			<Routes>
				<Route path="/" element={<LoginPage />} />

        <Route
          path="/adminhome"
          element={
            <Layout>
              <AdminHome />
            </Layout>
          }
        />

				<Route
					path="/adminprofile"
					element={
						<Layout>
							<UserDetails />
						</Layout>
					}
				/>

				<Route
					path="/home"
					element={<Navigate to="/report/report-catalog" replace />}
				/>

				<Route
					path="/dashboard"
					element={
						<Layout>
							<Dashboard />
						</Layout>
					}
				/>

				<Route
					path="/dashboard/:dashboardId"
					element={
						<Layout>
							<Dashboard />
						</Layout>
					}
				/>

				{/* <Route
					path="/report/dashboard"
					element={
						<Layout>
							<HomePage />
						</Layout>
					}
				/>

				<Route
					path="/report/Dashboard"
					element={
						<Layout>
							<HomePage />
						</Layout>
					}
				/> */}

				<Route
					path="/user"
					element={
						<Layout>
							<UserDetails />
						</Layout>
					}
				/>

				<Route
					path="/report/inventory/material-details/:matCd"
					element={
						<Layout>
							<MaterialDetails />
						</Layout>
					}
				/>

				<Route
					path="/report/TrialBalance/costcenters"
					element={
						<Layout>
							<CostCenterTrial />
						</Layout>
					}
				/>

				{/* <Route
  path="/report/TrialBalance/select-cost-center/:compId"
  element={
    <Layout>
      <SelectCostCenterTrial />
    </Layout>
  }
/> */}

				{ReportRoutes()}
			</Routes>

			<ToastContainer />
		</>
	);
}

export default App;
