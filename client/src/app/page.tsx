import { Suspense } from "react";
import HomeContent from "./components/HomeContent";
import Footer from "./components/Footer";
import { fetchStoresServer, Store } from "@/lib/server-api";
import type { Metadata } from "next";
import styles from "./page.module.scss";

export const metadata: Metadata = {
  title:
    "Invictus Mall - Your Ultimate Shopping Destination | Discover Amazing Stores",
  description:
    "Discover amazing stores and products at Invictus Mall. Shop from verified stores with great deals and excellent customer service. Browse by category or search for your favorite products.",
  keywords: [
    "online shopping",
    "mall",
    "stores",
    "products",
    "shopping",
    "ecommerce",
    "online marketplace",
    "buy online",
  ],
  openGraph: {
    title: "Invictus Mall - Your Ultimate Shopping Destination",
    description: "Discover amazing stores and products at Invictus Mall.",
    type: "website",
    url: "https://invictusmall.com",
  },
  alternates: {
    canonical: "https://invictusmall.com",
  },
};

// Use SSG for maximum performance and SEO
// Default page (no search params) will be statically generated at build time
// Search functionality is handled client-side for interactivity
export const dynamic = "force-static";
// When search params are provided, Next.js will still serve the static page
// and the client component will handle filtering client-side

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

  // For SSG: Always fetch all stores for the default view
  // The client component will handle filtering based on search params
  // This ensures the page is fully static and SEO-friendly
  let initialStores: Store[] = [];

  try {
    // Fetch all stores for SSG - client will handle filtering
    const initialData = await fetchStoresServer({
      category: "All",
      searchType: "All",
    });

    // Extract initial stores or empty array if fetch failed
    initialStores = initialData.success ? initialData.data : [];
  } catch (error) {
    // If server fetch fails, start with empty array
    // The client-side hook will handle retrying
    console.error("Failed to fetch stores on server:", error);
  }

  return (
    <div className={styles.pageWrapper}>
      <Suspense fallback={<div className={styles.pageWrapper}>Loading...</div>}>
        <HomeContent
          initialStores={initialStores}
          initialSearch={params.search || ""}
          initialCategory={params.category || "All"}
          initialSearchType={params.searchType || "All"}
        />
      </Suspense>
      <Footer />
    </div>
  );
}
