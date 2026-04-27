import pymysql
from sshtunnel import SSHTunnelForwarder
from contextlib import contextmanager

# SSH 隧道配置
SSH_HOST     = '3.137.3.247'
SSH_PORT     = 22
SSH_USER     = 'root'
SSH_PASSWORD = 'Inxpar&Afa@Sisis8'

# 数据库配置
DB_HOST     = '127.0.0.1'
DB_PORT     = 3306
DB_USER     = 'root'
DB_PASSWORD = 'golf@sisis'
DB_NAME     = 'affa'

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
