import { execFile } from "node:child_process";
import { copyFile, mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const projectRoot = path.resolve(import.meta.dirname, "..");
const publishScript = path.join(projectRoot, "scripts", "publish-github-pages.sh");

type DeployOptions = {
  branch?: "existing" | "absent";
  unchanged?: boolean;
  failTest?: boolean;
};

type DeployResult = {
  status: number;
  stdout: string;
  stderr: string;
  log: string;
};

async function runDeploy(options: DeployOptions = {}): Promise<DeployResult> {
  const fixture = await mkdtemp(path.join(os.tmpdir(), "pages-deploy-test-"));
  const scriptsDir = path.join(fixture, "scripts");
  const binDir = path.join(fixture, "bin");
  const outsideCwd = path.join(fixture, "unrelated", "cwd");
  await mkdir(scriptsDir, { recursive: true });
  await mkdir(binDir, { recursive: true });
  await mkdir(outsideCwd, { recursive: true });
  await copyFile(publishScript, path.join(scriptsDir, "publish-github-pages.sh"));

  const logFile = path.join(fixture, "commands.log");
  const gitMock = `#!/usr/bin/env bash
set -euo pipefail
printf 'git %s\\n' "$*" >> "$MOCK_LOG"
args=("$@")
if [[ \"\${args[0]:-}\" == \"-C\" ]]; then
  args=("\${args[@]:2}")
fi
case \"\${args[*]:-}\" in
  \"rev-parse --show-toplevel\") printf '%s\\n' \"$MOCK_PROJECT\" ;;
  \"remote get-url origin\") printf '%s\\n' 'file:///mock/origin' ;;
  \"ls-remote file:///mock/origin\") ;;
  \"ls-remote --exit-code --heads file:///mock/origin gh-pages\")
    [[ \"\${MOCK_BRANCH:-existing}\" == existing ]]
    ;;
  \"config --get user.name\") printf '%s\\n' 'Test Publisher' ;;
  \"config --get user.email\") printf '%s\\n' 'publisher@example.invalid' ;;
  config*) ;;
  \"clone --quiet --branch gh-pages --single-branch file:///mock/origin\"*)
    mkdir -p "\${args[\${#args[@]}-1]}/.git"
    ;;
  \"init --quiet -b gh-pages\") mkdir -p \"$PWD/.git\" ;;
  \"remote add origin file:///mock/origin\") ;;
  add*) ;;
  \"diff --cached --quiet\")
    [[ \"\${MOCK_UNCHANGED:-0}\" == 1 ]]
    ;;
  commit*) ;;
  push*) ;;
  *) printf 'unexpected git invocation: %s\\n' \"\${args[*]:-}\" >&2; exit 90 ;;
esac
`;
  const pnpmMock = `#!/usr/bin/env bash
set -euo pipefail
printf 'pnpm %s\\n' "$*" >> "$MOCK_LOG"
if [[ \"\${1:-}\" == test && \"\${MOCK_FAIL_TEST:-0}\" == 1 ]]; then exit 41; fi
if [[ \"\${1:-}\" == pages:build ]]; then
  mkdir -p \"$MOCK_PROJECT/dist/pages\"
  printf '%s\\n' '<!doctype html><title>mock</title>' > \"$MOCK_PROJECT/dist/pages/index.html\"
fi
`;
  await writeFile(path.join(binDir, "git"), gitMock, { mode: 0o755 });
  await writeFile(path.join(binDir, "pnpm"), pnpmMock, { mode: 0o755 });
  await writeFile(path.join(binDir, "npm"), "#!/usr/bin/env bash\nexit 0\n", { mode: 0o755 });

  const env = {
    ...process.env,
    PATH: `${binDir}:${process.env.PATH ?? ""}`,
    MOCK_LOG: logFile,
    MOCK_PROJECT: fixture,
    MOCK_BRANCH: options.branch ?? "existing",
    MOCK_UNCHANGED: options.unchanged ? "1" : "0",
    MOCK_FAIL_TEST: options.failTest ? "1" : "0",
  };
  try {
    const result = await execFileAsync("bash", [path.join(scriptsDir, "publish-github-pages.sh")], {
      cwd: outsideCwd,
      env,
      maxBuffer: 1024 * 1024,
    });
    return {
      status: 0,
      stdout: result.stdout,
      stderr: result.stderr,
      log: await readFile(logFile, "utf8"),
    };
  } catch (error) {
    const failure = error as { code?: number | string; stdout?: string; stderr?: string };
    return {
      status: typeof failure.code === "number" ? failure.code : 1,
      stdout: failure.stdout ?? "",
      stderr: failure.stderr ?? "",
      log: await readFile(logFile, "utf8").catch(() => ""),
    };
  }
}

describe("GitHub Pages deployment shell workflow", () => {
  it("does not push when the checks fail", async () => {
    const result = await runDeploy({ failTest: true });

    expect(result.status).not.toBe(0);
    expect(result.log).toContain("pnpm test");
    expect(result.log).not.toContain("pnpm check");
    expect(result.log).not.toMatch(/git -C .* push/);
  });

  it("updates an existing gh-pages branch without force", async () => {
    const result = await runDeploy({ branch: "existing" });

    expect(result.status).toBe(0);
    expect(result.log).toContain("git clone --quiet --branch gh-pages");
    expect(result.log).toMatch(/git -C .* push --quiet origin HEAD:gh-pages/);
    expect(result.log).not.toMatch(/git -C .* push .*--force/);
    expect(result.log).not.toMatch(/git -C .* push .*--force-with-lease/);
  });

  it("does not push an unchanged build", async () => {
    const result = await runDeploy({ branch: "existing", unchanged: true });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("no changes; nothing to push");
    expect(result.log).not.toMatch(/git -C .* push/);
  });
});
