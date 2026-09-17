/**
 * Service Authentication Port
 *
 * Defines the contract for validating internal service principal identities.
 */
export interface IServiceAuthenticationPort {
  /**
   * Checks whether the provided principal identifier is a recognized, trusted service.
   */
  isTrustedService(principal: string): boolean;

  /**
   * Verifies that the service principal is authentic, optionally validating
   * credentials such as the internal API key.
   */
  verifyService(principal: string, credentials?: { internalApiKey?: string }): Promise<boolean>;
}
