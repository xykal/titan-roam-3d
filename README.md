# 🛻 TITAN ROAM 3D: World Offroad Adventure

Game 3D Open World Monster Truck berbasis WebGL & Three.js yang dirancang khusus untuk perangkat mobile (Locked Landscape & Fullscreen) dan desktop dengan fisika suspensi dinamis, pencahayaan bayangan, audio synthesizer V8, dan multi-biome exploration.

![TITAN ROAM 3D](public/preview.png)

## 🎮 Fitur Utama

- **Fisika 3D Realistis & Responsif**:
  - *Raycast Independent Suspension* dengan per keong 3D (*coiled springs*) yang membal dan meregang secara *real-time*.
  - *Tire friction & drift physics*: Meluncur, powerslide, dan donat 360° menggunakan tombol DRIFT / Handbrake.
  - *Air control*: Manuver kemiringan di udara (backflip / barrel roll) dengan deteksi waktu terbang (*Air Time*) & skor atraksi.
  - Tombol Failsafe *UNFLIP* untuk menegakkan mobil jika terbalik.
- **3 Pilihan Kendaraan Monster**:
  1. 🛻 **TITAN 4x4 BEAST**: Monster truck berdaya loncat tinggi dengan supercharger blower.
  2. 🚛 **COLOSSUS 6x6 HEAVY RIG**: Truk tempur 6 roda dengan torsi raksasa untuk tanjakan ekstrem.
  3. 🏎️ **DUNE VIPER BUGGY**: Buggy gurun dengan akselerasi tinggi dan GT wing untuk drifting lincah.
- **Pencahayaan & Visual Keren**:
  - *Dynamic Sun & PCFSoftShadowMap*.
  - *Working Headlights*: Lampu sorot depan dengan bayangan untuk malam hari.
  - *Neon Underglow* & Lampu tembak atap LED.
  - Partikel knalpot semburan api Nitro, asap ban (*tire dust*), cipratan lumpur/air, dan percikan api tabrakan.
  - Mode Siang / Malam (*Day & Night Cycle*).
- **Multi-Biome Open World ("Kelilingi Dunia")**:
  - **Stunt Mega Arena**: Loop-de-loop 360°, Mega launch ramps, Wall ride, Ring of fire, Menara peti hancur, dan Drum TNT peledak.
  - **Dune Desert**: Bukit pasir gurun untuk lompatan tinggi.
  - **Grand Canyon & Rock Arches**: Tebing terjal dan jembatan alam.
  - **Snow Mountain Summit**: Jalur spiral menuju Observatorium Puncak.
  - **Oasis & Tropical Mud Lake**: Danau air jernih dan jalur lumpur.
  - **Collectibles & Speed Traps**: 20 Bintang Emas & Kamera Tilang Kecepatan radar.
- **Mobile-First Experience**:
  - Sistem Kunci Landscape (*Auto Landscape Lock & Fullscreen Overlay*).
  - Kontrol sentuh presisi (Gas, Rem/Mundur, Nitro Boost, Drift, Belok, Klakson).
  - *Haptic Vibration Feedback* pada smartphone saat benturan & aksi.
  - *Cyber HUD*: Speedometer digital, RPM gauge, Gear indicator, Nitro bar, dan Radar Minimap 3D.
- **Sintesis Audio Prosedural (Web Audio API)**:
  - Suara mesin V8 bergemuruh dinamis mengikuti RPM & Gas tanpa file eksternal.
  - Siulan turbo & desisan *blow-off valve*.
  - Decitan ban drifting, dentuman suspensi, klakson, dan ledakan TNT.

---

## 🛠️ Tech Stack

- **Engine 3D**: [Three.js](https://threejs.org/)
- **Bundler & Dev Server**: [Vite](https://vitejs.dev/)
- **Fisika**: Custom Raycast Spring-Damper Rigid-Body Vehicle Physics
- **Audio**: Web Audio API Procedural Synthesizer
- **Styling**: Modern Glassmorphism & Cyberpunk Neon CSS

---

## 🚀 Menjalankan Secara Lokal

```bash
# Clone repository
git clone https://github.com/xykal/titan-roam-3d.git

# Masuk ke direktori
cd titan-roam-3d

# Install dependensi
npm install

# Jalankan server development
npm run dev

# Build untuk produksi
npm run build
```

---

## 🕹️ Kontrol Keyboard (Desktop)

| Tombol | Aksi |
|---|---|
| **W / Panah Atas** | Gas / Maju |
| **S / Panah Bawah** | Rem / Mundur |
| **A / D / Panah Kiri / Kanan** | Kemudi Belok |
| **Space** | Handbrake / Drift |
| **Shift** | Nitro Turbo Boost |
| **C** | Ganti Sudut Pandang Kamera (Chase / Action / Hood / Orbit) |
| **R** | Unflip / Tegakkan Mobil |
| **H** | Klakson Kontainer |
| **N** | Ganti Siang / Malam |
| **G** | Buka Garasi Kendaraan |

---

## 📄 Lisensi

MIT License © 2026 [xykal](https://github.com/xykal)
