import * as Alchemy from "alchemy";
import * as AWS from "alchemy/AWS";
import * as Effect from "effect/Effect";
import { ImagesStack } from "../../src/stack.js";

export default Alchemy.Stack(
  "lambdaimg-e2e",
  {
    providers: AWS.providers(),
    state: Alchemy.localState(),
  },
  Effect.gen(function* () {
    return yield* ImagesStack("Images", {});
  }),
);
