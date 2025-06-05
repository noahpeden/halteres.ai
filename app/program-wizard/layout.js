import { ProgramWizardProvider } from '../contexts/ProgramWizardContext';

export default function ProgramWizardLayout({ children }) {
  return (
    <ProgramWizardProvider>
      <div className="min-h-screen bg-base-100">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            {children}
          </div>
        </div>
      </div>
    </ProgramWizardProvider>
  );
}