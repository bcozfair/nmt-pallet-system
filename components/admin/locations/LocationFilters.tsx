import React from 'react';
import { Search, ChevronRight, Power, Filter } from 'lucide-react';
import { useT } from '../../../hooks/useT';

interface LocationFiltersProps {
    searchTerm: string;
    onSearchChange: (value: string) => void;
    statusFilter: string;
    onStatusFilterChange: (value: string) => void;
    issueFilter: string;
    onIssueFilterChange: (value: string) => void;
}

export const LocationFilters: React.FC<LocationFiltersProps> = ({
    searchTerm,
    onSearchChange,
    statusFilter,
    onStatusFilterChange,
    issueFilter,
    onIssueFilterChange
}) => {
    const t = useT();

    return (
        <div className="bg-white p-2.5 rounded-xl shadow-sm border border-gray-100">
            <div className="flex flex-col xl:flex-row gap-3 items-center">

                {/* Search */}
                <div className="relative flex-1 w-full xl:w-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                        type="text"
                        placeholder={t.locations.searchPlaceholder}
                        className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 text-sm"
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                </div>

                <div className="flex flex-col sm:flex-row gap-2 w-full xl:w-auto">

                    {/* Status Filter */}
                    <div className="relative flex-1 sm:w-40">
                        <Power className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <select
                            className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none text-sm"
                            value={statusFilter}
                            onChange={(e) => onStatusFilterChange(e.target.value)}
                        >
                            <option value="all">{t.locations.allStatus}</option>
                            <option value="active">{t.common.active}</option>
                            <option value="inactive">{t.common.inactive}</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                            <ChevronRight size={14} className="rotate-90" />
                        </div>
                    </div>

                    {/* Issue/Condition Filter */}
                    <div className="relative flex-1 sm:w-48">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <select
                            className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none text-sm"
                            value={issueFilter}
                            onChange={(e) => onIssueFilterChange(e.target.value)}
                        >
                            <option value="all">{t.locations.allConditions}</option>
                            <option value="not_empty">{t.locations.withPallets}</option>
                            <option value="empty">{t.locations.emptyLocations}</option>
                            <option value="has_overdue">{t.locations.hasOverdue}</option>
                            <option value="has_damage">{t.locations.hasDamaged}</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                            <ChevronRight size={14} className="rotate-90" />
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
