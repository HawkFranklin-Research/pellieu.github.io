import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://pelliscope.eu",
  output: "static",
  build: {
    format: "file"
  }
});
