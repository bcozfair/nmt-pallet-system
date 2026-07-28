import React from 'react';
import { Plus, MapPinned } from 'lucide-react';
import { useT } from '../../../hooks/useT';
import { Button, PageHeader } from '../../ui';

// เคยเป็น `<h2 className="text-3xl font-black">` พร้อมไอคอน `text-blue-600`
// ฝังอยู่ในหัวเรื่อง และปุ่ม `bg-blue-600` ที่ประกอบคลาสเอง -- สไตล์เดียวกับที่
// หน้าผู้ใช้ รายการเดินพาเลท และตั้งค่า เคยทำซ้ำกันคนละชุด ตอนนี้ทั้งหกหน้า
// ผ่าน components/ui/PageHeader ตัวเดียว จึงได้ขนาด น้ำหนัก และสีไอคอนชุดเดียวกัน
// โดยไม่มีใครต้องจำตัวเลข
export const LocationHeader: React.FC<{ onAdd: () => void }> = ({ onAdd }) => {
    const t = useT();

    return (
        <PageHeader
            title={t.locations.title}
            subtitle={t.locations.subtitle}
            icon={MapPinned}
            actions={
                <Button variant="primary" icon={Plus} onClick={onAdd}>
                    {t.locations.addLocation}
                </Button>
            }
        />
    );
};
