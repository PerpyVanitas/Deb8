"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle()
  if (!profile?.is_admin) throw new Error("Forbidden")
  return { supabase, actorId: user.id }
}

async function logAudit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  actorId: string,
  action: string,
  targetType: string,
  targetId: string,
  metadata?: Record<string, unknown>,
) {
  await supabase.from("admin_audit_logs").insert({
    actor_id: actorId,
    action,
    target_type: targetType,
    target_id: targetId,
    metadata: metadata ?? null,
  })
}

export async function toggleUserAdmin(userId: string, makeAdmin: boolean) {
  const { supabase, actorId } = await requireAdmin()
  const { error } = await supabase.from("profiles").update({ is_admin: makeAdmin }).eq("id", userId)
  if (error) throw error
  await logAudit(supabase, actorId, makeAdmin ? "user.promote_admin" : "user.demote_admin", "profile", userId)
  revalidatePath("/admin/users")
  revalidatePath("/admin")
}

export async function createMotion(form: FormData) {
  const { supabase, actorId } = await requireAdmin()
  const text = String(form.get("text") ?? "").trim()
  const category = String(form.get("category") ?? "policy")
  const topic_domain = String(form.get("topic_domain") ?? "general")
  const difficultyRaw = Number(form.get("difficulty") ?? 2)
  const difficulty = Number.isFinite(difficultyRaw) ? Math.max(1, Math.min(5, difficultyRaw)) : 2
  const format = String(form.get("format") ?? "BP")

  if (!text) throw new Error("Motion text is required")

  const { data, error } = await supabase
    .from("motions")
    .insert({ text, category, topic_domain, difficulty, format })
    .select("id")
    .single()
  if (error) throw error

  await logAudit(supabase, actorId, "motion.create", "motion", data.id, { text, category })
  revalidatePath("/admin/motions")
  revalidatePath("/admin")
}

export async function deleteMotion(motionId: string) {
  const { supabase, actorId } = await requireAdmin()
  const { error } = await supabase.from("motions").delete().eq("id", motionId)
  if (error) throw error
  await logAudit(supabase, actorId, "motion.delete", "motion", motionId)
  revalidatePath("/admin/motions")
  revalidatePath("/admin")
}
