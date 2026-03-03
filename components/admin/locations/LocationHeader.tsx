import React from 'react';
import { Plus, MapPinned } from 'lucide-react';

interface LocationHeaderProps {
    onAdd: () => void;
}

export const LocationHeader: React.FC<LocationHeaderProps> = ({
    onAdd
}) => {
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 min-h-[48px]">
            <div>
                <h2 className="text-3xl font-black text-gray-800 flex items-center gap-2 tracking-tight">
                    <MapPinned className="text-blue-600" /> Location Management
                </h2>
                <p className="text-gray-500 text-sm mt-1">Manage warehouse locations and tracking zones.</p>
            </div>
            <div className="flex flex-wrap gap-2">
                <button
                    onClick={onAdd}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm font-bold whitespace-nowrap"
                >
                    <Plus size={18} /> Add Location
                </button>
            </div>
        </div>
    );
};
