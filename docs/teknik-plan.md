# Fikstur Teklif Asistani - Teknik Plan

## 1. Genel Bakis

### Problem
Imalat atolyeleri (ozellikle fikstur/aparat uretimi) her teklif icin saatlerce zaman harcamaktadir. Deneyimli ustalarin kafasindaki bilgi kurumsal hafizaya donusmemektedir. Teklif surecinde tutarsizlik ve hata orani yuksektir.

### Cozum
CAD dosyalarini otomatik analiz eden, yapay zeka ile teklif ureten ve zamanla ogrenen bir SaaS platformu. Multi-tenant, konfigure edilebilir ve self-service.

### Hedef Musteri
Kucuk imalat atolyeleri (5-20 kisi). Teknik bilgisi sinirli kullanicilar. Basit, anlasilir arayuz sart.

---

## 2. Teknoloji Stack

### Backend
| Katman | Teknoloji | Neden |
|--------|-----------|-------|
| Web Framework | **FastAPI** | Async, otomatik OpenAPI docs, Pydantic validasyon |
| Task Queue | **Celery + Redis** | Uzun suren CAD islenme ve ML inference islemleri |
| ORM | **SQLAlchemy 2.0 (async)** + **Alembic** | Olgun, RLS destegi, async |
| Veritabani | **PostgreSQL 15+** + `pgvector` | RLS ile multi-tenancy, JSONB, vektor benzerlik arama |
| Dosya Depolama | **MinIO** (self-hosted S3) veya **AWS S3** | Cloud-agnostic |
| Cache / Broker | **Redis 7+** | Celery broker, cache, rate limiting |

### AI/ML Stack
| Bilesen | Teknoloji | Neden |
|---------|-----------|-------|
| CAD Parsing | **pythonOCC** + **cadquery** + **trimesh** | STEP/IGES geometri analizi |
| CAM Parsing | **pygcode** + ozel G-code parser | G-code / NC dosyalarindan islem suresi, takim bilgisi cikarma |
| Feature Extraction | **numpy**, **scipy** | Geometrik hesaplamalar |
| Tablo ML | **XGBoost** / **LightGBM** | Hizli, yorumlanabilir, kucuk veri setlerinde iyi calisir |
| LLM | **Claude API** (Anthropic) | Karmasiklik degerlendirmesi, teklif metni uretimi |
| Experiment Tracking | **MLflow** | Model versiyonlama, A/B test |

### Frontend
| Katman | Teknoloji | Neden |
|--------|-----------|-------|
| Framework | **Next.js 14+ (App Router)** | SSR, dosya tabanli routing |
| UI | **shadcn/ui** + **Tailwind CSS** | Konfigure edilebilir, modern |
| 3D Viewer | **Three.js** via **@react-three/fiber** | CAD dosya onizlemesi |
| State | **TanStack Query** + **Zustand** | Server state + client state |
| Formlar | **React Hook Form** + **Zod** | Karmasik konfigure edilebilir formlar |
| Grafikler | **Recharts** | Analitik dashboard |
| PDF Uretim | **WeasyPrint** (backend) | HTML/CSS -> PDF donusumu, Jinja2 sablonlari |
| Excel Uretim | **openpyxl** (backend) | Excel dosya uretimi, ozel sablonlar |

### Altyapi
| Bilesen | Teknoloji |
|---------|-----------|
| Container | **Docker** + **Docker Compose** (dev), **Kubernetes** (prod) |
| CI/CD | **GitHub Actions** |
| Reverse Proxy | **Traefik** |
| Monitoring | **Prometheus** + **Grafana** |
| Logging | **Structured JSON** -> **Loki** |

---

## 3. Sistem Mimarisi

```
+-------------------------------------------------------------------+
|                     API Gateway (FastAPI)                           |
|  - Auth middleware   - Tenant context   - Rate limiting             |
+--------+-------------+--------------+-------------+---------------+
         |             |              |             |
  +------v------+ +----v-----+ +-----v------+ +----v--------+
  |  Tenant &   | |  Dosya   | |  Teklif    | | Analitik &  |
  |  Auth       | |  Yonetim | |  Motoru    | | ML          |
  |  Modulu     | |  Modulu  | |  Modulu    | | Modulu      |
  +-------------+ +----+-----+ +-----+------+ +----+--------+
                       |             |              |
                +------v-----+ +----v-------+ +----v---------+
                | CAD Parse  | | Config     | | Egitim       |
                | Worker     | | Engine     | | Pipeline     |
                | (Celery)   | |            | | (Celery)     |
                +------------+ +------------+ +--------------+
```

### Modul Sorumlulklari

1. **Tenant & Auth**: Kullanici yonetimi, organizasyon, RBAC, API key yonetimi
2. **Dosya Yonetim**: Upload, virus tarama, donusum pipeline, dosya versiyonlama, S3
3. **CAD Parse Worker**: STEP/IGES dosyalardan geometrik feature cikarma, mesh preview uretme (Celery task)
4. **Teklif Motoru**: Teklif CRUD, tenant-specific fiyatlandirma, ML inference cagrisi, teklif yasam dongusu
5. **Config Engine**: Malzeme katalogu, iscilik ucretleri, makine ucretleri, genel giderler, ozel alanlar
6. **Analitik & ML**: Dashboard verisi, dogruluk metrikleri, geri bildirim toplama
7. **Egitim Pipeline**: Offline batch egitim, model dogrulama, production'a alma

---

## 4. Veritabani Semasi

### Multi-Tenancy Stratejisi
**Paylasimli veritabani, paylasimli sema, tenant_id kolonu + PostgreSQL Row-Level Security (RLS)**

Her tenant-scoped tabloda `tenant_id` kolonu bulunur. RLS politikalari ile izolasyon veritabani seviyesinde saglanir.

### Temel Tablolar

#### Tenant ve Kimlik Dogrulama

```sql
-- Firmalar (Tenants)
CREATE TABLE tenants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(100) UNIQUE NOT NULL,
    subscription_tier VARCHAR(50) DEFAULT 'trial', -- trial, starter, professional, enterprise
    deployment_type VARCHAR(20) DEFAULT 'saas',    -- saas, self_hosted
    settings        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Kullanicilar
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    email           VARCHAR(255) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(255),
    role            VARCHAR(50) DEFAULT 'estimator', -- admin, estimator, viewer
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX idx_users_email_tenant ON users(tenant_id, email);

-- API Anahtarlari
CREATE TABLE api_keys (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    user_id         UUID NOT NULL REFERENCES users(id),
    key_hash        VARCHAR(255) NOT NULL,
    name            VARCHAR(100),
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- Firma Profili
CREATE TABLE tenant_profiles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID UNIQUE NOT NULL REFERENCES tenants(id),
    company_name    VARCHAR(255),            -- resmi firma unvani
    logo_key        VARCHAR(500),            -- S3 key (logo dosyasi)
    address         TEXT,
    phone           VARCHAR(50),
    email           VARCHAR(255),
    website         VARCHAR(255),
    tax_office      VARCHAR(255),            -- vergi dairesi
    tax_number      VARCHAR(50),             -- vergi no
    bank_info       JSONB DEFAULT '[]',      -- [{bank_name, iban, currency}]
    authorized_person VARCHAR(255),          -- yetkili kisi adi
    authorized_title  VARCHAR(100),          -- yetkili unvani
    footer_note     TEXT,                    -- teklif altbilgi notu
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Teklif Sablonlari
CREATE TABLE quote_templates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    name            VARCHAR(255) NOT NULL,   -- "Standart Teklif", "Detayli Teklif"
    is_default      BOOLEAN DEFAULT false,
    format_type     VARCHAR(20) NOT NULL,    -- pdf, excel, both
    -- PDF/Excel gorunum ayarlari
    show_material_breakdown BOOLEAN DEFAULT true,   -- malzeme kirilimi gosterilsin mi
    show_labor_breakdown    BOOLEAN DEFAULT true,    -- iscilik kirilimi gosterilsin mi
    show_machine_breakdown  BOOLEAN DEFAULT false,   -- makine kirilimi gosterilsin mi
    show_unit_price         BOOLEAN DEFAULT true,    -- birim fiyat gosterilsin mi
    show_total_only         BOOLEAN DEFAULT false,   -- sadece toplam goster
    -- Icerik ayarlari
    visible_columns   JSONB DEFAULT '[]',    -- ["description","quantity","unit_price","total"]
    header_text       TEXT,                  -- teklif ust notu
    footer_text       TEXT,                  -- teklif alt notu (odeme kosullari vs.)
    terms_conditions  TEXT,                  -- genel kosullar
    delivery_note     TEXT,                  -- teslimat suresi notu
    -- Stil ayarlari
    primary_color     VARCHAR(7) DEFAULT '#1a56db',  -- hex renk kodu
    font_family       VARCHAR(50) DEFAULT 'default',
    logo_position     VARCHAR(20) DEFAULT 'top-left', -- top-left, top-center, top-right
    -- Sablon icerigi (Jinja2 veya HTML)
    pdf_template_key  VARCHAR(500),          -- S3 key (ozel PDF sablonu)
    excel_template_key VARCHAR(500),         -- S3 key (ozel Excel sablonu)
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Excel Import Sablonlari (gecmis teklif aktarimi icin)
CREATE TABLE import_templates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    name            VARCHAR(255) NOT NULL,   -- "Eski Excel Formatim", "ERP Export"
    description     TEXT,
    -- Kolon eslestirme (kullanicinin Excel kolonu -> sistem alani)
    column_mapping  JSONB NOT NULL,
    -- Ornek: {
    --   "A": {"field": "description", "label": "Parca Adi"},
    --   "B": {"field": "material_name", "label": "Malzeme"},
    --   "C": {"field": "quantity", "label": "Adet", "type": "integer"},
    --   "D": {"field": "material_cost", "label": "Malzeme Maliyeti", "type": "decimal"},
    --   "E": {"field": "labor_hours", "label": "Iscilik Saati", "type": "decimal"},
    --   "F": {"field": "machine_hours", "label": "Makine Saati", "type": "decimal"},
    --   "G": {"field": "total_price", "label": "Toplam Fiyat", "type": "decimal"},
    --   "H": {"field": "outcome", "label": "Kazanildi mi?", "type": "boolean"}
    -- }
    header_row      INTEGER DEFAULT 1,       -- baslik satiri (genelde 1)
    data_start_row  INTEGER DEFAULT 2,       -- veri baslangic satiri
    sheet_name      VARCHAR(100),            -- hangi sayfa (bos = ilk sayfa)
    -- Otomatik tespit ayarlari
    auto_detect_config JSONB DEFAULT '{}',   -- AI kolon tahmin ayarlari
    -- Meta
    sample_file_key VARCHAR(500),            -- S3 key (ornek dosya)
    import_count    INTEGER DEFAULT 0,       -- bu sablonla kac dosya aktarildi
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Import Gecmisi (her aktarim islemi)
CREATE TABLE import_jobs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    template_id     UUID REFERENCES import_templates(id),
    file_name       VARCHAR(500) NOT NULL,
    file_key        VARCHAR(500) NOT NULL,   -- S3 key
    status          VARCHAR(50) DEFAULT 'pending',
        -- pending, validating, preview, importing, completed, failed
    -- Sonuclar
    total_rows      INTEGER,
    imported_rows   INTEGER,
    skipped_rows    INTEGER,
    error_rows      INTEGER,
    errors          JSONB DEFAULT '[]',      -- [{row: 5, error: "Gecersiz fiyat"}]
    -- Onizleme verisi (kullanici onaylamadan once)
    preview_data    JSONB,                   -- ilk 10 satirin onizlemesi
    -- Meta
    imported_by     UUID REFERENCES users(id),
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT now()
);
```

#### Konfigurasyon (Tenant Basina)

```sql
-- Malzemeler
CREATE TABLE materials (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    name            VARCHAR(255) NOT NULL,
    category        VARCHAR(100),           -- metal, plastik, kompozit
    unit_cost       DECIMAL(12,4) NOT NULL, -- birim fiyat
    unit            VARCHAR(20) DEFAULT 'kg',
    density         DECIMAL(10,4),          -- g/cm3
    properties      JSONB DEFAULT '{}',     -- sertlik, islenebilirlik vs.
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- Makine Tipleri
CREATE TABLE machine_types (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    name            VARCHAR(255) NOT NULL,
    hourly_rate     DECIMAL(10,2) NOT NULL,
    setup_time_hrs  DECIMAL(6,2) DEFAULT 0,
    capabilities    JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- Iscilik Ucretleri
CREATE TABLE labor_rates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    category        VARCHAR(100) NOT NULL,
    hourly_rate     DECIMAL(10,2) NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- Islem Katalogu
CREATE TABLE operations_catalog (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    name            VARCHAR(255) NOT NULL,
    default_time_hrs DECIMAL(8,2),
    machine_type_id UUID REFERENCES machine_types(id),
    labor_rate_id   UUID REFERENCES labor_rates(id),
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- Maliyet Parametreleri
CREATE TABLE cost_parameters (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    name            VARCHAR(100) NOT NULL,  -- overhead_pct, profit_margin_pct, rush_multiplier
    value           DECIMAL(10,4) NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- Ozel Alanlar (Dinamik sema genisletme)
CREATE TABLE custom_fields (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    entity_type     VARCHAR(50) NOT NULL,   -- quote, project, part
    field_name      VARCHAR(100) NOT NULL,
    field_type      VARCHAR(50) NOT NULL,   -- text, number, select, boolean
    options         JSONB,                  -- select tipi icin secenekler
    is_required     BOOLEAN DEFAULT false,
    display_order   INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT now()
);
```

#### Dosya ve CAD Analizi

```sql
-- Projeler
CREATE TABLE projects (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    name            VARCHAR(255) NOT NULL,
    customer_name   VARCHAR(255),
    customer_email  VARCHAR(255),
    description     TEXT,
    status          VARCHAR(50) DEFAULT 'active',
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Yuklenen Dosyalar
CREATE TABLE uploaded_files (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    project_id      UUID NOT NULL REFERENCES projects(id),
    original_name   VARCHAR(500) NOT NULL,
    storage_key     VARCHAR(500) NOT NULL,
    file_type       VARCHAR(20) NOT NULL,   -- step, iges, gcode, nc, tap, mpf
    file_size_bytes BIGINT,
    checksum_sha256 VARCHAR(64),
    processing_status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
    uploaded_by     UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- CAD Analiz Sonuclari
CREATE TABLE cad_analyses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    file_id         UUID NOT NULL REFERENCES uploaded_files(id),
    analysis_version INTEGER DEFAULT 1,
    -- Geometrik ozellikler
    bounding_box_x  DECIMAL(12,4),  -- mm
    bounding_box_y  DECIMAL(12,4),
    bounding_box_z  DECIMAL(12,4),
    volume_mm3      DECIMAL(18,4),
    surface_area_mm2 DECIMAL(18,4),
    -- Karmasiklik ozellikleri
    face_count      INTEGER,
    edge_count      INTEGER,
    hole_count      INTEGER,
    pocket_count    INTEGER,
    fillet_count    INTEGER,
    chamfer_count   INTEGER,
    thread_count    INTEGER,
    -- Tolerans ozellikleri
    min_tolerance   DECIMAL(10,6),
    tolerance_histogram JSONB,
    surface_finish_requirements JSONB,
    -- Algilanan malzeme
    detected_material VARCHAR(255),
    -- Karmasiklik skoru
    complexity_score DECIMAL(6,2),   -- 0-100
    -- Mesh onizleme
    mesh_preview_key VARCHAR(500),   -- S3 key (.glb dosyasi)
    -- Ham veri
    raw_features    JSONB,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- CAM Analiz Sonuclari
CREATE TABLE cam_analyses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    file_id         UUID NOT NULL REFERENCES uploaded_files(id),
    cad_analysis_id UUID REFERENCES cad_analyses(id),  -- iliskili CAD dosyasi varsa
    analysis_version INTEGER DEFAULT 1,
    -- Program bilgileri
    program_number  VARCHAR(50),
    program_name    VARCHAR(255),
    -- Takim bilgileri
    tool_count      INTEGER,             -- kullanilan takim sayisi
    tools           JSONB,               -- [{tool_no, type, diameter, description}]
    -- Zaman bilgileri
    total_cutting_time_min  DECIMAL(10,2),  -- toplam kesme suresi (dakika)
    total_rapid_time_min    DECIMAL(10,2),  -- toplam hizli hareket suresi
    total_cycle_time_min    DECIMAL(10,2),  -- toplam cevrim suresi
    tool_change_count       INTEGER,         -- takim degisim sayisi
    -- Hareket bilgileri
    total_cutting_length_mm DECIMAL(14,2),  -- toplam kesme mesafesi
    max_depth_of_cut_mm     DECIMAL(10,4),  -- maksimum kesme derinligi
    -- Ilerleme ve devir bilgileri
    feed_rates        JSONB,             -- [{feed, spindle_speed, tool_no}]
    max_spindle_speed INTEGER,           -- maksimum devir (rpm)
    min_feed_rate     DECIMAL(10,4),     -- minimum ilerleme (mm/dk)
    max_feed_rate     DECIMAL(10,4),     -- maksimum ilerleme (mm/dk)
    -- Makine bilgileri
    detected_machine_type VARCHAR(100),  -- torna, freze, 5 eksen vs.
    axis_count        INTEGER,           -- 3, 4, 5 eksen
    has_coolant       BOOLEAN,           -- sogutma sivisi kullaniliyor mu
    -- Islem tipleri
    operations_detected JSONB,           -- ["drilling", "milling", "threading", ...]
    -- Ham veri
    raw_data          JSONB,
    created_at        TIMESTAMPTZ DEFAULT now()
);

-- Montaj Iliskileri
CREATE TABLE assembly_relationships (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    assembly_file_id UUID NOT NULL REFERENCES uploaded_files(id),
    part_file_id    UUID NOT NULL REFERENCES uploaded_files(id),
    quantity        INTEGER DEFAULT 1,
    relationship    JSONB,
    created_at      TIMESTAMPTZ DEFAULT now()
);
```

#### Teklif Sistemi

```sql
-- Teklifler
CREATE TABLE quotes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    project_id      UUID NOT NULL REFERENCES projects(id),
    quote_number    VARCHAR(50),
    version         INTEGER DEFAULT 1,
    status          VARCHAR(50) DEFAULT 'draft',
        -- draft, ai_generated, human_reviewed, sent, won, lost, expired
    -- AI tahminleri
    ai_estimated_total    DECIMAL(12,2),
    ai_confidence_score   DECIMAL(5,4),     -- 0.0 - 1.0
    ai_model_version      VARCHAR(100),
    -- Insan duzeltmesi sonrasi
    final_total           DECIMAL(12,2),
    -- Sonuc takibi
    sent_at               TIMESTAMPTZ,
    customer_response_at  TIMESTAMPTZ,
    outcome               VARCHAR(20),       -- won, lost, no_response
    loss_reason           VARCHAR(255),
    -- Meta
    notes                 TEXT,
    custom_fields_data    JSONB,
    valid_until           DATE,
    created_by            UUID REFERENCES users(id),
    reviewed_by           UUID REFERENCES users(id),
    created_at            TIMESTAMPTZ DEFAULT now(),
    updated_at            TIMESTAMPTZ DEFAULT now()
);

-- Teklif Satirlari
CREATE TABLE quote_line_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    quote_id        UUID NOT NULL REFERENCES quotes(id),
    file_id         UUID REFERENCES uploaded_files(id),
    cad_analysis_id UUID REFERENCES cad_analyses(id),
    description     VARCHAR(500),
    quantity        INTEGER DEFAULT 1,
    -- Maliyet kirilimi
    material_id     UUID REFERENCES materials(id),
    material_cost   DECIMAL(12,2),
    material_weight_kg DECIMAL(10,4),
    labor_hours     DECIMAL(8,2),
    labor_cost      DECIMAL(12,2),
    machine_hours   DECIMAL(8,2),
    machine_cost    DECIMAL(12,2),
    tooling_cost    DECIMAL(12,2),
    outsource_cost  DECIMAL(12,2),
    overhead_cost   DECIMAL(12,2),
    unit_price      DECIMAL(12,2),
    line_total      DECIMAL(12,2),
    -- AI vs insan takibi
    ai_estimates    JSONB,       -- AI'in tum tahminlerinin snapshot'i
    human_overrides JSONB,       -- Insan tarafindan degistirilen alanlar
    sort_order      INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- Teklif Islemleri
CREATE TABLE quote_operations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    line_item_id    UUID NOT NULL REFERENCES quote_line_items(id),
    operation_id    UUID REFERENCES operations_catalog(id),
    name            VARCHAR(255) NOT NULL,
    sequence        INTEGER,
    estimated_hours DECIMAL(8,2),
    machine_type_id UUID REFERENCES machine_types(id),
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT now()
);
```

#### Geri Bildirim ve Ogrenme

```sql
-- Gercek Maliyetler
CREATE TABLE actual_costs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    quote_id        UUID NOT NULL REFERENCES quotes(id),
    line_item_id    UUID REFERENCES quote_line_items(id),
    actual_material_cost  DECIMAL(12,2),
    actual_labor_hours    DECIMAL(8,2),
    actual_labor_cost     DECIMAL(12,2),
    actual_machine_hours  DECIMAL(8,2),
    actual_machine_cost   DECIMAL(12,2),
    actual_total          DECIMAL(12,2),
    completion_date       DATE,
    notes                 TEXT,
    created_at            TIMESTAMPTZ DEFAULT now()
);

-- ML Model Yonetimi
CREATE TABLE ml_models (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    model_type      VARCHAR(100) NOT NULL,   -- quote_estimator, complexity_scorer
    version         VARCHAR(50),
    framework       VARCHAR(50),             -- xgboost, lightgbm
    artifact_key    VARCHAR(500),            -- S3 key
    metrics         JSONB,                   -- {mae, mape, r2, rmse}
    training_samples INTEGER,
    is_active       BOOLEAN DEFAULT false,
    trained_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- ML Tahmin Loglari
CREATE TABLE ml_predictions_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    model_id        UUID NOT NULL REFERENCES ml_models(id),
    quote_id        UUID NOT NULL REFERENCES quotes(id),
    input_features  JSONB,
    predicted_value DECIMAL(12,2),
    actual_value    DECIMAL(12,2),           -- sonradan doldurulur
    created_at      TIMESTAMPTZ DEFAULT now()
);
```

#### RLS ve Indexler

```sql
-- Tum tenant-scoped tablolara RLS uygula
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
-- ... (tum tablolar icin tekrarla)

CREATE POLICY tenant_isolation ON quotes
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Performans indexleri
CREATE INDEX idx_quotes_tenant_status ON quotes(tenant_id, status);
CREATE INDEX idx_quotes_tenant_project ON quotes(tenant_id, project_id);
CREATE INDEX idx_files_tenant_status ON uploaded_files(tenant_id, processing_status);
CREATE INDEX idx_predictions_tenant_model ON ml_predictions_log(tenant_id, model_id);
CREATE INDEX idx_actual_costs_quote ON actual_costs(tenant_id, quote_id);
```

---

## 5. AI/ML Pipeline

### 5.1 CAD Feature Extraction Pipeline

```
CAD Upload -> [Celery Worker] -> STEP/IGES Parse (pythonOCC) -> Feature Cikar -> DB'ye Kaydet (cad_analyses)
CAM Upload -> [Celery Worker] -> G-code Parse (pygcode)      -> Feature Cikar -> DB'ye Kaydet (cam_analyses)
```

**STEP dosya isleme (pythonOCC + cadquery):**

```python
from OCP.BRepGProp import BRepGProp
from OCP.GProp_GProps import GProp_GProps
from OCP.TopExp import TopExp_Explorer
from OCP.TopAbs import TopAbs_FACE, TopAbs_EDGE
from OCP.BRepBndLib import brepbndlib
from OCP.Bnd_Box import Bnd_Box

class CADFeatureExtractor:
    def extract(self, step_file_path: str) -> dict:
        shape = self._load_step(step_file_path)

        # Sinirlayici kutu (bounding box)
        bbox = Bnd_Box()
        brepbndlib.Add(shape, bbox)
        xmin, ymin, zmin, xmax, ymax, zmax = bbox.Get()

        # Hacim ve yuzey alani
        props = GProp_GProps()
        BRepGProp.VolumeProperties(shape, props)
        volume = props.Mass()
        BRepGProp.SurfaceProperties(shape, props)
        surface_area = props.Mass()

        # Topoloji sayimi
        face_count = self._count_topology(shape, TopAbs_FACE)
        edge_count = self._count_topology(shape, TopAbs_EDGE)

        # Ozellik tanima (delikler, cepler)
        holes = self._detect_holes(shape)       # silindirik yuzeyler
        pockets = self._detect_pockets(shape)   # konkav bolgeler

        # Karmasiklik skoru (heuristik)
        complexity = self._compute_complexity(
            face_count, edge_count, len(holes),
            len(pockets), volume, surface_area
        )

        # 3D onizleme icin mesh olustur (.glb)
        mesh_path = self._tessellate_to_glb(shape)

        return {
            "bounding_box": {
                "x": xmax - xmin, "y": ymax - ymin, "z": zmax - zmin
            },
            "volume_mm3": volume,
            "surface_area_mm2": surface_area,
            "face_count": face_count,
            "edge_count": edge_count,
            "hole_count": len(holes),
            "pocket_count": len(pockets),
            "complexity_score": complexity,
            "mesh_preview_path": mesh_path,
        }
```

### 5.2 CAM Feature Extraction Pipeline

```
Upload (.nc/.gcode/.tap) -> [Celery Worker] -> G-code Parse -> Feature Cikar -> DB'ye Kaydet
```

**G-code dosya isleme (pygcode + ozel parser):**

```python
import re
from dataclasses import dataclass
from typing import Optional

@dataclass
class ToolInfo:
    tool_no: int
    type: Optional[str]       # drill, endmill, tap, etc.
    diameter: Optional[float]
    description: Optional[str]

class CAMFeatureExtractor:
    def extract(self, gcode_file_path: str) -> dict:
        with open(gcode_file_path, 'r') as f:
            lines = f.readlines()

        tools = {}
        current_tool = None
        total_cutting_time = 0.0
        total_rapid_time = 0.0
        total_cutting_length = 0.0
        tool_changes = 0
        max_spindle_speed = 0
        feed_rates = []
        max_depth = 0.0
        operations = set()
        has_coolant = False
        axis_count = 3

        prev_x, prev_y, prev_z = 0.0, 0.0, 0.0

        for line in lines:
            line = line.strip()

            # Takim degisimi (T komutu)
            t_match = re.search(r'T(\d+)', line)
            if t_match:
                current_tool = int(t_match.group(1))
                tool_changes += 1
                if current_tool not in tools:
                    tools[current_tool] = {"tool_no": current_tool}

            # Devir (S komutu)
            s_match = re.search(r'S(\d+)', line)
            if s_match:
                speed = int(s_match.group(1))
                max_spindle_speed = max(max_spindle_speed, speed)

            # Ilerleme (F komutu)
            f_match = re.search(r'F([\d.]+)', line)
            if f_match:
                feed = float(f_match.group(1))
                feed_rates.append({
                    "feed": feed,
                    "spindle_speed": max_spindle_speed,
                    "tool_no": current_tool
                })

            # Sogutma sivisi
            if 'M8' in line or 'M7' in line:
                has_coolant = True

            # 4. veya 5. eksen tespiti
            if re.search(r'[AB]\s*-?[\d.]+', line):
                axis_count = max(axis_count, 5)
            elif re.search(r'[C]\s*-?[\d.]+', line):
                axis_count = max(axis_count, 4)

            # Islem tipi tespiti
            if line.startswith('G81') or line.startswith('G83'):
                operations.add('drilling')
            elif line.startswith('G84'):
                operations.add('threading')
            elif line.startswith('G1') or line.startswith('G01'):
                operations.add('milling')
            elif line.startswith('G0') or line.startswith('G00'):
                pass  # rapid move

            # Kesme derinligi (Z ekseni)
            z_match = re.search(r'Z(-?[\d.]+)', line)
            if z_match:
                z_val = abs(float(z_match.group(1)))
                max_depth = max(max_depth, z_val)

        # Cevrim suresi hesapla (satir sayisi bazli tahmin,
        # gercek hesap icin hareket mesafesi + ilerleme gerekir)
        cutting_lines = sum(1 for l in lines
                          if l.strip().startswith(('G1', 'G01', 'G2', 'G02', 'G3', 'G03')))
        rapid_lines = sum(1 for l in lines
                         if l.strip().startswith(('G0 ', 'G00')))

        return {
            "tool_count": len(tools),
            "tools": list(tools.values()),
            "tool_change_count": tool_changes,
            "total_cutting_time_min": total_cutting_time,
            "total_rapid_time_min": total_rapid_time,
            "total_cycle_time_min": total_cutting_time + total_rapid_time,
            "total_cutting_length_mm": total_cutting_length,
            "max_depth_of_cut_mm": max_depth,
            "max_spindle_speed": max_spindle_speed,
            "feed_rates": feed_rates,
            "detected_machine_type": self._detect_machine_type(operations, axis_count),
            "axis_count": axis_count,
            "has_coolant": has_coolant,
            "operations_detected": list(operations),
        }

    def _detect_machine_type(self, operations: set, axis_count: int) -> str:
        if axis_count >= 5:
            return "5_eksen_cnc"
        elif axis_count == 4:
            return "4_eksen_cnc"
        elif 'threading' in operations and 'milling' not in operations:
            return "torna"
        else:
            return "3_eksen_cnc"
```

**CAM dosyasindan elde edilen bilgilerin teklif icin degeri:**

| CAM Verisi | Teklif Etkisi |
|------------|---------------|
| Toplam cevrim suresi | Direkt makine maliyeti hesabi (sure * saat ucreti) |
| Takim sayisi ve tipleri | Takim maliyeti ve asinma tahmini |
| Takim degisim sayisi | Setup suresi ve is akisi planlamasi |
| Devir/ilerleme bilgileri | Malzeme islenebilirlik dogrulamasi |
| Eksen sayisi | Hangi makinede yapilacagi (3/4/5 eksen) |
| Islem tipleri | Gereken operasyonlarin otomatik tespiti |
| Kesme derinligi | Parca karmasikligi ve islem suresi dogrulamasi |

### 5.3 ML Model Mimarisi (3 Faz)

#### Faz 1: Kural Tabanli (0-50 teklif)
- Tenant'in tanimladigi birim fiyatlar ve formul motoru kullanilir
- `maliyet = malzeme_maliyeti + (iscilik_saat * ucret) + (makine_saat * ucret) + genel_gider`
- Claude API ile karmasiklik degerlendirmesi ve teklif metni uretimi
- AI "tahmini" aslinda formul tabanlidir, karmasiklik carpanlari eklenir

#### Faz 2: Gradient Boosting (50-200 teklif)
- Tenant basina XGBoost/LightGBM modeli egitilir
- Input features (cad_analyses + cam_analyses + quote_line_items'dan):
  ```
  -- CAD features --
  bounding_box_volume, part_volume, surface_area, face_count,
  edge_count, hole_count, pocket_count, thread_count,
  complexity_score, material_density, material_cost_per_kg,
  quantity, min_tolerance, surface_finish_level,
  -- CAM features (varsa, teklif dogrulugunu onemli olcude artirir) --
  cam_total_cycle_time_min, cam_tool_count, cam_tool_change_count,
  cam_axis_count, cam_max_spindle_speed, cam_max_depth_of_cut,
  cam_operation_count, cam_has_coolant
  ```
- Hedef degisken: `final_total` (insan tarafindan onaylanan fiyat)
  veya alt hedefler: labor_hours, material_cost, machine_hours
- Dogrulama: Zaman bazli ayirma (eski tekliflerle egit, yenilerle test et)

#### Faz 3: Ensemble + Gelismis (200+ teklif)
- Gradient boosting + tenant-specific ayarlamalar ensemble'i
- pgvector ile benzer parca arama (gecmiste benzer parcalara ne teklif verildi?)
- Claude API ile few-shot teklif metni uretimi (tenant'in gecmis tekliflerinden orneklerle)

### 5.3 Geri Bildirim Dongusu

```
Teklif Olusturuldu (AI tahmini)
    |
    v
Insan Inceledi ve Duzenledi
    |  -> delta, quote_line_items.human_overrides'a kaydedilir
    v
Teklif Musteriye Gonderildi
    |
    v
Sonuc Kaydedildi (kazanildi/kaybedildi, cevap suresi)
    |  -> quotes.outcome'a kaydedilir
    v
Is Tamamlandi -> Gercek Maliyetler Girildi
    |  -> actual_costs tablosuna kaydedilir
    v
Egitim Verisi Derlendi
    |  features: cad_analyses.* + cam_analyses.* (varsa) + config degerleri
    |  targets:  actual_costs.* (tercih edilen) veya quotes.final_total
    v
Yeniden Egitim Tetiklendi
    |  kosul: yeni_ornek >= esik_deger (konfigure edilebilir, varsayilan 20)
    |         VEYA zamanlanmis (haftalik/aylik)
    v
Yeni Model Dogrulandi
    |  mevcut aktif modelle metrikler karsilastirilir
    v
Model Terfi Ettirildi (iyilestiyse) -> ml_models.is_active = true
```

### 5.4 Yeniden Egitim Pipeline (Celery Beat zamanlama)

```python
@celery.task
def retrain_tenant_model(tenant_id: str):
    # 1. Veri seti derle
    dataset = build_training_dataset(tenant_id)
    # JOIN: cad_analyses + cam_analyses + quotes + actual_costs

    if len(dataset) < MIN_SAMPLES:  # varsayilan: 50
        return  # yeterli veri yok, kural tabanli kal

    # 2. Egit
    X, y = prepare_features(dataset)
    model = xgboost.XGBRegressor(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.1,
    )
    model.fit(X_train, y_train)

    # 3. Dogrula
    metrics = evaluate(model, X_test, y_test)
    # metrics: {mae, mape, r2, rmse}

    # 4. Mevcut aktif modelle karsilastir
    current = get_active_model(tenant_id)
    if current is None or metrics['mape'] < current.metrics['mape']:
        # 5. Kaydet ve terfi ettir
        save_model_to_s3(model, tenant_id, version)
        promote_model(tenant_id, new_model_id)

    # 6. MLflow'a logla
    mlflow.log_metrics(metrics)
```

---

## 6. API Tasarimi (REST)

Tum tenant-scoped endpointler `/api/v1/` ile baslar. Tenant JWT token'dan cozumlenir.

### Endpointler

```
-- Kimlik Dogrulama --
POST   /api/v1/auth/login
POST   /api/v1/auth/register
POST   /api/v1/auth/refresh
POST   /api/v1/auth/forgot-password

-- Tenant Yonetimi --
GET    /api/v1/tenant
PATCH  /api/v1/tenant
GET    /api/v1/tenant/users
POST   /api/v1/tenant/users
PATCH  /api/v1/tenant/users/{id}

-- Firma Profili --
GET    /api/v1/tenant/profile               -- firma bilgilerini getir
PATCH  /api/v1/tenant/profile               -- firma bilgilerini guncelle
POST   /api/v1/tenant/profile/logo          -- logo yukle (multipart)
DELETE /api/v1/tenant/profile/logo          -- logo sil

-- Teklif Sablonlari --
CRUD   /api/v1/config/quote-templates       -- sablon CRUD
POST   /api/v1/config/quote-templates/{id}/preview  -- sablon onizleme (ornek PDF)

-- Excel Import (Gecmis Teklif Aktarimi) --
GET    /api/v1/import/templates             -- import sablonlarini listele
POST   /api/v1/import/templates             -- yeni sablon olustur
PATCH  /api/v1/import/templates/{id}        -- sablon guncelle
DELETE /api/v1/import/templates/{id}        -- sablon sil
POST   /api/v1/import/upload                -- Excel yukle + otomatik kolon tespiti
POST   /api/v1/import/preview               -- onizleme (eslestirme sonrasi ilk 10 satir)
POST   /api/v1/import/execute               -- aktarimi baslat
GET    /api/v1/import/jobs                  -- aktarim gecmisi
GET    /api/v1/import/jobs/{id}             -- aktarim detayi (hatalar dahil)
POST   /api/v1/import/detect-columns        -- AI ile kolon otomatik tahmin

-- Konfigurasyon --
CRUD   /api/v1/config/materials
CRUD   /api/v1/config/machine-types
CRUD   /api/v1/config/labor-rates
CRUD   /api/v1/config/operations
CRUD   /api/v1/config/cost-parameters
CRUD   /api/v1/config/custom-fields

-- Projeler --
GET    /api/v1/projects
POST   /api/v1/projects
GET    /api/v1/projects/{id}
PATCH  /api/v1/projects/{id}
DELETE /api/v1/projects/{id}

-- Dosya Yukleme & Analiz --
POST   /api/v1/projects/{id}/files          -- multipart upload
GET    /api/v1/projects/{id}/files
GET    /api/v1/files/{id}                   -- dosya metadata + analiz
GET    /api/v1/files/{id}/download          -- presigned S3 URL
GET    /api/v1/files/{id}/preview           -- 3D mesh onizleme
GET    /api/v1/files/{id}/analysis          -- CAD analiz sonuclari
GET    /api/v1/files/{id}/cam-analysis     -- CAM analiz sonuclari (G-code dosyalari icin)

-- Teklifler --
POST   /api/v1/projects/{id}/quotes         -- teklif olustur (AI tetiklenir)
GET    /api/v1/quotes                       -- tum teklifler (filtrelenebilir)
GET    /api/v1/quotes/{id}
PATCH  /api/v1/quotes/{id}                  -- insan duzeltmeleri
POST   /api/v1/quotes/{id}/submit           -- gonderildi olarak isaretle
POST   /api/v1/quotes/{id}/outcome          -- kazanildi/kaybedildi kaydet
GET    /api/v1/quotes/{id}/line-items
PATCH  /api/v1/quotes/{id}/line-items/{lid}
POST   /api/v1/quotes/{id}/duplicate        -- yeni versiyon
GET    /api/v1/quotes/{id}/export/pdf      -- PDF indirme (sablon_id query param)
GET    /api/v1/quotes/{id}/export/excel    -- Excel indirme (sablon_id query param)
POST   /api/v1/quotes/{id}/email           -- teklifi e-posta ile gonder (PDF ekli)

-- Gercek Maliyetler (Geri Bildirim) --
POST   /api/v1/quotes/{id}/actual-costs
GET    /api/v1/quotes/{id}/actual-costs
PATCH  /api/v1/actual-costs/{id}

-- Analitik --
GET    /api/v1/analytics/quote-accuracy     -- AI vs gercek zaman icinde
GET    /api/v1/analytics/win-rate           -- kazanma/kaybetme kirilimi
GET    /api/v1/analytics/model-performance  -- model metrikleri
GET    /api/v1/analytics/similar-parts?file_id={id}  -- benzer parcalar

-- ML Yonetim --
GET    /api/v1/ml/models                    -- egitilmis modeller
POST   /api/v1/ml/retrain                   -- manuel egitim tetikle
GET    /api/v1/ml/models/{id}/metrics

-- WebSocket --
WS     /api/v1/ws/file-processing/{file_id} -- gercek zamanli islem durumu
```

### Auth: JWT + Refresh Token
- Kisa omurlu access token (15 dk) + uzun omurlu refresh token (7 gun)
- Token payload: `{ sub: user_id, tenant_id, role, exp }`
- Refresh token kullanildiginda doner (tek kullanimlik)

### RBAC (Rol Tabanli Erisim Kontrolu)
| Rol | Yetkiler |
|-----|----------|
| **admin** | Tam erisim, kullanici yonetimi, tum konfigurasyonlar |
| **estimator** | Teklif olustur/duzenle, dosya yukle, analitik gor |
| **viewer** | Salt okunur erisim |

---

## 7. Dosya Depolama ve Isleme Pipeline

```
Kullanici            API Server              Object Storage
+--------+  upload   +-----------+   PUT     +----------+
| .step  | -------> | Validate  | -------> |  S3 /    |
| .gcode |          | & Route   |          |  MinIO   |
+--------+          +-----+-----+          +----------+
                          | enqueue (dosya tipine gore)
                          v
                    +----------+
                    | Celery   |
                    | Queue    |
                    +-----+----+
                          |
          +---------------+---------------+
          |               |               |
    +-----v------+  +----v------+  +-----v------+
    | CAD Parse  |  | CAM Parse |  | GLB        |
    | (pythonOCC)|  | (pygcode) |  | Preview    |
    | STEP/IGES  |  | G-code/NC |  | (CAD icin) |
    +-----+------+  +----+------+  +-----+------+
          |               |               |
          v               v               v
    +---------------------------------------------+
    |              DB'ye Kaydet                    |
    |  cad_analyses  |  cam_analyses  |  S3 mesh  |
    +---------------------------------------------+
```

**S3 Dizin Yapisi:**
```
/{tenant_id}/uploads/{file_id}/original/{dosya_adi}
/{tenant_id}/uploads/{file_id}/preview/{dosya_adi}.glb
/{tenant_id}/profile/logo.{png|jpg}
/{tenant_id}/templates/{template_id}/custom_pdf.html
/{tenant_id}/templates/{template_id}/custom_excel.xlsx
/{tenant_id}/exports/{quote_id}/{quote_number}.pdf
/{tenant_id}/exports/{quote_id}/{quote_number}.xlsx
/{tenant_id}/models/{model_id}/{version}/model.joblib
```

**Dosya boyut limiti:** 500MB (tier basina konfigure edilebilir)

---

## 8. Konfigurasyon Sistemi

### Katman 1: Yapisal Konfigurasyon (DB tablolari)
Malzemeler, makineler, iscilik, islemler, maliyet parametreleri - Bolum 4'teki tablolar.

### Katman 2: Is Akisi Konfigurasyonu (tenants.settings JSONB)

```json
{
  "quote_workflow": {
    "require_review_before_send": true,
    "auto_generate_on_upload": true,
    "default_valid_days": 30,
    "quote_number_format": "TKL-{YYYY}-{SEQ:4}",
    "approval_chain": ["estimator", "admin"]
  },
  "ai_settings": {
    "auto_retrain_threshold": 20,
    "confidence_threshold_for_auto_approve": 0.85,
    "use_similar_parts_lookup": true,
    "complexity_weights": {
      "hole_weight": 1.2,
      "pocket_weight": 1.5,
      "thread_weight": 1.8,
      "tight_tolerance_weight": 2.0
    }
  },
  "display_settings": {
    "currency": "TRY",
    "locale": "tr-TR",
    "measurement_unit": "metric"
  },
  "export_settings": {
    "default_template_id": "uuid",
    "default_format": "pdf",
    "include_3d_preview_in_pdf": true,
    "include_cam_summary_in_pdf": false,
    "pdf_page_size": "A4",
    "excel_include_formulas": true
  }
}
```

### Katman 3: Ozel Alanlar (Dinamik sema)
`custom_fields` tablosu ile tenantlar teklif, proje ve parcalara kendi alanlarini ekleyebilir. JSONB kolonlarinda saklanir, frontend dinamik form olusturur.

### Formul Motoru
Tenantlar kendi fiyatlandirma formullerini tanimlayabilir:

```python
# simpleeval veya py_expression_eval ile guvenli degerlendirme
formula = "material_cost + (labor_hours * labor_rate) + (machine_hours * machine_rate) * (1 + overhead_pct) * (1 + profit_margin_pct)"

context = {
    "material_cost": 150.0,
    "labor_hours": 8.0,
    "labor_rate": 45.0,
    "machine_hours": 3.0,
    "machine_rate": 120.0,
    "overhead_pct": 0.15,
    "profit_margin_pct": 0.20,
}
```

---

## 9. Proje Dizin Yapisi

```
fikstur_teklif_asistani/
|-- docker-compose.yml
|-- docker-compose.prod.yml
|-- .env.example
|-- README.md
|-- Makefile
|
|-- backend/
|   |-- Dockerfile
|   |-- pyproject.toml
|   |-- alembic/
|   |   |-- alembic.ini
|   |   |-- env.py
|   |   +-- versions/
|   |
|   +-- app/
|       |-- __init__.py
|       |-- main.py                  # FastAPI app factory
|       |-- config.py                # Pydantic Settings
|       |
|       |-- core/
|       |   |-- security.py          # JWT, password hashing
|       |   |-- dependencies.py      # get_current_user, get_tenant
|       |   |-- database.py          # async engine, session
|       |   |-- storage.py           # S3/MinIO client
|       |   +-- exceptions.py
|       |
|       |-- models/                  # SQLAlchemy ORM modelleri
|       |   |-- tenant.py
|       |   |-- tenant_profile.py
|       |   |-- quote_template.py
|       |   |-- import_template.py
|       |   |-- import_job.py
|       |   |-- user.py
|       |   |-- project.py
|       |   |-- file.py
|       |   |-- cad_analysis.py
|       |   |-- cam_analysis.py
|       |   |-- quote.py
|       |   |-- config.py
|       |   |-- actual_cost.py
|       |   +-- ml_model.py
|       |
|       |-- schemas/                 # Pydantic request/response
|       |   |-- auth.py
|       |   |-- quote.py
|       |   |-- file.py
|       |   +-- ...
|       |
|       |-- api/
|       |   |-- v1/
|       |   |   |-- router.py
|       |   |   |-- auth.py
|       |   |   |-- projects.py
|       |   |   |-- files.py
|       |   |   |-- quotes.py
|       |   |   |-- config.py
|       |   |   |-- analytics.py
|       |   |   +-- ml.py
|       |   +-- websocket.py
|       |
|       |-- services/                # Is mantigi
|       |   |-- quote_engine.py
|       |   |-- formula_engine.py
|       |   |-- file_service.py
|       |   |-- export_service.py    # PDF/Excel uretimi
|       |   |-- import_service.py    # Excel import + kolon eslestirme
|       |   |-- template_service.py  # Sablon yonetimi
|       |   |-- subscription_service.py  # Abonelik + limit kontrolu
|       |   |-- license_service.py   # Self-hosted lisans dogrulama
|       |   +-- analytics_service.py
|       |
|       |-- templates/               # Jinja2 PDF sablonlari
|       |   |-- pdf/
|       |   |   |-- base.html        # Temel PDF sablonu
|       |   |   |-- quote_default.html
|       |   |   +-- quote_detailed.html
|       |   +-- excel/
|       |       +-- quote_default.py  # openpyxl sablon kodu
|       |
|       +-- workers/                 # Celery task'lari
|           |-- celery_app.py
|           |-- cad_processing.py
|           |-- cam_processing.py
|           |-- ml_inference.py
|           +-- ml_training.py
|
|-- cad_engine/                      # CAD parsing (ayri paket)
|   |-- Dockerfile                   # OpenCASCADE iceren agir image
|   |-- pyproject.toml
|   +-- cad_engine/
|       |-- __init__.py
|       |-- parser.py               # STEP/IGES parser
|       |-- cam_parser.py           # G-code/NC parser
|       |-- feature_extractor.py    # CAD feature extraction
|       |-- cam_feature_extractor.py # CAM feature extraction
|       |-- mesh_generator.py
|       +-- complexity.py
|
|-- frontend/
|   |-- Dockerfile
|   |-- package.json
|   |-- next.config.js
|   |-- tailwind.config.ts
|   +-- src/
|       |-- app/                     # Next.js App Router
|       |   |-- layout.tsx
|       |   |-- (auth)/
|       |   |   |-- login/page.tsx
|       |   |   +-- register/page.tsx
|       |   +-- (dashboard)/
|       |       |-- layout.tsx
|       |       |-- page.tsx         # Dashboard
|       |       |-- projects/
|       |       |-- quotes/
|       |       |-- analytics/
|       |       +-- settings/
|       |
|       |-- components/
|       |   |-- ui/                  # shadcn bilesenleri
|       |   |-- cad-viewer/          # Three.js 3D goruntuleyici
|       |   |-- quote-editor/
|       |   |-- file-upload/
|       |   +-- charts/
|       |
|       |-- lib/
|       |   |-- api-client.ts
|       |   |-- auth.ts
|       |   +-- utils.ts
|       |
|       +-- hooks/
|           |-- use-quotes.ts
|           |-- use-files.ts
|           +-- use-analytics.ts
|
|-- ml/                              # ML deney ve pipeline
|   |-- notebooks/
|   |-- feature_engineering.py
|   |-- train.py
|   +-- evaluate.py
|
+-- infra/
    |-- kubernetes/
    |   |-- base/
    |   +-- overlays/
    +-- terraform/                   # Opsiyonel: cloud provisioning
```

---

## 10. Deployment Mimarisi

```
                      +---------------------+
                      |   Load Balancer /    |
                      |   Traefik Ingress    |
                      +---------+-----------+
                                |
           +--------------------+--------------------+
           |                    |                    |
   +-------v------+    +-------v------+    +--------v------+
   |   FastAPI     |    |   FastAPI     |    |   Next.js     |
   |   Backend     |    |   Backend     |    |   Frontend    |
   |   (replika)   |    |   (replika)   |    |   (SSR pod)   |
   +-------+------+    +-------+------+    +---------------+
           |                   |
   +-------v-------------------v--------+
   |          Redis Cluster              |
   |   (Celery broker + cache)           |
   +----------------+------------------+
                    |
       +------------+------------+
       |            |            |
  +----v-----+ +---v------+ +--v-----------+
  | Celery   | | Celery   | | Celery       |
  | Worker   | | Worker   | | Beat         |
  | (CAD)    | | (ML)     | | (zamanlayici)|
  +----------+ +----------+ +--------------+
       |            |
  +----v------------v-----------------------+
  |         PostgreSQL 15+                   |
  |   (primary + read replica)               |
  +------------------------------------------+
       |
  +----v------------------------------------+
  |         MinIO / S3                       |
  |   (CAD dosyalari, modeller, preview)     |
  +------------------------------------------+
```

### Docker Compose (Gelistirme)
Servisler: `api`, `frontend`, `worker-cad`, `worker-ml`, `beat`, `postgres`, `redis`, `minio`, `mlflow`

### Kubernetes (Production)
- **Deployments**: api (2+ replika), frontend (2+ replika), worker-cad (kuyruk derinligine gore otomatik olceklenir)
- **StatefulSets**: PostgreSQL (veya managed: AWS RDS), Redis (veya managed: ElastiCache)
- **CronJob**: model yeniden egitim kontrolleri
- **PersistentVolumeClaim**: MinIO (veya managed S3)

---

## 11. Uygulama Fazlari

### Faz 1: Temel Altyapi (Hafta 1-4)
- [ ] Proje iskeletini olustur (FastAPI, Next.js, Docker Compose)
- [ ] Veritabani semasi + Alembic migration'lari
- [ ] Auth sistemi (JWT, RBAC, multi-tenant middleware + RLS)
- [ ] Tenant CRUD, kullanici yonetimi
- [ ] Konfigurasyon CRUD (malzeme, makine, iscilik)
- [ ] Temel frontend: login, dashboard layout, ayarlar sayfalari

### Faz 2: Dosya Pipeline (Hafta 5-8)
- [ ] Dosya upload (S3/MinIO) - STEP, IGES, G-code, NC, TAP, MPF destegi
- [ ] CAD engine paketi: pythonOCC ile STEP parsing
- [ ] CAM engine paketi: pygcode ile G-code/NC parsing
- [ ] CAD feature extraction pipeline (Celery worker)
- [ ] CAM feature extraction pipeline (Celery worker) - takim, sure, islem bilgisi
- [ ] GLB mesh olusturma (3D onizleme, CAD dosyalari icin)
- [ ] CAD-CAM dosya eslestirme (ayni parca icin CAD + CAM birlikte)
- [ ] Frontend: dosya yukleme, isleme durumu, 3D goruntuleyici, CAM ozet ekrani

### Faz 3: Teklif Motoru (Hafta 9-12)
- [ ] Firma profili ve logo yukleme (tenant_profiles)
- [ ] Kural tabanli teklif olusturma (formul motoru + tenant config)
- [ ] Teklif CRUD (satirlar ve islemler dahil)
- [ ] Insan inceleme is akisi (duzenle, onayla, gonder)
- [ ] Teklif yasam dongusu (taslak -> gonderildi -> kazanildi/kaybedildi)
- [ ] **Gecmis teklif aktarimi (Excel import)**:
  - [ ] Excel dosya yukleme ve kolon okuma (openpyxl)
  - [ ] AI destekli otomatik kolon tespiti (Claude API ile kolon basliklarini analiz et)
  - [ ] Kullanici tarafindan kolon eslestirme arayuzu (drag & drop)
  - [ ] Import sablonu kaydetme (ayni formattaki sonraki dosyalar icin)
  - [ ] Onizleme ekrani (ilk 10 satir eslestirme sonrasi)
  - [ ] Toplu aktarim + hata raporlama
  - [ ] CSV destegi
- [ ] Teklif sablon sistemi (quote_templates) - konfigure edilebilir cikti formati
- [ ] PDF export (WeasyPrint + Jinja2, logo ve firma bilgileri dahil)
- [ ] Excel export (openpyxl, satir detaylari ve formuller dahil)
- [ ] Frontend: teklif editoru, satir duzenleme, sablon ayarlari, PDF/Excel indirme, import ekrani

### Faz 4: AI Entegrasyonu (Hafta 13-16)
- [ ] Claude API entegrasyonu (karmasiklik analizi, teklif metni)
- [ ] Geri bildirim toplama (sonuc takibi, gercek maliyetler)
- [ ] Egitim verisi derleme pipeline
- [ ] Tenant basina XGBoost model egitimi
- [ ] Model versiyonlama ve terfi (MLflow)
- [ ] Benzer parca arama (pgvector embeddingler)

### Faz 5: Analitik ve Cilalama (Hafta 17-20)
- [ ] Analitik dashboard (dogruluk, kazanma orani, model metrikleri)
- [ ] Celery Beat ile otomatik yeniden egitim
- [ ] E-posta bildirimleri
- [ ] Abonelik ve lisanslama sistemi:
  - [ ] Subscriptions tablosu ve usage_tracking
  - [ ] Feature gate middleware (paket bazli ozellik kontrolu)
  - [ ] Kullanim limiti kontrolu (kullanici sayisi, teklif/ay)
  - [ ] 14 gun deneme suresi mekanizmasi
  - [ ] Stripe entegrasyonu (checkout, webhook, fatura)
  - [ ] Self-hosted lisans anahtari uretimi ve dogrulama (RSA imzali JWT)
  - [ ] Self-hosted docker-compose.selfhosted.yml
  - [ ] Admin paneli (tenant yonetimi, lisans uretme, metrikler)
- [ ] Production deployment (Kubernetes)

---

## 12. Lisanslama ve Abonelik Sistemi

### 12.1 Dagitim Modeli: Hibrit (SaaS + Self-Hosted)

```
+---------------------------+       +---------------------------+
|   SaaS (Bulut)            |       |   Self-Hosted             |
+---------------------------+       +---------------------------+
| - Biz host ederiz         |       | - Musteri kendi sunucusu  |
| - Stripe ile odeme        |       | - Lisans anahtari ile     |
| - Otomatik guncelleme     |       | - Yillik lisans yenilemesi|
| - starter, professional   |       | - Sadece enterprise       |
| - Multi-tenant            |       | - Single-tenant           |
+---------------------------+       +---------------------------+
         |                                    |
         v                                    v
  +-------------+                    +-----------------+
  | Lisans      |  <--- API --->     | Lisans Sunucusu |
  | Kontrolu    |   dogrulama        | (License Server) |
  | (runtime)   |                    +-----------------+
  +-------------+
```

### 12.2 Paket Tanimlari

| Ozellik | Trial (14 gun) | Starter | Professional | Enterprise |
|---------|----------------|---------|--------------|------------|
| Kullanici | 3 | 3 | 10 | Sinirsiz |
| Teklif/ay | 30 | 30 | 150 | Sinirsiz |
| CAD analizi | + | + | + | + |
| CAM analizi | + | - | + | + |
| Kural tabanli teklif | + | + | + | + |
| AI destekli teklif | + | - | + | + |
| Excel import | + | - | + | + |
| Benzer parca arama | + | - | + | + |
| PDF/Excel export | + | + | + | + |
| Ozel sablonlar | + | 1 sablon | 5 sablon | Sinirsiz |
| Analitik dashboard | + | Basit | Tam | Tam |
| API erisimi | - | - | - | + |
| Self-hosted kurulum | - | - | - | + |
| Destek | E-posta | E-posta | Oncelikli | Ozel destek |

### 12.3 Veritabani Semalari

```sql
-- Abonelik / Lisans Bilgileri
CREATE TABLE subscriptions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID UNIQUE NOT NULL REFERENCES tenants(id),
    tier            VARCHAR(50) NOT NULL DEFAULT 'trial',
        -- trial, starter, professional, enterprise
    status          VARCHAR(50) NOT NULL DEFAULT 'active',
        -- active, past_due, canceled, expired, suspended
    -- Limitler (paket bazli, override edilebilir)
    max_users       INTEGER NOT NULL DEFAULT 3,
    max_quotes_per_month INTEGER NOT NULL DEFAULT 30,
    -- Deneme suresi
    trial_started_at    TIMESTAMPTZ,
    trial_ends_at       TIMESTAMPTZ,       -- trial_started_at + 14 gun
    -- Stripe bilgileri (SaaS icin)
    stripe_customer_id    VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    -- Self-hosted lisans bilgileri
    license_key         VARCHAR(500),       -- imzali lisans anahtari
    license_expires_at  TIMESTAMPTZ,        -- yillik yenileme tarihi
    license_hardware_id VARCHAR(255),       -- sunucu parmak izi (self-hosted)
    -- Ozellik flaglari (paket bazli varsayilan + ozel override)
    features            JSONB NOT NULL DEFAULT '{}',
    -- Ornek: {
    --   "ai_quotes": true,
    --   "cam_analysis": true,
    --   "excel_import": true,
    --   "similar_parts": true,
    --   "api_access": false,
    --   "max_templates": 5,
    --   "advanced_analytics": true
    -- }
    -- Faturalama donemi
    current_period_start TIMESTAMPTZ,
    current_period_end   TIMESTAMPTZ,
    -- Meta
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Kullanim Takibi (limit kontrolu icin)
CREATE TABLE usage_tracking (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    period_start    DATE NOT NULL,          -- ay baslangici
    period_end      DATE NOT NULL,          -- ay sonu
    quotes_created  INTEGER DEFAULT 0,
    quotes_limit    INTEGER NOT NULL,
    files_uploaded  INTEGER DEFAULT 0,
    ai_predictions  INTEGER DEFAULT 0,
    storage_used_mb DECIMAL(12,2) DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE(tenant_id, period_start)
);

-- Lisans Dogrulama Loglari (self-hosted icin)
CREATE TABLE license_validations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    license_key     VARCHAR(500) NOT NULL,
    hardware_id     VARCHAR(255),
    ip_address      VARCHAR(45),
    validation_result VARCHAR(20),          -- valid, expired, invalid, hardware_mismatch
    validated_at    TIMESTAMPTZ DEFAULT now()
);
```

### 12.4 Lisanslama Mekanizmasi

#### SaaS (Bulut) Akisi

```
Kullanici kayit olur
    |
    v
14 gun ucretsiz deneme baslar (tum ozellikler acik)
    |
    v
Deneme bitmeden: Stripe Checkout ile paket secer
    |
    ├── Starter  -> max_users=3,  max_quotes=30/ay
    ├── Professional -> max_users=10, max_quotes=150/ay
    └── Enterprise   -> sinirsiz
    |
    v
Stripe webhook -> subscriptions tablosu guncellenir
    |
    v
Her API isteginde middleware kontrol eder:
    1. Abonelik aktif mi?
    2. Kullanici limiti asildi mi?
    3. Aylik teklif limiti asildi mi?
    4. Istenen ozellik bu pakette var mi?
```

#### Self-Hosted Lisans Akisi

```
Musteri Enterprise lisans satin alir
    |
    v
Admin panelinden lisans anahtari uretilir
    |  (RSA imzali JWT token: {tenant_id, tier, expires_at, features, max_users})
    v
Musteri kendi sunucusuna kurar (Docker Compose)
    |
    v
Ilk calistirmada lisans anahtari girilir
    |
    v
Uygulama baslarken lisans dogrular:
    1. RSA imzasi gecerli mi? (public key uygulama icinde gomulu)
    2. Suresi dolmus mu?
    3. Hardware ID eslesiyor mu? (CPU ID + MAC address hash)
    |
    v
Periyodik dogrulama (7 gunde bir):
    ├── Internet varsa: Lisans sunucusuna ping (iptal kontrolu)
    └── Internet yoksa: Lokal dogrulama (30 gun grace period)
```

#### Lisans Anahtari Yapisi (Self-Hosted)

```python
# Lisans anahtari = RSA imzali JWT
import jwt
from datetime import datetime, timedelta

def generate_license_key(tenant_id: str, tier: str, features: dict) -> str:
    payload = {
        "tid": tenant_id,
        "tier": tier,
        "features": features,
        "max_users": -1,         # -1 = sinirsiz
        "max_quotes": -1,
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(days=365),
        "hardware_id": None,     # ilk aktivasyonda doldurulur
    }
    return jwt.encode(payload, PRIVATE_KEY, algorithm="RS256")

def validate_license(license_key: str, hardware_id: str) -> dict:
    try:
        payload = jwt.decode(license_key, PUBLIC_KEY, algorithms=["RS256"])

        # Sure kontrolu
        if datetime.utcnow() > datetime.fromtimestamp(payload["exp"]):
            return {"valid": False, "reason": "expired"}

        # Hardware kontrolu (ilk kez ise kaydet)
        if payload["hardware_id"] and payload["hardware_id"] != hardware_id:
            return {"valid": False, "reason": "hardware_mismatch"}

        return {"valid": True, "features": payload["features"]}
    except jwt.InvalidSignatureError:
        return {"valid": False, "reason": "invalid_signature"}
```

### 12.5 Feature Gate Middleware (FastAPI)

```python
from functools import wraps
from fastapi import HTTPException

# Paket bazli varsayilan ozellikler
TIER_FEATURES = {
    "trial": {
        "ai_quotes": True, "cam_analysis": True, "excel_import": True,
        "similar_parts": True, "api_access": False, "max_templates": 999,
        "advanced_analytics": True,
    },
    "starter": {
        "ai_quotes": False, "cam_analysis": False, "excel_import": False,
        "similar_parts": False, "api_access": False, "max_templates": 1,
        "advanced_analytics": False,
    },
    "professional": {
        "ai_quotes": True, "cam_analysis": True, "excel_import": True,
        "similar_parts": True, "api_access": False, "max_templates": 5,
        "advanced_analytics": True,
    },
    "enterprise": {
        "ai_quotes": True, "cam_analysis": True, "excel_import": True,
        "similar_parts": True, "api_access": True, "max_templates": -1,
        "advanced_analytics": True,
    },
}

TIER_LIMITS = {
    "trial":        {"max_users": 3,  "max_quotes_per_month": 30},
    "starter":      {"max_users": 3,  "max_quotes_per_month": 30},
    "professional": {"max_users": 10, "max_quotes_per_month": 150},
    "enterprise":   {"max_users": -1, "max_quotes_per_month": -1},  # -1 = sinirsiz
}

def require_feature(feature_name: str):
    """Endpoint bazli ozellik kontrolu decorator'u"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, tenant=Depends(get_current_tenant), **kwargs):
            subscription = await get_subscription(tenant.tenant_id)

            # Ozel override varsa onu kullan, yoksa paket varsayilani
            features = {**TIER_FEATURES[subscription.tier], **subscription.features}

            if not features.get(feature_name, False):
                raise HTTPException(
                    status_code=403,
                    detail=f"Bu ozellik '{subscription.tier}' paketinde mevcut degil. "
                           f"Lutfen paketinizi yuksletin."
                )
            return await func(*args, tenant=tenant, **kwargs)
        return wrapper
    return decorator

def check_quota(tenant_id: str, resource: str) -> bool:
    """Aylik kullanim limiti kontrolu"""
    usage = get_current_usage(tenant_id)
    subscription = get_subscription(tenant_id)
    limit = TIER_LIMITS[subscription.tier][f"max_{resource}"]
    if limit == -1:
        return True  # sinirsiz
    return getattr(usage, f"{resource}_created", 0) < limit

# Kullanim ornegi
@router.post("/quotes")
@require_feature("ai_quotes")  # sadece AI teklif icin
async def create_ai_quote(tenant=Depends(get_current_tenant)):
    if not check_quota(tenant.tenant_id, "quotes_per_month"):
        raise HTTPException(429, "Aylik teklif limitinize ulastiniz.")
    ...
```

### 12.6 Stripe Entegrasyonu (SaaS)

```python
import stripe

# Webhook handler - Stripe olaylari
@router.post("/webhooks/stripe")
async def stripe_webhook(request: Request):
    event = stripe.Webhook.construct_event(
        payload=await request.body(),
        sig_header=request.headers["stripe-signature"],
        secret=STRIPE_WEBHOOK_SECRET,
    )

    match event["type"]:
        case "checkout.session.completed":
            # Yeni abonelik olusturuldu
            session = event["data"]["object"]
            await activate_subscription(
                tenant_id=session["metadata"]["tenant_id"],
                stripe_customer_id=session["customer"],
                stripe_subscription_id=session["subscription"],
                tier=session["metadata"]["tier"],
            )

        case "invoice.payment_succeeded":
            # Odeme basarili - donemi uzat
            await extend_subscription_period(event["data"]["object"])

        case "invoice.payment_failed":
            # Odeme basarisiz - status -> past_due
            await mark_subscription_past_due(event["data"]["object"])

        case "customer.subscription.deleted":
            # Abonelik iptal edildi
            await cancel_subscription(event["data"]["object"])

    return {"status": "ok"}
```

### 12.7 Self-Hosted Dagitim

Self-hosted musteri icin ozel `docker-compose.selfhosted.yml`:

```yaml
# docker-compose.selfhosted.yml
# Tek komutla kurulum: docker compose -f docker-compose.selfhosted.yml up -d
version: "3.9"
services:
  api:
    image: registry.fiksturasistan.com/api:${VERSION:-latest}
    environment:
      - DEPLOYMENT_TYPE=self_hosted
      - LICENSE_KEY=${LICENSE_KEY}        # musteri lisans anahtari
      - DATABASE_URL=postgresql://...
      - DISABLE_STRIPE=true              # self-hosted'da Stripe yok
      - DISABLE_TELEMETRY=${DISABLE_TELEMETRY:-false}
    ports:
      - "8000:8000"

  frontend:
    image: registry.fiksturasistan.com/frontend:${VERSION:-latest}
    ports:
      - "3000:3000"

  worker-cad:
    image: registry.fiksturasistan.com/worker-cad:${VERSION:-latest}
    environment:
      - LICENSE_KEY=${LICENSE_KEY}

  worker-ml:
    image: registry.fiksturasistan.com/worker-ml:${VERSION:-latest}
    environment:
      - LICENSE_KEY=${LICENSE_KEY}

  postgres:
    image: postgres:15-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine

  minio:
    image: minio/minio
    volumes:
      - minio_data:/data

volumes:
  pgdata:
  minio_data:
```

**Self-hosted guncelleme mekanizmasi:**
- Docker image'lari private registry'den cekilir (lisans key ile auth)
- `fikstur-updater` CLI araci: `fikstur update --check` / `fikstur update --apply`
- Major guncellemeler icin migration scripti otomatik calisir
- Musteri isterse otomatik guncellemeyi kapatabilir

### 12.8 Admin Paneli (Bizim icin)

SaaS yonetimi icin dahili admin paneli:

```
-- Admin API (sadece internal) --
GET    /admin/tenants                       -- tum musteriler
GET    /admin/tenants/{id}/subscription     -- abonelik detayi
PATCH  /admin/tenants/{id}/subscription     -- manual override (ozel limit)
POST   /admin/licenses/generate             -- self-hosted lisans uret
POST   /admin/licenses/revoke               -- lisans iptal et
GET    /admin/metrics/mrr                   -- aylik tekrarlayan gelir
GET    /admin/metrics/churn                 -- kayip orani
GET    /admin/metrics/usage                 -- genel kullanim istatistikleri
```

---

## 13. Riskler ve Azaltma Stratejileri

| Risk | Azaltma |
|------|---------|
| CAD parsing dogrulugu | MVP'de sadece STEP/IGES. En saglam acik kaynak tooling. |
| Tenant basina yetersiz egitim verisi | Kural tabanli motor 1. gunden calisir. ML iyilestirme, gereklilik degil. |
| Model dogruluk beklentileri | Her zaman guven skoru goster. Dusuk guven = insan incelemesi zorunlu. |
| Dosya boyutu ve isleme suresi | Celery ile asenkron isleme. WebSocket ile tamamlanma bildirimi. |
| SolidWorks native dosya destegi | MVP'de STEP export zorunlu. Ileriki fazda FreeCAD veya ticari SDK. |
| CAM dosya format cesitliligi | G-code standart, ama her CNC kontrol unitesi farkli lehce kullanir (Fanuc, Siemens, Heidenhain). Baslangicta en yaygin Fanuc/ISO formati, sonra genislet. |

---

## 13. Onemli Teknik Kararlar

| Karar | Secim | Neden |
|-------|-------|-------|
| Multi-tenancy | Paylasimli sema + RLS | Basit operasyon, dusuk maliyet, guclu izolasyon |
| ML yaklasimi | Tenant basina XGBoost | Imalat maliyet yapilari firmadan firmaya cok farkli |
| CAD parsing | pythonOCC (STEP odakli) | Kutuphane olarak daha kararli, GUI bagimliligi yok |
| Monolith vs mikro | Moduler monolith | Startup icin dogru secim, gerektiginde cikartilir |
| Dosya formati MVP | STEP/IGES + G-code/NC | CAD icin STEP endustri standardi, CAM icin G-code en yaygin format |
| CAM parsing | pygcode + ozel parser | Hafif, bagimlilik az, G-code metin tabanli oldugu icin parsing kolay |
| Dagitim modeli | Hibrit (SaaS + Self-hosted) | Kucuk firmalar SaaS, buyuk firmalar kendi sunucusunda. Genis pazar erisimi |
| Lisanslama | Kullanici + teklif/ay limiti | Basit anlasilir, ozellik bazli degil. 14 gun deneme suresi |
| Self-hosted lisans | RSA imzali JWT | Offline dogrulama mumkun, manipulasyona dayanikli |
| Odeme | Stripe | SaaS icin en yaygin, webhook destegi, Turkiye destekmektedir |

---

## 14. Test Stratejisi

### Genel Yaklasim

| Seviye | Arac | Kapsam |
|--------|------|--------|
| Unit | pytest + pytest-asyncio | Servis katmani (repository mock ile) |
| Entegrasyon | pytest + docker-compose test profili | Gercek PostgreSQL, Redis, RLS izolasyonu |
| E2E | Playwright | Kritik kullanici akislari |
| ML Dogrulama | Ayri test seti | Model kalite esigi kontrolu |

### Unit Testler
- Tum servis siniflarinda repository katmani mock'lenir (`unittest.mock` veya `pytest-mock`)
- CAD/CAM ayrustiricilar `tests/fixtures/` altindaki gercek dosyalarla test edilir
- Her hata kodu en az bir test case'e sahip olmali
- Hedef: kritik is mantigi icin %80+ coverage

### Entegrasyon Testleri
- `docker-compose.test.yml` profili: api, postgres, redis, minio — minIO/S3 yerine gercek MinIO
- Her test tenant izolasyonunu dogrular: A tenantinin verileri B tenantinda gorunmemeli
- Celery task'lari gercek Redis broker ile test edilir (`celery --task-always-eager` kullanilmaz)
- Alembic migration'lari her CI calismasinda sifirdan uygulanir

### E2E Testler (Playwright)
Asagidaki kritik akislar otomatize edilir:
1. Dosya yukleme → CAD analizi → teklif uretme → PDF export
2. Excel aktarma → sutun esleme → iceri aktarma tamamlama
3. Teklif sonucu girme (kazanildi/kaybedildi) → dashboard guncelleme
4. Kullanici olusturma → rol atama → izin dogrulama

### CAD Parser Test Fixtures (`tests/fixtures/cad/`)
| Dosya | Test Ettigi Senaryo |
|-------|---------------------|
| `simple_block.step` | Temel geometri, bounding box, hacim |
| `multi_hole_plate.step` | Delik tespiti, delik sayimi |
| `deep_pocket.step` | Cep derinligi analizi |
| `thin_wall.step` | Ince duvar tespiti |
| `assembly_2parts.step` | Alt montaj iliskisi, parcalara ayirma |
| `degenerate_face.step` | Hozuk geometri → uyari, iptal degil |
| `large_assembly.step` | 6+ seviye derinlik → duzlestirme uyarisi |

### CAM Parser Test Fixtures (`tests/fixtures/cam/`)
| Dosya | Lehce | Test Ettigi Senaryo |
|-------|-------|---------------------|
| `fanuc_basic.nc` | Fanuc | Standart G-code, M30 sonu |
| `siemens_840d.mpf` | Siemens 840D | Siemens soz dizimi |
| `heidenhain_itnc.h` | Heidenhain iTNC | Heidenhain diyalog formati |
| `incomplete_program.nc` | Generic | M30/M02 yok → `program_complete: false` |
| `setup_only.nc` | Generic | Takim yolu yok → CAD-only akisi |
| `unknown_dialect.nc` | Bilinmeyen | Generic ISO fallback |

### ML Model Dogrulama
- Egitim/test bolunmesi: %80 egitim, %20 holdout
- Esligi: **MAPE < %15** — bu esigi gecmeyen model production'a deploy edilmez
- MLflow ile her egitim metrikleri kaydedilir
- Yeniden egitim tetikleme mantigi ayri unit test ile dogrulanir (orneksen: 20 yeni ornekten sonra tetiklenmeli)
- Dusuk guven (%60 alti) senaryosu: `requires_human_review: true` dondugu test edilir

---

## 15. Hata Yonetimi ve Hata Kodlari

### Standart Hata Zarf Formati

```json
{
  "error": {
    "code": "CAD_PARSE_FAILED",
    "message": "STEP dosyasi ayrustirilamadi: gecersiz B-Rep entity.",
    "detail": {
      "file_id": "uuid-...",
      "entity_type": "ADVANCED_BREP_SHAPE_REPRESENTATION",
      "line": 4821
    }
  }
}
```

- `code`: makine tarafindan okunabilir, sabit string
- `message`: kullaniciya gosterilebilir Turkce metin
- `detail`: hata ayiklama icin ek bagla (opsiyonel, hassas veri icermemeli)

### HTTP Durum Kodu Esleme Kurallari

| HTTP Kodu | Ne Zaman |
|-----------|----------|
| 400 | Is mantigi hatasi (gecersiz durum gecisi, islem yapilamaz) |
| 401 | Kimlik dogrulama hatasi |
| 403 | Yetki hatasi (rol yetersiz, tenant uyusmazligi) |
| 404 | Kaynak bulunamadi |
| 422 | Girdi dogrulama hatasi (Pydantic) |
| 429 | Rate limit asildi |
| 500 | Altyapi / beklenmeyen hata |
| 503 | Servis gecici olarak kullanilamiyor (Celery worker down) |

### Hata Kodu Katalogu

#### AUTH — 4001–4099
| Kod | Aciklama |
|-----|----------|
| `AUTH_TOKEN_EXPIRED` | JWT suresi dolmis |
| `AUTH_TOKEN_INVALID` | Gecersiz imza veya format |
| `AUTH_INSUFFICIENT_ROLE` | Islem icin gerekli rol yok |
| `AUTH_TENANT_MISMATCH` | Kaynak baska bir tenanta ait |
| `AUTH_ACCOUNT_SUSPENDED` | Hesap askiya alinmis |

#### FILE — 4101–4199
| Kod | Aciklama |
|-----|----------|
| `FILE_FORMAT_UNSUPPORTED` | Desteklenmeyen dosya uzantisi |
| `FILE_TOO_LARGE` | Boyut hard limit asimda (CAD: 200 MB, CAM: 10 MB) |
| `FILE_VIRUS_DETECTED` | Antivirusten gecemedi |
| `FILE_PARSE_TIMEOUT` | 120 saniye Celery timeout asimda |
| `FILE_CORRUPT` | Dosya okunamadi veya tamamlanmamis |

#### CAD — 4201–4299
| Kod | Aciklama |
|-----|----------|
| `CAD_PARSE_FAILED` | STEP/IGES ayrustirici kritik hata |
| `CAD_GEOMETRY_DEGENERATE` | Sifir hacimli solid veya oz-kesisen yuzey |
| `CAD_ENTITY_UNSUPPORTED` | Bilinmeyen STEP entity (uyari, iptal degil) |
| `CAD_ASSEMBLY_TOO_DEEP` | Alt montaj derinligi > 5 seviye |
| `CAD_NO_SOLID_FOUND` | Dosyada iclenebilir solid yok |

#### CAM — 4301–4399
| Kod | Aciklama |
|-----|----------|
| `CAM_DIALECT_UNSUPPORTED` | Lehce taninamadi, generic fallback basarisiz |
| `CAM_NO_TOOLPATH` | Takim yolu bulunamadi (sadece kurulum dosyasi) |
| `CAM_PROGRAM_INCOMPLETE` | M30/M02 sonu isaretcisi yok |
| `CAM_PARSE_FAILED` | Kritik ayrustirici hatasi |

#### QUOTE — 4401–4499
| Kod | Aciklama |
|-----|----------|
| `QUOTE_CONFIG_MISSING` | Gerekli fiyatlandirma konfigurasyon eksik |
| `QUOTE_ML_LOW_CONFIDENCE` | Guven skoru < 0.6, insan incelemesi gerekli |
| `QUOTE_TEMPLATE_RENDER_FAILED` | PDF/Excel sablon isleme hatasi |
| `QUOTE_LOCKED` | Onaylanmis teklif duzenlenemez |

#### IMPORT — 4501–4599
| Kod | Aciklama |
|-----|----------|
| `IMPORT_COLUMN_MAPPING_FAILED` | Gerekli sutunlar eslenemedih |
| `IMPORT_ENCODING_UNSUPPORTED` | Dosya kodlamasi taninamadi |
| `IMPORT_ROW_LIMIT_EXCEEDED` | 10.000 satir limiti asildi |
| `IMPORT_MISSING_REQUIRED_FIELD` | Zorunlu sutun bos deger iceriyor |
| `IMPORT_FILE_CORRUPT` | Excel dosyasi okunamadi |
| `IMPORT_DUPLICATE_DETECTED` | Tekrarlanan kayitlar saptandi (uyari) |

#### ML — 4601–4699
| Kod | Aciklama |
|-----|----------|
| `ML_INSUFFICIENT_DATA` | Egitim icin yeterli veri yok (< 50 ornek) |
| `ML_MODEL_NOT_FOUND` | Tenant modeli mevcut degil, kural tabanli fallback |
| `ML_PREDICTION_TIMEOUT` | Inference 10 saniyeyi asti |
| `ML_TRAINING_FAILED` | Model egitimi basarisiz |

### Dusuk Guven Akisi
ML guven skoru `< 0.6` oldugunda sistem **teklifi engellemez**. Bunun yerine:
1. Teklif `requires_human_review: true` ile isaretlenir
2. UI'da sari uyari gosterilir: "Bu teklif dusuk guven skoruyla uretildi, lutfen gozden gecirin"
3. Kullanici teklife devam edebilir, duzeltme yapabilir
4. Duzeltme yapilirsa bu ornek ML egitim verisine eklenir

---

## 16. CAD/CAM Ayrustirici Edge Case'leri

### CAD Ayrustirici

#### Dosya Boyutu Politikasi
| Boyut | Davranis |
|-------|----------|
| < 50 MB | Normal isleme, mesh uretilir |
| 50–200 MB | Soft limit: uyari logu, mesh uretimi atlanir |
| > 200 MB | Hard limit: `FILE_TOO_LARGE` hatasi, isleme baslatamiyor |

Buyuk dosyalar icin pythonOCC incremental reader kullanilir; tek seferde belleye yuklenilmez.

#### Alt Montaj Derinligi
- Maksimum 5 seviye desteklenir
- 6+ seviyede: yapi duzlestirilerek islenir, `assembly_warnings: ["depth_exceeded_5_levels"]` eklenir
- Her seviyede parca sayisi ve iliskiler `assembly_relationships` tablosuna kaydedilir

#### Bozuk Geometri
- Sifir hacimli solid → uyari logla, parca atlaniyor, diger parcalara devam et
- Oz-kesisen yuzeyler → uyari, hacim/alan hesabi `null` birakilir
- Bilinmeyen STEP entity tipi → entity atlaniyor, log, ayrustirma iptal **edilmez**
- Tum geometri uyarilari `cad_analyses.geometry_warnings` JSONB alanina yazilir

#### Zaman Asimi
- Celery task timeout: **120 saniye**
- 120 saniyde tamamlanmayan tasklar iptal edilir
- Analiz %50'den fazla tamamlandiysa kisi sonuclar kaydedilir, `analysis_partial: true` isaretlenir
- Kullaniciya WebSocket ile bildirim: "Analiz tamamlanamadi, kismi sonuclar kullanilabilir"

### CAM Ayrustirici

#### Lehce Tespiti
Dosyanin ilk 20 satirindan asagidaki ipuclari aranir:

| Lehce | Belirleyici Isaretler |
|-------|----------------------|
| Fanuc | `%` satiri, `O` program numarasi, `G54`–`G59` |
| Siemens 840D | `%_N_`, `$TC_`, `CYCLE` komutlari |
| Heidenhain iTNC | `BEGIN PGM`, `END PGM`, `BLK FORM` |
| Generic ISO | Hicbiri → fallback, `dialect: "iso_generic"` |
| Tanimsiz | Hicbiri uymuyor → `dialect: "unknown"`, uyari |

#### Eksik Program
- `M30` veya `M02` son isaretcisi bulunamazsa: `program_complete: false`
- Mevcut satira kadar bulunan tum takim yolu bilgisi kaydedilir
- Kullaniciya gosterilir: "G-code programi tamamlanmamis gorunuyor, sonuclar eksik olabilir"

#### Takim Yolu Bulunamadigi Durumlar
- Dosya gecerli G-code ama hareket komutu yok (sadece kurulum): `cam_analysis` atlanir
- Teklif **CAD-only** moduyle devam eder
- `uploaded_files.cam_analysis_status = "skipped_no_toolpath"` olarak isaretlenir

#### CAM Dosya Boyutu
- Hard limit: **10 MB**
- Gerekcesi: G-code metin tabanlidir; 10 MB'den buyuk dosya buyuk ihtimalle CNC programi degil
- `FILE_TOO_LARGE` hatasi, kullaniciya net mesaj verilir

---

## 17. Excel Ice Aktarma Edge Case'leri

### Dosya Kodlamasi
Asagidaki sirayla denenir; ilk basarili kodlama kullanilir:

1. UTF-8
2. UTF-8-BOM
3. Windows-1254 (Turkce)
4. Windows-1252 (Bati Avrupasi)
5. Latin-1

Hicbiri temiz decode etmezse: `IMPORT_ENCODING_UNSUPPORTED` hatasi.
Tespit edilen kodlama `import_jobs.detected_encoding` alanina loglanir.

### Tarih Formati Normalizmasyonu
- `dateutil.parser` Turkce ayar ipuclariyla calistirilir
- Belirsiz tarihler (orneksen `04/05/2023`: Nisan mi, Mayis mi?) kullaniciya gosterilir, onay beklenir
- Tum tarihler veritabaninda **ISO 8601** (`YYYY-MM-DD`) formatinda saklanir
- Sadece yil iceren hucreler (orneksen `2022`) → `2022-01-01` olarak normalize edilir, uyari eklenir

### Bos ve Null Hucreler
| Sutun Turu | Davranis |
|------------|----------|
| Zorunlu sutun (parca adi, teklif tutari) | `IMPORT_MISSING_REQUIRED_FIELD` hatasi, satir reddedilir |
| Opsiyonel sutun | `None` olarak kaydedilir (**0 ile doldurulmaz**) |
| Bos baslik satiri | Sutun atlaniyor, uyari ekleniyor |

### Buyuk Dosyalar
- `openpyxl` **read-only modu** ile akissal okuma (tum dosya belleye yuklenilmez)
- Satir limiti: **10.000 satir** per import islemi
- Limit asilirsa: ilk 10.000 satir islenir, kalan reddedilir; `import_jobs.rejected_row_count` alanina yazilir
- Kullaniciya bildirim: "X satir islendi, Y satir limit asildiginden atlanir"

### Formul Hucreler
- openpyxl son hesaplanan deger okunur (Excel'in onbellegindeki deger)
- Onbellekte deger yoksa ve formul varsa → `null` kabul edilir, uyari loglanir
- Kullaniciya onerisi: "Excel dosyasini kaydetmeden once formulleri hesaplatip kaydedin"

### Yinelenen Kayit Tespiti
- Hash anahtari: `SHA256(parca_numarasi OR (parca_adi + teklif_tarihi + tutar))`
- Yineleneler **hata olarak degil uyari olarak** raporlanir
- Kullanici secenekleri: "Hepsini atla" / "Hepsinin uzerine yaz" / "Tek tek sec"
- Secim yapilmadan import tamamlanmaz

### Sutun Esleme (AI Destekli)
- Claude API'ye ilk 3 satir ornek olarak gonderilir
- Her zorunlu sutun icin guven skoru hesaplanir
- **Guven < 0.7** olan zorunlu sutun varsa: kullanici arayuzde manuel esleme yapmak zorunda
- Eslemeler `import_templates` tablosuna kaydedilir (sonraki importlarda otomatik oneriler)
- AI cagrisinin maliyet optimizasyonu: sadece ilk aktarimda veya yeni sutun adi guncelleme durumunda yapilir

### Bozuk Dosyalar
- `openpyxl.utils.exceptions.InvalidFileException` yakalanir → `IMPORT_FILE_CORRUPT`
- Dairesel referanslar: openpyxl bu durumda son kaydedilmis degeri kullanir; kritik hata uretmez
- Sifre korumal Excel dosyalari: `IMPORT_FILE_CORRUPT` (sifre girisini desteklemiyoruz)
- `.xls` (eski format) → `FILE_FORMAT_UNSUPPORTED`; kullaniciya `.xlsx`'e donusturmesi onerilir

---

## 18. ML Model Detaylari

### Ozellik Normalizasyonu

Tum sayisal ozellikler XGBoost/LightGBM egitiminden once normalize edilir:

| Ozellik Grubu | Yontem | Gerekcesi |
|---------------|--------|-----------|
| Hacim, alan, boyutlar | Log1p → StandardScaler | Genis aralik, sag carpik dagilim |
| Delik sayisi, yuz sayisi | RobustScaler | Aykiri deger duyarsizligi |
| Karmasiklik skoru (0-1) | Oldufu gibi | Zaten normalize |
| Kategorik (malzeme, makine turu) | OrdinalEncoder + embedding | XGBoost icin integer |
| Surekli sure (dakika) | Log1p | CAM suresi cok genis aralik |

Scaler nesneleri her tenant modeli icin ayri `ml_models` kaydina eklenmis artifact olarak MLflow'da saklanir. Tahmin sirasinda egitim scaleri kullanilir (test zamaninda fitting yapilmaz).

### CAD-Only Teklif (CAM Verisi Olmadan)

Bir parcaya CAM dosyasi yuklenmemisse model farkli bir ozellik kumesiyle calisir:

- CAM ozellikleri (`cutting_time_min`, `tool_count`, `axis_count`, vb.) `NaN` olarak beslenir
- XGBoost `enable_categorical=True` ve `missing=NaN` ayariyla egitilir; eksik CAM ozellikleri icin agac bolumleri `NaN` koluna gider
- `cam_available: false` binary ozelligi her iki modele de eklenir
- CAD-only tahminler genellikle daha genis guven araligi uretir; bu kullaniciya gosterilir
- Kiyas: CAD+CAM tahmin guven skoru ortalamasinin en az %85'i olmayan CAD-only tahminler `requires_human_review: true` ile isaretlenir

### Guven Skoru Hesaplama

Guven skoru iki kaynaktan bileserek hesaplanir:

```
guven_skoru = 0.6 * model_guven + 0.4 * veri_kalitesi_skoru
```

**model_guven**: XGBoost quantile regression ile %10-%90 tahmin araligi kullanilarak:
```
model_guven = 1 - (q90 - q10) / tahmin_degeri
```
0 ile 1 arasina kistirılir (clip).

**veri_kalitesi_skoru**: Asagidaki faktorler cikartilarak hesaplanir:
- Egitim kumesinde benzer parca sayisi (pgvector cosine similarity > 0.85)
- Tahmin degerinin egitim dagilimi icinde olup olmadigi (IQR kontrolu)
- Eksik ozellik orani

Iki kaynak da 0–1 araligina normalize edilip agirlikli ortalama alinir.

### Yeniden Egitim Tetikleme

20 yeni ornek sabit esik degil, adaptif bir yaklasimdir:

| Kosul | Tetikleme |
|-------|-----------|
| 20 yeni etiketli ornek birikmis | Hemen tetikle |
| 7 gun gecmis ve en az 5 yeni ornek | Haftalik otomatik |
| Ortalama MAPE son 50 ornekte > %20 | Ivedi yeniden egitim + uyari |
| Kullanici "Modeli yenile" duser | Manuel tetikleme (Admin rolü) |

Tetikleme mantigi `workers/ml_training.py` Celery task'inda uygulanir. Her tetiklemede onceki model versiyonu MLflow'da arsivsle saklanir; geri alma (rollback) Admin panelinden yapilabilir.

### Ozellik Onemi ve Aciklanabilirlik

Her tenant modeli icin SHAP degerleri hesaplanir ve saklanir:
- En etkili 10 ozellik `ml_models.feature_importance` JSONB alanina yazilir
- Teklif detay sayfasinda "Bu teklifi etkileyen faktorler" seklinde gosterilir (kullaniciya aciklanabilirlik)
- Anormal SHAP degerleri (bir ozellik tahminın %70'inden fazlasini acikliyorsa) uyari tetikler

---

## 19. Guvenlik Uygulama Detaylari

### JWT Anahtar Rotasyonu

- **Access token**: 15 dakika omur, RS256 ile imzali
- **Refresh token**: 30 gun omur, PostgreSQL'de `refresh_tokens` tablosunda saklanir (iptal edilebilir)
- **Anahtar cift rotasyonu**: Her 90 gunude bir yeni RSA anahtar cifti uretilir
  - Yeni cift `keys/current/` dizinine, eski cift `keys/previous/` dizinine tasınır
  - Dogrulama sirasinda her iki cift de denenir (onceki token'larla uyumluluk)
  - `previous` anahtarlar 24 saat sonra silinir
- Anahtar dosyalari Kubernetes Secret veya Vault'ta saklanir, git'e kesinlikle girmez
- Self-hosted kurulum icin `scripts/rotate_keys.sh` betigi saglanir

### Parola Sifirlama Akisi

```
1. Kullanici "Sifremi unuttum" formuna e-posta girer
2. Sistemde kayitli olsun ya da olmasin, "E-posta gonderildi" mesaji gosterilir (enumeration onleme)
3. Kayitliysa: 1 saatlik sure imzali JWT reset token uretilir
4. E-posta: reset URL + token (URL'de degil, POST body'de gonderilir)
5. Token tek kullanimlik (PostgreSQL'de kullanildi olarak isaretlenir)
6. Yeni sifre: min 12 karakter, 1 buyuk + 1 rakam + 1 ozel karakter zorunlu
7. Basarili sifre sifirlamada tum aktif refresh tokenlar iptal edilir
```

### Rate Limiting Esikleri

Redis tabanli kayan pencere algoritmasiyla uygulanir:

| Endpoint Grubu | Limit | Pencere |
|----------------|-------|---------|
| Auth (login, register) | 10 istek | 15 dakika / IP |
| Parola sifirlama | 3 istek | 1 saat / IP |
| Dosya yukleme | 20 dosya | 1 saat / tenant |
| CAD/CAM analiz tetikleme | 50 istek | 1 saat / tenant |
| Excel import | 5 is | 1 saat / tenant |
| Genel API | 1000 istek | 1 dakika / tenant |
| Claude API proxy | 100 istek | 1 saat / tenant |

Limit asiminda HTTP 429 + `Retry-After` basliği dondurulur.

### CORS Politikasi

```python
# Uretim ortami
CORS_ORIGINS = [
    "https://app.fikstur.io",
    "https://www.fikstur.io",
]
# Self-hosted: tenant yapilandirmasindaki `allowed_origins` listesi
# Gelistirme: CORS_ORIGINS = ["http://localhost:3000"]
```

- `credentials: true` (cookie/auth basliği icin)
- Izin verilen metodlar: `GET, POST, PUT, PATCH, DELETE, OPTIONS`
- Izin verilen basliklar: `Content-Type, Authorization, X-Tenant-ID`
- Preflight max-age: 600 saniye

### Dosya Yukleme Guvenlik Katmanlari

1. **MIME tipi dogrulama**: Sadece `Content-Type` basligina degil, `python-magic` ile gercek dosya imzasina bakilir
2. **Uzanti izin listesi**: `.step .igs .iges .nc .tap .mpf .h .xlsx` — diger her sey reddedilir
3. **Antivirustan gecis**: ClamAV (`clamd`) ile asenkron tarama
   - Dosya once karantina bucket'ina yuklenir (MinIO `quarantine/`)
   - ClamAV temiz rapor verirse `uploads/` bucket'ina tasınır
   - Virusluysa dosya silinir, kullaniciya `FILE_VIRUS_DETECTED` hatasi
4. **Dosya adi sanitasyonu**: Orijinal ad `secure_filename()` ile temizlenir; depolamada UUID kullanilir
5. **Direkt URL erisimi engeli**: MinIO presigned URL (15 dakika sureli), kalici URL yok

### Tenant Izolasyon Denetimi

PostgreSQL RLS politikalarina ek olarak:
- Her API istek orta katmani (middleware) `tenant_id`'yi JWT'den cikartir ve `SET app.current_tenant_id` ile oturum degiskeni olarak ayarlar
- RLS `USING (tenant_id = current_setting('app.current_tenant_id')::uuid)` seklinde calisir
- Entegrasyon testlerinde A tenanti icin oturum acip B tenantinin kaynaklarına erisim denenir; 404 veya 403 beklenir

---

## 20. Yedekleme ve Veri Saklama

### RPO / RTO Hedefleri

| Senaryo | RPO (Veri Kaybi) | RTO (Kurtarma Suresi) |
|---------|-----------------|----------------------|
| SaaS — birincil DB arizasi | < 5 dakika | < 30 dakika |
| SaaS — tam bolge erisim kaybı | < 1 saat | < 4 saat |
| Self-hosted — disk arizasi | Kullanici politikasina bagli | Kullanici sorumluluğunda |

### SaaS Yedekleme Stratejisi

**PostgreSQL**:
- **WAL arsivleme**: S3'e surekli aktarim (point-in-time recovery destegi)
- **Tam yedek**: Gunluk saat 02:00 UTC, `pg_dump` ile sifreli S3'e
- **Saatlik snapshot**: Son 24 saat icin saatlik yedek
- **Saklama suresi**: 30 gun tam yedek, 7 gun saatlik yedek
- Yedek butunlugu her hafta otomatik restore testi ile dogrulanir (ayri test ortami)

**MinIO / S3 (dosyalar)**:
- S3 versiyonlama aktif: silinen/uzerine yazilan dosyalar 90 gun kurtarilabilir
- Cografik replikasyon: ikinci bolgeye asenkron kopyalama

**Redis**:
- Celery kuyruk verisi gecici; yedeklenmez
- Cache verisi gecici; yedeklenmez

### GDPR / KVKK Veri Silme Akisi

```
1. Tenant "Hesabi sil" talep eder (Admin paneli veya destek bileti)
2. 30 gun bekleme suresi baslar (geri alma imkani)
3. Bekleme suresi dolunca veya kullanici ivedi silme talep ederse:
   a. Tum tenant verileri (quotes, files, users, analyses) silinir
   b. MinIO'daki dosyalar hard-delete edilir
   c. ML modelleri ve egitim verileri silinir
   d. PostgreSQL satırlari `DELETE` ile kalici olarak kaldırılir
   e. Yedeklerden silme: 30 gun sonra yedekler dogal olarak expire olur
4. Silme tamamlaninca tenant'a onay e-postasi gonderilir
5. Silme logu (tenant_id, silme tarihi, tetikleyen kullanici) ayri audit tablosunda 5 yil saklanir
```

Bireysel kullanici silme (KVKK basvurusu):
- Kullanici kaydi anonimlestirilir: ad/soyad/e-posta rastgele degerle ezilir
- Kullanicinin urettigi teklifler tenant'ta kalir (is kaydi), sadece kisisel veri silinir

### Veri Saklama Politikalari

| Veri Turu | Saklama Suresi | Gerekcesi |
|-----------|---------------|-----------|
| Aktif teklif kayitlari | Tenant aktif oldugu surece | Is verisi |
| Tamamlanmis teklifler (outcome girilmis) | 7 yil | Muhasebe/denetim |
| Yuklenen dosyalar (CAD/CAM) | 2 yil (aktif tenant) | Depolama maliyeti |
| ML egitim verileri | Model aktif oldugu surece + 1 yil | Model reproducibility |
| API erisim loglari | 90 gun | Guvenlik denetimi |
| Audit loglari (kullanici islemleri) | 5 yil | Uyumluluk |
| Dogrulama e-postalari | 24 saat | Gecici islem |

### Self-Hosted Yedekleme Rehberi

Self-hosted musteriler icin `docs/self-hosted/backup.md` belgesi saglanir:
- `scripts/backup.sh`: `pg_dump` + MinIO mc mirror komutlariyla otomatik yedekleme
- Cron ornek: `0 2 * * * /opt/fikstur/scripts/backup.sh`
- Yedek dogrulama: `scripts/verify_backup.sh` ile restore testi
- Minimum onerilen: gunluk yedek, 30 gun saklama

---

## 21. CI/CD Pipeline

### Genel Mimarı

```
GitHub (kaynak) → GitHub Actions → Docker Registry → Ortam Deploy
                                                    ├── staging (otomatik)
                                                    └── production (manuel onayli)
```

### GitHub Actions Is Akislari

#### `ci.yml` — Her PR ve main push icin

```yaml
jobs:
  lint:       # ruff (Python), ESLint (TS), mypy tip kontrolu
  test-unit:  # pytest unit testler, coverage raporu
  test-integration:  # docker-compose ile postgres+redis ayakta, RLS testleri
  test-e2e:   # Playwright, staging-benzeri ortamda
  build:      # Docker imajlari build + push (sadece main branch)
  security:   # Trivy ile imaj tarama, Bandit ile Python SAST
```

#### `deploy-staging.yml` — main branch'e push sonrasi otomatik

```yaml
jobs:
  deploy:
    # Kubernetes staging namespace'ine helm upgrade
    # Smoke test: /health endpoint kontrolu
    # Bildirim: Slack #deployments kanaline
```

#### `deploy-production.yml` — Manuel tetikleme (GitHub Environment onay)

```yaml
jobs:
  deploy:
    environment: production  # Koruyucu kural: 2 reviewer onayi gerekli
    steps:
      - Alembic migration (--check once, sonra upgrade)
      - Helm upgrade --atomic (basarisizlikta otomatik geri alma)
      - Post-deploy smoke test
      - Sentry release olusturma
```

#### `ml-retrain.yml` — Zamanlanmis (haftalik Pazar 03:00 UTC)

```yaml
jobs:
  retrain:
    # Tum tenantlar icin yeniden egitim tetikle
    # MLflow'da sonuclari kaydet
    # MAPE esgeri gecemeyen modeller icin uyari gonder
```

### Docker Imaj Stratejisi

```
backend:latest    → FastAPI + Alembic
worker:latest     → Celery worker (CAD/CAM/ML islemleri)
frontend:latest   → Next.js (standalone output)
cad-engine:latest → pythonOCC + cadquery (agir bagimliliklar ayri imajda)
```

`cad-engine` imaji pythonOCC derleme suresi nedeniyle ayri tutulur; sadece CAD kutuphaneleri degistiginde yeniden derlenir.

### Ortam Degiskenleri Yonetimi

| Ortam | Yontem |
|-------|--------|
| Gelistirme | `.env` dosyasi (git'e girmiyor, `.env.example` saglanir) |
| Staging/Production | GitHub Actions Secrets → Kubernetes Secrets |
| Self-hosted | `.env` dosyasi, kurulum sirasinda olusturulur |

### Self-Hosted Guncelleme Rehberi

`docs/self-hosted/upgrade.md`:
1. `docker-compose pull` ile yeni imajlari indir
2. `docker-compose run --rm api alembic upgrade head` (migration once)
3. `docker-compose up -d` ile servisleri yeniden baslat
4. `docker-compose run --rm api python -m app.checks.post_upgrade` ile dogrula

Buyuk surum atlayan musteriler icin `docs/self-hosted/migration-notes/` altinda surume ozel notlar bulundurulur (orneksen `v1-to-v2.md`).

---

## 22. Frontend Bilesen Spesifikasyonu

### Sayfa Haritasi (App Router)

```
/                          → Pazarlama landing (oturum acilmamissa)
/login                     → Giris formu
/register                  → Kayit + tenant olusturma
/dashboard                 → Ana panel
/projects                  → Proje listesi
/projects/[id]             → Proje detay + dosya listesi
/quotes                    → Teklif listesi (filtrelenebilir)
/quotes/new                → Yeni teklif sihirbazi
/quotes/[id]               → Teklif detay + duzenleme
/quotes/[id]/preview       → PDF onizleme
/import                    → Excel aktarma akisi
/settings/company          → Sirket bilgileri + logo
/settings/pricing          → Malzeme / makine / iscilik orani konfigurasyon
/settings/templates        → PDF/Excel sablon yonetimi
/settings/users            → Kullanici yonetimi (Admin)
/settings/integrations     → Webhook + API anahtarlari
/analytics                 → Analitik dashboard
/admin                     → Tenant yonetim paneli (super-admin)
```

### Yeni Teklif Sihirbazi Akisi (`/quotes/new`)

4 adimli sihirbaz, her adim URL hash ile izlenir (`#step-1` … `#step-4`):

```
Adim 1 — Dosya Yukle
  ├── Surukle-birak alani (CAD + CAM ayri alanlar)
  ├── Desteklenen format badgeleri
  ├── Yukleme ilerlemesi (WebSocket ile gercek zamanli)
  └── "Sadece CAD" secenegi (CAM opsiyonel)

Adim 2 — Analiz Sonuclari
  ├── 3D viewer (Three.js, @react-three/fiber)
  │   ├── Orbitsel kamera kontrolu (mouse drag/scroll)
  │   ├── Tum / tel kafes / kesit görünüm modlari
  │   └── Bounding box overlay
  ├── CAD metrikleri karti (hacim, alan, delik sayisi, karmasiklik skoru)
  ├── CAM metrikleri karti (toplam sure, takim sayisi, eksen sayisi)
  └── Geometri uyarilari (varsa sari badge)

Adim 3 — Teklif Duzenleme
  ├── Satir kalemleri tablosu (React Hook Form + Zod)
  │   ├── Malzeme, islem, makine, iscilik kalemler
  │   ├── Her satirda birim fiyat / miktar / toplam
  │   └── Satir ekleme / silme / siralama (drag-and-drop)
  ├── Genel toplam + KDV hesabi (sag panel)
  ├── ML guven skoru indicator (yuksek/orta/dusuk renk kodlu)
  ├── "Benzer Parcalar" secimi (pgvector sonuclari, 3 kart)
  └── Notlar ve musteriye ozel indirim alani

Adim 4 — Onizleme ve Gonder
  ├── PDF onizleme (WeasyPrint HTML iframe)
  ├── Sablon secici (dropdown)
  ├── Dil secimi (TR / EN)
  └── "Taslak Kaydet" / "Teklif Olustur" butonlari
```

### Dashboard Yerlesimi (`/dashboard`)

```
┌─────────────────────────────────────────────┐
│  Ustbant: Logo | Tenant adi | Kullanici menu │
├──────────┬──────────────────────────────────┤
│          │  Ozet Karti Satiri (4 kart):      │
│  Sol     │  Bu ay teklifler | Kazanma orani  │
│  Menu    │  Ort. teklif tutari | Bekleyen    │
│  (sabit) ├──────────────────────────────────┤
│          │  Model Dogrulugu Grafigi          │
│          │  (son 90 gun MAPE, Recharts line) │
│          ├──────────────────────────────────┤
│          │  Son Teklifler Tablosu (5 satir)  │
│          │  + "Tumunu Gor" linki             │
│          ├──────────────────────────────────┤
│          │  Kazanildi / Kaybedildi Pasta     │
│          │  + Kayip Nedeni Dagilimi          │
└──────────┴──────────────────────────────────┘
```

### Kritik UI Etkileşim Kurallari

- **Optimistik guncelleme**: Teklif satiri duzenlemeleri UI'da aninda yansir, API basarisizlikta geri alinir
- **Otomatik kaydetme**: Teklif taslagi her 30 saniyede bir arka planda kaydedilir; "Kaydedildi" timestamp gosterilir
- **Onaylanmis teklif kilidi**: `status = "approved"` sonrasinda tum alanlar readonly; duzenleme icin "Yeni Revizyon Olustur" butonu
- **Dusuk guven uyarisi**: Guven < 0.6 → sari banner "Bu teklif insan incelemesi gerektiriyor"; teklif engellenmez
- **Bos durum ekranlari**: Her liste sayfasinda veri yoksa yonlendirici bos durum (ikon + aciklama + CTA butonu)
- **Yuklenme durumlari**: Skeleton loader (spinner degil) tum kart/tablo bilesenleri icin

### Form Dogrulama Kurallari

| Alan | Kural |
|------|-------|
| Teklif tutari | > 0, maks 15 haneli sayi, 2 ondalik |
| Malzeme birim fiyati | > 0, zorunlu |
| Musteri e-postasi | RFC 5322 format, opsiyonel |
| Dosya yukleme | Izin verilen uzantilar, maks boyut kontrol istemci tarafinda da yapilir |
| Sablon adi | 3–100 karakter, ozel karakter yasak |

---

## 23. Dis Sistem Entegrasyonlari (Webhook ve ERP)

### Giden Webhook Sistemi

Musteriler kendi sistemlerine olay bildirimi alabilir. Yapilandirma `/settings/integrations` sayfasindan yapilir.

#### Olay Katalogu

| Olay | Tetikleyici |
|------|------------|
| `quote.created` | Yeni teklif olusturuldu |
| `quote.approved` | Teklif onaylandi (imzaya hazir) |
| `quote.outcome_set` | Musteri sonucu girildi (kazanildi/kaybedildi) |
| `quote.pdf_generated` | PDF export tamamlandi |
| `file.analysis_complete` | CAD/CAM analizi bitti |
| `file.analysis_failed` | Analiz basarisiz oldu |
| `import.complete` | Excel aktarma tamamlandi |
| `import.failed` | Excel aktarma basarisiz |
| `ml.model_retrained` | Model yeniden egitildi, yeni MAPE degeri |
| `tenant.quota_warning` | Aylik teklif limitinin %90'ina ulasildi |

#### Webhook Teslimat Mekanizmasi

```
1. Olay tetiklenir → `webhook_events` tablosuna yazilir (status: pending)
2. Celery task: HTTPS POST, 10 saniye timeout
3. Basarisiz → 5 deneme, exponential backoff (1s, 2s, 4s, 8s, 16s)
4. 5 denemede de basarisiz → status: failed, tenant'a bildirim
5. Basarili → status: delivered, response_code kaydedilir
```

#### Webhook Imzalama

Her istek `X-Fikstur-Signature` basligiyla imzalanir:
```
signature = HMAC-SHA256(secret_key, f"{timestamp}.{body}")
X-Fikstur-Signature: t=1712345678,v1=abc123...
```
Alici sistemler replay saldirisini onlemek icin timestamp'i dogrular (5 dakika tolerans).

#### Veritabani Tablosu

```sql
CREATE TABLE webhook_endpoints (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id),
    url         TEXT NOT NULL,
    secret_key  TEXT NOT NULL,  -- sifreli saklanir
    events      TEXT[] NOT NULL,  -- abone olunan olaylar
    is_active   BOOLEAN DEFAULT true,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE webhook_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL,
    endpoint_id     UUID REFERENCES webhook_endpoints(id),
    event_type      TEXT NOT NULL,
    payload         JSONB NOT NULL,
    status          TEXT DEFAULT 'pending',  -- pending/delivered/failed
    attempt_count   INT DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    response_code   INT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### ERP Entegrasyon Iskelet API'si

MVP sonrasi icin, ancak API tasarimi simdi tanimlanir:

```
GET  /api/v1/erp/quotes          → ERP sisteminin cekebilecegi teklif listesi
GET  /api/v1/erp/quotes/{id}     → Tek teklif detayi (ERP uyumlu format)
POST /api/v1/erp/actual-costs    → ERP'den gelen gercek maliyet push'u
GET  /api/v1/erp/materials       → Malzeme katalogu senkronizasyonu
```

ERP entegrasyonu API anahtari (Bearer token) ile kimlik dogrulama kullanir; tenant JWT'si degil. Anahtarlar `/settings/integrations` sayfasindan yonetilir.

---

## 24. Izleme, Uyari ve SLA

### Servis Duzey Hedefleri (SLO)

| Metrik | Hedef | Kritik Esik |
|--------|-------|-------------|
| API p99 yanit suresi | < 500 ms | > 2 saniye |
| API p50 yanit suresi | < 100 ms | > 500 ms |
| Kullanilabilirlik (uptime) | > %99.5 / ay | < %99 |
| CAD analiz tamamlanma | < 60 saniye | > 120 saniye |
| CAM analiz tamamlanma | < 30 saniye | > 60 saniye |
| PDF export suresi | < 10 saniye | > 30 saniye |
| Celery kuyruk derinligi | < 100 gorev | > 500 gorev |

### Prometheus Metrik Katalogu

**FastAPI (otomatik `prometheus-fastapi-instrumentator`):**
- `http_request_duration_seconds` (histogram, endpoint bazli)
- `http_requests_total` (counter, status_code bazli)

**Ozel uygulama metrikleri:**
```python
# Ornekler:
cad_analysis_duration = Histogram("cad_analysis_duration_seconds", ...)
cad_analysis_total = Counter("cad_analysis_total", ["status", "tenant_id"], ...)
ml_prediction_confidence = Histogram("ml_prediction_confidence", ...)
quote_created_total = Counter("quote_created_total", ["tenant_id"], ...)
celery_queue_depth = Gauge("celery_queue_depth", ["queue_name"], ...)
webhook_delivery_total = Counter("webhook_delivery_total", ["status"], ...)
```

### Grafana Alert Kurallari

#### Kritik (PagerDuty + Slack #oncall)

| Kural | Kosul | Sure |
|-------|-------|------|
| API yuksek hata orani | HTTP 5xx > %5 | 5 dakika |
| API yanit suresi | p99 > 2 saniye | 5 dakika |
| PostgreSQL baglanti havuzu | Kullanimda > %90 | 3 dakika |
| Disk dolulugu | > %85 | 10 dakika |
| Celery worker yok | Worker sayisi = 0 | 2 dakika |

#### Uyari (Slack #alerts)

| Kural | Kosul | Sure |
|-------|-------|------|
| Yuksek kuyruk derinligi | > 500 gorev | 10 dakika |
| CAD analiz zaman asimi orani | > %10 | 15 dakika |
| ML tahmin guven dusuk | Ortalama < 0.5 | 1 saat |
| Webhook teslimat basarisizligi | > %20 basarisiz | 15 dakika |
| Bellek kullanimi yuksek | > %80 | 10 dakika |
| Sertifika suresi yaklasıyor | < 14 gun kaldi | Gunluk |

### Grafana Dashboard Yapisi

```
Genel Bakis Paneli
├── Servis durumu (yeşil/sarı/kırmızı LED)
├── Son 24 saatte istek sayisi + hata orani
├── p50 / p95 / p99 yanit suresi grafigi
└── Aktif Celery worker sayisi

Is Metrikleri Paneli
├── Gunluk teklif sayisi (tenant bazli)
├── CAD analiz basari/basarisizlik orani
├── ML guven skoru dagilimi (histogram)
└── Webhook teslimat basari orani

Altyapi Paneli
├── PostgreSQL baglanti havuzu kullanimi
├── Redis bellek kullanimi
├── MinIO depolama dolulugu
└── Celery kuyruk derinligi (queue bazli)
```

### Loglama Yapisi

Her log satiri JSON formatinda asagidaki alanlari icerir:

```json
{
  "timestamp": "2026-04-07T10:23:45.123Z",
  "level": "INFO",
  "service": "api",
  "tenant_id": "uuid-...",
  "user_id": "uuid-...",
  "request_id": "uuid-...",
  "method": "POST",
  "path": "/api/v1/quotes",
  "duration_ms": 143,
  "status_code": 201,
  "message": "Quote created"
}
```

- `tenant_id` ve `request_id` tum log satirlarinda bulunur (korelasyon icin)
- Hassas veriler (sifre, API anahtari, JWT token) log'a kesinlikle yazilmaz
- Loki'de `tenant_id` ve `level` uzerine indeks; tipik sorgu suresi < 2 saniye
