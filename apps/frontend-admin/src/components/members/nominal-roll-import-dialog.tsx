'use client'

import React, { useState } from 'react'
import { useImportPreview, useExecuteImport } from '@/hooks/use-members'
import type { ImportError, PreviewImportResponse } from '@sentinel/contracts'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import { Card } from '@/components/ui/card'
import { CheckCircle2, AlertCircle, ChevronDown, ChevronUp, FolderPlus } from 'lucide-react'
import { ButtonSpinner } from '@/components/ui/loading-spinner'
import { toast } from 'sonner'

interface NominalRollImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NominalRollImportDialog({ open, onOpenChange }: NominalRollImportDialogProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [csvText, setCsvText] = useState('')
  const [preview, setPreview] = useState<PreviewImportResponse | null>(null)
  const [selectedDeactivateIds, setSelectedDeactivateIds] = useState<Set<string>>(new Set())
  const [excludedErrorRows, setExcludedErrorRows] = useState<Set<number>>(new Set())
  const [createDivisions, setCreateDivisions] = useState(true) // Default to creating divisions
  const [expandedSections, setExpandedSections] = useState({
    toAdd: true,
    toUpdate: false,
    toReview: false,
    errors: true,
    divisions: true,
  })
  const [result, setResult] = useState<{
    added: number
    updated: number
    deactivated: number
    excluded: number
    divisionsCreated: number
  } | null>(null)
  const [executionErrors, setExecutionErrors] = useState<ImportError[]>([])

  const importPreview = useImportPreview()
  const executeImport = useExecuteImport()

  const handleFileChange = (
    // eslint-disable-next-line no-undef -- HTMLInputElement is a browser global
    e: React.ChangeEvent<HTMLInputElement>
  ): void => {
    const file = e.target.files?.[0]
    if (!file) return

    // eslint-disable-next-line no-undef -- FileReader and ProgressEvent are browser globals
    const reader = new FileReader()
    // eslint-disable-next-line no-undef -- FileReader and ProgressEvent are browser globals
    reader.onload = (event: ProgressEvent<FileReader>) => {
      const text = event.target?.result as string
      setCsvText(text)
    }
    reader.readAsText(file)
  }

  const handlePreview = async () => {
    if (!csvText.trim()) {
      return
    }

    try {
      const previewResult = await importPreview.mutateAsync(csvText)
      setPreview(previewResult)
      setExecutionErrors([])
      setStep(2)
    } catch (error) {
      console.error('Failed to preview import:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to preview import')
    }
  }

  const handleExecute = async () => {
    if (!csvText || !preview) return

    try {
      const deactivateIds = Array.from(selectedDeactivateIds)
      const excludeRows = Array.from(excludedErrorRows)
      const divisionsToCreateCount = preview.divisionsToCreate?.length ?? 0
      const executeResult = await executeImport.mutateAsync({
        csvText,
        deactivateIds: deactivateIds.length > 0 ? deactivateIds : undefined,
        excludeRows: excludeRows.length > 0 ? excludeRows : undefined,
        createDivisions: createDivisions && divisionsToCreateCount > 0 ? true : undefined,
      })

      setResult({
        added: executeResult.added,
        updated: executeResult.updated,
        deactivated: executeResult.flaggedForReview,
        excluded: excludeRows.length,
        divisionsCreated: createDivisions ? divisionsToCreateCount : 0,
      })
      setExecutionErrors(executeResult.errors ?? [])
      if ((executeResult.errors?.length ?? 0) > 0) {
        toast.warning(
          `Import finished with ${executeResult.errors.length} issue${executeResult.errors.length === 1 ? '' : 's'}`
        )
      } else {
        toast.success('Import completed successfully')
      }
      setStep(3)
    } catch (error) {
      console.error('Failed to execute import:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to execute import')
    }
  }

  const handleClose = () => {
    setStep(1)
    setCsvText('')
    setPreview(null)
    setSelectedDeactivateIds(new Set())
    setExcludedErrorRows(new Set())
    setCreateDivisions(true)
    setResult(null)
    setExecutionErrors([])
    setExpandedSections({
      toAdd: true,
      toUpdate: false,
      toReview: false,
      errors: true,
      divisions: true,
    })
    onOpenChange(false)
  }

  const handleImportAnother = () => {
    setStep(1)
    setCsvText('')
    setPreview(null)
    setSelectedDeactivateIds(new Set())
    setExcludedErrorRows(new Set())
    setCreateDivisions(true)
    setResult(null)
    setExecutionErrors([])
    setExpandedSections({
      toAdd: true,
      toUpdate: false,
      toReview: false,
      errors: true,
      divisions: true,
    })
  }

  const toggleDeactivate = (id: string) => {
    const newSet = new Set(selectedDeactivateIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedDeactivateIds(newSet)
  }

  const toggleExcludeRow = (row: number) => {
    const newSet = new Set(excludedErrorRows)
    if (newSet.has(row)) {
      newSet.delete(row)
    } else {
      newSet.add(row)
    }
    setExcludedErrorRows(newSet)
  }

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  // Separate excludable errors from blocking errors
  const excludableErrors = preview?.errors.filter((e) => e.excludable) ?? []
  const blockingErrors = preview?.errors.filter((e) => !e.excludable) ?? []
  const hasDivisionsToCreate = (preview?.divisionsToCreate?.length ?? 0) > 0

  // Can proceed if: no blocking errors AND all excludable errors are selected for exclusion
  // AND either no divisions to create OR user has agreed to create them
  const allExcludableErrorsSelected =
    excludableErrors.length > 0 && excludableErrors.every((e) => excludedErrorRows.has(e.row))
  const hasBlockingErrors = blockingErrors.length > 0
  const hasUnresolvedErrors = excludableErrors.some((e) => !excludedErrorRows.has(e.row))
  const divisionsOk = !hasDivisionsToCreate || createDivisions
  const canProceed =
    !hasBlockingErrors && (!hasUnresolvedErrors || excludableErrors.length === 0) && divisionsOk

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="full" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Nominal Roll</DialogTitle>
          <DialogDescription>
            Import members from Nominal Roll CSV file
            <span className="badge badge-outline ml-2">Step {step} of 3</span>
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Upload CSV */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="csv-file" className="text-sm font-medium">
                Select CSV File
              </label>
              <input
                className="input input-bordered w-full disabled:opacity-50 disabled:cursor-not-allowed"
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={importPreview.isPending}
              />
              {csvText && (
                <p className="text-sm text-base-content/60">
                  File loaded ({csvText.split('\n').length - 1} rows)
                </p>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Preview Changes */}
        {step === 2 && preview && (
          <div className="space-y-4">
            {/* Divisions to Create Section */}
            {preview.divisionsToCreate && preview.divisionsToCreate.length > 0 && (
              <Card className="p-4 border-secondary">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => toggleSection('divisions')}
                >
                  <div className="flex items-center gap-2">
                    <FolderPlus className="h-5 w-5 text-secondary" />
                    <h3 className="font-semibold text-secondary">
                      New Divisions: {preview.divisionsToCreate.length}
                    </h3>
                  </div>
                  {expandedSections.divisions ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
                {expandedSections.divisions && (
                  <div className="mt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <input
                        type="checkbox"
                        id="create-divisions"
                        checked={createDivisions}
                        onChange={(e) => setCreateDivisions(e.target.checked)}
                        className="h-4 w-4"
                      />
                      <label htmlFor="create-divisions" className="text-sm">
                        Create these divisions automatically during import
                      </label>
                    </div>
                    <div className="relative w-full overflow-x-auto">
                      <table className="table">
                        <thead>
                          <tr className="hover">
                            <th className="text-base-content font-medium whitespace-nowrap">
                              Code
                            </th>
                            <th className="text-base-content font-medium whitespace-nowrap">
                              Name
                            </th>
                            <th className="text-base-content font-medium whitespace-nowrap text-right">
                              Members
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {preview.divisionsToCreate.map((div) => (
                            <tr key={div.code} className="hover">
                              <td className="whitespace-nowrap font-mono font-medium">
                                {div.code}
                              </td>
                              <td className="whitespace-nowrap">{div.name}</td>
                              <td className="whitespace-nowrap text-right">{div.memberCount}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {!createDivisions && (
                      <p className="text-sm text-warning mt-3">
                        ⚠ Import will skip members in these divisions. Check the box above to create
                        them.
                      </p>
                    )}
                  </div>
                )}
              </Card>
            )}

            {/* Errors Section */}
            {preview.errors.length > 0 && (
              <Card className="p-4 border-error">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => toggleSection('errors')}
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-error" />
                    <h3 className="font-semibold text-error">
                      Errors: {preview.errors.length}
                      {excludedErrorRows.size > 0 && (
                        <span className="text-base-content/60 font-normal ml-2">
                          ({excludedErrorRows.size} will be excluded)
                        </span>
                      )}
                    </h3>
                  </div>
                  {expandedSections.errors ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
                {expandedSections.errors && (
                  <div className="mt-4">
                    {excludableErrors.length > 0 && (
                      <p className="text-sm text-base-content/60 mb-3">
                        Select rows to exclude from import, or fix the CSV and re-upload:
                      </p>
                    )}
                    <div className="relative w-full overflow-x-auto">
                      <table className="table">
                        <thead>
                          <tr className="hover">
                            {excludableErrors.length > 0 && (
                              <th className="text-base-content font-medium whitespace-nowrap w-12">
                                Exclude
                              </th>
                            )}
                            <th className="text-base-content font-medium whitespace-nowrap w-16">
                              Row
                            </th>
                            <th className="text-base-content font-medium whitespace-nowrap">
                              Member
                            </th>
                            <th className="text-base-content font-medium whitespace-nowrap">
                              Field
                            </th>
                            <th className="text-base-content font-medium whitespace-nowrap">
                              Error
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {preview.errors.map((error, idx) => {
                            const context = error.context
                            const memberDisplay = context
                              ? [context.rank, context.firstName, context.lastName]
                                  .filter(Boolean)
                                  .join(' ') || '(unknown)'
                              : '(unknown)'
                            const isExcluded = excludedErrorRows.has(error.row)

                            return (
                              <tr
                                key={idx}
                                className={`hover ${isExcluded ? 'opacity-50 line-through' : ''}`}
                              >
                                {excludableErrors.length > 0 && (
                                  <td className="whitespace-nowrap">
                                    {error.excludable && (
                                      <input
                                        type="checkbox"
                                        checked={isExcluded}
                                        onChange={() => toggleExcludeRow(error.row)}
                                        className="h-4 w-4"
                                        title="Exclude this row from import"
                                      />
                                    )}
                                  </td>
                                )}
                                <td className="whitespace-nowrap font-mono">{error.row}</td>
                                <td className="whitespace-nowrap font-medium">{memberDisplay}</td>
                                <td className="whitespace-nowrap">
                                  <span className="badge badge-outline text-xs">{error.field}</span>
                                </td>
                                <td className="whitespace-nowrap text-error">{error.message}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                    {allExcludableErrorsSelected && excludableErrors.length > 0 && (
                      <p className="text-sm text-success mt-3">
                        ✓ All errors will be excluded. You can proceed with the import.
                      </p>
                    )}
                  </div>
                )}
              </Card>
            )}

            {/* Members to Add */}
            {preview.toAdd.length > 0 && (
              <Card className="p-4 border-success">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => toggleSection('toAdd')}
                >
                  <span className="badge badge-success">To Add: {preview.toAdd.length}</span>
                  {expandedSections.toAdd ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
                {expandedSections.toAdd && (
                  <div className="mt-4 max-h-60 overflow-y-auto">
                    <div className="relative w-full overflow-x-auto">
                      <table className="table">
                        <thead>
                          <tr className="hover">
                            <th className="text-base-content font-medium whitespace-nowrap">
                              Service #
                            </th>
                            <th className="text-base-content font-medium whitespace-nowrap">
                              Rank
                            </th>
                            <th className="text-base-content font-medium whitespace-nowrap">
                              Name
                            </th>
                            <th className="text-base-content font-medium whitespace-nowrap">
                              Division
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {preview.toAdd.slice(0, 10).map((member, idx) => (
                            <tr key={idx} className="hover">
                              <td className="whitespace-nowrap">{member.serviceNumber}</td>
                              <td className="whitespace-nowrap">{member.rank}</td>
                              <td className="whitespace-nowrap">
                                {member.firstName} {member.lastName}
                              </td>
                              <td className="whitespace-nowrap">{member.department}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {preview.toAdd.length > 10 && (
                      <p className="text-sm text-base-content/60 mt-2 text-center">
                        ... and {preview.toAdd.length - 10} more
                      </p>
                    )}
                  </div>
                )}
              </Card>
            )}

            {/* Members to Update */}
            {preview.toUpdate.length > 0 && (
              <Card className="p-4 border-info">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => toggleSection('toUpdate')}
                >
                  <span className="badge badge-info">To Update: {preview.toUpdate.length}</span>
                  {expandedSections.toUpdate ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
                {expandedSections.toUpdate && (
                  <div className="mt-4 max-h-60 overflow-y-auto">
                    <div className="relative w-full overflow-x-auto">
                      <table className="table">
                        <thead>
                          <tr className="hover">
                            <th className="text-base-content font-medium whitespace-nowrap">
                              Service #
                            </th>
                            <th className="text-base-content font-medium whitespace-nowrap">
                              Name
                            </th>
                            <th className="text-base-content font-medium whitespace-nowrap">
                              Changes
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {preview.toUpdate.slice(0, 10).map((update, idx) => (
                            <tr key={idx} className="hover">
                              <td className="whitespace-nowrap">{update.current.serviceNumber}</td>
                              <td className="whitespace-nowrap">
                                {update.current.firstName} {update.current.lastName}
                              </td>
                              <td className="whitespace-nowrap text-xs">
                                <ul className="list-disc list-inside">
                                  {update.changes.slice(0, 3).map((change, i) => (
                                    <li key={i}>{change}</li>
                                  ))}
                                </ul>
                                {update.changes.length > 3 && (
                                  <span className="text-base-content/60">
                                    ... and {update.changes.length - 3} more
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {preview.toUpdate.length > 10 && (
                      <p className="text-sm text-base-content/60 mt-2 text-center">
                        ... and {preview.toUpdate.length - 10} more
                      </p>
                    )}
                  </div>
                )}
              </Card>
            )}

            {/* Members to Review (Not in CSV) */}
            {preview.toReview.length > 0 && (
              <Card className="p-4 border-warning">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => toggleSection('toReview')}
                >
                  <span className="badge badge-warning">Not in CSV: {preview.toReview.length}</span>
                  {expandedSections.toReview ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
                {expandedSections.toReview && (
                  <div className="mt-4 max-h-60 overflow-y-auto">
                    <p className="text-sm text-base-content/60 mb-2">
                      Select members to deactivate (not found in CSV):
                    </p>
                    <div className="relative w-full overflow-x-auto">
                      <table className="table">
                        <thead>
                          <tr className="hover">
                            <th className="text-base-content font-medium whitespace-nowrap w-12">
                              Deactivate
                            </th>
                            <th className="text-base-content font-medium whitespace-nowrap">
                              Service #
                            </th>
                            <th className="text-base-content font-medium whitespace-nowrap">
                              Rank
                            </th>
                            <th className="text-base-content font-medium whitespace-nowrap">
                              Name
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {preview.toReview.map((member) => (
                            <tr key={member.id} className="hover">
                              <td className="whitespace-nowrap">
                                <input
                                  type="checkbox"
                                  checked={selectedDeactivateIds.has(member.id)}
                                  onChange={() => toggleDeactivate(member.id)}
                                  className="h-4 w-4"
                                />
                              </td>
                              <td className="whitespace-nowrap">{member.serviceNumber}</td>
                              <td className="whitespace-nowrap">{member.rank}</td>
                              <td className="whitespace-nowrap">
                                {member.firstName} {member.lastName}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </Card>
            )}
          </div>
        )}

        {/* Step 3: Complete */}
        {step === 3 && result && (
          <div className="space-y-4 text-center py-8">
            <CheckCircle2 className="h-16 w-16 text-success mx-auto" />
            <h3 className="text-2xl font-semibold">Import Complete!</h3>
            <div className="flex justify-center flex-wrap gap-6 text-lg">
              {result.divisionsCreated > 0 && (
                <div>
                  <span className="font-semibold text-purple-600">{result.divisionsCreated}</span>{' '}
                  division{result.divisionsCreated > 1 ? 's' : ''} created
                </div>
              )}
              <div>
                <span className="font-semibold text-success">{result.added}</span> added
              </div>
              <div>
                <span className="font-semibold text-blue-600">{result.updated}</span> updated
              </div>
              {result.deactivated > 0 && (
                <div>
                  <span className="font-semibold text-warning">{result.deactivated}</span>{' '}
                  deactivated
                </div>
              )}
              {result.excluded > 0 && (
                <div>
                  <span className="font-semibold text-base-content/60">{result.excluded}</span>{' '}
                  excluded
                </div>
              )}
            </div>
            {executionErrors.length > 0 && (
              <div className="alert alert-warning text-left mt-6">
                <AlertCircle className="h-4 w-4" />
                <div>
                  <h4 className="font-semibold">
                    Import completed with {executionErrors.length} issue
                    {executionErrors.length === 1 ? '' : 's'}
                  </h4>
                  <ul className="mt-2 list-disc list-inside text-sm">
                    {executionErrors.slice(0, 5).map((error, index) => (
                      <li key={`${error.field}-${error.row}-${index}`}>{error.message}</li>
                    ))}
                  </ul>
                  {executionErrors.length > 5 && (
                    <p className="text-sm mt-1">
                      ...and {executionErrors.length - 5} more issue
                      {executionErrors.length - 5 === 1 ? '' : 's'}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {step === 1 && (
            <>
              <button className="btn btn-outline btn-md" onClick={handleClose}>
                Cancel
              </button>
              <button
                className="btn btn-primary btn-md"
                onClick={handlePreview}
                disabled={!csvText || importPreview.isPending}
              >
                {importPreview.isPending && <ButtonSpinner />}
                Next
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <button className="btn btn-outline btn-md" onClick={() => setStep(1)}>
                Back
              </button>
              <button
                className="btn btn-primary btn-md"
                onClick={handleExecute}
                disabled={!canProceed || executeImport.isPending}
              >
                {executeImport.isPending && <ButtonSpinner />}
                {excludedErrorRows.size > 0
                  ? `Execute Import (Excluding ${excludedErrorRows.size} Row${excludedErrorRows.size > 1 ? 's' : ''})`
                  : 'Execute Import'}
              </button>
            </>
          )}

          {step === 3 && (
            <>
              <button className="btn btn-outline btn-md" onClick={handleImportAnother}>
                Import Another
              </button>
              <button className="btn btn-primary btn-md" onClick={handleClose}>
                Done
              </button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
