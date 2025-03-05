'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Card from '../components/ui/Card';

// Add interface for Entity type
/**
 * @typedef {Object} Entity
 * @property {string} id
 * @property {string} user_id
 * @property {string} name
 * @property {string} description
 * @property {string} created_at
 * @property {string} updated_at
 * @property {'CLASS' | 'CLIENT'} type
 * @property {number|null} bench_1rm
 * @property {number|null} deadlift_1rm
 * @property {number|null} squat_1rm
 * @property {number|null} mile_time
 * @property {string|null} gender
 * @property {number|null} height_cm
 * @property {number|null} weight_kg
 */

export default function Dashboard() {
  const router = useRouter();
  const { user, supabase } = useAuth();
  const [entities, setEntities] = useState([]);
  const [loading, setLoading] = useState(false);

  async function fetchEntities() {
    setLoading(true);
    const { data, error } = await supabase.from('entities').select('*');

    if (error) {
      console.error('Error fetching entities:', error);
    } else {
      setEntities(data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchEntities();
  }, [supabase, user?.id]);

  async function deleteEntity(id) {
    try {
      setLoading(true);
      const { error } = await supabase.from('entities').delete().eq('id', id);

      if (error) {
        console.error('Error deleting entity:', error);
      } else {
        await fetchEntities(); // Refresh the entities list
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  // Filter entities by type
  const classes = entities.filter((entity) => entity.type === 'CLASS');
  const clients = entities.filter((entity) => entity.type === 'CLIENT');

  return (
    <div className="container mx-auto p-4">
      <div>
        <h1 className="text-2xl font-bold mb-4">Entities</h1>

        {loading && !entities.length ? (
          <div className="flex justify-center items-center py-8">
            <p className="text-gray-500">Loading entities...</p>
          </div>
        ) : (
          <div>
            {classes.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold mb-4">Classes</h2>
                <div>
                  {classes.map((entity) => (
                    <Card
                      key={entity.id}
                      type="entity"
                      item={entity}
                      onDelete={deleteEntity}
                    />
                  ))}
                </div>
              </div>
            )}

            {clients.length > 0 && (
              <div>
                <h2 className="text-xl font-bold mb-4">Clients</h2>
                <div>
                  {clients.map((entity) => (
                    <Card
                      key={entity.id}
                      type="entity"
                      item={entity}
                      onDelete={deleteEntity}
                    />
                  ))}
                </div>
              </div>
            )}

            {!loading && entities.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">
                  No entities found. Create your first entity!
                </p>
              </div>
            )}
          </div>
        )}

        <div className="mt-8">
          <button
            className="btn btn-primary"
            onClick={() => router.push('/entities/new')}
            disabled={loading}
          >
            Create a New Entity
          </button>
        </div>
      </div>
    </div>
  );
}
