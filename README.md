# CEX (Centralized Exchange) Cryptocurrency Platform

## Deskripsi Proyek
Platform pertukaran cryptocurrency terpusat yang lengkap dengan fitur trading, wallet management, sistem keamanan tingkat enterprise, dan compliance yang memenuhi standar regulasi global.

## Arsitektur Sistem
- **Backend**: Node.js dengan Express.js
- **Frontend**: React.js dengan TypeScript
- **Admin Panel**: CodeIgniter 3 (PHP)
- **Database**: PostgreSQL (Primary), Redis (Cache), MongoDB (Analytics)
- **Message Queue**: Apache Kafka
- **Containerization**: Docker & Docker Compose
- **Orchestration**: Kubernetes
- **CI/CD**: GitHub Actions

## Struktur Proyek
```
CexProject/
├── backend/                 # Node.js Backend API
├── frontend/               # React.js Frontend
├── admin-panel/            # CodeIgniter 3 Admin Panel
├── infrastructure/         # Docker, K8s, CI/CD configs
├── database/              # Database schemas & migrations
├── docs/                  # Documentation
└── tests/                 # Test suites
```

## Fitur Utama
- ✅ Authentication & Authorization (JWT, OAuth, 2FA)
- ✅ Trading Engine dengan Order Matching
- ✅ Wallet Management (Hot/Warm/Cold Wallets)
- ✅ Deposit & Withdrawal System
- ✅ Risk Management & Compliance
- ✅ KYC/AML Integration
- ✅ Real-time Market Data
- ✅ Admin Panel untuk Management
- ✅ Security & Monitoring

## Quick Start
1. Clone repository
2. Setup environment variables
3. Run `docker-compose up -d`
4. Access frontend: http://localhost:3000
5. Access admin panel: http://localhost:8080

## Development Status
🚧 **In Development** - Implementasi bertahap sesuai arsitektur enterprise

## Security Features
- Multi-factor Authentication (2FA)
- Hardware Security Keys Support
- Multi-signature Wallets
- Real-time Risk Monitoring
- Audit Trail & Logging
- Encryption at Rest & Transit

## Compliance
- KYC/AML Compliance
- GDPR Compliance
- Multi-jurisdictional Support
- Regulatory Reporting

---
**Dikembangkan dengan standar enterprise untuk keamanan dan skalabilitas maksimal**