import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardBody,
  CardHeader,
  Input,
  Switch,
  Select,
  SelectItem,
  RadioGroup,
  Radio,
  Button,
  Spinner,
  Tooltip,
} from '@heroui/react';
import { api } from '../../lib/api';
import type {
  ThresholdSettings,
  MemberHandlingSettings,
  FormattingSettings,
  SortOrder,
  DateFormat,
  PageSize,
} from '@shared/types/settings';

interface ReportSettingsData {
  thresholds: ThresholdSettings;
  member_handling: MemberHandlingSettings;
  formatting: FormattingSettings;
}

// API response shape from backend
interface ReportSettingsApiResponse {
  settings: Record<string, { value: unknown; updatedAt: string }>;
}

interface ValidationErrors {
  thresholds?: string;
}

export default function ReportSettingsForm() {
  const queryClient = useQueryClient();

  // Form state
  const [thresholds, setThresholds] = useState<ThresholdSettings>({
    warningThreshold: 75,
    criticalThreshold: 50,
    showThresholdFlags: true,
    bmqSeparateThresholds: false,
    bmqWarningThreshold: 80,
    bmqCriticalThreshold: 60,
  });

  const [memberHandling, setMemberHandling] = useState<MemberHandlingSettings>({
    newMemberGracePeriod: 4,
    minimumTrainingNights: 3,
    includeFTStaff: true,
    showBMQBadge: true,
    showTrendIndicators: true,
  });

  const [formatting, setFormatting] = useState<FormattingSettings>({
    defaultSortOrder: 'division_rank',
    showServiceNumber: true,
    dateFormat: 'DD MMM YYYY',
    pageSize: 'letter',
  });

  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  // Fetch settings
  const { data, isLoading } = useQuery({
    queryKey: ['report-settings'],
    queryFn: async (): Promise<ReportSettingsData> => {
      const response = await api.get<ReportSettingsApiResponse>('/report-settings');
      const { settings } = response.data;

      // Extract values from the nested { value, updatedAt } structure
      return {
        thresholds: settings.thresholds?.value as ThresholdSettings,
        member_handling: settings.member_handling?.value as MemberHandlingSettings,
        formatting: settings.formatting?.value as FormattingSettings,
      };
    },
  });

  // Update form state when data is loaded
  useEffect(() => {
    if (data) {
      if (data.thresholds) {
        setThresholds(data.thresholds);
      }
      if (data.member_handling) {
        setMemberHandling(data.member_handling);
      }
      if (data.formatting) {
        setFormatting(data.formatting);
      }
    }
  }, [data]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (settings: ReportSettingsData) => {
      await api.put('/report-settings', { settings });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-settings'] });
      // Show success toast (would need toast implementation)
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      const message = err.response?.data?.error?.message;
      console.error('Failed to save settings:', message);
      // Show error toast
    },
  });

  // Validation
  const validateThresholds = (): boolean => {
    const errors: ValidationErrors = {};

    if (thresholds.warningThreshold <= thresholds.criticalThreshold) {
      errors.thresholds = 'Warning threshold must be greater than critical threshold';
    }

    if (
      thresholds.bmqSeparateThresholds &&
      thresholds.bmqWarningThreshold <= thresholds.bmqCriticalThreshold
    ) {
      errors.thresholds = 'BMQ warning threshold must be greater than BMQ critical threshold';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save handler
  const handleSave = async () => {
    if (!validateThresholds()) {
      return;
    }

    await saveMutation.mutateAsync({
      thresholds,
      member_handling: memberHandling,
      formatting,
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section 1: Attendance Thresholds */}
      <Card>
        <CardHeader>
          <div>
            <h3 className="text-lg font-semibold">Attendance Thresholds</h3>
            <p className="text-sm text-default-500">
              Configure warning and critical attendance percentage thresholds
            </p>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          {validationErrors.thresholds && (
            <div className="rounded-lg bg-danger-50 p-3 text-sm text-danger">
              {validationErrors.thresholds}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              type="number"
              label="Warning Threshold %"
              description="Attendance below this shows yellow warning"
              value={String(thresholds.warningThreshold)}
              onValueChange={(v) =>
                setThresholds({ ...thresholds, warningThreshold: Number(v) })
              }
              min={0}
              max={100}
              isRequired
            />
            <Input
              type="number"
              label="Critical Threshold %"
              description="Attendance below this shows red critical alert"
              value={String(thresholds.criticalThreshold)}
              onValueChange={(v) =>
                setThresholds({ ...thresholds, criticalThreshold: Number(v) })
              }
              min={0}
              max={100}
              isRequired
            />
          </div>

          <Tooltip content="Display colored flags next to members below threshold">
            <div className="inline-block">
              <Switch
                isSelected={thresholds.showThresholdFlags}
                onValueChange={(v) =>
                  setThresholds({ ...thresholds, showThresholdFlags: v })
                }
              >
                Show Threshold Flags
              </Switch>
            </div>
          </Tooltip>

          <Tooltip content="Use different thresholds for BMQ candidates (typically higher expectations)">
            <div className="inline-block">
              <Switch
                isSelected={thresholds.bmqSeparateThresholds}
                onValueChange={(v) =>
                  setThresholds({ ...thresholds, bmqSeparateThresholds: v })
                }
              >
                BMQ Separate Thresholds
              </Switch>
            </div>
          </Tooltip>

          {thresholds.bmqSeparateThresholds && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 pl-6 border-l-2 border-default-200">
              <Input
                type="number"
                label="BMQ Warning Threshold %"
                description="BMQ candidates below this show warning"
                value={String(thresholds.bmqWarningThreshold)}
                onValueChange={(v) =>
                  setThresholds({ ...thresholds, bmqWarningThreshold: Number(v) })
                }
                min={0}
                max={100}
                isRequired
              />
              <Input
                type="number"
                label="BMQ Critical Threshold %"
                description="BMQ candidates below this show critical alert"
                value={String(thresholds.bmqCriticalThreshold)}
                onValueChange={(v) =>
                  setThresholds({ ...thresholds, bmqCriticalThreshold: Number(v) })
                }
                min={0}
                max={100}
                isRequired
              />
            </div>
          )}
        </CardBody>
      </Card>

      {/* Section 2: Member Handling */}
      <Card>
        <CardHeader>
          <div>
            <h3 className="text-lg font-semibold">Member Handling</h3>
            <p className="text-sm text-default-500">
              Configure grace periods, minimum attendance, and badge display options
            </p>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              type="number"
              label="New Member Grace Period (weeks)"
              description="New members exempt from thresholds during this period"
              value={String(memberHandling.newMemberGracePeriod)}
              onValueChange={(v) =>
                setMemberHandling({
                  ...memberHandling,
                  newMemberGracePeriod: Number(v),
                })
              }
              min={0}
              max={52}
              isRequired
            />
            <Input
              type="number"
              label="Minimum Training Nights"
              description="Minimum nights required before calculating attendance %"
              value={String(memberHandling.minimumTrainingNights)}
              onValueChange={(v) =>
                setMemberHandling({
                  ...memberHandling,
                  minimumTrainingNights: Number(v),
                })
              }
              min={1}
              max={20}
              isRequired
            />
          </div>

          <Tooltip content="Include Class B/C and RegF staff in attendance reports">
            <div className="inline-block">
              <Switch
                isSelected={memberHandling.includeFTStaff}
                onValueChange={(v) =>
                  setMemberHandling({ ...memberHandling, includeFTStaff: v })
                }
              >
                Include Full-Time Staff
              </Switch>
            </div>
          </Tooltip>

          <Tooltip content="Show BMQ indicator badge next to candidates on reports">
            <div className="inline-block">
              <Switch
                isSelected={memberHandling.showBMQBadge}
                onValueChange={(v) =>
                  setMemberHandling({ ...memberHandling, showBMQBadge: v })
                }
              >
                Show BMQ Badge
              </Switch>
            </div>
          </Tooltip>

          <Tooltip content="Show attendance trend arrows (improving/declining) on reports">
            <div className="inline-block">
              <Switch
                isSelected={memberHandling.showTrendIndicators}
                onValueChange={(v) =>
                  setMemberHandling({ ...memberHandling, showTrendIndicators: v })
                }
              >
                Show Trend Indicators
              </Switch>
            </div>
          </Tooltip>
        </CardBody>
      </Card>

      {/* Section 3: Formatting */}
      <Card>
        <CardHeader>
          <div>
            <h3 className="text-lg font-semibold">Formatting</h3>
            <p className="text-sm text-default-500">
              Configure default sort order, date format, and page size
            </p>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          <Select
            label="Default Sort Order"
            description="How members are ordered in reports by default"
            selectedKeys={[formatting.defaultSortOrder]}
            onSelectionChange={(keys) => {
              const key = Array.from(keys)[0] as SortOrder;
              setFormatting({ ...formatting, defaultSortOrder: key });
            }}
          >
            <SelectItem key="division_rank" description="Group by division, then rank within each">
              By Division then Rank
            </SelectItem>
            <SelectItem key="rank" description="Sort by rank across all divisions">
              By Rank
            </SelectItem>
            <SelectItem key="alphabetical" description="Sort by last name A-Z">
              Alphabetical
            </SelectItem>
          </Select>

          <Tooltip content="Display service number column in printed reports">
            <div className="inline-block">
              <Switch
                isSelected={formatting.showServiceNumber}
                onValueChange={(v) =>
                  setFormatting({ ...formatting, showServiceNumber: v })
                }
              >
                Show Service Number
              </Switch>
            </div>
          </Tooltip>

          <Select
            label="Date Format"
            description="Format for dates shown in reports"
            selectedKeys={[formatting.dateFormat]}
            onSelectionChange={(keys) => {
              const key = Array.from(keys)[0] as DateFormat;
              setFormatting({ ...formatting, dateFormat: key });
            }}
          >
            <SelectItem key="DD MMM YYYY" description="Military format (e.g., 15 Jan 2024)">
              DD MMM YYYY
            </SelectItem>
            <SelectItem key="YYYY-MM-DD" description="ISO format (e.g., 2024-01-15)">
              YYYY-MM-DD
            </SelectItem>
            <SelectItem key="MM/DD/YYYY" description="US format (e.g., 01/15/2024)">
              MM/DD/YYYY
            </SelectItem>
          </Select>

          <Tooltip content="Paper size for PDF report exports">
            <div className="inline-block">
              <RadioGroup
                label="Page Size"
                value={formatting.pageSize}
                onValueChange={(v) =>
                  setFormatting({ ...formatting, pageSize: v as PageSize })
                }
              >
                <Radio value="letter" description="8.5 x 11 inches">Letter</Radio>
                <Radio value="a4" description="210 x 297 mm">A4</Radio>
              </RadioGroup>
            </div>
          </Tooltip>
        </CardBody>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Tooltip content="Save all report settings changes">
          <Button
            color="primary"
            size="lg"
            onPress={handleSave}
            isLoading={saveMutation.isPending}
          >
            Save Settings
          </Button>
        </Tooltip>
      </div>
    </div>
  );
}
