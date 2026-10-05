# Tiny static file server for testing the game on http://localhost:8765 (no installs needed).
param([int]$Port=8765)
$root = Join-Path $PSScriptRoot "..\game" | Resolve-Path
$l = New-Object System.Net.HttpListener
$l.Prefixes.Add("http://localhost:$Port/")
$l.Start()
Write-Host "Serving $root on http://localhost:$Port/"
$types = @{".html"="text/html; charset=utf-8";".js"="application/javascript";".css"="text/css";".png"="image/png";".jpg"="image/jpeg";".json"="application/json";".glb"="model/gltf-binary";".gltf"="model/gltf+json";".svg"="image/svg+xml"}
while ($l.IsListening) {
  $ctx = $l.GetContext()
  $path = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart('/'))
  if ($path -eq "") { $path = "index.html" }
  $file = Join-Path $root $path
  if ((Test-Path $file -PathType Leaf) -and ([IO.Path]::GetFullPath($file).StartsWith([string]$root))) {
    $bytes = [IO.File]::ReadAllBytes($file)
    $ext = [IO.Path]::GetExtension($file).ToLower()
    $ctx.Response.ContentType = if ($types[$ext]) { $types[$ext] } else { "application/octet-stream" }
    $ctx.Response.Headers.Add("Cache-Control","no-store")
    $ctx.Response.OutputStream.Write($bytes,0,$bytes.Length)
  } else { $ctx.Response.StatusCode = 404 }
  $ctx.Response.Close()
}
