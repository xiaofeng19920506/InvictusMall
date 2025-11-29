import { fetchStoreByIdServer } from "@/lib/server-api";
import { notFound } from "next/navigation";
import ProductDetailContent from "../components/ProductDetailContent";
import Header from "@/components/common/Header";
import type { Metadata } from "next";

interface ProductPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  
  // Fetch product data on server
  let product = null;
  let store = null;

  try {
    // First, we need to get the product - this would need a new API endpoint
    // For now, we'll fetch it client-side
    // TODO: Add server-side product fetching
  } catch (error) {
    console.error('Failed to fetch product on server:', error);
  }

  return (
    <>
      <Header />
      <ProductDetailContent productId={id} />
    </>
  );
}

