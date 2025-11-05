"use client";

import { useState } from "react";
import HeaderWrapper from "@/components/HeaderWrapper";
import StoreGrid from "@/components/StoreGrid";
import { useRealTimeStores } from "@/hooks/useRealTimeStores";
import { Store } from "@/services/api";

export default function HomeContent() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchType, setSearchType] = useState("All");

  // Use real-time stores hook with 15-second refresh interval
  const { stores, loading, error, refetch, lastUpdated } = useRealTimeStores(
    searchQuery,
    selectedCategory,
    searchType,
    15000 // Refresh every 15 seconds
  );

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleCategoryFilter = (category: string) => {
    setSelectedCategory(category);
  };

  const handleSearchTypeChange = (type: string) => {
    setSearchType(type);
  };

  const handleStoreClick = (store: Store) => {
    window.location.href = `/stores/${store.id}`;
  };

  const handleRetry = () => {
    refetch();
  };

  return (
    <>
      <HeaderWrapper
        onSearch={handleSearch}
        onCategoryFilter={handleCategoryFilter}
        onSearchTypeChange={handleSearchTypeChange}
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {searchType === "All"
              ? selectedCategory === "All"
                ? "All Stores"
                : `${selectedCategory} Stores`
              : `${searchType} Search Results`}
          </h2>
          <p className="text-gray-600">
            {stores.length}{" "}
            {searchType === "All" ? "store" : searchType.toLowerCase()}
            {stores.length !== 1 ? "s" : ""} found
            {searchQuery && ` for "${searchQuery}"`}
            {searchType !== "All" && ` in ${searchType.toLowerCase()}`}
          </p>
          {lastUpdated && (
            <p className="text-sm text-gray-500 mt-2">
              🔄 Last updated: {lastUpdated.toLocaleTimeString()}
              <span className="ml-2 inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            </p>
          )}
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg
                  className="h-5 w-5 text-red-400 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-red-700">{error}</span>
              </div>
              <button
                onClick={handleRetry}
                className="ml-4 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        <StoreGrid
          stores={stores}
          onStoreClick={handleStoreClick}
          loading={loading}
        />
      </main>

      <footer className="bg-gray-900 text-white py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p>&copy; 2024 Invictus Mall. All rights reserved.</p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a
                href="#about"
                className="text-gray-300 hover:text-white transition-colors"
              >
                About
              </a>
              <a
                href="#contact"
                className="text-gray-300 hover:text-white transition-colors"
              >
                Contact
              </a>
              <a
                href="#privacy"
                className="text-gray-300 hover:text-white transition-colors"
              >
                Privacy
              </a>
              <a
                href="#terms"
                className="text-gray-300 hover:text-white transition-colors"
              >
                Terms
              </a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
