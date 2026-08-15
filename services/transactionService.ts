import { supabase } from './supabase';
import { ActionType, Pallet, Transaction } from '../types';
import { fetchPallets } from './palletService';
import {
    DAMAGE_BUCKET,
    IMAGE_DELETED,
    extractObjectName,
    removeEvidenceObjects,
    collectEvidenceOlderThan,
} from './storageService';
import { AppError } from './appError';
import { batchKeyOf } from './transactionBatch';

// --- TRANSACTIONS (Check In/Out/Damage) ---

/**
 * "สถานที่ที่ทำรายการล่าสุด" ของพาเลทกลุ่มหนึ่ง อ่าน ณ วินาทีก่อนจะเขียนทับ
 *
 * ทุกเส้นทางที่บันทึกธุรกรรมอัปเดต pallets ก่อนแล้วค่อย insert transactions ค่า
 * current_location ที่เป็น "ที่มา" ของธุรกรรมนั้นจึงถูกทับไปแล้วเมื่อถึงบรรทัด insert
 * ต้องอ่านเก็บไว้ก่อน ไม่ใช่ไปคำนวณย้อนหลังทีหลัง
 *
 * ทำไมไม่คำนวณตอนอ่าน: กฎคือ "ปลายทางของธุรกรรมก่อนหน้าของพาเลทใบเดียวกัน" ซึ่งแปลว่า
 * ต้องหาแถวล่าสุดก่อนหน้าของแต่ละพาเลท -- PostgREST ไม่มี DISTINCT ON ให้เขียน และแถว
 * ก่อนหน้ามักเป็นของพนักงานคนอื่นซึ่งไม่ได้อยู่ในชุดข้อมูลที่หน้าประวัติโหลดมา ตรงจุดเขียน
 * คำตอบอยู่ในมืออยู่แล้วด้วย query เดียวต่อหนึ่งครั้งที่บันทึก
 */
const readOrigins = async (palletIds: string[]): Promise<Map<string, string | null>> => {
    if (palletIds.length === 0) return new Map();

    const { data, error } = await supabase
        .from('pallets')
        .select('pallet_id, current_location')
        .in('pallet_id', palletIds);

    if (error) throw error;
    return new Map((data ?? []).map((row) => [row.pallet_id as string, row.current_location ?? null]));
};

/** ที่ตั้งล่าสุดของพาเลทใบเดียว -- ตัวห่อบางของ readOrigins ให้เส้นทางที่ทำทีละใบอ่านง่าย */
const readOrigin = async (palletId: string): Promise<string | null> =>
    (await readOrigins([palletId])).get(palletId) ?? null;

export const fetchPalletHistory = async (palletId: string): Promise<Transaction[]> => {
    let query = supabase.from('transactions').select('*').order('timestamp', { ascending: false });
    if (palletId) {
        query = query.eq('pallet_id', palletId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
};

export interface TransactionQuery {
    /** Inclusive lower bound, ISO string. */
    since?: string;
    /** Exclusive upper bound, ISO string. */
    until?: string;
    actions?: ActionType[];
    /** Ascending is the default for analytics: every reducer is a forward scan,
     *  and dwell-time pairing needs chronological order. */
    order?: 'asc' | 'desc';
    /** Hard cap. Omit for "everything", which pages. */
    limit?: number;
}

// PostgREST's own ceiling. db.max_rows defaults to 1000, and a select that asks
// for more comes back trimmed to it with NO error and NO indication that
// anything was left behind -- which is exactly what used to happen here.
//
// Must not exceed the server's db.max_rows. If that setting is ever lowered,
// every page comes back short, the loop reads it as the end of the data and
// stops -- reintroducing the same silent truncation one layer up. Raising it is
// harmless; lowering it means lowering this too.
const PAGE_SIZE = 1000;

// 100 pages = 100k rows. Purely a stop for a loop that is not making progress
// (a Range header the server ignores, say); the real data set is nowhere near
// this, and cleanupOldData() trims anything past two years.
const MAX_PAGES = 100;

/**
 * Every transaction matching the query, paged past PostgREST's row ceiling.
 *
 * The old implementation was `fetchPalletHistory('')`: no filter, no limit, one
 * request. That is silently capped at db.max_rows, so the dashboard trend chart
 * and the full history CSV have been quietly truncated at row 1000 -- a
 * correctness bug wearing a performance bug's clothes, because nothing anywhere
 * reported a problem. Every caller now says what slice it actually needs, and
 * whatever it asks for arrives complete.
 *
 * Ordering carries `id` as a tiebreaker. It is not decoration: createBulkTransaction
 * stamps one timestamp across an entire batch, so a 50-pallet check-out writes 50
 * rows that are exactly equal on the sort key. Ties are ordered arbitrarily, and
 * arbitrarily is not the same as consistently between two round-trips -- a batch
 * straddling a page boundary would repeat some rows and drop others. Any stable
 * second key fixes that; the primary key is the one guaranteed unique.
 *
 * One caveat with `order: 'desc'`: offset paging over a table taking inserts can
 * shift rows between requests, and descending puts the new rows at the front
 * where they push everything down a slot. Ascending is immune -- inserts land
 * past the offsets already read -- which is the other reason it is the default.
 */
export const fetchTransactions = async (q: TransactionQuery = {}): Promise<Transaction[]> => {
    const ascending = q.order !== 'desc';
    const rows: Transaction[] = [];

    for (let page = 0; page < MAX_PAGES; page++) {
        // The offset is the count already collected rather than page * PAGE_SIZE,
        // so a final short page (when `limit` narrows the request) cannot leave
        // the two out of step.
        const from = rows.length;
        const want = q.limit === undefined ? PAGE_SIZE : Math.min(PAGE_SIZE, q.limit - rows.length);
        // `limit` reached exactly. Returns rather than breaks: falling out of the
        // loop is reserved for the guard below, and a satisfied limit is a normal
        // ending, not a runaway.
        if (want <= 0) return rows;

        let query = supabase
            .from('transactions')
            .select('*')
            .order('timestamp', { ascending })
            .order('id', { ascending })
            .range(from, from + want - 1);

        if (q.since) query = query.gte('timestamp', q.since);
        if (q.until) query = query.lt('timestamp', q.until);
        if (q.actions && q.actions.length > 0) query = query.in('action_type', q.actions);

        const { data, error } = await query;
        if (error) throw error;

        const batch = data || [];
        rows.push(...batch);

        // A page shorter than requested is the end of the result set. This is the
        // only reliable signal: an exact-length page could be the last one, so the
        // loop costs one extra empty request in that case, which is the price of
        // never guessing.
        if (batch.length < want) return rows;
    }

    console.warn(`[fetchTransactions] Stopped at the ${MAX_PAGES}-page guard with ${rows.length} rows. The result may be incomplete.`);
    return rows;
};

/**
 * โหมด "ล่าสุด" นับเป็น *ชุด* ไม่ใช่แถว -- ค่าเริ่มต้นของหน้าประวัติพนักงาน
 *
 * หน้าประวัติแสดงหนึ่งชุดต่อหนึ่งการ์ด เพดานที่นับเป็นแถวจึงให้จำนวนการ์ดที่เดาไม่ได้:
 * พนักงานที่เบิกออกทีละพาเลทเห็น 50 การ์ด ส่วนคนที่เบิกทีละ 20 พาเลทเห็น 3 การ์ดจากโควตาเท่ากัน
 * ทั้งที่ทำงานมามากกว่า -- "ล่าสุด 50" ควรแปลว่าสิ่งที่ผู้ใช้นับได้บนจอ ซึ่งคือครั้งที่กดบันทึก
 */
const RECENT_BATCHES = 50;

/**
 * กันลูปที่ไม่คืบหน้า (เช่นเซิร์ฟเวอร์เมิน Range header) = 10 x PAGE_SIZE แถว
 *
 * ไม่ใช่ตัวคุมขนาดผลลัพธ์ ตัวที่คุมจริงคือการหยุดตรงที่ชุดที่ 51 เริ่ม -- ค่านี้ทำหน้าที่
 * เดียวกับ MAX_PAGES ข้างบน คือกันลูปที่วนไม่จบเมื่อมีอะไรผิดปกติในระดับที่โค้ดตรงนี้
 * แก้ไม่ได้อยู่แล้ว
 */
const MAX_BATCH_PAGES = 10;

/**
 * แถวของ N ชุดล่าสุดของผู้ใช้คนหนึ่ง
 *
 * PostgREST ไม่มี DISTINCT และไม่มี GROUP BY ให้ใช้จากฝั่ง client จึงขอเป็นหน้า ๆ แล้วนับ
 * ชุดไปด้วยระหว่างไล่แถว แทนที่จะสั่ง "เอา 50 ชุด" ตรง ๆ ในคำสั่งเดียว ทางเลือกอื่นคือ
 * เขียน RPC ฝั่ง Postgres ซึ่งย้ายนิยามของ "ชุด" ไปอยู่อีกภาษาหนึ่งคนละที่กับ
 * transactionBatch.ts -- แลกไม่คุ้มสำหรับข้อมูลระดับนี้
 *
 * หยุดตรงที่ชุดที่ 51 *เริ่ม* ไม่ใช่ตรงแถวที่ N: แถวทุกแถวของชุดที่ 50 จึงตามมาครบเสมอ
 * ไม่ต้องมีขั้นตอนตามเก็บแถวที่ขาดทีหลัง
 *
 * ขอทีละ PAGE_SIZE (เพดานของเซิร์ฟเวอร์) ไม่ใช่ค่าที่จูนตามขนาดชุด -- เพราะขนาดชุดคือสิ่งที่
 * เดาไม่ได้ตั้งแต่ต้น ชุดหนึ่งมีตั้งแต่ 1 ถึง 50+ พาเลท และเปลี่ยนไปตามคนใช้กับช่วงเวลา
 * ค่าที่จูนไว้กับ "ชุดละไม่กี่พาเลท" จะกลายเป็นการยิงสิบรอบทันทีที่เจอวันที่เบิกทีละ 50
 * ซึ่งเป็นวันที่ payload หนักที่สุดพอดี ขอเท่าที่เซิร์ฟเวอร์ยอมให้ต่อรอบแล้วให้ตัวนับชุด
 * เป็นคนบอกว่าพอ จึงจบใน 1-3 รอบเสมอไม่ว่าชุดจะใหญ่แค่ไหน
 *
 * ผลที่ตามมาซึ่งต้องรู้ไว้: 50 ชุดที่ชุดละ 50 พาเลทคือ 2,500 แถวที่ถูกดึงมาทั้งหมดเพื่อวาด
 * การ์ด 50 ใบ ตราบใดที่รายชื่อพาเลทถูกกางจากข้อมูลที่โหลดมาแล้ว (ไม่ยิงเพิ่มตอนกด) ราคานี้
 * เลี่ยงไม่ได้ ทางออกถ้าวันหนึ่งมันหนักเกินไปคือเขียน RPC ฝั่ง Postgres ที่คืน "หัวชุด +
 * จำนวนสมาชิก" มาก่อน แล้วค่อยดึงรหัสพาเลทตอนผู้ใช้กดกางทีละชุด -- ไม่ใช่การลดขนาดหน้า
 * ซึ่งได้แค่ทำให้ round trip เยอะขึ้นโดยที่ payload รวมเท่าเดิม
 */
const fetchRecentBatches = async (userId: string, wantBatches: number): Promise<Transaction[]> => {
    const rows: Transaction[] = [];
    const keys = new Set<string>();

    for (let page = 0; page < MAX_BATCH_PAGES; page++) {
        // offset นับจากแถวที่เก็บมาแล้วจริง ไม่ใช่ page * PAGE_SIZE ทั้งสองค่าเท่ากันอยู่แล้ว
        // ในตอนนี้ แต่ค่าแรกยังถูกต้องต่อไปถ้ามีใครใส่เงื่อนไขคัดแถวเพิ่มทีหลัง
        const from = rows.length;

        const { data, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', userId)
            .order('timestamp', { ascending: false })
            // ตัวคั่นลำดับที่คงที่ ด้วยเหตุผลเดียวกับ fetchTransactions ข้างบน: ทั้งชุดมี
            // timestamp เท่ากัน ถ้าไม่มีคีย์ที่สอง ลำดับภายในชุดจะสลับไปมาระหว่างสองรอบ
            // ที่ขอต่อกัน แถวเดิมจะถูกส่งมาซ้ำและบางแถวจะหายไปเลย
            .order('id', { ascending: false })
            .range(from, from + PAGE_SIZE - 1);

        if (error) throw error;

        const pageRows = data ?? [];

        for (const tx of pageRows) {
            const key = batchKeyOf(tx);

            if (!keys.has(key)) {
                // เจอชุดใหม่ทั้งที่ครบโควตาแล้ว = จบพอดีที่ขอบชุด
                if (keys.size >= wantBatches) return rows;
                keys.add(key);
            }

            rows.push(tx);
        }

        // หน้าที่สั้นกว่าที่ขอ แปลว่าหมดข้อมูลของผู้ใช้คนนี้แล้ว (ยังไม่ถึง 50 ชุดก็ได้)
        if (pageRows.length < PAGE_SIZE) return rows;
    }

    console.warn(
        `[fetchRecentBatches] หยุดที่เพดาน ${MAX_BATCH_PAGES} หน้า ด้วย ${rows.length} แถว ผลลัพธ์อาจไม่ครบ`
    );
    return rows;
};

/**
 * ทุกแถวของผู้ใช้คนหนึ่งในวันหนึ่ง -- ครบทั้งวัน ไม่มีเพดานจำนวนแถว
 *
 * เดิมตัดที่ 500 แถว ซึ่งเป็นตัวเลขที่ตั้งจากสมมติฐานว่าชุดหนึ่งมีไม่กี่พาเลท พอการใช้งาน
 * จริงเบิกทีละ 20-50 พาเลท วันที่ทำงานหนัก ๆ เพียง 11 ครั้งก็ทะลุเพดานแล้ว แล้วชุดที่เกิน
 * ไปจะหายจากหน้าประวัติเงียบ ๆ โดยที่ผู้ใช้เห็นแค่ "วันนี้ทำไปเท่านี้" ซึ่งน้อยกว่าความจริง
 *
 * วันหนึ่งมีขอบเขตของมันเองอยู่แล้ว การไล่ขอจนหมดจึงไม่ใช่ query ที่ไม่มีที่สิ้นสุด ต่างจาก
 * โหมด "ล่าสุด" ที่ไม่มีอะไรมาปิดท้ายให้ จึงต้องนับชุดเอง
 */
const fetchUserDay = async (userId: string, dateStr: string): Promise<Transaction[]> => {
    const rows: Transaction[] = [];

    // Interpret dateStr as LOCAL day.
    // Construct YYYY-MM-DDT00:00:00 vs 23:59:59 in LOCAL TIME, then ISO for DB comparison
    // Note: dateStr input is expected to be 'YYYY-MM-DD'
    const startLocal = new Date(`${dateStr}T00:00:00`);
    const endLocal = new Date(`${dateStr}T23:59:59.999`);
    // If dateStr is invalid, these are Invalid Date -- ปล่อยผ่านเป็น "ไม่กรองวัน" เหมือนเดิม
    const validDay = !isNaN(startLocal.getTime());

    if (!validDay) console.warn('Invalid date filter', dateStr);

    for (let page = 0; page < MAX_BATCH_PAGES; page++) {
        const from = rows.length;

        let query = supabase
            .from('transactions')
            .select('*')
            .eq('user_id', userId)
            .order('timestamp', { ascending: false })
            .order('id', { ascending: false })
            .range(from, from + PAGE_SIZE - 1);

        if (validDay) {
            query = query
                .gte('timestamp', startLocal.toISOString())
                .lte('timestamp', endLocal.toISOString());
        }

        const { data, error } = await query;
        if (error) throw error;

        const pageRows = data ?? [];
        rows.push(...pageRows);

        if (pageRows.length < PAGE_SIZE) return rows;
    }

    console.warn(
        `[fetchUserDay] หยุดที่เพดาน ${MAX_BATCH_PAGES} หน้า ด้วย ${rows.length} แถว ผลลัพธ์อาจไม่ครบ`
    );
    return rows;
};

/**
 * ประวัติของพนักงานหนึ่งคน
 *
 * ระบุวัน -> ทุกแถวของวันนั้น / ไม่ระบุ -> 50 ชุดล่าสุด
 *
 * ไม่มีโหมดไหนตัดกลางชุดอีกแล้ว: โหมดวันดึงจนหมดวัน ส่วนโหมดล่าสุดหยุดตรงที่ชุดถัดไปเริ่ม
 * ทั้งคู่จึงคืนชุดที่สมบูรณ์เสมอ ซึ่งเป็นเงื่อนไขที่หน้าประวัติต้องการ -- มันพิมพ์จำนวน
 * สมาชิกของชุดออกมาบนการ์ด ชุดที่ขาดไปครึ่งหนึ่งจะกลายเป็นตัวเลขที่ผิดโดยไม่มีอะไรฟ้อง
 */
export const fetchUserTransactions = async (userId: string, dateStr?: string): Promise<Transaction[]> =>
    dateStr ? fetchUserDay(userId, dateStr) : fetchRecentBatches(userId, RECENT_BATCHES);

export const fetchUserTransactionDates = async (userId: string): Promise<string[]> => {
    // We fetch timestamps to find unique days. 
    // Limit to 2000 to avoid performance hit, enough for ~20 days @ 100/day
    const { data, error } = await supabase
        .from('transactions')
        .select('timestamp')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(2000);

    if (error) throw error;

    if (!data) return [];

    // Extract unique dates (YYYY-MM-DD) in LOCAL TIME
    const uniqueDates = new Set<string>();

    // Helper to format YYYY-MM-DD in local time consistently
    const toLocalDateStr = (isoStr: string) => {
        try {
            const d = new Date(isoStr);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        } catch { return ''; }
    };

    data.forEach(item => {
        if (item.timestamp) {
            const localDate = toLocalDateStr(item.timestamp);
            if (localDate) uniqueDates.add(localDate);
        }
    });

    return Array.from(uniqueDates);
};

export const fetchDamagedWithEvidence = async (): Promise<(Pallet & { evidence_url: string | null })[]> => {
    const pallets = await fetchPallets();
    const damaged = pallets.filter(p => p.status === 'damaged');

    const enriched = await Promise.all(damaged.map(async (p) => {
        let evidence = null;
        // Find the most recent damage report transaction for this pallet
        const { data } = await supabase.from('transactions')
            .select('evidence_image_url')
            .eq('pallet_id', p.pallet_id)
            .eq('action_type', 'report_damage')
            .order('timestamp', { ascending: false })
            .limit(1)
            .maybeSingle(); // Use maybeSingle to avoid 406 if no rows
        evidence = data?.evidence_image_url;
        return { ...p, evidence_url: evidence };
    }));

    return enriched;
};

/**
 * Returns a damaged pallet to stock.
 *
 * The old 'discard' branch is gone. It called deletePallet(), and
 * transactions.pallet_id is ON DELETE CASCADE, so "discarding" a pallet erased
 * every trace it had ever existed -- and it skipped the storage cleanup below,
 * leaving the evidence image orphaned in the bucket forever. Retiring a pallet
 * now goes through scrapPallet(), which keeps both. Nothing ever called the
 * discard branch anyway; no screen was wired to it.
 */
export const resolveDamage = async (palletId: string, userId?: string): Promise<boolean> => {
    const timestamp = new Date().toISOString();

    // ต้องอ่านก่อน update ข้างล่างซึ่งรีเซ็ต current_location เป็น 'Warehouse'
    const origin = await readOrigin(palletId);

    // The pallet row is updated FIRST, before any destructive cleanup. The old
    // order deleted the evidence image first, so a failure on this update left
    // the photo permanently gone while the pallet was still 'damaged' -- an
    // unrecoverable state, since the evidence for the next attempt no longer
    // existed. current_location is reset alongside status because the repair
    // transaction below is logged with department_dest 'Warehouse'; leaving the
    // pallet at its old location made the row and its own log disagree.
    const { error } = await supabase.from('pallets').update({
        status: 'available',
        current_location: 'Warehouse',
        last_checkout_date: null,
        last_transaction_date: timestamp
    }).eq('pallet_id', palletId);
    if (error) throw error;

    // Now the cleanup. Find the latest damage report to remove its image: the
    // pallet is repaired, so the photo has no further purpose and the bucket
    // should not accumulate it. Everything here is best-effort -- the repair
    // itself has already been committed above.
    const { data: transData } = await supabase.from('transactions')
        .select('id, evidence_image_url')
        .eq('pallet_id', palletId)
        .eq('action_type', 'report_damage')
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (transData && transData.evidence_image_url && transData.evidence_image_url !== IMAGE_DELETED) {
        try {
            // Handles both shapes: legacy rows hold a full public URL, new rows
            // hold the bare object name.
            const fileName = extractObjectName(transData.evidence_image_url);

            if (fileName) {
                // Delete from Storage
                const { error: storageError } = await supabase.storage.from(DAMAGE_BUCKET).remove([fileName]);
                if (storageError) {
                    console.error("[resolveDamage] Storage delete failed:", storageError);
                } else {
                    console.log("[resolveDamage] Storage delete success");
                }

                // Update Transaction Record
                const { error: updateError } = await supabase.from('transactions')
                    .update({ evidence_image_url: IMAGE_DELETED })
                    .eq('id', transData.id);

                if (updateError) {
                    console.error("[resolveDamage] Transaction update failed:", updateError);
                }
            }
        } catch (e) {
            console.error("Failed to cleanup image", e);
            // Non-blocking, the pallet is already repaired.
        }
    }

    // Log "Repaired" Transaction
    if (userId) {
        const { error: transError } = await supabase.from('transactions').insert({
            pallet_id: palletId,
            user_id: userId,
            action_type: 'repair',
            transaction_remark: 'Pallet repaired (returned to stock)',
            department_origin: origin,
            department_dest: 'Warehouse', // Usually returned to stock
            timestamp
        });
        if (transError) console.error("Failed to log repair transaction", transError);
    }

    return true;
};

/**
 * Retires a pallet permanently, keeping its history.
 *
 * This is the replacement for deleting a pallet that cannot be repaired.
 * Deleting cascades the transaction rows away; this keeps every one of them and
 * adds a 'scrap' row of its own, so the audit trail still shows the pallet
 * existed, what happened to it, and who decided.
 *
 * Only reachable from 'damaged', so a scrapped pallet always has a damage
 * report -- with a photo -- explaining why. That evidence is deliberately NOT
 * cleaned up the way resolveDamage() cleans it up: for a repair the photo is
 * spent, but for a scrap it is the justification for writing the asset off.
 *
 * 'scrapped' is terminal. Nothing sets a pallet back out of it; an accidental
 * scrap is corrected by creating a new pallet.
 */
export const scrapPallet = async (palletId: string, userId?: string, reason?: string): Promise<boolean> => {
    const timestamp = new Date().toISOString();

    // Unlike the repair path, which logs best-effort, no caller may scrap
    // anonymously. Skipping the insert when userId is missing would retire the
    // pallet with nothing in the audit trail saying who did it or why -- which
    // is the exact failure this whole status was introduced to prevent. Checked
    // before the pallet row is touched so the refusal leaves no partial state.
    if (!userId) {
        throw new AppError('scrap_requires_user');
    }

    // Guard on the server's copy of the state, not on whatever the list in the
    // browser last rendered. Reaching 'scrapped' from anywhere but 'damaged'
    // would skip the damage report that is supposed to justify it.
    const { data: pallet, error: readError } = await supabase
        .from('pallets')
        // current_location มาด้วยใน query เดิม ไม่ยิงเพิ่มอีกรอบ -- การตัดออกจากระบบไม่ได้
        // ย้ายของไปไหน แต่แถวยังต้องบอกได้ว่าตอนถูกตัดออกพาเลทอยู่ที่ไหน
        .select('status, current_location')
        .eq('pallet_id', palletId)
        .maybeSingle();

    if (readError) throw readError;
    if (!pallet) throw new AppError('pallet_not_found', { palletId });
    if (pallet.status === 'scrapped') {
        throw new AppError('pallet_already_scrapped', { palletId });
    }
    if (pallet.status !== 'damaged') {
        // The status is passed through so the message can name it. It is a raw
        // enum here; describeAppError() is where it would be humanised if the
        // wording ever needs it.
        throw new AppError('pallet_not_damaged', { palletId, status: pallet.status });
    }

    const { error: palletError } = await supabase.from('pallets').update({
        status: 'scrapped',
        last_checkout_date: null,
        last_transaction_date: timestamp
    }).eq('pallet_id', palletId);
    if (palletError) throw palletError;

    // This row is the audit record, so unlike the repair log above its failure
    // is fatal rather than logged and swallowed.
    const { error: transError } = await supabase.from('transactions').insert({
        pallet_id: palletId,
        user_id: userId,
        action_type: 'scrap',
        transaction_remark: reason?.trim() || 'Pallet scrapped (written off, beyond repair)',
        department_origin: pallet.current_location ?? null,
        department_dest: null,
        timestamp
    });
    if (transError) throw transError;

    return true;
};

// checkOutPallet()/checkInPallet() -- ฟังก์ชันบันทึกทีละใบ -- ถูกลบทิ้งพร้อมกับการแก้บั๊ก
// "กดบันทึกครั้งเดียวแต่ประวัติแตกเป็นหลายชุด"
//
// ไม่ได้ลบเพราะไม่มีใครเรียกแล้วอย่างเดียว แต่เพราะรูปร่างของมันคือกับดัก: มันรับพาเลท
// ทีละใบและอ่านนาฬิกาเอง หน้าจอที่ต้องบันทึกหลายใบจึงวนเรียกมันอย่างเป็นธรรมชาติที่สุด
// แล้วได้ timestamp ต่างกันใบละไม่กี่มิลลิวินาที ซึ่งพอ transactionBatch.ts จับกลุ่มด้วย
// timestamp ก็กลายเป็นคนละชุดกัน -- เป็นบั๊กที่ไม่มีอะไรฟ้อง เห็นอีกทีตอนเปิดหน้าประวัติ
//
// createBulkTransaction() ทำงานแทนได้ทั้งหมด รวมถึงกรณีใบเดียว (ชุดที่มีสมาชิกหนึ่งใบ)
// การเหลือไว้แค่ทางเดียวคือสิ่งที่ทำให้บั๊กเดิมกลับมาไม่ได้อีก

export const reportDamage = async (palletId: string, userId: string, imageFile: File | null): Promise<boolean> => {
    const timestamp = new Date().toISOString();
    // การแจ้งชำรุดไม่ได้ย้ายของ แถวจึงไม่มีปลายทาง สิ่งที่ต้องตอบให้ได้คือ "ชำรุดอยู่ที่ไหน"
    // ซึ่งคือที่ตั้งล่าสุดของพาเลท -- update ข้างล่างแตะแค่ status จึงอ่านตรงไหนก็ได้ แต่วางไว้
    // ต้นฟังก์ชันให้เหมือนเส้นทางอื่นทั้งหมด
    const origin = await readOrigin(palletId);
    let imageUrl: string | null = null;

    // Storage Logic
    if (imageFile) {
        const fileName = `${palletId}_${Date.now()}.jpg`;
        try {
            const { data, error } = await supabase.storage.from(DAMAGE_BUCKET).upload(fileName, imageFile);
            if (error) {
                console.error("Upload error details:", error);
                throw new AppError('image_upload_failed', { reason: error.message });
            } else if (data) {
                // Store the object NAME, not a public URL. The bucket is private
                // now, so a public URL would not resolve; readers mint a
                // short-lived signed URL via getEvidenceSignedUrl() instead.
                imageUrl = fileName;
            }
        } catch (e: any) {
            console.error("Storage upload exception", e);
            throw new AppError('image_upload_failed', { reason: e?.message || String(e) });
        }
    }

    const { error: palletError } = await supabase.from('pallets').update({
        status: 'damaged',
        last_transaction_date: timestamp
    }).eq('pallet_id', palletId);
    if (palletError) throw palletError;

    const { error: transError } = await supabase.from('transactions').insert({
        pallet_id: palletId,
        user_id: userId,
        action_type: 'report_damage',
        department_origin: origin,
        department_dest: null,
        evidence_image_url: imageUrl,
        timestamp
    });

    if (transError) throw transError;
    if (transError) throw transError;
    return true;
};

/**
 * บันทึกการเบิกออก/รับคืนของพาเลทหลายใบเป็น "หนึ่งครั้ง"
 *
 * ทุกหน้าจอที่บันทึกทีละหลายใบต้องเข้าทางนี้ ห้ามวนเรียก checkOutPallet/checkInPallet เอง
 * เพราะสองฟังก์ชันนั้นอ่านนาฬิกาของตัวเองใบละครั้ง -- 5 ใบที่กดบันทึกครั้งเดียวจะได้
 * timestamp ต่างกันหลักมิลลิวินาที และหน้าประวัติซึ่งจับกลุ่มด้วย timestamp (ดู
 * transactionBatch.ts) จะแตกมันเป็น 5 ชุด ทั้งที่ผู้ใช้กดบันทึกครั้งเดียว
 *
 * ที่นี่คำนวณ timestamp ครั้งเดียวก่อนเข้าลูปแล้วประทับให้ทุกแถว ซึ่งเป็นสัญญาที่การ
 * จัดกลุ่มทั้งระบบพึ่งพา และมีเทสต์ล็อกไว้ที่ transactionService.test.ts
 */
export const createBulkTransaction = async (
    palletIds: string[],
    actionType: 'check_out' | 'check_in',
    userId: string,
    departmentDest?: string,
    remark?: string,
    manualTimestamp?: string
): Promise<{ success: string[], failed: string[] }> => {
    const timestamp = manualTimestamp || new Date().toISOString();
    const success: string[] = [];
    const failed: string[] = [];

    // อ่านทีเดียวทั้งชุดก่อนเข้าลูป ไม่ใช่ยิงต่อพาเลทหนึ่งใบ -- ชุดหนึ่งมีได้ถึง 50 ใบ และ
    // ลูปข้างล่างอัปเดต pallets ทีละใบ พออัปเดตใบแรกไปแล้วค่าเดิมของใบนั้นก็หายไป
    const origins = await readOrigins(palletIds);

    // Process sequentially to be safe, or Promise.all if we trust DB concurrency
    // Given Supabase, Promise.all is usually fine but let's do safe iteration for better error tracking per item
    for (const id of palletIds) {
        try {
            if (actionType === 'check_out') {
                if (!departmentDest) throw new AppError('destination_required');

                // Update Pallet
                //
                // .select() ต่อท้ายเพื่อให้รู้ว่ามีแถวถูกแก้จริงไหม -- UPDATE ที่ไม่ตรงแถวไหนเลย
                // ไม่ใช่ error ใน PostgREST มันสำเร็จเงียบ ๆ แล้วปล่อยให้ไปพังตอน insert
                // ธุรกรรมด้วย foreign key violation ซึ่งเป็นข้อความที่โยงกลับมาหาสาเหตุไม่ได้
                //
                // เดิมการ์ดใบนี้อยู่ใน checkOutPallet() ซึ่งเป็นเส้นทางที่หน้ามือถือเคยใช้
                // พอย้ายมาใช้ createBulkTransaction ทั้งหมด การ์ดต้องตามมาด้วย ไม่ใช่หายไป
                // พร้อมกับฟังก์ชันเดิม
                const { data: updated, error: palletError } = await supabase.from('pallets').update({
                    status: 'in_use',
                    current_location: departmentDest,
                    last_checkout_date: timestamp,
                    last_transaction_date: timestamp
                }).eq('pallet_id', id).select('pallet_id');

                if (palletError) throw palletError;
                if (!updated || updated.length === 0) {
                    throw new AppError('pallet_missing_for_checkout', { palletId: id });
                }

                // Log Transaction
                const { error: transError } = await supabase.from('transactions').insert({
                    pallet_id: id,
                    user_id: userId,
                    action_type: 'check_out',
                    department_origin: origins.get(id) ?? null,
                    department_dest: departmentDest,
                    transaction_remark: remark,
                    timestamp
                });
                if (transError) throw transError;

            } else if (actionType === 'check_in') {
                // Update Pallet -- .select() ด้วยเหตุผลเดียวกับฝั่ง check_out ข้างบน
                const { data: updated, error: palletError } = await supabase.from('pallets').update({
                    status: 'available',
                    current_location: 'Warehouse',
                    last_checkout_date: null,
                    last_transaction_date: timestamp
                }).eq('pallet_id', id).select('pallet_id');

                if (palletError) throw palletError;
                if (!updated || updated.length === 0) {
                    throw new AppError('pallet_missing_for_checkout', { palletId: id });
                }

                // Log Transaction
                const { error: transError } = await supabase.from('transactions').insert({
                    pallet_id: id,
                    user_id: userId,
                    action_type: 'check_in',
                    department_origin: origins.get(id) ?? null,
                    department_dest: 'Warehouse',
                    transaction_remark: remark,
                    timestamp
                });
                if (transError) throw transError;
            }

            success.push(id);
        } catch (e) {
            console.error(`Failed to process ${id}`, e);
            failed.push(id);
        }
    }

    return { success, failed };
};

export interface CleanupResult {
    /** จำนวนแถวที่ถูกลบ */
    transactions: number;
    /** จำนวนไฟล์หลักฐานที่ถูกลบออกจากถัง */
    images: number;
}

/**
 * ลบประวัติที่เก่ากว่า yearsToKeep ปี พร้อมรูปหลักฐานของแถวเหล่านั้น
 *
 * ของเดิมลบเฉพาะแถว ไฟล์ในถังอยู่ต่อโดยไม่มีใครอ้างถึง และเมื่อแถวที่เคยชี้ไปหามัน
 * หายไปแล้ว ก็ไม่เหลือทางบอกได้อีกว่าไฟล์ไหนกำพร้า -- ยิ่งกดล้างข้อมูล พื้นที่ยิ่ง
 * ถูกจองถาวรมากขึ้น ซึ่งตรงข้ามกับสิ่งที่ปุ่มนี้บอกว่าจะทำ
 *
 * ลำดับคือ "ลบไฟล์ก่อน แล้วค่อยลบแถว" เหมือน resolveDamage() เพราะความล้มเหลว
 * สองแบบนี้ไม่เท่ากัน: ลบไฟล์ไม่ผ่านแล้วหยุด = ข้อมูลยังครบ กดใหม่ได้ ส่วนลบแถว
 * ผ่านแล้วลบไฟล์ไม่ผ่าน = ไฟล์กำพร้าถาวรอย่างเงียบ ๆ
 */
export const cleanupOldData = async (yearsToKeep: number = 2): Promise<CleanupResult> => {
    const today = new Date();
    const cutoffDate = new Date(today.setFullYear(today.getFullYear() - yearsToKeep));
    const cutoffIso = cutoffDate.toISOString();

    const doomedEvidence = await collectEvidenceOlderThan(cutoffIso);
    const images = await removeEvidenceObjects(doomedEvidence);

    const { error, count } = await supabase
        .from('transactions')
        .delete({ count: 'exact' })
        .lt('timestamp', cutoffIso);

    if (error) throw error;
    return { transactions: count || 0, images };
};

// --- EDITING & DELETING ---

export const updateTransaction = async (
    transactionId: string,
    palletId: string,
    updates: { department_dest?: string, transaction_remark?: string }
): Promise<boolean> => {

    // 1. Update the Transaction
    const { error: txError } = await supabase.from('transactions')
        .update(updates)
        .eq('id', transactionId);

    if (txError) throw txError;

    // 2. Sync Logic: Is this the LATEST transaction for this pallet?
    // If we changed location, we might need to update the Pallet's current_location
    if (updates.department_dest) {
        const { data: latestTx } = await supabase.from('transactions')
            .select('id')
            .eq('pallet_id', palletId)
            .order('timestamp', { ascending: false })
            .limit(1)
            .single();

        // If the edited transaction IS the latest one
        if (latestTx && latestTx.id === transactionId) {
            console.log("Syncing pallet location to edited transaction...");
            const { error: palletError } = await supabase.from('pallets')
                .update({ current_location: updates.department_dest })
                .eq('pallet_id', palletId);

            if (palletError) console.error("Failed to sync pallet location", palletError);
        }
    }

    return true;
};

export const deleteTransaction = async (transactionId: string): Promise<boolean> => {
    // We strictly delete the record. We DO NOT automatically revert pallet state because it's ambiguous.
    // The admin can manually fix the pallet status/location if needed.

    // รูปหลักฐานของแถวนี้ต้องไปพร้อมกับแถว -- ของเดิมลบแต่แถว ไฟล์จึงค้างอยู่ในถัง
    // โดยไม่มีอะไรอ้างถึงอีกเลย เหตุผลเต็มอยู่ที่ removeEvidenceObjects()
    //
    // maybeSingle ไม่ใช่ single: แถวที่หายไปแล้ว (แอดมินอีกคนลบตัดหน้า) ต้องเดินต่อ
    // ไปลบซ้ำได้เงียบ ๆ ไม่ใช่โยน error ว่าหาแถวไม่เจอ
    const { data: row, error: readError } = await supabase.from('transactions')
        .select('evidence_image_url')
        .eq('id', transactionId)
        .maybeSingle();

    if (readError) throw readError;
    await removeEvidenceObjects([row?.evidence_image_url]);

    const { error } = await supabase.from('transactions')
        .delete()
        .eq('id', transactionId);

    if (error) throw error;
    return true;
};
