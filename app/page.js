'use client';
import Image from 'next/image';
import Link from 'next/link';
import boxJumps from '@/assets/box-jumps.jpg';
import {
  BookOpenIcon,
  CalendarDaysIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

export default function Page() {
  return (
    <main className="container mx-auto p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
        <div className="flex flex-col justify-center">
          <h2 className="text-2xl font-bold mb-2">HalteresAI</h2>
          <p className="text-lg mb-2">
            Automated, smart, and personalized workout programming for gym
            owners, coaches, and personal trainers.
          </p>
          <Link href={'/create-program'}>
            <button className="btn btn-primary btn-large text-white mt-4">
              Get Started
            </button>
          </Link>
        </div>
        <div>
          <Image
            src={boxJumps}
            alt="Fitness enthusiast"
            width={800}
            height={600}
            className="object-cover"
          />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card bordered">
          <div className="card-body">
            <div className="flex items-center mb-2">
              <CalendarDaysIcon className="h-6 w-6 mr-2" />
              <h2 className="text-lg font-bold">Gym Personalization</h2>
            </div>
            <p className="text-sm">
              Tailor workouts to your gym's equipment and class schedule.
            </p>
          </div>
        </div>
        <div className="card bordered">
          <div className="card-body">
            <div className="flex items-center mb-2">
              <BookOpenIcon className="h-6 w-6 mr-2" />
              <h2 className="text-lg font-bold">
                {' '}
                Accurate Workout Programming
              </h2>
            </div>
            <p className="text-sm">
              Leverage our database of 1000s of exercises and upload your own to
              create hyper accurate and unique programs for classes,
              individuals, or yourself!{' '}
            </p>
          </div>
        </div>
        <div className="card bordered">
          <div className="card-body">
            <div className="flex items-center mb-2">
              <ClockIcon className="h-6 w-6 mr-2" />
              <h2 className="text-lg font-bold">Save Time</h2>
            </div>
            <p className="text-sm">
              Auto generate your programming and save hours of time each week.{' '}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
