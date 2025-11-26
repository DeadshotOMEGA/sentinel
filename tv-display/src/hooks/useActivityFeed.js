import { useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
const MAX_ACTIVITIES = 10;
export function useActivityFeed(config) {
    const [activities, setActivities] = useState([]);
    const [isConnected, setIsConnected] = useState(false);
    const addActivity = useCallback((activity) => {
        setActivities((prev) => {
            const updated = [activity, ...prev];
            return updated.slice(0, MAX_ACTIVITIES);
        });
    }, []);
    useEffect(() => {
        const socket = io(config.wsUrl, {
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: Infinity,
        });
        socket.on('connect', () => {
            setIsConnected(true);
            socket.emit('subscribe_activity');
        });
        socket.on('disconnect', () => {
            setIsConnected(false);
        });
        socket.on('checkin', (data) => {
            const activity = {
                id: `${data.memberId}-${data.timestamp}`,
                type: data.direction === 'in' ? 'checkin' : 'checkout',
                name: data.memberName,
                rank: data.rank,
                division: data.division,
                timestamp: data.timestamp,
            };
            addActivity(activity);
        });
        socket.on('visitor_signin', (data) => {
            const activity = {
                id: `visitor-${data.visitorId}-${data.checkInTime}`,
                type: 'visitor',
                name: data.name,
                timestamp: data.checkInTime,
            };
            addActivity(activity);
        });
        return () => {
            socket.disconnect();
        };
    }, [config.wsUrl, addActivity]);
    return { activities, isConnected };
}
