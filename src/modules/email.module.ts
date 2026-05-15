import { EmailService } from "@/services/email.service";

export function createEmailService() {
  return new EmailService();
}

