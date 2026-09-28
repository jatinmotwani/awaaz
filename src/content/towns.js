import { kebab } from '../lib/text.js';

// Towns and cities of Sindh that families pin as their ancestral home.
// [name, present-day district, latitude, longitude] — coordinates are approximate and only
// place dots on the stylised map. Add towns freely; never change an existing name's slug.
const RAW = [
  ['Badin', 'Badin', 24.66, 68.84],
  ['Bhiria', 'Naushahro Feroze', 26.91, 68.19],
  ['Chachro', 'Tharparkar', 25.11, 70.25],
  ['Dadu', 'Dadu', 26.73, 67.78],
  ['Daharki', 'Ghotki', 28.04, 69.7],
  ['Daur', 'Shaheed Benazirabad', 26.45, 68.32],
  ['Digri', 'Mirpur Khas', 25.16, 69.11],
  ['Diplo', 'Tharparkar', 24.47, 69.58],
  ['Gambat', 'Khairpur', 27.35, 68.52],
  ['Garhi Khairo', 'Jacobabad', 28.06, 68.35],
  ['Garhi Yasin', 'Shikarpur', 27.91, 68.51],
  ['Ghotki', 'Ghotki', 28.01, 69.32],
  ['Hala', 'Matiari', 25.81, 68.42],
  ['Hyderabad', 'Hyderabad', 25.39, 68.37],
  ['Islamkot', 'Tharparkar', 24.7, 70.18],
  ['Jacobabad', 'Jacobabad', 28.28, 68.44],
  ['Jamshoro', 'Jamshoro', 25.43, 68.28],
  ['Jati', 'Sujawal', 24.35, 68.27],
  ['Jhuddo', 'Mirpur Khas', 24.96, 69.3],
  ['Johi', 'Dadu', 26.69, 67.61],
  ['Kamber', 'Qambar Shahdadkot', 27.59, 68.0],
  ['Kandhkot', 'Kashmore', 28.24, 69.18],
  ['Kandiaro', 'Naushahro Feroze', 27.06, 68.21],
  ['Karachi', 'Karachi', 24.86, 67.01],
  ['Kashmore', 'Kashmore', 28.43, 69.58],
  ['Kazi Ahmed', 'Shaheed Benazirabad', 26.3, 68.09],
  ['Keti Bandar', 'Thatta', 24.14, 67.45],
  ['Khairpur', 'Khairpur', 27.53, 68.76],
  ['Khairpur Nathan Shah', 'Dadu', 27.09, 67.73],
  ['Khipro', 'Sanghar', 25.83, 69.38],
  ['Kotdiji', 'Khairpur', 27.34, 68.71],
  ['Kotri', 'Jamshoro', 25.37, 68.31],
  ['Kunri', 'Umerkot', 25.18, 69.57],
  ['Lakhi', 'Shikarpur', 27.85, 68.7],
  ['Larkana', 'Larkana', 27.56, 68.21],
  ['Madeji', 'Shikarpur', 27.75, 68.45],
  ['Manjhand', 'Jamshoro', 25.92, 68.24],
  ['Matiari', 'Matiari', 25.6, 68.45],
  ['Matli', 'Badin', 25.04, 68.66],
  ['Mehar', 'Dadu', 27.18, 67.82],
  ['Mehrabpur', 'Naushahro Feroze', 27.1, 68.42],
  ['Mirpur Bathoro', 'Sujawal', 24.73, 68.26],
  ['Mirpur Khas', 'Mirpur Khas', 25.53, 69.01],
  ['Mirpur Mathelo', 'Ghotki', 28.02, 69.55],
  ['Mirpur Sakro', 'Thatta', 24.55, 67.63],
  ['Mithi', 'Tharparkar', 24.74, 69.8],
  ['Moro', 'Naushahro Feroze', 26.66, 68.0],
  ['Nagarparkar', 'Tharparkar', 24.36, 70.75],
  ['Naudero', 'Larkana', 27.67, 68.36],
  ['Naushahro Feroze', 'Naushahro Feroze', 26.84, 68.12],
  ['Nawabshah', 'Shaheed Benazirabad', 26.24, 68.41],
  ['Pano Aqil', 'Sukkur', 27.86, 69.11],
  ['Pir jo Goth', 'Khairpur', 27.59, 68.62],
  ['Radhan', 'Dadu', 27.2, 67.93],
  ['Ratodero', 'Larkana', 27.8, 68.29],
  ['Rohri', 'Sukkur', 27.69, 68.9],
  ['Sakrand', 'Shaheed Benazirabad', 26.14, 68.27],
  ['Samaro', 'Umerkot', 25.28, 69.4],
  ['Sanghar', 'Sanghar', 26.05, 68.95],
  ['Sehwan', 'Jamshoro', 26.42, 67.86],
  ['Shahdadkot', 'Qambar Shahdadkot', 27.85, 67.91],
  ['Shahdadpur', 'Sanghar', 25.93, 68.62],
  ['Shahpur Chakar', 'Sanghar', 26.15, 68.65],
  ['Shikarpur', 'Shikarpur', 27.96, 68.64],
  ['Sujawal', 'Sujawal', 24.61, 68.08],
  ['Sukkur', 'Sukkur', 27.7, 68.86],
  ['Talhar', 'Badin', 24.88, 68.82],
  ['Tando Adam', 'Sanghar', 25.76, 68.66],
  ['Tando Allahyar', 'Tando Allahyar', 25.46, 68.72],
  ['Tando Bago', 'Badin', 24.79, 68.97],
  ['Tando Jam', 'Hyderabad', 25.43, 68.53],
  ['Tando Muhammad Khan', 'Tando Muhammad Khan', 25.12, 68.54],
  ['Tharushah', 'Naushahro Feroze', 26.94, 68.11],
  ['Thatta', 'Thatta', 24.75, 67.92],
  ['Thul', 'Jacobabad', 28.24, 68.77],
  ['Ubauro', 'Ghotki', 28.16, 69.73],
  ['Umerkot', 'Umerkot', 25.36, 69.74],
  ['Warah', 'Qambar Shahdadkot', 27.45, 67.8],
];

export const towns = RAW.map(([name, district, lat, lon]) => ({ slug: kebab(name), name, district, lat, lon }));
export const townBySlug = new Map(towns.map((t) => [t.slug, t]));

// Bigger places, always labelled on the map so people can find their bearings.
export const landmarkTowns = new Set(['karachi', 'hyderabad', 'sukkur', 'larkana', 'shikarpur', 'jacobabad', 'mirpur-khas', 'thatta', 'nawabshah', 'dadu', 'mithi']);

function distanceKm(a, b) {
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export function nearbyTowns(town, count = 6) {
  return towns
    .filter((t) => t.slug !== town.slug)
    .map((t) => ({ ...t, km: distanceKm(town, t) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, count);
}
