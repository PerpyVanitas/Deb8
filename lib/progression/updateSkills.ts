import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function updateSkills(userId: string, sessionId: string, newScores: any) {
  // 1. Fetch the last 9 skill snapshots for this user (to make 10 with the new one)
  const { data: pastSnapshots } = await supabase
    .from('skill_snapshots')
    .select('scores')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(9)

  const allScores = [newScores, ...(pastSnapshots || []).map(s => s.scores)]

  // 2. Compute the rolling average for the DNA
  const keys = ['structure', 'logic', 'rhetoric', 'rebuttal', 'weighing', 'overall']
  const averages: Record<string, number> = {}
  
  for (const key of keys) {
    const total = allScores.reduce((sum, s) => sum + (s[key] || 0), 0)
    averages[key] = parseFloat((total / allScores.length).toFixed(1))
  }

  // Calculate delta (current vs previous average)
  const delta: Record<string, number> = {}
  if (allScores.length > 1) {
    // previous average without the new score
    const prevScores = allScores.slice(1)
    for (const key of keys) {
      const prevTotal = prevScores.reduce((sum, s) => sum + (s[key] || 0), 0)
      const prevAvg = prevTotal / prevScores.length
      delta[key] = parseFloat((newScores[key] - prevAvg).toFixed(1))
    }
  } else {
    keys.forEach(k => delta[k] = 0)
  }

  // 3. Save the new snapshot
  await supabase.from('skill_snapshots').insert({
    user_id: userId,
    session_id: sessionId,
    scores: newScores,
    dna_delta: delta
  })

  // 4. Update the user profile with the new debate_dna
  await supabase
    .from('profiles')
    .update({ debate_dna: averages })
    .eq('id', userId)

  return averages
}
