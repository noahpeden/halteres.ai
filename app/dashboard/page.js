'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function Programs() {
  const { user, supabase } = useAuth();
  const [programs, setPrograms] = useState([]);
  const [programName, setProgramName] = useState('');
  const [gym, setGym] = useState('');
  const [whiteboard, setWhiteboard] = useState('');
  const [gyms, setGyms] = useState([]);
  const [whiteboards, setWhiteboards] = useState([]);

  async function fetchPrograms() {
    let { data, error } = await supabase.from('programs').select('*');
    setPrograms(data);
  }

  async function fetchGyms() {
    let { data, error } = await supabase.from('gyms').select('*');
    console.log('gyms', data);
    setGyms(data);
  }

  async function fetchWhiteboards() {
    let { data, error } = await supabase.from('whiteboards').select('*');
    setWhiteboards(data);
  }

  useEffect(() => {
    fetchWhiteboards();
    fetchGyms();
    fetchPrograms();
  }, []);

  async function createEntity(event, entityName) {
    event.preventDefault();
    if (user) {
      const { data, error } = await supabase
        .from(entityName)
        .insert([{ name: programName, user_id: user.id }]);
      console.log({ data, error });
    }
  }

  return (
    <div className="container mx-auto p-4">
      <div className="text-center my-4">
        <Link href="/create-program">
          <button className="btn btn-primary px-8 py-3 text-lg font-bold">
            Create brand new programming
          </button>
        </Link>
      </div>
      <div>
        <h1>Programs</h1>
        <form onSubmit={(e) => createEntity(e, 'programs')} className="mb-8">
          <input
            type="text"
            placeholder="Type here"
            className="input input-bordered w-full max-w-xs"
            name="name"
            value={programName}
            onChange={(e) => setProgramName(e.target.value)}
          />
          <button className="btn btn-primary mt-4" type="submit">
            Create Program
          </button>
        </form>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {programs.map((program) => (
            <a
              as={Link}
              href={`/programs/${program.program_id}`}
              key={program.program_id}
              className="card bordered shadow-lg cursor-pointer hover:shadow-xl transition-all duration-300 ease-in-out"
            >
              <div className="card-body">{program.name}</div>
            </a>
          ))}
        </div>
      </div>
      <div>
        <h1>Gyms</h1>
        <Link href="/create-gym">
          <button className="btn btn-primary mt-4" type="button">
            Create Gym
          </button>
        </Link>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {gyms?.map((gym) => (
            <a
              as={Link}
              href={`/gyms/${gym.gym_id}`}
              key={gym.gym_id}
              className="card bordered shadow-lg cursor-pointer hover:shadow-xl transition-all duration-300 ease-in-out"
            >
              <div className="card-body">{gym.name}</div>
            </a>
          ))}
        </div>
      </div>
      <div>
        <h1>Whiteboards</h1>
        <Link href="/create-whiteboard">
          <button className="btn btn-primary mt-4" type="button">
            Create Program
          </button>
        </Link>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {whiteboards?.map((program) => (
            <a
              as={Link}
              href={`/whiteboards/${program.program_id}`}
              key={program.program_id}
              className="card bordered shadow-lg cursor-pointer hover:shadow-xl transition-all duration-300 ease-in-out"
            >
              <div className="card-body">{program.name}</div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
