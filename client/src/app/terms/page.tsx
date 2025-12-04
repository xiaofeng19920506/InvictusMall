import Link from "next/link";
import type { Metadata } from "next";
<<<<<<< HEAD
=======
import styles from "./page.module.scss";
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009

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
                Terms of Service
              </h1>
              <p className="text-xl md:text-2xl text-orange-100 max-w-3xl mx-auto">
=======
      <main style={{ flex: 1 }}>
        {/* Hero Section */}
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <div>
              <h1 className={styles.heroTitle}>
                Terms of Service
              </h1>
              <p className={styles.heroSubtitle}>
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
                Please read these terms carefully
              </p>
            </div>
          </div>
        </section>

        {/* Terms Content */}
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
                    Welcome to Invictus Mall. By accessing or using our platform, you agree to be bound by these Terms of Service. 
                    Please read these terms carefully before using our services.
                  </p>
                </div>

                <div>
<<<<<<< HEAD
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    1. Acceptance of Terms
                  </h2>
                  <p className="text-gray-700 leading-relaxed">
=======
                  <h2 className={styles.sectionTitle}>
                    1. Acceptance of Terms
                  </h2>
                  <p className={styles.sectionText} style={{ marginBottom: 0 }}>
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
                    By accessing or using Invictus Mall, you acknowledge that you have read, understood, and agree to be bound by 
                    these Terms of Service and our Privacy Policy. If you do not agree to these terms, you may not use our services.
                  </p>
                </div>

                <div>
<<<<<<< HEAD
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    2. Use of the Platform
                  </h2>
                  <p className="text-gray-700 leading-relaxed mb-3">
                    You agree to use Invictus Mall only for lawful purposes and in accordance with these terms. You agree not to:
                  </p>
                  <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                    <li>Violate any applicable laws or regulations</li>
                    <li>Infringe upon the rights of others</li>
                    <li>Transmit any harmful, offensive, or illegal content</li>
                    <li>Attempt to gain unauthorized access to our systems</li>
                    <li>Interfere with or disrupt the platform's operation</li>
                    <li>Use automated systems to access the platform without permission</li>
=======
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
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
                  </ul>
                </div>

                <div>
<<<<<<< HEAD
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    3. Account Registration
                  </h2>
                  <p className="text-gray-700 leading-relaxed mb-3">
                    To use certain features of our platform, you must create an account. You agree to:
                  </p>
                  <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                    <li>Provide accurate, current, and complete information</li>
                    <li>Maintain and update your account information</li>
                    <li>Maintain the security of your account credentials</li>
                    <li>Accept responsibility for all activities under your account</li>
                    <li>Notify us immediately of any unauthorized access</li>
=======
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
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
                  </ul>
                </div>

                <div>
<<<<<<< HEAD
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    4. Orders and Payments
                  </h2>
                  <p className="text-gray-700 leading-relaxed mb-3">
                    When you place an order:
                  </p>
                  <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                    <li>You agree to pay the specified price for products and services</li>
                    <li>All prices are subject to change without notice</li>
                    <li>Payment must be made through approved payment methods</li>
                    <li>Orders are subject to acceptance by the store owner</li>
                    <li>We reserve the right to cancel orders for any reason</li>
                    <li>Shipping and handling fees may apply</li>
=======
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
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
                  </ul>
                </div>

                <div>
<<<<<<< HEAD
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    5. Product Information
                  </h2>
                  <p className="text-gray-700 leading-relaxed">
=======
                  <h2 className={styles.sectionTitle}>
                    5. Product Information
                  </h2>
                  <p className={styles.sectionText} style={{ marginBottom: 0 }}>
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
                    We strive to provide accurate product information, but we do not warrant that product descriptions, 
                    images, or other content is accurate, complete, or error-free. Product availability, prices, and 
                    specifications are subject to change without notice.
                  </p>
                </div>

                <div>
<<<<<<< HEAD
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    6. Returns and Refunds
                  </h2>
                  <p className="text-gray-700 leading-relaxed mb-3">
                    Return and refund policies vary by store. General guidelines:
                  </p>
                  <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                    <li>Items must be returned within 30 days of delivery</li>
                    <li>Items must be in original condition with tags attached</li>
                    <li>Refunds will be processed to the original payment method</li>
                    <li>Shipping costs may be non-refundable</li>
                    <li>Contact the store directly for specific return instructions</li>
=======
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
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
                  </ul>
                </div>

                <div>
<<<<<<< HEAD
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    7. Intellectual Property
                  </h2>
                  <p className="text-gray-700 leading-relaxed">
=======
                  <h2 className={styles.sectionTitle}>
                    7. Intellectual Property
                  </h2>
                  <p className={styles.sectionText} style={{ marginBottom: 0 }}>
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
                    All content on Invictus Mall, including text, graphics, logos, images, and software, is the property of 
                    Invictus Mall or its content suppliers and is protected by copyright and other intellectual property laws. 
                    You may not reproduce, distribute, or create derivative works without our written permission.
                  </p>
                </div>

                <div>
<<<<<<< HEAD
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    8. Limitation of Liability
                  </h2>
                  <p className="text-gray-700 leading-relaxed">
=======
                  <h2 className={styles.sectionTitle}>
                    8. Limitation of Liability
                  </h2>
                  <p className={styles.sectionText} style={{ marginBottom: 0 }}>
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
                    Invictus Mall acts as a platform connecting customers with store owners. We are not responsible for the 
                    quality, safety, or legality of products sold by store owners. To the maximum extent permitted by law, 
                    Invictus Mall shall not be liable for any indirect, incidental, special, or consequential damages arising 
                    from your use of the platform.
                  </p>
                </div>

                <div>
<<<<<<< HEAD
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    9. Indemnification
                  </h2>
                  <p className="text-gray-700 leading-relaxed">
=======
                  <h2 className={styles.sectionTitle}>
                    9. Indemnification
                  </h2>
                  <p className={styles.sectionText} style={{ marginBottom: 0 }}>
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
                    You agree to indemnify and hold Invictus Mall, its affiliates, and their respective officers, directors, 
                    employees, and agents harmless from any claims, damages, losses, liabilities, and expenses arising from 
                    your use of the platform or violation of these terms.
                  </p>
                </div>

                <div>
<<<<<<< HEAD
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    10. Termination
                  </h2>
                  <p className="text-gray-700 leading-relaxed">
=======
                  <h2 className={styles.sectionTitle}>
                    10. Termination
                  </h2>
                  <p className={styles.sectionText} style={{ marginBottom: 0 }}>
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
                    We reserve the right to suspend or terminate your account and access to the platform at any time, with or 
                    without cause or notice, for any reason including violation of these terms. Upon termination, your right to 
                    use the platform will immediately cease.
                  </p>
                </div>

                <div>
<<<<<<< HEAD
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    11. Governing Law
                  </h2>
                  <p className="text-gray-700 leading-relaxed">
=======
                  <h2 className={styles.sectionTitle}>
                    11. Governing Law
                  </h2>
                  <p className={styles.sectionText} style={{ marginBottom: 0 }}>
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
                    These Terms of Service shall be governed by and construed in accordance with the laws of the jurisdiction 
                    in which Invictus Mall operates, without regard to its conflict of law provisions.
                  </p>
                </div>

                <div>
<<<<<<< HEAD
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    12. Changes to Terms
                  </h2>
                  <p className="text-gray-700 leading-relaxed">
=======
                  <h2 className={styles.sectionTitle}>
                    12. Changes to Terms
                  </h2>
                  <p className={styles.sectionText} style={{ marginBottom: 0 }}>
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
                    We reserve the right to modify these terms at any time. We will notify users of significant changes by 
                    posting the updated terms on this page. Your continued use of the platform after changes constitutes 
                    acceptance of the new terms.
                  </p>
                </div>

                <div>
<<<<<<< HEAD
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    13. Contact Information
                  </h2>
                  <p className="text-gray-700 leading-relaxed">
                    If you have questions about these Terms of Service, please contact us at:
                  </p>
                  <p className="text-gray-700 leading-relaxed mt-2">
=======
                  <h2 className={styles.sectionTitle}>
                    13. Contact Information
                  </h2>
                  <p className={styles.sectionText} style={{ marginBottom: 0 }}>
                    If you have questions about these Terms of Service, please contact us at:
                  </p>
                  <p className={styles.sectionText} style={{ marginTop: '0.5rem', marginBottom: 0 }}>
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
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
                className="text-gray-300 hover:text-white transition-colors"
=======
                className={styles.footerLink}
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
              >
                Privacy
              </Link>
              <Link
                href="/terms"
<<<<<<< HEAD
                className="text-white font-medium"
=======
                className={`${styles.footerLink} ${styles.active}`}
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

