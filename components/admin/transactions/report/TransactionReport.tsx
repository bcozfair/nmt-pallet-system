import React from 'react';

import { ACTION_PILL, NEUTRAL_PILL, ReportPill, ReportTableDocument } from '../../../report';
import type { ReportColumn, ReportSummaryItem } from '../../../report';
import { formatDateTime } from '../../common/AdminHelpers';
import { useT } from '../../../../hooks/useT';
import type { ActionType, Transaction } from '../../../../types';

// THE HISTORY REPORT: which columns, and the one thing paper cannot carry.
//
// Everything about HOW a sheet is built is in components/report/. What is this
// screen's own is the seven columns below.
//
// THE EVIDENCE COLUMN IS A TICK, NOT A PICTURE, AND THAT IS A DELIBERATE LOSS.
// On screen it is a red chip that opens a viewer, and the chip's fill is what
// lets somebody scan the column and see which rows have a photo. A printed row
// is five millimetres tall; a photograph in it would be about two, which is not
// a photograph of anything. The inventory report solves the same problem by
// giving photos their own sheets, and it can, because there is one photo per
// pallet -- a history of two thousand movements has no such bound, and an
// appendix of two thousand pictures is not a report.
//
// So the column keeps the ONE thing it can carry honestly: whether a picture
// exists. Anybody who needs to see it has the pallet id and the timestamp in the
// same row, which is enough to find it on screen.

const ACTIONS: ActionType[] = ['check_out', 'check_in', 'report_damage', 'repair', 'scrap'];

export interface TransactionReportProps {
    /** Every row that passed the filters, in the order the screen sorted them. */
    transactions: Transaction[];
    /** id -> full name, for the "performed by" column. */
    userMap: Record<string, string>;
    /**
     * The filters the rows were produced under, already assembled into one line,
     * or undefined when nothing is filtered.
     */
    filterLine?: string;
    /**
     * Set when the screen's fetch came back at its cap.
     *
     * A printed sheet is the one place that cap is invisible: a reader holding
     * forty pages has no filter bar in front of them saying they are looking at a
     * window onto the history rather than the history.
     */
    windowLimit?: number;
    generatedAt: Date;
}

export const TransactionReport: React.FC<TransactionReportProps> = ({
    transactions,
    userMap,
    filterLine,
    windowLimit,
    generatedAt,
}) => {
    const t = useT();
    const r = t.transactions.report;

    const columns: ReportColumn<Transaction>[] = [
        {
            key: 'timestamp',
            header: t.transactions.colDateTime,
            width: 13,
            render: (tx) => formatDateTime(tx.timestamp),
        },
        {
            key: 'pallet',
            header: t.common.palletId,
            width: 10,
            render: (tx) => <span className="font-mono font-semibold text-slate-800">{tx.pallet_id}</span>,
        },
        {
            key: 'action',
            header: t.transactions.colAction,
            width: 12,
            render: (tx) => (
                <ReportPill
                    label={t.action[tx.action_type as ActionType] ?? tx.action_type}
                    tone={ACTION_PILL[tx.action_type] ?? NEUTRAL_PILL}
                />
            ),
        },
        {
            key: 'user',
            header: t.transactions.colPerformedBy,
            width: 14,
            // A person's name prints verbatim. The id fallback is truncated the
            // same way the screen truncates it, so a row whose user has been
            // deleted reads the same in both places rather than turning into a
            // full uuid only on paper.
            render: (tx) =>
                userMap[tx.user_id] ?? (
                    <span className="font-mono text-slate-400">{tx.user_id.substring(0, 8)}…</span>
                ),
        },
        // สองคอลัมน์ ไม่ใช่คอลัมน์ 'location' เดี่ยวแบบเดิม ด้วยเหตุผลเดียวกับบนหน้าจอ
        // (ดู TransactionTable.tsx) -- และเพราะกระดาษไม่มีตัวกรองให้กดดูต่อ แถวที่พิมพ์
        // ออกมาจึงต้องตอบให้ครบในตัวมันเองว่าของย้ายจากไหนไปไหน
        {
            key: 'origin',
            header: t.transactions.colOrigin,
            width: 13,
            render: (tx) => tx.department_origin || <span className="text-slate-300">—</span>,
        },
        {
            key: 'location',
            header: t.transactions.colDest,
            width: 13,
            render: (tx) => tx.department_dest || <span className="text-slate-300">—</span>,
        },
        {
            key: 'evidence',
            header: t.transactions.colEvidence,
            width: 8,
            align: 'center',
            render: (tx) =>
                tx.evidence_image_url && tx.evidence_image_url !== 'image_deleted' ? (
                    <span className="font-semibold text-red-600">{r.hasEvidence}</span>
                ) : (
                    <span className="text-slate-300">—</span>
                ),
        },
        {
            key: 'remark',
            header: t.common.remark,
            width: 18,
            render: (tx) => tx.transaction_remark || <span className="text-slate-300">—</span>,
        },
    ];

    // Counted from the ROWS ON THE SHEET, not from everything fetched. This
    // document may be a filtered view, and a summary band that disagreed with
    // the rows underneath it would be the exact defect the filter line exists to
    // prevent.
    const summary: ReportSummaryItem[] = ACTIONS.map((action) => ({
        label: t.action[action],
        value: String(transactions.filter((tx) => tx.action_type === action).length),
    }));

    const scopeLine = windowLimit
        ? `${r.scope(transactions.length)} · ${r.windowNote(windowLimit)}`
        : r.scope(transactions.length);

    return (
        <ReportTableDocument<Transaction>
            documentTitle={t.transactions.reportTitle}
            subtitle={r.subtitle}
            generatedOn={t.common.generatedOn(formatDateTime(generatedAt))}
            filterLine={filterLine}
            scopeLine={scopeLine}
            summary={summary}
            section={r.section}
            columns={columns}
            rows={transactions}
            rowKey={(tx) => tx.id}
            emptyLabel={r.empty}
            pageLabel={t.common.pageOf}
        />
    );
};
