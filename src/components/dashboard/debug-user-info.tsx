 'use client';

import { useAuth } from '@/hooks/use-auth';

export default function DebugUserInfo() {
    const { user } = useAuth();

    return (
        <div className="mt-4 p-4 border bg-secondary/50">
            <h3 className="font-bold">Debug Info: Current User</h3>
            <pre className="text-xs whitespace-pre-wrap">
                {JSON.stringify(user, null, 2)}
            </pre>
        </div>
    );
}