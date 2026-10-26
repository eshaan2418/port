/**
 * A company logo in a fixed square slot so rows / cards stay aligned whatever
 * the file's aspect ratio. The slot is a small rounded cream tile; the logo
 * sits inside it with `object-fit: contain` (never stretched, never
 * recoloured). Raster files (png / jpg / webp) usually carry their own white
 * or coloured background, so they get a hair of padding and rounded corners
 * inside the tile instead of a hard square edge; the image itself is never
 * edited.
 */
export function LogoMark({
  src,
  alt,
  size = 22,
  className = "",
}: {
  src: string;
  /** describe the company, e.g. "Cohere logo" */
  alt: string;
  size?: number;
  className?: string;
}) {
  const raster = !/\.svg($|\?)/i.test(src);
  const slot = size + 8;
  return (
    <span
      data-logo
      className={`inline-flex shrink-0 items-center justify-center rounded-[7px] bg-cream ring-1 ring-ink/10 ${className}`}
      style={{ width: slot, height: slot }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- tiny local logo files; next/image adds nothing here */}
      <img
        src={src}
        alt={alt}
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        draggable={false}
        className={`block object-contain ${raster ? "rounded-[4px]" : ""}`}
        style={{ width: size, height: size }}
      />
    </span>
  );
}
