export type ProjectTemplate = {
  id: string;
  name: string;
  type: "Web" | "Mobile" | "WordPress" | "Hybrid";
  description: string;
  features: string[];
  flags: string[];
  hoursHint: number;
  tags: string[];
};

export const projectTemplates: ProjectTemplate[] = [
  {
    id: "web-saas",
    name: "SaaS Dashboard",
    type: "Web",
    description: "Authenticated SaaS dashboard with user accounts, role-based access, reporting, admin tools and a responsive web experience.",
    features: ["Authentication", "Dashboard", "User roles", "Reports", "Admin panel"],
    flags: ["Authentication", "Admin panel", "External API", "SEO / Analytics"],
    hoursHint: 96,
    tags: ["SaaS", "Dashboard", "B2B"],
  },
  {
    id: "corporate-web",
    name: "Corporate Website",
    type: "Web",
    description: "Professional company website with marketing pages, CMS-managed content, contact forms, analytics and SEO.",
    features: ["Home page", "About", "Services", "Contact form", "Blog"],
    flags: ["SEO / Analytics", "Admin panel"],
    hoursHint: 40,
    tags: ["Marketing", "SEO", "CMS"],
  },
  {
    id: "booking-web",
    name: "Booking Platform",
    type: "Web",
    description: "Booking platform with availability, customer accounts, booking management, notifications and online payments.",
    features: ["Search", "Availability", "Booking flow", "Customer account", "Admin booking management"],
    flags: ["Authentication", "Payments", "Admin panel", "Notifications", "External API"],
    hoursHint: 112,
    tags: ["Booking", "Payments", "Marketplace"],
  },
  {
    id: "mobile-app",
    name: "Mobile Product App",
    type: "Mobile",
    description: "Cross-platform mobile application with authentication, core user flows, API integration and push notifications.",
    features: ["Onboarding", "Authentication", "Core user flow", "Profile", "Push notifications"],
    flags: ["Authentication", "Notifications", "External API"],
    hoursHint: 88,
    tags: ["iOS", "Android", "React Native"],
  },
  {
    id: "wordpress-business",
    name: "WordPress Business Site",
    type: "WordPress",
    description: "Fast WordPress business website with custom theme, editable sections, contact forms, SEO and analytics.",
    features: ["Custom pages", "Editable sections", "Contact forms", "Blog", "SEO setup"],
    flags: ["Admin panel", "SEO / Analytics"],
    hoursHint: 32,
    tags: ["WordPress", "Business", "SEO"],
  },
  {
    id: "woocommerce",
    name: "WooCommerce Store",
    type: "WordPress",
    description: "WooCommerce ecommerce website with products, cart, checkout, payment integration and order management.",
    features: ["Product catalog", "Cart", "Checkout", "Orders", "Coupons"],
    flags: ["Payments", "Admin panel", "SEO / Analytics"],
    hoursHint: 64,
    tags: ["WooCommerce", "Ecommerce", "WordPress"],
  },
];
