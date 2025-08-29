import type { Metadata } from "next";
import DepositsManagement from "@/components/admin/DepositsManagement";
import React from "react";

export const metadata: Metadata = {
  title: "Deposits Management | CEX Admin Panel",
  description: "Manage user deposits, approve pending deposits, and view deposit history",
};

export default function DepositsPage() {
  return <DepositsManagement />;
}