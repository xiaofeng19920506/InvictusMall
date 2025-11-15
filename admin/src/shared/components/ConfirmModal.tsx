import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, X } from 'lucide-react';
import styles from './ConfirmModal.module.css';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'danger' | 'warning' | 'info';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  type = 'warning',
}) => {
  const { t } = useTranslation();
  const defaultConfirmText = confirmText || t("common.confirm");
  const defaultCancelText = cancelText || t("common.cancel");
  
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return styles.danger;
      case 'info':
        return styles.info;
      default:
        return styles.warning;
    }
  };

  return (
    <div className={styles.overlay} onClick={handleBackdropClick}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.iconWrapper}>
            <AlertTriangle className={styles.icon} />
          </div>
          <button
            className={styles.closeButton}
            onClick={onCancel}
            aria-label={t("common.close")}
          >
            <X className={styles.closeIcon} />
          </button>
        </div>
        <div className={styles.content}>
          <h3 className={styles.title}>{title}</h3>
          <p className={styles.message}>{message}</p>
        </div>
        <div className={styles.footer}>
          <button
            className={`${styles.button} ${styles.cancelButton}`}
            onClick={onCancel}
          >
            {defaultCancelText}
          </button>
          <button
            className={`${styles.button} ${styles.confirmButton} ${getTypeStyles()}`}
            onClick={onConfirm}
          >
            {defaultConfirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;

