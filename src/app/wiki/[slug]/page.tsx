import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { buildNavTree, type Page } from "@/lib/pages";
import WikiShell from "@/components/WikiShell";
import ArticleContent from "@/components/ArticleContent";

// ISR: làm mới tối đa mỗi 60s
export const revalidate = 60;

// Kiểu nhẹ cho nav (không có content)
type NavRow = Pick<Page, "id" | "slug" | "title" | "parent_slug" | "sort_order"> & {
  content: string;
};

export default async function WikiPage({
  params,
}: {
  params: { slug: string };
}) {
  const supabase = createClient();

  // 2 query song song: nav nhẹ (không content) + đúng 1 bài hiện tại
  const [{ data: navRows }, { data: current }] = await Promise.all([
    supabase
      .from("pages")
      .select("id, slug, title, parent_slug, sort_order")
      .order("sort_order", { ascending: true }),
    supabase
      .from("pages")
      .select("slug, title, content, parent_slug, updated_at")
      .eq("slug", params.slug)
      .single(),
  ]);

  if (!navRows) {
    return (
      <div className="content">
        <p>Chưa kết nối được cơ sở dữ liệu. Kiểm tra biến môi trường Supabase.</p>
      </div>
    );
  }
  if (!current) notFound();

  // buildNavTree cần trường content — thêm rỗng cho nav
  const tree = buildNavTree(
    (navRows as NavRow[]).map((r) => ({ ...r, content: "" })) as Page[]
  );

  const parent = current.parent_slug
    ? (navRows as NavRow[]).find((p) => p.slug === current.parent_slug)
    : null;

  const updated = new Date(current.updated_at).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <WikiShell tree={tree} activeSlug={current.slug}>
      {parent && <div className="crumb">{parent.title} /</div>}
      <h1 className="page-title">{current.title}</h1>
      <div className="updated">Cập nhật: {updated}</div>
      <ArticleContent html={current.content} />
    </WikiShell>
  );
}
