#!/usr/bin/env pwsh
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

param(
  [string]$Repo = ""
)

if ([string]::IsNullOrWhiteSpace($Repo)) {
  $Repo = gh repo view --json nameWithOwner --jq .nameWithOwner
}

$Owner = $Repo.Split('/')[0]
$ProjectTitle = 'Sentinel Development'
$LabelsPath = '.github/labels.solo-workflow.json'

if (-not (Test-Path $LabelsPath)) {
  throw "Labels file not found: $LabelsPath"
}

$labels = Get-Content $LabelsPath | ConvertFrom-Json
$existing = gh label list --repo $Repo --limit 500 --json name --jq '.[].name'

foreach ($label in $labels) {
  if ($existing -contains $label.name) {
    gh label edit $label.name --repo $Repo --color $label.color --description $label.description | Out-Null
    Write-Host "Updated label: $($label.name)"
  }
  else {
    gh label create $label.name --repo $Repo --color $label.color --description $label.description | Out-Null
    Write-Host "Created label: $($label.name)"
  }
}

foreach ($ms in @('v0.6', 'v0.7', 'v1.0')) {
  $milestones = gh api "repos/$Repo/milestones?state=all&per_page=100" --jq '.[].title'
  if ($milestones -contains $ms) {
    Write-Host "Milestone exists: $ms"
  }
  else {
    gh api --method POST "repos/$Repo/milestones" -f "title=$ms" | Out-Null
    Write-Host "Created milestone: $ms"
  }
}

$projectNumber = gh project list --owner $Owner --limit 100 --format json --jq ".projects[] | select(.title == \"$ProjectTitle\") | .number" | Select-Object -First 1
if ([string]::IsNullOrWhiteSpace($projectNumber)) {
  gh project create --owner $Owner --title $ProjectTitle | Out-Null
  $projectNumber = gh project list --owner $Owner --limit 100 --format json --jq ".projects[] | select(.title == \"$ProjectTitle\") | .number" | Select-Object -First 1
  Write-Host "Created project: $ProjectTitle (#$projectNumber)"
} else {
  Write-Host "Project exists: $ProjectTitle (#$projectNumber)"
}

gh project link $projectNumber --owner $Owner --repo $Repo | Out-Null

Write-Host "Done. Complete columns, auto-add workflow, and saved views via docs/WORKFLOW.md checklist."
