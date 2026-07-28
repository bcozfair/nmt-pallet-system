import React from 'react';
import { Filter, MapPin, User } from 'lucide-react';
import { Department } from '../../../types';
import { useT } from '../../../hooks/useT';
import { DateRangeField, FilterBar, SearchInput, SelectField } from '../../ui';

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
    // How many of the five filters are not at their default value. Drives whether
    // FilterBar shows its result row at all -- see TransactionView.tsx.
    activeFilterCount: number;
    // processedTransactions.length: how many rows the current combination
    // produces, for the "N results" line under the card.
    resultCount: number;
    onClearFilters: () => void;
}

// สามช่องเลือกนั่งเรียงกันในแถวเดียว หน้าคลังพาเลทมีช่องเดียวจึงใช้ sm:w-48 ได้
// ที่นี่ sm:w-48 สามตัวรวมกับช่องวันที่แล้วดันจนช่องค้นหาแทบไม่เหลือที่
const SELECT_WIDTH = 'sm:w-44';

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
    users,
    activeFilterCount,
    resultCount,
    onClearFilters,
}) => {
    const t = useT();

    const userOptions = [
        { value: 'all', label: t.transactions.allUsers },
        ...Object.entries(users)
            .sort((a, b) => a[1].localeCompare(b[1]))
            .map(([id, name]) => ({ value: id, label: name })),
    ];

    const locationOptions = [
        { value: 'all', label: t.transactions.allLocations },
        // Department names are data, not UI text: they are typed into the
        // locations screen and stored on every transaction, so they stay exactly
        // as recorded -- including "Warehouse", which the table shows verbatim.
        { value: 'Warehouse', label: 'Warehouse' },
        ...departments
            .filter((d) => d.name !== 'Warehouse')
            .map((d) => ({ value: d.name, label: d.name })),
    ];

    // The five labels come from the shared action table, so this dropdown can
    // never disagree with the badges in the table, the CSV export or the mobile
    // history.
    const actionOptions = [
        { value: 'all', label: t.transactions.allActions },
        { value: 'check_out', label: t.action.check_out },
        { value: 'check_in', label: t.action.check_in },
        { value: 'report_damage', label: t.action.report_damage },
        { value: 'repair', label: t.action.repair },
        { value: 'scrap', label: t.action.scrap },
    ];

    return (
        <FilterBar
            isFiltered={activeFilterCount > 0}
            resultLabel={t.transactions.resultCount(resultCount)}
            onClear={onClearFilters}
            clearLabel={t.common.clearFilters}
        >
            <SearchInput
                id="search-transactions"
                name="search"
                className="xl:flex-1"
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder={t.transactions.searchPlaceholder}
                ariaLabel={t.transactions.searchTransactions}
                clearLabel={t.transactions.clearSearch}
            />

            <div className="flex flex-col gap-2 sm:flex-row">
                <SelectField
                    id="filter-tx-user"
                    name="user"
                    icon={User}
                    className={SELECT_WIDTH}
                    value={userFilter}
                    onChange={setUserFilter}
                    options={userOptions}
                    ariaLabel={t.transactions.filterByUser}
                />

                <SelectField
                    id="filter-tx-location"
                    name="location"
                    icon={MapPin}
                    className={SELECT_WIDTH}
                    value={locationFilter}
                    onChange={setLocationFilter}
                    options={locationOptions}
                    ariaLabel={t.transactions.filterByLocation}
                />

                <SelectField
                    id="filter-tx-action"
                    name="actionType"
                    icon={Filter}
                    className={SELECT_WIDTH}
                    value={actionFilter}
                    onChange={setActionFilter}
                    options={actionOptions}
                    ariaLabel={t.transactions.filterByAction}
                />

                <DateRangeField
                    idPrefix="filter-tx-date"
                    startName="startDate"
                    endName="endDate"
                    value={dateRange}
                    onChange={setDateRange}
                    startLabel={t.transactions.startDate}
                    endLabel={t.transactions.endDate}
                    clearLabel={t.common.clearFilters}
                />
            </div>
        </FilterBar>
    );
};
