import React from 'react';
import { createPortal } from 'react-dom';

// Where a report lives while it is being printed: a direct child of <body>,
// invisible on screen, and the only thing on the paper.
//
// A PORTAL, and not a `hidden print:block` div left inside the screen, for one
// reason. The print rules in index.css hide everything under <body> except this
// container -- `body > *:not(.report-document)`. That selector can only be
// written against a direct child of <body>, and a report rendered inside a
// screen's own tree would be hidden along with it.
//
// It is mounted only while printing. A report is not free to build -- fifteen
// figures for the dashboard, every filtered row for the two table screens -- and
// somebody who never presses the button should not pay for it on every load.
export const ReportPrintHost: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    createPortal(<div className="report-document">{children}</div>, document.body);
