import {
  ALLOWED_IMAGE_WIDTHS,
  buildOriginalUrl,
  buildSrcSet,
  resolveImageSrc,
  type ImageWidth,
} from "@lambdaimg/core";
import type * as React from "react";

export interface ImageProps extends Omit<
  React.ImgHTMLAttributes<HTMLImageElement>,
  "alt" | "src" | "srcSet" | "sizes" | "loading" | "decoding"
> {
  alt: string;
  /** Full image URL (or object key path) for the original in S3. */
  src: string;
  widths?: readonly ImageWidth[];
  sizes?: string;
  priority?: boolean;
  loading?: "eager" | "lazy";
  decoding?: "async" | "auto" | "sync";
}

export function Image({
  alt,
  src,
  widths = ALLOWED_IMAGE_WIDTHS,
  sizes = "100vw",
  priority = false,
  loading,
  decoding = "async",
  ...props
}: ImageProps) {
  const { baseUrl, key, search, hash } = resolveImageSrc(src);
  const resolvedLoading = loading ?? (priority ? "eager" : "lazy");
  const fetchPriority = priority ? "high" : props.fetchPriority;

  return (
    <img
      {...props}
      alt={alt}
      src={buildOriginalUrl(key, { baseUrl, search, hash })}
      srcSet={buildSrcSet(key, { baseUrl, widths })}
      sizes={sizes}
      loading={resolvedLoading}
      decoding={decoding}
      fetchPriority={fetchPriority}
    />
  );
}

export type { ImageWidth };
