import React from "react";
import { useTranslation } from "react-i18next";
import { CreditCard } from "lucide-react";
import { type Order } from "../../../services/api";
import styles from "../OrderDetailModal.module.css";

interface PaymentInfoSectionProps {
  order: Order;
}

const PaymentInfoSection: React.FC<PaymentInfoSectionProps> = ({ order }) => {
  const { t } = useTranslation();

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <CreditCard className={styles.sectionIcon} />
        <h4 className={styles.sectionTitle}>
          {t("orders.modal.paymentInfo") || "Payment Information"}
        </h4>
      </div>
      <div className={styles.infoGrid}>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>
            {t("orders.modal.paymentMethod") || "Payment Method"}:
          </span>
          <span className={styles.infoValue}>{order.paymentMethod}</span>
        </div>
      </div>
    </div>
  );
};

export default PaymentInfoSection;

