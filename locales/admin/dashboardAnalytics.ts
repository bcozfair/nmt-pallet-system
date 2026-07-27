// Strings for the analytics section of the admin dashboard.
//
// Split out of dashboard.ts rather than added to it: the analytics redesign adds
// more keys than the rest of that screen holds, and burying them there would make
// both halves harder to review. It is nested back under `analytics` in
// dashboard.ts, so components read `t.dashboard.analytics.dwell.title`.
//
// Both languages live in this one file, next to each other, so a reviewer can
// check a translation against its original without opening a second file.
//
// The English object defines the shape; the Thai one is typed against it, so a
// key translated on one side and not the other fails `npm run typecheck`.
//
// Shared wording (Save, Cancel, Search, Status, Location, ...) belongs in
// `common` in locales/en.ts -- do not restate it here. The handful of column
// headers below that do repeat a `common` word are called out where they appear,
// and their Thai is kept character-identical to `common` so the two cannot drift.
//
// --- THAI TYPOGRAPHY: constraints on anything rendering these strings ---
//
// Chart furniture is the highest-risk surface in the app for this, because it is
// where Tailwind's label defaults are most tempting. The first two rules are
// already documented at AdminSidebar.tsx:69-71 and AdminHelpers.tsx:103-105;
// they are restated here because they apply to every string in this file.
//
//  1. No `tracking-wider`, or any positive letter-spacing, on axis labels,
//     legends, table headers, tooltips or the section rail. Thai vowels and tone
//     marks are stacked above and below their base character, and letter-spacing
//     shifts them off it -- the mark ends up floating between two letters.
//  2. No `uppercase`. It is a no-op on Thai script, so a heading styled that way
//     reads as emphasised in English and as plain body text in Thai. The emphasis
//     silently exists in one language only.
//  3. Thai runs roughly 1.4-1.7x wider than the same English string and has no
//     spaces between words, so the browser cannot pick a line-break point inside
//     it -- a long label does not wrap, it overflows. Hence the short labels
//     below. Category labels belong on the y-axis of a horizontal bar chart,
//     where they get the full width of the gutter; never rotated, and never
//     squeezed under the x-axis of a vertical bar chart.
//  4. Dates stay en-GB/en-US in BOTH languages. AdminHelpers.tsx:65 gives the
//     reason: one format on screen, in the CSV and in the report filename, which
//     also sidesteps the Buddhist-era question. `th-TH` would render 2026 as
//     พ.ศ. 2569 on the chart while the CSV beside it still said 2026.
//  5. Numerals stay Arabic (0-9) in both languages, matching every existing key.
//     Thai digits (๐-๙) are not used anywhere in this app.

export const analyticsEn = {
    // --- Range selector ---
    // The four presets are the only ranges offered; there is no custom picker.
    range: {
        d7: '7 days',
        d30: '30 days',
        d90: '90 days',
        m12: '12 months',
        label: 'Range',
        // The counterpart chip, worn by every card that is NOT scoped by the
        // range: fleet counts, stock by location, days overdue, dormant pallets.
        // Those read the pallet table as of this instant, and answering "how
        // many do we own" for a window that ended 90 days ago would be actively
        // misleading -- so the two kinds of card have to be distinguishable at a
        // glance. A range card carries the picker; an as-of-now card carries
        // this. Keep it SHORT: it sits in a card header beside a title that is
        // already ~1.5x wider in Thai.
        asOfNow: 'As of now',
        // The same caveat as a sentence, for the summary CSV -- which has no
        // card headers to put chips in, so it needs it spelled out. Only
        // utils/exportHelpers.ts reads this; on screen the two chips above say
        // it structurally. "The range above" is literal there: the CSV writes
        // the selected range on the line directly before this one.
        currentStateNote:
            'Fleet size, utilisation and overdue are counted as of right now. The range above applies to the charts only.',
    },

    // --- Section rail ---
    // Five nav labels down the side of the analytics page. Short by necessity:
    // see typography note 3 -- the rail is a fixed-width gutter and Thai will
    // not wrap inside it.
    sections: {
        fleet: 'Fleet',
        lifecycle: 'Lifecycle',
        quality: 'Quality',
        staff: 'Staff',
        time: 'Timing',
    },

    // --- The detailed-analysis disclosure ---
    // Four of the five sections sit behind this. They answer questions an admin
    // asks occasionally -- how long trips take, which pallets keep breaking, who
    // is recording what, which hours are busy -- not the ones they open the page
    // for. Collapsed by default so the page opens on what needs acting on today.
    deepDive: {
        show: 'Detailed analysis',
        hide: 'Hide detailed analysis',
        note: 'Lifecycle, quality, staff and time patterns',
    },

    // --- KPI row ---
    // Each figure carries a caption saying how it is derived, because several of
    // them look like they should add up to the fleet total and do not.
    kpi: {
        totalFleet: 'Total Fleet',
        totalFleetCaption: 'Active units, scrapped excluded',
        utilisation: 'Utilisation',
        utilisationCaption: 'Checked out / total fleet',
        available: 'Available',
        availableCaption: 'Ready to check out in the warehouse',
        inUse: 'In Use',
        inUseCaption: 'Currently out with a department',
        overdue: 'Overdue',
        // Takes the threshold rather than saying "the configured threshold":
        // the number is the whole point of the tile, and an admin who has just
        // changed it in Settings needs to see that this count moved with it.
        overdueCaption: (days: number) => `Out longer than ${days} days`,
        damaged: 'Damaged',
        damagedCaption: 'Awaiting repair or a scrap decision',
        // Says the same thing as dashboard.scrappedFootnote, but for the whole
        // KPI row rather than the donut alone -- scrapped pallets are outside
        // every figure above, including the utilisation denominator.
        scrappedNote: (n: number) => `${n} scrapped — excluded from every figure above`,
    },

    // --- Movement over time ---
    movement: {
        title: 'Movement',
        subtitle: 'Check-outs and check-ins over the selected range',
        // Kept here rather than read from `action` in locales/en.ts: those are
        // the names of transaction types on a badge ("Check Out"), whereas these
        // label two series in a legend and are read as quantities.
        checkOut: 'Check Out',
        checkIn: 'Check In',
    },

    // --- Dwell time ---
    // How long a pallet is away from the warehouse between a check-out and the
    // check-in that closes it. Bucketed rather than plotted raw, because the
    // distribution has a long tail and a handful of forgotten pallets would
    // otherwise flatten the whole chart.
    dwell: {
        title: 'Dwell Time',
        subtitle: 'How long a pallet stays out before it comes back',
        b0_1: '0–1 days',
        b2_3: '2–3 days',
        b4_7: '4–7 days',
        b8_14: '8–14 days',
        b15_30: '15–30 days',
        b30plus: '30+ days',
        median: 'Median',
        p90: '90th percentile',
        // Open trips have no dwell time yet, so they are excluded from the
        // buckets and counted separately -- otherwise a pallet that never comes
        // back would silently improve the median.
        openCount: 'Still out',
        samples: (n: number) => `From ${n} completed trips`,
    },

    // --- Overdue ageing ---
    // Same six buckets as dwell, on purpose: the two charts sit near each other
    // and a reader compares them by shape, which only works if the axes match.
    agingOverdue: {
        title: 'Overdue Ageing',
        subtitle: 'How far past the threshold the overdue pallets are',
        b0_1: '0–1 days',
        b2_3: '2–3 days',
        b4_7: '4–7 days',
        b8_14: '8–14 days',
        b15_30: '15–30 days',
        b30plus: '30+ days',
        // Written as a function so the number comes from the configured overdue
        // threshold in Settings. A hard-coded 7 here would disagree with the
        // count it is captioning the moment an admin changes that setting.
        breachNote: (days: number) => `Counted from day ${days}, the configured overdue threshold`,
    },

    // --- Dormant pallets ---
    dormant: {
        title: 'Dormant Pallets',
        subtitle: 'Longest without any transaction',
        // These four repeat `common` (palletId, status, location). They are
        // restated so one table can take all of its headers from one object;
        // the Thai below is identical to `common`, so they cannot drift apart.
        palletId: 'Pallet ID',
        status: 'Status',
        location: 'Location',
        daysIdle: 'Days Idle',
    },

    // --- Damage funnel ---
    funnel: {
        title: 'Damage Funnel',
        subtitle: 'What happened to the pallets reported damaged',
        reported: 'Reported',
        repaired: 'Repaired',
        scrapped: 'Scrapped',
        stillOpen: 'Still open',
        // Takes a pre-formatted string, not a number: the percentage is rounded
        // by the caller, which is also what feeds the bar widths. Formatting it
        // twice is how the label and the chart end up disagreeing by a point.
        resolutionRate: (pct: string) => `${pct} resolved`,
        // The same word as a bare noun, for the centre of the gauge -- where the
        // percentage is already the largest thing on the card and a full
        // sentence would have to be set at 10px to fit inside the arc. Kept
        // separate from `resolutionRate` rather than derived from it: a sentence
        // is not a label with the number cut out of it, and in Thai the two sit
        // in different word orders ("จัดการแล้ว 75%" vs a stacked "75%" over
        // "จัดการแล้ว"). resolutionRate stays -- it is the accessible name the
        // gauge announces to a screen reader.
        resolved: 'Resolved',
    },

    // --- Time to resolve ---
    resolve: {
        title: 'Time to Resolve',
        subtitle: 'From the damage report to a repair or a scrap',
        b0_1: '0–1 days',
        b2_3: '2–3 days',
        b4_7: '4–7 days',
        b8_14: '8–14 days',
        b15_30: '15–30 days',
        b30plus: '30+ days',
        median: 'Median',
    },

    // --- Repeat offenders ---
    offenders: {
        title: 'Repeat Offenders',
        subtitle: 'Pallets reported damaged most often',
        palletId: 'Pallet ID',
        damageCount: 'Damage Reports',
        repairCount: 'Repairs',
        isScrapped: 'Scrapped',
        lastEvent: 'Last Event',
    },

    // --- Quality trend ---
    qualityTrend: {
        title: 'Quality Trend',
        subtitle: 'Damage, repair and scrap events over the selected range',
        damage: 'Damage',
        scrap: 'Scrapped',
        repair: 'Repaired',
    },

    // --- Staff activity ---
    staff: {
        title: 'Staff Activity',
        subtitle: 'Who is recording the transactions',
        name: 'Name',
        total: 'Transactions',
        lastActive: 'Last Active',
        // Both numbers are needed: "8 active" alone reads as good news whether
        // the team is nine people or ninety.
        activeStaff: (n: number, total: number) => `${n} of ${total} staff active in this range`,
        othersLabel: 'Others',
    },

    // --- Activity heatmap ---
    heat: {
        title: 'Activity by Day and Hour',
        subtitle: 'When transactions are recorded across the week',
        // Row headers, so they must fit a narrow fixed gutter. The Thai forms
        // are the same abbreviations settings.ts already uses for the report
        // schedule buttons -- the two screens should not name Monday differently.
        sun: 'Sun',
        mon: 'Mon',
        tue: 'Tue',
        wed: 'Wed',
        thu: 'Thu',
        fri: 'Fri',
        sat: 'Sat',
        hourAxis: 'Hour',
        // 24 columns will not fit on a phone, so cells cover several hours each.
        // The width is the caller's decision; this only reports it.
        binNote: (hours: number) => `Each cell covers ${hours} hours`,
        legendLow: 'Fewer',
        legendHigh: 'More',
        // `day` and `hour` arrive already rendered by the caller, from the seven
        // labels above and the app's own hour format -- the tooltip does not
        // format anything itself, so it cannot disagree with the axes.
        cellTooltip: (day: string, hour: string, n: number) => `${day} ${hour} — ${n} transactions`,
        weekdayTotals: 'Totals by Weekday',
    },

    // --- Shared chart furniture ---
    // Every chart gets the same table toggle. A canvas is unreadable to a screen
    // reader, and the table is also how someone copies a number out of a chart.
    chart: {
        showTable: 'Show as table',
        hideTable: 'Hide table',
        tableCaption: (title: string) => `${title} — data table`,
        othersLabel: 'Others',
        noDataInRange: 'No data in the selected range',
        widenRange: 'Try a wider range',
    },

    // --- Load state ---
    state: {
        loadFailed: 'Failed to load analytics',
        // Duplicates `common.retry` on purpose: this one sits inside the
        // analytics error panel, and keeping it local means the panel can be
        // reworded without touching a string forty other buttons share.
        retry: 'Try Again',
    },
};

export type AnalyticsDict = typeof analyticsEn;

// Wording conventions: the reader is a warehouse administrator, so the Thai
// follows the vocabulary already established elsewhere in the app rather than a
// dictionary rendering of the English -- เบิกออก / รับคืน for check out and check
// in, ชำรุด for damaged, ตัดออกจากระบบ for scrapped. Those are the words on the
// mobile screens the floor staff use, and the admin reading this dashboard is
// looking at the same events.
export const analyticsTh: AnalyticsDict = {
    // --- Range selector ---
    range: {
        d7: '7 วัน',
        d30: '30 วัน',
        d90: '90 วัน',
        m12: '12 เดือน',
        label: 'ช่วงเวลา',
        // "As of now". Four syllables, no space to break at, and it has to sit
        // beside a card title -- the shortest phrasing that is still a complete
        // statement of when the figure was counted.
        asOfNow: 'ณ ตอนนี้',
        currentStateNote:
            'จำนวนพาเลททั้งหมด อัตราการใช้งาน และรายการเกินกำหนด เป็นค่า ณ ปัจจุบัน ช่วงเวลาด้านบนมีผลกับกราฟเท่านั้น',
    },

    // --- Section rail ---
    sections: {
        fleet: 'ภาพรวมพาเลท',
        lifecycle: 'วงจรการใช้งาน',
        quality: 'คุณภาพ',
        staff: 'พนักงาน',
        time: 'เวลาทำรายการ',
    },

    deepDive: {
        show: 'ดูการวิเคราะห์เชิงลึก',
        hide: 'ซ่อนการวิเคราะห์เชิงลึก',
        note: 'วงจรการใช้งาน คุณภาพ พนักงาน และรูปแบบตามช่วงเวลา',
    },

    // --- KPI row ---
    kpi: {
        totalFleet: 'พาเลททั้งหมด',
        totalFleetCaption: 'เฉพาะที่ยังใช้งาน ไม่รวมที่ตัดออกจากระบบ',
        utilisation: 'อัตราการใช้งาน',
        utilisationCaption: 'ถูกเบิกออก / พาเลททั้งหมด',
        available: 'พร้อมใช้งาน',
        availableCaption: 'อยู่ในคลัง พร้อมให้เบิก',
        inUse: 'ถูกเบิกออก',
        inUseCaption: 'อยู่กับแผนกปลายทาง',
        overdue: 'เกินกำหนด',
        overdueCaption: (days: number) => `ถูกเบิกออกนานเกิน ${days} วัน`,
        damaged: 'ชำรุด',
        damagedCaption: 'รอซ่อม หรือรอตัดสินใจตัดออกจากระบบ',
        scrappedNote: (n: number) => `ตัดออกจากระบบ ${n} พาเลท — ไม่นับรวมในตัวเลขด้านบนทั้งหมด`,
    },

    // --- Movement over time ---
    movement: {
        title: 'ความเคลื่อนไหว',
        subtitle: 'ยอดเบิกออกและรับคืนในช่วงเวลาที่เลือก',
        checkOut: 'เบิกออก',
        checkIn: 'รับคืน',
    },

    // --- Dwell time ---
    dwell: {
        title: 'ระยะเวลาที่อยู่นอกคลัง',
        subtitle: 'พาเลทอยู่นอกคลังนานเท่าใดก่อนถูกรับคืน',
        b0_1: '0–1 วัน',
        b2_3: '2–3 วัน',
        b4_7: '4–7 วัน',
        b8_14: '8–14 วัน',
        b15_30: '15–30 วัน',
        b30plus: 'เกิน 30 วัน',
        median: 'ค่ากลาง',
        p90: 'เปอร์เซ็นไทล์ที่ 90',
        openCount: 'ยังไม่ถูกรับคืน',
        samples: (n: number) => `จากรายการที่รับคืนแล้ว ${n} ครั้ง`,
    },

    // --- Overdue ageing ---
    agingOverdue: {
        title: 'อายุรายการเกินกำหนด',
        subtitle: 'พาเลทที่เกินกำหนดเลยเกณฑ์มานานเท่าใด',
        b0_1: '0–1 วัน',
        b2_3: '2–3 วัน',
        b4_7: '4–7 วัน',
        b8_14: '8–14 วัน',
        b15_30: '15–30 วัน',
        b30plus: 'เกิน 30 วัน',
        breachNote: (days: number) => `นับจากวันที่ ${days} ซึ่งเป็นเกณฑ์เกินกำหนดที่ตั้งไว้`,
    },

    // --- Dormant pallets ---
    dormant: {
        title: 'พาเลทที่ไม่มีความเคลื่อนไหว',
        subtitle: 'ไม่มีรายการใด ๆ นานที่สุด',
        // ตรงกับ common ทุกตัวอักษร ห้ามแก้ให้ต่างกัน
        palletId: 'รหัสพาเลท',
        status: 'สถานะ',
        location: 'สถานที่',
        daysIdle: 'ไม่เคลื่อนไหว (วัน)',
    },

    // --- Damage funnel ---
    funnel: {
        title: 'เส้นทางของพาเลทที่ชำรุด',
        subtitle: 'พาเลทที่ถูกแจ้งชำรุดถูกจัดการต่ออย่างไร',
        reported: 'แจ้งชำรุด',
        repaired: 'ซ่อมแล้ว',
        scrapped: 'ตัดออกจากระบบ',
        stillOpen: 'ยังไม่ได้จัดการ',
        resolutionRate: (pct: string) => `จัดการแล้ว ${pct}`,
        resolved: 'จัดการแล้ว',
    },

    // --- Time to resolve ---
    resolve: {
        title: 'ระยะเวลาจัดการพาเลทชำรุด',
        subtitle: 'นับจากวันที่แจ้งชำรุด จนซ่อมเสร็จหรือตัดออกจากระบบ',
        b0_1: '0–1 วัน',
        b2_3: '2–3 วัน',
        b4_7: '4–7 วัน',
        b8_14: '8–14 วัน',
        b15_30: '15–30 วัน',
        b30plus: 'เกิน 30 วัน',
        median: 'ค่ากลาง',
    },

    // --- Repeat offenders ---
    offenders: {
        title: 'พาเลทที่ชำรุดซ้ำบ่อย',
        subtitle: 'พาเลทที่ถูกแจ้งชำรุดมากที่สุด',
        palletId: 'รหัสพาเลท',
        damageCount: 'ครั้งที่ชำรุด',
        repairCount: 'ครั้งที่ซ่อม',
        isScrapped: 'ตัดออกจากระบบ',
        lastEvent: 'รายการล่าสุด',
    },

    // --- Quality trend ---
    qualityTrend: {
        title: 'แนวโน้มคุณภาพพาเลท',
        subtitle: 'จำนวนครั้งที่แจ้งชำรุด ซ่อม และตัดออกจากระบบ ในช่วงเวลาที่เลือก',
        damage: 'ชำรุด',
        scrap: 'ตัดออกจากระบบ',
        repair: 'ซ่อมแล้ว',
    },

    // --- Staff activity ---
    staff: {
        title: 'การทำรายการของพนักงาน',
        subtitle: 'ใครเป็นผู้บันทึกรายการบ้าง',
        name: 'ชื่อ',
        total: 'จำนวนรายการ',
        lastActive: 'ทำรายการล่าสุด',
        activeStaff: (n: number, total: number) =>
            `มีพนักงานทำรายการในช่วงนี้ ${n} คน จากทั้งหมด ${total} คน`,
        othersLabel: 'อื่น ๆ',
    },

    // --- Activity heatmap ---
    heat: {
        title: 'ความถี่ตามวันและเวลา',
        subtitle: 'ช่วงวันและเวลาที่มีการทำรายการมากที่สุด',
        // ใช้ตัวย่อชุดเดียวกับปุ่มตารางส่งรายงานใน settings.ts
        sun: 'อา.',
        mon: 'จ.',
        tue: 'อ.',
        wed: 'พ.',
        thu: 'พฤ.',
        fri: 'ศ.',
        sat: 'ส.',
        hourAxis: 'เวลา (น.)',
        binNote: (hours: number) => `แต่ละช่องคือช่วงเวลา ${hours} ชั่วโมง`,
        legendLow: 'น้อย',
        legendHigh: 'มาก',
        cellTooltip: (day: string, hour: string, n: number) => `${day} ${hour} — ${n} รายการ`,
        weekdayTotals: 'ยอดรวมรายวัน',
    },

    // --- Shared chart furniture ---
    chart: {
        showTable: 'ดูเป็นตาราง',
        hideTable: 'ซ่อนตาราง',
        tableCaption: (title: string) => `${title} — ตารางข้อมูล`,
        othersLabel: 'อื่น ๆ',
        noDataInRange: 'ไม่มีข้อมูลในช่วงเวลาที่เลือก',
        widenRange: 'ลองขยายช่วงเวลาให้กว้างขึ้น',
    },

    // --- Load state ---
    state: {
        loadFailed: 'โหลดข้อมูลวิเคราะห์ไม่สำเร็จ',
        retry: 'ลองใหม่',
    },
};
