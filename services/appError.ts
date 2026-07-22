import { dict } from './i18n';

// Errors the services raise deliberately, as codes rather than prose.
//
// They used to be `throw new Error("Pallet P001 not found.")`. That reads fine
// until the UI around it is Thai: the screen then shows
// "บันทึกไม่สำเร็จ: Pallet P001 not found." -- half translated, and untranslatable
// after the fact because the text has already been flattened into a string.
//
// A code plus its parameters survives the trip to the UI intact, so the message
// can be built in whatever language is active when it is finally displayed.
export type AppErrorCode =
    | 'pallet_not_found'
    | 'pallet_exists'
    | 'pallet_already_scrapped'
    | 'pallet_not_damaged'
    | 'pallet_missing_for_checkout'
    | 'scrap_requires_user'
    | 'destination_required'
    | 'image_upload_failed'
    | 'delete_denied'
    | 'update_denied'
    // Partial success, not a plain failure: the account exists but is still a
    // staff account. Its own code because the caller must NOT wrap it in a
    // "could not create user" prefix -- that combination contradicted itself.
    | 'admin_promotion_failed';

interface AppErrorParams {
    palletId?: string;
    status?: string;
    reason?: string;
}

export class AppError extends Error {
    readonly code: AppErrorCode;
    readonly params: AppErrorParams;

    constructor(code: AppErrorCode, params: AppErrorParams = {}) {
        // The English form still goes into `message`, because that is what shows
        // up in console logs and stack traces -- the UI never reads it.
        super(`[${code}] ${JSON.stringify(params)}`);
        this.name = 'AppError';
        this.code = code;
        this.params = params;
    }
}

export const isAppError = (e: unknown): e is AppError =>
    e instanceof AppError;

// The single place an error becomes something a user reads. Call it wherever a
// catch block needs a display string.
//
// Anything that is not an AppError -- a Supabase/network/programming error --
// returns the generic message rather than its own English text. That is the same
// call translateAuthError() makes on the login screen: the real message is
// already on the console for whoever is debugging, and leaking an internal
// string into the UI is worse than saying "something went wrong" honestly.
export const describeAppError = (e: unknown): string => {
    const t = dict().errors;

    if (!isAppError(e)) return t.unknown;

    const { palletId = '-', status = '-', reason = '' } = e.params;

    switch (e.code) {
        case 'pallet_not_found': return t.palletNotFound(palletId);
        case 'pallet_exists': return t.palletExists(palletId);
        case 'pallet_already_scrapped': return t.palletAlreadyScrapped(palletId);
        case 'pallet_not_damaged': return t.palletNotDamaged(palletId, status);
        case 'pallet_missing_for_checkout': return t.palletMissingForCheckout(palletId);
        case 'scrap_requires_user': return t.scrapRequiresUser;
        case 'destination_required': return t.destinationRequired;
        case 'image_upload_failed': return t.imageUploadFailed(reason);
        case 'delete_denied': return t.deleteDenied;
        case 'update_denied': return t.updateDenied;
        case 'admin_promotion_failed': return t.adminPromotionFailed(reason);
    }
    // No default branch: AppErrorCode is a closed union, so adding a code without
    // handling it here is a compile error rather than a blank message.
};
