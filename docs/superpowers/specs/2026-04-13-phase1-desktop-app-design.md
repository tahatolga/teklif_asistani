# Phase 1 — Masaüstü Teklif Yönetim Uygulaması (Tasarım Dokümanı)

**Tarih:** 2026-04-13
**Durum:** Tasarım onay bekliyor
**Kapsam:** Fikstur Teklif Asistanı — Faz 1 (sadece veri girişi, yerel depolama)

---

## 1. Amaç ve Bağlam

Kullanıcı, imalat atölyesi için teklif verilerini yapılandırılmış biçimde toplamak istiyor. Ana teknik plan (`docs/teknik-plan.md`) tam bir SaaS platformu tarif ediyor, ancak kullanıcının elinde henüz gerçek teklif verisi yok. AI modelinin eğitilebilmesi için önce **yeterli miktarda yapılandırılmış teklif verisi** birikmesi gerekiyor.

Bu nedenle Faz 1:
- Kurulumu kolay, yerel çalışan bir Windows masaüstü uygulamasıdır
- Sadece veri girişi yapar — AI, CAD/CAM analizi, PDF çıktısı YOK
- Verileri kullanıcının diskinde JSON dosyaları olarak saklar
- Kullanıcının parametreleri kendisinin tanımlamasına izin verir (her atölyenin iş yapısı farklı)
- Müşterileri ayrı tutar (gelecekte müşteri-bazlı model eğitimi için)

**Başarı metriği:** Kullanıcı bu uygulamayla birkaç ay içinde 50–200 adet yapılandırılmış teklif biriktirir. Bu veri, Faz 2'de AI modelinin eğitimi için temel oluşturur.

---

## 2. Kapsam

### Dahil

- Müşteri CRUD (oluştur, listele, düzenle, sil)
- Teklif CRUD (dinamik form, parametre kataloğu kontrolünde)
- Parametre kataloğu yönetimi (kullanıcı tanımlı, tipli)
- Arama ve filtreleme (müşteri, durum, tarih, serbest metin)
- Yedek alma ve geri yükleme (zip)
- Otomatik güncelleme (varsayılan açık)
- Akıllı ön-doldurma ve alan geçmişi
- Sadece Türkçe UI

### Hariç (Sonraki fazlar)

- AI / LLM entegrasyonu → Faz 2
- CAD / CAM dosya analizi → Faz 2
- PDF / Excel çıktı → Faz 1.5
- Excel ile toplu eski teklif aktarımı → Faz 1.5
- Çoklu kullanıcı / rol yönetimi
- Bulut senkronizasyonu
- ERP entegrasyonu
- Çoklu dil
- Telemetri / kullanım analitikleri

---

## 3. Teknoloji Yığını

### Frontend (WebView)
- **Tauri 2.x** — çerçeve
- **React 18 + Vite + TypeScript** — UI
- **Mantine v7** — bileşen kütüphanesi (form bileşenleri, DataTable, modal)
- **React Router** — yönlendirme
- **Zustand** — hafif state yönetimi
- **react-hook-form + zod** — form ve doğrulama (parametre kataloğundan dinamik zod üretilir)
- **dnd-kit** — parametre sıralama için sürükle-bırak

### Backend (Rust)
- **Tauri 2.x** komutları
- **serde / serde_json** — JSON serileştirme
- **tokio** — async IO
- **zip** crate — yedekleme
- **tracing + tracing-appender** — loglama
- **tauri-plugin-updater** — otomatik güncelleme

### Paketleme ve Dağıtım
- Tauri bundler → `.msi` (WiX tabanlı)
- Sürümleme: semver (`MAJOR.MINOR.PATCH`)
- Dağıtım: GitHub Releases + imzalı `latest.json` manifest

---

## 4. Mimari

```
┌────────────────────────────────────────────────┐
│  Frontend (WebView)                            │
│  React + Mantine + zod                         │
│  - Ekranlar, form üretimi, validasyon          │
└───────────────┬────────────────────────────────┘
                │ Tauri IPC (invoke)
                ▼
┌────────────────────────────────────────────────┐
│  Backend (Rust, Tauri commands)                │
│  - Dosya G/Ç (atomic write)                    │
│  - Parametre şema doğrulaması                  │
│  - Arama / filtreleme (in-memory)              │
│  - Yedekleme                                   │
│  - Schema migration                            │
└───────────────┬────────────────────────────────┘
                │
                ▼
         %APPDATA%\FiksturTeklifAsistani\data\
         (veya kullanıcının seçtiği klasör)
```

### Karar: in-memory arama vs tantivy
MVP için 10.000 tekliflik sınıra kadar in-memory tarama yeterli (tipik kullanım çok altında). Tantivy ileride ölçeklenebilir eklenti olarak eklenir; mimarisi aynı kalır, `search` fonksiyonunun implementasyonu değişir.

### Karar: Rust öğrenme eğrisi
Faz 1'deki Rust kodunun %90'ı "dosya oku, JSON parse et, doğrula, geri gönder" düzeyinde. İleri Rust özellikleri (lifetime heybeti, unsafe, macro'lar) gerekmiyor. Bilinçli olarak sınırlı tutuluyor.

---

## 5. Veri Modeli ve Dosya Yerleşimi

### Kök dizin
İlk açılışta kullanıcıya sorulur (varsayılan: `%APPDATA%\FiksturTeklifAsistani\data\`).

```
data\
├── app.json                       # uygulama meta (şema versiyonu, son kullanım)
├── parameters.json                # parametre kataloğu (global)
├── settings.json                  # UI ayarları
├── customers\
│   ├── {customer-slug}\
│   │   ├── customer.json
│   │   ├── proposals\
│   │   │   ├── 2026-04-13-001-flans.json
│   │   │   └── 2026-04-15-002-mil.json
│   │   └── attachments\           # boş, Faz 2'de kullanılacak
│   └── ...
├── backups\
│   └── backup-2026-04-13-0930.zip
└── logs\
    └── app.log
```

### Dosya adlandırma
- **Müşteri klasörü:** `slugify(name)`. Çakışma → `-2`, `-3`.
- **Teklif dosyası:** `{YYYY-MM-DD}-{seq}-{slug}.json`. `seq` = o müşteri için o gün ki sıra numarası. Slug başlıktan üretilir, yalnızca dosya gezgini göz kontrolü için.

### `parameters.json`
```json
{
  "schema_version": 1,
  "updated_at": "2026-04-13T09:30:00+03:00",
  "parameters": [
    {
      "key": "malzeme",
      "label": "Malzeme",
      "description": "Parçanın üretileceği hammadde",
      "type": "select",
      "options": ["Çelik 1045", "Al 6061", "Paslanmaz 304"],
      "unit": null,
      "required": true,
      "order": 1
    },
    {
      "key": "adet",
      "label": "Adet",
      "description": "Sipariş miktarı",
      "type": "number",
      "unit": "adet",
      "min": 1,
      "max": null,
      "required": true,
      "order": 2
    }
  ]
}
```

**Parametre tipleri:** `text`, `textarea`, `number`, `select`, `multiselect`, `boolean`, `date`.

**Tipe özgü ek alanlar:**
- `number`: `min`, `max`, `unit`
- `select` / `multiselect`: `options` (string listesi)
- `text` / `textarea`: `max_length` (opsiyonel)

### `customer.json`
```json
{
  "id": "acme-makina-as",
  "schema_version": 1,
  "name": "ACME Makina A.Ş.",
  "contact_person": "Ali Yılmaz",
  "email": "ali@acme.com",
  "phone": "+90 216 555 00 00",
  "address": "İstanbul",
  "tax_office": "Kadıköy",
  "tax_no": "1234567890",
  "notes": "",
  "created_at": "2026-04-13T09:30:00+03:00",
  "updated_at": "2026-04-13T09:30:00+03:00"
}
```

### Teklif JSON
```json
{
  "id": "prop-20260413-001",
  "schema_version": 1,
  "customer_id": "acme-makina-as",
  "title": "Flanş 10 adet",
  "status": "taslak",
  "created_at": "2026-04-13T09:30:00+03:00",
  "updated_at": "2026-04-13T09:35:00+03:00",
  "total_amount": 12500.00,
  "currency": "TRY",
  "notes": "Acil sipariş",
  "custom_fields": {
    "malzeme": "Çelik 1045",
    "adet": 10
  },
  "parameter_snapshot": [
    {"key": "malzeme", "label": "Malzeme", "type": "select"},
    {"key": "adet", "label": "Adet", "type": "number", "unit": "adet"}
  ]
}
```

### `parameter_snapshot` — neden?
Her teklif, kaydedildiği anda aktif parametrelerin minyatür kopyasını içerir. Kullanıcı sonra `parameters.json`'dan "malzeme" parametresini silse bile eski teklif tam olarak okunabilir kalır. Geçmiş teklifler asla "kırılmaz".

### Durum enum
`taslak`, `gonderildi`, `kazanildi`, `kaybedildi`, `beklemede`.

### Şema versiyonlama
Her dosyada `schema_version` alanı var. Uygulama açılışta versiyon farkı görürse otomatik migration çalıştırır. Bozuk dosya bulunursa `corrupt\` klasörüne taşınır ve kullanıcıya uyarı gösterilir.

---

## 6. Ekranlar ve Yönlendirme

Sol dikey menü + sağ içerik düzeni.

### 6.1 Özet (Dashboard) — `/`
- 4 kart: toplam müşteri, toplam teklif, bu ay teklif sayısı, kazanılan teklif oranı
- Son 10 teklif (müşteri, başlık, tutar, tarih, durum)
- Boş durum mesajı: "Henüz teklif yok — ilk müşterini ekleyerek başla"

### 6.2 Müşteriler — `/customers`
- Tablo: ad, iletişim kişisi, telefon, teklif sayısı, son aktivite
- Arama kutusu, "Yeni Müşteri" butonu
- Satır → `/customers/:id`
  - Müşteri bilgileri (düzenle / sil)
  - O müşterinin teklifleri listesi
  - "Bu müşteri için yeni teklif" butonu

### 6.3 Teklifler — `/proposals`
- Tablo: tarih, müşteri, başlık, tutar, durum, eylemler
- Filtreler: müşteri dropdown, durum chip'leri, tarih aralığı, serbest metin arama
- "Yeni Teklif" butonu
- Satır → `/proposals/:id`

#### Yeni / düzenleme formu
- **Üst (çekirdek):** müşteri seç, başlık, durum, tarih, tutar, para birimi, notlar
- **Alt (dinamik):** `parameters.json`'dan `order`'a göre üretilmiş alanlar
- Her parametre yanında ℹ️ tooltip (`description` gösterir)
- Zorunlu alanlar `*` işaretli, zod doğrulaması
- Akıllı ön-doldurma:
  - O müşterinin en son teklifinden değerler gelir, üstünde *"Son teklifinden"* rozeti
  - Müşteri için teklif yoksa genel son teklifin değerleri
  - Hiç teklif yoksa boş
- Alan geçmişi (combobox):
  - `text`, `textarea`, `number` tipleri için combobox
  - Tıklayınca daha önce o alan için girilmiş benzersiz değerler (sıklığa göre sıralı)
  - Listeden seç veya yeni değer yaz
  - `select` / `multiselect` / `boolean` / `date` için geçerli değil

### 6.4 Parametreler — `/parameters`
- Tablo: sıra, etiket, anahtar, tip, zorunlu, eylemler
- Sürükle-bırak ile sıralama (dnd-kit)
- "Yeni Parametre" modal: etiket, anahtar (slug, salt okunur ama düzenlenebilir), tip, açıklama, birim, zorunluluk, tipe özgü alanlar
- Silme uyarısı: "Bu parametreyi silmek eski tekliflerdeki veriyi silmez (snapshot korunuyor), sadece yeni tekliflerde görünmez."

### 6.5 Yedekle / Geri Yükle — `/backup`
- "Yedek Oluştur" butonu → tüm `data\` içeriğini zip'ler, `backups\` altına yazar. "Farklı Konuma Kaydet" ile başka yere kopyalanabilir.
- Yedek listesi (dosya adı, boyut, tarih, sil)
- "Yedekten Geri Yükle" → zip seç → mod seçimi:
  - **Birleştir:** aynı ID'li kayıtlar atlanır, yeniler eklenir
  - **Değiştir:** mevcut `data\` klasörü `data.backup-{ts}\` olarak yeniden adlandırılır, sonra zip açılır

### 6.6 Ayarlar — `/settings`
- Veri klasörü yolu (değiştir → taşıma işlemi)
- Varsayılan para birimi (TRY / EUR / USD)
- Otomatik güncelleme toggle (varsayılan açık)
- "Şimdi güncelleme kontrol et" butonu
- Uygulama hakkında (sürüm, lisans bilgisi)

### 6.7 Klavye kısayolları
- `Ctrl+N` — yeni teklif
- `Ctrl+K` — hızlı arama
- `Ctrl+S` — kaydet
- Kaydedilmemiş form varken sayfa değişimi → onay diyaloğu

---

## 7. Rust Backend Komutları

### Müşteri
```rust
list_customers() -> Vec<CustomerSummary>
get_customer(id: String) -> Customer
create_customer(input: CustomerInput) -> Customer
update_customer(id: String, input: CustomerInput) -> Customer
delete_customer(id: String) -> ()    // teklifleri varsa Conflict döner
```

### Teklif
```rust
list_proposals(filter: ProposalFilter) -> Vec<ProposalSummary>
get_proposal(id: String) -> Proposal
create_proposal(input: ProposalInput) -> Proposal
update_proposal(id: String, input: ProposalInput) -> Proposal
delete_proposal(id: String) -> ()
get_field_history(key: String, limit: usize) -> Vec<FieldHistoryEntry>
get_prefill_values(customer_id: Option<String>) -> HashMap<String, serde_json::Value>
```

`ProposalFilter`: `customer_id?`, `status?`, `date_from?`, `date_to?`, `search?`.

`FieldHistoryEntry`: `{ value, frequency, last_used_at }`.

### Parametre kataloğu
```rust
get_parameters() -> ParameterCatalog
upsert_parameter(param: Parameter) -> ParameterCatalog
delete_parameter(key: String) -> ParameterCatalog
reorder_parameters(keys: Vec<String>) -> ParameterCatalog
```

### Uygulama / sistem
```rust
get_app_info() -> AppInfo
init_data_dir(path: String) -> ()
create_backup() -> BackupEntry
list_backups() -> Vec<BackupEntry>
restore_backup(path: String, mode: RestoreMode) -> ()
delete_backup(name: String) -> ()
get_settings() -> Settings
update_settings(input: SettingsInput) -> Settings
check_for_update() -> UpdateStatus
```

### Atomic write
```
1. target.json.tmp dosyasına yaz
2. fsync
3. target.json olarak rename (Windows'ta atomik)
```
Güç kesintisi → ya eski ya yeni dosya tam olur, yarım dosya olmaz.

### Eşzamanlılık
Tek kullanıcılı app, çoklu yazma yarışı yok. Her dosya için `Mutex`, kullanıcı hızlıca iki kez "Kaydet" basarsa yazımlar sırayla gerçekleşir. `parameters.json` için de aynı kilit.

### Doğrulama
- Frontend zod ile doğrular (görsel geri bildirim)
- Backend'de tekrar doğrulanır (güven sınırı)
- Hata → `AppError::Validation { field, message }`

### Hata modeli
```rust
enum AppError {
    NotFound { entity: String, id: String },
    Validation { field: String, message: String },
    Conflict { message: String },
    Io { message: String },
    Corrupt { path: String, reason: String },
}
```
Frontend'de tek bir `showError(err)` yardımcısı bunları Türkçe mesajlara çevirir.

---

## 8. Otomatik Güncelleme

### Mekanizma
- `tauri-plugin-updater` (imzalı güncellemeler)
- Build zamanında `tauri signer` ile üretilmiş public key app içine gömülür
- Private key sadece build makinesinde bulunur
- İmzasız veya yanlış imzalı update asla yüklenmez

### Manifest (`latest.json`)
```json
{
  "version": "1.2.3",
  "notes": "Arama filtresi iyileştirmeleri",
  "pub_date": "2026-04-15T10:00:00Z",
  "platforms": {
    "windows-x86_64": {
      "signature": "...base64...",
      "url": "https://github.com/.../FiksturTeklif_1.2.3_x64-setup.msi"
    }
  }
}
```

### Kullanıcı akışı
- Açılışta + her 24 saatte bir `latest.json` kontrol edilir (arka plan, sessiz)
- Yeni sürüm varsa sağ alt köşede bildirim: *"Yeni sürüm mevcut: 1.2.3 — Şimdi güncelle / Sonra hatırlat / Bu sürümü atla"*
- "Şimdi güncelle" → indirme → imza doğrulama → app kapanır → installer çalışır → yeniden başlar
- "Sonra hatırlat" → 24 saat sonra tekrar sor
- "Bu sürümü atla" → bu sürüm tekrar sorulmaz
- Offline → sessizce atla, hata gösterme
- İndirme/imza hatası → kullanıcıya uyarı + manuel indirme linki

### Kritik
- Kullanıcı verisi (`data\`) asla dokunulmaz
- Ayarlar'da otomatik güncelleme toggle, **varsayılan açık**
- Kullanıcı kapatmadıkça hep açık kalır — ilk açılışta ayrıca onay sormaz
- `schema_version` migration mekanizması sayesinde eski veri yeni sürümle açılır

### Dağıtım (GitHub Releases)
- Her sürüm için release: `.msi` + `.msi.sig` + `latest.json`
- Release süreci:
  1. `package.json` + `Cargo.toml` + `tauri.conf.json` sürümünü bump et
  2. `npm run tauri build` → imzalı .msi
  3. GitHub Release oluştur, dosyaları yükle, `latest.json` güncelle

### Alternatif kararlar (reddedildi)
- **Self-hosted sunucu** → GitHub bedava, CDN'li, hazır. İleride URL değişimi ile taşınır.
- **İmzasız güncelleme** → Tauri zaten kabul etmez; güvenlik için imzalama zorunlu.

---

## 9. Proje Yapısı

```
fikstur-teklif-asistani/
├── src-tauri/                   # Rust backend
│   ├── src/
│   │   ├── main.rs
│   │   ├── commands/
│   │   │   ├── customers.rs
│   │   │   ├── proposals.rs
│   │   │   ├── parameters.rs
│   │   │   ├── backup.rs
│   │   │   └── settings.rs
│   │   ├── storage/             # dosya G/Ç, atomic write, glob
│   │   ├── models/              # serde struct'ları
│   │   ├── validation/          # parametre şema doğrulama
│   │   ├── migration/           # schema_version dönüşümleri
│   │   └── error.rs
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   └── icons/
├── src/                         # Frontend
│   ├── main.tsx
│   ├── App.tsx
│   ├── routes/
│   │   ├── Dashboard.tsx
│   │   ├── Customers/
│   │   ├── Proposals/
│   │   ├── Parameters/
│   │   ├── Backup.tsx
│   │   └── Settings.tsx
│   ├── components/              # DynamicField, DataTable, ...
│   ├── lib/
│   │   ├── api.ts               # invoke() sarıcıları
│   │   ├── schema.ts            # parametre → zod şema
│   │   ├── i18n/tr.ts
│   │   └── errors.ts            # AppError → TR mesaj
│   ├── stores/                  # zustand
│   └── types.ts                 # Rust struct'larına eşleşen TS tipleri
├── package.json
├── vite.config.ts
├── tsconfig.json
├── docs/
│   ├── kullanici-plani.md
│   ├── teknik-plan.md
│   └── superpowers/specs/
└── README.md
```

---

## 10. Test Stratejisi

### Rust birim testleri (`cargo test`)
- Storage (atomic write, glob, rename)
- Validation (parametre şema doğrulama)
- Migration (schema_version dönüşümleri)
- `tempfile::tempdir()` ile geçici klasörler
- Hedef: %80 kapsam

### Tauri komut entegrasyon testleri
- Her komut için happy path + 1-2 hata yolu
- Gerçek dosya yazımı (tempdir)

### Frontend birim testleri (Vitest)
- `lib/schema.ts` (parametreden zod üretimi)
- `lib/errors.ts`
- Utility fonksiyonları
- Komponent testleri minimal

### E2E
- MVP'de yok (Tauri E2E pahalı)
- Manuel smoke test checklist (`docs/manual-test.md`):
  1. Yeni müşteri oluştur
  2. Parametre ekle
  3. Teklif oluştur (dinamik form doldur)
  4. Yedekle
  5. Sil
  6. Geri yükle
  7. Güncelleme bildirimini tetikle

### Logging
- `tracing` + dosya appender
- `%APPDATA%\FiksturTeklifAsistani\logs\app.log`
- 7 gün rotasyonu
- Telemetri / hata raporlama yok

---

## 11. Başarı Kriterleri (MVP Tamamlanma)

1. Kullanıcı .msi'yi kurar, uygulama ilk açılışta veri klasörü seçer
2. 5+ parametre tanımlayabilir (TR etiket + açıklama ile)
3. 3+ müşteri oluşturur
4. Her müşteri için 2+ teklif girer, dinamik form parametrelerle dolduruluyor
5. Arama / filtreleme teklifleri doğru döndürüyor
6. Yedek alıp silip geri yükleyebiliyor
7. Yeni sürüm yayınlandığında otomatik güncelleme bildirimini görüyor ve uyguluyor
8. Uygulama kapanıp açıldığında tüm veriler yerinde
9. Akıllı ön-doldurma: yeni teklifte son değerler hazır geliyor
10. Alan geçmişi: text/number alanlarında combobox'ta eski değerler görünüyor

---

## 12. Tahmini Süre

4–6 hafta (tek geliştirici, Tauri'ye kısmen aşina varsayımıyla).

---

## 13. Açık Sorular (Sonra Netleştirilecek)

- Uygulama ikonları ve marka görselleri
- İlk sürümün imzalanması için kod imzalama sertifikası (Windows SmartScreen uyarılarını azaltmak için; ilk sürümde olmadan çıkılabilir, sonradan eklenir)
- GitHub repo: public mi private mi? (Release URL'leri public olmak zorunda — private repo'da token gerekir)
- Lisans bilgisi (bu Faz 1 uygulamasında lisans anahtarı YOK; teknik planda açıklanan lisanslama Faz 3'e ait)
