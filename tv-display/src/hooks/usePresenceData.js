import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
export function usePresenceData({ config }) {
    const socketRef = useRef(null);
    const [data, setData] = useState({
        present: 0,
        absent: 0,
        visitors: 0,
        divisions: [],
    });
    const [isConnected, setIsConnected] = useState(false);
    useEffect(() => {
        socketRef.current = io(config.wsUrl, {
            path: '/socket.io',
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: Infinity,
        });
        socketRef.current.on('connect', () => {
            setIsConnected(true);
            socketRef.current?.emit('subscribe_presence');
        });
        socketRef.current.on('disconnect', () => {
            setIsConnected(false);
        });
        socketRef.current.on('presence_update', (event) => {
            setData({
                present: event.present,
                absent: event.absent,
                visitors: event.visitors,
                divisions: event.divisions || [],
            });
        });
        return () => {
            socketRef.current?.disconnect();
        };
    }, [config.wsUrl]);
    return { data, isConnected };
}
