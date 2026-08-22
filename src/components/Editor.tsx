"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { createClient } from "@/lib/supabase-browser";
import type { Page } from "@/lib/pages";

export default function Editor({ page }: { page: Page }) {
  const router = useRouter();
  const supabase = createClient();
  const [title, setTitle] = useState(page.title);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const editor = useEditor({
    extensions: [StarterKit],
    content: page.content || "<p></p>",
    immediatelyRender: false,
  });

  async function save() {
    if (!editor) return;
    setSaving(true);
    setMsg("");
    const { error } = await supabase
      .from("pages")
      .update({ title, content: editor.getHTML() })
      .eq("id", page.id);
    setSaving(false);
    if (error) {
      setMsg("Lỗi: không lưu được. Bạn có quyền sửa không?");
      return;
    }
    setMsg("✓ Đã lưu");
    router.refresh();
  }

  if (!editor) return null;

  const tb = editor;

  return (
    <div className="admin-shell">
      <div className="admin-head">
        <Link href="/admin" className="btn btn-ghost">
          ← Quay lại
        </Link>
        <div className="spacer" />
        <button className="btn btn-primary" style={{ width: "auto" }} onClick={save} disabled={saving}>
          {saving ? "Đang lưu..." : "Lưu"}
        </button>
      </div>

      <div className="field">
        <label>Tiêu đề trang</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>
        Nội dung
      </label>

      <div className="editor-toolbar">
        <button
          className={tb.isActive("heading", { level: 2 }) ? "on" : ""}
          onClick={() => tb.chain().focus().toggleHeading({ level: 2 }).run()}
          title="Tiêu đề lớn"
        >
          H2
        </button>
        <button
          className={tb.isActive("heading", { level: 3 }) ? "on" : ""}
          onClick={() => tb.chain().focus().toggleHeading({ level: 3 }).run()}
          title="Tiêu đề nhỏ"
        >
          H3
        </button>
        <button
          className={tb.isActive("bold") ? "on" : ""}
          onClick={() => tb.chain().focus().toggleBold().run()}
          title="In đậm"
        >
          B
        </button>
        <button
          className={tb.isActive("italic") ? "on" : ""}
          onClick={() => tb.chain().focus().toggleItalic().run()}
          style={{ fontStyle: "italic" }}
          title="In nghiêng"
        >
          I
        </button>
        <button
          className={tb.isActive("bulletList") ? "on" : ""}
          onClick={() => tb.chain().focus().toggleBulletList().run()}
          title="Danh sách gạch đầu dòng"
        >
          • Danh sách
        </button>
        <button
          className={tb.isActive("orderedList") ? "on" : ""}
          onClick={() => tb.chain().focus().toggleOrderedList().run()}
          title="Danh sách đánh số"
        >
          1. Số
        </button>
        <button
          className={tb.isActive("blockquote") ? "on" : ""}
          onClick={() => tb.chain().focus().toggleBlockquote().run()}
          title="Trích dẫn / lưu ý"
        >
          ❝ Lưu ý
        </button>
      </div>

      <EditorContent editor={editor} />

      {msg && <div className={msg.startsWith("✓") ? "msg-ok" : "msg-error"}>{msg}</div>}
    </div>
  );
}
