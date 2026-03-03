# 3.6 ผังงานกระบวนการ (Process Flowchart)

## 3.6.1 ผังงานกระบวนการเข้าสู่ระบบ (Login Flowchart)

```mermaid
%%{ init: { 'flowchart': { 'curve': 'linear' } } }%%
flowchart TD
    Start(["เริ่มต้น (Start)"]) --> Input[/"กรอกชื่อผู้ใช้และรหัสผ่าน<br/>(Enter Username & Password)"/]
    Input --> Validate{"ตรวจสอบข้อมูล?<br/>(Data Valid?)"}
    
    Validate -- "ไม่ถูกต้อง (No)" --> Error1["แสดงข้อความแจ้งเตือน<br/>(Show Error Message)"]
    Error1 --> Input
    
    Validate -- "ถูกต้อง (Yes)" --> CheckRole{"ตรวจสอบสิทธิ์<br/>(Check User Role)"}
    
    CheckRole -- "ผู้ดูแลระบบ (Admin)" --> AdminPage["ไปหน้าแดชบอร์ดผู้ดูแลระบบ<br/>(Redirect to Admin Dashboard)"]
    CheckRole -- "พนักงาน (Staff)" --> StaffPage["ไปหน้าหลักพนักงาน<br/>(Redirect to Staff Mobile Home)"]
    
    AdminPage --> Stop(["จบการทำงาน (End)"])
    StaffPage --> Stop
```

## 3.6.2 ผังงานกระบวนการรีเซ็ตรหัสผ่าน (Reset Password Flowchart)

```mermaid
%%{ init: { 'flowchart': { 'curve': 'linear' } } }%%
flowchart TD
    Start(["เริ่มต้น (Start)"]) --> Input[/"กรอกอีเมล<br/>(Enter Email)"/]
    Input --> CheckDB{"ตรวจสอบอีเมลในระบบ?<br/>(Email Exists?)"}
    
    CheckDB -- "ไม่พบ (No)" --> Error["แสดงข้อผิดพลาด<br/>(Show Error)"]
    Error --> Stop(["จบการทำงาน (End)"])
    
    CheckDB -- "พบ (Yes)" --> GenToken["สร้างโทเค็นรีเซ็ต<br/>(Generate Reset Token)"]
    GenToken --> SendEmail["ส่งอีเมลพร้อมลิงก์<br/>(Send Email with Link)"]
    SendEmail --> ShowSuccess["แสดงข้อความสำเร็จ<br/>(Show Success Message)"]
    ShowSuccess --> Stop
```

## 3.6.3 ผังงานกระบวนการเบิกพาเลท (Check-out Process)

```mermaid
%%{ init: { 'flowchart': { 'curve': 'linear' } } }%%
flowchart TD
    Start(["เริ่มต้น (Start)"]) --> SelectDest[/"เลือกแผนกปลายทาง<br/>(Select Destination Dept)"/]
    SelectDest --> ScanQR[/"สแกน QR Code พาเลท<br/>(Scan Pallet QR Code)"/]
    
    ScanQR --> CheckDB{"ตรวจสอบฐานข้อมูล<br/>(Check Database)"}
    CheckDB -- "ไม่พบ (Not Found)" --> ErrorFound["แสดงข้อผิดพลาด: ไม่พบข้อมูล<br/>(Show Error: Not Found)"]
    CheckDB -- "ชำรุด (Damaged)" --> ErrorDamage["แสดงข้อผิดพลาด: พาเลทชำรุด<br/>(Show Error: Pallet Damaged)"]
    
    CheckDB -- "ถูกต้อง (Valid)" --> AddList["เพิ่มรายการ<br/>(Add to Pending List)"]
    AddList --> More{"สแกนเพิ่ม?<br/>(Scan More?)"}
    
    More -- "ใช่ (Yes)" --> ScanQR
    More -- "ไม่ (No)" --> Confirm[/"ยืนยันการเบิก<br/>(Confirm Check-out)"/]
    
    Confirm --> UpdateDB1["อัปเดตสถานะพาเลท = 'กำลังใช้งาน'<br/>(Update Status = 'In Use')"]
    UpdateDB1 --> UpdateDB2["อัปเดตสถานที่ปัจจุบัน<br/>(Update Current Location)"]
    UpdateDB2 --> CreateTrans["สร้างรายการเบิก<br/>(Create 'Check-out' Transaction)"]
    
    CreateTrans --> ShowSuccess["แสดงผลสำเร็จ<br/>(Show Success Message)"]
    ShowSuccess --> Stop(["จบการทำงาน (End)"])
    
    ErrorFound --> ScanQR
    ErrorDamage --> ScanQR
```

## 3.6.4 ผังงานกระบวนการคืนพาเลท (Check-in Process)

```mermaid
%%{ init: { 'flowchart': { 'curve': 'linear' } } }%%
flowchart TD
    Start(["เริ่มต้น (Start)"]) --> ScanQR[/"สแกน QR Code พาเลท<br/>(Scan Pallet QR Code)"/]
    
    ScanQR --> CheckDB{"ตรวจสอบฐานข้อมูล<br/>(Check Database)"}
    CheckDB -- "ไม่พบ (Not Found)" --> ErrorFound["แสดงข้อผิดพลาด: ไม่พบข้อมูล<br/>(Show Error: Not Found)"]
    CheckDB -- "ชำรุด (Damaged)" --> ErrorDamage["แสดงข้อผิดพลาด: พาเลทชำรุด<br/>(Show Error: Pallet Damaged)"]
    
    CheckDB -- "ถูกต้อง (Valid)" --> AddList["เพิ่มรายการ<br/>(Add to Pending List)"]
    
    AddList --> More{"สแกนเพิ่ม?<br/>(Scan More?)"}
    More -- "ใช่ (Yes)" --> ScanQR
    More -- "ไม่ (No)" --> Confirm[/"ยืนยันการคืน<br/>(Confirm Check-in)"/]
    
    Confirm --> UpdateDB1["อัปเดตสถานะพาเลท = 'ว่าง'<br/>(Update Status = 'Available')"]
    UpdateDB1 --> UpdateDB2["อัปเดตสถานที่ = 'คลังสินค้า'<br/>(Update Location = 'Warehouse')"]
    UpdateDB2 --> CreateTrans["สร้างรายการคืน<br/>(Create 'Check-in' Transaction)"]
    
    CreateTrans --> ShowSuccess["แสดงผลสำเร็จ<br/>(Show Success Message)"]
    ShowSuccess --> Stop(["จบการทำงาน (End)"])
    
    ErrorFound --> ScanQR
    ErrorDamage --> ScanQR
```

## 3.6.5 ผังงานกระบวนการแจ้งพาเลทชำรุด (Report Damage Process)

```mermaid
%%{ init: { 'flowchart': { 'curve': 'linear' } } }%%
flowchart TD
    Start(["เริ่มต้น (Start)"]) --> ScanQR[/"สแกน QR Code พาเลท<br/>(Scan Pallet QR Code)"/]
    
    ScanQR --> CheckStatus{"สถานะ = ชำรุด?<br/>(Status = Damaged?)"}
    CheckStatus -- "ใช่ (Yes)" --> ErrorAlready["แสดงแจ้งเตือน: ชำรุดแล้ว<br/>(Show Alert: Already Damaged)"]
    ErrorAlready --> Stop(["จบการทำงาน (End)"])
    
    CheckStatus -- "ไม่ (No)" --> ShowForm["เปิดฟอร์มแจ้งชำรุด<br/>(Open Damage Report Form)"]
    ShowForm --> Upload[/"อัปโหลดรูปภาพหลักฐาน<br/>(User Uploads Evidence Photo)"/]
    
    Upload --> CheckPhoto{"มีรูปภาพ?<br/>(Photo Uploaded?)"}
    CheckPhoto -- "ไม่ (No)" --> DisableSubmit["ปิดปุ่มบันทึก<br/>(Disable Submit Button)"]
    DisableSubmit --> Upload
    
    CheckPhoto -- "ใช่ (Yes)" --> Submit[/"กดส่งรายงาน<br/>(User Submits Report)"/]
    
    Submit --> UpdateStatus["อัปเดตสถานะพาเลท = 'ชำรุด'<br/>(Update Status = 'Damaged')"]
    UpdateStatus --> SavePhoto["บันทึก URL รูปภาพ<br/>(Save Photo URL)"]
    SavePhoto --> CreateTrans["สร้างรายการแจ้งชำรุด<br/>(Create 'Report Damage' Transaction)"]
    
    CreateTrans --> ShowSuccess["แสดงผลสำเร็จ<br/>(Show Success Message)"]
    ShowSuccess --> Stop(["จบการทำงาน (End)"])
```

## 3.6.6 ผังงานกระบวนการค้นหาประวัติ (View History Process)

```mermaid
%%{ init: { 'flowchart': { 'curve': 'linear' } } }%%
flowchart TD
    Start(["เริ่มต้น (Start)"]) --> Input[/"กรอกเงื่อนไขการค้นหา<br/>(Enter Search Criteria)"/]
    Input --> QueryDB["ค้นหาข้อมูลในฐานข้อมูล<br/>(Query Database)"]
    QueryDB --> Display[/"แสดงรายการผลลัพธ์<br/>(Display Result List)"/]
    Display --> Stop(["จบการทำงาน (End)"])
```

## 3.6.7 ผังงานกระบวนการจัดการข้อมูลหลัก (Master Data Management - CRUD)

```mermaid
%%{ init: { 'flowchart': { 'curve': 'linear' } } }%%
flowchart TD
    Start(["เริ่มต้น (Start)"]) --> SelectAction{"เลือกการกระทำ<br/>(Select Action)"}
    
    SelectAction -- "เพิ่ม (Create)" --> InputForm[/"กรอกข้อมูลใหม่<br/>(Enter New Data)"/]
    SelectAction -- "แก้ไข (Update)" --> SelectItem[/"เลือกรายการที่จะแก้ไข<br/>(Select Item)"/]
    SelectAction -- "ลบ (Delete)" --> SelectDelete[/"เลือกรายการที่จะลบ<br/>(Select User/Item)"/]
    
    SelectItem --> EditForm[/"แก้ไขข้อมูล<br/>(Edit Data)"/]
    
    InputForm --> Validate{"ตรวจสอบข้อมูล?<br/>(Data Valid?)"}
    EditForm --> Validate
    
    Validate -- "ไม่ (No)" --> ShowError["แสดงข้อผิดพลาด<br/>(Show Error)"]
    ShowError --> SelectAction
    
    Validate -- "ใช่ (Yes)" --> SaveDB["บันทึกลงฐานข้อมูล<br/>(Save to Database)"]
    SaveDB --> ShowSuccess["แสดงผลสำเร็จ<br/>(Show Success)"]
    
    SelectDelete --> Confirm{"ยืนยันการลบ?<br/>(Confirm Delete?)"}
    Confirm -- "ไม่ (No)" --> SelectAction
    Confirm -- "ใช่ (Yes)" --> DeleteDB["ลบข้อมูลจากฐานข้อมูล<br/>(Delete from Database)"]
    DeleteDB --> ShowSuccess
    
    ShowSuccess --> Stop(["จบการทำงาน (End)"])
```

## 3.6.8 ผังงานกระบวนการออกรายงาน (Reporting Process)

```mermaid
%%{ init: { 'flowchart': { 'curve': 'linear' } } }%%
flowchart TD
    Start(["เริ่มต้น (Start)"]) --> SelectType[/"เลือกประเภทรายงาน/ช่วงเวลา<br/>(Select Report Type/Date Range)"/]
    SelectType --> QueryDB["ดึงข้อมูลจากฐานข้อมูล<br/>(Query Database)"]
    QueryDB --> ProcessData["ประมวลผล/คำนวณสถิติ<br/>(Process/Calculate Data)"]
    ProcessData --> Format["จัดรูปแบบรายงาน<br/>(Format Report)"]
    
    Format --> Output{"รูปแบบผลลัพธ์?<br/>(Output Type)"}
    Output -- "หน้าจอ (Screen)" --> Display[/"แสดงผลบน Dashboard<br/>(Display on Dashboard)"/]
    Output -- "ไฟล์ (File)" --> Export[/"ส่งออกเป็น CSV<br/>(Export as CSV)"/]
    Output -- "พิมพ์ (Print)" --> Print[/"สั่งพิมพ์รายงาน<br/>(Print Report)"/]
    
    Display --> Stop(["จบการทำงาน (End)"])
    Export --> Stop
    Print --> Stop
```

## 3.6.9 ผังงานกระบวนการแจ้งเตือน (Notification Process)

```mermaid
%%{ init: { 'flowchart': { 'curve': 'linear' } } }%%
flowchart TD
    Start(["เริ่มต้น (Trigger Start)"]) --> CheckTrigger{"ตรวจสอบเงื่อนไข<br/>(Check Trigger)"}
    
    CheckTrigger -- "ตามเวลา<br/>(Scheduled)" --> CheckTime{"ตรวจสอบเวลาที่กำหนด<br/>(Check Scheduled Time)"}
    CheckTime -- "ใช่ (Yes)" --> QueryStats["ดึงข้อมูลสรุปยอด<br/>(Query Daily Stats)"]
    CheckTime -- "ไม่ใช่ (No)" --> Stop
    CheckTrigger -- "กดส่งเอง<br/>(Manual)" --> QueryStats
    
    QueryStats --> FormatMsg["จัดรูปแบบข้อความ Flex Message<br/>(Format Message)"]
    FormatMsg --> CallAPI["ส่งไปยัง LINE Messaging API<br/>(Send to LINE API)"]
    
    CallAPI --> CheckResp{"สถานะการส่ง?<br/>(Delivery Status?)"}
    CheckResp -- "สำเร็จ (Success)" --> LogSuccess["บันทึก Log สำเร็จ<br/>(Log Success)"]
    CheckResp -- "ล้มเหลว (Fail)" --> LogError["บันทึก Log ข้อผิดพลาด<br/>(Log Error)"]
    
    LogSuccess --> Stop(["จบการทำงาน (End)"])
    LogError --> Stop
```
```

## 3.6.10 ผังงานกระบวนการตั้งค่าระบบ (System Configuration Process)

```mermaid
%%{ init: { 'flowchart': { 'curve': 'linear' } } }%%
flowchart TD
    Start(["เริ่มต้น (Start)"]) --> LoadConfig["โหลดค่าปัจจุบัน<br/>(Load Current Config)"]
    LoadConfig --> ShowConfig[/"แสดงหน้าตั้งค่า<br/>(Display Settings Form)"/]
    
    ShowConfig --> InputConfig[/"แก้ไขค่าที่ต้องการ<br/>(Edit Configuration)"/]
    InputConfig --> Save{"กดบันทึก?<br/>(Click Save?)"}
    
    Save -- "ไม่ (No)" --> Stop(["จบการทำงาน (End)"])
    Save -- "ใช่ (Yes)" --> Validate{"ค่าถูกต้อง?<br/>(Valid Value?)"}
    
    Validate -- "ไม่ (No)" --> Error["แสดงข้อผิดพลาด<br/>(Show Error)"]
    Error --> InputConfig
    
    Validate -- "ใช่ (Yes)" --> UpdateDB["บันทึกลงฐานข้อมูล<br/>(Update Database)"]
    UpdateDB --> Success["แสดงผลสำเร็จ<br/>(Show Success)"]
    Success --> Stop
```

## 3.6.11 ผังงานกระบวนการพิมพ์รหัส QR (QR Code Printing Process)

```mermaid
%%{ init: { 'flowchart': { 'curve': 'linear' } } }%%
flowchart TD
    Start(["เริ่มต้น (Start)"]) --> SelectItem[/"เลือกรายการพาเลท<br/>(Select Pallet)"/]
    SelectItem --> ClickPrint[/"กดปุ่มพิมพ์ QR Code<br/>(Click Print QR Code)"/]
    
    ClickPrint --> GenQR["สร้างรูปภาพ QR Code<br/>(Generate QR Image)"]
    GenQR --> ShowPreview[/"แสดงตัวอย่างก่อนพิมพ์<br/>(Show Print Preview)"/]
    
    ShowPreview --> Confirm{"ยืนยันสั่งพิมพ์?<br/>(Confirm Print?)"}
    
    Confirm -- "ยกเลิก (Cancel)" --> Stop(["จบการทำงาน (End)"])
    Confirm -- "พิมพ์ (Print)" --> SendPrinter["ส่งข้อมูลไปยังเครื่องพิมพ์<br/>(Send to Printer)"]
    SendPrinter --> Stop
```

## 3.6.12 ผังงานกระบวนการจัดการพาเลทชำรุด (Resolve Damage Process)

```mermaid
%%{ init: { 'flowchart': { 'curve': 'linear' } } }%%
flowchart TD
    Start(["เริ่มต้น (Start)"]) --> ViewDamaged[/"เรียกดูรายการพาเลทชำรุด<br/>(View Damaged Pallets List)"/]
    ViewDamaged --> SelectPallet[/"เลือกพาเลทที่ต้องการจัดการ<br/>(Select Pallet)"/]
    SelectPallet --> CheckEvidence["ตรวจสอบรูปภาพหลักฐาน<br/>(Check Evidence Photo)"]
    
    CheckEvidence --> Decision{"ตัดสินใจ?<br/>(Select Action)"}
    
    Decision -- "ซ่อมแซม (Repair)" --> Repair["อัปเดตสถานะ = 'ว่าง'<br/>(Update Status = 'Available')"]
    Repair --> LogRepair["บันทึกรายการ 'ซ่อมแซม'<br/>(Create 'Repair' Transaction)"]
    LogRepair --> DeletePhoto["ลบรูปภาพหลักฐานออกจาก Storage<br/>(Delete Evidence Photo)"]
    
    Decision -- "จำหน่ายออก (Discard)" --> Discard["ลบข้อมูลออกจากระบบ<br/>(Delete Pallet from DB)"]
    
    DeletePhoto --> ShowSuccess["แสดงผลสำเร็จ<br/>(Show Success Message)"]
    Discard --> ShowSuccess
    ShowSuccess --> Stop(["จบการทำงาน (End)"])
```
