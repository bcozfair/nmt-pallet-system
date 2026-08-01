// The A4 report kit, shared by all three printable screens.
//
// It started as `components/admin/dashboard/report/`, private to one screen,
// because only the dashboard had given up on printing itself in place. When the
// inventory and transaction screens followed, the sheet, the print handler and
// the portal were the three things all three needed identically -- and the
// alternative to moving them was three copies of "how tall is an A4 page",
// which is exactly the kind of restated arithmetic PAGE_MARGIN_MM exists to
// prevent.
//
// What stayed behind in each feature folder is what is genuinely that report's
// own: which figure goes on which sheet, which columns a table has.

export { ReportPage, pageBoxMm, bodyHeightMm, PAGE_WIDTH_MM, PAGE_HEIGHT_MM, RUNNING_HEAD_MM, HEAD_GAP_MM, FOOT_MM } from './ReportPage';
export type { ReportPageProps } from './ReportPage';

export { ReportPrintHost } from './ReportPrintHost';
export { useReportPrint } from './useReportPrint';
export type { ReportPrint, ReportPrintJob } from './useReportPrint';

export { ReportTableDocument, appendixBodyMm, tableCapacity } from './ReportTableDocument';
export type { ReportColumn, ReportSummaryItem, ReportTableDocumentProps } from './ReportTableDocument';

export { ReportPill, STATUS_PILL, ACTION_PILL, NEUTRAL_PILL } from './ReportPill';

export { chunkPages } from './paginate';
