// QR symbols, drawn here rather than fetched.
//
// Label images used to come from api.qrserver.com: the pallet id was pushed
// into a URL and an <img> downloaded the picture. That put a free third-party
// service on the critical path of the one operation the whole system starts
// with -- printing the sticker that goes on the pallet. No internet inside the
// warehouse, or a bad day at that provider, and no new pallet can be labelled.
// It also meant every pallet id the company prints travelled out to a stranger's
// access log for no reason at all.
//
// So the symbol is computed locally and handed to the browser as a data URL.
// Both exports are synchronous on purpose: they are called straight from render
// and from a template string that builds the print window's markup, and an
// async version would force both of those into state that has to settle first.
//
// ERROR CORRECTION IS 'Q' (25%), NOT THE DEFAULT.
//
// The stickers live on wooden pallets in a warehouse and users reported scans
// failing on labels that had gone dusty or scuffed. A quarter of the symbol can
// be destroyed at this level and still decode. Pallet ids are short ("P001"),
// so paying for that redundancy costs a few extra modules and nothing else.

import { create } from 'qrcode';

// Modules of blank margin required around the symbol by ISO/IEC 18004. Scanners
// use it to find the symbol's edges; without it a label printed hard against a
// dark border reads unreliably.
const QUIET_ZONE = 4;

const ERROR_CORRECTION = 'Q' as const;

interface Symbol {
    /** Width of the symbol in modules, quiet zone excluded. */
    size: number;
    /** Row-major, one byte per module, 1 = dark. */
    data: Uint8Array;
}

const symbolFor = (text: string): Symbol => {
    const { modules } = create(text, { errorCorrectionLevel: ERROR_CORRECTION });
    return { size: modules.size, data: modules.data };
};

/**
 * One SVG path covering every dark module, in a coordinate space where one unit
 * is one module. Drawing the modules as a single path rather than one <rect>
 * each keeps a sheet of fifty labels to a few kilobytes of markup.
 */
const darkModulePath = ({ size, data }: Symbol): string => {
    const parts: string[] = [];

    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            if (data[row * size + col]) {
                parts.push(`M${col + QUIET_ZONE} ${row + QUIET_ZONE}h1v1h-1z`);
            }
        }
    }

    return parts.join('');
};

/**
 * A QR symbol as an SVG data URL, for anything the browser displays or prints.
 *
 * Vector rather than a bitmap: the same string is used for a 96px preview tile
 * and for a printed label, and a printer asked to render a 150px PNG at 300dpi
 * produces exactly the soft edges that make a scanner work harder than it
 * should.
 */
export const qrSvgDataUrl = (text: string): string => {
    const symbol = symbolFor(text);
    const extent = symbol.size + QUIET_ZONE * 2;

    // shape-rendering=crispEdges: module boundaries land on exact integers, and
    // antialiasing across them greys the edge of every dark square.
    const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${extent} ${extent}" ` +
        `width="${extent}" height="${extent}" shape-rendering="crispEdges">` +
        `<rect width="${extent}" height="${extent}" fill="#fff"/>` +
        `<path d="${darkModulePath(symbol)}" fill="#000"/>` +
        `</svg>`;

    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

/**
 * A QR symbol as a PNG data URL, for the download button.
 *
 * A file leaving the app should be something every phone, chat app and label
 * printer opens without asking questions, which SVG is not.
 *
 * `sizePx` is a target, not a promise: the symbol is scaled by whole modules so
 * that no module lands on half a pixel, then the canvas comes out at whatever
 * that multiple is -- at or just under the request.
 */
export const qrPngDataUrl = (text: string, sizePx: number): string => {
    const symbol = symbolFor(text);
    const extent = symbol.size + QUIET_ZONE * 2;
    const scale = Math.max(1, Math.floor(sizePx / extent));
    const side = extent * scale;

    const canvas = document.createElement('canvas');
    canvas.width = side;
    canvas.height = side;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');

    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, side, side);

    ctx.fillStyle = '#000';
    for (let row = 0; row < symbol.size; row++) {
        for (let col = 0; col < symbol.size; col++) {
            if (symbol.data[row * symbol.size + col]) {
                ctx.fillRect(
                    (col + QUIET_ZONE) * scale,
                    (row + QUIET_ZONE) * scale,
                    scale,
                    scale,
                );
            }
        }
    }

    return canvas.toDataURL('image/png');
};
