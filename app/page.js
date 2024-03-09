import Link from 'next/link';
import Image from 'next/image';
import boxJumps from './assets/box-jumps.jpg';
import chalk from './assets/chalk.jpg';
import coachImg from './assets/coach-overhead-press.jpg';
import womanRopes from './assets/woman-rope-looking.jpg';
import { createClient } from './utils/supabase/server';

export default async function Home() {
  const supabase = createClient();

  const { data, error } = await supabase.auth.getSession();

  return (
    <main className="flex min-h-screen flex-col">
      <div className="text-center">
        <h1 className="text-4xl font-bold mt-4">Welcome to Halteres.ai</h1>
        <p className="text-xl mt-4 mb-8 mx-auto leading-relaxed max-w-xl">
          Halteres.ai is the smartest app for workout planning. Leveraging
          cutting-edge AI, we provide tailored workout routines and resources to
          help you run your gym efficiently.
        </p>
        <Image
          src={coachImg}
          alt="Halteres.ai Logo"
          height={200}
          width={200}
          className="self-start"
        />
        <section>
          <Image
            src={boxJumps}
            alt="Halteres.ai Logo"
            height={200}
            width={200}
            className="self-start"
          />
          <h2 className="text-2xl font-bold mt-4">Tailored to You</h2>
          <p className="text-lg mt-2">
            Our AI learns from your preferences and performance to create a
            personalized workout plan.
          </p>
        </section>
        <section>
          <h2 className="text-2xl font-bold mt-4">Your Gym</h2>
          <p className="text-lg mt-2">
            Manage your gym equipment and schedule efficiently with our
            integrated tools.
          </p>
          <Image
            src={chalk}
            alt="Halteres.ai Logo"
            height={200}
            width={200}
            className="self-start"
          />
        </section>
        <section>
          <h2 className="text-2xl font-bold mt-4">Your Clients</h2>
          <p className="text-lg mt-2">
            Provide your clients with a unique and personalized workout
            experience.
          </p>
        </section>
        <section>
          <Image
            src={womanRopes}
            alt="Halteres.ai Logo"
            height={200}
            width={200}
            className="self-start"
          />
          <h2 className="text-2xl font-bold mt-4">Workouts You Love</h2>
          <p className="text-lg mt-2">
            Discover new workouts and track your progress over time.
          </p>
        </section>
        <div className="flex justify-center items-center mt-4">
          <Link href={'/login'}>
            <button className="btn btn-secondary text-xl">Get Started</button>
          </Link>
        </div>
      </div>
    </main>
  );
}
