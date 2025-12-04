"use client";

import { useState, FormEvent, useEffect, useRef } from "react";
import { Product } from "@/services/product";
import { Store } from "@/services/api";
import { useCart } from "@/contexts/CartContext";
import apiService from "@/services/api";
<<<<<<< HEAD
=======
import styles from "./ReservationModal.module.scss";
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009

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
<<<<<<< HEAD
        productImage: service.imageUrl,
=======
        productImage: (service.imageUrls && service.imageUrls.length > 0) 
          ? service.imageUrls[0] 
          : service.imageUrl,
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
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
<<<<<<< HEAD
      className="absolute inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center z-50 p-4"
=======
      className={styles.backdrop}
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
      onClick={(e) => {
        if (e.target === backdropRef.current) {
          onClose();
        }
      }}
    >
      <div 
        ref={modalRef}
<<<<<<< HEAD
        className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Make Reservation</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors text-2xl font-bold"
=======
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 className={styles.title}>Make Reservation</h2>
          <button
            onClick={onClose}
            className={styles.closeButton}
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

<<<<<<< HEAD
        <div className="p-6">
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-1">{service.name}</h3>
            <p className="text-sm text-gray-600">{store.name}</p>
            <p className="text-lg font-bold text-orange-500 mt-2">
=======
        <div className={styles.content}>
          <div className={styles.serviceInfo}>
            <h3 className={styles.serviceName}>{service.name}</h3>
            <p className={styles.storeName}>{store.name}</p>
            <p className={styles.servicePrice}>
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
              ${service.price.toFixed(2)}
            </p>
          </div>

          {added ? (
<<<<<<< HEAD
            <div className="text-center py-8">
              <div className="text-green-500 text-6xl mb-4">✓</div>
              <p className="text-lg font-semibold text-gray-900 mb-2">
                Added to Cart!
              </p>
              <p className="text-sm text-gray-600">
=======
            <div className={styles.successContainer}>
              <div className={styles.successIcon}>✓</div>
              <p className={styles.successTitle}>
                Added to Cart!
              </p>
              <p className={styles.successMessage}>
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
                Your reservation has been added to your cart for checkout.
              </p>
            </div>
          ) : (
<<<<<<< HEAD
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="date"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Reservation Date <span className="text-red-500">*</span>
=======
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formField}>
                <label
                  htmlFor="date"
                  className={styles.formLabel}
                >
                  Reservation Date <span className={styles.required}>*</span>
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
                </label>
                <input
                  id="date"
                  name="date"
                  type="date"
                  required
                  min={today}
                  value={formData.date}
                  onChange={handleChange}
<<<<<<< HEAD
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label
                  htmlFor="timeSlot"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Available Time Slot <span className="text-red-500">*</span>
=======
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formField}>
                <label
                  htmlFor="timeSlot"
                  className={styles.formLabel}
                >
                  Available Time Slot <span className={styles.required}>*</span>
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
                </label>
                <select
                  id="timeSlot"
                  name="timeSlot"
                  required
                  value={formData.timeSlot}
                  onChange={handleChange}
                  disabled={!formData.date || loadingTimeSlots || availableTimeSlots.length === 0}
<<<<<<< HEAD
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
=======
                  className={styles.formInput}
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
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
<<<<<<< HEAD
                  <p className="mt-1 text-sm text-amber-600">
=======
                  <p className={styles.warningText}>
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
                    All time slots are booked for this date. Please select another date.
                  </p>
                )}
              </div>

<<<<<<< HEAD
              <div>
                <label
                  htmlFor="notes"
                  className="block text-sm font-medium text-gray-700 mb-1"
=======
              <div className={styles.formField}>
                <label
                  htmlFor="notes"
                  className={styles.formLabel}
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
                >
                  Additional Notes
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  value={formData.notes}
                  onChange={handleChange}
<<<<<<< HEAD
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
=======
                  className={styles.formTextarea}
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
                  placeholder="Any special requests or requirements..."
                />
              </div>

              {error && (
<<<<<<< HEAD
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
=======
                <div className={styles.errorMessage}>
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
                  {error}
                </div>
              )}

<<<<<<< HEAD
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
=======
              <div className={styles.buttonGroup}>
                <button
                  type="button"
                  onClick={onClose}
                  className={styles.cancelButton}
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || added}
<<<<<<< HEAD
                  className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
=======
                  className={styles.submitButton}
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
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

