import { ImagesStack } from "@lambdaimg/alchemy";
import * as Alchemy from "alchemy";
import * as AWS from "alchemy/AWS";
import * as Effect from "effect/Effect";

export default Alchemy.Stack(
  "lambdaimg",
  {
    providers: AWS.providers(),
    state: AWS.state(),
  },
  Effect.gen(function* () {
    return yield* ImagesStack("Images", {});

    // Custom domain — replace the line above and pass both props together:
    // return yield* ImagesStack("Images", {
    //   domain: "images.example.com",
    //   hostedZoneId: "Z0000000000000",
    // });
  }),
);
