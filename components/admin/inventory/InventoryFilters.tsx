import React from 'react';
import { MapPin } from 'lucide-react';
import { Department } from '../../../types';
import { useT } from '../../../hooks/useT';
import { FilterBar, SearchInput, SelectField, DateRangeField } from '../../ui';

interface InventoryFiltersProps {
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    locationFilter: string;
    setLocationFilter: (loc: string) => void;
    onLocationChange?: (loc: string) => void;
    dateRange: { start: string; end: string };
    setDateRange: (range: { start: string; end: string }) => void;
    departments: Department[];
    // How many of the filters below are not at their default value. Drives
    // both whether FilterBar shows its result row and whether the status
    // strip's counts read as "filtered" -- see useInventoryFilters.ts.
    activeFilterCount: number;
    // processedPallets.length from the hook: how many rows the current
    // combination of filters (including the status strip's selection)
    // produces, for the "N results" line under the card.
    resultCount: number;
    onClearFilters: () => void;
}

export const InventoryFilters: React.FC<InventoryFiltersProps> = ({
    searchTerm,
    setSearchTerm,
    locationFilter,
    setLocationFilter,
    onLocationChange,
    dateRange,
    setDateRange,
    departments,
    activeFilterCount,
    resultCount,
    onClearFilters,
}) => {
    const t = useT();

    const locationOptions = [
        { value: 'all', label: t.inventory.allLocations },
        // 'Warehouse' and every department name below are shown verbatim, not
        // translated: department names are data typed in by users on the
        // locations screen, not UI copy, so they must read the same in both
        // languages.
        { value: 'Warehouse', label: 'Warehouse' },
        ...departments
            .filter((d) => d.name !== 'Warehouse')
            .map((d) => ({ value: d.name, label: d.name })),
    ];

    return (
        <FilterBar
            isFiltered={activeFilterCount > 0}
            resultLabel={t.inventory.resultCount(resultCount)}
            onClear={onClearFilters}
            clearLabel={t.common.clearFilters}
        >
            <SearchInput
                id="search-pallet-id"
                name="search"
                className="xl:flex-1"
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder={t.inventory.searchPlaceholder}
                ariaLabel={t.inventory.searchPallet}
                clearLabel={t.inventory.clearSearch}
            />

            <div className="flex flex-col gap-2 sm:flex-row">
                <SelectField
                    id="filter-location"
                    name="location"
                    icon={MapPin}
                    className="sm:w-48"
                    value={locationFilter}
                    onChange={(loc) => {
                        setLocationFilter(loc);
                        onLocationChange?.(loc);
                    }}
                    options={locationOptions}
                    ariaLabel={t.inventory.filterByLocation}
                />

                {/* The status <select> that used to sit here is gone, not lost:
                    InventoryStatusStrip's four tiles (rendered above this bar,
                    in InventoryView) are the status filter now, and 'scrapped'
                    -- deliberately excluded from those tiles -- is reached
                    through the "view list" link underneath the strip instead.
                    See InventoryStatusStrip.tsx. */}
                <DateRangeField
                    idPrefix="filter-date"
                    // The two names the pre-primitive InventoryFilters set on
                    // these inputs, restored: nothing submits this bar today,
                    // but the field names are part of what the move was meant
                    // to carry over intact.
                    startName="startDate"
                    endName="endDate"
                    value={dateRange}
                    onChange={setDateRange}
                    startLabel={t.inventory.startDate}
                    endLabel={t.inventory.endDate}
                    clearLabel={t.common.clearFilters}
                />
                {/* The "Overdue only" chip that used to sit here is gone the
                    same way the status <select> above it went: it is the fifth
                    tile on InventoryStatusStrip now. As a chip it was a second
                    axis crossed with the status tiles, which is what made
                    turning it on drive the other tiles' counts to 0 -- as a
                    tile it is one of five exclusive choices and every count
                    stays independent. See useInventoryFilters.ts. */}
            </div>
        </FilterBar>
    );
};
