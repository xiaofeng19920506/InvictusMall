"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import styles from "./LoginContent.module.scss";

export default function LoginContent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await login({ email, password });
      if (result.success) {
        router.push("/");
      } else {
        setError(result.message || "Login failed");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.headerContainer}>
        <div className={styles.header}>
          <Link href="/" className={styles.logo}>
            <h1 className={styles.logoTitle}>
              Invictus Mall
            </h1>
          </Link>
          <h2 className={styles.subtitle}>Sign In</h2>
          <p className={styles.description}>
            Welcome back! Please sign in to your account.
          </p>
        </div>
      </div>

      <div className={styles.formContainer}>
        <div className={styles.formCard}>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formField}>
              <label
                htmlFor="email"
                className={styles.formLabel}
              >
                Email Address
              </label>
              <div className={styles.formInputWrapper}>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={styles.formInput}
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div className={styles.formField}>
              <label
                htmlFor="password"
                className={styles.formLabel}
              >
                Password
              </label>
              <div className={styles.formInputWrapper}>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={styles.formInput}
                  placeholder="Enter your password"
                />
              </div>
            </div>

            {error && (
              <div className={styles.errorMessage}>
                {error}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className={styles.submitButton}
              >
                {isLoading ? "Signing In..." : "Sign In"}
              </button>
            </div>

            <div className={styles.forgotPasswordLink}>
              <Link
                href="/forgot-password"
                className={styles.forgotPasswordText}
              >
                Forgot your password?
              </Link>
            </div>
          </form>

          <div className={styles.dividerContainer}>
            <div className={styles.divider}>
              <div className={styles.dividerLine}></div>
              <div className={styles.dividerText}>
                <span className={styles.dividerTextInner}>
                  New to Invictus Mall?
                </span>
              </div>
            </div>

            <div className={styles.signupButton}>
              <Link
                href="/signup"
                className={styles.signupLink}
              >
                Create an account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

