import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import type { Plugin, ResolvedConfig, ViteDevServer } from "vite"

function startupDiagnosticsPlugin(): Plugin {
  const startupContext = {
    cwd: process.cwd(),
    nodeVersion: process.version,
    viteApiBaseUrl: process.env.VITE_API_BASE_URL || "http://localhost:8000",
  }

  return {
    name: "flowmind-startup-diagnostics",
    configResolved(config: ResolvedConfig) {
      console.info(
        `[flowmind-frontend] startup ${JSON.stringify({
          ...startupContext,
          mode: config.mode,
          command: config.command,
        })}`
      )
    },
    configureServer(server: ViteDevServer) {
      const report = () => {
        const address = server.httpServer?.address()
        let url = "unknown"
        if (typeof address === "string") {
          url = address
        } else if (address && typeof address.port === "number") {
          const host = address.address === "::" ? "127.0.0.1" : address.address
          url = `http://${host}:${address.port}`
        }

        console.info(
          `[flowmind-frontend] dev_server_ready ${JSON.stringify({
            url,
            root: server.config.root,
            apiBaseUrl: process.env.VITE_API_BASE_URL || "http://localhost:8000",
          })}`
        )
      }

      if (server.httpServer?.listening) {
        report()
      } else if (server.httpServer) {
        server.httpServer.once("listening", report)
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [startupDiagnosticsPlugin(), react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
