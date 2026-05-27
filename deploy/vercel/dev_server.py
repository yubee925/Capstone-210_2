import json
from functools import partial
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

from api.guided_answer import call_guided_answer


ROOT = Path(__file__).resolve().parent
HOST = "127.0.0.1"
PORT = 8010


class DevHandler(SimpleHTTPRequestHandler):
    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path != "/api/guided-answer":
            self.send_error(HTTPStatus.NOT_FOUND, "Unknown endpoint")
            return

        try:
            content_length = int(self.headers.get("Content-Length", "0"))
            payload = json.loads(self.rfile.read(content_length).decode("utf-8"))
            answer, provider, model = call_guided_answer(payload)
            self.respond_json({"ok": True, "answer": answer, "provider": provider, "model": model})
        except RuntimeError as exc:
            self.respond_json({"ok": False, "error": str(exc)}, status=HTTPStatus.SERVICE_UNAVAILABLE)
        except Exception as exc:
            self.respond_json(
                {"ok": False, "error": f"Unexpected server error: {exc}"},
                status=HTTPStatus.INTERNAL_SERVER_ERROR,
            )

    def respond_json(self, payload, status=HTTPStatus.OK):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def main():
    handler = partial(DevHandler, directory=str(ROOT))
    server = ThreadingHTTPServer((HOST, PORT), handler)
    print(f"Preview: http://{HOST}:{PORT}/dashboard/index_llm_recommend.html")
    server.serve_forever()


if __name__ == "__main__":
    main()
