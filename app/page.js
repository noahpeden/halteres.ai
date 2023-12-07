'use client';
import Office from './components/Office';
import Whiteboard from './components/Whiteboard';
import Metcon from './components/Metcon';
import Link from 'next/link';
import img from './assets/logo.png';
import Image from 'next/image';
import { useState } from 'react';

export default function Home() {
  const [showComponents, setShowComponents] = useState(false);
  const handleGetStartedClick = () => {
    setShowComponents(true);
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };

  return (
    <main className="flex min-h-screen flex-col">
      <div className="text-center">
        <Image
          src={img}
          alt="Halteres.ai Logo"
          height={250}
          className="mx-auto"
          width={250}
        />
        {!showComponents && (
          <>
            <h1 className="text-4xl font-bold mt-4">Welcome to Halteres.ai</h1>
            <p className="text-xl mt-4 mb-8 mx-auto leading-relaxed max-w-xl">
              Halteres.ai is your digital assistant for gym management and
              workout planning. Leveraging cutting-edge AI, we provide tailored
              workout routines, equipment management, and coaching resources to
              help you run your gym efficiently.
            </p>
            <div className="flex justify-center items-center mt-4">
              <button
                className="btn btn-secondary text-xl"
                onClick={() => handleGetStartedClick()}
              >
                Get Started
              </button>
            </div>
          </>
        )}
      </div>

      {showComponents && (
        <div className="ml-12">
          <div id="office" className="h-screen">
            <Office />
          </div>
          <div id="whiteboard" className="h-screen">
            <Whiteboard />
          </div>
          <div id="metcon" className="h-screen">
            <Metcon />
          </div>
        </div>
      )}

      {showComponents && (
        <nav className="fixed top-50 left-0 p-4">
          <ul className="flex flex-col space-y-2 steps steps-vertical">
            <li className="step step-primary">
              <Link href="#office" className="smooth-scroll">
                Office
              </Link>
            </li>
            <li className="step step-primary">
              <Link href="#whiteboard" className="smooth-scroll">
                Whiteboard
              </Link>
            </li>
            <li className="step step-primary">
              <Link href="#metcon" className="smooth-scroll">
                Metcon
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </main>
  );
}
