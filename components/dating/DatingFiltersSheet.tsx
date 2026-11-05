'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  DATING_AGE_MAX,
  DATING_AGE_MIN,
  DATING_BODY_TYPES,
  DATING_FILTER_DISTANCES,
  DATING_HEIGHT_MAX,
  DATING_HEIGHT_MIN,
  DATING_LANGUAGES,
  DATING_LOOKING_FOR_TAGS,
  DATING_MEET_AT,
  DATING_POSITIONS,
  DATING_RELATIONSHIP_STATUSES,
  type DatingBodyType,
  type DatingFilterDistance,
  type DatingLanguage,
  type DatingLookingForTag,
  type DatingMeetAt,
  type DatingPosition,
  type DatingRelationshipStatus,
} from '@/lib/dating/attributes';
import {
  countActiveDiscoveryFilters,
  discoveryFiltersToSearchParams,
  EMPTY_DISCOVERY_FILTERS,
  type DiscoveryFilters,
} from '@/lib/dating/discovery-filters';
import {
  DATING_CITIES,
  type DatingCity,
  type DatingGenderBucket,
} from '@/lib/dating/presets';
import { localePath } from '@/lib/i18n/paths';
import type { Locale } from '@/lib/i18n/types';

const BUCKETS: DatingGenderBucket[] = ['male', 'female', 'trans'];

export type DatingFiltersSheetLabels = {
  filtersOpen: string;
  filtersTitle: string;
  filtersClose: string;
  filtersApply: string;
  filtersReset: string;
  filtersLookingFor: string;
  filtersCityAny: string;
  filtersAge: string;
  filtersHeight: string;
  filtersDistance: string;
  filtersOnlineOnly: string;
  filtersBodyType: string;
  filtersRelationship: string;
  filtersLookingForTags: string;
  filtersMeetAt: string;
  filtersLanguages: string;
  filtersPosition: string;
  /** Template with `{n}`, e.g. "{n} პროფილი". */
  filtersCount: string;
  filterAll: string;
  filterMale: string;
  filterFemale: string;
  filterTrans: string;
  city: string;
  cityLabels: Record<DatingCity, string>;
  distanceLabels: Record<DatingFilterDistance, string>;
  attributeLabels: {
    bodyType: Record<DatingBodyType, string>;
    relationshipStatus: Record<DatingRelationshipStatus, string>;
    lookingForTags: Record<DatingLookingForTag, string>;
    meetAt: Record<DatingMeetAt, string>;
    languages: Record<DatingLanguage, string>;
    position: Record<DatingPosition, string>;
  };
};

type Props = {
  locale: Locale;
  filters: DiscoveryFilters;
  /** Show LGBT-only filter groups (position). */
  showLgbtFilters?: boolean;
  labels: DatingFiltersSheetLabels;
};

function toggleIn<T extends string>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function browseHref(draft: DiscoveryFilters): string {
  const query = discoveryFiltersToSearchParams(draft).toString();
  return query ? `/gatsnoba/?${query}` : '/gatsnoba/';
}

export function DatingFiltersSheet({
  locale,
  filters,
  showLgbtFilters = false,
  labels,
}: Props) {
  const router = useRouter();
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [draft, setDraft] = useState<DiscoveryFilters>(filters);
  const [liveCount, setLiveCount] = useState<number | null>(null);
  const [counting, setCounting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) setDraft(filters);
  }, [filters, open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const refreshCount = useCallback(async (next: DiscoveryFilters) => {
    setCounting(true);
    try {
      const params = discoveryFiltersToSearchParams(next);
      params.set('countOnly', '1');
      params.set('persist', '0');
      const res = await fetch(`/api/v1/feed/?${params.toString()}`, {
        credentials: 'include',
      });
      const json = await res.json().catch(() => null);
      if (json?.ok && typeof json.data?.count === 'number') {
        setLiveCount(json.data.count);
      } else if (json?.ok && typeof json.count === 'number') {
        setLiveCount(json.count);
      }
    } catch {
      /* ignore */
    } finally {
      setCounting(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      void refreshCount(draft);
    }, 280);
    return () => window.clearTimeout(t);
  }, [draft, open, refreshCount]);

  const appliedCount = countActiveDiscoveryFilters(filters);

  function patch(partial: Partial<DiscoveryFilters>) {
    setDraft((d) => ({ ...d, ...partial }));
  }

  function reset() {
    setDraft({ ...EMPTY_DISCOVERY_FILTERS, viewAll: true });
  }

  function apply() {
    setOpen(false);
    router.push(localePath(locale, browseHref(draft)));
  }

  const ageMin = draft.ageMin ?? DATING_AGE_MIN;
  const ageMax = draft.ageMax ?? DATING_AGE_MAX;
  const heightMin = draft.heightMin ?? DATING_HEIGHT_MIN;
  const heightMax = draft.heightMax ?? DATING_HEIGHT_MAX;

  const sheet =
    mounted && open
      ? createPortal(
          <div className="online-presence-layer dating-filters-layer" role="presentation">
            <button
              type="button"
              className="online-presence-layer__backdrop"
              aria-label={labels.filtersClose}
              onClick={() => setOpen(false)}
            />
            <div
              className="online-presence__sheet dating-filters-sheet"
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
            >
              <div className="online-presence__sheet-handle" aria-hidden />
              <div className="online-presence__panel-head dating-filters-sheet__head">
                <h2 id={titleId} className="dating-filters-sheet__title">
                  {labels.filtersTitle}
                </h2>
                <button
                  type="button"
                  className="dating-filters-sheet__reset"
                  onClick={reset}
                >
                  {labels.filtersReset}
                </button>
                <button
                  type="button"
                  className="online-presence__icon-btn"
                  aria-label={labels.filtersClose}
                  onClick={() => setOpen(false)}
                >
                  ✕
                </button>
              </div>

              <div className="dating-filters-sheet__body">
                <section className="dating-filters-sheet__section">
                  <h3 className="dating-filters-sheet__label">{labels.filtersLookingFor}</h3>
                  <div className="dating-filters-sheet__options" role="group">
                    <button
                      type="button"
                      className={`dating-filters-sheet__chip${draft.viewAll || !draft.bucket ? ' is-active' : ''}`}
                      aria-pressed={draft.viewAll || !draft.bucket}
                      onClick={() => patch({ bucket: null, viewAll: true })}
                    >
                      {labels.filterAll}
                    </button>
                    {BUCKETS.map((item) => (
                      <button
                        key={item}
                        type="button"
                        className={`dating-filters-sheet__chip${!draft.viewAll && draft.bucket === item ? ' is-active' : ''}`}
                        aria-pressed={!draft.viewAll && draft.bucket === item}
                        onClick={() => patch({ bucket: item, viewAll: false })}
                      >
                        {
                          {
                            male: labels.filterMale,
                            female: labels.filterFemale,
                            trans: labels.filterTrans,
                          }[item]
                        }
                      </button>
                    ))}
                  </div>
                </section>

                <section className="dating-filters-sheet__section">
                  <h3 className="dating-filters-sheet__label">{labels.city}</h3>
                  <div className="dating-filters-sheet__options" role="group">
                    <button
                      type="button"
                      className={`dating-filters-sheet__chip${!draft.city ? ' is-active' : ''}`}
                      aria-pressed={!draft.city}
                      onClick={() => patch({ city: null })}
                    >
                      {labels.filtersCityAny}
                    </button>
                    {DATING_CITIES.map((item) => (
                      <button
                        key={item}
                        type="button"
                        className={`dating-filters-sheet__chip${draft.city === item ? ' is-active' : ''}`}
                        aria-pressed={draft.city === item}
                        onClick={() => patch({ city: item })}
                      >
                        {labels.cityLabels[item]}
                      </button>
                    ))}
                  </div>
                </section>

                <section className="dating-filters-sheet__section">
                  <div className="dating-filters-sheet__section-head">
                    <h3 className="dating-filters-sheet__label">{labels.filtersAge}</h3>
                    <span className="dating-filters-sheet__value">
                      {ageMin}–{ageMax}
                    </span>
                  </div>
                  <label className="dating-filters-sheet__range-row">
                    <span>Min</span>
                    <input
                      type="range"
                      min={DATING_AGE_MIN}
                      max={DATING_AGE_MAX}
                      value={ageMin}
                      onChange={(e) => {
                        const next = Number(e.target.value);
                        patch({
                          ageMin: next,
                          ageMax: Math.max(next, ageMax),
                        });
                      }}
                    />
                  </label>
                  <label className="dating-filters-sheet__range-row">
                    <span>Max</span>
                    <input
                      type="range"
                      min={DATING_AGE_MIN}
                      max={DATING_AGE_MAX}
                      value={ageMax}
                      onChange={(e) => {
                        const next = Number(e.target.value);
                        patch({
                          ageMax: next,
                          ageMin: Math.min(next, ageMin),
                        });
                      }}
                    />
                  </label>
                </section>

                <section className="dating-filters-sheet__section">
                  <div className="dating-filters-sheet__section-head">
                    <h3 className="dating-filters-sheet__label">{labels.filtersHeight}</h3>
                    <span className="dating-filters-sheet__value">
                      {heightMin}–{heightMax} cm
                    </span>
                  </div>
                  <label className="dating-filters-sheet__range-row">
                    <span>Min</span>
                    <input
                      type="range"
                      min={DATING_HEIGHT_MIN}
                      max={DATING_HEIGHT_MAX}
                      value={heightMin}
                      onChange={(e) => {
                        const next = Number(e.target.value);
                        patch({
                          heightMin: next,
                          heightMax: Math.max(next, heightMax),
                        });
                      }}
                    />
                  </label>
                  <label className="dating-filters-sheet__range-row">
                    <span>Max</span>
                    <input
                      type="range"
                      min={DATING_HEIGHT_MIN}
                      max={DATING_HEIGHT_MAX}
                      value={heightMax}
                      onChange={(e) => {
                        const next = Number(e.target.value);
                        patch({
                          heightMax: next,
                          heightMin: Math.min(next, heightMin),
                        });
                      }}
                    />
                  </label>
                </section>

                <section className="dating-filters-sheet__section">
                  <h3 className="dating-filters-sheet__label">{labels.filtersDistance}</h3>
                  <div className="dating-filters-sheet__options" role="group">
                    {DATING_FILTER_DISTANCES.map((d) => (
                      <button
                        key={d}
                        type="button"
                        className={`dating-filters-sheet__chip${draft.distance === d ? ' is-active' : ''}`}
                        aria-pressed={draft.distance === d}
                        onClick={() => patch({ distance: d })}
                      >
                        {labels.distanceLabels[d]}
                      </button>
                    ))}
                  </div>
                </section>

                <section className="dating-filters-sheet__section">
                  <label className="dating-filters-sheet__toggle">
                    <span>{labels.filtersOnlineOnly}</span>
                    <input
                      type="checkbox"
                      checked={draft.onlineOnly}
                      onChange={(e) => patch({ onlineOnly: e.target.checked })}
                    />
                  </label>
                </section>

                <ChipSection
                  title={labels.filtersLookingForTags}
                  options={DATING_LOOKING_FOR_TAGS}
                  selected={draft.lookingForTags}
                  labelOf={(k) => labels.attributeLabels.lookingForTags[k]}
                  onToggle={(v) =>
                    patch({ lookingForTags: toggleIn(draft.lookingForTags, v) })
                  }
                />
                <ChipSection
                  title={labels.filtersBodyType}
                  options={DATING_BODY_TYPES}
                  selected={draft.bodyType}
                  labelOf={(k) => labels.attributeLabels.bodyType[k]}
                  onToggle={(v) => patch({ bodyType: toggleIn(draft.bodyType, v) })}
                />
                <ChipSection
                  title={labels.filtersRelationship}
                  options={DATING_RELATIONSHIP_STATUSES}
                  selected={draft.relationshipStatus}
                  labelOf={(k) => labels.attributeLabels.relationshipStatus[k]}
                  onToggle={(v) =>
                    patch({
                      relationshipStatus: toggleIn(draft.relationshipStatus, v),
                    })
                  }
                />
                <ChipSection
                  title={labels.filtersMeetAt}
                  options={DATING_MEET_AT}
                  selected={draft.meetAt}
                  labelOf={(k) => labels.attributeLabels.meetAt[k]}
                  onToggle={(v) => patch({ meetAt: toggleIn(draft.meetAt, v) })}
                />
                <ChipSection
                  title={labels.filtersLanguages}
                  options={DATING_LANGUAGES}
                  selected={draft.languages}
                  labelOf={(k) => labels.attributeLabels.languages[k]}
                  onToggle={(v) =>
                    patch({ languages: toggleIn(draft.languages, v) })
                  }
                />
                {showLgbtFilters ? (
                  <ChipSection
                    title={labels.filtersPosition}
                    options={DATING_POSITIONS}
                    selected={draft.position}
                    labelOf={(k) => labels.attributeLabels.position[k]}
                    onToggle={(v) =>
                      patch({ position: toggleIn(draft.position, v) })
                    }
                  />
                ) : null}
              </div>

              <footer className="dating-filters-sheet__foot">
                <p className="dating-filters-sheet__count" aria-live="polite">
                  {counting && liveCount == null
                    ? '…'
                    : labels.filtersCount.replace('{n}', String(liveCount ?? 0))}
                </p>
                <button
                  type="button"
                  className="dating-filters-sheet__apply"
                  onClick={apply}
                >
                  {labels.filtersApply}
                </button>
              </footer>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        type="button"
        className={`dating-filter-trigger${appliedCount > 0 ? ' is-active' : ''}`}
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden>
          <path
            d="M4 6h16M7 12h10M10 18h4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        <span>{labels.filtersOpen}</span>
        {appliedCount > 0 ? (
          <span className="dating-filter-trigger__badge">{appliedCount}</span>
        ) : null}
      </button>
      {sheet}
    </>
  );
}

function ChipSection<T extends string>({
  title,
  options,
  selected,
  labelOf,
  onToggle,
}: {
  title: string;
  options: readonly T[];
  selected: T[];
  labelOf: (key: T) => string;
  onToggle: (value: T) => void;
}) {
  return (
    <section className="dating-filters-sheet__section">
      <h3 className="dating-filters-sheet__label">{title}</h3>
      <div className="dating-filters-sheet__options" role="group">
        {options.map((item) => {
          const active = selected.includes(item);
          return (
            <button
              key={item}
              type="button"
              className={`dating-filters-sheet__chip${active ? ' is-active' : ''}`}
              aria-pressed={active}
              onClick={() => onToggle(item)}
            >
              {labelOf(item)}
            </button>
          );
        })}
      </div>
    </section>
  );
}
