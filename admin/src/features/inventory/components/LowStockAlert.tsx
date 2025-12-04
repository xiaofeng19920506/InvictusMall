import React from "react";
import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import styles from "../InventoryManagement.module.css";

interface LowStockAlertProps {
  count: number;
}

const LowStockAlert: React.FC<LowStockAlertProps> = ({ count }) => {
  const { t } = useTranslation();

  if (count === 0) return null;

  return (
    <div className={`card ${styles.alertCard}`}>
      <div className={styles.alertContent}>
        <AlertTriangle className={styles.alertIcon} />
        <div>
          <strong>{t("inventory.lowStock.title")}</strong>
          <p>
            {t("inventory.lowStock.message", {
              count,
            })}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LowStockAlert;


