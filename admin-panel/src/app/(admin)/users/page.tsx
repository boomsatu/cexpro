import type { Metadata } from "next";
import UserManagement from "@/components/admin/UserManagement";
import React from "react";

export const metadata: Metadata = {
  title: "User Management | CEX Admin Panel",
  description: "Manage users, KYC status, and user activities",
};

export default function UsersPage() {
  return <UserManagement />;
}