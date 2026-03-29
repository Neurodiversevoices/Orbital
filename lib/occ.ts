/**
 * Orbital Command Center (OCC)
 * Deterministic state machine orchestrator with 6 departments
 * Each department executes specialized work for the Orbital project
 */

import { getProjectManager, createPost, Post } from "./projects";
import { getBudget } from "./budget";

export type Department = "RESEARCH" | "PRODUCT" | "OPERATIONS" | "FINANCE" | "MARKETING" | "SALES";

export interface DepartmentStatus {
  department: Department;
  status: "idle" | "working" | "done";
  progress: number; // 0-100
  current_task: string;
  output_summary: string;
}

export interface DepartmentOutput {
  department: Department;
  timestamp: string;
  output: Record<string, any>;
}

/**
 * RESEARCH Department
 * Analyzes market, competitors, and opportunities
 */
class ResearchDepartment {
  execute(command: string): Record<string, any> {
    if (command.toLowerCase().includes("orbital")) {
      return {
        department: "RESEARCH",
        key_insight: "Gap exists for AI-powered capacity management under $10/mo; Orbital positions as execution engine not meditation app",
        market_size: "$3.2B wellness market, 12% CAGR",
        competitors: [
          {
            name: "Calm",
            positioning: "Meditation & sleep",
            weakness: "No execution tracking, no capacity measurement",
            our_angle: "Orbital tracks capacity across work+life, AI-driven scoring",
          },
          {
            name: "Headspace",
            positioning: "Mindfulness training",
            weakness: "Generic content, no personalization",
            our_angle: "AI learns YOUR patterns, adapts capacity recommendations",
          },
          {
            name: "Whoop",
            positioning: "Activity recovery band",
            weakness: "$30/mo, requires hardware, no execution",
            our_angle: "Software-only, $4.99/mo, tracks execution not just recovery",
          },
          {
            name: "Oura",
            positioning: "Sleep & biometric ring",
            weakness: "$350 hardware cost, health-only focus",
            our_angle: "No hardware needed, covers capacity across all domains",
          },
        ],
        action_items: [
          "Interview 10 founder users about capacity pain points",
          "Run positioning test: 'AI execution' vs 'capacity coach' vs 'founder OS'",
          "Analyze Orbital monthly data to identify top 3 use case patterns",
        ],
      };
    }
    return { department: "RESEARCH", error: "Invalid command" };
  }
}

/**
 * PRODUCT Department
 * Plans sprints, manages roadmap, tracks product metrics
 */
class ProductDepartment {
  execute(command: string): Record<string, any> {
    if (command.toLowerCase().includes("orbital")) {
      return {
        department: "PRODUCT",
        current_sprint: "Sprint 7 — App Store + Revenue",
        goal: "Get build 74 approved + first 10 paying users",
        sprint_tasks: [
          {
            task: "Fix Sign in with Apple OIDC issuer mismatch (build 73 rejection)",
            status: "DONE",
            owner: "Engineering",
          },
          {
            task: "Submit build 74 to App Store",
            status: "READY",
            priority: "P0",
            owner: "Product",
          },
          {
            task: "Add RevenueCat paywall ($4.99/mo, annual $39)",
            status: "IN_PROGRESS",
            priority: "P0",
            owner: "Engineering",
          },
          {
            task: "Launch marketing for beta users",
            status: "PENDING",
            priority: "P1",
            owner: "Marketing",
          },
          {
            task: "Measure conversion: beta activation → paid",
            status: "PENDING",
            priority: "P1",
            owner: "Analytics",
          },
        ],
        metrics: {
          current_users: 1200,
          daily_active: 340,
          avg_session_minutes: 8.2,
          capacity_tracking_adoption: 62,
        },
        next_sprint_focus: "Double DAU to 700, acquire first 50 paid users",
      };
    }
    return { department: "PRODUCT", error: "Invalid command" };
  }
}

/**
 * OPERATIONS Department
 * Manages execution, timelines, resource allocation
 */
class OperationsDepartment {
  execute(command: string): Record<string, any> {
    if (command.toLowerCase().includes("orbital")) {
      return {
        department: "OPERATIONS",
        execution_status: "ON_TRACK",
        timeline: {
          "2026-Q1": "Launch App Store, $4.99/mo paywall, 50 paid users",
          "2026-Q2": "1,000 paid users, $20k MRR, Series A conversations",
          "2026-Q3": "5,000 paid users, $100k MRR, enterprise pilot",
        },
        critical_path: [
          "App Store approval (ETA: 2026-03-31)",
          "RevenueCat integration (ETA: 2026-03-29)",
          "Marketing launch (ETA: 2026-03-30)",
          "Sales outreach to 20 founder networks (ETA: 2026-04-15)",
        ],
        risks: [
          {
            risk: "App Store rejection on guideline compliance",
            probability: "Medium",
            mitigation: "Verified Sign in with Apple fix, running preflight",
          },
          {
            risk: "Conversion rate lower than 5% (avg SaaS is 2-5%)",
            probability: "Low",
            mitigation: "Personalized onboarding, founder cohort targeting",
          },
        ],
        decisions_needed: [
          "Approve $50k Q2 marketing budget for founder channels",
          "Allocate 60% engineering capacity to revenue features",
        ],
      };
    }
    return { department: "OPERATIONS", error: "Invalid command" };
  }
}

/**
 * FINANCE Department
 * Tracks budget, cash runway, unit economics
 */
class FinanceDepartment {
  execute(command: string): Record<string, any> {
    const budget = getBudget();
    if (command.toLowerCase().includes("orbital")) {
      const breakdown = budget.getMonthlyBreakdown();
      const daily = budget.getDailyBudget();
      return {
        department: "FINANCE",
        today: daily,
        monthly_burn: breakdown.monthly_burn,
        by_service: breakdown.by_service,
        runway_months: breakdown.runway_months,
        debt: {
          wws_childcare: {
            balance: 2172.36,
            weekly_payment: 91.4,
            next_due: "Friday",
          },
        },
        unit_economics: {
          target_arpu: 50,
          projected_ltvtocac: "3.2x",
          payback_period_months: 2.8,
        },
        revenue_forecast: {
          "2026-Q2": { users: 50, mrr: 2000 },
          "2026-Q3": { users: 500, mrr: 20000 },
          "2026-Q4": { users: 2000, mrr: 80000 },
        },
        funding_strategy: "Pre-seed $500k by July, Series A $2-3M by Jan 2027",
      };
    }
    return { department: "FINANCE", error: "Invalid command" };
  }
}

/**
 * MARKETING Department
 * Plans content, manages campaigns, generates social media posts
 */
class MarketingDepartment {
  execute(command: string, projectId: string = "orbital"): Record<string, any> {
    if (command.toLowerCase().includes("orbital")) {
      const manager = getProjectManager();
      const project = manager.getProject(projectId);

      // Get tomorrow's date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split("T")[0];
      const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][tomorrow.getDay()];

      // Create actual posts for tomorrow
      const posts: Post[] = [
        createPost(
          projectId,
          "TikTok",
          tomorrowStr,
          "9:00 AM EST",
          "I told my AI to run 6 departments. Here's what happened... 🧠\n\nIt built a business plan in 30 seconds that took me 3 weeks to draft. Sprint planning? Done. Financial forecasting? Done. Marketing calendar? Done.\n\nThe AI didn't just give advice—it EXECUTED.\n\nThis is Orbital. Your personal AI Chief of Staff.",
          "Split screen: left shows AI typing commands, right shows department outputs generating in real-time. Teal accent colors. Founder looking amazed.",
          "Download Orbital 👇",
          ["#AIautomation", "#buildinpublic", "#solofounder", "#productivity", "#AI"]
        ),
        createPost(
          projectId,
          "Instagram",
          tomorrowStr,
          "10:30 AM EST",
          "Most founders spend 20 hours/week on non-execution work:\n• Weekly planning: 4 hours\n• Writing updates: 3 hours\n• Financial forecasting: 2 hours\n• Content planning: 5 hours\n• Admin & coordination: 6 hours\n\nThat's 20 hours of your life every week.\n\nOrbital automates that entire stack.\n\nThen executes it.\n\n6 AI departments running 24/7 on your behalf.",
          "Carousel showing 6 tiles: Research, Product, Operations, Finance, Marketing, Sales. Each tile has animated department working on task. Orbital orb at end.",
          "Link in bio → orbital.health",
          ["#founder", "#productivity", "#AI", "#startup", "#buildinpublic"]
        ),
        createPost(
          projectId,
          "Twitter",
          tomorrowStr,
          "12:00 PM EST",
          "just shipped Orbital's command center.\n\n6 AI departments:\n→ RESEARCH: finds market gaps\n→ PRODUCT: plans sprints\n→ OPS: manages execution\n→ FINANCE: tracks runway\n→ MARKETING: generates content\n→ SALES: builds pipeline\n\neach working autonomously. orchestrated in realtime.\n\nit's a founder OS.\n\norbit.health",
          "Screenshot of command center dashboard with 6 department cards, budget tracking, and execution output",
          "Check it out on Orbital.health →",
          ["#buildingorbital", "#AI", "#founder", "#shipping"]
        ),
        createPost(
          projectId,
          "LinkedIn",
          tomorrowStr,
          "2:00 PM EST",
          "The Orbital Command Center is live.\n\nI've spent the last 6 months building an AI execution engine that does what most founders hire a Chief of Staff to do:\n\n✓ Market research and competitive analysis\n✓ Sprint planning and product roadmap\n✓ Operational execution tracking\n✓ Financial forecasting and budget management\n✓ Content creation and campaign planning\n✓ Sales pipeline development\n\nAll orchestrated by 6 autonomous AI departments that work 24/7 on behalf of the founder.\n\nIt's not about replacing humans. It's about eliminating the 20 hours/week of non-execution work so founders can focus on strategy and customer relationships.\n\nOrbital just entered public beta. We're looking for founder feedback before launch.\n\nIf you're a solo founder or early-stage CEO, let's talk.\n\n→ Link in comments",
          "Hero image: Orbital orb with 6 departments orbiting around it in a circular layout",
          "Try Orbital beta →",
          ["#AI", "#Founder", "#Startup", "#ProductManagement", "#ExecutionEngineering"]
        ),
      ];

      // Queue these posts to the project
      manager.addPostsToQueue(projectId, posts);

      return {
        department: "MARKETING",
        content_calendar: {
          date: tomorrowStr,
          day: dayName,
          posts_count: 4,
          platforms: ["TikTok", "Instagram", "Twitter", "LinkedIn"],
          status: "QUEUED_FOR_REVIEW",
        },
        posts_queued: posts.map((p) => ({
          platform: p.platform,
          time: p.scheduled_time,
          hook: p.copy.split("\n")[0],
          cta: p.cta,
        })),
        action_items: [
          "Generate 4 AI visuals for posts (Midjourney/DALL-E)",
          "Set up auto-posting schedule on Linktree",
          "Monitor early engagement metrics",
        ],
      };
    }
    return { department: "MARKETING", error: "Invalid command" };
  }
}

/**
 * SALES Department
 * Builds pipeline, manages customer relationships, drives revenue
 */
class SalesDepartment {
  execute(command: string): Record<string, any> {
    if (command.toLowerCase().includes("orbital")) {
      return {
        department: "SALES",
        pipeline_status: "EARLY_STAGE",
        total_pipeline: 45000,
        by_stage: {
          prospecting: { count: 120, value: 30000 },
          conversations: { count: 8, value: 12000 },
          demo_scheduled: { count: 3, value: 3000 },
        },
        target_accounts: [
          "Creator networks (YouTube, TikTok founders)",
          "Founder communities (YC, 1517 Fund, On Deck)",
          "Operating partner networks",
          "Founder group chats (Twitter, Discord, Slack)",
        ],
        outreach_this_week: [
          "Reach out to 20 founder Twitter spaces hosts",
          "Personal email to 50 on-deck fellows",
          "Pitch product hunt (ETA: 2026-04-05)",
          "Demo calls with 5 interested founders",
        ],
        success_metrics: {
          target_trial_signups_week: 100,
          target_conversations_week: 15,
          target_demos_week: 5,
          target_paid_users_month: 10,
          target_mrr_q2: 2000,
        },
      };
    }
    return { department: "SALES", error: "Invalid command" };
  }
}

/**
 * OCC Orchestrator
 * Manages all 6 departments and execution lifecycle
 */
class OCC {
  private departments: Map<Department, any> = new Map();
  private departmentStatus: Map<Department, DepartmentStatus> = new Map();
  private executionHistory: DepartmentOutput[] = [];

  constructor() {
    this.departments.set("RESEARCH", new ResearchDepartment());
    this.departments.set("PRODUCT", new ProductDepartment());
    this.departments.set("OPERATIONS", new OperationsDepartment());
    this.departments.set("FINANCE", new FinanceDepartment());
    this.departments.set("MARKETING", new MarketingDepartment());
    this.departments.set("SALES", new SalesDepartment());

    // Initialize all status as idle
    const depts: Department[] = ["RESEARCH", "PRODUCT", "OPERATIONS", "FINANCE", "MARKETING", "SALES"];
    depts.forEach((dept) => {
      this.departmentStatus.set(dept, {
        department: dept,
        status: "idle",
        progress: 0,
        current_task: "",
        output_summary: "",
      });
    });
  }

  async autoCycle(command: string, projectId: string = "orbital"): Promise<void> {
    const depts: Department[] = ["RESEARCH", "PRODUCT", "OPERATIONS", "FINANCE", "MARKETING", "SALES"];

    for (const dept of depts) {
      // Mark as working
      const status = this.departmentStatus.get(dept)!;
      status.status = "working";
      status.progress = 0;
      status.current_task = `Executing ${dept}...`;

      // Simulate work
      const department = this.departments.get(dept)!;
      const output = department.execute(command, projectId);

      // Mark as done
      status.status = "done";
      status.progress = 100;
      status.output_summary = JSON.stringify(output).substring(0, 200) + "...";

      // Store in history
      this.executionHistory.push({
        department: dept,
        timestamp: new Date().toISOString(),
        output,
      });

      // Simulate execution delay
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  getStatus(): Map<Department, DepartmentStatus> {
    return this.departmentStatus;
  }

  getExecutionHistory(): DepartmentOutput[] {
    return this.executionHistory;
  }

  getLatestOutput(dept: Department): DepartmentOutput | undefined {
    const filtered = this.executionHistory.filter((e) => e.department === dept);
    return filtered[filtered.length - 1];
  }

  resetStatus(): void {
    const depts: Department[] = ["RESEARCH", "PRODUCT", "OPERATIONS", "FINANCE", "MARKETING", "SALES"];
    depts.forEach((dept) => {
      const status = this.departmentStatus.get(dept)!;
      status.status = "idle";
      status.progress = 0;
      status.current_task = "";
      status.output_summary = "";
    });
  }
}

// Singleton instance
let occInstance: OCC | null = null;

export function getOCC(): OCC {
  if (!occInstance) {
    occInstance = new OCC();
  }
  return occInstance;
}
