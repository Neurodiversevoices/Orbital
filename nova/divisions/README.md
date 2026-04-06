# Nova Divisions — n8n Workflow Specs

Each division is an n8n workflow. All free. All self-hosted.

## Division Roster

| Division | Trigger | Output | Frequency |
|----------|---------|--------|-----------|
| **Creative** | Schedule (hourly) | Images to nova/media/ | 1/hour |
| **R&D** | Schedule (daily 6am) | Findings to nova/memory/research.jsonl | 1/day |
| **Ops** | Schedule (every 5 min) | Health status to nova/memory/ | 288/day |
| **CFO** | Schedule (daily 8am) | Revenue report email | 1/day |
| **Media** | Webhook (on-demand) | Video clips to nova/media/ | On demand |
| **CEO Brief** | Schedule (daily 7am) | Email digest to owner | 1/day |

## How to Import

1. Open n8n at `http://localhost:5678`
2. Settings > Import from File
3. Select any `.json` from this directory
4. Activate the workflow

## Expert-Only Policy

Each workflow must:
- Have error handling (on-error node)
- Log results to nova/memory/
- Self-verify output quality
- Never call paid APIs
