import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");

	return {
		plugins: [react(), tailwindcss()],
		server: {
			proxy: {
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
					// When testing with local IIS Express (http://localhost:44381), uncomment below:
					// target: env.VITE_LOCAL_API || "http://localhost:44381",
					// rewrite: (path) => path.replace(/^\/misapi/, ""),
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
