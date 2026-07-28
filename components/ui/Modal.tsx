import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { BrandHairline, CARD_SURFACE } from './Card';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';
export type ModalTone = 'brand' | 'accent' | 'danger';

export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** ผูกเป็น aria-labelledby ของ panel -- dialog ต้องมีชื่อเสมอ จึงไม่ optional */
    title: string;
    subtitle?: React.ReactNode;
    icon?: LucideIcon;
    /** ระบายชิปไอคอนเท่านั้น ตัวหนังสือไม่เปลี่ยนสีตามโทน */
    tone?: ModalTone;
    size?: ModalSize;
    children: React.ReactNode;
    /** ปุ่มท้ายกล่อง ชิดขวา -- คนเรียกใส่ <Button> เอง */
    footer?: React.ReactNode;
    /** ปุ่มบนหัว สำหรับโมดัลที่เนื้อยาวจนปุ่มท้ายเลื่อนพ้นจอ */
    headerActions?: React.ReactNode;
    dismissOnBackdrop?: boolean;
    /** มีคำขอค้างอยู่: วิ่งเส้นแบรนด์บนขอบบน "และ" ทำให้กล่องปิดไม่ได้ระหว่างนั้น --
        Escape, ปุ่ม ✕, และคลิกพื้นหลัง (ถ้าเปิด dismissOnBackdrop) ถูกกันไว้ทั้งหมด
        เดิม prop นี้มีความหมายแค่เชิงภาพ (วิ่งเส้นอย่างเดียว) แต่ถ้ากล่องยังปิดได้
        ระหว่างคำขอค้าง แล้ว request นั้นถูกปฏิเสธหลังกล่องถูกปิด/unmount ไปแล้ว
        ผลลัพธ์ (error state ของผู้เรียก) จะตกลงบนต้นไม้ที่ไม่มีใครเห็นอีกต่อไป --
        ไม่มีทั้ง field error และ toast กลายเป็นความเงียบสมบูรณ์ */
    busy?: boolean;
    /** aria-label ของปุ่ม ✕ */
    closeLabel: string;
    /** 2 = โมดัลที่เปิดทับโมดัลอีกใบ */
    level?: 1 | 2;
}

// พื้นผิว: ยืม CARD_SURFACE (สีขอบ + สีพื้น) มาให้กล่องเป็นวัสดุเดียวกับการ์ดทุกใบ
// บนหน้า แต่ประกาศรัศมีกับเงาเอง ไม่ใช่ `${CARD_SHELL} shadow-...` -- Card.tsx:22-29
// บันทึกไว้ว่าคลาสสองตัวที่คุมคุณสมบัติเดียวกันบน element เดียว ผู้ชนะตัดสินที่ลำดับ
// ใน CSS ที่ build ออกมา ไม่ใช่ลำดับในสตริง
//
// เงาเข้มกว่าของการ์ดเพราะการ์ดถูกจูนมาสำหรับพื้นสว่าง เงานุ่มวางบน overlay ดำแล้ว
// หายไปเฉย ๆ ค่านี้อยู่ในตระกูลเดียวกับที่ SelectionBar ใช้บนพื้นเข้ม
export const MODAL_PANEL = `rounded-3xl border ${CARD_SURFACE} shadow-[0_32px_80px_-24px_rgba(15,42,82,0.6)]`;

const SIZE: Record<ModalSize, string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-4xl',
};

// ระบายชิปไอคอนอย่างเดียว ชุดเดียวกับ TONE_CHIP ใน StatTile.tsx และชิปไอคอนของ Menu
const TONE_CHIP: Record<ModalTone, string> = {
    brand: 'bg-brand-50 text-brand-600',
    accent: 'bg-accent-50 text-accent-600',
    danger: 'bg-red-50 text-red-600',
};

// z-50 / z-[60] ไม่ใช่ z-[9999]: บันไดของแอปคือแถบเลือกลอย z-20, overlay เมนูมือถือ
// z-30, sidebar z-40 แล้วจึงเป็นโมดัล ค่า 9999 ที่ของเดิมใส่ไว้เพื่อ "ให้ชนะแน่ ๆ"
// เลิกหมายความว่าอะไรทันทีที่ทุกตัวใส่เหมือนกัน
//
// เขียนเป็นค่าคงที่ที่ Tailwind อ่านเป็นข้อความในซอร์สได้ ไม่ใช่ `z-[${n}]`
const LEVEL_Z: Record<1 | 2, string> = {
    1: 'z-50',
    2: 'z-[60]',
};

const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
    'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// --- สถานะระดับโมดูล ที่ทุกโมดัลบนหน้าใช้ร่วมกัน ------------------------------
//
// สองก้อนแยกกันโดยตั้งใจ เพราะตอบคนละคำถาม:
//
// `stack` ตอบว่า "ใครอยู่ในสุด" ซึ่งเป็นสิ่งที่ Escape ต้องรู้ -- โมดัลที่ mount
// ทีหลังอยู่ท้ายอาร์เรย์และเป็นตัวเดียวที่ตอบ Escape ถ้าไม่มีอันนี้ Escape ครั้งเดียว
// จะปิดทั้งรูปหลักฐานและ PalletDetail ที่อยู่ข้างล่างพร้อมกัน
//
// `lockCount` ตอบว่า "ยังมีโมดัลเปิดอยู่ไหม" ซึ่งเป็นสิ่งที่การล็อกสกรอลล์ต้องรู้
// นับแยกจาก stack เพราะการอ่านความยาว stack ในจังหวะ effect ขึ้นกับลำดับที่ effect
// ของแต่ละโมดัลวิ่ง ซึ่งเป็นรายละเอียดที่ไม่ควรมีอะไรพึ่งพา
const stack: symbol[] = [];

let lockCount = 0;
let savedPaddingRight = '';

const lockScroll = () => {
    if (lockCount++ > 0) return;
    const root = document.documentElement;
    // ชดเชยความกว้าง scrollbar ที่หายไปตอนซ่อน overflow ไม่งั้นหน้าจะกระตุกกว้างขึ้น
    // ราว 15px ตอนเปิดโมดัล -- เห็นชัดที่สุดกับหัวเพจที่มีปุ่มชิดขวา
    const gap = window.innerWidth - root.clientWidth;
    savedPaddingRight = root.style.paddingRight;
    root.style.overflow = 'hidden';
    if (gap > 0) root.style.paddingRight = `${gap}px`;
};

const unlockScroll = () => {
    if (lockCount === 0) return;
    if (--lockCount > 0) return;
    const root = document.documentElement;
    root.style.overflow = '';
    root.style.paddingRight = savedPaddingRight;
};

function useDialog(
    isOpen: boolean,
    onClose: () => void,
    panelRef: React.RefObject<HTMLDivElement | null>,
    busy: boolean,
) {
    // อัตลักษณ์ประจำอินสแตนซ์ ใช้หาตัวเองใน stack -- Symbol เพราะสองโมดัลที่เปิด
    // พร้อมกันต้องไม่ชนกันแม้จะมี props เหมือนกันทุกอย่าง
    const idRef = useRef<symbol | null>(null);
    if (idRef.current === null) idRef.current = Symbol('dialog');
    const id = idRef.current;

    // เข้า/ออก stack และล็อก/คลายสกรอลล์ เป็น effect เดียวกัน เพราะทั้งคู่มีอายุ
    // เท่ากับ "โมดัลนี้เปิดอยู่" พอดี และ cleanup ตัวเดียวกันรับประกันว่าไม่ว่าจะ
    // ปิดด้วย isOpen=false หรือ unmount ทั้งต้นไม้ ก็คลายครบทั้งสองอย่าง
    useEffect(() => {
        if (!isOpen) return;
        stack.push(id);
        lockScroll();
        return () => {
            const i = stack.indexOf(id);
            if (i !== -1) stack.splice(i, 1);
            unlockScroll();
        };
    }, [isOpen, id]);

    useEffect(() => {
        if (!isOpen) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            // มีโมดัลที่อยู่ในกว่านี้เปิดอยู่ ปล่อยให้ตัวนั้นกิน Escape ไป
            if (stack[stack.length - 1] !== id) return;
            // มีคำขอค้างอยู่: ปิดไม่ได้ตอนนี้ -- ดูคอมเมนต์ที่ prop `busy` ว่าทำไม
            // `busy` อยู่ใน dependency array ข้างล่างด้วย ไม่ใช่แค่ปิดครอบตัวแปร:
            // ต้องอ่านค่าปัจจุบันเสมอ ไม่ใช่ค่าที่ effect นี้เห็นตอน mount
            if (busy) return;
            event.preventDefault();
            onClose();
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [isOpen, id, onClose, busy]);

    // ไม่ต้อง stopPropagation ให้ SelectionBar: มันตรวจด้วย DOM ว่ามี
    // [role="dialog"] เปิดอยู่ไหม (SelectionBar.tsx:14) ไม่ใช่ด้วยลำดับ event
    // -- ซึ่งเป็นเหตุผลที่ role ต้องอยู่บน panel ตามที่เรนเดอร์ข้างล่าง

    useEffect(() => {
        if (!isOpen) return;
        const panel = panelRef.current;
        // เก็บไว้ก่อนย้ายโฟกัส เพื่อคืนกลับตอนปิด -- ถ้าไม่คืน คนใช้คีย์บอร์ดจะถูก
        // ดีดไปเริ่มแท็บใหม่ที่ต้นหน้าทุกครั้งที่ปิดโมดัล
        const previouslyFocused = document.activeElement as HTMLElement | null;

        const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
        (first ?? panel)?.focus();

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Tab' || !panel) return;
            const nodes = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
            if (nodes.length === 0) return;
            const head = nodes[0];
            const tail = nodes[nodes.length - 1];
            if (event.shiftKey && document.activeElement === head) {
                event.preventDefault();
                tail.focus();
            } else if (!event.shiftKey && document.activeElement === tail) {
                event.preventDefault();
                head.focus();
            }
        };

        panel?.addEventListener('keydown', onKeyDown);
        return () => {
            panel?.removeEventListener('keydown', onKeyDown);
            previouslyFocused?.focus?.();
        };
    }, [isOpen, panelRef]);
}

export const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    subtitle,
    icon: Icon,
    tone = 'brand',
    size = 'md',
    children,
    footer,
    headerActions,
    dismissOnBackdrop = false,
    busy = false,
    closeLabel,
    level = 1,
}) => {
    const titleId = useId();
    const panelRef = useRef<HTMLDivElement>(null);
    useDialog(isOpen, onClose, panelRef, busy);

    if (!isOpen) return null;

    return createPortal(
        // portal ไป document.body เสมอ: โมดัลที่เรนเดอร์อยู่ในต้นไม้ของผู้เรียกจะถูก
        // overflow ของ ancestor ตัดขอบได้ และหกในสิบสองตัวของเดิมเป็นแบบนั้น
        <div
            data-testid="modal-overlay"
            className={`fixed inset-0 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm ${LEVEL_Z[level]}`}
            // ผูกที่ overlay แล้วเทียบ target กับ currentTarget แทนการวาง onClick ทับ
            // ทั้งพื้น: คลิกที่เริ่มในกล่องแล้วปล่อยนอกกล่อง (ลากเลือกข้อความจนเลย
            // ขอบ) จะไม่ถูกนับเป็นคลิกพื้นหลัง
            onMouseDown={
                dismissOnBackdrop
                    ? (event) => {
                          // มีคำขอค้างอยู่: กันเหมือน Escape ข้างบน -- เหตุผลเดียวกัน
                          if (busy) return;
                          if (event.target === event.currentTarget) onClose();
                      }
                    : undefined
            }
        >
            {/* role/aria-modal อยู่บน PANEL ไม่ใช่ overlay ข้างบน -- overlay คือพื้น
                มืดที่ครอบทุกอย่างข้างหลังไว้ด้วย การตั้งชื่อมันว่า dialog เท่ากับบอก
                screen reader ว่าทั้งหน้าคือ dialog นอกจากถูกในตัวเองแล้ว นี่ยังเป็น
                สิ่งที่ Escape guard ของ SelectionBar มองหา (SelectionBar.tsx:14):
                โมดัลที่เปิดอยู่ต้องหาเจอในเอกสาร แถบเลือกลอยจึงจะรู้ว่าตัวเองไม่ใช่
                สิ่งที่อยู่ในสุดแล้วและเลิกอ้างสิทธิ์ Escape -- ถ้าไม่มี Escape เหนือ
                โมดัลจะไปล้างการเลือกแถวที่อยู่ข้างหลังแทน */}
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                // ที่พักโฟกัสสำรอง สำหรับกล่องที่ไม่มีอะไรโฟกัสได้เลย
                tabIndex={-1}
                className={`${MODAL_PANEL} ${SIZE[size]} flex max-h-[90vh] w-full flex-col overflow-hidden animate-pop-in`}
            >
                <BrandHairline busy={busy} />

                <div className="flex shrink-0 items-start justify-between gap-3 px-5 py-4">
                    <div className="flex min-w-0 items-start gap-3">
                        {Icon && (
                            <span
                                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${TONE_CHIP[tone]}`}
                                aria-hidden="true"
                            >
                                <Icon size={20} />
                            </span>
                        )}
                        <div className="min-w-0">
                            {/* h2 ไม่ใช่ h3: หน้ามี h1 เดียวคือหัวเพจ (ui/PageHeader)
                                และโมดัลเป็นบล็อกระดับถัดลงมาจากมัน */}
                            <h2
                                id={titleId}
                                className="text-lg font-semibold leading-snug text-slate-900"
                            >
                                {title}
                            </h2>
                            {subtitle && (
                                <div className="mt-0.5 text-sm leading-relaxed text-slate-500">
                                    {subtitle}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                        {headerActions}
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={busy}
                            aria-label={closeLabel}
                            className={
                                'rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 ' +
                                'hover:text-slate-600 focus-visible:outline-2 ' +
                                'focus-visible:outline-offset-2 focus-visible:outline-brand-500 ' +
                                'disabled:pointer-events-none disabled:opacity-50'
                            }
                        >
                            <X size={18} aria-hidden="true" />
                        </button>
                    </div>
                </div>

                {/* ตัวเลื่อนตัวเดียวของกล่อง หัวกับท้าย shrink-0 อยู่นิ่ง
                    `min-h-0` จำเป็นจริง: flex item ตั้ง min-height:auto เป็นค่าเริ่มต้น
                    ซึ่งทำให้กล่องนี้ไม่ยอมหดต่ำกว่าเนื้อของมัน แล้ว overflow-y-auto
                    จะไม่มีวันทำงานเลย -- กล่องทั้งใบจะทะลุ max-h-[90vh] ออกไปแทน */}
                <div className="styled-scrollbar min-h-0 flex-1 overflow-y-auto px-5 pb-5">
                    {children}
                </div>

                {footer && (
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-slate-200/80 bg-slate-50/70 px-5 py-4">
                        {footer}
                    </div>
                )}
            </div>
        </div>,
        document.body,
    );
};
