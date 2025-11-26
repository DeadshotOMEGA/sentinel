import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
export function Clock() {
    const [time, setTime] = useState(new Date());
    useEffect(() => {
        const timer = setInterval(() => {
            setTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);
    const timeString = format(time, 'HH:mm:ss');
    const dateString = format(time, 'EEEE, MMMM dd, yyyy');
    return (_jsxs("div", { className: "flex flex-col items-end gap-2", children: [_jsx("div", { className: "font-mono text-8xl font-bold text-gray-900 leading-none", children: timeString }), _jsx("div", { className: "text-xl text-gray-600 font-medium", children: dateString })] }));
}
