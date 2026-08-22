"use client";

import { useState } from "react";
import Link from "next/link";
import type { NavNode } from "@/lib/pages";

export default function WikiShell({
  tree,
  activeSlug,
  children,
}: {
  tree: NavNode[];
  activeSlug: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="shell">
      <header className="topbar">
        <button
          className="menu-btn"
          aria-label="Mở menu"
          onClick={() => setOpen((v) => !v)}
        >
          ☰
        </button>
        <Link href="/" className="brand">
          <img
            className="logo-mark"
            src="/logo-mark-white.png"
            alt="MIAvn"
            width={36}
            height={32}
          />
          <span className="brand-text">
            <span className="brand-title">
              WIKI KHO VẬN <span>MIAvn</span>
            </span>
            <span className="brand-sub">Wiki nội bộ cho bộ phận kho MIA</span>
          </span>
        </Link>
        <div className="spacer" />
        <Link href="/admin" className="admin-link">
          Quản lý
        </Link>
      </header>

      <div className="body">
        <div
          className={`overlay ${open ? "show" : ""}`}
          onClick={() => setOpen(false)}
        />
        <nav className={`nav ${open ? "open" : ""}`}>
          {tree.map((node) => (
            <div key={node.slug}>
              <NavItem
                node={node}
                activeSlug={activeSlug}
                level={0}
                onNavigate={() => setOpen(false)}
              />
              {/* Danh bạ nhân viên đứng ngay sau Trang chủ */}
              {node.slug === "trang-chu" && (
                <Link
                  href="/nhan-vien"
                  className={`nav-link level-0 ${
                    activeSlug === "__staff" ? "active" : ""
                  }`}
                  onClick={() => setOpen(false)}
                >
                  👥 Danh bạ nhân viên
                </Link>
              )}
            </div>
          ))}
        </nav>

        <main className="content">{children}</main>
      </div>
    </div>
  );
}

function NavItem({
  node,
  activeSlug,
  level,
  onNavigate,
}: {
  node: NavNode;
  activeSlug: string;
  level: number;
  onNavigate: () => void;
}) {
  const hasChildren = node.children.length > 0;

  // Mở sẵn nếu mục này hoặc con/cháu của nó đang active
  const containsActive = (n: NavNode): boolean =>
    n.slug === activeSlug || n.children.some(containsActive);
  const [expanded, setExpanded] = useState(() => containsActive(node));

  const isActive = node.slug === activeSlug;

  if (!hasChildren) {
    return (
      <Link
        href={`/wiki/${node.slug}`}
        className={`nav-link level-${level} ${isActive ? "active" : ""}`}
        onClick={onNavigate}
      >
        {node.title}
      </Link>
    );
  }

  return (
    <div className="nav-group">
      <button
        className={`nav-link nav-toggle level-${level} ${isActive ? "active" : ""}`}
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span className="nav-caret">{expanded ? "▾" : "▸"}</span>
        <span className="nav-title">{node.title}</span>
      </button>
      {expanded && (
        <div className="nav-children">
          {node.children.map((child) => (
            <NavItem
              key={child.slug}
              node={child}
              activeSlug={activeSlug}
              level={level + 1}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
