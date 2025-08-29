# Database Setup Guide

Panduan lengkap untuk setup dan maintenance database PostgreSQL untuk CEX Backend.

## 🚀 Quick Start

### Setup Database Pertama Kali

```bash
# Setup database dengan semua fitur (recommended untuk development)
npm run db:setup

# Setup database dengan force (hapus semua data existing)
npm run db:setup:force

# Setup database dengan alter (update schema tanpa hapus data)
npm run db:setup:alter

# Reset database completely (force + alter)
npm run db:reset
```

### Verifikasi Database

```bash
# Verifikasi konsistensi schema antara model dan database
npm run db:verify
```

## 📋 Apa yang Dilakukan Script Setup?

### 1. **Test Koneksi Database**
- Memverifikasi koneksi ke PostgreSQL
- Menampilkan versi PostgreSQL
- Memastikan database dapat diakses

### 2. **Setup PostgreSQL Extensions**
- `uuid-ossp`: Untuk generate UUID
- `pg_stat_statements`: Untuk monitoring query performance
- `pg_trgm`: Untuk text search dan similarity

### 3. **Sinkronisasi Model Sequelize**
- Membuat/update semua tabel sesuai model
- Menangani foreign key dependencies dengan urutan yang benar
- Memverifikasi setiap tabel berhasil dibuat

### 4. **Membuat Indexes untuk Performa**
- Index untuk kolom yang sering di-query
- Index untuk foreign keys
- Index untuk kolom timestamp
- Index untuk kolom status dan enum

### 5. **Validasi Schema**
- Memverifikasi konsistensi antara model dan database
- Mendeteksi kolom yang hilang atau tidak cocok
- Memberikan laporan masalah jika ada

### 6. **Seed Data Awal**
- Cryptocurrency dasar (BTC, ETH, USDT, USDC, BNB)
- Trading pairs utama (BTC/USDT, ETH/USDT, dll)
- System configurations default

## 🛠️ Options dan Flags

### Setup Options

| Flag | Deskripsi | Default |
|------|-----------|----------|
| `--force` | Hapus dan buat ulang semua tabel | `false` |
| `--alter` | Update schema existing tanpa hapus data | `false` |
| `--no-seed` | Skip seeding data awal | `false` |
| `--no-indexes` | Skip pembuatan indexes | `false` |
| `--no-validate` | Skip validasi schema | `false` |

### Contoh Penggunaan

```bash
# Setup untuk production (tanpa force, dengan validasi)
npm run db:setup

# Setup untuk development (dengan force untuk clean start)
npm run db:setup:force

# Update schema existing (untuk migration)
npm run db:setup:alter

# Setup minimal tanpa seed data
node scripts/setup-database.js --no-seed

# Setup tanpa indexes (untuk testing)
node scripts/setup-database.js --no-indexes
```

## 📊 Model dan Tabel yang Dibuat

### Core Models
1. **User** → `users` - User accounts dan authentication
2. **Cryptocurrency** → `cryptocurrencies` - Daftar mata uang crypto
3. **TradingPair** → `trading_pairs` - Pasangan trading
4. **Market** → `markets` - Market configuration

### Trading Models
5. **Order** → `orders` - Trading orders
6. **Trade** → `trades` - Executed trades
7. **Balance** → `balances` - User balances
8. **Wallet** → `wallets` - Wallet addresses

### Data Models
9. **MarketData** → `market_data` - OHLCV data
10. **OrderBookSnapshot** → `order_book_snapshots` - Order book history
11. **Transaction** → `transactions` - Deposit/withdrawal transactions

### System Models
12. **RiskLimit** → `risk_limits` - Risk management
13. **FeeStructure** → `fee_structures` - Fee configurations
14. **SystemConfiguration** → `system_configurations` - System settings

### Security Models
15. **IpWhitelist** → `ip_whitelists` - IP whitelist
16. **SuspiciousActivity** → `suspicious_activities` - Fraud detection
17. **ComplianceReport** → `compliance_reports` - Compliance tracking
18. **AuditLog** → `audit_logs` - System audit logs
19. **ColdStorageTracking** → `cold_storage_trackings` - Cold storage

## 🔍 Troubleshooting

### Error: "Database connection failed"
```bash
# Pastikan PostgreSQL container berjalan
docker ps | grep postgres

# Restart container jika perlu
docker restart cex-postgres

# Cek environment variables
cat .env | grep DB_
```

### Error: "Extension tidak bisa diinstall"
```bash
# Login sebagai superuser untuk install extensions
docker exec -it cex-postgres psql -U postgres -d cex_db

# Install extensions manual
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
```

### Error: "Foreign key constraint"
```bash
# Gunakan force untuk reset semua tabel
npm run db:reset

# Atau setup dengan alter untuk update incremental
npm run db:setup:alter
```

### Error: "Kolom tidak ditemukan"
```bash
# Jalankan verifikasi untuk cek masalah schema
npm run db:verify

# Gunakan alter untuk update schema
npm run db:setup:alter
```

## 📝 Logs dan Monitoring

### Setup Logs
Setiap setup akan menghasilkan log file di `logs/database-setup-[timestamp].log`

### Monitoring Database
```bash
# Cek status tabel
docker exec cex-postgres psql -U cex_user -d cex_db -c "\dt"

# Cek ukuran database
docker exec cex-postgres psql -U cex_user -d cex_db -c "SELECT pg_size_pretty(pg_database_size('cex_db'))"

# Cek indexes
docker exec cex-postgres psql -U cex_user -d cex_db -c "\di"
```

## 🔄 Best Practices

### Development
1. Gunakan `npm run db:setup:force` untuk clean start
2. Jalankan `npm run db:verify` setelah perubahan model
3. Backup data sebelum `--force`

### Production
1. Selalu gunakan `npm run db:setup:alter` untuk update
2. Test di staging environment dulu
3. Backup database sebelum migration
4. Monitor logs selama setup

### CI/CD
```bash
# Untuk automated testing
npm run db:setup:force --no-seed
npm test

# Untuk deployment
npm run db:verify
npm run db:setup:alter
```

## 🚨 Important Notes

1. **Jangan gunakan `--force` di production** - akan menghapus semua data
2. **Selalu backup sebelum migration** - gunakan pg_dump
3. **Test di environment terpisah** - jangan langsung ke production
4. **Monitor performance** - cek query performance setelah setup
5. **Verifikasi data integrity** - jalankan consistency checks

## 📞 Support

Jika mengalami masalah:
1. Cek logs di `logs/database-setup-*.log`
2. Jalankan `npm run db:verify` untuk diagnosis
3. Cek dokumentasi model di `src/models/`
4. Hubungi tim development untuk bantuan