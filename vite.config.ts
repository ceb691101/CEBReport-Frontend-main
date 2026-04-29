import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
	plugins: [react(), tailwindcss()],
	server: {
		proxy: {
			"/smsapi": {
				target: "http://10.128.1.126",
				changeOrigin: true,
				secure: false,
				rewrite: (path) => path.replace(/^\/smsapi/, ""),
			},
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
				target: "http://10.128.1.126",
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
				target: "http://localhost:44381",
				changeOrigin: true,
				secure: false,
				rewrite: (path) => path.replace(/^\/provincetrial/, ""), // <-- fix added here
			},

			"/debtorsage": {
				target: "http://localhost:44381",
				changeOrigin: true,
				secure: false,
				rewrite: (path) => path.replace(/^\/debtorsage/, ""),
			},

			"/solarapi": {
				target: "http://localhost:44381",
				changeOrigin: true,
				secure: false,
			},
			"/workprogress": {
				target: "http://localhost:44381",
				changeOrigin: true,
				secure: false,
				rewrite: (path) => path.replace(/^\/workprogress/, ""),
			},

			"/materials": {
				target: "http://localhost:44381",
				changeOrigin: true,
				secure: false,
				rewrite: (path) => path.replace(/^\/materials/, ""),
			},

			// Added for jobcard
			"/jobcard": {
				target: "http://localhost:44381",
				changeOrigin: true,
				secure: false,
				rewrite: (path) => path.replace(/^\/jobcard/, ""),
			},
			"/avgConsumption": {
				target: "http://localhost:44381",
				changeOrigin: true,
				secure: false,
				rewrite: (path) => path.replace(/^\/avgConsumption/, ""),
			},

			"/LedgerCard": {
				target: "http://localhost:44381",
				changeOrigin: true,
				secure: false,
				rewrite: (path) => path.replace(/^\/LedgerCard/, ""),
			},
			"/roleadminapi": {
				target: "http://localhost:44381",
				changeOrigin: true,
				secure: false,
				rewrite: (path) => path.replace(/^\/roleadminapi/, ""),
			},
			"/srpapi": {
				target: "http://localhost:44381",
				changeOrigin: true,
				secure: false,
				rewrite: (path) => path.replace(/^\/srpapi/, ""),
			},
			"/committedstock": {
				target: "http://localhost:44381",
				changeOrigin: true,
				secure: false,
				rewrite: (path) => path.replace(/^\/committedstock/, ""),
			},
			"/SMART_API": {
				target: "http://smartceb.ceb:81",
				changeOrigin: true,
				secure: false,
			},	
			"/misreportsapi": {
				target: "http://localhost:44381",
				changeOrigin: true,
				secure: false,
				rewrite: (path) => path.replace(/^\/misreportsapi/, ""),
			},
			"/pivapi": {
				target: "http://localhost:44381",
				changeOrigin: true,
				secure: false,
				rewrite: (path) => path.replace(/^\/pivapi/, ""),
			},
		},
	},
});
