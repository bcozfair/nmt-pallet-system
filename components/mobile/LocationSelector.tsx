import React from 'react';
import { MapPin, MapPinOff } from 'lucide-react';
import { Department } from '../../types';
import { useT } from '../../hooks/useT';
import { StaffHeader } from './StaffHeader';
import { ActionTile } from './ActionTile';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';

interface LocationSelectorProps {
    departments: Department[];
    isLoading: boolean;
    onSelect: (dept: Department) => void;
    onCancel: () => void;
}

export const LocationSelector = ({
    departments,
    isLoading,
    onSelect,
    onCancel,
}: LocationSelectorProps) => {
    const t = useT();

    return (
        <div className="app-canvas flex min-h-dvh flex-col">
            <StaffHeader title={t.location.selectDestination} onBack={onCancel} />

            <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 p-4">
                <p className="text-sm text-slate-500">{t.location.whereGoing}</p>

                {isLoading ? (
                    // แถวแรกถือ aria-label ไว้ ที่เหลือเป็น aria-hidden ในตัวมันเอง --
                    // กล่องเทาที่ไม่ประกาศตัวคือความเงียบสำหรับ screen reader
                    <div className="flex flex-col gap-3" role="status" aria-label={t.location.loading}>
                        {[0, 1, 2, 3].map(i => (
                            <Skeleton key={i} className="h-[4.75rem] rounded-3xl" />
                        ))}
                    </div>
                ) : departments.length === 0 ? (
                    <EmptyState
                        icon={MapPinOff}
                        title={t.location.emptyTitle}
                        hint={t.location.emptyHint}
                    />
                ) : (
                    <div className="flex flex-col gap-3">
                        {departments.map(dept => (
                            // ไม่ส่ง subtitle: ชื่อสถานที่พูดครบแล้ว การเติมคำว่า
                            // "สถานที่" ใต้ชื่อสถานที่ทุกแถวคือเสียงรบกวน
                            <ActionTile
                                key={dept.id}
                                icon={MapPin}
                                title={dept.name}
                                tone="brand"
                                layout="row"
                                onClick={() => onSelect(dept)}
                            />
                        ))}
                    </div>
                )}

                <Button variant="secondary" size="lg" onClick={onCancel} className="mt-auto w-full">
                    {t.common.cancel}
                </Button>
            </main>
        </div>
    );
};
