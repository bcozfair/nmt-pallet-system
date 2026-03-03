import React, { useState, useRef, useEffect } from 'react';
import { LayoutDashboard, Printer, FileText, ChevronDown, PieChart, Package, Clock } from 'lucide-react';
import { exportInventoryCSV, exportHistoryCSV } from '../../../utils/exportHelpers';

interface DashboardHeaderProps {
    stats: {
        total: number;
        available: number;
        in_use: number;
        damaged: number;
        overdueCount: number;
        utilizationRate: string;
        velocity7Days: number;
    };
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ stats }) => {
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
    const exportMenuRef = useRef<HTMLDivElement>(null);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
                setIsExportMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handlePrint = () => {
        const printContent = document.getElementById('dashboard-printable-area');
        if (!printContent) return;

        const printWindow = window.open('', '_blank', 'width=1100,height=800');
        if (!printWindow) {
            alert("Popups are blocked. Please allow popups for this site to print.");
            return;
        }

        // Logic copied from original DashboardHome
        // Note: In a real app we might want to move this HTML string to a separate helper too
        // but for now we keep it here.
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>NMT Dashboard Report</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
                <style>
                    body { font-family: 'Inter', sans-serif; background-color: white; padding: 20px; }
                    @media print {
                        .print\\:hidden { display: none !important; }
                        body { -webkit-print-color-adjust: exact; }
                    }
                    ::-webkit-scrollbar { width: 0px; background: transparent; }
                </style>
            </head>
            <body>
                <div class="mb-8 border-b border-gray-200 pb-4">
                     <h1 class="text-2xl font-bold text-gray-900">Dashboard Report</h1>
                     <p class="text-sm text-gray-500">Generated on ${new Date().toLocaleString()}</p>
                </div>
                <div class="space-y-6">
                    ${printContent.innerHTML}
                </div>
                <script>
                    setTimeout(() => {
                        window.print();
                    }, 1000);
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
    };

    const exportSummaryCSV = () => {
        const headers = ["Category", "Value"];
        const rows = [
            ["Total Pallets", stats.total],
            ["Available", stats.available],
            ["In Use", stats.in_use],
            ["Damaged", stats.damaged],
            ["Overdue Items", stats.overdueCount],
            ["Utilization Rate", stats.utilizationRate + "%"],
            ["7-Day Velocity", stats.velocity7Days]
        ];

        // Inline generation for summary as it is simple and specific
        // Or we could import generateCSV from utils/exportHelpers
        const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "dashboard_summary.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setIsExportMenuOpen(false);
    };

    return (
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 print:hidden">
            <div>
                <h2 className="text-3xl font-black text-gray-800 flex items-center gap-2 tracking-tight">
                    <LayoutDashboard className="text-blue-600" />Dashboard Overview
                </h2>
                <p className="text-gray-500 text-sm mt-1">Operational Analytics & Risk Monitoring</p>
            </div>
            <div className="flex gap-2">
                <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-50 shadow-sm transition">
                    <Printer size={18} /> Print Report
                </button>

                <div className="relative" ref={exportMenuRef}>
                    <button
                        onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-sm transition"
                    >
                        <FileText size={18} /> Export Data <ChevronDown size={16} className={`transition-transform duration-200 ${isExportMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isExportMenuOpen && (
                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <div className="p-2 space-y-1">
                                <button
                                    onClick={exportSummaryCSV}
                                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition flex items-center gap-2"
                                >
                                    <div className="p-1.5 bg-blue-100 text-blue-600 rounded-md"><PieChart size={14} /></div>
                                    <span>Export Summary (Stats)</span>
                                </button>
                                <button
                                    onClick={() => { exportInventoryCSV(); setIsExportMenuOpen(false); }}
                                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition flex items-center gap-2"
                                >
                                    <div className="p-1.5 bg-green-100 text-green-600 rounded-md"><Package size={14} /></div>
                                    <span>Export Inventory CSV</span>
                                </button>
                                <button
                                    onClick={() => { exportHistoryCSV(); setIsExportMenuOpen(false); }}
                                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition flex items-center gap-2"
                                >
                                    <div className="p-1.5 bg-purple-100 text-purple-600 rounded-md"><Clock size={14} /></div>
                                    <span>Export History CSV</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
