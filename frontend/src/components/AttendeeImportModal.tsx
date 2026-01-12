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
  Spinner,
  Card,
  CardBody,
  CardHeader,
  Listbox,
  ListboxItem,
  Progress,
  Select,
  SelectItem,
  Input,
  RadioGroup,
  Radio,
} from '@heroui/react';
import { Icon } from '@iconify/react';
import * as XLSX from 'xlsx';
import { api } from '../lib/api';
import type {
  AttendeeImportHeadersResult,
  AttendeeImportColumnMapping,
  AttendeeImportTemplateField,
  AttendeeRoleDetectionResult,
  AttendeeRoleMapping,
  AttendeeImportPreview,
  AttendeeImportResult,
  AttendeeImportRow,
  DuplicateResolution,
  ExcelSheetInfo,
} from '@shared/types';
import {
  ATTENDEE_IMPORT_FIELD_META,
  REQUIRED_ATTENDEE_IMPORT_FIELDS,
} from '@shared/types/event';

interface AttendeeImportModalProps {
  isOpen: boolean;
  eventId: string;
  onClose: () => void;
  onImportComplete: () => void;
}

type Step = 'upload' | 'sheet-select' | 'mapping' | 'roles' | 'duplicates' | 'result';

const importSteps = [
  {
    key: 'upload',
    icon: 'solar:upload-linear',
    title: 'Upload File',
    description: 'Upload a CSV or Excel file with attendee data.',
  },
  {
    key: 'sheet-select',
    icon: 'solar:document-linear',
    title: 'Select Sheet',
    description: 'Choose which Excel sheet to import from.',
  },
  {
    key: 'mapping',
    icon: 'solar:widget-2-linear',
    title: 'Map Columns',
    description: 'Match file columns to attendee fields.',
  },
  {
    key: 'roles',
    icon: 'solar:users-group-rounded-linear',
    title: 'Map Roles',
    description: 'Map roles from file to event roles.',
  },
  {
    key: 'duplicates',
    icon: 'solar:copy-linear',
    title: 'Review Duplicates',
    description: 'Resolve duplicate attendees by name.',
  },
  {
    key: 'result',
    icon: 'solar:check-circle-linear',
    title: 'Complete',
    description: 'Import summary and results.',
  },
];

export default function AttendeeImportModal({
  isOpen,
  eventId,
  onClose,
  onImportComplete,
}: AttendeeImportModalProps) {
  // File state
  const [fileType, setFileType] = useState<'csv' | 'excel' | null>(null);
  const [excelBuffer, setExcelBuffer] = useState<ArrayBuffer | null>(null);
  const [excelSheets, setExcelSheets] = useState<ExcelSheetInfo[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [csvContent, setCsvContent] = useState('');

  // Step state
  const [step, setStep] = useState<Step>('upload');
  const [csvHeaders, setCsvHeaders] = useState<AttendeeImportHeadersResult | null>(null);
  const [columnMapping, setColumnMapping] = useState<AttendeeImportColumnMapping>(
    {} as AttendeeImportColumnMapping
  );
  const [sampleIndex, setSampleIndex] = useState(0);

  // Role mapping state
  const [roleDetection, setRoleDetection] = useState<AttendeeRoleDetectionResult | null>(null);
  const [roleMapping, setRoleMapping] = useState<AttendeeRoleMapping>({});
  const [newRoleInputs, setNewRoleInputs] = useState<Record<string, string>>({});

  // Duplicate handling state
  const [preview, setPreview] = useState<AttendeeImportPreview | null>(null);
  const [duplicateResolutions, setDuplicateResolutions] = useState<
    Record<number, DuplicateResolution>
  >({});
  const [editedValues, setEditedValues] = useState<Record<number, AttendeeImportRow>>({});
  const [editingDuplicate, setEditingDuplicate] = useState<number | null>(null);

  // Result state
  const [result, setResult] = useState<AttendeeImportResult | null>(null);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setStep('upload');
    setFileType(null);
    setExcelBuffer(null);
    setExcelSheets([]);
    setSelectedSheet('');
    setCsvContent('');
    setCsvHeaders(null);
    setColumnMapping({} as AttendeeImportColumnMapping);
    setSampleIndex(0);
    setRoleDetection(null);
    setRoleMapping({});
    setNewRoleInputs({});
    setPreview(null);
    setDuplicateResolutions({});
    setEditedValues({});
    setEditingDuplicate(null);
    setResult(null);
    setError('');
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError('');
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.csv')) {
      setFileType('csv');
      const reader = new FileReader();
      reader.onload = (e) => {
        setCsvContent(e.target?.result as string);
      };
      reader.readAsText(file);
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.xlsm')) {
      setFileType('excel');
      const reader = new FileReader();
      reader.onload = async (e) => {
        const buffer = e.target?.result as ArrayBuffer;
        setExcelBuffer(buffer);

        // Parse sheets client-side for quick selection
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheets: ExcelSheetInfo[] = workbook.SheetNames.map((name) => {
          const sheet = workbook.Sheets[name];
          const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
          const rowCount = Math.max(0, range.e.r);
          const sampleHeaders: string[] = [];
          for (let col = range.s.c; col <= range.e.c && col < 10; col++) {
            const cell = sheet[XLSX.utils.encode_cell({ r: 0, c: col })];
            if (cell && cell.v !== undefined) {
              sampleHeaders.push(String(cell.v).trim());
            }
          }
          return { name, rowCount, sampleHeaders };
        });
        setExcelSheets(sheets);
        if (sheets.length === 1) {
          setSelectedSheet(sheets[0].name);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      setError('Please upload a CSV or Excel file (.csv, .xlsx, .xls)');
    }
  };

  const handleContinueFromUpload = async () => {
    if (fileType === 'csv') {
      await handleParseHeaders(csvContent);
    } else if (fileType === 'excel') {
      if (excelSheets.length > 1) {
        setStep('sheet-select');
      } else if (selectedSheet && excelBuffer) {
        await convertExcelAndParseHeaders();
      }
    }
  };

  const convertExcelAndParseHeaders = async () => {
    if (!excelBuffer || !selectedSheet) return;

    const workbook = XLSX.read(excelBuffer, { type: 'array' });
    const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[selectedSheet], { blankrows: false });
    setCsvContent(csv);
    await handleParseHeaders(csv);
  };

  const handleParseHeaders = async (csv: string) => {
    if (!csv.trim()) {
      setError('Please provide file content to import.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await api.post<AttendeeImportHeadersResult>(
        `/events/${eventId}/attendees/import/headers`,
        { csv }
      );
      setCsvHeaders(response.data);
      setColumnMapping(response.data.suggestedMapping as AttendeeImportColumnMapping);
      setStep('mapping');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string; howToFix?: string } } } };
      const errorMessage = error.response?.data?.error?.message;
      const howToFix = error.response?.data?.error?.howToFix;
      setError(howToFix ? `${errorMessage} ${howToFix}` : errorMessage || 'Failed to parse file');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDetectRoles = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await api.post<AttendeeRoleDetectionResult>(
        `/events/${eventId}/attendees/import/roles`,
        { csv: csvContent, columnMapping }
      );
      setRoleDetection(response.data);

      // Auto-map matched roles
      const autoMapping: AttendeeRoleMapping = {};
      for (const detected of response.data.detectedRoles) {
        if (detected.matchedRole) {
          autoMapping[detected.csvValue] = detected.matchedRole;
        }
      }
      setRoleMapping(autoMapping);

      // Check if all roles are auto-mapped and no unknown roles
      const hasUnmappedRoles = response.data.detectedRoles.some((d) => !autoMapping[d.csvValue]);

      if (!hasUnmappedRoles) {
        // Skip roles step if all roles are auto-mapped
        await handleGeneratePreview(autoMapping);
      } else {
        setStep('roles');
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string; howToFix?: string } } } };
      const errorMessage = error.response?.data?.error?.message;
      const howToFix = error.response?.data?.error?.howToFix;
      setError(howToFix ? `${errorMessage} ${howToFix}` : errorMessage || 'Failed to detect roles');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeneratePreview = async (overrideRoleMapping?: AttendeeRoleMapping) => {
    setIsLoading(true);
    setError('');

    const mappingToUse = overrideRoleMapping || roleMapping;

    try {
      const response = await api.post<{ preview: AttendeeImportPreview }>(
        `/events/${eventId}/attendees/import/preview`,
        { csv: csvContent, columnMapping, roleMapping: mappingToUse }
      );
      setPreview(response.data.preview);

      // Initialize duplicate resolutions
      const initialResolutions: Record<number, DuplicateResolution> = {};
      for (const dup of response.data.preview.duplicates) {
        initialResolutions[dup.rowIndex] = 'skip';
      }
      setDuplicateResolutions(initialResolutions);

      if (response.data.preview.duplicates.length > 0) {
        setStep('duplicates');
      } else {
        // No duplicates, execute directly
        await handleExecute(mappingToUse, initialResolutions);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string; howToFix?: string } } } };
      const errorMessage = error.response?.data?.error?.message;
      const howToFix = error.response?.data?.error?.howToFix;
      setError(howToFix ? `${errorMessage} ${howToFix}` : errorMessage || 'Failed to generate preview');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecute = async (
    overrideRoleMapping?: AttendeeRoleMapping,
    overrideResolutions?: Record<number, DuplicateResolution>
  ) => {
    setIsLoading(true);
    setError('');

    try {
      const response = await api.post<{ result: AttendeeImportResult }>(
        `/events/${eventId}/attendees/import/execute`,
        {
          csv: csvContent,
          columnMapping,
          roleMapping: overrideRoleMapping || roleMapping,
          duplicateResolutions: overrideResolutions || duplicateResolutions,
          editedValues,
        }
      );
      setResult(response.data.result);
      setStep('result');
      onImportComplete();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string; howToFix?: string } } } };
      const errorMessage = error.response?.data?.error?.message;
      const howToFix = error.response?.data?.error?.howToFix;
      setError(howToFix ? `${errorMessage} ${howToFix}` : errorMessage || 'Failed to execute import');
    } finally {
      setIsLoading(false);
    }
  };

  // Step helpers
  const getStepIndex = (s: Step): number => {
    const visibleSteps = getVisibleSteps();
    return visibleSteps.findIndex((item) => item.key === s);
  };

  const getVisibleSteps = () => {
    // Hide sheet-select step if CSV file or single-sheet Excel
    if (fileType === 'csv' || excelSheets.length <= 1) {
      return importSteps.filter((s) => s.key !== 'sheet-select');
    }
    return importSteps;
  };

  const currentStepIndex = getStepIndex(step);
  const visibleSteps = getVisibleSteps();
  const progressValue = ((currentStepIndex + 1) / visibleSteps.length) * 100;

  // Upload step content
  const renderUploadContent = () => (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-danger-50 p-3 text-sm text-danger">{error}</div>
      )}

      <Card>
        <CardBody className="space-y-4">
          <div>
            <h3 className="mb-2 text-lg font-semibold">Upload Attendee List</h3>
            <p className="text-sm text-default-500">
              Import attendees from a CSV or Excel file. The system will:
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-default-500">
              <li>Auto-detect column mappings</li>
              <li>Map roles to existing event roles or create new ones</li>
              <li>Detect duplicates by name for your review</li>
            </ul>
          </div>

          <div className="flex items-center gap-4 rounded-lg border-2 border-dashed border-default-200 p-6">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls,.xlsm"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div className="flex w-full flex-col items-center gap-3">
              <Icon icon="solar:upload-bold-duotone" className="text-primary" width={48} />
              <Button
                variant="bordered"
                color="primary"
                onPress={() => fileInputRef.current?.click()}
                startContent={<Icon icon="solar:folder-open-linear" width={18} />}
              >
                Choose CSV or Excel File
              </Button>
              {fileType === 'csv' && csvContent && (
                <Chip
                  color="success"
                  variant="flat"
                  startContent={<Icon icon="solar:document-text-linear" width={16} />}
                >
                  CSV file loaded
                </Chip>
              )}
              {fileType === 'excel' && excelSheets.length > 0 && (
                <Chip
                  color="success"
                  variant="flat"
                  startContent={<Icon icon="solar:table-linear" width={16} />}
                >
                  Excel file loaded ({excelSheets.length} sheet
                  {excelSheets.length > 1 ? 's' : ''})
                </Chip>
              )}
            </div>
          </div>

          {fileType === 'csv' && (
            <Textarea
              label="CSV Content"
              placeholder="Or paste CSV content here..."
              value={csvContent}
              onValueChange={setCsvContent}
              minRows={6}
              maxRows={10}
            />
          )}
        </CardBody>
      </Card>
    </div>
  );

  // Sheet selection step
  const renderSheetSelectContent = () => (
    <div className="space-y-4">
      <Card>
        <CardBody className="space-y-4">
          <div>
            <h3 className="mb-2 text-lg font-semibold">Select Sheet</h3>
            <p className="text-sm text-default-500">
              Your Excel file contains multiple sheets. Select the one with attendee data.
            </p>
          </div>

          <RadioGroup value={selectedSheet} onValueChange={setSelectedSheet}>
            {excelSheets.map((sheet) => (
              <Radio key={sheet.name} value={sheet.name} className="mb-2">
                <div className="flex flex-col">
                  <span className="font-medium">{sheet.name}</span>
                  <span className="text-xs text-default-400">
                    {sheet.rowCount} rows • Headers: {sheet.sampleHeaders.slice(0, 4).join(', ')}
                    {sheet.sampleHeaders.length > 4 && '...'}
                  </span>
                </div>
              </Radio>
            ))}
          </RadioGroup>
        </CardBody>
      </Card>
    </div>
  );

  // Column mapping step
  const renderMappingContent = () => {
    if (!csvHeaders) return null;

    const unmappedRequired = REQUIRED_ATTENDEE_IMPORT_FIELDS.filter(
      (field) => !columnMapping[field]
    );
    const hasValidationErrors = unmappedRequired.length > 0;
    const sampleCount = csvHeaders.sampleRows.length;
    const currentSample = csvHeaders.sampleRows[sampleIndex] ?? {};

    const getSampleValue = (field: AttendeeImportTemplateField): string => {
      const csvColumn = columnMapping[field];
      if (!csvColumn || !sampleCount) return '—';
      const sampleValue = currentSample[csvColumn];
      return sampleValue || '—';
    };

    return (
      <div className="w-full space-y-4">
        {error && (
          <div className="rounded-lg bg-danger-50 p-3 text-sm text-danger">{error}</div>
        )}

        {hasValidationErrors && (
          <div className="rounded-lg bg-danger-50 p-3 text-sm text-danger">
            Please map all required fields:{' '}
            {unmappedRequired
              .map((f) => ATTENDEE_IMPORT_FIELD_META.find((m) => m.field === f)?.label)
              .join(', ')}
          </div>
        )}

        <Card className="w-full">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Map Columns to Attendee Fields</h3>
              <p className="text-sm text-default-500">
                Match your file columns to the corresponding attendee fields.
              </p>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            <div className="max-h-[400px] overflow-auto">
              <Table aria-label="Column mapping" className="w-full">
                <TableHeader>
                  <TableColumn>ATTENDEE FIELD</TableColumn>
                  <TableColumn>FILE COLUMN</TableColumn>
                  <TableColumn>
                    <div className="flex items-center gap-2">
                      <span>SAMPLE DATA</span>
                      {sampleCount > 1 && (
                        <div className="flex items-center gap-1">
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            onPress={() =>
                              setSampleIndex((prev) => (prev === 0 ? sampleCount - 1 : prev - 1))
                            }
                            className="h-6 w-6 min-w-6"
                          >
                            <Icon icon="solar:alt-arrow-left-linear" width={14} />
                          </Button>
                          <span className="min-w-[40px] text-center text-xs text-default-400">
                            {sampleIndex + 1} / {sampleCount}
                          </span>
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            onPress={() =>
                              setSampleIndex((prev) => (prev === sampleCount - 1 ? 0 : prev + 1))
                            }
                            className="h-6 w-6 min-w-6"
                          >
                            <Icon icon="solar:alt-arrow-right-linear" width={14} />
                          </Button>
                        </div>
                      )}
                    </div>
                  </TableColumn>
                </TableHeader>
                <TableBody>
                  {ATTENDEE_IMPORT_FIELD_META.map((fieldMeta) => (
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
                          selectedKeys={
                            columnMapping[fieldMeta.field]
                              ? [columnMapping[fieldMeta.field] as string]
                              : ['__NOT_MAPPED__']
                          }
                          onSelectionChange={(keys) => {
                            const selectedKey = Array.from(keys)[0] as string;
                            setColumnMapping((prev) => ({
                              ...prev,
                              [fieldMeta.field]:
                                selectedKey === '__NOT_MAPPED__' ? null : selectedKey,
                            }));
                          }}
                          className="min-w-[180px]"
                          size="sm"
                          items={[
                            { key: '__NOT_MAPPED__', label: '— Not Mapped —' },
                            ...csvHeaders.headers.map((h) => ({ key: h, label: h })),
                          ]}
                        >
                          {(item) => <SelectItem key={item.key}>{item.label}</SelectItem>}
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

  // Role mapping step
  const renderRolesContent = () => {
    if (!roleDetection) return null;

    const unmappedRoles = roleDetection.detectedRoles.filter((d) => !roleMapping[d.csvValue]);
    const hasUnmappedRoles = unmappedRoles.length > 0;

    return (
      <div className="w-full space-y-4">
        {error && (
          <div className="rounded-lg bg-danger-50 p-3 text-sm text-danger">{error}</div>
        )}

        {hasUnmappedRoles && (
          <div className="rounded-lg bg-warning-50 p-3 text-sm text-warning-700">
            Please map all roles before continuing. You can select an existing role or create a new
            one.
          </div>
        )}

        <Card className="w-full">
          <CardHeader>
            <div>
              <h3 className="text-lg font-semibold">Map Roles</h3>
              <p className="text-sm text-default-500">
                Map roles from your file to existing event roles or create new ones.
              </p>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            <div className="max-h-[400px] overflow-auto">
              <Table aria-label="Role mapping" className="w-full">
                <TableHeader>
                  <TableColumn>ROLE IN FILE</TableColumn>
                  <TableColumn>ATTENDEES</TableColumn>
                  <TableColumn>MAP TO EVENT ROLE</TableColumn>
                </TableHeader>
                <TableBody>
                  {roleDetection.detectedRoles.map((detected) => (
                    <TableRow key={detected.csvValue}>
                      <TableCell>
                        <span className="font-medium">{detected.csvValue}</span>
                      </TableCell>
                      <TableCell>
                        <Chip size="sm" variant="flat">
                          {detected.attendeeCount}
                        </Chip>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Select
                            aria-label={`Map role ${detected.csvValue}`}
                            selectedKeys={
                              roleMapping[detected.csvValue]
                                ? [roleMapping[detected.csvValue]]
                                : ['__NOT_MAPPED__']
                            }
                            onSelectionChange={(keys) => {
                              const selectedKey = Array.from(keys)[0] as string;
                              if (selectedKey === '__CREATE_NEW__') {
                                setNewRoleInputs((prev) => ({
                                  ...prev,
                                  [detected.csvValue]: detected.csvValue,
                                }));
                              } else {
                                setNewRoleInputs((prev) => {
                                  const next = { ...prev };
                                  delete next[detected.csvValue];
                                  return next;
                                });
                                setRoleMapping((prev) => ({
                                  ...prev,
                                  [detected.csvValue]:
                                    selectedKey === '__NOT_MAPPED__' ? '' : selectedKey,
                                }));
                              }
                            }}
                            className="min-w-[160px]"
                            size="sm"
                            items={[
                              { key: '__NOT_MAPPED__', label: '— Select Role —' },
                              ...roleDetection.eventRoles.map((r) => ({ key: r, label: r })),
                              { key: '__CREATE_NEW__', label: '+ Create New Role' },
                            ]}
                          >
                            {(item) => (
                              <SelectItem
                                key={item.key}
                                className={item.key === '__CREATE_NEW__' ? 'text-primary' : ''}
                              >
                                {item.label}
                              </SelectItem>
                            )}
                          </Select>

                          {newRoleInputs[detected.csvValue] !== undefined && (
                            <div className="flex items-center gap-1">
                              <Input
                                size="sm"
                                placeholder="New role name"
                                value={newRoleInputs[detected.csvValue]}
                                onValueChange={(v) =>
                                  setNewRoleInputs((prev) => ({ ...prev, [detected.csvValue]: v }))
                                }
                                className="w-32"
                              />
                              <Button
                                size="sm"
                                color="primary"
                                isIconOnly
                                onPress={() => {
                                  const newRole = newRoleInputs[detected.csvValue];
                                  if (newRole) {
                                    setRoleMapping((prev) => ({
                                      ...prev,
                                      [detected.csvValue]: newRole,
                                    }));
                                    setNewRoleInputs((prev) => {
                                      const next = { ...prev };
                                      delete next[detected.csvValue];
                                      return next;
                                    });
                                  }
                                }}
                              >
                                <Icon icon="solar:check-linear" width={16} />
                              </Button>
                            </div>
                          )}

                          {roleMapping[detected.csvValue] && (
                            <Chip
                              size="sm"
                              color="success"
                              variant="flat"
                              startContent={<Icon icon="solar:check-circle-linear" width={14} />}
                            >
                              Mapped
                            </Chip>
                          )}
                        </div>
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

  // Duplicates step
  const renderDuplicatesContent = () => {
    if (!preview) return null;

    return (
      <div className="w-full space-y-4">
        {error && (
          <div className="rounded-lg bg-danger-50 p-3 text-sm text-danger">{error}</div>
        )}

        <Card className="w-full">
          <CardHeader>
            <div>
              <h3 className="text-lg font-semibold">
                Review Duplicates ({preview.duplicates.length})
              </h3>
              <p className="text-sm text-default-500">
                These attendees have names matching existing attendees. Choose how to handle each
                one.
              </p>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            <div className="max-h-[400px] overflow-auto">
              <Table aria-label="Duplicate resolution" className="w-full">
                <TableHeader>
                  <TableColumn>INCOMING ATTENDEE</TableColumn>
                  <TableColumn>EXISTING ATTENDEE</TableColumn>
                  <TableColumn>ACTION</TableColumn>
                </TableHeader>
                <TableBody>
                  {preview.duplicates.map((dup) => (
                    <TableRow key={dup.rowIndex}>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">{dup.incoming.name}</span>
                          <span className="text-xs text-default-400">
                            {dup.incoming.organization} • {dup.incoming.role}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">{dup.existing.name}</span>
                          <span className="text-xs text-default-400">
                            {dup.existing.organization} • {dup.existing.role}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          aria-label="Resolution"
                          selectedKeys={[duplicateResolutions[dup.rowIndex] || 'skip']}
                          onSelectionChange={(keys) => {
                            const resolution = Array.from(keys)[0] as DuplicateResolution;
                            setDuplicateResolutions((prev) => ({
                              ...prev,
                              [dup.rowIndex]: resolution,
                            }));
                            if (resolution === 'edit') {
                              setEditingDuplicate(dup.rowIndex);
                              setEditedValues((prev) => ({
                                ...prev,
                                [dup.rowIndex]: { ...dup.incoming },
                              }));
                            }
                          }}
                          className="min-w-[140px]"
                          size="sm"
                        >
                          <SelectItem key="skip">Skip</SelectItem>
                          <SelectItem key="add">Add Anyway</SelectItem>
                          <SelectItem key="update">Update Existing</SelectItem>
                          <SelectItem key="edit">Edit & Add</SelectItem>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardBody>
        </Card>

        {/* Edit modal for 'edit' resolution */}
        {editingDuplicate !== null && editedValues[editingDuplicate] && (
          <Card>
            <CardHeader>
              <h4 className="font-semibold">Edit Attendee Before Adding</h4>
            </CardHeader>
            <CardBody className="space-y-3">
              <Input
                label="Name"
                value={editedValues[editingDuplicate].name}
                onValueChange={(v) =>
                  setEditedValues((prev) => ({
                    ...prev,
                    [editingDuplicate!]: { ...prev[editingDuplicate!], name: v },
                  }))
                }
              />
              <Input
                label="Organization"
                value={editedValues[editingDuplicate].organization}
                onValueChange={(v) =>
                  setEditedValues((prev) => ({
                    ...prev,
                    [editingDuplicate!]: { ...prev[editingDuplicate!], organization: v },
                  }))
                }
              />
              <Input
                label="Role"
                value={editedValues[editingDuplicate].role}
                onValueChange={(v) =>
                  setEditedValues((prev) => ({
                    ...prev,
                    [editingDuplicate!]: { ...prev[editingDuplicate!], role: v },
                  }))
                }
              />
              <Button color="primary" size="sm" onPress={() => setEditingDuplicate(null)}>
                Done Editing
              </Button>
            </CardBody>
          </Card>
        )}

        {/* Summary */}
        <div className="flex gap-4">
          <Card className="min-w-[140px] flex-1">
            <CardBody className="flex flex-row items-center gap-3 px-4 py-3">
              <Icon icon="solar:add-circle-linear" width={28} className="flex-shrink-0 text-success" />
              <div>
                <p className="text-2xl font-bold">{preview.toAdd.length}</p>
                <p className="text-xs text-default-500">New Attendees</p>
              </div>
            </CardBody>
          </Card>
          <Card className="min-w-[140px] flex-1">
            <CardBody className="flex flex-row items-center gap-3 px-4 py-3">
              <Icon icon="solar:copy-linear" width={28} className="flex-shrink-0 text-warning" />
              <div>
                <p className="text-2xl font-bold">{preview.duplicates.length}</p>
                <p className="text-xs text-default-500">Duplicates</p>
              </div>
            </CardBody>
          </Card>
          {preview.errors.length > 0 && (
            <Card className="min-w-[140px] flex-1">
              <CardBody className="flex flex-row items-center gap-3 px-4 py-3">
                <Icon icon="solar:danger-circle-linear" width={28} className="flex-shrink-0 text-danger" />
                <div>
                  <p className="text-2xl font-bold">{preview.errors.length}</p>
                  <p className="text-xs text-default-500">Errors</p>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    );
  };

  // Result step
  const renderResultContent = () => {
    if (!result) return null;

    return (
      <div className="w-full space-y-4">
        <Card>
          <CardBody className="flex flex-col items-center gap-4 py-8">
            <Icon icon="solar:check-circle-bold" width={64} className="text-success" />
            <h3 className="text-xl font-semibold">Import Complete!</h3>
            <p className="text-center text-sm text-default-500">
              Your attendees have been imported successfully.
            </p>
          </CardBody>
        </Card>

        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardBody className="flex flex-col items-center px-4 py-4">
              <p className="text-3xl font-bold text-success">{result.added}</p>
              <p className="text-sm text-default-500">Added</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="flex flex-col items-center px-4 py-4">
              <p className="text-3xl font-bold text-primary">{result.updated}</p>
              <p className="text-sm text-default-500">Updated</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="flex flex-col items-center px-4 py-4">
              <p className="text-3xl font-bold text-default-400">{result.skipped}</p>
              <p className="text-sm text-default-500">Skipped</p>
            </CardBody>
          </Card>
        </div>

        {result.errors.length > 0 && (
          <Card>
            <CardHeader>
              <h4 className="font-semibold text-danger">
                Errors ({result.errors.length})
              </h4>
            </CardHeader>
            <CardBody>
              <ul className="space-y-1 text-sm">
                {result.errors.map((err, idx) => (
                  <li key={idx} className="text-danger">
                    Row {err.row}: {err.message}
                    {err.howToFix && (
                      <span className="text-default-500"> - {err.howToFix}</span>
                    )}
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        )}
      </div>
    );
  };

  // Step checklist sidebar
  const renderStepChecklist = () => (
    <Card className="min-w-[280px] py-1 md:py-4">
      <CardHeader className="flex items-center gap-3 px-5 pb-0 pt-3 md:px-6 md:pt-5">
        <div className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-gradient-to-br from-secondary-300 to-primary-500">
          <Icon className="text-white" icon="solar:users-group-rounded-linear" width={24} />
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
          items={visibleSteps}
          variant="flat"
          disabledKeys={visibleSteps.filter((_, idx) => idx > currentStepIndex).map((item) => item.key)}
        >
          {(item) => {
            const itemIndex = getStepIndex(item.key as Step);
            const isCompleted = itemIndex < currentStepIndex || (step === 'result' && result);
            const isCurrent = item.key === step;

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
                  <div
                    className={`flex items-center justify-center rounded-medium border p-2 ${getIconBoxClass()}`}
                  >
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

  // Can continue from upload?
  const canContinueFromUpload =
    (fileType === 'csv' && csvContent.trim()) ||
    (fileType === 'excel' && excelSheets.length > 0);

  // Can continue from mapping?
  const canContinueFromMapping =
    csvHeaders && !REQUIRED_ATTENDEE_IMPORT_FIELDS.some((field) => !columnMapping[field]);

  // Can continue from roles?
  const canContinueFromRoles =
    roleDetection &&
    roleDetection.detectedRoles.every((d) => roleMapping[d.csvValue]);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="5xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader>Import Event Attendees</ModalHeader>

        <ModalBody>
          <div className="flex gap-6">
            <div className="hidden md:block">{renderStepChecklist()}</div>

            <div className="flex-1">
              {isLoading && ['upload', 'sheet-select', 'mapping', 'roles'].includes(step) ? (
                <div className="flex justify-center py-12">
                  <Spinner size="lg" />
                </div>
              ) : (
                <>
                  {step === 'upload' && renderUploadContent()}
                  {step === 'sheet-select' && renderSheetSelectContent()}
                  {step === 'mapping' && renderMappingContent()}
                  {step === 'roles' && renderRolesContent()}
                  {step === 'duplicates' && renderDuplicatesContent()}
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
              onPress={handleContinueFromUpload}
              isLoading={isLoading}
              isDisabled={!canContinueFromUpload}
            >
              Continue
            </Button>
          </ModalFooter>
        )}

        {step === 'sheet-select' && (
          <ModalFooter>
            <Button variant="light" onPress={() => setStep('upload')}>
              Back
            </Button>
            <Button
              color="primary"
              onPress={convertExcelAndParseHeaders}
              isLoading={isLoading}
              isDisabled={!selectedSheet}
            >
              Continue
            </Button>
          </ModalFooter>
        )}

        {step === 'mapping' && (
          <ModalFooter>
            <Button
              variant="light"
              onPress={() => setStep(fileType === 'excel' && excelSheets.length > 1 ? 'sheet-select' : 'upload')}
            >
              Back
            </Button>
            <Button
              color="primary"
              onPress={handleDetectRoles}
              isLoading={isLoading}
              isDisabled={!canContinueFromMapping}
            >
              Continue to Role Mapping
            </Button>
          </ModalFooter>
        )}

        {step === 'roles' && (
          <ModalFooter>
            <Button variant="light" onPress={() => setStep('mapping')}>
              Back
            </Button>
            <Button
              color="primary"
              onPress={() => handleGeneratePreview()}
              isLoading={isLoading}
              isDisabled={!canContinueFromRoles}
            >
              Continue to Preview
            </Button>
          </ModalFooter>
        )}

        {step === 'duplicates' && preview && (
          <ModalFooter>
            <Button variant="light" onPress={() => setStep('roles')}>
              Back
            </Button>
            <Button
              color="primary"
              onPress={() => handleExecute()}
              isLoading={isLoading}
              isDisabled={preview.errors.length > 0}
            >
              Import {preview.toAdd.length + preview.duplicates.filter((d) => duplicateResolutions[d.rowIndex] !== 'skip').length} Attendees
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
