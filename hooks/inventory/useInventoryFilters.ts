
import { useState, useEffect, useMemo } from 'react';
import { Pallet, Department } from '../../types';
import { fetchDepartments } from '../../services/departmentService';
import { SortConfig } from '../../components/admin/inventory/InventoryTable';

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
    const [overdueThreshold, setOverdueThreshold] = useState(7);

    // --- Effects ---
    useEffect(() => {
        const load = async () => {
            const depts = await fetchDepartments();
            setDepartments(depts);
        };
        load();
        const setting = localStorage.getItem('nmt_setting_overdue_days');
        if (setting) setOverdueThreshold(parseInt(setting));

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
    const processedPallets = useMemo(() => {
        let data = pallets.filter(p => {
            const matchesSearch = p.pallet_id.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
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

            return matchesSearch && matchesStatus && matchesLocation && matchesDate && matchesOverdue;
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

                const valA = a[sortConfig.key as keyof Pallet];
                const valB = b[sortConfig.key as keyof Pallet];

                if (valA === null) return 1;
                if (valB === null) return -1;

                if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return data;
    }, [pallets, searchTerm, statusFilter, locationFilter, dateRange, showOverdueOnly, overdueThreshold, sortConfig]);

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

        // Handlers
        handleSort,
        handleClearFilters
    };
};
