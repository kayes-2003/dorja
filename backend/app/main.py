from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import FRONTEND_ORIGIN
from .routers import areas, delivery_persons, requests, notifications

app = FastAPI(
    title="DeliverConnect API",
    description=(
        "Hyperlocal delivery network: connects residents of a neighbourhood with the "
        "delivery persons already working their streets for Daraz, CarryBee, Paperfly, "
        "Steadfast and other platforms, so locals can send surprise gifts, grab items "
        "from a nearby supershop, or pass a parcel to a neighbour in the same area."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(areas.router)
app.include_router(delivery_persons.router)
app.include_router(requests.router)
app.include_router(notifications.router)


@app.get("/")
def health_check():
    return {"status": "ok", "service": "DeliverConnect API"}
