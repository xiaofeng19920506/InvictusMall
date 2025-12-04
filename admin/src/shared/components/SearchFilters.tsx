import React from "react";
import { Search, Filter } from "lucide-react";
import styles from "./SearchFilters.module.css";

export interface FilterOption {
  value: string;
  label: string;
}

export interface SelectFilter {
  key: string;
  label: string;
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

interface SearchFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchPlaceholder?: string;
  filters?: SelectFilter[];
  className?: string;
  showSearch?: boolean;
}

const SearchFilters: React.FC<SearchFiltersProps> = ({
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Search...",
  filters = [],
  className = "",
  showSearch = true,
}) => {
  return (
    <div className={`${styles.filters} ${className}`}>
      {showSearch && (
        <div className={styles.searchBox}>
          <Search size={20} className={styles.searchIcon} />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className={styles.searchInput}
          />
        </div>
      )}

      {filters.length > 0 && (
        <div className={styles.filterGroup}>
          <Filter size={20} />
          {filters.map((filter) => (
            <select
              key={filter.key}
              value={filter.value}
              onChange={(e) => filter.onChange(e.target.value)}
              className={`${styles.filterSelect} ${filter.className || ""}`}
            >
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchFilters;

