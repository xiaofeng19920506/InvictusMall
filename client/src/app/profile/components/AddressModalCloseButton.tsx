import Link from "next/link";
import styles from "./AddressModalCloseButton.module.scss";

interface AddressModalCloseButtonProps {
  href: string;
  "aria-label"?: string;
}

export default function AddressModalCloseButton({
  href,
  "aria-label": ariaLabel = "Close",
}: AddressModalCloseButtonProps) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className={styles.button}
      scroll={false}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className={styles.icon}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
      </svg>
    </Link>
  );
}


