#!/usr/bin/env pwsh
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

param(
  [string]$Repo = ""
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = ""
try {
  $RepoRoot = (git -C $ScriptDir rev-parse --show-toplevel).Trim()
}
catch {
  $RepoRoot = (Resolve-Path (Join-Path $ScriptDir '..\..')).Path
}
Set-Location $RepoRoot

if ([string]::IsNullOrWhiteSpace($Repo)) {
  $Repo = gh repo view --json nameWithOwner --jq .nameWithOwner
}

$Owner = $Repo.Split('/')[0]
$ProjectOwner = if ($env:PROJECT_OWNER) { $env:PROJECT_OWNER } else { $Owner.ToLowerInvariant() }
$ProjectTitle = 'Sentinel Development'
$LabelsPath = Join-Path $RepoRoot '.github/labels.solo-workflow.json'
$CurrentReleaseVersion = if ($env:CURRENT_RELEASE_VERSION) { $env:CURRENT_RELEASE_VERSION } else { (Get-Content package.json | ConvertFrom-Json).version }
$CurrentReleaseVersion = $CurrentReleaseVersion.TrimStart('v')
if ($CurrentReleaseVersion -notmatch '^\d+\.\d+\.\d+$') {
  throw "CURRENT_RELEASE_VERSION must be SemVer X.Y.Z; got: $CurrentReleaseVersion"
}
$versionParts = $CurrentReleaseVersion.Split('.')
$major = [int]$versionParts[0]
$minor = [int]$versionParts[1]
$patch = [int]$versionParts[2]
$ReleaseMilestones = @(
  "v$major.$minor.$patch",
  "v$major.$minor.$($patch + 1)",
  "v$major.$($minor + 1).0",
  "v$($major + 1).0.0"
)

if (-not (Test-Path $LabelsPath)) {
  throw "Labels file not found: $LabelsPath"
}

Write-Host "Configuring repo: $Repo"
Write-Host "Project owner: $ProjectOwner"
Write-Host "Release set: $($ReleaseMilestones -join ', ')"

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

foreach ($ms in $ReleaseMilestones) {
  $milestones = gh api "repos/$Repo/milestones?state=all&per_page=100" --jq '.[].title'
  if ($milestones -contains $ms) {
    Write-Host "Milestone exists: $ms"
  }
  else {
    gh api --method POST "repos/$Repo/milestones" -f "title=$ms" | Out-Null
    Write-Host "Created milestone: $ms"
  }
}

$projectNumber = gh project list --owner $ProjectOwner --limit 100 --format json --jq ".projects[] | select(.title == \"$ProjectTitle\") | .number" | Select-Object -First 1
if ([string]::IsNullOrWhiteSpace($projectNumber)) {
  gh project create --owner $ProjectOwner --title $ProjectTitle | Out-Null
  $projectNumber = gh project list --owner $ProjectOwner --limit 100 --format json --jq ".projects[] | select(.title == \"$ProjectTitle\") | .number" | Select-Object -First 1
  Write-Host "Created project: $ProjectTitle (#$projectNumber)"
} else {
  Write-Host "Project exists: $ProjectTitle (#$projectNumber)"
}

gh project link $projectNumber --owner $ProjectOwner --repo $Repo | Out-Null

$releaseFieldId = gh project field-list $projectNumber --owner $ProjectOwner --format json --jq '.fields[] | select(.name == "Release") | .id' | Select-Object -First 1
if ([string]::IsNullOrWhiteSpace($releaseFieldId)) {
  gh project field-create $projectNumber --owner $ProjectOwner --name 'Release' --data-type 'SINGLE_SELECT' --single-select-options ($ReleaseMilestones -join ',') | Out-Null
  $releaseFieldId = gh project field-list $projectNumber --owner $ProjectOwner --format json --jq '.fields[] | select(.name == "Release") | .id' | Select-Object -First 1
}

if (-not [string]::IsNullOrWhiteSpace($releaseFieldId)) {
  $current = $ReleaseMilestones[0]
  $nextPatch = $ReleaseMilestones[1]
  $nextMinor = $ReleaseMilestones[2]
  $nextMajor = $ReleaseMilestones[3]
  $mutation = @'
mutation($fieldId:ID!){
  updateProjectV2Field(input:{
    fieldId:$fieldId,
    name:"Release",
    singleSelectOptions:[
      {name:"__CURRENT__",description:"Current release",color:GRAY},
      {name:"__PATCH__",description:"Patch release",color:BLUE},
      {name:"__MINOR__",description:"Minor release",color:YELLOW},
      {name:"__MAJOR__",description:"Major release",color:RED}
    ]
  }){
    projectV2Field{
      ... on ProjectV2SingleSelectField{
        id
        name
        options{ id name }
      }
    }
  }
}
'@
  $mutation = $mutation.Replace('__CURRENT__', $current).Replace('__PATCH__', $nextPatch).Replace('__MINOR__', $nextMinor).Replace('__MAJOR__', $nextMajor)
  gh api graphql -f query="$mutation" -f fieldId="$releaseFieldId" | Out-Null
  Write-Host "Synced Release field options: $($ReleaseMilestones -join ', ')"
}

Write-Host "Done. Complete columns, auto-add workflow, and saved views via docs/WORKFLOW.md checklist."
