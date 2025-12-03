import Link from "next/link";
import styles from "./ProfileSidebar.module.scss";

interface ProfileSidebarProps {
  activeTab: "account" | "profile" | "password" | "addresses";
  searchParams?: Record<string, string | string[] | undefined>;
}

export default function ProfileSidebar({ 
  activeTab,
  searchParams = {}
}: ProfileSidebarProps) {
  // Build URLs while preserving other query parameters (like edit, showAdd, etc.)
  // but removing feedback-related params when switching tabs
  const buildUrl = (tab: string) => {
    const params = new URLSearchParams();
    
    // Set the tab parameter
    params.set("tab", tab);
    
    // Preserve other relevant parameters (edit, showAdd) but exclude status/message
    Object.entries(searchParams).forEach(([key, value]) => {
      if (key !== "tab" && key !== "status" && key !== "message" && value) {
        if (Array.isArray(value)) {
          value.forEach(v => params.append(key, v));
        } else {
          params.set(key, value);
        }
      }
    });
    
    return `/profile?${params.toString()}`;
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        <h2 className={styles.sidebarTitle}>My Account</h2>
      </div>
      <nav className={styles.nav}>
        <Link
          href={buildUrl("account")}
          className={`${styles.navItem} ${
            activeTab === "account" ? styles.active : ""
          }`}
        >
          Account Info
        </Link>
        <Link
          href={buildUrl("profile")}
          className={`${styles.navItem} ${
            activeTab === "profile" ? styles.active : ""
          }`}
        >
          Profile
        </Link>
        <Link
          href={buildUrl("password")}
          className={`${styles.navItem} ${
            activeTab === "password" ? styles.active : ""
          }`}
        >
          Password
        </Link>
        <Link
          href={buildUrl("addresses")}
          className={`${styles.navItem} ${
            activeTab === "addresses" ? styles.active : ""
          }`}
        >
          Addresses
        </Link>
      </nav>
    </aside>
  );
}

