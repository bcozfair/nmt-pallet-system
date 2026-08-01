// Shared presentational primitives for the dashboard.
//
// House rule for everything in this folder: none of these files import the
// dictionary. Every user-visible string arrives as a prop, which is what keeps
// them reusable across screens and keeps translation the caller's decision --
// the caller is the one that knows whether a label is a status, a period or a
// column heading.

export { Card, CARD_SHELL, CARD_SURFACE, CARD_SURFACE_DANGER, BrandHairline } from './Card';
export type { CardProps, CardTone } from './Card';

export { SectionHeader } from './SectionHeader';
export type { SectionHeaderProps } from './SectionHeader';

export { StatTile, STAT_TILE_BOX } from './StatTile';
export type { StatTileProps, StatTone } from './StatTile';

export { Skeleton, SkeletonText, SkeletonTile, SkeletonChart, SkeletonRows, SkeletonCard } from './Skeleton';
export type {
    SkeletonProps,
    SkeletonTextProps,
    SkeletonTileProps,
    SkeletonChartProps,
    SkeletonRowsProps,
    SkeletonCardProps,
} from './Skeleton';

export { ChartFrame } from './ChartFrame';
export type { ChartFrameProps } from './ChartFrame';

export { SegmentedControl } from './SegmentedControl';
export type { SegmentedControlProps } from './SegmentedControl';

export { EmptyState } from './EmptyState';
export type { EmptyStateProps } from './EmptyState';

export { DataTableView } from './DataTableView';
export type { DataTableViewProps } from './DataTableView';

// --- Shared admin-screen primitives -------------------------------------
// Everything below is used by more than one screen. The inventory rework is
// the first consumer; transactions, users, locations and settings migrate onto
// them next, which is why their APIs take every string as a prop rather than
// reaching for the dictionary.

export { Button, BUTTON_BASE, BUTTON_SIZE, BUTTON_VARIANT } from './Button';
export type { ButtonProps, ButtonVariant } from './Button';

export { Checkbox } from './Checkbox';
export type { CheckboxProps } from './Checkbox';

export { ToggleChip } from './ToggleChip';
export type { ToggleChipProps } from './ToggleChip';

export { SearchInput } from './SearchInput';
export type { SearchInputProps } from './SearchInput';

export { SelectField } from './SelectField';
export type { SelectFieldOption, SelectFieldProps } from './SelectField';

export { DateRangeField } from './DateRangeField';
export type { DateRange, DateRangeFieldProps } from './DateRangeField';

export { Menu } from './Menu';
export type { MenuItem, MenuProps, MenuTone } from './Menu';

export { PrintMenu } from './PrintMenu';
export type { PrintMenuProps } from './PrintMenu';

// `DataTable` is the shell -- card, scroll behaviour, sticky header, loading and
// empty states, a slot for pagination. It deliberately does NOT take columns and
// rows: the four tables it is meant for render badges, evidence thumbnails and
// different action sets per row, so a config-driven API would be harder to read
// than the JSX it replaced. Callers write their own <tbody>.
// Not to be confused with `DataTableView` above, which is the collapsed text
// alternative that sits under a chart.
export { DataTable, SortableTh } from './DataTable';
export type { DataTableProps, SortableThProps, SortState } from './DataTable';

export { FilterBar } from './FilterBar';
export type { FilterBarProps } from './FilterBar';

export { PageHeader } from './PageHeader';
export type { PageHeaderProps } from './PageHeader';

// PrintReportHeader was the paper counterpart of PageHeader -- `hidden
// print:block`, so that a screen printing itself in place had something on the
// sheet saying what the sheet was. No screen prints itself in place any more:
// all three build a real A4 document (components/report/), and a document's
// masthead belongs to the document, where it can also declare its own height and
// let the pages be paginated against it.

export { SelectionBar } from './SelectionBar';
export type { SelectionBarProps } from './SelectionBar';

export { StickyHeader } from './StickyHeader';
export type { StickyHeaderProps } from './StickyHeader';

export { Modal, MODAL_PANEL } from './Modal';
export type { ModalProps, ModalSize, ModalTone } from './Modal';

export { Field } from './Field';
export type { FieldProps, FieldControlProps } from './Field';

export { TextInput } from './TextInput';
export type { TextInputProps } from './TextInput';

export { TextArea } from './TextArea';
export type { TextAreaProps } from './TextArea';

export { ConfirmDialog } from './ConfirmDialog';
export type { ConfirmDialogProps } from './ConfirmDialog';
