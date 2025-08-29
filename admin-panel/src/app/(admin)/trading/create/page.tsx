import type { Metadata } from "next";
import CreateTradingPair from "@/components/admin/CreateTradingPair";
import React from "react";

export const metadata: Metadata = {
  title: "Create Trading Pair | CEX Admin Panel",
  description: "Create new trading pair with complete configuration",
};

export default function CreateTradingPairPage() {
  return <CreateTradingPair />;
}