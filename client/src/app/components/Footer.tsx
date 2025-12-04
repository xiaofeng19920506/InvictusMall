import Link from "next/link";
<<<<<<< HEAD

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <p>&copy; 2024 Invictus Mall. All rights reserved.</p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <Link
              href="/about"
              className="text-gray-300 hover:text-white transition-colors"
=======
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
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
            >
              About
            </Link>
            <Link
              href="/contact"
<<<<<<< HEAD
              className="text-gray-300 hover:text-white transition-colors"
=======
              className={styles.link}
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
            >
              Contact
            </Link>
            <Link
              href="/privacy"
<<<<<<< HEAD
              className="text-gray-300 hover:text-white transition-colors"
=======
              className={styles.link}
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
            >
              Privacy
            </Link>
            <Link
              href="/terms"
<<<<<<< HEAD
              className="text-gray-300 hover:text-white transition-colors"
=======
              className={styles.link}
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
            >
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

