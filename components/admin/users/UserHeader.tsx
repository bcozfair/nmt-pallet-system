import React from 'react';
import { UserPlus, Download, Users } from 'lucide-react';
import { useT } from '../../../hooks/useT';
import { Button, PageHeader } from '../../ui';

interface UserHeaderProps {
    onAddUser: () => void;
    onExport?: () => void; // Optional for now
}

export const UserHeader: React.FC<UserHeaderProps> = ({
    onAddUser,
    onExport,
}) => {
    const t = useT();

    return (
        <PageHeader
            title={t.users.title}
            subtitle={t.users.subtitle}
            icon={Users}
            actions={
                <>
                    {onExport && (
                        <Button variant="secondary" icon={Download} onClick={onExport}>
                            {t.users.exportList}
                        </Button>
                    )}
                    <Button variant="primary" icon={UserPlus} onClick={onAddUser}>
                        {t.users.addUser}
                    </Button>
                </>
            }
        />
    );
};
