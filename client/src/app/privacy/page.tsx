import Link from "next/link";
import type { Metadata } from "next";
import styles from "./page.module.scss";

export const metadata: Metadata = {
  title: "Privacy Policy - Invictus Mall | Your Privacy Matters",
  description: "Read Invictus Mall's Privacy Policy to understand how we collect, use, and protect your personal information.",
  openGraph: {
    title: "Privacy Policy - Invictus Mall",
    description: "Learn how Invictus Mall protects your privacy and personal information.",
    type: "website",
  },
};

// Force static generation for this page
export const dynamic = 'force-static';

export default function PrivacyPage() {
  return (
    <div className={styles.pageContainer}>
      {/* Simple Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerInner}>
            <Link href="/" className={styles.logo}>
              Invictus Mall
            </Link>
            <div className={styles.navLinks}>
              <Link
                href="/"
                className={styles.navLink}
              >
                Home
              </Link>
              <Link
                href="/about"
                className={styles.navLink}
              >
                About
              </Link>
              <Link
                href="/contact"
                className={styles.navLink}
              >
                Contact
              </Link>
            </div>
          </div>
        </div>
      </header>
      
      <main style={{ flex: 1 }}>
        {/* Hero Section */}
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <div>
              <h1 className={styles.heroTitle}>
                Privacy Policy
              </h1>
              <p className={styles.heroSubtitle}>
                Your privacy is important to us
              </p>
            </div>
          </div>
        </section>

        {/* Privacy Policy Content */}
        <section className={styles.section}>
          <div className={styles.sectionContent}>
            <div className={styles.contentCard}>
                <div>
                  <p className={styles.sectionTextSmall}>
                    <strong>Last Updated:</strong> November 2024
                  </p>
                  <p className={styles.sectionText}>
                    At Invictus Mall, we are committed to protecting your privacy and ensuring the security of your personal information. 
                    This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.
                  </p>
                </div>

                <div>
                  <h2 className={styles.sectionTitle}>
                    1. Information We Collect
                  </h2>
                  <p className={styles.sectionText}>
                    We collect information that you provide directly to us, including:
                  </p>
                  <ul className={styles.list}>
                    <li className={styles.listItem}>Personal identification information (name, email address, phone number)</li>
                    <li className={styles.listItem}>Account credentials and profile information</li>
                    <li className={styles.listItem}>Payment and billing information</li>
                    <li className={styles.listItem}>Shipping and delivery addresses</li>
                    <li className={styles.listItem}>Order history and transaction details</li>
                    <li className={styles.listItem}>Communications with us and store owners</li>
                  </ul>
                </div>

                <div>
                  <h2 className={styles.sectionTitle}>
                    2. How We Use Your Information
                  </h2>
                  <p className={styles.sectionText}>
                    We use the information we collect to:
                  </p>
                  <ul className={styles.list}>
                    <li className={styles.listItem}>Process and fulfill your orders</li>
                    <li className={styles.listItem}>Manage your account and provide customer support</li>
                    <li className={styles.listItem}>Send you order confirmations, updates, and shipping notifications</li>
                    <li className={styles.listItem}>Improve our services and user experience</li>
                    <li className={styles.listItem}>Send you marketing communications (with your consent)</li>
                    <li className={styles.listItem}>Detect and prevent fraud and security issues</li>
                    <li className={styles.listItem}>Comply with legal obligations</li>
                  </ul>
                </div>

                <div>
                  <h2 className={styles.sectionTitle}>
                    3. Information Sharing
                  </h2>
                  <p className={styles.sectionText}>
                    We do not sell your personal information. We may share your information with:
                  </p>
                  <ul className={styles.list}>
                    <li className={styles.listItem}><strong>Store Owners:</strong> To fulfill your orders and provide customer service</li>
                    <li className={styles.listItem}><strong>Payment Processors:</strong> To process your payments securely</li>
                    <li className={styles.listItem}><strong>Shipping Providers:</strong> To deliver your orders</li>
                    <li className={styles.listItem}><strong>Service Providers:</strong> Who help us operate our platform (under strict confidentiality agreements)</li>
                    <li className={styles.listItem}><strong>Legal Authorities:</strong> When required by law or to protect our rights</li>
                  </ul>
                </div>

                <div>
                  <h2 className={styles.sectionTitle}>
                    4. Data Security
                  </h2>
                  <p className={styles.sectionText} style={{ marginBottom: 0 }}>
                    We implement industry-standard security measures to protect your personal information, including encryption, 
                    secure servers, and access controls. However, no method of transmission over the Internet is 100% secure, 
                    and we cannot guarantee absolute security.
                  </p>
                </div>

                <div>
                  <h2 className={styles.sectionTitle}>
                    5. Your Rights
                  </h2>
                  <p className={styles.sectionText}>
                    You have the right to:
                  </p>
                  <ul className={styles.list}>
                    <li className={styles.listItem}>Access and review your personal information</li>
                    <li className={styles.listItem}>Update or correct your information</li>
                    <li className={styles.listItem}>Request deletion of your account and data</li>
                    <li className={styles.listItem}>Opt-out of marketing communications</li>
                    <li className={styles.listItem}>Request a copy of your data</li>
                  </ul>
                </div>

                <div>
                  <h2 className={styles.sectionTitle}>
                    6. Cookies and Tracking
                  </h2>
                  <p className={styles.sectionText} style={{ marginBottom: 0 }}>
                    We use cookies and similar tracking technologies to enhance your experience, analyze usage patterns, 
                    and provide personalized content. You can control cookie preferences through your browser settings.
                  </p>
                </div>

                <div>
                  <h2 className={styles.sectionTitle}>
                    7. Children's Privacy
                  </h2>
                  <p className={styles.sectionText} style={{ marginBottom: 0 }}>
                    Our services are not intended for individuals under the age of 18. We do not knowingly collect 
                    personal information from children. If you believe we have collected information from a child, 
                    please contact us immediately.
                  </p>
                </div>

                <div>
                  <h2 className={styles.sectionTitle}>
                    8. Changes to This Policy
                  </h2>
                  <p className={styles.sectionText} style={{ marginBottom: 0 }}>
                    We may update this Privacy Policy from time to time. We will notify you of any significant changes 
                    by posting the new policy on this page and updating the "Last Updated" date.
                  </p>
                </div>

                <div>
                  <h2 className={styles.sectionTitle}>
                    9. Contact Us
                  </h2>
                  <p className={styles.sectionText} style={{ marginBottom: 0 }}>
                    If you have questions or concerns about this Privacy Policy or our data practices, please contact us at:
                  </p>
                  <p className={styles.sectionText} style={{ marginTop: '0.5rem', marginBottom: 0 }}>
                    <strong>Email:</strong> privacy@invictusmall.com<br />
                    <strong>Address:</strong> 123 Commerce Street, Business District, NY 10001
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerInner}>
            <p>&copy; 2024 Invictus Mall. All rights reserved.</p>
            <div className={styles.footerLinks}>
              <Link
                href="/about"
                className={styles.footerLink}
              >
                About
              </Link>
              <Link
                href="/contact"
                className={styles.footerLink}
              >
                Contact
              </Link>
              <Link
                href="/privacy"
                className={`${styles.footerLink} ${styles.active}`}
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className={styles.footerLink}
              >
                Terms
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

