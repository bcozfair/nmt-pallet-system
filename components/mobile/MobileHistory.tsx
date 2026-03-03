import React, { useEffect, useState, useMemo } from 'react';
import { ArrowLeft, Clock, ArrowRightCircle, ArrowLeftCircle, AlertTriangle, Wrench, Search, Calendar, Filter, X } from 'lucide-react';
import { Transaction } from '../../types';
import { fetchUserTransactions, fetchUserTransactionDates } from '../../services/transactionService';
import { formatDateTime } from '../admin/common/AdminHelpers';

interface MobileHistoryProps {
    userId: string;
    onBack: () => void;
}

export const MobileHistory: React.FC<MobileHistoryProps> = ({ userId, onBack }) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [availableDates, setAvailableDates] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterAction, setFilterAction] = useState<string>('all');
    const [showDateSelect, setShowDateSelect] = useState(false);

    // 1. Load Dates on Mount
    useEffect(() => {
        const loadDates = async () => {
            try {
                const dates = await fetchUserTransactionDates(userId);
                setAvailableDates(dates);
                if (dates.length > 0) {
                    setSelectedDate(dates[0]); // Default to latest
                } else {
                    // If no dates, maybe just load 'recent' (empty date)
                    setSelectedDate('');
                }
            } catch (error) {
                console.error("Failed to load dates", error);
            }
        };
        loadDates();
    }, [userId]);

    // 2. Load Transactions when Date Changes
    useEffect(() => {
        const loadHistory = async () => {
            setLoading(true);
            try {
                // If we have dates but none selected, wait? Or load recent?
                // Logic: If availableDates exist, use selectedDate. If availableDates empty, load recent.
                const data = await fetchUserTransactions(userId, selectedDate);
                setTransactions(data);
            } catch (error) {
                console.error("Failed to load history", error);
            } finally {
                setLoading(false);
            }
        };

        loadHistory();
    }, [userId, selectedDate]);

    // 3. Client-side Filtering (Search & Action)
    const filteredTransactions = useMemo(() => {
        return transactions.filter(tx => {
            // Action Filter
            if (filterAction !== 'all') {
                if (filterAction === 'check_out' && tx.action_type !== 'check_out') return false;
                if (filterAction === 'check_in' && tx.action_type !== 'check_in') return false;
                if (filterAction === 'damage' && tx.action_type !== 'report_damage') return false;
                if (filterAction === 'repair' && tx.action_type !== 'repair') return false;
            }

            // Search Filter
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const matchesId = tx.pallet_id.toLowerCase().includes(query);
                const matchesDest = tx.department_dest?.toLowerCase().includes(query);
                const matchesRemark = tx.transaction_remark?.toLowerCase().includes(query);
                return matchesId || matchesDest || matchesRemark;
            }

            return true;
        });
    }, [transactions, filterAction, searchQuery]);

    const getActionIcon = (action: string) => {
        switch (action) {
            case 'check_out': return <ArrowRightCircle size={20} className="text-blue-500" />;
            case 'check_in': return <ArrowLeftCircle size={20} className="text-green-500" />;
            case 'report_damage': return <AlertTriangle size={20} className="text-red-500" />;
            case 'repair': return <Wrench size={20} className="text-orange-500" />;
            default: return <Clock size={20} className="text-gray-400" />;
        }
    };

    const getActionLabel = (action: string) => {
        switch (action) {
            case 'check_out': return 'Check Out';
            case 'check_in': return 'Check In';
            case 'report_damage': return 'Report Damage';
            case 'repair': return 'Repaired';
            default: return action.replace('_', ' ');
        }
    };

    // Helper to format date for display in selector
    const formatDateChip = (dateStr: string) => {
        if (!dateStr) return 'Recent';
        const date = new Date(dateStr);
        // "Today", "Yesterday" logic could go here
        return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
    };

    return (
        <div className="flex flex-col h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white px-4 py-3 shadow-sm z-20 shrink-0 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                    <button
                        onClick={onBack}
                        className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full transition"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search ID, Location..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-gray-100 pl-9 pr-4 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Filters Row */}
                <div className="flex items-center gap-2 pb-1 relative z-30">
                    {/* Date Selector Trigger - Fixed on Left */}
                    <div className="relative shrink-0">
                        <button
                            onClick={() => setShowDateSelect(!showDateSelect)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition ${selectedDate ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-600'
                                }`}
                        >
                            <Calendar size={14} />
                            {selectedDate ? formatDateChip(selectedDate) : 'Recent Only'}
                        </button>

                        {/* Date Dropdown */}
                        {showDateSelect && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setShowDateSelect(false)} />
                                <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-20 max-h-60 overflow-y-auto py-1 animate-in fade-in zoom-in-95 duration-100">
                                    <button
                                        onClick={() => { setSelectedDate(''); setShowDateSelect(false); }}
                                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${!selectedDate ? 'text-indigo-600 font-bold bg-indigo-50' : 'text-gray-600'}`}
                                    >
                                        Recent (Last 50)
                                    </button>
                                    {availableDates.map(date => (
                                        <button
                                            key={date}
                                            onClick={() => { setSelectedDate(date); setShowDateSelect(false); }}
                                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${selectedDate === date ? 'text-indigo-600 font-bold bg-indigo-50' : 'text-gray-600'}`}
                                        >
                                            {formatDateChip(date)}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    <div className="w-[1px] h-6 bg-gray-200 shrink-0" />

                    {/* Action Chips - Scrollable */}
                    <div className="flex-1 overflow-x-auto no-scrollbar flex items-center gap-2">
                        {[
                            { id: 'all', label: 'All' },
                            { id: 'check_out', label: 'Out' },
                            { id: 'check_in', label: 'In' },
                            { id: 'damage', label: 'Damage' }
                        ].map(action => (
                            <button
                                key={action.id}
                                onClick={() => setFilterAction(action.id)}
                                className={`px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap border shrink-0 ${filterAction === action.id
                                    ? 'bg-gray-800 text-white border-gray-800'
                                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                {action.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 pt-2">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-400">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                        <span className="text-sm">Loading history...</span>
                    </div>
                ) : filteredTransactions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-2">
                        <Filter size={48} className="opacity-20" />
                        <p>No transactions found</p>
                        {(searchQuery || filterAction !== 'all') && (
                            <button
                                onClick={() => { setSearchQuery(''); setFilterAction('all'); }}
                                className="text-xs text-indigo-500 font-bold mt-2"
                            >
                                Clear filters
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredTransactions.map((tx) => (
                            <div key={tx.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col gap-2">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="shrink-0 p-2 bg-gray-50 rounded-full">
                                            {getActionIcon(tx.action_type)}
                                        </div>
                                        <div>
                                            <span className="block font-bold text-gray-800">{getActionLabel(tx.action_type)}</span>
                                            <span className="text-xs text-gray-500 font-mono">ID: {tx.pallet_id}</span>
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-gray-400 font-medium bg-gray-50 px-2 py-1 rounded-md">
                                        {formatDateTime(tx.timestamp)}
                                    </span>
                                </div>

                                {(tx.department_dest || tx.transaction_remark) && (
                                    <div className="ml-11 text-sm border-l-2 border-gray-100 pl-3 py-1">
                                        {tx.department_dest && (
                                            <div className="text-gray-600">
                                                <span className="text-gray-400 text-xs uppercase mr-1">To:</span>
                                                {tx.department_dest}
                                            </div>
                                        )}
                                        {tx.transaction_remark && (
                                            <div className="text-gray-500 italic text-xs mt-1">
                                                "{tx.transaction_remark}"
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}

                        <div className="text-center py-4 text-xs text-gray-400">
                            Showing {filteredTransactions.length} items
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
