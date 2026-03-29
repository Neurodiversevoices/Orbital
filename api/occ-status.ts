import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getOCC } from "../lib/occ";

export default function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== "GET") {
    return response.status(405).json({ error: "Method not allowed" });
  }

  try {
    const occ = getOCC();
    const status = occ.getStatus();
    const history = occ.getExecutionHistory();

    // Convert Map to object for JSON serialization
    const statusObj: Record<string, any> = {};
    status.forEach((value, key) => {
      statusObj[key] = value;
    });

    return response.status(200).json({
      status: statusObj,
      execution_history_count: history.length,
      latest_execution: history.length > 0 ? history[history.length - 1] : null,
    });
  } catch (error) {
    console.error("Status check error:", error);
    return response.status(500).json({
      error: "Failed to get OCC status",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
