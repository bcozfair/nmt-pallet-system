# ระบบโมดัลร่วม โดยเริ่มต่อสายที่หน้าคลังพาเลท

วันที่: 2026-07-28
สถานะ: อนุมัติแล้ว รอเขียนแผนลงมือ

---

## 1. โจทย์

โมดัลของแต่ละหน้าต้องถูกออกแบบใหม่ให้เป็นคอมโพเนนต์ที่ใช้ร่วมกันได้ทุกหน้า และเป็นสไตล์
เดียวกับสไตล์หลักของแอป โดย**รอบนี้ต่อสายให้หน้าคลังพาเลทก่อน**

งานนี้คือก้อนที่ spec รอบก่อนกันไว้เอง — `2026-07-27-inventory-ui-primitives-design.md`
ข้อ 8 เขียนว่า *"ไม่แตะโมดัลของหน้าคลังพาเลท (`InventoryModals.tsx`,
`BulkTransactionModal.tsx`) แม้จะยังใช้สีเก่าและคลาสแอนิเมชันที่ไม่มีจริงอยู่ —
เป็นงานคนละก้อน"*

---

## 2. สภาพปัจจุบัน

ทั้งแอปมีโมดัล 12 ตัวใน 8 ไฟล์ ไม่มีอะไรใช้ร่วมกันเลยแม้แต่ค่าเดียว

### 2.1 ตารางสภาพ

| ประเด็น | สภาพจริง |
|---|---|
| z-index | 4 ค่าปนกัน — `z-50`, `z-[100]`, `z-[9999]` ไม่มีระบบ |
| portal | 6 ตัวใช้ `createPortal` อีก 6 ตัวไม่ใช้ (เรนเดอร์ในต้นไม้ผู้เรียก) |
| Escape ปิด | **ไม่มีสักตัว** |
| focus trap / คืนโฟกัส | **ไม่มีสักตัว** — Tab หลุดออกไปหาสิ่งที่อยู่หลังโมดัลได้ |
| ล็อกสกรอลล์พื้นหลัง | **ไม่มีสักตัว** |
| คลิกพื้นหลังปิด | มีแค่ `PalletDetailModal.tsx:53` กับ `QRPrintModal.tsx:140` |
| แอนิเมชัน | `animate-in zoom-in-95` ทุกตัว ซึ่ง `index.css:326-344` บันทึกไว้เองว่าคลาสชุดนี้มาจากปลั๊กอินที่ไม่ได้อยู่ใน package.json **คอมไพล์ออกมาเป็นศูนย์ ไม่เคยทำงาน** |
| สี | `gray-*` / `blue-600` / `indigo-600` / `purple-*` ดิบ ไม่ใช่ `slate-*` และ token `brand-*` / `accent-*` |
| ความมน | `rounded-2xl` ทุกตัว ขณะที่การ์ดทุกใบบนหน้าเป็น `rounded-3xl` |

### 2.2 บั๊กที่เจอระหว่างสำรวจ (ไม่ใช่แค่เรื่องความสวย)

1. **แก้พาเลทไม่สำเร็จแล้วโมดัลยังปิด ข้อมูลที่พิมพ์หายหมด** —
   `useInventoryActions.ts:200-204` ดัก error ไว้เองแล้ว `toast.error` จบ ไม่โยนต่อ
   ส่วน `InventoryModals.tsx:224-225` เรียก `await onSave(...)` แล้ว `onClose()` ทันที
   รหัสซ้ำ (`23505`) จึงได้ผลลัพธ์เป็น: โมดัลปิด สิ่งที่พิมพ์หาย เหลือ toast สีแดงใบเดียว

2. **กดยืนยันแล้วไม่มีอะไรเกิดขึ้นเลย** — `BulkTransactionModal.tsx:59-61` ต่อ
   `new Date(\`${dateStr}T${timeStr}\`).toISOString()` โดยไม่ตรวจ ถ้าวันที่ว่างจะได้
   Invalid Date แล้ว `.toISOString()` โยน RangeError ซึ่งถูก catch กลืนเหลือแค่
   `console.error` ไม่มีข้อความใด ๆ ถึงผู้ใช้

3. **`font-black` (900)** — `BulkTransactionModal.tsx:90` และ `QRPrintModal.tsx:174`
   `AdminHelpers.tsx:138-143` บันทึกไว้แล้วว่าแอปโหลดฟอนต์แค่ 300–700 เบราว์เซอร์จึงสังเคราะห์
   น้ำหนัก 900 ขึ้นเอง ซึ่งทำให้วรรณยุกต์ไทยเลอะทับตัวอักษรข้างล่าง

4. **`alert()` บล็อกทั้งหน้า** — `QRPrintModal.tsx:134` ทั้งที่แอปมี toast service อยู่แล้ว

5. **input วันที่ที่ screen reader อ่านไม่ออก** — `BulkTransactionModal.tsx:170-184`
   เป็น `<input readOnly>` ที่ไม่มี label ซ้อนทับ `<input type=date>` ที่ไม่มี label เหมือนกัน
   ตัวบนแท็บโฟกัสได้แต่ไม่ประกาศอะไรเลย (ปัญหาเดียวกับที่ spec รอบก่อนแก้ในแถบตัวกรอง)

6. **สีนอก palette** — `PalletDetailModal.tsx:82-88` ใช้ `purple-50` / `purple-900`
   ซึ่งไม่มีอยู่ใน `@theme` ของ `index.css` เลย และ `QRPrintModal` ใช้ `indigo-600`
   ซึ่งก็ไม่มีเหมือนกัน

### 2.3 ของซ้ำ

| ของ | ซ้ำกี่ที่ |
|---|---|
| โครง overlay + panel + `role="dialog"` | 12 |
| หัวโมดัล (ไอคอน + หัวเรื่อง + ปุ่ม ✕) | 9 |
| ท้ายโมดัล (ยกเลิก + ยืนยัน) | 8 |
| โมดัลยืนยัน | 2 ไฟล์ที่เกือบเหมือนกันเป๊ะ — `InventoryModals.tsx:133` (`ConfirmModal`) กับ `common/ConfirmationModal.tsx` |

---

## 3. การตัดสินใจที่อนุมัติแล้ว

| # | ตัดสินใจ | เหตุผล |
|---|---|---|
| M1 | รอบนี้ต่อสาย **ทุกโมดัลที่หน้าคลังพาเลทเปิดถึงได้** — 6 ตัวที่หน้าเปิดโดยตรง (AddPallet, EditPallet, ยืนยัน, BulkTransaction, PalletDetail, QRPrint) บวก `ImageViewerModal` ที่เปิดซ้อนจาก PalletDetail รวม 7 | จบทั้งหน้า ไม่มีโมดัลสไตล์เก่าหลงเหลือให้สะดุดตอนดูจริง และ primitive ได้พิสูจน์กับโมดัลครบทุกทรง (ฟอร์มสั้น/ยาว ยืนยัน สกรอลล์ในตัว โมดัลซ้อนโมดัล) ก่อนเอาไปใช้หน้าอื่น |
| M2 | `Modal` เป็น **เปลือก + slot** คนเรียกเขียน body เอง ไม่ใช่ config-driven | โค้ดเบสตัดสินใจแบบเดียวกันแล้วกับ `DataTable` (`components/ui/index.ts:67-71`): *"จงใจไม่รับ columns[] + rows[] ... ถ้าทำเป็น config จะกลายเป็น config ที่อ่านยากกว่า JSX ที่มันแทน"* โมดัล 6 ตัวนี้ข้างในต่างกันมากกว่าตารางอีก (ไทม์ไลน์ประวัติ กริดพิมพ์ QR ฟอร์ม 3 แบบ) |
| M3 | **Escape ปิดทุกตัว** แต่ **คลิกพื้นหลังปิดเฉพาะโมดัลอ่านอย่างเดียว** | คลิกพลาดนอกกล่องที่เดียวทำที่กรอกมาหายหมดโดยไม่มี undo ส่วน Escape เป็นการกดโดยตั้งใจ |
| M4 | **ยุบโมดัลยืนยันเหลือตัวเดียว** และให้หน้าตั้งค่า/หน้ารายการเปลี่ยนตามด้วย | เจตนาเดียวกับที่รอบก่อนทำกับ `Pagination` — เป็นการเปลี่ยนที่ดีขึ้นและไม่มีการเปลี่ยน API |
| M5 | แตะข้างในโมดัลด้วย: **ย้ายฟอร์มมาใช้ primitive + จัดเลย์เอาต์ใหม่** | ถ้าเปลี่ยนแค่เปลือก โมดัลจะสวยข้างนอกแต่ข้างในยังเป็นสี `blue-600` ดิบกับ input ทรงเก่าคนละแบบกันทุกตัว |
| M6 | `focus trap` / คืนโฟกัส / ล็อกสกรอลล์ **ทำทุกตัว ไม่เป็นตัวเลือก** | เป็นมาตรฐาน a11y ของ dialog ไม่ใช่ของเสริม และการทำให้เป็น prop คือการเชิญให้มีโมดัลที่ลืมเปิด |

---

## 4. `components/ui/Modal.tsx`

**กฎประจำโฟลเดอร์ (`components/ui/index.ts:1-7`): ไฟล์ในนี้ห้าม import dictionary
ทุกข้อความที่ผู้ใช้เห็นต้องรับมาเป็น prop** — ของใหม่ทุกตัวในเอกสารนี้ทำตาม

### 4.1 API

```ts
export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';
export type ModalTone = 'brand' | 'accent' | 'danger';

export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** หัวเรื่อง — ผูกเป็น aria-labelledby ของ panel */
    title: string;
    subtitle?: React.ReactNode;
    icon?: LucideIcon;
    tone?: ModalTone;              // default 'brand' — ระบายชิปไอคอน
    size?: ModalSize;              // default 'md'
    /** เนื้อโมดัล เป็นตัวเลื่อนตัวเดียวของกล่อง */
    children: React.ReactNode;
    /** ปุ่มท้ายกล่อง ชิดขวา — คนเรียกใส่ <Button> เอง */
    footer?: React.ReactNode;
    /** ปุ่มบนหัว สำหรับโมดัลที่ body ยาวจนปุ่มท้ายเลื่อนหาย (QRPrint) */
    headerActions?: React.ReactNode;
    /** คลิกพื้นหลังแล้วปิด — เปิดเฉพาะโมดัลที่ไม่มีอะไรให้เสีย */
    dismissOnBackdrop?: boolean;   // default false
    /** วิ่งเส้นแบรนด์บนขอบบนขณะมีคำขอค้างอยู่ */
    busy?: boolean;
    /** ป้าย aria ของปุ่ม ✕ */
    closeLabel: string;
    /** 2 = โมดัลที่เปิดทับโมดัลอีกใบ (ImageViewer บน PalletDetail) */
    level?: 1 | 2;                 // default 1
}
```

### 4.2 พฤติกรรมที่ `useDialog` รับผิดชอบ

ฮุกอยู่ในไฟล์ `Modal.tsx` ไฟล์เดียวกัน ไม่แยกไฟล์ เพราะไม่มีผู้ใช้อื่นนอกจาก `Modal`

1. **`createPortal` ไป `document.body` เสมอ** — 6 ตัวที่ไม่ได้ทำอยู่ตอนนี้เสี่ยงถูก
   `overflow` ของ ancestor ตัดขอบ

2. **Escape ปิดเฉพาะโมดัลที่อยู่ในสุด** — เก็บ stack เป็น counter ระดับโมดูล โมดัลที่
   mount ทีหลังได้เลขสูงกว่าและเป็นตัวเดียวที่ตอบ Escape มิฉะนั้น Escape ครั้งเดียวจะปิด
   สองชั้นพร้อมกัน (เปิดรูปหลักฐานใน `PalletDetail` แล้วกด Escape ต้องปิดแค่รูป)

3. **focus trap** — วนโฟกัสในกล่อง โฟกัสองค์ประกอบที่โฟกัสได้ตัวแรกตอนเปิด และ
   **คืนโฟกัสกลับที่ element ที่เปิดโมดัล** ตอนปิด (เก็บ `document.activeElement` ไว้ตอน mount)

4. **ล็อกสกรอลล์พื้นหลัง** — `overflow: hidden` บน `<html>` พร้อม
   **ชดเชยความกว้าง scrollbar ด้วย `padding-right`** ไม่งั้นหน้าจะกระตุกกว้างขึ้นราว 15px
   ตอนเปิด คลายเมื่อโมดัล**ชั้นสุดท้าย**ปิดเท่านั้น (นับจาก stack เดียวกับข้อ 2)

5. **`role="dialog"` `aria-modal="true"` `aria-labelledby` อยู่บน panel ไม่ใช่ overlay** —
   `InventoryModals.tsx:51-59` อธิบายไว้แล้วสองเหตุผล: overlay ครอบทั้งจอ การตั้งชื่อมันว่า
   dialog เท่ากับบอก screen reader ว่าทุกอย่างที่อยู่ข้างหลังเป็นส่วนหนึ่งของ dialog
   และมันคือสิ่งที่ Escape guard ของ `SelectionBar` มองหา (`SelectionBar.tsx:14`) ถ้าหาไม่เจอ
   Escape เหนือโมดัลจะไปล้างการเลือกแถวที่อยู่ข้างหลังแทน

6. **แอนิเมชันใช้ `animate-pop-in`** ที่มีจริงใน `index.css:358` ไม่ใช่ `animate-in zoom-in-95`
   ที่คอมไพล์ออกมาเป็นศูนย์ — `index.css:382` จัดการ `prefers-reduced-motion` ให้แล้ว

### 4.3 ระบบชั้น

`z-[9999]` หายไปทั้งหมด มันเป็นตัวเลขที่ใส่มาเพื่อ "ให้ชนะแน่ ๆ" ซึ่งพอทุกตัวใส่เหมือนกัน
ก็เลิกหมายความว่าอะไร

| ชั้น | ค่า | ใคร |
|---|---|---|
| แถบเลือกลอย | `z-20` | `SelectionBar` (มีอยู่แล้ว) |
| overlay เมนูมือถือ | `z-30` | `AdminSidebar` (มีอยู่แล้ว) |
| sidebar | `z-40` | `AdminSidebar` (มีอยู่แล้ว) |
| โมดัลปกติ | `z-50` | `Modal level={1}` |
| โมดัลซ้อนโมดัล | `z-60` | `Modal level={2}` |

toast อยู่สูงกว่าทั้งหมด คงเดิม ไม่แตะ

### 4.4 พื้นผิว

```
MODAL_PANEL = rounded-3xl border ${CARD_SURFACE} + เงาของตัวเอง
```

- ใช้ `CARD_SURFACE` (`Card.tsx:33` — สีขอบ + สีพื้น) ซ้ำจริง เพื่อให้กล่องเป็นวัสดุเดียวกับ
  การ์ดทุกใบบนหน้า
- **แต่ประกาศรัศมีกับเงาเอง ห้ามเขียนเป็น `${CARD_SHELL} shadow-...`** — `Card.tsx:22-29`
  บันทึกกับดักนี้ไว้แล้ว: คลาสสองตัวที่คุมคุณสมบัติเดียวกันบน element เดียว ผู้ชนะตัดสินที่
  ลำดับใน CSS ที่ build ออกมา ไม่ใช่ลำดับในสตริง
- เงาต่างจาก `CARD_SHELL` เพราะเงานุ่มของการ์ดถูกจูนมาสำหรับพื้นสว่าง วางบน overlay ดำ
  แล้วหายไปเฉย ๆ ใช้เงาเข้มกว่าในตระกูลเดียวกับที่ `SelectionBar.tsx:116` ใช้บนพื้นเข้ม
- **รัศมี `rounded-3xl`** (ของเดิมทุกตัว `rounded-2xl`) วางโมดัลทับหน้าคลังแล้วมุมต้องมนเท่ากัน

**เส้นแบรนด์บนขอบบน** ใช้ `accent` + `busy` ของ `Card` ตรง ๆ — `Card.tsx:48-63` เขียนว่า
เส้นนี้คือ progress indicator ตัวเดียวของแอป *"ซึ่งเป็นเหตุผลว่าทำไมหน้าเข้าสู่ระบบถึงไม่มี
spinner แยก"* ตอนนี้โมดัลบอกสถานะกำลังบันทึกด้วยข้อความบนปุ่มอย่างเดียว

### 4.5 ขนาด

| `size` | ความกว้าง | ใคร |
|---|---|---|
| `sm` | `max-w-sm` | `ConfirmDialog` |
| `md` | `max-w-md` | `AddPallet`, `EditPallet`, `BulkTransaction` |
| `lg` | `max-w-lg` | `PalletDetail` |
| `xl` | `max-w-4xl` | `QRPrint` |

สูงสุด `max-h-[90vh]` เสมอ หัวกับท้าย `shrink-0` เนื้อตรงกลางเป็นตัวเลื่อนตัวเดียวด้วย
`styled-scrollbar` ที่มีอยู่แล้ว (`index.css:129`)

### 4.6 โครงสามส่วน

```
┌─────────────────────────────────────┐
│ ▔▔▔ เส้นแบรนด์ (accent, วิ่งตอน busy) │
│ [◧] หัวเรื่อง          headerActions ✕│  shrink-0
│     คำบรรยายรอง                     │
├─────────────────────────────────────┤
│  children                           │  overflow-y-auto styled-scrollbar
├─────────────────────────────────────┤
│              [ ยกเลิก ] [ ยืนยัน ]  │  shrink-0, bg-slate-50/70
└─────────────────────────────────────┘
```

- **ไอคอนหัวเรื่องเป็นชิป** กล่องมน 40px `bg-brand-50 text-brand-600` ไม่ใช่ไอคอนเปล่า
  เป็นภาษาเดียวกับชิปไอคอนในรายการของ `Menu` ที่รับ `tone` เข้าไป
  (`dashboard/sections/PageHeader.tsx:51-53`) โมดัลใช้ชุด `brand` / `accent` / `danger`
- **ท้ายเป็น slot ไม่ใช่ config** — คนเรียกใส่ `<Button>` เอง แต่ `Modal` คุมการจัดวาง
  (ชิดขวา `gap-3` เส้นคั่นบน พื้น `slate-50/70`)
- **`headerActions` มีไว้สำหรับ QRPrint ตัวเดียว** ปุ่มพิมพ์ของมันต้องเห็นตลอดขณะที่กริด
  ยาว ๆ ข้างล่างเลื่อน ปุ่มท้ายกล่องตอบโจทย์นั้นไม่ได้

---

## 5. `components/ui/ConfirmDialog.tsx`

```ts
export interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    confirmLabel: string;
    cancelLabel: string;
    closeLabel: string;
    isDestructive?: boolean;      // default false
    /** ป้ายปุ่มยืนยันขณะกำลังทำงาน */
    workingLabel: string;
    onConfirm: () => void | Promise<void>;
    onCancel: () => void;
}
```

สร้างทับ `Modal` `size="sm"` · `tone` เป็น `danger` หรือ `brand` ตาม `isDestructive` ·
ไอคอน `AlertTriangle` หรือ `CheckCircle` · ท้าย = ยกเลิก (`secondary`) + ยืนยัน
(`dangerSolid` หรือ `primary`)

**พฤติกรรม error:** รวมสองไฟล์แล้วต้องเลือกพฤติกรรมเดียว และของเดิมไม่เหมือนกัน —
`InventoryModals.tsx:145-156` ดัก error แล้ว `toast.error` พร้อมกันโมดัลไว้ไม่ให้ปิด
(มีคอมเมนต์อธิบายว่า `scrapPallet()` ปฏิเสธพาเลทที่ไม่ได้เสียหายจริง ๆ และทุกตัวพังได้จาก
RLS หรือเน็ต) ส่วน `ConfirmationModal.tsx:49-51` `await onConfirm()` เปล่า ๆ ไม่ดักอะไรเลย

**ใช้ตัวที่ดักเป็นมาตรฐาน** หน้าตั้งค่ากับหน้ารายการจึงได้สถานะกำลังทำงานและการดัก error
ที่ตอนนี้ไม่มี ติดมาด้วยโดยไม่ต้องแก้ call site

`common/ConfirmationModal.tsx` **ไม่ถูกลบ** แต่เหลือเป็น wrapper บาง ๆ ที่ map prop เดิม
(`isOpen` / `title` / `message` / `confirmLabel` / `isDestructive` / `onConfirm` / `onCancel`)
ไปยัง `ConfirmDialog` และเป็นที่เดียวที่เรียก `useT` เพื่อเติม `cancelLabel` / `closeLabel` /
`workingLabel` — `SettingsView.tsx` กับ `TransactionView.tsx` ไม่ต้องแก้อะไรเลย

`ConfirmModal` ใน `InventoryModals.tsx` **ถูกลบ** และ `InventoryView.tsx` เรียก
`ConfirmDialog` ตรง ๆ เพราะมันส่ง `t` ให้ได้อยู่แล้ว type `ConfirmActionType` ย้ายไปอยู่กับ
`useInventoryActions.ts` ซึ่งเป็นที่ที่สร้างค่ามันขึ้นมา

---

## 6. Primitive ฟอร์ม

`components/ui/` มีของสำหรับ**แถบตัวกรอง**ครบแล้ว แต่ไม่มีของสำหรับ**ฟอร์ม**
`SelectField` รับแค่ `ariaLabel` (`SelectField.tsx:14`) เพราะตัวกรองไม่มีป้ายที่มองเห็น
ฟอร์มในโมดัลต้องมี

### 6.1 `Field.tsx`

```ts
export interface FieldProps {
    /** ป้ายที่มองเห็น ผูกกับ control ผ่าน htmlFor/id */
    label: string;
    /** id ของ control ข้างใน — Field เดินสาย aria ให้จากตัวนี้ */
    htmlFor: string;
    required?: boolean;           // แสดงดอกจัน + aria-required บนคนเรียก
    /** คำอธิบายใต้ช่อง เช่นรูปแบบรหัสที่รับ */
    hint?: React.ReactNode;
    /** คำเตือนใต้ช่อง (สีเหลือง + ไอคอน) — ไม่ใช่ error */
    warning?: React.ReactNode;
    /** ข้อความผิดพลาด — ทับ hint และทำให้ช่องเป็นสถานะ error */
    error?: string;
    children: React.ReactNode;
}
```

`Field` เรนเดอร์ `<label>` + control + บรรทัดล่าง แล้วผูก `aria-describedby` ของ control
ไปยัง hint/warning/error โดยอัตโนมัติผ่าน `id` ที่คำนวณจาก `htmlFor` และตั้ง
`aria-invalid` เมื่อมี `error`

ลำดับความสำคัญของบรรทัดล่าง: `error` > `warning` > `hint` (แสดงทีละอย่าง ไม่ซ้อนกัน
เพื่อไม่ให้กล่องโตขึ้นตอนเกิด error แล้วปุ่มขยับ)

### 6.2 `TextInput.tsx` / `TextArea.tsx`

```ts
export interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    /** ทาสีสถานะผิดพลาด — Field ส่งมาให้เอง */
    invalid?: boolean;
    /** ตัวเลขรหัสพาเลทใช้ฟอนต์โมโน */
    mono?: boolean;
}
```

ทาสีชุดเดียวกับ `SelectField.tsx:48-52` เป๊ะ: `min-h-10 rounded-xl border-slate-200`
+ `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500`
สถานะ `invalid` เปลี่ยนสีขอบเป็น `border-red-300` และ focus ring เป็นแดง

`TextArea` เหมือนกันแต่ `min-h` มาจาก `rows` และ `resize-none`

**`type="date"` / `type="time"` เป็น native ล้วน ไม่มีลูกเล่นซ้อน input** —
`DateRangeField` ซ้อนเพราะต้องแสดง DD/MM/YYYY ในแถบตัวกรอง แต่ในฟอร์มไม่มีเหตุผลนั้น
และของซ้อนใน `BulkTransactionModal.tsx:170-184` ปัจจุบันเป็น input ไม่มี label ทับ input
ไม่มี label ซึ่ง screen reader อ่านไม่ออกทั้งคู่ ทิ้งตรงกว่าซ่อม

### 6.3 `Button.tsx` — เพิ่ม variant `dangerSolid`

`Button` ตอนนี้ไม่มี variant ที่ใช้เป็น**ปุ่มยืนยันการทำลาย**ได้ ตัวที่ชื่อ `danger`
(`Button.tsx:50-52`) เป็นแบบเส้นขอบ พื้นขาว ตัวหนังสือแดง ซึ่งยกมาจากปุ่ม cleanup
บนหัวเพจ — ถูกสำหรับ "ปุ่มอันตรายที่นั่งปนกับปุ่มอื่นบนหน้า" แต่ผิดสำหรับ "ปุ่มหลักในท้าย
โมดัลยืนยันลบ" ซึ่งของเดิมเป็นแดงทึบ (`InventoryModals.tsx:187`)

ถ้าใช้ `danger` เดิม ปุ่มยืนยันลบจะเบากว่าปุ่มยกเลิกข้าง ๆ ซึ่งกลับหัวลำดับความสำคัญ

```
dangerSolid: 'bg-red-600 text-white shadow-lg shadow-red-600/20 hover:bg-red-700 ' +
             'active:scale-[0.99] disabled:hover:bg-red-600'
```

ทรงเดียวกับ `primary` เป๊ะ เปลี่ยนแค่สี **variant เดิมทั้ง 7 ตัวไม่ถูกแตะ**

---

## 7. โมดัลที่เหลือของหน้าคลังพาเลท

(โมดัลยืนยันอยู่ในข้อ 5 แล้ว ที่นี่คืออีก 6 ตัว)

### 7.1 `AddPalletModal`

`md` · ไอคอนชิป `PackagePlus` tone `brand`

- `Field` รหัสพาเลท → `TextInput mono` uppercase + `hint` บอกรูปแบบรหัส
- `Field` สถานที่เริ่มต้น → `SelectField` icon `MapPin`
- ท้าย: `ยกเลิก` (secondary) + `สร้างพาเลท` (primary)

ของเดิมมีปุ่มเดียวกว้างเต็มแถวและ**ไม่มีปุ่มยกเลิก** ทางออกมีแค่กากบาทมุมขวาบน

**error ขึ้นในช่อง ไม่ใช่ toast** — รหัสซ้ำเป็น error ที่เกิดกับช่องใดช่องหนึ่งเสมอ
toast เด้งอยู่บนสุดของจอขณะที่สายตาอยู่ที่ช่องกรอก และมันหายเองในไม่กี่วินาที
ทั้งที่ช่องยังผิดอยู่ ย้ายไปเป็น `error` ของ `Field` โดยแปลง error ด้วย
`describeAppError` ที่ใช้อยู่แล้ว

### 7.2 `EditPalletModal`

`md` · โครงเดียวกับ Add

- `Field` รหัสพาเลท → `TextInput mono` + `warning` เรื่องการเปลี่ยนรหัส (ของเดิมมีอยู่แล้ว)
- `Field` หมายเหตุ → `TextArea rows={3}`
- ท้าย: `ยกเลิก` + `บันทึก` (primary)

**แก้บั๊ก 2.2 ข้อ 1:** `handleSavePalletEdit` เปลี่ยนจาก "ดักแล้ว toast แล้วจบ" เป็น
**โยน error ต่อหลังแปลงเป็นข้อความที่อ่านรู้เรื่อง** โดยคงตรรกะ `23505 → idExists`
ที่มีอยู่แล้วไว้ทั้งหมด และ**ตัด `toast.error` ตรงนั้นออก** โมดัลจับ error แล้วโชว์ใน `Field`
และ**ไม่ปิด** — สิ่งที่พิมพ์อยู่ยังอยู่ครบ

`toast.success` ตอนสำเร็จคงไว้ และ `setEditPallet(null)` ที่ hook เรียกเองตอนสำเร็จ
ยังทำงานเหมือนเดิม

### 7.3 `BulkTransactionModal` — รื้อหนักที่สุด

`md` · ไอคอนชิป `ArrowRightLeft` · คำบรรยายรอง = จำนวนพาเลทที่กำลังดำเนินการ

| ของเดิม | ของใหม่ | ทำไม |
|---|---|---|
| ปุ่มสองปุ่มในกล่องเทาที่ประกอบมือ (`:131-146`) | `SegmentedControl` | ของเดิมเป็น `<button>` สองตัวเปล่า ๆ screen reader ไม่รู้ว่ามันคือตัวเลือกสองทางที่เลือกได้อันเดียว ตัว primitive เป็น `role="radiogroup"` จริง เดินด้วยลูกศรได้ และเป็นวัตถุตัวเดียวกับสวิตช์ช่วงเวลาบนแดชบอร์ด |
| กริด 2 คอลัมน์ ปลายทางถูก `invisible` ตอนรับคืน | แถวเต็มความกว้าง ปลายทางเรนเดอร์เฉพาะตอนเบิกออก | segmented control กว้างโดยธรรมชาติ บีบครึ่งคอลัมน์แล้วป้ายไทยอัด และช่องว่างเปล่าครึ่งกล่องตอนรับคืนไม่ได้อธิบายอะไร |
| input วันที่ซ้อนสองชั้น (`:170-184`) | `Field` + `TextInput type="date"` / `type="time"` | เหตุผลใน 6.2 |
| ลิงก์ "แสดงรหัส" ในหัว + แถบรายการแยกนอกหัว (`:101-124`) | `<details>` ในเนื้อ ใต้ segmented control | ของเดิมปุ่มอยู่ในหัวแต่ผลไปโผล่นอกหัว อ่านไม่ออกว่าอะไรคุมอะไร และ `<details>` ได้พฤติกรรมกาง/หุบจากเบราว์เซอร์ฟรี |
| `font-black` (`:90`) | น้ำหนักจาก `Modal` (`font-semibold`) | บั๊ก 2.2 ข้อ 3 |
| ปุ่ม/ช่องสี `blue-*` `gray-*` | `Button` + primitive ฟอร์ม | สไตล์หลัก |

**แก้บั๊ก 2.2 ข้อ 2:** ตรวจ `dateStr`/`timeStr` ก่อนประกอบ และตรวจว่า `Date` ที่ได้ valid
(`Number.isNaN(d.getTime())`) ถ้าไม่ผ่านแสดง `error` ที่ `Field` วันที่ แทนที่จะปล่อยให้
`.toISOString()` โยน RangeError เข้า catch แล้วเงียบหาย

การรวมวันเวลาเป็น ISO ยังเป็นตรรกะเดิมทุกประการ (ตีความ input เป็นเวลาท้องถิ่นของเบราว์เซอร์
แล้วแปลงเป็น UTC) ไม่แตะ

### 7.4 `PalletDetailModal`

`lg` · หัว = รหัสพาเลท mono + `StatusBadge` + คำบรรยายรอง "เพิ่มเมื่อ …" ·
`dismissOnBackdrop` · ท้าย = `ปิด`

- **สองกล่องสถิติ → `StatTile`** ของเดิมประกอบเอง และกล่องขวาใช้ `purple-50` / `purple-900`
  ซึ่งไม่มีใน palette (`:82-88`) เปลี่ยนเป็น `StatTile` tone `brand` (สถานที่ปัจจุบัน)
  และ `accent` (ปฏิสัมพันธ์ล่าสุด)
- **จุดบนไทม์ไลน์ใช้ token `--color-series-*`** แทนสีดิบ blue/green/gray/red ที่ประกอบเอง
  (`:116-120`) "เบิกออก" จะเป็นน้ำเงินเฉดเดียวกับที่มันเป็นในกราฟแดชบอร์ด

  **ไม่ละเมิดกฎ CVD ที่ `index.css:62-75` ตั้งไว้** — กฎนั้นห้าม "co-plot ทั้งห้าสีโดยมีสี
  เป็นตัวแยกอย่างเดียว" แต่ทุกรายการบนไทม์ไลน์มีป้ายข้อความกำกับอยู่แล้ว
  (`t.action[tx.action_type]`) สีไม่ได้แบกความหมายลำพัง
- ตรรกะ `'scrap'` ที่ `:106-115` บันทึกไว้ว่าเคยพลาดแล้วทำให้ scrap ทาสีเป็น damage
  **ต้องคงไว้ครบ** และการ map ไปยัง token ก็เป็น `satisfies Record<ActionType, string>`
  เหมือนที่ป้ายข้อความทำ เพื่อให้ขาด case ไม่ได้โดยโครงสร้าง
- ย้ายมาใช้ `createPortal` (ของเดิมไม่ใช้)
- `ImageViewerModal` ที่เปิดจากในนี้เป็น **level 2** → `z-60` และ Escape ปิดตัวมันก่อน
  ไม่ปิดโมดัลข้างล่าง
- **ไม่แตะการโหลดข้อมูล** (`fetchPalletHistory` / `fetchUsers` / `getEvidenceSignedUrlMap`)
  และไม่แตะการ sign URL ของหลักฐาน

### 7.5 `QRPrintModal`

`xl` · `headerActions` = `พิมพ์ PDF` (primary) + `ปิด` (secondary) · `dismissOnBackdrop`

- ปุ่มยังอยู่บนหัวเหมือนเดิม เพราะ body เป็นกริดยาวที่ต้องเลื่อน
- `indigo-600` → `brand-600`, `blue-50` → `brand-50` (indigo ไม่อยู่ใน palette)
- `font-black` บนรหัสพาเลท → `font-bold` (บั๊ก 2.2 ข้อ 3)
- `alert(t.modals.downloadFailed)` → `toast.error` (บั๊ก 2.2 ข้อ 4)
- ย้ายมาใช้ `createPortal`
- **ไม่แตะตรรกะสร้างเอกสารพิมพ์** — มันสร้าง document ของตัวเองพร้อม inline style
  ซึ่ง `index.css:148-164` อธิบายไว้ว่าตั้งใจ และไม่แตะ `qrUrl` / การดาวน์โหลด PNG

### 7.6 `ImageViewerModal`

ย้ายมาใช้ `Modal level={2}` `dismissOnBackdrop` — ได้ Escape ปิดซึ่งตอนนี้**ไม่มี**
แถบปุ่มซูม/หมุน/ดาวน์โหลดใช้ `Button` ขนาด `sm`

**ไม่แตะตรรกะซูมและลากรูป** (`scale` / `position` / `isDragging`)

---

## 8. คำแปลใหม่

เพิ่มทั้งฝั่ง `en` และ `th` (ไฟล์ locale type ฝั่งไทยไว้กับฝั่งอังกฤษ คีย์ที่แปลข้างเดียว
จะทำให้ `npm run typecheck` แดง)

คีย์ `common.*` อยู่ในบล็อก `common` ของ `locales/en.ts` และ `locales/th.ts` โดยตรง
(ไม่มีไฟล์ `locales/common.ts`) ส่วนคีย์ของหน้าอยู่ใน `locales/admin/`

| ไฟล์ | คีย์ | en | th |
|---|---|---|---|
| `locales/en.ts` + `th.ts` (`common`) | `closeDialog` | `'Close dialog'` | `'ปิดหน้าต่าง'` |
| `locales/admin/inventory.ts` | `invalidDateTime` | `'Enter a valid date and time'` | `'กรุณาระบุวันที่และเวลาให้ถูกต้อง'` |

คีย์ที่เคยร่างไว้ว่าต้องเพิ่มชื่อ `palletIdFormatHint` **ไม่ต้องเพิ่ม** — `inventory.palletIdHint`
มีอยู่แล้วทั้งสองภาษา (`inventory.ts:63` / `:196` — `'Pallet ID (e.g., P105)'`)
ของเดิมเอามาใช้เป็น *ป้าย* ของช่อง ซึ่งผิดหน้าที่ ของใหม่ใช้ `common.palletId` เป็นป้าย
แล้วยกคีย์นี้ไปเป็น `hint` ใต้ช่องตามความหมายเดิมของมัน

**ที่นำมาใช้ซ้ำได้เลยไม่ต้องเพิ่ม:** `t.common.cancel`, `t.common.confirm`, `t.common.close`,
`t.common.save`, `t.common.saving`, `t.inventory.working`, `t.inventory.processing`,
`t.inventory.idExists`, `t.inventory.showIds` / `hideIds`, `t.action.check_out` / `check_in`

---

## 9. สิ่งที่ไม่ทำในรอบนี้

- **ไม่ย้ายโมดัลของหน้าผู้ใช้ / สถานที่ / รายการ** (`UserModals.tsx` 3 ตัว,
  `LocationModals.tsx`, `TransactionEditModal.tsx`) — รอบถัดไป
  ยกเว้น `common/ConfirmationModal.tsx` ที่หน้าตั้งค่ากับหน้ารายการใช้ ซึ่งเปลี่ยนตาม (M4)
- **ไม่ทำ bottom-sheet สำหรับจอแคบ** — D4 ของ spec รอบก่อนตัดสินไว้แล้วว่ามือถือมี
  `MobileInterface` แยกอยู่ โมดัลยังเป็นกล่องกลางจอ `p-4` เหมือนเดิม
- **ไม่แตะโมดัล/overlay ฝั่งมือถือ** (`QRScanner`, `FeedbackOverlay`, `DamageForm`) —
  เป็นเต็มจอ ไม่ใช่ dialog ลอย และอยู่คนละ shell
- **ไม่แตะ `StatusBadge`** — สีสถานะผูกกับกราฟแดชบอร์ดผ่าน `PALLET_STATUS_META`
- **ไม่แตะ service layer** และไม่แตะตรรกะการกรอง/เลือก/ตัดสินใจของหน้าคลังพาเลท
- **ไม่แตะ `DateRangeField`** — ลูกเล่นซ้อน input ของมันมีเหตุผลเฉพาะของแถบตัวกรอง (6.2)

---

## 10. สรุปไฟล์

**ใหม่ (6)**

```
components/ui/Modal.tsx              (+ useDialog อยู่ในไฟล์เดียวกัน)
components/ui/ConfirmDialog.tsx
components/ui/Field.tsx
components/ui/TextInput.tsx
components/ui/TextArea.tsx
components/ui/Modal.test.tsx
```

**แก้ (11)**

```
components/ui/index.ts                               เพิ่ม export
components/ui/Button.tsx                             เพิ่ม variant dangerSolid
components/admin/inventory/InventoryModals.tsx       เขียนใหม่ 2 ตัว, ลบ ConfirmModal
components/admin/inventory/BulkTransactionModal.tsx  เขียนใหม่
components/admin/inventory/InventoryView.tsx         ConfirmModal → ConfirmDialog
components/admin/modals/PalletDetailModal.tsx        เขียนใหม่
components/admin/modals/QRPrintModal.tsx             เปลือก + สี + toast
components/admin/common/ConfirmationModal.tsx        เหลือ wrapper บาง ๆ
components/admin/common/ImageViewerModal.tsx         ย้ายมาใช้ Modal level 2
hooks/inventory/useInventoryActions.ts               โยน error ต่อแทนกลืน + ย้าย ConfirmActionType เข้ามา
locales/en.ts, locales/th.ts                         คีย์ common.closeDialog
locales/admin/inventory.ts                           คีย์ใหม่ 2 ตัว (ทั้ง en/th)
```

---

## 11. เกณฑ์ตรวจรับ

**ผ่านเครื่องมือ**

1. `npm run typecheck` ไม่มี error
2. `npm run build` ผ่าน
3. `npm test` ผ่าน รวม `Modal.test.tsx` ที่ครอบ: Escape ปิดตัวในสุดเท่านั้น,
   focus trap วนในกล่อง, คืนโฟกัสกลับที่ปุ่มที่เปิด, ล็อก/คลายสกรอลล์ตาม stack,
   `role="dialog"` อยู่บน panel ไม่ใช่ overlay

**ตรวจด้วยตา (`npm run dev`)**

4. เปิดโมดัลทั้ง 6 ตัวเทียบกับการ์ดบนหน้าคลัง: มุมมนเท่ากัน สีกลางอุณหภูมิเดียวกัน
   ปุ่มทรงเดียวกัน ไม่มี `blue-600` / `indigo-600` / `purple-*` เหลืออยู่
5. โมดัลเด้งเข้าจริง (`animate-pop-in`) ไม่ใช่โผล่ทันที
6. เปิดโมดัลแล้วหน้าไม่กระตุกกว้างขึ้น และเลื่อนพื้นหลังไม่ได้ ปิดแล้วเลื่อนได้เหมือนเดิม
7. เปิด `PalletDetail` → กดรูปหลักฐาน → กด Escape: **ปิดแค่รูป** `PalletDetail` ยังเปิดอยู่
   กด Escape อีกครั้งจึงปิด และสกรอลล์พื้นหลังคลายตอนนั้นเท่านั้น
8. ติ๊กเลือกพาเลทแล้วเปิด `BulkTransaction` → กด Escape: โมดัลปิด **การเลือกไม่หาย**
   (Escape guard ของ `SelectionBar` ยังทำงาน)
9. เปิดโมดัลจากแถบเลือกลอย → โมดัลอยู่เหนือแถบ ไม่ถูกแถบทับ
10. คลิกพื้นหลังของ `AddPallet` / `EditPallet` / `BulkTransaction` → **ไม่ปิด**
    คลิกพื้นหลังของ `PalletDetail` / `QRPrint` / `ImageViewer` → ปิด
11. แก้รหัสพาเลทเป็นรหัสที่มีอยู่แล้ว กดบันทึก → **โมดัลไม่ปิด** ข้อความผิดพลาดขึ้นใต้ช่องรหัส
    และสิ่งที่พิมพ์ยังอยู่ครบ
12. `BulkTransaction` ล้างวันที่แล้วกดยืนยัน → ข้อความผิดพลาดขึ้นใต้ช่องวันที่
    ไม่ใช่เงียบหาย
13. ขณะบันทึก เส้นแบรนด์บนขอบบนโมดัลวิ่ง
14. `PalletDetail` ที่มีประวัติหลายสิบรายการ → หัวกับท้ายอยู่นิ่ง เนื้อตรงกลางเลื่อน
15. Ctrl+P ขณะเปิด `QRPrint` → ยังได้แผ่น QR เหมือนเดิมทุกประการ
16. หน้าตั้งค่ากับหน้ารายการ: โมดัลยืนยันได้หน้าตาใหม่ ทำงานเหมือนเดิม และตอนนี้ปุ่มยืนยัน
    ขึ้นสถานะกำลังทำงานด้วย

**คีย์บอร์ดและ screen reader**

17. เปิดโมดัลด้วยคีย์บอร์ด → โฟกัสเข้าไปในกล่อง, Tab วนอยู่ในกล่องไม่หลุดออกไปข้างหลัง,
    ปิดแล้วโฟกัสกลับที่ปุ่มที่เปิด
18. ทุกช่องในฟอร์มมี `<label>` ที่มองเห็นและผูกกับ control จริง (คลิกป้ายแล้วโฟกัสเข้าช่อง)
19. สวิตช์เบิกออก/รับคืนเดินด้วยลูกศรซ้ายขวาได้ และประกาศตัวเป็น radiogroup
20. ช่องที่มี error ประกาศ `aria-invalid` และข้อความถูกอ่านผ่าน `aria-describedby`

**ทั้งสองภาษา**

21. สลับ EN/TH แล้วไม่มีป้ายไหนถูกตัดขาดหรือดันกล่องแตก โดยเฉพาะปุ่มท้ายโมดัลและ
    segmented control
22. หัวเรื่องภาษาไทยไม่มีวรรณยุกต์เลอะ (ไม่มี `font-black` เหลือ)

---

## 12. ความเสี่ยง

| ความเสี่ยง | รับมือ |
|---|---|
| `Modal` ทำให้ Escape guard ของ `SelectionBar` พัง | `role="dialog"` + `aria-modal` อยู่บน panel เหมือนเดิมเป๊ะ ซึ่งเป็นสิ่งที่ `SelectionBar.tsx:14` มองหา และเกณฑ์ข้อ 8 ตรวจอาการเดิมโดยตรง |
| stack counter รั่วเมื่อ unmount ไม่เรียบร้อย แล้วสกรอลล์ค้างล็อก | cleanup ทุกเส้นทางวิ่งผ่าน `useEffect` cleanup ตัวเดียวเหมือนที่ `SelectionBar.tsx:98-101` ทำกับ CSS custom property และเกณฑ์ข้อ 7 ตรวจการคลายตาม stack |
| ยุบโมดัลยืนยันแล้วหน้าตั้งค่า/หน้ารายการพัง | `common/ConfirmationModal.tsx` คง API เดิมทั้งหมดเป็น wrapper สอง call site ไม่ต้องแก้ และเกณฑ์ข้อ 16 ตรวจ |
| ให้ `handleSavePalletEdit` โยน error ต่อ แล้ว call site อื่นที่เรียกมันไม่ได้ดัก | มี call site เดียวคือ `InventoryView.tsx:221` ซึ่งส่งต่อให้ `EditPalletModal` โดยตรง |
| จำนวนไฟล์ที่แตะเยอะ (ใหม่ 6 แก้ 11) | primitive ทั้ง 5 ตัวเล็กและอิสระ เขียนแผนให้ทำ primitive + เทสต์ให้จบก่อน แล้วค่อยต่อสายโมดัลทีละตัว โดยเรียงจาก `ConfirmDialog` (ง่ายสุด พิสูจน์เปลือก) ไป `BulkTransaction` (ยากสุด ใช้ primitive ครบทุกตัว) |
| `StatTile` ถูกออกแบบมาสำหรับ KPI บนแดชบอร์ด อาจไม่ฟิตในโมดัล | ถ้าไม่ฟิตให้ใช้ `STAT_TILE_BOX` (export แยกอยู่แล้ว `index.ts:15`) แทนตัวคอมโพเนนต์ ซึ่งเป็นเหตุผลที่มันถูก export แยกตั้งแต่แรก |
