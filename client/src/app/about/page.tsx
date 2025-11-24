import Link from "next/link";
import type { Metadata } from "next";

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
              >
                Home
              </Link>
              <Link
                href="/about"
                className="text-white font-medium"
              >
                About
              </Link>
            </div>
          </div>
        </div>
      </header>
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-orange-500 to-orange-600 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                About Invictus Mall
              </h1>
              <p className="text-xl md:text-2xl text-orange-100 max-w-3xl mx-auto">
                Your Ultimate Shopping Destination
              </p>
            </div>
          </div>
        </section>

        {/* Mission & Vision Section */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-12">
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Our Mission
                </h2>
                <p className="text-lg text-gray-700 leading-relaxed">
                  To revolutionize the shopping experience by connecting customers with exceptional stores and products, 
                  while fostering a community built on trust, quality, and innovation. We aim to make shopping 
                  convenient, enjoyable, and accessible for everyone.
                </p>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Our Vision
                </h2>
                <p className="text-lg text-gray-700 leading-relaxed">
                  To become the world's most trusted and innovative online marketplace, where customers discover 
                  amazing products, stores thrive, and communities flourish. We envision a future where shopping 
                  is seamless, personalized, and meaningful.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Core Values Section */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Our Core Values
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                These fundamental principles guide everything we do and shape how we serve our community
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {coreValues.map((value, index) => {
                return (
                  <div
                    key={index}
                    className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-300 border border-gray-200"
                  >
                    <div className="flex items-center mb-4">
                      <div className="bg-orange-100 p-3 rounded-lg mr-4 text-2xl">
                        {value.icon}
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900">
                        {value.title}
                      </h3>
                    </div>
                    <p className="text-gray-600 leading-relaxed">
                      {value.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Why Choose Us Section */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Why Choose Invictus Mall?
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl font-bold text-orange-600">✓</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Verified Stores
                </h3>
                <p className="text-gray-600">
                  All our stores are carefully verified to ensure quality and reliability
                </p>
              </div>

              <div className="text-center">
                <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl font-bold text-orange-600">🔒</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Secure Shopping
                </h3>
                <p className="text-gray-600">
                  Your transactions are protected with industry-leading security measures
                </p>
              </div>

              <div className="text-center">
                <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl font-bold text-orange-600">⭐</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Best Deals
                </h3>
                <p className="text-gray-600">
                  Discover amazing products at competitive prices with exclusive deals
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Company Story Section */}
        <section className="py-16 bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Our Story
              </h2>
            </div>
            <div className="bg-white rounded-lg shadow-md p-8">
              <p className="text-lg text-gray-700 leading-relaxed mb-4">
                Invictus Mall was founded with a simple yet powerful vision: to transform the way people shop online. 
                We recognized that customers deserved more than just a transactional experience—they needed a platform 
                that connects them with quality stores, exceptional products, and a community they can trust.
              </p>
              <p className="text-lg text-gray-700 leading-relaxed mb-4">
                Since our inception, we've been committed to building a marketplace that prioritizes customer satisfaction, 
                store success, and community growth. We've carefully curated our store network, ensuring that every store 
                meets our high standards for quality, service, and reliability.
              </p>
              <p className="text-lg text-gray-700 leading-relaxed">
                Today, Invictus Mall stands as a testament to what's possible when innovation meets integrity. We continue 
                to evolve, adapt, and improve, always keeping our core values at the heart of everything we do. Join us 
                on this journey as we shape the future of online shopping.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p>&copy; 2024 Invictus Mall. All rights reserved.</p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link
                href="/about"
                className="text-gray-300 hover:text-white transition-colors"
              >
                About
              </Link>
              <a
                href="#contact"
                className="text-gray-300 hover:text-white transition-colors"
              >
                Contact
              </a>
              <a
                href="#privacy"
                className="text-gray-300 hover:text-white transition-colors"
              >
                Privacy
              </a>
              <a
                href="#terms"
                className="text-gray-300 hover:text-white transition-colors"
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

