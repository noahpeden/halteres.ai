import { metadata } from '../metadata';
import Image from 'next/image';
import Link from 'next/link';

export const generateMetadata = () => {
  return {
    ...metadata,
    title: 'Our Team | HalteresAI',
    description:
      'Meet the talented team behind HalteresAI, working to revolutionize fitness programming with AI technology.',
  };
};

export default function TeamPage() {
  const teamMembers = [
    {
      name: 'Sarah Johnson',
      role: 'Founder & CEO',
      bio: 'Former CrossFit coach with a background in computer science, Sarah founded HalteresAI to solve the programming challenges she experienced firsthand.',
      imageSrc: '/team-placeholder.jpg',
    },
    {
      name: 'Michael Chen',
      role: 'CTO',
      bio: 'AI specialist with a PhD from MIT, Michael leads our engineering team in developing the core technology that powers HalteresAI.',
      imageSrc: '/team-placeholder.jpg',
    },
    {
      name: 'Alex Rivera',
      role: 'Head of Product',
      bio: 'Certified strength and conditioning specialist with 10+ years of experience in fitness programming and 5 years in product management.',
      imageSrc: '/team-placeholder.jpg',
    },
    {
      name: 'Emma Thompson',
      role: 'Lead Designer',
      bio: 'UX/UI specialist focused on creating intuitive interfaces for fitness professionals. Previously led design at major fitness tech companies.',
      imageSrc: '/team-placeholder.jpg',
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <main>
        {/* Hero section */}
        <div className="bg-blue-600 py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
                Meet Our Team
              </h1>
              <p className="mt-6 text-lg leading-8 text-blue-100">
                The passionate people behind HalteresAI, dedicated to
                revolutionizing fitness programming.
              </p>
            </div>
          </div>
        </div>

        {/* Team section */}
        <div className="py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl lg:mx-0">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Our Leadership
              </h2>
              <p className="mt-6 text-lg leading-8 text-gray-600">
                With backgrounds in fitness, technology, and business, our team
                brings diverse expertise to creating the best AI-powered fitness
                programming platform.
              </p>
            </div>
            <ul
              role="list"
              className="mx-auto mt-20 grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 sm:grid-cols-2 lg:mx-0 lg:max-w-none lg:grid-cols-4"
            >
              {teamMembers.map((person) => (
                <li key={person.name}>
                  <div className="aspect-[3/2] w-full rounded-2xl bg-gray-100 overflow-hidden">
                    <div className="h-full w-full bg-gray-200 flex items-center justify-center text-gray-500">
                      Photo Placeholder
                    </div>
                  </div>
                  <h3 className="mt-6 text-lg font-semibold leading-8 text-gray-900">
                    {person.name}
                  </h3>
                  <p className="text-base leading-7 text-blue-600">
                    {person.role}
                  </p>
                  <p className="mt-4 text-base leading-7 text-gray-600">
                    {person.bio}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Values section */}
        <div className="bg-gray-50 py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl lg:mx-0">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Our Values
              </h2>
              <p className="mt-6 text-lg leading-8 text-gray-600">
                These principles guide everything we do at HalteresAI.
              </p>
            </div>
            <dl className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 text-base leading-7 sm:grid-cols-2 lg:mx-0 lg:max-w-none lg:gap-x-16">
              <div className="relative pl-10 border-l-4 border-blue-600 pl-6">
                <dt className="inline font-semibold text-gray-900">
                  Innovation with Purpose.
                </dt>{' '}
                <dd className="inline">
                  We don't build technology for its own sake—we create tools
                  that solve real problems for fitness professionals.
                </dd>
              </div>
              <div className="relative pl-10 border-l-4 border-blue-600 pl-6">
                <dt className="inline font-semibold text-gray-900">
                  Quality Above All.
                </dt>{' '}
                <dd className="inline">
                  From our algorithms to our user experience, we maintain the
                  highest standards in everything we create.
                </dd>
              </div>
              <div className="relative pl-10 border-l-4 border-blue-600 pl-6">
                <dt className="inline font-semibold text-gray-900">
                  Client Success.
                </dt>{' '}
                <dd className="inline">
                  We measure our success by how much time we save coaches and
                  how much value we add to their businesses.
                </dd>
              </div>
              <div className="relative pl-10 border-l-4 border-blue-600 pl-6">
                <dt className="inline font-semibold text-gray-900">
                  Continuous Improvement.
                </dt>{' '}
                <dd className="inline">
                  We're constantly learning, iterating, and evolving our
                  platform based on research and user feedback.
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* CTA section */}
        <div className="bg-blue-600 py-16">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Join Our Team
              </h2>
              <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-blue-100">
                Passionate about fitness and technology? We're always looking
                for talented individuals to join us in our mission.
              </p>
              <div className="mt-10 flex items-center justify-center gap-x-6">
                <Link
                  href="/contact"
                  className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-blue-600 shadow-sm hover:bg-blue-50"
                >
                  Contact Us
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
