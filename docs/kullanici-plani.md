# Fikstur Teklif Asistani - Kullanici Plani

## Bu Sistem Ne Yapar?

Fikstur Teklif Asistani, imalat atolyeniz icin **yapay zeka destekli otomatik teklif hazirlama sistemidir**. Musteriniz size bir parca cizdirdiginde, bu sisteme dosyayi yuklersiniz ve sistem sizin icin teklif hazirlayarak yardimci olur.

Sistem zamanla sizin is yapisindanogrenirogenirceginisogrenir ve gittikce daha dogru teklifler vermeye baslar.

---

## Nasil Calisir? (Adim Adim)

### Adim 1: Dosya Yukleme
- Musterinizden gelen teknik cizim dosyalarini (STEP veya IGES formati) sisteme yuklersiniz
- SolidWorks kullaniyorsaniz "Farkli Kaydet" ile STEP formatinda export edebilirsiniz
- **CAM dosyalarini da yukleyebilirsiniz** (G-code, NC, TAP, MPF formatlari)
  - CAM dosyasi yuklerseniz sistem islem surelerini, kullanilan takimlari ve makine bilgilerini otomatik cikarir
  - Bu sayede teklif dogrulugu onemli olcude artar
- Birden fazla parca veya montaj dosyasi yukleyebilirsiniz
- Ayni parca icin hem CAD hem CAM dosyasi yukleyebilirsiniz (sistem ikisini eslestirir)

### Adim 2: Otomatik Analiz
- Sistem yuklenen dosyayi otomatik olarak inceler
- **CAD dosyalari icin:**
  - Parcanin boyutlarini, hacmini, yuzey alanini cikarir
  - Delikleri, cepleri, disleri ve diger ozellikleri sayar
  - Parcanin ne kadar karmasik oldugunu hesaplar
  - 3 boyutlu gorunumunu ekranda gorebilirsiniz
- **CAM dosyalari icin:**
  - Toplam islem suresini hesaplar (kesme suresi + hizli hareket suresi)
  - Kullanilan takimlari ve sayilarini cikarir (matkap, freze vs.)
  - Takim degisim sayisini belirler
  - Hangi makinede yapilacagini tespit eder (3 eksen, 5 eksen, torna vs.)
  - Devir ve ilerleme bilgilerini okur
  - Sogutma sivisi kullanilip kullanilmadigini belirler

### Adim 3: Yapay Zeka Teklif Olusturur
- Sistem, analiz sonuclarina ve sizin tanimladiginiz fiyatlara bakarak bir teklif hazirlar
- Teklif soyle ayrintilar icerir:
  - **Malzeme maliyeti**: Hangi malzeme, ne kadar gerekli, birim fiyati
  - **Iscilik maliyeti**: Hangi islemler yapilacak, tahmini sure
  - **Makine maliyeti**: Hangi makineler kullanilacak, tahmini sure
  - **Genel giderler**: Kendi belirlediginiz kar marji ve genel giderler
- Ilk basllarda tahminler kaba olabilir - sorun degil, sistem ogrenecek

### Adim 4: Siz Inceleyip Duzeltirsiniz
- Yapay zekanin olusturdugu teklifi ekranda gorursunuz
- Uygun gormedginiz yerleri duzenlersiniz (fiyat, sure, malzeme degisikligi vs.)
- Bu duzeltmeler sistem icin ogrenme verisi olur
- Teklifi onayladiginizdamusteriye gondermeye hazir hale gelir

### Adim 5: Musteri Sonucunu Girersiniz
- Teklifi gonderdikten sonra musterinin cevabini sisteme girersiniz:
  - **Isi aldik mi?** (Evet / Hayir / Cevap gelmedi)
  - **Alamadiysak neden?** (Fiyat yuksek, sure uzun, baska tercih vs.)
  - **Ne kadar sure sonra cevap geldi?**

### Adim 6: Gercek Maliyetleri Girersiniz (Is Tamamlaninca)
- Is bittikten sonra gercekte ne kadar tuttugnuu girersiniz:
  - Gercek malzeme maliyeti
  - Gercek iscilik saati
  - Gercek makine saati
  - Toplam gercek maliyet
- Bu bilgi yapay zekanin en degerli ogrenme kaynagi olur

### Adim 7: Sistem Ogrenir ve Geliisir
- Yeterli sayida teklif biriktikten sonra (varsayilan: 50 teklif) sistem kendini egitir
- Her yeni egitimde onceki hatalarindan ogrenirenis
- Zamanla:
  - Malzeme tahminleri daha dogru olur
  - Iscilik suresi tahminleri iyilesir
  - Fiyat tahminleri gercege yaklasir
  - Isi alip alamayacaginiz hakkinda ongorude bulunur

---

## Ilk Kurulum: Sistemi Kendinize Uyarlama

Sistemi satin aldiktan sonra kendi is yapiinza gore ayarlamaniz gerekir. Bu islem bir kere yapilir ve sonra istediginiz zaman guncelleyebilirsiniz.

### Firma Bilgilerinizi Girin
Tekliflerinizde gorunecek firma bilgilerini tanimlayin:
- **Firma logosu**: PNG veya JPG formatinda logonuzu yukleyin
- **Firma adi**: Resmi firma unvaniniz
- **Adres**: Firma adresi
- **Telefon / E-posta**: Iletisim bilgileri
- **Vergi dairesi / Vergi no**: Fatura bilgileri
- **Web sitesi**: Varsa firma web adresi
- **Banka bilgileri**: Teklifte gosterilecek banka/IBAN bilgileri (istege bagli)
- **Yetkili kisi**: Teklifi imzalayacak kisinin adi ve unvani

Bu bilgiler tum tekliflerinizin ust ve alt kisminda otomatik olarak gorunecektir.

### Malzemelerinizi Tanimlayin
Kullandiginiz malzemeleri ve birim fiyatlarini girin:
- Ornek: "Aluminyum 6061 - 45 TL/kg", "Celik 1045 - 30 TL/kg"
- Yogunluk, sertlik gibi ozellikleri girebilirsiniz
- Malzeme fiyatlarini istediginiz zaman guncelleyebilirsiniz

### Makinelerinizi Tanimlayin
Atolyenizdeki makineleri ve saat ucretlerini girin:
- Ornek: "3 Eksen CNC - 150 TL/saat", "Torna - 100 TL/saat"
- Kurulum suresi, yapabilecegi isler gibi bilgileri ekleyebilirsiniz

### Iscilik Ucretlerini Tanimlayin
Isci kategorilerini ve saat ucretlerini girin:
- Ornek: "CNC Operatoru - 80 TL/saat", "Montajci - 60 TL/saat"

### Is Adimlarnizi Tanimlayin
Yaptiginiz islerin adimlarini tanimlayin:
- Ornek: "Kaba Frezeleme", "Finis Taslama", "Capak Alma", "Kalite Kontrol"
- Her adim icin varsayilan sure ve makine atayabilirsiniz

### Genel Ayarlar
- Kar marji yuzdesi
- Genel gider yuzdesi
- Acil is carpani
- Teklif gecerlilik suresi
- Para birimi (TL, EUR, USD)

### Gecmis Tekliflerinizi Aktarin (Excel Import)
Sistemi daha hizli ogretmek icin daha once verdiginiz teklifleri toplu olarak yukleyebilirsiniz. Cogu atolyede teklifler Excel dosyalarinda tutulur - sistem bunu destekler:

**Nasil calisir?**
1. **Excel dosyanizi yukleyin**: Mevcut teklif Excel'lerinizi sisteme surukleyin
2. **Kolonlari eslesttirin**: Sistem Excel'inizdeki kolonlari otomatik tanir. Tanimadigi kolonlari siz gosterirsiniz:
   - "Bu kolon nedir?" diye sorar, siz "Malzeme maliyeti", "Iscilik saati" gibi secersiniz
   - Ornegin sizin Excel'inizde "Toplam Fiyat" yazan kolonu sistem "Teklif tutari" olarak eslestirir
3. **Format sablonu kaydedin**: Bu eslestirmeyi bir kere yaparssiniz, sonra ayni formattaki tum Excel'ler icin tekrar gerekmez
4. **Sonuclari girin**: Her teklif icin "Isi aldik mi?", "Gercek maliyet ne oldu?" bilgilerini girebilirsiniz

**Neden onemli?**
- Yapay zeka 50 teklif sonrasi ogreniyor
- Elinizde zaten 200 gecmis teklif varsa, bunlari aktararak sistemi **1. gunden akilli** hale getirebilirsiniz
- Ne kadar cok gecmis veri, o kadar dogru teklif

**Desteklenen formatlar:**
- Excel dosyalari (.xlsx, .xls)
- CSV dosyalari (.csv)

**Ornek Excel formati (sizin mevcut formatiniz farkli olabilir, sorun degil):**

| Parca Adi | Malzeme | Adet | Malzeme Maliyeti | Iscilik Saati | Makine Saati | Toplam | Kazanildi mi? |
|-----------|---------|------|------------------|---------------|--------------|--------|---------------|
| Flanş | Celik 1045 | 10 | 500 TL | 8 | 4 | 2.400 TL | Evet |
| Mil | Al 6061 | 5 | 300 TL | 12 | 6 | 3.100 TL | Hayir |

Sistem sizin Excel formatiniz ne olursa olsun uyum saglar - onemli olan kolondaki verinin ne anlama geldigini bir kere gostermektir.

---

## Ekranlar ve Ozellikler

### Ana Sayfa (Dashboard)
- Bu ay kac teklif verildi
- Kac teklif kazanildi / kaybedildi
- Yapay zekanin dogruluk orani
- Son yuklenen dosyalar ve teklifler

### Projeler
- Her musteriisinmus icin ayri proje olusturabilirsiniz
- Proje icinde birden fazla dosya ve teklif olabilir
- Proje durumunu takip edebilirsiniz (Aktif, Tamamlandi, Arsiv)

### Gecmis Teklif Aktarimi (Excel Import)
- Excel dosyalarinizi surukle-birak ile yukleyin
- Sistem kolon basliklarini otomatik tanir (yapay zeka destekli)
- Tanimadigi kolonlari size sorar, siz listeden secersiniz
- Eslestirmeyi sablon olarak kaydedersiniz (bir daha sormaz)
- Yukleme oncesi onizleme: "Veriler dogru eslesti mi?" diye kontrol edersiniz
- Hata varsa satir satir gosterir (ornek: "5. satirda gecersiz fiyat")
- Aktarilan teklifler direkt yapay zekanin ogrenme verisine eklenir

### Dosya Yukleme
- Surukle-birak ile dosya yukleme
- Yukleme sirasinda ilerleme cubugu
- Analiz tamamlaninca 3D goruntulenme
- Parcapinin teknik ozellikleri otomatik listelenir

### Teklif Editoru
- Yapay zekanin olusturdugu teklifi gorursunuz
- Satir satir duzenleme yapabilirsiniz
- Malzeme, iscilik, makine maliyetlerini ayri ayri gorebilirsiniz
- Teklif uzerinde firma logonuz ve bilgileriniz otomatik gorunur
- Musteriye e-posta ile gonderebilirsiniz

### Teklif Ciktisi (PDF ve Excel)
Tekliflerinizi farkli formatlarda indirebilirsiniz:
- **PDF indirme**: Profesyonel gorunumlu, logonuz ve firma bilgileriniz dahil
- **Excel indirme**: Duzenlemeye acik, satir detaylari ile birlikte
- **Cikti sablonu ayarlama**: Teklifinizin gorunumunu kendinize gore duzenlleyebilirsiniz:
  - Hangi kolonlar gorunsun (malzeme, iscilik, makine ayri mi yoksa tek toplam mi)
  - Maliyet kirilimi musteriye gosterilsin mi gosterilmesin mi
  - Teklif notu / kosullar metni (odeme kosullari, teslimat suresi vs.)
  - Baslik ve altbilgi icerigi
  - Renk ve yazi tipi tercihleri
- Farkli musteriler icin farkli sablonlar tanimlayabilirsiniz

### Analitik (Raporlar)
- Yapay zekanin zamanla ne kadar gelistigini gosteren grafik
- Kazanma / kaybetme oranlari
- En cok tekrar eden parca tipleri
- Tahmini vs gercek maliyet karsilastirmasi

### Ayarlar
- Firma profili ve logo yukleme
- Malzeme, makine, iscilik tanimlari
- Teklif sablonu tasarimi (PDF/Excel cikti formati)
- Kullanici yonetimi (birden fazla kisi kullanabilir)
- Roller: Yonetici, Teklifci, Izleyici
- Bildirim ayarlari

---

## Kimler Kullanabilir?

Sisteme farkli rollerle giris yapilabilir:

| Rol | Neler Yapabilir |
|-----|-----------------|
| **Yonetici** | Her seyi yapabilir, kullanici ekleyebilir, ayarlari degistirebilir |
| **Teklifci** | Dosya yukleyebilir, teklif olusturabilir, duzenleyebilir |
| **Izleyici** | Sadece bakabilir, degisiklik yapamaz |

---

## Paketler ve Fiyatlandirma

Sistemi 14 gun ucretsiz deneyebilirsiniz. Deneme suresi boyunca tum ozellikler aciktir. Deneme sonrasi asagidaki paketlerden birini secersiniz:

### Starter (Baslangic)
- 3 kullanici
- Ayda 30 teklif
- CAD dosya analizi (STEP/IGES)
- Kural tabanli teklif olusturma
- PDF ve Excel cikti
- E-posta destek

### Professional (Profesyonel)
- 10 kullanici
- Ayda 150 teklif
- Tum Starter ozellikleri +
- **Yapay zeka destekli teklif** (AI ogrenmesi)
- CAM dosya analizi (G-code)
- Gecmis teklif aktarimi (Excel import)
- Benzer parca arama
- Analitik dashboard
- Oncelikli destek

### Enterprise (Kurumsal)
- Sinirsiz kullanici
- Sinirsiz teklif
- Tum Professional ozellikleri +
- API erisimi (ERP entegrasyonu icin)
- Ozel teklif sablonlari
- Ozel AI model egitimi
- **Kendi sunucunuza kurulum secenegi** (self-hosted)
- Ozel destek ve egitim

### Kurulum Secenekleri

Sistemi iki sekilde kullanabilirsiniz:

**1. Bulut (SaaS) - Cogu firma icin onerilen**
- Hemen baslayin, kurulum gerekmez
- Biz host ederiz, siz tarayicidan kullanirsiniz
- Otomatik guncellemeler ve yedekleme
- Her yerden erisim (bilgisayar, tablet, telefon)

**2. Kendi Sunucunuz (Self-Hosted) - Enterprise paketi**
- Verileriniz tamamen sizin sunucunuzda kalir
- Ic ag (intranet) uzerinden kullanabilirsiniz
- Internet baglantisi gerekmez
- Lisans anahtari ile aktive edilir (yillik yenilenir)
- Kurulum icin teknik destek sagliyoruz

---

## Sikca Sorulan Sorular

### Yapay zeka ilk basta yanlis teklif verirse ne olur?
Sorun degil! Ilk basllarda yapay zeka sizin tanimladiginiz birim fiyatlar ve basit kurallara gore teklif verir. Siz duzelttikce ve gercek maliyetleri girdikce ogrenir. Genellikle 50 teklif sonrasi belirgin sekilde iyilesme gorulur.

### SolidWorks dosyami dogrudan yukleyebilir miyim?
Ilk surumde STEP ve IGES dosyalari desteklenmektedir. SolidWorks'te "Farkli Kaydet" > "STEP" secenegi ile dosyanizi export edebilirsiniz. Ileride SolidWorks native destek de eklenecektir.

### CAM dosyasi yuklemek zorunlu mu?
Hayir, zorunlu degil. Sadece CAD dosyasi ile de teklif alinabilir. Ancak CAM dosyasi da yuklerseniz sistem islem surelerini dosyadan direkt okuyabildigi icin **teklif dogrulugu onemli olcude artar**. Ozellikle makine suresi ve iscilik tahmini icin CAM dosyasi cok degerlidir.

### Hangi CAM dosya formatlari destekleniyor?
G-code (.nc, .gcode, .tap, .mpf) dosyalari desteklenmektedir. Fanuc ve ISO standart G-code formati oncelikli olarak desteklenir. Siemens ve Heidenhain formatlari ileriki surmlerde eklenecektir.

### Verilerim guvendemi?
Evet. Her firmapinin verileri birbirinden tamamen ayridir. Baska bir firma sizin verilerinizi goremez. Dosyalariniz sifrelenmis sunucularda saklanir.

### Internet baglantisi gerekli mi?
Bulut (SaaS) seceneginde evet, internet gereklidir. Boylece her yerden erisebilir ve verileriniz yedeklenir. Enterprise pakette kendi sunucunuza kurulum yapabilirsiniz - bu durumda internet gerekmez, ic ag uzerinden calisir.

### Kac kisi ayni anda kullanabilir?
Paketin sinrina gore istediginiz kadar kullanici ekleyebilirsiniz. Her kullanicinin kendi girisi vardir.

### Mevcut ERP sistemimle entegre olabilir mi?
Ileriki surumlerdeERP entegrasyonu planlanmaktadir. Su an icin teklifler PDF olarak indirilebilir.

---

## Faydalar Ozeti

- **Zaman tasarrufu**: Teklif hazirlama suresi %60-80 kisalir
- **Tutarlilik**: Her teklif ayni standartlarda hazirlanir
- **Ogrenme**: Sistem her teklifle daha iyi hale gelir
- **Takip**: Tum tekliflerinizin gecmisi, sonuclari tek yerde
- **Maliyet kontrolu**: Tahmini vs gercek maliyet kiyaslamasi
- **CAM destegi**: CAM dosyasi yukleyerek gercek islem surelerine dayali daha dogru teklifler
- **Kolay kullanim**: Teknik bilgi gerektirmez, surukle-birak ile dosya yukleme
