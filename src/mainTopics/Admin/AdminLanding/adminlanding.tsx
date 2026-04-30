import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  LayoutGrid,
  FileText,
  SlidersHorizontal,
  FilePlus2,
  GitBranch,
  ArrowRight,
  TrendingUp,
  Activity,
  ChevronRight
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type RoleRecord = {
  roleId: string;
  roleName: string;
  epfNo: string;
  userType: string;
  company: string;
};

type CategoryRecord = {
  catCode: string;
  catName: string;
};

type ReportEntryRecord = {
  repIdNo: number;
  repId: string;
  catCode: string;
  repName: string;
  paramList: string;
  favorite: number;
  active: number;
};

type ParameterRecord = {
  paraName: string;
  populated: boolean;
};

const quickActions = [
  {
    title: "User Roles Management",
    description: "Configure system access and permissions for admin and standard users.",
    path: "/adminhome?section=user-roles",
    icon: Users,
  },
  {
    title: "Report Entry Configuration",
    description: "Create, edit, and manage the core definitions for all system reports.",
    path: "/adminhome?section=report-entry",
    icon: FilePlus2,
  },
  {
    title: "Global Parameters",
    description: "Set and modify application-wide parameters used across reports.",
    path: "/adminhome?section=report-parameters",
    icon: SlidersHorizontal,
  },
  {
    title: "Role & Report Mapping",
    description: "Assign specific report access controls to configured user roles.",
    path: "/adminhome?section=role-report",
    icon: GitBranch,
  },
];

const chartPalette = ["#0f172a", "#334155", "#475569", "#64748b", "#94a3b8", "#cbd5e1"];

const safeText = (value: unknown) => (value ?? "").toString().trim();

const formatCompactNumber = (value: number) =>
  new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);

const normalizeKey = (value: unknown) => (value ?? "").toString().trim().toUpperCase();

const AdminLanding = () => {
  const navigate = useNavigate();
  const [adminRoles, setAdminRoles] = useState<RoleRecord[]>([]);
  const [userRoles, setUserRoles] = useState<RoleRecord[]>([]);
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [entries, setEntries] = useState<ReportEntryRecord[]>([]);
  const [parameters, setParameters] = useState<ParameterRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchList = async (url: string) => {
      const response = await fetch(url);
      const payload = await response.json();
      if (!response.ok) throw new Error(`Request failed (${response.status})`);
      if (payload?.errorMessage) throw new Error(payload.errorMessage);
      return Array.isArray(payload?.data) ? payload.data : [];
    };

    const loadDashboard = async () => {
      setIsLoading(true);

      const requests = [
        { key: "adminRoles", url: "/roleadminapi/api/roleinfo/admin" },
        { key: "userRoles", url: "/roleadminapi/api/roleinfo/user" },
        { key: "categories", url: "/roleadminapi/api/reportcategory" },
        { key: "entries", url: "/roleadminapi/api/reportentry" },
        { key: "parameters", url: "/roleadminapi/api/reppara/GET_REPORTPARAMS" },
      ] as const;

      const settled = await Promise.allSettled(requests.map((request) => fetchList(request.url)));

      if (cancelled) return;

      let nextAdminRoles: RoleRecord[] = [];
      let nextUserRoles: RoleRecord[] = [];
      let nextCategories: CategoryRecord[] = [];
      let nextEntries: ReportEntryRecord[] = [];
      let nextParameters: ParameterRecord[] = [];

      settled.forEach((result, index) => {
        const request = requests[index];

        if (result.status === "fulfilled") {
          const payload = result.value;

          if (request.key === "adminRoles") {
            nextAdminRoles = payload.map((item: any) => ({
              roleId: safeText(item?.RoleId ?? item?.roleId ?? item?.EpfNo),
              roleName: safeText(item?.RoleName ?? item?.roleName ?? item?.UserName),
              epfNo: safeText(item?.EpfNo ?? item?.epfNo),
              userType: safeText(item?.UserType ?? item?.userType ?? "ADMIN"),
              company: safeText(item?.Company ?? item?.company),
            }));
          }

          if (request.key === "userRoles") {
            nextUserRoles = payload.map((item: any) => ({
              roleId: safeText(item?.RoleId ?? item?.roleId ?? item?.EpfNo),
              roleName: safeText(item?.RoleName ?? item?.roleName ?? item?.UserName),
              epfNo: safeText(item?.EpfNo ?? item?.epfNo),
              userType: safeText(item?.UserType ?? item?.userType ?? "USER"),
              company: safeText(item?.Company ?? item?.company),
            }));
          }

          if (request.key === "categories") {
            nextCategories = payload.map((item: any) => ({
              catCode: safeText(item?.CatCode ?? item?.catCode),
              catName: safeText(item?.CatName ?? item?.catName),
            }));
          }

          if (request.key === "entries") {
            nextEntries = payload.map((item: any) => ({
              repIdNo: Number(item?.RepIdNo ?? item?.repIdNo ?? 0),
              repId: safeText(item?.RepId ?? item?.repId),
              catCode: safeText(item?.CatCode ?? item?.catCode),
              repName: safeText(item?.RepName ?? item?.repName),
              paramList: safeText(item?.ParamList ?? item?.paramList),
              favorite: Number(item?.Favorite ?? item?.favorite ?? 0),
              active: Number(item?.Active ?? item?.active ?? 0),
            }));
          }

          if (request.key === "parameters") {
            nextParameters = payload.map((item: any) => ({
              paraName: safeText(item?.ParaName ?? item?.paraName),
              populated: Boolean(item?.Populated ?? item?.populated ?? false),
            }));
          }
        }
      });

      setAdminRoles(nextAdminRoles);
      setUserRoles(nextUserRoles);
      setCategories(nextCategories);
      setEntries(nextEntries);
      setParameters(nextParameters);
      setIsLoading(false);
    };

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  const totalUsers = useMemo(() => {
    const unique = new Set<string>();
    [...adminRoles, ...userRoles].forEach((role) => {
      unique.add(normalizeKey(role.roleId || role.epfNo));
    });
    return unique.size;
  }, [adminRoles, userRoles]);

  const topReportRows = useMemo(() => {
    const sorted = [...entries].sort((a, b) => {
      const scoreA = (a.favorite > 0 ? 6 : 0) + (a.active > 0 ? 4 : 0) + (a.paramList ? 2 : 0);
      const scoreB = (b.favorite > 0 ? 6 : 0) + (b.active > 0 ? 4 : 0) + (b.paramList ? 2 : 0);
      return scoreB - scoreA || a.repName.localeCompare(b.repName);
    });
    
    return sorted.slice(0, 6).map((report) => ({
      name: report.repName || report.repId || "Report",
      score: (report.favorite > 0 ? 6 : 0) + (report.active > 0 ? 4 : 0) + (report.paramList ? 2 : 0),
    }));
  }, [entries]);

  const categoryReportData = useMemo(() => {
    const counts = categories.map((category) => {
      const value = entries.filter(
        (entry) => normalizeKey(entry.catCode) === normalizeKey(category.catCode)
      ).length;

      return {
        name: category.catName || category.catCode || "Category",
        value,
      };
    });

    return counts.filter((item) => item.value > 0).sort((a, b) => b.value - a.value);
  }, [categories, entries]);

  const reportStatusData = useMemo(() => {
    return [
      { name: "Active", value: entries.filter(e => e.active > 0).length },
      { name: "Inactive", value: entries.filter(e => e.active <= 0).length },
      { name: "Favorited", value: entries.filter(e => e.favorite > 0).length },
    ];
  }, [entries]);

  const kpiCards = [
    {
      label: "Total Registered Users",
      value: formatCompactNumber(totalUsers),
      icon: Users,
      bgColor: "bg-[#f0f9ff]",
      borderColor: "border-[#e0f2fe]",
      iconColor: "text-[#0284c7]",
    },
    {
      label: "Report Categories",
      value: formatCompactNumber(categories.length),
      icon: LayoutGrid,
      bgColor: "bg-[#f5f3ff]",
      borderColor: "border-[#ede9fe]",
      iconColor: "text-[#7c3aed]",
    },
    {
      label: "Active Report Entries",
      value: formatCompactNumber(entries.length),
      icon: FileText,
      bgColor: "bg-[#ecfdf5]",
      borderColor: "border-[#d1fae5]",
      iconColor: "text-[#059669]",
    },
    {
      label: "System Parameters",
      value: formatCompactNumber(parameters.length),
      icon: SlidersHorizontal,
      bgColor: "bg-[#fffbeb]",
      borderColor: "border-[#fef3c7]",
      iconColor: "text-[#d97706]",
    },
  ];

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(122,0,0,0.08),_transparent_35%),linear-gradient(180deg,_#faf7f2_0%,_#f3efe7_100%)]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-slate-200 border-t-[#7A0000]" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(122,0,0,0.08),_transparent_35%),linear-gradient(180deg,_#faf7f2_0%,_#f3efe7_100%)] px-4 py-8 sm:px-6 lg:px-8 text-stone-900">
      <div className="mx-auto max-w-7xl space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-5">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Administration Overview</h1>
            <p className="mt-1 text-sm text-slate-500">System metrics and configuration management.</p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpiCards.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.label} className={`flex flex-col justify-between rounded-xl p-5 shadow-sm border ${kpi.bgColor} ${kpi.borderColor}`}>
                <div className="flex items-start justify-between">
                  <p className="text-sm font-medium text-slate-700">{kpi.label}</p>
                  <Icon className={`h-5 w-5 ${kpi.iconColor}`} />
                </div>
                <div className="mt-4">
                  <h2 className="text-3xl font-semibold tracking-tight text-slate-900">{kpi.value}</h2>
                </div>
              </div>
            );
          })}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* New Bar Chart: Report Status Overview */}
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Report Status Overview</h3>
            </div>
            <div className="h-[280px] w-full">
              {reportStatusData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportStatusData} margin={{ top: 10, right: 10, left: -25, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 12, fill: "#64748b" }} 
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 12, fill: "#64748b" }} 
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      cursor={{ fill: '#f1f5f9' }}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={48}>
                      {reportStatusData.map((_, index) => {
                        const vibrantPalette = ["#10b981", "#94a3b8", "#f59e0b"]; // Emerald, Slate, Amber
                        return <Cell key={`cell-${index}`} fill={vibrantPalette[index % vibrantPalette.length]} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">
                  No data available
                </div>
              )}
            </div>
          </div>
          {/* Categories */}
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Category Distribution</h3>
            </div>
            <div className="flex h-[280px] w-full items-center justify-center">
              {categoryReportData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryReportData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={110}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {categoryReportData.map((_, index) => {
                        const vibrantPalette = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#14b8a6"];
                        return <Cell key={`cell-${index}`} fill={vibrantPalette[index % vibrantPalette.length]} />;
                      })}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ fontWeight: 500, color: '#0f172a' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-sm text-slate-400">
                  No data available
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions (Moved to bottom, elegant horizontal style) */}
        <div className="pt-4 pb-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              const iconStyles = [
                "bg-sky-50 text-sky-600",
                "bg-indigo-50 text-indigo-600",
                "bg-fuchsia-50 text-fuchsia-600",
                "bg-emerald-50 text-emerald-600"
              ];
              
              return (
                <button
                  key={action.title}
                  onClick={() => navigate(action.path)}
                  className="group flex items-center justify-between rounded-2xl bg-white px-5 py-4 shadow-[0_2px_10px_rgba(15,23,42,0.04)] ring-1 ring-slate-100 transition-all hover:ring-slate-200 hover:shadow-[0_4px_14px_rgba(15,23,42,0.06)] w-full text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconStyles[index]}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="font-semibold text-slate-800 text-sm tracking-tight">{action.title}</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-slate-400" />
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminLanding;
