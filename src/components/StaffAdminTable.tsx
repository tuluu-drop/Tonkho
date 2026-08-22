"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import type { StaffFull } from "@/app/admin/nhan-vien/page";

const TEAMS = ["Kho Trung Tâm", "Kho Hà Nội", "Trung tâm xử lý đơn hàng"];

// Nhân viên rỗng để thêm mới
function emptyStaff(): StaffFull {
  return {
    id: "", mnv: "", name: "", team: TEAMS[0], role: "", gender: "",
    phone: "", start_date: "", end_date: "", cccd: "", dob: "",
    address: "", salary: "", sort_order: 999,
  };
}

export default function StaffAdminTable({ rows }: { rows: StaffFull[] }) {
  const supabase = createClient();
  const [editing, setEditing] = useState<StaffFull | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [data, setData] = useState<StaffFull[]>(rows);
  const [showResigned, setShowResigned] = useState(false);

  const isResigned = (r: StaffFull) => !!(r.end_date && r.end_date.trim());
  const resignedCount = data.filter(isResigned).length;
  const visibleData = showResigned ? data : data.filter((r) => !isResigned(r));

  function openAdd() {
    setEditing(emptyStaff());
    setIsNew(true);
    setMsg("");
  }

  function openEdit(r: StaffFull) {
    setEditing({ ...r });
    setIsNew(false);
    setMsg("");
  }

  async function save() {
    if (!editing) return;
    if (!editing.name.trim() || !editing.mnv.trim()) {
      setMsg("Vui lòng nhập Mã NV và Họ tên.");
      return;
    }
    setSaving(true);
    setMsg("");

    const payload = {
      mnv: editing.mnv,
      name: editing.name,
      team: editing.team,
      role: editing.role,
      phone: editing.phone,
      start_date: editing.start_date,
      end_date: editing.end_date,
      cccd: editing.cccd,
      dob: editing.dob,
      address: editing.address,
      salary: editing.salary,
      sort_order: editing.sort_order,
    };

    if (isNew) {
      const { data: inserted, error } = await supabase
        .from("staff")
        .insert(payload)
        .select()
        .single();
      setSaving(false);
      if (error) {
        setMsg(
          error.code === "23505"
            ? "Mã NV đã tồn tại. Dùng mã khác."
            : "Lỗi: không thêm được. Bạn có quyền không?"
        );
        return;
      }
      setData((d) => [...d, inserted as StaffFull]);
      setMsg("✓ Đã thêm nhân viên");
      setEditing(null);
    } else {
      const { error } = await supabase
        .from("staff")
        .update(payload)
        .eq("id", editing.id);
      setSaving(false);
      if (error) {
        setMsg("Lỗi: không lưu được. Bạn có quyền sửa không?");
        return;
      }
      setData((d) => d.map((r) => (r.id === editing.id ? editing : r)));
      setMsg("✓ Đã lưu");
      setEditing(null);
    }
  }

  async function remove(r: StaffFull) {
    const ok = window.confirm(
      `Xóa nhân viên ${r.mnv} - ${r.name}?\nThao tác này không hoàn tác được.`
    );
    if (!ok) return;
    const { error } = await supabase.from("staff").delete().eq("id", r.id);
    if (error) {
      setMsg("Lỗi: không xóa được. Bạn có quyền không?");
      return;
    }
    setData((d) => d.filter((x) => x.id !== r.id));
    setMsg(`✓ Đã xóa ${r.mnv}`);
  }

  return (
    <>
      <div className="staff-toolbar">
        <span style={{ color: "var(--muted)", fontSize: 14 }}>
          Đang hiển thị: {visibleData.length} nhân viên
          {resignedCount > 0 && ` · ${resignedCount} đã nghỉ việc`}
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          {resignedCount > 0 && (
            <button
              className="btn btn-ghost"
              style={{ width: "auto", padding: "6px 14px", fontSize: 13 }}
              onClick={() => setShowResigned((v) => !v)}
            >
              {showResigned ? "Ẩn người đã nghỉ" : "Hiện người đã nghỉ"}
            </button>
          )}
          <button
            className="btn btn-primary"
            style={{ width: "auto", padding: "6px 14px", fontSize: 13 }}
            onClick={openAdd}
          >
            ＋ Thêm nhân viên
          </button>
        </div>
      </div>

      {TEAMS.map((team) => {
        const list = visibleData.filter((r) => r.team === team);
        if (list.length === 0) return null;
        return (
          <section key={team} style={{ marginTop: 24 }}>
            <h2 className="staff-team-title">
              {team} <span className="staff-count">{list.length}</span>
            </h2>
            <div className="staff-table-wrap">
              <table className="staff-table admin">
                <thead>
                  <tr>
                    <th>Mã NV</th>
                    <th>Họ tên</th>
                    <th>Chức vụ</th>
                    <th>Điện thoại</th>
                    <th>CCCD</th>
                    <th>Ngày sinh</th>
                    <th>Địa chỉ</th>
                    <th>Lương</th>
                    <th>Ngày vào</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((r) => (
                    <tr key={r.id} className={isResigned(r) ? "resigned" : ""}>
                      <td className="mono">{r.mnv}</td>
                      <td>
                        {r.name}
                        {isResigned(r) && (
                          <span className="resigned-tag">đã nghỉ {r.end_date}</span>
                        )}
                      </td>
                      <td>{r.role}</td>
                      <td className="mono">{r.phone}</td>
                      <td className="mono secret">{r.cccd || "—"}</td>
                      <td className="secret">{r.dob || "—"}</td>
                      <td className="secret addr">{r.address || "—"}</td>
                      <td className="mono secret">{r.salary || "—"}</td>
                      <td>{r.start_date}</td>
                      <td>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            className="btn btn-primary"
                            style={{ width: "auto", padding: "6px 12px", fontSize: 13 }}
                            onClick={() => openEdit(r)}
                          >
                            Sửa
                          </button>
                          <button
                            className="btn btn-danger"
                            style={{ width: "auto", padding: "6px 12px", fontSize: 13 }}
                            onClick={() => remove(r)}
                          >
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      {editing && (
        <div className="modal-overlay" onClick={() => setEditing(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>
              {isNew ? "Thêm nhân viên mới" : `Sửa: ${editing.mnv} — ${editing.name}`}
            </h3>
            <div className="modal-grid">
              <Field label="Mã NV *" value={editing.mnv} onChange={(v) => setEditing({ ...editing, mnv: v })} disabled={!isNew} />
              <Field label="Họ tên *" value={editing.name} onChange={(v) => setEditing({ ...editing, name: v })} />
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Nhóm / Kho</label>
                <select
                  value={editing.team}
                  onChange={(e) => setEditing({ ...editing, team: e.target.value })}
                  style={{ width: "100%", padding: "11px 12px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 15, fontFamily: "inherit" }}
                >
                  {TEAMS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <Field label="Chức vụ" value={editing.role ?? ""} onChange={(v) => setEditing({ ...editing, role: v })} />
              <Field label="Điện thoại" value={editing.phone ?? ""} onChange={(v) => setEditing({ ...editing, phone: v })} />
              <Field label="Ngày vào" value={editing.start_date ?? ""} onChange={(v) => setEditing({ ...editing, start_date: v })} />
              <Field label="CCCD" value={editing.cccd ?? ""} onChange={(v) => setEditing({ ...editing, cccd: v })} />
              <Field label="Ngày sinh" value={editing.dob ?? ""} onChange={(v) => setEditing({ ...editing, dob: v })} />
              <Field label="Lương" value={editing.salary ?? ""} onChange={(v) => setEditing({ ...editing, salary: v })} />
              <Field label="Ngày nghỉ (để trống nếu đang làm)" value={editing.end_date ?? ""} onChange={(v) => setEditing({ ...editing, end_date: v })} />
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Địa chỉ" value={editing.address ?? ""} onChange={(v) => setEditing({ ...editing, address: v })} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" onClick={() => setEditing(null)}>
                Hủy
              </button>
              <button className="btn btn-primary" style={{ width: "auto" }} onClick={save} disabled={saving}>
                {saving ? "Đang lưu..." : isNew ? "Thêm" : "Lưu"}
              </button>
            </div>
            {msg && (
              <div className={msg.startsWith("✓") ? "msg-ok" : "msg-error"} style={{ marginTop: 12 }}>
                {msg}
              </div>
            )}
          </div>
        </div>
      )}

      {msg && !editing && (
        <div className={msg.startsWith("✓") ? "msg-ok" : "msg-error"} style={{ marginTop: 12 }}>
          {msg}
        </div>
      )}
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="field" style={{ marginBottom: 0 }}>
      <label>{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} />
    </div>
  );
}
