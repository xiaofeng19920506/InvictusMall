import Link from "next/link";
import type { Metadata } from "next";
<<<<<<< HEAD
=======
import styles from "./page.module.scss";
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009

export const metadata: Metadata = {
  title: "Contact Us - Invictus Mall | Get in Touch",
  description: "Contact Invictus Mall customer support. Get help with orders, returns, or general inquiries. We're here to assist you!",
  openGraph: {
    title: "Contact Us - Invictus Mall",
    description: "Get in touch with Invictus Mall customer support.",
    type: "website",
  },
};

// Force static generation for this page
export const dynamic = 'force-static';

export default function ContactPage() {
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
                className="text-white font-medium"
=======
                className={`${styles.navLink} ${styles.active}`}
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
                Contact Us
              </h1>
              <p className="text-xl md:text-2xl text-orange-100 max-w-3xl mx-auto">
=======
      <main className={styles.main}>
        {/* Hero Section */}
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <div>
              <h1 className={styles.heroTitle}>
                Contact Us
              </h1>
              <p className={styles.heroSubtitle}>
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
                We're here to help. Get in touch with us!
              </p>
            </div>
          </div>
        </section>

        {/* Contact Information Section */}
<<<<<<< HEAD
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-3 gap-8 mb-12">
              <div className="text-center p-6 bg-gray-50 rounded-lg">
                <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">📧</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Email
                </h3>
                <p className="text-gray-600">
                  support@invictusmall.com
                </p>
                <p className="text-gray-600">
=======
        <section className={styles.contactSection}>
          <div className={styles.contactContainer}>
            <div className={styles.contactInfoGrid}>
              <div className={styles.contactCard}>
                <div className={styles.contactIcon}>
                  <span>📧</span>
                </div>
                <h3 className={styles.contactTitle}>
                  Email
                </h3>
                <p className={styles.contactText}>
                  support@invictusmall.com
                </p>
                <p className={styles.contactText}>
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
                  info@invictusmall.com
                </p>
              </div>

<<<<<<< HEAD
              <div className="text-center p-6 bg-gray-50 rounded-lg">
                <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">📞</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Phone
                </h3>
                <p className="text-gray-600">
                  +1 (555) 123-4567
                </p>
                <p className="text-gray-600 text-sm">
=======
              <div className={styles.contactCard}>
                <div className={styles.contactIcon}>
                  <span>📞</span>
                </div>
                <h3 className={styles.contactTitle}>
                  Phone
                </h3>
                <p className={styles.contactText}>
                  +1 (555) 123-4567
                </p>
                <p className={styles.contactText} style={{ fontSize: '0.875rem' }}>
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
                  Mon-Fri, 9am-5pm EST
                </p>
              </div>

<<<<<<< HEAD
              <div className="text-center p-6 bg-gray-50 rounded-lg">
                <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">📍</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Address
                </h3>
                <p className="text-gray-600">
                  123 Commerce Street
                </p>
                <p className="text-gray-600">
=======
              <div className={styles.contactCard}>
                <div className={styles.contactIcon}>
                  <span>📍</span>
                </div>
                <h3 className={styles.contactTitle}>
                  Address
                </h3>
                <p className={styles.contactText}>
                  123 Commerce Street
                </p>
                <p className={styles.contactText}>
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
                  Business District, NY 10001
                </p>
              </div>
            </div>

            {/* Contact Form Section */}
<<<<<<< HEAD
            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-lg shadow-md p-8 border border-gray-200">
                <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">
                  Send us a Message
                </h2>
                <form className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
=======
            <div className={styles.contactFormContainer}>
              <div className={styles.contactFormCard}>
                <h2 className={styles.formTitle}>
                  Send us a Message
                </h2>
                <form className={styles.form}>
                  <div className={styles.formGrid}>
                    <div className={styles.formField}>
                      <label htmlFor="firstName" className={styles.formLabel}>
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
                        First Name
                      </label>
                      <input
                        type="text"
                        id="firstName"
                        name="firstName"
<<<<<<< HEAD
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
=======
                        className={styles.formInput}
                        required
                      />
                    </div>
                    <div className={styles.formField}>
                      <label htmlFor="lastName" className={styles.formLabel}>
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
                        Last Name
                      </label>
                      <input
                        type="text"
                        id="lastName"
                        name="lastName"
<<<<<<< HEAD
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
=======
                        className={styles.formInput}
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
                        required
                      />
                    </div>
                  </div>

<<<<<<< HEAD
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
=======
                  <div className={styles.formField}>
                    <label htmlFor="email" className={styles.formLabel}>
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
<<<<<<< HEAD
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
=======
                      className={styles.formInput}
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
                      required
                    />
                  </div>

<<<<<<< HEAD
                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
=======
                  <div className={styles.formField}>
                    <label htmlFor="subject" className={styles.formLabel}>
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
                      Subject
                    </label>
                    <input
                      type="text"
                      id="subject"
                      name="subject"
<<<<<<< HEAD
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
=======
                      className={styles.formInput}
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
                      required
                    />
                  </div>

<<<<<<< HEAD
                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
=======
                  <div className={styles.formField}>
                    <label htmlFor="message" className={styles.formLabel}>
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
                      Message
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      rows={6}
<<<<<<< HEAD
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
=======
                      className={styles.formTextarea}
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
                      required
                    ></textarea>
                  </div>

                  <button
                    type="submit"
<<<<<<< HEAD
                    className="w-full bg-orange-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-orange-600 transition-colors"
=======
                    className={styles.submitButton}
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
                  >
                    Send Message
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
<<<<<<< HEAD
        <section className="py-16 bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
=======
        <section className={styles.faqSection}>
          <div className={styles.faqContainer}>
            <div className={styles.faqHeader}>
              <h2 className={styles.faqTitle}>
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
                Frequently Asked Questions
              </h2>
            </div>

<<<<<<< HEAD
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  How do I place an order?
                </h3>
                <p className="text-gray-600">
=======
            <div className={styles.faqList}>
              <div className={styles.faqItem}>
                <h3 className={styles.faqQuestion}>
                  How do I place an order?
                </h3>
                <p className={styles.faqAnswer}>
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
                  Browse our stores, add items to your cart, and proceed to checkout. You'll need to create an account or sign in to complete your purchase.
                </p>
              </div>

<<<<<<< HEAD
              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  What payment methods do you accept?
                </h3>
                <p className="text-gray-600">
=======
              <div className={styles.faqItem}>
                <h3 className={styles.faqQuestion}>
                  What payment methods do you accept?
                </h3>
                <p className={styles.faqAnswer}>
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
                  We accept all major credit cards, debit cards, and secure payment methods through our payment partners.
                </p>
              </div>

<<<<<<< HEAD
              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  How can I track my order?
                </h3>
                <p className="text-gray-600">
=======
              <div className={styles.faqItem}>
                <h3 className={styles.faqQuestion}>
                  How can I track my order?
                </h3>
                <p className={styles.faqAnswer}>
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
                  Once your order is confirmed, you'll receive a tracking number via email. You can also view your order status in your account dashboard.
                </p>
              </div>

<<<<<<< HEAD
              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  What is your return policy?
                </h3>
                <p className="text-gray-600">
=======
              <div className={styles.faqItem}>
                <h3 className={styles.faqQuestion}>
                  What is your return policy?
                </h3>
                <p className={styles.faqAnswer}>
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
                  We offer a 30-day return policy on most items. Items must be in original condition with tags attached. Please contact the store directly for specific return instructions.
                </p>
              </div>

<<<<<<< HEAD
              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  How do I become a store owner?
                </h3>
                <p className="text-gray-600">
=======
              <div className={styles.faqItem}>
                <h3 className={styles.faqQuestion}>
                  How do I become a store owner?
                </h3>
                <p className={styles.faqAnswer}>
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
                  If you're interested in opening a store on Invictus Mall, please contact us at business@invictusmall.com with your business details and we'll guide you through the process.
                </p>
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
                className="text-white font-medium"
=======
                className={`${styles.footerLink} ${styles.active}`}
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

