export default function ProgramWizardLayout({ children }) {
  return (
    <div className="min-h-screen bg-base-100">
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto">{children}</div>
      </div>
    </div>
  );
}
