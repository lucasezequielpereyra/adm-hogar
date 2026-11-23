// Genera los sprites pixel art originales de la app a partir de mapas de caracteres.
// Uso: node scripts/generate-sprites.mjs
// Salida: public/sprites/*.svg y public/icons/*.png
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const spritesDir = join(root, "public", "sprites");
const iconsDir = join(root, "public", "icons");
mkdirSync(spritesDir, { recursive: true });
mkdirSync(iconsDir, { recursive: true });

/** Convierte un mapa de caracteres en SVG. '.' = transparente. */
function toSvg(name, inputRows, legend, { px = 1, background, pad = false } = {}) {
  const maxWidth = Math.max(...inputRows.map((r) => r.length));
  const rows = pad ? inputRows.map((r) => r.padEnd(maxWidth, ".")) : inputRows;
  const width = rows[0].length;
  rows.forEach((r, i) => {
    if (r.length !== width) {
      throw new Error(`${name}: la fila ${i} mide ${r.length}, se esperaba ${width}`);
    }
    for (const ch of r) {
      if (ch !== "." && !(ch in legend)) throw new Error(`${name}: color '${ch}' sin definir`);
    }
  });
  const height = rows.length;
  const rects = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < width) {
      const ch = row[x];
      let run = 1;
      while (x + run < width && row[x + run] === ch) run++;
      if (ch !== ".") {
        rects.push(
          `<rect x="${x * px}" y="${y * px}" width="${run * px}" height="${px}" fill="${legend[ch]}"/>`,
        );
      }
      x += run;
    }
  });
  const bg = background
    ? `<rect width="${width * px}" height="${height * px}" fill="${background}"/>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width * px}" height="${height * px}" viewBox="0 0 ${width * px} ${height * px}" shape-rendering="crispEdges">${bg}${rects.join("")}</svg>`;
}

function save(name, svg) {
  writeFileSync(join(spritesDir, name), svg);
  return svg;
}

// ── Suelo (tile de 16×10, se repite en X) ──────────────────────────
const suelo = [
  "...g......gg....",
  "GgGGGGgGGGGgGGGg",
  "GGGGGGGGGGGGGGGG",
  "dGdGGdGGGdGGdGGd",
  "DdDDDDDDdDDDDDdD",
  "DDDDsDDDDDDkDDDD",
  "DkDDDDDDsDDDDDDD",
  "DDDDDkDDDDDDDsDD",
  "DsDDDDDDDkDDDDDD",
  "DDDDDDDDDDDDDDkD",
];
save(
  "suelo-dia.svg",
  toSvg("suelo-dia", suelo, {
    g: "#7ad66f", G: "#3fa34d", d: "#2e7d3a",
    D: "#b06a3b", k: "#8a4f2a", s: "#d08a50",
  }, { px: 4 }),
);
save(
  "suelo-noche.svg",
  toSvg("suelo-noche", suelo, {
    g: "#4fa463", G: "#2f7a45", d: "#1e5233",
    D: "#4a3358", k: "#36244a", s: "#6a4a7a",
  }, { px: 4 }),
);

// ── Tierra (tile de 16×6, continúa el suelo hacia abajo) ────────────
const tierra = [
  "DDDDsDDDDDDkDDDD",
  "DkDDDDDDsDDDDDDD",
  "DDDDDkDDDDDDDsDD",
  "DsDDDDDDDkDDDDDD",
  "DDDDDDDDDDDDDDkD",
  "DDDkDDDDDDsDDDDD",
];
save("tierra-dia.svg", toSvg("tierra-dia", tierra, { D: "#b06a3b", k: "#8a4f2a", s: "#d08a50" }, { px: 4 }));
save("tierra-noche.svg", toSvg("tierra-noche", tierra, { D: "#4a3358", k: "#36244a", s: "#6a4a7a" }, { px: 4 }));

// ── Nubes (tile de 64×12) ────────────────────────────────────────────
const nubes = [
  "................................................................",
  "......wwww...............................................www...",
  "....wwwwwwww..............wwww.........................wwwwwww..",
  "...wwwwwwwwwww..........wwwwwwww......................wwwwwwwww.",
  ".wwwwwwwwwwwwww.......wwwwwwwwwwww...................wwwwwwwwwww",
  "wwwwwwwwwwwwwwww.....wwwwwwwwwwwwwww.................bbwwwwwwwbb",
  "bbwwwwwwwwwwwwbb....bbwwwwwwwwwwwwwbb..................bbbbbbb..",
  "..bbbbbbbbbbbb.......bbbbbbbbbbbbbbb...........................w",
  "...............................................................w",
  "................................................................",
  "................................................................",
  "................................................................",
];
save("nubes.svg", toSvg("nubes", nubes.map((r) => r.padEnd(64, ".")), { w: "#ffffff", b: "#cde9fd" }, { px: 4 }));

// ── Estrellas (tile de 64×12) ───────────────────────────────────────
const estrellas = [
  "",
  "....y..........................c",
  "...yyy..................................................y",
  "....y...........c",
  "...........................................yy",
  "..............................y",
  ".........c.....................................................c",
  "...................................c",
  "........................y",
  "......................yyy...........................c",
  "........................y",
  "",
].map((r) => r.padEnd(64, "."));
save("estrellas.svg", toSvg("estrellas", estrellas, { y: "#ffe9a6", c: "#8ea2e8" }, { px: 4 }));

// ── Moneda (10×10) ───────────────────────────────────────────────────
const moneda = [
  "...kkkk...",
  "..kyyyyk..",
  ".kywwyyok.",
  "kywyyyyyok",
  "kywyooyyok",
  "kyyyooyyok",
  "kyyyyyyyok",
  ".kyyyyyok.",
  "..kooook..",
  "...kkkk...",
];
const monedaLegend = { k: "#1b1b2f", y: "#f8b800", w: "#fff3c4", o: "#c98a00" };
save("moneda.svg", toSvg("moneda", moneda, monedaLegend, { px: 1 }));

// ── Michi sentado (16×16), gato naranja original ────────────────────
const michi = [
  "..k........k....",
  ".kok......kok...",
  ".kpokkkkkkopk...",
  ".koooooooooook..",
  ".kooeooooeoook..",
  ".kooeooooeoook..",
  ".kollppollllok..",
  ".kolllkklllok...",
  "..kooooooook....",
  "..kodoooodok....",
  ".koooddooooook..",
  ".kodooooooodok..",
  ".kooooooooook.kk",
  ".koooooooooookok",
  ".kowwokkowwokok.",
  "..kkkk..kkkkkk..",
];
const michiLegend = {
  k: "#1b1b2f", o: "#f79a3e", d: "#c9702a", l: "#ffd6a0",
  p: "#ff8fa3", e: "#1b1b2f", w: "#fff3e6",
};
save("michi.svg", toSvg("michi", michi, michiLegend, { px: 1 }));

// ── Michi durmiendo (16×10) ─────────────────────────────────────────
const michiDurmiendo = [
  "..k.....k.......",
  ".kok...kok......",
  ".kookkkkook.....",
  ".koooooooook....",
  ".kokkookkook.kk.",
  ".koolppllook.kok",
  "..koooooooookkok",
  ".kooddooooddoook",
  ".kowwoooooowwok.",
  "..kkkkkkkkkkkk..",
];
save("michi-durmiendo.svg", toSvg("michi-durmiendo", michiDurmiendo, michiLegend, { px: 1 }));

// ── Michi negro: misma silueta, otra paleta (ojos verdes, "rim light") ─
const michiNegroLegend = {
  k: "#1b1b2f", o: "#2f2f47", d: "#3f3f5e", l: "#56567c",
  p: "#ff8fa3", e: "#9be564", w: "#56567c",
};
save("michi-negro.svg", toSvg("michi-negro", michi, michiNegroLegend, { px: 1 }));
save("michi-negro-durmiendo.svg", toSvg("michi-negro-durmiendo", michiDurmiendo, michiNegroLegend, { px: 1 }));

// ── Caritas (10×8) para íconos chicos y toasts ──────────────────────
const carita = [
  ".k......k.",
  "kok....kok",
  "kpokkkkopk",
  "kooooooook",
  "koeooooeok",
  "koooppoook",
  "kloooooolk",
  ".kkkkkkkk.",
];
save("carita-naranja.svg", toSvg("carita-naranja", carita, michiLegend, { px: 1 }));
save("carita-negro.svg", toSvg("carita-negro", carita, michiNegroLegend, { px: 1 }));

// ── Ícono de la app (32×32): casita con los dos michis ──────────────
const icono = [
  "................................",
  "................................",
  "................................",
  "...............kk...............",
  "..............kRRk..............",
  ".............kRRRRk.............",
  "............kRRrRRRk............",
  "...........kRRRRRRrRk...........",
  "..........kRRrRRRRRRRk..........",
  ".........kRRRRRRRrRRRRk.........",
  "........kRRRRrRRRRRRRRRk........",
  ".......kRRRRRRRRRRRrRRRRk.......",
  "......kkkkkkkkkkkkkkkkkkkk......",
  ".......kwwwwwwwwwwwwwwwwk.......",
  ".......kwwwwwwwwwwwwwwwwk.......",
  ".......kwkkkkwwwwwwkkkkwk.......",
  ".......kwkcckwwwwwwkcckwk.......",
  ".......kwkcckwwwwwwkcckwk.......",
  ".......kwkkkkwwwwwwkkkkwk.......",
  ".......kwwwwwwkkkkwwwwwwk.......",
  ".......kwwwwwwkddkwwwwwwk.......",
  ".......kwwwwwwkddkwwwwwwk.......",
  ".......kwwwwwwkdykwwwwwwk.......",
  ".......kwwwwwwkddkwwwwwwk.......",
  "GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG",
  "gGGgGGGGgGGGGGgGGGGgGGGGGgGGGgGG",
  "DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD",
  "DDsDDDDDDDDkDDDDDDsDDDDDDDDDkDDD",
  "DDDDDDkDDDDDDDDDDDDDDDDsDDDDDDDD",
  "DDDDDDDDDDDDDsDDDDDDkDDDDDDDDDDD",
  "DkDDDDDDDDDDDDDDDDDDDDDDDDDDsDDD",
  "DDDDDDDDDsDDDDDDDDDDDDDDDDDDDDDD",
];
const iconoLegend = {
  k: "#1b1b2f", R: "#c2391f", r: "#e8664c", w: "#f7fbff", c: "#7cc8f8",
  d: "#8a4f2a", y: "#f8b800", G: "#3fa34d", g: "#7ad66f", D: "#b06a3b", s: "#d08a50",
  O: "#f79a3e", E: "#1b1b2f", N: "#2f2f47", H: "#9be564",
};
// Michis mini (5×8) a cada lado de la casa, sentados sobre el pasto.
const miniMichi = [
  "k.....k",
  "kk...kk",
  "kfkkkfk",
  "kfffffk",
  "kfefefk",
  "kfffffk",
  "kfffffk",
  "kfffffk",
  "kkkkkkk",
];
function overlay(rows, sprite, x, y, map) {
  return rows.map((row, ry) => {
    const sy = ry - y;
    if (sy < 0 || sy >= sprite.length) return row;
    const chars = row.split("");
    [...sprite[sy]].forEach((ch, sx) => {
      if (ch !== ".") chars[x + sx] = map[ch] ?? ch;
    });
    return chars.join("");
  });
}
let iconoRows = overlay(icono, miniMichi, 0, 15, { f: "O", e: "E" });
iconoRows = overlay(iconoRows, miniMichi, 25, 15, { f: "N", e: "H" });
const iconoSvg = save("icono.svg", toSvg("icono", iconoRows, iconoLegend, { px: 1, background: "#7cc8f8" }));

async function png(svg, size, file, { padding = 0, background = "#7cc8f8" } = {}) {
  const inner = size - padding * 2;
  const img = await sharp(Buffer.from(svg), { density: 72 })
    .resize(inner, inner, { kernel: "nearest" })
    .png()
    .toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 4, background },
  })
    .composite([{ input: img, left: padding, top: padding }])
    .png()
    .toFile(join(iconsDir, file));
}

await png(iconoSvg, 192, "icon-192.png");
await png(iconoSvg, 512, "icon-512.png");
await png(iconoSvg, 512, "icon-maskable-512.png", { padding: 64 });
await png(iconoSvg, 180, "apple-touch-icon.png");
await png(iconoSvg, 32, "favicon-32.png");

// Vistas previas ampliadas para revisar los sprites a ojo
for (const [file, svg, scale] of [
  ["preview-michi.png", toSvg("michi", michi, michiLegend), 16],
  ["preview-michi-negro.png", toSvg("mn", michi, michiNegroLegend), 16],
  ["preview-michi-negro-durmiendo.png", toSvg("mnd", michiDurmiendo, michiNegroLegend), 16],
  ["preview-carita-naranja.png", toSvg("c1", carita, michiLegend), 16],
  ["preview-carita-negro.png", toSvg("c2", carita, michiNegroLegend), 16],
  ["preview-icono.png", iconoSvg, 12],
]) {
  const meta = await sharp(Buffer.from(svg)).metadata();
  await sharp(Buffer.from(svg))
    .resize(meta.width * scale, meta.height * scale, { kernel: "nearest" })
    .png()
    .toFile(join(process.env.PREVIEW_DIR ?? iconsDir, file));
}

console.log("Sprites generados en public/sprites y public/icons");
