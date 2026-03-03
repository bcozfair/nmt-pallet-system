import React from 'react';
import { Search, MapPin, ChevronRight, Calendar, ChevronDown, X, CheckCircle } from 'lucide-react';
import { Department } from '../../../types';

interface InventoryFiltersProps {
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    locationFilter: string;
    setLocationFilter: (loc: string) => void;
    onLocationChange?: (loc: string) => void;
    statusFilter: string;
    setStatusFilter: (status: string) => void;
    dateRange: { start: string; end: string };
    setDateRange: (range: { start: string; end: string }) => void;
    showOverdueOnly: boolean;
    setShowOverdueOnly: (show: boolean) => void;
    departments: Department[];
}

export const InventoryFilters: React.FC<InventoryFiltersProps> = ({
    searchTerm,
    setSearchTerm,
    locationFilter,
    setLocationFilter,
    onLocationChange,
    statusFilter,
    setStatusFilter,
    dateRange,
    setDateRange,
    showOverdueOnly,
    setShowOverdueOnly,
    departments
}) => {
    return (
        <div className="bg-white p-2.5 rounded-xl shadow-sm border border-gray-100">
            <div className="flex flex-col xl:flex-row gap-3 items-center">

                <div className="relative flex-1 w-full xl:w-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                        id="search-pallet-id"
                        name="search"
                        aria-label="Search Pallet ID"
                        type="text"
                        placeholder="Search Pallet ID..."
                        className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex flex-col sm:flex-row gap-2 w-full xl:w-auto">
                    <div className="relative flex-1 sm:w-48">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <select
                            id="filter-location"
                            name="location"
                            aria-label="Filter by Location"
                            className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none text-sm"
                            value={locationFilter}
                            onChange={(e) => {
                                const loc = e.target.value;
                                setLocationFilter(loc);
                                if (onLocationChange) onLocationChange(loc);
                            }}
                        >
                            <option value="all">All Locations</option>
                            <option value="Warehouse">Warehouse</option>
                            {departments.filter(d => d.name !== 'Warehouse').map(d => (
                                <option key={d.id} value={d.name}>{d.name}</option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                            <ChevronRight size={14} className="rotate-90" />
                        </div>
                    </div>

                    <div className="relative flex-1 sm:w-40">
                        <select
                            id="filter-status"
                            name="status"
                            aria-label="Filter by Status"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none text-sm"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all">All Status</option>
                            <option value="available">Available</option>
                            <option value="in_use">In Use</option>
                            <option value="damaged">Damaged</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                            <ChevronRight size={14} className="rotate-90" />
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 w-full sm:w-auto justify-between sm:justify-start">
                    <Calendar size={16} className="text-gray-400 shrink-0" />

                    <div className="flex items-center gap-1">
                        <div className="relative w-28 group/date">
                            <input
                                type="text"
                                readOnly
                                placeholder="Start Date"
                                className="w-full bg-transparent text-sm text-gray-700 outline-none text-left cursor-pointer placeholder:text-gray-400 pr-4"
                                value={dateRange.start ? dateRange.start.split('-').reverse().join('/') : ''}
                            />
                            <ChevronDown size={14} className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-hover/date:text-blue-500 transition-colors" />
                            <input
                                id="filter-start-date"
                                name="startDate"
                                aria-label="Start Date"
                                type="date"
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                                value={dateRange.start}
                                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                            />
                        </div>
                        <span className="text-gray-300">-</span>
                        <div className="relative w-28 group/date">
                            <input
                                type="text"
                                readOnly
                                placeholder="End Date"
                                className="w-full bg-transparent text-sm text-gray-700 outline-none text-left cursor-pointer placeholder:text-gray-400 pr-4"
                                value={dateRange.end ? dateRange.end.split('-').reverse().join('/') : ''}
                            />
                            <ChevronDown size={14} className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-hover/date:text-blue-500 transition-colors" />
                            <input
                                id="filter-end-date"
                                name="endDate"
                                aria-label="End Date"
                                type="date"
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                                value={dateRange.end}
                                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                            />
                        </div>
                    </div>

                    {(dateRange.start || dateRange.end) && (
                        <button onClick={() => setDateRange({ start: '', end: '' })} className="p-1 hover:bg-gray-200 rounded-full text-gray-400 hover:text-red-500 transition">
                            <X size={14} />
                        </button>
                    )}
                </div>

                <button
                    onClick={() => setShowOverdueOnly(!showOverdueOnly)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold transition border w-full sm:w-auto justify-center whitespace-nowrap shrink-0 ${showOverdueOnly
                        ? 'bg-red-50 text-red-600 border-red-200'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                        }`}
                >
                    {showOverdueOnly ? <CheckCircle size={16} /> : <div className="w-4 h-4 rounded-full border-2 border-gray-300" />}
                    Overdue Only
                </button>
            </div>
        </div>
    );
};
