import { WorkflowLogger } from "../types/WorkflowStep";

export class ConsoleLogger
  implements WorkflowLogger
{
  info(message: string) {
    console.log(message);
  }

  warn(message: string) {
    console.warn(message);
  }

  error(message: string) {
    console.error(message);
  }
}