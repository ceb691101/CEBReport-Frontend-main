import { Shield } from "lucide-react";

const AdminLanding = () => {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(122,0,0,0.12),_transparent_40%),radial-gradient(circle_at_85%_10%,_rgba(16,185,129,0.08),_transparent_35%),linear-gradient(180deg,_#fbf8f4_0%,_#f4efe7_100%)] px-3 py-6 text-stone-900 sm:px-4">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="rounded-full bg-[#7A0000]/10 p-6">
                <Shield className="h-16 w-16 text-[#7A0000]" />
              </div>
            </div>
            
            <div className="space-y-3">
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-stone-900">
                Coming Soon
              </h1>
              <p className="text-lg sm:text-xl text-stone-600 max-w-md mx-auto">
                The Admin Dashboard is currently under development. We're working hard to bring you an enhanced experience.
              </p>
            </div>

            <div className="pt-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#7A0000]/10 border border-[#7A0000]/20">
                <div className="h-2 w-2 rounded-full bg-[#7A0000] animate-pulse"></div>
                <span className="text-sm font-medium text-[#7A0000]">
                  Check back soon for updates
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLanding;
