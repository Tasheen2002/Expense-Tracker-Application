import { IChannelProvider, SendResult } from "./channel-provider.interface";

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

export class EmailProvider implements IChannelProvider {
  private config: EmailConfig;

  constructor(config: EmailConfig) {
    this.config = config;
  }

  async send(params: {
    recipientId: string;
    recipientEmail?: string;
    subject: string;
    content: string;
    data?: Record<string, unknown>;
  }): Promise<SendResult> {
    if (!params.recipientEmail) {
      return {
        success: false,
        error: "Recipient email is required for email channel",
      };
    }

    try {
      // TODO: Integrate with Nodemailer
      // For now, log the email and return success
      console.log(`[EMAIL PROVIDER]`);
      console.log(`  From: ${this.config.from}`);
      console.log(`  To: ${params.recipientEmail}`);
      console.log(`  Subject: ${params.subject}`);
      console.log(`  Content: ${params.content.substring(0, 100)}...`);

      // In production, this would use nodemailer:
      // const transporter = nodemailer.createTransport(this.config);
      // const info = await transporter.sendMail({
      //   from: this.config.from,
      //   to: params.recipientEmail,
      //   subject: params.subject,
      //   html: params.content,
      // });

      return {
        success: true,
        messageId: `mock-email-${Date.now()}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to send email",
      };
    }
  }
}
