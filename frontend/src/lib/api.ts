// Shared API client & constants for CleanMate
export const API_BASE = (process.env.EXPO_PUBLIC_BACKEND_URL || "") + "/api";

export const COLORS = {
  background: "#FFFFFF",
  surface: "#F8FAFC",
  surfaceSecondary: "#F1F5F9",
  primary: "#005BB5",
  primaryLight: "#E6F0FA",
  secondary: "#10B981",
  destructive: "#EF4444",
  destructiveLight: "#FEE2E2",
  textPrimary: "#020617",
  textSecondary: "#64748B",
  textTertiary: "#94A3B8",
  border: "#E2E8F0",
};

export type PhotoAnalysis = {
  photo_id: string;
  category: string;
  label: string;
  description: string;
  content_hash: string;
  quality_score: number;
  features: string[];
};

export type DuplicateGroup = {
  id: string;
  type: "exact" | "similar";
  category: string;
  photo_ids: string[];
  recommended_keep: string;
  space_mb: number;
};

export type EmailItem = {
  id: string;
  sender: string;
  sender_email: string;
  subject: string;
  preview: string;
  category: "spam" | "promotions" | "newsletters" | "social" | "useful";
  received_at: string;
  is_read: boolean;
  size_kb: number;
};

export type UserStats = {
  photos_cleaned: number;
  space_saved_mb: number;
  emails_cleaned: number;
  albums_organized: number;
  last_scan: string | null;
};

export async function apiGet<T>(path: string): Promise<T> {
  const r = await fetch(`${API_BASE}${path}`);
  if (!r.ok) throw new Error(`GET ${path} -> ${r.status}`);
  return r.json();
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`POST ${path} -> ${r.status}`);
  return r.json();
}

export const CATEGORY_META: Record<string, { label: string; color: string; image: string }> = {
  screenshot: {
    label: "Screenshots",
    color: "#6366F1",
    image: "https://images.unsplash.com/photo-1606327054536-e37e655d4f4a?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1Mjh8MHwxfHNlYXJjaHwxfHxjbGVhbiUyMGRvY3VtZW50JTIwb24lMjBkZXNrJTIwbWluaW1hbHxlbnwwfHx8fDE3Nzc1NzYwNzF8MA&ixlib=rb-4.1.0&q=85",
  },
  selfie: {
    label: "Selfies",
    color: "#EC4899",
    image: "https://images.unsplash.com/photo-1719666993553-0085d8daecce?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1NzZ8MHwxfHNlYXJjaHwyfHxhZXN0aGV0aWMlMjBsaWZlc3R5bGUlMjBwaG90b3xlbnwwfHx8fDE3Nzc1NzYwNTh8MA&ixlib=rb-4.1.0&q=85",
  },
  document: {
    label: "Documents",
    color: "#0EA5E9",
    image: "https://images.unsplash.com/photo-1606327054536-e37e655d4f4a?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1Mjh8MHwxfHNlYXJjaHwxfHxjbGVhbiUyMGRvY3VtZW50JTIwb24lMjBkZXNrJTIwbWluaW1hbHxlbnwwfHx8fDE3Nzc1NzYwNzF8MA&ixlib=rb-4.1.0&q=85",
  },
  food: {
    label: "Food",
    color: "#F59E0B",
    image: "https://images.unsplash.com/photo-1764397514715-37a966071228?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzV8MHwxfHNlYXJjaHw0fHxkZWxpY2lvdXMlMjBnb3VybWV0JTIwZm9vZCUyMHBsYXRlfGVufDB8fHx8MTc3NzU3NjA1OHww&ixlib=rb-4.1.0&q=85",
  },
  pet: {
    label: "Pets",
    color: "#EF4444",
    image: "https://images.unsplash.com/photo-1719666993553-0085d8daecce?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1NzZ8MHwxfHNlYXJjaHwyfHxhZXN0aGV0aWMlMjBsaWZlc3R5bGUlMjBwaG90b3xlbnwwfHx8fDE3Nzc1NzYwNTh8MA&ixlib=rb-4.1.0&q=85",
  },
  landscape: {
    label: "Landscapes",
    color: "#10B981",
    image: "https://images.unsplash.com/photo-1645497265285-17096c1a429e?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NjZ8MHwxfHNlYXJjaHw0fHxtaW5pbWFsaXN0JTIwc3RhY2tlZCUyMHBob3RvcyUyMGFsYnVtfGVufDB8fHx8MTc3NzU3NjA3MXww&ixlib=rb-4.1.0&q=85",
  },
  people: { label: "People", color: "#8B5CF6", image: "" },
  receipt: { label: "Receipts", color: "#14B8A6", image: "" },
  meme: { label: "Memes", color: "#F97316", image: "" },
  blurry: { label: "Blurry", color: "#94A3B8", image: "" },
  other: { label: "Other", color: "#64748B", image: "" },
};

export const EMAIL_CATEGORY_META: Record<EmailItem["category"], { label: string; color: string }> = {
  spam: { label: "Spam", color: "#EF4444" },
  promotions: { label: "Promotions", color: "#F59E0B" },
  newsletters: { label: "Newsletters", color: "#0EA5E9" },
  social: { label: "Social", color: "#8B5CF6" },
  useful: { label: "Useful", color: "#10B981" },
};
