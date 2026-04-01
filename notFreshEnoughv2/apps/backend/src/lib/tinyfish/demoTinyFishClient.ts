import type { JudgeProjectInput } from "../schemas/input";
import { TinyFishInvestigationResultSchema, type TinyFishInvestigationResult } from "../schemas/tinyfish";
import { createId } from "../utils/ids";
import { parseGitHubRepoUrl } from "../utils/github";
import { HttpError } from "../utils/httpError";
import type { TinyFishClient } from "./client";

const LIVE_VERSION_NOTE =
  "Because NotFreshEnough is running in demo mode, this cannot be determined correctly here. Use the live version instead for better accuracy and proper scraping.";

function titleCase(value: string) {
  return value
    .replace(/[-_.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildRepoDescription(name: string, input: JudgeProjectInput) {
  if (input.projectBlurb?.trim()) {
    return input.projectBlurb.trim().slice(0, 220);
  }

  return `${name} appears to target a specific problem, but the submitted materials do not yet explain the product clearly on their own. ${LIVE_VERSION_NOTE}`;
}

function clip(value: string, max = 280) {
  return value.length > max ? `${value.slice(0, max - 1)}...` : value;
}

function withLiveVersionNote(value: string) {
  return `${value} ${LIVE_VERSION_NOTE}`;
}

export class DemoTinyFishClient implements TinyFishClient {
  async investigateProject(input: JudgeProjectInput): Promise<TinyFishInvestigationResult> {
    const repoRef = parseGitHubRepoUrl(input.repoUrl);
    if (!repoRef) {
      throw new HttpError(400, "Please submit a valid public GitHub repository URL.");
    }

    const repoName = titleCase(repoRef.repo);
    const repoId = createId("surface");
    const readmeId = createId("surface");
    const demoId = createId("surface");
    const submissionId = createId("surface");
    const blurbId = createId("surface");

    const surfaces = [
      {
        id: repoId,
        surfaceType: "repo" as const,
        label: "GitHub repository",
        url: input.repoUrl,
        status: "ok" as const,
        title: `${repoRef.owner}/${repoRef.repo}`,
        textContent: buildRepoDescription(repoName, input),
        snippet: `${repoRef.owner}/${repoRef.repo} provides a project-specific starting point for the review.`,
        notes: []
      },
      {
        id: readmeId,
        surfaceType: "readme" as const,
        label: "README",
        status: "partial" as const,
        title: `${repoName} README`,
        textContent:
          withLiveVersionNote(
            "The submitted materials do not provide enough README-level detail to verify setup steps, architecture decisions, or a clean judge-facing summary."
          ),
        snippet: withLiveVersionNote("README-level detail is too thin to verify the project quickly."),
        notes: []
      },
      {
        id: demoId,
        surfaceType: "demo" as const,
        label: "Demo",
        url: input.demoUrl,
        status: input.demoUrl ? "ok" : "skipped",
        title: input.demoUrl ? `${repoName} demo` : "No demo submitted",
        textContent: input.demoUrl
          ? "A demo URL was provided by the submitter, which improves the judge's ability to verify product value."
          : undefined,
        snippet: input.demoUrl ? clip(input.demoUrl, 160) : undefined,
        notes: input.demoUrl ? [] : ["No demo URL was provided"]
      },
      {
        id: submissionId,
        surfaceType: "submission" as const,
        label: "Submission page",
        url: input.submissionUrl,
        status: input.submissionUrl ? "ok" : "skipped",
        title: input.submissionUrl ? `${repoName} submission` : "No submission page submitted",
        textContent: input.submissionUrl
          ? "A submission URL was provided by the submitter for offline demo review."
          : undefined,
        snippet: input.submissionUrl ? clip(input.submissionUrl, 160) : undefined,
        notes: input.submissionUrl ? [] : ["No submission URL was provided"]
      },
      {
        id: blurbId,
        surfaceType: "project-blurb" as const,
        label: "Project blurb",
        status: input.projectBlurb ? "ok" : "skipped",
        title: "Submission blurb",
        textContent: input.projectBlurb,
        snippet: input.projectBlurb ? clip(input.projectBlurb, 220) : undefined,
        notes: input.projectBlurb ? [] : ["No project blurb was provided"]
      }
    ];

    const findings = [
      {
        id: createId("finding"),
        category: "clarity" as const,
        signal: input.projectBlurb ? "positive" as const : "negative" as const,
        severity: input.projectBlurb ? "medium" as const : "high" as const,
        title: input.projectBlurb ? "Project intent is stated explicitly" : "Core project pitch is under-explained",
        detail: input.projectBlurb
          ? "The submitted project blurb gives the family panel a concrete summary of what the repo is trying to do."
          : withLiveVersionNote(
              "From the submitted materials alone, the project story still depends too much on the repository name instead of a clear summary."
            ),
        sourceIds: input.projectBlurb ? [blurbId] : [repoId, readmeId],
        evidenceSnippet: input.projectBlurb ? clip(input.projectBlurb, 220) : undefined
      },
      {
        id: createId("finding"),
        category: "proof" as const,
        signal: input.demoUrl ? "positive" as const : "negative" as const,
        severity: input.demoUrl ? "medium" as const : "high" as const,
        title: input.demoUrl ? "A demo link gives judges a verification path" : "Live proof is still missing",
        detail: input.demoUrl
          ? "Providing a demo URL gives judges a concrete place to verify the product flow instead of relying only on written claims."
          : withLiveVersionNote("Without a demo URL, judges still have no direct proof that the product works end to end."),
        sourceIds: input.demoUrl ? [demoId] : [repoId],
        evidenceSnippet: input.demoUrl ? input.demoUrl : undefined
      },
      {
        id: createId("finding"),
        category: "completeness" as const,
        signal: "negative" as const,
        severity: "medium" as const,
        title: "Judge-facing documentation is still too thin",
        detail: withLiveVersionNote(
          "The submitted materials do not make setup steps, architecture choices, and project boundaries easy to confirm quickly."
        ),
        sourceIds: [readmeId, repoId]
      },
      {
        id: createId("finding"),
        category: "freshness" as const,
        signal: "neutral" as const,
        severity: "low" as const,
        title: "Recent momentum is not obvious yet",
        detail: withLiveVersionNote("The submitted materials do not make recent progress or iteration cadence especially visible."),
        sourceIds: [repoId]
      },
      {
        id: createId("finding"),
        category: "differentiation" as const,
        signal: "positive" as const,
        severity: "low" as const,
        title: "Project identity is at least specific",
        detail: `The repository name ${repoRef.repo} gives the family panel one project-specific anchor instead of a completely generic submission.`,
        sourceIds: [repoId],
        evidenceSnippet: repoRef.repo
      }
    ];

    const candidateArtifacts = [
      {
        artifactType: input.projectBlurb ? ("README intro" as const) : ("project summary" as const),
        rationale: input.projectBlurb
          ? "The next best improvement is to convert the project blurb into a judge-friendly README opening."
          : "A short project summary is the fastest way to make this submission easier for judges to understand.",
        currentSnippet: input.projectBlurb ? clip(input.projectBlurb, 220) : undefined,
        impactScore: input.projectBlurb ? 8 : 7
      }
    ];

    return TinyFishInvestigationResultSchema.parse({
      repo: {
        owner: repoRef.owner,
        name: repoRef.repo,
        fullName: `${repoRef.owner}/${repoRef.repo}`,
        url: input.repoUrl,
        description: buildRepoDescription(repoName, input),
        homepageUrl: input.demoUrl,
        defaultBranch: "main",
        languages: [],
        stars: 0,
        openIssues: 0,
        topics: [],
        pushedAt: undefined,
        updatedAt: undefined
      },
      surfaces,
      findings,
      candidateArtifacts,
      metadata: {
        investigationMode: "mock",
        inspectedAt: new Date().toISOString(),
        warnings: [],
        partialFailures: []
      }
    });
  }
}
