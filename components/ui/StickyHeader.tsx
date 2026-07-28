import React, { useEffect, useRef } from 'react';

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
// พื้นหลังเป็นกระจกฝ้า ไม่ใช่สีทึบ: พื้นหน้าเป็นไล่สี (.app-canvas ใน index.css)
// ไม่ใช่สีเรียบ บล็อกทึบ ๆ วางทับตรงยอดหน้าจะไปบังจุดที่ไล่สีสว่างที่สุดพอดี
// -- ซึ่งเป็นเหตุผลทั้งหมดที่ไล่สีนั้นมีอยู่ ส่วน backdrop-blur ทำงานได้กับทุกอย่าง
// ที่ผ่านอยู่ข้างหลัง ทั้งไล่สีตอนอยู่บนสุดและแถวตารางตอนเลื่อน
export const StickyHeader: React.FC<StickyHeaderProps> = ({ children, className = '' }) => {
    const ref = useRef<HTMLDivElement>(null);

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
                // pb-4 คือเบาะรองใต้กอง ไม่ใช่ระยะห่าง: ถ้าไม่มี แถวที่เลื่อนผ่านจะโผล่
                // ให้เห็นในช่อง gap-4 ระหว่างกองนี้กับการ์ดตาราง -mb-4 หักออกไป
                // เท่ากัน กองจึงกินที่เท่าเดิมและจังหวะของหน้าไม่ขยับ
                // 90% ไม่ใช่ 80%: ตอนอยู่บนสุดไม่มีอะไรอยู่ข้างหลังให้บัง ไล่สียัง
                // อ่านออกที่ 10% ที่เหลือ แต่ตอนเลื่อนแล้วส่วนต่าง 10% นั้นคือ
                // ผลต่างระหว่าง "กระจกฝ้า" กับ "เห็นเงาแถววิ่งอยู่ข้างหลัง"
                'xl:sticky xl:top-0 xl:z-20 xl:-mb-4 xl:bg-slate-50/90 xl:pb-4 xl:backdrop-blur-md ' +
                className
            }
        >
            {children}
        </div>
    );
};
