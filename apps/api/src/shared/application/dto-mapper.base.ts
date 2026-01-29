/**
 * Base interface for DTO mappers.
 * Provides a consistent pattern for converting between domain entities and DTOs.
 *
 * @template Entity - Domain entity type
 * @template DTO - Data transfer object type
 */
export interface DtoMapper<Entity, DTO> {
  /**
   * Converts a domain entity to a DTO for API responses.
   */
  toDto(entity: Entity): DTO;

  /**
   * Converts multiple entities to DTOs.
   */
  toDtoList(entities: Entity[]): DTO[];
}

/**
 * Abstract base class for DTO mappers with common functionality.
 */
export abstract class BaseDtoMapper<Entity, DTO> implements DtoMapper<
  Entity,
  DTO
> {
  abstract toDto(entity: Entity): DTO;

  toDtoList(entities: Entity[]): DTO[] {
    return entities.map((entity) => this.toDto(entity));
  }
}

/**
 * Pagination DTO for list responses.
 */
export interface PaginatedDto<T> {
  items: T[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

/**
 * Helper function to create a paginated response DTO.
 */
export function createPaginatedDto<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
): PaginatedDto<T> {
  const totalPages = Math.ceil(total / pageSize);
  return {
    items,
    meta: {
      total,
      page,
      pageSize,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}

/**
 * Common timestamp fields for DTOs.
 */
export interface TimestampedDto {
  createdAt: string;
  updatedAt: string;
}

/**
 * Common ID field for DTOs.
 */
export interface IdentifiableDto {
  id: string;
}

/**
 * Common workspace-scoped DTO fields.
 */
export interface WorkspaceScopedDto extends IdentifiableDto {
  workspaceId: string;
}

/**
 * Combines common DTO traits.
 */
export interface BaseEntityDto
  extends IdentifiableDto, TimestampedDto, WorkspaceScopedDto {}
