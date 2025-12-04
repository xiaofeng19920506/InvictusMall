import Link from "next/link";
import styles from "./ProfileNavigationTabs.module.scss";

interface ProfileNavigationTabsProps {
  activeTab: "profile" | "password" | "addresses";
}

export default function ProfileNavigationTabs({ activeTab }: ProfileNavigationTabsProps) {
  return (
    <div className={styles.container}>
      <nav className={styles.nav}>
        <Link
          href="/profile?tab=profile"
          className={`${styles.tab} ${
            activeTab === "profile" ? styles.active : styles.inactive
          }`}
        >
          Profile
        </Link>
        <Link
          href="/profile?tab=password"
          className={`${styles.tab} ${
            activeTab === "password" ? styles.active : styles.inactive
          }`}
        >
          Password
        </Link>
        <Link
          href="/profile?tab=addresses"
          className={`${styles.tab} ${
            activeTab === "addresses" ? styles.active : styles.inactive
          }`}
        >
          Addresses
        </Link>
      </nav>
    </div>
  );
}

