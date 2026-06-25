import { describe, expect, test } from "bun:test";
import sharp from "sharp";
import { resizeToWebp } from "../src/resize.js";

describe("resizeToWebp", () => {
  test("resizes by width and returns webp bytes", async () => {
    const source = await sharp({
      create: {
        width: 800,
        height: 400,
        channels: 3,
        background: { r: 255, g: 0, b: 0 },
      },
    })
      .jpeg()
      .toBuffer();

    const resized = await resizeToWebp(source, 320);
    const metadata = await sharp(resized).metadata();

    expect(metadata.format).toBe("webp");
    expect(metadata.width).toBe(320);
    expect(metadata.height).toBe(160);
  });

  test("does not upscale images narrower than the target width", async () => {
    const source = await sharp({
      create: {
        width: 100,
        height: 200,
        channels: 3,
        background: { r: 0, g: 255, b: 0 },
      },
    })
      .png()
      .toBuffer();

    const resized = await resizeToWebp(source, 640);
    const metadata = await sharp(resized).metadata();

    expect(metadata.width).toBe(100);
    expect(metadata.height).toBe(200);
  });
});
