# Source and destination folders
$sourceFolder = "."
$tempFolderChrome = "temp_extension_chrome"
$tempFolderFirefox = "temp_extension_firefox"

# Files and folders to include
$filesToInclude = @(
    "manifest.json",
    "background.js",
    "content.js",
    "_locales",
    "images"
)

# Get the version from manifest.json
$manifestPath = Join-Path $sourceFolder "manifest.json"
$manifestContent = Get-Content $manifestPath -Raw | ConvertFrom-Json
$version = $manifestContent.version

# ===== CREATE CHROME VERSION =====
Write-Host "Creating Chrome version..." -ForegroundColor Cyan

# Create temporary directory for Chrome
New-Item -ItemType Directory -Force -Path $tempFolderChrome | Out-Null

# Copy files and folders to the temporary directory
foreach ($item in $filesToInclude) {
    $sourcePath = Join-Path $sourceFolder $item
    $destinationPath = Join-Path $tempFolderChrome $item
    Copy-Item -Path $sourcePath -Destination $destinationPath -Recurse -Force
}

# Create the Chrome zip file
$zipFileNameChrome = "v$($version)-chrome.zip"
$zipFilePathChrome = Join-Path $sourceFolder $zipFileNameChrome
Compress-Archive -Path "$tempFolderChrome/*" -DestinationPath $zipFilePathChrome -Force

# Remove the temporary Chrome directory
Remove-Item -Path $tempFolderChrome -Recurse -Force

Write-Host "Successfully created $($zipFileNameChrome)" -ForegroundColor Green

# ===== CREATE FIREFOX VERSION =====
Write-Host "`nCreating Firefox version..." -ForegroundColor Cyan

# Create temporary directory for Firefox
New-Item -ItemType Directory -Force -Path $tempFolderFirefox | Out-Null

# Copy files and folders to the temporary directory
foreach ($item in $filesToInclude) {
    $sourcePath = Join-Path $sourceFolder $item
    $destinationPath = Join-Path $tempFolderFirefox $item
    Copy-Item -Path $sourcePath -Destination $destinationPath -Recurse -Force
}

# Modify manifest.json for Firefox (change service_worker back to scripts)
$firefoxManifestPath = Join-Path $tempFolderFirefox "manifest.json"
$firefoxManifestContent = Get-Content $firefoxManifestPath -Raw | ConvertFrom-Json

# Convert background.service_worker to background.scripts for Firefox
if ($firefoxManifestContent.background.service_worker) {
    $scriptFile = $firefoxManifestContent.background.service_worker
    $firefoxManifestContent.background.PSObject.Properties.Remove('service_worker')
    $firefoxManifestContent.background | Add-Member -NotePropertyName 'scripts' -NotePropertyValue @($scriptFile)
}

# Save the modified manifest for Firefox
$firefoxManifestContent | ConvertTo-Json -Depth 10 | Set-Content $firefoxManifestPath -Encoding UTF8

# Create the Firefox zip file
$zipFileNameFirefox = "v$($version)-firefox.zip"
$zipFilePathFirefox = Join-Path $sourceFolder $zipFileNameFirefox
Compress-Archive -Path "$tempFolderFirefox/*" -DestinationPath $zipFilePathFirefox -Force

# Remove the temporary Firefox directory
Remove-Item -Path $tempFolderFirefox -Recurse -Force

Write-Host "Successfully created $($zipFileNameFirefox)" -ForegroundColor Green

Write-Host "`n✓ Release packages created successfully!" -ForegroundColor Yellow
Write-Host "  - Chrome: $($zipFileNameChrome)" -ForegroundColor White
Write-Host "  - Firefox: $($zipFileNameFirefox)" -ForegroundColor White