import { fetchProductByIdServer, fetchStoreByIdServer } from "@/lib/server-api";
import { notFound } from "next/navigation";
import ProductDetailContent from "../components/ProductDetailContent";
import Header from "@/components/common/Header";
import type { Metadata } from "next";

interface ProductPageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  
  try {
    const productResponse = await fetchProductByIdServer(id);
    if (productResponse.success && productResponse.data) {
      const product = productResponse.data;
      return {
        title: `${product.name} - Invictus Mall | Shop Online`,
        description: product.description || `Buy ${product.name} at Invictus Mall. ${product.stockQuantity > 0 ? `In stock. ` : ''}Price: $${product.price.toFixed(2)}`,
        keywords: [
          product.name,
          product.category,
          "online shopping",
          "buy online",
          "Invictus Mall",
        ].filter(Boolean),
        openGraph: {
          title: `${product.name} - Invictus Mall`,
          description: product.description || `Buy ${product.name} at Invictus Mall`,
          type: "website",
          images: product.imageUrls && product.imageUrls.length > 0 
            ? product.imageUrls.slice(0, 4) 
            : product.imageUrl ? [product.imageUrl] : [],
          url: `https://invictusmall.com/products/${id}`,
        },
        alternates: {
          canonical: `https://invictusmall.com/products/${id}`,
        },
      };
    }
  } catch (error) {
    // Failed to fetch product for metadata
  }
  
  return {
    title: "Product - Invictus Mall",
    description: "Discover amazing products at Invictus Mall.",
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  
  // Fetch product data on server
  let product = null;
  let store = null;

  try {
    const productResponse = await fetchProductByIdServer(id);
    if (productResponse.success && productResponse.data) {
      product = productResponse.data;
      
      // Fetch store information
      try {
        const storeResponse = await fetchStoreByIdServer(product.storeId);
        if (storeResponse.success && storeResponse.data) {
          store = storeResponse.data;
        }
      } catch (storeError) {
        // Continue without store data - component can handle it
      }
    } else {
      notFound();
    }
  } catch (error) {
    notFound();
  }

  // If product not found or inactive, show 404
  if (!product || !product.isActive) {
    notFound();
  }

  // Generate structured data for SEO (JSON-LD)
  const structuredData = product ? {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": product.name,
    "description": product.description || `${product.name} - Shop at Invictus Mall`,
    "image": (product.imageUrls && product.imageUrls.length > 0) 
      ? product.imageUrls 
      : (product.imageUrl ? [product.imageUrl] : []),
    "brand": {
      "@type": "Brand",
      "name": store?.name || "Invictus Mall"
    },
    "offers": {
      "@type": "Offer",
      "url": `https://invictusmall.com/products/${product.id}`,
      "priceCurrency": "USD",
      "price": product.price.toFixed(2),
      "availability": product.stockQuantity > 0 
        ? "https://schema.org/InStock" 
        : "https://schema.org/OutOfStock",
      "priceValidUntil": new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      "seller": {
        "@type": "Store",
        "name": store?.name || "Invictus Mall"
      }
    }
  } : null;

  return (
    <>
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      )}
      <Header />
      <ProductDetailContent 
        productId={id} 
        initialProduct={product}
        initialStore={store}
      />
    </>
  );
}

// Enable ISR for product pages - revalidate every 5 minutes
// This balances SEO (static content) with freshness (periodic updates)
export const revalidate = 300;

