# UI spec — safety, privacy, discovery

API-first; this documents controls the web (and later native) UI must expose.

## Quick exit (B4)

- Always-visible control on dating chrome (top bar). One tap.
- **Web:** `location.replace` to a neutral decoy page (`/{locale}/bye`) so the
  dating history is not reachable via Back.
- **Native (later):** same control leaves the app or opens a decoy screen with
  no back stack into dating.
- Decoy must not mention dating, matches, or the product brand.

## Block + Report (A1)

- On every profile view and every conversation header: **Report** and **Block**
  in one tap reach (same row / overflow menu).
- Block confirms once, then succeeds silently. Never show a toast that would
  imply the other party was notified.
- After block: leave the conversation / profile; thread disappears from inbox.

## Contact exclusion (B1)

- Settings → “Hide people in my contacts”.
- Upload address book once over TLS; UI never displays hashed values.
- “Clear uploaded contacts” is a single destructive action.

## Visibility modes (B2)

- Settings radio: Discoverable / Mutual only / Incognito.
- Short copy explaining each (especially Incognito: you appear only to people
  you liked or messaged).

## Private album (B3)

- Per-photo visibility toggle: Public / Private.
- “Share album with…” grants a specific matched peer; “Revoke” removes access.
- Private photos never render a public CDN URL in the DOM for non-granted viewers.

## Nearby grid (C)

- Grid cells show: public photo, name/age, **distance bucket label only**,
  presence label (or nothing if presence off).
- Never show metres, coordinates, or a compass bearing.
- Presence off → subject appears only as `10km+`.

## Push notifications (A3)

- System notification title is always neutral (“New message”, “New like”, …).
- Body empty / generic. Opaque `id` only. Content loads after unlock.
