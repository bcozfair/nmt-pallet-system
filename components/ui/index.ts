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
