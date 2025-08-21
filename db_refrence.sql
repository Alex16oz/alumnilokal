-- Membuat tipe untuk status pekerjaan
CREATE TYPE public.status_pekerjaan AS ENUM ('Belum Bekerja', 'Sudah Bekerja');

-- Membuat tipe untuk kesesuaian pekerjaan
CREATE TYPE public.status_kesesuaian AS ENUM ('Sesuai', 'Tidak Sesuai');

-- Membuat tabel alumni dengan tipe data yang sudah didefinisikan
CREATE TABLE public.alumni (
    nik CHARACTER VARYING NOT NULL,
    nama_lengkap CHARACTER VARYING NOT NULL,
    tanggal_lahir DATE NULL,
    alamat TEXT NULL,
    nomor_telepon CHARACTER VARYING NULL,
    email CHARACTER VARYING NULL,
    pendidikan_terakhir CHARACTER VARYING NULL,
    judul_program CHARACTER VARYING NOT NULL,
    deskripsi_program TEXT NULL,
    tanggal_mulai_program DATE NULL,
    tanggal_selesai_program DATE NULL,
    nama_penyelenggara CHARACTER VARYING NULL,
    tanggal_pendaftaran TIMESTAMP WITH TIME ZONE NULL,
    sudah_bekerja public.status_pekerjaan NOT NULL DEFAULT 'Belum Bekerja',
    pekerjaan_sesuai public.status_kesesuaian NULL,
    tanggal_lulus DATE NULL DEFAULT CURRENT_DATE,
    CONSTRAINT alumni_pkey PRIMARY KEY (nik)
) TABLESPACE pg_default;