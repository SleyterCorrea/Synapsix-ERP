"""
SYNAPSIX ERP — WebSocket Consumers
Chat en tiempo real + notificaciones push + Restaurante (actualizaciones de mesa).
Autenticación: JWT en query param ?token=<access_token>
"""
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from urllib.parse import parse_qs


class JWTAuthMiddleware:
    """Extrae y valida el JWT del query param token=..."""
    @staticmethod
    async def get_user(token: str):
        from rest_framework_simplejwt.tokens import AccessToken
        from apps.core.models import User
        try:
            data = AccessToken(token)
            user = await database_sync_to_async(User.objects.get)(id=data['user_id'])
            return user
        except Exception:
            return None


class ChatConsumer(AsyncWebsocketConsumer):
    """
    WebSocket para chat interno.
    Room: chat_<company_id>
    Mensajes: { type: 'chat', to_user: uuid, text: '...' }
    """

    async def connect(self):
        qs = parse_qs(self.scope['query_string'].decode())
        token = qs.get('token', [None])[0]
        self.user = await JWTAuthMiddleware.get_user(token) if token else None

        if not self.user:
            await self.close(code=4001)
            return

        company = await database_sync_to_async(lambda: self.user.company)()
        self.company_id = str(company.id) if company else 'global'
        self.room_group = f'chat_{self.company_id}'
        self.user_group  = f'user_{self.user.id}'

        # Unirse a sala de empresa y sala personal
        await self.channel_layer.group_add(self.room_group, self.channel_name)
        await self.channel_layer.group_add(self.user_group,  self.channel_name)

        await self.accept()

        # Anunciar conexión
        await self.channel_layer.group_send(self.room_group, {
            'type': 'user_status',
            'user_id': str(self.user.id),
            'status': 'online',
            'name': self.user.get_full_name() or self.user.username,
        })

    async def disconnect(self, close_code):
        if hasattr(self, 'room_group'):
            await self.channel_layer.group_send(self.room_group, {
                'type': 'user_status',
                'user_id': str(self.user.id),
                'status': 'offline',
                'name': self.user.get_full_name() or self.user.username,
            })
            await self.channel_layer.group_discard(self.room_group, self.channel_name)
            await self.channel_layer.group_discard(self.user_group, self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            return

        msg_type = data.get('type')

        if msg_type == 'chat':
            to_user = data.get('to_user')
            text    = data.get('text', '').strip()
            if not text:
                return

            payload = {
                'type':      'chat_message',
                'from_user': str(self.user.id),
                'from_name': self.user.get_full_name() or self.user.username,
                'to_user':   to_user,
                'text':      text,
                'timestamp': __import__('datetime').datetime.now().isoformat(),
            }

            # Enviar al destinatario
            if to_user:
                await self.channel_layer.group_send(f'user_{to_user}', payload)
            # Devolver al remitente
            await self.send(text_data=json.dumps({**payload, 'mine': True}))

        elif msg_type == 'typing':
            await self.channel_layer.group_send(self.room_group, {
                'type':      'typing_indicator',
                'user_id':   str(self.user.id),
                'user_name': self.user.get_full_name() or self.user.username,
                'is_typing': data.get('is_typing', False),
            })

    # ── Handlers de grupo ──────────────────────────────────────────────────────

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({**event, 'mine': False}))

    async def user_status(self, event):
        await self.send(text_data=json.dumps(event))

    async def typing_indicator(self, event):
        if event.get('user_id') != str(self.user.id):
            await self.send(text_data=json.dumps(event))

    async def notification(self, event):
        await self.send(text_data=json.dumps(event))


class NotificationConsumer(AsyncWebsocketConsumer):
    """
    Canal personal de notificaciones push.
    Room: notifications_<user_id>
    """

    async def connect(self):
        qs = parse_qs(self.scope['query_string'].decode())
        token = qs.get('token', [None])[0]
        self.user = await JWTAuthMiddleware.get_user(token) if token else None

        if not self.user:
            await self.close(code=4001)
            return

        self.user_group = f'notifications_{self.user.id}'
        await self.channel_layer.group_add(self.user_group, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'user_group'):
            await self.channel_layer.group_discard(self.user_group, self.channel_name)

    async def receive(self, text_data):
        pass  # Solo escucha — no envía desde el cliente

    async def push_notification(self, event):
        await self.send(text_data=json.dumps(event))


class RestauranteConsumer(AsyncWebsocketConsumer):
    """
    Sala del restaurante: actualizaciones de mesas y comandas en tiempo real.
    Room: restaurante_<company_id>
    """

    async def connect(self):
        qs = parse_qs(self.scope['query_string'].decode())
        token = qs.get('token', [None])[0]
        self.user = await JWTAuthMiddleware.get_user(token) if token else None

        if not self.user:
            await self.close(code=4001)
            return

        company = await database_sync_to_async(lambda: self.user.company)()
        self.company_id = str(company.id) if company else 'global'
        self.room_group  = f'restaurante_{self.company_id}'

        await self.channel_layer.group_add(self.room_group, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'room_group'):
            await self.channel_layer.group_discard(self.room_group, self.channel_name)

    async def receive(self, text_data):
        pass  # El servidor envía — el cliente solo escucha

    async def mesa_update(self, event):
        await self.send(text_data=json.dumps(event))

    async def comanda_update(self, event):
        await self.send(text_data=json.dumps(event))

    async def cocina_alert(self, event):
        await self.send(text_data=json.dumps(event))
