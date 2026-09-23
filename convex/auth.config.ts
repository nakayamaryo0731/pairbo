import { env } from "./_generated/server";

const authConfig = {
  providers: [
    {
      domain: env.CLERK_ISSUER_URL,
      applicationID: "convex",
    },
  ],
};

export default authConfig;
