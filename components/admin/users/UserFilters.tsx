import React from 'react';
import { Search, MapPin, ChevronRight, UserCog } from 'lucide-react';
import { useT } from '../../../hooks/useT';

interface UserFiltersProps {
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    locationFilter: string;
    setLocationFilter: (loc: string) => void;
    roleFilter: string;
    setRoleFilter: (role: string) => void;
    departments: string[];
}

export const UserFilters: React.FC<UserFiltersProps> = ({
    searchTerm,
    setSearchTerm,
    locationFilter,
    setLocationFilter,
    roleFilter,
    setRoleFilter,
    departments
}) => {
    const t = useT();

    return (
        <div className="bg-white p-2.5 rounded-xl shadow-sm border border-gray-100">
            <div className="flex flex-col xl:flex-row gap-3 items-center">

                <div className="relative flex-1 w-full xl:w-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                        id="search-users"
                        name="search"
                        aria-label={t.users.searchAria}
                        type="text"
                        placeholder={t.users.searchPlaceholder}
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
                            aria-label={t.users.filterLocationAria}
                            className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none text-sm"
                            value={locationFilter}
                            onChange={(e) => setLocationFilter(e.target.value)}
                        >
                            <option value="all">{t.users.allLocations}</option>
                            {departments.map(d => (
                                <option key={d} value={d}>{d}</option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                            <ChevronRight size={14} className="rotate-90" />
                        </div>
                    </div>

                    <div className="relative flex-1 sm:w-40">
                        <UserCog className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <select
                            id="filter-role"
                            name="role"
                            aria-label={t.users.filterRoleAria}
                            className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none text-sm"
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                        >
                            <option value="all">{t.users.allRoles}</option>
                            <option value="admin">{t.role.admin}</option>
                            <option value="staff">{t.role.staff}</option>
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
