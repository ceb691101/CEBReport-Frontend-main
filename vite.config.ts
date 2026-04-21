import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");
	const apiTarget = env.VITE_API_BASE && env.VITE_API_BASE.trim()
		? env.VITE_API_BASE.trim()
		: "http://localhost:44381";

	return {
	plugins: [react(), tailwindcss()],
	server: {
		proxy: {
			"/CBRSAPI": {
				target: "http://10.128.1.126",
				changeOrigin: true,
				secure: false,
			},
			"/CEBINFO_API_2025": {
				target: "http://10.128.1.126",
				changeOrigin: true,
				secure: false,
			},
			"/misapi": {
				target: "http://10.128.1.126",
				changeOrigin: true,
				secure: false,
			},
			"/api": {
				target: apiTarget,
				changeOrigin: true,
				secure: false,
			},
			// "/debtorsapi": {
			//   target: "http://localhost:44381",
			//   changeOrigin: true,
			//   secure: false,
			//   rewrite: (path) => path.replace(/^\/debtorsapi/, "") // <-- fix added here
			// },
			"/provincetrial": {
				target: apiTarget,
				changeOrigin: true,
				secure: false,
				rewrite: (path) => path.replace(/^\/provincetrial/, ""), // <-- fix added here
			},

			"/debtorsage": {
				target: apiTarget,
				changeOrigin: true,
				secure: false,
				rewrite: (path) => path.replace(/^\/debtorsage/, ""),
			},

			"/solarapi": {
				target: apiTarget,
				changeOrigin: true,
				secure: false,
			},
			"/workprogress": {
				target: apiTarget,
				changeOrigin: true,
				secure: false,
				rewrite: (path) => path.replace(/^\/workprogress/, ""),
			},

			"/materials": {
				target: apiTarget,
				changeOrigin: true,
				secure: false,
				rewrite: (path) => path.replace(/^\/materials/, ""),
			},

			// Added for jobcard
			"/jobcard": {
				target: apiTarget,
				changeOrigin: true,
				secure: false,
				rewrite: (path) => path.replace(/^\/jobcard/, ""),
			},
			"/avgConsumption": {
				target: apiTarget,
				changeOrigin: true,
				secure: false,
				rewrite: (path) => path.replace(/^\/avgConsumption/, ""),
			},

			"/LedgerCard": {
				target: apiTarget,
				changeOrigin: true,
				secure: false,
				rewrite: (path) => path.replace(/^\/LedgerCard/, ""),
			},
		},
	},
	};
});
