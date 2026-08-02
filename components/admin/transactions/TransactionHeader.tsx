import React from 'react';
import { History, MoreVertical, Trash2, Download, Printer } from 'lucide-react';
import { useT } from '../../../hooks/useT';
import { Button, Menu, PageHeader } from '../../ui';

interface TransactionHeaderProps {
    onCleanup: () => void;
    onExport: () => void;
    /** Builds and prints the A4 history report. */
    onPrintReport: () => void;
}

// ล้างข้อมูลเก่าเคยเป็นปุ่ม `danger` ยืนอยู่หัวแถวเดียวกับพิมพ์รายงานและส่งออก
// ตอนนี้อยู่หลังปุ่ม "..." ตัวเดียวท้ายแถว ด้วยเหตุผลสองข้อ:
//
// 1. มันไม่ใช่คำสั่งที่ใครเปิดหน้านี้มาเพื่อกด อีกสองปุ่มคือสิ่งที่คนมาทำจริง ๆ
//    ทุกวัน ส่วนอันนี้ทำปีละครั้งและลบข้อมูลถาวร ปุ่มที่เห็นตลอดเวลาแต่ต้องไม่กด
//    คือปุ่มที่รอวันถูกกดผิด
// 2. ระยะห่างจากนิ้วเป็นด่านแรก ด่านที่สองคือกล่องยืนยันที่บังคับพิมพ์คำ
//    (`confirmPhrase` ใน components/ui/ConfirmDialog.tsx) -- ด่านเดียวไม่พอ
//    เพราะการกดปุ่มแดงแล้วกดยืนยันคือการกดสองครั้งที่ใช้ความตั้งใจเท่ากับครั้งเดียว
//
// เมนูยังคงสีแดงไว้ที่ตัวรายการ (`tone: 'danger'`) ไม่ใช่ที่ปุ่ม "..." -- คำเตือน
// ควรอยู่ตรงที่มือกำลังจะกด ไม่ใช่กระจายไปทั่วหัวเพจ
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
                    {/* `secondary` ไม่ใช่ `danger`: ปุ่มนี้ยังไม่ได้ทำอะไรเลย
                        มันแค่เปิดเมนู สีแดงตรงนี้จะเป็นคำเตือนที่ค้างอยู่บนหน้าจอ
                        ตลอดเวลาจนคนเลิกมองเห็นมัน */}
                    <Menu
                        label={t.transactions.moreActions}
                        icon={MoreVertical}
                        iconOnly
                        variant="secondary"
                        items={[
                            {
                                label: t.transactions.cleanup,
                                icon: Trash2,
                                tone: 'danger',
                                onClick: onCleanup,
                            },
                        ]}
                    />
                </>
            }
        />
    );
};
