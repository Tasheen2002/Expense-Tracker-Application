import { ReceiptTagDefinition } from "../entities/receipt-tag-definition.entity";
import { TagId } from "../value-objects/tag-id";

import {
  PaginatedResult,
  PaginationOptions,
} from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";

export interface IReceiptTagDefinitionRepository {
  save(tag: ReceiptTagDefinition): Promise<void>;
  findById(
    id: TagId,
    workspaceId: string,
  ): Promise<ReceiptTagDefinition | null>;
  findByName(
    name: string,
    workspaceId: string,
  ): Promise<ReceiptTagDefinition | null>;
  findByWorkspace(
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<ReceiptTagDefinition>>;
  exists(id: TagId, workspaceId: string): Promise<boolean>;
  existsByName(name: string, workspaceId: string): Promise<boolean>;
  delete(id: TagId, workspaceId: string): Promise<void>;
}
