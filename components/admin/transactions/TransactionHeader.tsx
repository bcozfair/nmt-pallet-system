import React from 'react';
import { History, Trash2, Download } from 'lucide-react';
import { useT } from '../../../hooks/useT';
import { Button, PageHeader } from '../../ui';

interface TransactionHeaderProps {
    onCleanup: () => void;
    onExport: () => void;
}

// ปุ่มลบข้อมูลเก่าของหน้านี้คือต้นทางของ `Button` variant `danger` -- ขอบแดงอ่อน
// บนพื้นขาว ไม่ใช่ปุ่มแดงทึบ เพราะเป็นคำสั่งที่แอดมินกดตามรอบปกติ ไม่ใช่ปุ่มฉุกเฉิน
// (ดูคอมเมนต์ใน components/ui/Button.tsx) หน้านี้จึงได้สีเดิมกลับมาเป๊ะ ๆ
// เปลี่ยนแค่ทรงปุ่มกับหัวเรื่องให้ตรงกับอีกห้าหน้า
export const TransactionHeader: React.FC<TransactionHeaderProps> = ({
    onCleanup,
    onExport,
}) => {
    const t = useT();

    return (
        <PageHeader
            title={t.transactions.title}
            subtitle={t.transactions.subtitle}
            icon={History}
            actions={
                <>
                    <Button variant="danger" icon={Trash2} onClick={onCleanup}>
                        {t.transactions.cleanup}
                    </Button>
                    <Button variant="secondary" icon={Download} onClick={onExport}>
                        {t.transactions.exportCsv}
                    </Button>
                </>
            }
        />
    );
};
