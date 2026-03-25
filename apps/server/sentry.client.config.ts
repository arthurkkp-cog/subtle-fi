import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://2dd87faf44dd28bca13c0bffd552734d@o4507334434553856.ingest.us.sentry.io/4507334437240832",
  tracesSampleRate: 1,
  debug: false,
});
