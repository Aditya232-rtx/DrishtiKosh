import { useState } from 'react';
import api from '@/lib/api';

export function useChat() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const sendMessage = async (userId: string, message: string) => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.post('/chat', {
                user_id: userId,
                message: message,
            });
            return response.data.response;
        } catch (err) {
            console.error("Chat error:", err);
            setError("Failed to get response");
            return null;
        } finally {
            setLoading(false);
        }
    };

    return { sendMessage, loading, error };
}
