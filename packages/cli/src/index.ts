#!/usr/bin/env node
import { realpathSync } from "node:fs";
import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TEMPLATE_PACKAGE_VERSIONS } from "./template-package.generated.js";

export interface CreateAppOptions {
  cwd?: string;
  force?: boolean;
}

export interface CreateAppResult {
  targetDir: string;
  files: string[];
}

export async function createApp(
  targetDir: string,
  options: CreateAppOptions = {},
): Promise<CreateAppResult> {
  if (!targetDir) {
    throw new Error("A target directory is required.");
  }

  const cwd = options.cwd ?? process.cwd();
  const resolvedTarget = path.resolve(cwd, targetDir);
  const targetStatus = await getPathStatus(resolvedTarget);

  if (targetStatus === "file") {
    throw new Error(`Target exists and is not a directory: ${resolvedTarget}`);
  }

  if (targetStatus === "directory" && !options.force) {
    const entries = await readdir(resolvedTarget);
    if (entries.length > 0) {
      throw new Error(
        `Target directory is not empty: ${resolvedTarget}. Pass --force to write into it.`,
      );
    }
  }

  await mkdir(resolvedTarget, { recursive: true });

  const packageName = packageNameFromDir(resolvedTarget);
  const files = appFiles(packageName);
  await Promise.all(
    Object.entries(files).map(([filename, contents]) =>
      writeFile(path.join(resolvedTarget, filename), contents),
    ),
  );

  return {
    targetDir: resolvedTarget,
    files: Object.keys(files),
  };
}

async function main(argv = process.argv.slice(2)): Promise<void> {
  const parsed = parseArgs(argv);

  if (parsed.help) {
    process.stdout.write(usage());
    return;
  }

  if (parsed.command !== "create" || !parsed.targetDir) {
    process.stderr.write(usage());
    process.exitCode = 1;
    return;
  }

  const result = await createApp(parsed.targetDir, { force: parsed.force });
  process.stdout.write(`Created LambdaImg app at ${result.targetDir}\n`);
}

function parseArgs(argv: string[]): {
  command?: string;
  targetDir?: string;
  force: boolean;
  help: boolean;
} {
  const force = argv.includes("--force");
  const help = argv.includes("--help") || argv.includes("-h");
  const positional = argv.filter((arg) => !arg.startsWith("-"));
  return {
    command: positional[0],
    targetDir: positional[1],
    force,
    help,
  };
}

async function getPathStatus(targetPath: string): Promise<"directory" | "file" | "missing"> {
  try {
    const stats = await stat(targetPath);
    return stats.isDirectory() ? "directory" : "file";
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return "missing";
    }
    throw error;
  }
}

function packageNameFromDir(targetDir: string): string {
  const basename = path.basename(targetDir);
  const normalized = basename
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "lambdaimg-app";
}

function appFiles(packageName: string): Record<string, string> {
  return {
    "package.json": `${JSON.stringify(
      {
        name: packageName,
        version: "0.2.0",
        private: true,
        type: "module",
        scripts: {
          check: "tsc --noEmit -p tsconfig.json",
          deploy: "alchemy deploy",
          destroy: "alchemy destroy",
        },
        dependencies: TEMPLATE_PACKAGE_VERSIONS.dependencies,
        devDependencies: TEMPLATE_PACKAGE_VERSIONS.devDependencies,
      },
      null,
      2,
    )}\n`,
    "alchemy.run.ts": `import { ImagesStack } from "@lambdaimg/alchemy";
import * as Alchemy from "alchemy";
import * as AWS from "alchemy/AWS";
import { Stack } from "alchemy/Stack";
import * as Effect from "effect/Effect";

const STAGE_CONFIG = {
  dev: {
    domain: "images.dev.example.com",
    hostedZoneId: "Z0000000000000",
  },
  prod: {
    domain: "images.example.com",
    hostedZoneId: "Z0000000000000",
  },
} as const;

type ImagesStage = keyof typeof STAGE_CONFIG;

export default Alchemy.Stack(
  "lambdaimg",
  {
    providers: AWS.providers(),
    state: AWS.state(),
  },
  Effect.gen(function* () {
    const { stage } = yield* Stack;
    const config = STAGE_CONFIG[stage as ImagesStage];
    if (!config) {
      return yield* Effect.die(
        \`Unknown stage "\${stage}". Expected one of: \${Object.keys(STAGE_CONFIG).join(", ")}\`,
      );
    }

    return yield* ImagesStack("Images", config);
  }),
);
`,
    "tsconfig.json": `${JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          lib: ["ES2022", "DOM"],
          module: "NodeNext",
          moduleResolution: "NodeNext",
          strict: true,
          skipLibCheck: true,
          types: ["node"],
        },
        include: ["alchemy.run.ts"],
      },
      null,
      2,
    )}\n`,
    ".env.example": "AWS_REGION=us-east-1\nAWS_PROFILE=default\n",
    ".gitignore": "node_modules\n.alchemy\n.env\n.env.*\n!.env.example\ndist\n",
    "README.md": `# ${packageName}

Deployable LambdaImg app generated by \`lambdaimg create\`.

## Setup

1. Install dependencies:

   \`\`\`sh
   bun install
   \`\`\`

2. Edit \`alchemy.run.ts\` and replace the example domains and hosted zone ids.

3. Configure AWS credentials:

   \`\`\`sh
   cp .env.example .env
   \`\`\`

4. Deploy:

   \`\`\`sh
   bun run deploy
   \`\`\`

The stack creates an S3 bucket for originals, a Lambda resize function, and a CloudFront distribution for original and resized image URLs.
`,
  };
}

function usage(): string {
  return `Usage:
  lambdaimg create <dir> [--force]

Commands:
  create <dir>  Create a deployable LambdaImg Alchemy app.

Options:
  --force       Write files into a non-empty directory.
  -h, --help    Show this help message.
`;
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

function isCliEntrypoint(): boolean {
  const argvPath = process.argv[1];
  if (!argvPath) {
    return false;
  }
  try {
    return realpathSync(path.resolve(argvPath)) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isCliEntrypoint()) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}
