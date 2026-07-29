import React from 'react';
import { Languages } from 'lucide-react';
import { LANGUAGES } from '../locales';
import { setLanguage } from '../services/i18n';
import { useLang } from '../hooks/useT';

export interface LanguageToggleProps {
    /**
     * วางอยู่บนพื้นแบรนด์ทึบแทนพื้นอ่อน -- ใช้ที่ StaffHeader เท่านั้น
     *
     * โหมดนี้เคยมีอยู่แล้วครั้งหนึ่ง แล้วถูกลบไปตอนที่ไม่มีหน้าไหนมีหัวสีทึบเหลือ
     * มันกลับมาเพราะหน้าฝั่งพนักงานมีอีกครั้ง ไม่ใช่เพราะ "เผื่อไว้"
     */
    onColor?: boolean;
}

// สลับทั้งชุด ไม่ใช่ต่อคลาสทับ: `bg-white/12` ต่อท้ายสตริงที่มี `bg-slate-100`
// อยู่แล้วจะได้คลาสสีพื้นสองตัวบน element เดียว และผู้ชนะตัดสินที่ลำดับใน CSS
// ที่ build ออกมา ไม่ใช่ลำดับในสตริง -- กับดักเดียวกับที่ Card.tsx:44-55 บันทึกไว้
const TRACK = {
    light: 'bg-slate-100 text-slate-500',
    dark: 'border border-white/20 bg-white/12 text-white/70',
} as const;

// ชิปที่เลือกอยู่บนพื้นเข้มใช้ `brand-800` ไม่ใช่ `brand-700`: ชิปเป็นสีขาวทึบวาง
// บนพื้น brand-900 ตัวอักษรจึงต้องเข้มขึ้นอีกขั้นเพื่อไม่ให้ชิปทั้งใบอ่านว่า "จาง"
const CHIP_ON = {
    light: 'bg-white text-brand-700 shadow-sm',
    dark: 'bg-white text-brand-800 shadow-sm',
} as const;

const CHIP_OFF = {
    light: 'hover:text-slate-700',
    dark: 'hover:text-white',
} as const;

// `outline-white` ทับ `outline-brand-500` ได้เพราะ Tailwind ปล่อย outline-white
// ออกมาทีหลังใน stylesheet ที่ build แล้ว -- กลไกเดียวกับที่ Button.tsx:99-104
// (`inverseGhost`) ใช้อยู่ ไม่ใช่การเดา
const RING = {
    light: 'focus-visible:outline-brand-500',
    dark: 'focus-visible:outline-white',
} as const;

export const LanguageToggle: React.FC<LanguageToggleProps> = ({ onColor = false }) => {
    const lang = useLang();
    const mode = onColor ? 'dark' : 'light';

    return (
        <div
            className={`inline-flex shrink-0 items-center gap-1 rounded-full p-1 pl-2.5 ${TRACK[mode]}`}
        >
            <Languages size={14} className="shrink-0 opacity-70" aria-hidden="true" />
            {LANGUAGES.map(({ code, label }) => (
                <button
                    key={code}
                    type="button"
                    onClick={() => setLanguage(code)}
                    // aria-pressed ไม่ใช่ aria-label ต่อปุ่ม: ข้อความที่เห็นคือชื่อ
                    // ภาษานั้นเอง ซึ่งบอกอยู่แล้วว่าปุ่มทำอะไร
                    aria-pressed={lang === code}
                    className={
                        'rounded-full px-2.5 py-1 text-xs font-bold transition ' +
                        'focus-visible:outline-2 focus-visible:outline-offset-2 ' +
                        `${RING[mode]} ` +
                        (lang === code ? CHIP_ON[mode] : CHIP_OFF[mode])
                    }
                >
                    {label}
                </button>
            ))}
        </div>
    );
};
