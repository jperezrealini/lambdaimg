import { ImagesStack } from "@lambdaimg/alchemy";
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
        `Unknown stage "${stage}". Expected one of: ${Object.keys(STAGE_CONFIG).join(", ")}`,
      );
    }

    return yield* ImagesStack("Images", config);
  }),
);
