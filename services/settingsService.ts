import { supabase } from './supabase';

export interface SystemSettings {
    admin_email_base: string;
    overdue_days: number;
    line_channel_token: string;
    line_target_id: string;
    report_scheduled_days: string[]; // ["Mon", "Tue"]
    report_time_morning: string; // "08:00"
    report_time_evening: string; // "16:00"
}

// Default fallback values if DB is empty or unreachable
const DEFAULT_SETTINGS: SystemSettings = {
    admin_email_base: 'bcozfair@gmail.com',
    overdue_days: 7,
    line_channel_token: '',
    line_target_id: '',
    report_scheduled_days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    report_time_morning: "08:00",
    report_time_evening: "16:00"
};

export const fetchAllSystemSettings = async (): Promise<SystemSettings> => {
    const { data, error } = await supabase.from('system_settings').select('key, value');

    if (error) {
        console.error("Failed to fetch settings:", error);
        return DEFAULT_SETTINGS;
    }

    if (!data || data.length === 0) return DEFAULT_SETTINGS;

    // Map rows {key, value} to object
    const settings: any = { ...DEFAULT_SETTINGS };

    data.forEach(row => {
        if (row.key === 'overdue_days') {
            settings[row.key] = parseInt(row.value) || 7;
        } else if (row.key === 'report_scheduled_days') {
            try {
                settings[row.key] = JSON.parse(row.value);
            } catch (e) {
                settings[row.key] = DEFAULT_SETTINGS.report_scheduled_days;
            }
        } else {
            // String values
            settings[row.key] = row.value;
        }
    });

    return settings as SystemSettings;
};

/**
 * Whether the LINE credentials are stored -- 'unknown' when we could not find
 * out, which is not the same as "not set".
 */
export type LineConfigStatus = 'configured' | 'not_configured' | 'unknown';

/**
 * The two LINE rows are flagged is_secret, and the RLS policy on system_settings
 * filters those out of every browser SELECT, so fetchAllSystemSettings above can
 * never see them -- it returns '' for both whatever the database holds. Asking
 * this RPC is the only way the screen can tell a configured system from an empty
 * one without the token being sent to the browser, which is the thing the policy
 * exists to prevent.
 */
export const fetchLineConfigStatus = async (): Promise<LineConfigStatus> => {
    const { data, error } = await supabase.rpc('get_line_config_status');

    // Most likely cause: the migration adding the function has not been run on
    // this database yet. Reporting 'not_configured' here would recreate exactly
    // the bug this replaced -- a chip that states, with confidence, something it
    // did not check.
    if (error) {
        console.error('Failed to read LINE config status:', error);
        return 'unknown';
    }

    return data?.has_token && data?.has_target ? 'configured' : 'not_configured';
};

export const fetchSystemSetting = async (key: string): Promise<string | null> => {
    const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', key)
        .single();

    if (error) return null;
    return data?.value || null;
};

export const updateSystemSetting = async (key: string, value: string): Promise<boolean> => {
    // Special case for Admin Email Base -> Use RPC for atomic migration
    if (key === 'admin_email_base') {
        const { data, error } = await supabase.rpc('update_admin_email_base', { new_email_base: value });
        if (error) throw error;
        return data?.success || false;
    }

    // Normal update for other keys
    const { error } = await supabase
        .from('system_settings')
        .upsert({
            key,
            value,
            updated_at: new Date().toISOString()
        });

    if (error) throw error;
    return true;
};
