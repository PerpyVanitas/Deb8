import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { CreateMotionForm } from "./_components/create-motion-form"
import { DeleteMotionButton } from "./_components/delete-motion-button"

export const dynamic = "force-dynamic"

export default async function AdminMotionsPage() {
  const supabase = await createClient()
  const { data: motions, count } = await supabase
    .from("motions")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(100)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Motions</h1>
        <p className="text-sm text-muted-foreground">
          {count ?? 0} motion{count === 1 ? "" : "s"} in the library.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add motion</CardTitle>
          <CardDescription>New motions become immediately available to all users.</CardDescription>
        </CardHeader>
        <CardContent>
          <CreateMotionForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Library</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Motion</TableHead>
                <TableHead className="hidden sm:table-cell">Category</TableHead>
                <TableHead className="hidden md:table-cell">Domain</TableHead>
                <TableHead className="hidden md:table-cell">Difficulty</TableHead>
                <TableHead className="hidden sm:table-cell">Format</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(motions ?? []).map((m: any) => (
                <TableRow key={m.id}>
                  <TableCell className="max-w-md">
                    <div className="font-medium text-pretty">{m.text}</div>
                    <div className="text-xs text-muted-foreground">
                      Added {new Date(m.created_at).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="secondary">{m.category ?? "—"}</Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {m.topic_domain ?? "—"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm">{m.difficulty ?? "—"}/5</TableCell>
                  <TableCell className="hidden sm:table-cell text-sm">{m.format ?? "BP"}</TableCell>
                  <TableCell className="text-right">
                    <DeleteMotionButton motionId={m.id} />
                  </TableCell>
                </TableRow>
              ))}
              {(!motions || motions.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                    No motions yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
