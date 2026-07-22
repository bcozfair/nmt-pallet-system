import React, { useState, useRef, useEffect } from 'react';
import { LayoutDashboard, Printer, FileText, ChevronDown, PieChart, Package, Clock } from 'lucide-react';
import { exportInventoryCSV, exportHistoryCSV, generateCSV } from '../../../utils/exportHelpers';
import { formatDateTime } from '../common/AdminHelpers';
import { useT } from '../../../hooks/useT';
import { dict, getLang } from '../../../services/i18n';

interface DashboardHeaderProps {
    stats: {
        total: number;
        available: number;
        in_use: number;
        damaged: number;
        scrapped: number;
        overdueCount: number;
        utilizationRate: string;
        velocity7Days: number;
    };
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ stats }) => {
    const t = useT();
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

    // The two handlers below build output that leaves the React tree entirely --
    // a separate window and a downloaded file -- so they read the dictionary
    // through dict() rather than the `t` from this render.
    const handlePrint = () => {
        const d = dict();
        const printContent = document.getElementById('dashboard-printable-area');
        if (!printContent) return;

        const printWindow = window.open('', '_blank', 'width=1100,height=800');
        if (!printWindow) {
            alert(d.common.popupBlocked);
            return;
        }

        // Logic copied from original DashboardHome
        // Note: In a real app we might want to move this HTML string to a separate helper too
        // but for now we keep it here.
        //
        // This window loads none of the app's stylesheets, so its own <style>
        // has to name a Thai-capable face: Inter carries no Thai glyphs, and
        // without one the whole report falls back to a default that breaks the
        // line height of every card copied in below.
        const htmlContent = `
            <!DOCTYPE html>
            <html lang="${getLang()}">
            <head>
                <meta charset="utf-8">
                <title>${d.dashboard.reportWindowTitle}</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Noto+Sans+Thai:wght@300;400;500;600;700&display=swap" rel="stylesheet">
                <style>
                    body { font-family: "Noto Sans Thai", "Inter", system-ui, sans-serif; background-color: white; padding: 20px; }
                    @media print {
                        .print\\:hidden { display: none !important; }
                        body { -webkit-print-color-adjust: exact; }
                    }
                    ::-webkit-scrollbar { width: 0px; background: transparent; }
                </style>
            </head>
            <body>
                <div class="mb-8 border-b border-gray-200 pb-4">
                     <h1 class="text-2xl font-bold text-gray-900">${d.dashboard.reportTitle}</h1>
                     <p class="text-sm text-gray-500">${d.dashboard.reportGeneratedOn(formatDateTime(new Date()))}</p>
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
        const d = dict();
        const headers = [d.dashboard.summaryCsv.category, d.dashboard.summaryCsv.value];
        const rows = [
            // "Total Pallets" is the working fleet, so the three status rows
            // under it still add up to it. Scrapped is listed separately and
            // labelled, rather than folded in where it would break that sum.
            [d.dashboard.summaryCsv.totalActive, stats.total],
            [d.status.available, stats.available],
            [d.status.in_use, stats.in_use],
            [d.status.damaged, stats.damaged],
            [d.dashboard.summaryCsv.scrappedExcluded, stats.scrapped],
            [d.dashboard.summaryCsv.overdueItems, stats.overdueCount],
            [d.dashboard.summaryCsv.utilizationRate, stats.utilizationRate + "%"],
            [d.dashboard.summaryCsv.velocity7Days, stats.velocity7Days]
        ];

        // This used to be generated inline with a data: URI, which was fine while
        // every label was ASCII. Excel ignores the charset on a data: URI and
        // falls back to the system codepage, so the Thai labels above would land
        // as mojibake. generateCSV emits the UTF-8 BOM through a Blob instead,
        // and quotes the cells, which the inline version did not do either.
        generateCSV(headers, rows, "dashboard_summary.csv");
        setIsExportMenuOpen(false);
    };

    return (
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 print:hidden">
            <div>
                <h2 className="text-3xl font-black text-gray-800 flex items-center gap-2 tracking-tight">
                    <LayoutDashboard className="text-blue-600" />{t.dashboard.title}
                </h2>
                <p className="text-gray-500 text-sm mt-1">{t.dashboard.subtitle}</p>
            </div>
            <div className="flex gap-2">
                <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-50 shadow-sm transition">
                    <Printer size={18} /> {t.dashboard.printReport}
                </button>

                <div className="relative" ref={exportMenuRef}>
                    <button
                        onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-sm transition"
                    >
                        <FileText size={18} /> {t.dashboard.exportData} <ChevronDown size={16} className={`transition-transform duration-200 ${isExportMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isExportMenuOpen && (
                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <div className="p-2 space-y-1">
                                <button
                                    onClick={exportSummaryCSV}
                                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition flex items-center gap-2"
                                >
                                    <div className="p-1.5 bg-blue-100 text-blue-600 rounded-md"><PieChart size={14} /></div>
                                    <span>{t.dashboard.exportSummary}</span>
                                </button>
                                <button
                                    onClick={() => { exportInventoryCSV(); setIsExportMenuOpen(false); }}
                                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition flex items-center gap-2"
                                >
                                    <div className="p-1.5 bg-green-100 text-green-600 rounded-md"><Package size={14} /></div>
                                    <span>{t.dashboard.exportInventoryCsv}</span>
                                </button>
                                <button
                                    onClick={() => { exportHistoryCSV(); setIsExportMenuOpen(false); }}
                                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition flex items-center gap-2"
                                >
                                    <div className="p-1.5 bg-purple-100 text-purple-600 rounded-md"><Clock size={14} /></div>
                                    <span>{t.dashboard.exportHistoryCsv}</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
