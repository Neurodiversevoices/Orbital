export type Command = {
  id: string;
  label: string;
  hint?: string;
  icon?: string;
  group?: string;
  run: () => void | Promise<void>;
  keywords?: string[];
};

const COMMANDS: Command[] = [];

export const registerCommand = (cmd: Command) => {
  const existing = COMMANDS.findIndex((c) => c.id === cmd.id);
  if (existing >= 0) COMMANDS[existing] = cmd;
  else COMMANDS.push(cmd);
};

export const allCommands = (): Command[] => [...COMMANDS];

export const fuzzyMatch = (query: string, cmd: Command): number => {
  if (!query) return 1;
  const q = query.toLowerCase();
  const corpus = [cmd.label, cmd.hint, cmd.group, ...(cmd.keywords ?? [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (corpus.includes(q)) return 10 - corpus.indexOf(q) / 100;
  let qi = 0;
  let score = 0;
  for (const c of corpus) {
    if (c === q[qi]) {
      qi++;
      score++;
      if (qi === q.length) break;
    }
  }
  return qi === q.length ? score / q.length : 0;
};
