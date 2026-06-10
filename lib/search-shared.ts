/**
 * Constantes y tipos PUROS de búsqueda — sin imports de servidor, importables
 * desde Client Components. Las Server Actions viven en app/actions/search.ts
 * (un archivo "use server" solo puede exportar funciones async).
 */

export const SEARCH_PAGE_SIZE = 24;

export interface SearchResult {
  id:       string;
  slug:     string | null;
  name:     string;
  price:    number;
  category: string;
  brand:    string | null;
  images:   string[];
}

export interface FullProduct {
  id:            string;
  slug:          string | null;
  name:          string;
  description:   string;
  price:         number;
  originalPrice: number | null;
  stock:         number;
  category:      string;
  brand:         string | null;
  image:         string;
  images:        string[];
  details:       Record<string, string>;
}

export interface FullSearchResult {
  products:   FullProduct[];
  totalCount: number;
  categories: string[];
  brands:     string[];
}
