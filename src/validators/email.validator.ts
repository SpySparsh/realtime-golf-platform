import { assertString } from "@/validators/common";

export function validateSendEmailInput(body: any) {
  assertString(body?.to, "to");
  assertString(body?.subject, "subject");
  assertString(body?.html, "html");

  return {
    to: body.to,
    subject: body.subject,
    html: body.html,
  };
}

