// A single page's result count, shared by both adapters so the two never
// drift independently. Each page fetched this way is still spent from the
// user's own 30/min per-provider budget (D3) — infinite scroll just lets that
// budget be spent a page at a time instead of all at once.
export const SEARCH_PAGE_SIZE = 8;
