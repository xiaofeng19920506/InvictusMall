import Link from "next/link";
import type { Metadata } from "next";
import styles from "./page.module.scss";

export const metadata: Metadata = {
  title: "Terms of Service - Invictus Mall | Legal Terms",
  description: "Read Invictus Mall's Terms of Service to understand the rules and guidelines for using our platform.",
  openGraph: {
    title: "Terms of Service - Invictus Mall",
    description: "Read Invictus Mall's Terms of Service and legal terms.",
    type: "website",
  },
};

// Force static generation for this page
export const dynamic = 'force-static';

export default function TermsPage() {
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
                Terms of Service
              </h1>
              <p className={styles.heroSubtitle}>
                Please read these terms carefully
              </p>
            </div>
          </div>
        </section>

        {/* Terms Content */}
        <section className={styles.section}>
          <div className={styles.sectionContent}>
            <div className={styles.contentCard}>
                <div>
                  <p className={styles.sectionTextSmall}>
                    <strong>Last Updated:</strong> November 2024
                  </p>
                  <p className={styles.sectionText}>
                    Welcome to Invictus Mall. By accessing or using our platform, you agree to be bound by these Terms of Service. 
                    Please read these terms carefully before using our services.
                  </p>
                </div>

                <div>
                  <h2 className={styles.sectionTitle}>
                    1. Acceptance of Terms
                  </h2>
                  <p className={styles.sectionText} style={{ marginBottom: 0 }}>
                    By accessing or using Invictus Mall, you acknowledge that you have read, understood, and agree to be bound by 
                    these Terms of Service and our Privacy Policy. If you do not agree to these terms, you may not use our services.
                  </p>
                </div>

                <div>
                  <h2 className={styles.sectionTitle}>
                    2. Use of the Platform
                  </h2>
                  <p className={styles.sectionText}>
                    You agree to use Invictus Mall only for lawful purposes and in accordance with these terms. You agree not to:
                  </p>
                  <ul className={styles.list}>
                    <li className={styles.listItem}>Violate any applicable laws or regulations</li>
                    <li className={styles.listItem}>Infringe upon the rights of others</li>
                    <li className={styles.listItem}>Transmit any harmful, offensive, or illegal content</li>
                    <li className={styles.listItem}>Attempt to gain unauthorized access to our systems</li>
                    <li className={styles.listItem}>Interfere with or disrupt the platform's operation</li>
                    <li className={styles.listItem}>Use automated systems to access the platform without permission</li>
                  </ul>
                </div>

                <div>
                  <h2 className={styles.sectionTitle}>
                    3. Account Registration
                  </h2>
                  <p className={styles.sectionText}>
                    To use certain features of our platform, you must create an account. You agree to:
                  </p>
                  <ul className={styles.list}>
                    <li className={styles.listItem}>Provide accurate, current, and complete information</li>
                    <li className={styles.listItem}>Maintain and update your account information</li>
                    <li className={styles.listItem}>Maintain the security of your account credentials</li>
                    <li className={styles.listItem}>Accept responsibility for all activities under your account</li>
                    <li className={styles.listItem}>Notify us immediately of any unauthorized access</li>
                  </ul>
                </div>

                <div>
                  <h2 className={styles.sectionTitle}>
                    4. Orders and Payments
                  </h2>
                  <p className={styles.sectionText}>
                    When you place an order:
                  </p>
                  <ul className={styles.list}>
                    <li className={styles.listItem}>You agree to pay the specified price for products and services</li>
                    <li className={styles.listItem}>All prices are subject to change without notice</li>
                    <li className={styles.listItem}>Payment must be made through approved payment methods</li>
                    <li className={styles.listItem}>Orders are subject to acceptance by the store owner</li>
                    <li className={styles.listItem}>We reserve the right to cancel orders for any reason</li>
                    <li className={styles.listItem}>Shipping and handling fees may apply</li>
                  </ul>
                </div>

                <div>
                  <h2 className={styles.sectionTitle}>
                    5. Product Information
                  </h2>
                  <p className={styles.sectionText} style={{ marginBottom: 0 }}>
                    We strive to provide accurate product information, but we do not warrant that product descriptions, 
                    images, or other content is accurate, complete, or error-free. Product availability, prices, and 
                    specifications are subject to change without notice.
                  </p>
                </div>

                <div>
                  <h2 className={styles.sectionTitle}>
                    6. Returns and Refunds
                  </h2>
                  <p className={styles.sectionText}>
                    Return and refund policies vary by store. General guidelines:
                  </p>
                  <ul className={styles.list}>
                    <li className={styles.listItem}>Items must be returned within 30 days of delivery</li>
                    <li className={styles.listItem}>Items must be in original condition with tags attached</li>
                    <li className={styles.listItem}>Refunds will be processed to the original payment method</li>
                    <li className={styles.listItem}>Shipping costs may be non-refundable</li>
                    <li className={styles.listItem}>Contact the store directly for specific return instructions</li>
                  </ul>
                </div>

                <div>
                  <h2 className={styles.sectionTitle}>
                    7. Intellectual Property
                  </h2>
                  <p className={styles.sectionText} style={{ marginBottom: 0 }}>
                    All content on Invictus Mall, including text, graphics, logos, images, and software, is the property of 
                    Invictus Mall or its content suppliers and is protected by copyright and other intellectual property laws. 
                    You may not reproduce, distribute, or create derivative works without our written permission.
                  </p>
                </div>

                <div>
                  <h2 className={styles.sectionTitle}>
                    8. Limitation of Liability
                  </h2>
                  <p className={styles.sectionText} style={{ marginBottom: 0 }}>
                    Invictus Mall acts as a platform connecting customers with store owners. We are not responsible for the 
                    quality, safety, or legality of products sold by store owners. To the maximum extent permitted by law, 
                    Invictus Mall shall not be liable for any indirect, incidental, special, or consequential damages arising 
                    from your use of the platform.
                  </p>
                </div>

                <div>
                  <h2 className={styles.sectionTitle}>
                    9. Indemnification
                  </h2>
                  <p className={styles.sectionText} style={{ marginBottom: 0 }}>
                    You agree to indemnify and hold Invictus Mall, its affiliates, and their respective officers, directors, 
                    employees, and agents harmless from any claims, damages, losses, liabilities, and expenses arising from 
                    your use of the platform or violation of these terms.
                  </p>
                </div>

                <div>
                  <h2 className={styles.sectionTitle}>
                    10. Termination
                  </h2>
                  <p className={styles.sectionText} style={{ marginBottom: 0 }}>
                    We reserve the right to suspend or terminate your account and access to the platform at any time, with or 
                    without cause or notice, for any reason including violation of these terms. Upon termination, your right to 
                    use the platform will immediately cease.
                  </p>
                </div>

                <div>
                  <h2 className={styles.sectionTitle}>
                    11. Governing Law
                  </h2>
                  <p className={styles.sectionText} style={{ marginBottom: 0 }}>
                    These Terms of Service shall be governed by and construed in accordance with the laws of the jurisdiction 
                    in which Invictus Mall operates, without regard to its conflict of law provisions.
                  </p>
                </div>

                <div>
                  <h2 className={styles.sectionTitle}>
                    12. Changes to Terms
                  </h2>
                  <p className={styles.sectionText} style={{ marginBottom: 0 }}>
                    We reserve the right to modify these terms at any time. We will notify users of significant changes by 
                    posting the updated terms on this page. Your continued use of the platform after changes constitutes 
                    acceptance of the new terms.
                  </p>
                </div>

                <div>
                  <h2 className={styles.sectionTitle}>
                    13. Contact Information
                  </h2>
                  <p className={styles.sectionText} style={{ marginBottom: 0 }}>
                    If you have questions about these Terms of Service, please contact us at:
                  </p>
                  <p className={styles.sectionText} style={{ marginTop: '0.5rem', marginBottom: 0 }}>
                    <strong>Email:</strong> legal@invictusmall.com<br />
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
                className={styles.footerLink}
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className={`${styles.footerLink} ${styles.active}`}
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
