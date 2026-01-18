# n8n Field Mapping – Comment Automation

## Input Fields (AI Node Reads)

| Field | Type | Description |
|-------|------|-------------|
| `postText` | string | Full text of LinkedIn post |
| `authorRole` | string | Poster's role (clinician, executive, founder, etc.) |
| `postTopic` | string | Optional topic tag (outcomes, burnout, value-based-care, etc.) |

## Output Fields (AI Node Writes)

| Field | Type | Description |
|-------|------|-------------|
| `comment` | string | Generated comment or "SKIP" |

## Workflow Notes

- Filter out posts where `comment` = "SKIP" before publishing
- No auto-post without human review gate
- Log all generated comments for voice calibration
