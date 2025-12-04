import { fetchStoreByIdServer, fetchStoresServer, Store } from "@/lib/server-api";
import { notFound } from "next/navigation";
import StoreHeader from "../components/StoreHeader";
import StoreTabsContent from "../components/StoreTabsContent";
import Header from "@/components/common/Header";
import type { Metadata } from "next";
import styles from "./page.module.scss";

interface StorePageProps {
  params: Promise<{
    id: string;
  }>;
}

// Generate static params for stores at build time (SSG)
// This pre-generates store pages for better SEO and performance
// Pages not generated at build time will be generated on-demand (ISR)
export async function generateStaticParams() {
  try {
    // Fetch all stores without filters for static generation
    const response = await fetchStoresServer();
    if (response.success && response.data && response.data.length > 0) {
      // Pre-generate first 100 stores at build time
      // Additional stores will be generated on-demand with ISR
      const stores = response.data.slice(0, 100);
      return stores.map((store) => ({
        id: store.id,
      }));
    }
  } catch (error) {
    console.error('Failed to fetch stores for static generation:', error);
    // If fetch fails at build time, pages will be generated on-demand
  }
  
  // Return empty array if no stores found - pages will be generated on-demand
  return [];
}

// Enable ISR (Incremental Static Regeneration) - revalidate every 300 seconds (5 minutes)
// This allows store pages to be statically generated but updated periodically
export const revalidate = 300;

export async function generateMetadata({ params }: StorePageProps): Promise<Metadata> {
  const { id } = await params;
  
  try {
    const response = await fetchStoreByIdServer(id);
    if (response.success && response.data) {
      const store = response.data;
      const primaryCategory = store.category.length > 0 ? store.category[0] : 'Products';
      const allCategories = store.category.length > 0 ? store.category.join(', ') : 'Products';
      return {
        title: `${store.name} - Invictus Mall | Shop ${primaryCategory} Products`,
        description: store.description || `Shop at ${store.name}. ${allCategories} store with ${store.productsCount || 0} products. ${store.isVerified ? 'Verified store. ' : ''}Rated ${store.rating?.toFixed(1) || '5.0'} stars.`,
        keywords: [
          store.name,
          ...store.category,
          "online shopping",
          "Invictus Mall",
          store.isVerified ? "verified store" : "",
        ].filter(Boolean),
        openGraph: {
          title: `${store.name} - Invictus Mall`,
          description: store.description || `Shop at ${store.name} - ${allCategories} store`,
          type: "website",
          images: store.imageUrl ? [store.imageUrl] : [],
          url: `https://invictusmall.com/stores/${id}`,
        },
        alternates: {
          canonical: `https://invictusmall.com/stores/${id}`,
        },
      };
    }
  } catch (error) {
    console.error('Failed to fetch store for metadata:', error);
  }
  
  return {
    title: "Store - Invictus Mall",
    description: "Discover amazing products at this store on Invictus Mall.",
  };
}

export default async function StoreDetailPage({ params }: StorePageProps) {
  const { id } = await params;
  
  let store: Store | null = null;
  
  try {
    const response = await fetchStoreByIdServer(id);
    if (response.success) {
      store = response.data;
    } else {
      notFound();
    }
  } catch (error) {
    console.error('Failed to fetch store on server:', error);
    notFound();
  }

  if (!store) {
    notFound();
  }

  // Generate structured data for SEO (JSON-LD)
  const allCategories = store.category.length > 0 ? store.category.join(', ') : 'Products';
  const structuredData = {
    "@context": "https://schema.org/",
    "@type": "Store",
    "name": store.name,
    "description": store.description || `${store.name} - ${allCategories} store on Invictus Mall`,
    "image": store.imageUrl || undefined,
    "address": {
      "@type": "PostalAddress",
      "addressCountry": "US"
    },
    "aggregateRating": store.rating ? {
      "@type": "AggregateRating",
      "ratingValue": store.rating.toFixed(1),
      "reviewCount": store.reviewCount || 0
    } : undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <Header />
      <div className={styles.pageContainer}>
        <div className={styles.container}>
          <StoreHeader store={store} storeId={id} />
          <StoreTabsContent store={store} />
        </div>
      </div>
    </>
  );
}

