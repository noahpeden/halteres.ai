import { redirect } from 'next/navigation';
import { metadata as simple } from '../simple-metadata';

export const generateMetadata = () => ({
  ...simple,
  title: 'About | HalteresAI',
  description:
    'Halteres helps athletes build bespoke, professional training programs and log workouts.',
});

export default function CompanyPage() {
  redirect('/');
}
