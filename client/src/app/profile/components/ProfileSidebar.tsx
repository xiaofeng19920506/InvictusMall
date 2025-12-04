"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { ORDER_STATUS_FILTERS, type OrderStatusTabValue } from "../../orders/orderStatusConfig";
import styles from "./ProfileSidebar.module.scss";

interface ProfileSidebarProps {
  activeTab: "account" | "profile" | "password" | "addresses" | "orders";
  searchParams?: Record<string, string | string[] | undefined>;
}

export default function ProfileSidebar({ 
  activeTab,
  searchParams = {}
}: ProfileSidebarProps) {
  // Build URLs while preserving other query parameters (like edit, showAdd, etc.)
  // but removing feedback-related params when switching tabs
  const buildUrl = (tab: string, orderStatus?: string) => {
    const params = new URLSearchParams();
    
    // Set the tab parameter
    params.set("tab", tab);
    
    // For orders tab, always set orderStatus (default to "all" if not provided)
    if (tab === "orders") {
      const statusToUse = orderStatus !== undefined ? orderStatus : (searchParams?.orderStatus as string) || "all";
      if (statusToUse && statusToUse !== "all") {
        params.set("orderStatus", statusToUse);
      }
    } else {
      // For non-orders tabs, preserve orderStatus if it exists, but don't add it
      if (searchParams?.orderStatus && searchParams.orderStatus !== "all") {
        // Don't preserve orderStatus for non-orders tabs
      }
    }
    
    // Preserve other relevant parameters (edit, showAdd) but exclude status/message
    Object.entries(searchParams).forEach(([key, value]) => {
      if (key !== "tab" && key !== "status" && key !== "message" && key !== "orderStatus" && value) {
        if (Array.isArray(value)) {
          value.forEach(v => params.append(key, v));
        } else {
          params.set(key, value);
        }
      }
    });
    
    return `/profile?${params.toString()}`;
  };

  // Get current order status from search params (default to "all")
  const currentOrderStatus = (searchParams?.orderStatus as string) || "all";

  // Determine which main category is active
  const isAccountCategory = activeTab === "account" || activeTab === "profile" || activeTab === "password" || activeTab === "addresses";
  const isOrdersCategory = activeTab === "orders";

  // Determine if sub-items should be expanded (based on active tab)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() => {
    const expanded = new Set<string>();
    if (isAccountCategory) expanded.add("account");
    if (isOrdersCategory) expanded.add("orders");
    return expanded;
  });

  // Update expanded state when activeTab changes
  useEffect(() => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (isAccountCategory) {
        newSet.add("account");
      }
      if (isOrdersCategory) {
        newSet.add("orders");
      }
      return newSet;
    });
  }, [isAccountCategory, isOrdersCategory]);

  const toggleCategory = (category: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  return (
    <aside className={styles.sidebar}>
      <nav className={styles.nav}>
        {/* Account Category */}
        <div className={styles.categorySection}>
          <div className={styles.categoryHeader}>
            <Link
              href={buildUrl("account")}
              className={`${styles.categoryItem} ${
                isAccountCategory ? styles.activeCategory : ""
              }`}
              onClick={() => {
                // Expand category when clicking on it
                if (!expandedCategories.has("account")) {
                  setExpandedCategories(prev => new Set(prev).add("account"));
                }
              }}
            >
              Account
            </Link>
            <button
              type="button"
              className={styles.expandButton}
              onClick={(e) => toggleCategory("account", e)}
              aria-expanded={expandedCategories.has("account")}
            >
              <svg
                className={`${styles.expandIcon} ${
                  expandedCategories.has("account") ? styles.expanded : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
          </div>
          {expandedCategories.has("account") && (
            <div className={styles.subNav}>
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
            </div>
          )}
        </div>

        {/* Orders Category */}
        <div className={styles.categorySection}>
          <div className={styles.categoryHeader}>
            <Link
              href={buildUrl("orders")}
              className={`${styles.categoryItem} ${
                isOrdersCategory ? styles.activeCategory : ""
              }`}
              onClick={() => {
                // Expand category when clicking on it
                if (!expandedCategories.has("orders")) {
                  setExpandedCategories(prev => new Set(prev).add("orders"));
                }
              }}
            >
              Orders
            </Link>
            <button
              type="button"
              className={styles.expandButton}
              onClick={(e) => toggleCategory("orders", e)}
              aria-expanded={expandedCategories.has("orders")}
            >
              <svg
                className={`${styles.expandIcon} ${
                  expandedCategories.has("orders") ? styles.expanded : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
          </div>
          {expandedCategories.has("orders") && (
            <div className={styles.subNav}>
              {ORDER_STATUS_FILTERS.map((filter) => {
                const isActive = activeTab === "orders" && currentOrderStatus === filter.value;
                return (
                  <Link
                    key={filter.value}
                    href={buildUrl("orders", filter.value)}
                    className={`${styles.navItem} ${isActive ? styles.active : ""}`}
                  >
                    {filter.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </nav>
    </aside>
  );
}

