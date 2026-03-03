import { fetchSystemSetting } from './settingsService';
import { fetchPallets } from './palletService';

// --- LINE NOTIFICATION HELPERS ---

const sendLineFlexMessage = async (altText: string, flexContents: any) => {
    const accessToken = await fetchSystemSetting('line_channel_token');
    const targetId = await fetchSystemSetting('line_target_id');

    if (!accessToken || !targetId) {
        // Just return silence if no line token, or throw? 
        // User might not have set it up yet.
        console.log("Line tokens missing, skipping notification");
        return false;
    }

    const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent('https://api.line.me/v2/bot/message/push');

    const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
            to: targetId,
            messages: [{
                type: 'flex',
                altText: altText,
                contents: flexContents
            }]
        })
    });

    if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || "LINE API Error");
    }
    return true;
};

export const sendMorningReport = async (): Promise<string> => {
    const allPallets = await fetchPallets();
    const today = new Date();
    const dateStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
    const savedThreshold = await fetchSystemSetting('overdue_days');
    const thresholdDays = savedThreshold ? parseInt(savedThreshold) : 7;

    const overdueItems = allPallets.filter(p => {
        if (p.status !== 'in_use' || !p.last_checkout_date) return false;
        const checkoutDate = new Date(p.last_checkout_date);
        const diffTime = Math.abs(today.getTime() - checkoutDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > thresholdDays;
    });

    if (overdueItems.length === 0) return "No overdue items to report.";

    // Group by Location
    const locationCounts: Record<string, number> = {};
    overdueItems.forEach(p => {
        locationCounts[p.current_location] = (locationCounts[p.current_location] || 0) + 1;
    });

    // Build Flex Message (Overdue)
    const flexJson = {
        type: "bubble",
        header: {
            type: "box",
            layout: "vertical",
            backgroundColor: "#DC2626", // Red
            paddingAll: "lg",
            contents: [
                { type: "text", text: "⚠️ OVERDUE ALERT", weight: "bold", color: "#FFFFFF", size: "xl" },
                { type: "text", text: `Daily Report: ${dateStr} (Overdue > ${thresholdDays} Days)`, color: "#FFDDDD", size: "xs", margin: "sm" }
            ]
        },
        body: {
            type: "box",
            layout: "vertical",
            contents: [
                {
                    type: "text",
                    text: `Found ${overdueItems.length} overdue pallets.`,
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
    };

    try {
        await sendLineFlexMessage(`Overdue Report: ${overdueItems.length} Overdue`, flexJson);
        return `Sent Overdue Report (${overdueItems.length} items)`;
    } catch (e: any) {
        return `Failed to send report: ${e.message}`;
    }
};

export const sendEveningReport = async (): Promise<string> => {
    const pallets = await fetchPallets();
    const available = pallets.filter(p => p.status === 'available').length;
    const inUse = pallets.filter(p => p.status === 'in_use').length;
    const damaged = pallets.filter(p => p.status === 'damaged').length;

    // Group In Use by Location
    const inUseItems = pallets.filter(p => p.status === 'in_use');
    const locationCounts: Record<string, number> = {};
    inUseItems.forEach(p => {
        locationCounts[p.current_location] = (locationCounts[p.current_location] || 0) + 1;
    });

    const d = new Date();
    const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

    const flexJson = {
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
                { type: "text", text: `${pallets.length}`, color: "#1F2937", size: "4xl", weight: "bold", align: "center", margin: "sm" }
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
    };

    try {
        await sendLineFlexMessage(`Daily Summary: ${pallets.length} Total`, flexJson);
        return `Sent Summary Report (Total: ${pallets.length})`;
    } catch (e: any) {
        return `Failed to send report: ${e.message}`;
    }
};

export const checkOverdueAndNotify = async (): Promise<string> => {
    return await sendMorningReport();
};
