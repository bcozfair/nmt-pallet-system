import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Save } from 'lucide-react';
import { Button } from './Button';

describe('Button', () => {
    it('ขนาด lg ให้เป้ากดสูงกว่า md', () => {
        const { rerender } = render(<Button size="md">บันทึก</Button>);
        expect(screen.getByRole('button').className).toContain('min-h-10');

        rerender(<Button size="lg">บันทึก</Button>);
        expect(screen.getByRole('button').className).toContain('min-h-14');
    });

    it('ขนาด lg ใช้ min-h ไม่ใช่ h ตายตัว ป้ายไทยจึงไม่ถูกตัด', () => {
        // ป้ายไทยกว้างกว่าต้นฉบับอังกฤษ 1.4-1.7 เท่า และเบราว์เซอร์ตัดคำกลางคำไม่ได้
        // ความสูงตายตัวจึงตัดป้ายขาดในภาษาเดียว -- ภาษาที่คนรีวิวสกรีนช็อตอังกฤษไม่มีวันเห็น
        render(<Button size="lg">ยืนยันและบันทึกรายการทั้งหมด</Button>);
        const cls = screen.getByRole('button').className;
        expect(cls).toContain('min-h-14');
        expect(cls).not.toMatch(/(^|\s)h-14(\s|$)/);
    });

    it('ไอคอนของขนาด lg โตขึ้นเป็น 18px', () => {
        render(
            <Button size="lg" icon={Save}>
                บันทึก
            </Button>,
        );
        const svg = screen.getByRole('button').querySelector('svg');
        expect(svg?.getAttribute('width')).toBe('18');
    });

    it('ขนาดเดิมสองตัวไม่เปลี่ยน', () => {
        const { rerender } = render(<Button size="sm">ก</Button>);
        expect(screen.getByRole('button').className).toContain('min-h-8');

        rerender(<Button>ก</Button>);
        expect(screen.getByRole('button').className).toContain('min-h-10');
    });
});
