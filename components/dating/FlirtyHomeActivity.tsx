'use client';

import { useEffect, useState } from 'react';
import type { HomeActivity } from '@/lib/dating/home';

export function FlirtyHomeActivity({ events }: { events: HomeActivity[] }) {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (events.length < 2) return;
    const id = window.setInterval(() => {
      setOffset((n) => n + 1);
    }, 3800);
    return () => window.clearInterval(id);
  }, [events.length]);

  if (events.length === 0) return null;

  const shown = [0, 1, 2]
    .map((i) => events[(offset + i) % events.length])
    .filter((ev, i, arr): ev is HomeActivity => Boolean(ev) && arr.indexOf(ev) === i);

  return (
    <div className="fhome-feed">
      {shown.map((ev, i) => (
        // Two events can share text and time ("new profile — other, 59 min").
        <div className="fhome-feed__row" key={`${i}-${ev.text}-${ev.when}`}>
          <span className="fhome-feed__avatar" style={{ background: ev.bg }} />
          <span className="fhome-feed__text">{ev.text}</span>
          <span className="fhome-feed__when">{ev.when}</span>
        </div>
      ))}
    </div>
  );
}
