# @lambdaimg/react

A tiny React component for LambdaImg. It renders one plain `<img>` with generated `srcSet` values.

Pass the full original image URL as `src` (CloudFront or custom domain + object key):

```tsx
import { Image } from "@lambdaimg/react";

<Image
  src="https://images.example.com/products/chair.jpeg"
  width={640}
  height={480}
  alt="Walnut chair"
/>;
```

Use `priority` for above-the-fold images:

```tsx
<Image
  priority
  src="https://images.example.com/hero.jpeg"
  width={1440}
  height={810}
  alt="Showroom"
/>
```
