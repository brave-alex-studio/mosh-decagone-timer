// @ts-check
import { defineConfig } from "astro/config";

import icon from "astro-icon";

import solidJs from "@astrojs/solid-js";

// https://astro.build/config
export default defineConfig({
  site: "http://localhost",
  // Only use base path in production (GitHub Pages)
  base: process.env.NODE_ENV === "production" ? "/astro-theme-terminal" : "/",
  integrations: [icon(), solidJs()],
  markdown: {
    shikiConfig: {
      theme: "css-variables",
      langs: [],
      wrap: true,
    },
  },
});