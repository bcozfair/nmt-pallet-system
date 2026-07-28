
import { useState, useEffect, useMemo } from 'react';
import { Pallet, Department } from '../../types';
import { fetchDepartments } from '../../services/departmentService';
import { SortConfig } from '../../components/admin/inventory/InventoryTable';
import { useOverdueThreshold } from '../useOverdueThreshold';

// One definition of "overdue", shared by the status-strip count and by the
// filter that count promises. They used to be two copies of this arithmetic in
// two places, which is how a count and the list it labels drift apart.
//
// Not overdue unless the pallet is actually out: a damaged pallet sitting in
// the warehouse has an old checkout date but nobody is waiting on it.
const isOverdue = (p: Pallet, thresholdDays: number) => {
    if (p.status !== 'in_use' || !p.last_checkout_date) return false;
    const days = (new Date().getTime() - new Date(p.last_checkout_date).getTime()) / (1000 * 3600 * 24);
    return days > thresholdDays;
};

export const useInventoryFilters = (
    pallets: Pallet[],
    initialFilter: string = 'all',
    initialLocation: string = 'all'
) => {
    // State
    const [searchTerm, setSearchTerm] = useState('');
    // 'all' | 'available' | 'in_use' | 'damaged' | 'scrapped' | 'overdue'.
    // 'overdue' joined this union when the separate "Overdue only" toggle chip
    // came off the filter bar and became the strip's fifth tile: the strip is
    // one exclusive choice, so overdue had to become one of its values rather
    // than a second axis crossed with it.
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [locationFilter, setLocationFilter] = useState('all');
    const [dateRange, setDateRange] = useState<{ start: string, end: string }>({ start: '', end: '' });

    // Pagination & Sort
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(20);
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'last_transaction_date', direction: 'desc' });

    // Data & Config
    const [departments, setDepartments] = useState<Department[]>([]);

    // Was read from localStorage under a key nothing in the app ever wrote, and
    // parsed with a bare parseInt on top of that: a corrupt value gave NaN, and
    // `days > NaN` is false for every pallet, so "Overdue only" quietly matched
    // nothing and read as an empty result rather than a broken filter. This is
    // the configured value from system_settings, shared with the dashboard and
    // the location table so the three cannot disagree.
    const { days: overdueThreshold } = useOverdueThreshold();

    // --- Effects ---
    useEffect(() => {
        const load = async () => {
            const depts = await fetchDepartments();
            setDepartments(depts);
        };
        load();

        // The dashboard's overdue KPI links here with initialFilter='overdue'.
        // That used to flip a separate boolean; it now selects the strip tile,
        // so arriving from the dashboard lands on a screen whose strip visibly
        // shows which filter is on -- the boolean had no on-screen home once
        // the toggle chip was removed.
        setStatusFilter(initialFilter === 'overdue' ? 'overdue' : 'all');

        if (initialLocation) {
            setLocationFilter(initialLocation);
        }
    }, [initialFilter, initialLocation]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, locationFilter, dateRange]);

    // --- Processing ---
    // First layer: everything except status. The status-strip counts read from
    // this layer so each number means "click this and you get N rows" -- if
    // counts were taken after the status filter too, every unselected tile
    // would read 0 and the strip would be pointless.
    const baseFiltered = useMemo(() => {
        return pallets.filter(p => {
            const matchesSearch = p.pallet_id.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesLocation = locationFilter === 'all' || p.current_location === locationFilter;

            let matchesDate = true;
            if (dateRange.start && p.last_checkout_date) {
                matchesDate = matchesDate && new Date(p.last_checkout_date) >= new Date(dateRange.start);
            }
            if (dateRange.end && p.last_checkout_date) {
                const end = new Date(dateRange.end);
                end.setHours(23, 59, 59);
                matchesDate = matchesDate && new Date(p.last_checkout_date) <= end;
            } else if (dateRange.start && !p.last_checkout_date) {
                matchesDate = false;
            }

            return matchesSearch && matchesLocation && matchesDate;
        });
    }, [pallets, searchTerm, locationFilter, dateRange]);

    const statusCounts = useMemo(() => ({
        // 'all' is not "literally everything" but the working fleet, matching
        // what statusFilter === 'all' filters to below, and matching how the
        // rest of the app excludes scrapped pallets from totals and from the
        // utilisation denominator.
        all: baseFiltered.filter(p => p.status !== 'scrapped').length,
        available: baseFiltered.filter(p => p.status === 'available').length,
        in_use: baseFiltered.filter(p => p.status === 'in_use').length,
        damaged: baseFiltered.filter(p => p.status === 'damaged').length,
        scrapped: baseFiltered.filter(p => p.status === 'scrapped').length,
        // Overdue is a subset of in_use, not a sixth status, so these five
        // numbers deliberately do not sum to `all`. Every one of them still
        // answers the same question -- "click this tile and you get N rows" --
        // which is the only property the strip depends on.
        //
        // Overdue used to be filtered in the layer ABOVE this one, so switching
        // it on drove available and damaged to 0 and the strip went blank
        // except for the tile you had just pressed. Moving it down here with
        // the other statuses is what makes the five counts independent.
        overdue: baseFiltered.filter(p => isOverdue(p, overdueThreshold)).length,
    }), [baseFiltered, overdueThreshold]);

    // Second layer: status filter applied, then sorted.
    const processedPallets = useMemo(() => {
        let data = baseFiltered.filter(p => {
            // 'overdue' is not a value of p.status -- it is a condition on how
            // long an in_use pallet has been out -- so it cannot go through the
            // equality check below and needs its own branch.
            if (statusFilter === 'overdue') return isOverdue(p, overdueThreshold);

            // 'all' means the working fleet, not literally everything. Scrapped
            // pallets are excluded from every fleet total and from utilisation,
            // so listing them by default would contradict the counts on screen
            // and fill the list with assets nobody can act on. They are still
            // reachable through the explicit Scrapped option.
            return statusFilter === 'all'
                ? p.status !== 'scrapped'
                : p.status === statusFilter;
        });

        if (sortConfig) {
            data.sort((a, b) => {
                if (sortConfig.key === 'days_overdue') {
                    const getDays = (p: Pallet) => {
                        if (p.status !== 'in_use' || !p.last_checkout_date) return -1;
                        return (new Date().getTime() - new Date(p.last_checkout_date).getTime()) / (1000 * 3600 * 24);
                    };
                    const daysA = getDays(a);
                    const daysB = getDays(b);
                    return sortConfig.direction === 'asc' ? daysA - daysB : daysB - daysA;
                }

                // `?? null` folds undefined in with null. Optional columns such as
                // pallet_remark are undefined when unset, and `undefined < x` is
                // false in both directions -- those rows used to compare as equal
                // to everything and scatter through the list instead of sorting
                // to the end.
                const valA = a[sortConfig.key as keyof Pallet] ?? null;
                const valB = b[sortConfig.key as keyof Pallet] ?? null;

                if (valA === null && valB === null) return 0;
                if (valA === null) return 1;
                if (valB === null) return -1;

                if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return data;
    }, [baseFiltered, statusFilter, sortConfig, overdueThreshold]);

    const activeFilterCount =
        (searchTerm ? 1 : 0) +
        (statusFilter !== 'all' ? 1 : 0) +
        (locationFilter !== 'all' ? 1 : 0) +
        // No separate overdue term any more: overdue is a value of statusFilter,
        // so the `statusFilter !== 'all'` line above already counts it. Keeping
        // both would have counted the one filter twice.
        (dateRange.start || dateRange.end ? 1 : 0);

    const totalPages = Math.ceil(processedPallets.length / itemsPerPage);
    const paginatedPallets = processedPallets.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // --- Handlers ---
    const handleSort = (key: keyof Pallet | 'days_overdue') => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handleClearFilters = () => {
        setSearchTerm('');
        setStatusFilter('all');
        setLocationFilter('all');
        setDateRange({ start: '', end: '' });
    };

    return {
        // State
        searchTerm, setSearchTerm,
        statusFilter, setStatusFilter,
        locationFilter, setLocationFilter,
        dateRange, setDateRange,
        departments,
        overdueThreshold,

        // Sorting & Pagination
        sortConfig,
        currentPage, setCurrentPage,
        itemsPerPage,
        totalPages,

        // Data
        processedPallets,
        paginatedPallets,
        statusCounts,
        activeFilterCount,

        // Handlers
        handleSort,
        handleClearFilters
    };
};
