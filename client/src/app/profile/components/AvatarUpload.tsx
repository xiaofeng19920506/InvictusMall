import Image from "next/image";
import { getAvatarUrl } from "@/utils/imageUtils";
import { uploadAvatarAction } from "../actions";

interface AvatarUploadProps {
  currentAvatar?: string | null;
  firstName?: string;
  lastName?: string;
  email?: string;
}

function buildInitials(
  firstName?: string,
  lastName?: string,
  email?: string
): string {
  const initials = (firstName?.charAt(0) ?? "") + (lastName?.charAt(0) ?? "");
  if (initials.trim()) {
    return initials.toUpperCase();
      }
  return email?.charAt(0).toUpperCase() ?? "U";
}

export default function AvatarUpload({
  currentAvatar,
  firstName,
  lastName,
  email,
}: AvatarUploadProps) {
  const avatarUrl = getAvatarUrl(currentAvatar);
  const initials = buildInitials(firstName, lastName, email);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <div className="relative w-32 h-32 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center border-4 border-white shadow-lg">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={`${firstName ?? "User"} ${lastName ?? ""}`.trim()}
              fill
              sizes="128px"
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-400 to-orange-600 text-white text-3xl font-bold">
              {initials}
            </div>
          )}
        </div>
          </div>

      <form
        action={uploadAvatarAction}
        className="flex w-full max-w-xs flex-col items-center gap-3"
      >
        <label
          htmlFor="avatar"
          className="w-full cursor-pointer text-sm font-medium text-gray-700"
        >
          <span className="block text-center rounded-md border border-dashed border-gray-300 px-4 py-2 hover:border-orange-400 hover:text-orange-600 transition-colors">
            Choose Image
          </span>
          <input
            id="avatar"
            name="avatar"
            type="file"
            accept="image/*"
            required
            className="sr-only"
          />
        </label>
        <button
          type="submit"
          className="w-full bg-orange-500 text-white py-2 px-4 rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors cursor-pointer"
        >
          Upload Avatar
        </button>
      </form>

      <p className="text-xs text-gray-500 text-center">
        Supported formats: JPG, PNG. Maximum size 5MB.
      </p>
    </div>
  );
}
