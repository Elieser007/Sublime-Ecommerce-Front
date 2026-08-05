export interface RelatedCandidate {
  slug: string;
  section_slug: string | null;
  created_at: number;
}

export function getRelatedProducts<T extends RelatedCandidate>(
  list: T[],
  currentSlug: string,
  sectionSlug: string,
  limit = 4
): T[] {
  if (!Array.isArray(list) || list.length === 0) return [];

  return list
    .filter((p) => p.section_slug === sectionSlug && p.slug !== currentSlug)
    .sort((a, b) => b.created_at - a.created_at || a.slug.localeCompare(b.slug))
    .slice(0, limit);
}
