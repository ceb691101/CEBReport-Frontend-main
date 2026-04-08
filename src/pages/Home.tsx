import React, { useEffect, useState } from "react";
import { useUser } from "../contexts/UserContext";
import { 
  BarChart3, FileText, TrendingUp, ArrowRight, Database, 
  PieChart, Activity, Target, CheckCircle, Shield
} from "lucide-react";

const Home: React.FC = () => {
  const { user } = useUser();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Trigger animations after component mounts
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const cardVariants = [
    "bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200",
    "bg-gradient-to-br from-green-50 to-green-100 border-green-200", 
    "bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200",
    "bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200"
  ];

  const iconVariants = [
    "text-blue-600 bg-blue-100",
    "text-green-600 bg-green-100",
    "text-purple-600 bg-purple-100", 
    "text-orange-600 bg-orange-100"
  ];

  const handleReportNavigation = (path: string) => {
    window.location.href = path;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Enhanced Hero Section */}
      <div className={`relative overflow-hidden bg-gradient-to-r from-white via-blue-50 to-indigo-50 py-12 px-4 transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 rounded-full shadow-lg mb-6 backdrop-blur-sm">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm font-medium text-gray-700">Reporting System Management Portal</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-[#7A0000] to-[#A52A2A] bg-clip-text text-transparent">
                Welcome{user?.Name ? `, ${user.Name}` : ""}
              </h1>
            
            <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed mb-8">
              Comprehensive management reports and analytics for data-driven decision making
            </p>
            
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <span className="text-sm font-medium">Real-time Analytics</span>
              <span className="text-sm font-medium">Secure Access</span>
              <span className="text-sm font-medium">Business Intelligence</span>
           </div>
         </div>
         
          </div>
       </div>

      <div className="max-w-7xl mx-auto px-4 py-8">


         {/* Quick Access Reports Section */}
        <div className={`mb-12 transition-all duration-1000 delay-200 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Quick Access Reports</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Access your most frequently used reports and analytics with one click
            </p>
                  </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Material Details Report */}
            <div 
              onClick={() => handleReportNavigation('/report/inventory')}
              className={`${cardVariants[0]} p-6 rounded-2xl border-2 hover:border-blue-300 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl group`}
            >
              <div className="flex flex-col items-center text-center">
                <div className={`${iconVariants[0]} p-4 rounded-2xl mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <Database className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Material Details</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Comprehensive inventory and material tracking analytics
                </p>
                <div className="flex items-center gap-1 text-blue-600 group-hover:gap-2 transition-all duration-300">
                  <span className="text-sm font-medium">View Report</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Income Expenditure Report */}
            <div 
              onClick={() => handleReportNavigation('/report/IncomeExpenditure')}
              className={`${cardVariants[1]} p-6 rounded-2xl border-2 hover:border-green-300 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl group`}
            >
              <div className="flex flex-col items-center text-center">
                <div className={`${iconVariants[1]} p-4 rounded-2xl mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <TrendingUp className="w-8 h-8" />
                  </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Income Expenditure</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Cost center wise income and expenditure analytics
                </p>
                <div className="flex items-center gap-1 text-green-600 group-hover:gap-2 transition-all duration-300">
                  <span className="text-sm font-medium">View Report</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Work In Progress Report */}
            <div 
              onClick={() => handleReportNavigation('/report/WorkInProgress')}
              className={`${cardVariants[2]} p-6 rounded-2xl border-2 hover:border-purple-300 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl group`}
            >
              <div className="flex flex-col items-center text-center">
                <div className={`${iconVariants[2]} p-4 rounded-2xl mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <BarChart3 className="w-8 h-8" />
                  </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Work In Progress</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Age analysis and project tracking by cost center
                </p>
                <div className="flex items-center gap-1 text-purple-600 group-hover:gap-2 transition-all duration-300">
                  <span className="text-sm font-medium">View Report</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
                  </div>

            {/* Cost Center Trial Balance */}
            <div 
              onClick={() => handleReportNavigation('/report/TrialBalance/costcenters')}
              className={`${cardVariants[3]} p-6 rounded-2xl border-2 hover:border-orange-300 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl group`}
            >
              <div className="flex flex-col items-center text-center">
                <div className={`${iconVariants[3]} p-4 rounded-2xl mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <Target className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Trial Balance</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Cost center wise financial balance reports
                </p>
                <div className="flex items-center gap-1 text-orange-600 group-hover:gap-2 transition-all duration-300">
                  <span className="text-sm font-medium">View Report</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Platform Features Section */}
        <div className={`mb-12 transition-all duration-1000 delay-400 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Platform Features</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Powerful tools and features designed for comprehensive business intelligence
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Secure Access</h3>
              </div>
              <p className="text-gray-600 mb-4">
                EPF number-based authentication with role-based permissions ensuring data security.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-gradient-to-r from-green-500 to-green-600 rounded-xl">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Real-time Data</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Access to live financial and operational reports with automatic data updates.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Export Options</h3>
              </div>
              <p className="text-gray-600 mb-4">
                CSV export and print functionality for all reports with professional formatting.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">

              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl">
                  <PieChart className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Advanced Analytics</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Interactive charts and visualizations for comprehensive data analysis.
              </p>
                     </div>
                     
                     </div>
                   </div>

        </div>
      
    </div>
  );
};

export default Home;


