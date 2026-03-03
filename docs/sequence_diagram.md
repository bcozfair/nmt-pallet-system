# Sequence Diagram Documentation

เอกสารฉบับนี้แสดงแผนภาพ Sequence Diagram ซึ่งเป็นแบบจำลองเชิงกิจกรรม (Dynamic Model) จำลองกระบวนการทำงานของระบบ NMT Pallet System แยกตาม Use Case เพื่ออธิบายลำดับขั้นตอนการโต้ตอบระหว่างผู้ใช้งาน (Actor) และส่วนประกอบต่างๆ ของระบบ

---

## 1. เข้าสู่ระบบ (Login)
**Use Case ID:** UC-001  
**Description:** กระบวนการตรวจสอบสิทธิ์การเข้าใช้งานระบบ

```mermaid
sequenceDiagram
    autonumber
    actor User as User (Admin/Staff)
    participant UI as Login Page
    participant Auth as Auth Service
    participant DB as Database

    User->>UI: Enter Employee ID & Password
    User->>UI: Click "Sign In"
    UI->>Auth: Request Authentication
    activate Auth
    Auth-->>UI: Return Session / Token
    deactivate Auth
    
    UI->>DB: Get User Role
    activate DB
    DB-->>UI: Return Role (Admin/Staff)
    deactivate DB

    alt Role is Admin
        UI->>User: Redirect to Admin Dashboard
    else Role is Staff
        UI->>User: Redirect to Mobile Home
    else Login Failed
        UI--xUser: Show Error Message
    end
```

### คำอธิบายขั้นตอน
1. ผู้ใช้งานกรอกข้อมูลและกดปุ่ม Sign In
2. ระบบตรวจสอบสิทธิ์กับ Auth Service
3. ระบบตรวจสอบ Role ของผู้ใช้งานจากฐานข้อมูล
4. ระบบนำทางไปยังหน้าจอหลักตามสิทธิ์การใช้งาน

---

## 2. บันทึกรายการเบิกพาเลท (Check-out Pallet)
**Use Case ID:** UC-002  
**Description:** กระบวนการเบิกพาเลทออกจากคลังสินค้า

```mermaid
sequenceDiagram
    autonumber
    actor Staff
    participant UI as Mobile App
    participant DB as Database

    Staff->>UI: Select Destination & Scan QR
    UI->>DB: Validate Pallet Status
    activate DB
    DB-->>UI: Return Status (Available/Damaged)
    deactivate DB

    alt Pallet Available
        UI->>Staff: Add to Pending List
        Staff->>UI: Confirm Check Out
        UI->>DB: Update Status "In Use"
        UI->>DB: Update Location
        UI->>DB: Insert Transaction (Check-out)
        UI-->>Staff: Show Success
    else Pallet Not Found / Damaged
        UI--xStaff: Show Error Alert
    end
```

### คำอธิบายขั้นตอน
1. เจ้าหน้าที่เลือกปลายทางและสแกนพาเลท
2. ระบบตรวจสอบสถานะพาเลท
3. หากสถานะปกติ เพิ่มลงรายการและกดยืนยันเพื่อบันทึกการเบิก

---

## 3. บันทึกรายการคืนพาเลท (Check-in Pallet)
**Use Case ID:** UC-003  
**Description:** กระบวนการนำพาเลทกลับเข้าคลังสินค้า

```mermaid
sequenceDiagram
    autonumber
    actor Staff
    participant UI as Mobile App
    participant DB as Database

    Staff->>UI: Select Check In & Scan QR
    UI->>DB: Validate Status (Must be "In Use")
    
    alt Status Correct
        UI->>Staff: Add to List
        Staff->>UI: Confirm Check In
        UI->>DB: Update Status "Available"
        UI->>DB: Update Location "Warehouse"
        UI->>DB: Insert Transaction (Check-in)
        UI-->>Staff: Show Success
    else Status Incorrect
        UI--xStaff: Show Error (Not In Use)
    end
```

### คำอธิบายขั้นตอน
1. เจ้าหน้าที่สแกนพาเลทเพื่อคืน
2. ระบบตรวจสอบว่าพาเลทกำลังถูกใช้งานอยู่หรือไม่
3. เมื่อยืนยัน ระบบปรับสถานะเป็นว่างและบันทึกตำแหน่งเป็น Warehouse

---

## 4. บันทึกรายการแจ้งพาเลทชำรุด (Report Damage)
**Use Case ID:** UC-004  
**Description:** กระบวนการรายงานพาเลทเสียหาย

```mermaid
sequenceDiagram
    autonumber
    actor Staff
    participant UI as Mobile App
    participant Storage as Storage Service
    participant DB as Database

    Staff->>UI: Scan QR & Take Photo
    Staff->>UI: Submit Report
    
    UI->>Storage: Upload Image
    activate Storage
    Storage-->>UI: Return Image URL
    deactivate Storage

    UI->>DB: Update Status "Damaged"
    UI->>DB: Insert Transaction (Report Damage)
    UI-->>Staff: Show Success
```

### คำอธิบายขั้นตอน
1. เจ้าหน้าที่สแกนพาเลทและถ่ายรูปหลักฐาน
2. ระบบอัปโหลดรูปภาพเก็บไว้ใน Storage
3. ระบบเปลี่ยนสถานะพาเลทเป็นชำรุดและบันทึกประวัติ

---

## 5. ตรวจสอบประวัติการทำรายการ (View History)
**Use Case ID:** UC-005  
**Description:** เจ้าหน้าที่ดูประวัติการเบิก-คืนของตนเอง

```mermaid
sequenceDiagram
    autonumber
    actor Staff
    participant UI as Mobile App
    participant DB as Database

    Staff->>UI: Open History Page
    UI->>DB: Fetch Recent Transactions
    activate DB
    DB-->>UI: Return Transaction List
    deactivate DB
    UI->>Staff: Display List

    opt Search / Filter
        Staff->>UI: Apply Filter (Date/Type)
        UI->>DB: Query with Parameters
        DB-->>UI: Return Filtered Data
        UI->>Staff: Update List View
    end
```

### คำอธิบายขั้นตอน
1. เจ้าหน้าที่เปิดหน้า History ระบบจะดึงข้อมูลประวัติล่าสุดมาแสดง
2. เจ้าหน้าที่สามารถคีย์ค้นหาหรือกรองประเภทรายการได้ ระบบจะดึงข้อมูลใหม่ตามเงื่อนไข

---

## 6. จัดการข้อมูลพาเลท (Manage Inventory)
**Use Case ID:** UC-006  
**Description:** Admin บริหารจัดการพาเลท (เพิ่ม/แก้ไข/ลบ)

```mermaid
sequenceDiagram
    autonumber
    actor Admin
    participant UI as Admin Dashboard
    participant DB as Database

    Admin->>UI: Go to Inventory Page
    UI->>DB: Fetch All Pallets
    DB-->>UI: Show Table

    alt Add New Pallet
        Admin->>UI: Click Add, Input ID/Loc
        UI->>DB: Insert New Pallet
        DB-->>UI: Success
    else Edit Pallet
        Admin->>UI: Click Edit, Update Info
        UI->>DB: Update Pallet Record
        DB-->>UI: Success
    else Delete Pallet
        Admin->>UI: Click Delete
        UI->>DB: Check Dependencies
        UI->>DB: Delete Record
        DB-->>UI: Success
    end
```

### คำอธิบายขั้นตอน
1. Admin ดูรายการพาเลททั้งหมด
2. สามารถเลือก Add เพื่อเพิ่มใหม่, Edit เพื่อแก้ไขรายละเอียด, หรือ Delete เพื่อลบข้อมูล
3. ระบบจะตรวจสอบความถูกต้อง (เช่น รหัสซ้ำ) ก่อนบันทึก

---

## 7. จัดการข้อมูลผู้ใช้งาน (Manage Users)
**Use Case ID:** UC-007  
**Description:** Admin จัดการพนักงานและสิทธิ์การใช้งาน

```mermaid
sequenceDiagram
    autonumber
    actor Admin
    participant UI as User Management
    participant DB as Database
    participant Auth as Auth Service

    Admin->>UI: View User List
    
    alt Create User
        Admin->>UI: Input User Details (Email, ID, Role)
        UI->>Auth: Create Auth Account
        UI->>DB: Create User Profile
    else Edit User
        Admin->>UI: Modify Role / Dept
        UI->>DB: Update Profile
    else Reset Password
        Admin->>UI: Click Reset Password
        UI->>Auth: Update Password
    end
    
    UI-->>Admin: Show Update Status
```

### คำอธิบายขั้นตอน
1. Admin จัดการบัญชีผู้ใช้
2. การสร้างผู้ใช้ใหม่จะทำการสร้างทั้งใน Auth Service และ Database Profile
3. สามารถแก้ไขสิทธิ์ (Role) หรือรีเซ็ตรหัสผ่านได้

---

## 8. จัดการข้อมูลสถานที่ (Manage Locations)
**Use Case ID:** UC-008  
**Description:** Admin จัดการรายชื่อแผนกและสถานที่

```mermaid
sequenceDiagram
    autonumber
    actor Admin
    participant UI as Location Page
    participant DB as Database

    Admin->>UI: View Locations
    
    alt Add Location
        Admin->>UI: Enter Name & Save
        UI->>DB: Insert Location
    else Toggle Status
        Admin->>UI: Click Active/Inactive
        UI->>DB: Update Status
    end
    
    DB-->>UI: Confirm Update
    UI-->>Admin: Refresh List
```

### คำอธิบายขั้นตอน
1. Admin เพิ่มหรือแก้ไขสถานที่
2. สามารถปิดการใช้งาน (Inactive) สถานที่ที่ไม่ใช้แล้วได้โดยไม่ต้องลบถาวร

---

## 9. จัดการข้อมูลประวัติธุรกรรม (Manage Transaction History)
**Use Case ID:** UC-009  
**Description:** Admin ตรวจสอบและแก้ไขข้อมูลประวัติย้อนหลัง

```mermaid
sequenceDiagram
    autonumber
    actor Admin
    participant UI as Transaction Page
    participant DB as Database

    Admin->>UI: View History Records
    
    alt Edit Transaction
        Admin->>UI: Edit Remark / Location
        UI->>DB: Update Transaction Record
        
        opt Is Latest Transaction
            UI->>DB: Sync Pallet Current Location
        end
    else Delete Transaction
        Admin->>UI: Delete Record
        UI->>DB: Remove from DB
    end
    
    UI-->>Admin: Update Success
```

### คำอธิบายขั้นตอน
1. Admin ดูประวัติการทำรายการทั้งหมด
2. หากมีการแก้ไขรายการล่าสุด ระบบจะอัปเดตสถานะปัจจุบันของพาเลทให้สอดคล้องกัน

---

## 10. จัดการข้อมูลรายงาน (Manage Reports)
**Use Case ID:** UC-010  
**Description:** ดู Dashboard และ Export ข้อมูล

```mermaid
sequenceDiagram
    autonumber
    actor Admin
    participant UI as Dashboard
    participant DB as Database

    Admin->>UI: Load Dashboard
    UI->>DB: Query Stats (Total, In Use, Damaged)
    UI->>DB: Query Recent Activity
    DB-->>UI: Return Data
    UI->>Admin: Show Graphs & Charts

    opt Export Data
        Admin->>UI: Click Export CSV
        UI->>DB: Fetch Full Dataset
        UI-->>Admin: Download .csv File
    end
```

### คำอธิบายขั้นตอน
1. ระบบแสดงภาพรวมสถิติพาเลทบน Dashboard
2. Admin สามารถกดดาวน์โหลดข้อมูลเป็นไฟล์ CSV เพื่อนำไปใช้งานต่อ

---

## 11. จัดการการตั้งค่าระบบ (System Settings)
**Use Case ID:** UC-011  
**Description:** ตั้งค่า Config ต่างๆ ของระบบ

```mermaid
sequenceDiagram
    autonumber
    actor Admin
    participant UI as Settings Page
    participant DB as Database

    Admin->>UI: Change Overdue Days / Report Time
    Admin->>UI: Click Save
    UI->>DB: Update System Configuration
    DB-->>UI: Success
    UI-->>Admin: Settings Applied
```

### คำอธิบายขั้นตอน
1. Admin ปรับเปลี่ยนค่าคงที่ของระบบ เช่น จำนวนวันที่ถือว่าเกินกำหนด (Overdue Threshold)
2. บันทึกค่าลงฐานข้อมูลเพื่อให้ระบบนำไปคำนวณ

---

## 12. ลืมรหัสผ่าน (Forget Password)
**Use Case ID:** UC-012  
**Description:** ขอรีเซ็ตรหัสผ่านกรณีลืม

```mermaid
sequenceDiagram
    autonumber
    actor Admin
    participant UI as Login Page
    participant Auth as Auth Service
    participant Email as Email Provider

    Admin->>UI: Click "Forgot Password"
    Admin->>UI: Enter Email
    UI->>Auth: Request Password Reset
    
    alt Email Found
        Auth->>Email: Send Reset Link
        Email->>Admin: Email with Link
        Admin->>UI: Click Link & Set New Password
        UI->>Auth: Update Password
    else Email Not Found
        Auth--xUI: Error
        UI--xAdmin: Show Notification
    end
```

### คำอธิบายขั้นตอน
1. ผู้ใช้กดลืมรหัสผ่านและกรอกอีเมล
2. ระบบส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปทางอีเมล
3. ผู้ใช้กดลิงก์และกำหนดรหัสผ่านใหม่

---

## 13. แจ้งเตือนอัตโนมัติ (Automatic Line Notification)
**Use Case ID:** UC-013  
**Description:** ระบบส่งรายงานสรุปไปยัง Line

```mermaid
sequenceDiagram
    autonumber
    participant Scheduler as System Scheduler
    participant DB as Database
    participant Line as Line API
    participant User as Line User (Admin)

    Scheduler->>Scheduler: Trigger Time (08:00 / 17:00)
    Scheduler->>DB: Get Daily Stats
    DB-->>Scheduler: Return Data
    
    Scheduler->>Line: Push Message (Stats)
    activate Line
    Line->>User: Send Notification
    Line-->>Scheduler: 200 OK
    deactivate Line
```

### คำอธิบายขั้นตอน
1. เมื่อถึงเวลาที่กำหนด Scheduler จะดึงข้อมูลสรุป
2. ส่งข้อมูลไปยัง Line Messaging API
3. Admin ได้รับแจ้งเตือนผ่านแอป Line
