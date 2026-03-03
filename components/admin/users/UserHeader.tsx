import React from 'react';
import { UserPlus, Download, Users } from 'lucide-react';

interface UserHeaderProps {
    onAddUser: () => void;
    onExport?: () => void; // Optional for now
}

export const UserHeader: React.FC<UserHeaderProps> = ({
    onAddUser,
    onExport
}) => {
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 min-h-[48px]">
            <div>
                <h2 className="text-3xl font-black text-gray-800 flex items-center gap-2 tracking-tight"><Users className="text-blue-600" />User Management</h2>
                <p className="text-gray-500 text-sm mt-1">Manage system access, roles, and user details.</p>
            </div>
            <div className="flex flex-wrap gap-2">
                {onExport && (
                    <button
                        onClick={onExport}
                        className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition shadow-sm font-medium whitespace-nowrap"
                    >
                        <Download size={18} /> Export List
                    </button>
                )}
                <button
                    onClick={onAddUser}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm font-bold whitespace-nowrap"
                >
                    <UserPlus size={18} /> Add New User
                </button>
            </div>
        </div>
    );
};
