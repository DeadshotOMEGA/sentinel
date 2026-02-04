'use client'

import React, { useState } from 'react'
import { useImportPreview, useExecuteImport } from '@/hooks/use-members'
import type { PreviewImportResponse } from '@sentinel/contracts'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  FolderPlus,
} from 'lucide-react'

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
      setStep(2)
    } catch (error) {
      console.error('Failed to preview import:', error)
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
      setStep(3)
    } catch (error) {
      console.error('Failed to execute import:', error)
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
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Nominal Roll</DialogTitle>
          <DialogDescription>
            Import members from Nominal Roll CSV file
            <Badge variant="outline" className="ml-2">
              Step {step} of 3
            </Badge>
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Upload CSV */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="csv-file" className="text-sm font-medium">
                Select CSV File
              </label>
              <Input
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
              <Card className="p-4 border-purple-500">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => toggleSection('divisions')}
                >
                  <div className="flex items-center gap-2">
                    <FolderPlus className="h-5 w-5 text-purple-600" />
                    <h3 className="font-semibold text-purple-600">
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
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead className="text-right">Members</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {preview.divisionsToCreate.map((div) => (
                          <TableRow key={div.code}>
                            <TableCell className="font-mono font-medium">{div.code}</TableCell>
                            <TableCell>{div.name}</TableCell>
                            <TableCell className="text-right">{div.memberCount}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
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
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {excludableErrors.length > 0 && (
                            <TableHead className="w-12">Exclude</TableHead>
                          )}
                          <TableHead className="w-16">Row</TableHead>
                          <TableHead>Member</TableHead>
                          <TableHead>Field</TableHead>
                          <TableHead>Error</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {preview.errors.map((error, idx) => {
                          const context = error.context
                          const memberDisplay = context
                            ? [context.rank, context.firstName, context.lastName]
                                .filter(Boolean)
                                .join(' ') || '(unknown)'
                            : '(unknown)'
                          const isExcluded = excludedErrorRows.has(error.row)

                          return (
                            <TableRow
                              key={idx}
                              className={isExcluded ? 'opacity-50 line-through' : ''}
                            >
                              {excludableErrors.length > 0 && (
                                <TableCell>
                                  {error.excludable && (
                                    <input
                                      type="checkbox"
                                      checked={isExcluded}
                                      onChange={() => toggleExcludeRow(error.row)}
                                      className="h-4 w-4"
                                      title="Exclude this row from import"
                                    />
                                  )}
                                </TableCell>
                              )}
                              <TableCell className="font-mono">{error.row}</TableCell>
                              <TableCell className="font-medium">{memberDisplay}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">
                                  {error.field}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-error">{error.message}</TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
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
              <Card className="p-4 border-green-500">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => toggleSection('toAdd')}
                >
                  <Badge variant="default" className="bg-green-600">
                    To Add: {preview.toAdd.length}
                  </Badge>
                  {expandedSections.toAdd ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
                {expandedSections.toAdd && (
                  <div className="mt-4 max-h-60 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Service #</TableHead>
                          <TableHead>Rank</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Division</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {preview.toAdd.slice(0, 10).map((member, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{member.serviceNumber}</TableCell>
                            <TableCell>{member.rank}</TableCell>
                            <TableCell>
                              {member.firstName} {member.lastName}
                            </TableCell>
                            <TableCell>{member.department}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
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
              <Card className="p-4 border-blue-500">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => toggleSection('toUpdate')}
                >
                  <Badge variant="default" className="bg-blue-600">
                    To Update: {preview.toUpdate.length}
                  </Badge>
                  {expandedSections.toUpdate ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
                {expandedSections.toUpdate && (
                  <div className="mt-4 max-h-60 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Service #</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Changes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {preview.toUpdate.slice(0, 10).map((update, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{update.current.serviceNumber}</TableCell>
                            <TableCell>
                              {update.current.firstName} {update.current.lastName}
                            </TableCell>
                            <TableCell className="text-xs">
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
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
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
              <Card className="p-4 border-yellow-500">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => toggleSection('toReview')}
                >
                  <Badge variant="default" className="bg-yellow-600">
                    Not in CSV: {preview.toReview.length}
                  </Badge>
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
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">Deactivate</TableHead>
                          <TableHead>Service #</TableHead>
                          <TableHead>Rank</TableHead>
                          <TableHead>Name</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {preview.toReview.map((member) => (
                          <TableRow key={member.id}>
                            <TableCell>
                              <input
                                type="checkbox"
                                checked={selectedDeactivateIds.has(member.id)}
                                onChange={() => toggleDeactivate(member.id)}
                                className="h-4 w-4"
                              />
                            </TableCell>
                            <TableCell>{member.serviceNumber}</TableCell>
                            <TableCell>{member.rank}</TableCell>
                            <TableCell>
                              {member.firstName} {member.lastName}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
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
          </div>
        )}

        <DialogFooter>
          {step === 1 && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handlePreview} disabled={!csvText || importPreview.isPending}>
                {importPreview.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Next
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={handleExecute} disabled={!canProceed || executeImport.isPending}>
                {executeImport.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {excludedErrorRows.size > 0
                  ? `Execute Import (Excluding ${excludedErrorRows.size} Row${excludedErrorRows.size > 1 ? 's' : ''})`
                  : 'Execute Import'}
              </Button>
            </>
          )}

          {step === 3 && (
            <>
              <Button variant="outline" onClick={handleImportAnother}>
                Import Another
              </Button>
              <Button onClick={handleClose}>Done</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
