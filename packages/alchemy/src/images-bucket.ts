import * as S3 from "alchemy/AWS/S3";
import { Stack } from "alchemy/Stack";
import * as Effect from "effect/Effect";

export const imagesBucket = Effect.gen(function* () {
  const stack = yield* Stack;

  return yield* S3.Bucket("ImagesBucket", {
    forceDestroy: stack.stage === "dev" || stack.stage === "test",
    publicAccessBlock: {
      blockPublicAcls: true,
      ignorePublicAcls: true,
      blockPublicPolicy: true,
      restrictPublicBuckets: true,
    },
  });
});
