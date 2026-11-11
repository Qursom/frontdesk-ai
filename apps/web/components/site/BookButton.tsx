'use client';

import { ButtonHTMLAttributes } from 'react';
import { BOOKING_MESSAGE } from '@/lib/clinic-content';
import { openChat } from '@/lib/frontdesk';

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'type'> {
  message?: string;
}

/** Any control that opens the chat. Defaults to the booking message. */
export default function BookButton({ message = BOOKING_MESSAGE, className = 'btn btn-primary', children, ...rest }: Props) {
  return (
    <button type="button" className={className} onClick={() => openChat(message)} {...rest}>
      {children}
    </button>
  );
}
