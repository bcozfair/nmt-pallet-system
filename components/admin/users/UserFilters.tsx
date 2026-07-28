import React from 'react';
import { MapPin, UserCog } from 'lucide-react';
import { useT } from '../../../hooks/useT';
import { FilterBar, SearchInput, SelectField } from '../../ui';

interface UserFiltersProps {
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    locationFilter: string;
    setLocationFilter: (loc: string) => void;
    roleFilter: string;
    setRoleFilter: (role: string) => void;
    departments: string[];
    // How many of the three filters are off their default value. Drives whether
    // FilterBar shows its result row -- see UserView.tsx.
    activeFilterCount: number;
    // processedUsers.length: how many rows the current combination produces.
    resultCount: number;
    // Was reachable only from the table's empty state before, so a filter that
    // still matched rows could not be cleared in one action.
    onClearFilters: () => void;
}

export const UserFilters: React.FC<UserFiltersProps> = ({
    searchTerm,
    setSearchTerm,
    locationFilter,
    setLocationFilter,
    roleFilter,
    setRoleFilter,
    departments,
    activeFilterCount,
    resultCount,
    onClearFilters,
}) => {
    const t = useT();

    const locationOptions = [
        { value: 'all', label: t.users.allLocations },
        // ชื่อแผนกเป็นข้อมูลที่ผู้ใช้พิมพ์เองในหน้าสถานที่ ไม่ใช่ข้อความ UI จึงไม่แปล
        ...departments.map((d) => ({ value: d, label: d })),
    ];

    const roleOptions = [
        { value: 'all', label: t.users.allRoles },
        { value: 'admin', label: t.role.admin },
        { value: 'staff', label: t.role.staff },
    ];

    return (
        <FilterBar
            isFiltered={activeFilterCount > 0}
            resultLabel={t.users.resultCount(resultCount)}
            onClear={onClearFilters}
            clearLabel={t.common.clearFilters}
        >
            <SearchInput
                id="search-users"
                name="search"
                className="xl:flex-1"
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder={t.users.searchPlaceholder}
                ariaLabel={t.users.searchAria}
                clearLabel={t.users.clearSearch}
            />

            <div className="flex flex-col gap-2 sm:flex-row">
                <SelectField
                    id="filter-user-location"
                    name="location"
                    icon={MapPin}
                    className="sm:w-48"
                    value={locationFilter}
                    onChange={setLocationFilter}
                    options={locationOptions}
                    ariaLabel={t.users.filterLocationAria}
                />

                <SelectField
                    id="filter-user-role"
                    name="role"
                    icon={UserCog}
                    className="sm:w-40"
                    value={roleFilter}
                    onChange={setRoleFilter}
                    options={roleOptions}
                    ariaLabel={t.users.filterRoleAria}
                />
            </div>
        </FilterBar>
    );
};
