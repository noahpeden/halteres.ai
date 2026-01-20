'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Building2, FileText, User, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import GymOverviewTab from '@/components/analytics/GymOverviewTab';
import ProgramAnalyticsTab from '@/components/analytics/ProgramAnalyticsTab';
import AthleteAnalyticsTab from '@/components/analytics/AthleteAnalyticsTab';

export default function AnalyticsPage() {
  const { currentGym } = useAuth();
  const [activeTab, setActiveTab] = useState('gym');

  if (!currentGym) {
    return (
      <div className="p-8">
        <div className="alert alert-warning">
          <span>Please select or create a gym to view analytics.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200">
      {/* Header */}
      <div className="bg-base-100 border-b border-base-300 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center gap-4 mb-2">
              <Link
                href="/dashboard"
                className="btn btn-ghost btn-sm btn-circle"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-base-content">Analytics Dashboard</h1>
                <p className="text-base-content/60">{currentGym.name}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Tab Navigation */}
        <div className="tabs tabs-boxed bg-base-100 p-1 mb-6 inline-flex">
          <button
            className={`tab gap-2 ${activeTab === 'gym' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('gym')}
          >
            <Building2 className="w-4 h-4" />
            Gym Overview
          </button>
          <button
            className={`tab gap-2 ${activeTab === 'program' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('program')}
          >
            <FileText className="w-4 h-4" />
            By Program
          </button>
          <button
            className={`tab gap-2 ${activeTab === 'athlete' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('athlete')}
          >
            <User className="w-4 h-4" />
            By Athlete
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'gym' && <GymOverviewTab gymId={currentGym.id} />}
        {activeTab === 'program' && <ProgramAnalyticsTab gymId={currentGym.id} />}
        {activeTab === 'athlete' && <AthleteAnalyticsTab gymId={currentGym.id} />}
      </div>
    </div>
  );
}
