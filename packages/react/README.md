# @lambdaimg/react

A tiny React component for LambdaImg. It renders one plain `<img>` with generated `srcSet` values.

```tsx
import { Image } from "@lambdaimg/react";

<Image
  baseUrl="https://images.example.com"
  src="products/chair.jpeg"
  width={640}
  height={480}
  alt="Walnut chair"
/>;
```

Use `priority` for above-the-fold images:

```tsx
<Image
  priority
  baseUrl="https://images.example.com"
  src="hero.jpeg"
  width={1440}
  height={810}
  alt="Showroom"
/>
```
