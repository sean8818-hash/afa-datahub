import pymysql
from sshtunnel import SSHTunnelForwarder

def get_connection():
    tunnel = SSHTunnelForwarder(
        ('3.137.3.247', 22),
        ssh_username='root',
        ssh_password='Inxpar&Afa@Sisis8',
        remote_bind_address=('127.0.0.1', 3306)
    )
    tunnel.start()
    conn = pymysql.connect(
        host='127.0.0.1',
        port=tunnel.local_bind_port,
        user='root',
        password='golf@sisis',
        database='affa',
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor
    )
    conn._tunnel = tunnel
    return conn