import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createApp } from "../apps/backend/dist/app.js";
import { env } from "../apps/backend/dist/config/env.js";

const app = createApp(env);

export default function handler(request: VercelRequest, response: VercelResponse) {
  request.url = "/api/judge";
  return app(request, response);
}
