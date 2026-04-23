// import CEBlogo from "../../assets/CEBLOGO.png";
import { Link } from "react-router-dom";

const Navbar = () => {
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const currentTime = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  return (
    <nav className="h-16 bg-gradient-to-r from-white via-gray-50 to-white shadow-[0_4px_20px_-6px_rgba(0,0,0,0.1)] backdrop-blur-sm border-b border-gray-200 relative">
      <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 h-full">
        {/* Left Side - Logo & Branding */}
        <Link 
          to="/dashboard" 
          className="flex items-center group transition-all duration-300 hover:scale-105" 
          aria-label="Go to Dashboard"
        >
          {/* <div className="relative">
            <div className="w-12 sm:w-16 md:w-18 transition-all duration-300 flex items-center group-hover:scale-110">
              <img
                src={CEBlogo}
                alt="CEB Logo"
                className="w-full h-auto object-contain max-h-12"
              />
            </div>
          </div> */}
          
          <div className="ml-3 sm:ml-4">
            <div className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-[#7A0000] to-[#A52A2A] bg-clip-text text-transparent tracking-wide">
              REPORTING System
            </div>
          </div>
        </Link>

        {/* Right Side - Date, Time & Search */}
        <div className="flex items-center gap-4">
          {/* Date & Time */}
          <div className="hidden md:flex flex-col items-end text-right">
            <div className="text-sm font-semibold text-gray-800">
              {currentDate}
            </div>
            <div className="text-xs text-gray-600 font-medium">
              {currentTime}
            </div>
          </div>

        </div>
      </div>

      {/* Decorative Gradient Line */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-[#7A0000] via-[#A52A2A] to-[#7A0000] opacity-60"></div>
    </nav>
  );
};
export default Navbar;
