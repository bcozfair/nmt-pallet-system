import React, { useEffect, useRef, useState } from 'react';

export interface StickyHeaderProps {
    children: React.ReactNode;
    className?: string;
}

// ตรึงทุกอย่างเหนือตาราง -- หัวเพจ แถบไทล์ แถบกรอง -- ไว้ที่ยอดจอ แล้วปล่อยให้
// เลื่อนเฉพาะแถวข้อมูลลงไปจนถึงตัวแบ่งหน้า
//
// ใช้ `position: sticky` ไม่ใช่กล่องที่ล็อกความสูงแล้วให้ข้างในเลื่อน เพราะทั้งแอปนี้
// เลิกใช้กล่องเลื่อนซ้อนไปแล้วด้วยเหตุผลที่บันทึกไว้ใน InventoryView.tsx และ
// AdminDashboard.tsx: สกรอลล์บาร์จะเป็นของกล่องข้างใน ล้อเมาส์จึงหยุดตายที่ขอบกล่อง
// แทนที่จะไหลต่อลงเอกสาร และกล่องที่ล็อก 100vh ไม่มีอะไรใต้เส้นให้ส่งเครื่องพิมพ์
// sticky ตรึงได้โดยที่เอกสารยังเป็นตัวเลื่อนเดียวของหน้าเหมือนเดิม
//
// ตรึงเฉพาะ xl ขึ้นไป ด้วยเหตุผลเดียวกับที่ DataTable ตรึงหัวตารางที่ xl (ดูคำอธิบาย
// ในไฟล์นั้น) และเพราะบนจอแคบกองนี้สูงเกือบ 500px -- ตรึงไว้แล้วจะไม่เหลือที่ให้แถว
//
// พื้นหลังใส่เฉพาะ "ตอนเกาะอยู่จริง" ไม่ใช่ใส่ค้างไว้ตลอด
//
// รอบแรกลองใส่พื้นค้างไว้เป็นกระจกฝ้า (slate-50 ที่ 90% + backdrop-blur) เพื่อไม่ให้
// บล็อกทึบไปบังไล่สีของ .app-canvas ตรงยอดหน้า -- ซึ่งเป็นจุดที่ไล่สีนั้นสว่างที่สุด
// และเป็นเหตุผลทั้งหมดที่มันมีอยู่ ผลคือแลกมาด้วยของที่แย่กว่า: 10% ที่เหลือทำให้
// เห็นขอบการ์ดตารางกับแถวข้อมูลวิ่งอยู่ข้างหลังกองตลอดเวลาที่เลื่อน
//
// การรู้ว่าเกาะอยู่หรือยังทำให้ไม่ต้องแลกอะไรเลย: ตอนยังไม่เลื่อน กองนี้ไม่มีพื้นหลัง
// ไม่มีเงา หน้าตาเหมือนตอนไม่มี component นี้ทุกประการ ไล่สีจึงอยู่ครบ พอเลื่อนจน
// เกาะแล้วค่อยได้พื้นทึบเต็มกับเงาบาง ๆ ใต้ขอบ ซึ่งตอนนั้นไล่สีเลื่อนพ้นจอไปแล้ว
// ไม่มีอะไรให้รักษาอีก
export const StickyHeader: React.FC<StickyHeaderProps> = ({ children, className = '' }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [stuck, setStuck] = useState(false);

    // อ่านตำแหน่งจริงเทียบยอด viewport แทนที่จะเดาจาก scrollY เพราะระยะที่กองนี้
    // อยู่ห่างจากยอดเอกสารไม่คงที่ -- padding ของ <main> ต่างกันตามความกว้าง
    //
    // ต่ำกว่า xl กองนี้ไม่ได้เกาะ ค่านี้จึงเป็น true ทันทีที่เลื่อนผ่าน แต่คลาสที่
    // ผูกกับมันมี xl: นำหน้าทุกตัว จึงไม่มีผลอะไรที่ความกว้างนั้น
    useEffect(() => {
        const node = ref.current;
        if (!node) return;

        // รวบ scroll event หลายตัวให้เหลือการวัดครั้งเดียวต่อเฟรม -- ไม่งั้นทุก
        // event จะบังคับให้เบราว์เซอร์คำนวณ layout ใหม่กลางการเลื่อน
        let frame = 0;
        const measure = () => {
            frame = 0;
            setStuck(node.getBoundingClientRect().top <= 0);
        };
        const onScroll = () => {
            if (!frame) frame = requestAnimationFrame(measure);
        };

        measure();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll, { passive: true });
        return () => {
            if (frame) cancelAnimationFrame(frame);
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
        };
    }, []);

    // หัวตารางต้องเกาะ "ใต้กองนี้พอดี" ไม่ใช่ที่ top-0 ความสูงของกองบอกล่วงหน้า
    // ไม่ได้ -- ป้ายไทยกว้างกว่าอังกฤษ ไทล์ตัดบรรทัดไม่เท่ากันในแต่ละความกว้าง
    // และแถบกรองก็สูงไม่เท่ากัน จึงวัดของจริงแล้วประกาศไว้ที่ <html> ให้ DataTable
    // อ่านผ่าน --sticky-head-h เหมือนที่ SelectionBar ทำกับ --selection-bar-h
    useEffect(() => {
        const node = ref.current;
        if (!node) return;
        const root = document.documentElement;

        const publish = () => {
            root.style.setProperty('--sticky-head-h', `${Math.ceil(node.getBoundingClientRect().height)}px`);
        };
        publish();

        // jsdom (และเบราว์เซอร์เก่ามาก) ไม่มี ResizeObserver -- ค่าที่ประกาศรอบแรก
        // ยังถูกต้อง แค่ไม่อัปเดตตามอีก
        const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(publish);
        observer?.observe(node);

        return () => {
            observer?.disconnect();
            root.style.removeProperty('--sticky-head-h');
        };
    }, []);

    return (
        <div
            ref={ref}
            className={
                // pt-6 / pb-4 เป็นเบาะรอง ไม่ใช่ระยะห่าง และ -mt-6 / -mb-4 หักออก
                // เท่ากันทั้งคู่ กองจึงกินที่เท่าเดิม จังหวะของหน้าตอนยังไม่เลื่อน
                // ไม่ขยับสักพิกเซล
                //
                // ข้างบน (pt-6) คือที่ว่างตอนเกาะแล้ว ของเดิมเกาะที่ top-0 โดยไม่มี
                // padding ด้านบน หัวเพจจึงไปแปะขอบจอสนิท
                // ข้างล่าง (pb-4) ปิดช่อง gap-4 ระหว่างกองกับการ์ดตาราง ถ้าไม่มี
                // แถวที่เลื่อนผ่านจะโผล่ให้เห็นในช่องนั้น
                'xl:sticky xl:top-0 xl:z-20 xl:-mt-6 xl:-mb-4 xl:pt-6 xl:pb-4 ' +
                'xl:transition-shadow xl:duration-200 ' +
                // ชุดคลาสเต็มสองชุดจากเงื่อนไขเดียว ไม่ใช่ base แล้วเอาคลาสอื่นไปทับ
                // -- สองคลาสที่ตั้งค่าเดียวกันแพ้ชนะกันตามลำดับใน CSS ที่ build
                // ออกมา ไม่ใช่ลำดับที่เขียน (ดู Button.tsx:53-59)
                (stuck
                    ? 'xl:bg-slate-50 xl:shadow-[0_14px_22px_-18px_rgba(15,42,82,0.5)]'
                    : 'xl:bg-transparent xl:shadow-none') +
                ' ' +
                className
            }
        >
            {children}
        </div>
    );
};
