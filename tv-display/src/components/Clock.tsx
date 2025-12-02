import { useEffect, useState } from 'react';
import { format } from 'date-fns';

export function Clock() {
  const [time, setTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const timeString = format(time, 'HH:mm:ss');
  const dateString = format(time, 'EEEE, MMMM dd, yyyy');

  return (
    <div className="flex flex-col items-end gap-2" role="timer" aria-label="Current time and date" aria-live="off">
      <time className="font-mono text-8xl font-bold text-gray-900 leading-none" dateTime={time.toISOString()}>
        {timeString}
      </time>
      <time className="text-xl text-gray-600 font-medium" dateTime={time.toISOString().split('T')[0]}>
        {dateString}
      </time>
    </div>
  );
}
