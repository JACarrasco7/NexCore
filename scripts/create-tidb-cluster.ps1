$pair = "C36ENRO0:aa0e2f3c-4d55-4080-96e7-4429e27e1bf9"
$auth = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($pair))
$headers = @{
    Authorization = "Basic $auth"
    "Content-Type" = "application/json"
}

# Crear cluster serverless
$clusterBody = @{
    name = "nexcore-db"
    clusterType = "DEVELOPER"
    config = @{
        regionName = "us-east-1"
        cloudProvider = "AWS"
    }
} | ConvertTo-Json -Compress

Write-Host "Creando cluster..."
try {
    $result = Invoke-RestMethod -Uri "https://api.tidbcloud.com/api/v1beta/projects/1372813089454786991/clusters" -Method POST -Headers $headers -Body $clusterBody
    Write-Host "Cluster creado:"
    $result | ConvertTo-Json -Depth 5
    # Guardar ID del cluster
    $result.id | Out-File -FilePath "c:\laragon\www\app_fitness\scripts\cluster-id.txt"
} catch {
    Write-Host "ERROR: $($_.Exception.Message)"
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $responseBody = $reader.ReadToEnd()
    Write-Host "Body: $responseBody"
}
