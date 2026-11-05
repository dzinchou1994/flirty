import type { LegalDoc } from '@/lib/legal/documents';

/**
 * Plain, readable rendering for Terms and Privacy. Deliberately boring:
 * these pages are read by users looking for a specific clause and by an App
 * Review engineer checking the policy exists and is reachable.
 */
export function LegalDocument({
  doc,
  updatedLabel,
}: {
  doc: LegalDoc;
  updatedLabel: string;
}) {
  return (
    <main className="legal">
      <article className="legal__sheet">
        <h1 className="legal__title">{doc.title}</h1>
        <p className="legal__updated">
          {updatedLabel}: {doc.updated}
        </p>
        <p className="legal__lead">{doc.lead}</p>

        {doc.sections.map((section) => (
          <section key={section.heading} className="legal__section">
            <h2 className="legal__heading">{section.heading}</h2>
            {section.paragraphs?.map((text) => (
              <p key={text} className="legal__p">
                {text}
              </p>
            ))}
            {section.bullets ? (
              <ul className="legal__list">
                {section.bullets.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </article>
    </main>
  );
}
