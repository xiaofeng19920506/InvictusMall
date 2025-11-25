export function isConnectionError(error: any): boolean {
  if (!error) return false;
  
  const errorCode = (error as any)?.code;
  const errorMessage = String((error as any)?.message || '').toLowerCase();
  
  return (
    errorCode === 'ECONNREFUSED' ||
    errorCode === 'ETIMEDOUT' ||
    errorCode === 'ENOTFOUND' ||
    errorMessage.includes('connection') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('network')
  );
}

