import { BankConnection } from "../../domain/entities/bank-connection.entity";
import { BankConnectionService } from "../services/bank-connection.service";

export interface UpdateConnectionTokenCommand {
  workspaceId: string;
  connectionId: string;
  accessToken: string;
  tokenExpiresAt?: Date;
}

export class UpdateConnectionTokenHandler {
  constructor(private readonly bankConnectionService: BankConnectionService) {}

  async handle(command: UpdateConnectionTokenCommand): Promise<BankConnection> {
    return await this.bankConnectionService.updateConnectionToken(command);
  }
}
