import {
  ALLOWED_IMAGE_WIDTHS,
  DERIVED_PREFIX,
  type ImageWidth,
} from "./constants.js";

export interface ParsedResizedPath {
  width: ImageWidth;
  originalKey: string;
  resizedKey: string;
}

export interface BuildImageUrlOptions {
  baseUrl?: string;
}

export interface BuildSrcSetOptions extends BuildImageUrlOptions {
  widths?: readonly ImageWidth[];
}

const RESIZED_PATH_RE = /^\/_\/w(\d+)\/(.+)\.webp$/;

export function canonicalFilename(s3Key: string): string {
  const lastSegment = s3Key.split("/").pop() ?? s3Key;
  const dotIndex = lastSegment.lastIndexOf(".");
  if (dotIndex <= 0) {
    return lastSegment;
  }
  return lastSegment.slice(0, dotIndex);
}

export function isAllowedImageWidth(width: number): width is ImageWidth {
  return (ALLOWED_IMAGE_WIDTHS as readonly number[]).includes(width);
}

export function normalizeImageKey(imageKey: string): string {
  return imageKey.replace(/^\/+/, "");
}

export function normalizeBaseUrl(baseUrl = ""): string {
  return baseUrl.replace(/\/+$/, "");
}

export function buildOriginalUrl(
  s3Key: string,
  options: BuildImageUrlOptions = {},
): string {
  return withBaseUrl(options.baseUrl, `/${normalizeImageKey(s3Key)}`);
}

export function buildResizedUrl(
  s3Key: string,
  width: ImageWidth,
  options: BuildImageUrlOptions = {},
): string {
  const normalizedKey = normalizeImageKey(s3Key);
  const filename = canonicalFilename(normalizedKey);
  return withBaseUrl(
    options.baseUrl,
    `/_/${`w${width}`}/${normalizedKey}/${filename}.webp`,
  );
}

export function buildSrcSet(
  s3Key: string,
  options: BuildSrcSetOptions = {},
): string {
  const widths = options.widths ?? ALLOWED_IMAGE_WIDTHS;
  return widths
    .map((width) => `${buildResizedUrl(s3Key, width, options)} ${width}w`)
    .join(", ");
}

export function resizedS3Key(s3Key: string, width: ImageWidth): string {
  return buildResizedUrl(s3Key, width).slice(1);
}

export function parseResizedPath(pathname: string): ParsedResizedPath | null {
  const match = RESIZED_PATH_RE.exec(pathname);
  if (!match?.[1] || !match[2]) {
    return null;
  }

  const width = Number.parseInt(match[1], 10);
  if (!isAllowedImageWidth(width)) {
    return null;
  }

  const middle = match[2];
  const lastSlash = middle.lastIndexOf("/");
  if (lastSlash === -1) {
    return null;
  }

  const originalKey = middle.slice(0, lastSlash);
  const filename = middle.slice(lastSlash + 1);

  if (originalKey.length === 0 || filename.length === 0) {
    return null;
  }

  if (originalKey.startsWith(`${DERIVED_PREFIX}/`)) {
    return null;
  }

  if (canonicalFilename(originalKey) !== filename) {
    return null;
  }

  return {
    width,
    originalKey,
    resizedKey: pathname.slice(1),
  };
}

function withBaseUrl(baseUrl: string | undefined, pathname: string): string {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  if (!normalizedBaseUrl) {
    return pathname;
  }
  return `${normalizedBaseUrl}${pathname}`;
}
