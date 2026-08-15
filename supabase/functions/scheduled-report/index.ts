
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Authorizes a request. This function is deployed with --no-verify-jwt (the
 * cron job cannot mint a user JWT), which previously left it completely open:
 * anyone who learned the URL could invoke a service-role context.
 *
 * Two accepted callers:
 *   1. The pg_cron job, proving itself with the REPORT_TRIGGER_SECRET header.
 *   2. A signed-in admin pressing "Test send" in Settings, proving itself with
 *      a normal user JWT that is then checked against public.is_admin().
 */
// Returns null when the caller is authorized, or a {status, message} rejection.
// (Deliberately not a discriminated union: this project compiles with `strict`
// off, and without strictNullChecks TypeScript will not narrow `ok: true |
// false` correctly at the call site.)
async function authorize(req: Request, adminClient: any): Promise<{ status: number; message: string } | null> {
    // Path 1 -- the pg_cron job. It cannot mint a user JWT, so it proves itself
    // with a shared secret instead. If REPORT_TRIGGER_SECRET is not configured
    // this path is simply unavailable: scheduled reports stop, but the manual
    // path below still works. (It is not treated as a fatal error, so a missing
    // secret cannot break the admin's "Test send" button.)
    const expectedSecret = Deno.env.get('REPORT_TRIGGER_SECRET') ?? ''
    const providedSecret = req.headers.get('x-report-secret') ?? ''

    if (expectedSecret && providedSecret && timingSafeEqual(providedSecret, expectedSecret)) {
        return null
    }

    if (!expectedSecret) {
        console.warn('[Scheduled Report] REPORT_TRIGGER_SECRET is not set -- cron-triggered reports will be rejected.')
    }

    // Manual trigger path: verify the bearer token belongs to an admin.
    const authHeader = req.headers.get('Authorization') ?? ''
    const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

    // The anon key is also sent as a bearer token by supabase-js, so an
    // unauthenticated call lands here too -- getUser() rejects it.
    if (jwt) {
        const { data, error } = await adminClient.auth.getUser(jwt)
        if (!error && data?.user) {
            const { data: profile } = await adminClient
                .from('users')
                .select('role')
                .eq('id', data.user.id)
                .maybeSingle()

            if (profile?.role === 'admin') return null
        }
    }

    return { status: 401, message: 'Unauthorized' }
}

/** Constant-time comparison so the secret cannot be recovered byte by byte. */
function timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false
    let diff = 0
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
    return diff === 0
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 1. Initialize Supabase Client
        // Auth: Use Service Key to bypass RLS/Policy checks for cron jobs
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 1b. Authorize BEFORE touching any data. Everything below runs with the
        // service role key and can read the LINE channel token.
        const authError = await authorize(req, supabaseClient)
        if (authError) {
            return new Response(JSON.stringify({ error: authError.message }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: authError.status,
            })
        }

        // Manual "Test send" from the Settings screen: run a specific report now
        // and skip the schedule/idempotency gates. Only reachable by an admin,
        // per authorize() above.
        let forceType: 'morning' | 'evening' | null = null
        if (req.method === 'POST') {
            try {
                const body = await req.json()
                if (body?.force === true && (body?.type === 'morning' || body?.type === 'evening')) {
                    forceType = body.type
                }
            } catch {
                // No body / not JSON -- normal cron invocation.
            }
        }

        // 2. Fetch System Settings
        const { data: settingsData, error: settingsError } = await supabaseClient
            .from('system_settings')
            .select('key, value')

        if (settingsError) throw settingsError

        // Map settings to object
        const settings: Record<string, any> = {}
        settingsData.forEach((row: any) => {
            settings[row.key] = row.value
        })

        const channelToken = settings.line_channel_token
        const targetId = settings.line_target_id
        const daysConfig = JSON.parse(settings.report_scheduled_days || '[]')

        // Time config "08:00" -> Extract Hour 8
        const morningHour = parseInt(settings.report_time_morning?.split(':')[0] || '8')
        const eveningHour = parseInt(settings.report_time_evening?.split(':')[0] || '16')

        // Current Time (BKK Time = UTC+7)
        // Deno Deploy is UTC usually. We need to shift to UTC+7.
        const now = new Date()
        // Shift finding: UTC hours + 7. Simple handled by getUTCHours
        const utcHour = now.getUTCHours()
        const bkkHour = (utcHour + 7) % 24

        console.log(`[Scheduled Report] Start. UTC: ${now.toISOString()}, BKK Hour: ${bkkHour}`);
        console.log(`[Scheduled Report] Config - Morning: ${morningHour}, Evening: ${eveningHour}, Days: ${JSON.stringify(daysConfig)}`);

        // Check Day of Week
        // UTC Day vs BKK Day?
        // Let's create a date object shifted to BKK
        const bkkDate = new Date(now.getTime() + (7 * 60 * 60 * 1000))
        const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        const currentDay = weekdays[bkkDate.getUTCDay()]
        console.log(`[Scheduled Report] Current Day (BKK): ${currentDay}`);

        // Admin-initiated test send: run now, ignore schedule and last-sent
        // markers, and do NOT record it as today's scheduled run -- otherwise a
        // test at 09:00 would suppress the real 16:00 report.
        if (forceType) {
            console.log(`[Scheduled Report] Manual test send: ${forceType}`);
            if (!channelToken || !targetId) {
                return new Response(
                    JSON.stringify({ error: 'LINE channel token / target ID is not configured in Settings.' }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                )
            }

            if (forceType === 'morning') {
                await sendMorningReport(supabaseClient, settings)
            } else {
                await sendEveningReport(supabaseClient, settings)
            }

            return new Response(
                JSON.stringify({ message: 'Test report sent', sent: forceType }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        if (!daysConfig.includes(currentDay)) {
            console.log(`[Scheduled Report] Skipping: ${currentDay} not in schedule.`);
            return new Response(JSON.stringify({ message: `Skipping: Today (${currentDay}) is not in schedule.` }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        let reportSent = 'None'

        // 3. Logic: Check Morning
        // Check if we already sent morning report TODAY?
        // We store "last_sent_morning" as ISO string
        // But simplistic check: if hour matches, send.
        // Issue: If function runs 3 times in 8:00-8:59, it sends 3 times.
        // Fix: Using "last_sent_morning" check.

        const todayDashDate = bkkDate.toISOString().split('T')[0] // YYYY-MM-DD

        console.log(`[Scheduled Report] Last Sent - Morning: ${settings.last_sent_morning}, Evening: ${settings.last_sent_evening}`);

        const lastMorningStr = settings.last_sent_morning || ''
        const lastEveningStr = settings.last_sent_evening || ''

        if (bkkHour === morningHour) {
            console.log(`[Scheduled Report] Checking Morning Report...`);
            if (!lastMorningStr.startsWith(todayDashDate)) {
                console.log(`[Scheduled Report] Sending Morning Report...`);
                await sendMorningReport(supabaseClient, settings)
                // Update last sent
                await supabaseClient.from('system_settings').upsert({ key: 'last_sent_morning', value: bkkDate.toISOString() })
                reportSent = 'Morning'
            } else {
                console.log(`[Scheduled Report] Morning report already sent today.`);
            }
        }

        // Deliberately a separate `if`, not `else if`. When an admin sets the
        // morning and evening times to the same hour, the chained version made
        // the evening report unreachable forever.
        if (bkkHour === eveningHour) {
            console.log(`[Scheduled Report] Checking Evening Report...`);
            if (!lastEveningStr.startsWith(todayDashDate)) {
                console.log(`[Scheduled Report] Sending Evening Report...`);
                await sendEveningReport(supabaseClient, settings)
                await supabaseClient.from('system_settings').upsert({ key: 'last_sent_evening', value: bkkDate.toISOString() })
                reportSent = reportSent === 'Morning' ? 'Morning+Evening' : 'Evening'
            } else {
                console.log(`[Scheduled Report] Evening report already sent today.`);
            }
        }

        if (bkkHour !== morningHour && bkkHour !== eveningHour) {
            console.log(`[Scheduled Report] No report scheduled for this hour (${bkkHour}).`);
        }

        return new Response(
            JSON.stringify({ message: 'Success', bkkTime: bkkDate.toISOString(), sent: reportSent }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})

// --- Card presentation ------------------------------------------------------

/**
 * Every colour both cards use.
 *
 * Nothing is left to the renderer. LINE's dark theme does not adapt a Flex
 * Message: it swaps the bubble ground and flips only the text that has no
 * explicit `color`. The old cards set some greys and left others unset, so
 * whichever way the ground went, half the card lost contrast -- the location
 * rows (#666666) vanished into a dark ground while the untouched stat numbers
 * survived. Pinning the ground AND every colour makes the card look the same
 * in both themes, which is the point.
 */
const C = {
    paper: '#FFFFFF',
    ink: '#111827',
    inkSoft: '#374151',
    muted: '#6B7280',
    faint: '#9CA3AF',
    rule: '#E5E7EB',
    red: '#DC2626',
    redDeep: '#B91C1C',
    blue: '#1D4ED8',
    blueWash: '#D7E2FF',
    // Each accent needs two tints, and they are not interchangeable. *Wash is
    // subtitle text sitting ON the coloured header, so it is a light text
    // colour. *Pill is a fill sitting BEHIND dark text, so it has to be lighter
    // still rather than the same tint.
    redWash: '#FFD9D9',
    redPill: '#FEE2E2',
    green: '#16A34A',
    greenText: '#15803D',
    greenWash: '#C6F0D5',
    greenPill: '#DCFCE7',
    amber: '#CA8A04',
    amberText: '#A16207',
    amberPill: '#FEF3C7',
}

/** Status wording is taken from locales/th.ts so the card and the app agree. */
const STATUS_TH = {
    available: 'พร้อมใช้งาน',
    in_use: 'ถูกเบิกออก',
    damaged: 'ชำรุด',
    scrapped: 'ตัดออกจากระบบ',
}

const UNIT = 'ตัว'

/**
 * Date and time in Bangkok, as Thai text.
 *
 * The cards used to build this from getUTCDate(), which is only correct
 * because the default send times (08:00 and 16:00 BKK) both land on the same
 * UTC day. An admin moving the morning report to 06:00 would have stamped
 * every card with yesterday's date.
 *
 * Forcing the gregorian calendar keeps the year as 2026 rather than the
 * Buddhist 2569 that th-TH would otherwise produce -- the rest of the app
 * shows CE years, and a report that disagrees with the app it reports on is
 * worse than one in the less familiar era.
 */
function bkkStamp(): { date: string; time: string } {
    const now = new Date()
    const time = new Intl.DateTimeFormat('th-TH-u-ca-gregory', {
        timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(now)
    return { date: bkkDayText(now), time }
}

/**
 * A stored date as Thai day text, in Bangkok.
 *
 * Split out of bkkStamp so a checkout date from the database is formatted by
 * exactly the same rules as the card's own timestamp -- a card that stamps
 * itself in one calendar and prints its rows in another is worse than one that
 * is consistently in the less familiar era.
 */
function bkkDayText(value: string | number | Date): string {
    return new Intl.DateTimeFormat('th-TH-u-ca-gregory', {
        timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short', year: 'numeric',
    }).format(new Date(value))
}

/** Deepens from amber to near-black red as a pallet runs further past the threshold. */
function severityColor(days: number, threshold: number): string {
    if (days > threshold * 3) return '#991B1B'
    if (days > threshold * 2) return '#DC2626'
    if (days > threshold * 1.5) return '#EA580C'
    return '#D97706'
}

/**
 * The mirror of severityColor for a pallet that is still inside the threshold.
 *
 * severityColor cannot answer this: every value at or below the threshold
 * falls through to its amber base case, so a pallet checked out this morning
 * would be painted the same as one a day from breaching.
 *
 * Amber in the last fifth of the allowance is the whole point of the clear-day
 * card -- it is the one state that says "green today, red this week" while the
 * card is still green.
 */
function runwayColor(days: number, threshold: number): string {
    return days >= threshold * 0.8 ? C.amber : C.green
}

/**
 * A coloured header block.
 *
 * Padding is spelled out at 20px rather than the `lg` keyword the cards used
 * before. `lg` is 12px, but a body block pads to 20px by default, so the title
 * sat 8px to the left of the text beneath it on every card ever sent.
 */
function cardHeader(background: string, title: string, subtitle: string, subtitleColor: string) {
    return {
        type: 'box',
        layout: 'vertical',
        backgroundColor: background,
        paddingTop: '16px',
        paddingBottom: '16px',
        paddingStart: '20px',
        paddingEnd: '20px',
        contents: [
            { type: 'text', text: title, weight: 'bold', color: C.paper, size: 'xl', wrap: true },
            { type: 'text', text: subtitle, color: subtitleColor, size: 'xs', margin: 'sm', wrap: true },
        ],
    }
}

function separator(margin = 'xl') {
    return { type: 'separator', margin, color: C.rule }
}

/**
 * The stacked fleet bar.
 *
 * Segments of zero are dropped rather than given `flex: 0`: in a horizontal
 * box that value means "size to your content", not "take no width", so a
 * status with nothing in it would still claim a slice of the bar.
 */
function fleetBar(segments: Array<{ value: number; color: string }>, height: string) {
    const shown = segments.filter((s) => s.value > 0)
    if (shown.length === 0) return null
    return {
        type: 'box',
        layout: 'horizontal',
        height,
        margin: 'lg',
        cornerRadius: height,
        backgroundColor: C.rule,
        contents: shown.map((s) => ({
            type: 'box',
            layout: 'vertical',
            flex: s.value,
            backgroundColor: s.color,
            contents: [{ type: 'filler' }],
        })),
    }
}

/**
 * The centred headline block every card opens with: caption, one big figure,
 * then the supporting numbers on a tinted pill.
 *
 * `headline` is the finished string rather than a number the block formats
 * itself. It used to take a number and append '%', which meant a card whose
 * headline is not a percentage -- the clear-day card leads with a count of
 * days -- could not use this block at all, and the alternative was a second
 * near-identical hero to keep in step with this one forever.
 *
 * The pill is wrapped in a horizontal box set to justifyContent: 'center'
 * because a box cannot centre itself -- with the pill as the only child and
 * flex: 0, the parent centres it. Putting the pill straight into the vertical
 * stack would stretch it edge to edge instead.
 */
function heroBlock(caption: string, headline: string, detail: string, tone: string, pillBackground: string) {
    return {
        type: 'box',
        layout: 'vertical',
        contents: [
            { type: 'text', text: caption, size: 'xs', color: C.muted, align: 'center', wrap: true },
            { type: 'text', text: headline, size: '4xl', weight: 'bold', color: tone, align: 'center', margin: 'xs' },
            {
                type: 'box',
                layout: 'horizontal',
                justifyContent: 'center',
                margin: 'md',
                contents: [
                    {
                        type: 'box',
                        layout: 'vertical',
                        flex: 0,
                        backgroundColor: pillBackground,
                        cornerRadius: 'md',
                        paddingAll: 'sm',
                        paddingStart: 'md',
                        paddingEnd: 'md',
                        contents: [
                            { type: 'text', text: detail, size: 'sm', weight: 'bold', color: tone, align: 'center' },
                        ],
                    },
                ],
            },
        ],
    }
}

/** name on the left, "N ตัว" on the right. */
function locationRow(name: string, count: number) {
    return {
        type: 'box',
        layout: 'horizontal',
        contents: [
            { type: 'text', text: name, size: 'sm', color: C.inkSoft, flex: 5, wrap: true, gravity: 'center' },
            { type: 'text', text: `${count} ${UNIT}`, size: 'sm', color: C.ink, weight: 'bold', flex: 2, align: 'end', gravity: 'center' },
        ],
    }
}

type AgedPallet = { palletId: string; location: string; checkoutDate: string; days: number }
type LocationGroup = { name: string; count: number; maxDays: number }

/**
 * Collapses aged pallets into one row per location, keeping the worst age in
 * each so a row can show both how many are there and how long the oldest has
 * been.
 *
 * Shared by both halves of the morning report. It lived inside the "something
 * is overdue" branch before, which meant the clear-day card could not show the
 * same table without a second copy of this loop to keep in step.
 *
 * Sorting is left to the caller: the two cards rank by different things.
 */
function groupByLocation(items: AgedPallet[]): LocationGroup[] {
    const byLocation = new Map<string, { count: number; maxDays: number }>()
    for (const p of items) {
        const row = byLocation.get(p.location) ?? { count: 0, maxDays: 0 }
        row.count += 1
        row.maxDays = Math.max(row.maxDays, p.days)
        byLocation.set(p.location, row)
    }
    return [...byLocation.entries()].map(([name, row]) => ({ name, ...row }))
}

/** Most pallets first, oldest breaking the tie -- the overdue card's order. */
const byCountThenAge = (a: LocationGroup, b: LocationGroup) => b.count - a.count || b.maxDays - a.maxDays

/**
 * Closest to breaching first -- the clear-day card's order.
 *
 * That card leads with the oldest pallet in the fleet, so the row that pallet
 * belongs to has to be the first row under the headline. Ranked by count, as
 * the overdue card does, it could sit anywhere in the list.
 */
const byAgeThenCount = (a: LocationGroup, b: LocationGroup) => b.maxDays - a.maxDays || b.count - a.count

/**
 * One location row of the aged table: severity stripe, name, worst age, count.
 *
 * Both morning cards render this identically -- the stripe and age colour are
 * the only things that differ, and they come in as `tone`, so the two cards
 * cannot drift apart in column widths or spelling of the unit.
 */
function agedLocationRow(group: LocationGroup, tone: string) {
    return {
        type: 'box',
        layout: 'horizontal',
        spacing: 'sm',
        contents: [
            {
                type: 'box',
                layout: 'vertical',
                flex: 0,
                width: '3px',
                cornerRadius: '2px',
                backgroundColor: tone,
                contents: [{ type: 'filler' }],
            },
            { type: 'text', text: group.name, size: 'sm', color: C.inkSoft, flex: 6, wrap: true, gravity: 'center' },
            { type: 'text', text: `${group.maxDays} วัน`, size: 'xs', color: tone, weight: 'bold', flex: 3, align: 'end', gravity: 'center' },
            { type: 'text', text: `${group.count} ${UNIT}`, size: 'sm', color: C.ink, weight: 'bold', flex: 3, align: 'end', gravity: 'center' },
        ],
    }
}

/**
 * Column labels for the aged table, so each row can print a bare "23 วัน"
 * instead of repeating "นานสุด" on every row. The 7px inset lines them up with
 * the row text, past the 3px stripe and its 4px gap.
 */
function agedTableHead() {
    return {
        type: 'box',
        layout: 'horizontal',
        spacing: 'sm',
        margin: 'lg',
        paddingStart: '7px',
        contents: [
            { type: 'text', text: 'สถานที่', size: 'xxs', color: C.faint, flex: 6 },
            { type: 'text', text: 'นานสุด', size: 'xxs', color: C.faint, flex: 3, align: 'end' },
            { type: 'text', text: 'จำนวน', size: 'xxs', color: C.faint, flex: 3, align: 'end' },
        ],
    }
}

/** LINE truncates altText past 400 characters, so cut it cleanly ourselves. */
function clampAlt(text: string): string {
    return text.length <= 400 ? text : `${text.slice(0, 397)}...`
}

// --- Helper Functions ---

async function sendMorningReport(supabase: any, settings: any) {
    const token = settings.line_channel_token
    const targetId = settings.line_target_id
    if (!token || !targetId) return

    const threshold = parseInt(settings.overdue_days || '7')
    const stamp = bkkStamp()

    const { data: pallets } = await supabase
        .from('pallets')
        .select('pallet_id, status, current_location, last_checkout_date')

    // The difference is deliberately signed, unlike the Math.abs() this
    // replaces: a checkout dated in the future is a clock or data problem, and
    // abs() turned it into a pallet that looks weeks overdue.
    const now = Date.now()

    // Every checked-out pallet with its age, kept whole rather than filtered on
    // the spot. The overdue card only ever needed the tail of this list, but
    // the clear-day card is built from all of it: it reports how close the
    // fleet is to breaching, which the filtered list no longer knows.
    const aged: AgedPallet[] = (pallets ?? [])
        .filter((p: any) => p.status === 'in_use' && p.last_checkout_date)
        .map((p: any) => ({
            palletId: p.pallet_id,
            location: p.current_location || 'ไม่ระบุสถานที่',
            checkoutDate: p.last_checkout_date,
            days: Math.ceil((now - new Date(p.last_checkout_date).getTime()) / 86400000),
        }))

    const overdue = aged.filter((p) => p.days > threshold)

    // The divisor is everything checked out, not the whole fleet: a pallet
    // sitting in the warehouse cannot be overdue, so counting it would only
    // flatter the number. Overdue pallets are a subset of in_use ones, so this
    // is never zero on the overdue path and never exceeds 100%.
    //
    // Counted from `pallets` rather than from `aged`, so a checked-out pallet
    // with no checkout date is still counted here. The clear-day card says so
    // out loud rather than quietly reporting a smaller fleet.
    const inUseTotal = (pallets ?? []).filter((p: any) => p.status === 'in_use').length

    // A silent morning is indistinguishable from a broken cron job, so the
    // clear day gets a card of its own -- the same card as the overdue day,
    // with a different verdict on it.
    if (overdue.length === 0) {
        await sendLine(
            token,
            targetId,
            allClearAlt(stamp, threshold, aged, inUseTotal),
            allClearFlex(stamp, threshold, aged, inUseTotal),
        )
        return
    }

    // Insertion order is whatever the query happened to return, which is not a
    // priority order.
    const locations = groupByLocation(overdue).sort(byCountThenAge)

    const worst = overdue.reduce((a, b) => (b.days > a.days ? b : a))

    const overduePct = Math.round((overdue.length / inUseTotal) * 100)
    const overdueBar = fleetBar([
        { value: overdue.length, color: C.red },
        { value: inUseTotal - overdue.length, color: C.amber },
    ], '14px')

    const flex = {
        type: 'bubble',
        styles: { body: { backgroundColor: C.paper } },
        header: cardHeader(
            C.red,
            '⚠️ พาเลทค้างเกินกำหนด',
            `${stamp.date} · ${stamp.time} น. · เกิน ${threshold} วัน`,
            C.redWash,
        ),
        body: {
            type: 'box',
            layout: 'vertical',
            backgroundColor: C.paper,
            contents: [
                heroBlock(
                    'ค้างเกินกำหนด',
                    `${overduePct}%`,
                    `${overdue.length} จาก ${inUseTotal} ${UNIT}`,
                    C.redDeep,
                    C.redPill,
                ),
                ...(overdueBar ? [overdueBar] : []),
                separator(),
                {
                    type: 'text',
                    text: `ค้างนานสุด ${worst.days} วัน · ${worst.palletId} ที่ ${worst.location}`,
                    size: 'xs',
                    color: severityColor(worst.days, threshold),
                    margin: 'lg',
                    wrap: true,
                },
                separator(),
                agedTableHead(),
                {
                    type: 'box',
                    layout: 'vertical',
                    margin: 'md',
                    spacing: 'md',
                    contents: locations.map((l) => agedLocationRow(l, severityColor(l.maxDays, threshold))),
                },
            ],
        },
    }

    // The notification preview is often all anyone reads, so it carries the
    // whole headline rather than just a count. clampAlt is LINE's own 400
    // character ceiling, not a limit of ours -- the card itself lists every
    // location.
    const altText = clampAlt(
        `⚠️ พาเลทค้าง ${overdue.length} ${UNIT} (เกิน ${threshold} วัน) — `
        + locations.map((l) => `${l.name} ${l.count}`).join(', '),
    )

    await sendLine(token, targetId, altText, flex)
}

/**
 * How many location rows the clear-day card prints before collapsing the rest
 * into a single "และอีก N แห่ง" line.
 *
 * The overdue card prints every row it has and needs no cap: only locations
 * with a breached pallet appear there, which is a handful even on a bad day.
 * This card lists every location holding a checked-out pallet, which on a busy
 * fleet is unbounded -- and it is the card sent on the days nothing is wrong,
 * so it is the one that must not turn into a wall of text in the group.
 */
const CLEAR_CARD_ROWS = 5

/**
 * The clear-day face of the morning report.
 *
 * Same bubble, same blocks, same order as the overdue card -- header, hero,
 * bar, watch line, aged table -- so the two read as one report with two
 * verdicts rather than two unrelated messages. It replaces a micro bubble that
 * shared nothing with its sibling but the hour it was sent at.
 *
 * The headline is the oldest pallet's age rather than a percentage. On a clear
 * day the percentage is 100 by definition, which the reader already knows
 * before opening the card; the age is the number that moves, and watching it
 * climb across a week is the only warning anyone gets before this card turns
 * red.
 */
function allClearFlex(
    stamp: { date: string; time: string },
    threshold: number,
    aged: AgedPallet[],
    inUseTotal: number,
) {
    // Nothing is checked out: there is no oldest pallet, and "100% within the
    // threshold" would be 100% of nothing. Both the hero and the table would be
    // reporting on an empty set, so the card drops to the header plus one line.
    if (aged.length === 0) {
        return {
            type: 'bubble',
            styles: { body: { backgroundColor: C.paper } },
            header: cardHeader(
                C.green,
                '✅ ไม่มีพาเลทค้างส่งคืน',
                `${stamp.date} · ${stamp.time} น. · เกณฑ์ ${threshold} วัน`,
                C.greenWash,
            ),
            body: {
                type: 'box',
                layout: 'vertical',
                backgroundColor: C.paper,
                contents: [
                    { type: 'text', text: 'ไม่มีพาเลทถูกเบิกออกอยู่', size: 'sm', color: C.faint, align: 'center', wrap: true },
                    { type: 'text', text: 'พาเลททั้งกองอยู่ในคลังครบ', size: 'xs', color: C.muted, align: 'center', margin: 'md', wrap: true },
                ],
            },
        }
    }

    const oldest = aged.reduce((a, b) => (b.days > a.days ? b : a))
    const tone = runwayColor(oldest.days, threshold)
    const pill = tone === C.amber ? C.amberPill : C.greenPill
    const headlineTone = tone === C.amber ? C.amberText : C.greenText

    // The bar reads as a runway rather than a proportion of the fleet: how much
    // of the allowance the oldest pallet has spent, against what is left. The
    // remainder is painted in the rule colour, which is also fleetBar's own
    // ground -- a single segment would stretch to fill the whole bar, since a
    // lone child in a horizontal box has nothing to share the width with.
    const runwayBar = fleetBar([
        { value: oldest.days, color: tone },
        { value: Math.max(threshold - oldest.days, 0), color: C.rule },
    ], '14px')

    const locations = groupByLocation(aged).sort(byAgeThenCount)
    const shown = locations.slice(0, CLEAR_CARD_ROWS)
    const hidden = locations.length - shown.length

    // A checked-out pallet with no checkout date cannot be aged, so it is
    // missing from every row above. Saying so is the difference between a card
    // that is quietly wrong and one that reports a data problem: without this
    // line the rows would simply fail to add up to the count in the header.
    const undated = inUseTotal - aged.length

    return {
        type: 'bubble',
        styles: { body: { backgroundColor: C.paper } },
        header: cardHeader(
            C.green,
            '✅ ไม่มีพาเลทค้างส่งคืน',
            `${stamp.date} · ${stamp.time} น. · ${STATUS_TH.in_use} ${inUseTotal} ${UNIT}`,
            C.greenWash,
        ),
        body: {
            type: 'box',
            layout: 'vertical',
            backgroundColor: C.paper,
            contents: [
                heroBlock(
                    'ค้างนานสุดตอนนี้',
                    `${oldest.days} วัน`,
                    `เกณฑ์ ${threshold} วัน · เหลืออีก ${Math.max(threshold - oldest.days, 0)} วัน`,
                    headlineTone,
                    pill,
                ),
                ...(runwayBar ? [runwayBar] : []),
                separator(),
                // Names the pallet behind the headline. The overdue card spends
                // this line on its worst pallet; this one spends it on the
                // pallet that will become that one first.
                {
                    type: 'text',
                    text: `${oldest.palletId} ที่ ${oldest.location} · เบิกออก ${bkkDayText(oldest.checkoutDate)}`,
                    size: 'xs',
                    color: headlineTone,
                    margin: 'lg',
                    wrap: true,
                },
                separator(),
                agedTableHead(),
                {
                    type: 'box',
                    layout: 'vertical',
                    margin: 'md',
                    spacing: 'md',
                    contents: shown.map((l) => agedLocationRow(l, runwayColor(l.maxDays, threshold))),
                },
                ...(hidden > 0
                    ? [{ type: 'text', text: `และอีก ${hidden} แห่ง`, size: 'xxs', color: C.faint, margin: 'md', paddingStart: '7px', wrap: true }]
                    : []),
                ...(undated > 0
                    ? [{ type: 'text', text: `⚠️ อีก ${undated} ${UNIT} ไม่มีวันที่เบิกออก จึงนับอายุไม่ได้`, size: 'xxs', color: C.faint, margin: 'lg', wrap: true }]
                    : []),
            ],
        },
    }
}

/**
 * The clear-day notification preview.
 *
 * Carries the oldest pallet's age rather than only the all-clear, because the
 * preview line is often the whole message as far as the group is concerned --
 * and on this card that number is the only part worth reading.
 */
function allClearAlt(
    stamp: { date: string; time: string },
    threshold: number,
    aged: AgedPallet[],
    inUseTotal: number,
): string {
    if (aged.length === 0) {
        return clampAlt(`✅ ไม่มีพาเลทค้างส่งคืน · ไม่มีพาเลทถูกเบิกออกอยู่ (ตรวจ ${stamp.date} ${stamp.time} น.)`)
    }

    const oldest = aged.reduce((a, b) => (b.days > a.days ? b : a))
    return clampAlt(
        `✅ ไม่มีพาเลทค้างส่งคืน · ค้างนานสุด ${oldest.days} วัน จากเกณฑ์ ${threshold} วัน`
        + ` (เหลืออีก ${Math.max(threshold - oldest.days, 0)} วัน) · ${oldest.palletId} ที่ ${oldest.location}`
        + ` · ${STATUS_TH.in_use} ${inUseTotal} ${UNIT}`,
    )
}

async function sendEveningReport(supabase: any, settings: any) {
    const token = settings.line_channel_token
    const targetId = settings.line_target_id
    if (!token || !targetId) return

    // Logic: Summary
    const { data: pallets } = await supabase.from('pallets').select('status, current_location')
    // TOTAL PALLETS is the working fleet, so the three cells below still add up
    // to it. Scrapped pallets have been written off and are excluded from every
    // fleet total in the app; the report has to agree or the two disagree.
    const scrapped = pallets.filter((p: any) => p.status === 'scrapped').length
    const total = pallets.length - scrapped
    const available = pallets.filter((p: any) => p.status === 'available').length
    const damaged = pallets.filter((p: any) => p.status === 'damaged').length
    const inUseItems = pallets.filter((p: any) => p.status === 'in_use')
    const inUse = inUseItems.length

    // Group In Use by Location, busiest first.
    const locationCounts: Record<string, number> = {};
    inUseItems.forEach((p: any) => {
        const loc = p.current_location || 'ไม่ระบุสถานที่';
        locationCounts[loc] = (locationCounts[loc] || 0) + 1;
    });
    const locations = Object.entries(locationCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'th'))

    const stamp = bkkStamp()
    const readyPct = total > 0 ? Math.round((available / total) * 100) : 0
    const bar = fleetBar([
        { value: available, color: C.green },
        { value: inUse, color: C.amber },
        { value: damaged, color: C.red },
    ], '14px')

    // One cell of the three-across status strip: caption over number, both
    // centred, the number in the same colour as its slice of the bar above.
    // The unit is a second span so it can stay small without knocking the
    // number off its baseline.
    //
    // wrap is on because the cells are only about 86px wide and the longest
    // caption, 'พร้อมใช้งาน', already runs to roughly 78px of that. Any future
    // wording change would otherwise be truncated rather than wrapped.
    const statusCell = (label: string, count: number, color: string) => ({
        type: 'box',
        layout: 'vertical',
        flex: 1,
        contents: [
            { type: 'text', text: label, size: 'xs', color: C.muted, align: 'center', wrap: true },
            {
                type: 'text',
                align: 'center',
                margin: 'xs',
                contents: [
                    { type: 'span', text: `${count}`, size: 'xl', weight: 'bold', color },
                    { type: 'span', text: ` ${UNIT}`, size: 'xs', color: C.muted },
                ],
            },
        ],
    })

    const flex = {
        type: 'bubble',
        styles: { body: { backgroundColor: C.paper } },
        header: cardHeader(
            C.blue,
            '📊 สรุปประจำวัน',
            `${stamp.date} · ${stamp.time} น.`,
            C.blueWash,
        ),
        body: {
            type: 'box',
            layout: 'vertical',
            backgroundColor: C.paper,
            contents: [
                // The headline is the share of the fleet that can actually be
                // handed out, not the size of the fleet -- that is the question
                // someone opens this card at the end of a shift to answer.
                heroBlock(
                    STATUS_TH.available,
                    `${readyPct}%`,
                    `${available} จาก ${total} ${UNIT}`,
                    C.greenText,
                    C.greenPill,
                ),
                ...(bar ? [bar] : []),
                separator(),
                {
                    type: 'box',
                    layout: 'horizontal',
                    margin: 'lg',
                    spacing: 'sm',
                    contents: [
                        statusCell(STATUS_TH.available, available, C.green),
                        statusCell(STATUS_TH.in_use, inUse, C.amber),
                        statusCell(STATUS_TH.damaged, damaged, C.red),
                    ],
                },
                separator(),
                // Always rendered, including at zero. Hiding the row made a
                // clean day look identical to a report that never counted, and
                // it is the one number on the card that sits outside the total
                // above -- so it says so, below the rule rather than among the
                // three statuses that add up.
                {
                    type: 'box',
                    layout: 'horizontal',
                    margin: 'lg',
                    contents: [
                        { type: 'text', text: `${STATUS_TH.scrapped} (ไม่นับในยอดรวม)`, size: 'xs', color: C.faint, flex: 1, wrap: true },
                        { type: 'text', text: `${scrapped} ${UNIT}`, size: 'xs', color: C.faint, flex: 0, align: 'end' },
                    ],
                },
                separator(),
                { type: 'text', text: 'จุดที่มีพาเลทถูกเบิกใช้งานอยู่', weight: 'bold', size: 'sm', margin: 'lg', color: C.inkSoft },
                {
                    type: 'box',
                    layout: 'vertical',
                    margin: 'lg',
                    spacing: 'md',
                    contents: locations.length > 0
                        ? locations.map((l) => locationRow(l.name, l.count))
                        : [{ type: 'text', text: 'ไม่มีพาเลทถูกเบิกออกอยู่', size: 'sm', color: C.faint, align: 'center' }],
                },
            ],
        },
    }

    const altText = clampAlt(
        `📊 สรุปประจำวัน ${stamp.date} · ${STATUS_TH.available} ${available} จาก ${total} ${UNIT} (${readyPct}%)`
        + ` · ${STATUS_TH.in_use} ${inUse} · ${STATUS_TH.damaged} ${damaged} · ${STATUS_TH.scrapped} ${scrapped}`,
    )

    await sendLine(token, targetId, altText, flex)
}

async function sendLine(token: string, targetId: string, altText: string, flexContents: any) {
    console.log(`Sending LINE message to ${targetId}...`);
    try {
        const response = await fetch('https://api.line.me/v2/bot/message/push', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                to: targetId,
                messages: [{ type: 'flex', altText, contents: flexContents }]
            })
        })

        if (!response.ok) {
            const errorText = await response.text();
            console.error('LINE API Error:', response.status, errorText);
            throw new Error(`LINE API failed: ${response.status} ${errorText}`);
        } else {
            console.log('LINE message sent successfully.');
        }
    } catch (error) {
        console.error('Error in sendLine:', error);
        throw error;
    }
}
