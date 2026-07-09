# @lambdaimg/core

Core URL and responsive image helpers for LambdaImg.

```ts
import { buildOriginalUrl, buildResizedUrl, buildSrcSet, resolveImageSrc } from "@lambdaimg/core";

buildOriginalUrl("products/chair.jpeg");
buildResizedUrl("products/chair.jpeg", 640);
buildSrcSet("products/chair.jpeg", { baseUrl: "https://images.example.com" });

// Split a full original URL when callers pass host + key together:
resolveImageSrc("https://images.example.com/products/chair.jpeg");
// => { baseUrl: "https://images.example.com", key: "/products/chair.jpeg" }
```

LambdaImg derivative URLs are canonicalized as:

```txt
/_/w{width}/{originalKey}/{filename}.webp
```
