import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, test } from "bun:test";
import { createApp } from "../src/index.js";

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
    ) as { name: string; scripts: Record<string, string> };
    expect(packageJson.name).toBe("my-images");
    expect(packageJson.scripts.deploy).toBe("alchemy deploy");

    const stack = await readFile(path.join(targetDir, "alchemy.run.ts"), "utf8");
    expect(stack).toContain('import { ImagesStack } from "@lambdaimg/alchemy";');
    expect(stack).toContain("AWS.providers()");
    expect(stack).toContain('ImagesStack("Images", config)');
  });

  test("refuses a non-empty directory without force", async () => {
    const cwd = await tempRoot();
    const targetDir = path.join(cwd, "existing");
    await createApp("existing", { cwd });
    await writeFile(path.join(targetDir, "extra.txt"), "already here");

    await expect(createApp("existing", { cwd })).rejects.toThrow(/not empty/);
  });

  test("writes into a non-empty directory with force", async () => {
    const cwd = await tempRoot();
    const targetDir = path.join(cwd, "existing");
    await createApp("existing", { cwd });
    await writeFile(path.join(targetDir, "extra.txt"), "already here");

    await expect(createApp("existing", { cwd, force: true })).resolves.toEqual(
      expect.objectContaining({ targetDir }),
    );
  });
});
