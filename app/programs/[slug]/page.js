'use client';
import Metcon from '@/components/Metcon';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function Program() {
  const { user, supabase } = useAuth();
  const [gyms, setGyms] = useState([]);
  const [whiteboards, setWhiteboards] = useState([]);
  async function fetchGyms() {
    let { data, error } = await supabase.from('gyms').select('*');
    setGyms(data);
  }

  async function fetchWhiteboards() {
    let { data, error } = await supabase.from('whiteboards').select('*');
    setWhiteboards(data);
  }

  const fetchOfficeInfo = async () => {
    const response = await fetch('/api/office');
    const data = await response.json();
    console.log(data);
  };

  const fetchWhiteboardInfo = async () => {
    const response = await fetch('/api/whiteboard');
    const data = await response.json();
    console.log(data);
  };

  useEffect(() => {
    fetchOfficeInfo();
    fetchWhiteboardInfo();
  }, []);
  return (
    <div>
      <div>
        <h2>Which gym would you like to generate workout programming for?</h2>
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
        <h2>
          Which workout details would you like to influence the workout
          programming with?
        </h2>
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
      <Metcon />
    </div>
  );
}
