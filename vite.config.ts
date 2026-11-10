import { defineConfig } from "vite";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";
import { kvDataAdapter } from "@vinext/cloudflare/cache/kv-data-adapter";
import { staticAssetsAdapter } from "@vinext/cloudflare/cache/static-assets-adapter";

export default defineConfig({
  plugins: [
    vinext({
      cache: { data: kvDataAdapter(), cdn: staticAssetsAdapter() },
      // No build-time prerender: bindings do not exist during the build, so
      // prerendering DB-backed pages snapshots empty HTML that the deployed
      // Worker then serves indefinitely. ISR (revalidate = 300) renders on the
      // first runtime request with real bindings and caches into KV instead.
    }),
    cloudflare({
      viteEnvironment: {
        name: "rsc",
        childEnvironments: ["ssr"],
      },
    }),
  ],
});
