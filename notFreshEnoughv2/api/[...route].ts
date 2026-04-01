import { createApp } from "../apps/backend/src/app";
import { env } from "../apps/backend/src/config/env";

const app = createApp(env);

export default app;
