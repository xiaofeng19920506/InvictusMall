"use client";

import { useRouter } from "next/navigation";

interface AddressAddButtonProps {
  href: string;
  label?: string;
}

export default function AddressAddButton({
  href,
  label = "+ Add Address",
}: AddressAddButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    router.push(href, { scroll: false });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600 transition-colors cursor-pointer"
    >
      {label}
    </button>
  );
}


