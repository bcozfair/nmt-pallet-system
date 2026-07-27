# ปรับ UX/UI หน้าจัดการคลังพาเลท โดยสกัด primitive ที่ใช้ร่วมกันได้

วันที่: 2026-07-27
สถานะ: อนุมัติแล้ว รอเขียนแผนลงมือ

---

## 1. โจทย์

หน้า "จัดการคลังพาเลท" ต้องสวยขึ้น ใช้ง่ายขึ้น และเป็นสไตล์เดียวกับหน้าแดชบอร์ด

ระหว่างคุยกันขอบเขตขยายออกไปหนึ่งชั้น: ส่วนประกอบที่สร้างในงานนี้ต้องออกแบบเป็น
primitive ที่อีก 4 หน้าของแอดมิน (รายการ ผู้ใช้ สถานที่ ตั้งค่า) หยิบไปใช้ได้ในรอบถัดไป
รอบนี้ **สร้าง primitive + ต่อสายให้หน้าคลังพาเลทหน้าเดียว** เพื่อให้ API ผ่านการพิสูจน์
กับ call site จริงหนึ่งที่ก่อน — ถ้า API ออกมาผิด แก้ที่เดียวยังถูก แก้ห้าที่ไม่ถูกแล้ว

---

## 2. สภาพปัจจุบัน

### 2.1 หน้าคลังพาเลทกับหน้าแดชบอร์ดใช้คนละภาษาการออกแบบ

หน้าแดชบอร์ดผ่านการเขียนใหม่มาแล้วและมี design system ของตัวเองอยู่ใน
`components/ui/` ส่วนหน้าคลังพาเลทยังเป็นของเดิม

| | แดชบอร์ด | คลังพาเลท |
|---|---|---|
| พื้นการ์ด | `CARD_SHELL` — `rounded-3xl` + เงานุ่ม | `rounded-xl shadow-sm border-gray-100` |
| สีกลาง | `slate-*` | `gray-*` |
| สีหลัก | token `brand-*` / `accent-*` | `blue-600` / `indigo-600` ดิบ |
| หัวเรื่อง | `text-xl font-semibold` เป็น `<h1>` | `text-3xl font-black` เป็น `<h2>` |
| ปุ่ม | `min-h-10 rounded-xl` + `focus-visible` ring | `px-4 py-2 rounded-lg` ไม่มี focus ring |

`gray` กับ `slate` เป็นสีกลางคนละอุณหภูมิ วางติดกันแล้วเห็นความต่างชัด

### 2.2 ปัญหาที่ไม่ใช่แค่เรื่องความสวย

1. **สกรอลล์ซ้อนสามชั้น** — `InventoryView.tsx:90` ล็อก `h-[calc(100vh-110px)]` +
   `overflow-hidden` ครอบ `overflow-y-auto` ซึ่งครอบตารางที่ล็อก
   `h-[calc(100vh-240px)]` อีกที ทั้งที่ `AdminDashboard.tsx:226` และ `index.css:159`
   บันทึกไว้แล้วว่าเลิกใช้รูปแบบนี้เพราะทำให้สกรอลล์บาร์ไม่ตรงกับหน้า ล้อเมาส์หยุดที่ขอบ
   และกล่องที่ล็อก 100vh พิมพ์ไม่ได้เพราะไม่มีอะไรอยู่ใต้ขอบจอให้ส่งเข้าเครื่องพิมพ์

2. **`font-black` (900)** — `AdminHelpers.tsx:139` บันทึกไว้ว่าแอปโหลดฟอนต์แค่ 300–700
   เบราว์เซอร์จึงสังเคราะห์น้ำหนัก 900 ขึ้นเอง ซึ่งทำให้วรรณยุกต์ไทยเลอะทับตัวอักษรข้างล่าง

3. **คลาสแอนิเมชันที่ไม่มีอยู่จริง** — `animate-in fade-in slide-in-from-top-2` ใน
   `InventoryHeader.tsx:44` `index.css:326` อธิบายไว้ว่าคลาสชุดนี้มาจากปลั๊กอิน
   `tailwindcss-animate` ที่ไม่ได้อยู่ใน package.json คอมไพล์ออกมาเป็นศูนย์ ไม่เคยทำงาน

4. **เข้าหน้ามาแล้วไม่มีตัวเลขบอกอะไรเลย** และเมื่อกดมาจาก KPI ของแดชบอร์ด
   (`onNavigate('overdue')`) ไม่มีอะไรบอกว่าตัวกรองไหนติดอยู่ ทำไมเห็นแค่ 12 แถว

5. **ระหว่างโหลดครั้งแรกหน้าโกหก** — `AdminDashboard` มี `palletsLoading` แต่ไม่ได้ส่งให้
   `InventoryView` (`AdminDashboard.tsx:175`) ตอนโหลด `pallets` ยังเป็น `[]`
   ตารางจึงขึ้นว่า "ไม่พบพาเลทที่ตรงกับตัวกรอง" ทั้งที่ยังโหลดไม่เสร็จ

6. **ช่องติ๊กเป็นวงกลม** (`InventoryTable.tsx:104,139`) วงกลมสื่อว่าเลือกได้อันเดียว
   ซึ่งตรงข้ามกับความจริง และช่อง "เลือกทั้งหมด" ไม่มีสถานะ indeterminate
   ติ๊กบางแถวแล้วช่องหัวตารางยังโล่งเหมือนไม่ได้เลือกอะไร

7. **แถบเลือกหลายแถวแทนที่หัวเพจ** — พอติ๊กเลือก ชื่อหน้าและปุ่มเพิ่มพาเลทหายไป
   และถ้าเลื่อนลงไปติ๊กแถวล่าง ๆ แถบอยู่นอกจอ ต้องเลื่อนกลับขึ้นไปกดปุ่ม
   ปุ่ม "ลบ" ซึ่ง `locales/admin/inventory.ts:89` เขียนเองว่าทำให้ประวัติหายถาวรกู้ไม่ได้
   นั่งห่างจากปุ่มพิมพ์ QR แค่ 8px

8. **`<th>` ทุกอันเป็น `cursor-pointer`** รวมคอลัมน์ "จัดการ" ที่กดแล้วไม่มีอะไรเกิดขึ้น
   ไม่มี `scope="col"` ไม่มี `aria-sort` และการเรียงลำดับกดได้ด้วยเมาส์เท่านั้น

9. **ช่องวันที่มี `<input readOnly>` ซ้อนทับ `<input type=date>`** ตัวบนแท็บโฟกัสได้
   แต่ไม่มี label ไม่ประกาศอะไรเลย

### 2.3 ของซ้ำข้ามหน้า (เหตุผลที่ต้องสกัด primitive)

| ของ | ซ้ำกี่ที่ | ที่ไหน |
|---|---|---|
| helper `SortIcon` (เหมือนกันเป๊ะ) | 4 | Inventory / Transaction / User / LocationTable |
| ช่วงวันที่ (คัดลอกทั้งบล็อก) | 2 | InventoryFilters, TransactionFilters |
| `<select>` + ไอคอน + chevron | 7 | Inventory 2, Transaction 3, User 2, Location 2 |
| ช่องค้นหา | 4 | ทุก Filters |
| โครงตาราง `h-[600px] lg:h-[calc(100vh-240px)]` | 3 | Inventory / Transaction / LocationTable |
| หัวเพจ h2 + ไอคอน + subtitle + ปุ่ม | 5 | ทุก Header + dashboard PageHeader |
| ปุ่ม | ~20 | ทั่วโฟลเดอร์ admin |

---

## 3. การตัดสินใจที่อนุมัติแล้ว

| # | ตัดสินใจ | เหตุผล |
|---|---|---|
| D1 | ทาสีใหม่ **และ** ปรับ UX (ไม่ใช่ทาสีอย่างเดียว) | โจทย์บอกว่าต้องใช้ง่ายขึ้นด้วย |
| D2 | เหนือตารางเป็น **แถบตัวเลข 4 ช่องที่กดกรองได้** แทน dropdown สถานะ | ตอบทั้ง "ตอนนี้มีอะไรเท่าไหร่" และ "ตัวกรองไหนติดอยู่" ด้วยองค์ประกอบเดียว |
| D3 | แถบเลือกหลายแถวเป็น **แถบลอยติดขอบล่างจอ** | เห็นตลอดไม่ว่าเลื่อนไปตรงไหน หัวเพจไม่หาย และแยกปุ่มอันตรายเข้าเมนูได้ |
| D4 | จอแคบ **เลื่อนซ้ายขวาเหมือนเดิม** ไม่ทำเลย์เอาต์การ์ด | มือถือมี `MobileInterface` แยกอยู่แล้ว ทุ่มเวลาไปกับเดสก์ท็อปคุ้มกว่า |
| D5 | สร้าง primitive ให้ generic แต่ **ต่อสายหน้าคลังพาเลทหน้าเดียว** | พิสูจน์ API กับ call site เดียวก่อน แก้ถูกกว่าถ้าออกแบบพลาด |
| D6 | **ย้าย dashboard `PageHeader` มาใช้ `Button` + `Menu` ด้วย** | `Menu` สกัดมาจากไฟล์นั้นตรง ๆ ฟิตแน่นอน และทำให้สองหน้าใช้โค้ดตัวเดียวกันจริง ไม่ใช่แค่หน้าตาเหมือน |

---

## 4. Primitive ใหม่ใน `components/ui/`

**กฎประจำโฟลเดอร์ (มีอยู่แล้วใน `components/ui/index.ts`): ไฟล์ในนี้ห้าม import
dictionary ทุกข้อความที่ผู้ใช้เห็นต้องรับมาเป็น prop** — ของใหม่ทุกตัวต้องทำตาม

### 4.1 `Button.tsx`

```ts
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;   // default 'secondary'
    icon?: LucideIcon;
    iconRight?: LucideIcon;
    size?: 'sm' | 'md';        // default 'md'
}

export const BUTTON_BASE: string;
export const BUTTON_VARIANT: Record<ButtonVariant, string>;
```

คลาสยกมาจาก `components/admin/dashboard/sections/PageHeader.tsx:46-53` ทั้งชุด
รวมคอมเมนต์เรื่อง `min-h-10` ห้ามเป็น `h-10` (ป้ายภาษาไทยกว้างกว่าอังกฤษ 1.4–1.7 เท่า
และเบราว์เซอร์ตัดคำกลางคำไม่ได้ ความสูงตายตัวจึงตัดป้ายขาดในภาษาเดียว)

`danger` = `bg-white border border-red-200 text-red-600 hover:bg-red-50`
(ยกมาจากปุ่ม cleanup ใน `TransactionHeader.tsx:27` ให้รอบหน้าย้ายมาใช้ได้เลย)

### 4.2 `PageHeader.tsx`

```ts
export interface PageHeaderProps {
    title: string;
    subtitle?: string;
    icon?: LucideIcon;
    actions?: React.ReactNode;
}
```

ออก `<h1>` เสมอ — อีก 4 หน้าใช้ `<h2>` เป็นหัวเพจซึ่งผิดโครงหัวเรื่อง หน้าหนึ่งมี `<h1>` ได้ตัวเดียว
และการ์ดข้างในเป็น `h2`/`h3` ผ่าน `SectionHeader` อยู่แล้ว

`items-start` + `flex-wrap` ยกเหตุผลมาจากไฟล์เดิม: หัวเรื่องภาษาไทยตัดสองบรรทัดในคอลัมน์แคบ
ถ้าจัดกึ่งกลางแนวตั้งปุ่มจะถูกลากลงไปกลางบล็อก

**ชื่อชนกัน:** ไฟล์เดิม `components/admin/dashboard/sections/PageHeader.tsx` ยังอยู่
แต่เปลี่ยนเป็น wrapper เฉพาะแดชบอร์ด (ปุ่มพิมพ์ + เมนูส่งออก) ที่เรียก `ui/PageHeader` ข้างใน

### 4.3 `Menu.tsx`

```ts
export type MenuTone = 'brand' | 'accent' | 'neutral' | 'danger';

export interface MenuItem {
    label: string;
    icon?: LucideIcon;
    tone?: MenuTone;          // ระบายชิปไอคอน; 'danger' ระบายข้อความด้วย
    onClick: () => void;
}

export interface MenuProps {
    label: string;            // ป้ายปุ่ม และ aria-label ของเมนู
    items: MenuItem[];
    icon?: LucideIcon;
    iconOnly?: boolean;       // ปุ่ม ⋯ — ซ่อนป้าย ใช้เป็น aria-label แทน
    align?: 'left' | 'right'; // default 'right'
    variant?: ButtonVariant;  // default 'primary'
    openUpward?: boolean;     // แถบเลือกอยู่ขอบล่างจอ เมนูต้องกางขึ้น
    disabled?: boolean;
}
```

ยกตรรกะจาก `PageHeader.tsx:91-171` มาทั้งหมด: `aria-haspopup` / `aria-expanded` /
`aria-controls`, ปิดด้วย Escape แล้วคืนโฟกัสไปที่ปุ่ม, ลูกศรขึ้นลง Home End,
ปิดเมื่อคลิกนอก (ผูก `mousedown` ไม่ใช่ `click` เพราะคลิกที่เริ่มนอกแล้วจบบนเมนูจะถูกนับเป็นคลิกนอก),
Tab ออก = ปิดโดยไม่ดึงโฟกัสกลับ, และผูก listener เฉพาะตอนเมนูเปิดเท่านั้น

`openUpward` เป็นของใหม่ที่ไฟล์เดิมไม่ต้องใช้ — จำเป็นเพราะเมนู ⋯ อยู่ในแถบที่ติดขอบล่างจอ

### 4.4 `FilterBar.tsx`

```ts
export interface FilterBarProps {
    children: React.ReactNode;   // ตัวควบคุมตัวกรอง
    resultLabel?: string;        // "พบ 12 รายการ"
    onClear?: () => void;
    clearLabel?: string;
    isFiltered?: boolean;        // คุมว่าจะโชว์แถวผลลัพธ์/ล้างไหม
}
```

`CARD_SHELL` + `p-3` ครอบแถว `flex flex-col xl:flex-row gap-3` และแถวผลลัพธ์อยู่ใต้การ์ด

### 4.5 `SearchInput.tsx`

```ts
export interface SearchInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    ariaLabel: string;
    clearLabel: string;        // aria-label ของปุ่ม ✕
    id?: string;
    name?: string;
}
```

ไอคอนแว่นซ้าย ปุ่ม ✕ ขวาโผล่เมื่อมีข้อความ (ของใหม่ ทั้ง 4 หน้าเดิมไม่มี)

### 4.6 `SelectField.tsx`

```ts
export interface SelectFieldProps {
    value: string;
    onChange: (value: string) => void;
    options: readonly { value: string; label: string }[];
    ariaLabel: string;
    icon?: LucideIcon;
    id?: string;
    name?: string;
    className?: string;        // ความกว้าง เช่น 'sm:w-48'
}
```

chevron อยู่ในตัว ไม่ต้องให้คนเรียกวาดเอง

### 4.7 `DateRangeField.tsx`

```ts
export interface DateRangeFieldProps {
    value: { start: string; end: string };
    onChange: (range: { start: string; end: string }) => void;
    startLabel: string;        // placeholder + aria-label
    endLabel: string;
    clearLabel: string;
    idPrefix?: string;
}
```

โครงเดิม (input วันที่โปร่งใสทับ input ข้อความที่แสดงรูปแบบ DD/MM/YYYY) แต่ input ตัวบน
ได้ `tabIndex={-1}` และ `aria-hidden="true"` เพราะมันเป็นของตกแต่ง ไม่ใช่ช่องกรอก

### 4.8 `ToggleChip.tsx`

```ts
export interface ToggleChipProps {
    pressed: boolean;
    onChange: (pressed: boolean) => void;
    label: string;
    icon?: LucideIcon;
    tone?: 'brand' | 'critical';   // default 'brand'
}
```

`<button aria-pressed>` จริง — ของเดิมวาดวงกลมเปล่ากับไอคอนติ๊กเอง ซึ่ง screen reader
ไม่รู้ว่าเป็นสวิตช์

### 4.9 `Checkbox.tsx`

```ts
export interface CheckboxProps {
    checked: boolean;
    indeterminate?: boolean;
    onChange: () => void;
    ariaLabel: string;
    id?: string;
}
```

`rounded-md` ไม่ใช่ `rounded-full` — วงกลมสื่อว่าเลือกได้อันเดียว ซึ่งตรงข้ามกับความจริง
`indeterminate` ตั้งผ่าน ref (attribute นี้ตั้งจาก HTML ไม่ได้ ต้องตั้งจาก JS)
class string ที่ฝัง base64 SVG ของเครื่องหมายถูกอยู่ในไฟล์นี้ที่เดียว

### 4.10 `DataTable.tsx` (+ export `SortableTh`)

```ts
export interface DataTableProps {
    head: React.ReactNode;        // <tr> ของ <SortableTh>
    children: React.ReactNode;    // <tbody>
    footer?: React.ReactNode;     // pagination
    caption?: string;             // sr-only
    isLoading?: boolean;
    isEmpty?: boolean;
    empty?: React.ReactNode;      // ปกติคือ <EmptyState/>
    loadingRows?: number;         // default 8
    loadingCols?: number;         // default 5
    minWidth?: number;            // px ใช้ต่ำกว่า xl
}

export interface SortableThProps<K extends string> {
    label: string;
    sortKey?: K;                  // ไม่ส่ง = คอลัมน์ที่เรียงไม่ได้
    sortConfig: { key: K; direction: 'asc' | 'desc' } | null;
    onSort?: (key: K) => void;
    align?: 'left' | 'right' | 'center';
    className?: string;           // สำหรับซ่อนตามความกว้าง เช่น 'hidden xl:table-cell'
}
```

**จงใจไม่รับ `columns[] + rows[]`** — ตารางทั้ง 4 หน้ามีเซลล์ต่างกันมาก (badge สถานะ
รูปหลักฐานความเสียหาย ชุดปุ่มคนละแบบ แถวรายละเอียดซ้อน) ถ้าทำเป็น config
จะกลายเป็น config ที่อ่านยากกว่า JSX ที่มันแทน primitive นี้ให้แค่: การ์ด สกรอลล์
หัวเกาะ สถานะโหลด สถานะว่าง และช่องใส่ pagination — `<tbody>` คนเรียกเขียนเอง

`minWidth` ส่งผ่าน `style` ไม่ใช่คลาส — Tailwind สแกนแต่ข้อความในซอร์ส
คลาสที่ประกอบตอนรันไทม์คอมไพล์ออกมาเป็นศูนย์ (`Skeleton.tsx:80` บันทึกกับดักนี้ไว้แล้ว)

**หัวตารางเกาะขอบบนได้เฉพาะ `xl` ขึ้นไป และนี่เป็นข้อจำกัดของ CSS ไม่ใช่ทางเลือก:**
element ที่มี `overflow-x: auto` กลายเป็น scroll container ทั้งสองแกน `position: sticky`
ข้างในจึงเกาะกับกล่องนั้นแทนที่จะเกาะกับ viewport และไม่มีทางเกาะได้เลยเพราะกล่องนั้นไม่มี
ความสูงจำกัด ทางออกคือ `overflow-x-auto xl:overflow-visible` — ที่ `xl` ขึ้นไปไม่มี
scroll container หัวตารางจึงเกาะ viewport ได้จริง ต่ำกว่านั้นเลื่อนซ้ายขวาและหัวไม่เกาะ

เลือก `xl` (1280px) ไม่ใช่ `lg` เพราะที่ 1024px คอลัมน์เนื้อหาเหลือราว 640px
(sidebar กิน 256px, padding อีก 64px) ซึ่งไม่พอให้ตาราง 8 คอลัมน์กางโดยไม่ล้น
ที่ 1280px เหลือราว 960px ซึ่งพอ และ `xl` ยังอยู่เหนือ `lg` ที่ header ของแอปเลิกเกาะพอดี
จึงใช้ `top-0` ได้ตรง ๆ ไม่ต้องฮาร์ดโค้ดความสูง header

### 4.11 `SelectionBar.tsx`

```ts
export interface SelectionBarProps {
    count: number;              // 0 = ไม่เรนเดอร์อะไรเลย
    countLabel: string;         // "เลือกไว้ 3 รายการ"
    onClear: () => void;
    clearLabel: string;
    actions?: React.ReactNode;  // ปุ่มหลัก
    menu?: React.ReactNode;     // ปกติคือ <Menu iconOnly openUpward/>
    detail?: React.ReactNode;   // แผงเสริมเหนือแถบ เช่น รายการรหัสที่เลือก
}
```

```
fixed inset-x-0 bottom-0 z-20 px-4 pb-4 lg:pl-[calc(16rem+1rem)]
  └ mx-auto max-w-4xl · bg-brand-900 · rounded-2xl · animate-surface-in
```

- `lg:pl-[calc(16rem+1rem)]` — sidebar เป็น `fixed w-64` (`AdminSidebar.tsx:74`)
  แถบต้องหลบให้พ้น ไม่งั้นจะโผล่ใต้ sidebar
- **`z-20` จงใจ** — ต่ำกว่า overlay เมนูมือถือ (`z-30`), sidebar (`z-40`)
  และโมดัลทุกตัว (`z-50` / `z-[100]` / `z-[9999]`)
- กด Escape = `onClear()` ผูก listener เฉพาะตอน `count > 0`
- `animate-surface-in` (มีจริงใน `index.css:351`) ไม่ใช่ `animate-in slide-in-*` ที่ไม่มีจริง
- **`print:hidden`** — element ที่เป็น `fixed` จะถูกพิมพ์ทับลงบนกระดาษทุกหน้า
  แถบนี้เป็นตัวควบคุม ไม่ใช่เนื้อหา (`index.css:201` จัดการ `.sticky` ไว้แล้ว แต่ไม่ครอบ `fixed`)

---

## 5. แก้ primitive ที่มีอยู่

### 5.1 `StatTile.tsx` — เพิ่ม `selected`

```ts
selected?: boolean;   // ใช้ร่วมกับ onClick เท่านั้น
```

เมื่อ `true` เพิ่ม `ring-2 ring-brand-500 ring-offset-2` และตั้ง `aria-pressed={selected}`
บนปุ่ม แดชบอร์ดไม่ส่ง prop นี้มาจึงไม่มีอะไรเปลี่ยน

### 5.2 `components/admin/common/Pagination.tsx` — ทาสีใหม่อยู่ที่เดิม

`gray` → `slate`, ปุ่มใช้คลาสชุดเดียวกับ `Button`, เพิ่ม focus ring

**ไม่ย้ายเข้า `components/ui/`** เพราะไฟล์นี้เรียก `useT` ซึ่งผิดกฎประจำโฟลเดอร์
การย้ายต้องเปลี่ยน API ให้รับข้อความเป็น prop แล้วแก้ call site ทั้ง 4 หน้า ซึ่งเกินขอบเขต D5
อยู่ที่เดิมแล้วทาสี = อีก 3 หน้าได้สีใหม่โดยไม่ต้องแก้อะไร เป็นข้อยกเว้นที่ตั้งใจ
ให้ย้ายพร้อมกับการย้ายอีก 4 หน้าในรอบถัดไป

### 5.3 `components/admin/dashboard/sections/PageHeader.tsx` — ย้ายมาใช้ primitive (D6)

เหลือแค่ส่วนที่เป็นของแดชบอร์ดจริง ๆ:

```tsx
<PageHeader
    title={t.dashboard.title}
    subtitle={t.dashboard.subtitle}
    actions={<>
        <Button variant="secondary" icon={Printer} onClick={onPrint} disabled={isBusy}>…</Button>
        <Menu label={t.dashboard.exportData} icon={FileText} disabled={isBusy}
              items={[…3 รายการ…]} />
    </>}
/>
```

ตัดโค้ดออกได้ราว 130 บรรทัด (ตรรกะเมนู 80 + ค่าคงที่ปุ่ม + มาร์กอัปหัวเพจ)
ทั้งหมดย้ายไป primitive ไม่ได้หายไปไหน คอมเมนต์อธิบายเหตุผลย้ายตามไปด้วย

**ต้องคงพฤติกรรมเดิมทุกอย่าง**: `print:hidden`, `aria-busy` บนกล่องปุ่ม,
ชิปสีต่อรายการเมนู (`brand-50` / `accent-50` / `slate-100` → map ผ่าน `tone`)

---

## 6. หน้าคลังพาเลท

### 6.1 `InventoryView.tsx`

```tsx
<div className={`flex flex-col gap-6 ${selectedIds.size > 0 ? 'pb-24' : ''}`}>
    <InventoryHeader … />
    <InventoryStatusStrip … />
    <InventoryFilters … />
    <InventoryTable … />
    <InventorySelectionBar … />
    …โมดัลเดิมทั้งหมด…
</div>
```

ทิ้ง `h-[calc(100vh-110px)]`, `overflow-hidden` และชั้น `overflow-y-auto` ข้างใน
ให้เอกสารเป็น scroll container เดียวเหมือนแดชบอร์ด

`pb-24` เผื่อไว้ตอนแถบลอยโผล่ ไม่ให้ทับแถวสุดท้ายกับ pagination

รับ prop ใหม่ `isLoading: boolean` จาก `AdminDashboard` (`palletsLoading` ที่มีอยู่แล้ว)

### 6.2 `InventoryHeader.tsx` — เหลือแค่หัวเพจ

```tsx
<PageHeader title={t.inventory.title} subtitle={t.inventory.subtitle} icon={Package}
    actions={<>
        <Button variant="secondary" icon={Download} onClick={onExport}>{t.inventory.exportList}</Button>
        <Button variant="secondary" icon={QrCode} onClick={onPrintQrAll}>{t.inventory.printAllQr}</Button>
        <Button variant="primary" icon={Plus} onClick={onAddPallet}>{t.inventory.addPallet}</Button>
    </>}
/>
```

ตรรกะโหมดเลือกทั้งหมดย้ายออกไป `InventorySelectionBar.tsx`

### 6.3 `InventoryStatusStrip.tsx` (ไฟล์ใหม่)

`StatTile` 4 ช่อง กริดเดียวกับ `KpiRow`: `grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4`

| ช่อง | ค่า `statusFilter` | tone | ไอคอน |
|---|---|---|---|
| `t.inventory.allActive` | `'all'` | brand | `Boxes` |
| `t.status.available` | `'available'` | accent | `CircleCheck` |
| `t.status.in_use` | `'in_use'` | neutral | `Activity` |
| `t.status.damaged` | `'damaged'` | warning | `AlertTriangle` |

`selected` = ช่องที่ตรงกับ `statusFilter` ปัจจุบัน

**ตัวเลขนับจากอะไร (สำคัญ):** นับจากพาเลทที่ผ่านตัวกรอง **ค้นหา + สถานที่ + วันที่ +
เกินกำหนด** แล้ว แต่ **ยังไม่ผ่านตัวกรองสถานะ** เพื่อให้ตัวเลขหมายความว่า
"ถ้ากดช่องนี้จะได้ N แถว" ถ้านับหลังกรองสถานะด้วย ทุกช่องที่ไม่ได้เลือกจะเป็น 0 หมด

ผลข้างเคียงที่ตั้งใจ ห้าม "แก้": เมื่อเปิด "เฉพาะเกินกำหนด" ช่อง พร้อมใช้ กับ เสียหาย
จะเป็น 0 เพราะพาเลทที่เกินกำหนดได้ต้องมีสถานะ `in_use` เท่านั้น ตัวเลขยังจริงตามกฎข้างบน
(กดแล้วได้ 0 แถวจริง ๆ) และทางออกอยู่ตรงหน้า คือชิปเฉพาะเกินกำหนดที่กดปิดได้

**"ตัดออกจากระบบ" ไม่เป็นช่องที่ 5** — เป็นบรรทัดเล็กใต้แถบ:
`ตัดออกจากระบบแล้ว 8 รายการ · ดูรายการ` โดย "ดูรายการ" ตั้ง `statusFilter = 'scrapped'`
เหตุผลยกมาจาก `KpiRow.tsx:136` ซึ่งตัดสินใจเรื่องเดียวกันไว้แล้ว: scrapped ถูกกันออกจาก
ยอดรวมและตัวหารของอัตราการใช้งานทุกที่ในโค้ดเบส ถ้าทำเป็น tile จะได้น้ำหนักสายตาเท่า
ตัวเลขสี่ตัวที่มันไม่ได้อยู่ในนั้น แล้วคนอ่านจะพยายามบวกสี่ช่องให้เท่ากับยอดที่ไม่มีมันอยู่
บรรทัดนี้จองที่ไว้ด้วย `min-h-4` แม้ตอนไม่มีอะไรจะบอก เพื่อไม่ให้แผงข้างล่างกระโดด

ตอนโหลด: `SkeletonTile` 4 ตัว ตัวแรกเท่านั้นที่ประกาศตัวเป็น live region
(สี่ตัวจะให้ screen reader พูดว่า "กำลังโหลด" สี่รอบสำหรับแถวเดียว)

### 6.4 `InventoryFilters.tsx`

```tsx
<FilterBar isFiltered={activeFilterCount > 0}
           resultLabel={t.inventory.resultCount(processedCount)}
           onClear={handleClearFilters} clearLabel={t.common.clearFilters}>
    <SearchInput … />
    <SelectField icon={MapPin} … />        {/* สถานที่ */}
    <DateRangeField … />
    <ToggleChip tone="critical" … />       {/* เฉพาะเกินกำหนด */}
</FilterBar>
```

**`<select>` สถานะหายไป** — แถบตัวเลขทำหน้าที่แทนแล้ว (D2)
`'scrapped'` เข้าถึงได้ผ่านลิงก์ "ดูรายการ" ใต้แถบตัวเลข

### 6.5 `InventoryTable.tsx`

```tsx
<DataTable minWidth={720} isLoading={isLoading}
           isEmpty={totalProcessedCount === 0}
           empty={<EmptyState icon={PackageSearch} title={t.inventory.noResults}
                              action={<Button variant="secondary" onClick={onClearFilters}>…</Button>} />}
           footer={totalProcessedCount > 0 && <Pagination … />}
           head={<tr>…</tr>}>
    <tbody>…</tbody>
</DataTable>
```

**คอลัมน์และการซ่อนตามความกว้าง** (ต่ำกว่า `xl` เหลือ 7 คอลัมน์ → `minWidth` 720px):

| คอลัมน์ | เรียงได้ | ซ่อนเมื่อ |
|---|---|---|
| ช่องติ๊ก | – | – |
| ID | `pallet_id` | – |
| สถานะ | `status` | – |
| อัปเดตล่าสุด | `last_transaction_date` | – |
| สถานที่ | `current_location` | – |
| เบิกออกล่าสุด | `last_checkout_date` | `hidden xl:table-cell` |
| เกินกำหนด | `days_overdue` | – |
| หมายเหตุ | `pallet_remark` | `hidden xl:table-cell` |
| จัดการ | – | – |

ข้อมูลสองคอลัมน์ที่ซ่อนยังอยู่ครบใน `PalletDetailModal` และในไฟล์ CSV ที่ส่งออก

**แถว:**
- ปกติ `hover:bg-slate-50`, ที่เลือก `bg-brand-50`
- เกินกำหนด: **เลิกใช้ `bg-yellow-200/30` ทั้งแถว** เพราะมันไปสู้กับสีฟ้าของแถวที่เลือก
  แล้วออกมาขุ่น และที่ความโปร่ง 30% บนพื้นขาวแทบมองไม่เห็นอยู่แล้ว
  เปลี่ยนเป็นขอบซ้าย `border-l-2 border-amber-400` + ชิปจำนวนวันสีแดงเหมือนเดิม
- ปุ่มในแถวได้ `aria-label` เพิ่มจาก `title` (screen reader บางตัวไม่อ่าน `title`)

### 6.6 `InventorySelectionBar.tsx` (ไฟล์ใหม่)

```tsx
<SelectionBar count={selectedCount} countLabel={t.inventory.selectedCount(selectedCount)}
              onClear={onClearSelection} clearLabel={t.common.cancel}
              detail={showIds && <รายการรหัสที่เลือก/>}
              actions={<>
                  {showTransactionButton && <Button variant="primary" icon={ArrowRightLeft}>…</Button>}
                  <Button icon={QrCode}>{t.inventory.printQr}</Button>
              </>}
              menu={<Menu iconOnly openUpward label={t.inventory.moreActions} icon={MoreHorizontal}
                          items={[…]} />} />
```

รายการในเมนู ⋯ ตามลำดับ:

| รายการ | tone | เงื่อนไข |
|---|---|---|
| แสดง/ซ่อนรหัส | neutral | เสมอ |
| ซ่อมแล้ว | brand | `showRepairButton` |
| ตัดออกจากระบบ | neutral | `showRepairButton` |
| ลบ | danger | เสมอ |

**"ลบ" อยู่ในเมนูไม่ใช่บนแถบ** — `locales/admin/inventory.ts:89` เขียนเองว่าการลบทำให้
ประวัติทั้งหมดหายถาวรและกู้ไม่ได้ ปุ่มแบบนั้นไม่ควรอยู่ห่างจากปุ่มที่กดบ่อยแค่ 8px
โมดัลยืนยันยังคงอยู่เหมือนเดิมทุกประการ

เงื่อนไข `showRepairButton` / `showTransactionButton` ใช้ตรรกะเดิมจาก `InventoryView.tsx:82-87`
ไม่แก้ รวมถึงกฎที่ว่า scrapped นับเป็นใช้งานไม่ได้เหมือน damaged
เพราะการเช็คอินจะพลิกสถานะกลับเป็น available แล้วลบล้างข้อเท็จจริงที่ว่า scrapped เป็นปลายทาง

### 6.7 `hooks/inventory/useInventoryFilters.ts`

เพิ่มค่าที่คำนวณจากข้อมูลเดิม ไม่แตะตรรกะการกรอง:

```ts
statusCounts: { all: number; available: number; in_use: number; damaged: number; scrapped: number }
activeFilterCount: number
```

วิธีทำ: แยก memo `baseFiltered` (ค้นหา + สถานที่ + วันที่ + เกินกำหนด) ออกมา แล้ว
`processedPallets` กรองสถานะต่อจาก `baseFiltered` และ `statusCounts` นับจาก `baseFiltered`
`all` = จำนวนที่ **ไม่ใช่** scrapped ซึ่งตรงกับความหมายของ `'all'` ในตัวกรองเดิม
(`useInventoryFilters.ts:68`)

`activeFilterCount` นับจาก: มีคำค้น / สถานที่ ≠ all / มีวันที่ / เปิดเฉพาะเกินกำหนด / สถานะ ≠ all

### 6.8 `components/admin/AdminDashboard.tsx`

ส่ง `palletsLoading` ให้ `InventoryView` เป็น prop `isLoading` (บรรทัด 175)
แดชบอร์ดได้รับอยู่แล้ว หน้าคลังพาเลทไม่ได้รับ — นี่คือต้นเหตุของปัญหา 2.2 ข้อ 5

---

## 7. คำแปลใหม่

เพิ่มใน `locales/admin/inventory.ts` ทั้ง `inventoryEn` และ `inventoryTh`
(ไฟล์นี้ type ฝั่งไทยไว้กับฝั่งอังกฤษ คีย์ที่แปลข้างเดียวจะทำให้ `npm run typecheck` แดง)

| คีย์ | en | th |
|---|---|---|
| `resultCount` | `(n) => \`${n} results\`` | `(n) => \`พบ ${n} รายการ\`` |
| `scrappedNote` | `(n) => \`${n} pallets scrapped\`` | `(n) => \`ตัดออกจากระบบแล้ว ${n} รายการ\`` |
| `viewScrapped` | `'View list'` | `'ดูรายการ'` |
| `moreActions` | `'More actions'` | `'การทำงานอื่น'` |
| `clearSearch` | `'Clear search'` | `'ล้างคำค้นหา'` |

**ที่นำมาใช้ซ้ำได้เลยไม่ต้องเพิ่ม:** ป้ายช่องตัวเลขใช้ `t.inventory.allActive` +
`t.status.*` ที่มีอยู่, ล้างตัวกรองใช้ `t.common.clearFilters`,
ยกเลิกใช้ `t.common.cancel`, กำลังโหลดใช้ `t.common.loading`,
แสดง/ซ่อนรหัสใช้ `t.inventory.showIds` / `hideIds`

---

## 8. สิ่งที่ไม่ทำในรอบนี้

- **ไม่ย้ายหน้ารายการ / ผู้ใช้ / สถานที่ / ตั้งค่ามาใช้ primitive** (D5) — รอบหน้า
- **ไม่แตะโมดัลของหน้าคลังพาเลท** (`InventoryModals.tsx`, `BulkTransactionModal.tsx`)
  แม้จะยังใช้สีเก่าและคลาสแอนิเมชันที่ไม่มีจริงอยู่ — เป็นงานคนละก้อน
- **ไม่แตะ `StatusBadge`** สีสถานะเป็นความหมายที่ใช้ร่วมกับกราฟในแดชบอร์ด
  (`PALLET_STATUS_META`) เปลี่ยนที่นี่จะทำให้กราฟกับตารางไม่ตรงกัน
- **ไม่แตะ service layer, hook การเลือก, hook การกระทำ**
- **ไม่ทำเลย์เอาต์การ์ดสำหรับจอแคบ** (D4)
- **ไม่ย้าย `Pagination` เข้า `components/ui/`** (5.2)

---

## 9. เกณฑ์ตรวจรับ

**ผ่านเครื่องมือ**
1. `npm run typecheck` ไม่มี error
2. `npm run build` ผ่าน

**ตรวจด้วยตา (`npm run dev`)**
3. หน้าคลังพาเลทกับหน้าแดชบอร์ดวางเทียบกันแล้วเป็นชุดเดียวกัน: การ์ดมนเท่ากัน
   สีกลางอุณหภูมิเดียวกัน ปุ่มทรงเดียวกัน
4. เลื่อนหน้าแล้วมีสกรอลล์บาร์เดียว ล้อเมาส์ไม่หยุดที่ขอบใด ๆ
5. กดช่องตัวเลข → ตารางกรองทันที ช่องนั้นขึ้นวง และตัวเลขในช่องอื่นยังเป็นจำนวนจริง ไม่เป็น 0
6. กด KPI "เกินกำหนด" จากแดชบอร์ด → เด้งมาหน้านี้พร้อมบรรทัด "พบ N รายการ" และปุ่มล้างตัวกรอง
7. ติ๊กบางแถว → ช่องหัวตารางเป็น indeterminate ไม่ใช่ว่าง
8. เลื่อนลงไปติ๊กแถวล่างสุด → แถบลอยยังอยู่ขอบล่างจอ กดปุ่มได้โดยไม่ต้องเลื่อนกลับขึ้น
9. เปิดโมดัลจากแถบลอย → โมดัลอยู่เหนือแถบ ไม่ถูกแถบทับ
10. บนจอ ≥1280px หัวตารางเกาะขอบบนตอนเลื่อน; ต่ำกว่านั้นตารางเลื่อนซ้ายขวาได้
11. รีเฟรชหน้า → เห็น skeleton ไม่ใช่ข้อความ "ไม่พบพาเลท"
12. Ctrl+P บนหน้าคลังพาเลท → ได้ทุกแถวในหน้าปัจจุบัน ไม่ใช่แค่ที่เห็นบนจอ
13. หน้าแดชบอร์ดยังทำงานเหมือนเดิมทุกอย่าง: ปุ่มพิมพ์ เมนูส่งออก 3 รายการ
    Escape ปิดเมนูแล้วโฟกัสกลับที่ปุ่ม ลูกศรขึ้นลงเดินในเมนูได้

**คีย์บอร์ดและ screen reader**
14. Tab เดินผ่านตัวกรอง → แถบตัวเลข → หัวตาราง → แถว → แถบลอย ได้ครบ ทุกจุดมี focus ring
15. หัวคอลัมน์ที่เรียงได้กด Enter/Space แล้วเรียง และมี `aria-sort` ถูกต้อง
    คอลัมน์ "จัดการ" ไม่เป็นปุ่มและไม่ขึ้นมือชี้
16. กด Escape ตอนเลือกอยู่ → ยกเลิกการเลือกทั้งหมด

**ทั้งสองภาษา**
17. สลับ EN/TH แล้วไม่มีป้ายไหนถูกตัดขาดหรือดันกล่องแตก โดยเฉพาะปุ่มบนแถบลอย
    และป้ายช่องตัวเลข

---

## 10. ความเสี่ยง

| ความเสี่ยง | รับมือ |
|---|---|
| แก้ dashboard `PageHeader` แล้วทำของที่ใช้งานได้อยู่พัง (D6) | `Menu` สกัดมาจากไฟล์นั้นตรง ๆ ย้ายคอมเมนต์เหตุผลไปด้วย และเกณฑ์ตรวจรับข้อ 13 ระบุพฤติกรรมเดิมไว้ครบ |
| ทาสี `Pagination` แล้วอีก 3 หน้าเปลี่ยนตาม | เจตนา — เป็นการเปลี่ยนที่ดีขึ้นและผู้ใช้รับทราบแล้ว ไม่มีการเปลี่ยน API |
| `DataTable` แคบเกินไปสำหรับอีก 3 ตาราง | เป็นเหตุผลของ D5 พอดี — พิสูจน์กับหน้าเดียวก่อน ตอนย้ายรอบหน้าถ้าไม่พอค่อยขยาย prop |
| หัวตารางไม่เกาะที่ 1024–1279px | เป็นข้อจำกัดของ CSS ที่อธิบายไว้ใน 4.10 ไม่ใช่การมองข้าม pagination 20 แถวต่อหน้าทำให้ผลกระทบจำกัด |
| จำนวนไฟล์ที่แตะเยอะ (ใหม่ 13 แก้ 11) | primitive แต่ละตัวเล็กและอิสระต่อกัน เขียนแผนให้ทำ primitive ให้จบก่อนแล้วค่อยต่อสายหน้าคลังพาเลท |

---

## 11. สรุปไฟล์

**ใหม่ (13)**

```
components/ui/Button.tsx
components/ui/PageHeader.tsx
components/ui/Menu.tsx
components/ui/FilterBar.tsx
components/ui/SearchInput.tsx
components/ui/SelectField.tsx
components/ui/DateRangeField.tsx
components/ui/ToggleChip.tsx
components/ui/Checkbox.tsx
components/ui/DataTable.tsx          (+ export SortableTh)
components/ui/SelectionBar.tsx
components/admin/inventory/InventoryStatusStrip.tsx
components/admin/inventory/InventorySelectionBar.tsx
```

**แก้ (11)**

```
components/ui/index.ts                                  เพิ่ม export
components/ui/StatTile.tsx                              เพิ่ม selected
components/admin/common/Pagination.tsx                  ทาสีใหม่
components/admin/dashboard/sections/PageHeader.tsx      ย้ายมาใช้ primitive
components/admin/AdminDashboard.tsx                     ส่ง palletsLoading
components/admin/inventory/InventoryView.tsx            ทิ้งการล็อกความสูง
components/admin/inventory/InventoryHeader.tsx          เหลือแค่หัวเพจ
components/admin/inventory/InventoryFilters.tsx         เขียนใหม่ด้วย primitive
components/admin/inventory/InventoryTable.tsx           เขียนใหม่ด้วย primitive
hooks/inventory/useInventoryFilters.ts                  เพิ่ม statusCounts
locales/admin/inventory.ts                              คีย์ใหม่ 5 ตัว
```
