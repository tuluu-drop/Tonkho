import { createClient } from "@/lib/supabase-server";
import { buildNavTree, type Page } from "@/lib/pages";
import WikiShell from "@/components/WikiShell";
import StaffPublicTable from "@/components/StaffPublicTable";

export const revalidate = 30;

export default async function StaffPage() {
  const supabase = createClient();

  const [{ data: pages }, { data: staff }] = await Promise.all([
    supabase
      .from("pages")
      .select("id, slug, title, content, parent_slug, sort_order, updated_at")
      .order("sort_order", { ascending: true }),
    supabase
      .from("staff_public")
      .select("*")
      .order("sort_order", { ascending: true }),
  ]);

  const tree = buildNavTree((pages ?? []) as Page[]);

  return (
    <WikiShell tree={tree} activeSlug="__staff">
      <h1 className="page-title">👥 Danh bạ nhân viên</h1>
      <StaffPublicTable rows={(staff ?? []) as never} />
    </WikiShell>
  );
}
