import { html } from '../lib/html.js';
import { landmarkTowns, towns } from '../content/towns.js';

// A stylised Sindh: an approximate province outline and the Indus, drawn with an
// equirectangular projection. Good enough to place towns; not a survey map.
const BOUNDS = { minLon: 66.4, maxLon: 71.4, minLat: 23.4, maxLat: 28.9 };
const PX_PER_DEGREE = 90;
const COS = Math.cos((26.15 * Math.PI) / 180);

const x = (lon) => +((lon - BOUNDS.minLon) * PX_PER_DEGREE * COS).toFixed(1);
const y = (lat) => +((BOUNDS.maxLat - lat) * PX_PER_DEGREE).toFixed(1);

const OUTLINE = [
  [66.7, 24.85], [66.75, 25.3], [67.15, 25.6], [67.2, 25.9], [67.25, 26.4], [67.15, 26.9], [67.3, 27.3],
  [67.3, 27.6], [67.45, 27.95], [67.8, 28.1], [68.1, 28.4], [68.45, 28.55], [68.9, 28.45], [69.3, 28.55],
  [69.6, 28.62], [69.95, 28.35], [70.25, 28.05], [70.05, 27.6], [69.75, 27.25], [69.6, 26.9], [69.85, 26.4],
  [70.1, 26.05], [70.3, 25.7], [70.7, 25.35], [71.05, 24.95], [71.1, 24.55], [70.9, 24.3], [70.3, 24.3],
  [69.7, 24.2], [69.0, 24.25], [68.75, 23.95], [68.3, 23.65], [67.85, 23.85], [67.4, 24.05], [67.25, 24.45],
  [67.1, 24.75],
];

const INDUS = [
  [69.75, 28.62], [69.6, 28.4], [69.2, 28.1], [68.88, 27.7], [68.45, 27.35], [68.15, 26.95], [67.95, 26.55],
  [68.05, 26.0], [68.32, 25.4], [68.25, 25.0], [68.05, 24.6], [67.75, 24.2], [67.5, 23.98],
];

const toPath = (points, close) =>
  points.map(([lon, lat], i) => `${i ? 'L' : 'M'}${x(lon)} ${y(lat)}`).join(' ') + (close ? ' Z' : '');

// Crop to the province, leaving room on the right for labels.
const VIEWBOX = (() => {
  const xs = OUTLINE.map(([lon]) => x(lon));
  const ys = OUTLINE.map(([, lat]) => y(lat));
  const minX = Math.min(...xs) - 12;
  const minY = Math.min(...ys) - 14;
  return [minX, minY, Math.max(...xs) - minX + 44, Math.max(...ys) - minY + 12].map((n) => Math.round(n)).join(' ');
})();

const OUTLINE_PATH = toPath(OUTLINE, true);
const RIVER_LABEL = { x: x(68.22), y: y(26.2) };
const INDUS_PATH = toPath(INDUS, false);

export const dotRadius = (families) => (families ? Math.min(4 + Math.sqrt(families) * 2.5, 20) : 2.4);

// counts: Map(townSlug -> families). highlight: a town slug to emphasise.
export function sindhMap({ counts = new Map(), highlight = null, compact = false } = {}) {
  const dots = towns.map((town) => {
    const families = counts.get(town.slug) || 0;
    const active = families > 0;
    const focused = town.slug === highlight;
    const cx = x(town.lon);
    const cy = y(town.lat);
    const label = (!compact && (active || landmarkTowns.has(town.slug))) || focused;
    const title = active ? `${town.name}: ${families} ${families === 1 ? 'family' : 'families'}` : town.name;
    return html`<a href="/sindh/${town.slug}" class="map-town${active ? ' is-active' : ''}${focused ? ' is-focused' : ''}">
      <title>${title}</title>
      ${focused ? html`<circle cx="${cx}" cy="${cy}" r="${dotRadius(families) + 7}" class="map-halo"/>` : ''}
      <circle cx="${cx}" cy="${cy}" r="${dotRadius(families)}"/>
      ${label ? html`<text x="${cx + dotRadius(families) + 3}" y="${cy + 4}">${town.name}</text>` : ''}
    </a>`;
  });

  return html`<svg class="sindh-map" viewBox="${VIEWBOX}" role="img"
    aria-label="Map of Sindh showing the ancestral towns of families here">
    <path d="${OUTLINE_PATH}" class="map-land"/>
    <path d="${INDUS_PATH}" class="map-river"/>
    <text x="${RIVER_LABEL.x}" y="${RIVER_LABEL.y}" class="map-river-label" transform="rotate(68 ${RIVER_LABEL.x} ${RIVER_LABEL.y})">Sindhu Darya</text>
    ${dots}
  </svg>`;
}
