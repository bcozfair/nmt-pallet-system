
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

// --- Helper Functions ---

async function sendMorningReport(supabase: any, settings: any) {
    const token = settings.line_channel_token
    const targetId = settings.line_target_id
    if (!token || !targetId) return

    const threshold = parseInt(settings.overdue_days || '7')

    // Logic: Overdue Items
    const { data: pallets } = await supabase.from('pallets').select('*')
    const overdue: any[] = []
    const now = new Date()
    const dateStr = `${String(now.getUTCDate()).padStart(2, '0')}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${now.getUTCFullYear()}`;

    pallets.forEach((p: any) => {
        if (p.status === 'in_use' && p.last_checkout_date) {
            const d = new Date(p.last_checkout_date)
            const diffTime = Math.abs(now.getTime() - d.getTime())
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
            if (diffDays > threshold) overdue.push(p)
        }
    })

    if (overdue.length === 0) return

    // Group by Location
    const locationCounts: Record<string, number> = {};
    overdue.forEach((p: any) => {
        const loc = p.current_location || 'Unknown';
        locationCounts[loc] = (locationCounts[loc] || 0) + 1;
    });

    // Rich Flex Message Construction
    const flex = {
        type: "bubble",
        header: {
            type: "box",
            layout: "vertical",
            backgroundColor: "#DC2626", // Red
            paddingAll: "lg",
            contents: [
                { type: "text", text: "⚠️ OVERDUE ALERT", weight: "bold", color: "#FFFFFF", size: "xl" },
                { type: "text", text: `Daily Report: ${dateStr} (Overdue > ${threshold} Days)`, color: "#FFDDDD", size: "xs", margin: "sm" }
            ]
        },
        body: {
            type: "box",
            layout: "vertical",
            contents: [
                {
                    type: "text",
                    text: `Found ${overdue.length} overdue pallets.`,
                    weight: "bold",
                    size: "md",
                    margin: "md"
                },
                { type: "separator", margin: "lg" },
                // List of Locations
                {
                    type: "box",
                    layout: "vertical",
                    margin: "lg",
                    spacing: "sm",
                    contents: Object.entries(locationCounts).map(([loc, count]) => ({
                        type: "box",
                        layout: "horizontal",
                        contents: [
                            { type: "text", text: loc, size: "sm", color: "#555555", flex: 4, wrap: true },
                            { type: "text", text: `${count} pcs`, size: "sm", weight: "bold", align: "end", flex: 2 }
                        ]
                    }))
                },
                { type: "separator", margin: "lg" },
                {
                    type: "text",
                    text: "Please follow up immediately.",
                    size: "xs",
                    color: "#aaaaaa",
                    margin: "lg",
                    align: "center"
                }
            ]
        }
    }

    await sendLine(token, targetId, `Morning Report: ${overdue.length} Overdue`, flex)
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

    // Group In Use by Location
    const locationCounts: Record<string, number> = {};
    inUseItems.forEach((p: any) => {
        const loc = p.current_location || 'Unknown';
        locationCounts[loc] = (locationCounts[loc] || 0) + 1;
    });

    // Date for header
    // Use BKK time if possible, or just UTC date string
    const d = new Date();
    // Shift to BKK roughly for display if needed, or just use UTC date
    // d.setHours(d.getHours() + 7); 
    const dateStr = `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;


    const flex = {
        type: "bubble",
        header: {
            type: "box",
            layout: "vertical",
            backgroundColor: "#2563EB", // Blue
            paddingAll: "lg",
            contents: [
                { type: "text", text: "📊 DAILY SUMMARY", weight: "bold", color: "#FFFFFF", size: "xl" },
                { type: "text", text: `Daily Report: ${dateStr}`, color: "#DDDDFF", size: "xs", margin: "sm" }
            ]
        },
        hero: {
            type: "box",
            layout: "vertical",
            paddingAll: "xl",
            backgroundColor: "#F3F4F6",
            contents: [
                { type: "text", text: "TOTAL PALLETS", color: "#888888", size: "xs", align: "center" },
                { type: "text", text: `${total}`, color: "#1F2937", size: "4xl", weight: "bold", align: "center", margin: "sm" }
            ]
        },
        body: {
            type: "box",
            layout: "vertical",
            contents: [
                // Stats Grid
                {
                    type: "box",
                    layout: "horizontal",
                    contents: [
                        {
                            type: "box",
                            layout: "vertical",
                            contents: [
                                { type: "text", text: "Available", size: "xs", color: "#16A34A", align: "center" },
                                { type: "text", text: `${available}`, size: "xl", weight: "bold", align: "center" }
                            ]
                        },
                        {
                            type: "box",
                            layout: "vertical",
                            contents: [
                                { type: "text", text: "Damaged", size: "xs", color: "#DC2626", align: "center" },
                                { type: "text", text: `${damaged}`, size: "xl", weight: "bold", align: "center" }
                            ]
                        },
                        {
                            type: "box",
                            layout: "vertical",
                            contents: [
                                { type: "text", text: "In Use", size: "xs", color: "#CA8A04", align: "center" },
                                { type: "text", text: `${inUse}`, size: "xl", weight: "bold", align: "center" }
                            ]
                        }
                    ]
                },
                // One line rather than a fourth cell in the grid above: four
                // columns crowd the Flex layout, and scrapped is not a peer of
                // the other three -- it sits outside the total they sum to.
                ...(scrapped > 0 ? [{
                    type: "text",
                    text: `Scrapped (excluded): ${scrapped}`,
                    size: "xs",
                    color: "#9CA3AF",
                    align: "center",
                    margin: "lg"
                }] : []),
                { type: "separator", margin: "xl" },
                { type: "text", text: "Active Locations (In Use)", weight: "bold", size: "sm", margin: "lg", color: "#555555" },
                // Location Breakdown
                {
                    type: "box",
                    layout: "vertical",
                    margin: "md",
                    spacing: "sm",
                    contents: Object.entries(locationCounts).length > 0 ? Object.entries(locationCounts).map(([loc, count]) => ({
                        type: "box",
                        layout: "horizontal",
                        contents: [
                            { type: "text", text: loc, size: "sm", color: "#666666", flex: 4, wrap: true },
                            { type: "text", text: `${count}`, size: "sm", weight: "bold", align: "end", flex: 1 }
                        ]
                    })) : [{ type: "text", text: "No items currently in use.", size: "sm", color: "#aaaaaa", align: "center" }]
                }
            ]
        }
    }

    await sendLine(token, targetId, `Daily Summary: ${total} Total`, flex)
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
