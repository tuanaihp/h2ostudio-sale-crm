# =====================================================
# H2O Studio Sale Album - Deploy Script
# Chạy script này trong PowerShell tại thư mục dự án
# =====================================================

$ProjectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$GitHubUser = "tuanaihp"
$RepoName = "h2o-studio-sale-album"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  H2O STUDIO - Tu dong deploy len Vercel  " -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $ProjectDir

# ---- BUOC 1: Kiem tra va cai dat cong cu ----
Write-Host "[1/5] Kiem tra cong cu..." -ForegroundColor Yellow

$ghInstalled = Get-Command gh -ErrorAction SilentlyContinue
if (-not $ghInstalled) {
    Write-Host "    Dang cai GitHub CLI..." -ForegroundColor Gray
    winget install --id GitHub.cli --silent --accept-package-agreements --accept-source-agreements
    # Refresh PATH
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}

$vercelInstalled = Get-Command vercel -ErrorAction SilentlyContinue
if (-not $vercelInstalled) {
    Write-Host "    Dang cai Vercel CLI..." -ForegroundColor Gray
    npm install -g vercel | Out-Null
}

Write-Host "    OK - San sang!" -ForegroundColor Green

# ---- BUOC 2: Dang nhap GitHub ----
Write-Host ""
Write-Host "[2/5] Dang nhap GitHub..." -ForegroundColor Yellow
Write-Host "    Trinh duyet se mo ra -> Ban chon 'Authorize GitHub CLI'" -ForegroundColor Gray
Write-Host ""

gh auth status 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    gh auth login --web --git-protocol https
} else {
    Write-Host "    Da dang nhap GitHub roi!" -ForegroundColor Green
}

# ---- BUOC 3: Tao repo va push code ----
Write-Host ""
Write-Host "[3/5] Tao GitHub repo va push code..." -ForegroundColor Yellow

$repoExists = gh repo view "$GitHubUser/$RepoName" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "    Repo da ton tai, chi push code moi..." -ForegroundColor Gray
    git remote set-url origin "https://github.com/$GitHubUser/$RepoName.git" 2>&1 | Out-Null
} else {
    Write-Host "    Dang tao repo $RepoName..." -ForegroundColor Gray
    gh repo create $RepoName --public --source=. --remote=origin --push
}

# Push code
git push origin main --force 2>&1 | Out-Null
Write-Host "    Code da len GitHub: https://github.com/$GitHubUser/$RepoName" -ForegroundColor Green

# ---- BUOC 4: Dang nhap Vercel ----
Write-Host ""
Write-Host "[4/5] Dang nhap Vercel..." -ForegroundColor Yellow
Write-Host "    Trinh duyet se mo ra -> Ban click 'Continue with Email/GitHub'" -ForegroundColor Gray
Write-Host ""

vercel whoami 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    vercel login
} else {
    $vercelUser = vercel whoami
    Write-Host "    Da dang nhap Vercel: $vercelUser" -ForegroundColor Green
}

# ---- BUOC 5: Deploy ----
Write-Host ""
Write-Host "[5/5] Dang deploy len Vercel..." -ForegroundColor Yellow
Write-Host ""

vercel --prod --yes

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  HOAN THANH! Webapp da duoc deploy!      " -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Link webapp cua ban o tren (dang xxxxxxx.vercel.app)" -ForegroundColor Cyan
Write-Host ""
Write-Host "Buoc tiep theo - Them AI chatbot (neu can):" -ForegroundColor Yellow
Write-Host "  1. Vao vercel.com -> Project -> Settings -> Environment Variables" -ForegroundColor White
Write-Host "  2. Them: GEMINI_API_KEY = (key lay tu aistudio.google.com/apikey)" -ForegroundColor White
Write-Host "  3. Bam Redeploy" -ForegroundColor White
Write-Host ""
Write-Host "Sau nay muon cap nhat code, chi can chay:" -ForegroundColor Yellow
Write-Host "  git add . && git commit -m 'cap nhat' && git push" -ForegroundColor White
Write-Host "  (Vercel se tu dong build lai!)" -ForegroundColor Gray
Write-Host ""

Read-Host "Nhan Enter de dong cua so"
