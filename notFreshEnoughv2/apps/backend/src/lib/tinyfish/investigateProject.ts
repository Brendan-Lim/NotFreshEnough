import { arePaidApisEnabled, getEffectiveTinyFishMode, type Env } from "../../config/env";
import type { JudgeProjectInput } from "../schemas/input";
import { DemoTinyFishClient } from "./demoTinyFishClient";
import { MockTinyFishClient } from "./mockTinyFishClient";
import { RealTinyFishClient } from "./realTinyFishClient";
import type { TinyFishClient } from "./client";

export function createTinyFishClient(env: Env): TinyFishClient {
  if (!arePaidApisEnabled(env)) {
    return new DemoTinyFishClient();
  }

  return getEffectiveTinyFishMode(env) === "sdk" ? new RealTinyFishClient(env) : new MockTinyFishClient();
}

export async function investigateProject(input: JudgeProjectInput, env: Env) {
  const client = createTinyFishClient(env);
  return client.investigateProject(input);
}
