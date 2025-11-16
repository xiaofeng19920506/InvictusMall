"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiService, Store } from "@/services/api";
import { productService, Product } from "@/services/product";
import { useCart } from "@/contexts/CartContext";
import Header from "@/components/common/Header";
import Link from "next/link";
import { getImageUrl } from "@/utils/imageUtils";
import ReservationModal from "./ReservationModal";

function AddToCartButton({
  product,
  store,
}: {
  product: Product;
  store: Store;
}) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    addItem({
      productId: product.id,
      productName: product.name,
      productImage: product.imageUrl,
      price: product.price,
      quantity: 1,
      storeId: store.id,
      storeName: store.name,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <button
      onClick={handleAddToCart}
      className={`w-full py-2 rounded-md transition-colors cursor-pointer ${
        added
          ? "bg-green-500 text-white"
          : "bg-orange-500 text-white hover:bg-orange-600"
      }`}
    >
      {added ? "✓ Added to Cart" : "Add to Cart"}
    </button>
  );
}

interface StoreDetailContentProps {
  initialStore: Store | null;
}

export default function StoreDetailContent({ initialStore }: StoreDetailContentProps) {
  const params = useParams();
  const router = useRouter();
  const storeId = params.id as string;

  const [store, setStore] = useState<Store | null>(initialStore);
  const [allItems, setAllItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(!initialStore);
  const [productsLoading, setProductsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<
    "overview" | "products" | "services" | "reviews"
  >("overview");
  const [selectedService, setSelectedService] = useState<Product | null>(null);
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);

  // Separate products and services
  const products = allItems.filter(item => item.category === "product" || !item.category);
  const services = allItems.filter(item => item.category === "service");

  useEffect(() => {
    if (storeId && !initialStore) {
      fetchStoreDetails();
    } else {
      setLoading(false);
    }
    if (storeId) {
      fetchProducts();
    }
  }, [storeId]);

  const fetchStoreDetails = async () => {
    try {
      const response = await apiService.getStoreById(storeId);
      if (response.success) {
        setStore(response.data);
      } else {
        setError("Store not found");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load store details");
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      setProductsLoading(true);
      const response = await productService.getProductsByStoreId(storeId, { isActive: true });
      if (response.success) {
        setAllItems(response.data || []);
      } else {
        console.error("Failed to fetch products:", response.message);
        setAllItems([]);
      }
    } catch (err: any) {
      console.error("Error fetching products:", err);
      setAllItems([]);
    } finally {
      setProductsLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500"></div>
        </div>
      </>
    );
  }

  if (error || !store) {
    return (
      <>
        <Header />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Store Not Found
            </h2>
            <p className="text-gray-600 mb-6">
              {error || "The store you are looking for does not exist."}
            </p>
            <Link
              href="/"
              className="bg-orange-500 text-white px-6 py-2 rounded-md hover:bg-orange-600 transition-colors cursor-pointer"
            >
              Back to Stores
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Store Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-shrink-0">
              {store.imageUrl ? (
                <img
                  src={getImageUrl(store.imageUrl) || "/placeholder/store.png"}
                  alt={store.name}
                  className="w-full md:w-64 h-64 object-cover rounded-lg"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    // Prevent infinite onError loop by removing the handler
                    target.onerror = null;
                    target.src = "/placeholder/store.png";
                  }}
                />
              ) : (
                <div className="w-full md:w-64 h-64 bg-gray-200 rounded-lg flex items-center justify-center">
                  <span className="text-gray-400">No Image</span>
                </div>
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold text-gray-900">
                      {store.name}
                    </h1>
                    {store.isVerified && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                        ✓ Verified
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>⭐ {store.rating.toFixed(1)}</span>
                    <span>({store.reviewCount} reviews)</span>
                    <span>📍 {store.location}</span>
                  </div>
                </div>
              </div>

              <p className="text-gray-700 mb-4">{store.description}</p>

              <div className="flex flex-wrap gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Category:</span>
                  <span className="ml-2 font-medium">{store.category}</span>
                </div>
                <div>
                  <span className="text-gray-500">Products:</span>
                  <span className="ml-2 font-medium">{store.productsCount}</span>
                </div>
                <div>
                  <span className="text-gray-500">Established:</span>
                  <span className="ml-2 font-medium">{store.establishedYear}</span>
                </div>
                {store.discount && (
                  <div>
                    <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full font-medium">
                      {store.discount}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {[
                { id: "overview", label: "Overview" },
                { id: "products", label: `Products (${products.length})` },
                { id: "services", label: `Services (${services.length})` },
                { id: "reviews", label: `Reviews (${store.reviewCount})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm cursor-pointer ${
                    activeTab === tab.id
                      ? "border-orange-500 text-orange-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    About {store.name}
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    {store.description}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">
                      Store Information
                    </h4>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Category</dt>
                        <dd className="font-medium">{store.category}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Location</dt>
                        <dd className="font-medium">{store.location}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Established</dt>
                        <dd className="font-medium">{store.establishedYear}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Total Products</dt>
                        <dd className="font-medium">{store.productsCount}</dd>
                      </div>
                    </dl>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">
                      Ratings & Reviews
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-gray-900">
                          {store.rating.toFixed(1)}
                        </span>
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <span
                              key={i}
                              className={
                                i < Math.floor(store.rating)
                                  ? "text-yellow-400"
                                  : "text-gray-300"
                              }
                            >
                              ⭐
                            </span>
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">
                        Based on {store.reviewCount} reviews
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Products Tab */}
            {activeTab === "products" && (
              <div>
                {productsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {products.map((product) => (
                        <div
                          key={product.id}
                          className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                        >
                          {product.imageUrl && (
                            <img
                              src={getImageUrl(product.imageUrl) || "/placeholder/product.png"}
                              alt={product.name}
                              className="w-full h-48 object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                // Prevent infinite onError loop by removing the handler
                                target.onerror = null;
                                target.src = "/placeholder/product.png";
                              }}
                            />
                          )}
                          {!product.imageUrl && (
                            <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                              <span className="text-gray-400">No Image</span>
                            </div>
                          )}
                          <div className="p-4">
                            <h4 className="font-semibold text-gray-900 mb-1">
                              {product.name}
                            </h4>
                            {product.description && (
                              <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                                {product.description}
                              </p>
                            )}
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-xl font-bold text-orange-500">
                                ${product.price.toFixed(2)}
                              </span>
                              <span className="text-sm text-gray-500">
                                Stock: {product.stockQuantity}
                              </span>
                            </div>
                            <AddToCartButton product={product} store={store} />
                          </div>
                        </div>
                      ))}
                    </div>

                    {products.length === 0 && !productsLoading && (
                      <div className="text-center py-12">
                        <p className="text-gray-600">No products available yet.</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Services Tab */}
            {activeTab === "services" && (
              <div>
                {productsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {services.map((service) => (
                        <div
                          key={service.id}
                          className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                        >
                          {service.imageUrl && (
                            <img
                              src={getImageUrl(service.imageUrl) || "/placeholder/service.png"}
                              alt={service.name}
                              className="w-full h-48 object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                // Prevent infinite onError loop by removing the handler
                                target.onerror = null;
                                target.src = "/placeholder/service.png";
                              }}
                            />
                          )}
                          {!service.imageUrl && (
                            <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                              <span className="text-gray-400">No Image</span>
                            </div>
                          )}
                          <div className="p-4">
                            <h4 className="font-semibold text-gray-900 mb-1">
                              {service.name}
                            </h4>
                            {service.description && (
                              <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                                {service.description}
                              </p>
                            )}
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-xl font-bold text-orange-500">
                                ${service.price.toFixed(2)}
                              </span>
                            </div>
                            <button
                              onClick={() => {
                                setSelectedService(service);
                                setIsReservationModalOpen(true);
                              }}
                              className="w-full py-2 rounded-md bg-orange-500 text-white hover:bg-orange-600 transition-colors cursor-pointer"
                            >
                              Make Reservation
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {services.length === 0 && !productsLoading && (
                      <div className="text-center py-12">
                        <p className="text-gray-600">No services available yet.</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Reviews Tab */}
            {activeTab === "reviews" && (
              <div className="space-y-4">
                <div className="text-center py-12">
                  <p className="text-gray-600">Review system coming soon...</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Reviews feature will be implemented in the next update.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reservation Modal */}
      {selectedService && store && (
        <ReservationModal
          service={selectedService}
          store={store}
          isOpen={isReservationModalOpen}
          onClose={() => {
            setIsReservationModalOpen(false);
            setSelectedService(null);
          }}
        />
      )}
    </>
  );
}

