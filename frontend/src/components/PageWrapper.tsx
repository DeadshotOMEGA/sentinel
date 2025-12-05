interface PageWrapperProps {
  title: string;
  children: React.ReactNode;
  /** Optional action buttons to display next to the title */
  actions?: React.ReactNode;
}

export default function PageWrapper({ title, children, actions }: PageWrapperProps) {
  return (
    <div className="flex flex-1 flex-col p-6">
      <div className="mb-6 flex shrink-0 items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
