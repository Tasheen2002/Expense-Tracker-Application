import { Category } from "../entities/category.entity";
import { CategoryId } from "../value-objects/category-id";

export interface CategoryRepository {
  save(category: Category): Promise<void>;

  update(category: Category): Promise<void>;

  findById(id: CategoryId, workspaceId: string): Promise<Category | null>;

  findByName(name: string, workspaceId: string): Promise<Category | null>;

  findByWorkspace(workspaceId: string): Promise<Category[]>;

  findActiveByWorkspace(workspaceId: string): Promise<Category[]>;

  delete(id: CategoryId, workspaceId: string): Promise<void>;

  exists(id: CategoryId, workspaceId: string): Promise<boolean>;

  existsByName(name: string, workspaceId: string): Promise<boolean>;
}
