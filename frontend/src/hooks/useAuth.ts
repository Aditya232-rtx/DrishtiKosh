import { useState, useEffect } from 'react';

export interface User {
    id: string;
    name: string;
    type: string | null;
}

export function useAuth() {
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        // Basic ID generation for prototype isolation
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
