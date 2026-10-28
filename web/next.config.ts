import type { NextConfig } from "next";
import createIntlPlugin from "next-intl/plugin";
const config: NextConfig = {
  poweredByHeader: false,
  agentRules: false,
  async rewrites() {
    return [{ source: "/backend/:path*", destination: "http://127.0.0.1:4000/api/:path*" }];
  },
};
export default createIntlPlugin("./src/i18n/request.ts")(config);
