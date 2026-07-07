# LambdaImg

LambdaImg is a serverless image service for AWS Lambda. It stores originals in S3, serves them through CloudFront, and lazily generates cached WebP derivatives with Sharp.

The monorepo contains:

- `@lambdaimg/core`: URL, width, and `srcset` primitives.
- `@lambdaimg/alchemy`: the AWS-only Alchemy stack and Lambda resize runtime.
- `@lambdaimg/react`: a small React `<Image />` component that renders one plain `<img>`.
- `lambdaimg`: a CLI for creating deployable image app directories.

## Quickstart

Scaffold a deployable app:

```sh
bunx lambdaimg create my-images
cd my-images
bun install
```

Configure AWS credentials for Alchemy, then deploy:

```sh
cp .env.example .env
# edit AWS_PROFILE and AWS_REGION
bun run deploy
```

The stack serves images at your CloudFront distribution URL (shown in the deploy output). Use that URL as `baseUrl` in your app.

Upload original images to the generated S3 bucket. The original object key becomes the image `src`:

```tsx
import { Image } from "@lambdaimg/react";

export function ProductPhoto() {
  return (
    <Image
      baseUrl="https://d111111abcdef8.cloudfront.net"
      src="products/chair.jpeg"
      width={640}
      height={480}
      alt="Walnut chair"
    />
  );
}
```

LambdaImg generates derivative URLs like:

```txt
/_/w640/products/chair.jpeg/chair.webp
```

The first request generates and stores the WebP derivative in S3. CloudFront and S3 serve later requests from cache.

### Custom domain (optional)

To serve images on your own hostname, pass **both** `domain` and `hostedZoneId` to `ImagesStack` in `alchemy.run.ts`:

```ts
return (
  yield *
  ImagesStack("Images", {
    domain: "images.example.com",
    hostedZoneId: "Z0000000000000",
  })
);
```

A bare CNAME to the CloudFront domain is not enough — CloudFront needs a matching alias and TLS certificate, which the stack provisions when both props are set.

## Development

```sh
bun install
bun run build
bun run check
bun run test
```
