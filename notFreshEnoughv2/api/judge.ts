import type { VercelRequest, VercelResponse } from "@vercel/node";
import { app } from "../apps/backend/dist/vercel.js";

export default function handler(request: VercelRequest, response: VercelResponse) {
  request.url = "/api/judge";
  return app(request, response);
}
