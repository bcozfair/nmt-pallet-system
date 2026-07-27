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
