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
    return yield* ImagesStack("Images", {});
  }),
);
```

Deploy output includes a CloudFront URL to use as `baseUrl`. For a custom domain, pass both `domain` and `hostedZoneId`:

```ts
return (
  yield *
  ImagesStack("Images", {
    domain: "images.example.com",
    hostedZoneId: "Z0000000000000",
  })
);
```

## E2E tests

Integration tests deploy real S3, Lambda, and CloudFront resources in AWS. They are opt-in and run locally only:

```sh
# AWS credentials via env / AWS_PROFILE + AWS_REGION
bun run test:e2e

# keep the stack for iteration (skips destroy):
NO_DESTROY=1 bun run test:e2e
```

The first run can take ~10 minutes while CloudFront is created. With `NO_DESTROY=1`, re-runs diff against cached `.alchemy/` state and are much faster.
