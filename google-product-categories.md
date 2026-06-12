/**
 * Google Product Taxonomy ID mapper for the MundoTech Merchant Center feed.
 *
 * Maps internal category names (stored in Product.category / Category.name)
 * to Google Product Taxonomy numeric IDs. Numeric IDs are preferred over text
 * strings because they are locale-independent and stable across taxonomy updates.
 *
 * Reference (official list):
 * https://www.google.com/basepages/producttype/taxonomy-with-ids.en-US.txt
 *
 * HOW THE LOOKUP WORKS
 * ─────────────────────
 * 1. Normalize the incoming name: lowercase, strip diacritics, collapse spaces.
 * 2. Exact match in CATEGORY_MAP.
 * 3. Substring match (first key found whose value appears inside the normalized name).
 * 4. Fallback → GOOGLE_CATEGORY_FALLBACK (222 = Electronics).
 *
 * ADDING NEW CATEGORIES
 * ──────────────────────
 * Add an entry with the normalized name (lowercase, no accents) as key and the
 * verified Google Taxonomy numeric ID as value. Multiple aliases may share the
 * same ID.
 *
 * FUTURE IMPROVEMENT (not implemented — requires DB migration):
 * Add a `googleCategoryId Int?` field to the Category model so admins can set
 * a precise override per category from the admin panel. That value should take
 * priority over this map's lookup.
 */

/** Top-level Electronics ID — fallback for unmapped / unknown categories. */
export const GOOGLE_CATEGORY_FALLBACK = 222; // Electronics

/**
 * Normalized category name fragment → Google Product Taxonomy numeric ID.
 *
 * IDs are verified against the official Google taxonomy (en-US).
 * Entries marked [VERIFY] should be cross-checked against the live taxonomy
 * file before the next feed audit.
 */
const CATEGORY_MAP: Record<string, number> = {
  // ── Telefonía ──────────────────────────────────────────────────────────────
  // Electronics > Communications > Telephony > Mobile Phones
  'celular':        267,
  'celulares':      267,
  'smartphone':     267,
  'smartphones':    267,
  'telefono':       267,
  'telefonos':      267,
  'movil':          267,
  'moviles':        267,

  // ── Computación portátil ──────────────────────────────────────────────────
  // Electronics > Computers > Laptops
  'laptop':         328,
  'laptops':        328,
  'portatil':       328,
  'portatiles':     328,
  'notebook':       328,
  'notebooks':      328,

  // ── Computación de escritorio ─────────────────────────────────────────────
  // Electronics > Computers > Desktop Computers
  'computadora':    298,
  'computadoras':   298,
  'desktop':        298,
  'desktops':       298,
  'computador':     298,
  'pc escritorio':  298,

  // ── Tablets ───────────────────────────────────────────────────────────────
  // Electronics > Computers > Tablets
  'tablet':         4745,
  'tablets':        4745,

  // ── Gaming / Consolas ─────────────────────────────────────────────────────
  // Electronics > Video Game Consoles & Accessories [VERIFY]
  'consola':        1294,
  'consolas':       1294,
  'gaming':         1294,
  'videojuego':     1294,
  'videojuegos':    1294,
  'video juego':    1294,

  // ── Audífonos / Auriculares ───────────────────────────────────────────────
  // Electronics > Audio > Headphones & Headsets [VERIFY]
  'audifono':       379,
  'audifonos':      379,
  'auricular':      379,
  'auriculares':    379,
  'headphone':      379,
  'headset':        379,

  // ── Parlantes / Bocinas ───────────────────────────────────────────────────
  // Electronics > Audio > Speakers [VERIFY]
  'parlante':       2036,
  'parlantes':      2036,
  'bocina':         2036,
  'bocinas':        2036,
  'altavoz':        2036,
  'altavoces':      2036,
  'speaker':        2036,

  // ── Televisores ───────────────────────────────────────────────────────────
  // Electronics > Video > Televisions [VERIFY]
  'televisor':      404,
  'televisores':    404,
  'television':     404,
  'televisiones':   404,

  // ── Monitores ─────────────────────────────────────────────────────────────
  // Electronics > Computers > Computer Monitors [VERIFY]
  'monitor':        297,
  'monitores':      297,

  // ── Redes / Conectividad ──────────────────────────────────────────────────
  // Electronics > Networking [VERIFY]
  'router':         342,
  'routers':        342,
  'red':            342,
  'redes':          342,
  'networking':     342,
  'modem':          342,
  'switch':         342,

  // ── Impresoras ────────────────────────────────────────────────────────────
  // Electronics > Print, Copy, Scan & Fax > Printers [VERIFY]
  'impresora':      303,
  'impresoras':     303,

  // ── Cámaras ───────────────────────────────────────────────────────────────
  // Cameras & Optics > Cameras [VERIFY]
  'camara':         149,
  'camaras':        149,
  'camara web':     149,
  'webcam':         149,
};

/**
 * Normalize a category name for map lookup.
 * Lowercases, strips Unicode diacritics, replaces non-alphanumeric runs
 * with a single space, then trims.
 */
function normalize(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Returns the Google Product Taxonomy numeric ID for the given internal
 * category name.  Falls back to GOOGLE_CATEGORY_FALLBACK (222 = Electronics)
 * when no mapping is found so the feed never produces an empty/invalid value.
 *
 * @example
 *   getGoogleCategoryId('Celulares')  // → 267
 *   getGoogleCategoryId('Consolas')   // → 1294
 *   getGoogleCategoryId('Regalos')    // → 222 (fallback)
 *   getGoogleCategoryId(null)         // → 222 (fallback)
 */
export function getGoogleCategoryId(categoryName: string | null | undefined): number {
  if (!categoryName) return GOOGLE_CATEGORY_FALLBACK;

  const normalized = normalize(categoryName);

  // 1. Exact match
  if (CATEGORY_MAP[normalized] !== undefined) return CATEGORY_MAP[normalized]!;

  // 2. Substring match: first key whose normalized form appears inside the
  //    normalized category name (e.g. "Audífonos Bluetooth" → "audifono" hit).
  for (const [key, id] of Object.entries(CATEGORY_MAP)) {
    if (normalized.includes(key)) return id;
  }

  // 3. Fallback
  return GOOGLE_CATEGORY_FALLBACK;
}
