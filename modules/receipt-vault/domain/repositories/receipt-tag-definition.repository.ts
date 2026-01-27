import { ReceiptTagDefinition } from '../entities/receipt-tag-definition.entity'
import { TagId } from '../value-objects/tag-id'

export interface IReceiptTagDefinitionRepository {
  save(tag: ReceiptTagDefinition): Promise<void>
  findById(id: TagId, workspaceId: string): Promise<ReceiptTagDefinition | null>
  findByName(name: string, workspaceId: string): Promise<ReceiptTagDefinition | null>
  findByWorkspace(workspaceId: string): Promise<ReceiptTagDefinition[]>
  exists(id: TagId, workspaceId: string): Promise<boolean>
  existsByName(name: string, workspaceId: string): Promise<boolean>
  delete(id: TagId, workspaceId: string): Promise<void>
}
