import type { Metadata } from "next";
import AdminDashboard from "@/components/admin/AdminDashboard";
import React from "react";

export const metadata: Metadata = {
  title: "Admin Dashboard | CEX Admin Panel",
  description: "Cryptocurrency Exchange Admin Dashboard",
};

export default function Dashboard() {
  return <AdminDashboard />;
}
