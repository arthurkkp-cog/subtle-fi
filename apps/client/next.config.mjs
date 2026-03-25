import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@subtletech/shared"],
};

export default withSentryConfig(nextConfig, {
  org: "subtletech-banking",
  project: "subtletech-client",
  silent: !process.env.CI,
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: true,
});
