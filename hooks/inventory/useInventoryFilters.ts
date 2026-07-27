
import { useState, useEffect, useMemo } from 'react';
import { Pallet, Department } from '../../types';
import { fetchDepartments } from '../../services/departmentService';
import { SortConfig } from '../../components/admin/inventory/InventoryTable';
import { useOverdueThreshold } from '../useOverdueThreshold';

export const useInventoryFilters = (
    pallets: Pallet[],
    initialFilter: string = 'all',
    initialLocation: string = 'all'
) => {
    // State
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [showOverdueOnly, setShowOverdueOnly] = useState(false);
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

        if (initialFilter === 'overdue') {
            setShowOverdueOnly(true);
        } else {
            setShowOverdueOnly(false);
        }

        if (initialLocation) {
            setLocationFilter(initialLocation);
        }
    }, [initialFilter, initialLocation]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, locationFilter, dateRange, showOverdueOnly]);

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

            let matchesOverdue = true;
            if (showOverdueOnly) {
                if (p.status !== 'in_use' || !p.last_checkout_date) {
                    matchesOverdue = false;
                } else {
                    const days = (new Date().getTime() - new Date(p.last_checkout_date).getTime()) / (1000 * 3600 * 24);
                    matchesOverdue = days > overdueThreshold;
                }
            }

            return matchesSearch && matchesLocation && matchesDate && matchesOverdue;
        });
    }, [pallets, searchTerm, locationFilter, dateRange, showOverdueOnly, overdueThreshold]);

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
    }), [baseFiltered]);

    // Second layer: status filter applied, then sorted.
    const processedPallets = useMemo(() => {
        let data = baseFiltered.filter(p => {
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
    }, [baseFiltered, statusFilter, sortConfig]);

    const activeFilterCount =
        (searchTerm ? 1 : 0) +
        (statusFilter !== 'all' ? 1 : 0) +
        (locationFilter !== 'all' ? 1 : 0) +
        (dateRange.start || dateRange.end ? 1 : 0) +
        (showOverdueOnly ? 1 : 0);

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
        setShowOverdueOnly(false);
    };

    return {
        // State
        searchTerm, setSearchTerm,
        statusFilter, setStatusFilter,
        showOverdueOnly, setShowOverdueOnly,
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
