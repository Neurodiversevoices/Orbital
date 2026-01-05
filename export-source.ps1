$outputFile = "orbital_current.txt"
$extensions = @("*.js", "*.jsx", "*.ts", "*.tsx", "*.css", "*.json")

# Clear output file
"" | Out-File -FilePath $outputFile -Encoding UTF8

Get-ChildItem -Recurse -Include $extensions -File | Where-Object {
    $path = $_.FullName
    # Exclude node_modules, .expo, android, ios, .git directories
    -not ($path -like "*\node_modules\*" -or
          $path -like "*\.expo\*" -or
          $path -like "*\android\*" -or
          $path -like "*\ios\*" -or
          $path -like "*\.git\*")
} | ForEach-Object {
    "`n[FILE: $($_.FullName)]`n" | Out-File -FilePath $outputFile -Append -Encoding UTF8
    Get-Content -LiteralPath $_.FullName -ErrorAction SilentlyContinue | Out-File -FilePath $outputFile -Append -Encoding UTF8
}

Write-Host "Done! Output written to $outputFile"
$fileCount = (Get-Content $outputFile | Select-String -Pattern "^\[FILE:").Count
Write-Host "Total files: $fileCount"
