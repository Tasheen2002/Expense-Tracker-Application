/**
 * Interface for cache service.
 * Abstracts caching implementation (in-memory, Redis, etc.)
 */
export interface ICacheService {
  /**
   * Gets a value from cache.
   * @returns The cached value or null if not found/expired.
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Sets a value in cache with optional TTL.
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttlSeconds - Time to live in seconds (optional)
   */
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;

  /**
   * Deletes a value from cache.
   */
  delete(key: string): Promise<void>;

  /**
   * Deletes all keys matching a pattern.
   */
  deletePattern(pattern: string): Promise<void>;

  /**
   * Checks if a key exists in cache.
   */
  exists(key: string): Promise<boolean>;

  /**
   * Clears all cached values.
   */
  clear(): Promise<void>;

  /**
   * Gets or sets a value using a factory function.
   * If key exists, returns cached value.
   * If not, calls factory, caches result, and returns it.
   */
  getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlSeconds?: number,
  ): Promise<T>;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number | null;
}

/**
 * In-memory cache implementation.
 * Suitable for single-process applications.
 * For distributed systems, use Redis implementation instead.
 */
export class InMemoryCacheService implements ICacheService {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(cleanupIntervalMs: number = 60000) {
    // Periodic cleanup of expired entries
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, cleanupIntervalMs);
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      return null;
    }

    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.cache.set(key, { value, expiresAt });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async deletePattern(pattern: string): Promise<void> {
    const regex = new RegExp(
      "^" + pattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$",
    );

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  async exists(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlSeconds?: number,
  ): Promise<T> {
    const cached = await this.get<T>(key);

    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  private cleanupExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt !== null && now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Stops the cleanup interval (for graceful shutdown).
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Gets cache statistics (for monitoring).
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Cache key generators for common patterns
export const CacheKeys = {
  user: (userId: string) => `user:${userId}`,
  userByEmail: (email: string) => `user:email:${email}`,
  workspace: (workspaceId: string) => `workspace:${workspaceId}`,
  workspaceMembers: (workspaceId: string) => `workspace:${workspaceId}:members`,
  budget: (budgetId: string) => `budget:${budgetId}`,
  budgetsByWorkspace: (workspaceId: string) =>
    `workspace:${workspaceId}:budgets`,
  expense: (expenseId: string) => `expense:${expenseId}`,
  category: (categoryId: string) => `category:${categoryId}`,
  categoriesByWorkspace: (workspaceId: string) =>
    `workspace:${workspaceId}:categories`,
};
