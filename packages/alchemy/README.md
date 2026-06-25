# @lambdaimg/alchemy

AWS Alchemy stack for LambdaImg.

```ts
import { ImagesStack } from "@lambdaimg/alchemy";
import * as Alchemy from "alchemy";
import * as AWS from "alchemy/AWS";
import * as Effect from "effect/Effect";

export default Alchemy.Stack(
  "images",
  {
    providers: AWS.providers(),
    state: AWS.state(),
  },
  Effect.gen(function* () {
    return yield* ImagesStack("Images", {
      domain: "images.example.com",
      hostedZoneId: "Z0000000000000",
    });
  }),
);
```

This package is AWS Lambda only. LambdaImg uses Sharp native binaries for WebP generation, so Cloudflare Workers are intentionally out of scope.
