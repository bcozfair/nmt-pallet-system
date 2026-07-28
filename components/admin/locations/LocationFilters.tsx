import React from 'react';
import { Filter, Power } from 'lucide-react';
import { useT } from '../../../hooks/useT';
import { FilterBar, SearchInput, SelectField } from '../../ui';

interface LocationFiltersProps {
    searchTerm: string;
    onSearchChange: (value: string) => void;
    statusFilter: string;
    onStatusFilterChange: (value: string) => void;
    issueFilter: string;
    onIssueFilterChange: (value: string) => void;
    // How many of the three filters are off their default value. Drives whether
    // FilterBar shows its result row -- see LocationView.tsx.
    activeFilterCount: number;
    // processedDepartments.length: how many rows the combination produces.
    resultCount: number;
    // Was reachable only from the table's empty state before.
    onClearFilters: () => void;
}

export const LocationFilters: React.FC<LocationFiltersProps> = ({
    searchTerm,
    onSearchChange,
    statusFilter,
    onStatusFilterChange,
    issueFilter,
    onIssueFilterChange,
    activeFilterCount,
    resultCount,
    onClearFilters,
}) => {
    const t = useT();

    const statusOptions = [
        { value: 'all', label: t.locations.allStatus },
        { value: 'active', label: t.common.active },
        { value: 'inactive', label: t.common.inactive },
    ];

    const conditionOptions = [
        { value: 'all', label: t.locations.allConditions },
        { value: 'not_empty', label: t.locations.withPallets },
        { value: 'empty', label: t.locations.emptyLocations },
        { value: 'has_overdue', label: t.locations.hasOverdue },
        { value: 'has_damage', label: t.locations.hasDamaged },
    ];

    return (
        <FilterBar
            isFiltered={activeFilterCount > 0}
            resultLabel={t.locations.resultCount(resultCount)}
            onClear={onClearFilters}
            clearLabel={t.common.clearFilters}
        >
            <SearchInput
                id="search-locations"
                name="search"
                className="xl:flex-1"
                value={searchTerm}
                onChange={onSearchChange}
                placeholder={t.locations.searchPlaceholder}
                ariaLabel={t.locations.searchAria}
                clearLabel={t.locations.clearSearch}
            />

            <div className="flex flex-col gap-2 sm:flex-row">
                <SelectField
                    id="filter-location-status"
                    name="status"
                    icon={Power}
                    className="sm:w-40"
                    value={statusFilter}
                    onChange={onStatusFilterChange}
                    options={statusOptions}
                    ariaLabel={t.locations.filterStatusAria}
                />

                <SelectField
                    id="filter-location-condition"
                    name="condition"
                    icon={Filter}
                    className="sm:w-48"
                    value={issueFilter}
                    onChange={onIssueFilterChange}
                    options={conditionOptions}
                    ariaLabel={t.locations.filterConditionAria}
                />
            </div>
        </FilterBar>
    );
};
