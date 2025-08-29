import type { Metadata } from "next";
import SettingsManagement from "@/components/admin/SettingsManagement";
import React from "react";

export const metadata: Metadata = {
  title: "Settings | CEX Admin Panel",
  description: "Manage system settings, configurations, and admin preferences",
};

export default function SettingsPage() {
  return <SettingsManagement />;
}