import ProfileContent from "@/components/ProfileContent";
import { fetchUserServer } from "@/lib/server-api";
import { User } from "@/models/User";
import { cookies } from 'next/headers';

export default async function ProfilePage() {
  const cookieStore = await cookies();
  
  // Build cookie header string properly
  const cookieHeader = cookieStore.getAll()
    .map(cookie => `${cookie.name}=${cookie.value}`)
    .join('; ');
  
  let initialUser: User | null = null;

  try {
    const response = await fetchUserServer(cookieHeader || undefined);
    if (response.success && response.user) {
      initialUser = response.user;
    }
  } catch (error) {
    // Log the full error for debugging
    console.error('Failed to fetch user on server:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : String(error),
      cookieHeader: cookieHeader ? 'Present' : 'Missing',
    });
    // Continue without initial user - the client component will handle authentication
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ProfileContent initialUser={initialUser} />
    </div>
  );
}

