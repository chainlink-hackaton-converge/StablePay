import {
  type RouteConfig,
  route,
  index,
  layout,
  prefix,
} from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "auth/login.tsx"),
  route("register", "auth/register.tsx"),

  // Employer routes
  layout("employer/layout.tsx", [
    ...prefix("employer", [
      index("employer/dashboard.tsx"),
      route("employees", "employer/employees.tsx"),
      route("payroll", "employer/payroll.tsx"),
      route("payroll/new", "employer/payroll-create.tsx"),
      route("invoices", "employer/invoices.tsx"),
      route("invoices/new", "employer/invoice-create.tsx"),
      route("settings", "employer/settings.tsx"),
    ]),
  ]),

  // Employee routes
  layout("employee/layout.tsx", [
    ...prefix("employee", [
      index("employee/dashboard.tsx"),
      route("payments", "employee/payments.tsx"),
    ]),
  ]),
] satisfies RouteConfig;
