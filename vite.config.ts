import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("@supabase/supabase-js") || id.includes("@supabase/")) return "vendor-supabase";
            if (id.includes("framer-motion")) return "vendor-motion";
            if (id.includes("jspdf")) return "vendor-pdf";
            if (id.includes("@radix-ui/")) return "vendor-radix";
            if (id.includes("lucide-react")) return "vendor-icons";
            if (id.includes("@tanstack/")) return "vendor-query";
            if (id.includes("date-fns")) return "vendor-dates";
            if (id.includes("react-photo-album") || id.includes("yet-another-react-lightbox")) return "vendor-gallery";
            if (id.includes("react-dom") || id.includes("/node_modules/react/") || id.includes("react-router")) return "vendor-react";
          }
        },
      },
    },
  },
}));
