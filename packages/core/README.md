# @lambdaimg/core

Core URL and responsive image helpers for LambdaImg.

```ts
import { buildOriginalUrl, buildResizedUrl, buildSrcSet } from "@lambdaimg/core";

buildOriginalUrl("products/chair.jpeg");
buildResizedUrl("products/chair.jpeg", 640);
buildSrcSet("products/chair.jpeg", { baseUrl: "https://images.example.com" });
```

LambdaImg derivative URLs are canonicalized as:

```txt
/_/w{width}/{originalKey}/{filename}.webp
```
