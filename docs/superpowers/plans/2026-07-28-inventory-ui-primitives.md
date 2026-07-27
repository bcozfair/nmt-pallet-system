# แผนลงมือ: สกัด ui primitive แล้วปรับหน้าจัดการคลังพาเลท

> **สำหรับ agent ที่ลงมือ:** ใช้ superpowers:subagent-driven-development รันแผนนี้ทีละ task
> ทุกขั้นตอนเป็น checkbox (`- [ ]`) ให้ติ๊กตามจริง

**Goal:** ย้ายหน้าจัดการคลังพาเลทมาอยู่บน design system เดียวกับหน้าแดชบอร์ด โดยสกัดส่วนที่ทั้ง 5 หน้าของแอดมินใช้ร่วมกันออกมาเป็น primitive ใน `components/ui/` แทนการทาสีหน้าคลังพาเลททับที่เดิม

**Architecture:** สร้าง primitive ที่ไม่ผูกกับหน้าไหนก่อน (รับข้อความทุกตัวเป็น prop ไม่ import dictionary) แล้วค่อยต่อสายให้หน้าคลังพาเลทและหัวเพจแดชบอร์ด รอบนี้ต่อสายแค่สองที่นั้น อีก 4 หน้าย้ายรอบหน้า

**Tech Stack:** React 19, TypeScript strict, Tailwind v4 (theme อยู่ใน `index.css` ไม่ใช่ `tailwind.config.js`), lucide-react, vitest + @testing-library/react

**Spec:** [`docs/superpowers/specs/2026-07-27-inventory-ui-primitives-design.md`](../specs/2026-07-27-inventory-ui-primitives-design.md)

---

## Global Constraints

ทุก task อยู่ใต้ข้อบังคับเหล่านี้ทั้งหมด ไม่ต้องเขียนซ้ำในแต่ละ task

1. **ไฟล์ใน `components/ui/` ห้าม import dictionary** (`useT`, `dict`) ข้อความที่ผู้ใช้เห็นทุกตัวรับมาเป็น prop — กฎนี้เขียนไว้แล้วที่หัว `components/ui/index.ts`
2. **ห้ามใช้คลาสตระกูล `animate-in` / `fade-in` / `zoom-in-*` / `slide-in-from-*` / `animate-pulse-slow`** มันมาจากปลั๊กอิน `tailwindcss-animate` ที่ไม่ได้อยู่ใน package.json คอมไพล์ออกมาเป็นศูนย์ ใช้ `animate-surface-in` / `animate-pop-in` / `animate-brand-sweep` / `.skeleton` ที่นิยามไว้จริงใน `index.css` แทน
3. **น้ำหนักฟอนต์สูงสุดคือ 700 และใช้ 700 เฉพาะหัวคอลัมน์ตาราง** แอปโหลด Inter + Noto Sans Thai แค่ 300–700 `font-black` (900) ถูกเบราว์เซอร์สังเคราะห์ขึ้นเองและทำให้วรรณยุกต์ไทยเลอะ
4. **ห้ามใช้ `uppercase` และ letter-spacing ค่าบวก** ทั้งคู่เป็น regression ที่เห็นเฉพาะภาษาเดียว — uppercase ไม่มีผลกับไทย ส่วน tracking บวกดันสระและวรรณยุกต์ออกจากตัวอักษรที่มันเกาะอยู่ `tracking-tight` ใช้ได้
5. **ความสูงใช้ `min-h-*` ห้ามใช้ `h-*` กับกล่องที่มีข้อความ** ป้ายภาษาไทยกว้างกว่าต้นฉบับอังกฤษ 1.4–1.7 เท่าและตัดคำกลางคำไม่ได้ ความสูงตายตัวจึงตัดป้ายขาดในภาษาเดียว
6. **สีกลางใช้ `slate-*` ห้ามใช้ `gray-*`** ในไฟล์ที่แตะ
7. **ค่าที่มาจาก runtime ส่งผ่าน `style` ห้ามประกอบเป็นชื่อคลาส** Tailwind สแกนแต่ข้อความในซอร์ส `w-[${n}%]` คอมไพล์ออกมาเป็นศูนย์เงียบ ๆ
8. **ปุ่มและ control ที่กดได้ต้องมี** `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500`
9. **เขียนคอมเมนต์อธิบาย "ทำไม" ไม่ใช่ "ทำอะไร"** ตามธรรมเนียมของโค้ดเบสนี้ — ทุกการตัดสินใจที่ไม่ชัดในตัวเองต้องมีเหตุผลกำกับ โดยเฉพาะที่แผนนี้อธิบายเหตุผลไว้ให้แล้ว ให้ยกไปใส่ในโค้ด
10. **ห้ามแตะ `components/ui/index.ts`** — ไฟล์นี้ผู้เขียนแผนเป็นคนรวม export ให้เองท้ายแต่ละ wave เพื่อไม่ให้ agent ที่ทำงานขนานกันชนกัน
11. **ห้ามแตะ `locales/admin/inventory.ts` นอกจาก task ที่ระบุไว้ชัดว่าให้แตะ** ด้วยเหตุผลเดียวกัน
12. ด่านปิดของทุก task: `npm run typecheck` ต้องไม่มี error และ `npm run test` ต้องผ่าน

---

## File Structure

### สร้างใหม่

| ไฟล์ | รับผิดชอบ |
|---|---|
| `components/ui/Button.tsx` | คลาสปุ่มทั้งแอปที่เดียว 6 variant |
| `components/ui/Checkbox.tsx` | ช่องติ๊กที่รองรับ indeterminate |
| `components/ui/ToggleChip.tsx` | ปุ่มเปิด/ปิดตัวกรองที่เป็น `aria-pressed` จริง |
| `components/ui/SearchInput.tsx` | ช่องค้นหา + ปุ่มล้าง |
| `components/ui/SelectField.tsx` | `<select>` + ไอคอน + chevron |
| `components/ui/DateRangeField.tsx` | ช่วงวันที่สองช่อง |
| `components/ui/Menu.tsx` | เมนูดรอปดาวน์ที่ a11y ครบ |
| `components/ui/DataTable.tsx` | เปลือกตาราง + `SortableTh` |
| `components/ui/FilterBar.tsx` | การ์ดตัวกรอง + แถวจำนวนผลลัพธ์ |
| `components/ui/PageHeader.tsx` | หัวเพจ `<h1>` + ช่องใส่ปุ่ม |
| `components/ui/SelectionBar.tsx` | แถบลอยตอนเลือกหลายแถว |
| `components/admin/inventory/InventoryStatusStrip.tsx` | แถบตัวเลข 4 ช่องที่กดกรองได้ |
| `components/admin/inventory/InventorySelectionBar.tsx` | ประกอบ `SelectionBar` ด้วยปุ่มของพาเลท |

### แก้

| ไฟล์ | แก้อะไร |
|---|---|
| `components/ui/index.ts` | เพิ่ม export (ผู้เขียนแผนทำเอง) |
| `components/ui/StatTile.tsx` | เพิ่ม prop `selected` |
| `components/admin/common/Pagination.tsx` | ทาสี slate/brand |
| `components/admin/dashboard/sections/PageHeader.tsx` | ย้ายมาใช้ `PageHeader` + `Button` + `Menu` |
| `components/admin/AdminDashboard.tsx` | ส่ง `palletsLoading` ให้ `InventoryView` |
| `components/admin/inventory/InventoryView.tsx` | ทิ้งการล็อกความสูง ประกอบชิ้นส่วนใหม่ |
| `components/admin/inventory/InventoryHeader.tsx` | เหลือแค่หัวเพจ |
| `components/admin/inventory/InventoryFilters.tsx` | เขียนใหม่บน primitive |
| `components/admin/inventory/InventoryTable.tsx` | เขียนใหม่บน `DataTable` |
| `hooks/inventory/useInventoryFilters.ts` | เพิ่ม `statusCounts` + `activeFilterCount` |
| `locales/admin/inventory.ts` | คีย์ใหม่ 5 ตัว |

### ลบ

| ไฟล์ | เมื่อไหร่ |
|---|---|
| `components/ui/smoke.test.tsx` | Task 1.2 (เทสต์จริงตัวแรกลง) |

---

## แผนการทำงานขนาน

งานแบ่งเป็น wave — ภายใน wave เดียวกัน task ไม่แตะไฟล์เดียวกันเลย จึงรัน subagent พร้อมกันได้
ระหว่าง wave ต้องรอให้ wave ก่อนหน้าจบ เพราะมี dependency จริง

```
Wave 1 (ขนาน 4)   1.1 Button   1.2 Checkbox   1.3 ToggleChip+SearchInput+SelectField   1.4 DateRangeField
                        │            │                      │                                │
                        └────────────┴──────────┬───────────┴────────────────────────────────┘
Wave 2 (ขนาน 3)                    2.1 Menu   2.2 DataTable+SortableTh   2.3 FilterBar+PageHeader+SelectionBar
                                        │            │                              │
                                        └────────────┴──────────────┬───────────────┘
Wave 3 (เดี่ยว)                                        3.1 ย้าย dashboard PageHeader (D6)
                                                                    │
Wave 4 (ขนาน 2 → เดี่ยว)   4.1 useInventoryFilters ┐                │
                           5.1 Pagination ทาสี      ├────────────────┤
                                                    └→ 4.2 → 4.3 → 4.4 (เรียงกัน แตะ InventoryView ร่วมกัน)
```

**Task 4.2–4.4 รันขนานกันไม่ได้** ทั้งสามแตะ `InventoryView.tsx` และ `locales/admin/inventory.ts`
ส่วน **Task 5.1 (Pagination) รันขนานกับ Wave 4 ได้ทั้งหมด** เพราะไม่มีใครแตะไฟล์นั้น

---

# Wave 1 — primitive ที่ไม่พึ่งใคร

## Task 1.1: `Button`

**Files:**
- Create: `components/ui/Button.tsx`

**Interfaces:**
- Consumes: ไม่มี
- Produces:
  ```ts
  export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'inverse' | 'inverseGhost';
  export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
      variant?: ButtonVariant;   // default 'secondary'
      icon?: LucideIcon;
      iconRight?: LucideIcon;
      size?: 'sm' | 'md';        // default 'md'
  }
  export const BUTTON_BASE: string;
  export const BUTTON_SIZE: Record<'sm' | 'md', string>;
  export const BUTTON_VARIANT: Record<ButtonVariant, string>;
  export const Button: React.FC<ButtonProps>;
  ```

**หมายเหตุการเบี่ยงจาก spec:** spec §4.1 ระบุ 4 variant แผนนี้เพิ่ม `inverse` และ `inverseGhost`
เพราะ `SelectionBar` (spec §4.11) เป็นแถบสีเข้ม `bg-brand-900` ปุ่ม `primary` ซึ่งเป็น `bg-brand-600`
วางบนนั้นแล้วคอนทราสต์ต่ำเกินอ่าน และการแก้ด้วยการส่ง `className` ทับจากข้างนอกใช้ไม่ได้จริง —
ลำดับความสำคัญของคลาส Tailwind ตัดสินที่ลำดับใน CSS ที่ build ออกมา ไม่ใช่ลำดับในสตริง

- [ ] **Step 1: เขียน `components/ui/Button.tsx`**

```tsx
import React from 'react';
import type { LucideIcon } from 'lucide-react';

export type ButtonVariant =
    | 'primary'
    | 'secondary'
    | 'danger'
    | 'ghost'
    | 'inverse'
    | 'inverseGhost';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    icon?: LucideIcon;
    iconRight?: LucideIcon;
    size?: 'sm' | 'md';
}

// ยกมาจาก components/admin/dashboard/sections/PageHeader.tsx ทั้งชุด ที่นั่นเคยเป็น
// ค่าคงที่ประจำไฟล์ ทำให้ทุกหน้าที่เหลือในแอปประกอบคลาสปุ่มขึ้นเองทีละที่ -- 20 กว่าที่
// ที่ไม่มีอะไรรับประกันว่าจะเหมือนกัน
//
// `min-h-10` ไม่ใช่ `h-10` เด็ดขาด: ป้ายปุ่มภาษาไทยกว้างกว่าต้นฉบับอังกฤษ 1.4-1.7 เท่า
// และเบราว์เซอร์ตัดคำกลางคำไม่ได้ ความสูงตายตัวจึงตัดป้ายขาดในภาษาเดียว --
// ภาษาที่คนรีวิวสกรีนช็อตอังกฤษไม่มีวันเห็น
export const BUTTON_BASE =
    'inline-flex items-center justify-center gap-2 rounded-xl font-semibold leading-snug ' +
    'transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 ' +
    'focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-60';

export const BUTTON_SIZE: Record<'sm' | 'md', string> = {
    sm: 'min-h-8 px-2.5 py-1 text-xs',
    md: 'min-h-10 px-3.5 py-2 text-sm',
};

export const BUTTON_VARIANT: Record<ButtonVariant, string> = {
    primary:
        'bg-brand-600 text-white shadow-lg shadow-brand-600/20 hover:bg-brand-700 ' +
        'active:scale-[0.99] disabled:hover:bg-brand-600',
    secondary:
        'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 ' +
        'active:scale-[0.99] disabled:hover:bg-white',
    // ยกมาจากปุ่ม cleanup ใน components/admin/transactions/TransactionHeader.tsx
    // เพื่อให้รอบที่ย้ายหน้ารายการมาใช้ primitive ไม่ต้องคิดสีใหม่
    danger:
        'border border-red-200 bg-white text-red-600 hover:bg-red-50 ' +
        'active:scale-[0.99] disabled:hover:bg-white',
    ghost: 'text-slate-600 hover:bg-slate-100 active:scale-[0.99]',
    // สองตัวล่างสำหรับพื้นเข้มเท่านั้น (SelectionBar) -- brand-600 บน brand-900
    // คอนทราสต์ต่ำเกินอ่าน และการส่ง className ไปทับจากข้างนอกใช้ไม่ได้
    // เพราะลำดับคลาส Tailwind ตัดสินที่ CSS ที่ build ออกมา ไม่ใช่ลำดับในสตริง
    inverse: 'bg-white text-brand-900 hover:bg-slate-100 active:scale-[0.99]',
    inverseGhost:
        'border border-white/25 bg-white/10 text-white hover:bg-white/20 active:scale-[0.99] ' +
        'focus-visible:outline-white',
};

export const Button: React.FC<ButtonProps> = ({
    variant = 'secondary',
    icon: Icon,
    iconRight: IconRight,
    size = 'md',
    className = '',
    children,
    type = 'button',
    ...rest
}) => {
    // ไอคอนเป็นของตกแต่งที่ทวนสิ่งที่ป้ายพูดอยู่แล้ว จึง aria-hidden เสมอ
    // ปุ่มที่มีไอคอนอย่างเดียวต้องส่ง aria-label มาเอง
    const iconSize = size === 'sm' ? 14 : 16;
    return (
        <button
            type={type}
            className={`${BUTTON_BASE} ${BUTTON_SIZE[size]} ${BUTTON_VARIANT[variant]} ${className}`}
            {...rest}
        >
            {Icon && <Icon size={iconSize} aria-hidden="true" />}
            {children}
            {IconRight && <IconRight size={iconSize} aria-hidden="true" />}
        </button>
    );
};
```

- [ ] **Step 2: typecheck**

Run: `npm run typecheck`
Expected: ไม่มี error

- [ ] **Step 3: commit**

```bash
git add components/ui/Button.tsx
git commit -m "feat(ui): add shared Button primitive"
```

---

## Task 1.2: `Checkbox` (มีเทสต์)

**Files:**
- Create: `components/ui/Checkbox.tsx`
- Create: `components/ui/Checkbox.test.tsx`
- Delete: `components/ui/smoke.test.tsx`

**Interfaces:**
- Consumes: ไม่มี
- Produces:
  ```ts
  export interface CheckboxProps {
      checked: boolean;
      indeterminate?: boolean;
      onChange: () => void;
      ariaLabel: string;
      id?: string;
  }
  export const Checkbox: React.FC<CheckboxProps>;
  ```

- [ ] **Step 1: เขียนเทสต์ที่ต้องแดงก่อน — `components/ui/Checkbox.test.tsx`**

```tsx
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Checkbox } from './Checkbox';

describe('Checkbox', () => {
    it('ตั้ง indeterminate ลงบน DOM node ได้ (ตั้งจาก HTML ไม่ได้ ต้องผ่าน ref)', () => {
        render(<Checkbox checked={false} indeterminate onChange={() => {}} ariaLabel="เลือกทั้งหมด" />);
        const box = screen.getByRole('checkbox', { name: 'เลือกทั้งหมด' }) as HTMLInputElement;
        expect(box.indeterminate).toBe(true);
        expect(box.checked).toBe(false);
    });

    it('checked ชนะ indeterminate เมื่อส่งมาพร้อมกัน', () => {
        render(<Checkbox checked indeterminate onChange={() => {}} ariaLabel="เลือกทั้งหมด" />);
        const box = screen.getByRole('checkbox', { name: 'เลือกทั้งหมด' }) as HTMLInputElement;
        expect(box.checked).toBe(true);
        expect(box.indeterminate).toBe(false);
    });

    it('ล้าง indeterminate เมื่อ prop เปลี่ยนเป็น false', () => {
        const { rerender } = render(
            <Checkbox checked={false} indeterminate onChange={() => {}} ariaLabel="เลือกทั้งหมด" />,
        );
        const box = screen.getByRole('checkbox', { name: 'เลือกทั้งหมด' }) as HTMLInputElement;
        expect(box.indeterminate).toBe(true);
        rerender(<Checkbox checked={false} indeterminate={false} onChange={() => {}} ariaLabel="เลือกทั้งหมด" />);
        expect(box.indeterminate).toBe(false);
    });

    it('เรียก onChange เมื่อคลิก', async () => {
        const onChange = vi.fn();
        const user = userEvent.setup();
        render(<Checkbox checked={false} onChange={onChange} ariaLabel="เลือกแถว" />);
        await user.click(screen.getByRole('checkbox', { name: 'เลือกแถว' }));
        expect(onChange).toHaveBeenCalledTimes(1);
    });
});
```

- [ ] **Step 2: รันแล้วต้องแดง**

Run: `npm run test -- Checkbox`
Expected: FAIL — `Failed to resolve import "./Checkbox"`

- [ ] **Step 3: เขียน `components/ui/Checkbox.tsx`**

```tsx
import React, { useEffect, useRef } from 'react';

export interface CheckboxProps {
    checked: boolean;
    /** สถานะ "เลือกบางส่วน" ของช่องหัวตาราง ถูกเมินเมื่อ `checked` เป็น true */
    indeterminate?: boolean;
    onChange: () => void;
    ariaLabel: string;
    id?: string;
}

// `rounded-md` ไม่ใช่ `rounded-full` ซึ่งเป็นของเดิมในตารางคลังพาเลท: ช่องกลม
// สื่อว่าเลือกได้อันเดียว ซึ่งตรงข้ามกับสิ่งที่ตารางนี้ทำอยู่จริง
//
// เครื่องหมายถูกเป็น SVG ฝัง base64 ใน background-image ของ ::after เพราะ
// `appearance-none` ลบเครื่องหมายที่เบราว์เซอร์วาดให้ทิ้งไปด้วย สตริงนั้นเคยถูก
// คัดลอกไว้สองที่ใน InventoryTable.tsx และตัวหนึ่งตกคุณสมบัติ stroke-linejoin ไป
// -- ซึ่งไม่มีใครเห็นเพราะมันต่างกันไม่กี่พิกเซล ตอนนี้มีที่เดียว
const TICK =
    "bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIzIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwb2x5bGluZSBwb2ludHM9IjIwIDYgOSAxNyA0IDEyIiAvPjwvc3ZnPg==')]";

const BOX =
    'relative h-4 w-4 shrink-0 cursor-pointer appearance-none rounded-md border-2 ' +
    'border-slate-300 bg-white transition ' +
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ' +
    'checked:border-brand-600 checked:bg-brand-600 ' +
    'indeterminate:border-brand-600 indeterminate:bg-brand-600';

const CHECKED_MARK =
    "checked:after:content-[''] checked:after:absolute checked:after:left-1/2 checked:after:top-1/2 " +
    'checked:after:h-3 checked:after:w-3 checked:after:-translate-x-1/2 checked:after:-translate-y-1/2 ' +
    `checked:after:bg-contain checked:after:bg-center checked:after:bg-no-repeat checked:after:${TICK}`;

// ขีดกลางวาดด้วยกล่องเปล่า ไม่ใช่ SVG อีกอัน -- มันคือสี่เหลี่ยมขาว 2px ไม่คุ้มกับ
// การฝังไฟล์ที่สอง
const INDETERMINATE_MARK =
    "indeterminate:after:content-[''] indeterminate:after:absolute indeterminate:after:left-1/2 " +
    'indeterminate:after:top-1/2 indeterminate:after:h-0.5 indeterminate:after:w-2 ' +
    'indeterminate:after:-translate-x-1/2 indeterminate:after:-translate-y-1/2 ' +
    'indeterminate:after:rounded-full indeterminate:after:bg-white';

export const Checkbox: React.FC<CheckboxProps> = ({
    checked,
    indeterminate = false,
    onChange,
    ariaLabel,
    id,
}) => {
    const ref = useRef<HTMLInputElement>(null);

    // `indeterminate` เป็น property ของ DOM node ไม่ใช่ attribute ของ HTML
    // เขียนใน JSX ตรง ๆ ไม่ได้ ต้องตั้งผ่าน ref หลัง render ทุกครั้ง
    useEffect(() => {
        if (ref.current) ref.current.indeterminate = indeterminate && !checked;
    }, [indeterminate, checked]);

    return (
        <input
            ref={ref}
            id={id}
            type="checkbox"
            aria-label={ariaLabel}
            checked={checked}
            onChange={onChange}
            className={`${BOX} ${CHECKED_MARK} ${INDETERMINATE_MARK}`}
        />
    );
};
```

- [ ] **Step 4: รันแล้วต้องเขียว**

Run: `npm run test -- Checkbox`
Expected: PASS 4/4

- [ ] **Step 5: ลบ smoke test แล้วรันทั้งชุด**

```bash
rm components/ui/smoke.test.tsx
npm run test
npm run typecheck
```
Expected: เทสต์ผ่านหมด typecheck ไม่มี error

- [ ] **Step 6: commit**

```bash
git add -A components/ui
git commit -m "feat(ui): add Checkbox primitive with indeterminate support"
```

---

## Task 1.3: `ToggleChip` (มีเทสต์) + `SearchInput` + `SelectField`

**Files:**
- Create: `components/ui/ToggleChip.tsx`
- Create: `components/ui/ToggleChip.test.tsx`
- Create: `components/ui/SearchInput.tsx`
- Create: `components/ui/SelectField.tsx`

**Interfaces:**
- Consumes: ไม่มี
- Produces:
  ```ts
  export interface ToggleChipProps {
      pressed: boolean;
      onChange: (pressed: boolean) => void;
      label: string;
      icon?: LucideIcon;
      tone?: 'brand' | 'critical';   // default 'brand'
      className?: string;
  }
  export const ToggleChip: React.FC<ToggleChipProps>;

  export interface SearchInputProps {
      value: string;
      onChange: (value: string) => void;
      placeholder: string;
      ariaLabel: string;
      clearLabel: string;
      id?: string;
      name?: string;
      className?: string;
  }
  export const SearchInput: React.FC<SearchInputProps>;

  export interface SelectFieldOption { value: string; label: string }
  export interface SelectFieldProps {
      value: string;
      onChange: (value: string) => void;
      options: readonly SelectFieldOption[];
      ariaLabel: string;
      icon?: LucideIcon;
      id?: string;
      name?: string;
      className?: string;
  }
  export const SelectField: React.FC<SelectFieldProps>;
  ```

- [ ] **Step 1: เขียนเทสต์ที่ต้องแดงก่อน — `components/ui/ToggleChip.test.tsx`**

```tsx
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToggleChip } from './ToggleChip';

describe('ToggleChip', () => {
    it('สะท้อนสถานะผ่าน aria-pressed', () => {
        const { rerender } = render(
            <ToggleChip pressed={false} onChange={() => {}} label="เฉพาะเกินกำหนด" />,
        );
        const chip = screen.getByRole('button', { name: 'เฉพาะเกินกำหนด' });
        expect(chip.getAttribute('aria-pressed')).toBe('false');
        rerender(<ToggleChip pressed onChange={() => {}} label="เฉพาะเกินกำหนด" />);
        expect(chip.getAttribute('aria-pressed')).toBe('true');
    });

    it('ส่งค่าที่สลับแล้วออกไป ไม่ใช่ค่าเดิม', async () => {
        const onChange = vi.fn();
        const user = userEvent.setup();
        render(<ToggleChip pressed={false} onChange={onChange} label="เฉพาะเกินกำหนด" />);
        await user.click(screen.getByRole('button', { name: 'เฉพาะเกินกำหนด' }));
        expect(onChange).toHaveBeenCalledWith(true);
    });

    it('กดด้วยคีย์บอร์ดได้ เพราะเป็น <button> จริง', async () => {
        const onChange = vi.fn();
        const user = userEvent.setup();
        render(<ToggleChip pressed onChange={onChange} label="เฉพาะเกินกำหนด" />);
        await user.tab();
        await user.keyboard('{Enter}');
        expect(onChange).toHaveBeenCalledWith(false);
    });
});
```

- [ ] **Step 2: รันแล้วต้องแดง**

Run: `npm run test -- ToggleChip`
Expected: FAIL — resolve import ไม่ได้

- [ ] **Step 3: เขียน `components/ui/ToggleChip.tsx`**

```tsx
import React from 'react';
import type { LucideIcon } from 'lucide-react';

export interface ToggleChipProps {
    pressed: boolean;
    onChange: (pressed: boolean) => void;
    label: string;
    icon?: LucideIcon;
    /** `critical` สำหรับตัวกรองที่คัดเอาเฉพาะสิ่งที่ต้องรีบจัดการ */
    tone?: 'brand' | 'critical';
    className?: string;
}

// `<button aria-pressed>` จริง ของเดิมใน InventoryFilters.tsx เป็นปุ่มที่วาดวงกลมเปล่า
// กับไอคอนติ๊กสลับกันเอง -- ตาเห็นว่าเป็นสวิตช์ แต่ screen reader ได้ยินแค่ปุ่มธรรมดา
// ที่ป้ายไม่เคยเปลี่ยน จึงไม่มีทางรู้ว่าตัวกรองเปิดอยู่หรือไม่
const TONE_ON: Record<'brand' | 'critical', string> = {
    brand: 'border-brand-200 bg-brand-50 text-brand-700',
    critical: 'border-red-200 bg-red-50 text-red-700',
};

export const ToggleChip: React.FC<ToggleChipProps> = ({
    pressed,
    onChange,
    label,
    icon: Icon,
    tone = 'brand',
    className = '',
}) => (
    <button
        type="button"
        aria-pressed={pressed}
        onClick={() => onChange(!pressed)}
        className={
            'inline-flex min-h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl ' +
            'border px-3 py-2 text-sm font-semibold leading-snug transition duration-200 ' +
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ' +
            (pressed
                ? TONE_ON[tone]
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50') +
            ` ${className}`
        }
    >
        {Icon && <Icon size={16} aria-hidden="true" />}
        {label}
    </button>
);
```

- [ ] **Step 4: รันแล้วต้องเขียว**

Run: `npm run test -- ToggleChip`
Expected: PASS 3/3

- [ ] **Step 5: เขียน `components/ui/SearchInput.tsx`**

```tsx
import React from 'react';
import { Search, X } from 'lucide-react';

export interface SearchInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    ariaLabel: string;
    /** aria-label ของปุ่มล้าง อ่านออกเสียง จึงไม่ใช่ตัวเดียวกับ placeholder */
    clearLabel: string;
    id?: string;
    name?: string;
    className?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
    value,
    onChange,
    placeholder,
    ariaLabel,
    clearLabel,
    id,
    name,
    className = '',
}) => (
    <div className={`relative w-full ${className}`}>
        <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
        />
        <input
            id={id}
            name={name}
            type="text"
            aria-label={ariaLabel}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            // pr-9 เผื่อปุ่มล้าง ไว้ตลอดแม้ตอนไม่มีปุ่ม ไม่งั้นข้อความจะขยับตอนพิมพ์
            // ตัวแรกซึ่งเป็นจังหวะที่สายตากำลังจับอยู่ที่ข้อความพอดี
            className={
                'min-h-10 w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-9 ' +
                'text-sm text-slate-900 placeholder:text-slate-400 transition ' +
                'focus:border-brand-300 focus:outline-2 focus:outline-offset-0 focus:outline-brand-500'
            }
        />
        {value && (
            <button
                type="button"
                onClick={() => onChange('')}
                aria-label={clearLabel}
                className={
                    'absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 ' +
                    'transition hover:bg-slate-100 hover:text-slate-600 ' +
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500'
                }
            >
                <X size={14} aria-hidden="true" />
            </button>
        )}
    </div>
);
```

- [ ] **Step 6: เขียน `components/ui/SelectField.tsx`**

```tsx
import React from 'react';
import { ChevronDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface SelectFieldOption {
    value: string;
    label: string;
}

export interface SelectFieldProps {
    value: string;
    onChange: (value: string) => void;
    options: readonly SelectFieldOption[];
    ariaLabel: string;
    icon?: LucideIcon;
    id?: string;
    name?: string;
    /** ความกว้าง เช่น 'sm:w-48' — ตัว field เองไม่กำหนดความกว้าง */
    className?: string;
}

// chevron อยู่ในตัว ของเดิมทั้ง 7 ที่ในโฟลเดอร์ admin วาดเองด้วย
// `<ChevronRight className="rotate-90" />` ซึ่งเป็นไอคอนผิดตัวที่ถูกหมุนให้ดูถูก
export const SelectField: React.FC<SelectFieldProps> = ({
    value,
    onChange,
    options,
    ariaLabel,
    icon: Icon,
    id,
    name,
    className = '',
}) => (
    <div className={`relative w-full ${className}`}>
        {Icon && (
            <Icon
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
            />
        )}
        <select
            id={id}
            name={name}
            aria-label={ariaLabel}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={
                'min-h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white py-2 ' +
                `${Icon ? 'pl-9' : 'pl-3'} pr-9 text-sm text-slate-900 transition ` +
                'focus:border-brand-300 focus:outline-2 focus:outline-offset-0 focus:outline-brand-500'
            }
        >
            {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                    {opt.label}
                </option>
            ))}
        </select>
        <ChevronDown
            size={14}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
        />
    </div>
);
```

- [ ] **Step 7: typecheck + test**

Run: `npm run typecheck && npm run test`
Expected: ผ่านทั้งคู่

- [ ] **Step 8: commit**

```bash
git add components/ui/ToggleChip.tsx components/ui/ToggleChip.test.tsx components/ui/SearchInput.tsx components/ui/SelectField.tsx
git commit -m "feat(ui): add ToggleChip, SearchInput and SelectField primitives"
```

---

## Task 1.4: `DateRangeField`

**Files:**
- Create: `components/ui/DateRangeField.tsx`

**Interfaces:**
- Consumes: ไม่มี
- Produces:
  ```ts
  export interface DateRange { start: string; end: string }
  export interface DateRangeFieldProps {
      value: DateRange;
      onChange: (range: DateRange) => void;
      startLabel: string;
      endLabel: string;
      clearLabel: string;
      idPrefix?: string;
      className?: string;
  }
  export const DateRangeField: React.FC<DateRangeFieldProps>;
  ```

- [ ] **Step 1: เขียน `components/ui/DateRangeField.tsx`**

```tsx
import React from 'react';
import { Calendar, ChevronDown, X } from 'lucide-react';

export interface DateRange {
    start: string;
    end: string;
}

export interface DateRangeFieldProps {
    value: DateRange;
    onChange: (range: DateRange) => void;
    startLabel: string;
    endLabel: string;
    clearLabel: string;
    idPrefix?: string;
    className?: string;
}

// `<input type="date">` โปร่งใสวางทับ `<input type="text">` ที่แสดงวันที่รูปแบบ
// DD/MM/YYYY -- เพราะเบราว์เซอร์แต่ละตัวจัดรูปแบบและวางไอคอนปฏิทินของ input วันที่
// ไม่เหมือนกันเลย และสั่งด้วย CSS ไม่ได้ นี่เป็นวิธีเดียวที่ทำให้ทุกเบราว์เซอร์
// แสดงวันที่ในรูปแบบเดียวกับที่ formatDate ใช้ทั้งแอป
//
// input ตัวบนได้ tabIndex={-1} และ aria-hidden: มันคือของตกแต่ง ไม่ใช่ช่องกรอก
// ของเดิมทั้งใน InventoryFilters และ TransactionFilters ไม่มีสองอย่างนี้ ทำให้แท็บ
// ไปหยุดที่ช่องที่อ่านออกเสียงแล้วไม่ได้อะไรเลย แล้วต้องแท็บอีกทีถึงจะถึงตัวจริง
const DateCell: React.FC<{
    id?: string;
    label: string;
    value: string;
    onChange: (next: string) => void;
}> = ({ id, label, value, onChange }) => (
    <div className="group/date relative w-28">
        <input
            type="text"
            readOnly
            tabIndex={-1}
            aria-hidden="true"
            placeholder={label}
            value={value ? value.split('-').reverse().join('/') : ''}
            className="w-full cursor-pointer bg-transparent pr-4 text-left text-sm text-slate-700 outline-none placeholder:text-slate-400"
        />
        <ChevronDown
            size={14}
            className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-hover/date:text-brand-500"
            aria-hidden="true"
        />
        <input
            id={id}
            type="date"
            aria-label={label}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
        />
    </div>
);

export const DateRangeField: React.FC<DateRangeFieldProps> = ({
    value,
    onChange,
    startLabel,
    endLabel,
    clearLabel,
    idPrefix = 'date-range',
    className = '',
}) => (
    <div
        className={
            'flex min-h-10 w-full items-center justify-between gap-2 rounded-xl border ' +
            `border-slate-200 bg-slate-50 px-2 py-1.5 sm:w-auto sm:justify-start ${className}`
        }
    >
        <Calendar size={16} className="shrink-0 text-slate-400" aria-hidden="true" />
        <div className="flex items-center gap-1">
            <DateCell
                id={`${idPrefix}-start`}
                label={startLabel}
                value={value.start}
                onChange={(start) => onChange({ ...value, start })}
            />
            <span className="text-slate-300" aria-hidden="true">
                -
            </span>
            <DateCell
                id={`${idPrefix}-end`}
                label={endLabel}
                value={value.end}
                onChange={(end) => onChange({ ...value, end })}
            />
        </div>
        {(value.start || value.end) && (
            <button
                type="button"
                onClick={() => onChange({ start: '', end: '' })}
                aria-label={clearLabel}
                className="rounded-full p-1 text-slate-400 transition hover:bg-slate-200 hover:text-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
            >
                <X size={14} aria-hidden="true" />
            </button>
        )}
    </div>
);
```

- [ ] **Step 2: typecheck**

Run: `npm run typecheck`
Expected: ไม่มี error

- [ ] **Step 3: commit**

```bash
git add components/ui/DateRangeField.tsx
git commit -m "feat(ui): add DateRangeField primitive"
```

---

# Wave 2 — primitive ที่พึ่ง Wave 1

## Task 2.1: `Menu` (มีเทสต์)

**Files:**
- Create: `components/ui/Menu.tsx`
- Create: `components/ui/Menu.test.tsx`

**Interfaces:**
- Consumes: `BUTTON_BASE`, `BUTTON_SIZE`, `BUTTON_VARIANT`, `ButtonVariant` จาก `./Button` (Task 1.1)
- Produces:
  ```ts
  export type MenuTone = 'brand' | 'accent' | 'neutral' | 'danger';
  export interface MenuItem {
      label: string;
      icon?: LucideIcon;
      tone?: MenuTone;      // default 'neutral'
      onClick: () => void;
  }
  export interface MenuProps {
      label: string;
      items: readonly MenuItem[];
      icon?: LucideIcon;
      iconOnly?: boolean;        // ใช้ label เป็น aria-label แทนข้อความในปุ่ม
      align?: 'left' | 'right';  // default 'right'
      variant?: ButtonVariant;   // default 'primary'
      openUpward?: boolean;      // default false
      disabled?: boolean;
  }
  export const Menu: React.FC<MenuProps>;
  ```

**ที่มา:** ตรรกะทั้งหมดยกมาจาก `components/admin/dashboard/sections/PageHeader.tsx:71-171`
ห้ามเขียนใหม่จากศูนย์ ให้เปิดไฟล์นั้นอ่านแล้วย้ายมา รวมคอมเมนต์ที่อธิบายว่าทำไมถึงต้องมี
แต่ละอย่าง — ไฟล์นั้นบันทึกไว้ว่าเวอร์ชันก่อนหน้ามันเป็น div ที่ไม่มี `aria-expanded`
ไม่มี Escape และไม่คืนโฟกัส

- [ ] **Step 1: เขียนเทสต์ที่ต้องแดงก่อน — `components/ui/Menu.test.tsx`**

```tsx
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Menu } from './Menu';

const items = [
    { label: 'อย่างแรก', onClick: vi.fn() },
    { label: 'อย่างที่สอง', onClick: vi.fn() },
    { label: 'อย่างที่สาม', onClick: vi.fn() },
];

describe('Menu', () => {
    it('ปุ่มประกาศสถานะเปิด/ปิดผ่าน aria-expanded', async () => {
        const user = userEvent.setup();
        render(<Menu label="ส่งออก" items={items} />);
        const trigger = screen.getByRole('button', { name: /ส่งออก/ });
        expect(trigger.getAttribute('aria-expanded')).toBe('false');
        await user.click(trigger);
        expect(trigger.getAttribute('aria-expanded')).toBe('true');
    });

    it('โฟกัสตกที่รายการแรกตอนเปิด', async () => {
        const user = userEvent.setup();
        render(<Menu label="ส่งออก" items={items} />);
        await user.click(screen.getByRole('button', { name: /ส่งออก/ }));
        expect(document.activeElement?.textContent).toContain('อย่างแรก');
    });

    it('ลูกศรลงเดินลง และวนกลับไปรายการแรกจากรายการสุดท้าย', async () => {
        const user = userEvent.setup();
        render(<Menu label="ส่งออก" items={items} />);
        await user.click(screen.getByRole('button', { name: /ส่งออก/ }));
        await user.keyboard('{ArrowDown}');
        expect(document.activeElement?.textContent).toContain('อย่างที่สอง');
        await user.keyboard('{ArrowDown}{ArrowDown}');
        expect(document.activeElement?.textContent).toContain('อย่างแรก');
    });

    it('End ไปรายการสุดท้าย Home กลับรายการแรก', async () => {
        const user = userEvent.setup();
        render(<Menu label="ส่งออก" items={items} />);
        await user.click(screen.getByRole('button', { name: /ส่งออก/ }));
        await user.keyboard('{End}');
        expect(document.activeElement?.textContent).toContain('อย่างที่สาม');
        await user.keyboard('{Home}');
        expect(document.activeElement?.textContent).toContain('อย่างแรก');
    });

    it('Escape ปิดเมนูแล้วคืนโฟกัสให้ปุ่ม', async () => {
        const user = userEvent.setup();
        render(<Menu label="ส่งออก" items={items} />);
        const trigger = screen.getByRole('button', { name: /ส่งออก/ });
        await user.click(trigger);
        await user.keyboard('{Escape}');
        expect(screen.queryByRole('menu')).toBeNull();
        expect(document.activeElement).toBe(trigger);
    });

    it('เลือกรายการแล้วเรียก onClick และปิดเมนู', async () => {
        const onClick = vi.fn();
        const user = userEvent.setup();
        render(<Menu label="ส่งออก" items={[{ label: 'อย่างแรก', onClick }]} />);
        await user.click(screen.getByRole('button', { name: /ส่งออก/ }));
        await user.click(screen.getByRole('menuitem', { name: 'อย่างแรก' }));
        expect(onClick).toHaveBeenCalledTimes(1);
        expect(screen.queryByRole('menu')).toBeNull();
    });

    it('คลิกนอกเมนูแล้วปิด', async () => {
        const user = userEvent.setup();
        render(
            <div>
                <button type="button">ข้างนอก</button>
                <Menu label="ส่งออก" items={items} />
            </div>,
        );
        await user.click(screen.getByRole('button', { name: /ส่งออก/ }));
        expect(screen.getByRole('menu')).toBeTruthy();
        await user.click(screen.getByRole('button', { name: 'ข้างนอก' }));
        expect(screen.queryByRole('menu')).toBeNull();
    });

    it('ลูกศรลงที่ปุ่มตอนเมนูปิดอยู่ = เปิดเมนู', async () => {
        const user = userEvent.setup();
        render(<Menu label="ส่งออก" items={items} />);
        const trigger = screen.getByRole('button', { name: /ส่งออก/ });
        trigger.focus();
        await user.keyboard('{ArrowDown}');
        expect(screen.getByRole('menu')).toBeTruthy();
    });

    it('iconOnly ใช้ label เป็นชื่อที่อ่านออกเสียงแทนข้อความในปุ่ม', () => {
        render(<Menu label="การทำงานอื่น" iconOnly items={items} />);
        const trigger = screen.getByRole('button', { name: 'การทำงานอื่น' });
        expect(trigger.textContent).toBe('');
    });
});
```

- [ ] **Step 2: รันแล้วต้องแดง**

Run: `npm run test -- Menu`
Expected: FAIL — resolve import ไม่ได้

- [ ] **Step 3: เขียน `components/ui/Menu.tsx`**

ย้ายตรรกะจาก `PageHeader.tsx:71-171` มาให้ครบทุกข้อ:

| ต้องมี | ทำไม |
|---|---|
| `aria-haspopup="menu"` / `aria-expanded` / `aria-controls` | เวอร์ชันก่อนหน้าเป็น div เปล่า screen reader ประกาศปุ่มที่กดแล้วเหมือนไม่มีอะไรเกิดขึ้น |
| ผูก listener เฉพาะตอนเมนูเปิด | handler บน `document` ที่อยู่ตลอดอายุหน้าจะทำงานทุกครั้งที่พิมพ์ในทุกช่องของหน้า |
| ปิดเมื่อคลิกนอก ผูก **`mousedown` ไม่ใช่ `click`** | คลิกที่เริ่มนอกเมนูแล้วปล่อยบนเมนูจะถูกนับเป็นคลิกนอกและปิดเมนูทิ้ง |
| Escape ปิด + คืนโฟกัสให้ปุ่ม | ไม่งั้นทางออกเดียวคือเอาเมาส์ไปคลิกที่อื่น และโฟกัสคีย์บอร์ดค้างอยู่บน node ที่เพิ่ง unmount |
| โฟกัสรายการแรกตอนเปิด | เป็นสิ่งเดียวที่ทำให้เมนูนี้เข้าถึงได้จากคีย์บอร์ด |
| ลูกศรขึ้น/ลง วนรอบ, Home, End | |
| Tab = ปิดโดยไม่ดึงโฟกัสกลับ | โฟกัสกำลังเดินทางไปที่อื่นด้วยตัวมันเองอยู่แล้ว |
| ลูกศรลงที่ปุ่มตอนปิด = เปิด | |
| `max-w-[calc(100vw-2rem)]` บนแผง | เมนูชิดขวาของปุ่มที่อยู่ใกล้ขอบจอ ถ้ากว้างคงที่จะล้นออกนอกจอเมื่อป้ายไทยดันให้กว้างขึ้น |

โครงที่เพิ่มจากของเดิม:

```tsx
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

const PANEL =
    'absolute z-30 w-64 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 ' +
    'bg-white p-1.5 shadow-[0_24px_60px_-32px_rgba(15,42,82,0.45)] animate-pop-in';
```

- รายการ tone `danger` ได้ `text-red-700 hover:bg-red-50` ส่วนที่เหลือ `text-slate-700 hover:bg-slate-50`
- `openUpward` → `bottom-full mb-2` แทน `top-full mt-2`
- `align` → `right-0` หรือ `left-0`
- ปุ่มใช้ `` `${BUTTON_BASE} ${BUTTON_SIZE.md} ${BUTTON_VARIANT[variant]}` `` และมี `ChevronDown`
  ที่หมุน 180° ตอนเปิด **เฉพาะเมื่อ `iconOnly` เป็น false** (ปุ่ม ⋯ ไม่ควรมี chevron)
- `iconOnly` → ปุ่มได้ `aria-label={label}` และ `px-2.5` แทน `px-3.5` ไม่มี children

- [ ] **Step 4: รันแล้วต้องเขียว**

Run: `npm run test -- Menu`
Expected: PASS 9/9

- [ ] **Step 5: typecheck + commit**

```bash
npm run typecheck
git add components/ui/Menu.tsx components/ui/Menu.test.tsx
git commit -m "feat(ui): extract accessible Menu primitive from dashboard header"
```

---

## Task 2.2: `DataTable` + `SortableTh` (มีเทสต์)

**Files:**
- Create: `components/ui/DataTable.tsx`
- Create: `components/ui/DataTable.test.tsx`

**Interfaces:**
- Consumes: `CARD_SHELL` จาก `./Card`, `SkeletonRows` จาก `./Skeleton` (มีอยู่แล้วทั้งคู่)
- Produces:
  ```ts
  export interface SortState<K extends string> { key: K; direction: 'asc' | 'desc' }
  export interface SortableThProps<K extends string> {
      label: string;
      sortKey?: K;
      sortConfig: SortState<K> | null;
      onSort?: (key: K) => void;
      align?: 'left' | 'right' | 'center';   // default 'left'
      className?: string;
  }
  export function SortableTh<K extends string>(props: SortableThProps<K>): React.ReactElement;

  export interface DataTableProps {
      head: React.ReactNode;
      children: React.ReactNode;
      footer?: React.ReactNode;
      caption?: string;
      isLoading?: boolean;
      isEmpty?: boolean;
      empty?: React.ReactNode;
      loadingRows?: number;    // default 8
      loadingCols?: number;    // default 5
      loadingLabel?: string;
      minWidth?: number;
  }
  export const DataTable: React.FC<DataTableProps>;
  ```

- [ ] **Step 1: เขียนเทสต์ที่ต้องแดงก่อน — `components/ui/DataTable.test.tsx`**

```tsx
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataTable, SortableTh } from './DataTable';

type Key = 'name' | 'count';

const renderTh = (props: Partial<React.ComponentProps<typeof SortableTh<Key>>> = {}) =>
    render(
        <table>
            <thead>
                <tr>
                    <SortableTh<Key>
                        label="ชื่อ"
                        sortKey="name"
                        sortConfig={null}
                        onSort={() => {}}
                        {...props}
                    />
                </tr>
            </thead>
        </table>,
    );

describe('SortableTh', () => {
    it('ไม่มี aria-sort เมื่อคอลัมน์นี้ไม่ได้ถูกเรียง', () => {
        renderTh();
        expect(screen.getByRole('columnheader').getAttribute('aria-sort')).toBeNull();
    });

    it('aria-sort เป็น ascending / descending ตามทิศทาง', () => {
        const { unmount } = renderTh({ sortConfig: { key: 'name', direction: 'asc' } });
        expect(screen.getByRole('columnheader').getAttribute('aria-sort')).toBe('ascending');
        unmount();
        renderTh({ sortConfig: { key: 'name', direction: 'desc' } });
        expect(screen.getByRole('columnheader').getAttribute('aria-sort')).toBe('descending');
    });

    it('คอลัมน์อื่นถูกเรียงอยู่ ไม่ทำให้คอลัมน์นี้มี aria-sort', () => {
        renderTh({ sortConfig: { key: 'count', direction: 'asc' } });
        expect(screen.getByRole('columnheader').getAttribute('aria-sort')).toBeNull();
    });

    it('คอลัมน์ที่ไม่มี sortKey ไม่เป็นปุ่ม', () => {
        renderTh({ sortKey: undefined, label: 'จัดการ' });
        expect(screen.queryByRole('button')).toBeNull();
        expect(screen.getByRole('columnheader').textContent).toBe('จัดการ');
    });

    it('กดหัวคอลัมน์ด้วยคีย์บอร์ดแล้วเรียกร้อง onSort พร้อม key', async () => {
        const onSort = vi.fn();
        const user = userEvent.setup();
        renderTh({ onSort });
        await user.tab();
        await user.keyboard('{Enter}');
        expect(onSort).toHaveBeenCalledWith('name');
    });
});

describe('DataTable', () => {
    const head = (
        <tr>
            <th scope="col">ชื่อ</th>
        </tr>
    );
    const body = (
        <tbody>
            <tr>
                <td>แถวจริง</td>
            </tr>
        </tbody>
    );

    it('แสดง skeleton แทนตารางตอนโหลด และไม่แสดงสถานะว่าง', () => {
        render(
            <DataTable
                head={head}
                isLoading
                isEmpty
                empty={<p>ไม่พบข้อมูล</p>}
                loadingLabel="กำลังโหลด"
            >
                {body}
            </DataTable>,
        );
        expect(screen.getByRole('status', { name: 'กำลังโหลด' })).toBeTruthy();
        expect(screen.queryByText('ไม่พบข้อมูล')).toBeNull();
        expect(screen.queryByText('แถวจริง')).toBeNull();
    });

    it('แสดงสถานะว่างเมื่อไม่ได้โหลดและไม่มีข้อมูล', () => {
        render(
            <DataTable head={head} isEmpty empty={<p>ไม่พบข้อมูล</p>}>
                {body}
            </DataTable>,
        );
        expect(screen.getByText('ไม่พบข้อมูล')).toBeTruthy();
        expect(screen.queryByText('แถวจริง')).toBeNull();
    });

    it('แสดงตารางกับ footer เมื่อมีข้อมูล', () => {
        render(
            <DataTable head={head} footer={<nav aria-label="หน้า" />}>
                {body}
            </DataTable>,
        );
        expect(screen.getByText('แถวจริง')).toBeTruthy();
        expect(screen.getByRole('navigation', { name: 'หน้า' })).toBeTruthy();
    });
});
```

- [ ] **Step 2: รันแล้วต้องแดง**

Run: `npm run test -- DataTable`
Expected: FAIL — resolve import ไม่ได้

- [ ] **Step 3: เขียน `components/ui/DataTable.tsx`**

```tsx
import React from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { CARD_SHELL } from './Card';
import { SkeletonRows } from './Skeleton';

export interface SortState<K extends string> {
    key: K;
    direction: 'asc' | 'desc';
}

export interface SortableThProps<K extends string> {
    label: string;
    /** ไม่ส่ง = คอลัมน์ที่เรียงไม่ได้ จะไม่เป็นปุ่มและไม่ขึ้นมือชี้ */
    sortKey?: K;
    sortConfig: SortState<K> | null;
    onSort?: (key: K) => void;
    align?: 'left' | 'right' | 'center';
    /** สำหรับซ่อนตามความกว้าง เช่น 'hidden xl:table-cell' */
    className?: string;
}

const ALIGN = { left: 'text-left', right: 'text-right', center: 'text-center' } as const;
const JUSTIFY = { left: 'justify-start', right: 'justify-end', center: 'justify-center' } as const;

// font-bold (700) ใช้ที่นี่ที่เดียวในระบบ: มันเป็นน้ำหนักหนักสุดที่ Google Fonts
// ส่งมาจริงสำหรับทั้ง Inter และ Noto Sans Thai อะไรที่หนักกว่านี้ถูกสังเคราะห์
//
// ไม่มี uppercase และไม่มี tracking ค่าบวก ทั้งคู่เป็น regression ที่เห็นเฉพาะ
// ภาษาเดียว -- uppercase ไม่มีผลกับไทย ส่วน tracking บวกดันวรรณยุกต์ออกจากตัวอักษร
const TH_BASE = 'border-b border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-600';

export function SortableTh<K extends string>({
    label,
    sortKey,
    sortConfig,
    onSort,
    align = 'left',
    className = '',
}: SortableThProps<K>) {
    const isSorted = sortKey !== undefined && sortConfig?.key === sortKey;
    const cellClass = `${TH_BASE} ${ALIGN[align]} ${className}`;

    // คอลัมน์ที่เรียงไม่ได้ออกมาเป็น <th> เปล่า ของเดิมทั้ง 4 ตารางใส่ cursor-pointer
    // ไว้กับหัวคอลัมน์ทุกอันรวมถึง "จัดการ" ซึ่งกดแล้วไม่มีอะไรเกิดขึ้น
    if (sortKey === undefined || !onSort) {
        return (
            <th scope="col" className={cellClass}>
                {label}
            </th>
        );
    }

    const Icon = isSorted ? (sortConfig!.direction === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;

    return (
        <th
            scope="col"
            // aria-sort อยู่บน <th> ไม่ใช่บนปุ่ม -- มันบรรยายคอลัมน์ ไม่ใช่ตัวควบคุม
            aria-sort={
                isSorted ? (sortConfig!.direction === 'asc' ? 'ascending' : 'descending') : undefined
            }
            className={cellClass}
        >
            {/* <button> จริง ของเดิมผูก onClick ไว้กับ <th> เอง ทำให้เรียงลำดับได้
                ด้วยเมาส์อย่างเดียว คีย์บอร์ดไปไม่ถึง */}
            <button
                type="button"
                onClick={() => onSort(sortKey)}
                className={
                    `flex w-full items-center gap-1.5 ${JUSTIFY[align]} rounded-md transition ` +
                    'hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 ' +
                    'focus-visible:outline-brand-500'
                }
            >
                {label}
                <Icon
                    size={14}
                    className={isSorted ? 'text-brand-600' : 'text-slate-300'}
                    aria-hidden="true"
                />
            </button>
        </th>
    );
}

export interface DataTableProps {
    head: React.ReactNode;
    children: React.ReactNode;
    footer?: React.ReactNode;
    caption?: string;
    isLoading?: boolean;
    isEmpty?: boolean;
    empty?: React.ReactNode;
    loadingRows?: number;
    loadingCols?: number;
    loadingLabel?: string;
    /** px ใช้ต่ำกว่า xl ที่ตารางเลื่อนซ้ายขวา */
    minWidth?: number;
}

// `overflow-clip` ไม่ใช่ `overflow-hidden` และนี่คือหัวใจของไฟล์นี้:
// `overflow: hidden` สร้าง scroll container ขึ้นมา ทำให้ `position: sticky` ข้างใน
// ไปเกาะกับกล่องนั้นแทนที่จะเกาะ viewport -- และกล่องนั้นไม่มีความสูงจำกัด
// หัวตารางจึงไม่มีวันเกาะได้เลย ส่วน `overflow: clip` ตัดขอบมนให้เหมือนกันทุกอย่าง
// แต่ไม่สร้าง scroll container
//
// ชั้นในเป็น `overflow-x-auto xl:overflow-visible` ด้วยเหตุผลเดียวกัน: ต่ำกว่า xl
// เราต้องการเลื่อนซ้ายขวาจริง ๆ จึงยอมเสียหัวเกาะไป ที่ xl ขึ้นไปไม่มี scroll
// container เหลืออยู่เลย หัวตารางจึงเกาะ viewport ได้
//
// เลือก xl (1280px) ไม่ใช่ lg เพราะที่ 1024px คอลัมน์เนื้อหาเหลือราว 640px
// (sidebar 256 + padding 64) ซึ่งไม่พอให้ตาราง 8 คอลัมน์กางโดยไม่ล้น และ xl
// ยังอยู่เหนือจุดที่ header ของแอปเลิกเกาะพอดี จึงใช้ top-0 ได้ตรง ๆ
export const DataTable: React.FC<DataTableProps> = ({
    head,
    children,
    footer,
    caption,
    isLoading = false,
    isEmpty = false,
    empty,
    loadingRows = 8,
    loadingCols = 5,
    loadingLabel,
    minWidth,
}) => {
    // ลำดับสำคัญ: กำลังโหลดมาก่อนว่างเปล่าเสมอ ชุดข้อมูลที่ยังมาไม่ถึงไม่ใช่
    // ชุดข้อมูลที่ว่าง -- นี่คือบั๊กที่หน้าคลังพาเลทขึ้นว่า "ไม่พบพาเลท"
    // ระหว่างที่การดึงข้อมูลครั้งแรกยังไม่เสร็จ
    if (isLoading) {
        return (
            <div className={`${CARD_SHELL} overflow-clip p-4`}>
                <SkeletonRows rows={loadingRows} cols={loadingCols} ariaLabel={loadingLabel} />
            </div>
        );
    }

    if (isEmpty) {
        return <div className={`${CARD_SHELL} overflow-clip p-4`}>{empty}</div>;
    }

    return (
        <div className={`${CARD_SHELL} overflow-clip`}>
            <div className="overflow-x-auto styled-scrollbar xl:overflow-visible">
                <table
                    className="w-full border-collapse text-left"
                    // ค่าจาก runtime ต้องผ่าน style เสมอ คลาสที่ประกอบตอนรันไทม์
                    // คอมไพล์ออกมาเป็นศูนย์เงียบ ๆ
                    style={minWidth ? { minWidth } : undefined}
                >
                    {caption && <caption className="sr-only">{caption}</caption>}
                    <thead className="bg-slate-50 text-slate-500 xl:sticky xl:top-0 xl:z-10">
                        {head}
                    </thead>
                    {children}
                </table>
            </div>
            {footer}
        </div>
    );
};
```

- [ ] **Step 4: รันแล้วต้องเขียว**

Run: `npm run test -- DataTable`
Expected: PASS 8/8

- [ ] **Step 5: typecheck + commit**

```bash
npm run typecheck
git add components/ui/DataTable.tsx components/ui/DataTable.test.tsx
git commit -m "feat(ui): add DataTable shell and accessible SortableTh"
```

---

## Task 2.3: `FilterBar` + `PageHeader` + `SelectionBar` (SelectionBar มีเทสต์)

**Files:**
- Create: `components/ui/FilterBar.tsx`
- Create: `components/ui/PageHeader.tsx`
- Create: `components/ui/SelectionBar.tsx`
- Create: `components/ui/SelectionBar.test.tsx`

**Interfaces:**
- Consumes: `CARD_SHELL` จาก `./Card`
- Produces:
  ```ts
  export interface FilterBarProps {
      children: React.ReactNode;
      resultLabel?: string;
      onClear?: () => void;
      clearLabel?: string;
      isFiltered?: boolean;   // default false
  }
  export const FilterBar: React.FC<FilterBarProps>;

  export interface PageHeaderProps {
      title: string;
      subtitle?: string;
      icon?: LucideIcon;
      actions?: React.ReactNode;
      actionsBusy?: boolean;
  }
  export const PageHeader: React.FC<PageHeaderProps>;

  export interface SelectionBarProps {
      count: number;
      countLabel: string;
      onClear: () => void;
      clearLabel: string;
      actions?: React.ReactNode;
      menu?: React.ReactNode;
      detail?: React.ReactNode;
  }
  export const SelectionBar: React.FC<SelectionBarProps>;
  ```

- [ ] **Step 1: เขียนเทสต์ที่ต้องแดงก่อน — `components/ui/SelectionBar.test.tsx`**

```tsx
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SelectionBar } from './SelectionBar';

describe('SelectionBar', () => {
    it('ไม่เรนเดอร์อะไรเลยเมื่อยังไม่ได้เลือกอะไร', () => {
        const { container } = render(
            <SelectionBar count={0} countLabel="เลือกไว้ 0" onClear={() => {}} clearLabel="ยกเลิก" />,
        );
        expect(container.firstChild).toBeNull();
    });

    it('แสดงจำนวนที่เลือกและปุ่มยกเลิก', () => {
        render(
            <SelectionBar count={3} countLabel="เลือกไว้ 3 รายการ" onClear={() => {}} clearLabel="ยกเลิก" />,
        );
        expect(screen.getByText('เลือกไว้ 3 รายการ')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'ยกเลิก' })).toBeTruthy();
    });

    it('Escape ล้างการเลือก', async () => {
        const onClear = vi.fn();
        const user = userEvent.setup();
        render(
            <SelectionBar count={2} countLabel="เลือกไว้ 2 รายการ" onClear={onClear} clearLabel="ยกเลิก" />,
        );
        await user.keyboard('{Escape}');
        expect(onClear).toHaveBeenCalledTimes(1);
    });

    it('ไม่ผูก Escape ไว้เมื่อยังไม่ได้เลือกอะไร', async () => {
        const onClear = vi.fn();
        const user = userEvent.setup();
        render(
            <SelectionBar count={0} countLabel="เลือกไว้ 0" onClear={onClear} clearLabel="ยกเลิก" />,
        );
        await user.keyboard('{Escape}');
        expect(onClear).not.toHaveBeenCalled();
    });
});
```

- [ ] **Step 2: รันแล้วต้องแดง**

Run: `npm run test -- SelectionBar`
Expected: FAIL — resolve import ไม่ได้

- [ ] **Step 3: เขียน `components/ui/SelectionBar.tsx`**

```tsx
import React, { useEffect } from 'react';

export interface SelectionBarProps {
    /** 0 = ไม่เรนเดอร์อะไรเลย และไม่ผูก listener ใด ๆ */
    count: number;
    countLabel: string;
    onClear: () => void;
    clearLabel: string;
    actions?: React.ReactNode;
    menu?: React.ReactNode;
    /** แผงเสริมเหนือแถบ เช่น รายการรหัสที่เลือกไว้ */
    detail?: React.ReactNode;
}

// แถบลอยติดขอบล่างจอ แทนที่แถบเดิมที่เข้าไปแทนที่หัวเพจทั้งแถบ:
// แบบเดิมพอเลื่อนลงไปติ๊กแถวล่าง ๆ ตัวแถบอยู่นอกจอ มองไม่เห็นว่าเลือกไปกี่ตัว
// และกดปุ่มไม่ได้จนกว่าจะเลื่อนกลับขึ้นไป -- ทั้งที่นั่นคือจังหวะที่ต้องใช้มันที่สุด
//
// lg:pl-[calc(16rem+1rem)] หลบ sidebar ซึ่งเป็น `fixed w-64` ไม่ใช่ส่วนหนึ่งของ
// การไหลของหน้า ถ้าไม่หลบ แถบจะโผล่อยู่ใต้ sidebar
//
// z-20 จงใจให้ต่ำ: overlay ของเมนูมือถืออยู่ z-30, sidebar z-40 และโมดัลทุกตัว
// z-50 ขึ้นไป แถบนี้ต้องอยู่ใต้ทุกอันนั้น
//
// print:hidden เพราะ element ที่เป็น fixed จะถูกพิมพ์ทับลงบนกระดาษทุกหน้า
// index.css จัดการ .sticky ไว้แล้วตอนพิมพ์ แต่ไม่ครอบ fixed
export const SelectionBar: React.FC<SelectionBarProps> = ({
    count,
    countLabel,
    onClear,
    clearLabel,
    actions,
    menu,
    detail,
}) => {
    const active = count > 0;

    useEffect(() => {
        if (!active) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onClear();
            }
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [active, onClear]);

    if (!active) return null;

    return (
        <div className="fixed inset-x-0 bottom-0 z-20 px-4 pb-4 lg:pl-[calc(16rem+1rem)] print:hidden">
            <div className="mx-auto flex max-w-4xl flex-col gap-2">
                {detail}
                <div
                    className={
                        'flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-brand-900 ' +
                        'px-3 py-2.5 shadow-[0_24px_60px_-24px_rgba(15,42,82,0.8)] animate-surface-in'
                    }
                >
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{countLabel}</span>
                        <button
                            type="button"
                            onClick={onClear}
                            className={
                                'rounded-lg px-2 py-1 text-sm font-medium text-white/70 transition ' +
                                'hover:bg-white/10 hover:text-white focus-visible:outline-2 ' +
                                'focus-visible:outline-offset-2 focus-visible:outline-white'
                            }
                        >
                            {clearLabel}
                        </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {actions}
                        {menu}
                    </div>
                </div>
            </div>
        </div>
    );
};
```

- [ ] **Step 4: รันแล้วต้องเขียว**

Run: `npm run test -- SelectionBar`
Expected: PASS 4/4

- [ ] **Step 5: เขียน `components/ui/PageHeader.tsx`**

```tsx
import React from 'react';
import type { LucideIcon } from 'lucide-react';

export interface PageHeaderProps {
    title: string;
    subtitle?: string;
    icon?: LucideIcon;
    actions?: React.ReactNode;
    /** ตั้ง aria-busy บนกลุ่มปุ่มระหว่างที่คำสั่งกำลังทำงาน */
    actionsBusy?: boolean;
}

// <h1> เสมอ: นี่คือหน้า ส่วนการ์ดข้างในเป็น h2/h3 ผ่าน SectionHeader
// อีก 4 หน้าของแอดมินใช้ <h2> เป็นหัวเพจ ซึ่งทำให้ทุกหน้าไม่มี h1 เลย
//
// items-start ไม่ใช่ items-center: หัวเรื่องภาษาไทยตัดสองบรรทัดในคอลัมน์แคบ
// การจัดกึ่งกลางแนวตั้งจะลากปุ่มลงไปกลางบล็อก
// flex-wrap ให้ปุ่มตกลงไปอยู่แถวของตัวเองที่ 360px แทนที่จะบีบหัวเรื่อง
//
// tracking-tight เท่านั้น ห้ามค่าบวก -- ทิศทางบวกดันวรรณยุกต์ไทยลอยออกจาก
// ตัวอักษรฐาน และไม่มีอะไรหนักกว่า semibold เพราะ 900 ไม่ใช่หนึ่งในน้ำหนัก
// ที่แอปโหลด
//
// print:hidden เพราะเป็นส่วนควบคุม ไม่ใช่เนื้อหา
export const PageHeader: React.FC<PageHeaderProps> = ({
    title,
    subtitle,
    icon: Icon,
    actions,
    actionsBusy = false,
}) => (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 print:hidden">
        <div className="flex min-w-0 items-start gap-2.5">
            {Icon && (
                <span className="mt-1 shrink-0 text-brand-600" aria-hidden="true">
                    <Icon size={22} />
                </span>
            )}
            <div className="min-w-0">
                <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                    {title}
                </h1>
                {subtitle && (
                    <p className="mt-1 text-sm leading-relaxed text-slate-500">{subtitle}</p>
                )}
            </div>
        </div>
        {actions && (
            <div className="flex flex-wrap items-center gap-2" aria-busy={actionsBusy}>
                {actions}
            </div>
        )}
    </div>
);
```

- [ ] **Step 6: เขียน `components/ui/FilterBar.tsx`**

```tsx
import React from 'react';
import { X } from 'lucide-react';
import { CARD_SHELL } from './Card';

export interface FilterBarProps {
    children: React.ReactNode;
    /** เช่น "พบ 12 รายการ" แสดงเฉพาะตอน isFiltered */
    resultLabel?: string;
    onClear?: () => void;
    clearLabel?: string;
    isFiltered?: boolean;
}

// แถวจำนวนผลลัพธ์อยู่ *นอก* การ์ด ไม่ใช่ข้างใน: มันบรรยายผลของตัวกรอง
// ไม่ใช่ตัวกรองเอง และมันโผล่มา/หายไปตามสถานะ ถ้าอยู่ข้างในการ์ดจะเปลี่ยน
// ความสูงของการ์ดทุกครั้งที่พิมพ์ตัวแรกลงในช่องค้นหา
export const FilterBar: React.FC<FilterBarProps> = ({
    children,
    resultLabel,
    onClear,
    clearLabel,
    isFiltered = false,
}) => (
    <div className="flex flex-col gap-2">
        <div className={`${CARD_SHELL} p-3`}>
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">{children}</div>
        </div>

        {isFiltered && (resultLabel || (onClear && clearLabel)) && (
            <div className="flex flex-wrap items-center gap-3 px-1">
                {resultLabel && <span className="text-sm text-slate-500">{resultLabel}</span>}
                {onClear && clearLabel && (
                    <button
                        type="button"
                        onClick={onClear}
                        className={
                            'inline-flex items-center gap-1 rounded-lg text-sm font-semibold ' +
                            'text-brand-700 transition hover:text-brand-800 focus-visible:outline-2 ' +
                            'focus-visible:outline-offset-2 focus-visible:outline-brand-500'
                        }
                    >
                        <X size={14} aria-hidden="true" />
                        {clearLabel}
                    </button>
                )}
            </div>
        )}
    </div>
);
```

- [ ] **Step 7: typecheck + test + commit**

```bash
npm run typecheck && npm run test
git add components/ui/FilterBar.tsx components/ui/PageHeader.tsx components/ui/SelectionBar.tsx components/ui/SelectionBar.test.tsx
git commit -m "feat(ui): add FilterBar, PageHeader and SelectionBar primitives"
```

---

## Task 2.4 (ผู้เขียนแผนทำเอง): รวม export ใน `components/ui/index.ts`

**Files:**
- Modify: `components/ui/index.ts`

- [ ] เพิ่ม export ของ 11 primitive ใหม่ ตามแบบเดิมของไฟล์ (export ตัวคอมโพเนนต์ แล้ว `export type` ตามหลัง)
- [ ] `npm run typecheck && npm run test`
- [ ] commit: `chore(ui): export new primitives from the ui barrel`

---

# Wave 3 — ย้ายหัวเพจแดชบอร์ด (D6)

## Task 3.1: `components/admin/dashboard/sections/PageHeader.tsx`

**Files:**
- Modify: `components/admin/dashboard/sections/PageHeader.tsx`

**Interfaces:**
- Consumes: `PageHeader`, `Button`, `Menu`, `MenuItem` จาก `components/ui`
- Produces: `PageHeaderProps` เดิมไม่เปลี่ยน (`onPrint`, `onExportSummary`, `onExportInventory`, `onExportHistory`, `isBusy`) — `DashboardHome.tsx` ต้องไม่ต้องแก้แม้แต่บรรทัดเดียว

- [ ] **Step 1: เขียนไฟล์ใหม่ทั้งไฟล์**

เหลือเฉพาะสิ่งที่เป็นของแดชบอร์ดจริง ๆ:

```tsx
import React from 'react';
import { Clock, FileText, Package, PieChart, Printer } from 'lucide-react';
import { Button, Menu, PageHeader as UiPageHeader } from '../../../ui';
import type { MenuItem } from '../../../ui';
import { useT } from '../../../../hooks/useT';

export interface PageHeaderProps {
    onPrint: () => void;
    onExportSummary: () => void;
    onExportInventory: () => void;
    onExportHistory: () => void;
    isBusy?: boolean;
}
```

แล้วประกอบเป็น `<UiPageHeader title subtitle actions actionsBusy />` โดย `actions` คือ
ปุ่มพิมพ์ (`variant="secondary"` `icon={Printer}`) กับ `<Menu>` ที่มี 3 รายการ:

| รายการ | `tone` | ไอคอน | handler |
|---|---|---|---|
| `t.dashboard.exportSummary` | `brand` | `PieChart` | `onExportSummary` |
| `t.dashboard.exportInventoryCsv` | `accent` | `Package` | `onExportInventory` |
| `t.dashboard.exportHistoryCsv` | `neutral` | `Clock` | `onExportHistory` |

**สิ่งที่ต้องคงไว้เป๊ะ ๆ ห้ามหล่น:**
- `print:hidden` (มาจาก `UiPageHeader` แล้ว ไม่ต้องเพิ่ม)
- `aria-busy` บนกลุ่มปุ่ม → ส่งผ่าน `actionsBusy={isBusy}`
- ทั้งปุ่มพิมพ์และปุ่มเมนู `disabled={isBusy}`
- ป้ายปุ่มเมนูคือ `t.dashboard.exportData` และไอคอน `FileText`

**คอมเมนต์ที่เป็นประวัติศาสตร์ของไฟล์นี้** (บล็อก "WHAT THIS REPLACED AND WHY" ที่อธิบายว่า
ทำไมตัวเลือกช่วงเวลาถึงไม่ได้อยู่ที่นี่) **ให้คงไว้** — มันอธิบายการตัดสินใจที่ยังเป็นจริงอยู่
ส่วนคอมเมนต์ที่อธิบายตรรกะเมนูให้ย้ายไปอยู่ที่ `components/ui/Menu.tsx` แทน ไม่ใช่ลบทิ้ง

- [ ] **Step 2: typecheck + test**

Run: `npm run typecheck && npm run test`
Expected: ผ่านทั้งคู่

- [ ] **Step 3: ตรวจด้วยตาบนหน้าแดชบอร์ด**

Run: `npm run dev` แล้วเปิดแท็บแดชบอร์ด

ต้องผ่านทุกข้อ:
- หัวเพจหน้าตาเหมือนเดิม ชื่อ + คำบรรยาย + ปุ่มพิมพ์ + ปุ่มส่งออก
- กดปุ่มส่งออก → เมนูกาง 3 รายการ ชิปไอคอนสีน้ำเงิน / เขียวน้ำทะเล / เทา ตามเดิม
- กด Escape → เมนูปิดและโฟกัสกลับไปที่ปุ่มส่งออก (กด Enter ซ้ำแล้วเปิดได้เลย)
- ลูกศรขึ้น/ลงเดินในเมนูได้ Home/End ไปหัว/ท้าย
- คลิกที่ว่างนอกเมนู → ปิด
- กดแต่ละรายการแล้วไฟล์ถูกส่งออกจริงและเมนูปิด
- ตอนหน้ากำลังโหลด ปุ่มทั้งสองจาง กดไม่ได้

- [ ] **Step 4: commit**

```bash
git add components/admin/dashboard/sections/PageHeader.tsx
git commit -m "refactor(dashboard): rebuild page header on the shared ui primitives"
```

---

# Wave 4 — หน้าคลังพาเลท

## Task 4.1: `useInventoryFilters` — statusCounts (มีเทสต์) · รันขนานกับ 5.1 ได้

**Files:**
- Modify: `hooks/inventory/useInventoryFilters.ts`
- Create: `hooks/inventory/useInventoryFilters.test.ts`

**Interfaces:**
- Produces (เพิ่มจากของเดิม ไม่ลบอะไร):
  ```ts
  statusCounts: {
      all: number;         // ไม่รวม scrapped -- ตรงกับความหมายของ statusFilter === 'all'
      available: number;
      in_use: number;
      damaged: number;
      scrapped: number;
  };
  activeFilterCount: number;
  ```

**กฎที่ต้องทำให้ถูก:** `statusCounts` นับจากพาเลทที่ผ่านตัวกรอง **ค้นหา + สถานที่ + วันที่ +
เกินกำหนด** แล้ว แต่ **ยังไม่ผ่านตัวกรองสถานะ** เพื่อให้ตัวเลขแปลว่า "กดช่องนี้แล้วจะได้ N แถว"

- [ ] **Step 1: เขียนเทสต์ที่ต้องแดงก่อน — `hooks/inventory/useInventoryFilters.test.ts`**

```ts
import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { Pallet } from '../../types';
import { useInventoryFilters } from './useInventoryFilters';

// ตัดสองอย่างที่ hook ไปคุยกับข้างนอกออก: การดึงรายชื่อแผนกและค่า threshold
// จาก system_settings ทั้งคู่ไม่เกี่ยวกับกฎการนับที่กำลังทดสอบ
vi.mock('../../services/departmentService', () => ({
    fetchDepartments: () => Promise.resolve([]),
}));
vi.mock('../useOverdueThreshold', () => ({
    useOverdueThreshold: () => ({ days: 7 }),
}));

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 3600 * 1000).toISOString();

const pallet = (over: Partial<Pallet> & Pick<Pallet, 'pallet_id' | 'status'>): Pallet =>
    ({
        current_location: 'Warehouse',
        last_transaction_date: daysAgo(1),
        last_checkout_date: null,
        pallet_remark: null,
        ...over,
    }) as Pallet;

const FLEET: Pallet[] = [
    pallet({ pallet_id: 'P-01', status: 'available' }),
    pallet({ pallet_id: 'P-02', status: 'available', current_location: 'Line A' }),
    pallet({ pallet_id: 'P-03', status: 'in_use', last_checkout_date: daysAgo(2) }),
    pallet({ pallet_id: 'P-04', status: 'in_use', last_checkout_date: daysAgo(30) }),
    pallet({ pallet_id: 'P-05', status: 'damaged' }),
    pallet({ pallet_id: 'P-06', status: 'scrapped' }),
];

describe('useInventoryFilters — statusCounts', () => {
    it('all ไม่รวม scrapped และ scrapped นับแยก', () => {
        const { result } = renderHook(() => useInventoryFilters(FLEET));
        expect(result.current.statusCounts.all).toBe(5);
        expect(result.current.statusCounts.scrapped).toBe(1);
    });

    it('นับแยกตามสถานะได้ถูก', () => {
        const { result } = renderHook(() => useInventoryFilters(FLEET));
        expect(result.current.statusCounts.available).toBe(2);
        expect(result.current.statusCounts.in_use).toBe(2);
        expect(result.current.statusCounts.damaged).toBe(1);
    });

    it('ตัวกรองสถานะไม่กระทบตัวเลขในช่องอื่น', async () => {
        const { result } = renderHook(() => useInventoryFilters(FLEET));
        result.current.setStatusFilter('damaged');
        await waitFor(() => expect(result.current.processedPallets).toHaveLength(1));
        // ตัวเลขต้องยังบอกว่า "ถ้ากดช่องนั้นจะได้เท่าไหร่" ไม่ใช่กลายเป็น 0 ทั้งแถว
        expect(result.current.statusCounts.available).toBe(2);
        expect(result.current.statusCounts.in_use).toBe(2);
        expect(result.current.statusCounts.all).toBe(5);
    });

    it('ตัวกรองสถานที่กระทบตัวเลขทุกช่อง', async () => {
        const { result } = renderHook(() => useInventoryFilters(FLEET));
        result.current.setLocationFilter('Line A');
        await waitFor(() => expect(result.current.statusCounts.all).toBe(1));
        expect(result.current.statusCounts.available).toBe(1);
        expect(result.current.statusCounts.in_use).toBe(0);
    });

    it('เปิดเฉพาะเกินกำหนดแล้ว พร้อมใช้ กับ เสียหาย เป็น 0 -- ตั้งใจ ไม่ใช่บั๊ก', async () => {
        const { result } = renderHook(() => useInventoryFilters(FLEET));
        result.current.setShowOverdueOnly(true);
        // เกินกำหนดได้ต้องเป็น in_use เท่านั้น P-04 ตัวเดียวที่เกิน 7 วัน
        await waitFor(() => expect(result.current.statusCounts.in_use).toBe(1));
        expect(result.current.statusCounts.available).toBe(0);
        expect(result.current.statusCounts.damaged).toBe(0);
        expect(result.current.statusCounts.all).toBe(1);
    });

    it('ค้นหาแล้วตัวเลขขยับตาม', async () => {
        const { result } = renderHook(() => useInventoryFilters(FLEET));
        result.current.setSearchTerm('P-05');
        await waitFor(() => expect(result.current.statusCounts.all).toBe(1));
        expect(result.current.statusCounts.damaged).toBe(1);
        expect(result.current.statusCounts.available).toBe(0);
    });
});

describe('useInventoryFilters — activeFilterCount', () => {
    it('เป็น 0 ตอนเริ่มต้น', () => {
        const { result } = renderHook(() => useInventoryFilters(FLEET));
        expect(result.current.activeFilterCount).toBe(0);
    });

    it('นับตัวกรองแต่ละชนิดที่ติดอยู่', async () => {
        const { result } = renderHook(() => useInventoryFilters(FLEET));
        result.current.setSearchTerm('P-0');
        await waitFor(() => expect(result.current.activeFilterCount).toBe(1));
        result.current.setLocationFilter('Line A');
        await waitFor(() => expect(result.current.activeFilterCount).toBe(2));
        result.current.setShowOverdueOnly(true);
        await waitFor(() => expect(result.current.activeFilterCount).toBe(3));
    });

    it('ช่วงวันที่นับเป็นหนึ่งตัวกรองไม่ว่าจะกรอกข้างเดียวหรือสองข้าง', async () => {
        const { result } = renderHook(() => useInventoryFilters(FLEET));
        result.current.setDateRange({ start: '2026-01-01', end: '' });
        await waitFor(() => expect(result.current.activeFilterCount).toBe(1));
        result.current.setDateRange({ start: '2026-01-01', end: '2026-02-01' });
        await waitFor(() => expect(result.current.activeFilterCount).toBe(1));
    });

    it('handleClearFilters ล้างกลับเป็น 0', async () => {
        const { result } = renderHook(() => useInventoryFilters(FLEET));
        result.current.setSearchTerm('P-0');
        result.current.setShowOverdueOnly(true);
        await waitFor(() => expect(result.current.activeFilterCount).toBe(2));
        result.current.handleClearFilters();
        await waitFor(() => expect(result.current.activeFilterCount).toBe(0));
    });
});
```

- [ ] **Step 2: รันแล้วต้องแดง**

Run: `npm run test -- useInventoryFilters`
Expected: FAIL — `statusCounts` เป็น undefined

- [ ] **Step 3: แก้ `hooks/inventory/useInventoryFilters.ts`**

แยก memo เดิมออกเป็นสองชั้น **โดยคัดลอกตรรกะการกรองมาแบบคำต่อคำ ห้ามเขียนใหม่**
(โดยเฉพาะ `else if (dateRange.start && !p.last_checkout_date)` ซึ่งเป็นสาขาที่หลุดง่ายที่สุด):

```ts
// ชั้นแรก: ทุกอย่างยกเว้นสถานะ ตัวเลขบนแถบสถานะอ่านจากชั้นนี้ เพื่อให้เลขในช่อง
// แปลว่า "กดช่องนี้แล้วจะได้กี่แถว" -- ถ้านับหลังกรองสถานะด้วย ทุกช่องที่ไม่ได้
// เลือกอยู่จะเป็น 0 และแถบทั้งแถบก็ไม่เหลือประโยชน์อะไร
const baseFiltered = useMemo(() => {
    return pallets.filter(p => {
        const matchesSearch = p.pallet_id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesLocation = locationFilter === 'all' || p.current_location === locationFilter;

        let matchesDate = true;
        if (dateRange.start && p.last_checkout_date) {
            matchesDate = matchesDate && new Date(p.last_checkout_date) >= new Date(dateRange.start);
        }
        if (dateRange.end && p.last_checkout_date) {
            const end = new Date(dateRange.end);
            end.setHours(23, 59, 59);
            matchesDate = matchesDate && new Date(p.last_checkout_date) <= end;
        } else if (dateRange.start && !p.last_checkout_date) {
            matchesDate = false;
        }

        let matchesOverdue = true;
        if (showOverdueOnly) {
            if (p.status !== 'in_use' || !p.last_checkout_date) {
                matchesOverdue = false;
            } else {
                const days = (new Date().getTime() - new Date(p.last_checkout_date).getTime()) / (1000 * 3600 * 24);
                matchesOverdue = days > overdueThreshold;
            }
        }

        return matchesSearch && matchesLocation && matchesDate && matchesOverdue;
    });
}, [pallets, searchTerm, locationFilter, dateRange, showOverdueOnly, overdueThreshold]);

const statusCounts = useMemo(() => ({
    // 'all' ไม่ใช่ "ทั้งหมดจริง ๆ" แต่คือกองที่ยังใช้งานอยู่ ตรงกับสิ่งที่
    // statusFilter === 'all' กรองด้านล่าง และตรงกับที่ทั้งแอปกัน scrapped
    // ออกจากยอดรวมและตัวหารของอัตราการใช้งาน
    all: baseFiltered.filter(p => p.status !== 'scrapped').length,
    available: baseFiltered.filter(p => p.status === 'available').length,
    in_use: baseFiltered.filter(p => p.status === 'in_use').length,
    damaged: baseFiltered.filter(p => p.status === 'damaged').length,
    scrapped: baseFiltered.filter(p => p.status === 'scrapped').length,
}), [baseFiltered]);

// ชั้นสอง: กรองสถานะแล้วเรียง ตัวเปรียบเทียบยกมาจากของเดิมทั้งก้อน ไม่แก้
const processedPallets = useMemo(() => {
    const data = baseFiltered.filter(p =>
        statusFilter === 'all' ? p.status !== 'scrapped' : p.status === statusFilter
    );
    if (sortConfig) {
        data.sort((a, b) => { /* ...ตัวเปรียบเทียบเดิมทั้งหมด ไม่แก้แม้แต่บรรทัดเดียว... */ });
    }
    return data;
}, [baseFiltered, statusFilter, sortConfig]);

const activeFilterCount =
    (searchTerm ? 1 : 0) +
    (statusFilter !== 'all' ? 1 : 0) +
    (locationFilter !== 'all' ? 1 : 0) +
    (dateRange.start || dateRange.end ? 1 : 0) +
    (showOverdueOnly ? 1 : 0);
```

`.filter()` คืนอาร์เรย์ใหม่เสมอ `.sort()` ที่ตามมาจึงไม่ไปกลายพันธุ์ `baseFiltered`

เพิ่ม `statusCounts` และ `activeFilterCount` เข้าไปในสิ่งที่ hook คืนกลับ

- [ ] **Step 4: รันแล้วต้องเขียว**

Run: `npm run test -- useInventoryFilters`
Expected: PASS 10/10

- [ ] **Step 5: typecheck + commit**

```bash
npm run typecheck && npm run test
git add hooks/inventory/useInventoryFilters.ts hooks/inventory/useInventoryFilters.test.ts
git commit -m "feat(inventory): expose statusCounts and activeFilterCount from the filter hook"
```

---

## Task 4.2: แถบตัวเลข + ทิ้งการล็อกความสูง

**Files:**
- Modify: `components/ui/StatTile.tsx`
- Create: `components/admin/inventory/InventoryStatusStrip.tsx`
- Modify: `components/admin/inventory/InventoryView.tsx`
- Modify: `components/admin/AdminDashboard.tsx`
- Modify: `locales/admin/inventory.ts`

**Interfaces:**
- Consumes: `statusCounts` จาก Task 4.1, `StatTile` / `SkeletonTile`
- Produces:
  ```ts
  export interface InventoryStatusStripProps {
      counts: { all: number; available: number; in_use: number; damaged: number; scrapped: number };
      statusFilter: string;
      onSelect: (status: string) => void;
      isLoading?: boolean;
  }
  export const InventoryStatusStrip: React.FC<InventoryStatusStripProps>;
  ```
  `InventoryView` รับ prop ใหม่ `isLoading: boolean`

- [ ] **Step 1: `StatTile` รับ `selected`**

เพิ่ม `selected?: boolean` ใน `StatTileProps` และในสาขาที่มี `onClick` ให้เติม
`aria-pressed={selected}` กับคลาส `ring-2 ring-brand-500 ring-offset-2` เมื่อ `selected`
พร้อมคอมเมนต์ว่า prop นี้ใช้คู่กับ `onClick` เท่านั้น และแดชบอร์ดไม่ส่งมา

- [ ] **Step 2: เพิ่มคีย์แปลใน `locales/admin/inventory.ts`**

เพิ่มทั้งใน `inventoryEn` และ `inventoryTh` (ฝั่งไทย type ผูกกับฝั่งอังกฤษ คีย์ที่แปลข้างเดียว
จะทำให้ `npm run typecheck` แดง):

```ts
// inventoryEn
scrappedNote: (count: number) => `${count} pallets scrapped`,
viewScrapped: 'View list',

// inventoryTh
scrappedNote: (count: number) => `ตัดออกจากระบบแล้ว ${count} รายการ`,
viewScrapped: 'ดูรายการ',
```

- [ ] **Step 3: เขียน `components/admin/inventory/InventoryStatusStrip.tsx`**

- กริดเดียวกับ `KpiRow`: `grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4`
- 4 ช่อง ตามลำดับ: `t.inventory.allActive` (`'all'`, tone `brand`, `Boxes`),
  `t.status.available` (`'available'`, `accent`, `CircleCheck`),
  `t.status.in_use` (`'in_use'`, `neutral`, `Activity`),
  `t.status.damaged` (`'damaged'`, `warning`, `AlertTriangle`)
- ทุกช่องมี `onClick={() => onSelect(value)}` และ `selected={statusFilter === value}`
- ตอน `isLoading` → `SkeletonTile` 4 ตัว **ตัวแรกเท่านั้น** ที่ได้ `ariaLabel={t.common.loading}`
  (สี่ตัวจะทำให้ screen reader พูดว่า "กำลังโหลด" สี่รอบสำหรับแถวเดียว)
- ใต้กริดเป็นบรรทัดของ scrapped ในกล่อง `mt-3 min-h-4`:
  ถ้า `counts.scrapped > 0` แสดง `<p className="text-xs leading-relaxed text-slate-500">`
  ที่มี `t.inventory.scrappedNote(counts.scrapped)` ตามด้วยปุ่มข้อความ
  `t.inventory.viewScrapped` ที่เรียก `onSelect('scrapped')`
- **คอมเมนต์ที่ต้องมี:** อธิบายว่าทำไม scrapped ถึงเป็นบรรทัด ไม่ใช่ช่องที่ 5 —
  มันถูกกันออกจากยอดรวมและตัวหารของอัตราการใช้งานทุกที่ในโค้ดเบส ถ้าเป็นช่องจะได้
  น้ำหนักสายตาเท่าตัวเลขสี่ตัวที่มันไม่ได้อยู่ในนั้น แล้วคนอ่านจะพยายามบวกสี่ช่อง
  ให้เท่ากับยอดที่ไม่มีมันอยู่ (เหตุผลเดียวกับที่ `KpiRow.tsx` บันทึกไว้) และ
  `min-h-4` จองที่ไว้แม้ตอนไม่มีอะไรจะบอก เพื่อไม่ให้แผงข้างล่างกระโดด

- [ ] **Step 4: แก้ `InventoryView.tsx`**

- root เปลี่ยนจาก `h-[calc(100vh-110px)] flex flex-col gap-6 overflow-hidden`
  เป็น `flex flex-col gap-6` เฉย ๆ **และลบ div ชั้น `flex-1 min-h-0 overflow-y-auto pr-2 ...` ทิ้ง**
  ให้ลูกทุกตัวเป็นพี่น้องกันในระดับเดียว
- ต่อท้าย className ด้วย `${selectedIds.size > 0 ? 'pb-24' : ''}` เผื่อที่ให้แถบลอย
- เพิ่ม prop `isLoading: boolean` ใน interface และส่งต่อให้ `InventoryStatusStrip`
- วาง `<InventoryStatusStrip>` ระหว่าง header กับ filters
- **คอมเมนต์ที่ต้องมี:** อธิบายว่าที่นี่ไม่มีความสูงและไม่มี overflow โดยตั้งใจ
  ของเดิมเป็นกล่องล็อก 100vh ครอบ scroller ครอบตารางที่ล็อก 100vh อีกที ซึ่ง
  `AdminDashboard.tsx` และ `index.css` บันทึกไว้แล้วว่าเลิกใช้เพราะสกรอลล์บาร์ไม่ตรงกับหน้า
  และกล่องที่ล็อก 100vh ไม่มีอะไรใต้ขอบจอให้ส่งเข้าเครื่องพิมพ์

- [ ] **Step 5: แก้ `AdminDashboard.tsx`**

ใน `case 'inventory':` เพิ่ม `isLoading={palletsLoading}` พร้อมคอมเมนต์สั้น ๆ ว่า
ก่อนหน้านี้หน้านี้ไม่ได้รับค่านี้ จึงขึ้นว่า "ไม่พบพาเลท" ระหว่างที่การดึงข้อมูลครั้งแรกยังไม่เสร็จ

- [ ] **Step 6: typecheck + test + ตรวจด้วยตา**

```bash
npm run typecheck && npm run test && npm run dev
```

ต้องผ่าน:
- แถบตัวเลข 4 ช่องขึ้นเหนือตัวกรอง ตัวเลขตรงกับจำนวนจริง
- กดช่อง "เสียหาย" → ตารางกรองทันที ช่องนั้นขึ้นวงสีน้ำเงิน **และตัวเลขในช่องอื่นยังไม่เป็น 0**
- บรรทัด "ตัดออกจากระบบแล้ว N รายการ · ดูรายการ" อยู่ใต้แถบ กด "ดูรายการ" แล้วเห็นเฉพาะ scrapped
- เลื่อนหน้าทั้งหน้ามีสกรอลล์บาร์เดียว ล้อเมาส์ไม่หยุดที่ขอบใด
- รีเฟรชหน้า → แถบขึ้น skeleton ก่อน ไม่ใช่เลข 0 สี่ช่อง

- [ ] **Step 7: commit**

```bash
git add -A components/ui/StatTile.tsx components/admin/inventory components/admin/AdminDashboard.tsx locales/admin/inventory.ts
git commit -m "feat(inventory): add clickable status strip and drop the nested scroll containers"
```

---

## Task 4.3: ตัวกรอง

**Files:**
- Modify: `components/admin/inventory/InventoryFilters.tsx`
- Modify: `components/admin/inventory/InventoryView.tsx`
- Modify: `locales/admin/inventory.ts`

- [ ] **Step 1: คีย์แปลใหม่**

```ts
// inventoryEn
resultCount: (count: number) => `${count} results`,
clearSearch: 'Clear search',

// inventoryTh
resultCount: (count: number) => `พบ ${count} รายการ`,
clearSearch: 'ล้างคำค้นหา',
```

- [ ] **Step 2: เขียน `InventoryFilters.tsx` ใหม่**

```tsx
<FilterBar
    isFiltered={activeFilterCount > 0}
    resultLabel={t.inventory.resultCount(resultCount)}
    onClear={onClearFilters}
    clearLabel={t.common.clearFilters}
>
    <SearchInput className="xl:flex-1" ... />
    <div className="flex flex-col gap-2 sm:flex-row">
        <SelectField icon={MapPin} className="sm:w-48" ... />   {/* สถานที่ */}
        <DateRangeField ... />
    </div>
    <ToggleChip tone="critical" icon={AlarmClock} ... />        {/* เฉพาะเกินกำหนด */}
</FilterBar>
```

- **`<select>` สถานะถูกลบทิ้ง** แถบตัวเลขทำหน้าที่แทนแล้ว ส่วน `'scrapped'` เข้าถึงผ่าน
  ลิงก์ "ดูรายการ" ใต้แถบ — เพิ่มคอมเมนต์บอกไว้ ไม่งั้นคนอ่านจะคิดว่าตัวเลือกหาย
- props ใหม่ที่ต้องรับเพิ่ม: `activeFilterCount: number`, `resultCount: number`,
  `onClearFilters: () => void`
- props ที่ลบได้: `statusFilter`, `setStatusFilter`
- `InventoryView` ส่ง `activeFilterCount` / `processedPallets.length` / `handleClearFilters` ลงมา

- [ ] **Step 3: typecheck + test + ตรวจด้วยตา**

- พิมพ์ในช่องค้นหา → ปุ่ม ✕ โผล่ กดแล้วล้าง
- ตัวกรองติดอยู่ → บรรทัด "พบ N รายการ" + ปุ่มล้างตัวกรองโผล่ใต้การ์ด
- ไม่มีตัวกรองติด → บรรทัดนั้นหายไป และการ์ดไม่ขยับความสูง
- แท็บผ่านช่องวันที่ → หยุดที่ช่องจริงช่องเดียวต่อหนึ่งวันที่ ไม่ใช่สองครั้ง
- กดจาก KPI "เกินกำหนด" บนแดชบอร์ด → มาถึงหน้านี้พร้อมชิปเกินกำหนดติด + บรรทัดจำนวนผลลัพธ์

- [ ] **Step 4: commit**

```bash
git add components/admin/inventory locales/admin/inventory.ts
git commit -m "feat(inventory): rebuild the filter bar on the shared primitives"
```

---

## Task 4.4: ตาราง + หัวเพจ + แถบเลือก

**Files:**
- Modify: `components/admin/inventory/InventoryTable.tsx`
- Modify: `components/admin/inventory/InventoryHeader.tsx`
- Create: `components/admin/inventory/InventorySelectionBar.tsx`
- Modify: `components/admin/inventory/InventoryView.tsx`
- Modify: `locales/admin/inventory.ts`

- [ ] **Step 1: คีย์แปลใหม่**

```ts
// inventoryEn
moreActions: 'More actions',
// inventoryTh
moreActions: 'การทำงานอื่น',
```

- [ ] **Step 2: `InventoryHeader.tsx` เหลือแค่หัวเพจ**

ลบสาขา `selectedCount > 0` ทั้งก้อนออก (ย้ายไป `InventorySelectionBar`) เหลือ:

```tsx
<PageHeader
    title={t.inventory.title}
    subtitle={t.inventory.subtitle}
    icon={Package}
    actions={<>
        <Button variant="secondary" icon={Download} onClick={onExport}>{t.inventory.exportList}</Button>
        <Button variant="secondary" icon={QrCode} onClick={onPrintQrAll}>{t.inventory.printAllQr}</Button>
        <Button variant="primary" icon={Plus} onClick={onAddPallet}>{t.inventory.addPallet}</Button>
    </>}
/>
```

props ที่เหลือ: `onExport`, `onPrintQrAll`, `onAddPallet` เท่านั้น

- [ ] **Step 3: เขียน `InventorySelectionBar.tsx`**

```ts
export interface InventorySelectionBarProps {
    selectedCount: number;
    selectedIds: string[];
    onClearSelection: () => void;
    onBulkRepair: () => void;
    onBulkScrap: () => void;
    onBulkDelete: () => void;
    onPrintQrSelected: () => void;
    onBulkTransaction: () => void;
    showRepairButton: boolean;
    showTransactionButton: boolean;
}
```

- `actions`: ปุ่ม `ทำรายการ` (`variant="inverse"` `icon={ArrowRightLeft}`) เมื่อ
  `showTransactionButton`, และปุ่ม `พิมพ์ QR` (`variant="inverseGhost"` `icon={QrCode}`)
- `menu`: `<Menu iconOnly openUpward variant="inverseGhost" icon={MoreHorizontal}
  label={t.inventory.moreActions} />` มีรายการตามลำดับนี้

  | ป้าย | `tone` | ไอคอน | เงื่อนไข |
  |---|---|---|---|
  | `showIds` / `hideIds` | `neutral` | `List` | เสมอ |
  | `t.action.repair` | `brand` | `CircleCheckBig` | `showRepairButton` |
  | `t.inventory.scrap` | `neutral` | `Ban` | `showRepairButton` |
  | `t.common.delete` | `danger` | `Trash2` | เสมอ |

- `detail`: เมื่อ `showIds` เป็นจริงและมีรหัสที่เลือก → กล่อง
  `rounded-2xl border border-slate-200 bg-white p-3 shadow-lg` ที่มีรหัสเรียงตาม
  `localeCompare(undefined, { numeric: true, sensitivity: 'base' })` ในชิป
  `max-h-32 overflow-y-auto` — คงพฤติกรรมเดิมของ `InventoryHeader.tsx:83-93` ไว้ทั้งหมด
- **คอมเมนต์ที่ต้องมี:** ทำไม "ลบ" ถึงอยู่ในเมนูไม่ใช่บนแถบ — `locales/admin/inventory.ts`
  เขียนเองว่าการลบทำให้ประวัติการทำรายการทั้งหมดหายถาวรและกู้ไม่ได้ ปุ่มแบบนั้นไม่ควร
  อยู่ห่างจากปุ่มที่กดบ่อยแค่ 8px และเงื่อนไข `showRepairButton` คุมทั้งซ่อมและตัดออก
  ด้วยตัวเดียวกันเพราะทั้งสองเป็นทางออกของพาเลทที่เสียหาย

- [ ] **Step 4: เขียน `InventoryTable.tsx` ใหม่บน `DataTable`**

```tsx
<DataTable
    minWidth={720}
    isLoading={isLoading}
    loadingRows={10}
    loadingCols={7}
    loadingLabel={t.common.loading}
    isEmpty={totalProcessedCount === 0}
    empty={
        <EmptyState
            icon={PackageSearch}
            title={t.inventory.noResults}
            action={<Button variant="secondary" onClick={onClearFilters}>{t.common.clearFilters}</Button>}
        />
    }
    footer={totalProcessedCount > 0 ? <Pagination ... /> : undefined}
    head={<tr>{/* ... */}</tr>}
>
    <tbody className="divide-y divide-slate-100">{/* ... */}</tbody>
</DataTable>
```

หัวคอลัมน์:

| ป้าย | `sortKey` | `className` | หมายเหตุ |
|---|---|---|---|
| — (ช่องติ๊ก) | — | `w-10` | `<th scope="col">` เปล่าที่มี `<Checkbox>` ข้างใน พร้อม `indeterminate` |
| `ID` | `pallet_id` | | ไม่แปล staff เรียกทับศัพท์ |
| `t.common.status` | `status` | | |
| `t.inventory.lastUpdated` | `last_transaction_date` | | |
| `t.common.location` | `current_location` | | |
| `t.inventory.lastCheckout` | `last_checkout_date` | `hidden xl:table-cell` | |
| `t.inventory.overdue` | `days_overdue` | | |
| `t.common.remark` | `pallet_remark` | `hidden xl:table-cell` | |
| `t.common.actions` | — | `text-right` | ไม่ส่ง `sortKey` จึงไม่เป็นปุ่ม |

`<td>` ของสองคอลัมน์ที่ซ่อนต้องได้ `hidden xl:table-cell` ด้วย ไม่ใช่แค่ `<th>`

**สถานะเลือกทั้งหมด** ส่งเข้า `Checkbox` ดังนี้:
```ts
checked={selectedIds.size === totalProcessedCount && totalProcessedCount > 0}
indeterminate={selectedIds.size > 0 && selectedIds.size < totalProcessedCount}
```

**แถว:**
- `hover:bg-slate-50` / ที่เลือก `bg-brand-50`
- เกินกำหนด → `border-l-2 border-amber-400` **ไม่ใช่** `bg-yellow-200/30` ทั้งแถว
  พร้อมคอมเมนต์ว่าพื้นเหลืองไปสู้กับพื้นฟ้าของแถวที่เลือกแล้วออกมาขุ่น และที่ความโปร่ง 30%
  บนพื้นขาวแทบมองไม่เห็นอยู่แล้ว
- ปุ่มในแถวทั้ง 4 ปุ่มต้องมี **ทั้ง** `title` และ `aria-label` (screen reader บางตัวไม่อ่าน `title`)
  และมี focus ring
- คงตรรกะ `isOverdue` / `days` เดิมไว้ทั้งหมด

- [ ] **Step 5: ต่อสายใน `InventoryView.tsx`**

วาง `<InventorySelectionBar>` เป็นลูกตัวสุดท้ายก่อนโมดัล ส่ง `isLoading` ให้ `InventoryTable`

- [ ] **Step 6: typecheck + test**

Run: `npm run typecheck && npm run test`
Expected: ผ่านทั้งคู่

- [ ] **Step 7: ตรวจด้วยตาให้ครบ**

- ติ๊กบางแถว → ช่องหัวตารางเป็นขีดกลาง ไม่ใช่ว่าง; ติ๊กครบ → เป็นเครื่องหมายถูก
- เลื่อนลงไปติ๊กแถวล่างสุด → แถบลอยยังอยู่ขอบล่างจอ กดปุ่มได้ทันที
- ชื่อหน้าและปุ่มเพิ่มพาเลทยังอยู่ตลอดเวลาที่เลือก
- กด Escape → ยกเลิกการเลือกทั้งหมด
- เมนู ⋯ กางขึ้นบน ไม่ใช่ลงล่างจนตกขอบจอ
- กด "ลบ" ในเมนู → โมดัลยืนยันเดิมขึ้น และโมดัลอยู่เหนือแถบลอย
- จอ ≥1280px: หัวตารางเกาะขอบบนตอนเลื่อน เห็นคอลัมน์ครบ 9
- จอ <1280px: ตารางเลื่อนซ้ายขวาได้ คอลัมน์ "เบิกออกล่าสุด" กับ "หมายเหตุ" หายไป
- รีเฟรช → เห็น skeleton ไม่ใช่ข้อความ "ไม่พบพาเลท"
- Ctrl+P → ได้ทุกแถวในหน้าปัจจุบัน ไม่มีแถบลอยติดไปบนกระดาษ
- สลับ EN/TH → ไม่มีป้ายไหนถูกตัดขาดหรือดันกล่องแตก โดยเฉพาะปุ่มบนแถบลอย

- [ ] **Step 8: commit**

```bash
git add components/admin/inventory locales/admin/inventory.ts
git commit -m "feat(inventory): rebuild table, header and bulk actions on the primitives"
```

---

# Wave 5 — Pagination (รันขนานกับ Wave 4 ได้)

## Task 5.1: ทาสี `Pagination`

**Files:**
- Modify: `components/admin/common/Pagination.tsx`

**ไม่เปลี่ยน API** ไฟล์นี้ยังเรียก `useT` และยังอยู่ที่เดิม — spec §5.2 อธิบายว่าทำไมถึงไม่ย้าย
เข้า `components/ui/` (มันผิดกฎ "ห้าม import dictionary" และการย้ายต้องแก้ call site ทั้ง 4 หน้า
ซึ่งเกินขอบเขตรอบนี้)

- [ ] **Step 1: แก้คลาส**

- `gray-*` → `slate-*` ทุกตัว
- ปุ่ม 4 ปุ่มใช้ `BUTTON_BASE` + `BUTTON_SIZE.sm` + `BUTTON_VARIANT.secondary` จาก `components/ui`
  แทนคลาสที่ประกอบเอง — และเพิ่ม `aria-label` จาก `t.pagination.*` เดิมที่ตอนนี้อยู่ใน `title` อย่างเดียว
- กล่องเลือกหน้า: `rounded-xl border-slate-200`, `<select>` ได้ focus ring
- แถบล่าง: `border-t border-slate-200 bg-slate-50`
- ลบ `h-[38px]` ทิ้ง เปลี่ยนเป็น `min-h-10` (ข้อบังคับข้อ 5)

- [ ] **Step 2: typecheck + ตรวจด้วยตา 4 หน้า**

Run: `npm run typecheck && npm run dev`

เปิดทั้ง 4 แท็บที่ใช้ไฟล์นี้ — คลังพาเลท, รายการ, ผู้ใช้, สถานที่ — แล้วดูว่า
แถบแบ่งหน้าหน้าตาเหมือนกันทั้งหมด เปลี่ยนหน้าได้ ปุ่มแรก/สุดท้ายจางตอนอยู่หน้าแรก/สุดท้าย

- [ ] **Step 3: commit**

```bash
git add components/admin/common/Pagination.tsx
git commit -m "style(admin): restyle shared Pagination onto the slate/brand palette"
```

---

# ปิดงาน

## Task 6.1: ตรวจรับตามเกณฑ์ 17 ข้อของ spec

**Files:** ไม่แก้อะไร นอกจากเจอปัญหา

- [ ] `npm run typecheck` — ไม่มี error
- [ ] `npm run test` — ผ่านหมด
- [ ] `npm run build` — ผ่าน
- [ ] เดินเกณฑ์ตรวจรับ §9 ข้อ 1–17 ใน spec ทีละข้อ ติ๊กตามจริง
- [ ] ข้อไหนไม่ผ่าน แก้แล้วรันซ้ำ ห้ามติ๊กโดยไม่ได้รัน

---

## Self-Review ของแผนนี้

**ครอบคลุม spec ครบไหม**

| spec | task |
|---|---|
| §4.1 Button | 1.1 |
| §4.2 PageHeader | 2.3 |
| §4.3 Menu | 2.1 |
| §4.4 FilterBar | 2.3 |
| §4.5 SearchInput | 1.3 |
| §4.6 SelectField | 1.3 |
| §4.7 DateRangeField | 1.4 |
| §4.8 ToggleChip | 1.3 |
| §4.9 Checkbox | 1.2 |
| §4.10 DataTable + SortableTh | 2.2 |
| §4.11 SelectionBar | 2.3 |
| §5.1 StatTile.selected | 4.2 |
| §5.2 Pagination | 5.1 |
| §5.3 dashboard PageHeader (D6) | 3.1 |
| §6.1 InventoryView | 4.2 (โครง) + 4.3 + 4.4 |
| §6.2 InventoryHeader | 4.4 |
| §6.3 InventoryStatusStrip | 4.2 |
| §6.4 InventoryFilters | 4.3 |
| §6.5 InventoryTable | 4.4 |
| §6.6 InventorySelectionBar | 4.4 |
| §6.7 useInventoryFilters | 4.1 |
| §6.8 AdminDashboard | 4.2 |
| §7 คีย์แปล 5 ตัว | 4.2 (2) + 4.3 (2) + 4.4 (1) |
| §9 เกณฑ์ตรวจรับ | 6.1 |

ไม่มีข้อไหนไม่มี task รองรับ

**ความสอดคล้องของชนิดข้อมูล**

- `SortState<K>` นิยามใน 2.2 และถูกใช้เป็นชนิดของ `sortConfig` ใน 4.4 — `SortConfig` เดิมของ
  `InventoryTable.tsx` คือ `{ key: keyof Pallet | 'days_overdue', direction } | null` ซึ่งเข้ากันได้กับ
  `SortState<keyof Pallet | 'days_overdue'> | null` ให้คง type alias เดิมไว้และประกาศให้มันเท่ากับตัวใหม่
- `ButtonVariant` จาก 1.1 ถูกใช้เป็น `variant` ของ `Menu` ใน 2.1 และของ `Button` ใน 3.1 / 4.4 — ชื่อตรงกัน
- `MenuItem.tone` ใช้ค่า `'brand' | 'accent' | 'neutral' | 'danger'` ทั้งใน 3.1 (แดชบอร์ด) และ 4.4 (⋯) — ตรงกัน
- `statusCounts` ที่ 4.1 คืน มีคีย์ตรงกับที่ `InventoryStatusStripProps.counts` รับใน 4.2 ทุกตัว
- `DateRange` จาก 1.4 กับ `dateRange` ใน `useInventoryFilters` เป็นรูปร่างเดียวกัน (`{start, end}`)
