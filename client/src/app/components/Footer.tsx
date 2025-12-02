import Link from "next/link";
import styles from "./Footer.module.scss";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerContent}>
        <div className={styles.footerInner}>
          <p className={styles.copyright}>&copy; 2024 Invictus Mall. All rights reserved.</p>
          <div className={styles.links}>
            <Link
              href="/about"
              className={styles.link}
            >
              About
            </Link>
            <Link
              href="/contact"
              className={styles.link}
            >
              Contact
            </Link>
            <Link
              href="/privacy"
              className={styles.link}
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className={styles.link}
            >
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

