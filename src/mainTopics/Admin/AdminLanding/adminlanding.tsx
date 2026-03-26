import { useNavigate } from "react-router-dom";
import { Users, Folder, FileText, Network, ArrowRight, Shield, TrendingUp, PieChart, BarChart3, Zap } from "lucide-react";
import { useState, useEffect } from "react";
import { PieChart as ReChartsPieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";

type QuickLink = {
  title: string;
  description: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
};

type StatCard = {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  bgColor: string;
  textColor: string;
  trend?: string;
};

const quickLinks: QuickLink[] = [
  {
    title: "User Roles",
    description: "Create and manage system users, admins, and access groups.",
    path: "/adminhome?section=user-roles",
    icon: Users,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    title: "Report Category",
    description: "Maintain report groups used across the reporting modules.",
    path: "/adminhome?section=report-category",
    icon: Folder,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
  },
  {
    title: "Report Entry",
    description: "Add and update report definitions available to users.",
    path: "/adminhome?section=report-entry",
    icon: FileText,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
  },
  {
    title: "Role / Report",
    description: "Map report visibility and access rights by selected role.",
    path: "/adminhome?section=role-report",
    icon: Network,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
];

const CATEGORY_COLORS = ["#7A0000", "#620000", "#A5522D", "#D4A574", "#C4915A", "#AD7E4A"];
const ROLE_COLORS = ["#7A0000", "#B45309"];

const AdminLanding = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<StatCard[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [barData, setBarData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [userBreakdown, setUserBreakdown] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const roleTotal = userBreakdown.reduce((sum: number, role: any) => sum + role.value, 0);
  const hasUserData = roleTotal > 0;

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch categories
        const categoriesRes = await fetch("/roleadminapi/api/reportcategory");
        const categoriesData = await categoriesRes.json();
        const categories = Array.isArray(categoriesData?.data) ? categoriesData.data : [];

        // Fetch report entries
        const reportsRes = await fetch("/roleadminapi/api/reportentry");
        const reportsData = await reportsRes.json();
        const reports = Array.isArray(reportsData?.data) ? reportsData.data : [];

        // Process category data for pie chart
        const categoryCount = categories.length;
        const categoriesWithReports = categories.map((cat: any) => ({
          name: cat.CatName || cat.catName || cat.catCode || "Unknown",
          value: reports.filter((r: any) => r.catCode === (cat.CatCode || cat.catCode)).length || 0,
        }));

        const filtered = categoriesWithReports.filter((c: any) => c.value > 0);
        setCategoryData(filtered);
        // prepare bar chart data (top categories)
        setBarData(filtered.slice(0, 8).map((c: any) => ({ name: c.name, value: c.value })));

        // Process reports for statistics
        const activeReports = reports.filter((r: any) => r.active === 1).length;
        const favoriteReports = reports.filter((r: any) => r.favorite === 1).length;

        // Generate trend data (simulated based on report count)
        const trendChartData = [
          { week: "Week 1", reports: Math.floor(reports.length * 0.6), active: Math.floor(activeReports * 0.6) },
          { week: "Week 2", reports: Math.floor(reports.length * 0.75), active: Math.floor(activeReports * 0.75) },
          { week: "Week 3", reports: Math.floor(reports.length * 0.9), active: Math.floor(activeReports * 0.85) },
          { week: "Week 4", reports: reports.length, active: activeReports },
        ];
        setTrendData(trendChartData);

        // Set dashboard stats with real data
        // Fetch user counts for Total Users and breakdown
        try {
          const adminRes = await fetch("/roleadminapi/api/roleinfo/admin");
          const adminData = await adminRes.json();
          const adminList = Array.isArray(adminData?.data) ? adminData.data : (Array.isArray(adminData) ? adminData : []);

          const userRes = await fetch("/roleadminapi/api/roleinfo/user");
          const userData = await userRes.json();
          const userList = Array.isArray(userData?.data) ? userData.data : (Array.isArray(userData) ? userData : []);

          const adminCount = adminList.length || 0;
          const normalCount = userList.length || 0;
          const totalUsers = adminCount + normalCount;

          setUserBreakdown([
            { name: "Admins", value: adminCount },
            { name: "Users", value: normalCount },
          ]);

          const dashboardStats: StatCard[] = [
            {
              label: "Total Users",
              value: totalUsers,
              icon: Users,
              bgColor: "bg-blue-50",
              textColor: "text-blue-700",
              trend: `${adminCount} admins`,
            },
            {
              label: "Total Reports",
              value: reports.length,
              icon: FileText,
              bgColor: "bg-emerald-50",
              textColor: "text-emerald-700",
              trend: `${activeReports} active`,
            },
          {
            label: "Report Categories",
            value: categories.length,
            icon: Folder,
            bgColor: "bg-amber-50",
            textColor: "text-amber-700",
            trend: `${categoryCount} configured`,
          },
          {
            label: "Favorite Reports",
            value: favoriteReports,
            icon: TrendingUp,
            bgColor: "bg-pink-50",
            textColor: "text-pink-700",
            trend: `${reports.length > 0 ? ((favoriteReports / reports.length) * 100).toFixed(0) : 0}% of total`,
          },
        ];
        setStats(dashboardStats);
        } catch {
          // If user fetch fails, still show report stats with zeroed user breakdown
          setUserBreakdown([
            { name: "Admins", value: 0 },
            { name: "Users", value: 0 },
          ]);
          const dashboardStats: StatCard[] = [
            {
              label: "Total Users",
              value: 0,
              icon: Users,
              bgColor: "bg-blue-50",
              textColor: "text-blue-700",
              trend: "0 admins",
            },
            {
              label: "Total Reports",
              value: reports.length,
              icon: FileText,
              bgColor: "bg-emerald-50",
              textColor: "text-emerald-700",
              trend: `${activeReports} active`,
            },
            {
              label: "Report Categories",
              value: categories.length,
              icon: Folder,
              bgColor: "bg-amber-50",
              textColor: "text-amber-700",
              trend: `${categoryCount} configured`,
            },
            {
              label: "Favorite Reports",
              value: favoriteReports,
              icon: TrendingUp,
              bgColor: "bg-pink-50",
              textColor: "text-pink-700",
              trend: `${reports.length > 0 ? ((favoriteReports / reports.length) * 100).toFixed(0) : 0}% of total`,
            },
          ];
          setStats(dashboardStats);
        }
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
        // Fallback to default stats if API fails
        setUserBreakdown([
          { name: "Admins", value: 0 },
          { name: "Users", value: 0 },
        ]);
        const defaultStats: StatCard[] = [
          {
            label: "Total Users",
            value: 0,
            icon: Users,
            bgColor: "bg-blue-50",
            textColor: "text-blue-700",
            trend: "0 admins",
          },
          {
            label: "Total Reports",
            value: 0,
            icon: FileText,
            bgColor: "bg-emerald-50",
            textColor: "text-emerald-700",
            trend: "0 active",
          },
          {
            label: "Report Categories",
            value: 0,
            icon: Folder,
            bgColor: "bg-amber-50",
            textColor: "text-amber-700",
            trend: "0 configured",
          },
          {
            label: "Favorite Reports",
            value: 0,
            icon: TrendingUp,
            bgColor: "bg-pink-50",
            textColor: "text-pink-700",
            trend: "0% of total",
          },
        ];
        setStats(defaultStats);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(122,0,0,0.12),_transparent_40%),radial-gradient(circle_at_85%_10%,_rgba(16,185,129,0.08),_transparent_35%),linear-gradient(180deg,_#fbf8f4_0%,_#f4efe7_100%)] px-3 py-6 text-stone-900 sm:px-4">
      <div className="mx-auto max-w-7xl space-y-10">
        {/* Header Section */}
        <section className="rounded-[28px] border border-stone-200/80 bg-white/75 p-5 shadow-[0_12px_35px_rgba(41,30,18,0.06)] backdrop-blur-sm sm:p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-[#7A0000]/10 p-3.5">
              <Shield className="h-6 w-6 text-[#7A0000]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">Admin Dashboard</h1>
              <p className="mt-1 text-sm text-stone-600 sm:text-base">Real-time system overview and management</p>
            </div>
          </div>
        </section>

        {/* Quick Stats Section */}
        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, idx) => (
            <div
              key={stat.label}
              className={`group rounded-[24px] border border-stone-200/90 ${stat.bgColor} p-6 shadow-[0_10px_26px_rgba(70,40,20,0.06)] transition-all duration-300 hover:shadow-[0_16px_40px_rgba(70,40,20,0.14)] hover:-translate-y-1 overflow-hidden relative`}
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-5 transition-opacity"></div>
              <div className="flex items-start justify-between relative z-10">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-stone-600">{stat.label}</p>
                  <h3 className={`mt-3 text-4xl font-bold ${stat.textColor} transition-transform group-hover:scale-105`}>{stat.value}</h3>
                  {stat.trend && <p className="mt-2 text-xs font-medium text-stone-700 flex items-center gap-1"><Zap className="h-3 w-3" /> {stat.trend}</p>}
                </div>
                <div className={`h-12 w-12 rounded-full ${stat.bgColor} flex items-center justify-center transition-transform group-hover:scale-110 group-hover:rotate-12`}>
                  <stat.icon className={`h-6 w-6 ${stat.textColor}`} />
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* Topic Section removed per request */}

        {/* Charts Section */}
        {!isLoading && (
          <section className="grid gap-6">
            <div className="flex items-end justify-between px-1">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-stone-900 sm:text-2xl">Analytics Overview</h2>
                <p className="text-sm text-stone-600">Role metrics, trends, and category performance</p>
              </div>
            </div>

            <div className="order-2 grid gap-6 lg:grid-cols-2">
              {/* Users by Role (left) */}
              {userBreakdown.length > 0 && (
                <div className="rounded-[28px] border border-stone-200 bg-white p-8 shadow-[0_12px_40px_rgba(70,40,20,0.04)]">
                  <div className="mb-6 flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-stone-900">Users by Role</h2>
                      <p className="text-sm text-stone-500">Role distribution across the system</p>
                    </div>
                    <div className="rounded-xl bg-stone-100 px-3 py-2 text-right">
                      <p className="text-[11px] uppercase tracking-wider text-stone-500">Total Users</p>
                      <p className="text-lg font-bold text-stone-900">{roleTotal}</p>
                    </div>
                  </div>

                  <div className="relative">
                    <ResponsiveContainer width="100%" height={300}>
                      <ReChartsPieChart>
                        <Pie
                          data={userBreakdown}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={120}
                          innerRadius={70}
                          paddingAngle={3}
                          isAnimationActive
                        >
                          {userBreakdown.map((_: any, index: number) => (
                            <Cell key={`user-cell-${index}`} fill={ROLE_COLORS[index % ROLE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: any) => `${value} users`} />
                      </ReChartsPieChart>
                    </ResponsiveContainer>

                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Active Roles</p>
                        <p className="text-3xl font-bold text-stone-900">{hasUserData ? userBreakdown.length : 0}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-3">
                    {userBreakdown.map((u: any, i: number) => (
                      <div key={u.name} className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2">
                        <div className="flex items-center gap-2.5">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: ROLE_COLORS[i % ROLE_COLORS.length] }}></div>
                          <span className="text-sm font-semibold text-stone-700">{u.name}</span>
                        </div>
                        <p className="mt-1 text-lg font-bold text-stone-900">{u.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* System Trends (right) */}
              {trendData.length > 0 && (
                <div className="rounded-[28px] border border-stone-200 bg-gradient-to-br from-white to-stone-50/50 p-8 shadow-[0_16px_50px_rgba(70,40,20,0.06)] hover:shadow-[0_24px_60px_rgba(70,40,20,0.1)] transition-all duration-300">
                  <div className="mb-8 flex items-center justify-between">
                    <div className="space-y-2">
                      <h2 className="text-2xl font-bold text-stone-900">System Trends</h2>
                      <p className="text-sm text-stone-600">Weekly report activity and status overview</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                      <BarChart3 className="h-6 w-6 text-emerald-600" />
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={320}>
                    <AreaChart data={trendData} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorReports" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#7A0000" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#7A0000" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e0" vertical={false} />
                      <XAxis dataKey="week" stroke="#78716c" style={{ fontSize: "12px" }} />
                      <YAxis stroke="#78716c" style={{ fontSize: "12px" }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#ffffff",
                          border: "2px solid #d6d3d1",
                          borderRadius: "12px",
                          boxShadow: "0 8px 16px rgba(0,0,0,0.1)"
                        }}
                        cursor={{ fill: "rgba(122,0,0,0.05)" }}
                      />
                      <Legend wrapperStyle={{ paddingTop: "20px" }} />
                      <Area
                        type="monotone"
                        dataKey="reports"
                        stroke="#7A0000"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorReports)"
                        name="Total Reports"
                        isAnimationActive={true}
                      />
                      <Area
                        type="monotone"
                        dataKey="active"
                        stroke="#16a34a"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorActive)"
                        name="Active Reports"
                        isAnimationActive={true}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Reports by Category */}
            {categoryData.length > 0 && (
              <div className="order-1 rounded-[28px] border border-stone-200 bg-gradient-to-br from-white to-stone-50/50 p-8 shadow-[0_16px_50px_rgba(70,40,20,0.06)] hover:shadow-[0_24px_60px_rgba(70,40,20,0.1)] transition-all duration-300">
                <div className="mb-8 flex items-center justify-between">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-stone-900">Reports by Category</h2>
                    <p className="text-sm text-stone-600">Visual distribution of reports across all categories</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                    <PieChart className="h-6 w-6 text-amber-600" />
                  </div>
                </div>
                <div className="relative">
                  <ResponsiveContainer width="100%" height={320}>
                    <ReChartsPieChart>
                      <Pie
                        data={categoryData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={110}
                        innerRadius={60}
                        paddingAngle={2}
                        isAnimationActive
                      >
                        {categoryData.map((_: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: any) => `${value} reports`}
                        contentStyle={{
                          backgroundColor: "#ffffff",
                          border: "2px solid #e7e5e0",
                          borderRadius: "12px",
                          boxShadow: "0 8px 16px rgba(0,0,0,0.1)"
                        }}
                      />
                    </ReChartsPieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <p className="text-sm font-semibold text-stone-600">Total</p>
                      <p className="text-2xl font-bold text-stone-900">{categoryData.reduce((sum: number, c: any) => sum + c.value, 0)}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-6 grid gap-4">
                  <div className="w-full">
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={barData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f2f1" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-25} textAnchor="end" height={46} />
                        <YAxis />
                        <Tooltip contentStyle={{ backgroundColor: "#fff", borderRadius: 8, border: "1px solid #e7e5e0" }} />
                        <Bar dataKey="value" fill="#7A0000" radius={[6,6,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {categoryData.slice(0, 4).map((cat: any, idx: number) => (
                      <div key={cat.name} className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }}></div>
                        <span className="text-xs text-stone-600">{cat.name.substring(0, 18)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Quick Access cards */}
        {quickLinks.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-end justify-between px-1">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-stone-900 sm:text-2xl">Quick Access</h2>
                <p className="text-sm text-stone-600">Jump straight into key administration modules</p>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {quickLinks.map((item) => (
              <button
                key={`quick-${item.title}`}
                type="button"
                onClick={() => navigate(item.path)}
                className="group rounded-[22px] border border-stone-200/80 bg-gradient-to-b from-white to-stone-50/40 p-6 shadow-[0_10px_28px_rgba(15,23,42,0.06)] hover:shadow-[0_14px_36px_rgba(15,23,42,0.12)] transition-all duration-300 hover:-translate-y-1 text-left"
              >
                <div className="flex items-start justify-between">
                  <div className={`rounded-xl p-3 ${item.bgColor} transition-transform group-hover:scale-105`}>
                    <item.icon className={`h-6 w-6 ${item.color}`} />
                  </div>
                  <div className="rounded-full bg-white/80 p-1.5 shadow-sm">
                    <ArrowRight className={`h-4 w-4 ${item.color} opacity-70 transition-all group-hover:opacity-100 group-hover:translate-x-0.5`} />
                  </div>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-stone-900">{item.title}</h3>
                <p className="mt-2 text-sm text-stone-600 leading-relaxed">{item.description}</p>
              </button>
            ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
};

export default AdminLanding;
