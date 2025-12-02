"use client";

import { useRouter } from "next/navigation";
import styles from "./AddressAddButton.module.scss";

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
      className={styles.button}
    >
      {label}
    </button>
  );
}


