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

export const dashboardEn = {
    // --- Header ---
    title: 'Dashboard Overview',
    subtitle: 'Operational Analytics & Risk Monitoring',
    printReport: 'Print Report',
    exportData: 'Export Data',
    exportSummary: 'Export Summary (Stats)',
    exportInventoryCsv: 'Export Inventory CSV',
    exportHistoryCsv: 'Export History CSV',

    // --- Printable report ---
    // This one opens in a window of its own, which inherits none of the app's
    // CSS, so its wording is assembled from these keys rather than read off the
    // screen. The window's font stack is declared inline there for the same
    // reason -- Inter alone has no Thai glyphs.
    reportWindowTitle: 'NMT Dashboard Report',
    reportTitle: 'Dashboard Report',
    reportGeneratedOn: (when: string) => `Generated on ${when}`,
    printedFooter: (when: string) => `Printed from NMT Pallet Management System on ${when}`,

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
};

export type DashboardDict = typeof dashboardEn;

export const dashboardTh: DashboardDict = {
    // --- Header ---
    title: 'ภาพรวมระบบ',
    subtitle: 'วิเคราะห์การใช้งานและเฝ้าระวังความเสี่ยง',
    printReport: 'พิมพ์รายงาน',
    exportData: 'ส่งออกข้อมูล',
    exportSummary: 'ส่งออกสรุปภาพรวม',
    exportInventoryCsv: 'ส่งออกคลังพาเลท (CSV)',
    exportHistoryCsv: 'ส่งออกประวัติรายการ (CSV)',

    // --- Printable report ---
    reportWindowTitle: 'รายงานภาพรวม NMT',
    reportTitle: 'รายงานภาพรวม',
    reportGeneratedOn: (when: string) => `สร้างรายงานเมื่อ ${when}`,
    printedFooter: (when: string) => `พิมพ์จากระบบจัดการพาเลท NMT เมื่อ ${when}`,

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
};
