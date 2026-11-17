'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/** Renders children into the site header's page-action slot (#dating-header-slot). */
export function HeaderSlot({ children }: { children: React.ReactNode }) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setSlot(document.getElementById('dating-header-slot'));
  }, []);
  return slot ? createPortal(children, slot) : null;
}
