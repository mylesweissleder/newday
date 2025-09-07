import React from 'react'

interface AboutPageProps {
  onBack: () => void
}

const AboutPage: React.FC<AboutPageProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <span className="text-4xl">🤝</span>
            <h1 className="text-4xl font-bold text-gray-900">TrueCrew</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Where your crew's connections become career opportunities
          </p>
        </div>

        {/* Founders Section */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-12">
          <div className="p-8 sm:p-12">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Meet the Founders</h2>
              <p className="text-lg text-gray-600">
                Built by two entrepreneurs who believe referrals beat cold outreach
              </p>
            </div>

            {/* Founders Photo */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <img 
                  src="/mylesandchris.png" 
                  alt="Myles Weissleder and Chris Heuer - TrueCrew Founders"
                  className="rounded-2xl shadow-lg max-w-md w-full"
                />
                <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-gray-900/10"></div>
              </div>
            </div>

            {/* Founder Profiles */}
            <div className="grid md:grid-cols-2 gap-8">
              {/* Myles */}
              <div className="text-center">
                <div className="mb-4">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Myles Weissleder</h3>
                  <p className="text-gray-600 mb-4">Co-Founder & Product</p>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Serial entrepreneur and product builder who's experienced firsthand how warm introductions 
                    accelerate career growth. Passionate about building tools that help people connect authentically.
                  </p>
                </div>
                <a 
                  href="https://mylesweissleder.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  mylesweissleder.com
                  <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>

              {/* Chris */}
              <div className="text-center">
                <div className="mb-4">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Chris Heuer</h3>
                  <p className="text-gray-600 mb-4">Co-Founder & Strategy</p>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Veteran community builder and strategic advisor with decades of experience helping professionals 
                    leverage their networks. Believes the future of career advancement is collaborative, not competitive.
                  </p>
                </div>
                <a 
                  href="https://chrisheuer.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  chrisheuer.com
                  <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Origin Story */}
        <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-12 mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">The Story Behind TrueCrew</h2>
          <div className="prose prose-lg max-w-none text-gray-600">
            <p className="mb-6">
              Like most professionals, Myles and Chris had built extensive networks over their careers. But when it came 
              time to help each other—or friends looking for their next opportunity—they faced the same frustrating reality: 
              <strong> their combined connections were trapped in separate contact lists, email threads, and LinkedIn profiles.</strong>
            </p>
            
            <p className="mb-6">
              The "aha moment" came during a conversation about job searching. They realized that while each of them knew 
              hundreds of people individually, together they had warm paths to thousands of decision makers, hiring managers, 
              and industry leaders. <strong>The problem wasn't a lack of connections—it was a lack of visibility into their 
              collective network.</strong>
            </p>

            <p className="mb-6">
              TrueCrew was born from this simple insight: <strong>small groups of trusted colleagues should be able to pool 
              their professional networks effortlessly.</strong> No more asking "Do you know anyone at..." in group chats. 
              No more missed opportunities because someone forgot about a perfect connection.
            </p>

            <p>
              We built TrueCrew to turn your crew's collective contacts into a seamless opportunity engine—because we believe 
              <strong> referrals beat cold outreach, every time.</strong>
            </p>
          </div>
        </div>

        {/* Mission */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-xl p-8 sm:p-12 text-white text-center">
          <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
          <p className="text-lg leading-relaxed max-w-3xl mx-auto mb-6">
            To make professional networking collaborative instead of competitive. We're building a world where 
            small crews of trusted colleagues can effortlessly leverage their combined connections to create 
            opportunities for each other.
          </p>
          <div className="grid md:grid-cols-3 gap-6 mt-8">
            <div className="text-center">
              <div className="text-3xl mb-2">🤝</div>
              <h3 className="font-semibold mb-1">Trust First</h3>
              <p className="text-sm text-blue-100">Small crews, big results</p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">🔗</div>
              <h3 className="font-semibold mb-1">Collective Power</h3>
              <p className="text-sm text-blue-100">Shared networks, shared success</p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">🚀</div>
              <h3 className="font-semibold mb-1">Real Opportunities</h3>
              <p className="text-sm text-blue-100">Warm paths to career growth</p>
            </div>
          </div>
        </div>

        {/* Contact Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-12 mt-12 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Get in Touch</h2>
          <p className="text-gray-600 mb-6">
            Have questions, feedback, or want to share your TrueCrew success story?
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:hello@truecrew.app"
              className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 font-medium"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              hello@truecrew.app
            </a>
            <a
              href="https://github.com/mylesweissleder/truecrew"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 font-medium"
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
              View on GitHub
            </a>
          </div>
        </div>

        {/* Back Button */}
        <div className="text-center mt-8">
          <button
            onClick={onBack}
            className="inline-flex items-center text-gray-600 hover:text-gray-900 font-medium"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to TrueCrew
          </button>
        </div>

        {/* Copyright Footer */}
        <div className="text-center mt-12 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            © 2025 TrueCrew. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}

export default AboutPage