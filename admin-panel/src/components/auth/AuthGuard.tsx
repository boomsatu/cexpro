"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem("adminToken");
        const adminUser = localStorage.getItem("adminUser");
        const lastVerified = localStorage.getItem("lastTokenVerified");
        const now = Date.now();

        if (!token || !adminUser) {
          router.push("/signin");
          return;
        }

        // Skip verification if token was verified recently (within 5 minutes)
        if (lastVerified && (now - parseInt(lastVerified)) < 5 * 60 * 1000) {
          setIsAuthenticated(true);
          setIsLoading(false);
          return;
        }

        // Verify token with backend
        const response = await fetch("http://localhost:3001/api/v1/admin/auth/verify", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          localStorage.setItem("lastTokenVerified", now.toString());
          setIsAuthenticated(true);
        } else {
          // Token is invalid, clear storage and redirect
          localStorage.removeItem("adminToken");
          localStorage.removeItem("adminUser");
          localStorage.removeItem("lastTokenVerified");
          
          // Only show toast if response indicates token expired, not on first visit
          const errorData = await response.json().catch(() => ({}));
          if (errorData.code === 'TOKEN_EXPIRED') {
            toast.error("Session expired. Please login again.");
          }
          
          router.push("/signin");
        }
      } catch (error) {
        console.error("Auth check error:", error);
        // On network error, still allow access if token exists locally
        const token = localStorage.getItem("adminToken");
        if (token) {
          setIsAuthenticated(true);
        } else {
          router.push("/signin");
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to signin
  }

  return <>{children}</>;
}