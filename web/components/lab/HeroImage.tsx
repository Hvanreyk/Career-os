/**
 * Responsive hero picture for the landing-page concepts.
 *
 * Serves AVIF with a WebP fallback, and a separate 4:5 mobile crop below 768px
 * because the desktop 8:5 composition loses its subject when squeezed. Explicit
 * width/height on the <img> reserve the box before decode, so the hero cannot
 * shift layout. The hero is the LCP element on every concept, so it is eager +
 * high priority and never lazy.
 */
interface Props {
  /** Base slug, e.g. "v1-mapped-paper" — resolves to /hero/<slug>-{desktop,mobile}.{avif,webp} */
  slug: string;
  alt: string;
  className?: string;
  /** object-position for the desktop crop. */
  position?: string;
  /** Below-the-fold heroes can opt out of priority loading. */
  priority?: boolean;
}

export function HeroImage({ slug, alt, className = '', position = 'center', priority = true }: Props) {
  return (
    <picture>
      <source
        media="(max-width: 767px)"
        srcSet={`/hero/${slug}-mobile.avif`}
        type="image/avif"
        width={1200}
        height={1500}
      />
      <source
        media="(max-width: 767px)"
        srcSet={`/hero/${slug}-mobile.webp`}
        type="image/webp"
        width={1200}
        height={1500}
      />
      <source srcSet={`/hero/${slug}-desktop.avif`} type="image/avif" width={2048} height={1280} />
      <source srcSet={`/hero/${slug}-desktop.webp`} type="image/webp" width={2048} height={1280} />
      <img
        src={`/hero/${slug}-desktop.webp`}
        alt={alt}
        width={2048}
        height={1280}
        decoding="async"
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        className={className}
        style={{ objectPosition: position }}
      />
    </picture>
  );
}
