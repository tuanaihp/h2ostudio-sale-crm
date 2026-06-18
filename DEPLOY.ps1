# =====================================================
# H2O Studio - Deploy len Vercel
# Chay script nay trong PowerShell tai thu muc du an
# =====================================================

$ProjectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectDir

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  H2O STUDIO - Deploy Webapp len Vercel        " -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# ---- Kiem tra Vercel CLI ----
$vercelCmd = Get-Command vercel -ErrorAction SilentlyContinue
if (-not $vercelCmd) {
    Write-Host "Dang cai Vercel CLI..." -ForegroundColor Yellow
    npm install -g vercel 2>&1 | Out-Null
    Write-Host "  Da cai xong!" -ForegroundColor Green
}

# ---- BUOC 1: Dang nhap Vercel ----
Write-Host "[Buoc 1/2] Dang nhap Vercel..." -ForegroundColor Yellow
Write-Host ""
Write-Host "  -> Trinh duyet se tu dong mo ra" -ForegroundColor Gray
Write-Host "  -> Ban chon tai khoan Vercel de dang nhap" -ForegroundColor Gray
Write-Host ""

$whoami = vercel whoami 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  Da dang nhap roi: $whoami" -ForegroundColor Green
} else {
    vercel login
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "  LOI: Dang nhap that bai. Hay thu lai." -ForegroundColor Red
        Read-Host "Nhan Enter de dong"
        exit 1
    }
}

Write-Host ""

# ---- BUOC 2: Deploy ----
Write-Host "[Buoc 2/2] Dang deploy webapp..." -ForegroundColor Yellow
Write-Host ""
Write-Host "  (Co the mat 2-3 phut, vui long doi...)" -ForegroundColor Gray
Write-Host ""

vercel --prod --yes

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "================================================" -ForegroundColor Green
    Write-Host "  HOAN THANH! Webapp da LIVE!                  " -ForegroundColor Green
    Write-Host "================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Link webapp cua ban duoc hien o tren ^" -ForegroundColor Cyan
    Write-Host "(Dang dang: https://ten-gi-do.vercel.app)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "--- BUOC TIEP THEO (tuy chon) ---" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Ket noi GitHub de tu dong deploy khi cap nhat code:" -ForegroundColor White
    Write-Host "  1. Vao vercel.com -> Project -> Settings -> Git" -ForegroundColor Gray
    Write-Host "  2. Connect to GitHub -> Chon repo cua ban" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Them AI Chatbot (Gemini API Key):" -ForegroundColor White
    Write-Host "  1. Lay key mien phi tai: aistudio.google.com/apikey" -ForegroundColor Gray
    Write-Host "  2. Vercel -> Project -> Settings -> Environment Variables" -ForegroundColor Gray
    Write-Host "  3. Them: GEMINI_API_KEY = AIza..." -ForegroundColor Gray
    Write-Host "  4. Bam Redeploy" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "Deploy gap loi. Hay chup man hinh loi va lien he ho tro." -ForegroundColor Red
}

Read-Host "Nhan Enter de dong cua so"
