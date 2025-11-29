import { metadata } from '../metadata';
import Image from 'next/image';
import Link from 'next/link';
import peaceCorpsImage from '@/assets/peace-corps.jpg';
import mexicoCityImage from '@/assets/mexico-city.jpg';

export const generateMetadata = () => {
  return {
    ...metadata,
    title: 'About Our Company | HalteresAI',
    description:
      'Learn about HalteresAI, our founding story, and how we help gym owners take back their programming.',
  };
};

export default function CompanyPage() {
  return (
    <div className="min-h-screen bg-base-100">
      <main>
        {/* Hero section */}
        <div className="hero min-h-[30vh] bg-primary text-primary-content">
          <div className="hero-content text-center">
            <div className="max-w-md">
              <h1 className="text-5xl font-bold text-white">
                About HalteresAI
              </h1>
              <p className="py-6 text-white">
                We're on a mission to give gym owners their programming back—
                custom, equipment-specific, and 100% theirs.
              </p>
            </div>
          </div>
        </div>

        {/* Mission section */}
        <div className="py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <div className="badge badge-primary mb-2">Our Mission</div>
              <h2 className="text-4xl font-bold">
                Giving gym owners their programming back
              </h2>
              <p className="mt-4 text-lg max-w-2xl mx-auto">
                At HalteresAI, we believe your members come to YOUR gym for YOUR
                coaching and YOUR community. They deserve YOUR programming too—not
                generic workouts that don't fit your equipment or goals.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center mr-3">
                      <svg
                        className="h-6 w-6 text-primary-content"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <h3 className="card-title">8 Weeks in 10 Minutes</h3>
                  </div>
                  <p>
                    Transform programming time from hours to minutes. Stop
                    spending Sunday nights writing next week's workouts.
                  </p>
                </div>
              </div>

              <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center mr-3">
                      <svg
                        className="h-6 w-6 text-primary-content"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
                        />
                      </svg>
                    </div>
                    <h3 className="card-title">Your Equipment, Your Way</h3>
                  </div>
                  <p>
                    Programming that actually fits YOUR gym. No more workouts
                    that assume sleds, ropes, or machines you don't have.
                  </p>
                </div>
              </div>

              <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center mr-3">
                      <svg
                        className="h-6 w-6 text-primary-content"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"
                        />
                      </svg>
                    </div>
                    <h3 className="card-title">Your Brand, Not Theirs</h3>
                  </div>
                  <p>
                    Deliver programming that's uniquely yours. Your members came
                    for YOUR gym—give them programming to match.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Story section */}
        <div className="py-16 bg-base-200">
          <div className="container mx-auto px-4">
            <div className="flex flex-col lg:flex-row gap-8 items-center">
              <div className="lg:w-1/2">
                <h2 className="text-4xl font-bold mb-6">Our Story</h2>
                <div className="space-y-4">
                  <p className="text-lg">
                    HalteresAI was founded by Noah Peden (CEO/CTO) and Ben
                    Feimer (CRO), who met in the Peace Corps Mongolia where they
                    both served from 2014 to 2016. During their service, with
                    limited entertainment options, they turned to fitness as a
                    way to stay active and connected.
                  </p>
                  <p className="text-lg">
                    After the Peace Corps, Noah became a software engineer and
                    discovered CrossFit, where he noticed a common problem: coaches
                    either spent countless hours on programming OR paid for generic
                    programming that didn't fit their equipment. Meanwhile, Ben
                    entered the non-profit advising world while developing a passion
                    for powerlifting and experiencing various training methodologies.
                  </p>
                  <p className="text-lg">
                    When Noah saw gym owners struggling with this choice—time or
                    authenticity—he approached Ben with the idea for HalteresAI.
                    Combining Noah's technical expertise with Ben's business acumen
                    and shared passion for fitness, they built a platform designed
                    to give gym owners the best of both worlds: fast programming
                    that's 100% customized to their gym.
                  </p>
                </div>
              </div>

              <div className="lg:w-1/2 space-y-6">
                <div className="card w-full bg-base-100 shadow-xl">
                  <figure className="px-4 pt-4">
                    <Image
                      src={peaceCorpsImage}
                      alt="Noah and Ben during their Peace Corps service in Mongolia"
                      width={800}
                      height={450}
                      className="rounded-xl object-contain w-full h-auto max-h-96"
                    />
                  </figure>
                  <div className="card-body pt-2">
                    <p className="text-sm opacity-70">
                      Noah and Ben in Mongolia during their Peace Corps service
                      (2014-2016)
                    </p>
                  </div>
                </div>

                <div className="card w-full bg-base-100 shadow-xl">
                  <figure className="px-4 pt-4">
                    <Image
                      src={mexicoCityImage}
                      alt="Noah and Ben in Mexico City where they decided to partner on HalteresAI"
                      width={800}
                      height={450}
                      className="rounded-xl object-contain w-full h-auto max-h-96"
                    />
                  </figure>
                  <div className="card-body pt-2">
                    <p className="text-sm opacity-70">
                      The founders in Mexico City, where they decided to partner
                      and create HalteresAI
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Values section */}
        <div className="py-16">
          <div className="container mx-auto px-4">
            <div className="mb-12">
              <h2 className="text-4xl font-bold mb-4">Our Values</h2>
              <p className="text-lg">
                These core principles guide everything we do at HalteresAI.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="card bg-base-100 border-l-4 border-primary">
                <div className="card-body">
                  <h3 className="card-title">Coach-Centered Innovation</h3>
                  <p>
                    We develop our technology by deeply understanding the real
                    challenges fitness professionals face every day.
                  </p>
                </div>
              </div>

              <div className="card bg-base-100 border-l-4 border-primary">
                <div className="card-body">
                  <h3 className="card-title">Scientific Integrity</h3>
                  <p>
                    Our programming is based on exercise science and proven
                    methodologies, not fads or trends.
                  </p>
                </div>
              </div>

              <div className="card bg-base-100 border-l-4 border-primary">
                <div className="card-body">
                  <h3 className="card-title">Continuous Improvement</h3>
                  <p>
                    We're committed to constantly refining our platform based on
                    user feedback and emerging research.
                  </p>
                </div>
              </div>

              <div className="card bg-base-100 border-l-4 border-primary">
                <div className="card-body">
                  <h3 className="card-title">Community Impact</h3>
                  <p>
                    We believe fitness changes lives, and we're passionate about
                    helping fitness professionals build stronger communities.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA section */}
        <div className="bg-primary text-primary-content py-16">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-4 text-white">
              Ready to take back your programming?
            </h2>
            <p className="max-w-xl mx-auto mb-8 text-lg opacity-80 text-white">
              Join gym owners who've stopped paying for generic programming
              and started delivering their own.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/login"
                className="btn btn-lg btn-secondary text-white"
              >
                Try Free for 14 Days
              </Link>
              <Link
                href="/contact"
                className="btn btn-lg btn-outline btn-secondary bg-white hover:text-white"
              >
                Contact us
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
