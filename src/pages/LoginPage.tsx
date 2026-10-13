import LoginCard from "../components/login/LoginCard";

const LoginPage = () => {
  return (
    <main className="min-h-screen w-full">
      <section className="w-full min-h-screen bg-white flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 gap-4">
        <div className="w-full max-w-md rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.15)]">
          <LoginCard />
        </div>

        {/* Footer Info */}
        <div
          style={{
            textAlign: "center",
            fontSize: "12px",
            color: "#888",
            lineHeight: "1.4",
          }}
        >
          © 2026 Utility Solutions & Automation Branch, Electricity Distribution Lanka (Private) Limited.
          <br />
          All Rights Reserved. Version 1.9
        </div>
      </section>
    </main>
  );
};

export default LoginPage;