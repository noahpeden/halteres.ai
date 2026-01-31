'use client';
import { ExternalLink, Mail, MessageSquare, Phone } from 'lucide-react';

export default function FeedbackSection() {
  return (
    <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-6 lg:space-y-0">
        <div className="flex-1">
          <div className="flex items-center mb-3">
            <div className="p-2 bg-blue-100 rounded-lg mr-3">
              <MessageSquare className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">We Value Your Feedback</h3>
          </div>
          <p className="text-slate-600 mb-4 max-w-md">
            Help us improve Halteres.ai by sharing your thoughts and suggestions about our platform.
          </p>
          <a
            href="https://docs.google.com/forms/d/e/1FAIpQLScwKMmjHLqIq4bmOlFKaVHFIowqX1-CwZ3HRNXWZyxpBb3VVw/viewform?usp=dialog"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors duration-200 group"
          >
            <span>Give Feedback</span>
            <ExternalLink className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform duration-200" />
          </a>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm lg:ml-8 w-full lg:w-auto">
          <h4 className="font-semibold text-slate-900 mb-4 flex items-center">
            <div className="p-1.5 bg-green-100 rounded-lg mr-2">
              <Phone className="w-4 h-4 text-green-600" />
            </div>
            Questions or Issues?
          </h4>
          <div className="space-y-3 text-sm">
            <div className="flex items-center">
              <Phone className="w-4 h-4 text-slate-400 mr-2" />
              <span className="text-slate-600">
                <span className="font-medium text-slate-900">Phone:</span> (314) 827-4744
              </span>
            </div>
            <div className="flex items-start">
              <Mail className="w-4 h-4 text-slate-400 mr-2 mt-0.5" />
              <div className="text-slate-600">
                <div className="font-medium text-slate-900 mb-1">Email:</div>
                <div>ben@halteres.ai</div>
                <div>noah@halteres.ai</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
