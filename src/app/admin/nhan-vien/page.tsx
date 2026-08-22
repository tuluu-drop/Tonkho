import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import SignOutButton from "@/components/SignOutButton";
import StaffAdminTable from "@/components/StaffAdminTable";

export const dynamic = "force-dynamic";

export type StaffFull = {
  id: string;
  mnv: string;
  name: string;
  team: string;
  role: string | null;
  gender: string | null;
  phone: string | null;
  start_date: string | null;
  end_date: string | null;
  cccd: string | null;
  dob: string | null;
  address: string | null;
  salary: string | null;
  sort_order: number;
};

export default async function AdminStaffPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("staff")
    .select("*")
    .order("sort_order", { ascending: true });

  const rows = (data ?? []) as StaffFull[];

  return (
    <div className="admin-shell" style={{ maxWidth: 1100 }}>
      <div className="admin-head">
        <Link href="/admin" className="btn btn-ghost">
          ← Quay lại
        </Link>
        <h1 style={{ marginLeft: 8 }}>Quản lý nhân viên</h1>
        <div className="spacer" />
        <SignOutButton />
      </div>

      <p style={{ color: "var(--muted)", fontSize: 14, marginTop: -8 }}>
        Trang này hiển thị đầy đủ thông tin mật (CCCD, lương, địa chỉ). Chỉ
        admin/quản lý đăng nhập mới xem được.
      </p>

      <StaffAdminTable rows={rows} />
    </div>
  );
}
