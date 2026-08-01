import React from 'react';
import { History, Trash2, Download } from 'lucide-react';
import { useT } from '../../../hooks/useT';
import type { PageOrientation } from '../../../hooks/usePageOrientation';
import { Button, PageHeader, PrintMenu } from '../../ui';

interface TransactionHeaderProps {
    onCleanup: () => void;
    onExport: () => void;
    onPrintReport: (orientation: PageOrientation) => void;
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
                    {/* Same control, same wording and same order as the
                        dashboard and inventory headers -- see PrintMenu. */}
                    <PrintMenu
                        label={t.common.printReport}
                        landscapeLabel={t.common.printLandscape}
                        portraitLabel={t.common.printPortrait}
                        onPrint={onPrintReport}
                    />
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
