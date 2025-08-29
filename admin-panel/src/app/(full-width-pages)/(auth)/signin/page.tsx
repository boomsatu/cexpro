import SignInForm from "@/components/auth/SignInForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Login | CEX Admin Panel",
  description: "Login to CEX Admin Panel",
};

export default function SignIn() {
  return <SignInForm />;
}
