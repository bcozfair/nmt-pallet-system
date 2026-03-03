# NMT Pallet System

A comprehensive pallet management system designed for NMT Limited, utilizing QR code scanning and Supabase for real-time inventory tracking.

## Features

- **QR Code Scanning**: Instant pallet identification using mobile camera.
- **Real-time Tracking**: Live updates of pallet locations and status.
- **Admin Dashboard**: Comprehensive view of inventory, user management, and system settings.
- **User Management**: Role-based access control for administrators and staff.

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Backend & Database**: Supabase
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure Environment:
   Create a `.env.local` file with your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:3000`.
