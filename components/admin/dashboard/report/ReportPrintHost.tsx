import React from 'react';
import { createPortal } from 'react-dom';

import { DashboardReport } from './DashboardReport';
import type { DashboardReportProps } from './DashboardReport';

// Where the report lives while it is being printed: a direct child of <body>,
// invisible on screen, and the only thing on the paper.
//
// A PORTAL, and not a `hidden print:block` div left inside the dashboard, for
// one reason. The print rules in index.css hide everything under <body> except
// this container -- `body > *:not(.report-document)`. That selector can only be
// written against a direct child of <body>, and a report rendered inside the
// dashboard's own tree would be hidden along with it.
//
// It is mounted only while printing. Fifteen figures is not free to build, and
// an admin who never presses the button should not pay for it on every load of
// the screen.
export const ReportPrintHost: React.FC<DashboardReportProps> = (props) =>
    createPortal(
        <div className="report-document">
            <DashboardReport {...props} />
        </div>,
        document.body,
    );
