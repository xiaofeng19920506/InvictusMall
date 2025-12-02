import Link from "next/link";
import type { Metadata } from "next";
import styles from "./page.module.scss";

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
                className={`${styles.navLink} ${styles.active}`}
              >
                Contact
              </Link>
            </div>
          </div>
        </div>
      </header>
      
      <main className={styles.main}>
        {/* Hero Section */}
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <div>
              <h1 className={styles.heroTitle}>
                Contact Us
              </h1>
              <p className={styles.heroSubtitle}>
                We're here to help. Get in touch with us!
              </p>
            </div>
          </div>
        </section>

        {/* Contact Information Section */}
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
                  info@invictusmall.com
                </p>
              </div>

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
                  Mon-Fri, 9am-5pm EST
                </p>
              </div>

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
                  Business District, NY 10001
                </p>
              </div>
            </div>

            {/* Contact Form Section */}
            <div className={styles.contactFormContainer}>
              <div className={styles.contactFormCard}>
                <h2 className={styles.formTitle}>
                  Send us a Message
                </h2>
                <form className={styles.form}>
                  <div className={styles.formGrid}>
                    <div className={styles.formField}>
                      <label htmlFor="firstName" className={styles.formLabel}>
                        First Name
                      </label>
                      <input
                        type="text"
                        id="firstName"
                        name="firstName"
                        className={styles.formInput}
                        required
                      />
                    </div>
                    <div className={styles.formField}>
                      <label htmlFor="lastName" className={styles.formLabel}>
                        Last Name
                      </label>
                      <input
                        type="text"
                        id="lastName"
                        name="lastName"
                        className={styles.formInput}
                        required
                      />
                    </div>
                  </div>

                  <div className={styles.formField}>
                    <label htmlFor="email" className={styles.formLabel}>
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      className={styles.formInput}
                      required
                    />
                  </div>

                  <div className={styles.formField}>
                    <label htmlFor="subject" className={styles.formLabel}>
                      Subject
                    </label>
                    <input
                      type="text"
                      id="subject"
                      name="subject"
                      className={styles.formInput}
                      required
                    />
                  </div>

                  <div className={styles.formField}>
                    <label htmlFor="message" className={styles.formLabel}>
                      Message
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      rows={6}
                      className={styles.formTextarea}
                      required
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    className={styles.submitButton}
                  >
                    Send Message
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className={styles.faqSection}>
          <div className={styles.faqContainer}>
            <div className={styles.faqHeader}>
              <h2 className={styles.faqTitle}>
                Frequently Asked Questions
              </h2>
            </div>

            <div className={styles.faqList}>
              <div className={styles.faqItem}>
                <h3 className={styles.faqQuestion}>
                  How do I place an order?
                </h3>
                <p className={styles.faqAnswer}>
                  Browse our stores, add items to your cart, and proceed to checkout. You'll need to create an account or sign in to complete your purchase.
                </p>
              </div>

              <div className={styles.faqItem}>
                <h3 className={styles.faqQuestion}>
                  What payment methods do you accept?
                </h3>
                <p className={styles.faqAnswer}>
                  We accept all major credit cards, debit cards, and secure payment methods through our payment partners.
                </p>
              </div>

              <div className={styles.faqItem}>
                <h3 className={styles.faqQuestion}>
                  How can I track my order?
                </h3>
                <p className={styles.faqAnswer}>
                  Once your order is confirmed, you'll receive a tracking number via email. You can also view your order status in your account dashboard.
                </p>
              </div>

              <div className={styles.faqItem}>
                <h3 className={styles.faqQuestion}>
                  What is your return policy?
                </h3>
                <p className={styles.faqAnswer}>
                  We offer a 30-day return policy on most items. Items must be in original condition with tags attached. Please contact the store directly for specific return instructions.
                </p>
              </div>

              <div className={styles.faqItem}>
                <h3 className={styles.faqQuestion}>
                  How do I become a store owner?
                </h3>
                <p className={styles.faqAnswer}>
                  If you're interested in opening a store on Invictus Mall, please contact us at business@invictusmall.com with your business details and we'll guide you through the process.
                </p>
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
                className={`${styles.footerLink} ${styles.active}`}
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

