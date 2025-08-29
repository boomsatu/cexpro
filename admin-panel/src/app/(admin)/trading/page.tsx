import type { Metadata } from "next";
import TradingManagement from "@/components/admin/TradingManagement";
import React from "react";

export const metadata: Metadata = {
  title: "Trading Management | CEX Admin Panel",
  description: "Manage trading pairs, monitor trades, and view trading statistics",
};

export default function TradingPage() {
  return <TradingManagement />;
}