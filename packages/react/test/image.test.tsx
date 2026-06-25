import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { Image } from "../src/index.js";

describe("Image", () => {
  test("renders one img with generated LambdaImg attributes", () => {
    const html = renderToStaticMarkup(
      <Image
        baseUrl="https://images.example.com/"
        src="/some/path/dog.jpeg"
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

  test("priority images are eager and high priority", () => {
    const html = renderToStaticMarkup(
      <Image priority src="hero.jpeg" width={1440} height={810} alt="Hero" />,
    );

    expect(html).toContain('loading="eager"');
    expect(html).toContain('fetchPriority="high"');
  });
});
