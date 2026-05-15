import type { NextRequest } from "next/server";
import { withApiHandler } from "@/middlewares/api-handler";
import { createEmailService } from "@/modules/email.module";
import { ok } from "@/utils/api-response";
import { validateSendEmailInput } from "@/validators/email.validator";

export const POST = withApiHandler(async (request: NextRequest) => {
  const input = validateSendEmailInput(await request.json());
  const emailService = createEmailService();
  const result = await emailService.sendRawEmail(input);
  return ok(result);
});
