import { createRequire } from "node:module";
import sharp from "sharp";

const HEIC_EXTENSION_RE = /\.(?:heic|heif)$/i;
const require = createRequire(import.meta.url);
const heicConvert = require("heic-convert") as (options: {
  buffer: Buffer;
  format: "PNG";
}) => Promise<Buffer>;

export interface ResizeToWebpOptions {
  originalKey?: string;
}

export async function resizeToWebp(
  input: Uint8Array | Buffer,
  width: number,
  options: ResizeToWebpOptions = {},
): Promise<Uint8Array> {
  try {
    return await resizeSharpInputToWebp(input, width);
  } catch (error) {
    if (!options.originalKey || !HEIC_EXTENSION_RE.test(options.originalKey)) {
      throw error;
    }

    const png = await heicConvert({
      buffer: Buffer.from(input),
      format: "PNG",
    });

    return await resizeSharpInputToWebp(Buffer.from(png), width);
  }
}

async function resizeSharpInputToWebp(
  input: Uint8Array | Buffer,
  width: number,
): Promise<Uint8Array> {
  const output = await sharp(input)
    .rotate()
    .resize({ width, withoutEnlargement: true })
    .webp()
    .toBuffer();
  return new Uint8Array(output);
}
