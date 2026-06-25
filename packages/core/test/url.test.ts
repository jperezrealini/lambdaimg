import { describe, expect, test } from "bun:test";
import {
  buildOriginalUrl,
  buildResizedUrl,
  buildSrcSet,
  canonicalFilename,
  isAllowedImageWidth,
  normalizeBaseUrl,
  normalizeImageKey,
  parseResizedPath,
} from "../src/index.js";

describe("canonicalFilename", () => {
  test("strips the last extension from the final segment", () => {
    expect(canonicalFilename("some/path/dog.jpeg")).toBe("dog");
    expect(canonicalFilename("dog.tar.gz")).toBe("dog.tar");
    expect(canonicalFilename("no-extension")).toBe("no-extension");
  });
});

describe("width validation", () => {
  test("accepts only LambdaImg widths", () => {
    expect(isAllowedImageWidth(640)).toBe(true);
    expect(isAllowedImageWidth(999)).toBe(false);
  });
});

describe("normalization", () => {
  test("normalizes leading slashes and trailing base URL slashes", () => {
    expect(normalizeImageKey("/some/path/dog.jpeg")).toBe("some/path/dog.jpeg");
    expect(normalizeBaseUrl("https://images.example.com///")).toBe("https://images.example.com");
  });
});

describe("buildOriginalUrl", () => {
  test("maps the s3 key to a root path", () => {
    expect(buildOriginalUrl("some/path/dog.jpeg")).toBe("/some/path/dog.jpeg");
  });

  test("prepends a normalized base URL", () => {
    expect(
      buildOriginalUrl("/some/path/dog.jpeg", {
        baseUrl: "https://images.example.com/",
      }),
    ).toBe("https://images.example.com/some/path/dog.jpeg");
  });
});

describe("buildResizedUrl", () => {
  test("builds the canonical resized path", () => {
    expect(buildResizedUrl("some/path/dog.jpeg", 640)).toBe("/_/w640/some/path/dog.jpeg/dog.webp");
  });

  test("prepends a normalized base URL", () => {
    expect(
      buildResizedUrl("/some/path/dog.jpeg", 640, {
        baseUrl: "https://images.example.com/",
      }),
    ).toBe("https://images.example.com/_/w640/some/path/dog.jpeg/dog.webp");
  });
});

describe("buildSrcSet", () => {
  test("generates width descriptors for each configured width", () => {
    expect(
      buildSrcSet("some/path/dog.jpeg", {
        widths: [320, 640],
        baseUrl: "https://images.example.com/",
      }),
    ).toBe(
      "https://images.example.com/_/w320/some/path/dog.jpeg/dog.webp 320w, https://images.example.com/_/w640/some/path/dog.jpeg/dog.webp 640w",
    );
  });
});

describe("parseResizedPath", () => {
  test("round-trips canonical resized paths", () => {
    const s3Key = "some/path/dog.jpeg";
    const pathname = buildResizedUrl(s3Key, 1440);
    expect(parseResizedPath(pathname)).toEqual({
      width: 1440,
      originalKey: s3Key,
      resizedKey: "_/w1440/some/path/dog.jpeg/dog.webp",
    });
  });

  test("rejects non-whitelisted widths", () => {
    expect(parseResizedPath("/_/w999/some/path/dog.jpeg/dog.webp")).toBeNull();
  });

  test("rejects non-canonical filenames", () => {
    expect(parseResizedPath("/_/w640/some/path/dog.jpeg/not-dog.webp")).toBeNull();
  });

  test("rejects derived originals", () => {
    expect(parseResizedPath("/_/w640/_/secret/dog.jpeg/dog.webp")).toBeNull();
  });

  test("rejects non-webp extensions", () => {
    expect(parseResizedPath("/_/w640/some/path/dog.jpeg/dog.jpeg")).toBeNull();
  });
});
