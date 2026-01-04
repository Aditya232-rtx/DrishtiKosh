import { useState, useEffect } from 'react';

export interface User {
    id: string;
    name: string;
    type: string | null;
}

export function useAuth() {
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        // Priority: New Auth Keys -> Legacy Keys -> Generate New

        // 1. Check for authenticated user (from correct keys)
        const authId = localStorage.getItem('drishtikosh_user_id');
        const authName = localStorage.getItem('drishtikosh_user_name');
        const authType = localStorage.getItem('drishtikosh_user_type');

        if (authId) {
            setUser({
                id: authId,
                name: authName || "User",
                type: authType
            });
            return;
        }

        // 2. Fallback to legacy keys (for prototype / unmigrated state)
        let userId = localStorage.getItem('userId');
        if (!userId) {
            userId = crypto.randomUUID();
            localStorage.setItem('userId', userId);
        }

        const userName = localStorage.getItem('userName') || "Student User";
        const userType = localStorage.getItem('userType');

        setUser({
            id: userId,
            name: userName,
            type: userType
        });
    }, []);

    const logout = () => {
        localStorage.removeItem("userType");
        localStorage.removeItem("userId"); // Optional: Keep ID for returning user? Better to clear for "logout" simulation.
        window.location.href = "/";
    };

    return { user, logout };
}
