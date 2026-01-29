'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface PinInputProps {
  onSubmit: (pin: string) => void;
  onBack: () => void;
}

export function PinInput({ onSubmit, onBack }: PinInputProps) {
  const [pin, setPin] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (pin.length >= 4) {
      onSubmit(pin);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <fieldset className="fieldset">
        <legend className="fieldset-legend">Enter Your PIN</legend>
        <Input
          id="pin"
          type="password"
          placeholder="****"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          maxLength={6}
          autoFocus
        />
      </fieldset>
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button type="submit" disabled={pin.length < 4} className="flex-1">
          Sign In
        </Button>
      </div>
    </form>
  );
}
