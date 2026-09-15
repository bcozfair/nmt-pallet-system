import React, { useRef } from 'react';
import { Pallet } from '../../../types';
import { QrCode, Printer, ImageDown } from 'lucide-react';
import { useT } from '../../../hooks/useT';
import { getLang } from '../../../services/i18n';
import { toast } from '../../../services/toast';
import { qrPngDataUrl, qrSvgDataUrl } from '../../../services/qrImage';
import { Button, Modal } from '../../ui';

// A pallet id was previously dropped straight into the print window's markup.
// Today's ids are all "P001"-shaped so nothing broke, but one containing <
// injected markup into a document built with innerHTML semantics, which is not
// acceptable for a value that reaches the UI from the database.
//
// The symbols themselves come from services/qrImage, which draws them here in
// the browser. Nothing on this screen contacts a server any more, so a sheet of
// labels prints with the warehouse offline.

const escapeHtml = (value: string) =>
    value.replace(/[&<>"']/g, ch => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] as string
    ));

export const QRPrintModal = ({ pallets, onClose }: { pallets: Pallet[], onClose: () => void }) => {
    const t = useT();
    // headerActions ("พิมพ์ PDF") มาก่อนปุ่ม ✕ ใน DOM เสมอ (ดูคอมเมนต์ที่
    // headerActions ของ Modal.tsx) โฟกัสตัวแรกโดยดีฟอลต์จึงลงบนปุ่มพิมพ์ ผู้ใช้
    // คีย์บอร์ดที่เปิดกล่องนี้แล้วกด Enter ทันทีจะสั่งพิมพ์โดยไม่ได้ตั้งใจ ชี้
    // initialFocusRef มาที่กริดเนื้อหา (ไม่ใช่ปุ่มไหนเลย) ตัดปัญหานี้ตรง ๆ
    const contentRef = useRef<HTMLDivElement>(null);

    const handlePrint = () => {
        const printWindow = window.open('', '_blank', 'width=800,height=600');

        if (!printWindow) {
            // toast ไม่ใช่ alert: alert() บล็อกเธรดทั้งหน้าจนกว่าจะกดตกลง --
            // เหตุผลเดียวกับ handleDownloadImage ข้างล่าง
            toast.error(t.common.popupBlocked);
            return;
        }

        // This window is built from a string and loads none of the app's
        // stylesheets, so everything it needs has to be declared inline:
        // the charset, so Thai does not arrive as mojibake; <html lang>, which
        // drives line-breaking for a script that has no spaces between words;
        // and a face that actually carries Thai glyphs. Courier New has none,
        // which is why it moved off <body> and onto .title -- the pallet IDs
        // are the only part that wants a monospace, and keeping it there
        // leaves the codes looking exactly as they did before.
        const htmlContent = `
            <!DOCTYPE html>
            <html lang="${getLang()}">
            <head>
                <meta charset="utf-8">
                <title>${t.modals.printWindowTitle}</title>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Noto+Sans+Thai:wght@300;400;500;600;700&display=swap" rel="stylesheet">
                <style>
                    body { font-family: "Noto Sans Thai", "Inter", system-ui, sans-serif; padding: 20px; }
                    .grid {
                        display: grid; 
                        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); 
                        gap: 15px; 
                    }
                    .card { 
                        border: 2px solid #000; 
                        padding: 15px; 
                        text-align: center; 
                        border-radius: 8px; 
                        page-break-inside: avoid;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                    }
                    /* No image-rendering here any more. It was worth having when
                       the symbol arrived as a 150px bitmap and the printer had
                       to enlarge it; the symbol is now an SVG, and asking a
                       vector to render like a low-resolution bitmap only costs
                       sharpness at print resolution. */
                    img {
                        width: 100px;
                        height: 100px;
                    }
                    .title {
                        font-family: 'Courier New', monospace;
                        font-size: 20px;
                        font-weight: 900;
                        margin-bottom: 5px;
                        line-height: 1;
                    }
                    /* No text-transform here any more: uppercase does nothing to
                       Thai, and the mark below reads in whichever language the
                       sheet was printed in. */
                    .footer {
                        margin-top: 5px;
                        font-size: 9px;
                        font-weight: bold;
                        color: #555;
                    }
                    @media print {
                        .no-print { display: none; }
                        body { padding: 0; }
                    }
                </style>
            </head>
            <body>
                <div class="no-print" style="margin-bottom: 20px; text-align: center;">
                    <p style="margin-bottom: 10px;">${t.modals.printHint(`<strong>${t.modals.saveAsPdf}</strong>`)}</p>
                    <button onclick="window.print()" style="font-size: 16px; padding: 10px 20px; cursor: pointer; background: #000; color: #fff; border: none; border-radius: 5px;">🖨️ ${t.modals.printNow}</button>
                </div>
                <div class="grid">
                    ${pallets.map(p => `
                        <div class="card">
                            <div class="title">${escapeHtml(p.pallet_id)}</div>
                            <img src="${qrSvgDataUrl(p.pallet_id)}" />
                            <div class="footer">${t.modals.propertyMark}</div>
                        </div>
                    `).join('')}
                </div>
                <script>
                    setTimeout(() => {
                        window.print();
                    }, 1000);
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
    };

    // No longer async, and no longer a fetch: the PNG is drawn on a canvas in
    // this tab. The try/catch stays because canvas encoding can still fail --
    // a browser with canvas disabled for fingerprinting reasons, chiefly -- and
    // a silent no-op on a button press is worse than a toast.
    const handleDownloadImage = (palletId: string) => {
        try {
            const link = document.createElement('a');
            link.href = qrPngDataUrl(palletId, 300);
            link.download = `NMT_QR_${palletId}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error: any) {
            console.error('Download failed', error);
            // toast ไม่ใช่ alert: alert() บล็อกเธรดทั้งหน้าจนกว่าจะกดตกลง ซึ่งบน
            // กล่องที่มีปุ่มดาวน์โหลดเรียงเป็นสิบใบหมายถึงต้องปิดกล่องระบบทีละใบ
            // และแอปมี toast service อยู่แล้ว
            toast.error(t.modals.downloadFailed);
        }
    };

    return (
        <Modal
            isOpen
            onClose={onClose}
            title={t.modals.qrSheetTitle}
            icon={QrCode}
            size="xl"
            dismissOnBackdrop
            closeLabel={t.common.closeDialog}
            subtitle={t.modals.itemsSelected(pallets.length)}
            // ปุ่มอยู่บนหัว ไม่ใช่ท้ายกล่อง: เนื้อเป็นกริดยาวที่ต้องเลื่อน ปุ่มพิมพ์
            // ต้องเห็นตลอดโดยไม่ต้องเลื่อนลงไปสุด -- นี่เป็นโมดัลตัวเดียวในแอปที่
            // ใช้ headerActions
            headerActions={
                <Button variant="accent" icon={Printer} onClick={handlePrint}>
                    {t.modals.printPdf}
                </Button>
            }
            initialFocusRef={contentRef}
        >
            <div ref={contentRef} tabIndex={-1} className="-mx-5 -mb-5 bg-slate-100 px-5 py-5">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                    {pallets.map(p => (
                        <div
                            key={p.pallet_id}
                            className="flex w-full break-inside-avoid flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm transition hover:shadow-md"
                        >
                            {/* font-bold ไม่ใช่ font-black -- แอปโหลดฟอนต์แค่ 300-700
                                น้ำหนัก 900 ถูกเบราว์เซอร์สังเคราะห์ */}
                            <h3 className="font-mono text-2xl font-bold leading-none tracking-tighter text-slate-900">
                                {p.pallet_id}
                            </h3>

                            <div className="rounded-lg border border-slate-100 bg-white p-2">
                                <img
                                    src={qrSvgDataUrl(p.pallet_id)}
                                    alt={p.pallet_id}
                                    className="h-24 w-24 object-contain mix-blend-multiply"
                                />
                            </div>

                            <div className="mt-1 flex w-full items-center justify-between border-t border-slate-100 pt-2">
                                <p className="truncate text-[10px] font-semibold text-slate-400">
                                    {t.modals.propertyMarkShort}
                                </p>
                                {/* สีเดียวกับปุ่ม "เพิ่มพาเลท" บนหัวหน้าคลัง (`primary`)
                                    ปุ่มนี้อยู่บนการ์ดทุกใบในกริด จึงยังเป็น `size="sm"`
                                    เหมือนเดิม -- เปลี่ยนแค่สี ไม่ใช่ขนาด */}
                                <Button
                                    size="sm"
                                    variant="primary"
                                    icon={ImageDown}
                                    onClick={() => handleDownloadImage(p.pallet_id)}
                                    aria-label={t.modals.downloadPng}
                                >
                                    {t.common.save}
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </Modal>
    );
};
