import { ActionType, PalletStatus, Role } from '../types';
import {
    dashboardEn,
    inventoryEn,
    transactionsEn,
    usersEn,
    locationsEn,
    settingsEn,
    modalsEn,
} from './admin';

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

    // The shared vocabulary. Everything below is wording that recurs across
    // several screens, and it lives here so the admin modules cannot drift into
    // three different Thai renderings of "Save". Reach for a key here before
    // adding one to a feature module.
    common: {
        // Actions
        save: 'Save',
        saving: 'Saving...',
        cancel: 'Cancel',
        delete: 'Delete',
        edit: 'Edit',
        close: 'Close',
        // แยกจาก `close` ข้างบน: อันนั้นเป็นป้ายบนปุ่มที่คนเห็น ส่วนอันนี้เป็น
        // aria-label ของกากบาทมุมโมดัล ซึ่งไม่มีข้อความให้อ่าน "Close" เฉย ๆ
        // ในบริบทนั้นกำกวมว่าปิดอะไร
        closeDialog: 'Close dialog',
        confirm: 'Confirm',
        add: 'Add',
        search: 'Search',
        export: 'Export',
        print: 'Print',
        download: 'Download',
        refresh: 'Refresh',
        retry: 'Try Again',
        back: 'Back',
        view: 'View',
        apply: 'Apply',
        clearFilters: 'Clear Filters',

        // States
        loading: 'Loading...',
        // แยกจาก `loading` ข้างบน: อันนั้นคือ "กำลังอ่านข้อมูล" ส่วนอันนี้คือ
        // "มีคำขอเขียนค้างอยู่" (ConfirmDialog ใช้ตอนปุ่มยืนยันกำลังทำงาน) -- ใช้
        // `loading` ผิดที่ทำให้ปุ่มลบขึ้นว่า "กำลังโหลด..." ซึ่งไม่ตรงกับสิ่งที่
        // เกิดขึ้นเลย
        working: 'Working...',
        showPassword: 'Show password',
        hidePassword: 'Hide password',
        noData: 'No data found',
        error: 'Error:',
        required: 'Required',
        popupBlocked: 'Popups are blocked. Please allow popups for this site to print.',

        // --- Printing -------------------------------------------------------
        // The label on the one print button all three printable screens carry
        // (dashboard, inventory, transactions), which is why it sits in `common`
        // rather than under one feature area.
        //
        // `printLandscape` and `printPortrait` used to sit beside it, for a
        // dropdown offering the sheet's orientation. Every report is A4 portrait
        // now -- see REPORT_ORIENTATION in components/report/useReportPrint.ts --
        // so there is one outcome and one button.
        printReport: 'Print Report',
        // The export control, on all three screens that have one. It was three
        // separate keys saying three things -- "Export Data" on the dashboard,
        // "Export List" on inventory, "Export CSV" on transactions -- for a
        // button that does the same job in the same place in the same header.
        // A reader should not have to work out that they are the same control.
        exportData: 'Export Data',
        // Prefixes the filter conditions on the printed sheet, so a filtered
        // report cannot be mistaken for the whole data set.
        printFilters: 'Filters:',
        // The masthead's timestamp, on all three A4 reports. It used to sit under
        // `dashboard`, which meant the inventory and transaction screens reached
        // into another feature's block to say when their own sheet was made --
        // the one thing the note at the top of every locale file forbids.
        generatedOn: (when: string) => `Generated on ${when}`,
        // The foot of every sheet, and its accessible name. Shared for the same
        // reason: three reports, one way of numbering a page.
        pageOf: (page: number, total: number) => `Page ${page} of ${total}`,

        // Recurring labels and table headers
        actions: 'Actions',
        all: 'All',
        status: 'Status',
        location: 'Location',
        department: 'Department',
        date: 'Date',
        time: 'Time',
        user: 'User',
        remark: 'Remark',
        palletId: 'Pallet ID',
        total: 'Total',
        active: 'Active',
        inactive: 'Inactive',
    },

    // CSV exports. Lives in the core dictionary rather than under a feature area
    // because utils/exportHelpers.ts is shared by inventory and transactions.
    csv: {
        preparingInventory: 'Preparing inventory report...',
        inventoryDone: (count: number) => `Exported ${count} inventory items.`,
        preparingHistory: 'Preparing full history export...',
        historyDone: (count: number) => `Exported ${count} records successfully.`,
        exportFailed: (reason: string) => `Export failed: ${reason}`,
        warehouse: 'Warehouse',
        header: {
            palletId: 'Pallet ID',
            status: 'Status',
            currentLocation: 'Current Location',
            responsiblePerson: 'Responsible Person',
            lastAction: 'Last Action',
            lastActivityDate: 'Last Activity Date',
            daysOverdue: 'Days Overdue',
            dateAdded: 'Date Added',
            evidenceFile: 'Evidence File',
            date: 'Date',
            time: 'Time',
            // The time halves of the three date columns above.
            //
            // Separate columns rather than one "21-Jul-2026 14:30" cell: a
            // spreadsheet reads a combined value as text, so it sorts
            // alphabetically and cannot be filtered by hour. Split, the date
            // column stays sortable and the time column answers "which shift
            // recorded this" -- which is what the committee asked for. The
            // database has held the time all along; only the export dropped it.
            timeAdded: 'Time Added',
            lastActivityTime: 'Last Activity Time',
            lastCheckoutDate: 'Last Checkout Date',
            lastCheckoutTime: 'Last Checkout Time',
            // Not `evidenceFile`: that column held a bare storage object name,
            // which nobody outside this codebase can turn into a picture. This
            // one holds a signed URL that opens the image in a browser.
            evidenceLink: 'Evidence Link',
            actionType: 'Action Type',
            performedBy: 'Performed By',
            locationDest: 'Location/Destination',
        },
    },

    // Rendered by services/appError.ts. Every deliberate service-layer failure
    // resolves to exactly one of these; anything else falls back to `unknown`
    // rather than surfacing an internal English string.
    errors: {
        unknown: 'Something went wrong. Please try again.',
        palletNotFound: (palletId: string) => `Pallet ${palletId} not found.`,
        palletExists: (palletId: string) => `Pallet ID ${palletId} already exists.`,
        palletAlreadyScrapped: (palletId: string) => `Pallet ${palletId} has already been scrapped.`,
        palletNotDamaged: (palletId: string, status: string) =>
            `Pallet ${palletId} must be reported as damaged before it can be scrapped (it is currently ${status}).`,
        palletMissingForCheckout: (palletId: string) =>
            `Pallet ${palletId} not found. Add it in Inventory before checking it out.`,
        scrapRequiresUser: 'Cannot scrap a pallet without a signed-in user to attribute it to.',
        destinationRequired: 'A destination is required to check out a pallet.',
        imageUploadFailed: (reason: string) => `Image upload failed: ${reason}`,
        deleteDenied: 'Could not delete: the item no longer exists, or you do not have permission.',
        updateDenied: 'Could not save: the user no longer exists, or you do not have permission.',
        // Must keep saying the account exists. An admin who reads this as a plain
        // failure will try again and hit "employee ID already taken".
        adminPromotionFailed: (reason: string) =>
            `The account was created, but it is still a staff account -- granting admin rights failed (${reason}). Change the role from the user list.`,
    },

    // Returned by services/reportService.ts and rendered verbatim by the
    // settings screen. Core rather than per-area for the same reason as csv:
    // the service is shared and cannot reach a feature module's dictionary.
    report: {
        notConfigured: 'Supabase URL is not configured.',
        notSignedIn: 'Not signed in.',
        sendFailed: (reason: string) => `Failed to send report: ${reason}`,
        sentOverdue: 'Sent Overdue Report',
        sentSummary: 'Sent Summary Report',
    },

    nav: {
        menu: 'Menu',
        system: 'System',
        dashboard: 'Dashboard',
        inventory: 'Inventory',
        transactions: 'Transactions',
        users: 'Users',
        locations: 'Locations',
        settings: 'Settings',
        signOut: 'Sign Out',
    },

    // Roles are a closed set in types.ts, so the same completeness check that
    // guards status and action applies here.
    role: {
        admin: 'Admin',
        staff: 'Staff',
    } satisfies Record<Role, string>,

    pagination: {
        firstPage: 'First Page',
        prevPage: 'Previous Page',
        nextPage: 'Next Page',
        lastPage: 'Last Page',
        page: 'Page',
        ofTotal: (total: number) => `of ${total}`,
        showing: (from: number, to: number, total: number) =>
            `Showing ${from} to ${to} of ${total} items`,
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
        // Sits under the wordmark, so it names the product without repeating
        // "NMT" -- the mark above it has already said that.
        brandTagline: 'Pallet Management System',
        title: 'Sign in',
        subtitle: 'Enter your employee ID and password to continue.',
        recoveryTitle: 'Reset your password',
        recoverySubtitle: 'Enter your employee ID to start a password reset.',
        // The field still accepts an email -- signIn() only builds an alias
        // address when the input has no "@" in it. It is labelled by the one
        // thing every employee actually knows, rather than by both paths.
        identifierLabel: 'Employee ID',
        identifierPlaceholder: 'EMP001',
        passwordLabel: 'Password',
        capsLockOn: 'Caps Lock is on.',
        // Replaces the old "Remember me" hint. There is no such checkbox any
        // more -- saving the password is the browser's job -- so this is the
        // only place the session's actual lifetime is stated. Written as a
        // function so both numbers come from constants.ts.
        sessionNotice: (idleMinutes: number, maxHours: number) =>
            `You stay signed in until you close the browser, after ${idleMinutes} minutes without activity, or ${maxHours} hours at most.`,
        forgotPassword: 'Forgot password?',
        resetHint:
            'Reset links are delivered to the registered administrator mailbox. Staff should ask an administrator to reset their password.',
        // Says the same thing whether or not the account exists. Any translation
        // must keep that ambiguity -- naming the outcome precisely is exactly the
        // signal an account-enumeration attempt is looking for.
        resetSent:
            'If that ID belongs to an account, a reset link has been sent to the registered administrator mailbox. Contact your administrator if you do not receive it.',
        signIn: 'Sign in',
        // Names what the button does. It does not reset anything by itself --
        // it sends the link that lets the administrator do it.
        resetPassword: 'Send reset link',
        processing: 'Processing...',
        authorizedOnly: 'Authorized access only.',
        backToSignIn: 'Back to sign in',
        // Supabase raises its errors in English; services/authError.ts maps them
        // onto these. Anything it does not recognise falls back to
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
        samePassword: 'Your new password must be different from your current one.',
        weakPassword: 'That password does not meet the security requirements. Please choose one that is harder to guess.',
        linkExpired: 'This reset link has expired or has already been used. Please request a new one from the sign-in page.',
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
        closeScanner: 'Close scanner',
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
        removeItem: (id: string) => `Remove ${id} from list`,
    },

    location: {
        selectDestination: 'Select Destination',
        whereGoing: 'Where are the pallets going?',
        loading: 'Loading locations...',
        emptyTitle: 'No active locations',
        emptyHint: 'Ask an admin to activate a location first.',
    },

    damage: {
        titleFor: (palletId: string) => `Report Damage: ${palletId}`,
        uploadEvidence: 'Upload evidence photo',
        openCamera: 'Open Camera',
        removePhoto: 'Remove Photo',
        compressing: 'Compressing image...',
        // Shown when the photo is still too large after compression -- in
        // practice, when compression failed outright and the raw camera file is
        // several megabytes. Says what to do, because "too large" alone leaves
        // somebody standing in a warehouse with a broken pallet and no next step.
        tooLarge: 'This photo is too large to send. Please take it again in lower resolution.',
        submitting: 'Submitting...',
        submit: 'Submit Report',
        reported: (palletId: string) => `Damage reported for ${palletId}`,
        submitFailed: 'Failed to submit damage report',
        manualTitle: 'Report Damage',
        manualSubtitle: 'Scan QR code to identify pallet',
        manualHint: 'If the QR code is damaged or unreadable, you can enter the ID manually below.',
        idLabel: 'Pallet ID',
        idPlaceholder: 'e.g. P001',
        idHint: 'Use this when the QR code is torn or unreadable.',
    },

    history: {
        title: 'My History',
        searchPlaceholder: 'Search ID, Location...',
        searchAria: 'Search my history',
        filterAria: 'Filter by action type',
        allLocations: 'All Locations',
        recent: 'Recent',
        recentOnly: 'Recent',
        recentLast50: 'Recent (Last 50)',
        filterAll: 'All',
        filterOut: 'Out',
        filterIn: 'In',
        filterDamage: 'Damage',
        loading: 'Loading history...',
        empty: 'No transactions found',
        emptyHint: 'Try a different date or clear the filters.',
        clearFilters: 'Clear filters',
        to: 'To:',
        showing: (count: number) => `Showing ${count} items`,
    },

    // Admin modules live in locales/admin/*.ts, one file per feature area,
    // each holding both languages side by side. Split that way so the six areas
    // could be translated independently without fighting over one file -- and
    // because a translation is far easier to review with its original next to it.
    dashboard: dashboardEn,
    inventory: inventoryEn,
    transactions: transactionsEn,
    users: usersEn,
    locations: locationsEn,
    settings: settingsEn,
    modals: modalsEn,
};

// Every other locale is checked against this shape, so a key added here without
// a Thai counterpart fails `npm run typecheck` rather than rendering blank.
export type Dictionary = typeof en;
