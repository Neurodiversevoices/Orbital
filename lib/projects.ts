/**
 * Project Management System
 * Manages persistent projects, work items, and content queue for Orbital and custom projects
 */

export enum PostStatus {
  DRAFT = "DRAFT",
  APPROVED = "APPROVED",
  POSTED = "POSTED",
  REJECTED = "REJECTED",
}

export interface Post {
  post_id: string;
  project_id: string;
  platform: "TikTok" | "Instagram" | "Twitter" | "LinkedIn";
  scheduled_date: string; // "2026-03-30"
  scheduled_time: string; // "9:00 AM EST"
  copy: string; // Actual post text/hook
  visual_prompt: string; // Image generation prompt
  visual_url?: string;
  status: PostStatus;
  cta: string; // Call to action
  hashtags: string[];
  approved_at?: string;
  posted_at?: string;
  rejected_at?: string;
  rejection_reason?: string;
}

export interface ProjectWork {
  work_id: string;
  project_id: string;
  team: string; // "RESEARCH", "PRODUCT", "MARKETING", "OPERATIONS", "FINANCE", "SALES"
  task: string; // "Plan content for TikTok"
  status: "pending" | "in_progress" | "complete" | "blocked";
  priority: "P0" | "P1" | "P2";
  outputs: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Project {
  project_id: string;
  name: string; // "Orbital", "MyFitnessApp"
  description: string;
  teams: string[]; // Default: ["RESEARCH", "PRODUCT", "OPERATIONS", "FINANCE", "MARKETING", "SALES"]
  work_items: ProjectWork[];
  posts_queue: Post[];
  context: Record<string, any>; // Mission, target_users, launch_target, etc.
  created_at: string;
  updated_at: string;
}

/**
 * ProjectManager Singleton
 * Manages all projects and their work/content
 */
class ProjectManager {
  private projects: Map<string, Project> = new Map();
  private projectIdCounter = 0;

  constructor() {
    this.initializeOrbital();
  }

  private initializeOrbital(): void {
    const orbitalProject: Project = {
      project_id: "orbital",
      name: "Orbital",
      description: "AI execution engine for founders — capacity management & execution orchestration",
      teams: ["RESEARCH", "PRODUCT", "OPERATIONS", "FINANCE", "MARKETING", "SALES"],
      work_items: [],
      posts_queue: [],
      context: {
        mission: "Build AI execution engine for founders to manage capacity and execute projects",
        target_users: "Solo founders, early-stage teams",
        launch_target: "App Store approval + 10 paying users by Q2 2026",
        current_focus: "Sprint 7 — App Store + Revenue",
        product_stage: "Public beta, build 74 pending",
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.projects.set("orbital", orbitalProject);
  }

  getProject(projectId: string): Project | undefined {
    return this.projects.get(projectId);
  }

  listProjects(): Project[] {
    return Array.from(this.projects.values());
  }

  createProject(name: string, description: string, context: Record<string, any> = {}): Project {
    const projectId = `project_${++this.projectIdCounter}_${Date.now()}`;
    const newProject: Project = {
      project_id: projectId,
      name,
      description,
      teams: ["RESEARCH", "PRODUCT", "OPERATIONS", "FINANCE", "MARKETING", "SALES"],
      work_items: [],
      posts_queue: [],
      context,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.projects.set(projectId, newProject);
    return newProject;
  }

  addWorkItem(projectId: string, team: string, task: string, priority: "P0" | "P1" | "P2" = "P1", outputs: Record<string, any> = {}): ProjectWork {
    const project = this.getProject(projectId);
    if (!project) throw new Error(`Project ${projectId} not found`);

    const workId = `work_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const workItem: ProjectWork = {
      work_id: workId,
      project_id: projectId,
      team,
      task,
      status: "pending",
      priority,
      outputs,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    project.work_items.push(workItem);
    project.updated_at = new Date().toISOString();
    return workItem;
  }

  updateWorkItem(projectId: string, workId: string, updates: Partial<ProjectWork>): ProjectWork {
    const project = this.getProject(projectId);
    if (!project) throw new Error(`Project ${projectId} not found`);

    const workItem = project.work_items.find((w) => w.work_id === workId);
    if (!workItem) throw new Error(`Work item ${workId} not found`);

    Object.assign(workItem, updates, { updated_at: new Date().toISOString() });
    project.updated_at = new Date().toISOString();
    return workItem;
  }

  addPostsToQueue(projectId: string, posts: Post[]): void {
    const project = this.getProject(projectId);
    if (!project) throw new Error(`Project ${projectId} not found`);

    project.posts_queue.push(...posts);
    project.updated_at = new Date().toISOString();
  }

  getDraftPosts(projectId: string, scheduledDate?: string): Post[] {
    const project = this.getProject(projectId);
    if (!project) return [];

    return project.posts_queue.filter((post) => {
      const isDraft = post.status === PostStatus.DRAFT;
      const dateMatch = !scheduledDate || post.scheduled_date === scheduledDate;
      return isDraft && dateMatch;
    });
  }

  approvePost(projectId: string, postId: string): Post {
    const project = this.getProject(projectId);
    if (!project) throw new Error(`Project ${projectId} not found`);

    const post = project.posts_queue.find((p) => p.post_id === postId);
    if (!post) throw new Error(`Post ${postId} not found`);

    post.status = PostStatus.APPROVED;
    post.approved_at = new Date().toISOString();
    project.updated_at = new Date().toISOString();
    return post;
  }

  rejectPost(projectId: string, postId: string, reason: string): Post {
    const project = this.getProject(projectId);
    if (!project) throw new Error(`Project ${projectId} not found`);

    const post = project.posts_queue.find((p) => p.post_id === postId);
    if (!post) throw new Error(`Post ${postId} not found`);

    post.status = PostStatus.REJECTED;
    post.rejected_at = new Date().toISOString();
    post.rejection_reason = reason;
    project.updated_at = new Date().toISOString();
    return post;
  }

  markPostAsPosted(projectId: string, postId: string): Post {
    const project = this.getProject(projectId);
    if (!project) throw new Error(`Project ${projectId} not found`);

    const post = project.posts_queue.find((p) => p.post_id === postId);
    if (!post) throw new Error(`Post ${postId} not found`);

    post.status = PostStatus.POSTED;
    post.posted_at = new Date().toISOString();
    project.updated_at = new Date().toISOString();
    return post;
  }
}

// Singleton instance
let projectManagerInstance: ProjectManager | null = null;

export function getProjectManager(): ProjectManager {
  if (!projectManagerInstance) {
    projectManagerInstance = new ProjectManager();
  }
  return projectManagerInstance;
}

export function createPost(
  projectId: string,
  platform: "TikTok" | "Instagram" | "Twitter" | "LinkedIn",
  scheduledDate: string,
  scheduledTime: string,
  copy: string,
  visualPrompt: string,
  cta: string,
  hashtags: string[] = []
): Post {
  return {
    post_id: `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    project_id: projectId,
    platform,
    scheduled_date: scheduledDate,
    scheduled_time: scheduledTime,
    copy,
    visual_prompt: visualPrompt,
    status: PostStatus.DRAFT,
    cta,
    hashtags,
  };
}
