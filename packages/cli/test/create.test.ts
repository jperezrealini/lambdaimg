import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createApp } from "../src/index.js";
import { TEMPLATE_PACKAGE_VERSIONS } from "../src/template-package.generated.js";

interface PackageJson {
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  workspaces?: {
    catalog?: Record<string, string>;
  };
}

async function tempRoot(): Promise<string> {
  return await mkdtemp(path.join(tmpdir(), "lambdaimg-cli-"));
}

describe("createApp", () => {
  test("creates a deployable app directory", async () => {
    const cwd = await tempRoot();
    const result = await createApp("my-images", { cwd });
    const targetDir = path.join(cwd, "my-images");

    expect(result.targetDir).toBe(targetDir);
    expect(result.files).toContain("alchemy.run.ts");

    const packageJson = JSON.parse(
      await readFile(path.join(targetDir, "package.json"), "utf8"),
    ) as {
      name: string;
      scripts: Record<string, string>;
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    expect(packageJson.name).toBe("my-images");
    expect(packageJson.scripts.deploy).toBe("alchemy deploy");
    expect(packageJson.dependencies).toEqual(TEMPLATE_PACKAGE_VERSIONS.dependencies);
    expect(packageJson.devDependencies).toEqual(TEMPLATE_PACKAGE_VERSIONS.devDependencies);

    const stack = await readFile(path.join(targetDir, "alchemy.run.ts"), "utf8");
    expect(stack).toContain('import { ImagesStack } from "@lambdaimg/alchemy";');
    expect(stack).toContain("AWS.providers()");
    expect(stack).toContain('ImagesStack("Images", {})');
  });

  test("refuses a non-empty directory without force", async () => {
    const cwd = await tempRoot();
    const targetDir = path.join(cwd, "existing");
    await createApp("existing", { cwd });
    await writeFile(path.join(targetDir, "extra.txt"), "already here");

    expect(createApp("existing", { cwd })).rejects.toThrow(/not empty/);
  });

  test("writes into a non-empty directory with force", async () => {
    const cwd = await tempRoot();
    const targetDir = path.join(cwd, "existing");
    await createApp("existing", { cwd });
    await writeFile(path.join(targetDir, "extra.txt"), "already here");

    expect(createApp("existing", { cwd, force: true })).resolves.toEqual(
      expect.objectContaining({ targetDir }),
    );
  });

  test("runs when invoked through a package manager bin symlink", async () => {
    const cwd = await tempRoot();
    const build = await Bun.build({
      entrypoints: [path.join(import.meta.dirname, "../src/index.ts")],
      outdir: cwd,
      target: "node",
      format: "esm",
    });
    expect(build.success).toBe(true);

    await writeFile(path.join(cwd, "package.json"), '{"type":"module"}\n');
    const entrypoint = path.join(cwd, "index.js");
    const binPath = path.join(cwd, "lambdaimg");
    await symlink(entrypoint, binPath);

    const proc = Bun.spawn(["node", binPath, "--help"], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);

    expect(exitCode).toBe(0);
    expect(stderr).toBe("");
    expect(stdout).toContain("lambdaimg create <dir>");
  });

  test("derives template dependency versions from repo package metadata", async () => {
    const repoRoot = path.resolve(import.meta.dirname, "../../..");
    const [rootPackage, alchemyPackage, generatedAppPackage] = await Promise.all([
      readPackageJson(path.join(repoRoot, "package.json")),
      readPackageJson(path.join(repoRoot, "packages/alchemy/package.json")),
      readPackageJson(path.join(repoRoot, "examples/generated-app/package.json")),
    ]);
    const effectVersion = required(alchemyPackage.dependencies?.effect);
    const templatePackageVersions: {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    } = TEMPLATE_PACKAGE_VERSIONS;

    expect(templatePackageVersions).toEqual({
      dependencies: {
        "@lambdaimg/alchemy": applyRangePrefix(
          required(generatedAppPackage.dependencies?.["@lambdaimg/alchemy"]),
          required(alchemyPackage.version),
        ),
        alchemy: required(alchemyPackage.dependencies?.alchemy),
        effect: applyRangePrefix(required(generatedAppPackage.dependencies?.effect), effectVersion),
      },
      devDependencies: {
        "@effect/platform-bun": applyRangePrefix(
          required(generatedAppPackage.devDependencies?.["@effect/platform-bun"]),
          effectVersion,
        ),
        "@effect/platform-node": applyRangePrefix(
          required(generatedAppPackage.devDependencies?.["@effect/platform-node"]),
          effectVersion,
        ),
        "@types/node": required(rootPackage.workspaces?.catalog?.["@types/node"]),
        typescript: required(generatedAppPackage.devDependencies?.typescript),
      },
    });
  });
});

async function readPackageJson(packagePath: string): Promise<PackageJson> {
  return JSON.parse(await readFile(packagePath, "utf8")) as PackageJson;
}

function required(value: string | undefined): string {
  if (!value) {
    throw new Error("Expected package metadata value to be present.");
  }
  return value;
}

function applyRangePrefix(referenceRange: string, version: string): string {
  const prefix = referenceRange.match(/^[~^]/)?.[0] ?? "";
  return `${prefix}${version.replace(/^[~^]/, "")}`;
}
