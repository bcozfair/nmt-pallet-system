import { ActionType, PalletStatus } from '../types';

// The source of truth for every string the user can see.
//
// Deliberately NOT `as const`: the values must widen to `string` so th.ts can
// hold different text while still being checked against this shape. With
// `as const` every Thai string would have to equal its English literal.
//
// Strings that interpolate are written as functions rather than templates with
// placeholders. That is what makes the two languages checkable against each
// other -- forgetting the argument in th.ts is a compile error, whereas a
// missing "{count}" inside a plain string is not.
export const en = {
    app: {
        loadingSystem: 'Loading System...',
        loadingProfile: 'Loading Profile...',
    },

    common: {
        cancel: 'Cancel',
        error: 'Error:',
    },

    // Shared by every badge, chip, dropdown and CSV cell. 'unknown' is here
    // because StagedItem.status widens to it while a scan is still being
    // resolved -- without an entry the raw enum value leaked to the screen.
    status: {
        available: 'Available',
        in_use: 'In Use',
        damaged: 'Damaged',
        scrapped: 'Scrapped',
        unknown: 'Unknown',
    } satisfies Record<PalletStatus | 'unknown', string>,

    // `satisfies` rather than `as`: an assertion would happily accept a table
    // missing a status, which is the exact bug the old PALLET_STATUS_META typing
    // was written to prevent. This keeps that guarantee -- add a PalletStatus or
    // an ActionType and this file stops compiling until it is translated.
    action: {
        check_out: 'Check Out',
        check_in: 'Check In',
        report_damage: 'Report Damage',
        repair: 'Repaired',
        scrap: 'Scrapped',
    } satisfies Record<ActionType, string>,

    session: {
        expired: 'Your session has expired. Please sign in again.',
        idle: 'Signed out automatically due to inactivity.',
    },

    login: {
        title: 'NMT Pallet System',
        subtitle: 'Secure Access Portal',
        recoveryTitle: 'Password Recovery',
        recoverySubtitle: 'Enter your Employee ID or email',
        identifierLabel: 'Email or Employee ID',
        identifierPlaceholder: 'admin@nmt.com or EMP001',
        passwordLabel: 'Password',
        rememberMe: 'Remember me',
        rememberHint:
            'Stays signed in on this device for up to 12 hours. Leave it unchecked on a shared device: the session then ends as soon as you close the tab.',
        forgotPassword: 'Forgot Password?',
        resetHint:
            'Reset links are delivered to the registered administrator mailbox. Staff should ask an administrator to reset their password.',
        // Says the same thing whether or not the account exists. Any translation
        // must keep that ambiguity -- naming the outcome precisely is exactly the
        // signal an account-enumeration attempt is looking for.
        resetSent:
            'If that ID belongs to an account, a reset link has been sent to the registered administrator mailbox. Contact your administrator if you do not receive it.',
        signIn: 'Sign In',
        resetPassword: 'Reset Password',
        processing: 'Processing...',
        authorizedOnly: 'Authorized access only.',
        backToSignIn: 'Back to Sign In',
        // Supabase raises its errors in English. These cover the two a user can
        // actually trigger from this form; anything else falls back to
        // genericFailure rather than leaking an untranslated internal message.
        invalidCredentials: 'Incorrect employee ID or password.',
        tooManyAttempts: 'Too many attempts. Please wait a moment and try again.',
        genericFailure: 'Operation failed. Please check your credentials.',
    },

    resetPassword: {
        title: 'Set New Password',
        subtitle: 'Please create a new secure password for your account.',
        newPassword: 'New Password',
        confirmPassword: 'Confirm Password',
        passwordsMatch: 'Passwords match',
        passwordsDoNotMatch: 'Passwords do not match',
        tooShort: 'Password must be at least 6 characters long',
        updateFailed: 'Failed to update password.',
        updating: 'Updating...',
        submit: 'Reset Password',
        successTitle: 'Password Reset Successful',
        successBody: 'Your password has been updated. You will be redirected to the login page shortly.',
    },

    mobileHome: {
        checkOut: 'Check Out',
        checkOutSub: 'To Department',
        checkIn: 'Check In',
        checkInSub: 'Return to Warehouse',
        myHistory: 'My History',
        myHistorySub: 'View Recent Activity',
        reportDamage: 'Report Damage',
        reportDamageSub: 'Scan & Upload Evidence',
    },

    scanner: {
        scanning: 'Scanning...',
        alignQr: 'Align QR Code',
        cameraError: 'Camera access denied or error starting scanner.',
        addedToList: 'Added to List',
        actionFailed: 'Action Failed',
        continueScanning: 'CONTINUE SCANNING',
    },

    // Short by necessity: these render at text-4xl inside the full-screen
    // feedback overlay, so anything long wraps badly on a phone.
    scanError: {
        alreadyInList: 'Already in List',
        notFound: 'Pallet Not Found',
        scrapped: 'Pallet Scrapped',
        damaged: 'Pallet Damaged',
        alreadyScrapped: 'Already Scrapped',
        alreadyDamaged: 'Already Damaged',
        generic: 'Scan Error',
    },

    batch: {
        checkOutList: 'Check Out List',
        checkInList: 'Check In List',
        toDept: (name: string) => `To: ${name}`,
        returningToWarehouse: 'Returning to Warehouse',
        empty: 'Scan QR Codes to add items...',
        saving: 'Saving...',
        confirm: 'Confirm & Save',
        checkedOut: (count: number) => `Successfully Checked Out ${count} pallets.`,
        returned: (count: number) => `Successfully Returned ${count} pallets.`,
        failed: 'Error processing batch. Please try again.',
    },

    location: {
        selectDestination: 'Select Destination',
        whereGoing: 'Where are the pallets going?',
    },

    damage: {
        titleFor: (palletId: string) => `Report Damage: ${palletId}`,
        uploadEvidence: 'Upload evidence photo',
        openCamera: 'Open Camera',
        removePhoto: 'Remove Photo',
        compressing: 'Compressing image...',
        submitting: 'Submitting...',
        submit: 'Submit Report',
        reported: (palletId: string) => `Damage reported for ${palletId}`,
        submitFailed: 'Failed to submit damage report',
        manualTitle: 'Report Damage',
        manualSubtitle: 'Scan QR code to identify pallet',
        manualHint: 'If the QR code is damaged or unreadable, you can enter the ID manually below.',
        enterIdManually: 'Enter ID Manually',
        promptEnterId: 'Enter Pallet ID Manually (e.g., P001):',
    },

    history: {
        searchPlaceholder: 'Search ID, Location...',
        recent: 'Recent',
        recentOnly: 'Recent Only',
        recentLast50: 'Recent (Last 50)',
        filterAll: 'All',
        filterOut: 'Out',
        filterIn: 'In',
        filterDamage: 'Damage',
        loading: 'Loading history...',
        empty: 'No transactions found',
        clearFilters: 'Clear filters',
        to: 'To:',
        showing: (count: number) => `Showing ${count} items`,
    },
};

// Every other locale is checked against this shape, so a key added here without
// a Thai counterpart fails `npm run typecheck` rather than rendering blank.
export type Dictionary = typeof en;
