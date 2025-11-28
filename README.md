# Setup

## Prérequis
- Docker
- Docker Compose

## Lancer le projet

```bash
git clone <URL_DU_REPO>
cd ton-projet
docker compose up --build

& .\.venv\Scripts\Activate.ps1
$env:DATABASE_URL = "postgresql+psycopg2://appuser:apppassword@localhost:5432/livraisonsdb"
uvicorn app.main:app --reload --port 8000
