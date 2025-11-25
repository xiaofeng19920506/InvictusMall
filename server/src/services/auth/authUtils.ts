export function isConnectionError(error: any): boolean {
  if (!error) return false;

  const connectionErrorCodes = new Set([
    "ER_ACCESS_DENIED_ERROR",
    "ECONNREFUSED",
    "ENOTFOUND",
    "ETIMEDOUT",
    "PROTOCOL_CONNECTION_LOST",
    "ER_BAD_DB_ERROR",
    "ECONNRESET",
  ]);

  const connectionErrnos = new Set([2002, 2003, 1045, 1049, 2013]);

  if ("code" in error && typeof error.code === "string" && connectionErrorCodes.has(error.code)) {
    return true;
  }

  if ("errno" in error && typeof error.errno === "number" && connectionErrnos.has(error.errno)) {
    return true;
  }

  if (error?.fatal === true) {
    return true;
  }

  if (typeof error?.message === "string") {
    const message = error.message;
    return (
      message.includes("connect ECONNREFUSED") ||
      message.includes("Connection lost") ||
      message.includes("getaddrinfo ENOTFOUND") ||
      message.includes("read ECONNRESET")
    );
  }

  return false;
}

