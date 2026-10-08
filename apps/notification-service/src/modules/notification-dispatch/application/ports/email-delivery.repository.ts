import { Notification } from '../../domain/entities/notification.entity';

export interface DeliveryClaim { notificationId: string; leaseToken: string; }
export interface DeliveryMessage {
  idempotencyKey: string;
  recipientId: string;
  recipientEmail: string;
  senderEmail: string;
  subject: string;
  content: string;
}
export interface IEmailDeliveryRepository {
  claim(limit: number): Promise<DeliveryClaim[]>;
  load(claim: DeliveryClaim): Promise<{ notification: Notification; message: DeliveryMessage | null } | null>;
  prepare(claim: DeliveryClaim, message: DeliveryMessage, provider: string, retrySafe?: boolean): Promise<DeliveryMessage | null>;
  complete(claim: DeliveryClaim, success: boolean, error?: string): Promise<boolean>;
  retry(claim: DeliveryClaim, error: string): Promise<boolean>;
}
