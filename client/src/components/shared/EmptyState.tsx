interface EmptyStateProps {
  icon?: string;
  title: string;
  message?: string;
  action?: React.ReactNode;
}

export default function EmptyState({
  icon = "📦",
  title,
  message,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="text-6xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      {message && <p className="text-gray-600 mb-4">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

