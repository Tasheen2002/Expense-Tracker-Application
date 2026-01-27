import { PrismaClient } from '@prisma/client'
import { ApprovalChainRepository } from '../../domain/repositories/approval-chain.repository'
import { ApprovalChain } from '../../domain/entities/approval-chain.entity'
import { ApprovalChainId } from '../../domain/value-objects/approval-chain-id'
import { WorkspaceId } from '../../../identity-workspace/domain/value-objects/workspace-id.vo'
import { CategoryId } from '../../../expense-ledger/domain/value-objects/category-id'

export class PrismaApprovalChainRepository implements ApprovalChainRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(chain: ApprovalChain): Promise<void> {
    await this.prisma.approvalChain.upsert({
      where: { id: chain.getId().getValue() },
      create: {
        id: chain.getId().getValue(),
        workspaceId: chain.getWorkspaceId().getValue(),
        name: chain.getName(),
        description: chain.getDescription(),
        minAmount: chain.getMinAmount(),
        maxAmount: chain.getMaxAmount(),
        categoryIds: chain.getCategoryIds()?.map(id => id.getValue()) || [],
        requiresReceipt: chain.requiresReceipt(),
        approverSequence: chain.getApproverSequence(),
        isActive: chain.isActive(),
        createdAt: chain.getCreatedAt(),
        updatedAt: chain.getUpdatedAt(),
      },
      update: {
        name: chain.getName(),
        description: chain.getDescription(),
        minAmount: chain.getMinAmount(),
        maxAmount: chain.getMaxAmount(),
        categoryIds: chain.getCategoryIds()?.map(id => id.getValue()) || [],
        requiresReceipt: chain.requiresReceipt(),
        approverSequence: chain.getApproverSequence(),
        isActive: chain.isActive(),
        updatedAt: chain.getUpdatedAt(),
      },
    })
  }

  async findById(chainId: ApprovalChainId): Promise<ApprovalChain | null> {
    const row = await this.prisma.approvalChain.findUnique({
      where: { id: chainId.getValue() },
    })

    return row ? this.toDomain(row) : null
  }

  async findByWorkspace(workspaceId: string): Promise<ApprovalChain[]> {
    const rows = await this.prisma.approvalChain.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    })

    return rows.map(row => this.toDomain(row))
  }

  async findActiveByWorkspace(workspaceId: string): Promise<ApprovalChain[]> {
    const rows = await this.prisma.approvalChain.findMany({
      where: {
        workspaceId,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return rows.map(row => this.toDomain(row))
  }

  async findApplicableChain(params: {
    workspaceId: string
    amount: number
    categoryId?: string
    hasReceipt: boolean
  }): Promise<ApprovalChain | null> {
    const chains = await this.findActiveByWorkspace(params.workspaceId)

    for (const chain of chains) {
      if (chain.appliesTo({
        amount: params.amount,
        categoryId: params.categoryId,
        hasReceipt: params.hasReceipt,
      })) {
        return chain
      }
    }

    return null
  }

  async delete(chainId: ApprovalChainId): Promise<void> {
    await this.prisma.approvalChain.delete({
      where: { id: chainId.getValue() },
    })
  }

  private toDomain(row: any): ApprovalChain {
    return ApprovalChain.reconstitute({
      chainId: ApprovalChainId.fromString(row.id),
      workspaceId: WorkspaceId.fromString(row.workspaceId),
      name: row.name,
      description: row.description,
      minAmount: row.minAmount ? Number(row.minAmount) : undefined,
      maxAmount: row.maxAmount ? Number(row.maxAmount) : undefined,
      categoryIds: row.categoryIds?.length > 0 ? row.categoryIds.map((id: string) => CategoryId.fromString(id)) : undefined,
      requiresReceipt: row.requiresReceipt,
      approverSequence: row.approverSequence,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })
  }
}
