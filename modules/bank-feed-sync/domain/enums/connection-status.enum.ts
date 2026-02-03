/**
 * Status of bank connection
 */
export enum ConnectionStatus {
  PENDING = "PENDING", // Connection initiated, awaiting user authorization
  CONNECTED = "CONNECTED", // Successfully connected and active
  EXPIRED = "EXPIRED", // Token expired, needs re-authorization
  ERROR = "ERROR", // Connection error occurred
  DISCONNECTED = "DISCONNECTED", // User disconnected the account
}
