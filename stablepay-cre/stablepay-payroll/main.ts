import { Runner, sendErrorResponse } from "@chainlink/cre-sdk";
import { initWorkflow, type WorkflowConfig } from "./src/workflow";

export async function main() {
  const runner = await Runner.newRunner<WorkflowConfig>();
  await runner.run(initWorkflow);
}

main().catch(sendErrorResponse);
