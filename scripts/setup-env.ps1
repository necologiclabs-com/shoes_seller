# ローカル開発環境セットアップスクリプト
# Usage: . .\scripts\setup-env.ps1

Write-Host "🔧 開発環境をセットアップ中..." -ForegroundColor Green

# AWS Profile設定
$env:AWS_PROFILE = "hikaku-dev"
Write-Host "✅ AWS_PROFILE: $env:AWS_PROFILE" -ForegroundColor Cyan

# AWS認証確認
Write-Host "`n📋 AWS認証情報を確認中..." -ForegroundColor Yellow
try {
    $identity = aws sts get-caller-identity | ConvertFrom-Json
    Write-Host "✅ アカウントID: $($identity.Account)" -ForegroundColor Green
    Write-Host "✅ ユーザー: $($identity.Arn)" -ForegroundColor Green
} catch {
    Write-Host "❌ AWS認証に失敗しました" -ForegroundColor Red
    Write-Host "   aws configure --profile necomata-dev を実行してください" -ForegroundColor Yellow
    return
}

# Node.jsバージョン確認
Write-Host "`n📦 Node.jsバージョン:" -ForegroundColor Yellow
node --version

# npm バージョン確認
Write-Host "📦 npmバージョン:" -ForegroundColor Yellow
npm --version

Write-Host "`n✅ セットアップ完了！" -ForegroundColor Green
Write-Host "`n💡 よく使うコマンド:" -ForegroundColor Cyan
Write-Host "   npm run build          - TypeScriptビルド"
Write-Host "   npm run deploy         - CDKデプロイ"
Write-Host "   npm run deploy:frontend - フロントエンドデプロイ"
Write-Host "   npm run synth          - CDK Synth"
