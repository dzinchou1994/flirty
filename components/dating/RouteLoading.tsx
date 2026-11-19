/** Shown the instant a tab navigation starts, before the server page arrives. */
export function RouteLoading() {
  return (
    <main className="container dating-page community-page" aria-busy="true">
      <div className="pmodal__skeleton" style={{ paddingTop: 28 }}>
        <div className="pmodal__skeleton-line pmodal__skeleton-line--title" />
        <div className="pmodal__skeleton-line" />
        <div className="pmodal__skeleton-line pmodal__skeleton-line--short" />
      </div>
    </main>
  );
}
