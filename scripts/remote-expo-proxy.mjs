import http from "node:http";
import net from "node:net";

const listenPort = Number(process.env.REMOTE_EXPO_PROXY_PORT ?? 8082);
const metroHost = "127.0.0.1";
const metroPort = 8081;

function publicHost(request) {
  return String(request.headers.host ?? "").replace(/:\d+$/, "");
}

function rewriteManifest(body, request) {
  const host = publicHost(request);
  if (!host) return body;

  return body
    .replaceAll(`http://${host}:${metroPort}`, `https://${host}`)
    .replaceAll(`${host}:${metroPort}`, host)
    .replaceAll("transform.bytecode=1", "transform.bytecode=0");
}

const server = http.createServer((request, response) => {
  console.log(`${request.method} ${request.headers.host ?? "unknown-host"}${request.url}`);
  const upstream = http.request(
    {
      hostname: metroHost,
      port: metroPort,
      method: request.method,
      path: request.url,
      headers: request.headers,
    },
    (upstreamResponse) => {
      const contentType = String(upstreamResponse.headers["content-type"] ?? "");
      const shouldRewrite =
        request.url === "/" &&
        (contentType.includes("json") || contentType.includes("text/plain"));

      if (!shouldRewrite) {
        response.writeHead(upstreamResponse.statusCode ?? 502, upstreamResponse.headers);
        upstreamResponse.pipe(response);
        return;
      }

      const chunks = [];
      upstreamResponse.on("data", (chunk) => chunks.push(chunk));
      upstreamResponse.on("end", () => {
        const body = rewriteManifest(Buffer.concat(chunks).toString("utf8"), request);
        const headers = { ...upstreamResponse.headers };
        delete headers["content-length"];
        delete headers["transfer-encoding"];
        delete headers.connection;
        delete headers["keep-alive"];
        headers["content-length"] = Buffer.byteLength(body);
        response.writeHead(upstreamResponse.statusCode ?? 502, headers);
        response.end(body);
      });
    },
  );

  upstream.on("error", (error) => {
    response.writeHead(502, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: error.message }));
  });
  request.pipe(upstream);
});

server.on("upgrade", (request, socket, head) => {
  const upstream = net.connect(metroPort, metroHost, () => {
    const headerLines = Object.entries(request.headers).map(
      ([name, value]) => `${name}: ${Array.isArray(value) ? value.join(", ") : value}`,
    );
    upstream.write(`${request.method} ${request.url} HTTP/${request.httpVersion}\r\n`);
    upstream.write(`${headerLines.join("\r\n")}\r\n\r\n`);
    if (head.length) upstream.write(head);
    socket.pipe(upstream).pipe(socket);
  });
  upstream.on("error", () => socket.destroy());
});

server.listen(listenPort, "127.0.0.1", () => {
  console.log(`Remote Expo proxy listening on http://127.0.0.1:${listenPort}`);
});
