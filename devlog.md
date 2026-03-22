# Development Log: MyClaw Engine

Dokumen ini merinci fase-fase pengembangan MyClaw Engine, sebuah engine platformer 2D yang terinspirasi oleh Captain Claw.

## **Fase 1: Fondasi (MVP)**
**Tujuan:** Membangun kerangka dasar aplikasi yang dapat berjalan dan menampilkan grafik sederhana.
- [ ] Inisialisasi struktur proyek (`src`, `include`, `assets`).
- [ ] Konfigurasi `CMakeLists.txt` dengan dependensi SDL2.
- [ ] Pembuatan jendela utama (Window) menggunakan SDL2.
- [ ] Implementasi Game Loop dasar (Update & Render).
- [ ] Rendering sprite statis ke layar.

## **Fase 2: Mekanik & Fisika**
**Tujuan:** Karakter dapat bergerak dan berinteraksi dengan lingkungan dasar.
- [ ] Sistem input keyboard dan gamepad.
- [ ] Implementasi sistem koordinat dan pergerakan karakter (Horizontal).
- [ ] Integrasi gravitasi dan mekanik lompatan.
- [ ] Sistem kolisi tile-based sederhana (AABB collision).
- [ ] Penanganan lereng (slopes) dan platform bergerak.

## **Fase 3: Aset & Level**
**Tujuan:** Memuat konten game dari file eksternal.
- [ ] Sistem pemuatan aset (Texture Manager).
- [ ] Integrasi parser JSON/XML untuk data level.
- [ ] Rendering map berbasis tile (Tilemap Renderer).
- [ ] Implementasi kamera (Scrolling/Following player).
- [ ] UI/HUD dasar (Health, Score).

## **Fase 4: Pertarungan & AI**
**Tujuan:** Menambahkan elemen aksi dan tantangan.
- [ ] Sistem animasi karakter (State-based animations).
- [ ] Mekanik serangan melee (pedang) dan ranged (pistol).
- [ ] Logika AI musuh sederhana (Patroli dan Kejar).
- [ ] Sistem damage dan health (Player & Enemies).
- [ ] Integrasi efek suara (SFX) dan musik latar.

## **Fase 5: Refinement & Porting**
**Tujuan:** Optimalisasi dan penyebaran ke platform lain.
- [ ] Optimalisasi performa rendering (Batching).
- [ ] Penambahan efek partikel (debu, ledakan).
- [ ] Pengujian build WebAssembly (Emscripten).
- [ ] Perbaikan bug dan pemolesan UX/UI.
- [ ] Dokumentasi teknis lengkap.
