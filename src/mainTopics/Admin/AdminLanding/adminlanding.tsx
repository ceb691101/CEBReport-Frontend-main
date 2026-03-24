import { useNavigate } from "react-router-dom";
import { FaUsers, FaLayerGroup, FaKeyboard, FaProjectDiagram } from "react-icons/fa";

type QuickLink = {
  title: string;
  description: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
};

const quickLinks: QuickLink[] = [
  {
    title: "User Roles",
    description: "Create and manage system users, admins, and access groups.",
    path: "/adminhome?section=user-roles",
    icon: FaUsers,
  },
  {
    title: "Report Category",
    description: "Maintain report groups used across the reporting modules.",
    path: "/adminhome?section=report-category",
    icon: FaLayerGroup,
  },
  {
    title: "Report Entry",
    description: "Add and update report definitions available to users.",
    path: "/adminhome?section=report-entry",
    icon: FaKeyboard,
  },
  {
    title: "Role / Report",
    description: "Map report visibility and access rights by selected role.",
    path: "/adminhome?section=role-report",
    icon: FaProjectDiagram,
  },
];

const AdminLanding = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_10%_15%,_rgba(122,0,0,0.16),_transparent_30%),linear-gradient(180deg,_#faf7f2_0%,_#efe6d9_100%)] px-2 py-4 text-stone-900">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[28px] border border-[#7A0000]/15 bg-white p-6 shadow-[0_16px_48px_rgba(122,0,0,0.10)]">
          <h1 className="text-3xl font-semibold tracking-tight text-stone-900">Admin Dashboard</h1>
          <p className="mt-2 max-w-3xl text-sm text-stone-600">
            Welcome to administration. Choose a module below to manage users, reports, and role-based access.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {quickLinks.map((item) => (
            <button
              key={item.title}
              type="button"
              onClick={() => navigate(item.path)}
              className="group rounded-[22px] border border-[#7A0000]/15 bg-white p-5 text-left shadow-[0_10px_28px_rgba(122,0,0,0.08)] transition hover:-translate-y-0.5 hover:border-[#7A0000]/35 hover:shadow-[0_16px_40px_rgba(122,0,0,0.14)]"
            >
              <item.icon className="h-5 w-5 text-[#7A0000]" />
              <h2 className="mt-3 text-lg font-semibold text-stone-900">{item.title}</h2>
              <p className="mt-1 text-sm text-stone-600">{item.description}</p>
              <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-[#7A0000] group-hover:underline">
                Open Section
              </div>
            </button>
          ))}
        </section>
      </div>
    </div>
  );
};

export default AdminLanding;
