import React from 'react';
import { ArrowRightCircle } from 'lucide-react';
import { Department } from '../../types';

interface LocationSelectorProps {
    departments: Department[];
    onSelect: (dept: Department) => void;
    onCancel: () => void;
}

export const LocationSelector = ({ departments, onSelect, onCancel }: LocationSelectorProps) => {
    return (
        <div className="flex flex-col h-screen bg-gray-50">
            <div className="bg-blue-600 text-white p-6 pb-12 rounded-b-[2.5rem] shadow-md relative overflow-hidden z-0 shrink-0">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <ArrowRightCircle size={100} />
                </div>
                <h1 className="text-2xl font-bold relative z-10">Select Destination</h1>
                <p className="text-blue-100 relative z-10">Where are the pallets going?</p>
            </div>

            <div className="flex-1 px-6 -mt-8 overflow-y-auto no-scrollbar pb-6 relative z-10">
                <div className="bg-white rounded-2xl shadow-lg p-2 flex flex-col gap-2">
                    {departments.map(dept => (
                        <button
                            key={dept.id}
                            onClick={() => onSelect(dept)}
                            className="w-full text-left p-4 rounded-xl hover:bg-blue-50 border border-transparent hover:border-blue-100 transition flex items-center justify-between group active:scale-98"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-blue-400 group-hover:bg-blue-600"></div>
                                <span className="font-semibold text-gray-700 group-hover:text-blue-700 text-lg">{dept.name}</span>
                            </div>
                            <ArrowRightCircle className="text-gray-300 group-hover:text-blue-500 transform group-hover:translate-x-1 transition" />
                        </button>
                    ))}
                </div>

                <button
                    onClick={onCancel}
                    className="w-full mt-6 py-4 bg-gray-200 rounded-xl text-gray-600 font-bold hover:bg-gray-300 transition"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
};
