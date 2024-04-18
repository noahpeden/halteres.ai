'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Programs() {
  const router = useRouter();
  const { user, supabase } = useAuth();
  const [programs, setPrograms] = useState([]);
  const [programName, setProgramName] = useState('');

  useEffect(() => {
    async function fetchPrograms() {
      let { data } = await supabase.from('programs').select('*');
      setPrograms(data);
    }
    fetchPrograms();
  }, [supabase]);

  async function createEntity(event, entityName) {
    event.preventDefault();
    if (user) {
      const { data, error } = await supabase
        .from(entityName)
        .insert([{ name: programName, user_id: user.id }]);
      if (error) {
        return console.error(error);
      }
      console.log(data);
      router.push('/program' + data[0].program_id);
    }
  }

  return (
    <div className="container mx-auto p-4">
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
              href={`/program/${program.program_id}`}
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
