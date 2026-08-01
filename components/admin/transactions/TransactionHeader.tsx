import React from 'react';
import { History, Trash2, Download, Printer } from 'lucide-react';
import { useT } from '../../../hooks/useT';
import { Button, PageHeader } from '../../ui';

interface TransactionHeaderProps {
    onCleanup: () => void;
    onExport: () => void;
    /** Builds and prints the A4 history report. */
    onPrintReport: () => void;
}

// ปุ่มลบข้อมูลเก่าของหน้านี้คือต้นทางของ `Button` variant `danger` -- ขอบแดงอ่อน
// บนพื้นขาว ไม่ใช่ปุ่มแดงทึบ เพราะเป็นคำสั่งที่แอดมินกดตามรอบปกติ ไม่ใช่ปุ่มฉุกเฉิน
// (ดูคอมเมนต์ใน components/ui/Button.tsx) หน้านี้จึงได้สีเดิมกลับมาเป๊ะ ๆ
// เปลี่ยนแค่ทรงปุ่มกับหัวเรื่องให้ตรงกับอีกห้าหน้า
export const TransactionHeader: React.FC<TransactionHeaderProps> = ({
    onCleanup,
    onExport,
    onPrintReport,
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
                    {/* Same control, same wording, same icon and same position as
                        the dashboard and inventory headers. All three build an A4
                        portrait document, so all three are one button -- the
                        orientation dropdown that used to be here belonged to a
                        screen that printed itself. */}
                    <Button variant="secondary" icon={Printer} onClick={onPrintReport}>
                        {t.common.printReport}
                    </Button>
                    {/* `primary` ตัวเดียวของหน้านี้ตามที่เจ้าของงานสั่ง -- ต่างจากหัวหน้าคลัง
                        กับแดชบอร์ดที่ปุ่มส่งออกเป็น `secondary` เพราะสองหน้านั้นมีปุ่มหลักของ
                        ตัวเองอยู่แล้ว ("เพิ่มพาเลท") ส่วนหน้านี้ไม่มี ปุ่มส่งออกจึงรับตำแหน่ง
                        ปุ่มหลักไปได้โดยไม่แย่งความสนใจกับใคร */}
                    <Button variant="primary" icon={Download} onClick={onExport}>
                        {t.common.exportData}
                    </Button>
                </>
            }
        />
    );
};
