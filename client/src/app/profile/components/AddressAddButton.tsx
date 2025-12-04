import Link from "next/link";
import styles from "./AddressAddButton.module.scss";

interface AddressAddButtonProps {
  href: string;
  label?: string;
}

export default function AddressAddButton({
  href,
  label = "+ Add Address",
}: AddressAddButtonProps) {
  return (
    <Link
      href={href}
      className={styles.button}
      scroll={false}
    >
      {label}
    </Link>
  );
}


