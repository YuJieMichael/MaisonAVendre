import { supabase } from "./supabase";
import type { Details, Plan, Visit } from "../project";

export type ReviewStatus =
  "draft" | "submitted" | "approved" | "changes_requested";
export type ProjectDraft = {
  plan: Plan;
  form: Details;
  services: string[];
  completed: boolean;
  visits: Visit[];
};
export type ProjectRow = {
  id: string;
  owner_id: string;
  plan: Plan;
  details: Partial<Details>;
  services: string[];
  completed: boolean;
  visits: Visit[];
  status: ReviewStatus;
  review_note: string | null;
  revision: number;
  updated_at: string;
};
export type FileRow = {
  id: string;
  project_id: string;
  owner_id: string;
  kind: "photo" | "document";
  name: string;
  size: number;
  mime_type: string;
  storage_path: string;
};
export type StoredFile = FileRow & { url: string };
export const FILE_BUCKET = "project-files";
const extensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

function client() {
  if (!supabase) throw new Error("BACKEND_NOT_CONFIGURED");
  return supabase;
}
export function errorCode(error: unknown): string {
  const value = error as { message?: string; code?: string };
  const text = `${value?.code ?? ""} ${value?.message ?? ""}`;
  if (/revision|conflict|40001/i.test(text)) return "CONFLICT";
  if (/PHOTO_REQUIRED|photo.*required|photo.*least/i.test(text))
    return "PHOTO_REQUIRED";
  if (/VALIDATION|incomplete|invalid.*details|required|22023|23514/i.test(text))
    return "VALIDATION";
  if (/NOT_CONFIGURED/.test(text)) return "CONFIG";
  if (/JWT|session|401|42501|permission|not authenticated/i.test(text))
    return "ACCESS";
  if (/LIMIT|limit|10 MB|too many|size/i.test(text)) return "FILE_LIMIT";
  return "NETWORK";
}
function row(data: unknown): ProjectRow {
  const result = Array.isArray(data) ? data[0] : data;
  if (!result || typeof result !== "object" || !("id" in result))
    throw new Error("INVALID_RESPONSE");
  return result as ProjectRow;
}
export async function ensureProject(): Promise<ProjectRow> {
  const { data, error } = await client().rpc("ensure_project");
  if (error) throw error;
  return row(data);
}
export async function fetchProject(id: string): Promise<ProjectRow> {
  const { data, error } = await client()
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return row(data);
}
export async function saveProject(
  current: ProjectRow,
  draft: ProjectDraft,
): Promise<ProjectRow> {
  const { data, error } = await client().rpc("save_project", {
    p_project_id: current.id,
    p_expected_revision: current.revision,
    p_plan: draft.plan,
    p_details: draft.form,
    p_services: draft.services,
    p_completed: draft.completed,
    p_visits: draft.visits,
  });
  if (error) throw error;
  return row(data);
}
export async function submitProject(current: ProjectRow): Promise<ProjectRow> {
  const { data, error } = await client().rpc("submit_project", {
    p_project_id: current.id,
    p_expected_revision: current.revision,
  });
  if (error) throw error;
  return row(data);
}
export async function listFiles(projectId: string): Promise<StoredFile[]> {
  const { data, error } = await client()
    .from("project_files")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at");
  if (error) throw error;
  return Promise.all(
    ((data || []) as FileRow[]).map(async (file) => {
      if (file.kind === "document") return { ...file, url: "" };
      const { data: link, error: linkError } = await client()
        .storage.from(FILE_BUCKET)
        .createSignedUrl(file.storage_path, 3600);
      if (linkError) throw linkError;
      return { ...file, url: link.signedUrl };
    }),
  );
}
export async function uploadFile(
  project: ProjectRow,
  file: File,
  kind: FileRow["kind"],
): Promise<void> {
  const extension = extensions[file.type];
  if (
    !extension ||
    (kind === "photo" && extension === "pdf") ||
    file.size === 0 ||
    file.size > 10 * 1024 * 1024 ||
    file.name.length > 255
  )
    throw new Error("FILE_LIMIT");
  const id = crypto.randomUUID();
  const storage_path = `${project.owner_id}/${project.id}/${id}.${extension}`;
  const { error } = await client()
    .storage.from(FILE_BUCKET)
    .upload(storage_path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  const { error: metadataError } = await client().from("project_files").insert({
    id,
    project_id: project.id,
    owner_id: project.owner_id,
    kind,
    name: file.name,
    size: file.size,
    mime_type: file.type,
    storage_path,
  });
  if (metadataError) {
    // Best-effort cleanup if metadata validation rejects an already uploaded object.
    await client().storage.from(FILE_BUCKET).remove([storage_path]);
    throw metadataError;
  }
}
export async function removeFile(file: FileRow): Promise<void> {
  const { error } = await client()
    .storage.from(FILE_BUCKET)
    .remove([file.storage_path]);
  if (error) throw error;
  const { error: metadataError } = await client()
    .from("project_files")
    .delete()
    .eq("id", file.id);
  if (metadataError) throw metadataError;
}
export async function downloadFile(
  file: FileRow,
  stillAuthorized: () => boolean = () => true,
): Promise<void> {
  const { data, error } = await client()
    .storage.from(FILE_BUCKET)
    .download(file.storage_path);
  if (error) throw error;
  if (!stillAuthorized()) throw new Error("SESSION_UNAVAILABLE");
  const url = URL.createObjectURL(data);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
