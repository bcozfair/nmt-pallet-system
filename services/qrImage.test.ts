import { afterEach, describe, expect, it, vi } from 'vitest';
import { qrPngDataUrl, qrSvgDataUrl } from './qrImage';

// These labels are printed once and then glued to a pallet for the rest of its
// life, so the things worth pinning down here are the ones that make a printed
// sticker unreadable rather than merely ugly: the quiet zone a scanner needs to
// find the symbol at all, and module edges that land on whole pixels.

const svgOf = (text: string) => decodeURIComponent(qrSvgDataUrl(text).replace('data:image/svg+xml,', ''));

const extentOf = (svg: string) => Number(svg.match(/viewBox="0 0 (\d+) \1"/)![1]);

/** Top-left corner of every dark module in the symbol, in module units. */
const modulesOf = (svg: string) =>
    [...svg.matchAll(/M(\d+) (\d+)h1v1h-1z/g)].map(m => ({ x: Number(m[1]), y: Number(m[2]) }));

describe('qrSvgDataUrl', () => {
    it('คืน data URL ของ SVG ไม่ใช่ URL ของบริการภายนอก', () => {
        expect(qrSvgDataUrl('P001').startsWith('data:image/svg+xml,')).toBe(true);

        // The XML namespace is the only URL allowed to appear: it identifies the
        // SVG dialect and is never fetched. Anything else here would mean the
        // printed sheet reaches for the network again.
        expect(svgOf('P001').match(/https?:\/\/[^"]+/g)).toEqual(['http://www.w3.org/2000/svg']);
    });

    it('เว้นขอบเงียบ 4 โมดูลครบทั้งสี่ด้าน', () => {
        const svg = svgOf('P001');
        const extent = extentOf(svg);
        const modules = modulesOf(svg);

        expect(modules.length).toBeGreaterThan(0);
        // A module at 3 or at extent-4 would eat into the margin that lets a
        // scanner find the symbol's edges against the sticker's border.
        for (const { x, y } of modules) {
            expect(Math.min(x, y)).toBeGreaterThanOrEqual(4);
            expect(Math.max(x, y)).toBeLessThanOrEqual(extent - 5);
        }
    });

    it('รหัสพาเลทต่างกัน ได้สัญลักษณ์ต่างกัน', () => {
        expect(qrSvgDataUrl('P001')).not.toBe(qrSvgDataUrl('P002'));
    });

    it('รหัสที่มีอักขระพิเศษไม่ทำให้ markup ของ SVG เสีย', () => {
        // The id reaches this function from the database. It is encoded into
        // modules rather than written into the document, so the payload cannot
        // reappear as markup -- this asserts that stays true.
        const svg = svgOf('P<01&"');

        expect(svg).not.toContain('P<01');
        expect(svg.match(/</g)!.length).toBe(svg.match(/<\/svg>|<svg|<rect|<path/g)!.length);
    });
});

describe('qrPngDataUrl', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    const stubCanvas = () => {
        const ctx = { fillStyle: '', fillRect: vi.fn() };
        const canvas = {
            width: 0,
            height: 0,
            getContext: () => ctx,
            toDataURL: () => 'data:image/png;base64,stub',
        };
        vi.spyOn(document, 'createElement').mockReturnValue(canvas as unknown as HTMLElement);
        return { canvas, ctx };
    };

    it('ปัดขนาดลงให้เป็นจำนวนเท่าของโมดูล เพื่อไม่ให้ขอบโมดูลตกคร่อมพิกเซล', () => {
        const { canvas } = stubCanvas();

        qrPngDataUrl('P001', 300);

        // 'P001' is a version-1 symbol: 21 modules plus two quiet zones of 4 is
        // 29, and 29 divides into 300 ten times with 10 units to spare. Taking
        // the remainder would put a fraction of a pixel on every module edge.
        expect(canvas.width).toBe(290);
        expect(canvas.height).toBe(290);
    });

    it('วาดทุกโมดูลด้วยขนาดเท่ากัน และเลื่อนตามขอบเงียบ', () => {
        const { ctx } = stubCanvas();

        qrPngDataUrl('P001', 300);

        const drawn = ctx.fillRect.mock.calls.slice(1); // call 0 is the white ground
        expect(drawn.length).toBeGreaterThan(0);
        for (const [x, y, w, h] of drawn) {
            expect([w, h]).toEqual([10, 10]);
            expect(Math.min(x, y)).toBeGreaterThanOrEqual(40);
        }
    });

    it('ขอขนาดที่เล็กกว่าหนึ่งโมดูลต่อพิกเซล ยังได้ภาพที่สแกนได้', () => {
        const { canvas } = stubCanvas();

        qrPngDataUrl('P001', 5);

        expect(canvas.width).toBe(29);
    });
});
