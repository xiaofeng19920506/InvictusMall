import StoreDetailContent from "@/components/StoreDetailContent";
import { fetchStoreByIdServer, Store } from "@/lib/server-api";
import { notFound } from "next/navigation";

interface StorePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function StoreDetailPage({ params }: StorePageProps) {
  const { id } = await params;
  
  let initialStore: Store | null = null;
  
  try {
    const response = await fetchStoreByIdServer(id);
    if (response.success) {
      initialStore = response.data;
    } else {
      notFound();
    }
  } catch (error) {
    console.error('Failed to fetch store on server:', error);
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <StoreDetailContent initialStore={initialStore} />
    </div>
  );
}

