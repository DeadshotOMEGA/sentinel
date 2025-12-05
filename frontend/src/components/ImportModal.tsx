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
  Select,
  SelectItem,
  Tooltip,
  Input,
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
  ImportColumnMapping,
  CsvHeadersResult,
  ImportTemplateField,
  DivisionDetectionResult,
  ImportDivisionMapping,
  Division,
} from '@shared/types';
import { IMPORT_FIELD_META, REQUIRED_IMPORT_FIELDS } from '@shared/types';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

type Step = 'upload' | 'mapping' | 'divisions' | 'preview' | 'result';

const importSteps = [
  {
    key: 'upload',
    icon: 'solar:upload-linear',
    title: 'Upload CSV File',
    description: 'Upload or paste your Nominal Roll CSV export from DWAN.',
  },
  {
    key: 'mapping',
    icon: 'solar:widget-2-linear',
    title: 'Map Columns',
    description: 'Match CSV columns to member fields.',
  },
  {
    key: 'divisions',
    icon: 'solar:buildings-2-linear',
    title: 'Map Divisions',
    description: 'Match or create divisions for department values.',
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
  const [csvHeaders, setCsvHeaders] = useState<CsvHeadersResult | null>(null);
  const [columnMapping, setColumnMapping] = useState<ImportColumnMapping>({} as ImportColumnMapping);
  const [sampleIndex, setSampleIndex] = useState(0);
  const [divisionDetection, setDivisionDetection] = useState<DivisionDetectionResult | null>(null);
  const [divisionMapping, setDivisionMapping] = useState<ImportDivisionMapping>({});
  const [creatingDivisionFor, setCreatingDivisionFor] = useState<string | null>(null);
  const [newDivisionName, setNewDivisionName] = useState('');
  const [newDivisionCode, setNewDivisionCode] = useState('');
  const [isCreatingDivision, setIsCreatingDivision] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [selectedDeactivateIds, setSelectedDeactivateIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setStep('upload');
    setCsvContent('');
    setCsvHeaders(null);
    setColumnMapping({} as ImportColumnMapping);
    setSampleIndex(0);
    setDivisionDetection(null);
    setDivisionMapping({});
    setCreatingDivisionFor(null);
    setNewDivisionName('');
    setNewDivisionCode('');
    setIsCreatingDivision(false);
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

  const handleParseHeaders = async () => {
    if (!csvContent.trim()) {
      setError('Please provide CSV content to import.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await api.post<CsvHeadersResult>('/members/import/headers', {
        csv: csvContent,
      });
      setCsvHeaders(response.data);
      setColumnMapping(response.data.suggestedMapping as ImportColumnMapping);
      setStep('mapping');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string; howToFix?: string } } } };
      const errorMessage = error.response?.data?.error?.message;
      const howToFix = error.response?.data?.error?.howToFix;
      if (!errorMessage) {
        throw new Error('Failed to parse CSV headers');
      }
      setError(howToFix ? `${errorMessage} ${howToFix}` : errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDetectDivisions = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await api.post<DivisionDetectionResult>('/members/import/divisions', {
        csv: csvContent,
        columnMapping,
      });
      setDivisionDetection(response.data);

      // Pre-populate divisionMapping with auto-matched divisions
      const autoMapping: ImportDivisionMapping = {};
      for (const detected of response.data.detected) {
        if (detected.existingDivisionId) {
          autoMapping[detected.csvValue] = detected.existingDivisionId;
        }
      }
      setDivisionMapping(autoMapping);

      setStep('divisions');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string; howToFix?: string } } } };
      const errorMessage = error.response?.data?.error?.message;
      const howToFix = error.response?.data?.error?.howToFix;
      if (!errorMessage) {
        throw new Error('Failed to detect divisions');
      }
      setError(howToFix ? `${errorMessage} ${howToFix}` : errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDivision = async (csvValue: string) => {
    if (!newDivisionName.trim() || !newDivisionCode.trim()) {
      setError('Division name and code are required.');
      return;
    }

    setIsCreatingDivision(true);
    setError('');

    try {
      const response = await api.post<{ division: Division }>('/divisions', {
        name: newDivisionName.trim(),
        code: newDivisionCode.trim().toUpperCase(),
      });

      const newDivision = response.data.division;

      // Add to existing divisions list
      if (divisionDetection) {
        setDivisionDetection({
          ...divisionDetection,
          existingDivisions: [...divisionDetection.existingDivisions, newDivision],
        });
      }

      // Auto-select the new division for this CSV value
      setDivisionMapping({
        ...divisionMapping,
        [csvValue]: newDivision.id,
      });

      // Reset form
      setCreatingDivisionFor(null);
      setNewDivisionName('');
      setNewDivisionCode('');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string; howToFix?: string } } } };
      const errorMessage = error.response?.data?.error?.message;
      const howToFix = error.response?.data?.error?.howToFix;
      if (!errorMessage) {
        throw new Error('Failed to create division');
      }
      setError(howToFix ? `${errorMessage} ${howToFix}` : errorMessage);
    } finally {
      setIsCreatingDivision(false);
    }
  };

  const startCreatingDivision = (csvValue: string) => {
    setCreatingDivisionFor(csvValue);
    // Pre-fill code with the CSV value (uppercase)
    setNewDivisionCode(csvValue.toUpperCase());
    // Suggest a name based on the code
    setNewDivisionName(csvValue);
    setError('');
  };

  const cancelCreatingDivision = () => {
    setCreatingDivisionFor(null);
    setNewDivisionName('');
    setNewDivisionCode('');
  };

  const handlePreview = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await api.post<ImportPreview>('/members/import/preview', {
        csv: csvContent,
        columnMapping,
        divisionMapping,
      });
      setPreview(response.data);
      setStep('preview');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string; howToFix?: string } } } };
      const errorMessage = error.response?.data?.error?.message;
      const howToFix = error.response?.data?.error?.howToFix;
      if (!errorMessage) {
        throw new Error('Failed to preview import');
      }
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
        columnMapping,
        divisionMapping,
        deactivateIds: Array.from(selectedDeactivateIds),
      });
      setResult(response.data);
      setStep('result');
      onImportComplete();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string; howToFix?: string } } } };
      const errorMessage = error.response?.data?.error?.message;
      const howToFix = error.response?.data?.error?.howToFix;
      if (!errorMessage) {
        throw new Error('Failed to execute import');
      }
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

  const renderMappingContent = () => {
    if (!csvHeaders) return null;

    const unmappedRequired = REQUIRED_IMPORT_FIELDS.filter(
      (field) => !columnMapping[field]
    );
    const hasValidationErrors = unmappedRequired.length > 0;
    const sampleCount = csvHeaders.sampleRows.length;
    const currentSample = csvHeaders.sampleRows[sampleIndex] ?? {};

    const getSampleValue = (field: ImportTemplateField): string => {
      const csvColumn = columnMapping[field];
      if (!csvColumn || !sampleCount) return '—';
      const sampleValue = currentSample[csvColumn];
      if (!sampleValue) return '—';
      return sampleValue;
    };

    const handlePrevSample = () => {
      setSampleIndex((prev) => (prev === 0 ? sampleCount - 1 : prev - 1));
    };

    const handleNextSample = () => {
      setSampleIndex((prev) => (prev === sampleCount - 1 ? 0 : prev + 1));
    };

    return (
      <div className="w-full space-y-4">
        {error && (
          <div className="rounded-lg bg-danger-50 p-3 text-sm text-danger">
            {error}
          </div>
        )}

        {hasValidationErrors && (
          <div className="rounded-lg bg-danger-50 p-3 text-sm text-danger">
            Please map all required fields: {unmappedRequired.map(f => IMPORT_FIELD_META.find(m => m.field === f)?.label).join(', ')}
          </div>
        )}

        <Card className="w-full">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Map CSV Columns to Member Fields</h3>
              <p className="text-sm text-default-500">
                Match your CSV column headers to the corresponding member fields.
              </p>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            <div className="max-h-[400px] overflow-auto">
              <Table aria-label="Column mapping" className="w-full">
                <TableHeader>
                  <TableColumn>MEMBER FIELD</TableColumn>
                  <TableColumn>CSV COLUMN</TableColumn>
                  <TableColumn>
                    <div className="flex items-center gap-2">
                      <span>SAMPLE DATA</span>
                      {sampleCount > 1 && (
                        <div className="flex items-center gap-1">
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            onPress={handlePrevSample}
                            aria-label="Previous sample"
                            className="min-w-6 h-6 w-6"
                          >
                            <Icon icon="solar:alt-arrow-left-linear" width={14} />
                          </Button>
                          <span className="text-xs text-default-400 min-w-[40px] text-center">
                            {sampleIndex + 1} / {sampleCount}
                          </span>
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            onPress={handleNextSample}
                            aria-label="Next sample"
                            className="min-w-6 h-6 w-6"
                          >
                            <Icon icon="solar:alt-arrow-right-linear" width={14} />
                          </Button>
                        </div>
                      )}
                    </div>
                  </TableColumn>
                </TableHeader>
                <TableBody>
                  {IMPORT_FIELD_META.map((fieldMeta) => (
                    <TableRow key={fieldMeta.field}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{fieldMeta.label}</span>
                          {fieldMeta.required && (
                            <Chip size="sm" color="danger" variant="flat">
                              Required
                            </Chip>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          aria-label={`Map ${fieldMeta.label}`}
                          selectedKeys={columnMapping[fieldMeta.field] ? [columnMapping[fieldMeta.field] as string] : ['__NOT_MAPPED__']}
                          onSelectionChange={(keys) => {
                            const selectedKey = Array.from(keys)[0] as string;
                            setColumnMapping({
                              ...columnMapping,
                              [fieldMeta.field]: selectedKey === '__NOT_MAPPED__' ? null : selectedKey,
                            });
                          }}
                          className="min-w-[200px]"
                        >
                          {[
                            <SelectItem key="__NOT_MAPPED__">Not mapped</SelectItem>,
                            ...csvHeaders.headers.map((header) => (
                              <SelectItem key={header}>{header}</SelectItem>
                            )),
                          ]}
                        </Select>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-default-500">
                          {getSampleValue(fieldMeta.field)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  };

  const renderDivisionsContent = () => {
    if (!divisionDetection) return null;

    const { detected, existingDivisions } = divisionDetection;
    const unmappedDivisions = detected.filter(d => !divisionMapping[d.csvValue]);
    const hasUnmappedDivisions = unmappedDivisions.length > 0;

    return (
      <div className="space-y-4">
        {error && (
          <div className="rounded-lg bg-danger-50 p-3 text-sm text-danger">
            {error}
          </div>
        )}

        {hasUnmappedDivisions && (
          <div className="rounded-lg bg-warning-50 p-3 text-sm text-warning-700">
            <Icon icon="solar:danger-triangle-linear" className="inline mr-2" width={16} />
            {unmappedDivisions.length} division(s) need to be mapped before proceeding.
          </div>
        )}

        <Card>
          <CardHeader>
            <div>
              <h3 className="text-lg font-semibold">Map Divisions</h3>
              <p className="text-sm text-default-500">
                Match each department value from the CSV to an existing division, or create new ones.
              </p>
            </div>
          </CardHeader>
          <CardBody>
            <div className="max-h-72 overflow-auto">
              <Table aria-label="Division mapping">
                <TableHeader>
                  <TableColumn>CSV VALUE</TableColumn>
                  <TableColumn>MEMBERS</TableColumn>
                  <TableColumn>MAP TO DIVISION</TableColumn>
                  <TableColumn>STATUS</TableColumn>
                </TableHeader>
                <TableBody>
                  {detected.map((div) => {
                    const isMapped = !!divisionMapping[div.csvValue];

                    return (
                      <TableRow key={div.csvValue}>
                        <TableCell>
                          <span className="font-medium">{div.csvValue}</span>
                        </TableCell>
                        <TableCell>
                          <Chip size="sm" variant="flat">{div.memberCount}</Chip>
                        </TableCell>
                        <TableCell>
                          {creatingDivisionFor === div.csvValue ? (
                            <div className="flex items-center gap-2">
                              <Tooltip content="Full division name (e.g., 'Operations')">
                                <Input
                                  size="sm"
                                  placeholder="Name"
                                  value={newDivisionName}
                                  onValueChange={setNewDivisionName}
                                  className="w-32"
                                  isDisabled={isCreatingDivision}
                                />
                              </Tooltip>
                              <Tooltip content="Short code (e.g., 'OPS')">
                                <Input
                                  size="sm"
                                  placeholder="Code"
                                  value={newDivisionCode}
                                  onValueChange={(v) => setNewDivisionCode(v.toUpperCase())}
                                  className="w-20"
                                  isDisabled={isCreatingDivision}
                                />
                              </Tooltip>
                              <Tooltip content="Save new division">
                                <Button
                                  size="sm"
                                  color="success"
                                  variant="flat"
                                  isIconOnly
                                  onPress={() => handleCreateDivision(div.csvValue)}
                                  isLoading={isCreatingDivision}
                                  aria-label="Save division"
                                >
                                  <Icon icon="solar:check-circle-bold" width={16} />
                                </Button>
                              </Tooltip>
                              <Tooltip content="Cancel">
                                <Button
                                  size="sm"
                                  color="danger"
                                  variant="light"
                                  isIconOnly
                                  onPress={cancelCreatingDivision}
                                  isDisabled={isCreatingDivision}
                                  aria-label="Cancel"
                                >
                                  <Icon icon="solar:close-circle-bold" width={16} />
                                </Button>
                              </Tooltip>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Select
                                aria-label={`Map ${div.csvValue}`}
                                selectedKeys={divisionMapping[div.csvValue] ? new Set([divisionMapping[div.csvValue]]) : new Set()}
                                onSelectionChange={(keys) => {
                                  const selectedKey = Array.from(keys)[0] as string;
                                  if (selectedKey) {
                                    setDivisionMapping({
                                      ...divisionMapping,
                                      [div.csvValue]: selectedKey,
                                    });
                                  } else {
                                    const newMapping = { ...divisionMapping };
                                    delete newMapping[div.csvValue];
                                    setDivisionMapping(newMapping);
                                  }
                                }}
                                placeholder="Select division..."
                                className="min-w-[180px]"
                                size="sm"
                              >
                                {existingDivisions.map((division) => (
                                  <SelectItem key={division.id} textValue={`${division.name} (${division.code})`}>
                                    {division.name} ({division.code})
                                  </SelectItem>
                                ))}
                              </Select>
                              <Tooltip content="Create new division">
                                <Button
                                  size="sm"
                                  variant="flat"
                                  color="primary"
                                  isIconOnly
                                  onPress={() => startCreatingDivision(div.csvValue)}
                                  aria-label="Create new division"
                                >
                                  <Icon icon="solar:add-circle-linear" width={16} />
                                </Button>
                              </Tooltip>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {isMapped ? (
                            <Chip size="sm" color="success" variant="flat" startContent={<Icon icon="solar:check-circle-linear" width={14} />}>
                              {div.existingDivisionId === divisionMapping[div.csvValue] ? 'Auto-matched' : 'Mapped'}
                            </Chip>
                          ) : creatingDivisionFor === div.csvValue ? (
                            <Chip size="sm" color="primary" variant="flat" startContent={<Icon icon="solar:pen-linear" width={14} />}>
                              Creating...
                            </Chip>
                          ) : (
                            <Chip size="sm" color="warning" variant="flat" startContent={<Icon icon="solar:danger-triangle-linear" width={14} />}>
                              Unmapped
                            </Chip>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {existingDivisions.length === 0 && (
              <div className="mt-4 rounded-lg bg-default-100 p-4 text-center">
                <Icon icon="solar:buildings-2-linear" className="text-default-400 mb-2" width={32} />
                <p className="text-sm text-default-600">
                  No divisions exist yet. Create divisions in Settings before importing.
                </p>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    );
  };

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
              <Tooltip content="New members from CSV that will be added to the database">
                <Card>
                  <CardBody className="text-center">
                    <p className="text-2xl font-bold text-success">{preview.toAdd.length}</p>
                    <p className="text-sm text-default-500">To Add</p>
                  </CardBody>
                </Card>
              </Tooltip>
              <Tooltip content="Existing members with changed data that will be updated">
                <Card>
                  <CardBody className="text-center">
                    <p className="text-2xl font-bold text-primary">{preview.toUpdate.length}</p>
                    <p className="text-sm text-default-500">To Update</p>
                  </CardBody>
                </Card>
              </Tooltip>
              <Tooltip content="Members in database but not in CSV - may need deactivation">
                <Card>
                  <CardBody className="text-center">
                    <p className="text-2xl font-bold text-warning">{preview.toReview.length}</p>
                    <p className="text-sm text-default-500">For Review</p>
                  </CardBody>
                </Card>
              </Tooltip>
              <Tooltip content="Rows with validation errors that must be fixed before import">
                <Card>
                  <CardBody className="text-center">
                    <p className="text-2xl font-bold text-danger">{preview.errors.length}</p>
                    <p className="text-sm text-default-500">Errors</p>
                  </CardBody>
                </Card>
              </Tooltip>
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
          key={step}
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

            // Determine styling based on state
            const getTitleClass = () => {
              if (isCurrent) return 'text-primary';
              if (isCompleted) return 'text-success';
              return '';
            };

            const getIconBoxClass = () => {
              if (isCurrent) return 'border-primary bg-primary-50';
              if (isCompleted) return 'border-success bg-success-50';
              return 'border-divider';
            };

            const getIconClass = () => {
              if (isCurrent) return 'text-primary';
              if (isCompleted) return 'text-success';
              return 'text-secondary';
            };

            return (
              <ListboxItem
                key={item.key}
                classNames={{
                  base: 'w-full px-2 md:px-4 min-h-[60px] gap-3',
                  title: `text-medium font-medium ${getTitleClass()}`,
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
                  <div className={`flex items-center justify-center rounded-medium border p-2 ${getIconBoxClass()}`}>
                    <Icon className={getIconClass()} icon={item.icon} width={20} />
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
              {isLoading && (step === 'upload' || step === 'mapping' || step === 'divisions') ? (
                <div className="flex justify-center py-12">
                  <Spinner size="lg" />
                </div>
              ) : (
                <>
                  {step === 'upload' && renderUploadContent()}
                  {step === 'mapping' && renderMappingContent()}
                  {step === 'divisions' && renderDivisionsContent()}
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
            <Tooltip content="Parse CSV headers and proceed to column mapping">
              <Button
                color="primary"
                onPress={handleParseHeaders}
                isLoading={isLoading}
                isDisabled={!csvContent.trim()}
              >
                Continue to Mapping
              </Button>
            </Tooltip>
          </ModalFooter>
        )}

        {step === 'mapping' && csvHeaders && (
          <ModalFooter>
            <Button variant="light" onPress={() => setStep('upload')}>
              Back
            </Button>
            <Tooltip content="Detect and map divisions from CSV">
              <Button
                color="primary"
                onPress={handleDetectDivisions}
                isLoading={isLoading}
                isDisabled={REQUIRED_IMPORT_FIELDS.some((field) => !columnMapping[field])}
              >
                Continue to Divisions
              </Button>
            </Tooltip>
          </ModalFooter>
        )}

        {step === 'divisions' && divisionDetection && (
          <ModalFooter>
            <Button variant="light" onPress={() => setStep('mapping')}>
              Back
            </Button>
            <Tooltip content={
              divisionDetection.detected.some(d => !divisionMapping[d.csvValue])
                ? 'Map all divisions before proceeding'
                : 'Preview changes before importing'
            }>
              <Button
                color="primary"
                onPress={handlePreview}
                isLoading={isLoading}
                isDisabled={divisionDetection.detected.some(d => !divisionMapping[d.csvValue])}
              >
                Continue to Preview
              </Button>
            </Tooltip>
          </ModalFooter>
        )}

        {step === 'preview' && preview && (
          <ModalFooter>
            <Button variant="light" onPress={() => setStep('divisions')}>
              Back
            </Button>
            <Tooltip content={
              preview.errors.length > 0
                ? 'Fix validation errors in CSV before importing'
                : `Add ${preview.toAdd.length} and update ${preview.toUpdate.length} members`
            }>
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
            </Tooltip>
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
