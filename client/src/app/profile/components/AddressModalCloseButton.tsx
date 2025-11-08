"use client";

import { useRouter } from "next/navigation";

interface AddressModalCloseButtonProps {
  href: string;
  "aria-label"?: string;
}

export default function AddressModalCloseButton({
  href,
  "aria-label": ariaLabel = "Close",
}: AddressModalCloseButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    router.replace(href, { scroll: false });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={ariaLabel}
      className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="h-6 w-6"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
      </svg>
    </button>
  );
}


