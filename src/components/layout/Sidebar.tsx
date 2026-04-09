import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { data } from "../../data/SideBarData";

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeId, setActiveId] = useState<number | null>(null);

  const handleClick = (id: number, path: string, subtopics: any[]) => {
    setActiveId(id);
    navigate(path, { state: { subtopics } });
  };

  useEffect(() => {
    const currentPath = location.pathname;
    
    // // Special handling for home page - don't redirect and clear activeId
    // if (currentPath === "/dashboard") {
    //   setActiveId(null); // Clear any active selection
    //   return; // Exit early, don't interfere with home page
    // }
    
    const matchedTopic = data.find((topic) => topic.path === currentPath);

    if (matchedTopic) {
      if (activeId !== matchedTopic.id) {
        setActiveId(matchedTopic.id);
      }
    } else {
      // Check if the current path starts with any of the known paths
      const matchingTopic = data.find((topic) =>
        currentPath.startsWith(topic.path)
      );
      if (matchingTopic) {
        setActiveId(matchingTopic.id);
      } else {
        // Don't redirect for certain special paths like report display pages
        const specialPaths = ["/report-display", "/user"];
        if (!specialPaths.includes(currentPath)) {
          // Only redirect to first item if we're on a completely unknown path
          const first = data[0];
          setActiveId(first.id);
          navigate(first.path, { state: { subtopics: first.subtopics } });
        }
      }
    }
  }, [location.pathname]);

  return (
    <div className="w-full bg-gradient-to-b from-gray-50 to-white border-r border-gray-100 p-2 sm:p-3 text-gray-700 font-normal cursor-pointer overflow-y-auto h-full">
      <div className="pt-12">
        <div className="px-4 mb-6">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Main Navigation
          </h2>
        </div>
        <div className="space-y-0.5">
          {data.map((topic) => {
            const isActive = activeId === topic.id;

            return (
              <div key={topic.id} className="relative">
                <div
                  className={`relative px-4 py-2.5 cursor-pointer flex items-center transition-all duration-200 ${
                    isActive
                      ? "bg-gradient-to-r from-[#800000]/10 via-[#800000]/5 to-transparent text-[#800000] border-l-2 border-[#800000]"
                      : "text-gray-600 hover:text-[#800000] hover:bg-gray-50/80"
                  }`}
                  onClick={() =>
                    handleClick(topic.id, topic.path, topic.subtopics)
                  }
                >
                  <div className="flex items-center w-full">
                    <div className="flex-shrink-0 mr-3">
                      <topic.icon
                        className={`w-4 h-4 transition-colors duration-200 ${
                          isActive ? "text-[#800000]" : "text-gray-400"
                        }`}
                      />
                    </div>
                    <div
                      className={`text-sm tracking-wide transition-all duration-200 ${
                        isActive ? "font-medium" : "font-normal"
                      }`}
                    >
                      {topic.name}
                    </div>
                  </div>
                  {isActive && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#800000]/20 rounded-l-full" />
                  )}
                </div>
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-[#800000]/5 to-transparent" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;