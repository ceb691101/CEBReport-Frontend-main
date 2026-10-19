import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");

	return {
		plugins: [react(), tailwindcss()],
		server: {
			proxy: {
				// New report endpoint is available in the local MISReports API.
				"/misapi/api/pucsl/solarJournalsRetail": {
					target: env.VITE_LOCAL_API || env.VITE_SERVER_API,
					changeOrigin: true,
					secure: false,
					rewrite: env.VITE_LOCAL_API
						? (path) => path.replace(/^\/misapi/, "")
						: undefined,
				},
				"/api/debtors": {
					target: env.VITE_LOCAL_API || `${env.VITE_SERVER_API}/misapi`,
					changeOrigin: true,
					secure: false,
				},
				"/smsapi": {
					target: env.VITE_SERVER_API,
					changeOrigin: true,
					secure: false,
					rewrite: (path) => path.replace(/^\/smsapi/, ""),
				},
				"/CBRSAPI": {
					target: env.VITE_SERVER_API,
					changeOrigin: true,
					secure: false,
				},
				"/CEBINFO_API_2025": {
					target: env.VITE_SERVER_API,
					changeOrigin: true,
					secure: false,
				},

				// Route new solar-journals report to local IIS Express backend for testing until deployed to server
				"/misapi/solarapi/solar-journals": {
					target: "http://localhost:44381",
					changeOrigin: true,
					secure: false,
					rewrite: (path) => path.replace(/^\/misapi/, ""),
				},

				// Route meter-reading completion-status to local IIS Express backend for testing
				"/misapi/api/meter-reading": {
					target: "http://localhost:44381",
					changeOrigin: true,
					secure: false,
					rewrite: (path) => path.replace(/^\/misapi/, ""),
				},

				"/misapi": {
					target: env.VITE_SERVER_API,
					changeOrigin: true,
					secure: false,

				},
				"/api": {
					target: env.VITE_SERVER_API,
					changeOrigin: true,
					secure: false,
				},

				"/SMART_API": {
					target: env.VITE_SMART_API,
					changeOrigin: true,
					secure: false,
				},
				"/MRMSAPI": {
					target: env.VITE_MRMS_API,
					changeOrigin: true,
					secure: false,
				},
			},
		},
	};
});
