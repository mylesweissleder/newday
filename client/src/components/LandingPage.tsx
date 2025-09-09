import React from 'react';
import { Users, Network, ArrowRight, CheckCircle } from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onLogin }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between p-6 max-w-4xl mx-auto">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">🤝</span>
          <span className="text-2xl font-bold">TrueCrew</span>
        </div>
        
        <div className="flex items-center space-x-4">
          <button 
            onClick={onLogin}
            className="px-6 py-2 text-white/80 hover:text-white transition-colors duration-200"
          >
            Sign In
          </button>
          <button 
            onClick={onGetStarted}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105"
          >
            Start with Your Crew
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-16">
        {/* Hero */}
        <section className="text-center space-y-6">
          <h1 className="text-5xl md:text-6xl font-bold">
            🤝 TrueCrew
          </h1>
          <p className="text-2xl md:text-3xl text-white/90 font-light">
            Your circle of trust, powered for opportunity.
          </p>
        </section>

        {/* Divider */}
        <div className="flex justify-center">
          <div className="w-16 h-px bg-white/30"></div>
        </div>

        {/* Why TrueCrew */}
        <section className="space-y-6">
          <h2 className="text-3xl font-bold text-center">Why TrueCrew</h2>
          <div className="text-xl text-white/90 leading-relaxed text-center max-w-3xl mx-auto">
            <p>Job hunting and project chasing is hard — but it's easier when you don't go it alone. With TrueCrew, you band together with a few trusted colleagues, mentors, or friends to share networks, make warm intros, and celebrate wins together.</p>
          </div>
        </section>

        {/* Divider */}
        <div className="flex justify-center">
          <div className="w-16 h-px bg-white/30"></div>
        </div>

        {/* How It Works */}
        <section className="space-y-8">
          <h2 className="text-3xl font-bold text-center">How It Works</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center font-bold text-lg">
                  1
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Gather Your People</h3>
                  <p className="text-white/80">A few trusted peers. No giant networks.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center font-bold text-lg">
                  2
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Share Your Reach</h3>
                  <p className="text-white/80">Combine your contacts, securely.</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center font-bold text-lg">
                  3
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Help Each Other Out</h3>
                  <p className="text-white/80">Send or receive thoughtful intro requests.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center font-bold text-lg">
                  4
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Win Together</h3>
                  <p className="text-white/80">Every interview or signed contract is a group success.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="flex justify-center">
          <div className="w-16 h-px bg-white/30"></div>
        </div>

        {/* Why It Works */}
        <section className="space-y-6">
          <h2 className="text-3xl font-bold text-center">Why It Works</h2>
          <div className="text-xl text-white/90 leading-relaxed text-center max-w-3xl mx-auto">
            <p>Because opportunities flow through trust. Because résumés get ignored. Because we all do better when we help each other out.</p>
          </div>
        </section>

        {/* Divider */}
        <div className="flex justify-center">
          <div className="w-16 h-px bg-white/30"></div>
        </div>

        {/* Built for People Like Us */}
        <section className="space-y-6 text-center">
          <h2 className="text-3xl font-bold">Built for People Like Us</h2>
          <div className="text-xl text-white/90 leading-relaxed max-w-2xl mx-auto">
            <p className="mb-4">This isn't another CRM.</p>
            <p>It's a private tool for small groups of friends and colleagues who believe in helping each other succeed.</p>
          </div>
        </section>

        {/* Divider */}
        <div className="flex justify-center">
          <div className="w-16 h-px bg-white/30"></div>
        </div>

        {/* Join the Circle */}
        <section className="space-y-8 text-center">
          <h2 className="text-3xl font-bold">Join the Circle</h2>
          
          <button 
            onClick={onGetStarted}
            className="inline-flex items-center px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold text-xl transition-all duration-200 transform hover:scale-105 hover:shadow-xl"
          >
            👉 Start with Your Crew
            <ArrowRight className="w-5 h-5 ml-2" />
          </button>
          
          <p className="text-white/70">
            (It's free while we're in beta. No credit card required.)
          </p>
        </section>

        {/* Divider */}
        <div className="flex justify-center">
          <div className="w-16 h-px bg-white/30"></div>
        </div>

        {/* Founders Note */}
        <section className="space-y-6">
          <h2 className="text-3xl font-bold text-center">A Note from the Founders</h2>
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
            <blockquote className="text-lg text-white/90 leading-relaxed italic text-center">
              "We built TrueCrew because we were tired of feeling alone in the grind. We wanted something small, supportive, and private — a way to give and get help from the people who matter most. If you believe careers are built on trust and introductions, welcome to the circle."
            </blockquote>
            <div className="text-center mt-6">
              <p className="font-semibold text-white">— Myles & Chris</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default LandingPage;