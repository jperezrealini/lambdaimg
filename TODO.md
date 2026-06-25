# LambdaImg TODO

## Stage 1: Repo Scaffold

- [x] Create a Bun TypeScript workspace with package folders.
- [x] Add shared TypeScript config, root scripts, Turbo tasks, `.gitignore`, license, and release config.
- [x] Add root documentation and package-level documentation.

## Stage 2: Core Package

- [x] Port the URL contract and image width constants.
- [x] Export `buildOriginalUrl`, `buildResizedUrl`, `parseResizedPath`, and `buildSrcSet`.
- [x] Cover parsing, canonical filenames, width validation, base URL normalization, and srcset generation with tests.

## Stage 3: Alchemy AWS Package

- [x] Port the AWS Lambda/S3/CloudFront/Route53 stack.
- [x] Keep Sharp/WebP resizing, HEIC fallback conversion, ARM64 Lambda, and derivative read-through caching.
- [x] Expose `ImagesStack(id, props)` and `ImagesStackProps`.
- [x] Keep v1 AWS Lambda only; Cloudflare Workers are out of scope because Sharp needs native binaries.

## Stage 4: React Package

- [x] Implement a plain React `<Image />` that renders one `<img>`.
- [x] Generate LambdaImg `srcSet` values from the core package.
- [x] Default to lazy loading and `sizes="100vw"`, with `priority` opting into eager/high-priority loading.
- [x] Cover SSR output with tests.

## Stage 5: CLI Package

- [x] Implement `lambdaimg create <dir>`.
- [x] Generate `package.json`, `alchemy.run.ts`, `tsconfig.json`, `.env.example`, `.gitignore`, and README.
- [x] Refuse non-empty directories unless `--force` is passed.
- [x] Cover create and non-empty directory behavior with tests.

## Stage 6: Docs, Examples, Release Prep

- [x] Add root README quickstart.
- [x] Add package README files.
- [x] Add a generated-app example.
- [x] Add Changesets release configuration.
- [ ] Manually deploy a scaffolded app and verify original/resized URLs through CloudFront.
