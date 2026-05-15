import { assertString } from "@/validators/common";

export function validateExecuteDrawInput(body: any) {
  assertString(body?.drawMonth, "drawMonth");
  return { drawMonth: body.drawMonth };
}

