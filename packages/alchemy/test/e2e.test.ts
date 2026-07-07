import * as S3 from "@distilled.cloud/aws/s3";
import { buildResizedUrl, resizedS3Key, WEBP_CONTENT_TYPE } from "@lambdaimg/core";
import * as Alchemy from "alchemy";
import * as AWS from "alchemy/AWS";
import * as Test from "alchemy/Test/Bun";
import { getWhenReady } from "alchemy/Test/Bun";
import * as TestCore from "alchemy/Test/Core";
import { test as bunTest, expect } from "bun:test";
import * as Effect from "effect/Effect";
import * as HttpClient from "effect/unstable/http/HttpClient";
import sharp from "sharp";
import E2eStack from "./fixtures/e2e-stack.js";

if (!process.env.RUN_AWS_E2E) {
  bunTest.skip("AWS E2E (set RUN_AWS_E2E=1 to run)", () => {});
} else {
  const makeOptions: Test.MakeOptions = {
    providers: AWS.providers(),
    state: Alchemy.localState(),
    stage: process.env.ALCHEMY_STAGE ?? "test",
  };
  const { test, beforeAll, afterAll, deploy, destroy } = Test.make(makeOptions);

  // CloudFront create can take ~10 min; disable+delete on destroy can take 10-20 min.
  const stack = beforeAll(deploy(E2eStack), { timeout: 900_000 });
  afterAll.skipIf(!!process.env.NO_DESTROY)(destroy(E2eStack), { timeout: 1_800_000 });

  // Random per-run prefix so reused stacks (NO_DESTROY=1) never serve
  // derivatives cached by CloudFront/S3 from a previous run.
  const runId = crypto.randomUUID().slice(0, 8);
  const fixtureKey = `e2e/${runId}/fixture.jpeg`;
  const missingKey = `e2e/${runId}/missing.jpeg`;

  // Plain `test` bodies don't have the AWS Credentials/Region services in
  // scope, so run SDK calls through the harness's provider context — the same
  // Alchemy auth flow the deploy itself uses.
  const withAws = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
    TestCore.withProviders(effect, makeOptions, "lambdaimg-e2e");

  const uploadFixture = (bucketName: string) =>
    Effect.gen(function* () {
      const source = yield* Effect.promise(() =>
        sharp({
          create: {
            width: 800,
            height: 400,
            channels: 3,
            background: { r: 255, g: 0, b: 0 },
          },
        })
          .jpeg()
          .toBuffer(),
      );

      yield* withAws(
        S3.putObject({
          Bucket: bucketName,
          Key: fixtureKey,
          Body: new Uint8Array(source),
          ContentType: "image/jpeg",
        }),
      );
    });

  test(
    "generates WebP on first request",
    Effect.gen(function* () {
      const { url, bucketName } = yield* stack;
      yield* uploadFixture(bucketName);

      const response = yield* getWhenReady(`${url}${buildResizedUrl(fixtureKey, 320)}`);
      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toBe(WEBP_CONTENT_TYPE);

      const bytes = Buffer.from(yield* response.arrayBuffer);
      const metadata = yield* Effect.promise(() => sharp(bytes).metadata());
      expect(metadata.format).toBe("webp");
      expect(metadata.width).toBe(320);
    }),
  );

  test(
    "serves cached derivative on second request",
    Effect.gen(function* () {
      const { url, bucketName } = yield* stack;
      const resizedUrl = `${url}${buildResizedUrl(fixtureKey, 320)}`;

      const response = yield* getWhenReady(resizedUrl);
      expect(response.status).toBe(200);

      const bytes = Buffer.from(yield* response.arrayBuffer);
      const metadata = yield* Effect.promise(() => sharp(bytes).metadata());
      expect(metadata.width).toBe(320);

      const head = yield* withAws(
        S3.headObject({
          Bucket: bucketName,
          Key: resizedS3Key(fixtureKey, 320),
        }),
      );
      expect(head.ContentType).toBe(WEBP_CONTENT_TYPE);
    }),
  );

  test(
    "returns 404 for missing original",
    Effect.gen(function* () {
      const { url } = yield* stack;
      const missingUrl = `${url}${buildResizedUrl(missingKey, 320)}`;

      const response = yield* HttpClient.get(missingUrl);
      expect(response.status).toBe(404);
    }),
  );
}
