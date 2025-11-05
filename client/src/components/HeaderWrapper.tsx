"use client";

import Header from "@/components/Header";

interface HeaderWrapperProps {
  onSearch?: (query: string) => void;
  onCategoryFilter?: (category: string) => void;
  onSearchTypeChange?: (searchType: string) => void;
}

export default function HeaderWrapper({
  onSearch,
  onCategoryFilter,
  onSearchTypeChange,
}: HeaderWrapperProps) {
  return (
    <Header
      onSearch={onSearch}
      onCategoryFilter={onCategoryFilter}
      onSearchTypeChange={onSearchTypeChange}
    />
  );
}

