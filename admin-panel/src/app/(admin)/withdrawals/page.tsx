import type { Metadata } from "next";
import WithdrawalsManagement from "@/components/admin/WithdrawalsManagement";
import React from "react";

export const metadata: Metadata = {
  title: "Withdrawals Management | CEX Admin Panel",
  description: "Manage user withdrawals, approve pending withdrawals, and view withdrawal history",
};

export default function WithdrawalsPage() {
  return <WithdrawalsManagement />;
}