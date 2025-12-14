import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

# 1. On importe tous les modules qui utilisent l'engine
from app import database
from app import main
from app import import_xml  # <--- AJOUT CRUCIAL

# 2. Configuration SQLite en mémoire
TEST_DATABASE_URL = "sqlite://"
engine_test = create_engine(
    TEST_DATABASE_URL, 
    connect_args={"check_same_thread": False}, 
    poolclass=StaticPool
)

@pytest.fixture(name="session")
def session_fixture():
    # --- PATCHING GLOBAL ---
    # On remplace l'engine PARTOUT avant de créer les tables
    database.engine = engine_test
    main.engine = engine_test
    import_xml.engine = engine_test 
    
    # Création des tables dans SQLite
    SQLModel.metadata.create_all(engine_test)
    
    with Session(engine_test) as session:
        yield session
    
    # Nettoyage après le test
    SQLModel.metadata.drop_all(engine_test)

@pytest.fixture(name="client")
def client_fixture(session: Session):
    # Le patching est déjà fait dans session_fixture ci-dessus
    client = TestClient(main.app)
    yield client