/**
 * Script de un solo uso: scrapea oficinas de Tealca desde su API REST
 * y genera lib/tealca-offices.ts con la misma estructura que lib/zoom-offices.ts.
 *
 * Uso: npx tsx scripts/scrape-tealca.ts
 */
import { appendFileSync, existsSync, writeFileSync } from 'fs';

const TEALCA_API = 'https://www.tealca.com/wp-json/tealca-oficinas/v1/offices';

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'application/json',
};

/**
 * Mapa de stateSlug de Tealca a las llaves de estado usadas por
 * lib/mrw-offices.ts y lib/zoom-offices.ts.
 */
const STATE_SLUG_TO_KEY: Record<string, string> = {
  'anzoategui': 'Anzoátegui',
  'apure': 'Apure',
  'aragua': 'Aragua',
  'barinas': 'Barinas',
  'bolivar': 'Bolívar',
  'carabobo': 'Carabobo',
  'cojedes': 'Cojedes',
  'd-capital': 'Distrito Capital',
  'delta-amacuro': 'Delta Amacuro',
  'falcon': 'Falcón',
  'guarico': 'Guárico',
  'lara': 'Lara',
  'merida': 'Mérida',
  'miranda': 'Miranda',
  'monagas': 'Monagas',
  'nueva-esparta': 'Nueva Esparta',
  'portuguesa': 'Portuguesa',
  'sucre': 'Sucre',
  'tachira': 'Táchira',
  'trujillo': 'Trujillo',
  'vargas': 'La Guaira',
  'yaracuy': 'Yaracuy',
  'zulia': 'Zulia',
};

interface TealcaOfficeRaw {
  post: { id: number; name: string };
  fields: { code: string; tipo_de_oficina: string };
  state: string;
  stateSlug: string;
  city: string;
  slug: string;
}

interface TealcaOffice {
  name: string;
  address?: string;
  city: string;
  code: string;
  /** Tipo interno: Oficina Externa, Oficina Interna, Junior */
  tipo: string;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.json() as Promise<T>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizeName(raw: string): string {
  return raw.replace(/&#8211;/g, '–').replace(/&#\d+;/g, '').trim();
}

function normalizeCity(raw: string | undefined): string {
  if (!raw) return '';
  return raw
    .replace(/\s+/g, ' ')
    .replace(/\.$/, '')
    .trim();
}

async function main() {
  console.log('⏳ Fetching Tealca offices from API...');

  const resp = await fetchJson<{ success: boolean; data: TealcaOfficeRaw[] }>(TEALCA_API);
  const rawOffices = resp.data;

  if (!rawOffices || rawOffices.length === 0) {
    console.error('❌ No se obtuvieron oficinas de la API');
    process.exit(1);
  }

  console.log(`✅ Recibidas ${rawOffices.length} oficinas crudas\n`);

  // Agrupar por estado
  const grouped: Record<string, TealcaOffice[]> = {};

  for (const raw of rawOffices) {
    const stateKey = STATE_SLUG_TO_KEY[raw.stateSlug];
    if (!stateKey) {
      console.warn(`⚠️  Estado desconocido: "${raw.state}" (slug: "${raw.stateSlug}") — saltando "${raw.post.name}"`);
      continue;
    }

    if (!grouped[stateKey]) grouped[stateKey] = [];

    const office: TealcaOffice = {
      name: normalizeName(raw.post.name),
      city: normalizeCity(raw.city) || normalizeName(raw.post.name),
      code: raw.fields.code,
      tipo: raw.fields.tipo_de_oficina,
    };

    grouped[stateKey].push(office);
  }

  // Ordenar estados alfabéticamente y oficinas dentro de cada estado
  const sortedStates = Object.keys(grouped).sort();
  const outputLines: string[] = [];

  outputLines.push('/**');
  outputLines.push(' * Lista blanca oficial de oficinas TEALCA por estado (paralela a lib/zoom-offices.ts).');
  outputLines.push(' * Fuente: API REST de Tealca (tealca-oficinas/v1/offices).');
  outputLines.push(' * Cada oficina incluye nombre, ciudad y código de oficina.');
  outputLines.push(' * El estado es el proporcionado por la API de Tealca.');
  outputLines.push(' */');
  outputLines.push('export interface TealcaOffice {');
  outputLines.push('  /** Nombre de la oficina Tealca. */');
  outputLines.push('  name: string;');
  outputLines.push('  /** Dirección completa (no disponible vía API). */');
  outputLines.push('  address?: string;');
  outputLines.push('  /** Ciudad donde se ubica la oficina. */');
  outputLines.push('  city: string;');
  outputLines.push('  /** Código interno de la oficina Tealca. */');
  outputLines.push('  code: string;');
  outputLines.push('}');
  outputLines.push('');
  outputLines.push('export const tealcaOffices: Record<string, TealcaOffice[]> = {');

  for (const state of sortedStates) {
    const offices = grouped[state].sort((a, b) => a.name.localeCompare(b.name));
    outputLines.push(`  "${state}": [`);

    for (const o of offices) {
      const fields: string[] = [];
      fields.push(`      name: ${JSON.stringify(o.name)}`);
      if (o.address) {
        fields.push(`      address: ${JSON.stringify(o.address)}`);
      }
      fields.push(`      city: ${JSON.stringify(o.city)}`);
      fields.push(`      code: ${JSON.stringify(o.code)}`);

      outputLines.push('    {');
      outputLines.push(fields.join(',\n'));
      outputLines.push('    },');
    }

    outputLines.push('  ],');
  }

  outputLines.push('};');
  outputLines.push('');

  const content = outputLines.join('\n');

  // Escribir el archivo
  const outPath = 'lib/tealca-offices.ts';
  writeFileSync(outPath, content, 'utf-8');
  console.log(`✅ Archivo generado: ${outPath}\n`);

  // Resumen
  let totalOffices = 0;
  console.log('📊 RESUMEN POR ESTADO:');
  for (const state of sortedStates) {
    const count = grouped[state].length;
    totalOffices += count;
    console.log(`   ${state}: ${count} oficinas`);
  }
  console.log(`\n📊 TOTAL: ${totalOffices} oficinas en ${sortedStates.length} estados`);
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
