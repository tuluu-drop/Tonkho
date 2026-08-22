export type Page = {
  id: string;
  slug: string;
  title: string;
  content: string;
  parent_slug: string | null;
  sort_order: number;
  updated_at: string;
};

export type NavNode = Page & { children: NavNode[] };

// Dựng cây điều hướng từ danh sách phẳng
export function buildNavTree(pages: Page[]): NavNode[] {
  const roots: NavNode[] = [];
  const byParent = new Map<string, NavNode[]>();

  const nodes: NavNode[] = pages.map((p) => ({ ...p, children: [] }));

  for (const node of nodes) {
    if (node.parent_slug == null) {
      roots.push(node);
    } else {
      const arr = byParent.get(node.parent_slug) ?? [];
      arr.push(node);
      byParent.set(node.parent_slug, arr);
    }
  }

  for (const node of nodes) {
    node.children = (byParent.get(node.slug) ?? []).sort(
      (a, b) => a.sort_order - b.sort_order
    );
  }

  return roots.sort((a, b) => a.sort_order - b.sort_order);
}
