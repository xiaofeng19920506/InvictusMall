import React from "react";
import { Package, History } from "lucide-react";
import { useTranslation } from "react-i18next";
import styles from "../InventoryManagement.module.css";

interface InventoryTabsProps {
  activeTab: "products" | "history";
  onTabChange: (tab: "products" | "history") => void;
}

const InventoryTabs: React.FC<InventoryTabsProps> = ({ activeTab, onTabChange }) => {
  const { t } = useTranslation();

  return (
    <div className={styles.tabs}>
      <button
        className={`${styles.tab} ${
          activeTab === "products" ? styles.activeTab : ""
        }`}
        onClick={() => onTabChange("products")}
      >
        <Package className="w-4 h-4 mr-2" />
        {t("inventory.tabs.products") || "Products"}
      </button>
      <button
        className={`${styles.tab} ${
          activeTab === "history" ? styles.activeTab : ""
        }`}
        onClick={() => onTabChange("history")}
      >
        <History className="w-4 h-4 mr-2" />
        {t("inventory.tabs.history") || "Stock Operations History"}
      </button>
    </div>
  );
};

export default InventoryTabs;


