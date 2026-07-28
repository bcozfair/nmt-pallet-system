# ระบบโมดัลร่วม — แผนลงมือ

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** สกัดเปลือกโมดัลและ primitive ฟอร์มเข้า `components/ui/` แล้วต่อสายโมดัลทั้ง 7 ตัวที่หน้าคลังพาเลทเปิดถึงได้ ให้เป็นสไตล์เดียวกับสไตล์หลักและมีพฤติกรรม dialog ที่ถูกต้อง

**Architecture:** `Modal` เป็นเปลือก + slot (หัว/เนื้อ/ท้าย) โดยพฤติกรรมทั้งหมด — portal, Escape ตาม stack, focus trap, คืนโฟกัส, ล็อกสกรอลล์ — อยู่ในฮุก `useDialog` ในไฟล์เดียวกัน `ConfirmDialog` เป็น preset ตัวเดียวที่สร้างทับ `Modal` ส่วนฟอร์มได้ `Field` / `TextInput` / `TextArea` เพิ่มเข้ามาข้าง ๆ `SelectField` ที่มีอยู่ ทำ primitive ให้เสร็จและมีเทสต์ก่อน แล้วค่อยต่อสายโมดัลทีละตัว เรียงจากง่ายไปยาก

**Tech Stack:** React 19 + TypeScript, Tailwind v4 (theme อยู่ใน `index.css`), lucide-react, Vitest + @testing-library/react + jsdom

**Spec:** `docs/superpowers/specs/2026-07-28-modal-system-design.md`

## Global Constraints

- **ไฟล์ใน `components/ui/` ห้าม import dictionary** ทุกข้อความที่ผู้ใช้เห็นต้องรับมาเป็น prop (`components/ui/index.ts:1-7`)
- **ห้ามใช้ `animate-in` / `fade-in` / `zoom-in-95` / `slide-in-*` / `animate-pulse-slow`** คลาสชุดนี้มาจากปลั๊กอิน `tailwindcss-animate` ที่ไม่ได้อยู่ใน `package.json` และคอมไพล์ออกมาเป็นศูนย์ (`index.css:326-344`) ใช้ `animate-pop-in` / `animate-surface-in` / `animate-brand-sweep` ที่นิยามจริงใน `index.css` เท่านั้น
- **ห้ามใช้ `font-black`** แอปโหลดฟอนต์แค่ 300–700 น้ำหนัก 900 ถูกเบราว์เซอร์สังเคราะห์และทำวรรณยุกต์ไทยเลอะ (`AdminHelpers.tsx:138-143`) เพดานคือ `font-semibold`
- **ห้ามประกอบคลาส Tailwind ตอนรันไทม์** Tailwind สแกนแต่ข้อความในซอร์ส คลาสที่ต่อสตริงตอนรันไทม์คอมไพล์ออกมาเป็นศูนย์ ค่าที่เป็นตัวเลขรันไทม์ต้องส่งผ่าน `style` (`StatTile.tsx:255-258`)
- **ห้ามต่อคลาสที่คุมคุณสมบัติเดียวกันเข้าไปทับสตริงฐาน** ผู้ชนะตัดสินที่ลำดับใน CSS ที่ build ออกมา ไม่ใช่ลำดับในสตริง ให้สลับทั้งชุดด้วย ternary แทน (`Card.tsx:22-29`, `Button.tsx:53-59`, `StatTile.tsx:69-75`)
- **ห้ามใช้ `React.cloneElement` เพื่อยัด prop เข้า children** `StatTile.tsx:121-125` บันทึกไว้ว่าเป็นเหตุให้ type ผ่านแต่พังตอนรันไทม์
- **สีต้องมาจาก palette เท่านั้น** — `brand-*` / `accent-*` / `slate-*` / `red-*` / `amber-*` / `emerald-*` ที่ `index.css` ประกาศไว้ ห้าม `blue-*` `indigo-*` `purple-*` `gray-*`
- **เทสต์: ไม่มี jest-dom** assert บน DOM property ตรง ๆ (`el.getAttribute(...)`, `el.tagName`) ไม่ใช่ `toBeInTheDocument` / `toHaveAttribute` และ import `describe`/`it`/`expect` จาก `vitest` เสมอ (`vitest.config.ts` ตั้ง `globals: false`) ชื่อเทสต์เขียนภาษาไทยตามธรรมเนียมไฟล์เทสต์ที่มีอยู่
- **locale: คีย์ที่เพิ่มต้องเพิ่มทั้ง `en` และ `th`** ฝั่งไทย type ไว้กับฝั่งอังกฤษ คีย์ที่เติมข้างเดียวทำให้ `npm run typecheck` แดง
- คำสั่งตรวจ: `npm run typecheck` · `npm test` · `npm run build`

---

### Task 1: `Button` — เพิ่ม variant `dangerSolid`

`Button` ไม่มี variant ที่ใช้เป็นปุ่มยืนยันการทำลายได้ ตัวที่ชื่อ `danger` เป็นแบบเส้นขอบพื้นขาว ซึ่งถูกสำหรับปุ่มบนหัวเพจแต่จะเบากว่าปุ่มยกเลิกที่นั่งข้างกันในท้ายโมดัล

**Files:**
- Modify: `components/ui/Button.tsx:4-11` (type), `:41-76` (map)

**Interfaces:**
- Consumes: —
- Produces: `ButtonVariant` เพิ่มค่า `'dangerSolid'` ใช้ได้ผ่าน `<Button variant="dangerSolid">`

- [ ] **Step 1: เพิ่มค่าใน union**

ที่ `components/ui/Button.tsx` แก้ type ให้เป็น:

```ts
export type ButtonVariant =
    | 'primary'
    | 'secondary'
    | 'danger'
    | 'dangerSolid'
    | 'ghost'
    | 'inverse'
    | 'inverseGhost'
    | 'inverseDanger';
```

- [ ] **Step 2: เพิ่มคลาสใน `BUTTON_VARIANT`**

วางต่อจาก `danger` พร้อมคอมเมนต์อธิบายว่าทำไมมีสองตัว:

```ts
    // `danger` ข้างบนเป็นปุ่มอันตรายที่นั่งปนกับปุ่มอื่นบนหน้า -- เส้นขอบ พื้นขาว
    // ตัวหนังสือแดง อ่านว่า "ระวัง" โดยไม่ตะโกน ตัวนี้คนละหน้าที่: เป็นปุ่มหลักใน
    // ท้ายโมดัลยืนยัน ซึ่งมีปุ่มยกเลิก (secondary -- พื้นขาว เส้นขอบเทา) นั่งซ้ายมือ
    // อยู่แล้ว ถ้าใช้ `danger` ตรงนั้น ปุ่มทำลายจะมีน้ำหนักสายตาเท่าหรือน้อยกว่า
    // ปุ่มถอย ซึ่งกลับหัวลำดับความสำคัญของกล่อง
    //
    // ทรงยกมาจาก `primary` ทั้งชุด เปลี่ยนแค่ hue: ปุ่มยืนยันของทุกโมดัลจึงเป็น
    // วัตถุเดียวกันไม่ว่าจะทำลายหรือไม่ ต่างกันที่สีอย่างเดียว
    dangerSolid:
        'bg-red-600 text-white shadow-lg shadow-red-600/20 hover:bg-red-700 ' +
        'active:scale-[0.99] disabled:hover:bg-red-600',
```

- [ ] **Step 3: ตรวจว่า type ผ่าน**

Run: `npm run typecheck`
Expected: ไม่มี error (`BUTTON_VARIANT` เป็น `Record<ButtonVariant, string>` ถ้าลืมเติมคีย์จะแดงทันที)

- [ ] **Step 4: Commit**

```bash
git add components/ui/Button.tsx
git commit -m "feat(ui): เพิ่มปุ่ม variant dangerSolid สำหรับท้ายโมดัลยืนยัน"
```

---

### Task 2: `Modal` + `useDialog`

หัวใจของงานทั้งก้อน ทำให้เสร็จและมีเทสต์ก่อนแตะโมดัลตัวจริงตัวไหน

**Files:**
- Create: `components/ui/Modal.tsx`
- Create: `components/ui/Modal.test.tsx`
- Modify: `components/ui/Card.tsx` (สกัด `BrandHairline` ออกมาให้ใช้ร่วมกัน)
- Modify: `components/ui/index.ts` (export)

**Interfaces:**
- Consumes: `CARD_SURFACE` จาก `./Card`
- Produces:
  - `Modal: React.FC<ModalProps>` — props: `isOpen, onClose, title, subtitle?, icon?, tone?, size?, children, footer?, headerActions?, dismissOnBackdrop?, busy?, closeLabel, level?`
  - `type ModalSize = 'sm' | 'md' | 'lg' | 'xl'`
  - `type ModalTone = 'brand' | 'accent' | 'danger'`
  - `const MODAL_PANEL: string`
  - `BrandHairline: React.FC<{ busy?: boolean }>` จาก `./Card`

- [ ] **Step 1: สกัด `BrandHairline` ออกจาก `Card.tsx`**

`Card` วาดเส้นแบรนด์อยู่แล้ว และ `Modal` ต้องใช้เส้นเดียวกัน การคัดลอกมาร์กอัปไปวางซ้ำจะทำให้สองที่ดริฟต์ ส่วนการเรียก `<Card>` จาก `Modal` ก็ทำไม่ได้ เพราะ `Card` บังคับ `CARD_SHELL` ทั้งชุดมาด้วย (รวมเงาที่โมดัลต้องเปลี่ยน — ดู Global Constraints เรื่องการต่อคลาสทับ)

ใน `components/ui/Card.tsx` เพิ่ม export ใหม่ก่อน `export const Card`:

```tsx
// The brand hairline doubles as this app's only progress indicator: the
// gradient is laid out at twice the bar's width and slid leftwards while a
// request is in flight. One element, two jobs -- which is exactly why the
// sign-in and reset screens carry no separate spinner, and why the dashboard
// should not grow one either.
//
// Extracted from Card's body so Modal.tsx can wear the same line without also
// taking CARD_SHELL's shadow, which is tuned for a card sitting on a light page
// and disappears entirely over a dimmed overlay. Copying the markup into
// Modal.tsx instead would have let the two drift; appending a shadow class to
// CARD_SHELL would have hit the class-order trap documented above.
export const BrandHairline: React.FC<{ busy?: boolean }> = ({ busy = false }) => (
    <div
        className={
            'h-[3px] w-full shrink-0 bg-linear-to-r from-brand-600 via-accent-500 to-brand-600 ' +
            'bg-[length:200%_100%] ' +
            (busy ? 'animate-brand-sweep' : '')
        }
        aria-hidden="true"
    />
);
```

แล้วแทนบล็อกเดิมใน `Card` (บรรทัด 48-63 — `{accent && (<div className={...} aria-hidden="true" />)}`) ด้วย:

```tsx
        {accent && <BrandHairline busy={busy} />}
```

คอมเมนต์ยาวที่เคยอยู่ตรงนั้นย้ายไปอยู่กับ `BrandHairline` แล้ว ไม่ต้องเก็บซ้ำ

- [ ] **Step 2: เขียนเทสต์ที่ยังไม่ผ่าน**

สร้าง `components/ui/Modal.test.tsx`:

```tsx
import React, { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from './Modal';

const base = {
    title: 'หัวเรื่อง',
    closeLabel: 'ปิดหน้าต่าง',
    onClose: () => {},
};

describe('Modal', () => {
    it('ไม่เรนเดอร์อะไรเลยเมื่อ isOpen เป็น false', () => {
        render(<Modal {...base} isOpen={false}>เนื้อ</Modal>);
        expect(screen.queryByRole('dialog')).toBeNull();
    });

    // role/aria-modal ต้องอยู่บน panel ไม่ใช่ overlay: overlay ครอบทั้งจอ
    // การตั้งชื่อมันว่า dialog เท่ากับบอก screen reader ว่าทุกอย่างข้างหลังเป็น
    // ส่วนหนึ่งของ dialog -- และ Escape guard ของ SelectionBar มองหา selector นี้
    it('วาง role=dialog ไว้บน panel ที่มีหัวเรื่อง ไม่ใช่บน overlay ที่ครอบทั้งจอ', () => {
        render(<Modal {...base} isOpen>เนื้อ</Modal>);
        const dialog = screen.getByRole('dialog');
        expect(dialog.getAttribute('aria-modal')).toBe('true');
        // panel ต้องเป็นตัวที่ "มี" หัวเรื่องอยู่ข้างใน ไม่ใช่ตัวที่เป็นพื้นเต็มจอ
        expect(dialog.contains(screen.getByText('หัวเรื่อง'))).toBe(true);
        expect(dialog.className.includes('fixed')).toBe(false);
    });

    it('หัวเรื่องถูกผูกเป็นชื่อของ dialog ผ่าน aria-labelledby', () => {
        render(<Modal {...base} isOpen>เนื้อ</Modal>);
        const dialog = screen.getByRole('dialog');
        const labelId = dialog.getAttribute('aria-labelledby');
        expect(labelId).toBeTruthy();
        expect(document.getElementById(labelId as string)?.textContent).toBe('หัวเรื่อง');
    });

    it('Escape ปิดโมดัล', async () => {
        const onClose = vi.fn();
        const user = userEvent.setup();
        render(<Modal {...base} isOpen onClose={onClose}>เนื้อ</Modal>);
        await user.keyboard('{Escape}');
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    // อาการที่เทสต์นี้กัน: เปิดรูปหลักฐานใน PalletDetail แล้วกด Escape หนึ่งครั้ง
    // ปิดทั้งรูปและโมดัลข้างล่างพร้อมกัน
    it('Escape ปิดเฉพาะโมดัลที่อยู่ในสุด ไม่พาโมดัลข้างล่างไปด้วย', async () => {
        const onCloseOuter = vi.fn();
        const onCloseInner = vi.fn();
        const user = userEvent.setup();
        render(
            <>
                <Modal {...base} isOpen onClose={onCloseOuter} title="ชั้นนอก">เนื้อนอก</Modal>
                <Modal {...base} isOpen onClose={onCloseInner} title="ชั้นใน" level={2}>เนื้อใน</Modal>
            </>,
        );
        await user.keyboard('{Escape}');
        expect(onCloseInner).toHaveBeenCalledTimes(1);
        expect(onCloseOuter).not.toHaveBeenCalled();
    });

    it('คลิกพื้นหลังไม่ปิดโดยค่าเริ่มต้น', async () => {
        const onClose = vi.fn();
        const user = userEvent.setup();
        const { container } = render(<Modal {...base} isOpen onClose={onClose}>เนื้อ</Modal>);
        void container;
        const overlay = screen.getByTestId('modal-overlay');
        await user.click(overlay);
        expect(onClose).not.toHaveBeenCalled();
    });

    it('คลิกพื้นหลังปิดเมื่อส่ง dismissOnBackdrop', async () => {
        const onClose = vi.fn();
        const user = userEvent.setup();
        render(<Modal {...base} isOpen onClose={onClose} dismissOnBackdrop>เนื้อ</Modal>);
        await user.click(screen.getByTestId('modal-overlay'));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('คลิกในกล่องไม่ปิด แม้เปิด dismissOnBackdrop ไว้', async () => {
        const onClose = vi.fn();
        const user = userEvent.setup();
        render(
            <Modal {...base} isOpen onClose={onClose} dismissOnBackdrop>
                <p>เนื้อ</p>
            </Modal>,
        );
        await user.click(screen.getByText('เนื้อ'));
        expect(onClose).not.toHaveBeenCalled();
    });

    it('ล็อกสกรอลล์พื้นหลังตอนเปิด และคลายตอนปิด', () => {
        const root = document.documentElement;
        const { rerender } = render(<Modal {...base} isOpen>เนื้อ</Modal>);
        expect(root.style.overflow).toBe('hidden');
        rerender(<Modal {...base} isOpen={false}>เนื้อ</Modal>);
        expect(root.style.overflow).toBe('');
    });

    // ครึ่งที่พังได้จริง: โมดัลซ้อนปิดไปแล้วแต่ตัวข้างล่างยังเปิดอยู่
    // ถ้าคลายสกรอลล์ตอนนั้นหน้าจะเลื่อนได้ทั้งที่ยังมีโมดัลค้างอยู่
    it('คลายสกรอลล์เมื่อโมดัลชั้นสุดท้ายปิดเท่านั้น', () => {
        const root = document.documentElement;
        const { rerender } = render(
            <>
                <Modal {...base} isOpen title="ชั้นนอก">นอก</Modal>
                <Modal {...base} isOpen title="ชั้นใน" level={2}>ใน</Modal>
            </>,
        );
        expect(root.style.overflow).toBe('hidden');

        rerender(
            <>
                <Modal {...base} isOpen title="ชั้นนอก">นอก</Modal>
                <Modal {...base} isOpen={false} title="ชั้นใน" level={2}>ใน</Modal>
            </>,
        );
        expect(root.style.overflow).toBe('hidden');

        rerender(
            <>
                <Modal {...base} isOpen={false} title="ชั้นนอก">นอก</Modal>
                <Modal {...base} isOpen={false} title="ชั้นใน" level={2}>ใน</Modal>
            </>,
        );
        expect(root.style.overflow).toBe('');
    });

    it('คืนโฟกัสกลับที่ปุ่มที่เปิดโมดัลเมื่อปิด', async () => {
        const user = userEvent.setup();

        const Harness = () => {
            const [open, setOpen] = useState(false);
            return (
                <>
                    <button type="button" onClick={() => setOpen(true)}>เปิด</button>
                    <Modal {...base} isOpen={open} onClose={() => setOpen(false)}>
                        <p>เนื้อ</p>
                    </Modal>
                </>
            );
        };

        render(<Harness />);
        const opener = screen.getByRole('button', { name: 'เปิด' });
        await user.click(opener);
        expect(screen.getByRole('dialog')).toBeTruthy();

        await user.keyboard('{Escape}');
        expect(screen.queryByRole('dialog')).toBeNull();
        expect(document.activeElement).toBe(opener);
    });

    it('Tab วนอยู่ในกล่อง ไม่หลุดไปหาปุ่มที่อยู่ข้างหลังโมดัล', async () => {
        const user = userEvent.setup();
        render(
            <>
                <button type="button">ปุ่มข้างหลัง</button>
                <Modal {...base} isOpen>
                    <button type="button">ในกล่อง ก</button>
                    <button type="button">ในกล่อง ข</button>
                </Modal>
            </>,
        );

        // ปุ่ม ✕ บนหัวเป็นตัวแรกในกล่อง จึงเป็นตัวที่ได้โฟกัสตอนเปิด
        expect(document.activeElement).toBe(screen.getByRole('button', { name: 'ปิดหน้าต่าง' }));

        await user.tab();
        expect(document.activeElement).toBe(screen.getByRole('button', { name: 'ในกล่อง ก' }));
        await user.tab();
        expect(document.activeElement).toBe(screen.getByRole('button', { name: 'ในกล่อง ข' }));
        // ตัวสุดท้ายแล้ว Tab ต่อต้องวนกลับหัวกล่อง ไม่ใช่ออกไปหา "ปุ่มข้างหลัง"
        await user.tab();
        expect(document.activeElement).toBe(screen.getByRole('button', { name: 'ปิดหน้าต่าง' }));
    });

    it('ปุ่มปิดเรียก onClose และใช้ closeLabel เป็นชื่อ', async () => {
        const onClose = vi.fn();
        const user = userEvent.setup();
        render(<Modal {...base} isOpen onClose={onClose}>เนื้อ</Modal>);
        await user.click(screen.getByRole('button', { name: 'ปิดหน้าต่าง' }));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('เรนเดอร์ footer และ headerActions ที่ส่งมา', () => {
        render(
            <Modal
                {...base}
                isOpen
                headerActions={<button type="button">พิมพ์</button>}
                footer={<button type="button">ยืนยัน</button>}
            >
                เนื้อ
            </Modal>,
        );
        expect(screen.getByRole('button', { name: 'พิมพ์' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'ยืนยัน' })).toBeTruthy();
    });
});
```

- [ ] **Step 3: รันเทสต์ให้เห็นว่าไม่ผ่าน**

Run: `npm test -- components/ui/Modal.test.tsx`
Expected: FAIL — resolve `./Modal` ไม่ได้ (`Failed to resolve import "./Modal"`)

- [ ] **Step 4: เขียน `components/ui/Modal.tsx`**

```tsx
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
    /** วิ่งเส้นแบรนด์บนขอบบนขณะมีคำขอค้างอยู่ */
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
            event.preventDefault();
            onClose();
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [isOpen, id, onClose]);

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
    useDialog(isOpen, onClose, panelRef);

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
                            aria-label={closeLabel}
                            className={
                                'rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 ' +
                                'hover:text-slate-600 focus-visible:outline-2 ' +
                                'focus-visible:outline-offset-2 focus-visible:outline-brand-500'
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
```

- [ ] **Step 5: เพิ่ม export**

ที่ท้าย `components/ui/index.ts`:

```ts
export { Modal, MODAL_PANEL } from './Modal';
export type { ModalProps, ModalSize, ModalTone } from './Modal';
```

และแก้บรรทัด export ของ `Card` ให้พ่วง `BrandHairline`:

```ts
export { Card, CARD_SHELL, BrandHairline } from './Card';
```

- [ ] **Step 6: รันเทสต์ให้ผ่าน**

Run: `npm test -- components/ui/Modal.test.tsx`
Expected: PASS ทั้ง 13 เทสต์

- [ ] **Step 7: ตรวจว่าไม่ทำของเดิมพัง**

Run: `npm test && npm run typecheck`
Expected: PASS ทั้งหมด (`Card` ถูกแก้ เทสต์ที่พึ่งพา `Card`/`StatTile`/`Skeleton` ต้องยังผ่าน)

- [ ] **Step 8: Commit**

```bash
git add components/ui/Modal.tsx components/ui/Modal.test.tsx components/ui/Card.tsx components/ui/index.ts
git commit -m "feat(ui): เพิ่ม Modal primitive พร้อม Escape ตาม stack, focus trap และล็อกสกรอลล์"
```

---

### Task 3: `Field` + `TextInput` + `TextArea`

**Files:**
- Create: `components/ui/Field.tsx`
- Create: `components/ui/TextInput.tsx`
- Create: `components/ui/TextArea.tsx`
- Create: `components/ui/Field.test.tsx`
- Modify: `components/ui/index.ts`

**Interfaces:**
- Consumes: —
- Produces:
  - `Field: React.FC<FieldProps>` — `children` เป็น **ฟังก์ชัน** รับ `FieldControlProps` แล้วคืน node
  - `interface FieldControlProps { id: string; 'aria-describedby': string | undefined; 'aria-invalid': true | undefined; invalid: boolean }`
  - `TextInput: React.FC<TextInputProps>` — `React.InputHTMLAttributes<HTMLInputElement>` + `invalid?: boolean` + `mono?: boolean`
  - `TextArea: React.FC<TextAreaProps>` — `React.TextareaHTMLAttributes<HTMLTextAreaElement>` + `invalid?: boolean`

**หมายเหตุการออกแบบที่ต่างจาก spec ข้อ 6.1:** spec เขียนว่า `Field` "เดินสาย aria ให้ control ข้างในอัตโนมัติ" วิธีเดียวที่ทำแบบนั้นได้กับ `children` ที่เป็น node คือ `React.cloneElement` ซึ่ง Global Constraints ห้ามไว้ (`StatTile.tsx:121-125`) `children` จึงเป็นฟังก์ชันแทน — ผลลัพธ์เหมือนกันคือคนเรียกไม่ต้องประกอบ id เอง แต่ type ตรวจได้จริงและไม่มีการยัด prop เข้าไปใน node ที่ไม่รู้ว่าเป็นอะไร

- [ ] **Step 1: เขียนเทสต์ที่ยังไม่ผ่าน**

สร้าง `components/ui/Field.test.tsx`:

```tsx
import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Field } from './Field';
import { TextInput } from './TextInput';

describe('Field', () => {
    it('ผูกป้ายกับช่องจริง คลิกป้ายแล้วโฟกัสเข้าช่อง', async () => {
        const user = userEvent.setup();
        render(
            <Field label="รหัสพาเลท" htmlFor="pallet-id">
                {(aria) => <TextInput {...aria} defaultValue="" />}
            </Field>,
        );
        const input = screen.getByLabelText('รหัสพาเลท');
        expect(input.tagName).toBe('INPUT');
        await user.click(screen.getByText('รหัสพาเลท'));
        expect(document.activeElement).toBe(input);
    });

    it('ไม่ประกาศ aria-describedby เมื่อไม่มีคำอธิบายใด ๆ', () => {
        render(
            <Field label="รหัสพาเลท" htmlFor="pallet-id">
                {(aria) => <TextInput {...aria} />}
            </Field>,
        );
        expect(screen.getByLabelText('รหัสพาเลท').getAttribute('aria-describedby')).toBeNull();
    });

    it('ผูก hint เข้ากับช่องผ่าน aria-describedby', () => {
        render(
            <Field label="รหัสพาเลท" htmlFor="pallet-id" hint="เช่น P105">
                {(aria) => <TextInput {...aria} />}
            </Field>,
        );
        const input = screen.getByLabelText('รหัสพาเลท');
        const describedBy = input.getAttribute('aria-describedby');
        expect(describedBy).toBeTruthy();
        expect(document.getElementById(describedBy as string)?.textContent).toContain('เช่น P105');
    });

    it('error ทับ hint และตั้ง aria-invalid', () => {
        render(
            <Field label="รหัสพาเลท" htmlFor="pallet-id" hint="เช่น P105" error="รหัสนี้มีอยู่แล้ว">
                {(aria) => <TextInput {...aria} />}
            </Field>,
        );
        const input = screen.getByLabelText('รหัสพาเลท');
        expect(input.getAttribute('aria-invalid')).toBe('true');
        const describedBy = input.getAttribute('aria-describedby');
        const note = document.getElementById(describedBy as string);
        expect(note?.textContent).toContain('รหัสนี้มีอยู่แล้ว');
        expect(note?.textContent).not.toContain('เช่น P105');
    });

    it('error ประกาศตัวเป็น alert เพื่อให้ถูกอ่านทันทีที่โผล่', () => {
        render(
            <Field label="รหัสพาเลท" htmlFor="pallet-id" error="รหัสนี้มีอยู่แล้ว">
                {(aria) => <TextInput {...aria} />}
            </Field>,
        );
        expect(screen.getByRole('alert').textContent).toContain('รหัสนี้มีอยู่แล้ว');
    });

    it('warning แสดงเมื่อไม่มี error และไม่ตั้ง aria-invalid', () => {
        render(
            <Field label="รหัสพาเลท" htmlFor="pallet-id" warning="เปลี่ยนรหัสแล้วประวัติจะย้ายตาม">
                {(aria) => <TextInput {...aria} />}
            </Field>,
        );
        const input = screen.getByLabelText('รหัสพาเลท');
        expect(input.getAttribute('aria-invalid')).toBeNull();
        expect(screen.queryByRole('alert')).toBeNull();
        const describedBy = input.getAttribute('aria-describedby');
        expect(document.getElementById(describedBy as string)?.textContent).toContain(
            'เปลี่ยนรหัสแล้วประวัติจะย้ายตาม',
        );
    });

    it('required ทำให้ช่องประกาศ aria-required', () => {
        render(
            <Field label="ปลายทาง" htmlFor="dest" required>
                {(aria) => <TextInput {...aria} />}
            </Field>,
        );
        expect(screen.getByLabelText(/ปลายทาง/).getAttribute('aria-required')).toBe('true');
    });
});
```

- [ ] **Step 2: รันเทสต์ให้เห็นว่าไม่ผ่าน**

Run: `npm test -- components/ui/Field.test.tsx`
Expected: FAIL — resolve `./Field` ไม่ได้

- [ ] **Step 3: เขียน `components/ui/TextInput.tsx`**

```tsx
import React from 'react';

export interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    /** ทาสีสถานะผิดพลาด -- Field ส่งมาให้เองผ่าน FieldControlProps */
    invalid?: boolean;
    /** รหัสพาเลทเป็นสตริงที่คนอ่านทีละตัวอักษร ฟอนต์โมโนทำให้ 0 กับ O ต่างกัน */
    mono?: boolean;
}

// ทาสีชุดเดียวกับ SelectField.tsx:48-52 เป๊ะ ทั้งความสูงขั้นต่ำ รัศมี สีขอบ และ
// focus ring -- ช่องกรอกกับช่องเลือกที่นั่งอยู่ในฟอร์มเดียวกันต้องเป็นวัตถุเดียวกัน
//
// `min-h-10` ไม่ใช่ `h-10` ด้วยเหตุผลเดียวกับ Button.tsx:28-30
const BASE =
    'min-h-10 w-full rounded-xl border bg-white px-3 py-2 text-sm text-slate-900 transition ' +
    'placeholder:text-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50 ' +
    'focus-visible:outline-2 focus-visible:outline-offset-2';

// สลับทั้งชุด ไม่ใช่ต่อ `border-red-300` ทับสตริงที่มี `border-slate-200` อยู่แล้ว
// -- Card.tsx:22-29 บันทึกกับดักนี้ไว้ ทั้งสองตัวเป็น selector คลาสเดี่ยวเหมือนกัน
// ผู้ชนะจึงตัดสินที่ลำดับใน CSS ที่ build ออกมา
const SURFACE_IDLE = 'border-slate-200 focus-visible:outline-brand-500';
const SURFACE_INVALID = 'border-red-300 focus-visible:outline-red-500';

export const TextInput: React.FC<TextInputProps> = ({
    invalid = false,
    mono = false,
    className = '',
    ...rest
}) => (
    <input
        className={`${BASE} ${invalid ? SURFACE_INVALID : SURFACE_IDLE} ${
            mono ? 'font-mono uppercase' : ''
        } ${className}`}
        {...rest}
    />
);
```

- [ ] **Step 4: เขียน `components/ui/TextArea.tsx`**

```tsx
import React from 'react';

export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    invalid?: boolean;
}

// คลาสชุดเดียวกับ TextInput ยกเว้นความสูง ซึ่งมาจาก `rows` แทน `min-h`
// และ `resize-none` เพราะช่องที่ยืดได้ในกล่องที่ max-h-[90vh] อยู่แล้ว จะดันหัว
// กับท้ายกล่องจนเลย์เอาต์แตกได้
const BASE =
    'w-full rounded-xl border bg-white px-3 py-2 text-sm text-slate-900 transition resize-none ' +
    'placeholder:text-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50 ' +
    'focus-visible:outline-2 focus-visible:outline-offset-2';

const SURFACE_IDLE = 'border-slate-200 focus-visible:outline-brand-500';
const SURFACE_INVALID = 'border-red-300 focus-visible:outline-red-500';

export const TextArea: React.FC<TextAreaProps> = ({
    invalid = false,
    className = '',
    rows = 3,
    ...rest
}) => (
    <textarea
        rows={rows}
        className={`${BASE} ${invalid ? SURFACE_INVALID : SURFACE_IDLE} ${className}`}
        {...rest}
    />
);
```

- [ ] **Step 5: เขียน `components/ui/Field.tsx`**

```tsx
import React from 'react';
import { AlertTriangle } from 'lucide-react';

/** สิ่งที่ Field ส่งให้ control ข้างใน กระจายด้วย {...aria} ได้ทั้งก้อน */
export interface FieldControlProps {
    id: string;
    'aria-describedby': string | undefined;
    'aria-invalid': true | undefined;
    'aria-required': true | undefined;
    /** ให้ TextInput/TextArea ทาสีสถานะผิดพลาด */
    invalid: boolean;
}

export interface FieldProps {
    /** ป้ายที่มองเห็น -- ไม่ optional ช่องในฟอร์มต้องมีป้ายเสมอ */
    label: string;
    /** id ของ control ข้างใน Field เดินสาย aria ทั้งหมดจากค่านี้ */
    htmlFor: string;
    required?: boolean;
    hint?: React.ReactNode;
    /** คำเตือน -- ไม่ใช่ความผิดพลาด ช่องยังใช้ได้ */
    warning?: React.ReactNode;
    /** ข้อความผิดพลาด ทับ warning และ hint */
    error?: string;
    children: (control: FieldControlProps) => React.ReactNode;
}

// `children` เป็นฟังก์ชัน ไม่ใช่ node ที่ Field เอาไปยัด prop ใส่
//
// การ "เดินสาย aria ให้อัตโนมัติ" กับ node ต้องทำผ่าน React.cloneElement ซึ่ง
// StatTile.tsx:121-125 บันทึกไว้แล้วว่าเป็นเหตุให้ type ผ่านแต่พังตอนรันไทม์:
// มันแคสต์ ReactNode เป็น ReactElement<any> แล้วยัด prop ลงไป อะไรก็ตามที่ไม่ใช่
// element ที่รับ prop เหล่านั้นจึงพังตอนเรนเดอร์แทนที่จะพังตอนคอมไพล์
//
// ฟังก์ชันให้ผลลัพธ์เดียวกัน (คนเรียกไม่ต้องประกอบ id เอง) โดยที่ TypeScript
// ตรวจได้จริงว่า control รับ prop ครบ
export const Field: React.FC<FieldProps> = ({
    label,
    htmlFor,
    required = false,
    hint,
    warning,
    error,
    children,
}) => {
    const noteId = `${htmlFor}-note`;

    // แสดงทีละอย่าง ไม่ซ้อนกัน: ถ้า error กองต่อท้าย hint กล่องจะสูงขึ้นตอนเกิด
    // error แล้วปุ่มท้ายโมดัลขยับหนีนิ้วที่กำลังจะกดซ้ำ
    const note = error ?? warning ?? hint ?? null;
    const isError = error != null;
    const isWarning = !isError && warning != null;

    return (
        <div className="space-y-1.5">
            <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700">
                {label}
                {required && (
                    // aria-hidden เพราะ aria-required บน control พูดเรื่องเดียวกัน
                    // อยู่แล้ว ดอกจันนี้เป็นของสำหรับตาเท่านั้น
                    <span className="ml-0.5 text-red-500" aria-hidden="true">
                        *
                    </span>
                )}
            </label>

            {children({
                id: htmlFor,
                // undefined ไม่ใช่สตริงว่าง -- React ตัด attribute ทิ้งเมื่อเป็น
                // undefined ส่วนสตริงว่างจะกลายเป็น aria-describedby="" ที่ชี้ไปยัง
                // element ที่ไม่มีอยู่
                'aria-describedby': note ? noteId : undefined,
                'aria-invalid': isError ? true : undefined,
                'aria-required': required ? true : undefined,
                invalid: isError,
            })}

            {note && (
                <p
                    id={noteId}
                    // ประกาศเฉพาะตอนเป็นความผิดพลาด: hint อยู่ตรงนั้นตั้งแต่แรกและ
                    // ถูกอ่านตอนโฟกัสเข้าช่องผ่าน aria-describedby อยู่แล้ว
                    // การทำให้มันเป็น alert ด้วยจะให้ screen reader อ่านซ้ำสองรอบ
                    role={isError ? 'alert' : undefined}
                    className={`flex items-start gap-1.5 text-xs leading-relaxed ${
                        isError ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-slate-500'
                    }`}
                >
                    {(isError || isWarning) && (
                        <AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
                    )}
                    <span>{note}</span>
                </p>
            )}
        </div>
    );
};
```

- [ ] **Step 6: เพิ่ม export**

ที่ท้าย `components/ui/index.ts`:

```ts
export { Field } from './Field';
export type { FieldProps, FieldControlProps } from './Field';

export { TextInput } from './TextInput';
export type { TextInputProps } from './TextInput';

export { TextArea } from './TextArea';
export type { TextAreaProps } from './TextArea';
```

- [ ] **Step 7: รันเทสต์ให้ผ่าน**

Run: `npm test -- components/ui/Field.test.tsx && npm run typecheck`
Expected: PASS ทั้ง 7 เทสต์ และ typecheck สะอาด

- [ ] **Step 8: Commit**

```bash
git add components/ui/Field.tsx components/ui/TextInput.tsx components/ui/TextArea.tsx components/ui/Field.test.tsx components/ui/index.ts
git commit -m "feat(ui): เพิ่ม Field/TextInput/TextArea สำหรับฟอร์มในโมดัล"
```

---

### Task 4: `ConfirmDialog`

**Files:**
- Create: `components/ui/ConfirmDialog.tsx`
- Create: `components/ui/ConfirmDialog.test.tsx`
- Modify: `components/ui/index.ts`

**Interfaces:**
- Consumes: `Modal` (Task 2), `Button` variant `dangerSolid` (Task 1)
- Produces: `ConfirmDialog: React.FC<ConfirmDialogProps>` — `isOpen, title, message, confirmLabel, cancelLabel, closeLabel, workingLabel, isDestructive?, onConfirm, onCancel`

- [ ] **Step 1: เขียนเทสต์ที่ยังไม่ผ่าน**

สร้าง `components/ui/ConfirmDialog.test.tsx`:

```tsx
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from './ConfirmDialog';

const base = {
    title: 'ลบพาเลท',
    message: 'ประวัติทั้งหมดจะหายถาวร',
    confirmLabel: 'ลบ',
    cancelLabel: 'ยกเลิก',
    closeLabel: 'ปิดหน้าต่าง',
    workingLabel: 'กำลังทำงาน...',
    onConfirm: () => {},
    onCancel: () => {},
};

describe('ConfirmDialog', () => {
    it('แสดงหัวเรื่องกับข้อความ และปุ่มทั้งสอง', () => {
        render(<ConfirmDialog {...base} isOpen />);
        expect(screen.getByRole('heading', { name: 'ลบพาเลท' })).toBeTruthy();
        expect(screen.getByText('ประวัติทั้งหมดจะหายถาวร')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'ลบ' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'ยกเลิก' })).toBeTruthy();
    });

    it('กดยกเลิกเรียก onCancel', async () => {
        const onCancel = vi.fn();
        const user = userEvent.setup();
        render(<ConfirmDialog {...base} isOpen onCancel={onCancel} />);
        await user.click(screen.getByRole('button', { name: 'ยกเลิก' }));
        expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('ยืนยันสำเร็จแล้วปิดกล่องเอง', async () => {
        const onConfirm = vi.fn().mockResolvedValue(undefined);
        const onCancel = vi.fn();
        const user = userEvent.setup();
        render(<ConfirmDialog {...base} isOpen onConfirm={onConfirm} onCancel={onCancel} />);
        await user.click(screen.getByRole('button', { name: 'ลบ' }));
        expect(onConfirm).toHaveBeenCalledTimes(1);
        expect(onCancel).toHaveBeenCalledTimes(1);
    });

    // อาการที่เทสต์นี้กัน: scrapPallet() ปฏิเสธพาเลทที่ไม่ได้เสียหาย หรือ RLS
    // ปฏิเสธคำขอ -- ของเดิมใน common/ConfirmationModal ไม่ดัก rejection เลย
    // กล่องจึงค้างอยู่เฉย ๆ โดยปุ่มดูเหมือนตาย
    it('ยืนยันแล้วพังต้องไม่ปิดกล่อง และคืนปุ่มให้กดใหม่ได้', async () => {
        const onConfirm = vi.fn().mockRejectedValue(new Error('RLS'));
        const onCancel = vi.fn();
        const onError = vi.fn();
        const user = userEvent.setup();
        render(
            <ConfirmDialog
                {...base}
                isOpen
                onConfirm={onConfirm}
                onCancel={onCancel}
                onError={onError}
            />,
        );
        await user.click(screen.getByRole('button', { name: 'ลบ' }));
        expect(onError).toHaveBeenCalledTimes(1);
        expect(onCancel).not.toHaveBeenCalled();
        expect((screen.getByRole('button', { name: 'ลบ' }) as HTMLButtonElement).disabled).toBe(
            false,
        );
    });

    it('Escape ปิดกล่องผ่าน onCancel', async () => {
        const onCancel = vi.fn();
        const user = userEvent.setup();
        render(<ConfirmDialog {...base} isOpen onCancel={onCancel} />);
        await user.keyboard('{Escape}');
        expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('คลิกพื้นหลังไม่ปิด -- กล่องยืนยันต้องถูกตอบ ไม่ใช่ถูกปัดทิ้ง', async () => {
        const onCancel = vi.fn();
        const user = userEvent.setup();
        render(<ConfirmDialog {...base} isOpen onCancel={onCancel} />);
        await user.click(screen.getByTestId('modal-overlay'));
        expect(onCancel).not.toHaveBeenCalled();
    });
});
```

- [ ] **Step 2: รันเทสต์ให้เห็นว่าไม่ผ่าน**

Run: `npm test -- components/ui/ConfirmDialog.test.tsx`
Expected: FAIL — resolve `./ConfirmDialog` ไม่ได้

- [ ] **Step 3: เขียน `components/ui/ConfirmDialog.tsx`**

```tsx
import React, { useState } from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from './Button';
import { Modal } from './Modal';

export interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    confirmLabel: string;
    cancelLabel: string;
    closeLabel: string;
    /** ป้ายปุ่มยืนยันขณะคำขอยังไม่กลับ */
    workingLabel: string;
    isDestructive?: boolean;
    onConfirm: () => void | Promise<void>;
    onCancel: () => void;
    /** เรียกเมื่อ onConfirm ปฏิเสธ -- ผู้เรียกเป็นคนตัดสินใจว่าจะแสดงยังไง
     *  (ไฟล์ในโฟลเดอร์นี้ import dictionary ไม่ได้ จึง toast เองไม่ได้) */
    onError?: (error: unknown) => void;
}

// preset ตัวเดียวที่สร้างทับ Modal เพราะกล่องยืนยันเป็นของ config-shaped จริง ๆ
// (หัวเรื่อง ข้อความ ปุ่มสองปุ่ม จบ) และของเดิมซ้ำอยู่สองไฟล์ที่เกือบเหมือนกันเป๊ะ
// โมดัลอื่นทุกตัวยังเขียนเนื้อเองผ่าน Modal โดยตรง -- เหตุผลเดียวกับที่ DataTable
// ไม่รับ columns[]+rows[] (components/ui/index.ts:67-71)
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    isOpen,
    title,
    message,
    confirmLabel,
    cancelLabel,
    closeLabel,
    workingLabel,
    isDestructive = false,
    onConfirm,
    onCancel,
    onError,
}) => {
    const [isWorking, setIsWorking] = useState(false);

    // onConfirm ปฏิเสธได้จริง: scrapPallet() ปฏิเสธพาเลทที่ไม่ได้เสียหาย และทุกตัว
    // พังได้จาก RLS หรือเน็ต ถ้าไม่ดัก rejection จะหลุดเป็น unhandled แล้วกล่องนั่ง
    // ค้างอยู่เฉย ๆ โดยไม่มีข้อความ -- ดูเหมือนปุ่มตาย
    const handleConfirm = async () => {
        setIsWorking(true);
        try {
            await onConfirm();
            onCancel();
        } catch (error) {
            onError?.(error);
        } finally {
            setIsWorking(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onCancel}
            title={title}
            icon={isDestructive ? AlertTriangle : CheckCircle}
            tone={isDestructive ? 'danger' : 'brand'}
            size="sm"
            closeLabel={closeLabel}
            busy={isWorking}
            // ไม่ใส่ dismissOnBackdrop โดยตั้งใจ: กล่องนี้ถามคำถามที่ต้องถูกตอบ
            // การปัดทิ้งด้วยการคลิกพลาดข้าง ๆ ทำให้ไม่รู้ว่าตกลงเกิดอะไรขึ้นหรือเปล่า
            footer={
                <>
                    <Button variant="secondary" onClick={onCancel} disabled={isWorking}>
                        {cancelLabel}
                    </Button>
                    <Button
                        variant={isDestructive ? 'dangerSolid' : 'primary'}
                        onClick={handleConfirm}
                        disabled={isWorking}
                    >
                        {isWorking ? workingLabel : confirmLabel}
                    </Button>
                </>
            }
        >
            <p className="text-sm leading-relaxed text-slate-600">{message}</p>
        </Modal>
    );
};
```

- [ ] **Step 4: เพิ่ม export**

ที่ท้าย `components/ui/index.ts`:

```ts
export { ConfirmDialog } from './ConfirmDialog';
export type { ConfirmDialogProps } from './ConfirmDialog';
```

- [ ] **Step 5: รันเทสต์ให้ผ่าน**

Run: `npm test -- components/ui/ConfirmDialog.test.tsx && npm run typecheck`
Expected: PASS ทั้ง 6 เทสต์

- [ ] **Step 6: Commit**

```bash
git add components/ui/ConfirmDialog.tsx components/ui/ConfirmDialog.test.tsx components/ui/index.ts
git commit -m "feat(ui): เพิ่ม ConfirmDialog ที่ดัก rejection และกันกล่องไว้เมื่อยืนยันไม่สำเร็จ"
```

---

### Task 5: คีย์คำแปลใหม่

**Files:**
- Modify: `locales/en.ts` (บล็อก `common` ราวบรรทัด 39)
- Modify: `locales/th.ts` (บล็อก `common` ราวบรรทัด 35)
- Modify: `locales/admin/inventory.ts` (`inventoryEn` และ `inventoryTh`)

**Interfaces:**
- Consumes: —
- Produces: `t.common.closeDialog`, `t.inventory.invalidDateTime`

- [ ] **Step 1: เพิ่ม `closeDialog` ฝั่งอังกฤษ**

ใน `locales/en.ts` บล็อก `common` ต่อจากบรรทัด `close: 'Close',`:

```ts
        // แยกจาก `close` ข้างบน: อันนั้นเป็นป้ายบนปุ่มที่คนเห็น ส่วนอันนี้เป็น
        // aria-label ของกากบาทมุมโมดัล ซึ่งไม่มีข้อความให้อ่าน "Close" เฉย ๆ
        // ในบริบทนั้นกำกวมว่าปิดอะไร
        closeDialog: 'Close dialog',
```

- [ ] **Step 2: เพิ่ม `closeDialog` ฝั่งไทย**

ใน `locales/th.ts` บล็อก `common` ต่อจากบรรทัด `close: 'ปิด',`:

```ts
        closeDialog: 'ปิดหน้าต่าง',
```

- [ ] **Step 3: เพิ่ม `invalidDateTime` ทั้งสองฝั่ง**

ใน `locales/admin/inventory.ts` เพิ่มใน `inventoryEn` ใกล้คีย์ของโมดัลรวมรายการ:

```ts
    invalidDateTime: 'Enter a valid date and time',
```

และใน `inventoryTh` ที่ตำแหน่งเดียวกัน:

```ts
    invalidDateTime: 'กรุณาระบุวันที่และเวลาให้ถูกต้อง',
```

- [ ] **Step 4: ตรวจว่าสองภาษาตรงกัน**

Run: `npm run typecheck`
Expected: ไม่มี error — `inventoryTh` type ไว้กับ `inventoryEn` ถ้าเติมข้างเดียวจะแดงทันที

- [ ] **Step 5: Commit**

```bash
git add locales/en.ts locales/th.ts locales/admin/inventory.ts
git commit -m "feat(i18n): เพิ่ม common.closeDialog และ inventory.invalidDateTime"
```

---

### Task 6: `common/ConfirmationModal` → wrapper บน `ConfirmDialog`

ต่อสาย `ConfirmDialog` กับ call site จริงสองที่ (หน้าตั้งค่า หน้ารายการ) โดยไม่แตะ call site เลย — พิสูจน์ API ก่อนแตะโมดัลที่ต้องเขียนใหม่ทั้งไฟล์

**Files:**
- Modify: `components/admin/common/ConfirmationModal.tsx` (แทนทั้งไฟล์)

**Interfaces:**
- Consumes: `ConfirmDialog` (Task 4), `t.common.closeDialog` (Task 5)
- Produces: `ConfirmationModal` คง prop เดิมครบ — `isOpen, title, message, confirmLabel, isDestructive?, onConfirm, onCancel`

- [ ] **Step 1: แทนเนื้อไฟล์ทั้งหมด**

`components/admin/common/ConfirmationModal.tsx`:

```tsx
import React from 'react';
import { ConfirmDialog } from '../../ui';
import { toast } from '../../../services/toast';
import { describeAppError } from '../../../services/appError';
import { useT } from '../../../hooks/useT';

interface ConfirmationModalProps {
    isOpen: boolean;
    /** Already translated by the caller -- these are specific to each action. */
    title: string;
    message: string;
    confirmLabel: string;
    isDestructive?: boolean;
    onConfirm: () => void | Promise<void>;
    onCancel: () => void;
}

// เหลือเป็น wrapper บาง ๆ บน ui/ConfirmDialog
//
// ไฟล์นี้ไม่ถูกลบทั้งที่เนื้อในย้ายออกไปหมดแล้ว เพราะมันทำสองอย่างที่ ConfirmDialog
// ทำเองไม่ได้: เติมข้อความที่ผู้เรียกเดิมไม่เคยต้องส่ง (ยกเลิก / ปิดหน้าต่าง /
// กำลังทำงาน) จากดิกชันนารี และเลือกช่องทางแสดง error -- ทั้งสองอย่างเป็นสิ่งที่
// components/ui/index.ts:1-7 ห้ามไฟล์ในโฟลเดอร์ ui ทำ ผลคือ SettingsView.tsx และ
// TransactionView.tsx ไม่ต้องแก้อะไรเลยแม้แต่บรรทัดเดียว
//
// สิ่งที่สอง call site ได้เพิ่มมาโดยไม่ต้องขอ: ปุ่มยืนยันขึ้นสถานะกำลังทำงานและกล่อง
// ไม่ปิดเมื่อคำขอถูกปฏิเสธ ของเดิมที่นี่ `await onConfirm()` เปล่า ๆ โดยไม่ดักอะไร
// (บรรทัด 49-51 ของไฟล์เดิม) rejection จึงหลุดเป็น unhandled และกล่องนั่งค้าง
export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    title,
    message,
    confirmLabel,
    isDestructive = false,
    onConfirm,
    onCancel,
}) => {
    const t = useT();

    return (
        <ConfirmDialog
            isOpen={isOpen}
            title={title}
            message={message}
            confirmLabel={confirmLabel}
            cancelLabel={t.common.cancel}
            closeLabel={t.common.closeDialog}
            workingLabel={t.common.loading}
            isDestructive={isDestructive}
            onConfirm={onConfirm}
            onCancel={onCancel}
            onError={(error) => toast.error(describeAppError(error))}
        />
    );
};
```

- [ ] **Step 2: ตรวจว่า call site ทั้งสองยังคอมไพล์ผ่านโดยไม่ต้องแก้**

Run: `npm run typecheck`
Expected: ไม่มี error และ **ไม่มีการแก้** `components/admin/settings/SettingsView.tsx` หรือ `components/admin/transactions/TransactionView.tsx` เลย — ถ้าต้องแก้แปลว่า wrapper เปลี่ยน API ซึ่งผิดเจตนา

- [ ] **Step 3: ตรวจด้วยตา**

Run: `npm run dev`

ไปหน้าตั้งค่าและหน้ารายการ กดปุ่มที่เปิดกล่องยืนยัน ตรวจว่า:
- กล่องเป็นทรงใหม่ (มุมมน `rounded-3xl` เส้นแบรนด์บนขอบบน ชิปไอคอน)
- Escape ปิดได้
- คลิกพื้นหลังไม่ปิด
- กดยืนยันแล้วปุ่มขึ้นสถานะกำลังทำงาน

- [ ] **Step 4: Commit**

```bash
git add components/admin/common/ConfirmationModal.tsx
git commit -m "refactor(admin): ยุบ ConfirmationModal ให้เป็น wrapper บน ui/ConfirmDialog"
```

---

### Task 7: `useInventoryActions` — โยน error ต่อแทนกลืน

แยกเป็นทาสก์ของตัวเองเพราะเป็นการเปลี่ยนสัญญาของ hook ที่โมดัลใน Task 8 พึ่งพา และรีวิวเวอร์ควรตัดสินมันแยกจากงานหน้าตา

**Files:**
- Modify: `hooks/inventory/useInventoryActions.ts:200-204`

**Interfaces:**
- Consumes: —
- Produces: `handleSavePalletEdit(currentId, originalPallet, updates)` **โยน `Error` ที่มี `message` เป็นข้อความพร้อมแสดง** เมื่อบันทึกไม่สำเร็จ (เดิม resolve เสมอ)

- [ ] **Step 1: แก้บล็อก catch**

ที่ `hooks/inventory/useInventoryActions.ts` แทน catch เดิม:

```ts
        } catch (error: any) {
            console.error(error);
            const msg = error.code === '23505' ? dict().inventory.idExists : dict().inventory.updateFailed;
            toast.error(msg);
        }
```

ด้วย:

```ts
        } catch (error: any) {
            console.error(error);
            // โยนต่อ ไม่ toast เอง
            //
            // ของเดิมดักแล้ว toast แล้วจบ ฟังก์ชันนี้จึง resolve เสมอไม่ว่าจะสำเร็จ
            // หรือไม่ ส่วน EditPalletModal เรียก `await onSave(...)` แล้ว `onClose()`
            // ในบรรทัดถัดไป ผลคือรหัสซ้ำ (23505) ทำให้โมดัลปิด ข้อความที่พิมพ์ไป
            // หายหมด เหลือ toast สีแดงใบเดียวลอยอยู่ -- ไม่มีทางกลับไปแก้ค่าเดิม
            //
            // ข้อความยังแปลที่นี่เหมือนเดิม เพราะที่นี่คือที่เดียวที่รู้จักรหัส error
            // ของ Postgres ฝั่งโมดัลรับไปแสดงใต้ช่องที่ผิดจริง ๆ แทนที่จะเด้งอยู่บนสุด
            // ของจอขณะที่สายตาอยู่ที่ช่องกรอก
            const msg = error.code === '23505' ? dict().inventory.idExists : dict().inventory.updateFailed;
            throw new Error(msg);
        }
```

- [ ] **Step 2: ตรวจว่ามี call site เดียวและมันดักอยู่**

Run: `npm run typecheck`

แล้วยืนยันด้วยตาว่า `handleSavePalletEdit` ถูกเรียกที่เดียวคือ `components/admin/inventory/InventoryView.tsx` (prop `onSave` ของ `EditPalletModal`) — Task 8 เป็นตัวทำให้ฝั่งรับดัก error ตัวนี้ ระหว่างสองทาสก์นี้ error จะหลุดเป็น unhandled rejection ชั่วคราว ซึ่งเป็นเหตุผลที่ทั้งสองต้องเข้า main ติดกัน

Expected: typecheck ผ่าน

- [ ] **Step 3: Commit**

```bash
git add hooks/inventory/useInventoryActions.ts
git commit -m "fix(inventory): ให้ handleSavePalletEdit โยน error ต่อ แทนที่จะกลืนแล้วปล่อยให้โมดัลปิด"
```

---

### Task 8: `InventoryModals` — AddPallet + EditPallet เขียนใหม่ และลบ `ConfirmModal`

**Files:**
- Modify: `components/admin/inventory/InventoryModals.tsx` (แทนทั้งไฟล์)
- Modify: `components/admin/inventory/InventoryView.tsx:11` (import) และ `:225-228` (จุดเรนเดอร์)
- Modify: `hooks/inventory/useInventoryActions.ts` (ย้าย `ConfirmActionType` เข้ามา)

**Interfaces:**
- Consumes: `Modal`, `ConfirmDialog`, `Field`, `TextInput`, `TextArea`, `SelectField`, `Button` · `handleSavePalletEdit` ที่โยน error (Task 7)
- Produces:
  - `AddPalletModal: React.FC<{ isOpen, onClose, onSuccess, departments }>`
  - `EditPalletModal: React.FC<{ isOpen, pallet, onClose, onSave }>`
  - `ConfirmActionType` ย้ายไป export จาก `hooks/inventory/useInventoryActions.ts`
  - `ConfirmModal` **หายไป** — ผู้เรียกใช้ `ConfirmDialog` ตรง ๆ

- [ ] **Step 1: ย้าย `ConfirmActionType` ไปอยู่กับที่ที่สร้างมันขึ้นมา**

ใน `hooks/inventory/useInventoryActions.ts` เพิ่ม export นี้ใกล้ ๆ ต้นไฟล์:

```ts
// ย้ายมาจาก InventoryModals.tsx ตอนที่ ConfirmModal ที่นั่นถูกยุบเข้า
// ui/ConfirmDialog -- type นี้อธิบายสิ่งที่ hook นี้ "สร้างขึ้น" ไม่ใช่สิ่งที่
// คอมโพเนนต์ตัวใดตัวหนึ่งรับ จึงควรอยู่ที่ต้นทางของมัน
export type ConfirmActionType = {
    title: string;
    message: string;
    confirmLabel: string;
    isDestructive?: boolean;
    onConfirm: () => Promise<void>;
};
```

ถ้าไฟล์นี้ประกาศ type รูปนี้ไว้เองอยู่แล้วแบบไม่ export ให้ใช้ตัวที่มีอยู่และเติม `export` แทนการประกาศซ้ำ

- [ ] **Step 2: แทน `components/admin/inventory/InventoryModals.tsx` ทั้งไฟล์**

```tsx
import React, { useEffect, useId, useState } from 'react';
import { MapPin, PackagePlus, Save, SquarePen } from 'lucide-react';
import { createPallet } from '../../../services/palletService';
import { toast } from '../../../services/toast';
import { useT } from '../../../hooks/useT';

import { Department } from '../../../types';
import { describeAppError } from '../../../services/appError';
import { Button, Field, Modal, SelectField, TextArea, TextInput } from '../../ui';

interface AddPalletModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    departments: Department[];
}

export const AddPalletModal: React.FC<AddPalletModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    departments,
}) => {
    const t = useT();
    // useId ให้ id ที่ไม่ชนกันแม้จะเปิดสองโมดัลพร้อมกัน -- Field ใช้ค่านี้เดินสาย
    // label/aria ทั้งชุด
    const fieldId = useId();
    const [newId, setNewId] = useState('');
    const [newLocation, setNewLocation] = useState('Warehouse');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [idError, setIdError] = useState<string | null>(null);

    const close = () => {
        setIdError(null);
        onClose();
    };

    const handleAddPallet = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setIdError(null);
        try {
            await createPallet(newId, newLocation);
            toast.success(t.inventory.palletCreated(newId));
            setNewId('');
            setNewLocation('Warehouse');
            onSuccess();
            close();
        } catch (error: any) {
            // ใต้ช่อง ไม่ใช่ toast: รหัสซ้ำเป็นความผิดพลาดของช่องใดช่องหนึ่งเสมอ
            // toast เด้งอยู่บนสุดของจอขณะที่สายตาอยู่ที่ช่องกรอก แล้วหายเองใน
            // ไม่กี่วินาทีทั้งที่ช่องยังผิดอยู่
            setIdError(describeAppError(error));
        } finally {
            setIsSubmitting(false);
        }
    };

    const locationOptions = [
        { value: 'Warehouse', label: 'Warehouse' },
        // ชื่อแผนกเป็นข้อมูลที่ผู้ใช้พิมพ์เองในหน้าสถานที่ ไม่ใช่ข้อความ UI
        // จึงแสดงตามที่บันทึกไว้ ไม่แปล -- เหมือนที่ InventoryFilters ทำ
        ...departments.filter((d) => d.name !== 'Warehouse').map((d) => ({ value: d.name, label: d.name })),
    ];

    return (
        <Modal
            isOpen={isOpen}
            onClose={close}
            title={t.inventory.addPalletTitle}
            icon={PackagePlus}
            size="md"
            busy={isSubmitting}
            closeLabel={t.common.closeDialog}
            footer={
                <>
                    <Button variant="secondary" onClick={close} disabled={isSubmitting}>
                        {t.common.cancel}
                    </Button>
                    {/* form="…" ผูกปุ่มที่อยู่นอก <form> (มันอยู่ในท้ายกล่องซึ่งเป็น
                        พี่น้องของเนื้อ) เข้ากับฟอร์ม เพื่อให้ Enter ในช่องกรอกยัง
                        ส่งฟอร์มได้ตามปกติ */}
                    <Button
                        type="submit"
                        form={`${fieldId}-form`}
                        variant="primary"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? t.inventory.creating : t.inventory.createPallet}
                    </Button>
                </>
            }
        >
            <form id={`${fieldId}-form`} onSubmit={handleAddPallet} className="space-y-4">
                <Field
                    label={t.common.palletId}
                    htmlFor={`${fieldId}-id`}
                    required
                    hint={t.inventory.palletIdHint}
                    error={idError ?? undefined}
                >
                    {(aria) => (
                        <TextInput
                            {...aria}
                            mono
                            required
                            autoFocus
                            value={newId}
                            onChange={(e) => {
                                setNewId(e.target.value.toUpperCase());
                                setIdError(null);
                            }}
                        />
                    )}
                </Field>

                <Field label={t.inventory.initialLocation} htmlFor={`${fieldId}-location`}>
                    {(aria) => (
                        <SelectField
                            id={aria.id}
                            icon={MapPin}
                            ariaLabel={t.inventory.initialLocation}
                            value={newLocation}
                            onChange={setNewLocation}
                            options={locationOptions}
                        />
                    )}
                </Field>
            </form>
        </Modal>
    );
};

interface EditPalletModalProps {
    isOpen: boolean;
    pallet: { id: string; remark: string };
    onClose: () => void;
    onSave: (id: string, updates: { pallet_id: string; pallet_remark: string }) => Promise<void>;
}

export const EditPalletModal: React.FC<EditPalletModalProps> = ({
    isOpen,
    pallet,
    onClose,
    onSave,
}) => {
    const t = useT();
    const fieldId = useId();
    const [id, setId] = useState(pallet.id);
    const [remark, setRemark] = useState(pallet.remark);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setId(pallet.id);
            setRemark(pallet.remark);
            setSaveError(null);
        }
    }, [isOpen, pallet]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSaveError(null);
        try {
            await onSave(pallet.id, { pallet_id: id, pallet_remark: remark });
            onClose();
        } catch (error: any) {
            // ไม่ปิดกล่อง
            //
            // ของเดิม onSave กลืน error ไว้เองแล้ว resolve เสมอ บรรทัด onClose()
            // ข้างบนจึงวิ่งทุกครั้งแม้บันทึกไม่สำเร็จ -- รหัสซ้ำหนึ่งครั้งเท่ากับ
            // ข้อความที่พิมพ์มาทั้งหมดหายไป useInventoryActions โยน error ที่มี
            // ข้อความพร้อมแสดงมาให้แล้ว (ดู catch ในไฟล์นั้น)
            setSaveError(error?.message ?? describeAppError(error));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t.inventory.editTitle}
            icon={SquarePen}
            size="md"
            busy={isSubmitting}
            closeLabel={t.common.closeDialog}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
                        {t.common.cancel}
                    </Button>
                    <Button
                        type="submit"
                        form={`${fieldId}-form`}
                        variant="primary"
                        icon={Save}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? t.common.saving : t.inventory.saveChanges}
                    </Button>
                </>
            }
        >
            <form id={`${fieldId}-form`} onSubmit={handleSubmit} className="space-y-4">
                <Field
                    label={t.common.palletId}
                    htmlFor={`${fieldId}-id`}
                    required
                    warning={t.inventory.idChangeWarning}
                    error={saveError ?? undefined}
                >
                    {(aria) => (
                        <TextInput
                            {...aria}
                            mono
                            required
                            value={id}
                            onChange={(e) => {
                                setId(e.target.value.toUpperCase());
                                setSaveError(null);
                            }}
                        />
                    )}
                </Field>

                <Field label={t.common.remark} htmlFor={`${fieldId}-remark`}>
                    {(aria) => (
                        <TextArea
                            {...aria}
                            rows={3}
                            placeholder={t.inventory.remarkPlaceholder}
                            value={remark}
                            onChange={(e) => setRemark(e.target.value)}
                        />
                    )}
                </Field>
            </form>
        </Modal>
    );
};
```

- [ ] **Step 3: ต่อสายที่ `InventoryView.tsx`**

แก้ import ที่บรรทัด 11 จาก:

```tsx
import { AddPalletModal, ConfirmModal, EditPalletModal } from './InventoryModals';
```

เป็น:

```tsx
import { AddPalletModal, EditPalletModal } from './InventoryModals';
```

แล้วเพิ่ม `ConfirmDialog` เข้า import ของ `ui` (ถ้าไฟล์นี้ยังไม่ได้ import จาก `../../ui` ให้เพิ่มบรรทัดใหม่):

```tsx
import { ConfirmDialog } from '../../ui';
import { toast } from '../../../services/toast';
import { describeAppError } from '../../../services/appError';
import { useT } from '../../../hooks/useT';
```

และในตัวคอมโพเนนต์ เพิ่ม `const t = useT();` ใกล้ ๆ ต้นฟังก์ชัน แล้วแทนบล็อกท้ายไฟล์:

```tsx
            <ConfirmModal
                action={confirmAction}
                onClose={() => setConfirmAction(null)}
            />
```

ด้วย:

```tsx
            {/* เรนเดอร์เฉพาะตอนมี action จริง เพื่อให้ state ภายใน (กำลังทำงาน)
                ถูกล้างทุกครั้งที่เปิดกล่องใหม่ -- ของเดิม ConfirmModal ทำแบบเดียวกัน
                ด้วย `if (!action) return null` ข้างใน */}
            {confirmAction && (
                <ConfirmDialog
                    isOpen
                    title={confirmAction.title}
                    message={confirmAction.message}
                    confirmLabel={confirmAction.confirmLabel}
                    cancelLabel={t.common.cancel}
                    closeLabel={t.common.closeDialog}
                    workingLabel={t.inventory.working}
                    isDestructive={confirmAction.isDestructive}
                    onConfirm={confirmAction.onConfirm}
                    onCancel={() => setConfirmAction(null)}
                    onError={(error) => toast.error(describeAppError(error))}
                />
            )}
```

- [ ] **Step 4: ตรวจว่าไม่มีใครยัง import `ConfirmModal` หรือ `ConfirmActionType` จากที่เดิม**

Run: `npm run typecheck`
Expected: ไม่มี error ถ้ามี error เรื่อง `ConfirmActionType` ให้แก้ import ให้ชี้ไป `hooks/inventory/useInventoryActions`

- [ ] **Step 5: ตรวจด้วยตา**

Run: `npm run dev`

หน้าคลังพาเลท:
- กด "เพิ่มพาเลท" → กล่องทรงใหม่ มีปุ่มยกเลิก, Escape ปิดได้, คลิกพื้นหลังไม่ปิด
- ใส่รหัสที่มีอยู่แล้วกดสร้าง → **กล่องไม่ปิด** ข้อความผิดพลาดขึ้นใต้ช่องรหัส
- กดแก้ไขจากแถวในตาราง → ใส่รหัสที่ซ้ำ กดบันทึก → **กล่องไม่ปิด** ข้อความขึ้นใต้ช่อง และค่าที่พิมพ์ยังอยู่
- ติ๊กเลือกหลายแถว → เปิดโมดัลจากแถบลอย → กด Escape → โมดัลปิด **การเลือกไม่หาย** กด Escape อีกทีจึงล้างการเลือก
- กดลบจากเมนู ⋯ → กล่องยืนยันเป็นทรงใหม่ ปุ่มยืนยันเป็นแดงทึบ

- [ ] **Step 6: Commit**

```bash
git add components/admin/inventory/InventoryModals.tsx components/admin/inventory/InventoryView.tsx hooks/inventory/useInventoryActions.ts
git commit -m "refactor(inventory): ย้ายโมดัลเพิ่ม/แก้พาเลทมาใช้ Modal และแสดง error ใต้ช่องแทน toast"
```

---

### Task 9: `BulkTransactionModal` เขียนใหม่

**Files:**
- Modify: `components/admin/inventory/BulkTransactionModal.tsx` (แทนทั้งไฟล์)

**Interfaces:**
- Consumes: `Modal`, `Field`, `TextInput`, `TextArea`, `SelectField`, `SegmentedControl`, `Button` · `t.inventory.invalidDateTime` (Task 5)
- Produces: `BulkTransactionModal` — prop เดิมครบไม่เปลี่ยน: `isOpen, onClose, onConfirm, selectedCount, selectedIds, departments`

- [ ] **Step 1: แทนไฟล์ทั้งหมด**

```tsx
import React, { useId, useState } from 'react';
import { ArrowRightLeft, CheckCircle, MapPin } from 'lucide-react';
import { Department } from '../../../types';
import { useT } from '../../../hooks/useT';
import { Button, Field, Modal, SegmentedControl, SelectField, TextArea, TextInput } from '../../ui';

interface BulkTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (
        action: 'check_out' | 'check_in',
        destination: string,
        remark: string,
        timestamp: string
    ) => Promise<void>;
    selectedCount: number;
    selectedIds: string[];
    departments: Department[];
}

export const BulkTransactionModal: React.FC<BulkTransactionModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    selectedCount,
    selectedIds,
    departments
}) => {
    const t = useT();
    const fieldId = useId();
    const [action, setAction] = useState<'check_out' | 'check_in'>('check_out');
    const [destination, setDestination] = useState('');
    const [remark, setRemark] = useState('');
    const [dateError, setDateError] = useState<string | null>(null);

    // แยกวันกับเวลาเป็นสองช่อง ไม่ใช่ datetime-local ตัวเดียว: ปกติผู้ใช้แก้แค่เวลา
    // (บันทึกย้อนหลังของรอบเช้าตอนบ่าย) และช่องเดียวบังคับให้เดินผ่านวันที่ก่อนเสมอ
    const [dateStr, setDateStr] = useState(() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    });

    const [timeStr, setTimeStr] = useState(() => {
        const now = new Date();
        return now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    });

    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setDateError(null);

        // ตรวจก่อนประกอบ
        //
        // ของเดิมต่อ `new Date(\`${dateStr}T${timeStr}\`).toISOString()` ตรง ๆ
        // ถ้าช่องใดช่องหนึ่งว่างจะได้ Invalid Date แล้ว .toISOString() โยน
        // RangeError ซึ่งตกลงไปใน catch ที่มีแค่ console.error -- ผู้ใช้กดยืนยัน
        // แล้วไม่มีอะไรเกิดขึ้นเลย ไม่มีข้อความ ไม่มีสัญญาณว่าพัง
        const combinedDate = new Date(`${dateStr}T${timeStr}`);
        if (!dateStr || !timeStr || Number.isNaN(combinedDate.getTime())) {
            setDateError(t.inventory.invalidDateTime);
            return;
        }

        setLoading(true);
        try {
            // ตีความ input เป็นเวลาท้องถิ่นของเบราว์เซอร์แล้วแปลงเป็น UTC ก่อนส่ง
            // -- ตรรกะเดิม ไม่เปลี่ยน
            await onConfirm(action, destination, remark, combinedDate.toISOString());
            onClose();
        } catch (error) {
            console.error("Bulk transaction failed", error);
            // ผู้เรียกแสดง toast เอง -- ดู handleConfirmBulkTransaction
        } finally {
            setLoading(false);
        }
    };

    const sortedIds = [...selectedIds].sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t.inventory.bulkTitle}
            icon={ArrowRightLeft}
            size="md"
            busy={loading}
            closeLabel={t.common.closeDialog}
            subtitle={
                // สองคีย์ไม่ใช่ประโยคเดียว: ตัวเลขมี span หนาของตัวเอง คำจึงต้องมา
                // เป็นสองท่อน
                <>
                    {t.inventory.processingPrefix}
                    <span className="font-semibold text-brand-600">{selectedCount}</span>
                    {t.inventory.processingSuffix}
                </>
            }
            footer={
                <>
                    <Button variant="secondary" onClick={onClose} disabled={loading}>
                        {t.common.cancel}
                    </Button>
                    <Button
                        type="submit"
                        form={`${fieldId}-form`}
                        variant="primary"
                        icon={CheckCircle}
                        disabled={loading}
                    >
                        {loading ? t.inventory.processing : t.common.confirm}
                    </Button>
                </>
            }
        >
            <form id={`${fieldId}-form`} onSubmit={handleSubmit} className="space-y-4">
                {/* เต็มความกว้าง ไม่ใช่ครึ่งคอลัมน์: SegmentedControl กว้างตามเนื้อ
                    และป้ายไทย ("เบิกออก"/"รับคืน") กว้างกว่าอังกฤษราวเท่าตัว */}
                <Field label={t.inventory.actionLabel} htmlFor={`${fieldId}-action`}>
                    {() => (
                        // SegmentedControl เป็น role="radiogroup" จริง เดินด้วยลูกศร
                        // ได้ และเป็นวัตถุเดียวกับสวิตช์ช่วงเวลาบนแดชบอร์ด ของเดิม
                        // เป็น <button> สองตัวเปล่า ๆ ในกล่องเทา ซึ่ง screen reader
                        // ไม่มีทางรู้ว่าเป็นตัวเลือกสองทางที่เลือกได้อันเดียว
                        <SegmentedControl
                            value={action}
                            onChange={setAction}
                            ariaLabel={t.inventory.actionLabel}
                            options={[
                                { value: 'check_out' as const, label: t.action.check_out },
                                { value: 'check_in' as const, label: t.action.check_in },
                            ]}
                        />
                    )}
                </Field>

                {/* รายการรหัสอยู่ในเนื้อ ใต้ตัวสลับ ไม่ใช่ปุ่มบนหัวที่กางแถบนอกหัว
                    -- <details> ได้พฤติกรรมกาง/หุบและการประกาศสถานะจากเบราว์เซอร์ */}
                <details className="rounded-xl border border-slate-200 bg-slate-50/70">
                    <summary className="cursor-pointer list-none px-3 py-2 text-xs font-medium text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500">
                        {t.inventory.showIds}
                    </summary>
                    <div className="styled-scrollbar max-h-32 overflow-y-auto px-3 pb-3">
                        <div className="flex flex-wrap gap-1.5">
                            {sortedIds.map((id) => (
                                <span
                                    key={id}
                                    className="rounded-md bg-brand-100 px-2 py-1 font-mono text-xs font-medium text-brand-700"
                                >
                                    {id}
                                </span>
                            ))}
                        </div>
                    </div>
                </details>

                {/* เรนเดอร์เฉพาะตอนเบิกออก ไม่ใช่ซ่อนด้วย `invisible` ที่ทิ้งช่องว่าง
                    เปล่าครึ่งกล่องไว้โดยไม่อธิบายอะไร */}
                {action === 'check_out' && (
                    <Field label={t.inventory.destination} htmlFor={`${fieldId}-dest`} required>
                        {(aria) => (
                            <SelectField
                                id={aria.id}
                                icon={MapPin}
                                ariaLabel={t.inventory.destination}
                                value={destination}
                                onChange={setDestination}
                                options={[
                                    { value: '', label: t.inventory.selectLocation },
                                    ...departments
                                        .filter((d) => d.is_active)
                                        .map((d) => ({ value: d.name, label: d.name })),
                                ]}
                            />
                        )}
                    </Field>
                )}

                <div className="grid grid-cols-2 gap-3">
                    <Field
                        label={t.common.date}
                        htmlFor={`${fieldId}-date`}
                        required
                        error={dateError ?? undefined}
                    >
                        {(aria) => (
                            // native ล้วน ไม่มี input โปร่งใสซ้อนทับ input ข้อความ
                            // แบบของเดิม -- ที่นั่นทั้งสองตัวไม่มี label และตัวบน
                            // แท็บโฟกัสได้โดยไม่ประกาศอะไรเลย
                            <TextInput
                                {...aria}
                                type="date"
                                required
                                value={dateStr}
                                onChange={(e) => {
                                    setDateStr(e.target.value);
                                    setDateError(null);
                                }}
                            />
                        )}
                    </Field>

                    <Field label={t.common.time} htmlFor={`${fieldId}-time`} required>
                        {(aria) => (
                            <TextInput
                                {...aria}
                                type="time"
                                required
                                value={timeStr}
                                onChange={(e) => {
                                    setTimeStr(e.target.value);
                                    setDateError(null);
                                }}
                            />
                        )}
                    </Field>
                </div>

                <Field label={t.common.remark} htmlFor={`${fieldId}-remark`}>
                    {(aria) => (
                        <TextArea
                            {...aria}
                            rows={2}
                            placeholder={t.inventory.noteOptional}
                            value={remark}
                            onChange={(e) => setRemark(e.target.value)}
                        />
                    )}
                </Field>
            </form>
        </Modal>
    );
};
```

- [ ] **Step 2: ตรวจ type**

Run: `npm run typecheck`
Expected: ไม่มี error หาก `SegmentedControl` บ่นเรื่อง generic ให้ยืนยันว่า `options` ใช้ `as const` บนค่า `value` ตามโค้ดข้างบน

- [ ] **Step 3: ตรวจด้วยตา**

Run: `npm run dev`

- ติ๊กหลายแถว → กด "ทำรายการ" บนแถบลอย
- สลับ "เบิกออก / รับคืน" ด้วยลูกศรซ้ายขวาบนคีย์บอร์ดได้
- เลือก "รับคืน" → ช่องปลายทางหายไปทั้งช่อง ไม่ใช่เหลือช่องว่างเปล่า
- กาง "แสดงรหัส" → รายการรหัสกางในกล่อง หุบได้
- ล้างช่องวันที่ แล้วกดยืนยัน → ข้อความผิดพลาดขึ้นใต้ช่องวันที่ ไม่ใช่เงียบหาย
- ยืนยันจริง → รายการถูกบันทึก และเส้นแบรนด์บนขอบบนวิ่งระหว่างรอ

- [ ] **Step 4: Commit**

```bash
git add components/admin/inventory/BulkTransactionModal.tsx
git commit -m "refactor(inventory): เขียนโมดัลทำรายการหลายพาเลทใหม่ด้วย primitive และกัน Invalid Date ที่เคยเงียบหาย"
```

---

### Task 10: `PalletDetailModal` เขียนใหม่

**Files:**
- Modify: `components/admin/modals/PalletDetailModal.tsx` (แทนทั้งไฟล์)

**Interfaces:**
- Consumes: `Modal`, `StatTile`, `Button`
- Produces: `PalletDetailModal` — prop เดิมไม่เปลี่ยน: `{ pallet, onClose }`

- [ ] **Step 1: แทนไฟล์ทั้งหมด**

```tsx
import React, { useEffect, useState } from 'react';

import { ActionType, Pallet, Transaction } from '../../../types';
import { fetchUsers } from '../../../services/userService';
import { fetchPalletHistory } from '../../../services/transactionService';
import { formatDate, formatDateTime, StatusBadge } from '../common/AdminHelpers';
import { Clock, History, MapPin, PackageSearch } from 'lucide-react';
import { ImageViewerModal } from '../common/ImageViewerModal';
import { getEvidenceSignedUrlMap, IMAGE_DELETED } from '../../../services/storageService';
import { useT } from '../../../hooks/useT';
import { Button, Modal, StatTile } from '../../ui';

// จุดบนไทม์ไลน์ใช้ token ชุดเดียวกับกราฟบนแดชบอร์ด "เบิกออก" จึงเป็นน้ำเงินเฉด
// เดียวกันทุกที่ในแอป แทนสีดิบ blue/green/gray/red ที่ไฟล์นี้เคยประกอบเอง
//
// กฎ CVD ที่ index.css:62-75 ตั้งไว้ไม่ถูกละเมิด: กฎนั้นห้าม co-plot ทั้งห้าสีโดยมี
// สีเป็นตัวแยกอย่างเดียว แต่ทุกแถวบนไทม์ไลน์มีป้ายข้อความกำกับ (t.action[...])
// สีจึงไม่ได้แบกความหมายลำพัง
//
// `satisfies Record<ActionType, string>` เป็นตัวกันไม่ให้ตกเคส -- ของเดิมเป็นโซ่
// ternary ที่ else สุดท้ายแปลว่า "รายงานความเสียหาย" ทำให้ 'scrap' ถูกทาสีเป็น
// damage อยู่พักหนึ่ง ไทม์ไลน์จึงแสดงรายงานความเสียหายสองครั้งโดยไม่มีร่องรอยว่า
// พาเลทถูกตัดออกจากระบบไปแล้ว
const DOT_COLOR = {
    check_out: 'bg-[var(--color-series-checkout)]',
    check_in: 'bg-[var(--color-series-checkin)]',
    repair: 'bg-[var(--color-series-repair)]',
    scrap: 'bg-[var(--color-series-scrap)]',
    // ชื่อ action คือ `report_damage` (types.ts:39) ส่วน token คือ `series-damage`
    // -- สองชื่อนี้ไม่ตรงกันโดยธรรมชาติ อย่า "แก้" ให้เหมือนกัน
    report_damage: 'bg-[var(--color-series-damage)]',
} satisfies Record<ActionType, string>;

export const PalletDetailModal = ({ pallet, onClose }: { pallet: Pallet, onClose: () => void }) => {
    const t = useT();
    const [history, setHistory] = useState<Transaction[]>([]);
    const [userMap, setUserMap] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    // The damage_reports bucket is private, so stored values are object names,
    // not renderable URLs. Sign them once per load rather than per <img>.
    const [evidenceUrls, setEvidenceUrls] = useState<Record<string, string>>({});

    useEffect(() => {
        let active = true;

        const loadData = async () => {
            try {
                const [hist, users] = await Promise.all([
                    fetchPalletHistory(pallet.pallet_id),
                    fetchUsers()
                ]);
                if (active) {
                    const map: Record<string, string> = {};
                    users.forEach(u => map[u.id] = u.full_name);
                    setUserMap(map);
                    setHistory(hist);
                    setLoading(false);
                }

                const signed = await getEvidenceSignedUrlMap(hist.map(t => t.evidence_image_url));
                if (active) setEvidenceUrls(signed);
            } catch (e) {
                console.error("Failed to load details", e);
                if (active) setLoading(false);
            }
        };

        loadData();
        return () => { active = false; };
    }, [pallet.pallet_id]);

    return (
        <>
            <Modal
                isOpen
                onClose={onClose}
                // หัวเรื่องเป็นรหัสพาเลท จึงเป็นโมโนและไม่แปล
                title={pallet.pallet_id}
                icon={PackageSearch}
                size="lg"
                dismissOnBackdrop
                busy={loading}
                closeLabel={t.common.closeDialog}
                subtitle={
                    <span className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={pallet.status} />
                        <span>{t.modals.addedOn(formatDate(pallet.created_at))}</span>
                    </span>
                }
                footer={
                    <Button variant="secondary" onClick={onClose}>
                        {t.common.close}
                    </Button>
                }
            >
                <div className="space-y-6">
                    {/* StatTile แทนกล่องที่ไฟล์นี้เคยประกอบเอง -- กล่องขวาของเดิมใช้
                        purple-50/purple-900 ซึ่งเป็นสีที่ไม่มีอยู่ใน @theme ของแอปเลย */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <StatTile
                            label={t.modals.currentLocation}
                            value={pallet.current_location}
                            icon={MapPin}
                            tone="brand"
                        />
                        <StatTile
                            label={t.modals.lastInteraction}
                            value={
                                pallet.last_checkout_date
                                    ? formatDate(pallet.last_checkout_date)
                                    : t.modals.never
                            }
                            icon={Clock}
                            tone="accent"
                        />
                    </div>

                    <div>
                        <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-800">
                            <History size={18} aria-hidden="true" /> {t.modals.activityHistory}
                        </h3>

                        {loading ? (
                            <div className="py-8 text-center text-slate-400">{t.modals.loadingHistory}</div>
                        ) : history.length === 0 ? (
                            <div className="rounded-xl bg-slate-50 py-8 text-center italic text-slate-400">
                                {t.modals.noHistory}
                            </div>
                        ) : (
                            <div className="relative ml-3 space-y-6 border-l-2 border-slate-100 pb-2">
                                {history.map((tx) => (
                                    <div key={tx.id} className="relative pl-6">
                                        <div
                                            className={`absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-white shadow-sm ${DOT_COLOR[tx.action_type]}`}
                                            aria-hidden="true"
                                        />

                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-slate-800">
                                                    {t.action[tx.action_type]}
                                                </p>
                                                <p className="mt-0.5 text-xs text-slate-500">
                                                    {t.modals.by}{' '}
                                                    <span className="font-medium text-slate-700">
                                                        {userMap[tx.user_id] || t.modals.unknownUser(tx.user_id)}
                                                    </span>
                                                    {tx.department_dest && (
                                                        <span>
                                                            {' '}• {t.modals.toDest}{' '}
                                                            <span className="font-medium text-slate-700">
                                                                {tx.department_dest}
                                                            </span>
                                                        </span>
                                                    )}
                                                </p>
                                                {tx.transaction_remark && (
                                                    <div className="mt-1.5 rounded-lg border border-slate-100 bg-slate-50 p-2 text-xs italic text-slate-600">
                                                        "{tx.transaction_remark}"
                                                    </div>
                                                )}

                                                {tx.evidence_image_url &&
                                                    tx.evidence_image_url !== IMAGE_DELETED &&
                                                    evidenceUrls[tx.evidence_image_url] && (
                                                        <div className="mt-2">
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setPreviewImage(evidenceUrls[tx.evidence_image_url!])
                                                                }
                                                                className="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                                                            >
                                                                {/* ปุ่มจริง ไม่ใช่ <img onClick> -- ของเดิมกดได้ด้วย
                                                                    เมาส์อย่างเดียว คีย์บอร์ดเข้าไม่ถึงรูปหลักฐานเลย */}
                                                                <img
                                                                    src={evidenceUrls[tx.evidence_image_url]}
                                                                    alt={t.modals.evidenceAlt}
                                                                    className="h-20 w-auto rounded-lg border border-slate-200 shadow-sm transition hover:scale-105"
                                                                />
                                                            </button>
                                                        </div>
                                                    )}
                                                {tx.evidence_image_url === IMAGE_DELETED && (
                                                    <div className="mt-2 flex items-center gap-1 text-xs italic text-slate-400">
                                                        {t.modals.evidenceDeleted}
                                                    </div>
                                                )}
                                            </div>
                                            <span className="shrink-0 whitespace-nowrap font-mono text-xs text-slate-400">
                                                {formatDateTime(tx.timestamp)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </Modal>

            {/* นอก <Modal> ข้างบน ไม่ใช่ข้างใน: มันเป็นโมดัลของตัวเอง ที่ portal ไป
                document.body เหมือนกัน การซ้อนมันไว้ในเนื้อจะทำให้ focus trap ของ
                ตัวนอกนับปุ่มในตัวในเป็นของตัวเองด้วย */}
            <ImageViewerModal
                src={previewImage}
                onClose={() => setPreviewImage(null)}
            />
        </>
    );
};
```

- [ ] **Step 2: ตรวจว่า `ActionType` ครบทุกเคสจริง**

Run: `npm run typecheck`
Expected: ไม่มี error ถ้า `satisfies Record<ActionType, string>` แดง แปลว่ามี action type ที่ยังไม่ได้แม็ปสี — เติมให้ครบ อย่าตัด `satisfies` ทิ้ง

- [ ] **Step 3: ตรวจด้วยตา**

Run: `npm run dev`

- คลิกแถวในตาราง → กล่องรายละเอียดทรงใหม่ ไม่มีสีม่วง
- ประวัติหลายสิบรายการ → หัวกับท้ายอยู่นิ่ง เนื้อตรงกลางเลื่อน
- คลิกพื้นหลัง → ปิด
- กดรูปหลักฐาน (ด้วยคีย์บอร์ดก็ได้) → รูปเปิดทับ → Escape → **ปิดแค่รูป** กล่องรายละเอียดยังอยู่ → Escape อีกที → ปิดกล่อง และหน้าเลื่อนได้อีกครั้ง

- [ ] **Step 4: Commit**

```bash
git add components/admin/modals/PalletDetailModal.tsx
git commit -m "refactor(inventory): เขียนโมดัลรายละเอียดพาเลทใหม่ ใช้ StatTile และ token สีของกราฟ"
```

---

### Task 11: `QRPrintModal` — เปลี่ยนเปลือกและสี

**Files:**
- Modify: `components/admin/modals/QRPrintModal.tsx:138-200` (ส่วนเรนเดอร์) และ `:132-135` (`alert` → toast)

**Interfaces:**
- Consumes: `Modal`, `Button`
- Produces: `QRPrintModal` — prop เดิมไม่เปลี่ยน

- [ ] **Step 1: เปลี่ยน `alert` เป็น toast**

เพิ่ม import ที่ต้นไฟล์:

```tsx
import { toast } from '../../../services/toast';
```

แล้วในบล็อก catch ของ `handleDownloadImage` แทน:

```tsx
            alert(t.modals.downloadFailed);
```

ด้วย:

```tsx
            // toast ไม่ใช่ alert: alert() บล็อกเธรดทั้งหน้าจนกว่าจะกดตกลง ซึ่งบน
            // กล่องที่มีปุ่มดาวน์โหลดเรียงเป็นสิบใบหมายถึงต้องปิดกล่องระบบทีละใบ
            // และแอปมี toast service อยู่แล้ว
            toast.error(t.modals.downloadFailed);
```

- [ ] **Step 2: แทนบล็อก return ทั้งก้อน (บรรทัด 138 ถึงท้ายไฟล์)**

```tsx
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
                <Button variant="primary" icon={Printer} onClick={handlePrint}>
                    {t.modals.printPdf}
                </Button>
            }
        >
            <div className="-mx-5 -mb-5 bg-slate-100 px-5 py-5">
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
                                    src={qrUrl(p.pallet_id, 150)}
                                    alt={p.pallet_id}
                                    className="rendering-pixelated h-24 w-24 object-contain mix-blend-multiply"
                                />
                            </div>

                            <div className="mt-1 flex w-full items-center justify-between border-t border-slate-100 pt-2">
                                <p className="truncate text-[10px] font-semibold text-slate-400">
                                    {t.modals.propertyMarkShort}
                                </p>
                                <Button
                                    size="sm"
                                    variant="ghost"
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
```

`-mx-5 -mb-5` ดึงพื้นเทาให้กินเต็มความกว้างของเนื้อ ชดเชย `px-5 pb-5` ที่ `Modal` ใส่ให้ — กริด QR เป็นบล็อกเดียวที่ต้องการพื้นต่างจากกล่อง ไม่ใช่การ์ดลอยบนพื้นขาว

- [ ] **Step 3: ตรวจ import ที่ไม่ได้ใช้แล้ว**

ลบ `X` ออกจาก import ของ `lucide-react` ถ้าไม่มีที่ใช้แล้ว (ปุ่ม ✕ มาจาก `Modal`)

Run: `npm run typecheck && npm run build`
Expected: ไม่มี error และไม่มี warning เรื่องตัวแปรที่ไม่ได้ใช้

- [ ] **Step 4: ตรวจด้วยตา**

Run: `npm run dev`

- ติ๊กหลายแถว → พิมพ์ QR → กล่องกว้าง `xl` ปุ่มพิมพ์อยู่บนหัวและอยู่กับที่ขณะเลื่อนกริด
- ไม่มีสี indigo เหลือ
- กด "พิมพ์ PDF" → **ได้แผ่นเหมือนเดิมทุกประการ** (ตรรกะสร้างเอกสารไม่ถูกแตะ)
- กดดาวน์โหลด PNG ของใบหนึ่ง → ได้ไฟล์ และถ้าพังต้องเป็น toast ไม่ใช่กล่อง alert ของระบบ

- [ ] **Step 5: Commit**

```bash
git add components/admin/modals/QRPrintModal.tsx
git commit -m "refactor(inventory): ย้ายโมดัลพิมพ์ QR มาใช้ Modal และเปลี่ยน alert เป็น toast"
```

---

### Task 12: `ImageViewerModal` — level 2

**Files:**
- Modify: `components/admin/common/ImageViewerModal.tsx:105-191` (ส่วนเรนเดอร์)

**Interfaces:**
- Consumes: `Modal` (`level={2}`), `Button`
- Produces: `ImageViewerModal` — prop เดิมไม่เปลี่ยน: `{ src, onClose }`

- [ ] **Step 1: แทนส่วนเรนเดอร์**

เก็บ state และ handler ทั้งหมดไว้เหมือนเดิมทุกบรรทัด (`scale`, `position`, `isDragging`, `dragStart`, `handleZoomIn/Out/Reset/Download` และตัวจัดการลาก) เปลี่ยนเฉพาะสิ่งที่ห่อมันอยู่:

```tsx
    return (
        <Modal
            isOpen={!!src}
            onClose={onClose}
            title={t.modals.previewAlt}
            size="xl"
            // ชั้นสองจริง ๆ: กล่องนี้เปิดทับ PalletDetailModal เสมอ ค่านี้ทำให้มัน
            // ได้ z-[60] และเป็นตัวที่กิน Escape ก่อน ของเดิมไม่มี Escape เลย
            level={2}
            dismissOnBackdrop
            closeLabel={t.common.closeDialog}
            headerActions={
                <>
                    <Button size="sm" variant="secondary" icon={ZoomOut} onClick={handleZoomOut} aria-label={t.modals.zoomOut} />
                    <Button size="sm" variant="secondary" icon={ZoomIn} onClick={handleZoomIn} aria-label={t.modals.zoomIn} />
                    <Button size="sm" variant="secondary" icon={RotateCcw} onClick={handleReset} aria-label={t.modals.resetZoom} />
                    <Button size="sm" variant="secondary" icon={Download} onClick={handleDownload} aria-label={t.modals.downloadImage} />
                </>
            }
        >
            <div
                className="-mx-5 -mb-5 flex min-h-[60vh] items-center justify-center overflow-hidden bg-slate-950"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                <img
                    src={src as string}
                    alt={t.modals.evidenceAlt}
                    draggable={false}
                    // ค่าที่คำนวณตอนรันไทม์ต้องไปทาง style ไม่ใช่คลาสที่ประกอบเป็น
                    // สตริง -- Tailwind สแกนแต่ข้อความในซอร์ส
                    style={{
                        transform: `scale(${scale}) translate(${position.x}px, ${position.y}px)`,
                        cursor: isDragging ? 'grabbing' : 'grab',
                    }}
                    className="max-h-full max-w-full object-contain transition-transform duration-100"
                />
            </div>
        </Modal>
    );
```

คีย์ `zoomIn` / `zoomOut` / `resetZoom` / `downloadImage` / `previewAlt` มีครบทั้งสองภาษาแล้วใน `locales/admin/modals.ts:58-63` และ `:97-102` — **ไม่ต้องเพิ่มคีย์ใหม่ในทาสก์นี้** ปุ่มไอคอนล้วนทุกตัวต้องมี `aria-label` เสมอ เพราะ `Button` ตั้ง `aria-hidden` ให้ไอคอนไว้แล้ว (`Button.tsx:88-89`) ปุ่มที่ไม่มีป้ายจึงไม่มีชื่อเลย

หมายเหตุ: `if (!src) return null` ที่อยู่ก่อน return เดิม **ให้ตัดออก** และปล่อยให้ `isOpen={!!src}` เป็นตัวคุมแทน — `Modal` จัดการการไม่เรนเดอร์เองอยู่แล้ว และ hook ทั้งหมดในไฟล์นี้อยู่เหนือจุดนั้นอยู่แล้วตามคอมเมนต์ที่บรรทัด 12-14

- [ ] **Step 2: ตรวจ type และ build**

Run: `npm run typecheck && npm test && npm run build`
Expected: PASS ทั้งหมด

- [ ] **Step 3: ตรวจด้วยตา — เคสโมดัลซ้อนโมดัลแบบเต็ม**

Run: `npm run dev`

- เปิด PalletDetail ของพาเลทที่มีรูปหลักฐาน → กดรูป
- รูปเปิดทับ **อยู่เหนือ** กล่องรายละเอียด (z-[60] > z-50)
- ซูมเข้า/ออก/รีเซ็ต/ดาวน์โหลดทำงานเหมือนเดิม ลากรูปได้
- Tab วนอยู่ในกล่องรูป ไม่หลุดไปหาปุ่มในกล่องรายละเอียดข้างล่าง
- Escape → ปิดแค่รูป โฟกัสกลับไปที่รูปที่กดเปิด
- Escape อีกที → ปิดกล่องรายละเอียด และสกรอลล์หน้าคลายตอนนั้น

- [ ] **Step 4: Commit**

```bash
git add components/admin/common/ImageViewerModal.tsx
git commit -m "refactor(admin): ย้ายตัวดูรูปหลักฐานมาใช้ Modal level 2 พร้อม Escape ที่เคยไม่มี"
```

---

### Task 13: ตรวจรับรอบสุดท้าย

**Files:** ไม่แก้อะไร — ทาสก์นี้คือการเดินเกณฑ์ตรวจรับข้อ 1-22 ของ spec

- [ ] **Step 1: ผ่านเครื่องมือ**

Run: `npm run typecheck && npm test && npm run build`
Expected: PASS ทั้งสามคำสั่ง

- [ ] **Step 2: กวาดหาของที่ต้องไม่เหลืออยู่**

Run:

```bash
git grep -n "animate-in\|zoom-in-95\|fade-in\|slide-in-from" -- components/admin/inventory components/admin/modals components/admin/common/ConfirmationModal.tsx components/admin/common/ImageViewerModal.tsx
git grep -n "font-black" -- components/admin/inventory components/admin/modals
git grep -n "z-\[9999\]\|z-\[100\]" -- components/admin
git grep -n "blue-600\|indigo-600\|purple-" -- components/admin/inventory components/admin/modals
```

Expected: ทั้งสี่คำสั่งไม่คืนผลลัพธ์ (exit code 1) ถ้ามีผลลัพธ์เหลือ แปลว่ามีจุดที่ตกหล่น — แก้ก่อนไปต่อ

หมายเหตุ: ไฟล์นอกขอบเขต (`UserModals.tsx`, `LocationModals.tsx`, `TransactionEditModal.tsx`) **ยังมีของพวกนี้อยู่และนั่นถูกต้อง** — เป็นงานรอบถัดไป จึงจำกัด path ในคำสั่งข้างบนไว้

- [ ] **Step 3: เดินเกณฑ์ตรวจด้วยตาของ spec**

Run: `npm run dev`

ไล่ข้อ 4-16 ของ `docs/superpowers/specs/2026-07-28-modal-system-design.md` ข้อ 11 ทีละข้อ

- [ ] **Step 4: เดินเกณฑ์คีย์บอร์ดและ screen reader**

ไล่ข้อ 17-20 โดยใช้คีย์บอร์ดอย่างเดียว ไม่แตะเมาส์เลยตลอดรอบ

- [ ] **Step 5: เดินเกณฑ์สองภาษา**

สลับ EN/TH แล้วเปิดโมดัลทั้ง 7 ตัวซ้ำ ตรวจข้อ 21-22 โดยเฉพาะปุ่มท้ายกล่องและ `SegmentedControl` ใน BulkTransaction

- [ ] **Step 6: Commit ถ้ามีอะไรต้องเก็บตก**

```bash
git add -A
git commit -m "fix(inventory): เก็บตกจากการตรวจรับระบบโมดัล"
```

---

## สรุปการทำ Self-Review ของแผนนี้

**ครอบคลุม spec:** ทุกข้อของ spec มีทาสก์รองรับ — ข้อ 4 (`Modal`) → Task 2 · ข้อ 5 (`ConfirmDialog`) → Task 4+6 · ข้อ 6.1-6.2 (`Field`/`TextInput`/`TextArea`) → Task 3 · ข้อ 6.3 (`dangerSolid`) → Task 1 · ข้อ 7.1-7.2 → Task 8 (+Task 7 สำหรับการแก้ hook) · ข้อ 7.3 → Task 9 · ข้อ 7.4 → Task 10 · ข้อ 7.5 → Task 11 · ข้อ 7.6 → Task 12 · ข้อ 8 → Task 5 · ข้อ 11 → Task 13

**จุดที่แผนต่างจาก spec โดยตั้งใจ (ระบุไว้ในทาสก์แล้ว):**
1. `Field` รับ `children` เป็นฟังก์ชัน ไม่ใช่ node ที่ถูกยัด prop ผ่าน `cloneElement` — spec ข้อ 6.1 เขียนแค่ว่า "เดินสายให้อัตโนมัติ" ซึ่งวิธีนี้ทำได้โดยไม่ชน Global Constraint
2. `BrandHairline` ถูกสกัดออกจาก `Card.tsx` — spec บอกให้ "ใช้ของ `Card` ตรง ๆ" ซึ่งทำไม่ได้ถ้าไม่สกัด เพราะ `Card` บังคับ `CARD_SHELL` มาด้วย
3. `ConfirmDialog` มี prop `onError` เพิ่ม — จำเป็นเพราะไฟล์ใน `components/ui/` เรียก `toast`/ดิกชันนารีเองไม่ได้ตามกฎประจำโฟลเดอร์

---

## Execution Handoff

แผนเสร็จและบันทึกที่ `docs/superpowers/plans/2026-07-28-modal-system.md`
