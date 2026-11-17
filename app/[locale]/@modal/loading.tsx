import { ProfileModalShell } from '@/components/dating/ProfileModalShell';

/**
 * The panel is a server component, so opening it costs a round trip. Without
 * this the card click did nothing visible until the response landed, which
 * reads as a broken button rather than a slow one. Next streams this in
 * immediately and swaps in the real profile when it arrives.
 */
export default function ProfilePanelLoading() {
  return (
    <ProfileModalShell closeLabel="Close">
      <div className="pmodal__skeleton" aria-busy="true">
        <div className="pmodal__skeleton-photo" />
        <div className="pmodal__skeleton-line pmodal__skeleton-line--title" />
        <div className="pmodal__skeleton-line pmodal__skeleton-line--meta" />
        <div className="pmodal__skeleton-line" />
        <div className="pmodal__skeleton-line pmodal__skeleton-line--short" />
      </div>
    </ProfileModalShell>
  );
}
