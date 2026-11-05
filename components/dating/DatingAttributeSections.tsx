'use client';

import type { ReactNode } from 'react';
import {
  DATING_BODY_TYPES,
  DATING_COMMUNITY_TAGS,
  DATING_DRINKING,
  DATING_EDUCATION,
  DATING_GENDER_IDENTITIES,
  DATING_KIDS,
  DATING_LANGUAGES,
  DATING_LOOKING_FOR_TAGS,
  DATING_MEET_AT,
  DATING_POSITIONS,
  DATING_PRONOUNS,
  DATING_RELATIONSHIP_STATUSES,
  DATING_SMOKING,
  DATING_WORK_MAX_LEN,
  isLgbtPresetCase,
  type DatingBodyType,
  type DatingCommunityTag,
  type DatingDrinking,
  type DatingEducation,
  type DatingGenderIdentity,
  type DatingKids,
  type DatingLanguage,
  type DatingLookingForTag,
  type DatingMeetAt,
  type DatingPosition,
  type DatingPronouns,
  type DatingRelationshipStatus,
  type DatingSmoking,
} from '@/lib/dating/attributes';

export type AttributeFormValues = {
  weightKg: string;
  bodyType: string;
  relationshipStatus: string;
  lookingForTags: DatingLookingForTag[];
  meetAt: DatingMeetAt[];
  pronouns: string;
  genderIdentity: string;
  languages: DatingLanguage[];
  smoking: string;
  drinking: string;
  kids: string;
  education: string;
  work: string;
  position: string;
  communityTags: DatingCommunityTag[];
};

export type AttributeSectionLabels = {
  sections: {
    appearance: string;
    lifestyle: string;
    looking: string;
    languages: string;
    extra: string;
  };
  fields: {
    weightKg: string;
    bodyType: string;
    relationshipStatus: string;
    lookingForTags: string;
    meetAt: string;
    pronouns: string;
    genderIdentity: string;
    languages: string;
    smoking: string;
    drinking: string;
    kids: string;
    education: string;
    work: string;
    position: string;
    communityTags: string;
  };
  labels: {
    bodyType: Record<DatingBodyType, string>;
    relationshipStatus: Record<DatingRelationshipStatus, string>;
    lookingForTags: Record<DatingLookingForTag, string>;
    meetAt: Record<DatingMeetAt, string>;
    pronouns: Record<DatingPronouns, string>;
    genderIdentity: Record<DatingGenderIdentity, string>;
    languages: Record<DatingLanguage, string>;
    smoking: Record<DatingSmoking, string>;
    drinking: Record<DatingDrinking, string>;
    kids: Record<DatingKids, string>;
    education: Record<DatingEducation, string>;
    position: Record<DatingPosition, string>;
    communityTags: Record<DatingCommunityTag, string>;
  };
};

type Props = {
  values: AttributeFormValues;
  presetCase: string | null | undefined;
  openSection: string | null;
  onToggleSection: (id: string) => void;
  onChange: (patch: Partial<AttributeFormValues>) => void;
  messages: AttributeSectionLabels;
};

function toggle<T extends string>(list: T[], value: T, max: number): T[] {
  if (list.includes(value)) return list.filter((v) => v !== value);
  if (list.length >= max) return list;
  return [...list, value];
}

export function DatingAttributeSections({
  values,
  presetCase,
  openSection,
  onToggleSection,
  onChange,
  messages,
}: Props) {
  const lgbt = isLgbtPresetCase(presetCase);

  return (
    <div className="dating-attr-sections">
      <Collapsible
        id="appearance"
        title={messages.sections.appearance}
        open={openSection === 'appearance'}
        onToggle={onToggleSection}
      >
        <label>
          {messages.fields.weightKg}
          <input
            type="number"
            name="weightKg"
            min={35}
            max={250}
            value={values.weightKg}
            onChange={(e) => onChange({ weightKg: e.target.value })}
          />
        </label>
        <SelectField
          name="bodyType"
          label={messages.fields.bodyType}
          value={values.bodyType}
          options={DATING_BODY_TYPES}
          labels={messages.labels.bodyType}
          onChange={(v) => onChange({ bodyType: v })}
        />
        <SelectField
          name="pronouns"
          label={messages.fields.pronouns}
          value={values.pronouns}
          options={DATING_PRONOUNS}
          labels={messages.labels.pronouns}
          onChange={(v) => onChange({ pronouns: v })}
        />
        <SelectField
          name="genderIdentity"
          label={messages.fields.genderIdentity}
          value={values.genderIdentity}
          options={DATING_GENDER_IDENTITIES}
          labels={messages.labels.genderIdentity}
          onChange={(v) => onChange({ genderIdentity: v })}
        />
      </Collapsible>

      <Collapsible
        id="lifestyle"
        title={messages.sections.lifestyle}
        open={openSection === 'lifestyle'}
        onToggle={onToggleSection}
      >
        <SelectField
          name="relationshipStatus"
          label={messages.fields.relationshipStatus}
          value={values.relationshipStatus}
          options={DATING_RELATIONSHIP_STATUSES}
          labels={messages.labels.relationshipStatus}
          onChange={(v) => onChange({ relationshipStatus: v })}
        />
        <SelectField
          name="smoking"
          label={messages.fields.smoking}
          value={values.smoking}
          options={DATING_SMOKING}
          labels={messages.labels.smoking}
          onChange={(v) => onChange({ smoking: v })}
        />
        <SelectField
          name="drinking"
          label={messages.fields.drinking}
          value={values.drinking}
          options={DATING_DRINKING}
          labels={messages.labels.drinking}
          onChange={(v) => onChange({ drinking: v })}
        />
        <SelectField
          name="kids"
          label={messages.fields.kids}
          value={values.kids}
          options={DATING_KIDS}
          labels={messages.labels.kids}
          onChange={(v) => onChange({ kids: v })}
        />
        <SelectField
          name="education"
          label={messages.fields.education}
          value={values.education}
          options={DATING_EDUCATION}
          labels={messages.labels.education}
          onChange={(v) => onChange({ education: v })}
        />
        <label>
          {messages.fields.work}
          <input
            type="text"
            name="work"
            maxLength={DATING_WORK_MAX_LEN}
            value={values.work}
            onChange={(e) => onChange({ work: e.target.value })}
          />
        </label>
      </Collapsible>

      <Collapsible
        id="looking"
        title={messages.sections.looking}
        open={openSection === 'looking'}
        onToggle={onToggleSection}
      >
        <ChipMulti
          label={messages.fields.lookingForTags}
          options={DATING_LOOKING_FOR_TAGS}
          selected={values.lookingForTags}
          labels={messages.labels.lookingForTags}
          hiddenName="lookingForTags"
          onToggle={(v) =>
            onChange({
              lookingForTags: toggle(values.lookingForTags, v, 6),
            })
          }
        />
        <ChipMulti
          label={messages.fields.meetAt}
          options={DATING_MEET_AT}
          selected={values.meetAt}
          labels={messages.labels.meetAt}
          hiddenName="meetAt"
          onToggle={(v) =>
            onChange({ meetAt: toggle(values.meetAt, v, 4) })
          }
        />
      </Collapsible>

      <Collapsible
        id="languages"
        title={messages.sections.languages}
        open={openSection === 'languages'}
        onToggle={onToggleSection}
      >
        <ChipMulti
          label={messages.fields.languages}
          options={DATING_LANGUAGES}
          selected={values.languages}
          labels={messages.labels.languages}
          hiddenName="languages"
          onToggle={(v) =>
            onChange({ languages: toggle(values.languages, v, 6) })
          }
        />
      </Collapsible>

      {lgbt ? (
        <Collapsible
          id="extra"
          title={messages.sections.extra}
          open={openSection === 'extra'}
          onToggle={onToggleSection}
        >
          <SelectField
            name="position"
            label={messages.fields.position}
            value={values.position}
            options={DATING_POSITIONS}
            labels={messages.labels.position}
            onChange={(v) => onChange({ position: v })}
          />
          <ChipMulti
            label={messages.fields.communityTags}
            options={DATING_COMMUNITY_TAGS}
            selected={values.communityTags}
            labels={messages.labels.communityTags}
            hiddenName="communityTags"
            onToggle={(v) =>
              onChange({
                communityTags: toggle(values.communityTags, v, 8),
              })
            }
          />
        </Collapsible>
      ) : null}
    </div>
  );
}

function Collapsible({
  id,
  title,
  open,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  open: boolean;
  onToggle: (id: string) => void;
  children: ReactNode;
}) {
  return (
    <details
      className="dating-attr-section"
      open={open}
      onToggle={(e) => {
        const el = e.currentTarget;
        if (el.open) onToggle(id);
        else if (open) onToggle('');
      }}
    >
      <summary className="dating-attr-section__summary">{title}</summary>
      <div className="dating-attr-section__body">{children}</div>
    </details>
  );
}

function SelectField<T extends string>({
  name,
  label,
  value,
  options,
  labels,
  onChange,
}: {
  name: string;
  label: string;
  value: string;
  options: readonly T[];
  labels: Record<T, string>;
  onChange: (v: string) => void;
}) {
  return (
    <label>
      {label}
      <select name={name} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">—</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {labels[opt]}
          </option>
        ))}
      </select>
    </label>
  );
}

function ChipMulti<T extends string>({
  label,
  options,
  selected,
  labels,
  hiddenName,
  onToggle,
}: {
  label: string;
  options: readonly T[];
  selected: T[];
  labels: Record<T, string>;
  hiddenName: string;
  onToggle: (v: T) => void;
}) {
  return (
    <div className="dating-attr-chips">
      <span className="dating-attr-chips__label">{label}</span>
      <input type="hidden" name={hiddenName} value={selected.join(',')} />
      <div className="dating-attr-chips__row">
        {options.map((opt) => {
          const active = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              className={`dating-interest-chip${active ? ' is-selected' : ''}`}
              onClick={() => onToggle(opt)}
            >
              {labels[opt]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
