import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getProjectManager, PostStatus } from "../lib/projects";

export default function handler(request: VercelRequest, response: VercelResponse) {
  try {
    const { projectId, action } = request.query;

    if (!projectId || typeof projectId !== "string") {
      return response.status(400).json({ error: "projectId is required" });
    }

    const manager = getProjectManager();
    const project = manager.getProject(projectId);

    if (!project) {
      return response.status(404).json({ error: `Project ${projectId} not found` });
    }

    // GET /api/projects-posts?projectId=orbital - List draft posts for today/tomorrow
    if (request.method === "GET") {
      const { date } = request.query;
      const draftPosts = manager.getDraftPosts(projectId, typeof date === "string" ? date : undefined);

      return response.status(200).json({
        project_id: projectId,
        draft_posts: draftPosts,
        count: draftPosts.length,
      });
    }

    // POST /api/projects-posts?projectId=orbital&action=approve - Approve a post
    if (request.method === "POST" && action === "approve") {
      const { postId } = request.body;

      if (!postId || typeof postId !== "string") {
        return response.status(400).json({ error: "postId is required" });
      }

      const post = manager.approvePost(projectId, postId);
      return response.status(200).json({
        message: "Post approved",
        post,
      });
    }

    // POST /api/projects-posts?projectId=orbital&action=reject - Reject a post
    if (request.method === "POST" && action === "reject") {
      const { postId, reason = "" } = request.body;

      if (!postId || typeof postId !== "string") {
        return response.status(400).json({ error: "postId is required" });
      }

      const post = manager.rejectPost(projectId, postId, reason);
      return response.status(200).json({
        message: "Post rejected",
        post,
      });
    }

    return response.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Posts management endpoint error:", error);
    return response.status(500).json({
      error: "Failed to process posts request",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
