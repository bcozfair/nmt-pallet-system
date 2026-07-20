
export type Role = 'staff' | 'admin';

// 'scrapped' is terminal. A pallet reaches it only from 'damaged', never leaves
// it, and is excluded from every fleet total and from the utilisation divisor.
// It exists so a pallet can be retired without deleting the row, which would
// cascade its entire transaction history away.
export type PalletStatus = 'available' | 'in_use' | 'damaged' | 'scrapped';

export interface User {
  id: string;
  employee_id: string;
  full_name: string;
  role: Role;
  department: string;
  created_at?: string;
  last_sign_in_at?: string;
}

export interface Department {
  id: string; // or number depending on DB, assuming string (uuid) or int
  name: string;
  is_active: boolean;
}

export interface Pallet {
  pallet_id: string; // PK
  status: PalletStatus;
  current_location: string;
  last_checkout_date: string | null; // ISO timestamp
  last_transaction_date?: string | null; // Latest CheckIn/Out/Report
  created_at: string; // ISO Timestamp (Date Added/Purchased)
  pallet_remark?: string; // Remark specifically for the pallet entity
}

// 'scrap' is the audit record for retiring a pallet. Without it the write that
// takes a pallet out of service would leave no trace in the history, which is
// the whole reason 'scrapped' exists instead of a delete.
export type ActionType = 'check_out' | 'check_in' | 'report_damage' | 'repair' | 'scrap';

export interface Transaction {
  id: string;
  pallet_id: string;
  user_id: string;
  action_type: ActionType;
  department_dest: string | null;
  evidence_image_url: string | null;
  timestamp: string;
  transaction_remark?: string; // Renamed from remark
}

// App specific types
export type AppMode = 'home' | 'scan_checkout' | 'scan_checkin' | 'scan_damage' | 'admin_dashboard';
