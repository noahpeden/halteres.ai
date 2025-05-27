'use client';
import Link from 'next/link';

export default function DashboardHeader({ onCreateProgram }) {
  return (
    <div className="flex justify-between items-center mb-4">
      <h1 className="text-2xl font-bold mb-6">Coach Dashboard</h1>
      <div className="flex gap-2">
        <Link
          href="/dashboard/manage/entities"
          className="btn btn-outline text-primary hover:bg-primary-focus hover:text-primary rounded-md"
        >
          Manage Clients/Classes
        </Link>
        <button
          onClick={onCreateProgram}
          className="btn btn-primary text-white"
        >
          Create New Program
        </button>
      </div>
    </div>
  );
}
