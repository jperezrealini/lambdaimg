import { ALLOWED_IMAGE_WIDTHS, buildSrcSet } from "@lambdaimg/core";
import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { Image } from "../src/index.js";

describe("Image", () => {
  test("renders one img with generated LambdaImg attributes", () => {
    const html = renderToStaticMarkup(
      <Image
        src="https://images.example.com/some/path/dog.jpeg"
        widths={[320, 640]}
        sizes="(min-width: 48rem) 50vw, 100vw"
        width={640}
        height={480}
        alt="Dog"
      />,
    );

    expect(html.startsWith("<img ")).toBe(true);
    expect(html.endsWith("/>")).toBe(true);
    expect(html).toContain('alt="Dog"');
    expect(html).toContain('src="https://images.example.com/some/path/dog.jpeg"');
    expect(html).toContain(
      'srcSet="https://images.example.com/_/w320/some/path/dog.jpeg/dog.webp 320w, https://images.example.com/_/w640/some/path/dog.jpeg/dog.webp 640w"',
    );
    expect(html).toContain('sizes="(min-width: 48rem) 50vw, 100vw"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('decoding="async"');
  });

  test("defaults widths to all allowed image widths", () => {
    const html = renderToStaticMarkup(
      <Image
        src="https://images.example.com/products/chair.jpeg"
        width={640}
        height={480}
        alt="Chair"
      />,
    );

    const expectedSrcSet = buildSrcSet("products/chair.jpeg", {
      baseUrl: "https://images.example.com",
      widths: ALLOWED_IMAGE_WIDTHS,
    });

    expect(html).toContain(`srcSet="${expectedSrcSet}"`);
  });

  test("priority images are eager and high priority", () => {
    const html = renderToStaticMarkup(
      <Image priority src="hero.jpeg" width={1440} height={810} alt="Hero" />,
    );

    expect(html).toContain('loading="eager"');
    expect(html).toContain('fetchPriority="high"');
  });

  test("preserves protocol-relative src and query on the fallback image", () => {
    const html = renderToStaticMarkup(
      <Image
        src="//images.example.com/some/path/dog.jpeg?v=20260709"
        widths={[640]}
        width={640}
        height={480}
        alt="Dog"
      />,
    );

    expect(html).toContain('src="//images.example.com/some/path/dog.jpeg?v=20260709"');
    expect(html).toContain('srcSet="//images.example.com/_/w640/some/path/dog.jpeg/dog.webp 640w"');
  });
});
