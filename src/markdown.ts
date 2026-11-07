import { randomBytes } from "node:crypto";

export interface LocalTime {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  second: string;
}

export function localTime(date: Date, timeZone: string): LocalTime {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

export const VAULT_DIR = "Documents/OpenRecord";
export const DEFAULT_TOPIC = "Inbox";

export function recordPath(date: Date, timeZone: string): string {
  const t = localTime(date, timeZone);
  return `${VAULT_DIR}/${t.year}-${t.month}-${t.day}T${t.hour}${t.minute}${t.second}.md`;
}

// Lowercase and hyphenate so Obsidian accepts the tag.
export function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase().replace(/^#/, "").replace(/\s+/g, "-");
}

function yamlString(value: string): string {
  return /^[\w][\w .\-/]*$/.test(value) ? value : JSON.stringify(value);
}

export function buildMarkdown(opts: {
  date: Date;
  timeZone: string;
  device: string;
  text: string;
  topic?: string;
  tags?: string[];
  id?: string;
}): string {
  const t = localTime(opts.date, opts.timeZone);
  const created = `${t.year}-${t.month}-${t.day}T${t.hour}:${t.minute}:${t.second}`;
  const id = opts.id ?? randomBytes(4).toString("hex");
  const topic = opts.topic?.trim() || DEFAULT_TOPIC;
  const tags = [...new Set((opts.tags ?? []).map(normalizeTag).filter(Boolean))];
  const tagLines = tags.length ? `tags:\n${tags.map((x) => `  - ${yamlString(x)}`).join("\n")}\n` : "tags: []\n";
  return (
    `---\nid: ${id}\ntopic: ${yamlString(topic)}\n${tagLines}` +
    `created: ${created}\nsource: Alexa\ndevice: ${yamlString(opts.device)}\n---\n\n` +
    `${opts.text.trim()}\n\n[[${topic}]]\n`
  );
}
