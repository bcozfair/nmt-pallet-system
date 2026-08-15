// Strings for the dashboard area of the admin dashboard.
//
// Both languages live in this one file, next to each other, so a reviewer can
// check a translation against its original without opening a second file.
//
// The English object defines the shape; the Thai one is typed against it, so a
// key translated on one side and not the other fails `npm run typecheck`.
//
// Shared wording (Save, Cancel, Search, Status, Location, ...) belongs in
// `common` in locales/en.ts -- do not restate it here.

import { analyticsEn, analyticsTh } from './dashboardAnalytics';

export const dashboardEn = {
    // --- Header ---
    title: 'Dashboard Overview',
    subtitle: 'Operational Analytics & Risk Monitoring',
    // `printReport` and `exportData` used to sit here. Both moved to `common` in
    // locales/en.ts once the inventory and transaction screens grew the same two
    // controls: three screens naming one action, and a per-screen key is three
    // chances for one of them to word it differently -- which is exactly what
    // happened. This one said "Export Data", inventory said "Export List",
    // transactions said "Export CSV".
    //
    // The three `export*Csv` keys below stay: they are the ITEMS in this
    // screen's dropdown, and no other screen has them.
    //
    // All three end in `(.csv)` -- the file extension, not the format's name.
    // The summary item used to read "(Stats)" and the other two ended in a bare
    // "CSV", which made the dropdown look like one item that writes a summary
    // and two that write files. All three write a .csv; the parenthetical is
    // the same slot in all three so the only thing a reader compares is WHAT
    // each one exports.
    exportSummary: 'Export Summary (.csv)',
    exportInventoryCsv: 'Export Inventory (.csv)',
    exportHistoryCsv: 'Export History (.csv)',

    // Heads the printed sheet. Its own key rather than reusing `title` above:
    // that one names a screen you analyse things on, this one names a document
    // somebody is holding.
    //
    // `reportWindowTitle` and `printedFooter` used to sit here, for a report that
    // opened in a popup window of its own. That window is long gone and both keys
    // were translated, maintained and reachable from the dictionary for months
    // without a single reader ever seeing them. `reportGeneratedOn` went to
    // `common.generatedOn` -- three reports print a timestamp, and two of them
    // were reaching into this block to do it.
    reportTitle: 'Dashboard Report',

    // --- The paginated A4 report (components/admin/dashboard/report/) ---
    //
    // Its own group because these strings describe the DOCUMENT rather than the
    // screen: a page number, a running head, the sentence that admits a table
    // was capped. None of them has a counterpart anywhere in the app, which is
    // exactly why they are not reachable from `common`.
    report: {
        // `open` used to sit here, reading "Report" rather than "Print Report",
        // because there was a preview between the button and the printer. The
        // preview is gone and the button reads `common.printReport` like the
        // other two screens'.
        subtitle: 'Pallet fleet, movement, quality and workload',
        // Says which window every range-scoped figure covers. The report has no
        // range picker on it, so the sheet has to state the scope itself.
        rangeLine: (range: string) => `Range: ${range}`,
        asOfLine: (when: string) => `Fleet figures as of ${when}`,
        // Printed under any table the report caps. A silently truncated list on
        // paper is indistinguishable from a complete one.
        showingTopOf: (shown: number, total: number) =>
            `Showing the top ${shown} of ${total}`,
        // The running head, page by page.
        pages: {
            summary: 'Fleet summary',
            movement: 'Movement & dwell time',
            quality: 'Damage & ageing',
            workload: 'Workload & timing',
        },
        // Under the five movement strips. They share one date axis and NOT one
        // value axis, and five strips of equal height read as one shared scale
        // unless the sheet says otherwise.
        stripScaleNote: 'Each series is scaled to its own maximum; the dates are shared',
    },

    // --- Summary CSV ---
    // Row labels for the stats-only export in the header's dropdown. The three
    // status rows reuse `status` from locales/en.ts and are not repeated here.
    summaryCsv: {
        category: 'Category',
        value: 'Value',
        totalActive: 'Total Pallets (Active)',
        scrappedExcluded: 'Scrapped (excluded from total)',
        overdueItems: 'Overdue Items',
        utilizationRate: 'Utilization Rate',
        velocity7Days: '7-Day Velocity',
    },

    // --- Stat cards ---
    totalFleetSize: 'Total Fleet Size',
    totalAssetUnits: 'Total Asset Units',
    utilizationRate: 'Utilization Rate',
    utilizationSub: 'Active / Total',
    utilizationTrend: 'Efficiency',
    velocity: '7-Day Velocity',
    velocitySub: 'Checkouts / Week',
    velocityTrend: 'Throughput',
    criticalOverdue: 'Critical Overdue',
    // The "7" is hard-coded on both sides on purpose: the card is not given the
    // configured overdue threshold, so writing it as a function taking the real
    // number would promise an accuracy this component cannot deliver.
    // Takes the configured threshold: the caption used to say "7" unconditionally
    // while the count beside it honoured whatever Settings had been set to.
    criticalOverdueSub: (days: number) => `> ${days} Days Inactive`,
    criticalOverdueTrend: 'Action Needed',

    // --- Fleet health (donut) ---
    fleetHealth: 'Fleet Health',
    fleetHealthSub: 'Current Status Breakdown',
    scrappedFootnote: (count: number) => `${count} scrapped — excluded from fleet totals`,
    totalFleet: 'Total Fleet',
    assets: 'Assets',
    unitsCount: (count: number) => `${count} Units`,

    // --- Activity trend ---
    activityTitle: 'Activity & Acquisition',
    activitySub: 'Transactions & New Inventory Added',
    period: {
        day: 'Day',
        week: 'Week',
        month: 'Month',
    },
    // Check Out / Check In come from `action` in locales/en.ts. Only the two
    // series without an ActionType counterpart are named here.
    legendDamage: 'Reported Damage',
    legendAcquisition: 'New Acquisition',
    // Shorter forms for the hover tooltip, which is a fixed 120px wide.
    tooltipDamage: 'Damage',
    tooltipAcquisition: 'New',

    // --- High risk zones ---
    highRiskZones: 'High Risk Zones',
    highRiskZonesSub: 'Top Locations by Issue Ratio',
    viewAllOverdue: 'View All Overdue Items',
    allSystemsNormal: 'All systems normal.',
    overdue: 'Overdue',
    issues: 'Issues',

    // --- Location usage ---
    locationUsage: 'Location Usage',
    locationUsageSub: 'Current Stock per Location',
    noLocationData: 'No active location data available (outside Warehouse)',

    // --- Analytics section (locales/admin/dashboardAnalytics.ts) ---
    // Nested under its own key rather than spread in. A spread would silently
    // resolve a collision -- `overdue` and `totalFleet` already exist above and
    // also exist inside the analytics dictionary, meaning whichever came last
    // would win and one of the two screens would quietly show the other's
    // wording. Nesting makes such a clash impossible, and it keeps this file's
    // one flat namespace readable. Read as `t.dashboard.analytics.dwell.title`.
    analytics: analyticsEn,
};

export type DashboardDict = typeof dashboardEn;

export const dashboardTh: DashboardDict = {
    // --- Header ---
    title: 'ภาพรวมระบบ',
    subtitle: 'วิเคราะห์การใช้งานและเฝ้าระวังความเสี่ยง',
    exportSummary: 'ส่งออกสรุปภาพรวม (.csv)',
    exportInventoryCsv: 'ส่งออกคลังพาเลท (.csv)',
    exportHistoryCsv: 'ส่งออกประวัติรายการ (.csv)',

    reportTitle: 'รายงานภาพรวม',

    // --- รายงาน A4 ที่จัดหน้าเอง (components/admin/dashboard/report/) ---
    report: {
        subtitle: 'ภาพรวมพาเลท ความเคลื่อนไหว คุณภาพ และภาระงาน',
        rangeLine: (range: string) => `ช่วงเวลา: ${range}`,
        asOfLine: (when: string) => `ตัวเลขสถานะพาเลท ณ ${when}`,
        showingTopOf: (shown: number, total: number) =>
            `แสดง ${shown} อันดับแรกจากทั้งหมด ${total} รายการ`,
        pages: {
            summary: 'สรุปภาพรวมพาเลท',
            movement: 'ความเคลื่อนไหวและระยะเวลาใช้งาน',
            quality: 'ความชำรุดและอายุค้าง',
            workload: 'ภาระงานและรูปแบบตามเวลา',
        },
        stripScaleNote: 'แต่ละชุดใช้สเกลของตัวเอง ส่วนแกนวันที่ใช้ร่วมกัน',
    },

    // --- Summary CSV ---
    summaryCsv: {
        category: 'หมวด',
        value: 'จำนวน',
        totalActive: 'พาเลททั้งหมด (ใช้งานอยู่)',
        scrappedExcluded: 'ตัดออกจากระบบ (ไม่นับรวมในยอดรวม)',
        overdueItems: 'รายการเกินกำหนด',
        utilizationRate: 'อัตราการใช้งาน',
        velocity7Days: 'ยอดเบิกออก 7 วัน',
    },

    // --- Stat cards ---
    totalFleetSize: 'จำนวนพาเลททั้งหมด',
    totalAssetUnits: 'รวมทุกหน่วยในระบบ',
    utilizationRate: 'อัตราการใช้งาน',
    utilizationSub: 'ถูกเบิกออก / ทั้งหมด',
    utilizationTrend: 'ประสิทธิภาพ',
    velocity: 'ยอดเบิกออก 7 วัน',
    velocitySub: 'ครั้งที่เบิกออก / สัปดาห์',
    velocityTrend: 'ปริมาณงาน',
    criticalOverdue: 'เกินกำหนดขั้นวิกฤต',
    criticalOverdueSub: (days: number) => `ไม่มีความเคลื่อนไหวเกิน ${days} วัน`,
    criticalOverdueTrend: 'ต้องรีบจัดการ',

    // --- Fleet health (donut) ---
    fleetHealth: 'สถานะพาเลทโดยรวม',
    fleetHealthSub: 'สัดส่วนตามสถานะปัจจุบัน',
    scrappedFootnote: (count: number) => `ตัดออกจากระบบ ${count} พาเลท — ไม่นับรวมในยอดรวม`,
    totalFleet: 'พาเลททั้งหมด',
    assets: 'สินทรัพย์',
    unitsCount: (count: number) => `${count} หน่วย`,

    // --- Activity trend ---
    activityTitle: 'ความเคลื่อนไหวและการรับเข้า',
    activitySub: 'รายการทำงานและพาเลทที่เพิ่มเข้าใหม่',
    period: {
        day: 'วัน',
        week: 'สัปดาห์',
        month: 'เดือน',
    },
    legendDamage: 'แจ้งชำรุด',
    legendAcquisition: 'รับพาเลทเข้าใหม่',
    tooltipDamage: 'ชำรุด',
    tooltipAcquisition: 'เข้าใหม่',

    // --- High risk zones ---
    highRiskZones: 'จุดเสี่ยงสูง',
    highRiskZonesSub: 'สถานที่ที่มีสัดส่วนปัญหาสูงสุด',
    viewAllOverdue: 'ดูรายการเกินกำหนดทั้งหมด',
    allSystemsNormal: 'ทุกอย่างปกติ',
    overdue: 'เกินกำหนด',
    issues: 'ปัญหา',

    // --- Location usage ---
    locationUsage: 'การใช้งานตามสถานที่',
    locationUsageSub: 'จำนวนพาเลทคงเหลือแต่ละสถานที่',
    noLocationData: 'ยังไม่มีข้อมูลพาเลทที่อยู่นอกคลังสินค้า',

    // --- Analytics section ---
    analytics: analyticsTh,
};
