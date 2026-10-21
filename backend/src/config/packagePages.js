
const PACKAGE_PAGES = [
  { label: "Dashboard", href: "/dashboard", section: "Owner" },
  { label: "Add User", href: "/users", section: "Owner" },
  { label: "Receive Payment", href: "/billing", section: "Owner" },
  { label: "Add Area", href: "/areas", section: "Owner" },
  { label: "Add Package", href: "/packages", section: "Owner" },

  { label: "Dashboard", href: "/dashboard3", section: "Partner" },
  { label: "Add Area", href: "/partner-areas", section: "Partner" },
  { label: "Add User", href: "/partners", section: "Partner" },
  { label: "Receive Payment", href: "/payments", section: "Partner" },

  { label: "Dashboard", href: "/dealers", section: "Dealer" },
  { label: "Add Dealer", href: "/dealers/add", section: "Dealer" },
  { label: "Dealer Payment", href: "/dealer-payments", section: "Dealer" },
  { label: "Add Area", href: "/area2", section: "Dealer" },

  { label: "Staff Profile", href: "/staff", section: "Staff" },
  { label: "Daily Attendance", href: "/attendance", section: "Staff" },

  { label: "Purchasing", href: "/purchasing", section: "Expense" },
  { label: "Installation Charges", href: "/installation", section: "Expense" },

  { label: "All Report", href: "/reports", section: "General" },
  { label: "Dashboard", href: "/dashboard2", section: "General" },
  { label: "Bulk Upload", href: "/bulk-upload", section: "General" },
  { label: "Add Partner", href: "/create-partner", section: "General" },
  { label: "WhatsApp Bot", href: "/whatsapp", section: "General" },
  { label: "Add ISP", href: "/ISP", section: "General" },
  {
  label: "All Users",
  href: "/all-users",
  section: "General",
},

  { label: "Promise Management", href: "/promises", section: "Promise Management" },
  { label: "Notification", href: "/notification", section: "Notifications" },
];

const ALLOWED_ROUTES = new Set(PACKAGE_PAGES.map(page => page.href));

module.exports = { PACKAGE_PAGES, ALLOWED_ROUTES };
