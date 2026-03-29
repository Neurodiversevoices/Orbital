import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getOCC } from "../lib/occ";

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== "POST") {
    return response.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { command = "Plan content for Orbital", projectId = "orbital" } = request.body;

    if (!command || typeof command !== "string") {
      return response.status(400).json({ error: "command is required (string)" });
    }

    const occ = getOCC();
    occ.resetStatus();

    // Start execution asynchronously
    occ.autoCycle(command, projectId);

    return response.status(200).json({
      message: "OCC cycle started",
      command,
      projectId,
      status: "executing",
    });
  } catch (error) {
    console.error("OCC execution error:", error);
    return response.status(500).json({
      error: "Failed to execute OCC cycle",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
