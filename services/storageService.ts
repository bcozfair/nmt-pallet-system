import { supabase } from './supabase';

export const DAMAGE_BUCKET = 'damage_reports';

// Sentinel written by resolveDamage() once the underlying object has been
// removed but the transaction row is kept for the audit trail.
export const IMAGE_DELETED = 'image_deleted';

const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

/**
 * เพดานขนาดไฟล์หลักฐานหนึ่งรูป
 *
 * ต้องตรงกับ `file_size_limit` ของถัง damage_reports (ตอนที่ 8 ของ
 * supabase/migrations/00_current_schema.sql) -- ตัวที่บังคับจริงคือฝั่งเซิร์ฟเวอร์
 * ค่าตรงนี้มีไว้ให้ฝั่งเบราว์เซอร์บอกคนใช้ได้ก่อนว่าไฟล์ใหญ่เกิน แทนที่จะปล่อยให้
 * อัปโหลดขึ้นไปแล้วเด้งกลับมาเป็นข้อความดิบของ Supabase
 *
 * 150KB ไม่ใช่ 100KB ทั้งที่ utils/imageCompression.ts เล็งไว้ที่ 100KB: มันหยุด
 * ไล่คุณภาพลงที่ quality 0.2 รูปที่รายละเอียดจัดจริง ๆ จึงออกมาเกิน 100KB ได้โดย
 * ไม่มีอะไรผิด เพดานนี้มีไว้กันไฟล์ที่ "ไม่ผ่านการบีบอัดเลย" (หลาย MB) ไม่ใช่ไว้
 * เถียงกับตัวบีบอัดเรื่องหลักสิบ KB
 *
 * โควตา Free plan ที่โปรเจคนี้ใช้อยู่คือ 50MB -- ที่ 150KB ต่อรูปคือราว 340 รูป
 * ส่วนรูปที่ผ่านการบีบอัดตามปกติ (~100KB) คือราว 500 รูป
 */
export const MAX_EVIDENCE_BYTES = 150 * 1024;

// Supabase รับ path ได้หลายตัวต่อคำขอ แต่ไม่ใช่ไม่จำกัด -- ตัดเป็นชุดไว้เพื่อให้
// การล้างข้อมูลสองปีที่มีรูปเป็นพันไม่กลายเป็นคำขอเดียวที่ยาวเกินจน timeout
const REMOVE_BATCH_SIZE = 100;

/**
 * The lifetime a link written into an exported CSV gets.
 *
 * The default hour above is sized for a link the screen is about to render and
 * then forget. A spreadsheet outlives the session that produced it: the file is
 * mailed, opened the next morning, filed. An hour would mean every evidence
 * link in it is dead before anyone clicks one, with nothing in the cell to say
 * why -- Supabase answers an expired token with a bare JSON error page.
 *
 * A week is the compromise the project owner picked: long enough that the
 * report is still usable for the meeting it was exported for, short enough that
 * a file forwarded on is not a permanent public handle on a private bucket.
 */
export const CSV_EVIDENCE_URL_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

/**
 * Derives the storage object name from whatever is stored in
 * transactions.evidence_image_url.
 *
 * Rows written before the bucket was made private hold a full public URL:
 *   https://<project>.supabase.co/storage/v1/object/public/damage_reports/<file>
 * Rows written after hold the bare object name. Both are accepted so no data
 * migration is needed.
 */
export const extractObjectName = (stored: string | null | undefined): string | null => {
    if (!stored || stored === IMAGE_DELETED) return null;

    // Bare object name (no path separators) -- use as-is.
    if (!stored.includes('/')) return decodeURIComponent(stored.split('?')[0]);

    let name = stored.split('/').pop() || '';
    name = name.split('?')[0];          // drop any query string (?token=...)
    if (!name) return null;

    try {
        return decodeURIComponent(name);
    } catch {
        return name;                    // malformed escape sequence -- take it raw
    }
};

/**
 * Mints a short-lived signed URL for a damage-evidence image.
 *
 * The bucket is private (supabase/migrations/20260719_04_storage.sql), so
 * getPublicUrl() no longer resolves. Returns null when there is nothing to
 * show, so callers can render their "no evidence" state.
 *
 * `ttlSeconds` defaults to the on-screen hour. Only the CSV export passes
 * anything else -- see CSV_EVIDENCE_URL_TTL_SECONDS above for why a file needs
 * a different number from a rendered <img>.
 */
export const getEvidenceSignedUrl = async (
    stored: string | null | undefined,
    ttlSeconds: number = SIGNED_URL_TTL_SECONDS,
): Promise<string | null> => {
    const objectName = extractObjectName(stored);
    if (!objectName) return null;

    const { data, error } = await supabase
        .storage
        .from(DAMAGE_BUCKET)
        .createSignedUrl(objectName, ttlSeconds);

    if (error) {
        console.error('[storage] Failed to sign evidence URL', objectName, error);
        return null;
    }

    return data?.signedUrl ?? null;
};

/**
 * Batch variant. Signing is one network round-trip per object, so views that
 * render many rows (TransactionTable, PalletDetailModal) should sign once for
 * the whole page rather than per-cell.
 *
 * Returns a map keyed by the ORIGINAL stored value, so callers can look up
 * using the field they already hold.
 *
 * The filter on the way in is what keeps the round-trip count honest: rows with
 * no evidence, and rows whose image was deleted, never reach the network at all.
 */
export const getEvidenceSignedUrlMap = async (
    storedValues: (string | null | undefined)[],
    ttlSeconds?: number,
): Promise<Record<string, string>> => {
    const unique = Array.from(
        new Set(storedValues.filter((v): v is string => !!v && v !== IMAGE_DELETED))
    );

    const entries = await Promise.all(
        unique.map(async (stored) => {
            const url = await getEvidenceSignedUrl(stored, ttlSeconds);
            return url ? ([stored, url] as const) : null;
        })
    );

    return entries.reduce<Record<string, string>>((acc, entry) => {
        if (entry) acc[entry[0]] = entry[1];
        return acc;
    }, {});
};

// เพดานเดียวกับ PAGE_SIZE/MAX_PAGES ใน transactionService และด้วยเหตุผลเดียวกัน:
// PostgREST ตัดผลลัพธ์ที่ db.max_rows เงียบ ๆ ไม่มี error ไม่มีสัญญาณอะไรเลย
const EVIDENCE_PAGE_SIZE = 1000;
const EVIDENCE_MAX_PAGES = 100;

type EvidenceRow = { evidence_image_url: string | null };

/**
 * ไล่อ่าน evidence_image_url ทีละหน้าจนครบ
 *
 * รับ "วิธีขอหนึ่งหน้า" มาแทนที่จะรับเงื่อนไข เพราะเงื่อนไขของแต่ละคนเรียกไม่เหมือนกัน
 * (ตามพาเลท / ตามวันที่) แต่สิ่งที่ต้องไม่ผิดคือการไล่หน้า -- อ่านรายชื่อไฟล์ไม่ครบ
 * แล้วเดินหน้าลบแถวต่อ คือการสร้างไฟล์กำพร้าด้วยมือตัวเอง เขียนซ้ำสองที่เมื่อไหร่ก็
 * มีที่หนึ่งที่ลืมไล่หน้าเมื่อนั้น
 */
const collectEvidence = async (
    caller: string,
    fetchPage: (
        from: number,
        to: number,
    ) => PromiseLike<{ data: EvidenceRow[] | null; error: unknown }>,
): Promise<string[]> => {
    const values: string[] = [];
    let offset = 0;

    for (let page = 0; page < EVIDENCE_MAX_PAGES; page++) {
        const { data, error } = await fetchPage(offset, offset + EVIDENCE_PAGE_SIZE - 1);
        if (error) throw error;

        const batch = data ?? [];
        // offset เดินตามจำนวนแถวที่ได้มาจริง ไม่ใช่จำนวนค่าที่เก็บเข้า values --
        // ถ้ามีแถวที่เป็นสตริงว่างหลุดมา สองตัวนี้จะไม่เท่ากันแล้วหน้าถัดไปเลื่อนผิด
        offset += batch.length;
        for (const row of batch) {
            if (row.evidence_image_url) values.push(row.evidence_image_url);
        }

        if (batch.length < EVIDENCE_PAGE_SIZE) return values;
    }

    console.warn(`[${caller}] Stopped at the ${EVIDENCE_MAX_PAGES}-page guard with ${values.length} evidence rows. Some images may be left behind.`);
    return values;
};

/**
 * รูปหลักฐานทั้งหมดของแถวที่เก่ากว่า cutoff -- ให้ cleanupOldData() ใช้
 *
 * กรอง null ตั้งแต่ในคำขอ เพราะแถวส่วนใหญ่ไม่มีรูป (เบิกออก/รับคืนไม่แนบหลักฐาน)
 * จำนวนหน้าที่ต้องไล่จึงเท่ากับจำนวน "แถวที่มีรูป" ไม่ใช่จำนวนแถวเก่าทั้งหมด
 */
export const collectEvidenceOlderThan = (cutoffIso: string): Promise<string[]> =>
    collectEvidence('collectEvidenceOlderThan', (from, to) =>
        supabase
            .from('transactions')
            .select('evidence_image_url')
            .not('evidence_image_url', 'is', null)
            .lt('timestamp', cutoffIso)
            // เรียงด้วยคีย์หลักเพื่อให้การไล่หน้าไม่คืนแถวซ้ำหรือข้ามแถว
            .order('id', { ascending: true })
            .range(from, to),
    );

/**
 * รูปหลักฐานทั้งหมดของพาเลทหนึ่งใบ -- ให้ deletePallet() ใช้
 *
 * ต้องมีเพราะ transactions.pallet_id เป็น ON DELETE CASCADE: การลบพาเลทหนึ่งแถว
 * ทำให้ Postgres ลบประวัติทั้งหมดของมันทิ้งเองในระดับฐานข้อมูล โดยที่โค้ดฝั่งแอป
 * ไม่เคยเห็นแถวเหล่านั้นเลยสักแถว ไฟล์ในถังจึงไม่มีใครลบและไม่มีใครรู้ด้วยซ้ำว่า
 * มันเคยเป็นของแถวไหน -- ต้องอ่านชื่อไฟล์เก็บไว้ก่อน cascade จะทำงาน
 */
export const collectEvidenceForPallet = (palletId: string): Promise<string[]> =>
    collectEvidence('collectEvidenceForPallet', (from, to) =>
        supabase
            .from('transactions')
            .select('evidence_image_url')
            .not('evidence_image_url', 'is', null)
            .eq('pallet_id', palletId)
            .order('id', { ascending: true })
            .range(from, to),
    );

/**
 * ลบไฟล์หลักฐานออกจากถังตามค่าที่เก็บอยู่ใน transactions.evidence_image_url
 *
 * รับค่าดิบทั้งก้อนได้เลย ทั้ง null, sentinel `image_deleted` และ URL เต็มแบบเก่า
 * -- extractObjectName คัดให้เอง คนเรียกจึงไม่ต้องกรองซ้ำอีกชั้น
 *
 * ตัดค่าซ้ำก่อนส่ง เพราะสองแถวชี้ไปไฟล์เดียวกันได้ (แถวหนึ่งเก็บ URL เต็มแบบเก่า
 * อีกแถวเก็บชื่อไฟล์เปล่า) การส่งชื่อซ้ำในคำขอเดียวไม่พัง แต่ทำให้จำนวนที่รายงาน
 * กลับไปเกินจริง
 *
 * โยน error ต่อ ไม่กลืน: คนเรียกทุกคนกำลังจะลบแถวที่ชี้มาหาไฟล์เหล่านี้ทิ้งต่อจากนี้
 * ถ้าลบไฟล์ไม่สำเร็จแล้วยังลบแถวต่อ ไฟล์นั้นจะไม่มีอะไรอ้างถึงอีกเลยตลอดกาล และ
 * หาไม่เจอด้วยซ้ำว่ามันเคยเป็นของแถวไหน -- นี่คือรูปแบบการรั่วที่ทำให้พื้นที่เก็บ
 * โตทางเดียวไม่มีวันลด ซึ่งเป็นเรื่องคอขาดบาดตายเมื่อโควตาทั้งโปรเจคมี 50MB
 */
export const removeEvidenceObjects = async (
    storedValues: (string | null | undefined)[],
): Promise<number> => {
    const names = Array.from(
        new Set(
            storedValues.map(extractObjectName).filter((name): name is string => name !== null),
        ),
    );

    if (names.length === 0) return 0;

    let removed = 0;
    for (let i = 0; i < names.length; i += REMOVE_BATCH_SIZE) {
        const batch = names.slice(i, i + REMOVE_BATCH_SIZE);
        const { data, error } = await supabase.storage.from(DAMAGE_BUCKET).remove(batch);
        if (error) throw error;
        // นับจากสิ่งที่เซิร์ฟเวอร์บอกว่าลบไปจริง ไม่ใช่ batch.length -- ไฟล์ที่หายไป
        // ก่อนหน้าแล้วจะไม่อยู่ในคำตอบ การนับมันด้วยคือการรายงานเกินจริง
        removed += data?.length ?? 0;
    }
    return removed;
};
