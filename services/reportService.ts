import { supabase } from './supabase';
import { SUPABASE_URL } from '../constants';

// --- LINE REPORT TRIGGERS ---
//
// This module used to build the LINE Flex payload in the browser and POST it to
// https://api.line.me via https://corsproxy.io -- which meant handing the
// long-lived LINE channel access token to an unrelated third-party host on
// every send. It also could not work any more: secure_system_settings.sql marks
// line_channel_token / line_target_id as is_secret, and the RLS SELECT policy
// hides secret rows from the browser, so fetchSystemSetting() returned null and
// the send silently no-opped ("Line tokens missing, skipping notification").
//
// Both reports are now built and sent inside the scheduled-report edge
// function, which runs with the service role key, reads the token server-side,
// and talks to LINE directly. The token never reaches the browser.

const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/scheduled-report`;

const triggerReport = async (type: 'morning' | 'evening'): Promise<string> => {
    if (!SUPABASE_URL) {
        return 'Supabase URL is not configured.';
    }

    try {
        // The user's access token proves to the edge function that an admin is
        // asking. The function re-checks the role server-side; being able to
        // reach this code path in the UI is not treated as authorization.
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.access_token) {
            return 'Not signed in.';
        }

        const response = await fetch(FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ force: true, type })
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
            return `Failed to send report: ${result?.error || response.statusText}`;
        }

        return type === 'morning'
            ? 'Sent Overdue Report'
            : 'Sent Summary Report';
    } catch (e: any) {
        console.error('[reportService] Trigger failed', e);
        return `Failed to send report: ${e.message || e}`;
    }
};

export const sendMorningReport = (): Promise<string> => triggerReport('morning');

export const sendEveningReport = (): Promise<string> => triggerReport('evening');

export const checkOverdueAndNotify = (): Promise<string> => triggerReport('morning');
