import {
  ALLOWED_IMAGE_WIDTHS,
  buildOriginalUrl,
  buildSrcSet,
  type ImageWidth,
} from "@lambdaimg/core";
import type * as React from "react";

export interface ImageProps extends Omit<
  React.ImgHTMLAttributes<HTMLImageElement>,
  "alt" | "src" | "srcSet" | "sizes" | "loading" | "decoding"
> {
  alt: string;
  src: string;
  baseUrl?: string;
  widths?: readonly ImageWidth[];
  sizes?: string;
  priority?: boolean;
  loading?: "eager" | "lazy";
  decoding?: "async" | "auto" | "sync";
}

export function Image({
  alt,
  src,
  baseUrl,
  widths = ALLOWED_IMAGE_WIDTHS,
  sizes = "100vw",
  priority = false,
  loading,
  decoding = "async",
  ...props
}: ImageProps) {
  const resolvedLoading = loading ?? (priority ? "eager" : "lazy");
  const fetchPriority = priority ? "high" : props.fetchPriority;

  return (
    <img
      {...props}
      alt={alt}
      src={buildOriginalUrl(src, { baseUrl })}
      srcSet={buildSrcSet(src, { baseUrl, widths })}
      sizes={sizes}
      loading={resolvedLoading}
      decoding={decoding}
      fetchPriority={fetchPriority}
    />
  );
}

export type { ImageWidth };
