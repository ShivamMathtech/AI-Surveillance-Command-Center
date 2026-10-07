import asyncio


class Hub:
    def __init__(self):
        self.clients = set()
        self.sequence = 0

    def subscribe(self):
        q = asyncio.Queue(maxsize=2)
        self.clients.add(q)
        return q

    def unsubscribe(self, q):
        self.clients.discard(q)

    async def publish(self, data):
        self.sequence += 1
        envelope = {"type": "state", "sequence": self.sequence, "data": data}
        for q in list(self.clients):
            if q.full():
                q.get_nowait()
            q.put_nowait(envelope)
