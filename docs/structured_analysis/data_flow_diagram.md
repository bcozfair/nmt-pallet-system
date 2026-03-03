# 3.5 แผนภาพกระแสข้อมูล (Data Flow Diagram)

ส่วนนี้อธิบายรายละเอียดการไหลของข้อมูลในระบบเพื่อให้ผู้ออกแบบสามารถนำไปวาดแผนภาพ DFD ได้ถูกต้อง

---

## 3.5.1 Data Flow Diagram Level 0 (Context Diagram Breakdown)

Process หลักของระบบ:
1.  Process 1.0: ตรวจสอบสิทธิ์และยืนยันตัวตน (Authentication & Authorization)
2.  Process 2.0: จัดการธุรกรรมพาเลท (Pallet Transaction)
3.  Process 3.0: บริหารจัดการข้อมูลหลัก (Master Data Management)
4.  Process 4.0: สรุปข้อมูลและส่งออกรายงาน (Reporting)
5.  Process 5.0: จัดการการแจ้งเตือน (Notification)
6.  Process 6.0: จัดการการตั้งค่าระบบ (System Configuration)

Data Stores (แหล่งจัดเก็บข้อมูล):
*   D1: Users (ข้อมูลบัญชีผู้ใช้งาน)
*   D2: Pallets (ข้อมูลพาเลท)
*   D3: Transactions (ข้อมูลประวัติธุรกรรม)
*   D4: Locations (ข้อมูลแผนกและสถานที่)
*   D5: SystemSettings (ข้อมูลการตั้งค่าระบบ)

---

## 3.5.2 Data Flow Diagram Level 1

### รายละเอียด Process 1.0: ตรวจสอบสิทธิ์และยืนยันตัวตน

*   Process 1.1: ตรวจสอบการเข้าสู่ระบบ (Verify Login)
    *   Input: รับ `Username`, `Password` จาก Admin หรือ Staff
    *   Read: อ่านข้อมูลผู้ใช้จาก D1 Users เพื่อตรวจสอบความถูกต้อง
    *   Output: ส่งคืน `Session Token`, `Role` ให้ผู้ใช้งาน
*   Process 1.2: รีเซ็ตรหัสผ่าน (Reset Password)
    *   Input: รับ `Email` จาก Admin (กรณีลืมรหัสผ่าน)
    *   Update: บันทึก `Reset Token` ลงใน D1 Users
    *   Output: ส่ง `Email Content` ไปยัง Email Service

### รายละเอียด Process 2.0: จัดการธุรกรรมพาเลท (สำหรับ Staff)

*   Process 2.1: ตรวจสอบสถานะพาเลท (Validate Pallet)
    *   Input: รับ `QR Code (Pallet ID)` จาก Staff
    *   Read: อ่านสถานะจาก D2 Pallets (ต้องไม่ Damaged/Inactive)
    *   Output: แสดง `Pallet Details` และสถานะให้ Staff
*   Process 2.2: บันทึกการเบิก (Check-out)
    *   Input: รับ `Target Department ID` และคำยืนยันจาก Staff
    *   Read: อ่านข้อมูลจาก D4 Locations (ตรวจสอบปลายทาง)
    *   Update: อัปเดตสถานะพาเลทเป็น 'In Use' และ Location ใหม่ลงใน D2 Pallets
    *   Create: สร้างรายการธุรกรรม 'Check-out' ลงใน D3 Transactions
*   Process 2.3: บันทึกการคืน (Check-in)
    *   Input: รับคำยืนยันการคืนจาก Staff
    *   Update: อัปเดตสถานะพาเลทเป็น 'Available' และ Location='Warehouse' ลงใน D2 Pallets
    *   Create: สร้างรายการธุรกรรม 'Check-in' ลงใน D3 Transactions
*   Process 2.4: บันทึกแจ้งชำรุด (Report Damage)
    *   Input: รับ `Photo Evidence`, `Remark` จาก Staff
    *   Update: อัปเดตสถานะพาเลทเป็น 'Damaged' ลงใน D2 Pallets
    *   Create: สร้างรายการธุรกรรม 'Report Damage' พร้อม `Evidence URL` ลงใน D3 Transactions
*   Process 2.5: ค้นหาประวัติส่วนตัว (View My History)
    *   Input: รับ `Search Criteria` จาก Staff
    *   Read: ดึงข้อมูลที่ตนเองเป็นคนทำรายการจาก D3 Transactions
    *   Output: แสดงรายการ `Transaction List` ให้ Staff

### รายละเอียด Process 3.0: บริหารจัดการข้อมูลหลัก (สำหรับ Admin)

*   Process 3.1: จัดการข้อมูลพาเลท (Manage Inventory)
    *   Input: รับข้อมูล `Create/Update/Delete Pallet`, `Search Criteria`, `Filter Status` จาก Admin
    *   Read: อ่านข้อมูลพาเลทจาก D2 Pallets
    *   Update: บันทึกข้อมูลลง D2 Pallets
    *   Output: ส่งข้อมูล `Pallet List`, `QR Code Data` สำหรับพิมพ์ให้ Admin
*   Process 3.2: จัดการข้อมูลผู้ใช้งาน (Manage Users)
    *   Input: รับข้อมูล `Create/Update/Delete User`, `Search Criteria`, `Filter Role` จาก Admin
    *   Read: อ่านข้อมูลผู้ใช้งานจาก D1 Users
    *   Update: บันทึกข้อมูลลง D1 Users
    *   Output: ส่งข้อมูล `User List` ให้ Admin
*   Process 3.3: จัดการสถานที่ (Manage Locations)
    *   Input: รับข้อมูล `Create/Update/Delete Location`, `Search Criteria` จาก Admin
    *   Read: อ่านข้อมูลสถานที่จาก D4 Locations
    *   Update: บันทึกข้อมูลลง D4 Locations
    *   Output: ส่งข้อมูล `Location List` ให้ Admin
*   Process 3.4: แก้ไขประวัติธุรกรรม (Manage Transactions)
    *   Input: รับคำสั่ง `Edit/Delete Transaction`, `Search Criteria`, `Filter Date` จาก Admin
    *   Read: อ่านข้อมูลธุรกรรมจาก D3 Transactions
    *   Update: ปรับปรุงข้อมูลใน D3 Transactions (กรณีมีข้อผิดพลาด)
    *   Output: ส่งข้อมูล `Transaction List` ให้ Admin

### รายละเอียด Process 4.0: สรุปข้อมูลและส่งออกรายงาน

*   Process 4.1: ประมวลผล Dashboard (Generate Dashboard)
    *   Input: รับคำขอเปิดหน้า Dashboard, `Overdue Threshold` จาก Admin
    *   Read: อ่านสถิติจาก D2 Pallets และ D3 Transactions
    *   Output: แสคง `Summary Charts` ให้ Admin
*   Process 4.2: ส่งออกรายงาน (Export Data)
    *   Input: รับช่วงเวลาและเงื่อนไขจาก Admin
    *   Read: ดึงข้อมูลดิบจาก D3 Transactions
    *   Output: ส่งไฟล์ `CSV File` ให้ Admin

### รายละเอียด Process 5.0: จัดการการแจ้งเตือน (Notification)

*   Process 5.1: รับสัญญาณแจ้งเตือน (Trigger Handler)
    *   Input: รับ `Time Trigger` จาก Cron Job / Scheduler หรือคำสั่ง `Manual Send` จาก Admin
    *   Read: อ่านการตั้งค่าจาก D5 SystemSettings และข้อมูลสรุปจาก D3 Transactions
    *   Output: ส่งต่อข้อมูล payload
*   Process 5.2: ส่งข้อความ LINE (Send LINE Message)
    *   Input: รับข้อมูล payload จาก Process 5.1
    *   Output: ส่ง `Flex Message` ไปยัง LINE Messaging API
    *   Input (Reply): รับ `Delivery Status` จาก LINE Messaging API

### รายละเอียด Process 6.0: จัดการการตั้งค่าระบบ (System Configuration)

*   Process 6.1: บันทึกค่าระบบ (Save Settings)
    *   Input: รับค่า `Timer Settings`, `LINE Token`, `Overdue Threshold`, `Email Settings`, `Notification Settings` , `LINE ID` และการตั้งค่าอื่นๆ จาก Admin
    *   Update: บันทึกข้อมูลลง D5 SystemSettings
    *   Output: แจ้งผลการบันทึกให้ Admin
*   Process 6.2: เรียกดูค่าระบบ (Get Settings)
    *   Input: รับคำขอจาก Admin
    *   Read: อ่านค่าจาก D5 SystemSettings
    *   Output: ส่งข้อมูลการตั้งค่าให้ Admin

---

คำแนะนำการวาด:
1.  วงกลม (Process): วาดวงกลมแทน process 1.0 - 6.0 หรือ process ย่อยใน Level 1
2.  เส้นลูกศร (Data Flow): ใช้เส้นกำกับด้วยชื่อข้อมูล เชื่อมต่อระหว่าง Entity, Process และ Data Store
3.  สี่เหลี่ยมเปิดข้าง/เส้นขนาน (Data Store): ใช้แทน D1-D5
4.  สี่เหลี่ยมผืนผ้า (Entity): Admin, Staff, Cron Job / Scheduler, LINE Messaging API, Email Service
