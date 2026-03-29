import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getProjectManager } from "../lib/projects";

export default function handler(request: VercelRequest, response: VercelResponse) {
  try {
    const manager = getProjectManager();

    if (request.method === "GET") {
      // List all projects
      const projects = manager.listProjects();
      return response.status(200).json({
        projects: projects.map((p) => ({
          project_id: p.project_id,
          name: p.name,
          description: p.description,
          teams: p.teams,
          work_items_count: p.work_items.length,
          posts_queue_count: p.posts_queue.length,
          created_at: p.created_at,
          updated_at: p.updated_at,
        })),
      });
    }

    if (request.method === "POST") {
      // Create new project
      const { name, description, context = {} } = request.body;

      if (!name || typeof name !== "string") {
        return response.status(400).json({ error: "name is required (string)" });
      }

      const newProject = manager.createProject(name, description || "", context);
      return response.status(201).json({
        message: "Project created",
        project: newProject,
      });
    }

    return response.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Projects endpoint error:", error);
    return response.status(500).json({
      error: "Failed to process projects request",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
