param(
    [string]$presentationPath,
    [string]$templatePath
)

try {
    $ppt = New-Object -ComObject PowerPoint.Application
    $ppt.Visible = [Microsoft.Office.Core.MsoTriState]::msoTrue
    
    $presentationPathFull = Resolve-Path $presentationPath
    $templatePathFull = Resolve-Path $templatePath

    $presentation = $ppt.Presentations.Open($presentationPathFull)
    $presentation.ApplyTemplate($templatePathFull)
    $presentation.Save()
    Write-Host "Template applied successfully."
}
catch {
    Write-Error $_.Exception.Message
}
finally {
    if ($ppt) {
        $ppt.Quit()
        [System.Runtime.Interopservices.Marshal]::ReleaseComObject($ppt) | Out-Null
    }
}
