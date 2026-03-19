import { useLocation, useNavigate } from "react-router-dom";
import {
  FaUsers,
  FaLayerGroup,
  FaSlidersH,
  FaKeyboard,
  FaProjectDiagram,
} from "react-icons/fa";

type AdminNavItem = {
  id: number;
  name: string;
  path: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

const adminNavItems: AdminNavItem[] = [
  {
    id: 1,
    name: "User Roles",
    path: "/adminhome?section=user-roles",
    description: "Create and manage user roles",
    icon: FaUsers,
  },
  {
    id: 2,
    name: "Report Category",
    path: "/adminhome?section=report-category",
    description: "Manage report categories",
    icon: FaLayerGroup,
  },
  {
    id: 3,
    name: "Report Parameters",
    path: "/adminhome?section=report-parameters",
    description: "Configure report parameters",
    icon: FaSlidersH,
  },
  {
    id: 4,
    name: "Report Entry",
    path: "/adminhome?section=report-entry",
    description: "Add report entries",
    icon: FaKeyboard,
  },
  {
    id: 5,
    name: "Role / Report",
    path: "/adminhome?section=role-report",
    description: "Map roles to reports",
    icon: FaProjectDiagram,
  },
];

const AdminSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActiveRoute = (path: string) => {
    if (path === "/adminhome" && location.pathname === "/adminhome" && !location.search) {
      return true;
    }
    return `${location.pathname}${location.search}` === path;
  };

  return (
    <div className="w-full bg-gradient-to-b from-stone-50 to-white border-r border-stone-200 p-2 sm:p-3 text-stone-700 overflow-y-auto h-full">
      <div className="pt-12">
        <div className="px-4 mb-6">
          <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
            Admin Navigation
          </h2>
        </div>

        <div className="space-y-1">
          {adminNavItems.map((item) => {
            const isActive = isActiveRoute(item.path);

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(item.path)}
                className={`w-full text-left relative px-4 py-2.5 flex items-center transition-all duration-200 rounded-md ${
                  isActive
                    ? "bg-gradient-to-r from-[#7A0000]/12 via-[#7A0000]/7 to-transparent text-[#7A0000]"
                    : "text-stone-600 hover:text-[#7A0000] hover:bg-stone-100/80"
                }`}
              >
                <div className="mr-3 flex-shrink-0">
                  <item.icon
                    className={`w-4 h-4 ${
                      isActive ? "text-[#7A0000]" : "text-stone-400"
                    }`}
                  />
                </div>
                <div className="min-w-0">
                  <div
                    className={`text-sm ${
                      isActive ? "font-semibold" : "font-medium"
                    }`}
                  >
                    {item.name}
                  </div>
                  <div className="text-[11px] text-stone-500 truncate">
                    {item.description}
                  </div>
                </div>
                {isActive && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#7A0000]/30 rounded-l-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AdminSidebar;
