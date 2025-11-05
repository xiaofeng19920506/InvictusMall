import HomeContent from "@/components/HomeContent";
import { fetchStoresServer, Store } from "@/lib/server-api";

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
    <div className="min-h-screen bg-gray-50">
      <HomeContent 
        initialStores={initialStores}
        initialSearch={params.search || ''}
        initialCategory={params.category || 'All'}
        initialSearchType={params.searchType || 'All'}
      />
    </div>
  );
}
