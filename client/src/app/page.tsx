import HomeContent from "./components/HomeContent";
import Footer from "./components/Footer";
import { fetchStoresServer, Store } from "@/lib/server-api";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Invictus Mall - Your Ultimate Shopping Destination | Discover Amazing Stores",
  description: "Discover amazing stores and products at Invictus Mall. Shop from verified stores with great deals and excellent customer service. Browse by category or search for your favorite products.",
  keywords: ["online shopping", "mall", "stores", "products", "shopping", "ecommerce"],
  openGraph: {
    title: "Invictus Mall - Your Ultimate Shopping Destination",
    description: "Discover amazing stores and products at Invictus Mall.",
    type: "website",
  },
};

// Enable ISR (Incremental Static Regeneration) - revalidate every 60 seconds
// This allows the page to be statically generated but updated periodically
export const revalidate = 60;

interface HomeProps {
  searchParams: Promise<{
    search?: string;
    category?: string;
    searchType?: string;
  }>;
}

export default async function Home({ searchParams }: HomeProps) {
  // Await searchParams (Next.js 15+ requirement)
  const params = await searchParams;
  
  // Fetch stores on the server based on URL search params
  let initialStores: Store[] = [];
  
  try {
    const initialData = await fetchStoresServer({
      search: params.search,
      category: params.category || 'All',
      searchType: params.searchType || 'All',
    });

    // Extract initial stores or empty array if fetch failed
    initialStores = initialData.success ? initialData.data : [];
  } catch (error) {
    // If server fetch fails, start with empty array
    // The client-side hook will handle retrying
    console.error('Failed to fetch stores on server:', error);
  }

  return (
    <>
      <HomeContent 
        initialStores={initialStores}
        initialSearch={params.search || ''}
        initialCategory={params.category || 'All'}
        initialSearchType={params.searchType || 'All'}
      />
      <Footer />
    </>
  );
}
