'use client';

import { useEffect, useRef, useState } from 'react';

type Photo = { id: string; url: string };

/**
 * Full-bleed photo pager. Swipe on touch, tap the left/right third on any
 * device — the tap target is what makes it feel like an app rather than a web
 * page with a horizontal scrollbar.
 *
 * The segment bar reads scroll position rather than driving it, so a swipe and
 * a tap stay in sync and momentum scrolling is never fought.
 */
export function ProfilePhotoCarousel({
  photos,
  alt,
  labels,
}: {
  photos: Photo[];
  alt: string;
  labels: { prev: string; next: string };
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const count = photos.length;

  useEffect(() => {
    const el = trackRef.current;
    if (!el || count < 2) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!el.clientWidth) return;
        const i = Math.round(el.scrollLeft / el.clientWidth);
        setIndex(Math.max(0, Math.min(count - 1, i)));
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener('scroll', onScroll);
    };
  }, [count]);

  function go(direction: -1 | 1) {
    const el = trackRef.current;
    if (!el) return;
    const next = Math.max(0, Math.min(count - 1, index + direction));
    el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' });
  }

  return (
    <div className="pphotos">
      <div className="pphotos__track" ref={trackRef}>
        {photos.map((photo) => (
          <div className="pphotos__item" key={photo.id}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.url} alt={alt} draggable={false} />
          </div>
        ))}
      </div>

      {count > 1 ? (
        <>
          <div className="pphotos__segments" aria-hidden="true">
            {photos.map((photo, i) => (
              <span
                key={photo.id}
                className={`pphotos__seg${i === index ? ' is-active' : ''}`}
              />
            ))}
          </div>
          <button
            type="button"
            className="pphotos__tap pphotos__tap--prev"
            onClick={() => go(-1)}
            disabled={index === 0}
            aria-label={labels.prev}
          />
          <button
            type="button"
            className="pphotos__tap pphotos__tap--next"
            onClick={() => go(1)}
            disabled={index === count - 1}
            aria-label={labels.next}
          />
        </>
      ) : null}
    </div>
  );
}
