export function simpleMetadata(input: {
  locale: string;
  path: string;
  title: string;
  description?: string;
  /**
   * Keep the page out of search results. Individual dating profiles MUST set
   * this: the whole premise of the product is that people who already know you
   * cannot find you here, and an indexed profile defeats that the moment
   * someone searches a username.
   */
  noindex?: boolean;
}) {
  return {
    title: input.title,
    description: input.description,
    ...(input.noindex ? { robots: { index: false, follow: false } } : {}),
  };
}
