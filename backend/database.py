import pymysql
from sshtunnel import SSHTunnelForwarder
from contextlib import contextmanager
from dotenv import load_dotenv
import os

load_dotenv()

SSH_HOST     = os.getenv('SSH_HOST')
SSH_PORT     = int(os.getenv('SSH_PORT', 22))
SSH_USER     = os.getenv('SSH_USER')
SSH_PASSWORD = os.getenv('SSH_PASSWORD')
DB_HOST      = os.getenv('DB_HOST', '127.0.0.1')
DB_PORT      = int(os.getenv('DB_PORT', 3306))
DB_USER      = os.getenv('DB_USER')
DB_PASSWORD  = os.getenv('DB_PASSWORD')
DB_NAME      = os.getenv('DB_NAME')

_tunnel = None

def get_tunnel():
    global _tunnel
    if _tunnel is None or not _tunnel.is_active:
        _tunnel = SSHTunnelForwarder(
            (SSH_HOST, SSH_PORT),
            ssh_username=SSH_USER,
            ssh_password=SSH_PASSWORD,
            remote_bind_address=(DB_HOST, DB_PORT),
        )
        _tunnel.start()
    return _tunnel

@contextmanager
def get_db():
    tunnel = get_tunnel()
    conn = pymysql.connect(
        host='127.0.0.1',
        port=tunnel.local_bind_port,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor,
    )
    try:
        yield conn
    finally:
        conn.close()