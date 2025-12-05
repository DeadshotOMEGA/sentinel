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
    queryFn: async () => {
      const response = await api.get<ReportSettingsData>('/report-settings');
      return response.data;
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
      await api.put('/report-settings/bulk', settings);
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
            <p className="text-sm text-gray-600">
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
              value={String(thresholds.criticalThreshold)}
              onValueChange={(v) =>
                setThresholds({ ...thresholds, criticalThreshold: Number(v) })
              }
              min={0}
              max={100}
              isRequired
            />
          </div>

          <Switch
            isSelected={thresholds.showThresholdFlags}
            onValueChange={(v) =>
              setThresholds({ ...thresholds, showThresholdFlags: v })
            }
          >
            Show Threshold Flags
          </Switch>

          <Switch
            isSelected={thresholds.bmqSeparateThresholds}
            onValueChange={(v) =>
              setThresholds({ ...thresholds, bmqSeparateThresholds: v })
            }
          >
            BMQ Separate Thresholds
          </Switch>

          {thresholds.bmqSeparateThresholds && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 pl-6 border-l-2 border-gray-200">
              <Input
                type="number"
                label="BMQ Warning Threshold %"
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
            <p className="text-sm text-gray-600">
              Configure grace periods, minimum attendance, and badge display options
            </p>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              type="number"
              label="New Member Grace Period (weeks)"
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

          <Switch
            isSelected={memberHandling.includeFTStaff}
            onValueChange={(v) =>
              setMemberHandling({ ...memberHandling, includeFTStaff: v })
            }
          >
            Include Full-Time Staff
          </Switch>

          <Switch
            isSelected={memberHandling.showBMQBadge}
            onValueChange={(v) =>
              setMemberHandling({ ...memberHandling, showBMQBadge: v })
            }
          >
            Show BMQ Badge
          </Switch>

          <Switch
            isSelected={memberHandling.showTrendIndicators}
            onValueChange={(v) =>
              setMemberHandling({ ...memberHandling, showTrendIndicators: v })
            }
          >
            Show Trend Indicators
          </Switch>
        </CardBody>
      </Card>

      {/* Section 3: Formatting */}
      <Card>
        <CardHeader>
          <div>
            <h3 className="text-lg font-semibold">Formatting</h3>
            <p className="text-sm text-gray-600">
              Configure default sort order, date format, and page size
            </p>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          <Select
            label="Default Sort Order"
            selectedKeys={[formatting.defaultSortOrder]}
            onSelectionChange={(keys) => {
              const key = Array.from(keys)[0] as SortOrder;
              setFormatting({ ...formatting, defaultSortOrder: key });
            }}
          >
            <SelectItem key="division_rank">
              By Division then Rank
            </SelectItem>
            <SelectItem key="rank">
              By Rank
            </SelectItem>
            <SelectItem key="alphabetical">
              Alphabetical
            </SelectItem>
          </Select>

          <Switch
            isSelected={formatting.showServiceNumber}
            onValueChange={(v) =>
              setFormatting({ ...formatting, showServiceNumber: v })
            }
          >
            Show Service Number
          </Switch>

          <Select
            label="Date Format"
            selectedKeys={[formatting.dateFormat]}
            onSelectionChange={(keys) => {
              const key = Array.from(keys)[0] as DateFormat;
              setFormatting({ ...formatting, dateFormat: key });
            }}
          >
            <SelectItem key="DD MMM YYYY">
              DD MMM YYYY
            </SelectItem>
            <SelectItem key="YYYY-MM-DD">
              YYYY-MM-DD
            </SelectItem>
            <SelectItem key="MM/DD/YYYY">
              MM/DD/YYYY
            </SelectItem>
          </Select>

          <RadioGroup
            label="Page Size"
            value={formatting.pageSize}
            onValueChange={(v) =>
              setFormatting({ ...formatting, pageSize: v as PageSize })
            }
          >
            <Radio value="letter">Letter</Radio>
            <Radio value="a4">A4</Radio>
          </RadioGroup>
        </CardBody>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          color="primary"
          size="lg"
          onPress={handleSave}
          isLoading={saveMutation.isPending}
        >
          Save Settings
        </Button>
      </div>
    </div>
  );
}
