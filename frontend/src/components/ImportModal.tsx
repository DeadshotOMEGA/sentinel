import { useState, useRef } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Textarea,
  Chip,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Checkbox,
  Spinner,
  Tabs,
  Tab,
  Card,
  CardBody,
  CardHeader,
  Listbox,
  ListboxItem,
  Progress,
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { api } from '../lib/api';
import type {
  ImportPreview,
  ImportResult,
  NominalRollRow,
  ImportPreviewMember,
  Member,
  ImportError,
} from '@shared/types';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

type Step = 'upload' | 'preview' | 'result';

const importSteps = [
  {
    key: 'upload',
    icon: 'solar:upload-linear',
    title: 'Upload CSV File',
    description: 'Upload or paste your Nominal Roll CSV export from DWAN.',
  },
  {
    key: 'preview',
    icon: 'solar:eye-linear',
    title: 'Preview Changes',
    description: 'Review members to add, update, and flag for review.',
  },
  {
    key: 'result',
    icon: 'solar:check-circle-linear',
    title: 'Complete Import',
    description: 'Confirm changes and finalize the import process.',
  },
];

export default function ImportModal({
  isOpen,
  onClose,
  onImportComplete,
}: ImportModalProps) {
  const [step, setStep] = useState<Step>('upload');
  const [csvContent, setCsvContent] = useState('');
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [selectedDeactivateIds, setSelectedDeactivateIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setStep('upload');
    setCsvContent('');
    setPreview(null);
    setResult(null);
    setSelectedDeactivateIds(new Set());
    setError('');
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCsvContent(e.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  const handlePreview = async () => {
    if (!csvContent.trim()) {
      setError('Please provide CSV content to import.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await api.post<ImportPreview>('/members/import/preview', {
        csv: csvContent,
      });
      setPreview(response.data);
      setStep('preview');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string; howToFix?: string } } } };
      const errorMessage = error.response?.data?.error?.message ?? 'Failed to preview import';
      const howToFix = error.response?.data?.error?.howToFix;
      setError(howToFix ? `${errorMessage} ${howToFix}` : errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecute = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await api.post<ImportResult>('/members/import/execute', {
        csv: csvContent,
        deactivateIds: Array.from(selectedDeactivateIds),
      });
      setResult(response.data);
      setStep('result');
      onImportComplete();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string; howToFix?: string } } } };
      const errorMessage = error.response?.data?.error?.message ?? 'Failed to execute import';
      const howToFix = error.response?.data?.error?.howToFix;
      setError(howToFix ? `${errorMessage} ${howToFix}` : errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDeactivate = (id: string) => {
    const newSet = new Set(selectedDeactivateIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedDeactivateIds(newSet);
  };

  const renderUploadContent = () => (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-danger-50 p-3 text-sm text-danger">
          {error}
        </div>
      )}

      <Card>
        <CardBody className="space-y-4">
          <div>
            <h3 className="mb-2 text-lg font-semibold">Upload Nominal Roll</h3>
            <p className="text-sm text-default-500">
              Import member data from your DWAN CSV export. The system will:
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-default-500">
              <li>Add new members not currently in the database</li>
              <li>Update existing members with changed information</li>
              <li>Flag members not in the CSV for your review</li>
            </ul>
          </div>

          <div className="flex items-center gap-4 rounded-lg border-2 border-dashed border-default-200 p-6">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div className="flex flex-col items-center gap-3 w-full">
              <Icon icon="solar:upload-bold-duotone" className="text-primary" width={48} />
              <Button
                variant="bordered"
                color="primary"
                onPress={() => fileInputRef.current?.click()}
                startContent={<Icon icon="solar:folder-open-linear" width={18} />}
              >
                Choose CSV File
              </Button>
              <span className="text-sm text-default-400">or paste CSV content below</span>
            </div>
          </div>

          <Textarea
            label="CSV Content"
            placeholder="Paste CSV content here..."
            value={csvContent}
            onValueChange={setCsvContent}
            minRows={8}
            maxRows={15}
          />
        </CardBody>
      </Card>
    </div>
  );

  const renderPreviewContent = () => {
    if (!preview) return null;

    return (
      <div className="space-y-4">
        {error && (
          <div className="rounded-lg bg-danger-50 p-3 text-sm text-danger">
            {error}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card>
                <CardBody className="text-center">
                  <p className="text-2xl font-bold text-success">{preview.toAdd.length}</p>
                  <p className="text-sm text-default-500">To Add</p>
                </CardBody>
              </Card>
              <Card>
                <CardBody className="text-center">
                  <p className="text-2xl font-bold text-primary">{preview.toUpdate.length}</p>
                  <p className="text-sm text-default-500">To Update</p>
                </CardBody>
              </Card>
              <Card>
                <CardBody className="text-center">
                  <p className="text-2xl font-bold text-warning">{preview.toReview.length}</p>
                  <p className="text-sm text-default-500">For Review</p>
                </CardBody>
              </Card>
              <Card>
                <CardBody className="text-center">
                  <p className="text-2xl font-bold text-danger">{preview.errors.length}</p>
                  <p className="text-sm text-default-500">Errors</p>
                </CardBody>
              </Card>
            </div>

            {/* Tabs for details */}
            <Tabs aria-label="Import preview tabs">
              {preview.toAdd.length > 0 && (
                <Tab key="add" title={`To Add (${preview.toAdd.length})`}>
                  <div className="max-h-64 overflow-auto">
                    <Table aria-label="Members to add">
                      <TableHeader>
                        <TableColumn>SERVICE #</TableColumn>
                        <TableColumn>NAME</TableColumn>
                        <TableColumn>RANK</TableColumn>
                        <TableColumn>DEPARTMENT</TableColumn>
                        <TableColumn>TYPE</TableColumn>
                      </TableHeader>
                      <TableBody>
                        {preview.toAdd.map((row: NominalRollRow, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell>{row.serviceNumber}</TableCell>
                            <TableCell>{row.firstName} {row.lastName}</TableCell>
                            <TableCell>{row.rank}</TableCell>
                            <TableCell>{row.department}</TableCell>
                            <TableCell>
                              <Chip size="sm" variant="flat">
                                {row.details ? row.details : 'Class A'}
                              </Chip>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Tab>
              )}

              {preview.toUpdate.length > 0 && (
                <Tab key="update" title={`To Update (${preview.toUpdate.length})`}>
                  <div className="max-h-64 overflow-auto">
                    <Table aria-label="Members to update">
                      <TableHeader>
                        <TableColumn>SERVICE #</TableColumn>
                        <TableColumn>NAME</TableColumn>
                        <TableColumn>CHANGES</TableColumn>
                      </TableHeader>
                      <TableBody>
                        {preview.toUpdate.map((item: ImportPreviewMember, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell>{item.current.serviceNumber}</TableCell>
                            <TableCell>{item.current.firstName} {item.current.lastName}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {item.changes.map((change: string, i: number) => (
                                  <Chip key={i} size="sm" variant="flat" color="primary">
                                    {change}
                                  </Chip>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Tab>
              )}

              {preview.toReview.length > 0 && (
                <Tab key="review" title={`For Review (${preview.toReview.length})`}>
                  <div className="mb-2 rounded-lg bg-warning-50 p-3 text-sm text-warning-700">
                    These members exist in the database but were not found in the CSV.
                    Select members to deactivate, or leave unchecked to keep them active.
                  </div>
                  <div className="max-h-64 overflow-auto">
                    <Table aria-label="Members for review">
                      <TableHeader>
                        <TableColumn width={50}>DEACTIVATE</TableColumn>
                        <TableColumn>SERVICE #</TableColumn>
                        <TableColumn>NAME</TableColumn>
                        <TableColumn>RANK</TableColumn>
                        <TableColumn>STATUS</TableColumn>
                      </TableHeader>
                      <TableBody>
                        {preview.toReview.map((member: Member) => (
                          <TableRow key={member.id}>
                            <TableCell>
                              <Checkbox
                                isSelected={selectedDeactivateIds.has(member.id)}
                                onValueChange={() => toggleDeactivate(member.id)}
                              />
                            </TableCell>
                            <TableCell>{member.serviceNumber}</TableCell>
                            <TableCell>{member.firstName} {member.lastName}</TableCell>
                            <TableCell>{member.rank}</TableCell>
                            <TableCell>
                              <Chip
                                size="sm"
                                color={member.status === 'active' ? 'success' : 'default'}
                              >
                                {member.status}
                              </Chip>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Tab>
              )}

              {preview.errors.length > 0 && (
                <Tab key="errors" title={`Errors (${preview.errors.length})`}>
                  <div className="max-h-64 overflow-auto">
                    <Table aria-label="Import errors">
                      <TableHeader>
                        <TableColumn>ROW</TableColumn>
                        <TableColumn>FIELD</TableColumn>
                        <TableColumn>ERROR</TableColumn>
                      </TableHeader>
                      <TableBody>
                        {preview.errors.map((err: ImportError, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell>{err.row}</TableCell>
                            <TableCell>{err.field ?? '—'}</TableCell>
                            <TableCell>{err.message}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Tab>
              )}
            </Tabs>
      </div>
    );
  };

  const renderResultContent = () => {
    if (!result) return null;

    return (
      <div className="space-y-6">
        <Card className="border-success-200 bg-success-50">
          <CardBody className="flex flex-col items-center gap-4 py-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success">
              <Icon icon="solar:check-circle-bold" className="text-white" width={40} />
            </div>
            <h3 className="text-xl font-semibold text-success-700">Import Complete!</h3>
          </CardBody>
        </Card>

        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardBody className="text-center">
              <Icon icon="solar:user-plus-bold-duotone" className="mx-auto mb-2 text-success" width={32} />
              <p className="text-3xl font-bold text-success">{result.added}</p>
              <p className="text-sm text-default-500">Members Added</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center">
              <Icon icon="solar:refresh-bold-duotone" className="mx-auto mb-2 text-primary" width={32} />
              <p className="text-3xl font-bold text-primary">{result.updated}</p>
              <p className="text-sm text-default-500">Members Updated</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center">
              <Icon icon="solar:user-minus-bold-duotone" className="mx-auto mb-2 text-warning" width={32} />
              <p className="text-3xl font-bold text-warning">{result.flaggedForReview}</p>
              <p className="text-sm text-default-500">Deactivated</p>
            </CardBody>
          </Card>
        </div>

        {result.errors.length > 0 && (
          <Card className="border-danger-200 bg-danger-50">
            <CardBody>
              <div className="flex items-center gap-2">
                <Icon icon="solar:danger-triangle-bold" className="text-danger" width={20} />
                <span className="text-sm font-medium text-danger">
                  {result.errors.length} error(s) occurred during import
                </span>
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    );
  };

  const getStepIndex = (s: Step) => importSteps.findIndex((item) => item.key === s);
  const currentStepIndex = getStepIndex(step);
  const progressValue = step === 'result' && result ? 100 : ((currentStepIndex + 1) / importSteps.length) * 100;

  const renderStepChecklist = () => (
    <Card className="min-w-[280px] py-1 md:py-4">
      <CardHeader className="flex items-center gap-3 px-5 pt-3 pb-0 md:px-6 md:pt-5">
        <div className="from-secondary-300 to-primary-500 flex h-12 w-12 flex-none items-center justify-center rounded-full bg-gradient-to-br">
          <Icon className="text-white" icon="solar:database-linear" width={24} />
        </div>
        <Progress
          showValueLabel
          classNames={{
            label: 'font-medium',
            indicator: 'bg-gradient-to-r from-primary-400 to-secondary-500',
            value: 'text-foreground/60',
          }}
          label="Import Progress"
          value={progressValue}
        />
      </CardHeader>
      <CardBody className="px-2 pt-3 sm:px-3 md:px-4">
        <Listbox
          hideSelectedIcon
          aria-label="Import steps"
          items={importSteps}
          variant="flat"
          disabledKeys={importSteps.filter((_, idx) => idx > currentStepIndex).map((item) => item.key)}
        >
          {(item) => {
            const itemIndex = getStepIndex(item.key as Step);
            const isCompleted = itemIndex < currentStepIndex || (step === 'result' && result);
            const isCurrent = item.key === step;

            return (
              <ListboxItem
                key={item.key}
                classNames={{
                  base: 'w-full px-2 md:px-4 min-h-[60px] gap-3',
                  title: `text-medium font-medium ${isCurrent ? 'text-primary' : ''}`,
                  description: 'text-small text-wrap',
                }}
                description={<p className="text-default-500">{item.description}</p>}
                endContent={
                  <div className="flex flex-none">
                    {isCompleted ? (
                      <Icon className="text-success" icon="solar:check-circle-bold" width={24} />
                    ) : isCurrent ? (
                      <Icon className="text-primary" icon="solar:arrow-right-bold" width={24} />
                    ) : (
                      <Icon className="text-default-300" icon="solar:circle-linear" width={24} />
                    )}
                  </div>
                }
                startContent={
                  <div className={`flex items-center justify-center rounded-medium border p-2 ${isCurrent ? 'border-primary bg-primary-50' : 'border-divider'}`}>
                    <Icon className={isCurrent ? 'text-primary' : 'text-secondary'} icon={item.icon} width={20} />
                  </div>
                }
                title={item.title}
              />
            );
          }}
        </Listbox>
      </CardBody>
    </Card>
  );

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="5xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader>Import Nominal Roll</ModalHeader>

        <ModalBody>
          <div className="flex gap-6">
            {/* Step Checklist Sidebar */}
            <div className="hidden md:block">
              {renderStepChecklist()}
            </div>

            {/* Main Content */}
            <div className="flex-1">
              {isLoading && step === 'upload' ? (
                <div className="flex justify-center py-12">
                  <Spinner size="lg" />
                </div>
              ) : (
                <>
                  {step === 'upload' && renderUploadContent()}
                  {step === 'preview' && renderPreviewContent()}
                  {step === 'result' && renderResultContent()}
                </>
              )}
            </div>
          </div>
        </ModalBody>

        {step === 'upload' && (
          <ModalFooter>
            <Button variant="light" onPress={handleClose}>
              Cancel
            </Button>
            <Button
              color="primary"
              onPress={handlePreview}
              isLoading={isLoading}
              isDisabled={!csvContent.trim()}
            >
              Preview Changes
            </Button>
          </ModalFooter>
        )}

        {step === 'preview' && preview && (
          <ModalFooter>
            <Button variant="light" onPress={() => setStep('upload')}>
              Back
            </Button>
            <Button
              color="primary"
              onPress={handleExecute}
              isLoading={isLoading}
              isDisabled={preview.errors.length > 0 || (preview.toAdd.length === 0 && preview.toUpdate.length === 0)}
            >
              {preview.errors.length > 0
                ? 'Fix Errors to Continue'
                : `Import ${preview.toAdd.length + preview.toUpdate.length} Members`}
            </Button>
          </ModalFooter>
        )}

        {step === 'result' && (
          <ModalFooter>
            <Button color="primary" onPress={handleClose}>
              Done
            </Button>
          </ModalFooter>
        )}
      </ModalContent>
    </Modal>
  );
}
