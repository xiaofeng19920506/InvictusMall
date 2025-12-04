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
  const [timeSlots, setTimeSlots] = useState<Array<{ timeslot: string; isAvailable: boolean }>>([]);
  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const previousTimeSlotRef = useRef<string>("");

  // Handle outside click to close modal and manage body scroll
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
      // Store the original overflow value
      const originalOverflow = document.body.style.overflow;
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
      
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        // Restore the original overflow value
        document.body.style.overflow = originalOverflow || "";
      };
    }
  }, [isOpen, onClose]);

  // Fetch available time slots when date changes
  useEffect(() => {
    const fetchAvailableTimeSlots = async () => {
      // Validate date format before fetching
      if (!formData.date || !service.id) {
        setTimeSlots([]);
        setFormData((prev) => ({ ...prev, timeSlot: "" }));
        return;
      }

      // Validate date format (yyyy-MM-dd)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(formData.date)) {
        setTimeSlots([]);
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
          const newTimeSlots = response.data.timeSlots || [];
          setTimeSlots(newTimeSlots);
          // If selected time slot is no longer available, show warning but don't reset
          if (formData.timeSlot) {
            const selectedSlot = newTimeSlots.find(slot => slot.timeslot === formData.timeSlot);
            if (selectedSlot && !selectedSlot.isAvailable) {
              setError(`The selected time slot (${formData.timeSlot}) is no longer available. Please select another time slot.`);
            }
          }
        } else {
          setError(response.message || "Failed to load available time slots");
          setTimeSlots([]);
        }
      } catch (err: any) {
        console.error("Error fetching available time slots:", err);
        setError("Failed to load available time slots. Please try again.");
        setTimeSlots([]);
      } finally {
        setLoadingTimeSlots(false);
      }
    };

    // Add a small delay to ensure date input is fully processed
    const timeoutId = setTimeout(() => {
      fetchAvailableTimeSlots();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [formData.date, service.id]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!formData.date || !formData.timeSlot) {
      setError("Please select both date and time slot.");
      return;
    }

    // First check: Validate against current timeSlots state before making API call
    const currentSelectedSlot = timeSlots.find(
      (slot) => slot.timeslot === formData.timeSlot
    );
    if (currentSelectedSlot && !currentSelectedSlot.isAvailable) {
      setError(
        `The selected time slot (${formData.timeSlot}) is not available. Please select another time slot.`
      );
      // Reset the selection
      setFormData((prev) => ({ ...prev, timeSlot: "" }));
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      // Verify time slot is still available before adding to cart
      const availabilityCheck = await apiService.getAvailableTimeSlots(
        service.id,
        formData.date
      );

      if (!availabilityCheck.success || !availabilityCheck.data) {
        setError("Failed to verify time slot availability. Please try again.");
        setSubmitting(false);
        return;
      }

      // Check if selected time slot is still available
      const selectedSlot = availabilityCheck.data.timeSlots?.find(
        (slot) => slot.timeslot === formData.timeSlot
      );
      if (!selectedSlot || !selectedSlot.isAvailable) {
        setError(
          `The selected time slot (${formData.timeSlot}) is no longer available. Please select another time slot.`
        );
        // Refresh time slots to update the UI
        setTimeSlots(availabilityCheck.data.timeSlots || []);
        // Reset the selection
        setFormData((prev) => ({ ...prev, timeSlot: "" }));
        setSubmitting(false);
        return;
      }

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
        // Ensure body scroll is restored before closing
        document.body.style.overflow = "";
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
    
    // For date input, ensure it's in the correct format (yyyy-MM-dd)
    if (name === "date" && value) {
      // Validate date format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(value)) {
        setError("Please select a valid date using the date picker.");
        return;
      }
      
      // Ensure date is not in the past
      const selectedDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        setError("Please select a date that is today or in the future.");
        return;
      }
    }

    // For time slot selection, check availability from current state
    if (name === "timeSlot" && value && formData.date) {
      // Check if the selected time slot is available from current timeSlots state
      const selectedSlot = timeSlots.find((slot) => slot.timeslot === value);
      
      // If slot is not available, immediately reset to previous value and show error
      if (selectedSlot && !selectedSlot.isAvailable) {
        setError("This time slot is no longer available. Please select another time slot.");
        // Reset to previous value or empty string
        setFormData((prev) => ({
          ...prev,
          timeSlot: previousTimeSlotRef.current || "",
        }));
        // Force the select element to revert to previous value
        const selectElement = document.getElementById("timeSlot") as HTMLSelectElement;
        if (selectElement) {
          selectElement.value = previousTimeSlotRef.current || "";
        }
        return;
      }
      
      // If slot is available, update the previous value reference
      previousTimeSlotRef.current = value;
      setError("");
      
      // Refresh time slots to get latest availability
      const refreshTimeSlots = async () => {
        try {
          const response = await apiService.getAvailableTimeSlots(
            service.id,
            formData.date
          );
          if (response.success && response.data) {
            setTimeSlots(response.data.timeSlots || []);
            // After refreshing, check if the selected slot is still available
            const updatedSelectedSlot = response.data.timeSlots?.find(
              (slot) => slot.timeslot === value
            );
            if (updatedSelectedSlot && !updatedSelectedSlot.isAvailable) {
              setError("This time slot is no longer available. Please select another time slot.");
              // Reset the selection if it's no longer available
              const previousValue = previousTimeSlotRef.current || "";
              setFormData((prev) => ({
                ...prev,
                timeSlot: previousValue,
              }));
              // Force the select element to revert
              const selectElement = document.getElementById("timeSlot") as HTMLSelectElement;
              if (selectElement) {
                selectElement.value = previousValue;
              }
              return;
            }
          }
        } catch (err) {
          console.warn("Failed to refresh time slots:", err);
        }
      };
      
      refreshTimeSlots();
    }
    
    // For non-timeSlot fields, update form data normally
    if (name !== "timeSlot") {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    } else {
      // For timeSlot, only update if the value is valid (handled above)
      // This ensures we don't update with invalid values
      if (value) {
        const selectedSlot = timeSlots.find((slot) => slot.timeslot === value);
        if (selectedSlot && selectedSlot.isAvailable) {
          // Update previous value reference before updating form data
          previousTimeSlotRef.current = formData.timeSlot;
          setFormData((prev) => ({
            ...prev,
            [name]: value,
          }));
        }
        // If not available, the reset logic above already handled it
      } else {
        // Empty value is allowed (user cleared selection)
        previousTimeSlotRef.current = formData.timeSlot;
        setFormData((prev) => ({
          ...prev,
          [name]: value,
        }));
      }
    }
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
          // Ensure body scroll is restored before closing
          document.body.style.overflow = "";
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
            onClick={() => {
              // Ensure body scroll is restored before closing
              document.body.style.overflow = "";
              onClose();
            }}
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
                  onBlur={(e) => {
                    // Ensure date is set correctly on blur
                    if (e.target.value && e.target.value !== formData.date) {
                      handleChange(e);
                    }
                  }}
                  className={styles.formInput}
                  placeholder="Select a date"
                />
                <p className={styles.helpText}>
                  Please use the date picker to select a date (format: YYYY-MM-DD)
                </p>
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
                  disabled={!formData.date || loadingTimeSlots}
                  className={styles.formInput}
                  onInvalid={(e) => {
                    e.preventDefault();
                    const select = e.target as HTMLSelectElement;
                    if (!select.value) {
                      setError("Please select a time slot.");
                    }
                  }}
                  onClick={(e) => {
                    // Prevent clicking on disabled options
                    const select = e.target as HTMLSelectElement;
                    const clickedIndex = select.selectedIndex;
                    const clickedOption = select.options[clickedIndex] as HTMLOptionElement;
                    if (clickedOption && clickedOption.disabled) {
                      e.preventDefault();
                      // Revert to current form value
                      select.value = formData.timeSlot || "";
                    }
                  }}
                  onKeyDown={(e) => {
                    // Prevent selecting disabled options via keyboard
                    const select = e.target as HTMLSelectElement;
                    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                      const currentIndex = select.selectedIndex;
                      let nextIndex = currentIndex;
                      
                      if (e.key === "ArrowDown") {
                        nextIndex = currentIndex + 1;
                      } else if (e.key === "ArrowUp") {
                        nextIndex = currentIndex - 1;
                      }
                      
                      if (nextIndex >= 0 && nextIndex < select.options.length) {
                        const nextOption = select.options[nextIndex] as HTMLOptionElement;
                        if (nextOption && nextOption.disabled) {
                          e.preventDefault();
                          // Find next available option
                          let foundIndex = -1;
                          if (e.key === "ArrowDown") {
                            for (let i = nextIndex + 1; i < select.options.length; i++) {
                              if (!(select.options[i] as HTMLOptionElement).disabled) {
                                foundIndex = i;
                                break;
                              }
                            }
                          } else {
                            for (let i = nextIndex - 1; i >= 0; i--) {
                              if (!(select.options[i] as HTMLOptionElement).disabled) {
                                foundIndex = i;
                                break;
                              }
                            }
                          }
                          if (foundIndex >= 0) {
                            select.selectedIndex = foundIndex;
                            handleChange({
                              target: { name: "timeSlot", value: (select.options[foundIndex] as HTMLOptionElement).value },
                            } as React.ChangeEvent<HTMLSelectElement>);
                          }
                        }
                      }
                    }
                  }}
                >
                  <option value="">
                    {!formData.date
                      ? "Please select a date first"
                      : loadingTimeSlots
                      ? "Loading available slots..."
                      : "Select a time slot"}
                  </option>
                  {timeSlots.map((slot) => {
                    const timeDisplay = new Date(`2000-01-01T${slot.timeslot}`).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    return (
                      <option
                        key={slot.timeslot}
                        value={slot.timeslot}
                        disabled={!slot.isAvailable}
                        className={!slot.isAvailable ? styles.disabledOption : ""}
                      >
                        {timeDisplay}
                      </option>
                    );
                  })}
                </select>
                {formData.date && timeSlots.length > 0 && timeSlots.every(slot => !slot.isAvailable) && !loadingTimeSlots && (
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
                  onClick={() => {
                    // Ensure body scroll is restored before closing
                    document.body.style.overflow = "";
                    onClose();
                  }}
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
