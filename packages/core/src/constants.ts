export const ALLOWED_IMAGE_WIDTHS = [
  160, 320, 480, 640, 828, 1080, 1440, 1920,
] as const;

export type ImageWidth = (typeof ALLOWED_IMAGE_WIDTHS)[number];

export const DERIVED_PREFIX = "_";

export const WEBP_CONTENT_TYPE = "image/webp";

export const RESIZED_CACHE_CONTROL = "public, max-age=31536000, immutable";

export const NOT_FOUND_CACHE_CONTROL = "public, max-age=60";
