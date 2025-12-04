"use client";

import { useState, FormEvent, useEffect, useRef } from "react";
import { Product } from "@/services/product";
import { Store } from "@/services/api";
import { useCart } from "@/contexts/CartContext";
import apiService from "@/services/api";
import styles from "./ReservationModal.module.scss";

interface ReservationModalProps {
  service: Product;
  store: Store;
  isOpen: boolean;
  onClose: () => void;
  onReservationComplete?: () => void;
}

export default function ReservationModal({
  service,
  store,
  isOpen,
  onClose,
  onReservationComplete,
}: ReservationModalProps) {
  const { addItem } = useCart();
  const [formData, setFormData] = useState({
    date: "",
    timeSlot: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [added, setAdded] = useState(false);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Handle outside click to close modal
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        backdropRef.current &&
        event.target === backdropRef.current &&
        !modalRef.current?.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  // Fetch available time slots when date changes
  useEffect(() => {
    const fetchAvailableTimeSlots = async () => {
      if (!formData.date || !service.id) {
        setAvailableTimeSlots([]);
        setFormData((prev) => ({ ...prev, timeSlot: "" }));
        return;
      }

      setLoadingTimeSlots(true);
      setError("");

      try {
        const response = await apiService.getAvailableTimeSlots(
          service.id,
          formData.date
        );

        if (response.success && response.data) {
          setAvailableTimeSlots(response.data.availableTimeSlots);
          // Reset time slot selection if the selected slot is no longer available
          if (
            formData.timeSlot &&
            !response.data.availableTimeSlots.includes(formData.timeSlot)
          ) {
            setFormData((prev) => ({ ...prev, timeSlot: "" }));
          }
        } else {
          setError(response.message || "Failed to load available time slots");
          setAvailableTimeSlots([]);
        }
      } catch (err: any) {
        console.error("Error fetching available time slots:", err);
        setError("Failed to load available time slots. Please try again.");
        setAvailableTimeSlots([]);
      } finally {
        setLoadingTimeSlots(false);
      }
    };

    fetchAvailableTimeSlots();
  }, [formData.date, service.id]);

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    if (!formData.date || !formData.timeSlot) {
      setError("Please select both date and time slot.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      // Add reservation to cart
      addItem({
        productId: service.id,
        productName: service.name,
        productImage: (service.imageUrls && service.imageUrls.length > 0) 
          ? service.imageUrls[0] 
          : service.imageUrl,
        price: service.price,
        quantity: 1,
        storeId: store.id,
        storeName: store.name,
        reservationDate: formData.date,
        reservationTime: formData.timeSlot,
        reservationNotes: formData.notes || undefined,
        isReservation: true,
      });

      setAdded(true);
      
      setTimeout(() => {
        onClose();
        if (onReservationComplete) {
          onReservationComplete();
        }
        // Reset form
        setFormData({
          date: "",
          timeSlot: "",
          notes: "",
        });
        setAdded(false);
      }, 1500);
    } catch (err: any) {
      console.error("Add to cart error:", err);
      setError(err.message || "Failed to add reservation to cart. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError(""); // Clear error when user changes input
  };

  // Set minimum date to today
  const today = new Date().toISOString().split("T")[0];

  return (
    <div 
      ref={backdropRef}
      className={styles.backdrop}
      onClick={(e) => {
        if (e.target === backdropRef.current) {
          onClose();
        }
      }}
    >
      <div 
        ref={modalRef}
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 className={styles.title}>Make Reservation</h2>
          <button
            onClick={onClose}
            className={styles.closeButton}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.serviceInfo}>
            <h3 className={styles.serviceName}>{service.name}</h3>
            <p className={styles.storeName}>{store.name}</p>
            <p className={styles.servicePrice}>
              ${service.price.toFixed(2)}
            </p>
          </div>

          {added ? (
            <div className={styles.successContainer}>
              <div className={styles.successIcon}>✓</div>
              <p className={styles.successTitle}>
                Added to Cart!
              </p>
              <p className={styles.successMessage}>
                Your reservation has been added to your cart for checkout.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formField}>
                <label
                  htmlFor="date"
                  className={styles.formLabel}
                >
                  Reservation Date <span className={styles.required}>*</span>
                </label>
                <input
                  id="date"
                  name="date"
                  type="date"
                  required
                  min={today}
                  value={formData.date}
                  onChange={handleChange}
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formField}>
                <label
                  htmlFor="timeSlot"
                  className={styles.formLabel}
                >
                  Available Time Slot <span className={styles.required}>*</span>
                </label>
                <select
                  id="timeSlot"
                  name="timeSlot"
                  required
                  value={formData.timeSlot}
                  onChange={handleChange}
                  disabled={!formData.date || loadingTimeSlots || availableTimeSlots.length === 0}
                  className={styles.formInput}
                >
                  <option value="">
                    {!formData.date
                      ? "Please select a date first"
                      : loadingTimeSlots
                      ? "Loading available slots..."
                      : availableTimeSlots.length === 0
                      ? "No available time slots for this date"
                      : "Select a time slot"}
                  </option>
                  {availableTimeSlots.map((slot) => (
                    <option key={slot} value={slot}>
                      {new Date(`2000-01-01T${slot}`).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </option>
                  ))}
                </select>
                {formData.date && availableTimeSlots.length === 0 && !loadingTimeSlots && (
                  <p className={styles.warningText}>
                    All time slots are booked for this date. Please select another date.
                  </p>
                )}
              </div>

              <div className={styles.formField}>
                <label
                  htmlFor="notes"
                  className={styles.formLabel}
                >
                  Additional Notes
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  value={formData.notes}
                  onChange={handleChange}
                  className={styles.formTextarea}
                  placeholder="Any special requests or requirements..."
                />
              </div>

              {error && (
                <div className={styles.errorMessage}>
                  {error}
                </div>
              )}

              <div className={styles.buttonGroup}>
                <button
                  type="button"
                  onClick={onClose}
                  className={styles.cancelButton}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || added}
                  className={styles.submitButton}
                >
                  {added ? "✓ Added to Cart" : submitting ? "Adding..." : "Add to Cart"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
