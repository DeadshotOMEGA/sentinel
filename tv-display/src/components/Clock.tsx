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
    <div className="flex flex-col items-end gap-2">
      <div className="font-mono text-8xl font-bold text-gray-900 leading-none">
        {timeString}
      </div>
      <div className="text-xl text-gray-600 font-medium">
        {dateString}
      </div>
    </div>
  );
}
