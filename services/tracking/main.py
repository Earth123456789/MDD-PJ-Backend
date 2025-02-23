from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi import Request
import asyncio
import random

app = FastAPI()

# Set up template and static directories
templates = Jinja2Templates(directory="templates")
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def get(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            tracking_data = {
                "latitude": random.uniform(-90, 90),
                "longitude": random.uniform(-180, 180),
                "order_status": random.choice(["Pending", "In Transit", "Delivered"])
            }
            await websocket.send_json(tracking_data)
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        print("Connection closed")
