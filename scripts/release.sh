#!/usr/bin/env bash
# Tek komutla yeni sürüm paketleme scripti.
#
# Kullanım (Git Bash):
#   scripts/release.sh 0.2.0 "Hata giderimi ve yeni özellikler"
#
# Ne yapar:
#   1. tauri.conf.json ve Cargo.toml içindeki version alanını günceller
#   2. Rust ve TS build yapar, imzalı NSIS installer + .sig üretir
#   3. latest.json manifestini GitHub release URL'leri ile oluşturur
#   4. dist-release/ içine 3 dosyayı toplar (exe, sig, latest.json)
#   5. Bir sonraki adımı ekrana basar (git tag + GitHub release upload)

set -euo pipefail

VERSION="${1:-}"
NOTES="${2:-}"
if [ -z "$VERSION" ]; then
  echo "Kullanım: scripts/release.sh <version> [notes]"
  echo "Örnek:    scripts/release.sh 0.2.0 \"UI iyileştirmeleri\""
  exit 1
fi

REPO="tahatolga/teklif_asistani"
KEY_PATH="${HOME}/.tauri/teklif_asistani.key"
if [ ! -f "$KEY_PATH" ]; then
  echo "HATA: İmzalama anahtarı bulunamadı: $KEY_PATH"
  echo "Oluştur: npx @tauri-apps/cli signer generate -w $KEY_PATH -p \"\""
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo ">> Version $VERSION için release hazırlanıyor"

# 1. Versiyonu güncelle
node -e "
  const fs = require('fs');
  for (const f of ['src-tauri/tauri.conf.json', 'package.json']) {
    const j = JSON.parse(fs.readFileSync(f, 'utf8'));
    j.version = '$VERSION';
    fs.writeFileSync(f, JSON.stringify(j, null, 2) + '\n');
  }
"
sed -i "s/^version = \".*\"/version = \"$VERSION\"/" src-tauri/Cargo.toml

# 2. Build
export PATH="/c/Users/Tolga/.cargo/bin:$PATH"
export TAURI_SIGNING_PRIVATE_KEY="$(cat "$KEY_PATH")"
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD=""

echo ">> Tauri build başlıyor (3-8 dk sürebilir)..."
npm run tauri build

EXE="src-tauri/target/release/bundle/nsis/fikstur-teklif-asistani_${VERSION}_x64-setup.exe"
SIG="${EXE}.sig"

if [ ! -f "$EXE" ] || [ ! -f "$SIG" ]; then
  echo "HATA: Beklenen çıktılar bulunamadı:"
  echo "  $EXE"
  echo "  $SIG"
  exit 1
fi

# 3. latest.json oluştur
SIG_CONTENT="$(cat "$SIG")"
PUBDATE="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
DIST="dist-release"
mkdir -p "$DIST"

cat > "$DIST/latest.json" <<EOF
{
  "version": "$VERSION",
  "notes": "${NOTES//\"/\\\"}",
  "pub_date": "$PUBDATE",
  "platforms": {
    "windows-x86_64": {
      "signature": "$SIG_CONTENT",
      "url": "https://github.com/$REPO/releases/download/v$VERSION/fikstur-teklif-asistani_${VERSION}_x64-setup.exe"
    }
  }
}
EOF

cp "$EXE" "$DIST/"
cp "$SIG" "$DIST/"

echo ""
echo ">> Hazır dosyalar:"
ls -lh "$DIST"
echo ""
echo ">> Şimdi yapman gereken:"
echo ""
echo "  1. Değişiklikleri commit et:"
echo "       git add src-tauri/tauri.conf.json src-tauri/Cargo.toml src-tauri/Cargo.lock package.json"
echo "       git commit -m \"chore: bump version to $VERSION\""
echo "       git tag v$VERSION"
echo "       git push && git push --tags"
echo ""
echo "  2. GitHub CLI varsa tek komutla release:"
echo "       gh release create v$VERSION \\"
echo "         --repo $REPO \\"
echo "         --title \"v$VERSION\" \\"
echo "         --notes \"${NOTES}\" \\"
echo "         $DIST/fikstur-teklif-asistani_${VERSION}_x64-setup.exe \\"
echo "         $DIST/fikstur-teklif-asistani_${VERSION}_x64-setup.exe.sig \\"
echo "         $DIST/latest.json"
echo ""
echo "  3. GitHub CLI yoksa: https://github.com/$REPO/releases/new adresine gir,"
echo "     tag olarak 'v$VERSION' seç, yukarıdaki 3 dosyayı asset olarak yükle."
echo ""
echo ">> Yüklemeden sonra kullanıcıların uygulaması otomatik güncellemeyi görecek."
