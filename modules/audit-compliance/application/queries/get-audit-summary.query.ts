import { AuditService, AuditSummary } from "../services/audit.service";

export class GetAuditSummaryQuery {
  constructor(
    public readonly workspaceId: string,
    public readonly startDate: Date,
    public readonly endDate: Date,
  ) {}
}

export class GetAuditSummaryHandler {
  constructor(private readonly auditService: AuditService) {}

  async handle(query: GetAuditSummaryQuery): Promise<AuditSummary> {
    return await this.auditService.getAuditSummary(
      query.workspaceId,
      query.startDate,
      query.endDate,
    );
  }
}
