import Link from "next/link";
import type { Metadata } from "next";
<<<<<<< HEAD
=======
import styles from "./page.module.scss";
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009

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
<<<<<<< HEAD
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Simple Header */}
      <header className="bg-gray-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="text-2xl font-bold text-orange-500 hover:text-orange-400 transition-colors">
              Invictus Mall
            </Link>
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="text-gray-300 hover:text-white transition-colors"
=======
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
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
              >
                Home
              </Link>
              <Link
                href="/about"
<<<<<<< HEAD
                className="text-gray-300 hover:text-white transition-colors"
=======
                className={styles.navLink}
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
              >
                About
              </Link>
              <Link
                href="/contact"
<<<<<<< HEAD
                className="text-gray-300 hover:text-white transition-colors"
=======
                className={styles.navLink}
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
              >
                Contact
              </Link>
            </div>
          </div>
        </div>
      </header>
      
<<<<<<< HEAD
      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-orange-500 to-orange-600 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Privacy Policy
              </h1>
              <p className="text-xl md:text-2xl text-orange-100 max-w-3xl mx-auto">
=======
      <main style={{ flex: 1 }}>
        {/* Hero Section */}
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <div>
              <h1 className={styles.heroTitle}>
                Privacy Policy
              </h1>
              <p className={styles.heroSubtitle}>
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
                Your privacy is important to us
              </p>
            </div>
          </div>
        </section>

        {/* Privacy Policy Content */}
<<<<<<< HEAD
        <section className="py-16 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="prose prose-lg max-w-none">
              <div className="bg-white rounded-lg shadow-md p-8 border border-gray-200 space-y-8">
                <div>
                  <p className="text-gray-600 mb-4">
                    <strong>Last Updated:</strong> November 2024
                  </p>
                  <p className="text-lg text-gray-700 leading-relaxed">
=======
        <section className={styles.section}>
          <div className={styles.sectionContent}>
            <div className={styles.contentCard}>
                <div>
                  <p className={styles.sectionTextSmall}>
                    <strong>Last Updated:</strong> November 2024
                  </p>
                  <p className={styles.sectionText}>
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
                    At Invictus Mall, we are committed to protecting your privacy and ensuring the security of your personal information. 
                    This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.
                  </p>
                </div>

                <div>
<<<<<<< HEAD
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    1. Information We Collect
                  </h2>
                  <p className="text-gray-700 leading-relaxed mb-3">
                    We collect information that you provide directly to us, including:
                  </p>
                  <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                    <li>Personal identification information (name, email address, phone number)</li>
                    <li>Account credentials and profile information</li>
                    <li>Payment and billing information</li>
                    <li>Shipping and delivery addresses</li>
                    <li>Order history and transaction details</li>
                    <li>Communications with us and store owners</li>
=======
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
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
                  </ul>
                </div>

                <div>
<<<<<<< HEAD
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    2. How We Use Your Information
                  </h2>
                  <p className="text-gray-700 leading-relaxed mb-3">
                    We use the information we collect to:
                  </p>
                  <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                    <li>Process and fulfill your orders</li>
                    <li>Manage your account and provide customer support</li>
                    <li>Send you order confirmations, updates, and shipping notifications</li>
                    <li>Improve our services and user experience</li>
                    <li>Send you marketing communications (with your consent)</li>
                    <li>Detect and prevent fraud and security issues</li>
                    <li>Comply with legal obligations</li>
=======
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
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
                  </ul>
                </div>

                <div>
<<<<<<< HEAD
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    3. Information Sharing
                  </h2>
                  <p className="text-gray-700 leading-relaxed mb-3">
                    We do not sell your personal information. We may share your information with:
                  </p>
                  <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                    <li><strong>Store Owners:</strong> To fulfill your orders and provide customer service</li>
                    <li><strong>Payment Processors:</strong> To process your payments securely</li>
                    <li><strong>Shipping Providers:</strong> To deliver your orders</li>
                    <li><strong>Service Providers:</strong> Who help us operate our platform (under strict confidentiality agreements)</li>
                    <li><strong>Legal Authorities:</strong> When required by law or to protect our rights</li>
=======
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
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
                  </ul>
                </div>

                <div>
<<<<<<< HEAD
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    4. Data Security
                  </h2>
                  <p className="text-gray-700 leading-relaxed">
=======
                  <h2 className={styles.sectionTitle}>
                    4. Data Security
                  </h2>
                  <p className={styles.sectionText} style={{ marginBottom: 0 }}>
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
                    We implement industry-standard security measures to protect your personal information, including encryption, 
                    secure servers, and access controls. However, no method of transmission over the Internet is 100% secure, 
                    and we cannot guarantee absolute security.
                  </p>
                </div>

                <div>
<<<<<<< HEAD
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    5. Your Rights
                  </h2>
                  <p className="text-gray-700 leading-relaxed mb-3">
                    You have the right to:
                  </p>
                  <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                    <li>Access and review your personal information</li>
                    <li>Update or correct your information</li>
                    <li>Request deletion of your account and data</li>
                    <li>Opt-out of marketing communications</li>
                    <li>Request a copy of your data</li>
=======
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
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
                  </ul>
                </div>

                <div>
<<<<<<< HEAD
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    6. Cookies and Tracking
                  </h2>
                  <p className="text-gray-700 leading-relaxed">
=======
                  <h2 className={styles.sectionTitle}>
                    6. Cookies and Tracking
                  </h2>
                  <p className={styles.sectionText} style={{ marginBottom: 0 }}>
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
                    We use cookies and similar tracking technologies to enhance your experience, analyze usage patterns, 
                    and provide personalized content. You can control cookie preferences through your browser settings.
                  </p>
                </div>

                <div>
<<<<<<< HEAD
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    7. Children's Privacy
                  </h2>
                  <p className="text-gray-700 leading-relaxed">
=======
                  <h2 className={styles.sectionTitle}>
                    7. Children's Privacy
                  </h2>
                  <p className={styles.sectionText} style={{ marginBottom: 0 }}>
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
                    Our services are not intended for individuals under the age of 18. We do not knowingly collect 
                    personal information from children. If you believe we have collected information from a child, 
                    please contact us immediately.
                  </p>
                </div>

                <div>
<<<<<<< HEAD
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    8. Changes to This Policy
                  </h2>
                  <p className="text-gray-700 leading-relaxed">
=======
                  <h2 className={styles.sectionTitle}>
                    8. Changes to This Policy
                  </h2>
                  <p className={styles.sectionText} style={{ marginBottom: 0 }}>
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
                    We may update this Privacy Policy from time to time. We will notify you of any significant changes 
                    by posting the new policy on this page and updating the "Last Updated" date.
                  </p>
                </div>

                <div>
<<<<<<< HEAD
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    9. Contact Us
                  </h2>
                  <p className="text-gray-700 leading-relaxed">
                    If you have questions or concerns about this Privacy Policy or our data practices, please contact us at:
                  </p>
                  <p className="text-gray-700 leading-relaxed mt-2">
=======
                  <h2 className={styles.sectionTitle}>
                    9. Contact Us
                  </h2>
                  <p className={styles.sectionText} style={{ marginBottom: 0 }}>
                    If you have questions or concerns about this Privacy Policy or our data practices, please contact us at:
                  </p>
                  <p className={styles.sectionText} style={{ marginTop: '0.5rem', marginBottom: 0 }}>
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
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
<<<<<<< HEAD
      <footer className="bg-gray-900 text-white py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p>&copy; 2024 Invictus Mall. All rights reserved.</p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link
                href="/about"
                className="text-gray-300 hover:text-white transition-colors"
=======
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerInner}>
            <p>&copy; 2024 Invictus Mall. All rights reserved.</p>
            <div className={styles.footerLinks}>
              <Link
                href="/about"
                className={styles.footerLink}
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
              >
                About
              </Link>
              <Link
                href="/contact"
<<<<<<< HEAD
                className="text-gray-300 hover:text-white transition-colors"
=======
                className={styles.footerLink}
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
              >
                Contact
              </Link>
              <Link
                href="/privacy"
<<<<<<< HEAD
                className="text-white font-medium"
=======
                className={`${styles.footerLink} ${styles.active}`}
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
              >
                Privacy
              </Link>
              <Link
                href="/terms"
<<<<<<< HEAD
                className="text-gray-300 hover:text-white transition-colors"
=======
                className={styles.footerLink}
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
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

