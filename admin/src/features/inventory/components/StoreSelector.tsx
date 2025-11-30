import React from "react";
import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Store } from "../../../shared/types/store";
import styles from "../InventoryManagement.module.css";

interface StoreSelectorProps {
  stores: Store[];
  selectedStoreId: string;
  searchTerm: string;
  isLoading: boolean;
  onStoreChange: (storeId: string) => void;
  onSearchChange: (searchTerm: string) => void;
}

const StoreSelector: React.FC<StoreSelectorProps> = ({
  stores,
  selectedStoreId,
  searchTerm,
  isLoading,
  onStoreChange,
  onSearchChange,
}) => {
  const { t } = useTranslation();

  return (
    <div className={`card ${styles.storeSelector}`}>
      <div className={styles.filters}>
        <div>
          <label className="form-label">{t("inventory.selectStore")}</label>
          <select
            value={selectedStoreId}
            onChange={(e) => onStoreChange(e.target.value)}
            className="form-input form-select"
            disabled={isLoading}
          >
            <option value="">{t("inventory.selectStorePlaceholder")}</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        </div>
        {selectedStoreId && (
          <div className={styles.searchWrapper}>
            <Search className={styles.searchIcon} />
            <input
              type="text"
              placeholder={t("inventory.searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className={`form-input ${styles.searchInput}`}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default StoreSelector;


