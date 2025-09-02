#!/usr/bin/env python3
import http.server
import socketserver
import webbrowser
import os
import sys

PORT = 3000

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

def start_server():
    try:
        os.chdir(os.path.dirname(os.path.abspath(__file__)))
        
        with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
            print("🚀 Starting REACT Check-In App...")
            print(f"📱 Server running at http://localhost:{PORT}")
            print("🔑 Demo Credentials:")
            print("   Student ID: demo123")
            print("   Password: password")
            print("")
            print("🌐 Opening browser...")
            print("Press Ctrl+C to stop the server")
            print("")
            
            # Open browser
            webbrowser.open(f'http://localhost:{PORT}')
            
            # Start server
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print("\n👋 Server stopped. Thanks for using REACT!")
        sys.exit(0)
    except OSError as e:
        if e.errno == 10048:  # Port already in use
            print(f"❌ Port {PORT} is already in use. Please close other servers or try a different port.")
        else:
            print(f"❌ Error starting server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    start_server()
