import { afterEach, beforeEach, describe, expect, jest, test } from "@jest/globals";
import type { Env } from "../../config/env";
import { judgeProject } from "./judgeProject";

const demoEnv: Env = {
  BACKEND_PORT: 8787,
  FRONTEND_ORIGIN: "http://localhost:5173",
  ENABLE_PAID_APIS: false,
  GITHUB_TOKEN: undefined,
  BING_SEARCH_KEY: undefined,
  OPENAI_API_KEY: undefined,
  OPENAI_BASE_URL: undefined,
  OPENAI_MODEL: "gpt-4.1-mini",
  TINYFISH_MODE: "mock",
  TINYFISH_API_KEY: undefined,
  TINYFISH_BASE_URL: "https://agent.tinyfish.ai/v1"
};

describe("judgeProject in demo mode", () => {
  const fetchMock = jest.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockImplementation(async () => {
      throw new Error("fetch should not be called in demo mode");
    });
    global.fetch = fetchMock as typeof fetch;
  });

  afterEach(() => {
    fetchMock.mockReset();
  });

  test("returns a full offline response without live provider calls", async () => {
    const result = await judgeProject(
      {
        repoUrl: "https://github.com/vas3k/TaxHacker",
        projectBlurb: "A tax-focused helper for users who need a clearer process and submission flow."
      },
      demoEnv
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.inputEcho.repoUrl).toBe("https://github.com/vas3k/TaxHacker");
    expect(result.analysis.projectName).toBe("TaxHacker");
    expect(result.panel.familyHeadline.length).toBeGreaterThan(0);
    expect(result.tinyFish.investigationMode).toBe("mock");
    expect(result.tinyFish.warnings).toEqual([]);
    expect(result.analysis.weakPoints[0]?.detail).toMatch(/Use the live version instead/i);
  });
});
