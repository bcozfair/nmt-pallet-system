import React from 'react';
import { UserPlus, Download, Users } from 'lucide-react';
import { useT } from '../../../hooks/useT';

interface UserHeaderProps {
    onAddUser: () => void;
    onExport?: () => void; // Optional for now
}

export const UserHeader: React.FC<UserHeaderProps> = ({
    onAddUser,
    onExport
}) => {
    const t = useT();

    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 min-h-[48px]">
            <div>
                <h2 className="text-3xl font-black text-gray-800 flex items-center gap-2 tracking-tight"><Users className="text-blue-600" />{t.users.title}</h2>
                <p className="text-gray-500 text-sm mt-1">{t.users.subtitle}</p>
            </div>
            <div className="flex flex-wrap gap-2">
                {onExport && (
                    <button
                        onClick={onExport}
                        className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition shadow-sm font-medium whitespace-nowrap"
                    >
                        <Download size={18} /> {t.users.exportList}
                    </button>
                )}
                <button
                    onClick={onAddUser}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm font-bold whitespace-nowrap"
                >
                    <UserPlus size={18} /> {t.users.addUser}
                </button>
            </div>
        </div>
    );
};
