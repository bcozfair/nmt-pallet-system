// Shared presentational primitives for the dashboard.
//
// House rule for everything in this folder: none of these files import the
// dictionary. Every user-visible string arrives as a prop, which is what keeps
// them reusable across screens and keeps translation the caller's decision --
// the caller is the one that knows whether a label is a status, a period or a
// column heading.

export { Card, CARD_SHELL } from './Card';
export type { CardProps } from './Card';

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
