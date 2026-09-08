(function () {
  "use strict";

  /* ---------- 1. KONSTANTA ---------- */

  var STORAGE_KEY = "kalenderDinamis.events.v1";

  var NAMA_BULAN = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];

  var NAMA_HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  var NAMA_HARI_PANJANG = [
    "Minggu",
    "Senin",
    "Selasa",
    "Rabu",
    "Kamis",
    "Jumat",
    "Sabtu",
  ];

  /* Warna aksen pastel untuk tiap bulan (index 0 = Januari) */
  var WARNA_BULAN = [
    { soft: "#bfe3f5", strong: "#4fa8d4" }, // Januari
    { soft: "#f8bdbd", strong: "#e46a6a" }, // Februari
    { soft: "#d3e7ab", strong: "#84b04c" }, // Maret
    { soft: "#d2c7ea", strong: "#8f7ac9" }, // April
    { soft: "#f9cddb", strong: "#e57ea3" }, // Mei
    { soft: "#b6cbf2", strong: "#6187d8" }, // Juni
    { soft: "#e0b0c2", strong: "#bb6788" }, // Juli
    { soft: "#fbd9a0", strong: "#e2a02f" }, // Agustus
    { soft: "#f5c3c5", strong: "#dd8083" }, // September
    { soft: "#fbcda3", strong: "#e79141" }, // Oktober
    { soft: "#d0bfae", strong: "#9b846e" }, // November
    { soft: "#bce3c9", strong: "#55b17d" }, // Desember
  ];

  var KATEGORI = {
    kuliah: { label: "Kuliah", color: "#7c6be8", bg: "#eeeafc" },
    kerja: { label: "Kerja", color: "#3b9ae1", bg: "#e6f2fc" },
    pribadi: { label: "Pribadi", color: "#38b48b", bg: "#e4f6ef" },
    penting: { label: "Penting", color: "#ef6d6d", bg: "#fdeaea" },
    lainnya: { label: "Lainnya", color: "#f0a03c", bg: "#fef1e2" },
  };

  var MAX_CHIP = 3; // jumlah acara yang ditampilkan langsung di dalam sel

  /* ---------- 2. STATE APLIKASI ---------- */

  var hariIni = new Date();
  var state = {
    tahun: hariIni.getFullYear(),
    bulan: hariIni.getMonth(), // 0 - 11
    tanggalTerpilih: toKey(hariIni), // "YYYY-MM-DD"
    acara: [],
    pencarian: "",
    kategoriDipilih: "kuliah",
    idSedangDiedit: null,
    tampilan: "bulan", // "bulan" atau "tahun"
  };

  var BATAS_AWAL = hariIni.getFullYear() - 10;
  var BATAS_AKHIR = hariIni.getFullYear() + 10;

  /* ---------- 3. ELEMEN DOM ---------- */

  var el = {
    card: document.getElementById("calendarCard"),
    backBtn: document.getElementById("backBtn"),
    backLabel: document.getElementById("backLabel"),
    yearGrid: document.getElementById("yearGrid"),
    weekdayRow: document.getElementById("weekdayRow"),
    grid: document.getElementById("calendarGrid"),
    monthSelect: document.getElementById("monthSelect"),
    yearSelect: document.getElementById("yearSelect"),
    prevBtn: document.getElementById("prevMonthBtn"),
    nextBtn: document.getElementById("nextMonthBtn"),
    todayBtn: document.getElementById("todayBtn"),
    searchInput: document.getElementById("searchInput"),
    clearSearch: document.getElementById("clearSearchBtn"),
    legend: document.getElementById("legend"),

    sideTitle: document.getElementById("sideTitle"),
    sideDate: document.getElementById("sideDate"),
    addBtn: document.getElementById("addEventBtn"),
    eventList: document.getElementById("eventList"),
    stats: document.getElementById("statsText"),

    overlay: document.getElementById("modalOverlay"),
    modalTitle: document.getElementById("modalTitle"),
    form: document.getElementById("eventForm"),
    idInput: document.getElementById("eventId"),
    titleInput: document.getElementById("titleInput"),
    dateInput: document.getElementById("dateInput"),
    startInput: document.getElementById("startInput"),
    endInput: document.getElementById("endInput"),
    notesInput: document.getElementById("notesInput"),
    catPicker: document.getElementById("categoryPicker"),
    formError: document.getElementById("formError"),
    deleteBtn: document.getElementById("deleteBtn"),
    cancelBtn: document.getElementById("cancelBtn"),
    closeBtn: document.getElementById("closeModalBtn"),
    confirmBox: document.getElementById("confirmDelete"),
    confirmYes: document.getElementById("confirmDeleteBtn"),
    confirmNo: document.getElementById("cancelDeleteBtn"),
    toast: document.getElementById("toast"),
  };

  /* ---------- 4. UTILITAS ---------- */

  function pad(n) {
    return n < 10 ? "0" + n : "" + n;
  }

  /* Ubah objek Date menjadi kunci tanggal "YYYY-MM-DD" (waktu lokal) */
  function toKey(date) {
    return (
      date.getFullYear() +
      "-" +
      pad(date.getMonth() + 1) +
      "-" +
      pad(date.getDate())
    );
  }

  function keyFrom(tahun, bulan, tanggal) {
    return tahun + "-" + pad(bulan + 1) + "-" + pad(tanggal);
  }

  /* Ubah "YYYY-MM-DD" menjadi objek Date lokal (aman dari pergeseran zona waktu) */
  function fromKey(key) {
    var p = key.split("-");
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  }

  function formatTanggalPanjang(key) {
    var d = fromKey(key);
    return (
      NAMA_HARI_PANJANG[d.getDay()] +
      ", " +
      d.getDate() +
      " " +
      NAMA_BULAN[d.getMonth()] +
      " " +
      d.getFullYear()
    );
  }

  function buatId() {
    return (
      "evt-" +
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2, 7)
    );
  }

  function katInfo(nama) {
    return KATEGORI[nama] || KATEGORI.lainnya;
  }

  var toastTimer = null;

  function tampilkanToast(pesan) {
    el.toast.textContent = pesan;
    el.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.toast.hidden = true;
    }, 2400);
  }

  /* ---------- 5. PENYIMPANAN LOKAL ---------- */

  function muatAcara() {
    try {
      var mentah = localStorage.getItem(STORAGE_KEY);
      if (!mentah) return [];
      var data = JSON.parse(mentah);
      if (!Array.isArray(data)) return [];
      // saring data yang rusak / tidak lengkap
      return data.filter(function (a) {
        return (
          a &&
          typeof a.id === "string" &&
          typeof a.judul === "string" &&
          typeof a.tanggal === "string"
        );
      });
    } catch (err) {
      console.warn("Gagal membaca data tersimpan:", err);
      return [];
    }
  }

  function simpanAcara() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.acara));
    } catch (err) {
      console.warn("Gagal menyimpan data:", err);
      tampilkanToast("Penyimpanan lokal penuh atau diblokir browser.");
    }
  }

  /* ---------- 6. QUERY DATA ---------- */

  function acaraPadaTanggal(key) {
    return state.acara
      .filter(function (a) {
        return a.tanggal === key;
      })
      .sort(bandingkanWaktu);
  }

  function bandingkanWaktu(a, b) {
    var wa = a.mulai || "99:99";
    var wb = b.mulai || "99:99";
    if (wa !== wb) return wa < wb ? -1 : 1;
    return a.judul.localeCompare(b.judul);
  }

  function cocokPencarian(a) {
    if (!state.pencarian) return false;
    var q = state.pencarian.toLowerCase();
    return (
      a.judul.toLowerCase().indexOf(q) !== -1 ||
      (a.catatan || "").toLowerCase().indexOf(q) !== -1 ||
      katInfo(a.kategori).label.toLowerCase().indexOf(q) !== -1
    );
  }

  function hasilPencarian() {
    return state.acara.filter(cocokPencarian).sort(function (a, b) {
      if (a.tanggal !== b.tanggal) return a.tanggal < b.tanggal ? -1 : 1;
      return bandingkanWaktu(a, b);
    });
  }

  /* ---------- 7. RENDER: KERANGKA AWAL ---------- */

  function isiWeekday() {
    el.weekdayRow.innerHTML = "";
    NAMA_HARI.forEach(function (nama) {
      var s = document.createElement("span");
      s.textContent = nama;
      el.weekdayRow.appendChild(s);
    });
  }

  function isiPeriodPicker() {
    el.monthSelect.innerHTML = "";
    NAMA_BULAN.forEach(function (nama, i) {
      var opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = nama;
      el.monthSelect.appendChild(opt);
    });

    el.yearSelect.innerHTML = "";
    var awal = hariIni.getFullYear() - 10;
    for (var t = awal; t <= hariIni.getFullYear() + 10; t++) {
      var o = document.createElement("option");
      o.value = String(t);
      o.textContent = String(t);
      el.yearSelect.appendChild(o);
    }
  }

  function isiLegenda() {
    el.legend.innerHTML = "";
    Object.keys(KATEGORI).forEach(function (kunci) {
      var info = KATEGORI[kunci];
      var item = document.createElement("div");
      item.className = "legend-item";
      var dot = document.createElement("span");
      dot.className = "legend-dot";
      dot.style.background = info.color;
      item.appendChild(dot);
      item.appendChild(document.createTextNode(info.label));
      el.legend.appendChild(item);
    });
  }

  function isiCategoryPicker() {
    el.catPicker.innerHTML = "";
    Object.keys(KATEGORI).forEach(function (kunci) {
      var info = KATEGORI[kunci];
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cat-option";
      btn.dataset.kategori = kunci;
      btn.textContent = info.label;
      btn.style.setProperty("--cat-bg", info.bg);
      btn.style.setProperty("--cat-color", info.color);
      btn.addEventListener("click", function () {
        state.kategoriDipilih = kunci;
        tandaiKategoriAktif();
      });
      el.catPicker.appendChild(btn);
    });
  }

  function tandaiKategoriAktif() {
    var tombol = el.catPicker.querySelectorAll(".cat-option");
    for (var i = 0; i < tombol.length; i++) {
      tombol[i].classList.toggle(
        "active",
        tombol[i].dataset.kategori === state.kategoriDipilih,
      );
    }
  }

  /* ---------- 8. RENDER: KALENDER ---------- */

  function terapkanWarnaBulan() {
    var w = WARNA_BULAN[state.bulan];
    document.documentElement.style.setProperty("--accent-soft", w.soft);
    document.documentElement.style.setProperty("--accent-strong", w.strong);
  }

  /* Dispatcher: memilih antara tampilan bulanan atau tahunan */
  function renderKalender() {
    terapkanWarnaBulan();
    el.monthSelect.value = String(state.bulan);
    el.yearSelect.value = String(state.tahun);
    el.backLabel.textContent = String(state.tahun);

    var modeTahun = state.tampilan === "tahun";
    el.card.classList.toggle("mode-tahun", modeTahun);
    el.weekdayRow.hidden = modeTahun;
    el.grid.hidden = modeTahun;
    el.yearGrid.hidden = !modeTahun;

    if (modeTahun) {
      renderTahun();
    } else {
      renderBulan();
    }

    renderPanel();
    renderStatistik();
  }

  function renderBulan() {
    el.grid.innerHTML = "";

    var pertama = new Date(state.tahun, state.bulan, 1);
    var geser = pertama.getDay(); // hari pertama jatuh di kolom ke-berapa
    var jumlahHari = new Date(state.tahun, state.bulan + 1, 0).getDate();
    var hariBulanLalu = new Date(state.tahun, state.bulan, 0).getDate();
    var keyHariIni = toKey(new Date());

    for (var i = 0; i < 42; i++) {
      var tanggal,
        bulanSel = state.bulan,
        tahunSel = state.tahun,
        luar = false;

      if (i < geser) {
        // sisa bulan sebelumnya
        tanggal = hariBulanLalu - geser + 1 + i;
        bulanSel = state.bulan - 1;
        luar = true;
      } else if (i >= geser + jumlahHari) {
        // awal bulan berikutnya
        tanggal = i - geser - jumlahHari + 1;
        bulanSel = state.bulan + 1;
        luar = true;
      } else {
        tanggal = i - geser + 1;
      }

      if (bulanSel < 0) {
        bulanSel = 11;
        tahunSel = state.tahun - 1;
      }
      if (bulanSel > 11) {
        bulanSel = 0;
        tahunSel = state.tahun + 1;
      }

      var key = keyFrom(tahunSel, bulanSel, tanggal);
      el.grid.appendChild(buatSel(key, tanggal, luar, keyHariIni));
    }

    // baris terakhir disembunyikan bila seluruhnya milik bulan lain
    rapikanBarisTerakhir(geser, jumlahHari);
  }

  function rapikanBarisTerakhir(geser, jumlahHari) {
    if (geser + jumlahHari <= 35) {
      var sel = el.grid.children;
      for (var i = 35; i < 42; i++) {
        sel[i].style.display = "none";
      }
    }
  }

  function buatSel(key, tanggal, luar, keyHariIni) {
    var d = fromKey(key);
    var sel = document.createElement("div");
    sel.className = "day-cell";
    sel.dataset.key = key;

    if (luar) sel.classList.add("outside");
    if (d.getDay() === 0 || d.getDay() === 6) sel.classList.add("weekend");
    if (key === keyHariIni) sel.classList.add("today");
    if (key === state.tanggalTerpilih) sel.classList.add("selected");

    var nomor = document.createElement("div");
    nomor.className = "day-number";
    nomor.textContent = tanggal;
    sel.appendChild(nomor);

    var daftar = acaraPadaTanggal(key);
    if (daftar.length) {
      var wadah = document.createElement("div");
      wadah.className = "chips";

      daftar.slice(0, MAX_CHIP).forEach(function (a) {
        wadah.appendChild(buatChip(a));
        if (cocokPencarian(a)) sel.classList.add("search-hit");
      });

      if (daftar.length > MAX_CHIP) {
        var lagi = document.createElement("div");
        lagi.className = "more-chip";
        lagi.textContent = "+" + (daftar.length - MAX_CHIP) + " lainnya";
        wadah.appendChild(lagi);
      }
      sel.appendChild(wadah);
    }

    // Klik pada area kosong tanggal -> pilih tanggal & buka formulir tambah acara
    sel.addEventListener("click", function () {
      state.tanggalTerpilih = key;
      if (luar) {
        state.tahun = d.getFullYear();
        state.bulan = d.getMonth();
        renderKalender();
      } else {
        perbaruiSeleksi();
        renderPanel();
      }
      bukaModalTambah(key);
    });

    return sel;
  }

  function buatChip(a) {
    var info = katInfo(a.kategori);
    var chip = document.createElement("div");
    chip.className = "chip";
    chip.style.setProperty("--chip-color", info.color);
    chip.style.setProperty("--chip-bg", info.bg);
    chip.title = (a.mulai ? a.mulai + " " : "") + a.judul;

    if (a.mulai) {
      var jam = document.createElement("span");
      jam.className = "chip-time";
      jam.textContent = a.mulai;
      chip.appendChild(jam);
    }
    chip.appendChild(document.createTextNode(a.judul));

    // Klik acara -> buka formulir edit (jangan ikut memicu klik sel)
    chip.addEventListener("click", function (e) {
      e.stopPropagation();
      state.tanggalTerpilih = a.tanggal;
      perbaruiSeleksi();
      renderPanel();
      bukaModalEdit(a);
    });

    return chip;
  }

  /* Perbarui penanda "selected" tanpa membangun ulang seluruh grid */
  function perbaruiSeleksi() {
    if (state.tampilan !== "bulan") return;
    var sel = el.grid.querySelectorAll(".day-cell");
    for (var i = 0; i < sel.length; i++) {
      sel[i].classList.toggle(
        "selected",
        sel[i].dataset.key === state.tanggalTerpilih,
      );
    }
  }

  /* ---------- 8b. RENDER: TAMPILAN TAHUNAN ---------- */

  var HURUF_HARI = ["S", "M", "T", "W", "T", "F", "ST"];

  function renderTahun() {
    el.yearGrid.innerHTML = "";
    var keyHariIni = toKey(new Date());
    for (var b = 0; b < 12; b++) {
      el.yearGrid.appendChild(buatMiniBulan(b, keyHariIni));
    }
  }

  function buatMiniBulan(bulan, keyHariIni) {
    var warna = WARNA_BULAN[bulan];
    var now = new Date();

    var kotak = document.createElement("div");
    kotak.className = "mini-month";
    kotak.style.setProperty("--m-soft", warna.soft);
    kotak.style.setProperty("--m-strong", warna.strong);
    if (state.tahun === now.getFullYear() && bulan === now.getMonth()) {
      kotak.classList.add("is-current");
    }

    var judul = document.createElement("div");
    judul.className = "mini-title";
    judul.textContent = NAMA_BULAN[bulan];
    kotak.appendChild(judul);

    var barisHari = document.createElement("div");
    barisHari.className = "mini-weekdays";
    HURUF_HARI.forEach(function (h) {
      var s = document.createElement("span");
      s.textContent = h;
      barisHari.appendChild(s);
    });
    kotak.appendChild(barisHari);

    var grid = document.createElement("div");
    grid.className = "mini-grid";

    var geser = new Date(state.tahun, bulan, 1).getDay();
    var jumlahHari = new Date(state.tahun, bulan + 1, 0).getDate();

    for (var i = 0; i < geser; i++) {
      var kosong = document.createElement("div");
      kosong.className = "mini-day blank";
      grid.appendChild(kosong);
    }
    for (var t = 1; t <= jumlahHari; t++) {
      grid.appendChild(buatMiniHari(bulan, t, keyHariIni));
    }
    kotak.appendChild(grid);

    // klik di area bulan (bukan tanggal) -> buka tampilan bulan tersebut
    kotak.addEventListener("click", function () {
      bukaBulan(bulan, null);
    });

    return kotak;
  }

  function buatMiniHari(bulan, tanggal, keyHariIni) {
    var key = keyFrom(state.tahun, bulan, tanggal);
    var d = fromKey(key);

    var sel = document.createElement("div");
    sel.className = "mini-day";
    sel.textContent = tanggal;
    if (d.getDay() === 0 || d.getDay() === 6) sel.classList.add("weekend");
    if (key === keyHariIni) sel.classList.add("today");

    var daftar = acaraPadaTanggal(key);
    if (daftar.length) {
      var dots = document.createElement("div");
      dots.className = "mini-dots";
      daftar.slice(0, 3).forEach(function (a) {
        var titik = document.createElement("span");
        titik.className = "mini-dot";
        titik.style.background = katInfo(a.kategori).color;
        dots.appendChild(titik);
        if (cocokPencarian(a)) sel.classList.add("search-hit");
      });
      sel.appendChild(dots);
      sel.title = daftar.length + " acara pada " + formatTanggalPanjang(key);
    }

    // klik tanggal -> langsung buka bulan itu dengan tanggal tersebut terpilih
    sel.addEventListener("click", function (e) {
      e.stopPropagation();
      bukaBulan(bulan, key);
    });

    return sel;
  }

  function bukaBulan(bulan, key) {
    state.bulan = bulan;
    state.tampilan = "bulan";
    if (key) state.tanggalTerpilih = key;
    renderKalender();
  }

  function bukaTampilanTahun() {
    state.tampilan = "tahun";
    renderKalender();
  }

  /* ---------- 9. RENDER: PANEL SAMPING ---------- */

  function renderPanel() {
    var mencari = state.pencarian.length > 0;
    var daftar = mencari
      ? hasilPencarian()
      : acaraPadaTanggal(state.tanggalTerpilih);

    el.sideTitle.textContent = mencari ? "Hasil Pencarian" : "Acara Terpilih";
    el.sideDate.textContent = mencari
      ? daftar.length + ' acara cocok dengan "' + state.pencarian + '"'
      : formatTanggalPanjang(state.tanggalTerpilih);

    el.eventList.innerHTML = "";

    if (!daftar.length) {
      el.eventList.appendChild(buatEmptyState(mencari));
      return;
    }

    daftar.forEach(function (a) {
      el.eventList.appendChild(buatItemAcara(a, mencari));
    });
  }

  function buatEmptyState(mencari) {
    var box = document.createElement("div");
    box.className = "empty-state";
    var emoji = document.createElement("span");
    emoji.className = "emoji";
    emoji.textContent = mencari ? "🔍" : "📅";
    var teks = document.createElement("p");
    teks.textContent = mencari
      ? "Tidak ada acara yang cocok. Coba kata kunci lain."
      : "Belum ada acara di tanggal ini. Klik tanggal pada kalender atau tombol + untuk menambah.";
    box.appendChild(emoji);
    box.appendChild(teks);
    return box;
  }

  function buatItemAcara(a, tampilkanTanggal) {
    var info = katInfo(a.kategori);

    var item = document.createElement("div");
    item.className = "event-item";
    item.style.setProperty("--item-color", info.color);
    item.style.setProperty("--item-bg", info.bg);

    var waktu = document.createElement("div");
    waktu.className = "event-time";
    waktu.textContent = a.mulai || "—";

    var body = document.createElement("div");
    body.className = "event-body";

    var judul = document.createElement("div");
    judul.className = "event-name";
    judul.textContent = a.judul;

    var meta = document.createElement("div");
    meta.className = "event-meta";
    var bagian = [info.label];
    if (a.mulai && a.selesai) bagian.push(a.mulai + " - " + a.selesai);
    if (tampilkanTanggal) bagian.push(formatTanggalPanjang(a.tanggal));
    meta.textContent = bagian.join(" · ");

    body.appendChild(judul);
    body.appendChild(meta);

    if (a.catatan) {
      var catatan = document.createElement("div");
      catatan.className = "event-notes";
      catatan.textContent = a.catatan;
      body.appendChild(catatan);
    }

    item.appendChild(waktu);
    item.appendChild(body);
    item.addEventListener("click", function () {
      bukaModalEdit(a);
    });

    return item;
  }

  function renderStatistik() {
    var total = state.acara.length;
    var bulanIni = state.acara.filter(function (a) {
      return a.tanggal.indexOf(state.tahun + "-" + pad(state.bulan + 1)) === 0;
    }).length;
    el.stats.textContent =
      "Total " +
      total +
      " acara tersimpan · " +
      bulanIni +
      " acara di " +
      NAMA_BULAN[state.bulan] +
      " " +
      state.tahun;
  }

  /* ---------- 10. MODAL FORMULIR ---------- */

  function bukaModal() {
    el.formError.hidden = true;
    el.confirmBox.hidden = true;
    el.titleInput.classList.remove("invalid");
    el.dateInput.classList.remove("invalid");
    el.overlay.hidden = false;
    setTimeout(function () {
      el.titleInput.focus();
    }, 60);
  }

  function tutupModal() {
    el.overlay.hidden = true;
    state.idSedangDiedit = null;
    el.form.reset();
  }

  function bukaModalTambah(key) {
    state.idSedangDiedit = null;
    el.modalTitle.textContent = "Tambah Acara";
    el.idInput.value = "";
    el.titleInput.value = "";
    el.dateInput.value = key || state.tanggalTerpilih;
    el.startInput.value = "";
    el.endInput.value = "";
    el.notesInput.value = "";
    state.kategoriDipilih = "kuliah";
    tandaiKategoriAktif();
    el.deleteBtn.hidden = true;
    bukaModal();
  }

  function bukaModalEdit(a) {
    state.idSedangDiedit = a.id;
    el.modalTitle.textContent = "Edit Acara";
    el.idInput.value = a.id;
    el.titleInput.value = a.judul;
    el.dateInput.value = a.tanggal;
    el.startInput.value = a.mulai || "";
    el.endInput.value = a.selesai || "";
    el.notesInput.value = a.catatan || "";
    state.kategoriDipilih = KATEGORI[a.kategori] ? a.kategori : "lainnya";
    tandaiKategoriAktif();
    el.deleteBtn.hidden = false;
    bukaModal();
  }

  function tampilkanError(pesan, input) {
    el.formError.textContent = pesan;
    el.formError.hidden = false;
    if (input) {
      input.classList.add("invalid");
      input.focus();
    }
  }

  function simpanDariForm(e) {
    e.preventDefault();
    el.formError.hidden = true;
    el.titleInput.classList.remove("invalid");
    el.dateInput.classList.remove("invalid");

    var judul = el.titleInput.value.trim();
    var tanggal = el.dateInput.value;
    var mulai = el.startInput.value;
    var selesai = el.endInput.value;

    if (!judul) {
      return tampilkanError("Judul acara wajib diisi.", el.titleInput);
    }
    if (!tanggal) {
      return tampilkanError("Tanggal acara wajib diisi.", el.dateInput);
    }
    if (mulai && selesai && selesai < mulai) {
      return tampilkanError(
        "Jam selesai tidak boleh lebih awal dari jam mulai.",
        el.endInput,
      );
    }
    if (!mulai && selesai) {
      return tampilkanError("Isi jam mulai terlebih dahulu.", el.startInput);
    }

    var data = {
      judul: judul,
      tanggal: tanggal,
      mulai: mulai,
      selesai: selesai,
      kategori: state.kategoriDipilih,
      catatan: el.notesInput.value.trim(),
    };

    if (state.idSedangDiedit) {
      var idx = cariIndex(state.idSedangDiedit);
      if (idx !== -1) {
        data.id = state.acara[idx].id;
        data.dibuat = state.acara[idx].dibuat;
        state.acara[idx] = data;
        tampilkanToast("Acara berhasil diperbarui.");
      }
    } else {
      data.id = buatId();
      data.dibuat = new Date().toISOString();
      state.acara.push(data);
      tampilkanToast("Acara berhasil ditambahkan.");
    }

    simpanAcara();

    // pindah tampilan ke bulan tanggal acara agar hasilnya langsung terlihat
    var d = fromKey(tanggal);
    state.tahun = d.getFullYear();
    state.bulan = d.getMonth();
    state.tanggalTerpilih = tanggal;
    state.tampilan = "bulan";

    tutupModal();
    renderKalender();
  }

  function cariIndex(id) {
    for (var i = 0; i < state.acara.length; i++) {
      if (state.acara[i].id === id) return i;
    }
    return -1;
  }

  function hapusAcara() {
    var idx = cariIndex(state.idSedangDiedit);
    if (idx !== -1) {
      state.acara.splice(idx, 1);
      simpanAcara();
      tampilkanToast("Acara telah dihapus.");
    }
    tutupModal();
    renderKalender();
  }

  /* ---------- 11. NAVIGASI ---------- */

  function gantiBulan(langkah) {
    if (state.tampilan === "tahun") {
      gantiTahun(langkah);
      return;
    }
    var b = state.bulan + langkah;
    var t = state.tahun;
    if (b < 0) {
      b = 11;
      t--;
    }
    if (b > 11) {
      b = 0;
      t++;
    }
    if (t < BATAS_AWAL || t > BATAS_AKHIR) return;
    state.bulan = b;
    state.tahun = t;
    renderKalender();
  }

  function gantiTahun(langkah) {
    var t = state.tahun + langkah;
    if (t < BATAS_AWAL || t > BATAS_AKHIR) return;
    state.tahun = t;
    renderKalender();
  }

  function keHariIni() {
    var now = new Date();
    state.tahun = now.getFullYear();
    state.bulan = now.getMonth();
    state.tanggalTerpilih = toKey(now);
    state.tampilan = "bulan";
    renderKalender();
  }

  /* ---------- 12. EVENT LISTENER ---------- */

  function pasangListener() {
    el.prevBtn.addEventListener("click", function () {
      gantiBulan(-1);
    });
    el.nextBtn.addEventListener("click", function () {
      gantiBulan(1);
    });
    el.todayBtn.addEventListener("click", keHariIni);

    el.backBtn.addEventListener("click", bukaTampilanTahun);

    el.monthSelect.addEventListener("change", function () {
      state.bulan = Number(el.monthSelect.value);
      state.tampilan = "bulan";
      renderKalender();
    });
    el.yearSelect.addEventListener("change", function () {
      state.tahun = Number(el.yearSelect.value);
      renderKalender();
    });

    el.searchInput.addEventListener("input", function () {
      state.pencarian = el.searchInput.value.trim();
      el.clearSearch.hidden = state.pencarian.length === 0;
      renderKalender();
    });
    el.clearSearch.addEventListener("click", function () {
      el.searchInput.value = "";
      state.pencarian = "";
      el.clearSearch.hidden = true;
      renderKalender();
    });

    el.addBtn.addEventListener("click", function () {
      bukaModalTambah(state.tanggalTerpilih);
    });

    el.form.addEventListener("submit", simpanDariForm);
    el.cancelBtn.addEventListener("click", tutupModal);
    el.closeBtn.addEventListener("click", tutupModal);

    el.deleteBtn.addEventListener("click", function () {
      el.confirmBox.hidden = false;
    });
    el.confirmNo.addEventListener("click", function () {
      el.confirmBox.hidden = true;
    });
    el.confirmYes.addEventListener("click", hapusAcara);

    el.overlay.addEventListener("click", function (e) {
      if (e.target === el.overlay) tutupModal();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !el.overlay.hidden) {
        tutupModal();
        return;
      }
      if (e.key === "Escape" && state.tampilan === "tahun") {
        state.tampilan = "bulan";
        renderKalender();
        return;
      }
      if (el.overlay.hidden) {
        if (e.key === "ArrowLeft") gantiBulan(-1);
        if (e.key === "ArrowRight") gantiBulan(1);
      }
    });
  }

  /* ---------- 13. INISIALISASI ---------- */

  function init() {
    isiWeekday();
    isiPeriodPicker();
    isiLegenda();
    isiCategoryPicker();
    tandaiKategoriAktif();
    state.acara = muatAcara();
    pasangListener();
    renderKalender();
  }

  init();
})();
