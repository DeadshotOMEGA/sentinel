import TopBar from './TopBar';

interface PageWrapperProps {
  title: string;
  children: React.ReactNode;
}

export default function PageWrapper({ title, children }: PageWrapperProps) {
  return (
    <>
      <TopBar title={title} />
      <div className="flex-1 overflow-auto p-6" role="region" aria-labelledby="page-title">
        {children}
      </div>
    </>
  );
}
