/// <reference types="@cloudflare/workers-types" />

declare module "h3" {
  interface H3EventContext {
    cloudflare: {
      request: Request;
      env: Env;
      context: ExecutionContext;
    };
  }
}

export {};
