import React from 'react';
import { LucideIcon } from 'lucide-react';

export type SettingsCardVariant = 'red' | 'yellow' | 'green' | 'blue' | 'purple' | 'gray';

interface SettingsCardProps {
    title: string;
    subtitle?: string;
    icon: LucideIcon;
    variant?: SettingsCardVariant;
    children: React.ReactNode;
    headerAction?: React.ReactNode;
}

const VARIANTS: Record<SettingsCardVariant, {
    border: string;
    headerBg: string; // Background of the header row
    headerBorder: string; // Border below header
    iconBg: string;
    iconColor: string;
}> = {
    red: {
        border: 'border-red-100',
        headerBg: 'bg-red-50/30',
        headerBorder: 'border-red-50',
        iconBg: 'bg-red-100',
        iconColor: 'text-red-600'
    },
    yellow: {
        border: 'border-yellow-100',
        headerBg: 'bg-yellow-50/30',
        headerBorder: 'border-yellow-50',
        iconBg: 'bg-yellow-100',
        iconColor: 'text-yellow-600'
    },
    green: {
        border: 'border-green-100',
        headerBg: 'bg-green-50/30',
        headerBorder: 'border-green-50',
        iconBg: 'bg-green-100',
        iconColor: 'text-green-600'
    },
    blue: {
        border: 'border-blue-100',
        headerBg: 'bg-blue-50/30',
        headerBorder: 'border-blue-50',
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600'
    },
    purple: {
        border: 'border-purple-100',
        headerBg: 'bg-purple-50/30',
        headerBorder: 'border-purple-50',
        iconBg: 'bg-purple-100',
        iconColor: 'text-purple-600'
    },
    gray: {
        border: 'border-gray-100',
        headerBg: 'bg-gray-50/30',
        headerBorder: 'border-gray-50',
        iconBg: 'bg-gray-100',
        iconColor: 'text-gray-600'
    }
};

export const SettingsCard: React.FC<SettingsCardProps> = ({
    title,
    subtitle,
    icon: Icon,
    variant = 'gray',
    children,
    headerAction
}) => {
    const styles = VARIANTS[variant];

    return (
        <div className={`bg-white rounded-xl shadow-sm border ${styles.border} overflow-hidden`}>
            <div className={`p-5 border-b ${styles.headerBorder} flex items-center justify-between ${styles.headerBg}`}>
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${styles.iconBg} ${styles.iconColor}`}>
                        <Icon size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800">{title}</h3>
                        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
                    </div>
                </div>
                {headerAction && <div>{headerAction}</div>}
            </div>
            <div className="p-5">
                {children}
            </div>
        </div>
    );
};
