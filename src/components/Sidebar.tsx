import type { KeyboardEvent } from "react";
import "./Sidebar.css";

type Page =
  | "dashboard"
  | "study"
  | "care"
  | "stock"
  | "schedule"
  | "settings";

type SidebarProps = {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  onLogout: () => void | Promise<void>;
};

export default function Sidebar({
  currentPage,
  onNavigate,
  onLogout,
}: SidebarProps) {
  const handleKeyDown = (
    event: KeyboardEvent,
    page: Page
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onNavigate(page);
    }
  };

  const menuItems: {
    page: Page;
    label: string;
  }[] = [
    {
      page: "dashboard",
      label: "🏠 Dashboard",
    },
    {
      page: "study",
      label: "📖 國考",
    },
    {
      page: "care",
      label: "❤️ 爸爸照護",
    },
    {
      page: "stock",
      label: "📈 股票",
    },
    {
      page: "schedule",
      label: "🗓️ 行事曆",
    },
    {
      page: "settings",
      label: "⚙️ 設定",
    },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        🦊 Atlas
      </div>

      <nav>
        <ul>
          {menuItems.map((item) => (
            <li
              key={item.page}
              className={
                currentPage === item.page
                  ? "active"
                  : ""
              }
              onClick={() =>
                onNavigate(item.page)
              }
              onKeyDown={(event) =>
                handleKeyDown(
                  event,
                  item.page
                )
              }
              tabIndex={0}
              role="button"
            >
              {item.label}
            </li>
          ))}
        </ul>
      </nav>

      <button
        type="button"
        className="sidebar-logout"
        onClick={onLogout}
      >
        登出
      </button>
    </aside>
  );
}