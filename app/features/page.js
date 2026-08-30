import { redirect } from 'next/navigation';
import { metadata as simple } from '../simple-metadata';

export const generateMetadata = () => ({
  ...simple,
  title: 'Features | HalteresAI',
  description:
    'Create a bespoke, professional training program that respects your equipment, influences, and schedule.',
});

export default function FeaturesPage() {
  redirect('/');
}
