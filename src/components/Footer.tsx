import { Link } from 'react-router-dom';
import { Wrench, Mail, Phone, MapPin, Facebook, Twitter, Instagram } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-900 dark:bg-black text-gray-300 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 font-bold text-xl text-white mb-4">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
                <Wrench className="w-5 h-5 text-white" />
              </div>
              <span>worker<span className="text-blue-400">.com</span></span>
            </div>
            <p className="text-sm text-gray-400">
              Your trusted marketplace for professional home services. Book skilled workers for any job, anytime.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-blue-400 transition-colors">Home</Link></li>
              <li><Link to="/workers" className="hover:text-blue-400 transition-colors">Find Workers</Link></li>
              <li><Link to="/categories" className="hover:text-blue-400 transition-colors">Categories</Link></li>
              <li><Link to="/register-worker" className="hover:text-blue-400 transition-colors">Become a Worker</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-4">Support</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/support" className="hover:text-blue-400 transition-colors">Help Center</Link></li>
              <li><Link to="/support" className="hover:text-blue-400 transition-colors">Contact Us</Link></li>
              <li><Link to="/support" className="hover:text-blue-400 transition-colors">Terms of Service</Link></li>
              <li><Link to="/support" className="hover:text-blue-400 transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-4">Contact</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2"><Mail className="w-4 h-4" /> support@worker.com</li>
              <li className="flex items-center gap-2"><Phone className="w-4 h-4" /> +91 1800-123-4567</li>
              <li className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Bengaluru, India</li>
            </ul>
            <div className="flex gap-3 mt-4">
              <a href="#" className="w-9 h-9 rounded-lg bg-gray-800 flex items-center justify-center hover:bg-blue-600 transition-colors"><Facebook className="w-4 h-4" /></a>
              <a href="#" className="w-9 h-9 rounded-lg bg-gray-800 flex items-center justify-center hover:bg-blue-600 transition-colors"><Twitter className="w-4 h-4" /></a>
              <a href="#" className="w-9 h-9 rounded-lg bg-gray-800 flex items-center justify-center hover:bg-blue-600 transition-colors"><Instagram className="w-4 h-4" /></a>
            </div>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-500">
          <p>© 2026 worker.com. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
