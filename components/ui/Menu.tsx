import React, { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { BUTTON_BASE, BUTTON_SIZE, BUTTON_VARIANT } from './Button';
import type { ButtonVariant } from './Button';

export type MenuTone = 'brand' | 'accent' | 'neutral' | 'danger';

export interface MenuItem {
    label: string;
    icon?: LucideIcon;
    tone?: MenuTone; // default 'neutral'
    onClick: () => void;
}

export interface MenuProps {
    label: string;
    items: readonly MenuItem[];
    icon?: LucideIcon;
    iconOnly?: boolean; // ใช้ label เป็น aria-label แทนข้อความในปุ่ม
    align?: 'left' | 'right'; // default 'right'
    variant?: ButtonVariant; // default 'primary'
    openUpward?: boolean; // default false
    disabled?: boolean;
    /**
     * ให้พาเนลกว้างเท่าปุ่มเป๊ะ แทนความกว้างคงที่ 256px
     *
     * ใช้คู่กับ `className` ที่กำหนดความกว้างให้ราก เช่น `className="w-44"` --
     * ปุ่มกับพาเนลจะกิน `w-full` ของรากตัวเดียวกัน จึงกว้างเท่ากันโดยไม่ต้องมีใคร
     * เดาความกว้างของอีกฝ่าย ถ้าไม่ให้ความกว้างมา รากจะกว้างตามคอนเทนเนอร์แม่
     */
    matchTriggerWidth?: boolean;
    /** ความกว้างของราก -- ตัว Menu เองไม่กำหนดความกว้าง เหมือน SelectField */
    className?: string;
}

const TONE_CHIP: Record<MenuTone, string> = {
    brand: 'bg-brand-50 text-brand-600',
    accent: 'bg-accent-50 text-accent-600',
    neutral: 'bg-slate-100 text-slate-500',
    danger: 'bg-red-50 text-red-600',
};

const ITEM_BASE =
    'flex min-h-10 w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm ' +
    'leading-snug transition focus-visible:outline-2 focus-visible:outline-offset-2 ' +
    'focus-visible:outline-brand-500';

const CHIP = 'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg';

// รูปทรงกับความกว้างแยกกัน แล้วค่อยประกอบ -- ความกว้างสองแบบต้อง "สลับทั้งก้อน"
// ไม่ใช่เอา w-full ไปต่อท้ายสตริงที่มี w-64 อยู่แล้ว สองคลาสที่ตั้งค่าเดียวกันบน
// element เดียวตัดสินผู้ชนะที่ลำดับใน CSS ที่ build ออกมา ไม่ใช่ลำดับในสตริง
// (กับดักเดียวกับที่ Card.tsx และ Button.tsx บันทึกไว้)
const PANEL_SHAPE =
    'absolute z-30 rounded-2xl border border-slate-200 ' +
    'bg-white p-1.5 shadow-[0_24px_60px_-32px_rgba(15,42,82,0.45)] animate-pop-in';

// max-w กันพาเนลไม่ให้ล้นจอ 360px: มันเกาะกับปุ่มที่อาจอยู่ชิดขอบจอ w-64 เปล่า ๆ
// จึงห้อยพ้นจอได้เมื่อป้ายภาษาไทยดันให้กว้างขึ้น
const PANEL_WIDTH_DEFAULT = 'w-64 max-w-[calc(100vw-2rem)]';

// ไม่ต้องมี max-w: พาเนลกว้างเท่าปุ่ม และปุ่มอยู่ในจออยู่แล้วเสมอ
const PANEL_WIDTH_TRIGGER = 'w-full';

// Generic accessible dropdown menu: a trigger button that opens a list of
// actions. Extracted from components/admin/dashboard/sections/PageHeader.tsx,
// which recorded that the version before it was a bare div toggle -- no
// aria-expanded (so a screen reader announced a button that appeared to do
// nothing), no Escape (so the only way out was a mouse click somewhere else),
// and no focus return (so keyboard focus was left on a node that had just
// been unmounted). Everything below exists to not repeat that.
export const Menu: React.FC<MenuProps> = ({
    label,
    items,
    icon: Icon,
    iconOnly = false,
    align = 'right',
    variant = 'primary',
    openUpward = false,
    disabled = false,
    matchTriggerWidth = false,
    className = '',
}) => {
    const menuId = useId();

    const [isOpen, setIsOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

    const closeMenu = (returnFocus: boolean) => {
        setIsOpen(false);
        if (returnFocus) triggerRef.current?.focus();
    };

    // Both listeners are attached only while the menu is open -- a keydown
    // handler on `document` for the entire life of the page would run on
    // every keystroke typed into every field on the page.
    useEffect(() => {
        if (!isOpen) return;

        // `mousedown`, not `click`: a click that starts outside and finishes on
        // the menu would otherwise count as an outside click and close it.
        const onPointerDown = (event: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                closeMenu(true);
            }
        };

        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [isOpen]);

    // Focus lands on the first item when the menu opens, which is what makes it
    // reachable at all from the keyboard. It does not draw a ring for a mouse
    // user: the items style `focus-visible`, and a programmatic focus following
    // a pointer interaction does not match it.
    useEffect(() => {
        if (isOpen) itemRefs.current[0]?.focus();
    }, [isOpen]);

    const focusItem = (index: number) => {
        const activeItems = itemRefs.current.filter(Boolean);
        if (activeItems.length === 0) return;
        const wrapped = (index + activeItems.length) % activeItems.length;
        activeItems[wrapped]?.focus();
    };

    const onMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        const activeItems = itemRefs.current.filter(Boolean);
        const current = activeItems.findIndex((el) => el === document.activeElement);

        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                focusItem(current + 1);
                break;
            case 'ArrowUp':
                event.preventDefault();
                focusItem(current - 1);
                break;
            case 'Home':
                event.preventDefault();
                focusItem(0);
                break;
            case 'End':
                event.preventDefault();
                focusItem(activeItems.length - 1);
                break;
            case 'Tab':
                // Tabbing out is a dismissal. Focus is already moving on its
                // own, so this one does not pull it back to the trigger.
                setIsOpen(false);
                break;
        }
    };

    const runItem = (action: () => void) => {
        action();
        closeMenu(true);
    };

    const onTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
        if (event.key === 'ArrowDown' && !isOpen) {
            event.preventDefault();
            setIsOpen(true);
        }
    };

    // `w-full` ต่อท้ายได้โดยไม่ชนอะไร -- ไม่มีคลาสความกว้างอยู่ใน BUTTON_BASE,
    // BUTTON_SIZE หรือ BUTTON_VARIANT เลย ต่างจากความกว้างของพาเนลที่ต้องสลับทั้งก้อน
    const triggerClassName =
        `${BUTTON_BASE} ${BUTTON_SIZE.md} ${BUTTON_VARIANT[variant]} ` +
        `${iconOnly ? 'px-2.5' : 'px-3.5'} ${matchTriggerWidth ? 'w-full' : ''}`;

    return (
        <div className={`relative ${className}`} ref={rootRef}>
            <button
                ref={triggerRef}
                type="button"
                onClick={() => setIsOpen((open) => !open)}
                onKeyDown={onTriggerKeyDown}
                disabled={disabled}
                aria-haspopup="menu"
                aria-expanded={isOpen}
                aria-controls={isOpen ? menuId : undefined}
                aria-label={iconOnly ? label : undefined}
                className={triggerClassName}
            >
                {Icon && <Icon size={16} aria-hidden="true" />}
                {!iconOnly && label}
                {/* The chevron reads as "this button has more options"; an
                    icon-only trigger (e.g. a "..." row action) has no room for
                    it and the icon it does show already implies a menu. */}
                {!iconOnly && (
                    <ChevronDown
                        size={16}
                        aria-hidden="true"
                        // ml-auto เฉพาะตอนปุ่มถูกยืดให้กว้างกว่าเนื้อหา -- margin auto
                        // กินที่ว่างก่อน justify-content ไอคอนกับป้ายจึงไปชิดซ้ายและ
                        // เชฟรอนไปชิดขวาเอง โดยไม่ต้องเอา justify-between ไปทับ
                        // justify-center ที่อยู่ใน BUTTON_BASE ซึ่งเป็นการวางคลาสสอง
                        // ตัวที่คุมคุณสมบัติเดียวกันบน element เดียว
                        className={
                            `transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ` +
                            (matchTriggerWidth ? 'ml-auto' : '')
                        }
                    />
                )}
            </button>

            {isOpen && (
                <div
                    id={menuId}
                    role="menu"
                    aria-orientation="vertical"
                    aria-label={label}
                    onKeyDown={onMenuKeyDown}
                    className={
                        `${PANEL_SHAPE} ` +
                        `${matchTriggerWidth ? PANEL_WIDTH_TRIGGER : PANEL_WIDTH_DEFAULT} ` +
                        (openUpward ? 'bottom-full mb-2' : 'top-full mt-2') +
                        ' ' +
                        (align === 'right' ? 'right-0' : 'left-0')
                    }
                >
                    {items.map((item, index) => {
                        const ItemIcon = item.icon;
                        const tone = item.tone ?? 'neutral';
                        return (
                            <button
                                key={index}
                                ref={(el) => {
                                    itemRefs.current[index] = el;
                                }}
                                type="button"
                                role="menuitem"
                                onClick={() => runItem(item.onClick)}
                                className={
                                    `${ITEM_BASE} ` +
                                    (tone === 'danger'
                                        ? 'text-red-700 hover:bg-red-50'
                                        : 'text-slate-700 hover:bg-slate-50')
                                }
                            >
                                {ItemIcon && (
                                    <span className={`${CHIP} ${TONE_CHIP[tone]}`} aria-hidden="true">
                                        <ItemIcon size={14} />
                                    </span>
                                )}
                                {item.label}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
