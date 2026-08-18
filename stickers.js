/*
  ============================================================
  CONTENIDO DEL ÁLBUM — editá esto para poner tu tema real.
  ============================================================
  - Cada objeto de CATEGORIES es una "página" del álbum.
  - "count" es cuántas figuritas tiene esa página.
  - Cambiá los "name" por lo que corresponda (equipos, capítulos,
    lo que sea) y ajustá "count" si alguna página tiene más o
    menos figuritas que otra.
  - Las figuritas se generan solas a partir de esto: no hace
    falta tocar nada más abajo.
*/

const CATEGORIES = [
  { id: "cat-01", name: "Categoría 1", count: 25 },
  { id: "cat-02", name: "Categoría 2", count: 25 },
  { id: "cat-03", name: "Categoría 3", count: 25 },
  { id: "cat-04", name: "Categoría 4", count: 25 },
  { id: "cat-05", name: "Categoría 5", count: 25 },
  { id: "cat-06", name: "Categoría 6", count: 25 },
  { id: "cat-07", name: "Categoría 7", count: 25 },
  { id: "cat-08", name: "Categoría 8", count: 25 },
];

/*
  Si más adelante querés imágenes reales en vez de los numeritos,
  agregá acá el path de la imagen para las figuritas puntuales que
  quieras, usando el id "cat-XX-NNN" (mirá cómo se arma más abajo).
  Ejemplo:
    const STICKER_IMAGES = {
      "cat-01-007": "images/cat01-007.jpg",
    };
  y en script.js, al renderizar un slot lleno, si existe
  STICKER_IMAGES[id] usalo como fondo en vez del número.
*/
const STICKER_IMAGES = {};

function buildStickers() {
  const list = [];
  CATEGORIES.forEach((cat) => {
    for (let n = 1; n <= cat.count; n++) {
      const num = String(n).padStart(3, "0");
      list.push({
        id: `${cat.id}-${num}`,
        catId: cat.id,
        number: n,
        label: num,
      });
    }
  });
  return list;
}

const STICKERS = buildStickers();

window.ALBUM_DATA = { CATEGORIES, STICKERS, STICKER_IMAGES };