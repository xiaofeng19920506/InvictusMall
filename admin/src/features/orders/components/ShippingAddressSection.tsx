import React from "react";
import { useTranslation } from "react-i18next";
import { MapPin } from "lucide-react";
import { type Order } from "../../../services/api";
import styles from "../OrderDetailModal.module.css";

interface ShippingAddressSectionProps {
  order: Order;
}

const ShippingAddressSection: React.FC<ShippingAddressSectionProps> = ({
  order,
}) => {
  const { t } = useTranslation();

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <MapPin className={styles.sectionIcon} />
        <h4 className={styles.sectionTitle}>
          {t("orders.modal.shippingAddress") || "Shipping Address"}
        </h4>
      </div>
      <div className={styles.address}>
        <p>{order.shippingAddress.streetAddress}</p>
        {order.shippingAddress.aptNumber && (
          <p>{order.shippingAddress.aptNumber}</p>
        )}
        <p>
          {order.shippingAddress.city}, {order.shippingAddress.stateProvince}{" "}
          {order.shippingAddress.zipCode}
        </p>
        <p>{order.shippingAddress.country}</p>
      </div>
    </div>
  );
};

export default ShippingAddressSection;

