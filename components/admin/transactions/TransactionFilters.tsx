import React from 'react';
import { Search, MapPin, Filter, Calendar, ChevronRight, ChevronDown, X, User } from 'lucide-react';
import { Department } from '../../../types';

interface TransactionFiltersProps {
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    actionFilter: string;
    setActionFilter: (filter: string) => void;
    locationFilter: string;
    setLocationFilter: (loc: string) => void;
    dateRange: { start: string, end: string };
    setDateRange: (range: { start: string, end: string }) => void;
    departments: Department[];
    userFilter: string;
    setUserFilter: (user: string) => void;
    users: Record<string, string>;
}

export const TransactionFilters: React.FC<TransactionFiltersProps> = ({
    searchTerm,
    setSearchTerm,
    actionFilter,
    setActionFilter,
    locationFilter,
    setLocationFilter,
    dateRange,
    setDateRange,
    departments,
    userFilter,
    setUserFilter,
    users
}) => {
    return (
        <div className="bg-white p-2.5 rounded-xl shadow-sm border border-gray-100">
            <div className="flex flex-col xl:flex-row gap-3 items-center">

                {/* Search */}
                <div className="relative flex-1 w-full xl:w-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search by Pallet ID, Notes..."
                        className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex flex-col sm:flex-row gap-2 w-full xl:w-auto">
                    {/* User Filter */}
                    <div className="relative flex-1 sm:w-48">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <select
                            className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none text-sm"
                            value={userFilter}
                            onChange={(e) => setUserFilter(e.target.value)}
                        >
                            <option value="all">All Users</option>
                            {Object.entries(users).sort((a, b) => (a[1] as string).localeCompare(b[1] as string)).map(([id, name]) => (
                                <option key={id} value={id}>{name}</option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                            <ChevronRight size={14} className="rotate-90" />
                        </div>
                    </div>

                    {/* Location Filter */}
                    <div className="relative flex-1 sm:w-48">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <select
                            className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none text-sm"
                            value={locationFilter}
                            onChange={(e) => setLocationFilter(e.target.value)}
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

                    {/* Action Filter */}
                    <div className="relative flex-1 sm:w-48">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <select
                            className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none text-sm"
                            value={actionFilter}
                            onChange={(e) => setActionFilter(e.target.value)}
                        >
                            <option value="all">All Actions</option>
                            <option value="check_out">Check Out</option>
                            <option value="check_in">Check In</option>
                            <option value="report_damage">Damage Report</option>
                            <option value="repair">Repair</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                            <ChevronRight size={14} className="rotate-90" />
                        </div>
                    </div>
                </div>

                {/* Date Range Picker */}
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

            </div>
        </div>
    );
};
