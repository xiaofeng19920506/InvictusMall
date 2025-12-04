"use client";

import { useState, useCallback, useMemo } from "react";
import { useCart } from "@/contexts/CartContext";
import { Product } from "@/services/product";
import { Store } from "@/services/api";

interface AddToCartButtonProps {
  product: Product;
  store: Store;
  className?: string;
  disabled?: boolean;
  onAdded?: () => void;
}

export default function AddToCartButton({
  product,
  store,
  className = "",
  disabled = false,
  onAdded,
}: AddToCartButtonProps) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  // Memoize product image to avoid recalculation
  const productImage = useMemo(() => {
    return (product.imageUrls && product.imageUrls.length > 0) 
      ? product.imageUrls[0] 
      : product.imageUrl;
  }, [product.imageUrls, product.imageUrl]);

  const handleAddToCart = useCallback((e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    
    addItem({
      productId: product.id,
      productName: product.name,
      productImage: productImage,
      price: product.price,
      quantity: 1,
      storeId: store.id,
      storeName: store.name,
    });
    
    setAdded(true);
    if (onAdded) {
      onAdded();
    }
    setTimeout(() => setAdded(false), 2000);
  }, [product, productImage, store, addItem, onAdded]);

  const isDisabled = disabled || (product.stockQuantity !== undefined && product.stockQuantity === 0);

  return (
    <button
      onClick={handleAddToCart}
      disabled={isDisabled}
      className={`w-full py-2 rounded-md transition-colors cursor-pointer ${
        added
          ? "bg-green-500 text-white"
          : isDisabled
          ? "bg-gray-400 text-gray-600 cursor-not-allowed"
          : "bg-orange-500 text-white hover:bg-orange-600"
      } ${className}`}
    >
      {added 
        ? "✓ Added to Cart" 
        : isDisabled 
        ? "Out of Stock" 
        : "Add to Cart"}
    </button>
  );
}

