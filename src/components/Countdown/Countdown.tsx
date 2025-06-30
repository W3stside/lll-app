import { useState, useEffect } from "react";

export interface ICountdown {
  children?: React.ReactNode;
  target: Date;
}

export function Countdown({ target }: ICountdown) {
  const [now, setNow] = useState<number | undefined>();

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [target]);

  if (now === undefined) return null;

  const milliseconds = target.getTime() - now;
  const hours = Math.floor(milliseconds / 60 / 60 / 1000);
  const minutes = Math.floor((milliseconds / 60 / 1000) % 60);
  const seconds = Math.floor((milliseconds / 1000) % 60);

  return (
    <>
      {hours.toFixed()} hours, {minutes.toFixed()} minutes and{" "}
      {seconds.toFixed()} seconds
    </>
  );
}
