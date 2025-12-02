import Link from "next/link";
import type { Metadata } from "next";
import styles from "./page.module.scss";

export const metadata: Metadata = {
  title: "About Us - Invictus Mall | Your Ultimate Shopping Destination",
  description: "Learn about Invictus Mall's mission, vision, and core values. Discover why we're your trusted online marketplace for quality stores and exceptional products.",
  openGraph: {
    title: "About Us - Invictus Mall",
    description: "Learn about Invictus Mall's mission, vision, and core values.",
    type: "website",
  },
};

// Force static generation for this page
export const dynamic = 'force-static';

export default function AboutPage() {
  const coreValues = [
    {
      icon: "❤️",
      title: "Customer First",
      description: "We prioritize our customers' needs and satisfaction above all else. Every decision we make is with our customers in mind.",
    },
    {
      icon: "🛡️",
      title: "Trust & Security",
      description: "We ensure a safe and secure shopping environment with verified stores and protected transactions.",
    },
    {
      icon: "👥",
      title: "Community Driven",
      description: "We build a vibrant community of shoppers and store owners, fostering connections and mutual growth.",
    },
    {
      icon: "✨",
      title: "Innovation",
      description: "We continuously innovate to provide the best shopping experience with cutting-edge technology and features.",
    },
    {
      icon: "🎯",
      title: "Excellence",
      description: "We strive for excellence in everything we do, from product quality to customer service.",
    },
    {
      icon: "🏆",
      title: "Integrity",
      description: "We conduct business with honesty, transparency, and ethical practices in all our operations.",
    },
  ];

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
                className={`${styles.navLink} ${styles.active}`}
              >
                About
              </Link>
            </div>
          </div>
        </div>
      </header>
      
      <main className={styles.main}>
        {/* Hero Section */}
        <section className={styles.heroSection}>
          <div className={styles.heroContainer}>
            <div>
              <h1 className={styles.heroTitle}>
                About Invictus Mall
              </h1>
              <p className={styles.heroSubtitle}>
                Your Ultimate Shopping Destination
              </p>
            </div>
          </div>
        </section>

        {/* Mission & Vision Section */}
        <section className={styles.missionSection}>
          <div className={styles.missionContainer}>
            <div className={styles.missionVisionGrid}>
              <div className={styles.missionCard}>
                <h2 className={styles.cardTitle}>
                  Our Mission
                </h2>
                <p className={styles.cardText}>
                  To revolutionize the shopping experience by connecting customers with exceptional stores and products, 
                  while fostering a community built on trust, quality, and innovation. We aim to make shopping 
                  convenient, enjoyable, and accessible for everyone.
                </p>
              </div>

              <div className={styles.visionCard}>
                <h2 className={styles.cardTitle}>
                  Our Vision
                </h2>
                <p className={styles.cardText}>
                  To become the world's most trusted and innovative online marketplace, where customers discover 
                  amazing products, stores thrive, and communities flourish. We envision a future where shopping 
                  is seamless, personalized, and meaningful.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Core Values Section */}
        <section className={styles.valuesSection}>
          <div className={styles.valuesContainer}>
            <div className={styles.valuesHeader}>
              <h2 className={styles.valuesTitle}>
                Our Core Values
              </h2>
              <p className={styles.valuesSubtitle}>
                These fundamental principles guide everything we do and shape how we serve our community
              </p>
            </div>

            <div className={styles.valuesGrid}>
              {coreValues.map((value, index) => {
                return (
                  <div
                    key={index}
                    className={styles.valueCard}
                  >
                    <div className={styles.valueHeader}>
                      <div className={styles.valueIcon}>
                        {value.icon}
                      </div>
                      <h3 className={styles.valueTitle}>
                        {value.title}
                      </h3>
                    </div>
                    <p className={styles.valueDescription}>
                      {value.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Why Choose Us Section */}
        <section className={`${styles.section} ${styles.sectionWhite}`}>
          <div className={styles.sectionContent}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                Why Choose Invictus Mall?
              </h2>
            </div>

            <div className={styles.featuresGrid}>
              <div className={styles.feature}>
                <div className={styles.featureIcon}>
                  ✓
                </div>
                <h3 className={styles.featureTitle}>
                  Verified Stores
                </h3>
                <p className={styles.featureDescription}>
                  All our stores are carefully verified to ensure quality and reliability
                </p>
              </div>

              <div className={styles.feature}>
                <div className={styles.featureIcon}>
                  🔒
                </div>
                <h3 className={styles.featureTitle}>
                  Secure Shopping
                </h3>
                <p className={styles.featureDescription}>
                  Your transactions are protected with industry-leading security measures
                </p>
              </div>

              <div className={styles.feature}>
                <div className={styles.featureIcon}>
                  ⭐
                </div>
                <h3 className={styles.featureTitle}>
                  Best Deals
                </h3>
                <p className={styles.featureDescription}>
                  Discover amazing products at competitive prices with exclusive deals
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Company Story Section */}
        <section className={`${styles.section} ${styles.sectionGradient}`}>
          <div className={styles.storyContent}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <h2 className={styles.sectionTitle}>
                Our Story
              </h2>
            </div>
            <div className={styles.storyCard}>
              <p className={styles.storyText}>
                Invictus Mall was founded with a simple yet powerful vision: to transform the way people shop online. 
                We recognized that customers deserved more than just a transactional experience—they needed a platform 
                that connects them with quality stores, exceptional products, and a community they can trust.
              </p>
              <p className={styles.storyText}>
                Since our inception, we've been committed to building a marketplace that prioritizes customer satisfaction, 
                store success, and community growth. We've carefully curated our store network, ensuring that every store 
                meets our high standards for quality, service, and reliability.
              </p>
              <p className={styles.storyText}>
                Today, Invictus Mall stands as a testament to what's possible when innovation meets integrity. We continue 
                to evolve, adapt, and improve, always keeping our core values at the heart of everything we do. Join us 
                on this journey as we shape the future of online shopping.
              </p>
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
              <a
                href="#contact"
                className={styles.footerLink}
              >
                Contact
              </a>
              <a
                href="#privacy"
                className={styles.footerLink}
              >
                Privacy
              </a>
              <a
                href="#terms"
                className={styles.footerLink}
              >
                Terms
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

