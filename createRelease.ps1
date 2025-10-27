# Source and destination folders
$sourceFolder = "."
$tempFolder = "temp_extension"

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
$zipFileName = "v$($version).zip"

# Create temporary directory
New-Item -ItemType Directory -Force -Path $tempFolder

# Copy files and folders to the temporary directory
foreach ($item in $filesToInclude) {
    $sourcePath = Join-Path $sourceFolder $item
    $destinationPath = Join-Path $tempFolder $item
    Copy-Item -Path $sourcePath -Destination $destinationPath -Recurse -Force
}

# Create the zip file
$zipFilePath = Join-Path $sourceFolder $zipFileName
Compress-Archive -Path "$tempFolder/*" -DestinationPath $zipFilePath -Force

# Remove the temporary directory
Remove-Item -Path $tempFolder -Recurse -Force

Write-Host "Successfully created $($zipFileName) in $($sourceFolder)"