import React from 'react';
import { ChevronDown } from 'lucide-react';

export interface DataTableViewProps {
    caption: string;
    columns: readonly { key: string; label: string; numeric?: boolean }[];
    rows: readonly Record<string, string | number>[];
    /** Collapsed by default; the <summary> label comes from the caller's i18n. */
    summaryLabel: string;
    defaultOpen?: boolean;
}

// The table that sits under every chart, collapsed. It is not a nicety -- it
// discharges two separate obligations at once:
//
// 1. A tooltip must never be the only way to read a value. A tooltip requires a
//    pointer and a steady hand: it is unreachable by keyboard, unreadable on
//    touch, and gone the moment you look away. The numbers behind the chart
//    have to exist somewhere you can select, read, and copy.
//
// 2. It is the accessibility relief for chart fills below 3:1 against their
//    background. Several series colours are legible as large adjacent areas but
//    would fail as isolated marks; a text alternative that carries the same
//    values is the accepted remedy, and this is it.
//
// This lives in a ChartFrame's `footer`, never around the chart itself: a chart
// inside a collapsed <details> measures zero and never recovers.
export const DataTableView: React.FC<DataTableViewProps> = ({
    caption,
    columns,
    rows,
    summaryLabel,
    defaultOpen = false,
}) => (
    <details className="group" open={defaultOpen}>
        <summary
            className="flex cursor-pointer list-none items-center gap-1.5 rounded-lg text-xs font-medium text-slate-500 transition-colors hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 [&::-webkit-details-marker]:hidden"
        >
            <ChevronDown
                size={14}
                className="shrink-0 transition-transform duration-200 group-open:rotate-180"
                aria-hidden="true"
            />
            {summaryLabel}
        </summary>

        {/* The scroll lives on this wrapper, not on the page. A wide table in a
            narrow column has to be able to scroll sideways on its own without
            dragging the whole layout with it. */}
        <div className="mt-3 max-h-72 overflow-auto styled-scrollbar">
            <table className="w-full border-collapse text-sm">
                {/* Visually hidden: the <summary> above already names this block
                    on screen, and repeating it would just be noise. A screen
                    reader reaching the table out of context still gets it. */}
                <caption className="sr-only">{caption}</caption>
                <thead>
                    <tr>
                        {columns.map((col) => (
                            <th
                                key={col.key}
                                scope="col"
                                // font-bold (700) is reserved for exactly this:
                                // table headers. It is the heaviest weight
                                // Google Fonts actually serves for Inter and
                                // Noto Sans Thai, so nothing here is synthesised.
                                // No `uppercase` and no positive tracking -- both
                                // are silent one-language regressions in Thai.
                                className={
                                    // bg-canvas + line-overlay: หัวที่เลื่อนตามจอทับแถว
                                    // ข้อมูลอยู่ ถ้าพื้นเป็นขาวเท่าแถวข้างล่างจะแยกไม่ออก
                                    'sticky top-0 z-10 border-b border-line-overlay bg-canvas px-3 py-2 text-xs font-bold text-slate-600 ' +
                                    (col.numeric ? 'text-right tabular-nums' : 'text-left')
                                }
                            >
                                {col.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, i) => (
                        <tr key={i} className="even:bg-slate-50/60">
                            {columns.map((col) => (
                                <td
                                    key={col.key}
                                    // tabular-nums on numeric cells only: here
                                    // the figures ARE a column, so they have to
                                    // line up digit over digit. (Single display
                                    // numbers, like a StatTile value, want
                                    // proportional figures instead.)
                                    className={
                                        'border-b border-slate-100 px-3 py-2 text-slate-700 ' +
                                        (col.numeric ? 'text-right tabular-nums' : 'text-left')
                                    }
                                >
                                    {row[col.key]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </details>
);
