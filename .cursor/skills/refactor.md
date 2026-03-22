---
name: refactor
description: Refactor a file or component
---
# Refactor
1. Read the target file completely
2. Identify: unused imports, as any casts, non-typed interfaces, ungated console.log
3. Fix all issues without changing business logic
4. Run npx tsc --noEmit to verify
5. Show a summary of changes made
