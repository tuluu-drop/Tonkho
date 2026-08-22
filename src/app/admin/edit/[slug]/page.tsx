import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import type { Page } from "@/lib/pages";
import Editor from "@/components/Editor";

export const dynamic = "force-dynamic";

export default async function EditPage({
  params,
}: {
  params: { slug: string };
}) {
  const supabase = createClient();
  const { data } = await supabase
    .from("pages")
    .select("id, slug, title, content, parent_slug, sort_order, updated_at")
    .eq("slug", params.slug)
    .single();

  if (!data) notFound();

  return <Editor page={data as Page} />;
}
