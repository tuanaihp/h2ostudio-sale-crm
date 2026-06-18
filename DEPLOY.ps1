# =====================================================
# H2O Studio - Deploy len Vercel (Project MOI)
# =====================================================

$ProjectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectDir

$NewProjectName = "h2ostudio-sale-crm"

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  H2O STUDIO - Deploy project MOI len Vercel   " -ForegroundColor Cyan
Write-Host "  Ten project: $NewProjectName                 " -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Xoa link vercel cu neu co
if (Test-Path ".vercel") {
    Remove-Item -Recurse -Force ".vercel"
    Write-Host "  Da xoa link vercel cu." -ForegroundColor Gray
}

# ---- Kiem tra Vercel CLI ----
$vercelCmd = Get-Command vercel -ErrorAction SilentlyContinue
if (-not $vercelCmd) {
    Write-Host "Dang cai Vercel CLI..." -ForegroundColor Yellow
    npm install -g vercel 2>&1 | Out-Null
}

# ---- Dang nhap Vercel ----
Write-Host "[Buoc 1/2] Kiem tra dang nhap Vercel..." -ForegroundColor Yellow
$whoami = vercel whoami 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  Da dang nhap: $whoami" -ForegroundColor Green
} else {
    Write-Host "  Can dang nhap - kiem tra Gmail sau khi chay lenh nay..." -ForegroundColor Gray
    vercel login maxsamuelbldhp@gmail.com
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Dang nhap that bai. Thu lai." -ForegroundColor Red
        Read-Host "Nhan Enter de dong"
        exit 1
    }
}

Write-Host ""

# ---- Deploy project MOI ----
Write-Host "[Buoc 2/2] Dang tao va deploy project MOI..." -ForegroundColor Yellow
Write-Host "  Ten: $NewProjectName" -ForegroundColor Gray
Write-Host "  (Co the mat 3-5 phut...)" -ForegroundColor Gray
Write-Host ""

vercel --prod --yes

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "================================================" -ForegroundColor Green
    Write-Host "  HOAN THANH! Webapp MOI da LIVE!              " -ForegroundColor Green
    Write-Host "================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Link webapp MOI o tren ^ (h2ostudio-sale-crm.vercel.app)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "--- SAU NAY KHI MUON CAP NHAT CODE ---" -ForegroundColor Yellow
    Write-Host "  Chay lai lenh nay: vercel --prod --yes" -ForegroundColor White
    Write-Host ""
    Write-Host "--- THEM AI CHATBOT (GEMINI) ---" -ForegroundColor Yellow
    Write-Host "  1. Lay key tai: aistudio.google.com/apikey" -ForegroundColor White
    Write-Host "  2. Vercel Dashboard -> h2ostudio-sale-crm -> Settings -> Environment Variables" -ForegroundColor White
    Write-Host "  3. Them: GEMINI_API_KEY = AIza..." -ForegroundColor White
    Write-Host "  4. Bam Redeploy" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "Co loi xay ra. Chup man hinh va lien he ho tro." -ForegroundColor Red
}

Read-Host "Nhan Enter de dong"
