"use client";

import { useState } from "react";

type StaffPublic = {
  mnv: string;
  name: string;
  team: string;
  role: string | null;
  phone: string | null;
  start_date: string | null;
  end_date: string | null;
};

const TEAMS = ["Kho Trung Tâm", "Kho Hà Nội", "Trung tâm xử lý đơn hàng"];

export default function StaffPublicTable({ rows }: { rows: StaffPublic[] }) {
  const [showResigned, setShowResigned] = useState(false);

  const isResigned = (r: StaffPublic) => !!(r.end_date && r.end_date.trim());
  const resignedCount = rows.filter(isResigned).length;
  const visible = showResigned ? rows : rows.filter((r) => !isResigned(r));

  return (
    <>
      <div className="staff-toolbar">
        <span className="updated">
          Đang hiển thị: {visible.length} nhân viên
          {resignedCount > 0 && ` · ${resignedCount} đã nghỉ việc`}
        </span>
        {resignedCount > 0 && (
          <button
            className="btn btn-ghost"
            style={{ width: "auto", padding: "6px 14px", fontSize: 13 }}
            onClick={() => setShowResigned((v) => !v)}
          >
            {showResigned ? "Ẩn người đã nghỉ" : "Hiện người đã nghỉ"}
          </button>
        )}
      </div>

      {TEAMS.map((team) => {
        const list = visible.filter((r) => r.team === team);
        if (list.length === 0) return null;
        return (
          <section key={team} className="staff-team">
            <h2 className="staff-team-title">
              {team} <span className="staff-count">{list.length}</span>
            </h2>
            <div className="staff-table-wrap">
              <table className="staff-table">
                <thead>
                  <tr>
                    <th>Mã NV</th>
                    <th>Họ tên</th>
                    <th>Chức vụ</th>
                    <th>Điện thoại</th>
                    <th>Ngày vào</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((r) => (
                    <tr key={r.mnv} className={isResigned(r) ? "resigned" : ""}>
                      <td className="mono">{r.mnv}</td>
                      <td>
                        {r.name}
                        {isResigned(r) && (
                          <span className="resigned-tag">đã nghỉ {r.end_date}</span>
                        )}
                      </td>
                      <td>{r.role}</td>
                      <td className="mono">{r.phone}</td>
                      <td>{r.start_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </>
  );
}
