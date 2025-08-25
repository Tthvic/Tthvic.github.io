# PowerShell script to run Jekyll server on Windows
# Make sure you have Ruby and Jekyll installed

Write-Host "Starting Jekyll development server..." -ForegroundColor Green

# Check if bundle is available
if (Get-Command "bundle" -ErrorAction SilentlyContinue) {
    Write-Host "Running: bundle exec jekyll serve --livereload" -ForegroundColor Yellow
    bundle exec jekyll serve --livereload
} elseif (Get-Command "jekyll" -ErrorAction SilentlyContinue) {
    Write-Host "Running: jekyll serve --livereload" -ForegroundColor Yellow
    jekyll serve --livereload
} else {
    Write-Host "Error: Jekyll is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Jekyll first: gem install jekyll bundler" -ForegroundColor Yellow
    exit 1
}
