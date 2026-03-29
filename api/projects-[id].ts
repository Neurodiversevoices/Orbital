import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getProjectManager } from "../lib/projects";

export default function handler(request: VercelRequest, response: VercelResponse) {
  try {
    const { id } = request.query;
    if (!id || typeof id !== "string") {
      return response.status(400).json({ error: "Project ID is required" });
    }

    const manager = getProjectManager();
    const project = manager.getProject(id);

    if (!project) {
      return response.status(404).json({ error: `Project ${id} not found` });
    }

    if (request.method === "GET") {
      return response.status(200).json({ project });
    }

    return response.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Project detail endpoint error:", error);
    return response.status(500).json({
      error: "Failed to process project request",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
