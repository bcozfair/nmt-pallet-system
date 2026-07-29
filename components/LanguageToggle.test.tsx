import React from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LanguageToggle } from './LanguageToggle';
import { setLanguage } from '../services/i18n';

// i18n เก็บภาษาไว้เป็น state ระดับโมดูล ไม่ใช่ใน provider -- เทสต์ก่อนหน้าที่สลับ
// ภาษาจึงค้างมาถึงเทสต์ถัดไป ตั้งกลับทุกครั้งก่อนเริ่ม
beforeEach(() => {
    setLanguage('th');
});

describe('LanguageToggle', () => {
    it('บอกภาษาที่เลือกผ่าน aria-pressed ทั้งสองโหมด', () => {
        const { rerender } = render(<LanguageToggle />);
        expect(screen.getByRole('button', { name: 'ไทย' }).getAttribute('aria-pressed')).toBe('true');
        expect(screen.getByRole('button', { name: 'EN' }).getAttribute('aria-pressed')).toBe('false');

        rerender(<LanguageToggle onColor />);
        expect(screen.getByRole('button', { name: 'ไทย' }).getAttribute('aria-pressed')).toBe('true');
        expect(screen.getByRole('button', { name: 'EN' }).getAttribute('aria-pressed')).toBe('false');
    });

    it('โหมด onColor สลับสีรางทั้งชุด ไม่ใช่ต่อคลาสทับของเดิม', () => {
        // ถ้าต่อทับ รางจะมีคลาสสีพื้นสองตัวบน element เดียว แล้วผู้ชนะจะตัดสินที่
        // ลำดับใน CSS ที่ build ออกมา ไม่ใช่ลำดับในสตริง
        const { container, rerender } = render(<LanguageToggle />);
        const track = () => container.firstElementChild as HTMLElement;

        expect(track().className).toContain('bg-slate-100');

        rerender(<LanguageToggle onColor />);
        expect(track().className).not.toContain('bg-slate-100');
        expect(track().className).toContain('bg-white/12');
    });

    it('โหมด onColor ใช้ focus ring สีขาว เพราะ brand-500 บน brand-900 แทบมองไม่เห็น', () => {
        render(<LanguageToggle onColor />);
        expect(screen.getByRole('button', { name: 'EN' }).className).toContain('outline-white');
    });

    it('โหมดปกติยังใช้ focus ring สีแบรนด์เหมือนเดิม', () => {
        render(<LanguageToggle />);
        expect(screen.getByRole('button', { name: 'EN' }).className).toContain('outline-brand-500');
    });
});
