from typing import Optional, List
from datetime import date, time
from sqlmodel import SQLModel, Field, Relationship



class Adresse(SQLModel, table=True):
    id: str = Field(default=None, primary_key=True)
    longitude: float
    latitude: float

    # Relations inverses
    livraisons_pickup: List["Livraison"] = Relationship(
        back_populates="adresse_pickup",
        sa_relationship_kwargs={"foreign_keys": "[Livraison.adresse_pickup_id]"},
    )
    livraisons_delivery: List["Livraison"] = Relationship(
        back_populates="adresse_delivery",
        sa_relationship_kwargs={"foreign_keys": "[Livraison.adresse_delivery_id]"},
    )

    depart_programmes: List["Programme"] = Relationship(
        back_populates="adresse_depart"
    )


class Client(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    nom: str
    tel: str

    adresse_id: int = Field(foreign_key="adresse.id")
    adresse: Adresse = Relationship()


class Livreur(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    nom: str
    prenom: str
    numero: str

    itineraires: List["Itineraire"] = Relationship(back_populates="livreur")

class Livraison(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

    adresse_pickup_id: int = Field(foreign_key="adresse.id")
    adresse_delivery_id: int = Field(foreign_key="adresse.id")

    duree_pickup: int
    duree_delivery: int
    date: date

    programme_id: Optional[int] = Field(default=None, foreign_key="programme.id")

    adresse_pickup: Adresse = Relationship(
        back_populates="livraisons_pickup",
        sa_relationship_kwargs={"foreign_keys": "[Livraison.adresse_pickup_id]"}
    )
    adresse_delivery: Adresse = Relationship(
        back_populates="livraisons_delivery",
        sa_relationship_kwargs={"foreign_keys": "[Livraison.adresse_delivery_id]"}
    )
    
    programme: Optional["Programme"] = Relationship(back_populates="livraisons")

class Programme(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

    date_depart: time

    adresse_depart_id: int = Field(foreign_key="adresse.id")
    adresse_depart: Adresse = Relationship(back_populates="depart_programmes")

    livraisons: List["Livraison"] = Relationship(back_populates="programme")
    itineraires: List["Itineraire"] = Relationship(back_populates="programme")

class Itineraire(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

    total_duree: float

    programme_id: int = Field(foreign_key="programme.id")
    livreur_id: Optional[int] = Field(default=None, foreign_key="livreur.id")

    programme: Programme = Relationship(back_populates="itineraires")
    livreur: Optional[Livreur] = Relationship(back_populates="itineraires")
    etapes: List["Etape"] = Relationship(back_populates="itineraire")


class Etape(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

    type: str   # 'P' ou 'D' ou 'N'

    itineraire_id: int = Field(foreign_key="itineraire.id")
    adresse_id: int = Field(foreign_key="adresse.id")
    livraison_id: int = Field(foreign_key="livraison.id")

    itineraire: Itineraire = Relationship(back_populates="etapes")
    livraison: Livraison = Relationship()
    adresse: Adresse = Relationship()

class Troncon(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

    nom: str
    longueur: float

    point_a_id: int = Field(foreign_key="adresse.id")
    point_b_id: int = Field(foreign_key="adresse.id")

    point_a: Adresse = Relationship(
        sa_relationship_kwargs={"foreign_keys": "[Troncon.point_a_id]"}
    )
    point_b: Adresse = Relationship(
        sa_relationship_kwargs={"foreign_keys": "[Troncon.point_b_id]"}
    )
