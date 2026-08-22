import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { buildNavTree, type Page } from "@/lib/pages";
import SignOutButton from "@/components/SignOutButton";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const supabase = createClient();
  const { data: pages } = await supabase
    .from("pages")
    .select("id, slug, title, content, parent_slug, sort_order, updated_at")
    .order("sort_order", { ascending: true });

  const tree = buildNavTree((pages ?? []) as Page[]);

  return (
    <div className="admin-shell">
      <div className="admin-head">
        <h1>Quản lý nội dung Wiki</h1>
        <div className="spacer" />
        <Link href="/admin/nhan-vien" className="btn btn-ghost">
          Quản lý nhân viên
        </Link>
        <Link href="/" className="btn btn-ghost">
          Xem Wiki
        </Link>
        <SignOutButton />
      </div>

      <div className="admin-list">
        {tree.map((node) => (
          <div key={node.slug}>
            <div className="admin-row">
              <span className="t">{node.title}</span>
              <span className="s" />
              <Link href={`/admin/edit/${node.slug}`} className="btn btn-primary" style={{ width: "auto" }}>
                Sửa
              </Link>
            </div>
            {node.children.map((c) => (
              <div className="admin-row child" key={c.slug}>
                <span className="t">{c.title}</span>
                <span className="s" />
                <Link href={`/admin/edit/${c.slug}`} className="btn btn-primary" style={{ width: "auto" }}>
                  Sửa
                </Link>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
