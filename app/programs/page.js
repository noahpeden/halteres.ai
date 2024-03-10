'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function Programs() {
  const { user, supabase } = useAuth();
  const [programs, setPrograms] = useState([]);
  const [programName, setProgramName] = useState('');

  async function fetchPrograms() {
    let { data, error } = await supabase.from('programs').select('*');
    setPrograms(data);
  }

  useEffect(() => {
    fetchPrograms();
  }, []);

  async function createProgram(event) {
    event.preventDefault();
    if (user) {
      const { data, error } = await supabase
        .from('programs')
        .insert([{ name: programName, user_id: user.id }]);
      console.log({ data, error });
    }

    setProgramName(''); // Clear the input field after creating a program
  }

  return (
    <div>
      <h1>Programs</h1>
      <form onSubmit={(e) => createProgram(e)} className="mb-8">
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
  );
}
