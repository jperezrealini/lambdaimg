import {
  NOT_FOUND_CACHE_CONTROL,
  RESIZED_CACHE_CONTROL,
  WEBP_CONTENT_TYPE,
  parseResizedPath,
} from "@lambdaimg/core";
import * as AWS from "alchemy/AWS";
import * as S3 from "alchemy/AWS/S3";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Stream from "effect/Stream";
import { HttpServerRequest } from "effect/unstable/http/HttpServerRequest";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";
import { imagesBucket } from "./images-bucket.js";
import { resizeToWebp } from "./resize.js";

function collectBodyBytes(chunks: Iterable<Uint8Array>): Uint8Array {
  const parts = Array.from(chunks);
  const total = parts.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  for (const chunk of parts) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  return output;
}

export default class ImagesResize extends AWS.Lambda.Function<ImagesResize>()(
  "ImagesResize",
  {
    main: import.meta.filename,
    url: { authType: "AWS_IAM" },
    timeout: Duration.seconds(30),
    runtime: "nodejs24.x",
    architecture: "arm64",
    memorySize: 2048,
    build: {
      install: ["sharp", "heic-convert"],
    },
  },
  Effect.gen(function* () {
    const bucket = yield* imagesBucket;
    const getObject = yield* S3.GetObject.bind(bucket);
    const putObject = yield* S3.PutObject.bind(bucket);

    return {
      fetch: Effect.gen(function* () {
        const request = yield* HttpServerRequest;
        const parsed = parseResizedPath(new URL(request.originalUrl).pathname);
        if (!parsed) {
          return HttpServerResponse.text("Not Found", {
            status: 404,
            headers: { "cache-control": NOT_FOUND_CACHE_CONTROL },
          });
        }

        const cached = yield* getObject({ Key: parsed.resizedKey }).pipe(
          Effect.catchTag("NoSuchKey", () => Effect.succeed(undefined)),
        );

        if (cached?.Body) {
          const cachedBytes = yield* Stream.runCollect(cached.Body).pipe(
            Effect.map(collectBodyBytes),
          );
          return HttpServerResponse.uint8Array(cachedBytes, {
            headers: {
              "content-type": WEBP_CONTENT_TYPE,
              "cache-control": RESIZED_CACHE_CONTROL,
            },
          });
        }

        const object = yield* getObject({ Key: parsed.originalKey }).pipe(
          Effect.catchTag("NoSuchKey", () => Effect.succeed(undefined)),
        );

        if (!object?.Body) {
          return HttpServerResponse.text("Not Found", {
            status: 404,
            headers: { "cache-control": NOT_FOUND_CACHE_CONTROL },
          });
        }

        const sourceBytes = yield* Stream.runCollect(object.Body).pipe(
          Effect.map(collectBodyBytes),
        );

        const resizeResult = yield* Effect.tryPromise({
          try: () =>
            resizeToWebp(sourceBytes, parsed.width, {
              originalKey: parsed.originalKey,
            }),
          catch: (cause) => cause,
        }).pipe(
          Effect.match({
            onFailure: () => ({ ok: false as const }),
            onSuccess: (webp) => ({ ok: true as const, webp }),
          }),
        );

        if (!resizeResult.ok) {
          return HttpServerResponse.text("Bad Request", { status: 400 });
        }

        const { webp } = resizeResult;

        yield* putObject({
          Key: parsed.resizedKey,
          Body: webp,
          ContentType: WEBP_CONTENT_TYPE,
          CacheControl: RESIZED_CACHE_CONTROL,
        });

        return HttpServerResponse.uint8Array(webp, {
          headers: {
            "content-type": WEBP_CONTENT_TYPE,
            "cache-control": RESIZED_CACHE_CONTROL,
          },
        });
      }).pipe(
        Effect.catchCause(() =>
          Effect.succeed(
            HttpServerResponse.text("Internal Server Error", { status: 500 }),
          ),
        ),
      ),
    };
  }).pipe(Effect.provide(Layer.mergeAll(S3.GetObjectLive, S3.PutObjectLive))),
) {}
