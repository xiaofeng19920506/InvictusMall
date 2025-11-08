'use client';

import { useFormStatus } from 'react-dom';

interface FormSubmitButtonProps {
  children: React.ReactNode;
  className?: string;
  pendingText?: string;
}

export default function FormSubmitButton({
  children,
  className = '',
  pendingText,
}: FormSubmitButtonProps) {
  const { pending } = useFormStatus();

  const combinedClassName = [
    className,
    pending ? 'opacity-60 cursor-not-allowed' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="submit"
      className={combinedClassName}
      disabled={pending}
    >
      {pending ? pendingText ?? children : children}
    </button>
  );
}

