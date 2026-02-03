# 🛠️ Sönmez Teknik - Teknik Servis Takip & ERP Sistemi (v3)

![Project Status](https://img.shields.io/badge/Status-Active-success)
![Version](https://img.shields.io/badge/Version-3.0-blue)
![License](https://img.shields.io/badge/License-MIT-green)

**Canlı Demo:** [https://sonmez.netlify.app](https://sonmez.netlify.app)

Bu proje, teknik servis hizmeti veren işletmelerin (özellikle mobil cihaz/elektronik tamiri) iş süreçlerini yönetmeleri için geliştirilmiş, **bulut tabanlı ve gerçek zamanlı** bir ERP (Kurumsal Kaynak Planlama) çözümüdür. İki ortaklı bir işletme yapısına uygun olarak; müşteri takibi, stok yönetimi, finansal analizler ve personel görev dağılımı tek bir panelden yönetilebilir.

---

## 🌟 Öne Çıkan Özellikler

### 📱 1. Servis Yönetimi (CRM)
* **Müşteri Kaydı:** Cihaz modeli, arıza detayı, garanti durumu ve iletişim bilgileriyle detaylı kayıt.
* **Durum Takibi:** Beklemede, İşlemde, Hazır, Teslim Edildi durumları arasında renk kodlu geçişler.
* **Hızlı Aksiyonlar:** Tek tıkla **WhatsApp** üzerinden müşteriye ulaşma ve **PDF Servis Fişi** yazdırma.
* **Genel Arama:** İsim, telefon veya cihaz modeline göre anlık filtreleme.

### 💰 2. Finansal Analiz & Raporlama
* **Gelir/Gider Takibi:** Parça maliyetleri ve genel giderlerin (yemek, yakıt vb.) kaydı.
* **Dinamik Grafikler:** **Chart.js** ile günlük, haftalık ve aylık net kâr/zarar grafikleri.
* **Özet Tablolar:** Günlük ciro, gider ve net kârın anlık hesaplanması.

### 📦 3. Stok Yönetimi
* **Kritik Stok Uyarısı:** 3 adetin altına düşen parçalar için görsel kırmızı alarm.
* **Hızlı Düzenleme:** Liste üzerinden stok artırma/azaltma butonları.

### 🔐 4. Rol Tabanlı Arayüz (Admin & Personel)
* **Geliştirici/Admin Modu:** `admin@servis.com` ile giriş yapıldığında **Altın (Gold)** tema ve tam yetki (Silme işlemleri dahil).
* **Personel Modu:** Standart kullanıcılar için **Mavi (Blue)** tema ve kısıtlı yetkiler (Veri güvenliği için silme kapalı).

### 📋 5. Ortak Görev Panosu (Todo)
* Personeller arası iletişim için paylaşımlı yapılacaklar listesi.
* Tamamlanan görevlerin 48 saat sonra otomatik temizlenmesi.

### 🔍 6. Müşteri Sorgulama Ekranı
* Giriş yapmadan ulaşılabilen, müşterilerin "Takip Kodu" ile cihazlarının durumunu sorgulayabileceği harici ekran.

---

## 💻 Teknolojiler

Bu proje, harici bir framework (React/Vue vb.) bağımlılığı olmadan, saf performans odaklı geliştirilmiştir.

| Alan | Teknoloji | Kullanım Amacı |
| :--- | :--- | :--- |
| **Frontend** | ![HTML5](https://img.shields.io/badge/-HTML5-E34F26?style=flat&logo=html5&logoColor=white) ![JavaScript](https://img.shields.io/badge/-ES6+-F7DF1E?style=flat&logo=javascript&logoColor=black) | SPA Mimarisi, DOM Manipülasyonu |
| **Styling** | ![TailwindCSS](https://img.shields.io/badge/-TailwindCSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white) | Responsive Tasarım, Dark Mode |
| **Backend / DB** | ![Firebase](https://img.shields.io/badge/-Firebase-FFCA28?style=flat&logo=firebase&logoColor=black) | Authentication, Firestore (NoSQL), Hosting |
| **Görselleştirme**| **Chart.js** | Finansal veri grafikleri |
| **Raporlama** | **jsPDF** | Dinamik PDF fiş oluşturma |

---

## 🚀 Kurulum (Lokal)

Projeyi kendi bilgisayarınızda çalıştırmak veya geliştirmek için:

1.  **Projeyi Klonlayın:**
    ```bash
    git clone [https://github.com/kullaniciadiniz/sonmez-teknik-erp.git](https://github.com/kullaniciadiniz/sonmez-teknik-erp.git)
    cd sonmez-teknik-erp
    ```

2.  **Firebase Yapılandırması:**
    * `app.js` dosyasını açın.
    * `firebaseConfig` objesini kendi Firebase projenizin bilgileriyle değiştirin.

3.  **Çalıştırın:**
    * Proje herhangi bir derleme (build) işlemi gerektirmez.
    * VS Code kullanıyorsanız "Live Server" eklentisi ile `index.html` dosyasını başlatmanız yeterlidir.

---

## 🔒 Güvenlik Notları

* **Firestore Kuralları:** Veri bütünlüğü için veritabanı kuralları; silme işlemleri sadece "Admin" yetkisine sahip kullanıcılara, okuma/yazma işlemleri ise sadece giriş yapmış personellere açık olacak şekilde yapılandırılmıştır.
* **XSS Koruması:** Kullanıcı girdileri `escapeHTML` fonksiyonu ile temizlenerek ekrana basılmaktadır.

---

## 📜 Lisans

Bu proje [MIT](LICENSE) lisansı ile lisanslanmıştır.
