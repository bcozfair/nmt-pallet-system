<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:0ea5e9,50:6366f1,100:22d3ee&height=200&section=header&text=Smart%20Parcel%20Box&fontSize=42&fontColor=ffffff&fontAlignY=36&desc=IoT-Powered%20Intelligent%20Parcel%20Receiving%20System&descAlignY=55&descSize=15&animation=fadeIn" width="100%"/>

<br/>

<!-- Trophy Badge -->
<img src="https://img.shields.io/badge/%F0%9F%8F%86%20First%20Prize-Productive%20Learning%20Contest%202026-FFD700?style=for-the-badge"/>

<br/><br/>

<img src="https://img.shields.io/badge/ESP32-0ea5e9?style=flat-square&logo=espressif&logoColor=white"/>
<img src="https://img.shields.io/badge/ESP32--CAM-6366f1?style=flat-square&logo=espressif&logoColor=white"/>
<img src="https://img.shields.io/badge/C%2FC++-22d3ee?style=flat-square&logo=cplusplus&logoColor=white"/>
<img src="https://img.shields.io/badge/Arduino%20IDE-0ea5e9?style=flat-square&logo=arduino&logoColor=white"/>
<img src="https://img.shields.io/badge/IoT-6366f1?style=flat-square&logo=internetofthings&logoColor=white"/>

<br/><br/>



</div>

---

## 📌 เกี่ยวกับโปรเจกต์

**NMT Pallet System** คือระบบบริหารจัดการและติดตามพาเลทสินค้าแบบ real-time พัฒนาขึ้นเพื่อแก้ปัญหาการจัดการคลังสินค้า ด้วยการสแกน QR Code ผ่านมือถือ ติดตามสถานะพาเลทแต่ละชิ้น และแสดงผลบน Admin Dashboard โดยใช้ **Supabase** เป็น backend ที่รองรับ PostgreSQL, Auth และ Realtime API ในตัว

---

## ✨ ฟีเจอร์หลัก

| ฟีเจอร์ | รายละเอียด |
|--------|-----------|
| 📷 **QR Code Scanning** | สแกนผ่านกล้องมือถือ ระบุและตรวจสอบข้อมูลพาเลทได้ทันที |
| ⚡ **Real-time Tracking** | ติดตามสถานะและตำแหน่งพาเลทภายในคลังสินค้าแบบ live |
| 📊 **Admin Dashboard** | ภาพรวมสินค้าคงคลัง จัดการผู้ใช้งาน และตั้งค่าระบบ |
| 🔐 **Role-based Access** | แยกสิทธิ์ Admin และ Staff อย่างชัดเจน |
| ☁️ **Cloud Storage** | จัดเก็บข้อมูลบน Supabase PostgreSQL พร้อม Realtime sync |
| 💬 **LINE Notification** | แจ้งเตือนผ่าน LINE Messaging API เมื่อมีการเคลื่อนไหวของพาเลท |

---

## 🛠️ Tech Stack

**Frontend**

<img src="https://img.shields.io/badge/React-0ea5e9?style=flat-square&logo=react&logoColor=white"/>
<img src="https://img.shields.io/badge/TypeScript-6366f1?style=flat-square&logo=typescript&logoColor=white"/>
<img src="https://img.shields.io/badge/Vite-22d3ee?style=flat-square&logo=vite&logoColor=white"/>
<img src="https://img.shields.io/badge/Tailwind%20CSS-0ea5e9?style=flat-square&logo=tailwind-css&logoColor=white"/>
<img src="https://img.shields.io/badge/Lucide%20React-6366f1?style=flat-square&logo=lucide&logoColor=white"/>

**Backend & Database**

<img src="https://img.shields.io/badge/Supabase-22d3ee?style=flat-square&logo=supabase&logoColor=white"/>
<img src="https://img.shields.io/badge/PostgreSQL-0ea5e9?style=flat-square&logo=postgresql&logoColor=white"/>
<img src="https://img.shields.io/badge/LINE%20Messaging%20API-6366f1?style=flat-square&logo=line&logoColor=white"/>

---

## 📁 โครงสร้างโปรเจกต์

```
nmt-pallet-system/
├── src/
│   ├── components/   # React Components ที่ใช้ซ้ำได้
│   ├── contexts/     # React Context สำหรับ Global State
│   ├── hooks/        # Custom Hooks สำหรับ logic เฉพาะทาง
│   ├── services/     # ฟังก์ชันติดต่อ Backend / Supabase API
│   ├── supabase/     # Config และ Database Schema
│   └── utils/        # Helper functions
├── .env.local        # Environment Variables (ไม่ commit ขึ้น GitHub)
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── vite.config.ts
```

---

## 🚀 วิธีติดตั้งและใช้งาน

### Prerequisites

- **Node.js** v18 ขึ้นไป
- **npm** หรือ **yarn**
- บัญชี [Supabase](https://supabase.com/) (ฟรี)

### 1. Clone โปรเจกต์

```bash
git clone https://github.com/bcozfair/nmt-pallet-system.git
cd nmt-pallet-system
```

### 2. ติดตั้ง Dependencies

```bash
npm install
```

### 3. ตั้งค่า Supabase

1. ไปที่ [supabase.com](https://supabase.com/) → สร้าง Project ใหม่
2. ไปที่ **Settings → API** แล้วคัดลอก `Project URL` และ `anon public key`
3. สร้างไฟล์ `.env.local` ที่ root ของโปรเจกต์:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

> ⚠️ **ห้าม** commit ไฟล์ `.env.local` ขึ้น GitHub เด็ดขาด

### 4. รัน Development Server

```bash
npm run dev
```

เปิดเบราว์เซอร์ที่ `http://localhost:5173`

### 5. Build สำหรับ Production

```bash
npm run build
```

---

## 📝 หมายเหตุสำคัญ

- 🔑 `VITE_SUPABASE_ANON_KEY` เป็น public key ที่ใช้ฝั่ง client ได้ แต่ควรตั้งค่า **Row Level Security (RLS)** ใน Supabase เสมอ
- 📱 ฟีเจอร์ QR Code Scanning ต้องการสิทธิ์เข้าถึงกล้องของอุปกรณ์ — รันบน **HTTPS** หรือ `localhost` เท่านั้น
- ⚡ Realtime feature ของ Supabase ต้องเปิด **Replication** ในตาราง PostgreSQL ที่ต้องการ sync

---

## 👤 Author

**Natchaphat (Fair)**

<a href="https://github.com/bcozfair"><img src="https://img.shields.io/badge/GitHub-bcozfair-0ea5e9?style=flat-square&logo=github&logoColor=white"/></a>
<a href="https://www.linkedin.com/in/natchaphat-fair/"><img src="https://img.shields.io/badge/LinkedIn-natchaphat--fair-6366f1?style=flat-square&logo=linkedin&logoColor=white"/></a>
<a href="mailto:bcozfair@gmail.com"><img src="https://img.shields.io/badge/Email-bcozfair%40gmail.com-22d3ee?style=flat-square&logo=gmail&logoColor=white"/></a>

---

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:22d3ee,50:6366f1,100:0ea5e9&height=100&section=footer" width="100%"/>

</div>
